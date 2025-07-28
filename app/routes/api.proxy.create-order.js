import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import twilio from "twilio";

// IMPORTANT: We must import db dynamically inside server-only functions
// to prevent it from being included in the client-side build.

function formatPhoneNumber(phone) {
  if (!phone) return phone;
  let digits = phone.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('03')) {
    return `+92${digits.substring(1)}`;
  }
  if (digits.length === 12 && digits.startsWith('92')) {
    return `+${digits}`;
  }
  // For other international numbers that might already be formatted
  if (!phone.startsWith('+')) {
    return `+${digits}`;
  }
  return phone;
}

export async function action({ request }) {
  const db = (await import("../db.server")).default;

  try {
    const { session, admin } = await authenticate.public.appProxy(request);
    const { cartItems, customer, shippingInfo, otp } = await request.json();

    const ipAddress = request.headers.get("x-forwarded-for")?.split(',')[0];

    if (!ipAddress) {
      return json({ success: false, error: "Could not verify request source." }, { status: 400 });
    }

    const isBlocked = await db.blockedIp.findUnique({
      where: { shop_ip: { shop: session.shop, ipAddress } },
    });

    if (isBlocked) {
      return json({ success: false, error: "Your request has been blocked." }, { status: 403 });
    }

    const settings = await db.appSettings.findUnique({ where: { shop: session.shop } });

    if (settings?.orderSpamProtectionEnabled) {
      const timeLimit = settings.orderSpamTimeLimit || 5;
      const timeAgo = new Date(Date.now() - timeLimit * 60000);

      const recentOrder = await db.orderLog.findFirst({
        where: { shop: session.shop, phone: customer.phone, createdAt: { gte: timeAgo } },
      });

      if (recentOrder) {
        return json({ success: false, error: `You can only place one order every ${timeLimit} minutes.` }, { status: 429 });
      }
    }

    if (settings?.otpEnabled) {
      if (!otp) return json({ success: false, error: "OTP is required." }, { status: 400 });

      const client = twilio(settings.twilioAccountSid, settings.twilioAuthToken);
      try {
        const verification_check = await client.verify.v2.services(settings.twilioVerifySid)
          .verificationChecks
          .create({ to: formatPhoneNumber(customer.phone), code: otp });

        if (verification_check.status !== 'approved') {
          return json({ success: false, error: "Invalid OTP." }, { status: 400 });
        }
      } catch (error) {
        console.error("Twilio Check Error:", error);
        return json({ success: false, error: "Invalid OTP." }, { status: 400 });
      }
    }

    const lineItems = cartItems.map(item => ({
      variantId: `gid://shopify/ProductVariant/${item.variant_id}`,
      quantity: item.quantity,
    }));

    const nameParts = customer.name.split(' ');
    const firstName = nameParts[0] || 'Guest';
    const lastName = nameParts.slice(1).join(' ') || 'User';

    const createDraftOrderMutation = `
      mutation draftOrderCreate($input: DraftOrderInput!) {
        draftOrderCreate(input: $input) {
          draftOrder { id }
          userErrors { field, message }
        }
      }`;

    const draftOrderResponse = await admin.graphql(
      createDraftOrderMutation,
      {
        variables: {
          input: {
            lineItems: lineItems,
            customAttributes: [
              { key: "Payment Method", value: "Cash on Delivery" },
              { key: "OTP Verified", value: settings?.otpEnabled ? "Yes" : "No" }
            ],
            shippingAddress: {
              address1: customer.address,
              city: customer.city,
              province: customer.province,
              phone: customer.phone,
              country: customer.country,
              firstName: firstName,
              lastName: lastName,
            },
            email: customer.email || `${customer.phone}@example.com`,
            tags: ["COD", "App Order"],
            presentmentCurrencyCode: shippingInfo.currency,
            shippingLine: {
              price: shippingInfo.rate.toFixed(2),
              title: "Standard Shipping"
            },
          },
        },
      }
    );

    const draftOrderResponseJson = await draftOrderResponse.json();
    const draftOrderData = draftOrderResponseJson.data.draftOrderCreate;

    if (draftOrderData.userErrors.length > 0) {
      throw new Error(draftOrderData.userErrors.map(e => e.message).join(', '));
    }

    const draftOrderId = draftOrderData.draftOrder.id;

    const completeDraftOrderMutation = `
        mutation draftOrderComplete($id: ID!) {
            draftOrderComplete(id: $id) {
                draftOrder {
                    order {
                        id
                        legacyResourceId
                    }
                }
                userErrors {
                    field
                    message
                }
            }
        }`;

    const completeOrderResponse = await admin.graphql(
      completeDraftOrderMutation,
      {
        variables: { id: draftOrderId }
      }
    );

    const completeOrderResponseJson = await completeOrderResponse.json();
    const orderData = completeOrderResponseJson.data.draftOrderComplete;

    if (orderData.userErrors.length > 0) {
      throw new Error(orderData.userErrors.map(e => e.message).join(', '));
    }

    const finalOrder = orderData.draftOrder.order;

    if (finalOrder) {
      if (settings?.orderSpamProtectionEnabled) {
        await db.orderLog.create({
          data: { shop: session.shop, phone: customer.phone }
        });
      }
      return json({ success: true, orderId: finalOrder.legacyResourceId });
    } else {
      return json({ success: true, orderId: null });
    }
  } catch (error) {
    console.error("Error creating order:", error);
    return json({ success: false, error: error.message }, { status: 500 });
  }
}

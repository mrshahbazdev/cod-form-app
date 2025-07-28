import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import twilio from "twilio";

function formatPhoneNumber(phone) {
  let digits = phone.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('03')) {
    return `+92${digits.substring(1)}`;
  }
  if (digits.length === 12 && digits.startsWith('92')) {
    return `+${digits}`;
  }
  return phone;
}

export async function action({ request }) {
  const { session, admin } = await authenticate.public.appProxy(request);
  const { cartItems, customer, shippingInfo, otp } = await request.json();

  const settings = await db.appSettings.findUnique({ where: { shop: session.shop } });

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
    return json({
      success: true,
      orderId: finalOrder.legacyResourceId,
    });
  } else {
    return json({
      success: true,
      orderId: null,
    });
  }
}

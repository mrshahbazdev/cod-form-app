import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export async function action({ request }) {
  console.log("--- PROXY ACTION V6 (with OTP logic) STARTED ---");
  try {
    const { session, admin } = await authenticate.public.appProxy(request);

    if (!session) {
      return json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { cartItems, customer, shippingInfo, otp } = await request.json();

    if (!cartItems || !customer || !shippingInfo) {
      return json({ success: false, error: "Missing required data." }, { status: 400 });
    }

    const settings = await db.appSettings.findUnique({ where: { shop: session.shop } });

    if (settings?.otpEnabled) {
      if (!otp) {
        return json({ success: false, error: "OTP is required for this order." }, { status: 400 });
      }

      const fiveMinutesAgo = new Date(Date.now() - 300000); // 5 minutes validity
      const validOtp = await db.otpLog.findFirst({
        where: { shop: session.shop, phone: customer.phone, otp, createdAt: { gte: fiveMinutesAgo } },
        orderBy: { createdAt: 'desc' }
      });

      if (!validOtp) {
        return json({ success: false, error: "Invalid or expired OTP provided." }, { status: 400 });
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
  } catch (error) {
    console.error("Error creating order:", error);
    return json({ success: false, error: error.message }, { status: 500 });
  }
}

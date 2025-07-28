import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
// NAYI TABDEELI: Humne yahan se 'db' ka import hata diya hai

export async function action({ request }) {
  // NAYI TABDEELI: 'db' ko yahan function ke andar import karein
  const db = (await import("../db.server")).default;

  try {
    const { session, admin } = await authenticate.public.appProxy(request);

    if (!session) {
      return json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { cartItems, customer, shippingInfo } = await request.json();

    // NAYI LOGGING: Hum check karenge ke backend ko kya data mil raha hai
    console.log("--- RECEIVED DATA FROM FRONTEND ---");
    console.log("Received Customer:", JSON.stringify(customer, null, 2));
    console.log("Received Shipping Info:", JSON.stringify(shippingInfo, null, 2));
    // --- END LOGGING ---

    if (!cartItems || !customer || !shippingInfo) {
      return json({ success: false, error: "Missing required data." }, { status: 400 });
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
              { key: "Payment Method", value: "Cash on Delivery" }
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
    // Return a JSON response even on error
    return json({ success: false, error: error.message }, { status: 500 });
  }
}

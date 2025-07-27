import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export async function action({ request }) {
  console.log("--- PROXY ACTION V5 STARTED ---");
  try {
    const { session, admin } = await authenticate.public.appProxy(request);

    if (!session) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { cartItems, customer } = await request.json();

    if (!cartItems || !customer) {
      return json({ success: false, error: "Missing cart or customer data." }, { status: 400 });
    }

    // NAYI FUNCTIONALITY: Database se shipping rate hasil karein
    const ratesFromDb = await db.shippingRate.findMany({ where: { shop: session.shop } });
    const rates = {};
    ratesFromDb.forEach(rate => { rates[rate.city.toLowerCase()] = rate.rate; });

    const cityRate = customer.city ? rates[customer.city.trim().toLowerCase()] : undefined;

    // NOTE: Yahan '250' default rate hai. Isko app ki global settings se aana chahiye.
    // Hum isko baad mein behtar banayenge.
    const shippingRate = cityRate !== undefined ? cityRate : 250.00;

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
              country: "PK",
              firstName: firstName,
              lastName: lastName,
            },
            email: customer.email || `${customer.phone}@example.com`,
            tags: ["COD", "App Order"],
            shippingLine: {
              price: shippingRate.toFixed(2),
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
      console.log("--- ORDER CREATED SUCCESSFULLY ---", finalOrder.legacyResourceId);
      return json({
        success: true,
        orderId: finalOrder.legacyResourceId,
      });
    } else {
      console.log("--- ORDER CREATED, BUT SHOPIFY DID NOT RETURN IT IN PAYLOAD ---");
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

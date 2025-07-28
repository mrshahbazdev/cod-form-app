import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export async function action({ request }) {
  const { session, admin } = await authenticate.public.appProxy(request);
  const { cartItems, customer } = await request.json();

  if (!cartItems || !customer) {
    return json({ success: false, error: "Missing cart or customer data." }, { status: 400 });
  }

  const ratesFromDb = await db.shippingRate.findMany({ where: { shop: session.shop } });
  const rates = {};
  ratesFromDb.forEach(rate => {
    // country-city key for specific rates, country- key for default rates
    const key = `${rate.country}-${rate.city || ''}`.toLowerCase();
    rates[key] = { rate: rate.rate, currency: rate.currency };
  });

  const cityKey = `${customer.country}-${customer.city}`.toLowerCase();
  const countryKey = `${customer.country}-`.toLowerCase();

  // Find the most specific rate available, or fall back to a hardcoded default
  const shippingInfo = rates[cityKey] || rates[countryKey] || { rate: 250.00, currency: "PKR" };

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
            country: customer.country, // Use the country from the form
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

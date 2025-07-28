import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export async function loader({ request }) {
  const { session } = await authenticate.public.appProxy(request);
  if (!session) return new Response("Unauthorized", { status: 401 });

  const ratesFromDb = await db.shippingRate.findMany({ where: { shop: session.shop } });

  const locations = {};
  ratesFromDb.forEach(rate => {
    if (!locations[rate.country]) {
      locations[rate.country] = { name: rate.country, cities: [], rates: {} };
    }
    if (rate.city) {
      locations[rate.country].cities.push(rate.city);
      locations[rate.country].rates[rate.city.toLowerCase()] = { rate: rate.rate, currency: rate.currency };
    } else {
      locations[rate.country].rates['default'] = { rate: rate.rate, currency: rate.currency };
    }
  });

  return json({ locations });
}

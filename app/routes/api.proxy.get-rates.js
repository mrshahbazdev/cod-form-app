import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";

// Yeh function GET requests ko handle karta hai
export async function loader({ request }) {
  console.log("--- GET RATES ACTION STARTED ---");
  try {
    const { session } = await authenticate.public.appProxy(request);
    if (!session) {
      return new Response("Unauthorized", { status: 401 });
    }

    const ratesFromDb = await db.shippingRate.findMany({
      where: { shop: session.shop },
    });

    const rates = {};
    ratesFromDb.forEach(rate => {
      // sheher ke naam ko chota karke save karein taake matching aasan ho
      rates[rate.city.toLowerCase()] = rate.rate;
    });

    console.log("--- SENDING RATES TO FRONTEND ---", rates);
    return json({ rates });

  } catch (error) {
    console.error("Error fetching rates:", error);
    return json({ rates: {} }, { status: 500 });
  }
}

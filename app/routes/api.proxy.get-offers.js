import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export async function action({ request }) {
  const { session } = await authenticate.public.appProxy(request);
  if (!session) return new Response("Unauthorized", { status: 401 });

  const { productIds } = await request.json();
  if (!productIds || !Array.isArray(productIds)) {
    return json({ offers: [] });
  }

  const offers = await db.quantityOffer.findMany({
    where: {
      shop: session.shop,
      productId: { in: productIds },
    },
  });

  return json({ offers });
}

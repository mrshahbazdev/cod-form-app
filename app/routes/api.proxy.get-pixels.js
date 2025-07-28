import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export async function loader({ request }) {
  const { session } = await authenticate.public.appProxy(request);
  if (!session) {
    return json({ pixels: {} });
  }

  const settings = await db.appSettings.findUnique({
    where: { shop: session.shop },
    select: {
      facebookPixelId: true,
      tiktokPixelId: true,
      snapchatPixelId: true,
      googleAnalyticsId: true,
    }
  });

  return json({ pixels: settings || {} });
}

import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export async function loader({ request }) {
  const { session } = await authenticate.public.appProxy(request);
  if (!session) {
    return json({ otpEnabled: false }); // Default to false if no session
  }

  const settings = await db.appSettings.findUnique({
    where: { shop: session.shop },
  });

  return json({ otpEnabled: settings?.otpEnabled || false });
}

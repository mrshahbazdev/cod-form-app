import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export async function loader({ request }) {
  const { session } = await authenticate.public.appProxy(request);
  if (!session) {
    // Default to false if no session, though this shouldn't happen in a real scenario
    return json({ otpEnabled: false });
  }

  const settings = await db.appSettings.findUnique({
    where: { shop: session.shop },
  });

  // Return the setting, defaulting to false if not found
  return json({ otpEnabled: settings?.otpEnabled || false });
}

import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import twilio from "twilio";

function formatPhoneNumber(phone) {
  let digits = phone.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('03')) {
    return `+92${digits.substring(1)}`;
  }
  if (digits.length === 12 && digits.startsWith('92')) {
    return `+${digits}`;
  }
  return phone;
}

export async function action({ request }) {
  const { session } = await authenticate.public.appProxy(request);
  if (!session) return new Response("Unauthorized", { status: 401 });

  const { phone } = await request.json();
  if (!phone) return json({ success: false, error: "Phone number required." }, { status: 400 });

  const settings = await db.appSettings.findUnique({ where: { shop: session.shop } });
  if (!settings?.otpEnabled || !settings.twilioAccountSid || !settings.twilioAuthToken || !settings.twilioVerifySid) {
    return json({ success: false, error: "OTP service is not configured." }, { status: 500 });
  }

  const formattedPhone = formatPhoneNumber(phone);
  const client = twilio(settings.twilioAccountSid, settings.twilioAuthToken);

  try {
    await client.verify.v2.services(settings.twilioVerifySid)
      .verifications
      .create({ to: formattedPhone, channel: 'sms' });

    return json({ success: true, message: "OTP sent." });

  } catch (error) {
    console.error("Twilio Verify Error:", error);
    return json({ success: false, error: "Failed to send OTP. Please check API credentials and phone number." }, { status: 500 });
  }
}

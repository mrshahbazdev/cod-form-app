import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import twilio from "twilio";

export async function action({ request }) {
  const { session } = await authenticate.public.appProxy(request);
  if (!session) return new Response("Unauthorized", { status: 401 });

  const { phone } = await request.json();
  if (!phone) return json({ success: false, error: "Phone number required." }, { status: 400 });

  const settings = await db.appSettings.findUnique({ where: { shop: session.shop } });
  if (!settings?.otpEnabled || !settings.twilioAccountSid || !settings.twilioAuthToken || !settings.twilioPhoneNumber) {
    return json({ success: false, error: "OTP service is not configured by the merchant." }, { status: 500 });
  }

  const sixtySecondsAgo = new Date(Date.now() - 60000);
  const recentOtp = await db.otpLog.findFirst({
    where: { shop: session.shop, phone, createdAt: { gte: sixtySecondsAgo } },
  });

  if (recentOtp) {
    return json({ success: false, error: "Please wait 60 seconds before requesting another OTP." }, { status: 429 });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const client = twilio(settings.twilioAccountSid, settings.twilioAuthToken);

  try {
    await client.messages.create({
      body: `Your verification code is: ${otp}`,
      from: settings.twilioPhoneNumber,
      to: phone,
    });

    await db.otpLog.create({
      data: { shop: session.shop, phone, otp },
    });

    return json({ success: true, message: "OTP sent." });

  } catch (error) {
    console.error("Twilio Error:", error);
    return json({ success: false, error: "Failed to send OTP. Please check API credentials." }, { status: 500 });
  }
}
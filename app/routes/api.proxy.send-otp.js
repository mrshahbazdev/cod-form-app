import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export async function action({ request }) {
  const { session } = await authenticate.public.appProxy(request);
  if (!session) return new Response("Unauthorized", { status: 401 });

  const { phone } = await request.json();
  if (!phone) return json({ success: false, error: "Phone number required." }, { status: 400 });

  // SPAM PROTECTION: Check karein ke is number par pichle 60 seconds mein OTP bheja gaya hai ya nahi
  const sixtySecondsAgo = new Date(Date.now() - 60000);
  const recentOtp = await db.otpLog.findFirst({
    where: { shop: session.shop, phone, createdAt: { gte: sixtySecondsAgo } },
  });

  if (recentOtp) {
    return json({ success: false, error: "Please wait 60 seconds before requesting another OTP." }, { status: 429 });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  console.log(`=================================`);
  console.log(`OTP for ${phone} is: ${otp}`);
  console.log(`=================================`);

  await db.otpLog.create({
    data: { shop: session.shop, phone, otp },
  });

  return json({ success: true, message: "OTP sent." });
}

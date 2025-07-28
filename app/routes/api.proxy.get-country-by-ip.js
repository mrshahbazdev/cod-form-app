import { json } from "@remix-run/node";

export async function loader({ request }) {
  const ip = request.headers.get("x-forwarded-for")?.split(',')[0] || "103.108.164.0"; // Default IP Pakistan ka hai
  try {
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=country`);
    const data = await response.json();
    return json({ country: data.country });
  } catch (error) {
    return json({ country: "Pakistan" });
  }
}

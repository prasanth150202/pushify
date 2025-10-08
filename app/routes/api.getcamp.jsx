import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server"; // adjust path

// GET loader
export async function loader({ request }) {
  try {
    // --- Authenticate and get shop domain ---
    const { session } = await authenticate.admin(request);
    const shopDomain = session?.shop;

    if (!shopDomain) {
      return json({ success: false, message: "Unauthorized: Shop not found" }, { status: 401 });
    }

    // --- Forward the request to PHP backend with shop domain ---
    const response = await fetch(
      `https://api.zingbot.io/push-notify/push-notify/campaigns.php?shop=${encodeURIComponent(
        shopDomain
      )}`
    );

    const data = await response.json();

    if (!response.ok) {
      return json(
        { success: false, message: data.message || "Error fetching campaigns" },
        { status: response.status }
      );
    }

    // --- Normalize for frontend DataTable ---
    const campaigns = (data.data || []).map((c) => ({
      id: c.id,
      name: c.Name,
      sent: c.Sent,
      clicks: c.Clicks,
      status: c.Status,
      createdAt: c["Created At"],
    }));

    return json({ success: true, campaigns });
  } catch (err) {
    console.error("API getcamp error:", err);
    return json({ success: false, message: "Server error" }, { status: 500 });
  }
}

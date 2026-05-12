import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export async function action({ request }) {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  const { session } = await authenticate.admin(request);
  const shop = session?.shop;

  if (!shop) {
    return json({ success: false, error: "Shop not found in session" }, { status: 400 });
  }

  const body = await request.json();

  try {
    // First get the merchant's own FCM token from DB
    const tokenRes = await fetch(
      `https://int.pushnova.app/get_merchant_token.php?shop=${encodeURIComponent(shop)}`
    );
    const tokenData = await tokenRes.json();

    if (!tokenData.success || !tokenData.token) {
      return json({
        success: false,
        error: "No browser token found. Please open your store in a browser that has push notifications enabled first.",
      });
    }

    const res = await fetch("https://int.pushnova.app/send_test_notification.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shop,
        token: tokenData.token,
        title: body.title || "Test Notification",
        body: body.body || "This is a preview of your push notification!",
        link: body.link || `https://${shop}`,
      }),
    });

    const data = await res.json();
    return json(data);
  } catch (err) {
    console.error("Test notification error:", err);
    return json({ success: false, error: err.message }, { status: 500 });
  }
}

import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server"; // your Shopify auth helper

export const action = async ({ request }) => {
  try {
    // ----------------------------
    // Authenticate Shopify Admin / Embedded App
    // ----------------------------
    const { session } = await authenticate.admin(request);
    const shopDomain = session.shop;

    // ----------------------------
    // Parse JSON body
    // ----------------------------
    const body = await request.json();

    // Log incoming request
    console.log("Incoming push template payload:", { ...body, shop: shopDomain });

    // ----------------------------
    // Attach shop_domain
    // ----------------------------
    const payload = {
      ...body,
      shop: shopDomain, // fixed typo shoP -> shop
    };

    // ----------------------------
    // Send to PHP endpoint
    // ----------------------------
    const response = await fetch(
      "https://api.zingbot.io/push-notify/push-notify/campaigns.php",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    // ----------------------------
    // Handle response
    // ----------------------------
    if (!response.ok) {
      const text = await response.text();
      const errorLog = {
        message: "Failed to send to Zingbot API",
        status: response.status,
        response: text,
        shop: shopDomain,
        payload,
      };

      console.error("Zingbot API error log:", errorLog);

      return json({ success: false, errorLog }, { status: response.status });
    }

    const data = await response.json().catch(() => ({}));
    return json({ success: true, data });
  } catch (err) {
    const errorLog = {
      message: err.message,
      stack: err.stack,
      shop: "unknown",
    };

    console.error("Error in sendtemp action:", errorLog);

    return json({ success: false, errorLog }, { status: 500 });
  }
};

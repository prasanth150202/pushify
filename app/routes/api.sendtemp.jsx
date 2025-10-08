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

    // Optional: log incoming payload for debugging
    console.log("Incoming push template payload:", { ...body, shop_domain: shopDomain });

    // ----------------------------
    // Attach shop_domain
    // ----------------------------
    const payload = {
      ...body,
      shop_domain: shopDomain,
    };

    // ----------------------------
    // Send to PHP endpoint
    // ----------------------------
    const response = await fetch(
      "https://api.zingbot.io/push-notify/push-notify/templates.php",
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
      console.error("Zingbot API error:", text);
      return json(
        { error: "Failed to send to Zingbot API", details: text },
        { status: response.status }
      );
    }

    const data = await response.json().catch(() => ({}));
    return json({ success: true, data });
  } catch (err) {
    console.error("Error in sendtemp action:", err);
    return json({ error: err.message }, { status: 500 });
  }
};

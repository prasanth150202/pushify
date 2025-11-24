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
    console.log("Incoming push template payload:", {
      encrypted: !!body?.ciphertext,
      shop_domain: shopDomain,
      ciphertext_len: body?.ciphertext?.length ?? null,
    });

    // ----------------------------
    // Attach shop_domain
    // ----------------------------
    let payload;
    let headers = { "Content-Type": "application/json" };
    if (body && body.ciphertext) {
      payload = { ciphertext: body.ciphertext };
      headers["X-Encrypted"] = "1";
      headers["X-Shop-Domain"] = shopDomain;
    } else {
      payload = {
        ...body,
        shop_domain: shopDomain,
      };
    }

    // ----------------------------
    // Send to PHP endpoint
    // ----------------------------
    const response = await fetch(
      "https://api.zingbot.io/push-notify/push-notify/templates.php",
      {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      }
    );
    console.log("templates.php response status", response.status, "headers", Object.fromEntries(response.headers.entries()));

    // ----------------------------
    // Handle response
    // ----------------------------
    if (!response.ok) {
      const text = await response.text();
      console.error("Zingbot API error:", { status: response.status, text, payloadPreview: { encrypted: !!payload?.ciphertext, len: payload?.ciphertext?.length ?? null } });
      return json(
        { error: "Failed to send to Zingbot API", details: text },
        { status: response.status }
      );
    }

    const data = await response.json().catch((err) => {
      console.error("templates.php JSON parse error", err);
      return {};
    });
    console.log("templates.php success payload", data);
    return json({ success: true, data });
  } catch (err) {
    console.error("Error in sendtemp action:", err);
    return json({ error: err.message }, { status: 500 });
  }
};

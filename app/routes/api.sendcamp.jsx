import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server"; // your Shopify auth helper

export const action = async ({ request }) => {
  try {
    
    const { session } = await authenticate.admin(request);
    const shopDomain = session.shop;

    
    const body = await request.json();

    console.log("Incoming push template payload:", { encrypted: !!body?.ciphertext, shop: shopDomain });

    let payload;
    let headers = {
      "Content-Type": "application/json",
    };

    if (body && body.ciphertext) {
      // passthrough encrypted body, attach shop separately within encrypted payload on client side
      payload = { ciphertext: body.ciphertext };
      headers["X-Encrypted"] = "1";
      headers["X-Shop-Domain"] = shopDomain;
    } else {
      payload = {
        ...body,
        shop: shopDomain, 
      };
    }

    console.log("Forwarding to campaigns.php with headers", headers, "payload keys", body?.ciphertext ? Object.keys({ ciphertext: body.ciphertext }) : Object.keys(payload || {}));
    const response = await fetch(
      "https://api.zingbot.io/push-notify/push-notify/campaigns.php",
      {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      }
    );
    console.log("Remote response status", response.status);

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

    const wire = await response.json().catch(() => ({}));
    console.log("Remote response body", wire && wire.ciphertext ? `{ciphertext len=${(wire.ciphertext||'').length}}` : wire);
    // If backend returns ciphertext, pass it through unchanged.
    if (wire && wire.ciphertext) {
      return json({ ciphertext: wire.ciphertext });
    }
    return json({ success: true, data: wire });
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

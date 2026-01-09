import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const action = async ({ request }) => {
  try {
    const { session } = await authenticate.admin(request);
    const shopDomain = session.shop;

    if (!shopDomain) {
      return json({ error: "Shop domain not found in session" }, { status: 400 });
    }

    const body = await request.json();

    const payload = {
      ...body,
      shop_domain: shopDomain,
    };

    const response = await fetch(
      "https://int.pushnova.app/customui.php",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const text = await response.text();
      return json(
        { error: "Failed to send to Zingbot API", details: text },
        { status: response.status }
      );
    }

    const data = await response.json().catch(() => ({}));
    return json({ success: true, data });
  } catch (err) {
    return json({ error: err.message }, { status: 500 });
  }
};

// ✅ Handle GET request (fetch saved UI config)
export const loader = async ({ request }) => {
  try {
    const { session } = await authenticate.admin(request);
    const shopDomain = session.shop;

    if (!shopDomain) {
      return json({ error: "Shop domain not found in session" }, { status: 400 });
    }

    const response = await fetch(
      `https://int.pushnova.app/customui.php?shop_domain=${encodeURIComponent(
        shopDomain
      )}`
    );

    if (!response.ok) {
      const text = await response.text();
      return json(
        { error: "Failed to fetch UI config from Zingbot API", details: text },
        { status: response.status }
      );
    }

    const data = await response.json();
    return json(data);
  } catch (err) {
    return json({ error: err.message }, { status: 500 });
  }
};

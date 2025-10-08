import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server"; // adjust path if needed
import { callInternalAndExternal } from "../utils/parallelRequests.server";

// Handle GET
export async function loader({ request }) {
  const { session } = await authenticate.admin(request);

  const shopDomain = session?.shop;
  if (!shopDomain) {
    return json({ error: "Shop not found in session" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://api.zingbot.io/push-notify/push-notify/templates.php?shopdomain=${shopDomain}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      }
    );

    if (!res.ok) {
      throw new Error(`PHP API error: ${res.status}`);
    }

    const data = await res.json();
    return json({ templates: data.data || [] });
  } catch (err) {
    console.error("Template fetch failed", err);
    return json({ error: "Failed to fetch templates" }, { status: 500 });
  }
}

// Handle POST & DELETE
export async function action({ request }) {
  const { session } = await authenticate.admin(request);
  const shopDomain = session?.shop;

  const method = request.method;

  try {
    if (method === "POST") {
      const body = await request.json();
      body.shop_domain = shopDomain; // inject shop domain

      const result = await callInternalAndExternal({
        internalUrl: `${process.env.INTERNAL_BASE_URL}/api/templates`,
        internalInit: {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
        externalUrl: "https://api.zingbot.io/push-notify/push-notify/templates.php",
        externalInit: {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      });

      const status = result.success ? 200 : 207;
      return json(result, { status });
    }

    if (method === "DELETE") {
      const body = await request.json();

      const result = await callInternalAndExternal({
        internalUrl: `${process.env.INTERNAL_BASE_URL}/api/templates`,
        internalInit: {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
        externalUrl: "https://api.zingbot.io/push-notify/push-notify/templates.php",
        externalInit: {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      });

      const status = result.success ? 200 : 207;
      return json(result, { status });
    }

    return json({ error: "Method not allowed" }, { status: 405 });
  } catch (err) {
    console.error("Template action failed", err);
    return json({ error: "API request failed" }, { status: 500 });
  }
}

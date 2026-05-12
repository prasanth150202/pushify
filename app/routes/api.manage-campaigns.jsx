import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

// GET: list ongoing campaigns
export async function loader({ request }) {
  const { session } = await authenticate.admin(request);
  const shop = session?.shop;

  const url = new URL(request.url);
  const type = url.searchParams.get("type") || "ongoing";

  try {
    const res = await fetch(
      `https://int.pushnova.app/manage_campaigns.php?shop=${encodeURIComponent(shop)}&type=${encodeURIComponent(type)}`
    );
    const data = await res.json();
    return json(data);
  } catch (err) {
    return json({ success: false, error: err.message }, { status: 500 });
  }
}

// POST: pause / resume / stop
export async function action({ request }) {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  const { session } = await authenticate.admin(request);
  const shop = session?.shop;

  const body = await request.json();
  body.shop = shop;

  try {
    const res = await fetch("https://int.pushnova.app/manage_campaigns.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return json(data, { status: res.ok ? 200 : res.status });
  } catch (err) {
    return json({ success: false, error: err.message }, { status: 500 });
  }
}

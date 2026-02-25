import { authenticate } from "../shopify.server";

export const action = async ({ request }) => {
  try {
    const { shop, session, topic, payload } = await authenticate.webhook(request);

    const apiPayload = {
      shop: shop,
      plan_id: "FREE_PLAN", // Default plan on install
      event: "app_installed",
    };

    await fetch(
      "https://int.pushnova.app/update_shop_plan.php",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(apiPayload),
      }
    );

  } catch (error) {
    // Silent fail
  }

  return new Response();
};
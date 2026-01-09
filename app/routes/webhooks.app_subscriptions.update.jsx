import { authenticate } from "../shopify.server";

export const action = async ({ request }) => {
  try {
    const { shop, session, topic, payload } = await authenticate.webhook(request);

    const subscription = payload.app_subscription;
    const planName = subscription?.name;

    const planNameToId = {
      "Starter Plan": "STARTER_PLAN",
      "Starter": "STARTER_PLAN",
      "Growth Plan": "GROWTH_PLAN",
      "Growth": "GROWTH_PLAN",
      "Pro Plan": "PRO_PLAN",
      "Pro": "PRO_PLAN",
    };

    const planId = planNameToId[planName] || "FREE_PLAN";

    const apiPayload = {
      shop: shop,
      plan_id: planId,
      event: "subscription_update",
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
    // Silent fail — Shopify only needs a 200 response.
  }

  return new Response();
};

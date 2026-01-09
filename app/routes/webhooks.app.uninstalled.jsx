import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }) => {
  const { shop, session, topic } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  // Respond immediately to Shopify
  const response = new Response(null, { status: 200 });

  // Handle cleanup asynchronously without blocking the response
  setImmediate(async () => {
    try {
      // Webhook requests can trigger multiple times and after an app has already been uninstalled.
      // If this webhook already ran, the session may have been deleted previously.
      if (session) {
        await db.session.deleteMany({ where: { shop } });
      }

      // Reset plan to FREE when app is uninstalled
      await fetch("https://int.pushnova.app/update_shop_plan.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shop: shop,
          plan_id: "FREE_PLAN",
          event: "app_uninstalled"
        })
      });
      
      console.log(`Reset plan to FREE for uninstalled shop: ${shop}`);
    } catch (error) {
      console.error(`Error processing uninstall for ${shop}:`, error);
    }
  });

  return response;
};

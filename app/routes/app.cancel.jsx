import { json, redirect } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  try {
    const { billing, session } = await authenticate.admin(request);
    const { shop } = session;

    // Get the current active subscription
    try {
      const billingCheck = await billing.require({
        plans: ["STARTER_PLAN", "GROWTH_PLAN", "PRO_PLAN"],
        isTest: true,
        onFailure: () => {
          throw new Error('No active plan');
        },
      });

      const subscription = billingCheck.appSubscriptions[0];
      
      if (subscription) {
        // Cancel the subscription
        await billing.cancel({
          subscriptionId: subscription.id,
          isTest: true,
        });
        
        console.log(`Cancelled subscription: ${subscription.name} (id ${subscription.id})`);
      }
      
      // Redirect back to pricing page
      return redirect("/app/plan");
    } catch (error) {
      if (error.message === 'No active plan') {
        // No active plan to cancel, redirect to pricing
        return redirect("/app/plan");
      }
      throw error;
    }
  } catch (error) {
    console.error("Cancel subscription error:", error);
    return json({ success: false, error: error.message }, { status: 500 });
  }
};


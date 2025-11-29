import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export async function loader({ request }) {
    const { session } = await authenticate.admin(request);
    const shop = session.shop;

    try {
        // Fetch plan from PHP database
        const response = await fetch(
            `https://api.zingbot.io/push-notify/push-notify/get_shop_plan.php?shop=${encodeURIComponent(shop)}`
        );

        if (!response.ok) {
            throw new Error(`PHP API returned ${response.status}`);
        }

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || "Failed to fetch plan");
        }

        return json({
            success: true,
            plan: data.plan,
            shop: data.shop || null,
            shop_found: data.shop_found,
            usage: data.usage || null,
            limits: data.limits || null,
            features: data.features || null
        });

    } catch (error) {
        console.error("Error fetching plan from PHP:", error);
        // Return default free plan on error
        return json({
            success: true,
            plan: {
                id: "FREE_PLAN",
                name: "Free",
                event: null
            },
            shop: null,
            shop_found: false,
            error: error.message
        });
    }
}

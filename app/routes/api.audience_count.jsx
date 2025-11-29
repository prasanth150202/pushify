import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export async function action({ request }) {
    const { session } = await authenticate.admin(request);
    const shop = session.shop;

    if (request.method !== "POST") {
        return json({ success: false, message: "Method not allowed" }, { status: 405 });
    }

    try {
        const body = await request.json();
        const conditions = body.conditions;

        // Forward to PHP API
        const response = await fetch(
            "https://api.zingbot.io/push-notify/push-notify/get_audience_count.php",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    shop: shop, // Use authenticated shop
                    conditions: conditions
                })
            }
        );

        const data = await response.json();
        return json(data);

    } catch (error) {
        console.error("Error fetching audience count:", error);
        return json({ success: false, message: error.message }, { status: 500 });
    }
}

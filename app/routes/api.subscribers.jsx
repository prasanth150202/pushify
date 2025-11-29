import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export async function loader({ request }) {
    try {
        // Authenticate and get shop domain
        const { session } = await authenticate.admin(request);
        const shopDomain = session?.shop;

        if (!shopDomain) {
            return json({ success: false, message: "Unauthorized: Shop not found" }, { status: 401 });
        }

        // Fetch subscriber count from PHP backend
        const response = await fetch(
            `https://api.zingbot.io/push-notify/push-notify/subscribers_count.php?shop=${encodeURIComponent(
                shopDomain
            )}`
        );

        const data = await response.json();

        if (!response.ok) {
            return json(
                { success: false, message: data.message || "Error fetching subscriber count" },
                { status: response.status }
            );
        }

        // Return the subscriber count
        return json({
            success: true,
            totalUsers: data.total_users || 0
        });
    } catch (err) {
        console.error("API subscribers count error:", err);
        return json({ success: false, message: "Server error", totalUsers: 0 }, { status: 500 });
    }
}

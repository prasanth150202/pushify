import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export async function loader({ request }) {
    const { session } = await authenticate.admin(request);
    const shop = session.shop;

    try {
        const response = await fetch(`https://int.pushnova.app/analytics.php?shop=${shop}`);

        if (!response.ok) {
            throw new Error(`API responded with status: ${response.status}`);
        }

        const data = await response.json();
        return json(data);
    } catch (error) {
        console.error("Error fetching analytics:", error);
        return json({ error: "Failed to fetch analytics data" }, { status: 500 });
    }
}

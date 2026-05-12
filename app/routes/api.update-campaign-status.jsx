import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export async function action({ request }) {
    const { session } = await authenticate.admin(request);
    const shop = session.shop;

    if (request.method !== "POST") {
        return json({ success: false, message: "Method not allowed" }, { status: 405 });
    }

    try {
        const { id, status } = await request.json();

        if (!id || !status) {
            return json({ success: false, message: "Missing required fields" }, { status: 400 });
        }

        const response = await fetch("https://int.pushnova.app/campaigns.php", {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                id,
                status,
                shop,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Failed to update campaign status");
        }

        return json({ success: true, message: "Campaign status updated successfully" });
    } catch (error) {
        console.error("Error updating campaign status:", error);
        return json({ success: false, message: error.message || "Server error" }, { status: 500 });
    }
}

import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
    try {
        const { admin } = await authenticate.admin(request);

        const response = await admin.graphql(`
      {
        shop {
          myshopifyDomain
        }
      }
    `);

        const data = await response.json();
        const shop = data.data.shop.myshopifyDomain;

        return json({ shop });
    } catch (err) {
        console.error("Error fetching shop domain:", err);
        return json({ error: "Failed to fetch shop domain" }, { status: 500 });
    }
};

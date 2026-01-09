import prisma from "./app/db.server.js";
import { shopifyApi, LATEST_API_VERSION } from "@shopify/shopify-api";
import "@shopify/shopify-api/adapters/node";

const shopify = shopifyApi({
    apiKey: process.env.SHOPIFY_API_KEY,
    apiSecretKey: process.env.SHOPIFY_API_SECRET,
    scopes: process.env.SCOPES?.split(","),
    hostName: process.env.SHOPIFY_APP_URL?.replace(/https?:\/\//, ""),
    apiVersion: LATEST_API_VERSION,
    isEmbeddedApp: true,
});

async function syncShopsToMySQL() {
    console.log("Starting shop sync to MySQL...\n");

    try {
        const sessions = await prisma.session.findMany({
            where: {
                isOnline: false
            }
        });

        console.log(`Found ${sessions.length} shops to sync\n`);

        for (const session of sessions) {
            const shop = session.shop;
            console.log(`Processing ${shop}...`);

            try {
                // Create a GraphQL client
                const client = new shopify.clients.Graphql({
                    session: {
                        shop: session.shop,
                        accessToken: session.accessToken,
                    }
                });

                // Fetch real shop data from Shopify
                const response = await client.query({
                    data: `{
            shop {
              id
              name
              myshopifyDomain
              url
              plan {
                displayName
              }
            }
          }`
                });

                const shopData = response.body.data.shop;

                const payload = {
                    id: shopData.id,
                    name: shopData.name,
                    domain: shopData.myshopifyDomain,
                    custom_domain: shopData.url,
                    plan: shopData.plan?.displayName || "Free",
                    event: "synced",
                    opened_at: new Date().toISOString()
                };

                console.log(`  Syncing to MySQL:`, payload);

                const phpResponse = await fetch("https://int.pushnova.app/shop_handler.php", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(payload)
                });

                const result = await phpResponse.json();
                console.log(`  ✓ Result:`, result);
                console.log();

            } catch (error) {
                console.error(`  ✗ Error for ${shop}:`, error.message);
                console.log();
            }
        }

        console.log("Sync complete!");
    } catch (error) {
        console.error("Fatal error:", error);
    } finally {
        await prisma.$disconnect();
    }
}

syncShopsToMySQL();

// app/routes/app.jsx

export const loader = async ({ request }) => {
  // Replace with the "app_handle" from your shopify.app.toml file
  const appHandle = "pushnova";

  // Authenticate with Shopify credentials to handle server-side queries
  const { authenticate } = await import("../shopify.server");

  // Initiate billing and redirect utilities
  const { billing, redirect, session } = await authenticate.admin(request);

  // Check whether the store has an active subscription
  const { hasActivePayment } = await billing.check();

  // Extract the store handle from the shop domain
  // e.g., "cool-shop" from "cool-shop.myshopify.com"
  const shop = session.shop; // e.g., "cool-shop.myshopify.com"
  const storeHandle = shop.replace('.myshopify.com', '');

  // If there's no active subscription, redirect to the plan selection page...
  if (!hasActivePayment) {
    return redirect(`https://admin.shopify.com/store/${storeHandle}/charges/${appHandle}/pricing_plans`, {
      target: "_top", // required since the URL is outside the embedded app scope
    });
  }

  // ...Otherwise, continue loading the app as normal
  return {
    apiKey: process.env.SHOPIFY_API_KEY || "",
  };
};
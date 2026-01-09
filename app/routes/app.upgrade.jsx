// app/routes/app.upgrade.jsx
import { authenticate } from "../shopify.server";
import { redirect } from "@remix-run/node";

export async function loader({ request }) {
  const { session } = await authenticate.admin(request);

  const shop = session.shop;
  const storeHandle = shop.replace(".myshopify.com", "");

  const pricingUrl =
    `https://admin.shopify.com/store/${storeHandle}/charges/${process.env.APP_HANDLE}/pricing_plans`;

  return redirect(pricingUrl, { target: "_top" });
}

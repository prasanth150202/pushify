// app.jsx
import { Link, Outlet, useLoaderData, useRouteError } from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { NavMenu } from "@shopify/app-bridge-react";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import { authenticate } from "../shopify.server";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

// app.jsx
export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const response = await admin.graphql(`
    {
      shop {
        id
        name
        myshopifyDomain
        primaryDomain {
          host
        }
      }
    }
  `);
  const data = await response.json();
  const shop = data.data.shop;

  const shopInfo = {
    id: shop.id,
    name: shop.name,
    domain: shop.myshopifyDomain,
    custom_domain: shop.primaryDomain?.host || null,
    opened_at: new Date().toISOString(),
  };

  // Send directly to external API (skip internal route)
  try {
    await fetch("https://int.pushnova.app/shop_handler.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(shopInfo),
    });
  } catch (err) {
    console.error("Error sending shop data:", err);
  }

  return { apiKey: process.env.SHOPIFY_API_KEY || "", shopInfo };
};


export default function App() {
  const { apiKey, shopInfo } = useLoaderData();

  return (
    <AppProvider isEmbeddedApp apiKey={apiKey}>
      <NavMenu>
        <Link to="/app" rel="home">
          Home
        </Link>
        <Link to="/app/additional">Campaign Builder</Link>
        <Link to="/app/editor">Templates Creation</Link>
        <Link to="/app/templateslib">Templates Library</Link>
        <Link to="/app/customui">Customize UI</Link>
        <Link to="/app/plan">Plans</Link>
      </NavMenu>
      <Outlet context={{ shop: shopInfo.domain }} />
    </AppProvider>
  );
}

// Shopify needs Remix to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};

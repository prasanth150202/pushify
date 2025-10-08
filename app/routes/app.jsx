// app.jsx
import { Link, Outlet, useLoaderData, useRouteError } from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { NavMenu } from "@shopify/app-bridge-react";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import { authenticate } from "../shopify.server";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

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

  // Build URL from request
  const url = new URL(request.url);
  const apiUrl = `${url.origin}/api/sendshop`;

  await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(shopInfo),
  });

  return { apiKey: process.env.SHOPIFY_API_KEY || "" };
};


export default function App() {
  const { apiKey } = useLoaderData();

  return (
    <AppProvider isEmbeddedApp apiKey={apiKey}>
      <NavMenu>
        <Link to="/app" rel="home">
          Home
        </Link>
        <Link to="/app/additional">Campaign Builder</Link>
        <Link to="/app/editor">Templates Creation</Link>
        <Link to="/app/templateslib">Templates Library</Link>
        <Link to="/app/customui">Cuztomize UI</Link>
      </NavMenu>
      <Outlet />
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

import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { Page, Card, Text, Spinner } from "@shopify/polaris";
import {
  authenticate,
  STARTER_PLAN,
  GROWTH_PLAN,
  PRO_PLAN,
} from "../shopify.server";

export async function loader({ request }) {
  const { billing } = await authenticate.admin(request);

  const url = new URL(request.url);
  const planKey = url.searchParams.get("plan");

  const validPlans = [STARTER_PLAN, GROWTH_PLAN, PRO_PLAN];
  if (!validPlans.includes(planKey)) {
    throw new Response("Invalid Plan", { status: 400 });
  }

  // HERE: return billing.request() *directly*
  return billing.request({
    plan: planKey,
    isTest: true,
    returnUrl: `${process.env.SHOPIFY_APP_URL}/app/plan`,
  });
}

export default function Upgrade() {
  const data = useLoaderData();

  if (data?.error) {
    return (
      <Page>
        <Card>
          <Text as="p" tone="critical">
            Error: {data.error}
          </Text>
        </Card>
      </Page>
    );
  }

  return (
    <Page>
      <Card>
        <div style={{ textAlign: "center", padding: "2rem" }}>
          <Spinner size="large" />
          <Text as="p">Redirecting to billing...</Text>
        </div>
      </Card>
    </Page>
  );
}

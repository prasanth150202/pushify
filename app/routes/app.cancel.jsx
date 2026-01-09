// app/routes/app.upgrade.tsx
import { json, redirect } from "@remix-run/node";
import { authenticate } from "../shopify.server"; // Adjust path

// Define plans (match shopify.server.js exports)
const PLAN_DETAILS = {
  STARTER_PLAN: { name: 'Starter Plan', amount: '9.00', interval: 'EVERY_30_DAYS', trialDays: 7 },
  GROWTH_PLAN: { name: 'Growth Plan', amount: '29.00', interval: 'EVERY_30_DAYS', trialDays: 0 },
  PRO_PLAN: { name: 'Pro Plan', amount: '79.00', interval: 'EVERY_30_DAYS', trialDays: 0 },
};

export async function loader({ request }) {
  const { admin, session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const planKey = url.searchParams.get("plan");
  const validPlans = Object.keys(PLAN_DETAILS);

  if (!validPlans.includes(planKey)) {
    throw new Response("Invalid plan", { status: 400 });
  }

  const plan = PLAN_DETAILS[planKey];

  try {
    // Step 1: Check existing active sub
    const checkQuery = `
      query {
        currentAppInstallation {
          activeSubscriptions {
            id
            status
          }
        }
      }
    `;
    const checkRes = await admin.graphql(checkQuery);
    const checkData = await checkRes.json();
    if (checkData.data?.currentAppInstallation?.activeSubscriptions?.length > 0) {
      return json({ error: 'Already subscribed to an active plan' }, { status: 400 });
    }

    // Step 2: Get shop currency
    const shopQuery = `query { shop { currencyCode } }`;
    const shopRes = await admin.graphql(shopQuery);
    const shopData = await shopRes.json();
    const currencyCode = shopData.data?.shop?.currencyCode || 'USD';

    // Step 3: Create sub via GraphQL
    const mutation = `
      mutation appSubscriptionCreate($input: AppSubscriptionCreateInput!) {
        appSubscriptionCreate(input: $input) {
          appSubscription { id status }
          confirmationUrl
          userErrors { field message }
        }
      }
    `;
    const variables = {
      input: {
        name: plan.name,
        lineItems: [{
          plan: {
            appRecurringPricingDetails: {
              price: { amount: plan.amount, currencyCode },
              interval: plan.interval,
              intervalCount: 1,
              trialDays: plan.trialDays,
            },
          },
        }],
        returnUrl: `${process.env.SHOPIFY_APP_URL}/app/upgrade/callback?plan=${planKey}`, // Dedicated callback
      },
    };

    const res = await admin.graphql(mutation, { variables });
    const data = await res.json();

    // Step 4: Log & handle errors
    console.log('Subscription response:', JSON.stringify(data, null, 2));
    const { appSubscriptionCreate } = data.data || {};
    const errors = appSubscriptionCreate?.userErrors || data.errors || [];

    if (errors.length > 0) {
      const msg = errors.map(e => `${e.field}: ${e.message}`).join(', ');
      console.error('Sub errors:', msg);
      throw new Response(`Subscription failed: ${msg}`, { status: 400 });
    }

    if (appSubscriptionCreate.confirmationUrl) {
      throw redirect(appSubscriptionCreate.confirmationUrl); // Merchant approves
    }

    return json({ success: true, subId: appSubscriptionCreate.appSubscription.id });
  } catch (error) {
    console.error('Upgrade loader error:', error);
    throw json({ error: 'Subscription setup failed' }, { status: 500 });
  }
}

// Handle post-approval callback (add this route or merge)
export async function action({ request }) {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const planKey = url.searchParams.get("plan");
  const shop = session.shop;

  // Update your DB (e.g., call PHP endpoint)
  try {
    await fetch(`https://int.pushnova.app/update_shop_plan.php?shop=${encodeURIComponent(shop)}&plan=${planKey}`, {
      method: 'POST',
    });
  } catch (e) {
    console.error('DB update failed:', e); // Non-blocking
  }

  return redirect('/app/plan'); // Back to pricing
}

export default function Upgrade() {
  return null; // Or loading spinner: <Page><Text>Redirecting to Shopify...</Text></Page>
}
import {
  Page,
  Box,
  Button,
  Card,
  CalloutCard,
  Text,
  Grid,
  Divider,
  BlockStack,
  Badge,
  Icon
} from "@shopify/polaris";
import { CheckIcon } from "@shopify/polaris-icons";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { authenticate, STARTER_PLAN, GROWTH_PLAN, PRO_PLAN } from "../shopify.server";



export async function loader({ request }) {
  const { billing, session } = await authenticate.admin(request);
  const shop = session.shop;

  try {
    // First, fetch plan from PHP database
    const phpResponse = await fetch(
      `https://api.zingbot.io/push-notify/push-notify/get_shop_plan.php?shop=${encodeURIComponent(shop)}`
    );

    let dbPlan = null;
    if (phpResponse.ok) {
      const phpData = await phpResponse.json();
      if (phpData.success && phpData.shop_found) {
        dbPlan = phpData.plan;
      }
    }

    // Then check Shopify billing
    let shopifyPlan = null;
    try {
      const billingCheck = await billing.require({
        plans: [STARTER_PLAN, GROWTH_PLAN, PRO_PLAN],
        isTest: true,
        onFailure: () => {
          throw new Error("No active plan");
        },
      });

      const subscription = billingCheck.appSubscriptions[0];
      const planName = subscription.lineItems[0].plan.name;

      // Convert Shopify name → your internal ID
      const planNameToId = {
        "Starter Plan": "STARTER_PLAN",
        "Growth Plan": "GROWTH_PLAN",
        "Pro Plan": "PRO_PLAN",
      };

      const resolvedPlanId = planNameToId[planName] ?? "FREE_PLAN";

      shopifyPlan = {
        name: planName,
        id: resolvedPlanId,
      };

      // If we have a Shopify plan but DB plan is different, sync to DB
      if (dbPlan && dbPlan.id !== resolvedPlanId) {
        // Update DB to match Shopify
        await fetch("https://api.zingbot.io/push-notify/push-notify/update_shop_plan.php", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            shop: shop,
            plan_id: resolvedPlanId,
            event: "shopify_billing_sync"
          })
        });
      }
    } catch (error) {
      if (error.message !== "No active plan") {
        console.error("Shopify billing check error:", error);
      }
    }

    // Priority: Shopify billing > DB plan > Free plan
    const finalPlan = shopifyPlan || dbPlan || { name: "Free", id: "FREE_PLAN" };

    return json({
      plan: finalPlan,
      source: shopifyPlan ? "shopify" : (dbPlan ? "database" : "default"),
    });

  } catch (error) {
    console.error("Error in plan loader:", error);
    return json({
      plan: { name: "Free", id: "FREE_PLAN" },
      source: "error_fallback",
      error: error.message
    });
  }
}



let planData = [
  {
    title: "Free",
    description: "Perfect for getting started",
    price: "0",
    priceDisplay: "$0",
    period: "/month",
    action: "Current Plan",
    name: "Free",
    id: "FREE_PLAN",
    url: null,
    popular: false,
    features: [
      "100 pushes/day",
      "Basic segmentation",
      "Basic automations",
      "Standard delivery",
      "Basic analytics"
    ]
  },
  {
    title: "Starter",
    description: "For small stores starting engagement",
    price: "9",
    priceDisplay: "$9",
    period: "/month",
    action: "Upgrade to Starter",
    name: "Starter Plan",
    id: "STARTER_PLAN",
    url: "/app/upgrade?plan=STARTER_PLAN",
    popular: false,
    features: [
      "500 pushes/day",
      "Basic targeting",
      "Custom segment support",
      "Enhanced analytics",
      "Scheduled push campaigns",
      "Standard delivery"
    ]
  },
  {
    title: "Growth",
    description: "Most popular for growing brands",
    price: "29",
    priceDisplay: "$29",
    period: "/month",
    action: "Upgrade to Growth",
    name: "Growth Plan",
    id: "GROWTH_PLAN",
    url: "/app/upgrade?plan=GROWTH_PLAN",
    popular: true,
    features: [
      "1,000 pushes/day",
      "Advanced segmentation",
      "AI-generated push content",
      "Event-based triggers",
      "Growth-stage analytics & reporting",
      "API access",
      "High-priority delivery"
    ]
  },
  {
    title: "Pro",
    description: "For high-volume stores",
    price: "79",
    priceDisplay: "$79",
    period: "/month",
    action: "Upgrade to Pro",
    name: "Pro Plan",
    id: "PRO_PLAN",
    url: "/app/upgrade?plan=PRO_PLAN",
    popular: false,
    features: [
      "Up to 25,000 pushes/day",
      "Full AI suite",
      "Multi-layer triggers & workflows",
      "Deep analytics + behavior tracking",
      "API + Webhooks",
      "Priority delivery servers",
      "Dedicated support (optional add-on)"
    ]
  },
  {
    title: "Enterprise",
    description: "Custom solutions for large brands",
    price: "custom",
    priceDisplay: "Contact Sales",
    period: "",
    action: "Contact Sales",
    name: "Enterprise Plan",
    id: "ENTERPRISE_PLAN",
    url: "mailto:sales@pushnova.com?subject=Enterprise Plan Inquiry",
    popular: false,
    features: [
      "Custom push/day capacity",
      "Role-based AI personalization",
      "SLA-backed delivery uptime",
      "Full API/Webhook ecosystem",
      "Engineering-assisted integrations",
      "Dedicated account manager"
    ]
  },
];


export default function PricingPage() {
  const { plan } = useLoaderData();

  console.log('plan', plan);

  const planNameToId = {
    "Starter Plan": "STARTER_PLAN",
    "Growth Plan": "GROWTH_PLAN",
    "Pro Plan": "PRO_PLAN",
    "Enterprise Plan": "ENTERPRISE_PLAN",
    Free: "FREE_PLAN",
  };

  const resolvedPlanName = plan?.name ?? "Free";
  const resolvedPlanId = plan?.id ?? planNameToId[resolvedPlanName] ?? "FREE_PLAN";
  const isFreePlan = resolvedPlanId === "FREE_PLAN";

  const calloutPrimaryAction = isFreePlan
    ? {
      content: "Upgrade Plan",
      url: "/app/upgrade?plan=STARTER_PLAN",
    }
    : {
      content: "Cancel Plan",
      url: "/app/cancel",
    };

  // Split enterprise out of the main grid
  const enterprisePlan = planData.find((p) => p.id === "ENTERPRISE_PLAN");
  const otherPlans = planData.filter((p) => p.id !== "ENTERPRISE_PLAN");

  return (
    <Page>
      <ui-title-bar title="Pricing Plans" />

      <Box paddingBlockEnd="600">
        <CalloutCard
          title="Current Plan Status"
          illustration="https://cdn.shopify.com/s/files/1/0583/6465/7734/files/tag.png?v=1705280535"
          primaryAction={calloutPrimaryAction}
        >
          {isFreePlan ? (
            <Text as="p">
              You're currently on the <strong>Free plan</strong>. Upgrade to unlock more features and remove branding.
            </Text>
          ) : (
            <Text as="p">
              You're currently on the <strong>{resolvedPlanName}</strong>. All features for this plan are unlocked.
            </Text>
          )}
        </CalloutCard>
      </Box>

      {/* Main plans grid (excluding Enterprise) */}
      <Grid>
        {otherPlans.map((plan_item, index) => {
          const isCurrentPlan =
            plan_item.id === resolvedPlanId ||
            plan_item.name === resolvedPlanName;

          return (
            <Grid.Cell key={index} columnSpan={{ xs: 6, sm: 6, md: 3, lg: 3, xl: 3 }}>
              <div style={{ height: '100%' }}>
                <Card
                  background={isCurrentPlan ? "bg-surface-success" : "bg-surface"}
                  padding="0"
                >
                  <Box padding="500" paddingBlockEnd="400">
                    <BlockStack gap="300">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Text as="h3" variant="headingLg" fontWeight="bold">
                          {plan_item.title}
                        </Text>
                        {plan_item.popular && (
                          <Badge tone="info">Most Popular</Badge>
                        )}
                      </div>

                      <Text as="p" variant="bodyMd" tone="subdued">
                        {plan_item.description}
                      </Text>

                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                        <Text as="span" variant="heading2xl" fontWeight="bold">
                          {plan_item.priceDisplay}
                        </Text>
                        <Text as="span" variant="bodyMd" tone="subdued">
                          {plan_item.period}
                        </Text>
                      </div>
                    </BlockStack>
                  </Box>

                  <Box padding="500" paddingBlockStart="0">
                    <BlockStack gap="300">
                      <Text as="p" variant="bodyMd" fontWeight="semibold">
                        What's included:
                      </Text>

                      <BlockStack gap="200">
                        {plan_item.features.map((feature, idx) => (
                          <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <div style={{ width: 20, minWidth: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Icon source={CheckIcon} tone="success" />
                            </div>
                            <Text as="span" variant="bodyMd" alignment="start" style={{ flex: 1 }}>
                              {feature}
                            </Text>
                          </div>
                        ))}
                      </BlockStack>
                    </BlockStack>
                  </Box>

                  <Box padding="500" paddingBlockStart="400">
                    {isCurrentPlan ? (
                      <Button fullWidth disabled>
                        Current Plan
                      </Button>
                    ) : plan_item.url ? (
                      <Button
                        fullWidth
                        primary={plan_item.popular || plan_item.id !== "ENTERPRISE_PLAN"}
                        url={plan_item.url}
                        external={plan_item.id === "ENTERPRISE_PLAN"}
                      >
                        {plan_item.action}
                      </Button>
                    ) : null}
                  </Box>
                </Card>
              </div>
            </Grid.Cell>
          );
        })}
      </Grid>

      {/* Enterprise — separate full-width layout */}
      {enterprisePlan && (
        <Box paddingBlockStart="600">
          <Card padding="0" background="bg-subdued">
            <Box padding="600">
              <BlockStack gap="400">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <Text as="h2" variant="headingLg" fontWeight="bold">
                      {enterprisePlan.title}
                    </Text>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      {enterprisePlan.description}
                    </Text>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <Text as="p" variant="headingLg" fontWeight="bold">
                      {enterprisePlan.priceDisplay}
                    </Text>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      {enterprisePlan.period}
                    </Text>
                  </div>
                </div>

                <Divider />

                <div style={{ display: 'flex', gap: '32px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 320 }}>
                    <Text as="p" variant="bodyMd" fontWeight="semibold">
                      Enterprise features:
                    </Text>
                    <BlockStack gap="200" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexDirection: 'column' }}>
                      {enterprisePlan.features.map((feature, idx) => (
                        <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <div style={{ width: 20, minWidth: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Icon source={CheckIcon} tone="success" />
                          </div>
                          <Text as="span" variant="bodyMd" alignment="start" style={{ flex: 1 }}>
                            {feature}
                          </Text>
                        </div>
                      ))}
                    </BlockStack>
                  </div>

                  <div style={{ width: 320 }}>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      For custom pricing, SLAs, dedicated support and integrations, contact our sales team.
                    </Text>
                    <Box paddingBlockStart="200">
                      <Button fullWidth primary url={enterprisePlan.url} external>
                        Contact Sales
                      </Button>
                    </Box>
                    <Box paddingBlockStart="200">
                      <Text as="p" variant="caption" tone="subdued">
                        Or email: sales@pushnova.com
                      </Text>
                    </Box>
                  </div>
                </div>
              </BlockStack>
            </Box>
          </Card>
        </Box>
      )}
    </Page>
  );
}



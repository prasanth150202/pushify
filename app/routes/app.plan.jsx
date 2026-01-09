import {
  Page,
  Box,
  Button,
  Card,
  CalloutCard,
  Text,
  Grid,
  BlockStack,
  Badge,
  Icon,
} from "@shopify/polaris";
import { CheckIcon } from "@shopify/polaris-icons";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { useLoaderData } from "@remix-run/react";

/* =========================
   LOADER
========================= */
export async function loader({ request }) {
  const { session } = await authenticate.admin(request);

  const shop = session.shop;
  const storeHandle = shop.replace(".myshopify.com", "");

  let dbPlan = null;

  try {
    const res = await fetch(
      `https://int.pushnova.app/get_shop_plan.php?shop=${encodeURIComponent(
        shop
      )}`
    );

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.shop_found) {
        dbPlan = data.plan;
      }
    }
  } catch (e) {
    console.error("DB plan fetch failed", e);
  }

  const pricingUrl = `https://admin.shopify.com/store/${storeHandle}/charges/${process.env.APP_HANDLE}/pricing_plans`;

  return json({
    currentPlan: dbPlan || { id: "FREE_PLAN", name: "Free" },
    pricingUrl,
  });
}

/* =========================
   PLAN DATA (UI ONLY)
   (Updated with user's requested tiers/features)
========================= */
const plans = [
  {
    title: "Free",
    id: "FREE_PLAN",
    price: "$0",
    subtitle: "100 pushes / day",
    features: [
      "100 pushes/day",
      "Basic segmentation",
      "Basic automations",
      "Standard delivery",
      "Basic analytics",
    ],
  },
  {
    title: "Starter",
    id: "STARTER_PLAN",
    price: "$9",
    subtitle: "500 pushes / day",
    period: "per 30 days",
    features: [
      "500 pushes/day",
      "Basic targeting",
      "Custom segment support",
      "Enhanced analytics",
      "Scheduled push campaigns",
      "Standard delivery",
    ],
  },
  {
    title: "Growth",
    id: "GROWTH_PLAN",
    price: "$29",
    subtitle: "1,000 pushes / day",
    popular: true,
    features: [
      "1,000 pushes/day",
      "Advanced segmentation",
      "AI-generated push content",
      "Event-based triggers",
      "Growth-stage analytics & reporting",
      "API access",
      "High-priority delivery",
    ],
  },
  {
    title: "Pro",
    id: "PRO_PLAN",
    price: "$79",
    subtitle: "Up to 25,000 pushes / day",
    features: [
      "Up to 25,000 pushes/day",
      "Full AI suite",
      "Multi-layer triggers & workflows",
      "Deep analytics + behavior tracking",
      "API + Webhooks",
      "Priority delivery servers",
      "Dedicated support (optional add-on)",
    ],
  },
];

/* =========================
   COMPONENT
========================= */
export default function PricingPage() {
  const { currentPlan, pricingUrl } = useLoaderData();

  const redirectToPricing = () => {
    window.top.location.href = pricingUrl;
  };

  const cardStyle = (plan, isCurrent) => ({
    borderRadius: "12px",
    boxShadow: isCurrent
      ? "0 8px 24px rgba(34, 197, 94, 0.15)"
      : plan.popular
      ? "0 8px 24px rgba(34, 197, 94, 0.12)"
      : "0 4px 12px rgba(12, 18, 26, 0.08)",
    border: plan.popular
      ? "2px solid #22c55e"
      : isCurrent
      ? "2px solid #22c55e"
      : "1px solid #e6e9ee",
    overflow: "hidden",
    transition: "all 0.2s ease-in-out",
    backgroundColor: "#ffffff",
    height: "100%",
  });

  const headerStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "1.5rem",
  };

  const priceStyle = {
    fontSize: "2.5rem",
    fontWeight: "bold",
    color: "#1f2937",
    lineHeight: "1.2",
  };

  const periodStyle = {
    fontSize: "0.875rem",
    color: "#6b7280",
    marginLeft: "0.5rem",
    verticalAlign: "super",
  };

  const subtitleStyle = {
    marginTop: "0.25rem",
    color: "#9ca3af",
    fontSize: "0.875rem",
  };

  const featureStyle = {
    display: "flex",
    alignItems: "center",
    gap: "0",
    marginBottom: "0",
    padding: "0.25rem 0",
    flexDirection: "row",
        width:"fit-content",
  };

  const featureTextStyle = {
    color: "#374151",
    fontSize: "0.875rem",
  };

  return (
    <Page>
      <ui-title-bar title="Pricing Plans" />

      <Box paddingBlockEnd="600">
        <CalloutCard
          title="Current Plan"
          illustration="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystates-empty-state-graphic-pricing-1x_512x.png"
          primaryAction={{
            content: "Manage Subscription",
            onAction: redirectToPricing,
          }}
        >
          <Text>
            You are currently on <strong>{currentPlan.name}</strong>
          </Text>
        </CalloutCard>
      </Box>

      <Box padding="400" style={{ maxWidth: 1200, margin: "0 auto" }}>
        <Box paddingBlockEnd="500">
          <div style={headerStyle}>
            <div>
              <Text variant="headingLg" as="h2" fontWeight="semibold">
                Choose a plan that fits your store
              </Text>
              <Text subdued tone="subdued" fontSize="base">
                Scalable push notifications for every stage of growth — from free
                starter plans to enterprise-ready delivery.
              </Text>
            </div>
          </div>
        </Box>

        <Grid gap="400">
          {plans.map((plan, i) => {
            const isCurrent = plan.id === currentPlan.id;

            return (
              <Grid.Cell key={i} columnSpan={{ xs: 12, sm: 6, md: 6, lg: 3 }}>
                <Card sectioned={false} style={cardStyle(plan, isCurrent)}>
                  <Box padding="600">
                    <BlockStack gap="400">
                      <div style={headerStyle}>
                        <Text variant="headingMd" fontWeight="bold" color={isCurrent || plan.popular ? "success" : "base"}>
                          {plan.title}
                        </Text>

                        {(plan.popular || isCurrent) && (
                          <Badge status={isCurrent ? "success" : "info"} size="small">
                            {isCurrent ? "Current Plan" : "Most Popular"}
                          </Badge>
                        )}
                      </div>

                      <div>
                        <Text variant="heading2xl" as="div" style={priceStyle}>
                          {plan.price}
                          <span style={periodStyle}>{plan.period || "/month"}</span>
                        </Text>
                        {plan.subtitle && (
                          <Text as="div" subdued style={subtitleStyle}>
                            {plan.subtitle}
                          </Text>
                        )}
                      </div>

                      <div>
                        {plan.features.map((f, idx) => (
                          <div key={idx} style={featureStyle}>
                            <Icon source={CheckIcon} tone={isCurrent || plan.popular ? "success" : "base"} color="base" />
                            <Text style={featureTextStyle}>{f}</Text>
                          </div>
                        ))}
                      </div>

                      {isCurrent ? (
                        <Button fullWidth disabled variant="secondary" tone="success">
                          Current Plan
                        </Button>
                      ) : (
                        <Button fullWidth onClick={redirectToPricing} primary tone={plan.popular ? "success" : "base"}>
                          {plan.popular ? "Get Started" : "Upgrade"}
                        </Button>
                      )}
                    </BlockStack>
                  </Box>
                </Card>
              </Grid.Cell>
            );
          })}
        </Grid>
      </Box>
    </Page>
  );
}
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export async function action({ request }) {
  const { admin } = await authenticate.admin(request);

  try {
    // Create app_subscriptions/update webhook
    const subscriptionWebhook = await admin.graphql(`
      mutation webhookSubscriptionCreate($topic: WebhookSubscriptionTopic!, $webhookSubscription: WebhookSubscriptionInput!) {
        webhookSubscriptionCreate(topic: $topic, webhookSubscription: $webhookSubscription) {
          webhookSubscription {
            id
            callbackUrl
          }
          userErrors {
            field
            message
          }
        }
      }
    `, {
      variables: {
        topic: "APP_SUBSCRIPTIONS_UPDATE",
        webhookSubscription: {
          callbackUrl: `${new URL(request.url).origin}/webhooks/app_subscriptions/update`,
          format: "JSON"
        }
      }
    });

    // Create app/uninstalled webhook  
    const uninstallWebhook = await admin.graphql(`
      mutation webhookSubscriptionCreate($topic: WebhookSubscriptionTopic!, $webhookSubscription: WebhookSubscriptionInput!) {
        webhookSubscriptionCreate(topic: $topic, webhookSubscription: $webhookSubscription) {
          webhookSubscription {
            id
            callbackUrl
          }
          userErrors {
            field
            message
          }
        }
      }
    `, {
      variables: {
        topic: "APP_UNINSTALLED",
        webhookSubscription: {
          callbackUrl: `${new URL(request.url).origin}/webhooks/app/uninstalled`,
          format: "JSON"
        }
      }
    });

    const subscriptionResult = await subscriptionWebhook.json();
    const uninstallResult = await uninstallWebhook.json();

    return json({
      success: true,
      subscriptionWebhook: subscriptionResult.data.webhookSubscriptionCreate,
      uninstallWebhook: uninstallResult.data.webhookSubscriptionCreate
    });

  } catch (error) {
    return json({ success: false, error: error.message }, { status: 500 });
  }
}
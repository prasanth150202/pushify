import { Page, Card, Button, Text, BlockStack } from "@shopify/polaris";
import { Form, useActionData } from "@remix-run/react";
import { json } from "@remix-run/node";

export async function action({ request }) {
  const formData = await request.formData();
  
  if (formData.get("action") === "setup") {
    const response = await fetch(`${new URL(request.url).origin}/api/setup-webhooks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    });
    
    const result = await response.json();
    return json(result);
  }
  
  return json({ success: false });
}

export default function SetupWebhooks() {
  const actionData = useActionData();

  return (
    <Page>
      <ui-title-bar title="Setup Webhooks" />
      
      <Card>
        <BlockStack gap="400">
          <Text as="h2" variant="headingMd">
            Webhook Registration
          </Text>
          
          <Text as="p">
            Click the button below to register the required webhooks for subscription updates and app uninstalls.
          </Text>
          
          <Form method="post">
            <input type="hidden" name="action" value="setup" />
            <Button submit primary>
              Setup Webhooks
            </Button>
          </Form>
          
          {actionData && (
            <Card background={actionData.success ? "bg-surface-success" : "bg-surface-critical"}>
              <Text as="p">
                {actionData.success ? "Webhooks created successfully!" : `Error: ${actionData.error}`}
              </Text>
              {actionData.success && (
                <Text as="p" variant="bodyMd">
                  Subscription webhook: {actionData.subscriptionWebhook?.webhookSubscription?.id}<br/>
                  Uninstall webhook: {actionData.uninstallWebhook?.webhookSubscription?.id}
                </Text>
              )}
            </Card>
          )}
        </BlockStack>
      </Card>
    </Page>
  );
}
import { useState, useEffect, useCallback } from "react";
import {
  Page,
  Card,
  Text,
  DataTable,
  Button,
  ButtonGroup,
  Badge,
  Frame,
  Toast,
  Spinner,
  Box,
  BlockStack,
  EmptyState,
  InlineStack,
} from "@shopify/polaris";
import { useOutletContext } from "@remix-run/react";

function statusBadge(status) {
  const map = {
    active: "success",
    paused: "warning",
    stopped: "critical",
  };
  return <Badge tone={map[status] || "info"}>{status}</Badge>;
}

export default function Automations() {
  const { shop } = useOutletContext() || {};
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [toastActive, setToastActive] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [toastError, setToastError] = useState(false);

  const fetchCampaigns = useCallback(async () => {
    if (!shop) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/manage-campaigns?shop=${encodeURIComponent(shop)}&type=ongoing`);
      const data = await res.json();
      if (data.success) {
        setCampaigns(data.data || []);
      } else {
        console.error("Failed to fetch automations:", data.error);
      }
    } catch (err) {
      console.error("Error fetching automations:", err);
    } finally {
      setLoading(false);
    }
  }, [shop]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const handleAction = async (campaignId, action) => {
    setActionLoading(`${campaignId}-${action}`);
    try {
      const res = await fetch("/api/manage-campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaign_id: campaignId, action, shop }),
      });
      const data = await res.json();
      if (data.success) {
        setToastMsg(`Campaign ${action}d successfully`);
        setToastError(false);
        setToastActive(true);
        fetchCampaigns();
      } else {
        setToastMsg(data.error || `Failed to ${action} campaign`);
        setToastError(true);
        setToastActive(true);
      }
    } catch (err) {
      setToastMsg(`Error: ${err.message}`);
      setToastError(true);
      setToastActive(true);
    } finally {
      setActionLoading(null);
    }
  };

  const rows = campaigns.map((c) => [
    c.campaign_name,
    c.total_sent ?? 0,
    c.total_failed ?? 0,
    c.clicks ?? 0,
    statusBadge(c.status),
    c.created_at,
    <ButtonGroup key={c.id}>
      {c.status === "active" && (
        <Button
          size="slim"
          onClick={() => handleAction(c.id, "pause")}
          loading={actionLoading === `${c.id}-pause`}
        >
          Pause
        </Button>
      )}
      {c.status === "paused" && (
        <Button
          size="slim"
          variant="primary"
          onClick={() => handleAction(c.id, "resume")}
          loading={actionLoading === `${c.id}-resume`}
        >
          Resume
        </Button>
      )}
      {c.status !== "stopped" && (
        <Button
          size="slim"
          tone="critical"
          onClick={() => handleAction(c.id, "stop")}
          loading={actionLoading === `${c.id}-stop`}
        >
          Stop
        </Button>
      )}
      {c.status === "stopped" && (
        <Text as="span" tone="subdued" variant="bodySm">Stopped</Text>
      )}
    </ButtonGroup>,
  ]);

  return (
    <Frame>
      <Page
        title="Automations"
        subtitle="Ongoing campaigns that automatically send to new subscribers who match your conditions"
        primaryAction={{
          content: "Refresh",
          onAction: fetchCampaigns,
          loading,
        }}
      >
        <Card>
          {loading ? (
            <Box padding="800">
              <BlockStack inlineAlign="center">
                <Spinner size="large" />
              </BlockStack>
            </Box>
          ) : campaigns.length === 0 ? (
            <EmptyState
              heading="No automation campaigns yet"
              image=""
            >
              <p>Create an ongoing campaign in the Campaign Builder to automate push notifications for new subscribers.</p>
              <Box paddingBlockStart="400">
                <Button url="/app/additional">Go to Campaign Builder</Button>
              </Box>
            </EmptyState>
          ) : (
            <DataTable
              columnContentTypes={["text", "numeric", "numeric", "numeric", "text", "text", "text"]}
              headings={["Campaign Name", "Sent", "Failed", "Clicks", "Status", "Created At", "Actions"]}
              rows={rows}
            />
          )}
        </Card>

        {toastActive && (
          <Toast
            content={toastMsg}
            error={toastError}
            onDismiss={() => setToastActive(false)}
          />
        )}
      </Page>
    </Frame>
  );
}

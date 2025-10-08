import { useState, useEffect, useCallback } from "react";
import {
  Page,
  Card,
  Text,
  Grid,
  Button,
  DataTable,
  Spinner,
} from "@shopify/polaris";

export default function Dashboard() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch campaigns (initial + refresh)
  const fetchCampaigns = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);
      const res = await fetch("/api/getcamp", { headers: { "Cache-Control": "no-cache" } });
      const data = await res.json();
      setCampaigns(data.campaigns || []);
    } catch (err) {
      console.error("Error fetching campaigns:", err);
    } finally {
      if (showLoading) setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchCampaigns(true);
  }, [fetchCampaigns]);

  // Polling for live updates without page reload
  useEffect(() => {
    const intervalId = setInterval(() => {
      setIsRefreshing(true);
      fetchCampaigns(false);
    }, 10000); // 10s interval, adjust as needed
    return () => clearInterval(intervalId);
  }, [fetchCampaigns]);

  const stats = {
    totalUsers: 1240,
    campaignsSent: 320,
    conversions: 87,
    clickingPercent: "12.5%",
  };

  const handleEnableClick = async () => {
    try {
      // Let’s call a new endpoint that returns the shop domain from session
      const res = await fetch("/api/shop"); // you need to create this loader
      const data = await res.json();
      const shopDomain = data.shop;

      if (!shopDomain) return;
      const url = `https://${shopDomain}/admin/themes/current/editor?context=apps&appEmbed=76a0889c1a8ffc064c4cf865e40fdd92`;
      window.open(url, "_blank");
    } catch (err) {
      console.error("Error getting shop domain:", err);
    }
  };

  return (
    <Page title="Push Notifications Dashboard">
      {/* Stats Grid */}
      <Grid columns={{ sm: 1, md: 2, lg: 4 }}>
        <Grid.Cell>
          <Card>
            <Text as="h3" variant="headingMd">
              Total Users
            </Text>
            <Text as="p" variant="bodyLg">
              {stats.totalUsers}
            </Text>
          </Card>
        </Grid.Cell>
        <Grid.Cell>
          <Card>
            <Text as="h3" variant="headingMd">
              Campaigns Sent
            </Text>
            <Text as="p" variant="bodyLg">
              {stats.campaignsSent}
            </Text>
          </Card>
        </Grid.Cell>
        <Grid.Cell>
          <Card>
            <Text as="h3" variant="headingMd">
              Conversions
            </Text>
            <Text as="p" variant="bodyLg">
              {stats.conversions}
            </Text>
          </Card>
        </Grid.Cell>
        <Grid.Cell>
          <Card>
            <Text as="h3" variant="headingMd">
              Clicking %
            </Text>
            <Text as="p" variant="bodyLg">
              {stats.clickingPercent}
            </Text>
          </Card>
        </Grid.Cell>
      </Grid>

      
      <Card sectioned>
        <Text as="h3" variant="headingMd" alignment="center">
          Enable Push Notifications on your Store
        </Text>
        <div style={{ marginTop: "16px", textAlign: "center" }}>
          <Button primary onClick={handleEnableClick}>
            Enable Extension
          </Button>
        </div>
      </Card>

      {/* Campaign Analytics Table */}
      <Card title={isRefreshing ? "Campaign Analytics (updating…)" : "Campaign Analytics"} sectioned>
        {loading ? (
          <Spinner accessibilityLabel="Loading campaigns" size="large" />
        ) : campaigns.length === 0 ? (
          <Text>No campaigns found</Text>
        ) : (
          <DataTable
            columnContentTypes={["text", "numeric", "numeric", "text", "text"]}
            headings={["Name", "Sent", "Clicks", "Status", "Created At"]}
            rows={campaigns.map((c) => [
              c.name,
              c.sent,
              c.clicks,
              c.status,
              c.createdAt,
            ])}
          />
        )}
      </Card>
    </Page>
  );
}
    
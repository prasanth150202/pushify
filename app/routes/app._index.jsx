import { useState, useEffect, useCallback } from "react";
import {
  Page,
  Card,
  Text,
  Grid,
  Button,
  DataTable,
  Spinner,
  BlockStack,
  Box,
  Divider,
  InlineGrid,
} from "@shopify/polaris";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

// Professional dashboard palette
const COLORS = ["#5c6ac4", "#47c1bf", "#ecc94b", "#de3618", "#9c6ade", "#bf0711"];

export default function Dashboard() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [extensionEnabled, setExtensionEnabled] = useState(true);
  const [shopDomain, setShopDomain] = useState("");
  const [checkingExtension, setCheckingExtension] = useState(true);
  const [totalUsers, setTotalUsers] = useState(0);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);

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

  // Fetch extension status
  const fetchExtensionStatus = useCallback(async () => {
    try {
      setCheckingExtension(true);
      const res = await fetch("/api/extension-status");
      const data = await res.json();
      setExtensionEnabled(data.enabled || false);
    } catch (err) {
      console.error("Error fetching extension status:", err);
      setExtensionEnabled(false);
    } finally {
      setCheckingExtension(false);
    }
  }, []);

  // Fetch shop domain
  const fetchShopDomain = useCallback(async () => {
    try {
      const res = await fetch("/api/shop");
      const data = await res.json();
      setShopDomain(data.shop || "");
    } catch (err) {
      console.error("Error fetching shop domain:", err);
    }
  }, []);

  // Fetch total users count
  const fetchTotalUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/subscribers");
      const data = await res.json();
      setTotalUsers(data.totalUsers || 0);
    } catch (err) {
      console.error("Error fetching total users:", err);
      setTotalUsers(0);
    }
  }, []);

  // Fetch analytics data
  const fetchAnalytics = useCallback(async () => {
    try {
      setLoadingAnalytics(true);
      const res = await fetch("/api/analytics");
      const data = await res.json();
      if (data.error) {
        console.error("Analytics API error:", data.error);
      } else {
        setAnalyticsData(data);
      }
    } catch (err) {
      console.error("Error fetching analytics:", err);
    } finally {
      setLoadingAnalytics(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchCampaigns(true);
    fetchExtensionStatus();
    fetchShopDomain();
    fetchTotalUsers();
    fetchAnalytics();
  }, [fetchCampaigns, fetchExtensionStatus, fetchShopDomain, fetchTotalUsers, fetchAnalytics]);

  // Manual refresh handler
  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchCampaigns(false);
    fetchExtensionStatus();
    fetchTotalUsers();
    fetchAnalytics();
  };

  // Calculate dynamic stats from campaigns
  const totalSent = campaigns.reduce((sum, c) => sum + (c.sent || 0), 0);
  const totalClicks = campaigns.reduce((sum, c) => sum + (c.clicks || 0), 0);

  const stats = {
    totalUsers: totalUsers,
    totalCampaigns: campaigns.length,
    totalSent: totalSent,
    totalClicks: totalClicks,
    clickRate: totalSent > 0
      ? `${((totalClicks / totalSent) * 100).toFixed(1)}%`
      : "0%",
  };

  const handleEnableClick = () => {
    if (!shopDomain) {
      console.error("Shop domain not available");
      return;
    }
    const url = `https://${shopDomain}/admin/themes/current/editor?context=apps&appEmbed=76a0889c1a8ffc064c4cf865e40fdd92`;
    window.open(url, "_blank");
  };

  // Helper to transform object to array for Recharts
  const transformData = (obj) => {
    if (!obj) return [];
    return Object.entries(obj).map(([name, value]) => ({ name, value }));
  };

  // Custom Tooltip for Recharts
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          backgroundColor: '#fff',
          border: '1px solid #dfe3e8',
          padding: '10px',
          borderRadius: '4px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <p style={{ margin: 0, fontWeight: 'bold' }}>{label}</p>
          <p style={{ margin: 0, color: '#637381' }}>{`${payload[0].name}: ${payload[0].value}`}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Page
      title="
      Dashboard"
      primaryAction={{
        content: 'Refresh',
        loading: isRefreshing,
        onAction: handleRefresh,
      }}
    >
      <BlockStack gap="600">
        {/* Enable Extension Card */}
        {!checkingExtension && !extensionEnabled && (
          <Card sectioned>
            <BlockStack gap="400" align="center">
              <Text as="h3" variant="headingMd" alignment="center">
                Enable Push Notifications on your Store
              </Text>
              <Button primary onClick={handleEnableClick}>
                Enable Extension
              </Button>
            </BlockStack>
          </Card>
        )}

        {/* Main Stats Grid */}
        <Grid
          columns={{ xs: 1, sm: 2, md: 4, lg: 4, xl: 4 }}   // 4 column layout in desktop
          areas={{
            xs: ['subscribers', 'campaigns', 'sent', 'rate'],   // mobile = stack
            sm: ['subscribers campaigns', 'sent rate'],         // tablet = 2x2
            md: ['subscribers campaigns sent rate'],            // desktop = 4 in one line
            lg: ['subscribers campaigns sent rate'],
            xl: ['subscribers campaigns sent rate'],
          }}
        >


          <Grid.Cell area="subscribers">
            <Card>
              <Box padding="600">
                <BlockStack gap="300" inlineAlign="center">
                  <Text as="h3" variant="headingSm" tone="subdued" alignment="center">Subscribers</Text>
                  <Text as="p" variant="heading2xl" fontWeight="bold">{stats.totalUsers}</Text>
                </BlockStack>
              </Box>
            </Card>
          </Grid.Cell>
          <Grid.Cell area="campaigns">
            <Card>
              <Box padding="600">
                <BlockStack gap="300" inlineAlign="center">
                  <Text as="h3" variant="headingSm" tone="subdued" alignment="center">Campaigns</Text>
                  <Text as="p" variant="heading2xl" fontWeight="bold">{stats.totalCampaigns}</Text>
                </BlockStack>
              </Box>
            </Card>
          </Grid.Cell>
          <Grid.Cell area="sent">
            <Card>
              <Box padding="600">
                <BlockStack gap="300" inlineAlign="center">
                  <Text as="h3" variant="headingSm" tone="subdued" alignment="center">Total Sent</Text>
                  <Text as="p" variant="heading2xl" fontWeight="bold">{stats.totalSent}</Text>
                </BlockStack>
              </Box>
            </Card>
          </Grid.Cell>
          <Grid.Cell area="rate">
            <Card>
              <Box padding="600">
                <BlockStack gap="300" inlineAlign="center">
                  <Text as="h3" variant="headingSm" tone="subdued" alignment="center">Click Rate</Text>
                  <Text as="p" variant="heading2xl" fontWeight="bold">{stats.clickRate}</Text>
                </BlockStack>
              </Box>
            </Card>
          </Grid.Cell>
        </Grid>

        <Divider />
        {/* Campaign Analytics Table */}
        <Card>
          <Box padding="400">
            <Text as="h3" variant="headingMd">Campaign History</Text>
          </Box>
          {loading ? (
            <Box padding="400" style={{ display: 'flex', justifyContent: 'center' }}>
              <Spinner accessibilityLabel="Loading campaigns" size="large" />
            </Box>
          ) : campaigns.length === 0 ? (
            <Box padding="400">
              <Text tone="subdued">No campaigns found</Text>
            </Box>
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
        {/* Analytics Section */}
        <Box>
          <BlockStack gap="400">
            <Text as="h2" variant="headingLg">Store Analytics</Text>

            {loadingAnalytics ? (
              <Card>
                <Box padding="800" style={{ display: 'flex', justifyContent: 'center' }}>
                  <Spinner accessibilityLabel="Loading analytics" size="large" />
                </Box>
              </Card>
            ) : analyticsData ? (
              <BlockStack gap="400">
                {/* Traffic Stats Row */}
                <Grid
                  columns={{ xs: 1, sm: 2, md: 4, lg: 4, xl: 4 }}
                  areas={{
                    xs: ['hits', 'sessions', 'checkout', 'orders'],
                    sm: ['hits sessions', 'checkout orders'],
                    md: ['hits sessions checkout orders'],
                    lg: ['hits sessions checkout orders'],
                    xl: ['hits sessions checkout orders'],
                  }}
                >
                  <Grid.Cell area="hits">
                    <Card>
                      <Box padding="400">
                        <BlockStack gap="200">
                          <Text as="h3" variant="bodySm" tone="subdued">Total Hits</Text>
                          <Text as="p" variant="headingxl">{analyticsData.traffic?.total_hits || 0}</Text>
                        </BlockStack>
                      </Box>
                    </Card>
                  </Grid.Cell>
                  <Grid.Cell area="sessions">
                    <Card>
                      <Box padding="400">
                        <BlockStack gap="200">
                          <Text as="h3" variant="bodySm" tone="subdued">Unique Sessions</Text>
                          <Text as="p" variant="headingxl">{analyticsData.traffic?.unique_sessions || 0}</Text>
                        </BlockStack>
                      </Box>
                    </Card>
                  </Grid.Cell>
                  <Grid.Cell area="checkout">
                    <Card>
                      <Box padding="400">
                        <BlockStack gap="200">
                          <Text as="h3" variant="bodySm" tone="subdued">Checkout Sessions</Text>
                          <Text as="p" variant="headingxl">{analyticsData.checkout_sessions || 0}</Text>
                        </BlockStack>
                      </Box>
                    </Card>
                  </Grid.Cell>
                  <Grid.Cell area="orders">
                    <Card>
                      <Box padding="400">
                        <BlockStack gap="200">
                          <Text as="h3" variant="bodySm" tone="subdued">Orders</Text>
                          <Text as="p" variant="headingxl">{analyticsData.orders_count || 0}</Text>
                        </BlockStack>
                      </Box>
                    </Card>
                  </Grid.Cell>
                </Grid>

                {/* Charts Row 1 */}
                {/* FORCE POLARIS TO 2 COLUMNS INLINE */}
                <style>{`
  .chart-wrapper .Polaris-Grid {
    --pc-grid-columns-md: 2 !important;
    --pc-grid-columns-lg: 2 !important;
    --pc-grid-columns-xl: 2 !important;
  }
  @media (max-width: 900px) {
    .chartGridOverride {
      --pc-grid-columns-md: 1 !important;
    }
  }
`}</style>
                <div className="chart-wrapper">
                  <Grid columns={{ sm: 1, md: 2 }}>

                    {/* Visitors by Location */}
                    <Grid.Cell>
                      <Card>
                        <Box padding="400">
                          <BlockStack gap="400">
                            <Text as="h3" variant="headingMd">Visitors by Location</Text>
                            <Box style={{ height: 300 }}>
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={transformData(analyticsData.locations)}>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#dfe3e8" />
                                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                  <YAxis allowDecimals={false} axisLine={false} tickLine={false} />
                                  <Tooltip content={<CustomTooltip />} />
                                  <Bar dataKey="value" fill="#5c6ac4" radius={[4, 4, 0, 0]} name="Visitors" />
                                </BarChart>
                              </ResponsiveContainer>
                            </Box>
                          </BlockStack>
                        </Box>
                      </Card>
                    </Grid.Cell>

                    {/* Browser Distribution */}
                    <Grid.Cell>
                      <Card>
                        <Box padding="400">
                          <BlockStack gap="400">
                            <Text as="h3" variant="headingMd">Browser Distribution</Text>
                            <Box style={{ height: 300 }}>
                              <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                  <Pie
                                    data={transformData(analyticsData.browser_split)}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                  >
                                    {transformData(analyticsData.browser_split).map((entry, index) => (
                                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                  </Pie>
                                  <Tooltip content={<CustomTooltip />} />
                                  <Legend verticalAlign="bottom" height={36} />
                                </PieChart>
                              </ResponsiveContainer>
                            </Box>
                          </BlockStack>
                        </Box>
                      </Card>
                    </Grid.Cell>

                    {/* Device Split */}
                    <Grid.Cell>
                      <Card>
                        <Box padding="400">
                          <BlockStack gap="400">
                            <Text as="h3" variant="headingMd">Device Split</Text>
                            <Box style={{ height: 300 }}>
                              <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                  <Pie
                                    data={transformData(analyticsData.device_usage)}
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={80}
                                    dataKey="value"
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                  >
                                    {transformData(analyticsData.device_usage).map((entry, index) => (
                                      <Cell key={index} fill={COLORS[(index + 2) % COLORS.length]} />
                                    ))}
                                  </Pie>
                                  <Tooltip content={<CustomTooltip />} />
                                </PieChart>
                              </ResponsiveContainer>
                            </Box>
                          </BlockStack>
                        </Box>
                      </Card>
                    </Grid.Cell>

                    {/* Top Products Viewed */}
                    <Grid.Cell>
                      <Card>
                        <Box padding="400">
                          <BlockStack gap="400">
                            <Text as="h3" variant="headingMd">Top Products Viewed</Text>
                            <Box style={{ height: 300 }}>
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart layout="vertical" data={transformData(analyticsData.product_views)}>
                                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#dfe3e8" />
                                  <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} />
                                  <YAxis dataKey="name" type="category" width={120} axisLine={false} tickLine={false} />
                                  <Tooltip content={<CustomTooltip />} />
                                  <Bar dataKey="value" fill="#47c1bf" radius={[0, 4, 4, 0]} name="Views" />
                                </BarChart>
                              </ResponsiveContainer>
                            </Box>
                          </BlockStack>
                        </Box>
                      </Card>
                    </Grid.Cell>

                  </Grid>

                </div>
              </BlockStack>
            ) : (
              <Card>
                <Box padding="400">
                  <Text tone="subdued">No analytics data available.</Text>
                </Box>
              </Card>
            )}
          </BlockStack>
        </Box>

        <Divider />


      </BlockStack>
    </Page>
  );
}

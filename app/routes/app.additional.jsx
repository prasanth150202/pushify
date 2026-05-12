import { useState, useEffect } from "react";
import {
  Card,
  Select,
  TextField,
  Button,
  ButtonGroup,
  InlineStack,
  List,
  Text,
  Box,
  Frame,
  Spinner,
  Page,
  ChoiceList,
  Grid,
  Banner,
  ContextualSaveBar,
} from "@shopify/polaris";
import { useAppBridge } from "@shopify/app-bridge-react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { usePlanFeatures } from "../hooks/usePlanFeatures";
import { UpgradeBanner } from "../components/UpgradePrompts";

// Combined date and time selector component
function DateTimeSelector({ dateValue, onDateChange, timeValue, onTimeChange }) {
  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0"));
  const minutes = Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, "0"));

  const [hour, minute] = timeValue.split(":");

  const handleHourChange = (newHour) => {
    onTimeChange(`${newHour}:${minute}`);
  };

  const handleMinuteChange = (newMinute) => {
    onTimeChange(`${hour}:${newMinute}`);
  };

  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: "8px", flexWrap: "nowrap" }}>
      <div style={{ width: "150px" }}>
        <TextField label="Date" type="date" value={dateValue} onChange={onDateChange} autoComplete="off" />
      </div>
      <Text as="span" variant="bodyMd" fontWeight="medium">
        at
      </Text>
      <div style={{ display: "flex", alignItems: "flex-end", gap: "4px" }}>
        <div style={{ width: "80px" }}>
          <Select
            label="Hour"
            labelHidden
            options={hours.map((h) => ({ label: h, value: h }))}
            value={hour}
            onChange={handleHourChange}
          />
        </div>
        <Text as="span">:</Text>
        <div style={{ width: "80px" }}>
          <Select
            label="Minute"
            labelHidden
            options={minutes.map((m) => ({ label: m, value: m }))}
            value={minute}
            onChange={handleMinuteChange}
          />
        </div>
      </div>
    </div>
  );
}

// Date Range Selector component
function DateRangeSelector({ startDate, endDate, onStartDateChange, onEndDateChange }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: "12px", flexWrap: "wrap" }}>
      <div style={{ width: "150px" }}>
        <TextField label="From Date" type="date" value={startDate} onChange={onStartDateChange} autoComplete="off" />
      </div>
      <Text as="span" variant="bodyMd" fontWeight="medium">
        to
      </Text>
      <div style={{ width: "150px" }}>
        <TextField label="To Date" type="date" value={endDate} onChange={onEndDateChange} autoComplete="off" />
      </div>
    </div>
  );
}

export default function ConditionBuilder() {
  const app = useAppBridge();
  const [searchParams] = useSearchParams();
  const tempId = searchParams.get("temp");
  const navigate = useNavigate();

  const [campaignName, setCampaignName] = useState("");
  const [conditions, setConditions] = useState([
    {
      type: "all_users",
      operator: "",
      value: "",
      logic: "AND",
      dateRangeEnabled: false,
      startDate: "",
      endDate: "",
    },
  ]);
  const [limit, setLimit] = useState("");
  const [currentConditionIndex, setCurrentConditionIndex] = useState(0);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [audienceCount, setAudienceCount] = useState(null);
  const [calculatingAudience, setCalculatingAudience] = useState(false);

  // Plan Data State
  const [planData, setPlanData] = useState(null);
  const [checkingPlan, setCheckingPlan] = useState(true);

  // Fetch plan details
  useEffect(() => {
    const fetchPlan = async () => {
      try {
        //console.log("Fetching plan...");
        const res = await fetch("/api/getplan");
        //console.log("Plan response status:", res.status);
        const data = await res.json();
        //console.log("Plan data:", data);
        if (data.success) {
          setPlanData(data);
        } else {
          console.error("Plan fetch failed:", data);
        }
      } catch (err) {
        console.error("Error fetching plan:", err);
      } finally {
        setCheckingPlan(false);
      }
    };
    fetchPlan();
  }, []);

  // Fetch Audience Count
  useEffect(() => {
    const fetchAudience = async () => {
      if (!planData?.shop?.domain) return;

      setCalculatingAudience(true);
      try {
        const res = await fetch("/api/audience_count", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conditions: conditions
          })
        });
        const data = await res.json();
        if (data.success) {
          setAudienceCount(data.count);
        }
      } catch (err) {
        console.error("Error calculating audience:", err);
      } finally {
        setCalculatingAudience(false);
      }
    };

    // Debounce the call
    const timer = setTimeout(() => {
      fetchAudience();
    }, 1000);

    return () => clearTimeout(timer);
  }, [conditions, selectedProducts, planData]);

  // Scheduling
  const [scheduleType, setScheduleType] = useState("immediately");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [sendTime, setSendTime] = useState("09:00");

  // Campaign type
  const [campaignType, setCampaignType] = useState("one_time");

  // Templates
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [templateDetails, setTemplateDetails] = useState(null);

  // Fetch templates
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const res = await fetch("/api/gettemp");
        const data = await res.json();
        if (Array.isArray(data.templates)) {
          setTemplates(data.templates);

          // ✅ Read ?temp=1 from URL
          const params = new URLSearchParams(window.location.search);
          const tempParam = params.get("temp");

          if (tempParam) {
            const found = data.templates.find((t) => String(t.id) === String(tempParam));
            if (found) setSelectedTemplate(String(found.id));
          }
        }
      } catch (err) {
        console.error("Error fetching templates:", err);
      }
    };

    fetchTemplates();
  }, []);

  // Auto-select template if ?temp={id} exists
  useEffect(() => {
    if (templates.length > 0 && tempId) {
      const found = templates.find((t) => String(t.id) === String(tempId));
      if (found) {
        setSelectedTemplate(String(found.id));
        setTemplateDetails(found);
      }
    }
  }, [templates, tempId]);

  function formatToUserTime(utcDateTime) {
    const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return new Date(utcDateTime).toLocaleString("en-IN", {
      timeZone: userTimeZone,
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const scheduleOptions = [
    { label: "Send immediately", value: "immediately" },
    { label: "Schedule for later", value: "scheduled" },
  ];

  const campaignTypeOptions = [
    { label: "Send once", value: "one_time" },
    { label: "Ongoing", value: "ongoing" },
  ];

  // --- Summary Generator ---
  const getDetailedSummary = () => {
    if (conditions.length === 0) return "No targeting conditions selected.";

    const parts = conditions.map((cond, index) => {
      let text = "";

      switch (cond.type) {
        case "all_users":
          text = "all users who have allowed push notifications";
          break;
        case "all_carts":
          text = "all abandoned carts";
          break;
        case "product":
          text = selectedProducts[index]?.length
            ? `users who abandoned carts containing: ${selectedProducts[index].map((p) => p.title).join(", ")}`
            : "users who abandoned carts with specific products (not selected)";
          break;
        case "ordered_product":
          text = selectedProducts[index]?.length
            ? `users who previously ordered: ${selectedProducts[index].map((p) => p.title).join(", ")}`
            : "users who previously ordered specific products (not selected)";
          break;
        case "value":
          text = `users whose abandoned cart value ${cond.operator || ""} ${cond.value || ""}`;
          break;
        case "quantity":
          text = `users whose abandoned cart contains ${cond.value || ""} items ${cond.operator || ""}`;
          break;
        case "order_value":
          text = `users with previous order value ${cond.operator || ""} ${cond.value || ""}`;
          break;
        default:
          text = "";
      }

      // Date Range for one-time campaigns
      if (campaignType === "one_time" && cond.dateRangeEnabled && cond.startDate && cond.endDate) {
        text += ` between ${cond.startDate} and ${cond.endDate}`;
      }

      // Automation note for ongoing campaigns
      if (campaignType === "ongoing") {
        text += " (automated: sent to matching users automatically)";
      }

      // Add logic connector (AND / OR)
      if (index < conditions.length - 1) {
        text += ` ${cond.logic} `;
      }

      return text;
    });

    return "This campaign will target " + parts.join("");
  };

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const picker = await app.resourcePicker({
        type: "product",
        showVariants: false,
        selectMultiple: true,
      });

      if (picker && picker.selection && picker.selection.length > 0) {
        const updatedProducts = [...selectedProducts];
        updatedProducts[currentConditionIndex] = picker.selection;
        setSelectedProducts(updatedProducts);

        const productIds = picker.selection.map((p) => p.id);
        updateCondition(currentConditionIndex, "value", productIds);
        updateCondition(currentConditionIndex, "operator", "contains");
      }
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateCondition = (index, key, newValue) => {
    // Check plan features for targeting
    if (key === "type" && planData && !checkingPlan) {
      const basicTypes = ["all_users", "all_carts"];
      const isAdvanced = !basicTypes.includes(newValue);

      if (isAdvanced && !planData.features?.advanced_segmentation) {
        setErrorMsg(
          `Your current plan (${planData.plan?.name || 'Free'}) does not support advanced targeting. Please upgrade to use this feature.`
        );
        return;
      }
    }

    const updated = [...conditions];
    if (key === "type") {
      updated[index].operator = "";
      updated[index].value = "";
      if (newValue !== "product" && newValue !== "ordered_product") {
        const updatedProducts = [...selectedProducts];
        updatedProducts[index] = [];
        setSelectedProducts(updatedProducts);
      }
    }
    updated[index][key] = newValue;
    setConditions(updated);
    setErrorMsg("");
  };

  const toggleDateRange = (index) => {
    const updated = [...conditions];
    updated[index].dateRangeEnabled = !updated[index].dateRangeEnabled;
    if (updated[index].dateRangeEnabled && !updated[index].startDate) {
      updated[index].startDate = new Date().toISOString().split("T")[0];
    }
    if (updated[index].dateRangeEnabled && !updated[index].endDate) {
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1);
      updated[index].endDate = endDate.toISOString().split("T")[0];
    }
    setConditions(updated);
  };

  const updateDateRange = (index, dateType, value) => {
    const updated = [...conditions];
    updated[index][dateType] = value;
    setConditions(updated);
  };

  const addCondition = () => {
    setConditions([
      ...conditions,
      { type: "", operator: "", value: "", logic: "AND", dateRangeEnabled: false, startDate: "", endDate: "" },
    ]);
    setSelectedProducts([...selectedProducts, []]);
  };

  const removeCondition = (index) => {
    const updated = [...conditions];
    updated.splice(index, 1);
    setConditions(updated);

    const updatedProducts = [...selectedProducts];
    updatedProducts.splice(index, 1);
    setSelectedProducts(updatedProducts);
  };

  // Add dirty state and error message
  const [isDirty, setIsDirty] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [showUnsavedBanner, setShowUnsavedBanner] = useState(false);

  // Track dirty state on any field change
  useEffect(() => {
    setIsDirty(true);
  }, [
    campaignName,
    JSON.stringify(conditions),
    limit,
    JSON.stringify(selectedProducts),
    scheduleType,
    selectedDate,
    sendTime,
    campaignType,
    selectedTemplate,
  ]);

  // Prevent navigation away if dirty
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
        setShowUnsavedBanner(true);
        return "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  // Text field dirty state
  const [isTextDirty, setIsTextDirty] = useState(false);

  // Track text field changes
  useEffect(() => {
    setIsTextDirty(false); // Reset on mount
  }, []);

  // Handler for campaign name
  const handleCampaignNameChange = (val) => {
    setCampaignName(val);
    setIsTextDirty(true);
    setErrorMsg(""); // Clear error when typing
  };

  // Handler for limit
  const handleLimitChange = (val) => {
    setLimit(val);
    setIsTextDirty(true);
    setErrorMsg(""); // Clear error when typing
  };

  // Handler for condition value text fields
  const handleConditionValueChange = (index, val) => {
    updateCondition(index, "value", val);
    setIsTextDirty(true);
    setErrorMsg(""); // Clear error when typing
  };

  // Handler for discarding changes
  const handleDiscard = () => {
    setCampaignName("");
    setConditions([
      {
        type: "",
        operator: "",
        value: "",
        logic: "AND",
        dateRangeEnabled: false,
        startDate: "",
        endDate: "",
      },
    ]);
    setLimit("");
    setSelectedProducts([]);
    setScheduleType("immediately");
    setSelectedDate(new Date().toISOString().split("T")[0]);
    setSendTime("09:00");
    setCampaignType("one_time");
    setSelectedTemplate("");
    setErrorMsg("");
    setIsDirty(false);
    setIsTextDirty(false);
    setShowUnsavedBanner(false);
  };

  // Replace alert with Banner for errors
  const handleSend = async () => {
    if (isLoading) return; // Prevent multiple sends

    if (!campaignName.trim()) {
      setErrorMsg("Please enter a campaign name.");
      return;
    }

    // Check limits
    if (planData) {
      const dailyLimit = planData.plan?.daily_push_limit ?? planData.limits?.daily_push_limit ?? 100;
      const remaining = planData.usage?.remaining ?? dailyLimit;

      // Check user entered limit
      if (limit && parseInt(limit) > dailyLimit) {
        setErrorMsg(`You cannot set a limit higher than your daily plan quota (${dailyLimit}).`);
        return;
      }

      // Check if they have enough quota
      if (remaining <= 0) {
        setErrorMsg(`You have reached your daily push limit of ${dailyLimit}. Please upgrade or wait until tomorrow.`);
        return;
      }
    } else if (checkingPlan) {
      // Still loading plan — don't block the send, plan check will happen server-side
    }

    setErrorMsg(""); // clear error
    setIsLoading(true); // Set loading before request

    // --- Check for duplicate campaign name ---
    try {
      const res = await fetch("/api/getcamp");
      const data = await res.json();
      if (data.success && Array.isArray(data.campaigns)) {
        const exists = data.campaigns.some(
          (c) => c.name.trim().toLowerCase() === campaignName.trim().toLowerCase()
        );
        if (exists) {
          setErrorMsg("A campaign with this name already exists. Please choose a different name.");
          setIsLoading(false);
          return;
        }
      }
    } catch (err) {
      setErrorMsg("Could not verify campaign name. Please try again.");
      setIsLoading(false);
      return;
    }

    const scheduleData = { type: scheduleType };
    if (campaignType === "one_time" && scheduleType === "scheduled") {
      const [hours, minutes] = sendTime.split(":");
      const scheduledDate = new Date(selectedDate);
      scheduledDate.setHours(parseInt(hours), parseInt(minutes));
      scheduleData.dateTime = scheduledDate.toISOString();
    }

    const payload = {
      campaignName: campaignName.trim(),
      limit,
      conditions,
      schedule: campaignType === "one_time" ? scheduleData : null,
      campaignType,
      templateId: selectedTemplate,
    };

    try {
      //console.log("[SendCampaign] building payload", payload);
      // --- AES-256-CBC helpers (browser) using passphrases (must match PHP) ---
      const bytesToBase64 = (bytes) =>
        btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(bytes))));
      const base64ToBytes = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const textToBytes = (txt) => new TextEncoder().encode(txt);
      const sha256 = async (data) => {
        const buf = await crypto.subtle.digest("SHA-256", typeof data === "string" ? textToBytes(data) : data);
        return new Uint8Array(buf);
      };
      const deriveKeyIv = async (keyPass, ivPass) => {
        const keyHash = await sha256(keyPass); // 32 bytes
        const ivHash = await sha256(ivPass); // 32 bytes; take first 16
        const iv = ivHash.slice(0, 16);
        const key = await crypto.subtle.importKey("raw", keyHash, { name: "AES-CBC" }, false, [
          "encrypt",
          "decrypt",
        ]);
        return { key, iv };
      };
      const encryptJson = async (obj, keyPass, ivPass) => {
        const { key, iv } = await deriveKeyIv(keyPass, ivPass);
        const encoded = new TextEncoder().encode(JSON.stringify(obj));
        const cipherBuf = await crypto.subtle.encrypt({ name: "AES-CBC", iv }, key, encoded);
        return bytesToBase64(cipherBuf);
      };
      const decryptToJson = async (cipherB64, keyPass, ivPass) => {
        const { key, iv } = await deriveKeyIv(keyPass, ivPass);
        const cipherBytes = base64ToBytes(cipherB64);
        const plainBuf = await crypto.subtle.decrypt({ name: "AES-CBC", iv }, key, cipherBytes);
        const text = new TextDecoder().decode(plainBuf);
        return JSON.parse(text);
      };

      // IMPORTANT: Use the same passphrases as PHP config
      const AES_PASSPHRASE = "CHANGE_ME_STRONG_PASSPHRASE";
      const AES_IV_SALT = "CHANGE_ME_IV_SALT";

      const ciphertext = await encryptJson(payload, AES_PASSPHRASE, AES_IV_SALT);
      //console.log("[SendCampaign] ciphertext length", ciphertext?.length);

      const res = await fetch("/api/sendcamp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Encrypted": "1",
        },
        body: JSON.stringify({ ciphertext }),
      });

      //console.log("[SendCampaign] response status", res.status);
      const wire = await res.json();
      //console.log("[SendCampaign] response body", wire && wire.ciphertext ? `{ciphertext len=${wire.ciphertext.length}}` : wire);
      let data = {};
      if (wire && wire.ciphertext) {
        data = await decryptToJson(wire.ciphertext, AES_PASSPHRASE, AES_IV_SALT);
        //console.log("[SendCampaign] decrypted response", data);
      } else {
        data = wire;
      }
      setErrorMsg(""); // clear error
      setIsDirty(false);
      setIsTextDirty(false); // Reset text dirty state
      setShowUnsavedBanner(false);
      setIsLoading(false); // Reset loading
      setErrorMsg("Campaign scheduled successfully!"); // Show success in Banner

      // Navigate to home after success
      if (data && data.success) {
        setTimeout(() => {
          navigate("/app");
        }, 1200); // Show success for 1.2s before navigating
      }
    } catch (error) {
      //console.error("[SendCampaign] error", error);
      setErrorMsg("Error scheduling campaign");
      setIsLoading(false); // Reset loading on error
    }
  };

  const openResourcePicker = (index) => {
    setCurrentConditionIndex(index);
    fetchProducts();
  };
  // Options for condition types
  const conditionOptions = [
    { label: "All users who allowed push notifications", value: "all_users" },
    { label: "All abandoned carts", value: "all_carts" },
    { label: "Cart contains specific products", value: "product" },
    { label: "Customer has previously ordered specific products", value: "ordered_product" },
    { label: "Abandoned cart value", value: "value" },
    { label: "Abandoned cart quantity", value: "quantity" },
    { label: "Previous order value", value: "order_value" },
  ];

  // Operator options based on type
  const getOperatorOptions = (type) => {
    switch (type) {
      case "value":
      case "order_value":
      case "quantity":
        return [
          { label: "Greater than", value: ">" },
          { label: "Less than", value: "<" },
          { label: "Equal to", value: "=" },
        ];
      case "product":
      case "ordered_product":
        return [
          { label: "Contains", value: "contains" },
          { label: "Does not contain", value: "not_contains" },
        ];
      default:
        return [];
    }
  };

  return (
    <Frame>
      {/* ContextualSaveBar for text field changes only */}
      {isTextDirty && (
        <ContextualSaveBar
          message="You have unsaved changes"
          saveAction={{
            onAction: handleSend,
            loading: isLoading,
            disabled: isLoading,
            content: "Send Campaign",
          }}
          discardAction={{
            onAction: handleDiscard,
            content: "Discard",
          }}
        />
      )}


      <Page title="Push Notification Template">
        {/* Error Banner */}
        {errorMsg && (
          <Banner
            status={
              errorMsg === "Campaign scheduled successfully!"
                ? "success"
                : "critical"
            }
            title={
              errorMsg === "Campaign scheduled successfully!"
                ? "Success"
                : "Error"
            }
            tone={errorMsg !== "Campaign scheduled successfully!" ? "critical" : undefined}
            onDismiss={() => setErrorMsg("")}
          >
            <Text tone={errorMsg !== "Campaign scheduled successfully!" ? "critical" : undefined}>
              {errorMsg}
            </Text>
          </Banner>
        )}

        <Grid>
          <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 12, xl: 12 }}>
            <Card title="Campaign Builder" sectioned>
              {isLoading && (
                <div style={{ display: "flex", justifyContent: "center", padding: "20px" }}>
                  <Spinner size="large" />
                </div>
              )}

              {/* Quota & Audience Stats */}
              <Box paddingBlockEnd="400">
                <InlineStack align="space-between">
                  <div style={{ background: "#f1f8f5", padding: "10px 16px", borderRadius: "8px", border: "1px solid #c1eac5" }}>
                    <Text variant="bodyMd" fontWeight="bold" tone="success">
                      Remaining Quota: {planData?.usage ? `${planData.usage.remaining} / ${planData.usage.limit}` : "Loading..."}
                    </Text>
                  </div>
                  <div style={{ background: "#eef2ff", padding: "10px 16px", borderRadius: "8px", border: "1px solid #c7d2fe" }}>
                    <Text variant="bodyMd" fontWeight="bold" tone="info">
                      Estimated Audience: {calculatingAudience ? <Spinner size="small" /> : `${audienceCount !== null ? audienceCount : "-"} users`}
                    </Text>
                  </div>
                </InlineStack>
              </Box>

              {/* Campaign Name */}
              <Box paddingBlockEnd="400">
                <Text variant="headingMd" as="h3">
                  Campaign Name
                </Text>
                <TextField
                  value={campaignName}
                  onChange={handleCampaignNameChange}
                  placeholder="Enter a name for this campaign"
                  autoComplete="off"
                />
              </Box>

              {/* Campaign Type */}
              <Box paddingBlockEnd="400">
                <Text variant="headingMd" as="h3">
                  Campaign Type
                </Text>
                <ChoiceList
                  title="How often should this campaign run?"
                  choices={campaignTypeOptions}
                  selected={campaignType}
                  onChange={(value) => setCampaignType(value[0])}
                />
              </Box>

              {/* Template Selector */}
              <Box paddingBlockEnd="400">
                <Text variant="headingMd" as="h3">
                  Select Template
                </Text>
                <Select
                  label="Template"
                  options={templates.map((t) => ({ label: t.title, value: String(t.id) }))}
                  value={String(selectedTemplate)}
                  onChange={(val) => setSelectedTemplate(val)}
                  placeholder="Select a template"
                />
              </Box>

              {/* Targeting Conditions */}
              <Box paddingBlockEnd="400">
                <Text variant="headingMd" as="h3">
                  Targeting Conditions
                </Text>
                <div style={{ border: "1px solid #e1e3e5", borderRadius: "8px", padding: "12px" }}>
                  {conditions.map((cond, index) => (
                    <div
                      key={index}
                      style={{ marginBottom: "16px", padding: "12px", border: "1px solid #e1e3e5", borderRadius: "8px" }}
                    >
                      <InlineStack gap="200" align="start" blockAlign="center">
                        <Select
                          label="Condition"
                          labelHidden
                          options={conditionOptions}
                          value={cond.type}
                          onChange={(val) => updateCondition(index, "type", val)}
                          style={{ minWidth: "200px" }}
                        />

                        {["value", "order_value", "quantity", "product", "ordered_product"].includes(cond.type) && (
                          <Select
                            label="Operator"
                            labelHidden
                            options={getOperatorOptions(cond.type)}
                            value={cond.operator}
                            onChange={(val) => updateCondition(index, "operator", val)}
                            style={{ minWidth: "150px" }}
                          />
                        )}
                        {(cond.type === "product" || cond.type === "ordered_product") && (
                          <div>
                            <Button onClick={() => openResourcePicker(index)}>
                              {cond.type === "ordered_product" ? "Select Ordered Products" : "Select Products"}
                            </Button>
                            {selectedProducts[index] && selectedProducts[index].length > 0 && (
                              <Box paddingBlockStart="200">
                                <Text variant="bodySm" as="p">
                                  Selected products:
                                </Text>
                                <List>
                                  {selectedProducts[index].map((product, i) => (
                                    <List.Item key={i}>{product.title}</List.Item>
                                  ))}
                                </List>
                              </Box>
                            )}
                          </div>
                        )}

                        {(cond.type === "value" || cond.type === "quantity" || cond.type === "order_value") && (
                          <TextField
                            label="Value"
                            labelHidden
                            type="number"
                            placeholder={
                              cond.type === "value"
                                ? "Cart value"
                                : cond.type === "quantity"
                                  ? "Quantity"
                                  : "Order value"
                            }
                            value={cond.value}
                            onChange={(val) => handleConditionValueChange(index, val)}
                          />
                        )}

                        <ButtonGroup>
                          {conditions.length > 1 && (
                            <Button destructive onClick={() => removeCondition(index)}>
                              Remove
                            </Button>
                          )}
                          {index === conditions.length - 1 && <Button onClick={addCondition}>+ Add Condition</Button>}
                        </ButtonGroup>
                      </InlineStack>

                      {/* Date Range Toggle */}
                      {campaignType === "one_time" && (
                        <Box paddingBlockStart="200">
                          <Button
                            size="slim"
                            onClick={() => toggleDateRange(index)}
                            tone={cond.dateRangeEnabled ? "primary" : undefined}
                          >
                            {cond.dateRangeEnabled ? "✓ Date Range Enabled" : "Add Date Range"}
                          </Button>
                          {cond.dateRangeEnabled && (
                            <Box paddingBlockStart="200">
                              <DateRangeSelector
                                startDate={cond.startDate}
                                endDate={cond.endDate}
                                onStartDateChange={(val) => updateDateRange(index, "startDate", val)}
                                onEndDateChange={(val) => updateDateRange(index, "endDate", val)}
                              />
                            </Box>
                          )}
                        </Box>
                      )}
                      {/* Ongoing Campaign Note */}
                      {cond.type && campaignType === "ongoing" && (
                        <Box paddingBlockStart="200">
                          <Text variant="bodySm" as="p" tone="success">
                            Automated Campaign
                          </Text>
                        </Box>
                      )}

                      {index < conditions.length - 1 && (
                        <Box paddingBlockStart="200">
                          <Text variant="bodySm" as="span" fontWeight="medium">
                            Match type:{" "}
                          </Text>
                          <ButtonGroup segmented>
                            <Button
                              size="slim"
                              pressed={cond.logic === "AND"}
                              onClick={() => updateCondition(index, "logic", "AND")}
                            >
                              AND
                            </Button>
                            <Button
                              size="slim"
                              pressed={cond.logic === "OR"}
                              onClick={() => updateCondition(index, "logic", "OR")}
                            >
                              OR
                            </Button>
                          </ButtonGroup>
                        </Box>
                      )}
                    </div>
                  ))}
                </div>
              </Box>

              <Box paddingBlockEnd="200">
                <Text variant="bodyMd" as="p" tone="subdued">
                  {getDetailedSummary()}
                </Text>
              </Box>

              {/* Campaign Limit */}
              <Box paddingBlockEnd="400">
                <TextField
                  label="Limit number of notifications (leave blank for unlimited)"
                  type="number"
                  value={limit}
                  onChange={handleLimitChange}
                />
              </Box>

              {/* Schedule */}
              {campaignType === "one_time" && (
                <Box paddingBlockEnd="400">
                  <Text variant="headingMd" as="h3">
                    Schedule
                  </Text>
                  <ChoiceList
                    title="When should this campaign be sent?"
                    choices={scheduleOptions}
                    selected={scheduleType}
                    onChange={(value) => setScheduleType(value[0])}
                  />
                  {scheduleType === "scheduled" && (
                    <Box paddingBlockStart="200">
                      <DateTimeSelector
                        dateValue={selectedDate}
                        onDateChange={setSelectedDate}
                        timeValue={sendTime}
                        onTimeChange={setSendTime}
                      />
                    </Box>
                  )}
                </Box>
              )}

              <Box paddingBlockStart="400">
                <Button primary onClick={handleSend} loading={isLoading}>
                  {campaignType === "one_time"
                    ? scheduleType === "scheduled"
                      ? "Schedule Campaign"
                      : "Send Now"
                    : "Activate Automation"}
                </Button>
              </Box>
            </Card>
          </Grid.Cell>
        </Grid>
      </Page>
    </Frame>
  );
}
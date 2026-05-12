import { useState, useEffect, useRef } from "react";
import {
  Page,
  Card,
  TextField,
  Text,
  BlockStack,
  Grid,
  Frame,
  Toast,
  Thumbnail,
  ContextualSaveBar,
  Button,
  Banner,
  InlineStack,
  Spinner,
} from "@shopify/polaris";
import { usePlanFeatures } from "../hooks/usePlanFeatures";
import { UpgradeBanner } from "../components/UpgradePrompts";

export default function PushTemplateEditor() {
  // Plan feature checking
  const { hasFeature, checkFeatureAccess, loading: planLoading } = usePlanFeatures();
  const aiAccess = checkFeatureAccess('ai_content');

  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [link, setLink] = useState("");
  const [iconUrl, setIconUrl] = useState("");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toastActive, setToastActive] = useState(false);
  const [toastMsg, setToastMsg] = useState("Template saved successfully");
  const [errors, setErrors] = useState({});
  const [suggestion, setSuggestion] = useState("");
  const [pauseSuggest, setPauseSuggest] = useState(false);
  const [bodyHistory, setBodyHistory] = useState([""]);
  const [bodyIndex, setBodyIndex] = useState(0);
  const debounceRef = useRef(null);
  const inputRef = useRef(null);

  const handleChange = (setter) => (value) => {
    setter(value);
    setDirty(true);
  };

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [dirty]);

  const validateFields = () => {
    let newErrors = {};
    if (!title.trim()) newErrors.title = "Title is required";
    if (!body.trim()) newErrors.body = "Body is required";
    if (link && !/^https?:\/\/[^\s/$.?#].[^\s]*$/.test(link)) {
      newErrors.link = "Please enter a valid URL";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateFields()) return;
    setSaving(true);
    const payload = { name: name.trim() || null, title, body, link, icon: iconUrl || null };

    try {
      // AES-256-CBC helpers (browser) using passphrases (must match PHP)
      const textToBytes = (txt) => new TextEncoder().encode(txt);
      const sha256 = async (data) => {
        const buf = await crypto.subtle.digest("SHA-256", typeof data === "string" ? textToBytes(data) : data);
        return new Uint8Array(buf);
      };
      const bytesToBase64 = (bytes) => btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(bytes))));
      const deriveKeyIv = async (keyPass, ivPass) => {
        const keyHash = await sha256(keyPass);
        const ivHash = await sha256(ivPass);
        const iv = ivHash.slice(0, 16);
        const key = await crypto.subtle.importKey("raw", keyHash, { name: "AES-CBC" }, false, ["encrypt"]);
        return { key, iv };
      };
      const encryptJson = async (obj, keyPass, ivPass) => {
        const { key, iv } = await deriveKeyIv(keyPass, ivPass);
        const encoded = new TextEncoder().encode(JSON.stringify(obj));
        const cipherBuf = await crypto.subtle.encrypt({ name: "AES-CBC", iv }, key, encoded);
        return bytesToBase64(cipherBuf);
      };

      const AES_PASSPHRASE = "CHANGE_ME_STRONG_PASSPHRASE";
      const AES_IV_SALT = "CHANGE_ME_IV_SALT";

      //console.groupCollapsed("[SendTemplate] encrypt+send debug");
      // console.log("[SendTemplate] plaintext payload", payload);
      const ciphertext = await encryptJson(payload, AES_PASSPHRASE, AES_IV_SALT);
      if (!ciphertext) {
        console.error("[SendTemplate] ciphertext empty");
        throw new Error("Encryption output empty");
      }
      // console.log("[SendTemplate] ciphertext length", ciphertext.length);

      const res = await fetch("/api/sendtemp", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Encrypted": "1" },
        body: JSON.stringify({ ciphertext }),
      });

      // console.log("[SendTemplate] response status", res.status);
      if (res.ok) {
        const resJson = await res.json().catch(() => ({}));
        setToastMsg("Template saved successfully");
        setToastActive(true);
        setDirty(false);
      } else {
        const errorText = await res.text();
        //    console.error("[SendTemplate] server rejected payload", {
        //   status: res.status,
        //   body: errorText,
        // });
        alert("Failed to save template: " + (errorText || res.status));
      }
    } catch (err) {
      //console.error("[SendTemplate] fatal error", err);
      alert("Error saving template: " + err?.message);
    } finally {
      //console.groupEnd();
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    setName("");
    setTitle("");
    setBody("");
    setLink("");
    setIconUrl("");
    setErrors({});
    setDirty(false);
    setSuggestion("");
  };

  const handleSendTest = async () => {
    if (!title.trim() || !body.trim()) {
      alert("Please enter a title and body before sending a test notification.");
      return;
    }
    setSendingTest(true);
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const shop = urlParams.get("shop") || "";
      const res = await fetch("/api/send-test-notification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shop, title, body, link }),
      });
      const data = await res.json();
      if (data.success) {
        setToastMsg("Test notification sent to your browser!");
        setToastActive(true);
      } else {
        alert("Test failed: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      alert("Test notification error: " + err.message);
    } finally {
      setSendingTest(false);
    }
  };

  const handleAISuggest = async (field) => {
    const value = field === "title" ? title.trim() : body.trim();

    if (!value) {
      setErrors({
        ...errors,
        [field]: "Start typing first for AI to enhance your content",
      });
      return;
    }

    try {
      const prompt =
        field === "title"
          ? `Improve this push notification title to make it more catchy: "${title}"`
          : `Improve this push notification body to make it more engaging: "${body}"`;

      const res = await fetch("/api/ai-complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      const data = await res.json();
      if (data.suggestion) {
        if (field === "title") setTitle(data.suggestion);
        if (field === "body") setBody(data.suggestion);
        setDirty(true);
      }
    } catch (err) {
      // console.log("AI Suggestion failed:", err);
    }
  };

  // --- AI Typing Assistant (inline) ---
  useEffect(() => {
    // Disable AI typing assistant if user doesn't have ai_content feature
    if (!aiAccess.allowed) return;
    if (pauseSuggest) return; // paused after accepting suggestion
    if (!body.trim()) {
      setSuggestion("");
      return;
    }

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/ai-complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: `Continue this push notification body naturally and engagingly (max 20 words): "${body}"`,
          }),
        });

        const data = await res.json();
        if (data.suggestion) {
          const words = data.suggestion.split(" ").slice(0, 20).join(" ");
          setSuggestion(words);
        }
      } catch (err) {
        // console.log("Typing assistant error:", err);
      }
    }, 1000);
  }, [body, pauseSuggest, aiAccess.allowed]); // <-- Add aiAccess.allowed to dependencies

  const acceptSuggestion = () => {
    if (suggestion) {
      const clean = suggestion.replace(/^["']|["']$/g, ""); // remove quotes from start/end
      setBody(clean); // replace body entirely
      setSuggestion("");
      setPauseSuggest(true); // <-- Pause suggestions after accepting
    }
  };

  // Accept with Tab or Right Arrow →
  useEffect(() => {
    const handler = (e) => {
      if ((e.key === "Tab" || e.key === "ArrowRight") && suggestion) {
        e.preventDefault();
        acceptSuggestion();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [suggestion]);

  // Update history when body changes
  useEffect(() => {
    if (body !== bodyHistory[bodyIndex]) {
      const newHistory = bodyHistory.slice(0, bodyIndex + 1);
      setBodyHistory([...newHistory, body]);
      setBodyIndex(newHistory.length);
    }
    // eslint-disable-next-line
  }, [body]);

  // Slider handlers
  const handlePrevBody = () => {
    if (bodyIndex > 0) {
      setBody(bodyHistory[bodyIndex - 1]);
      setBodyIndex(bodyIndex - 1);
    }
  };

  const handleNextBody = () => {
    if (bodyIndex < bodyHistory.length - 1) {
      setBody(bodyHistory[bodyIndex + 1]);
      setBodyIndex(bodyIndex + 1);
    }
  };

  return (
    <Frame>
      <Page title="Push Notification Template">
        {dirty && (
          <ContextualSaveBar
            message="Unsaved changes"
            saveAction={{ onAction: handleSave, loading: saving }}
            discardAction={{ onAction: handleDiscard, discardConfirmationModal: true }}
          />
        )}

        <Grid gap="400">
          {/* Left: Editor */}
          <Grid.Cell columnSpan={{ xs: 6, lg: 6 }}>
            <Card title="Template Editor" sectioned>
              <BlockStack gap="300">
                <TextField
                  label="Template Name (optional)"
                  value={name}
                  onChange={handleChange(setName)}
                  placeholder="e.g. Summer Sale Welcome"
                  helpText="A friendly name to identify this template in your library"
                />
                <TextField
                  label="Title"
                  value={title}
                  onChange={handleChange(setTitle)}
                  error={errors.title}
                />
                {planLoading ? (
                  <div style={{ padding: '8px 0' }}><Spinner size="small" /></div>
                ) : aiAccess.allowed ? (
                  <Button onClick={() => handleAISuggest("title")}>✨ AI Improve Title</Button>
                ) : (
                  <div style={{ padding: '8px 12px', background: 'var(--p-color-bg-surface-secondary)', borderRadius: '8px', border: '1px dashed var(--p-color-border)' }}>
                    <InlineStack gap="200" blockAlign="center">
                      <Text as="span" variant="bodySm" tone="subdued">
                        🔒 AI content generation requires {aiAccess.requiredPlan} plan
                      </Text>
                      <Button url="/app/plan" size="slim" variant="plain">Upgrade</Button>
                    </InlineStack>
                  </div>
                )}

                {/* Inline typing assistant for Body */}
                <div style={{ position: "relative", width: "100%" }}>
                  <textarea
                    ref={inputRef}
                    value={body}
                    onChange={(e) => {
                      handleChange(setBody)(e.target.value);
                      if (pauseSuggest) setPauseSuggest(false); // resume suggestions after user types again
                    }}
                    rows={4}
                    placeholder="Type your notification message..."
                    style={{
                      position: "relative",
                      width: "100%",
                      fontSize: "14px",
                      lineHeight: "1.6",
                      padding: "12px",
                      borderRadius: "6px",
                      border: "1px solid #ccc",
                      fontFamily: "inherit",
                      resize: "vertical",
                      background: "transparent",
                      color: "#111",
                      zIndex: 2,
                    }}
                  />
                  {/* Overlay suggestion text */}
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      pointerEvents: "none",
                      padding: "12px",
                      whiteSpace: "pre-wrap",
                      color: "transparent",
                      zIndex: 1,
                      fontFamily: "inherit",
                      fontSize: "14px",
                      lineHeight: "1.6",
                    }}
                  >
                    <span style={{ color: "transparent" }}>{body}</span>
                    {suggestion && (
                      <span
                        style={{
                          color: "rgba(150,150,150,0.7)",
                          fontStyle: "italic",
                        }}
                      >
                        {suggestion}
                      </span>
                    )}
                  </div>
                </div>

                {planLoading ? (
                  <div style={{ padding: '8px 0' }}><Spinner size="small" /></div>
                ) : aiAccess.allowed ? (
                  <Button onClick={() => handleAISuggest("body")}>✨ AI Improve Body</Button>
                ) : (
                  <div style={{ padding: '8px 12px', background: 'var(--p-color-bg-surface-secondary)', borderRadius: '8px', border: '1px dashed var(--p-color-border)' }}>
                    <InlineStack gap="200" blockAlign="center">
                      <Text as="span" variant="bodySm" tone="subdued">
                        🔒 AI content generation requires {aiAccess.requiredPlan} plan
                      </Text>
                      <Button url="/app/plan" size="slim" variant="plain">Upgrade</Button>
                    </InlineStack>
                  </div>
                )}

                <TextField
                  label="Icon Image URL"
                  value={iconUrl}
                  onChange={handleChange(setIconUrl)}
                  placeholder="Paste an image link"
                />
                {iconUrl && (
                  <Thumbnail size="large" alt="Selected icon" source={iconUrl} />
                )}

                <TextField
                  label="Link"
                  value={link}
                  onChange={handleChange(setLink)}
                  placeholder="https://example.com"
                  error={errors.link}
                />

                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                  <Button onClick={handlePrevBody} disabled={bodyIndex === 0}>
                    ◀ Prev
                  </Button>
                  <Button onClick={handleNextBody} disabled={bodyIndex === bodyHistory.length - 1}>
                    Next ▶
                  </Button>
                  <span style={{ fontSize: "12px", color: "#888" }}>
                    {bodyIndex + 1} / {bodyHistory.length}
                  </span>
                  <Button
                    onClick={handleSendTest}
                    loading={sendingTest}
                    variant="secondary"
                  >
                    Send Test Notification
                  </Button>
                </div>
              </BlockStack>
            </Card>
          </Grid.Cell>

          {/* Right: Preview */}
          <Grid.Cell columnSpan={{ xs: 6, lg: 6 }}>
            <Card title="Live Preview" sectioned>
              <div className="flex flex-col items-center text-center">
                {iconUrl ? (
                  <img
                    src={iconUrl}
                    alt="icon"
                    style={{
                      width: "80px",
                      height: "80px",
                      objectFit: "cover",
                      borderRadius: "8px",
                      marginBottom: "16px",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "80px",
                      height: "80px",
                      backgroundColor: "#e5e5e5",
                      borderRadius: "8px",
                      marginBottom: "16px",
                    }}
                  />
                )}
                <Text as="h3" variant="headingMd">
                  {title || "Notification Title"}
                </Text>
                <Text as="p" variant="bodyMd">
                  {body || "This is the notification body preview."}
                </Text>
              </div>
            </Card>
          </Grid.Cell>
        </Grid>

        {toastActive && (
          <Toast
            content={toastMsg}
            onDismiss={() => setToastActive(false)}
          />
        )}
      </Page>
    </Frame>
  );
}

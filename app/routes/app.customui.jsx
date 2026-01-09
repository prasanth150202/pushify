import React, { useState, useEffect } from "react";
import {
  Page,
  Card,
  TextField,
  Button,
  InlineStack,
  Banner,
  Text,
  Badge,
} from "@shopify/polaris";
import { Knob } from '../components/Knob';

const templatePresets = {
  minimal: {
    title: "Stay updated!",
    body: "Allow notifications to get the latest offers.",
    primaryText: "Allow",
    secondaryText: "Not now",
    backgroundColor: "#ffffff",
    cardColor: "#f7f7f7",
    primaryColor: "#0066ff",
    secondaryColor: "#777777",
    textColor: "#111111",
    imageUrl: "",
    font: "Inter",
    buttonShape: "rounded",
    position: "bottom-right",
    animation: "fade-in",
  },
  bold: {
    title: "Don't Miss Out!",
    body: "Enable notifications for exclusive deals and updates.",
    primaryText: "Enable",
    secondaryText: "Skip",
    backgroundColor: "#22223b",
    cardColor: "#4a4e69",
    primaryColor: "#f72585",
    secondaryColor: "#bfc0c0",
    textColor: "#fff",
    imageUrl: "",
    font: "Roboto",
    buttonShape: "square",
    position: "bottom-left",
    animation: "slide-up",
  },
  sale: {
    title: "Flash Sale!",
    body: "Turn on notifications to get instant sale alerts.",
    primaryText: "Get Alerts",
    secondaryText: "No Thanks",
    backgroundColor: "#fff0f3",
    cardColor: "#ffccd5",
    primaryColor: "#ff006e",
    secondaryColor: "#6a4c93",
    textColor: "#22223b",
    imageUrl: "",
    font: "Poppins",
    buttonShape: "rounded",
    position: "bottom-right",
    animation: "fade-in",
  },
};

export default function PushCustomizer() {
  const [selected, setSelected] = useState(true); // Knob state
  const [title, setTitle] = useState("Stay updated!");
  const [body, setBody] = useState("Allow notifications to get the latest offers.");
  const [primaryText, setPrimaryText] = useState("Allow");
  const [secondaryText, setSecondaryText] = useState("Not now");

  const [backgroundColor, setBackgroundColor] = useState("#ffffff");
  const [cardColor, setCardColor] = useState("#f7f7f7");
  const [primaryColor, setPrimaryColor] = useState("#0066ff");
  const [secondaryColor, setSecondaryColor] = useState("#777777");
  const [textColor, setTextColor] = useState("#111111");

  const [imageUrl, setImageUrl] = useState(""); // New: Image URL

  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState(null); // {type: 'success'|'critical', message: string}
  const [delay, setDelay] = useState(3); // default 3 seconds
  const [font, setFont] = useState("Inter");
  const [buttonShape, setButtonShape] = useState("rounded");
  const [position, setPosition] = useState("bottom-right");
  const [animation, setAnimation] = useState("fade-in");
  const [templatePreset, setTemplatePreset] = useState("minimal");

  // Move applyPreset inside the component so it can access the setters
  function applyPreset(presetKey) {
    const preset = templatePresets[presetKey];
    if (!preset) return;
    setTitle(preset.title);
    setBody(preset.body);
    setPrimaryText(preset.primaryText);
    setSecondaryText(preset.secondaryText);
    setBackgroundColor(preset.backgroundColor);
    setCardColor(preset.cardColor);
    setPrimaryColor(preset.primaryColor);
    setSecondaryColor(preset.secondaryColor);
    setTextColor(preset.textColor);
    setImageUrl(preset.imageUrl);
    setFont(preset.font);
    setButtonShape(preset.buttonShape);
    setPosition(preset.position);
    setAnimation(preset.animation);
  }

  async function sendToApi() {
    const payload = {
      askAllow: selected ? 1 : 0,
      title,
      body,
      image: imageUrl,
      delay,
      font,
      buttonShape,
      position,
      animation,
      templatePreset,
      buttons: {
        primary: { text: primaryText, color: primaryColor },
        secondary: { text: secondaryText, color: secondaryColor },
      },
      colors: {
        background: backgroundColor,
        card: cardColor,
        text: textColor,
      },
    };


    setSending(true);
    setNotice(null);
    try {
      const res = await fetch('/api/sendui', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`${res.status} ${res.statusText} - ${text}`);
      }

      await res.json();
      setNotice({ type: 'success', message: 'Saved successfully.' });
    } catch (err) {
      setNotice({ type: 'critical', message: `Failed: ${err.message}` });
    } finally {
      setSending(false);
    }
  }
  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/sendui");
        if (!res.ok) {
          throw new Error("Failed to fetch saved UI data");
        }
        const data = await res.json();

        const enabled = Number(data.askAllow) === 1;
        setSelected(enabled ?? true); // default true if missing


        setTitle(data.title ?? "Stay updated!");
        setBody(data.body ?? "Allow notifications to get the latest offers.");
        setImageUrl(data.image ?? "");
        setDelay(data.delay ?? 3);
        setPrimaryText(data.buttons?.primary?.text ?? "Allow");
        setPrimaryColor(data.buttons?.primary?.color ?? "#0066ff");

        setSecondaryText(data.buttons?.secondary?.text ?? "Not now");
        setSecondaryColor(data.buttons?.secondary?.color ?? "#777777");

        setBackgroundColor(data.colors?.background ?? "#ffffff");
        setCardColor(data.colors?.card ?? "#f7f7f7");
        setTextColor(data.colors?.text ?? "#111111");
        setFont(data.font ?? "Inter");
        setButtonShape(data.buttonShape ?? "rounded");
        setPosition(data.position ?? "bottom-right");
        setAnimation(data.animation ?? "fade-in");
        setTemplatePreset(data.templatePreset ?? "minimal");

      } catch (err) {
        console.error("Error loading UI config:", err);
      }
    }

    fetchData();
  }, []);

  return (
    <Page title="Push Notification Customizer">
      {/* Knob toggle card */}
      <Card sectioned>
        <InlineStack align="space-between" blockAlign="center">
          <InlineStack align="start" gap="200" blockAlign="center">
            <Text as="p" variant="bodyMd">Enable Notification Customizer</Text>
            <Badge tone={selected ? 'success' : 'critical'}>
              {selected ? 'Enabled' : 'Disabled'}
            </Badge>
          </InlineStack>
          <Knob
            selected={selected}
            ariaLabel="Enable notifications"
            onClick={async () => {
              const newValue = !selected;
              setSelected(newValue);

              // send immediately when knob is toggled
              setSending(true);
              setNotice(null);

              try {
                const payload = {
                  askAllow: newValue ? 1 : 0, // derive from knob
                  title,
                  body,
                  image: imageUrl,
                  buttons: {
                    primary: { text: primaryText, color: primaryColor },
                    secondary: { text: secondaryText, color: secondaryColor },
                  },
                  colors: {
                    background: backgroundColor,
                    card: cardColor,
                    text: textColor,
                  },
                };

                const res = await fetch('/api/sendui', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(payload),
                });

                if (!res.ok) {
                  const text = await res.text();
                  throw new Error(`${res.status} ${res.statusText} - ${text}`);
                }

                await res.json();
                setNotice({ type: 'success', message: 'Saved successfully.' });
              } catch (err) {
                setNotice({ type: 'critical', message: `Failed: ${err.message}` });
              } finally {
                setSending(false);
              }
            }}
          />

        </InlineStack>
      </Card>

      {/* Main content card */}
      {selected && (
        <Card sectioned>
          <div
            style={{
              display: 'flex',
              gap: 24,
              minHeight: '600px', // or height: '80vh'
              alignItems: 'flex-start',
            }}
          >
            {/* Left side preview */}
            <div
              style={{
                flex: '0 0 400px',
                position: 'sticky',
                top: 0,
                alignSelf: 'flex-start',
                height: '100%',
                zIndex: 1,
                background: 'inherit',
              }}
            >
              <InlineStack align="start">
                <Text as="p" variant="bodyMd" fontWeight="semibold">Preview</Text>
              </InlineStack>
              <div style={{ marginTop: 12 }}>
                <div style={{
                  width: 360,
                  borderRadius: 12,
                  background: backgroundColor,
                  padding: 20,
                  position: 'relative',
                  fontFamily: font, // Use selected font
                  transition: animation === 'fade-in' ? 'opacity 0.5s' : 'transform 0.5s',
                  opacity: animation === 'fade-in' ? 1 : undefined,
                  transform: animation === 'slide-up' ? 'translateY(-20px)' : undefined,
                  // Position preview based on selection
                  alignSelf: position === 'bottom-right' ? 'flex-end' : 'flex-start',
                }}>
                  {/* Close Button */}
                  <button
                    onClick={() => console.log('Close clicked')} // Replace with state to hide preview
                    style={{
                      position: 'absolute',
                      top: 17,
                      right: 15,
                      border: 'none',
                      background: 'transparent',
                      fontSize: 16,
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      color: '#999',
                    }}
                  >
                    ×
                  </button>

                  <div style={{
                    background: cardColor,
                    padding: 16,
                    borderRadius: 10,
                    boxShadow: '0 6px 18px rgba(0,0,0,0.08)'
                  }}>
                    {imageUrl && (
                      <img
                        src={imageUrl}
                        alt="Notification"
                        style={{ width: '100%', borderRadius: 8, marginBottom: 12 }}
                      />
                    )}
                    <div style={{ color: textColor }}>
                      <div style={{ fontSize: 16, fontWeight: 600 }}>{title}</div>
                      <div style={{ marginTop: 6, fontSize: 14, color: textColor, opacity: 0.9 }}>{body}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                      <button style={{
                        flex: 1,
                        padding: '10px 12px',
                        borderRadius: buttonShape === 'rounded' ? 8 : 0, // Use button shape
                        border: 'none',
                        background: primaryColor,
                        color: '#fff',
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontFamily: font,
                      }}>{primaryText}</button>
                      <button style={{
                        flex: 1,
                        padding: '10px 12px',
                        borderRadius: buttonShape === 'rounded' ? 8 : 0, // Use button shape
                        border: '1px solid rgba(0,0,0,0.08)',
                        background: 'transparent',
                        color: secondaryColor,
                        cursor: 'pointer',
                        fontFamily: font,
                      }}>{secondaryText}</button>
                    </div>
                  </div>
                  <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
                    This is a simulated preview — actual browser permission dialogs are system-controlled.
                  </div>
                </div>
              </div>
            </div>

            {/* Right side form */}
            <div
              style={{
                width: 420,
                maxHeight: '600px', // match minHeight above
                overflowY: 'auto',
                paddingRight: 8,
              }}
            >
              <div style={{ marginTop: 12 }}>
                <label style={{ display: 'block', marginBottom: 6 }}>Template Preset</label>
                <select
                  value={templatePreset}
                  onChange={e => {
                    setTemplatePreset(e.target.value);
                    applyPreset(e.target.value);
                  }}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #e5e7eb' }}
                >
                  <option value="minimal">Minimal</option>
                  <option value="bold">Bold</option>
                  <option value="sale">Sale Alert</option>
                </select>
              </div>
              <TextField label="Title" value={title} onChange={setTitle} autoComplete="off" />
              <div style={{ height: 8 }} />
              <TextField label="Body" value={body} onChange={setBody} multiline minRows={2} />
              <div style={{ height: 8 }} />

              {/* Image URL */}
              <div style={{ marginTop: 12 }}>
                <label style={{ display: 'block', marginBottom: 6 }}>Image URL</label>
                <input
                  type="text"
                  placeholder="https://example.com/image.png"
                  value={imageUrl}
                  onChange={e => setImageUrl(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #e5e7eb' }}
                />
              </div>

              <div style={{ height: 12 }} />
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: 6 }}>Primary button text</label>
                  <input value={primaryText} onChange={e => setPrimaryText(e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #e5e7eb' }} />
                </div>
                <div style={{ width: 120 }}>
                  <label style={{ display: 'block', marginBottom: 6 }}>Primary color</label>
                  <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} style={{ width: '100%', height: 40, border: 0, padding: 0 }} />
                </div>
              </div>

              <div style={{ height: 12 }} />
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: 6 }}>Secondary button text</label>
                  <input value={secondaryText} onChange={e => setSecondaryText(e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #e5e7eb' }} />
                </div>
                <div style={{ width: 120 }}>
                  <label style={{ display: 'block', marginBottom: 6 }}>Secondary color</label>
                  <input type="color" value={secondaryColor} onChange={e => setSecondaryColor(e.target.value)} style={{ width: '100%', height: 40, border: 0, padding: 0 }} />
                </div>
              </div>


              <div style={{ marginTop: 12 }}>
                <label style={{ display: 'block', marginBottom: 6 }}>Delay (seconds)</label>
                <input
                  type="number"
                  min="0"
                  value={delay}
                  onChange={e => setDelay(Number(e.target.value))}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #e5e7eb' }}
                />
              </div>
              <div style={{ marginTop: 12 }}>
                <label style={{ display: 'block', marginBottom: 6 }}>Font Family</label>
                <select value={font} onChange={e => setFont(e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #e5e7eb' }}>
                  <option value="Inter">Inter</option>
                  <option value="Roboto">Roboto</option>
                  <option value="Poppins">Poppins</option>
                  <option value="Lato">Lato</option>
                </select>
              </div>

              <div style={{ marginTop: 12 }}>
                <label style={{ display: 'block', marginBottom: 6 }}>Button Shape</label>
                <select value={buttonShape} onChange={e => setButtonShape(e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #e5e7eb' }}>
                  <option value="rounded">Rounded</option>
                  <option value="square">Square</option>
                </select>
              </div>

              <div style={{ marginTop: 12 }}>
                <label style={{ display: 'block', marginBottom: 6 }}>Position</label>
                <select value={position} onChange={e => setPosition(e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #e5e7eb' }}>
                  <option value="top-left">Top Left</option>
                  <option value="top-center">Top Center</option>
                  <option value="top-right">Top Right</option>
                  <option value="bottom-left">Bottom Left</option>
                  <option value="bottom-center">Bottom Center</option>
                  <option value="bottom-right">Bottom Right</option>
                  <option value="center">Center</option>
                </select>
              </div>

              <div style={{ marginTop: 12 }}>
                <label style={{ display: 'block', marginBottom: 6 }}>Animation</label>
                <select value={animation} onChange={e => setAnimation(e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #e5e7eb' }}>
                  <option value="fade-in">Fade In</option>
                  <option value="slide-up">Slide Up</option>
                </select>
              </div>



              <div style={{ height: 12 }} />
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: 6 }}>Card background</label>
                  <input type="color" value={cardColor} onChange={e => setCardColor(e.target.value)} style={{ width: '100%', height: 40, border: 0 }} />
                </div>
                <div style={{ width: 120 }}>
                  <label style={{ display: 'block', marginBottom: 6 }}>Text color</label>
                  <input type="color" value={textColor} onChange={e => setTextColor(e.target.value)} style={{ width: '100%', height: 40, border: 0 }} />
                </div>
              </div>



              <div style={{ height: 12 }} />
              <InlineStack distribution="equalSpacing">
                <Button variant="primary" primary onClick={sendToApi} loading={sending}>Save</Button>
                {/* <Button onClick={() => {
                      setTitle('Stay updated!');
                      setBody('Allow notifications to get the latest offers.');
                      setPrimaryText('Allow');
                      setSecondaryText('Not now');
                      setBackgroundColor('#ffffff');
                      setCardColor('#f7f7f7');
                      setPrimaryColor('#0066ff');
                      setSecondaryColor('#777777');
                      setTextColor('#111111');
                      setImageUrl(''); // Reset image
                    }}>Reset</Button> */}
              </InlineStack>

              <div style={{ marginTop: 12 }}>
                {notice && (
                  <Banner status={notice.type === 'success' ? 'success' : 'critical'}>
                    <Text>{notice.message}</Text>
                  </Banner>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}
    </Page>
  );
}

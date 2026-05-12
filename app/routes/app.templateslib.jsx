// app/routes/app.dashboard.jsx
import { useState, useEffect } from "react";
import {
  Page,
  Card,
  Text,
  IndexTable,
  useIndexResourceState,
  InlineStack,
  Button,
  ButtonGroup,
  TextField,
  ActionList,
  Popover,
  Modal,
  BlockStack,
  Spinner,
  Toast,
  Frame,
} from "@shopify/polaris";
import { Link } from "@remix-run/react";

export default function Dashboard() {
  const [templates, setTemplates] = useState([]);
  const [queryValue, setQueryValue] = useState("");

  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [editName, setEditName] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editLink, setEditLink] = useState("");
  const [editIcon, setEditIcon] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [duplicating, setDuplicating] = useState(null);
  const [toastActive, setToastActive] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  const AES_PASSPHRASE = "CHANGE_ME_STRONG_PASSPHRASE";
  const AES_IV_SALT = "CHANGE_ME_IV_SALT";

  const textToBytes = (txt) => new TextEncoder().encode(txt);
  const sha256 = async (dataBuf) => {
    const buf = await crypto.subtle.digest("SHA-256", typeof dataBuf === "string" ? textToBytes(dataBuf) : dataBuf);
    return new Uint8Array(buf);
  };
  const base64ToBytes = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const deriveKeyIv = async (keyPass, ivPass) => {
    const keyHash = await sha256(keyPass);
    const ivHash = await sha256(ivPass);
    const iv = ivHash.slice(0, 16);
    const key = await crypto.subtle.importKey("raw", keyHash, { name: "AES-CBC" }, false, ["decrypt"]);
    return { key, iv };
  };
  const decryptText = async (cipherB64, keyPass, ivPass) => {
    try {
      if (!cipherB64 || typeof cipherB64 !== "string") return cipherB64;
      const { key, iv } = await deriveKeyIv(keyPass, ivPass);
      const cipherBytes = base64ToBytes(cipherB64);
      const plainBuf = await crypto.subtle.decrypt({ name: "AES-CBC", iv }, key, cipherBytes);
      return new TextDecoder().decode(plainBuf);
    } catch (e) {
      return cipherB64;
    }
  };

  const fetchTemplates = async () => {
    try {
      const res = await fetch("/api/gettemp/");
      const data = await res.json();
      const list = Array.isArray(data.templates) ? data.templates : [];
      const decrypted = await Promise.all(
        list.map(async (tpl) => {
          const title = await decryptText(tpl.title, AES_PASSPHRASE, AES_IV_SALT);
          const body = tpl.body ? await decryptText(tpl.body, AES_PASSPHRASE, AES_IV_SALT) : "";
          const link = tpl.link ? await decryptText(tpl.link, AES_PASSPHRASE, AES_IV_SALT) : "";
          const icon = tpl.icon ? await decryptText(tpl.icon, AES_PASSPHRASE, AES_IV_SALT) : "";
          return { ...tpl, title, body, link, icon };
        })
      );
      setTemplates(decrypted);
    } catch (err) {
      console.error("Failed to fetch templates", err);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const { selectedResources, allResourcesSelected, handleSelectionChange } =
    useIndexResourceState(templates);

  const filteredTemplates = templates.filter((tpl) => {
    const search = (queryValue || "").toLowerCase();
    return (
      (tpl?.name || "").toLowerCase().includes(search) ||
      (tpl?.title || "").toLowerCase().includes(search)
    );
  });

  const bulkDelete = async () => {
    try {
      await fetch("/api/gettemp", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedResources }),
      });
      setTemplates((prev) => prev.filter((tpl) => !selectedResources.includes(tpl.id)));
    } catch (err) {
      console.error("Failed to delete templates", err);
    }
  };

  const openEdit = (tpl) => {
    setEditingTemplate(tpl);
    setEditName(tpl.name || "");
    setEditTitle(tpl.title || "");
    setEditBody(tpl.body || "");
    setEditLink(tpl.link || "");
    setEditIcon(tpl.icon || "");
    setEditModalOpen(true);
  };

  const handleEditSave = async () => {
    if (!editingTemplate) return;
    setEditSaving(true);
    try {
      const res = await fetch("/api/gettemp", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingTemplate.id,
          name: editName || null,
          title: editTitle,
          body: editBody,
          link: editLink || null,
          icon: editIcon || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setToastMsg("Template updated successfully");
        setToastActive(true);
        setEditModalOpen(false);
        fetchTemplates();
      } else {
        alert("Update failed: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      alert("Error updating template: " + err.message);
    } finally {
      setEditSaving(false);
    }
  };

  const handleDuplicate = async (tpl) => {
    setDuplicating(tpl.id);
    try {
      const res = await fetch("/api/gettemp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "duplicate",
          source_id: tpl.id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setToastMsg("Template duplicated successfully");
        setToastActive(true);
        fetchTemplates();
      } else {
        alert("Duplicate failed: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      alert("Error duplicating template: " + err.message);
    } finally {
      setDuplicating(null);
    }
  };

  const [popoverActive, setPopoverActive] = useState(false);
  const togglePopover = () => setPopoverActive((active) => !active);

  const bulkActionsPopover = (
    <Popover
      active={popoverActive}
      activator={<Button onClick={togglePopover}>More options</Button>}
      autofocusTarget="first-node"
      onClose={togglePopover}
    >
      <ActionList
        items={[
          {
            destructive: true,
            content: "Delete",
            onAction: () => {
              bulkDelete();
              togglePopover();
            },
          },
        ]}
      />
    </Popover>
  );

  return (
    <Frame>
      <Page title="Templates Library">
        {/* Search + Actions */}
        <Card sectioned>
          <InlineStack gap="400" align="space-between" blockAlign="center">
            <TextField
              value={queryValue}
              onChange={setQueryValue}
              placeholder="Search templates"
              clearButton
              onClearButtonClick={() => setQueryValue("")}
            />
            {selectedResources.length > 0 && (
              <ButtonGroup>{bulkActionsPopover}</ButtonGroup>
            )}
          </InlineStack>
        </Card>

        {/* Templates Table */}
        <Card>
          <IndexTable
            resourceName={{ singular: "template", plural: "templates" }}
            itemCount={filteredTemplates.length}
            selectedItemsCount={allResourcesSelected ? "All" : selectedResources.length}
            onSelectionChange={handleSelectionChange}
            headings={[
              { title: "S.No" },
              { title: "Name" },
              { title: "Title" },
              { title: "Actions" },
            ]}
          >
            {filteredTemplates.map((tpl, index) => (
              <IndexTable.Row
                id={tpl.id}
                key={tpl.id}
                selected={selectedResources.includes(tpl.id)}
                position={index}
              >
                <IndexTable.Cell>{index + 1}</IndexTable.Cell>
                <IndexTable.Cell>
                  <Text as="span" fontWeight="semibold">
                    {tpl.name || <Text as="span" tone="subdued">—</Text>}
                  </Text>
                </IndexTable.Cell>
                <IndexTable.Cell>
                  <Text as="span">{tpl.title}</Text>
                </IndexTable.Cell>
                <IndexTable.Cell>
                  <InlineStack gap="200">
                    <Link to={`/app/additional?temp=${tpl.id}`}>
                      <Button size="slim">Send campaign</Button>
                    </Link>
                    <Button size="slim" onClick={() => openEdit(tpl)}>Edit</Button>
                    <Button
                      size="slim"
                      onClick={() => handleDuplicate(tpl)}
                      loading={duplicating === tpl.id}
                    >
                      Duplicate
                    </Button>
                  </InlineStack>
                </IndexTable.Cell>
              </IndexTable.Row>
            ))}
          </IndexTable>
        </Card>

        {/* Edit Modal */}
        <Modal
          open={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          title="Edit Template"
          primaryAction={{
            content: "Save",
            onAction: handleEditSave,
            loading: editSaving,
          }}
          secondaryActions={[{ content: "Cancel", onAction: () => setEditModalOpen(false) }]}
        >
          <Modal.Section>
            <BlockStack gap="300">
              <TextField
                label="Template Name (optional)"
                value={editName}
                onChange={setEditName}
                placeholder="e.g. Summer Sale Welcome"
              />
              <TextField
                label="Title"
                value={editTitle}
                onChange={setEditTitle}
              />
              <TextField
                label="Body"
                value={editBody}
                onChange={setEditBody}
                multiline={3}
              />
              <TextField
                label="Link (optional)"
                value={editLink}
                onChange={setEditLink}
                placeholder="https://example.com"
              />
              <TextField
                label="Icon URL (optional)"
                value={editIcon}
                onChange={setEditIcon}
                placeholder="https://example.com/icon.png"
              />
            </BlockStack>
          </Modal.Section>
        </Modal>

        {toastActive && (
          <Toast content={toastMsg} onDismiss={() => setToastActive(false)} />
        )}
      </Page>
    </Frame>
  );
}

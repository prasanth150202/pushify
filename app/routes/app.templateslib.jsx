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
} from "@shopify/polaris";
import { Link } from "@remix-run/react";
export default function Dashboard() {
  // State for templates
  const [templates, setTemplates] = useState([]);

  // Search state
  const [queryValue, setQueryValue] = useState("");

  // Fetch templates from API
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const res = await fetch("/api/gettemp/"); // your API route
        const data = await res.json();
        setTemplates(data.templates || []); // expecting { templates: [...] }
      } catch (err) {
        console.error("Failed to fetch templates", err);
      }
    };
    fetchTemplates();
  }, []);

  // Bulk selection state
  const { selectedResources, allResourcesSelected, handleSelectionChange } =
    useIndexResourceState(templates);

  // Filtered templates
  const filteredTemplates = templates.filter((tpl) =>
  (tpl?.title || "").toLowerCase().includes((queryValue || "").toLowerCase())
);


  // --- Delete Action ---
  const bulkDelete = async () => {
    try {
      await fetch("/api/gettemp", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedResources }),
      });

      setTemplates((prev) =>
        prev.filter((tpl) => !selectedResources.includes(tpl.id))
      );
    } catch (err) {
      console.error("Failed to delete templates", err);
    }
  };

  // --- Popover for Bulk Delete ---
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
    <Page title="Push Notifications Dashboard">
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
          selectedItemsCount={
            allResourcesSelected ? "All" : selectedResources.length
          }
          onSelectionChange={handleSelectionChange}
          headings={[
            { title: "S.No" },
            { title: "Name" },
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
                  {tpl.title}
                </Text>
              </IndexTable.Cell>
              <IndexTable.Cell>
  <Link to={`/app/additional?temp=${tpl.id}`}>
    <Button primary size="slim">
      Send campaign
    </Button>
  </Link>
</IndexTable.Cell>

            </IndexTable.Row>
          ))}
        </IndexTable>
      </Card>
    </Page>
  );
}

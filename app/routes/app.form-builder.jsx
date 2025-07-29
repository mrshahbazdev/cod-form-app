import { useState, useCallback, useEffect } from "react";
import { json } from "@remix-run/node";
import { useLoaderData, useSubmit, Form, useActionData } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  TextField,
  Button,
  IndexTable,
  Text,
  BlockStack,
  InlineStack,
  Select,
  Checkbox,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export async function loader({ request }) {
  const { session } = await authenticate.admin(request);
  const formFields = await db.formField.findMany({
    where: { shop: session.shop },
    orderBy: { sortOrder: "asc" },
  });
  return json({ fields: formFields });
}

export async function action({ request }) {
  const { session } = await authenticate.admin(request);
  const { shop } = session;
  const formData = await request.formData();
  const action = formData.get("_action");

  if (action === "save_field") {
    const id = formData.get("id") ? parseInt(formData.get("id")) : null;
    const fieldData = {
      fieldType: formData.get("fieldType"),
      name: formData.get("name"),
      label: formData.get("label"),
      placeholder: formData.get("placeholder"),
      isRequired: formData.get("isRequired") === "true",
      sortOrder: parseInt(formData.get("sortOrder")) || 0,
    };

    if (id) {
      await db.formField.update({ where: { id }, data: fieldData });
    } else {
      await db.formField.create({ data: { shop, ...fieldData } });
    }
  } else if (action === "delete_field") {
    const id = parseInt(formData.get("id"));
    await db.formField.delete({ where: { id } });
  }

  return json({ success: true });
}

export default function FormBuilderPage() {
  const { fields } = useLoaderData();
  const actionData = useActionData();
  const submit = useSubmit();

  const [isEditing, setIsEditing] = useState(null);
  const [formState, setFormState] = useState({
    fieldType: 'text', name: '', label: '', placeholder: '', isRequired: true, sortOrder: 0
  });

  useEffect(() => {
    if (actionData?.success) {
      setIsEditing(null);
      setFormState({ fieldType: 'text', name: '', label: '', placeholder: '', isRequired: true, sortOrder: 0 });
    }
  }, [actionData]);

  const handleEditClick = (field) => {
    setIsEditing(field.id);
    setFormState({ ...field });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFormChange = useCallback((key, value) => {
    setFormState(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleDelete = (id) => {
    const formData = new FormData();
    formData.append("_action", "delete_field");
    formData.append("id", id);
    submit(formData, { method: "post" });
  };

  const fieldTypeOptions = [
    { label: 'Text', value: 'text' },
    { label: 'Email', value: 'email' },
    { label: 'Phone', value: 'tel' },
    { label: 'Select (Dropdown)', value: 'select' },
  ];

  return (
    <Page>
      <ui-title-bar title="COD Form Builder" />
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="500">
              <Text as="h2" variant="headingMd">{isEditing ? `Editing Field: ${formState.label}` : "Add New Field"}</Text>
              <Form method="post">
                <input type="hidden" name="_action" value="save_field" />
                {isEditing && <input type="hidden" name="id" value={isEditing} />}
                <BlockStack gap="400">
                  <InlineStack gap="400">
                    <div style={{ flex: 1 }}><TextField label="Label" name="label" value={formState.label} onChange={(val) => handleFormChange('label', val)} autoComplete="off" /></div>
                    <div style={{ flex: 1 }}><TextField label="Name (Unique ID)" name="name" value={formState.name} onChange={(val) => handleFormChange('name', val)} autoComplete="off" helpText="e.g., customer_name (no spaces)" disabled={isEditing} /></div>
                  </InlineStack>
                  <InlineStack gap="400">
                    <div style={{ flex: 1 }}><Select label="Field Type" name="fieldType" options={fieldTypeOptions} value={formState.fieldType} onChange={(val) => handleFormChange('fieldType', val)} /></div>
                    <div style={{ flex: 1 }}><TextField label="Placeholder" name="placeholder" value={formState.placeholder} onChange={(val) => handleFormChange('placeholder', val)} autoComplete="off" /></div>
                  </InlineStack>
                  <InlineStack gap="400">
                    <div style={{ flex: 1 }}><TextField label="Sort Order" name="sortOrder" type="number" value={formState.sortOrder} onChange={(val) => handleFormChange('sortOrder', val)} autoComplete="off" /></div>
                    <div style={{ flex: 1, paddingTop: '24px' }}><Checkbox label="Is Required?" name="isRequired" value="true" checked={formState.isRequired} onChange={(checked) => handleFormChange('isRequired', checked)} /></div>
                  </InlineStack>
                  <InlineStack gap="200">
                    <Button submit variant="primary">{isEditing ? "Update Field" : "Add Field"}</Button>
                    {isEditing && <Button onClick={() => setIsEditing(null)}>Cancel</Button>}
                  </InlineStack>
                </BlockStack>
              </Form>
            </BlockStack>
          </Card>
        </Layout.Section>
        <Layout.Section>
          <Card>
            <IndexTable
              resourceName={{ singular: 'field', plural: 'fields' }}
              itemCount={fields.length}
              headings={[{ title: 'Order' }, { title: 'Label' }, { title: 'Name' }, { title: 'Type' }, { title: 'Required' }, { title: 'Actions' }]}
              selectable={false}
            >
              {fields.map((field, index) => (
                <IndexTable.Row id={field.id} key={field.id} position={index}>
                  <IndexTable.Cell>{field.sortOrder}</IndexTable.Cell>
                  <IndexTable.Cell>{field.label}</IndexTable.Cell>
                  <IndexTable.Cell>{field.name}</IndexTable.Cell>
                  <IndexTable.Cell>{field.fieldType}</IndexTable.Cell>
                  <IndexTable.Cell>{field.isRequired ? 'Yes' : 'No'}</IndexTable.Cell>
                  <IndexTable.Cell>
                    <InlineStack gap="200">
                      <Button onClick={() => handleEditClick(field)}>Edit</Button>
                      <Button variant="tertiary" onClick={() => handleDelete(field.id)}>Delete</Button>
                    </InlineStack>
                  </IndexTable.Cell>
                </IndexTable.Row>
              ))}
            </IndexTable>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

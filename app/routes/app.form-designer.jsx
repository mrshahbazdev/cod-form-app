import { useState, useCallback, useEffect } from "react";
import { json } from "@remix-run/node";
import { useLoaderData, useSubmit, Form, useActionData } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Text,
  BlockStack,
  TextField,
  Button,
  InlineStack,
  Select,
  Checkbox,
  Frame,
  Toast,
  Divider,
} from "@shopify/polaris";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export async function loader({ request }) {
  const { session } = await authenticate.admin(request);
  const { shop } = session;
  const [settings, formFields] = await Promise.all([
    db.appSettings.findUnique({ where: { shop } }),
    db.formField.findMany({ where: { shop }, orderBy: { sortOrder: "asc" } })
  ]);
  return json({ settings: settings || {}, fields: formFields });
}

export async function action({ request }) {
  const { session } = await authenticate.admin(request);
  const { shop } = session;
  const formData = await request.formData();
  const action = formData.get("_action");

  if (action === "save_styles") {
    const settingsData = {
      formTitle: formData.get("formTitle"),
      formSubtitle: formData.get("formSubtitle"),
      buttonText: formData.get("buttonText"),
      formBgColor: formData.get("formBgColor"),
      formTextColor: formData.get("formTextColor"),
      formLabelColor: formData.get("formLabelColor"),
      buttonColor: formData.get("buttonColor"),
      buttonTextColor: formData.get("buttonTextColor"),
    };
    await db.appSettings.upsert({
      where: { shop },
      update: settingsData,
      create: { shop, ...settingsData },
    });
  } else if (action === "save_field") {
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
  } else if (action === "reorder_fields") {
    const fields = JSON.parse(formData.get("fields"));
    await Promise.all(
      fields.map((field, index) =>
        db.formField.update({
          where: { id: field.id },
          data: { sortOrder: index },
        })
      )
    );
  } else if (action === "delete_field") {
    const id = parseInt(formData.get("id"));
    await db.formField.delete({ where: { id } });
  }
  return json({ success: true });
}

export default function FormDesignerPage() {
  const { settings, fields: initialFields } = useLoaderData();
  const submit = useSubmit();
  const actionData = useActionData();
  const [fields, setFields] = useState(initialFields);
  const [toastActive, setToastActive] = useState(false);

  const [styleState, setStyleState] = useState({
    formTitle: settings.formTitle || 'Cash on Delivery',
    formSubtitle: settings.formSubtitle || 'Please enter your shipping address',
    buttonText: settings.buttonText || 'Complete Order',
    formBgColor: settings.formBgColor || '#FFFFFF',
    formTextColor: settings.formTextColor || '#000000',
    formLabelColor: settings.formLabelColor || '#333333',
    buttonColor: settings.buttonColor || '#008060',
    buttonTextColor: settings.buttonTextColor || '#FFFFFF',
  });

  useEffect(() => {
    if (actionData?.success) {
      setToastActive(true);
    }
  }, [actionData]);

  const onDragEnd = (result) => {
    if (!result.destination) return;
    const items = Array.from(fields);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setFields(items);

    const formData = new FormData();
    formData.append("_action", "reorder_fields");
    formData.append("fields", JSON.stringify(items.map(f => ({ id: f.id }))));
    submit(formData, { method: "post" });
  };

  const handleStyleChange = useCallback((key, value) => {
    setStyleState(prev => ({ ...prev, [key]: value }));
  }, []);

  return (
    <Frame>
      <Page>
        <ui-title-bar title="Form Designer">
          <button variant="primary" onClick={() => {
            const form = document.getElementById('styleForm');
            const formData = new FormData(form);
            submit(formData, { method: 'post' });
          }}>
            Save Design
          </button>
        </ui-title-bar>
        <Layout>
          <Layout.Section>
            <Card>
              <Text as="h2" variant="headingMd">Live Form Preview</Text>
              <div style={{ border: '1px solid #ccc', borderRadius: '8px', padding: '20px', backgroundColor: styleState.formBgColor, marginTop: '20px' }}>
                <h2 style={{ color: styleState.formTextColor }}>{styleState.formTitle}</h2>
                <p style={{ color: styleState.formTextColor }}>{styleState.formSubtitle}</p>
                <hr/>
                {fields.map(field => (
                  <div key={field.id} style={{marginBottom: '10px'}}>
                    <label style={{ color: styleState.formLabelColor, display: 'block', marginBottom: '5px' }}>{field.label}{field.isRequired ? ' *' : ''}</label>
                    <input type={field.fieldType} style={{width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px'}} placeholder={field.placeholder || ''} />
                  </div>
                ))}
                <button type="button" style={{ width: '100%', padding: '12px', marginTop: '15px', backgroundColor: styleState.buttonColor, color: styleState.buttonTextColor, border: 'none', borderRadius: '4px' }}>
                  {styleState.buttonText}
                </button>
              </div>
            </Card>
          </Layout.Section>
          <Layout.Section variant="oneThird">
            <BlockStack gap="400">
              <Card>
                <Form id="styleForm" method="post">
                  <input type="hidden" name="_action" value="save_styles" />
                  <BlockStack gap="400">
                    <Text as="h3" variant="headingSm">Form Styling</Text>
                    <TextField label="Title" name="formTitle" value={styleState.formTitle} onChange={(val) => handleStyleChange('formTitle', val)} />
                    <TextField label="Subtitle" name="formSubtitle" value={styleState.formSubtitle} onChange={(val) => handleStyleChange('formSubtitle', val)} />
                    <TextField label="Button Text" name="buttonText" value={styleState.buttonText} onChange={(val) => handleStyleChange('buttonText', val)} />
                    <TextField label="Background Color" name="formBgColor" value={styleState.formBgColor} onChange={(val) => handleStyleChange('formBgColor', val)} />
                    <TextField label="Text Color" name="formTextColor" value={styleState.formTextColor} onChange={(val) => handleStyleChange('formTextColor', val)} />
                    <TextField label="Label Color" name="formLabelColor" value={styleState.formLabelColor} onChange={(val) => handleStyleChange('formLabelColor', val)} />
                    <TextField label="Button Color" name="buttonColor" value={styleState.buttonColor} onChange={(val) => handleStyleChange('buttonColor', val)} />
                    <TextField label="Button Text Color" name="buttonTextColor" value={styleState.buttonTextColor} onChange={(val) => handleStyleChange('buttonTextColor', val)} />
                  </BlockStack>
                </Form>
              </Card>
              <Card>
                <BlockStack gap="400">
                  <Text as="h3" variant="headingSm">Form Fields</Text>
                  <DragDropContext onDragEnd={onDragEnd}>
                    <Droppable droppableId="fields">
                      {(provided) => (
                        <div {...provided.droppableProps} ref={provided.innerRef}>
                          {fields.map((field, index) => (
                            <Draggable key={field.id} draggableId={String(field.id)} index={index}>
                              {(provided) => (
                                <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} style={{ padding: '8px', marginBottom: '8px', border: '1px solid #ccc', borderRadius: '4px', background: 'white', ...provided.draggableProps.style }}>
                                  <Text>{field.label}</Text>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </DragDropContext>
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>
        </Layout>
      </Page>
      {toastActive && <Toast content="Changes saved" onDismiss={() => setToastActive(false)} />}
    </Frame>
  );
}

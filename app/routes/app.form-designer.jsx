import { useState, useCallback } from "react";
import { json } from "@remix-run/node";
import { useLoaderData, useSubmit, Form } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Text,
  BlockStack,
  TextField,
  Button,
  ColorPicker,
  Popover,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export async function loader({ request }) {
  const { session } = await authenticate.admin(request);
  const settings = await db.appSettings.findUnique({ where: { shop: session.shop } });
  return json({ settings: settings || {} });
}

export async function action({ request }) {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();

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
    where: { shop: session.shop },
    update: settingsData,
    create: { shop: session.shop, ...settingsData },
  });

  return json({ success: true });
}

// Chota sa component color picker ke liye
function ColorPickerInput({ label, value, onChange }) {
    const [popoverActive, setPopoverActive] = useState(false);
    const [color, setColor] = useState({ hue: 120, brightness: 1, saturation: 1 });

    return (
        <Popover active={popoverActive} activator={<Button onClick={() => setPopoverActive(!popoverActive)}>{label}</Button>} onClose={() => setPopoverActive(false)}>
            <Popover.Pane>
                <ColorPicker onChange={setColor} color={color} />
            </Popover.Pane>
        </Popover>
    );
}


export default function FormDesignerPage() {
  const { settings } = useLoaderData();
  const submit = useSubmit();

  const [formState, setFormState] = useState({
    formTitle: settings.formTitle || 'Cash on Delivery',
    formSubtitle: settings.formSubtitle || 'Please enter your shipping address',
    buttonText: settings.buttonText || 'Complete Order',
    formBgColor: settings.formBgColor || '#FFFFFF',
    formTextColor: settings.formTextColor || '#000000',
    formLabelColor: settings.formLabelColor || '#333333',
    buttonColor: settings.buttonColor || '#008060',
    buttonTextColor: settings.buttonTextColor || '#FFFFFF',
  });

  const handleFormChange = useCallback((key, value) => {
    setFormState(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleFormSubmit = (event) => {
    const formData = new FormData(event.currentTarget);
    submit(formData, { method: "post", replace: true });
  };

  return (
    <Page>
      <ui-title-bar title="Form Designer" />
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="500">
              <Text as="h2" variant="headingMd">Live Form Preview</Text>
              <div style={{ border: '1px solid #ccc', borderRadius: '8px', padding: '20px', backgroundColor: formState.formBgColor }}>
                <h2 style={{ color: formState.formTextColor }}>{formState.formTitle}</h2>
                <p style={{ color: formState.formTextColor }}>{formState.formSubtitle}</p>
                <hr/>
                <label style={{ color: formState.formLabelColor }}>Your name *</label>
                <input type="text" style={{width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px'}} placeholder="John Doe" />
                <button type="button" style={{ width: '100%', padding: '12px', marginTop: '15px', backgroundColor: formState.buttonColor, color: formState.buttonTextColor, border: 'none', borderRadius: '4px' }}>
                  {formState.buttonText}
                </button>
              </div>
            </BlockStack>
          </Card>
        </Layout.Section>
        <Layout.Section variant="oneThird">
          <Card>
            <Form onSubmit={handleFormSubmit} method="post">
              <BlockStack gap="400">
                <Text as="h3" variant="headingSm">Form Text</Text>
                <TextField label="Title" name="formTitle" value={formState.formTitle} onChange={(val) => handleFormChange('formTitle', val)} />
                <TextField label="Subtitle" name="formSubtitle" value={formState.formSubtitle} onChange={(val) => handleFormChange('formSubtitle', val)} />
                <TextField label="Button Text" name="buttonText" value={formState.buttonText} onChange={(val) => handleFormChange('buttonText', val)} />

                <Text as="h3" variant="headingSm">Form Colors</Text>
                <TextField label="Background Color" name="formBgColor" value={formState.formBgColor} onChange={(val) => handleFormChange('formBgColor', val)} />
                <TextField label="Text Color" name="formTextColor" value={formState.formTextColor} onChange={(val) => handleFormChange('formTextColor', val)} />
                <TextField label="Label Color" name="formLabelColor" value={formState.formLabelColor} onChange={(val) => handleFormChange('formLabelColor', val)} />
                <TextField label="Button Color" name="buttonColor" value={formState.buttonColor} onChange={(val) => handleFormChange('buttonColor', val)} />
                <TextField label="Button Text Color" name="buttonTextColor" value={formState.buttonTextColor} onChange={(val) => handleFormChange('buttonTextColor', val)} />

                <Button submit variant="primary" fullWidth>Save Design</Button>
              </BlockStack>
            </Form>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

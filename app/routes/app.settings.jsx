import { useState, useCallback } from "react";
import { json } from "@remix-run/node";
import { useLoaderData, useSubmit, Form } from "@remix-run/react";
import { Page, Layout, Card, Checkbox, Text, BlockStack, TextField, Button } from "@shopify/polaris";
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
    otpEnabled: formData.get("otpEnabled") === "true",
    twilioAccountSid: formData.get("twilioAccountSid"),
    twilioAuthToken: formData.get("twilioAuthToken"),
    twilioPhoneNumber: formData.get("twilioPhoneNumber"),
    twilioVerifySid: formData.get("twilioVerifySid"), // NAYI FIELD
  };

  await db.appSettings.upsert({
    where: { shop: session.shop },
    update: settingsData,
    create: { shop: session.shop, ...settingsData },
  });

  return json({ success: true });
}

export default function AppSettingsPage() {
  const { settings } = useLoaderData();
  const submit = useSubmit();

  const [formState, setFormState] = useState({
    otpEnabled: settings.otpEnabled || false,
    twilioAccountSid: settings.twilioAccountSid || '',
    twilioAuthToken: settings.twilioAuthToken || '',
    twilioPhoneNumber: settings.twilioPhoneNumber || '',
    twilioVerifySid: settings.twilioVerifySid || '', // NAYI FIELD
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
      <ui-title-bar title="App Settings" />
      <Layout>
        <Layout.Section>
          <Card>
            <Form onSubmit={handleFormSubmit} method="post">
              <BlockStack gap="500">
                <Text as="h2" variant="headingMd">OTP Verification</Text>
                <Checkbox
                  label="Enable OTP verification for orders"
                  name="otpEnabled"
                  value="true"
                  checked={formState.otpEnabled}
                  onChange={(checked) => handleFormChange('otpEnabled', checked)}
                />

                <TextField label="Twilio Account SID" name="twilioAccountSid" value={formState.twilioAccountSid} onChange={(value) => handleFormChange('twilioAccountSid', value)} autoComplete="off" />
                <TextField label="Twilio Auth Token" name="twilioAuthToken" type="password" value={formState.twilioAuthToken} onChange={(value) => handleFormChange('twilioAuthToken', value)} autoComplete="off" />
                <TextField label="Twilio Phone Number" name="twilioPhoneNumber" helpText="Your Twilio number (e.g., +1234567890)" value={formState.twilioPhoneNumber} onChange={(value) => handleFormChange('twilioPhoneNumber', value)} autoComplete="off" />
                <TextField label="Twilio Verify Service SID" name="twilioVerifySid" helpText="Your Twilio Verify Service SID (starts with VA...)" value={formState.twilioVerifySid} onChange={(value) => handleFormChange('twilioVerifySid', value)} autoComplete="off" />

                <Button submit variant="primary">Save Settings</Button>
              </BlockStack>
            </Form>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

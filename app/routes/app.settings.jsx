import { useState, useCallback, useEffect } from "react";
import { json } from "@remix-run/node";
import { useLoaderData, useSubmit, Form, useActionData } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Checkbox,
  Text,
  BlockStack,
  TextField,
  Button,
  Divider,
  Frame, // NAYA IMPORT
  Toast, // NAYA IMPORT
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
    otpEnabled: formData.get("otpEnabled") === "true",
    twilioAccountSid: formData.get("twilioAccountSid"),
    twilioAuthToken: formData.get("twilioAuthToken"),
    twilioPhoneNumber: formData.get("twilioPhoneNumber"),
    twilioVerifySid: formData.get("twilioVerifySid"),
    orderSpamProtectionEnabled: formData.get("orderSpamProtectionEnabled") === "true",
    orderSpamTimeLimit: parseInt(formData.get("orderSpamTimeLimit")) || 5,
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
  const actionData = useActionData();
  const submit = useSubmit();

  const [formState, setFormState] = useState({
    otpEnabled: settings.otpEnabled || false,
    twilioAccountSid: settings.twilioAccountSid || '',
    twilioAuthToken: settings.twilioAuthToken || '',
    twilioPhoneNumber: settings.twilioPhoneNumber || '',
    twilioVerifySid: settings.twilioVerifySid || '',
    orderSpamProtectionEnabled: settings.orderSpamProtectionEnabled || false,
    orderSpamTimeLimit: settings.orderSpamTimeLimit || 5,
  });

  // NAYI FUNCTIONALITY: Toast ke liye state
  const [toastActive, setToastActive] = useState(false);
  const toggleToastActive = useCallback(() => setToastActive((active) => !active), []);

  // Jab form kamyabi se submit ho, to toast dikhayein
  useEffect(() => {
    if (actionData?.success) {
      setToastActive(true);
    }
  }, [actionData]);

  const handleFormChange = useCallback((key, value) => {
    setFormState(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleFormSubmit = (event) => {
    const formData = new FormData(event.currentTarget);
    submit(formData, { method: "post", replace: true });
  };

  const toastMarkup = toastActive ? (
    <Toast content="Settings saved" onDismiss={toggleToastActive} />
  ) : null;

  return (
    <Frame>
      <Page>
        <ui-title-bar title="App Settings" />
        <Layout>
          <Layout.Section>
            <Card>
              <Form onSubmit={handleFormSubmit} method="post">
                <BlockStack gap="500">
                  <Text as="h2" variant="headingMd">Fraud Prevention</Text>

                  <Checkbox
                    label="Enable OTP verification for orders"
                    name="otpEnabled"
                    value="true"
                    checked={formState.otpEnabled}
                    onChange={(checked) => handleFormChange('otpEnabled', checked)}
                  />

                  <Checkbox
                    label="Enable Order Spam Protection"
                    name="orderSpamProtectionEnabled"
                    value="true"
                    checked={formState.orderSpamProtectionEnabled}
                    onChange={(checked) => handleFormChange('orderSpamProtectionEnabled', checked)}
                  />
                  <TextField
                    label="Time limit between orders (minutes)"
                    name="orderSpamTimeLimit"
                    type="number"
                    value={formState.orderSpamTimeLimit}
                    onChange={(value) => handleFormChange('orderSpamTimeLimit', value)}
                    helpText="A customer cannot place another order from the same phone number within this time."
                    autoComplete="off"
                  />

                  <Divider />

                  <Text as="h2" variant="headingMd">Twilio API Settings</Text>
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
      {toastMarkup}
    </Frame>
  );
}

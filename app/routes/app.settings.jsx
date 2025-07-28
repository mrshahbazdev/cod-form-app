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
  InlineStack,
  Frame,
  Toast,
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
    orderSpamProtectionEnabled: formData.get("orderSpamProtectionEnabled") === "true",
    orderSpamTimeLimit: parseInt(formData.get("orderSpamTimeLimit")) || 5,
    autoIpBlockingEnabled: formData.get("autoIpBlockingEnabled") === "true",
    ipBlockAttemptLimit: parseInt(formData.get("ipBlockAttemptLimit")) || 3,
    ipBlockTimeFrame: parseInt(formData.get("ipBlockTimeFrame")) || 5,
    twilioAccountSid: formData.get("twilioAccountSid"),
    twilioAuthToken: formData.get("twilioAuthToken"),
    twilioPhoneNumber: formData.get("twilioPhoneNumber"),
    twilioVerifySid: formData.get("twilioVerifySid"),
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
    orderSpamProtectionEnabled: settings.orderSpamProtectionEnabled || false,
    orderSpamTimeLimit: settings.orderSpamTimeLimit || 5,
    autoIpBlockingEnabled: settings.autoIpBlockingEnabled || false,
    ipBlockAttemptLimit: settings.ipBlockAttemptLimit || 3,
    ipBlockTimeFrame: settings.ipBlockTimeFrame || 5,
    twilioAccountSid: settings.twilioAccountSid || '',
    twilioAuthToken: settings.twilioAuthToken || '',
    twilioPhoneNumber: settings.twilioPhoneNumber || '',
    twilioVerifySid: settings.twilioVerifySid || '',
  });

  const [toastActive, setToastActive] = useState(false);
  const toggleToastActive = useCallback(() => setToastActive((active) => !active), []);

  useEffect(() => {
    if (actionData?.success) {
      setToastActive(true);
    }
  }, [actionData]);

  const handleFormChange = useCallback((key, value) => {
    setFormState(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleFormSubmit = (event) => {
    event.preventDefault();
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
                    label="Enable Order Spam Protection (by Phone Number)"
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
                    autoComplete="off"
                  />

                  <Divider />

                  <Text as="h2" variant="headingMd">Auto IP Blocking</Text>
                  <Checkbox
                    label="Enable Automatic IP Blocking"
                    name="autoIpBlockingEnabled"
                    value="true"
                    checked={formState.autoIpBlockingEnabled}
                    onChange={(checked) => handleFormChange('autoIpBlockingEnabled', checked)}
                  />
                  <InlineStack gap="400">
                    <TextField
                      label="Block IP after"
                      name="ipBlockAttemptLimit"
                      type="number"
                      value={formState.ipBlockAttemptLimit}
                      onChange={(value) => handleFormChange('ipBlockAttemptLimit', value)}
                      autoComplete="off"
                    />
                    <TextField
                      label="attempts within (minutes)"
                      name="ipBlockTimeFrame"
                      type="number"
                      value={formState.ipBlockTimeFrame}
                      onChange={(value) => handleFormChange('ipBlockTimeFrame', value)}
                      autoComplete="off"
                    />
                  </InlineStack>

                  <Divider />

                  <Text as="h2" variant="headingMd">Twilio API Settings</Text>
                  <TextField label="Twilio Account SID" name="twilioAccountSid" value={formState.twilioAccountSid} onChange={(value) => handleFormChange('twilioAccountSid', value)} autoComplete="off" />
                  <TextField label="Twilio Auth Token" name="twilioAuthToken" type="password" value={formState.twilioAuthToken} onChange={(value) => handleFormChange('twilioAuthToken', value)} autoComplete="off" />
                  <TextField label="Twilio Phone Number" name="twilioPhoneNumber" value={formState.twilioPhoneNumber} onChange={(value) => handleFormChange('twilioPhoneNumber', value)} autoComplete="off" />
                  <TextField label="Twilio Verify Service SID" name="twilioVerifySid" value={formState.twilioVerifySid} onChange={(value) => handleFormChange('twilioVerifySid', value)} autoComplete="off" />

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

import { json } from "@remix-run/node";
import { useLoaderData, useSubmit, Form } from "@remix-run/react";
import { Page, Layout, Card, Checkbox, Text, BlockStack } from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export async function loader({ request }) {
  const { session } = await authenticate.admin(request);
  const settings = await db.appSettings.findUnique({ where: { shop: session.shop } });
  return json({ otpEnabled: settings?.otpEnabled || false });
}

export async function action({ request }) {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const otpEnabled = formData.get("otpEnabled") === "true";

  await db.appSettings.upsert({
    where: { shop: session.shop },
    update: { otpEnabled },
    create: { shop: session.shop, otpEnabled },
  });

  return json({ success: true });
}

export default function AppSettingsPage() {
  const { otpEnabled } = useLoaderData();
  const submit = useSubmit();

  const handleCheckboxChange = (checked) => {
    const formData = new FormData();
    formData.append("otpEnabled", checked);
    submit(formData, { method: "post", replace: true });
  };

  return (
    <Page>
      <ui-title-bar title="App Settings" />
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="500">
              <Text as="h2" variant="headingMd">OTP Verification</Text>
              <Checkbox
                label="Enable OTP verification for orders"
                checked={otpEnabled}
                onChange={handleCheckboxChange}
              />
              <Text variant="bodyMd" as="p" color="subdued">
                If enabled, customers will have to verify their phone number with an OTP before placing a Cash on Delivery order.
              </Text>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

import { json } from "@remix-run/node";
import { useLoaderData, useSubmit, Form } from "@remix-run/react";
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
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import db from "../db.server";

// Step 1: Database se tamam rates fetch karein
export async function loader({ request }) {
  // NAYI TABDEELI: Hum 'session' ko direct hasil kar rahe hain
  const { session } = await authenticate.admin(request);
  const { shop } = session;

  const shippingRates = await db.shippingRate.findMany({
    where: { shop },
    orderBy: { city: "asc" },
  });

  return json({ rates: shippingRates });
}

// Step 2: Naye rate ko save ya purane ko delete karein
export async function action({ request }) {
  // NAYI TABDEELI: Hum 'session' ko direct hasil kar rahe hain
  const { session } = await authenticate.admin(request);
  const { shop } = session;
  const formData = await request.formData();
  const action = formData.get("_action");

  if (action === "add_rate") {
    const city = formData.get("city");
    const rate = parseFloat(formData.get("rate"));

    if (city && !isNaN(rate)) {
      await db.shippingRate.upsert({
        where: { shop_city: { shop, city } }, // Unique constraint
        update: { rate },
        create: { shop, city, rate },
      });
    }
  } else if (action === "delete_rate") {
    const id = parseInt(formData.get("id"));
    await db.shippingRate.delete({ where: { id } });
  }

  return json({ success: true });
}

export default function ShippingRatesPage() {
  const { rates } = useLoaderData();
  const submit = useSubmit();

  const handleDelete = (id) => {
    const formData = new FormData();
    formData.append("_action", "delete_rate");
    formData.append("id", id);
    submit(formData, { method: "post" });
  };

  const resourceName = {
    singular: "rate",
    plural: "rates",
  };

  const rowMarkup = rates.map(({ id, city, rate }, index) => (
    <IndexTable.Row id={id} key={id} position={index}>
      <IndexTable.Cell>
        <Text variant="bodyMd" fontWeight="bold" as="span">
          {city}
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>PKR {rate.toFixed(2)}</IndexTable.Cell>
      <IndexTable.Cell>
        <Button variant="tertiary" onClick={() => handleDelete(id)}>
          Delete
        </Button>
      </IndexTable.Cell>
    </IndexTable.Row>
  ));

  return (
    <Page>
      <ui-title-bar title="Manage Shipping Rates" />
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="500">
              <Text as="h2" variant="headingMd">
                Add New Shipping Rate
              </Text>
              <Form method="post">
                <input type="hidden" name="_action" value="add_rate" />
                <InlineStack gap="400" align="start">
                  <div style={{ flex: 1 }}>
                    <TextField
                      label="City"
                      name="city"
                      autoComplete="off"
                      placeholder="e.g., Karachi"
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <TextField
                      label="Rate (PKR)"
                      name="rate"
                      type="number"
                      autoComplete="off"
                      placeholder="e.g., 250"
                    />
                  </div>
                  <div style={{ paddingTop: "24px" }}>
                    <Button submit variant="primary">
                      Add/Update Rate
                    </Button>
                  </div>
                </InlineStack>
              </Form>
            </BlockStack>
          </Card>
        </Layout.Section>
        <Layout.Section>
          <Card>
            <IndexTable
              resourceName={resourceName}
              itemCount={rates.length}
              headings={[
                { title: "City" },
                { title: "Rate" },
                { title: "Action" },
              ]}
              selectable={false}
            >
              {rowMarkup}
            </IndexTable>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

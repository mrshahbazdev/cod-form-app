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
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export async function loader({ request }) {
  const { session } = await authenticate.admin(request);
  const { shop } = session;
  const shippingRates = await db.shippingRate.findMany({
    where: { shop },
    orderBy: [{ country: "asc" }, { city: "asc" }],
  });
  return json({ rates: shippingRates });
}

export async function action({ request }) {
  const { session } = await authenticate.admin(request);
  const { shop } = session;
  const formData = await request.formData();
  const action = formData.get("_action");

  if (action === "add_rate") {
    const city = formData.get("city") || "";
    const country = formData.get("country");
    const rate = parseFloat(formData.get("rate"));
    const currency = formData.get("currency") || "PKR";

    if (country && !isNaN(rate)) {
      await db.shippingRate.upsert({
        where: { shop_country_city: { shop, country, city } },
        update: { rate, currency },
        create: { shop, country, city, rate, currency },
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
  const actionData = useActionData();
  const submit = useSubmit();

  // NAYI TABDEELI: Ab hum countries ki list database se banayenge
  const countries = [...new Set(rates.map(rate => rate.country))];
  const [selectedCountry, setSelectedCountry] = useState(countries[0] || "");

  useEffect(() => {
    // Action ke baad form reset karne ki logic yahan add ki ja sakti hai
  }, [actionData]);

  const countryOptions = countries.map(country => ({ label: country, value: country }));

  const handleDelete = (id) => {
    const formData = new FormData();
    formData.append("_action", "delete_rate");
    formData.append("id", id);
    submit(formData, { method: "post" });
  };

  return (
    <Page>
      <ui-title-bar title="Manage Shipping Rates" />
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="500">
              <Text as="h2" variant="headingMd">Add New Country / City Rate</Text>
              <Text>Use this form to add a default rate for a whole country (leave City blank) or a specific rate for a city.</Text>
              <Form method="post">
                <input type="hidden" name="_action" value="add_rate" />
                <InlineStack gap="400" align="start" blockAlign="end">
                  <div style={{ flex: 1 }}>
                    <TextField
                      label="Country Name"
                      name="country"
                      autoComplete="off"
                      placeholder="e.g., Pakistan"
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <TextField
                      label="City (Optional)"
                      name="city"
                      autoComplete="off"
                      placeholder="e.g., Karachi"
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <TextField
                      label="Rate"
                      name="rate"
                      type="number"
                      autoComplete="off"
                      placeholder="e.g., 250"
                    />
                  </div>
                  <div style={{ flex: 0.5 }}>
                    <TextField
                      label="Currency"
                      name="currency"
                      autoComplete="off"
                      placeholder="e.g., PKR"
                    />
                  </div>
                  <div>
                    <Button submit variant="primary">Add/Update</Button>
                  </div>
                </InlineStack>
              </Form>
            </BlockStack>
          </Card>
        </Layout.Section>
        <Layout.Section>
          <Card>
            <BlockStack gap="500">
              <Text as="h2" variant="headingMd">Existing Rates</Text>
              <Select
                label="Filter by Country"
                options={[{label: "All Countries", value: ""}, ...countryOptions]}
                onChange={setSelectedCountry}
                value={selectedCountry}
              />
              <IndexTable
                resourceName={{ singular: 'rate', plural: 'rates' }}
                itemCount={rates.length}
                headings={[
                  { title: 'Country' },
                  { title: 'City' },
                  { title: 'Rate' },
                  { title: 'Action' },
                ]}
                selectable={false}
              >
                {rates.filter(rate => !selectedCountry || rate.country === selectedCountry).map(({ id, country, city, rate, currency }, index) => (
                  <IndexTable.Row id={id} key={id} position={index}>
                    <IndexTable.Cell>{country}</IndexTable.Cell>
                    <IndexTable.Cell>{city || "All Cities (Default)"}</IndexTable.Cell>
                    <IndexTable.Cell>{currency} {rate.toFixed(2)}</IndexTable.Cell>
                    <IndexTable.Cell>
                      <Button variant="tertiary" onClick={() => handleDelete(id)}>Delete</Button>
                    </IndexTable.Cell>
                  </IndexTable.Row>
                ))}
              </IndexTable>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

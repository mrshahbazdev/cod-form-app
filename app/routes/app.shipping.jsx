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
      // Use a consistent key for upserting
      const uniqueKey = { shop_country_city: { shop, country, city } };
      await db.shippingRate.upsert({
        where: uniqueKey,
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

  // State for the main filter dropdown
  const countries = [...new Set(rates.map(rate => rate.country))];
  const [selectedCountryFilter, setSelectedCountryFilter] = useState("");

  // State for the "Add City" form
  const [selectedCountryForNewCity, setSelectedCountryForNewCity] = useState(countries[0] || "");
  const [newCity, setNewCity] = useState("");
  const [newCityRate, setNewCityRate] = useState("");
  const [newCityCurrency, setNewCityCurrency] = useState("PKR");

  // State for the "Add Country" form
  const [newCountry, setNewCountry] = useState("");
  const [newCountryRate, setNewCountryRate] = useState("");
  const [newCountryCurrency, setNewCountryCurrency] = useState("PKR");

  // Reset forms after successful submission
  useEffect(() => {
    if (actionData?.success) {
      setNewCity("");
      setNewCityRate("");
      setNewCountry("");
      setNewCountryRate("");
    }
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
              <Text as="h2" variant="headingMd">Add New Country (with Default Rate)</Text>
              <Form method="post">
                <input type="hidden" name="_action" value="add_rate" />
                <input type="hidden" name="city" value="" /> {/* Default rate has no city */}
                <InlineStack gap="400" align="start" blockAlign="end">
                  <div style={{ flex: 2 }}><TextField label="Country Name" name="country" value={newCountry} onChange={setNewCountry} autoComplete="off" placeholder="e.g., Pakistan" /></div>
                  <div style={{ flex: 1 }}><TextField label="Default Rate" name="rate" type="number" value={newCountryRate} onChange={setNewCountryRate} autoComplete="off" placeholder="e.g., 250" /></div>
                  <div style={{ flex: 1 }}><TextField label="Currency" name="currency" value={newCountryCurrency} onChange={setNewCountryCurrency} autoComplete="off" placeholder="e.g., PKR" /></div>
                  <div><Button submit variant="primary">Add Country</Button></div>
                </InlineStack>
              </Form>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="500">
              <Text as="h2" variant="headingMd">Add City-Specific Rate</Text>
              <Form method="post">
                <input type="hidden" name="_action" value="add_rate" />
                <InlineStack gap="400" align="start" blockAlign="end">
                  <div style={{ flex: 1 }}>
                    <Select label="Select Country" options={countryOptions} onChange={setSelectedCountryForNewCity} value={selectedCountryForNewCity} name="country" />
                  </div>
                  <div style={{ flex: 1 }}><TextField label="City Name" name="city" value={newCity} onChange={setNewCity} autoComplete="off" placeholder="e.g., Karachi" /></div>
                  <div style={{ flex: 1 }}><TextField label="Specific Rate" name="rate" type="number" value={newCityRate} onChange={setNewCityRate} autoComplete="off" placeholder="e.g., 150" /></div>
                  <div style={{ flex: 1 }}><TextField label="Currency" name="currency" value={newCityCurrency} onChange={setNewCityCurrency} autoComplete="off" placeholder="e.g., PKR" /></div>
                  <div><Button submit variant="primary">Add City Rate</Button></div>
                </InlineStack>
              </Form>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="500">
              <Text as="h2" variant="headingMd">Existing Rates</Text>
              <Select label="Filter by Country" options={[{label: "All Countries", value: ""}, ...countryOptions]} onChange={setSelectedCountryFilter} value={selectedCountryFilter} />
              <IndexTable resourceName={{ singular: 'rate', plural: 'rates' }} itemCount={rates.length} headings={[{ title: 'Country' }, { title: 'City' }, { title: 'Rate' }, { title: 'Action' }]} selectable={false}>
                {rates.filter(rate => !selectedCountryFilter || rate.country === selectedCountryFilter).map(({ id, country, city, rate, currency }, index) => (
                  <IndexTable.Row id={id} key={id} position={index}>
                    <IndexTable.Cell>{country}</IndexTable.Cell>
                    <IndexTable.Cell>{city || "All Cities (Default)"}</IndexTable.Cell>
                    <IndexTable.Cell>{currency} {rate.toFixed(2)}</IndexTable.Cell>
                    <IndexTable.Cell><Button variant="tertiary" onClick={() => handleDelete(id)}>Delete</Button></IndexTable.Cell>
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

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

  if (action === "add_or_update_rate") {
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

  const [isEditing, setIsEditing] = useState(null);
  const [formState, setFormState] = useState({ country: '', city: '', rate: '', currency: '' });

  const countries = [...new Set(rates.map(rate => rate.country))];
  const [selectedCountryForNewCity, setSelectedCountryForNewCity] = useState(countries[0] || "");
  const [newCity, setNewCity] = useState("");
  const [newCityRate, setNewCityRate] = useState("");
  const [newCityCurrency, setNewCityCurrency] = useState("");

  const [newCountry, setNewCountry] = useState("");
  const [newCountryRate, setNewCountryRate] = useState("");
  const [newCountryCurrency, setNewCountryCurrency] = useState("PKR");

  useEffect(() => {
    if (actionData?.success) {
      setIsEditing(null);
      setFormState({ country: '', city: '', rate: '', currency: '' });
      setNewCity('');
      setNewCityRate('');
      setNewCountry('');
      setNewCountryRate('');
    }
  }, [actionData]);

  const handleEditClick = (rate) => {
    setIsEditing(rate.id);
    setFormState({
      country: rate.country,
      city: rate.city || "",
      rate: rate.rate,
      currency: rate.currency,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFormChange = (key, value) => {
    setFormState(prev => ({ ...prev, [key]: value }));
  };

  const handleDelete = (id) => {
    const formData = new FormData();
    formData.append("_action", "delete_rate");
    formData.append("id", id);
    submit(formData, { method: "post" });
  };

  // NAYI TABDEELI: Jab country select ho, to currency update karein
  useEffect(() => {
      const defaultRateForCountry = rates.find(r => r.country === selectedCountryForNewCity && r.city === "");
      if (defaultRateForCountry) {
          setNewCityCurrency(defaultRateForCountry.currency);
      } else {
          setNewCityCurrency("PKR"); // Fallback
      }
  }, [selectedCountryForNewCity, rates]);


  const [selectedCountryFilter, setSelectedCountryFilter] = useState("");
  const countryOptions = countries.map(country => ({ label: country, value: country }));

  return (
    <Page>
      <ui-title-bar title="Manage Shipping Rates" />
      <Layout>
        {isEditing && (
          <Layout.Section>
            <Card>
              <BlockStack gap="500">
                <Text as="h2" variant="headingMd">{`Editing Rate for ${formState.country}`}</Text>
                <Form method="post">
                  <input type="hidden" name="_action" value="add_or_update_rate" />
                  {/* NAYI TABDEELI: Hidden fields taake update kaam kare */}
                  <input type="hidden" name="country" value={formState.country} />
                  <input type="hidden" name="city" value={formState.city} />
                  <InlineStack gap="400" align="start" blockAlign="end">
                    <div style={{ flex: 1 }}><TextField label="Country Name" value={formState.country} autoComplete="off" disabled /></div>
                    <div style={{ flex: 1 }}><TextField label="City (Optional for default)" value={formState.city} autoComplete="off" disabled /></div>
                    <div style={{ flex: 1 }}><TextField label="Rate" name="rate" type="number" value={formState.rate} onChange={(val) => handleFormChange('rate', val)} autoComplete="off" /></div>
                    <div style={{ flex: 0.5 }}><TextField label="Currency" name="currency" value={formState.currency} onChange={(val) => handleFormChange('currency', val)} autoComplete="off" /></div>
                    <div><Button submit variant="primary">Update</Button></div>
                    <Button onClick={() => setIsEditing(null)}>Cancel</Button>
                  </InlineStack>
                </Form>
              </BlockStack>
            </Card>
          </Layout.Section>
        )}

        <Layout.Section>
          <Card>
            <BlockStack gap="500">
              <Text as="h2" variant="headingMd">Add New Country / Default Rate</Text>
              <Text>Use this form to add a new country or update a country's default rate (leave City blank).</Text>
              <Form method="post">
                <input type="hidden" name="_action" value="add_or_update_rate" />
                <input type="hidden" name="city" value="" />
                <InlineStack gap="400" align="start" blockAlign="end">
                  <div style={{ flex: 1 }}><TextField label="Country Name" name="country" value={newCountry} onChange={setNewCountry} autoComplete="off" placeholder="e.g., Pakistan" /></div>
                  <div style={{ flex: 1 }}><TextField label="Default Rate" name="rate" type="number" value={newCountryRate} onChange={setNewCountryRate} autoComplete="off" placeholder="e.g., 250" /></div>
                  <div style={{ flex: 0.5 }}><TextField label="Currency" name="currency" value={newCountryCurrency} onChange={setNewCountryCurrency} autoComplete="off" placeholder="e.g., PKR" /></div>
                  <div><Button submit variant="primary">Save Default Rate</Button></div>
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
                <input type="hidden" name="_action" value="add_or_update_rate" />
                <input type="hidden" name="currency" value={newCityCurrency} />
                <InlineStack gap="400" align="start" blockAlign="end">
                  <div style={{ flex: 1 }}>
                    <Select label="Select Country" options={countryOptions} onChange={setSelectedCountryForNewCity} value={selectedCountryForNewCity} name="country" />
                  </div>
                  <div style={{ flex: 1 }}><TextField label="City Name" name="city" value={newCity} onChange={setNewCity} autoComplete="off" placeholder="e.g., Karachi" /></div>
                  <div style={{ flex: 1 }}><TextField label="Specific Rate" name="rate" type="number" value={newCityRate} onChange={setNewCityRate} autoComplete="off" placeholder="e.g., 150" /></div>
                  <div style={{ flex: 0.5 }}><TextField label="Currency" value={newCityCurrency} autoComplete="off" disabled /></div>
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
              <IndexTable resourceName={{ singular: 'rate', plural: 'rates' }} itemCount={rates.length} headings={[{ title: 'Country' }, { title: 'City' }, { title: 'Rate' }, { title: 'Actions' }]} selectable={false}>
                {rates.filter(rate => !selectedCountryFilter || rate.country === selectedCountryFilter).map((rate, index) => (
                  <IndexTable.Row id={rate.id} key={rate.id} position={index}>
                    <IndexTable.Cell>{rate.country}</IndexTable.Cell>
                    <IndexTable.Cell>{rate.city || "All Cities (Default)"}</IndexTable.Cell>
                    <IndexTable.Cell>{rate.currency} {rate.rate.toFixed(2)}</IndexTable.Cell>
                    <IndexTable.Cell>
                      <InlineStack gap="200">
                        <Button onClick={() => handleEditClick(rate)}>Edit</Button>
                        <Button variant="tertiary" onClick={() => handleDelete(rate.id)}>Delete</Button>
                      </InlineStack>
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

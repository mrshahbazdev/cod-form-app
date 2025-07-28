import { json } from "@remix-run/node";
import { useLoaderData, useSubmit, Form, useLocation } from "@remix-run/react";
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
  Pagination,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import db from "../db.server";

const PAGE_SIZE = 10;

export async function loader({ request }) {
  const { session } = await authenticate.admin(request);
  const { shop } = session;

  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") || "1");
  const skip = (page - 1) * PAGE_SIZE;

  const [blockedIps, totalCount] = await Promise.all([
    db.blockedIp.findMany({
      where: { shop },
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      skip,
    }),
    db.blockedIp.count({ where: { shop } }),
  ]);

  const pageInfo = {
    hasNextPage: skip + PAGE_SIZE < totalCount,
    hasPreviousPage: page > 1,
  };

  return json({ blockedIps, pageInfo, totalCount });
}

export async function action({ request }) {
  const { session } = await authenticate.admin(request);
  const { shop } = session;
  const formData = await request.formData();
  const action = formData.get("_action");

  if (action === "add_ip") {
    const ipAddress = formData.get("ipAddress");
    if (ipAddress) {
      await db.blockedIp.upsert({
        where: { shop_ip: { shop, ipAddress } },
        update: {},
        create: { shop, ipAddress },
      });
    }
  } else if (action === "delete_ip") {
    const id = parseInt(formData.get("id"));
    await db.blockedIp.delete({ where: { id } });
  }

  return json({ success: true });
}

export default function IpBlockingPage() {
  const { blockedIps, pageInfo, totalCount } = useLoaderData();
  const submit = useSubmit();
  const location = useLocation();
  const currentPage = new URLSearchParams(location.search).get("page") || 1;

  const handleAddIp = (event) => {
    const formData = new FormData(event.currentTarget);
    submit(formData, { method: "post" });
    event.currentTarget.reset(); // Form ko reset karein
  };

  const handleDelete = (id) => {
    const formData = new FormData();
    formData.append("_action", "delete_ip");
    formData.append("id", id);
    submit(formData, { method: "post" });
  };

  const resourceName = { singular: 'blocked IP', plural: 'blocked IPs' };

  const rowMarkup = blockedIps.map(({ id, ipAddress, createdAt }, index) => (
    <IndexTable.Row id={id} key={id} position={index}>
      <IndexTable.Cell>{ipAddress}</IndexTable.Cell>
      <IndexTable.Cell>{new Date(createdAt).toLocaleString()}</IndexTable.Cell>
      <IndexTable.Cell>
        <Button variant="tertiary" onClick={() => handleDelete(id)}>Unblock</Button>
      </IndexTable.Cell>
    </IndexTable.Row>
  ));

  return (
    <Page>
      <ui-title-bar title="Manage Blocked IPs" />
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="500">
              <Text as="h2" variant="headingMd">Manually Block an IP Address</Text>
              <Form onSubmit={handleAddIp} method="post">
                <input type="hidden" name="_action" value="add_ip" />
                <TextField
                  label="IP Address"
                  name="ipAddress"
                  autoComplete="off"
                  placeholder="e.g., 192.168.1.1"
                  connectedRight={<Button submit>Block IP</Button>}
                />
              </Form>
            </BlockStack>
          </Card>
        </Layout.Section>
        <Layout.Section>
          <Card>
            <IndexTable
              resourceName={resourceName}
              itemCount={totalCount}
              headings={[{ title: 'IP Address' }, { title: 'Blocked At' }, { title: 'Action' }]}
              selectable={false}
            >
              {rowMarkup}
            </IndexTable>
            <div style={{ padding: '16px', display: 'flex', justifyContent: 'center' }}>
              <Pagination
                hasPrevious={pageInfo.hasPreviousPage}
                onPrevious={() => {
                  const prevPage = parseInt(currentPage) - 1;
                  submit({ page: prevPage }, { method: "get" });
                }}
                hasNext={pageInfo.hasNextPage}
                onNext={() => {
                  const nextPage = parseInt(currentPage) + 1;
                  submit({ page: nextPage }, { method: "get" });
                }}
              />
            </div>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

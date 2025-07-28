import {
  Page,
  Layout,
  Card,
  BlockStack,
  Text,
  List,
  Code,
  Button, // NAYA IMPORT
} from "@shopify/polaris";

const GsheetCode = `function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = JSON.parse(e.postData.contents);

    var timestamp = new Date();
    var orderId = data.orderId || 'N/A';
    var customerName = data.customer.name;
    var phone = data.customer.phone;
    var address = data.customer.address;
    var city = data.customer.city;
    var country = data.customer.country;
    var products = data.products.join('\\n');
    var totalAmount = data.total;

    sheet.appendRow([timestamp, orderId, customerName, phone, address, city, country, products, totalAmount]);

    return ContentService.createTextOutput(JSON.stringify({ "status": "success" })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ "status": "error", "message": error.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}`;

const sheetHeaders = "Timestamp,Order ID,Customer Name,Phone,Address,City,Country,Products,Total Amount";

export default function GoogleSheetsGuidePage() {
  return (
    <Page>
      <ui-title-bar title="Google Sheets Integration Guide" />
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="500">
              <Text as="h2" variant="headingMd">
                How to Connect Your Google Sheet
              </Text>
              <Text>
                Follow these simple steps to automatically export your COD orders to a Google Sheet.
              </Text>
              <List type="number">
                <List.Item>
                  Create a new Google Sheet by visiting{" "}
                  <a href="https://sheets.new" target="_blank" rel="noopener noreferrer">
                    sheets.new
                  </a>.
                </List.Item>
                <List.Item>
                  In the first row (Row 1) of your new sheet, copy and paste these exact column headers in this order:
                  <Card>
                    <BlockStack gap="200">
                      <Text as="p" fontWeight="bold">
                        <Code>Timestamp</Code> <Code>Order ID</Code> <Code>Customer Name</Code> <Code>Phone</Code> <Code>Address</Code> <Code>City</Code> <Code>Country</Code> <Code>Products</Code> <Code>Total Amount</Code>
                      </Text>
                      {/* NAYI TABDEELI: Copy button add kiya gaya hai */}
                      <Button onClick={() => navigator.clipboard.writeText(sheetHeaders)}>
                        Copy Headers
                      </Button>
                    </BlockStack>
                  </Card>
                </List.Item>
                <List.Item>
                  In the top menu, click on <strong>Extensions</strong> &gt; <strong>Apps Script</strong>.
                </List.Item>
                <List.Item>
                  Delete any existing code in the script editor and paste the following code:
                  <Card>
                    <BlockStack gap="200">
                      <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                        <code>{GsheetCode}</code>
                      </pre>
                      <Button onClick={() => navigator.clipboard.writeText(GsheetCode)}>
                        Copy Code
                      </Button>
                    </BlockStack>
                  </Card>
                </List.Item>
                <List.Item>
                  Save the script project. Then, click the <strong>Deploy</strong> button and select <strong>New deployment</strong>.
                </List.Item>
                <List.Item>
                  Click the gear icon (⚙️) next to "Select type" and choose <strong>Web app</strong>.
                </List.Item>
                <List.Item>
                  In the "Who has access" dropdown, select <strong>Anyone</strong>. This is very important.
                </List.Item>
                <List.Item>
                  Click the <strong>Deploy</strong> button. Google will ask for authorization. Click <strong>Authorize access</strong>, choose your Google account, click <strong>Advanced</strong>, and then <strong>Go to (unsafe)</strong>. Allow the permissions.
                </List.Item>
                <List.Item>
                  Copy the <strong>Web app URL</strong> provided.
                </List.Item>
                <List.Item>
                  Go back to our app's <strong>Settings</strong> page and paste this URL into the "Google Sheet Web App URL" field and click <strong>Save Settings</strong>.
                </List.Item>
              </List>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

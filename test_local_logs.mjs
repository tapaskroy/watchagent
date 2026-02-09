import { chromium } from 'playwright';

async function testLocalLogs() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const timestamp = Date.now();
  const email = `localtest_${timestamp}@example.com`;
  const username = `localtest_${timestamp}`;
  const password = 'TestPassword123';

  console.log('=== Testing Local with Error Logs ===');

  const allLogs = [];

  page.on('console', (msg) => {
    const text = msg.text();
    const type = msg.type();
    allLogs.push(`[${type}] ${text}`);

    if (text.includes('[use') || text.includes('[HomePage]')) {
      console.log(`[${type}] ${text}`);
    }
  });

  try {
    await page.goto('http://localhost:3001/register', { waitUntil: 'networkidle' });
    const inputs = await page.locator('input').all();
    await inputs[0].fill(username);
    await inputs[1].fill(email);
    await inputs[3].fill(password);
    await inputs[4].fill(password);

    console.log('\nSubmitting...\n');
    await page.click('button[type="submit"]');
    await page.waitForURL('http://localhost:3001/', { timeout: 10000 });

    console.log('Waiting 5 seconds...\n');
    await page.waitForTimeout(5000);

    console.log('\n=== ALL LOGS ===');
    allLogs.forEach(log => console.log(log));

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
}

testLocalLogs();

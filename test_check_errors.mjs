import { chromium } from 'playwright';

async function checkErrors() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const timestamp = Date.now();
  const email = `errors_${timestamp}@example.com`;
  const username = `errors_${timestamp}`;
  const password = 'TestPassword123';

  const errors = [];
  const consoleLogs = [];

  page.on('console', (msg) => {
    const text = msg.text();
    consoleLogs.push(`[${msg.type()}] ${text}`);
  });

  page.on('pageerror', (error) => {
    errors.push(error.message);
  });

  try {
    await page.goto('https://watchagent.tapaskroy.me/register', { waitUntil: 'networkidle' });
    const inputs = await page.locator('input').all();
    await inputs[0].fill(username);
    await inputs[1].fill(email);
    await inputs[3].fill(password);
    await inputs[4].fill(password);
    await page.click('button[type="submit"]');
    await page.waitForURL('https://watchagent.tapaskroy.me/', { timeout: 10000 });

    // Wait a bit for page to fully load and errors to appear
    await page.waitForTimeout(10000);

    console.log('=== PAGE ERRORS ===');
    if (errors.length > 0) {
      errors.forEach(err => console.log(err));
    } else {
      console.log('No page errors');
    }

    console.log('\n=== CONSOLE LOGS (last 20) ===');
    consoleLogs.slice(-20).forEach(log => console.log(log));

  } catch (error) {
    console.error('Test error:', error.message);
  } finally {
    await browser.close();
  }
}

checkErrors();

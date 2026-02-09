import { chromium } from 'playwright';

async function testSimple() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const timestamp = Date.now();
  const email = `simple_${timestamp}@example.com`;
  const username = `simple_${timestamp}`;
  const password = 'TestPassword123';

  console.log(`Testing with user: ${username}`);

  try {
    // Register
    await page.goto('https://watchagent.tapaskroy.me/register', { waitUntil: 'networkidle' });
    const inputs = await page.locator('input').all();
    await inputs[0].fill(username);
    await inputs[1].fill(email);
    await inputs[3].fill(password);
    await inputs[4].fill(password);
    await page.click('button[type="submit"]');

    // Wait for redirect
    await page.waitForURL('https://watchagent.tapaskroy.me/', { timeout: 10000 });
    console.log('Redirected to home page');

    // Wait a bit for page to load
    await page.waitForTimeout(5000);

    // Take screenshot
    await page.screenshot({ path: '/tmp/after_registration.png', fullPage: true });
    console.log('Screenshot saved to /tmp/after_registration.png');

    // Get page content
    const content = await page.content();
    console.log('\nPage includes "WatchAgent":', content.includes('WatchAgent'));
    console.log('Page includes "onboarding":', content.includes('onboarding') || content.includes('Onboarding'));

    // Check for any visible text
    const bodyText = await page.locator('body').textContent();
    console.log('\nFirst 500 chars of body text:');
    console.log(bodyText?.substring(0, 500));

  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ path: '/tmp/error.png' });
  } finally {
    await browser.close();
  }
}

testSimple();

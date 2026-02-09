import { chromium } from 'playwright';

async function testWithConsole() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const timestamp = Date.now();
  const email = `consolelog_${timestamp}@example.com`;
  const username = `consolelog_${timestamp}`;
  const password = 'TestPassword123';

  console.log('=== Testing with Browser Console Logs ===');
  console.log(`User: ${username}\n`);

  // Listen to console messages from the page
  page.on('console', (msg) => {
    const type = msg.type();
    const text = msg.text();
    if (text.includes('[HomePage]') || text.includes('Conversation state') || text.includes('enabled')) {
      console.log(`[BROWSER ${type.toUpperCase()}] ${text}`);
    }
  });

  try {
    await page.goto('https://watchagent.tapaskroy.me/register', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    const inputs = await page.locator('input').all();
    await inputs[0].fill(username);
    await inputs[1].fill(email);
    await inputs[3].fill(password);
    await inputs[4].fill(password);

    console.log('Submitting form...\n');
    const submitStart = Date.now();

    await page.click('button[type="submit"]');
    await page.waitForURL('https://watchagent.tapaskroy.me/', { timeout: 10000 });

    console.log('Waiting for onboarding questions...\n');

    await page.waitForSelector('text=/What are|Can you tell me|Would you mind/', {
      timeout: 30000
    });

    const totalTime = Date.now() - submitStart;

    console.log('');
    console.log('===========================================');
    console.log(`Total time: ${totalTime}ms (${(totalTime / 1000).toFixed(2)}s)`);
    console.log('===========================================');

  } catch (error) {
    console.error('\nError:', error.message);
  } finally {
    await browser.close();
  }
}

testWithConsole();

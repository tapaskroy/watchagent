import { chromium } from 'playwright';

async function testWithLogging() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const timestamp = Date.now();
  const email = `testlog_${timestamp}@example.com`;
  const username = `testlog_${timestamp}`;
  const password = 'TestPassword123';

  console.log('=== Testing with API Call Logging ===');
  console.log(`User: ${username}`);
  console.log('');

  try {
    // Navigate to registration
    console.log('Step 1: Navigating to registration...');
    await page.goto('https://watchagent.tapaskroy.me/register', {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    console.log('  ✓ Page loaded\n');

    // Fill form
    console.log('Step 2: Filling form...');
    const inputs = await page.locator('input').all();
    await inputs[0].fill(username);
    await inputs[1].fill(email);
    await inputs[3].fill(password);
    await inputs[4].fill(password);
    console.log('  ✓ Form filled\n');

    // Track API calls with timestamps
    const apiCalls = [];
    let submitStart = 0;

    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('/api/v1/') && submitStart > 0) {
        const timing = Date.now() - submitStart;
        const endpoint = url.split('/api/v1/')[1];
        apiCalls.push({ endpoint, status: response.status(), timing });
        console.log(`  [+${timing}ms] ${endpoint} → ${response.status()}`);
      }
    });

    // Submit
    console.log('Step 3: Submitting and tracking API calls...\n');
    submitStart = Date.now();

    await page.click('button[type="submit"]');
    await page.waitForURL('https://watchagent.tapaskroy.me/', { timeout: 10000 });

    const redirectTime = Date.now() - submitStart;
    console.log(`\n  [+${redirectTime}ms] Redirected to home page`);
    console.log('  Waiting for onboarding questions...\n');

    await page.waitForSelector('text=/What are|Can you tell me|Would you mind/', {
      timeout: 30000
    });

    const totalTime = Date.now() - submitStart;

    console.log('');
    console.log('===========================================');
    console.log('=== RESULTS ===');
    console.log('===========================================');
    console.log(`Total time: ${totalTime}ms (${(totalTime / 1000).toFixed(2)}s)`);
    console.log('');
    console.log('API Call Summary:');
    apiCalls.forEach((call, i) => {
      console.log(`  ${i + 1}. [+${call.timing}ms] ${call.endpoint}`);
    });
    console.log('===========================================');

  } catch (error) {
    console.error('\nError:', error.message);
  } finally {
    await browser.close();
  }
}

testWithLogging();

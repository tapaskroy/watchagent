import { chromium } from 'playwright';

async function testLocalOnboarding() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Generate random credentials
  const timestamp = Date.now();
  const email = `localtest_${timestamp}@example.com`;
  const username = `localtest_${timestamp}`;
  const password = 'TestPassword123';

  console.log('=== Testing Local Fix ===');
  console.log(`User: ${username}`);
  console.log('');

  try {
    // Navigate to registration page
    console.log('Step 1: Navigating to registration page...');
    await page.goto('http://localhost:3001/register', {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    console.log('  ✓ Page loaded');

    // Fill registration form
    console.log('Step 2: Filling registration form...');
    const inputs = await page.locator('input').all();
    await inputs[0].fill(username);
    await inputs[1].fill(email);
    await inputs[3].fill(password);
    await inputs[4].fill(password);
    console.log('  ✓ Form filled');

    // Submit and measure time
    console.log('Step 3: Submitting...');
    const submitStart = Date.now();

    await page.click('button[type="submit"]');
    await page.waitForURL('http://localhost:3001/', { timeout: 10000 });
    console.log('  ✓ Redirected to home');

    await page.waitForSelector('text=/What are|Can you tell me|Would you mind/', {
      timeout: 30000
    });

    const submitEnd = Date.now();
    const totalLatency = submitEnd - submitStart;

    console.log('');
    console.log('===========================================');
    console.log(`Time to onboarding questions: ${totalLatency}ms (${(totalLatency / 1000).toFixed(2)}s)`);
    console.log('===========================================');

    if (totalLatency < 8000) {
      console.log('✅ FIX WORKS - Latency is good!');
    } else {
      console.log('❌ STILL HAS ISSUE - Latency too high');
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
}

testLocalOnboarding();

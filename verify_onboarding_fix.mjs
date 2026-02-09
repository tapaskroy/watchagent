import { chromium } from 'playwright';

async function verifyOnboardingFix() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Generate random credentials
  const timestamp = Date.now();
  const email = `verify_${timestamp}@example.com`;
  const username = `verify_${timestamp}`;
  const password = 'VerifyPassword123';

  console.log('=== Verifying Production Onboarding Fix ===');
  console.log('URL: https://watchagent.tapaskroy.me');
  console.log(`User: ${username}`);
  console.log('');

  try {
    // Navigate to registration page
    console.log('Step 1: Navigating to registration page...');
    await page.goto('https://watchagent.tapaskroy.me/register', {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    console.log('  ✓ Page loaded');
    console.log('');

    // Fill registration form
    console.log('Step 2: Filling registration form...');
    const inputs = await page.locator('input').all();
    await inputs[0].fill(username);    // Username
    await inputs[1].fill(email);       // Email
    // Skip inputs[2] - optional full name
    await inputs[3].fill(password);    // Password
    await inputs[4].fill(password);    // Confirm Password
    console.log('  ✓ Form filled');
    console.log('');

    // Submit and measure time to onboarding questions
    console.log('Step 3: Submitting registration...');
    const submitStart = Date.now();

    await page.click('button[type="submit"]');
    await page.waitForURL('https://watchagent.tapaskroy.me/', { timeout: 10000 });

    console.log('  ✓ Redirected to home page');
    console.log('  - Waiting for onboarding questions...');

    await page.waitForSelector('text=/What are|Can you tell me|Would you mind/', {
      timeout: 30000
    });

    const submitEnd = Date.now();
    const totalLatency = submitEnd - submitStart;

    console.log('');
    console.log('===========================================');
    console.log('=== VERIFICATION RESULTS ===');
    console.log('===========================================');
    console.log(`Time to onboarding questions: ${totalLatency}ms (${(totalLatency / 1000).toFixed(2)}s)`);
    console.log('');
    console.log('Expected: ~4 seconds (after fix)');
    console.log('Previous: ~19 seconds (before fix)');

    if (totalLatency < 8000) {
      console.log('');
      console.log('✅ FIX VERIFIED - Latency improved as expected!');
    } else if (totalLatency < 15000) {
      console.log('');
      console.log('⚠️  PARTIAL - Better than before but not optimal');
    } else {
      console.log('');
      console.log('❌ FIX NOT WORKING - Still experiencing high latency');
    }
    console.log('===========================================');

  } catch (error) {
    console.error('Error during verification:', error.message);
    await page.screenshot({ path: '/tmp/verification_error.png' });
    console.log('Error screenshot saved to: /tmp/verification_error.png');
  } finally {
    await browser.close();
  }
}

verifyOnboardingFix();

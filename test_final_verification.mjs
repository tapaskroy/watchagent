import { chromium } from 'playwright';

async function verifyFinalFix() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const timestamp = Date.now();
  const email = `finaltest_${timestamp}@example.com`;
  const username = `finaltest_${timestamp}`;
  const password = 'TestPassword123';

  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║   FINAL VERIFICATION - Onboarding Latency Fix         ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log(`\nUser: ${username}`);
  console.log('URL: https://watchagent.tapaskroy.me\n');

  const apiCalls = [];
  let submitStart = 0;

  // Track API calls
  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('/api/v1/') && submitStart > 0) {
      const timing = Date.now() - submitStart;
      const endpoint = url.split('/api/v1/')[1];
      apiCalls.push({ endpoint, status: response.status(), timing });
    }
  });

  try {
    // Register
    await page.goto('https://watchagent.tapaskroy.me/register', { waitUntil: 'networkidle' });
    const inputs = await page.locator('input').all();
    await inputs[0].fill(username);
    await inputs[1].fill(email);
    await inputs[3].fill(password);
    await inputs[4].fill(password);

    console.log('Submitting registration...\n');
    submitStart = Date.now();

    await page.click('button[type="submit"]');
    await page.waitForURL('https://watchagent.tapaskroy.me/', { timeout: 10000 });

    console.log('Waiting for onboarding questions...\n');

    await page.waitForSelector('text=/What are|Can you tell me|Would you mind/', {
      timeout: 30000
    });

    const totalTime = Date.now() - submitStart;

    console.log('═══════════════════════════════════════════════════════');
    console.log('                      RESULTS                          ');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`\n⏱️  Total Time: ${totalTime}ms (${(totalTime / 1000).toFixed(2)}s)\n`);

    console.log('API Call Timeline:');
    apiCalls.forEach((call, i) => {
      const icon = call.endpoint.includes('recommendations') ? '🔴' : '✓';
      console.log(`  ${icon} [+${call.timing}ms] ${call.endpoint}`);
    });

    console.log('\n═══════════════════════════════════════════════════════');

    const recommendationsCalled = apiCalls.some(c => c.endpoint.includes('recommendations'));

    if (totalTime < 8000 && !recommendationsCalled) {
      console.log('\n✅ SUCCESS! Fix is working correctly:');
      console.log('   - Latency under 8 seconds');
      console.log('   - No recommendations API call during onboarding');
    } else if (totalTime < 8000 && recommendationsCalled) {
      console.log('\n⚠️  PARTIAL SUCCESS:');
      console.log('   - Latency is good (under 8s)');
      console.log('   - But recommendations was still called (unexpected)');
    } else if (!recommendationsCalled) {
      console.log('\n⚠️  PARTIAL SUCCESS:');
      console.log('   - Recommendations not called (good!)');
      console.log(`   - But latency is high: ${totalTime}ms`);
    } else {
      console.log('\n❌ FIX NOT WORKING:');
      console.log(`   - Latency still high: ${totalTime}ms`);
      console.log('   - Recommendations API was called during onboarding');
    }

    console.log('\n═══════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

verifyFinalFix();

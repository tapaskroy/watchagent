import { chromium } from 'playwright';

async function testScreenshotTimeline() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const timestamp = Date.now();
  const email = `timeline_${timestamp}@example.com`;
  const username = `timeline_${timestamp}`;
  const password = 'TestPassword123';

  console.log('Testing screenshot timeline...\n');

  try {
    await page.goto('https://watchagent.tapaskroy.me/register', { waitUntil: 'networkidle' });
    const inputs = await page.locator('input').all();
    await inputs[0].fill(username);
    await inputs[1].fill(email);
    await inputs[3].fill(password);
    await inputs[4].fill(password);

    const submitStart = Date.now();
    await page.click('button[type="submit"]');
    await page.waitForURL('https://watchagent.tapaskroy.me/', { timeout: 10000 });

    console.log('Taking screenshots at intervals...\n');

    // Screenshot at 2s after redirect
    await page.waitForTimeout(2000);
    await page.screenshot({ path: '/tmp/onboarding_2s.png', fullPage: true });
    console.log('[+2s] Screenshot saved');

    // Screenshot at 7s (after init-onboarding should complete)
    await page.waitForTimeout(5000);
    await page.screenshot({ path: '/tmp/onboarding_7s.png', fullPage: true });
    console.log('[+7s] Screenshot saved');

    // Screenshot at 12s
    await page.waitForTimeout(5000);
    await page.screenshot({ path: '/tmp/onboarding_12s.png', fullPage: true });
    console.log('[+12s] Screenshot saved');

    // Screenshot at 20s
    await page.waitForTimeout(8000);
    await page.screenshot({ path: '/tmp/onboarding_20s.png', fullPage: true });
    const totalTime = Date.now() - submitStart;
    console.log(`[+${totalTime}ms] Screenshot saved`);

    console.log('\nScreenshots saved to:');
    console.log('  /tmp/onboarding_2s.png');
    console.log('  /tmp/onboarding_7s.png');
    console.log('  /tmp/onboarding_12s.png');
    console.log('  /tmp/onboarding_20s.png');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
}

testScreenshotTimeline();

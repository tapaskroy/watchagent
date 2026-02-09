import { chromium } from 'playwright';

async function testErrorLogs() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const timestamp = Date.now();
  const email = `errorlog_${timestamp}@example.com`;
  const username = `errorlog_${timestamp}`;
  const password = 'TestPassword123';

  console.log('=== Capturing Console Error Logs ===');
  console.log(`User: ${username}\n`);

  const errorLogs = [];

  // Capture ALL console messages, especially errors
  page.on('console', (msg) => {
    const text = msg.text();
    const type = msg.type();

    // Store all error logs
    if (type === 'error') {
      errorLogs.push(text);
      console.log(`[ERROR] ${text}`);
    }

    // Also log any message containing our hooks
    if (text.includes('[useRecommendations]') || text.includes('[useChat]') || text.includes('[HomePage]')) {
      console.log(`[${type.toUpperCase()}] ${text}`);
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

    console.log('\nSubmitting registration...\n');
    await page.click('button[type="submit"]');
    await page.waitForURL('https://watchagent.tapaskroy.me/', { timeout: 10000 });

    console.log('Waiting 15 seconds to capture all logs...\n');
    await page.waitForTimeout(15000);

    console.log('\n=== SUMMARY ===');
    console.log(`Total error logs captured: ${errorLogs.length}`);

    if (errorLogs.length > 0) {
      console.log('\nAll error logs:');
      errorLogs.forEach((log, i) => {
        console.log(`${i + 1}. ${log}`);
      });
    }

    // Take screenshot
    await page.screenshot({ path: '/tmp/error_log_test.png', fullPage: true });
    console.log('\nScreenshot saved to /tmp/error_log_test.png');

  } catch (error) {
    console.error('\nTest error:', error.message);
  } finally {
    await browser.close();
  }
}

testErrorLogs();

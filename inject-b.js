const { chromium } = require('/Users/russellbatchelor/.npm/_npx/e41f203b7505f1fb/node_modules/playwright');
const fs = require('fs');

const cvJson = JSON.parse(fs.readFileSync('/Users/russellbatchelor/projects/Russell Batchelor CV/archetype-B-cv.json', 'utf8'));
const baseUrl = 'http://192.168.0.178:3000';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Go to login page
  await page.goto(baseUrl + '/auth/login', { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(2000);

  // Try to login
  await page.fill('input[name="email"]', 'russell.batchelor@gmail.com');
  await page.fill('input[name="password"]', 'Test@Pass123!');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(5000);

  console.log('URL after login:', page.url());
  
  // Check session
  const session = await page.evaluate(async () => {
    const res = await fetch('/api/auth/get-session');
    const data = await res.json();
    return data;
  });
  console.log('Session:', JSON.stringify(session));
  
  // Get cookies
  const cookies = await context.cookies();
  console.log('Cookies:', cookies.map(c => ({name: c.name, value: c.value.substring(0,20)+'...'}) ));
  
  // Create resume
  if (session && session.user) {
    console.log('Creating resume...');
    const result = await page.evaluate(async (json) => {
      const res = await fetch('/api/rpc/resume/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Russell Batchelor - Senior Infra PM (Archetype B)',
          data: json
        })
      });
      return await res.json();
    }, cvJson);
    console.log('Create result:', JSON.stringify(result, null, 2));
  } else {
    console.log('Not logged in. Trying register...');
    await page.goto(baseUrl + '/auth/register', { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(2000);
    
    await page.fill('input[name="name"]', 'Russell Batchelor');
    await page.fill('input[name="username"]', 'russellbatchelor');
    await page.fill('input[name="email"]', 'russell.batchelor@gmail.com');
    await page.fill('input[name="password"]', 'StrongP@ss1');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(5000);
    
    console.log('URL after register attempt:', page.url());
    
    // Try login with new password
    await page.goto(baseUrl + '/auth/login', { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(2000);
    
    await page.fill('input[name="email"]', 'russell.batchelor@gmail.com');
    await page.fill('input[name="password"]', 'StrongP@ss1');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(5000);
    
    console.log('URL after 2nd login attempt:', page.url());
    
    // Try creating with cookie-based auth
    console.log('Trying to create resume via fetch...');
    const result2 = await page.evaluate(async (json) => {
      const res = await fetch('/api/rpc/resume/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Russell Batchelor - Senior Infra PM (Archetype B)',
          data: json
        })
      });
      const text = await res.text();
      try { return JSON.parse(text); } catch { return { status: res.status, text: text.substring(0, 200) }; }
    }, cvJson);
    console.log('Create result:', JSON.stringify(result2, null, 2));
  }
  
  await browser.close();
})();

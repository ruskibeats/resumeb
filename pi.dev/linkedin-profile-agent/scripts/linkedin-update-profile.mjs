#!/usr/bin/env node
import { chromium } from 'playwright';

const HEADLINE = process.env.LINKEDIN_HEADLINE ?? 'cool programme manager';
const ABOUT = process.env.LINKEDIN_ABOUT ?? 'coolest bloke on earth';
const PROFILE_URL = process.env.LINKEDIN_PROFILE_URL ?? 'https://www.linkedin.com/in/russellbatchelor/';
const USER_DATA_DIR = process.env.LINKEDIN_USER_DATA_DIR ?? '.linkedin-profile-session';
const CHROME_CHANNEL = process.env.LINKEDIN_CHROME_CHANNEL ?? 'chrome';
const SETUP_MODE = process.argv.includes('--setup');

const ROLE_CONFIGS = [
  { key: 'COLLECTIVE_IP', editUrl: process.env.LINKEDIN_EDIT_URL_COLLECTIVE_IP ?? 'https://www.linkedin.com/in/russellbatchelor/details/experience/edit/forms/2799775038/' },
  { key: 'SOLUTIONS_THROUGH_KNOWLEDGE', editUrl: process.env.LINKEDIN_EDIT_URL_SOLUTIONS_THROUGH_KNOWLEDGE ?? 'https://www.linkedin.com/in/russellbatchelor/details/experience/edit/forms/2855928488/' },
  { key: 'HILOKA_LTD', editUrl: process.env.LINKEDIN_EDIT_URL_HILOKA_LTD ?? 'https://www.linkedin.com/in/russellbatchelor/details/experience/edit/forms/2799814595/' },
  { key: 'PARK_PLACE_TECHNOLOGIES', editUrl: process.env.LINKEDIN_EDIT_URL_PARK_PLACE_TECHNOLOGIES ?? 'https://www.linkedin.com/in/russellbatchelor/details/experience/edit/forms/2799863845/' },
  { key: 'CENTRICSIT', editUrl: process.env.LINKEDIN_EDIT_URL_CENTRICSIT ?? 'https://www.linkedin.com/in/russellbatchelor/details/experience/edit/forms/1535819118/' },
  { key: 'SITEHANDS', editUrl: process.env.LINKEDIN_EDIT_URL_SITEHANDS ?? 'https://www.linkedin.com/in/russellbatchelor/details/experience/edit/forms/1590025360/' },
  { key: 'RAINMAKER_SOLUTIONS', editUrl: process.env.LINKEDIN_EDIT_URL_RAINMAKER_SOLUTIONS ?? 'https://www.linkedin.com/in/russellbatchelor/details/experience/edit/forms/562286094/' },
  { key: 'LONDON_BOROUGH_OF_LAMBETH', editUrl: process.env.LINKEDIN_EDIT_URL_LONDON_BOROUGH_OF_LAMBETH ?? 'https://www.linkedin.com/in/russellbatchelor/details/experience/edit/forms/35391862/' },
  { key: 'CHARLES_STANLEY', editUrl: process.env.LINKEDIN_EDIT_URL_CHARLES_STANLEY ?? 'https://www.linkedin.com/in/russellbatchelor/details/experience/edit/forms/23295094/' },
  { key: 'COMUNICA', editUrl: process.env.LINKEDIN_EDIT_URL_COMUNICA ?? 'https://www.linkedin.com/in/russellbatchelor/details/experience/edit/forms/22228402/' },
  { key: 'IPITOMI', editUrl: process.env.LINKEDIN_EDIT_URL_IPITOMI },
  { key: 'VIRGIN_MEDIA', editUrl: process.env.LINKEDIN_EDIT_URL_VIRGIN_MEDIA },
  { key: 'WHITTINGTON_INSURANCE_MARKETS', editUrl: process.env.LINKEDIN_EDIT_URL_WHITTINGTON_INSURANCE_MARKETS },
];

async function gotoWithRetry(page, url, attempts = 5) {
  let lastError;
  for (let i = 1; i <= attempts; i++) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      return;
    } catch (err) {
      lastError = err;
      await page.waitForTimeout(1200 * i);
    }
  }
  throw lastError;
}

async function ensureLoggedIn(page) {
  await gotoWithRetry(page, 'https://www.linkedin.com/feed/');
  const loggedIn = page.url().includes('/feed') || page.url().includes('/in/');
  if (!loggedIn) throw new Error('Not logged into LinkedIn in this session. Run setup/login first.');
}

async function editHeadline(page, text) {
  await gotoWithRetry(page, 'https://www.linkedin.com/in/russellbatchelor/edit/intro/');
  const editor = page.getByTestId('ui-core-tiptap-text-editor-wrapper').getByRole('textbox').first();
  await editor.click();
  await editor.fill(text);
  await page.getByRole('button', { name: 'Save' }).click();
}

async function editAbout(page, text) {
  try {
    await gotoWithRetry(page, `${PROFILE_URL.replace(/\/$/, '')}/edit/forms/summary/new/`);
  } catch {
    await gotoWithRetry(page, PROFILE_URL);
    await page.getByRole('link', { name: 'Edit about' }).click();
  }
  const editor = page.getByTestId('ui-core-tiptap-text-editor-wrapper').getByRole('textbox').first();
  await editor.click();
  await editor.fill(text);
  await page.getByRole('button', { name: 'Save' }).click();
}

async function editRole(page, { editUrl, title, description, key }) {
  if (!editUrl || (!title && !description)) return;

  await gotoWithRetry(page, editUrl);

  if (title) {
    let titleBox;
    try {
      titleBox = page.getByRole('textbox', { name: 'Ex: Retail Sales Manager', exact: true }).first();
      await titleBox.waitFor({ state: 'attached', timeout: 10000 });
    } catch {
      try {
        titleBox = page.getByTestId('ui-core-tiptap-text-editor-wrapper').getByRole('textbox').first();
        await titleBox.waitFor({ state: 'attached', timeout: 5000 });
      } catch {
        throw new Error(`Could not find Title textbox for ${key}.`);
      }
    }
    await titleBox.fill('');
    await titleBox.fill(title);
  }

  if (description) {
    const descCandidates = [
      page.getByRole('textbox', { name: 'Description, maximum 2,000 characters' }).first(),
      page.locator('textarea[aria-label*="Description" i], textarea').first(),
    ];

    let descBox;
    for (const candidate of descCandidates) {
      if (await candidate.isVisible().catch(() => false)) {
        descBox = candidate;
        break;
      }
    }
    if (!descBox) throw new Error(`Could not find Description textbox for ${key}.`);
    await descBox.fill('');
    await descBox.fill(description);
  }

  await page.getByRole('button', { name: 'Save' }).first().click();
  const skipBtn = page.getByRole('button', { name: 'Skip' }).first();
  if (await skipBtn.isVisible().catch(() => false)) await skipBtn.click();
}

async function main() {
  const launchOptions = {
    channel: CHROME_CHANNEL,
    headless: false,
    viewport: { width: 1400, height: 900 },
  };

  const context = await chromium.launchPersistentContext(USER_DATA_DIR, launchOptions);
  const page = context.pages()[0] ?? (await context.newPage());

  try {
    if (SETUP_MODE) {
      console.log('Setup mode — log into LinkedIn in the opened browser window.');
      console.log('Press Ctrl+C once logged in. Session will be saved to:', USER_DATA_DIR);
      await page.goto('https://www.linkedin.com/', { waitUntil: 'domcontentloaded' });
      return;
    }

    await ensureLoggedIn(page);

    await editHeadline(page, HEADLINE);
    await editAbout(page, ABOUT);

    for (const role of ROLE_CONFIGS) {
      await editRole(page, {
        key: role.key,
        editUrl: role.editUrl,
        title: process.env[`LINKEDIN_TITLE_${role.key}`],
        description: process.env[`LINKEDIN_DESC_${role.key}`],
      });
    }

    try { await gotoWithRetry(page, PROFILE_URL); } catch {}
    console.log('Done: headline + about + configured role updates applied.');
  } finally {
    // keep browser open for verification
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

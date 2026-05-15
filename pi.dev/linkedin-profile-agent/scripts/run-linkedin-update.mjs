#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const configPath = process.argv[2] || 'data/linkedin-profile.config.json';
const resolved = path.resolve(configPath);

if (!fs.existsSync(resolved)) {
  console.error(`Config not found: ${resolved}`);
  console.error('Start from: data/linkedin-profile.config.example.json');
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(resolved, 'utf8'));
const env = { ...process.env };

if (config.headline) env.LINKEDIN_HEADLINE = config.headline;
if (config.about) env.LINKEDIN_ABOUT = config.about;
if (config.profileUrl) env.LINKEDIN_PROFILE_URL = config.profileUrl;
if (config.userDataDir) env.LINKEDIN_USER_DATA_DIR = config.userDataDir;
if (config.chromeChannel) env.LINKEDIN_CHROME_CHANNEL = config.chromeChannel;

for (const [key, value] of Object.entries(config.roles || {})) {
  if (value?.title) env[`LINKEDIN_TITLE_${key}`] = value.title;
  if (value?.description) env[`LINKEDIN_DESC_${key}`] = value.description;
  if (value?.editUrl) env[`LINKEDIN_EDIT_URL_${key}`] = value.editUrl;
}

const child = spawn('node', ['scripts/linkedin-update-profile.mjs'], {
  stdio: 'inherit',
  env,
});

child.on('exit', (code) => process.exit(code ?? 1));

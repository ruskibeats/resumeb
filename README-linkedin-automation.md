# LinkedIn Profile Automation

Repeatable Playwright-based LinkedIn profile updater.

## Files
- `scripts/linkedin-update-profile.mjs` - browser automation engine
- `scripts/run-linkedin-update.mjs` - config-driven runner
- `data/linkedin-profile.config.example.json` - example config

## Setup
```bash
npm install
npm run linkedin:setup
```

Log into LinkedIn in the opened browser once. Session is stored in `.linkedin-profile-session`.

## Create your config
```bash
cp data/linkedin-profile.config.example.json data/linkedin-profile.config.json
```

Edit `data/linkedin-profile.config.json` with the headline, about text, and role title/description updates you want.

## Run
```bash
npm run linkedin:update
```

Or use a different config:
```bash
node scripts/run-linkedin-update.mjs path/to/config.json
```

## Supported role keys
- `COLLECTIVE_IP`
- `SOLUTIONS_THROUGH_KNOWLEDGE`
- `HILOKA_LTD`
- `PARK_PLACE_TECHNOLOGIES`
- `CENTRICSIT`
- `SITEHANDS`
- `RAINMAKER_SOLUTIONS`
- `LONDON_BOROUGH_OF_LAMBETH`
- `CHARLES_STANLEY`
- `COMUNICA`
- `IPITOMI`
- `VIRGIN_MEDIA`
- `WHITTINGTON_INSURANCE_MARKETS`

## Notes
- Only roles with a non-empty `title` or `description` are updated.
- Each role can also override its `editUrl` in config if LinkedIn changes routes.
- After save, the automation clicks `Skip` if LinkedIn shows the next-action prompt.

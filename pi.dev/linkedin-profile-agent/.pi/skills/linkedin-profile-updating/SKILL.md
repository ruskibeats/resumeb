# Local Skill: LinkedIn Profile Updating

This local skill wraps the LinkedIn profile automation workspace.

## Use when
- updating Russell Batchelor's LinkedIn headline
- updating About text
- updating role titles or descriptions
- validating or repairing LinkedIn Playwright automation

## Read first
- `../../README.md`
- `../../SKILL.md`
- `../../docs/WORKFLOW.md`
- `../../docs/MCP-SELECTORS.md`
- `../../data/linkedin-profile.config.json`

## Standard commands
```bash
npm install
npm run setup
npm run update
node scripts/run-linkedin-update.mjs data/linkedin-profile.config.json
```

## Preferred repair flow
If the standalone updater fails:
1. open the role edit page with MCP
2. snapshot the page
3. confirm the title/description selector
4. patch script or config
5. rerun the updater

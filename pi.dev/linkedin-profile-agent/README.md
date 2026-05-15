# LinkedIn Profile Agent Workspace

Repeatable LinkedIn profile editing workspace for Russell Batchelor's profile. This project enables automated updates to your LinkedIn profile using Playwright, designed to handle persistent sessions and configuration-driven changes.

## What this folder contains
- `scripts/linkedin-update-profile.mjs` — The core Playwright automation engine. This script directly interacts with LinkedIn.
- `scripts/run-linkedin-update.mjs` — A wrapper script that uses a configuration file (`data/linkedin-profile.config.json` by default) to drive the `linkedin-update-profile.mjs` script.
- `data/linkedin-profile.config.json` — The active configuration file for your LinkedIn profile updates.
- `data/linkedin-profile.config.example.json` — An example template configuration file to guide your setup.
- `docs/` — Directory containing operational notes, selector details, and workflow documentation.
- `.pi/agents/` — Local agent definition for this workspace, allowing an AI agent (like myself) to understand and interact with this project.
- `.pi/skills/` — Local skill definition for this workspace, enhancing AI agent capabilities.
- `.linkedin-profile-session/` — This directory stores the persistent Playwright browser session after successful setup. **Crucially, this helps avoid repeated logins and the "browser in use" errors.**

## Install
First, install the necessary Node.js dependencies:
```bash
npm install
```

## One-time login/session setup (`npm run setup`)
This step is critical for establishing a persistent session and preventing repeated login prompts or multi-instance browser errors.

```bash
npm run setup
```

This command launches Chrome via Playwright in a persistent context. You will need to **manually log into LinkedIn once** in the opened browser window. After successful login, the session data is stored in the `.linkedin-profile-session/` directory.

**Important**: Ensure all other instances of Google Chrome (or any browser that might be using your primary Chrome profile) are closed before running `npm run setup`. If you encounter a `ProcessSingleton` error, it means Chrome is already locking the profile.

## Run updates from config (`npm run update`)
After the one-time setup, you can run updates to your LinkedIn profile based on the `data/linkedin-profile.config.json` file.

```bash
npm run update
```

## Use a different configuration file
If you want to use a different configuration file than the default `data/linkedin-profile.config.json`:

```bash
node scripts/run-linkedin-update.mjs path/to/your/custom-config.json
```

## How updates work
1.  **Launches Chrome** using the saved persistent session in `.linkedin-profile-session/`.
2.  **Updates Headline and About sections** if defined in the configuration.
3.  **Iterates through configured Experience roles**.
4.  For each role, it attempts to navigate to the **direct edit URL**.
5.  Updates the **job title** and/or **description** as specified in the config.
6.  Clicks the **`Save` button**.
7.  If LinkedIn displays a next-action prompt (e.g., "Notify network?"), the script will attempt to click **`Skip`**.

## Supported selectors
The script relies on specific selectors to interact with LinkedIn's UI. These are documented in `docs/` but include:
-   **Title textbox**: Identified by placeholder text like `Ex: Retail Sales Manager`
-   **Description textbox**: Identified by placeholder text like `Description, maximum 2,000 characters`
-   **Save button**: Identified by the text `Save`
-   **Post-save prompt**: Identified by the text `Skip`

## Notes
-   **Direct edit URLs** are highly recommended for reliability. Discovering edit links dynamically can be fragile due to LinkedIn's dynamic UI.
-   **Playwright MCP Integration**: This setup leverages Multi-Context Playwright (MCP) concepts to manage persistent browser sessions. This is why the `.linkedin-profile-session/` directory is crucial for avoiding constant re-authentication and browser lock issues. When standalone selectors might drift, MCP-assisted interaction provides a more robust path.
-   You can leave `editUrl` blank in your config initially. After manually editing a role once, you can capture the direct edit URL from your browser's address bar and add it to your configuration for future automated updates.

## Quick test example
You can override specific configuration fields via environment variables for quick tests:

```bash
LINKEDIN_TITLE_CHARLES_STANLEY="Project Manager" npm run update
```

## AI Agent Interaction & Troubleshooting

As an AI agent, I interact with this project using the following tools and skills:

*   **`bash` tool**: Used to execute all `npm` and `node` commands, as well as file system operations like `ls` and `cat`. This is my primary way of running the automation script.
*   **`read` tool**: Used to inspect files like `package.json`, `README.md`, and configuration files to understand the project structure and settings.
*   **`memory_search` and `validated approaches`**: I rely on past memories and validated approaches (like the one for `linkedin-automation`) to understand the intended workflow, common issues, and solutions. This helps me recognize the `ProcessSingleton` error as a recurring problem and apply the documented solution (using the `pi.dev/linkedin-profile-agent` structure).

### Troubleshooting "Command aborted" or "ProcessSingleton" Errors
If the `npm run update` command (or `npm run setup`) consistently reports "Command aborted" or a `ProcessSingleton` error, it almost always means:

1.  **A Chrome instance is already running**, typically using the same user data directory (`~/Library/Application Support/Google/Chrome`) that Playwright wants to use for the persistent session.
    *   **Solution**: Close *all* open Chrome browser windows and quit the Google Chrome application entirely. Verify no Chrome processes are running using `ps aux | grep -i "chrome"` and terminate any lingering processes with `kill -9 <PID>`.

2.  **The `SingletonLock` file is not being released properly**, even if Chrome is technically closed.
    *   **Solution**: Manually remove the lock file: `rm -f "/Users/russellbatchelor/Library/Application Support/Google/Chrome/SingletonLock"`.

After performing these steps, try running `npm run setup` (if setting up for the first time) or `npm run update` again. If the issue persists, running with verbose debugging (`DEBUG='*' npm run update`) can provide more insights, which I (the AI agent) will use to diagnose further.

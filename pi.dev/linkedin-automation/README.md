# LinkedIn Profile Automation (AppleScript + Chrome JavaScript Injection)

## Overview
Control Google Chrome via AppleScript and inject JavaScript to automate LinkedIn profile updates. Works because Chrome's `active tab` can `execute javascript` through AppleScript's automation bridge.

## Files

| File | Purpose |
|------|---------|
| `linkedin-headline-update.applescript` | Full script to update the profile headline |
| `test-session-notes.md` | Live test session log (below) |

## Test Session (2026-05-08)

### Prerequisites
- Chrome logged into LinkedIn as `russell.batchelor@gmail.com`
- macOS (uses AppleScript + JavaScript bridge)

### Commands Used

```bash
# 1. Open LinkedIn profile in Chrome
open -a "Google Chrome" "https://www.linkedin.com/in/russellbatchelor"

# 2. Click "Edit profile" link
oscript -e ... execute javascript "document.querySelector('a[aria-label=\"Edit profile\"]').click()"

# 3. Check what fields are available (headline is a contenteditable div)
oscript -e ... execute javascript "document.querySelectorAll('input, textarea, [contenteditable]')..."

# 4. Clear headline and set new text
oscript -e ... execute javascript "
  var div = document.querySelector('[contenteditable=\"true\"]');
  div.innerText = 'Test data';
  div.dispatchEvent(new Event('input', { bubbles: true }));
"

# 5. Click Save
oscript -e ... execute javascript "
  var btn = Array.from(document.querySelectorAll('button'))
    .filter(b => b.innerText.trim() === 'Save')[0];
  btn.click();
"
```

### Key Findings

**LinkedIn's edit intro page:** `/in/{username}/edit/intro/`

**Headline field:**
- NOT an `<input>` or `<textarea>`
- IS a `<div contenteditable="true">` (no id, no name attr)
- Must dispatch `new Event('input', {bubbles: true})` after changing `innerText` or LinkedIn won't register the change

**Save button:**
- `<button>` with innerText "Save" (exact match)
- Must scroll into view before clicking (page is tall)

**Other detected fields on edit/intro page:**
| React ID | Field |
|----------|-------|
| `:rq:` | First name |
| `:rr:` | Last name |
| `:rs:` | Additional name |
| `:r14:` | Industry |
| `:r17:` | Country/Region |
| `:r18:` | Postal code |

### Limitations
- React-generated IDs change on each page load
- AppleScript `execute javascript` has strict return value limits
- `delay` statements are fragile; LinkedIn is a SPA with async loading
- Future production script should use polling/waitForElement instead of fixed delays

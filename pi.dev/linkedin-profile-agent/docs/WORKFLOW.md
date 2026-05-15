# LinkedIn Editing Workflow

## Proven working MCP flow
1. Navigate to `/details/experience/`
2. Open a specific `Edit ... at ...` role link
3. Edit title via textbox named `Ex: Retail Sales Manager`
4. Edit description via textbox named `Description, maximum 2,000 characters`
5. Click `Save`
6. Click `Skip` if the next-action prompt appears

## Proven direct edit URLs
- Collective IP: `https://www.linkedin.com/in/russellbatchelor/details/experience/edit/forms/2799775038/`
- Solutions Through Knowledge: `https://www.linkedin.com/in/russellbatchelor/details/experience/edit/forms/2855928488/`
- Hiloka Ltd: `https://www.linkedin.com/in/russellbatchelor/details/experience/edit/forms/2799814595/`
- Park Place Technologies: `https://www.linkedin.com/in/russellbatchelor/details/experience/edit/forms/2799863845/`
- CentricsIT: `https://www.linkedin.com/in/russellbatchelor/details/experience/edit/forms/1535819118/`
- Sitehands: `https://www.linkedin.com/in/russellbatchelor/details/experience/edit/forms/1590025360/`
- Rainmaker Solutions: `https://www.linkedin.com/in/russellbatchelor/details/experience/edit/forms/562286094/`
- London Borough of Lambeth: `https://www.linkedin.com/in/russellbatchelor/details/experience/edit/forms/35391862/`
- Charles Stanley & Co. Limited: `https://www.linkedin.com/in/russellbatchelor/details/experience/edit/forms/23295094/`
- Comunica: `https://www.linkedin.com/in/russellbatchelor/details/experience/edit/forms/22228402/`

## Known caveats
- Some roles still behave differently in standalone Playwright vs MCP.
- If a standalone run fails, confirm the selector via MCP snapshot, then update config or script.
- Google sign-in is unreliable under automation. Use direct LinkedIn login.

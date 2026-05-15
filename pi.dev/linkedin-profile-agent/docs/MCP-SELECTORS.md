# MCP Selector Notes

## Experience page examples
- `Edit Operations Manager at Collective IP`
- `Edit Technical x at Solutions Through Knowledge`
- `Edit Managing Director at Hiloka Ltd`
- `Edit Infrastructure Consultant at Charles Stanley & Co. Limited`

## Edit dialog examples
- Title field label: `Title*`
- Title textbox accessible name: `Ex: Retail Sales Manager`
- Description textbox accessible name: `Description, maximum 2,000 characters`
- Save button: `Save`
- Prompt after save: `Skip`

## Reliable MCP approach
Use Playwright MCP snapshots to identify concrete refs on the live page, then:
1. click role-specific `Edit ... at ...` link
2. fill title/description
3. save
4. skip next-action prompt

#!/bin/bash
# Validate a CV JSON file against Reactive Resume schema requirements
# Usage: ./validate.sh <path-to-json>

set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: $0 <path-to-json>"
  exit 1
fi

JSON_FILE="$1"

if [ ! -f "$JSON_FILE" ]; then
  echo "❌ File not found: $JSON_FILE"
  exit 1
fi

python3 -c "
import json, sys, re

with open('$JSON_FILE') as f:
    data = json.load(f)

errors = []

# 1. Valid JSON check
try:
    json.dumps(data)
except:
    errors.append('Invalid JSON')

# 2. Required top-level fields
for field in ['picture', 'basics', 'summary', 'sections', 'customSections', 'metadata']:
    if field not in data:
        errors.append(f'missing top-level: {field}')

# 3. Basics
b = data.get('basics', {})
for field in ['name', 'headline', 'email', 'phone', 'location', 'website', 'customFields']:
    if field not in b:
        errors.append(f'missing basics.{field}')

# 4. Summary
s = data.get('summary', {})
for field in ['title', 'columns', 'hidden', 'content']:
    if field not in s:
        errors.append(f'missing summary.{field}')

# 5. Sections
sec = data.get('sections', {})
required_sections = ['profiles', 'experience', 'education', 'projects', 'skills', 'languages', 'interests', 'awards', 'certifications', 'publications', 'volunteer', 'references']
for r in required_sections:
    if r not in sec:
        errors.append(f'missing sections.{r}')

# 6. Experience items
for idx, item in enumerate(sec.get('experience', {}).get('items', [])):
    for field in ['id', 'hidden', 'company', 'position', 'location', 'period', 'website', 'description', 'roles']:
        if field not in item:
            errors.append(f'experience[{idx}] missing {field}')
    # Check for <p> inside <li>
    desc = item.get('description', '')
    if re.search(r'<li>\s*<p>', desc):
        errors.append(f'experience[{idx}] ({item.get(\"company\")}): <p> inside <li> - WILL BREAK DOCX')

# 7. Skills items
for idx, item in enumerate(sec.get('skills', {}).get('items', [])):
    for field in ['id', 'hidden', 'icon', 'name', 'proficiency', 'level', 'keywords']:
        if field not in item:
            errors.append(f'skills[{idx}] missing {field}')
    if item.get('hidden') == True:
        errors.append(f'skills[{idx}] ({item.get(\"name\")}): hidden=true - ATS will not see it')

# 8. Certifications
for idx, item in enumerate(sec.get('certifications', {}).get('items', [])):
    for field in ['id', 'hidden', 'title', 'issuer', 'date', 'website', 'description']:
        if field not in item:
            errors.append(f'certifications[{idx}] missing {field}')

# 9. Column check
if data.get('metadata', {}).get('layout', {}).get('pages', [{}])[0].get('fullWidth'):
    for section_name in ['summary', 'projects', 'experience', 'skills', 'certifications']:
        if sec.get(section_name, {}).get('columns', 1) > 1:
            errors.append(f'{section_name}: columns={sec[section_name][\"columns\"]} but fullWidth=true - should be 1')

# 10. Custom sections
cs = data.get('customSections', [])
for idx, item in enumerate(cs):
    for field in ['title', 'columns', 'hidden', 'id', 'type', 'items']:
        if field not in item:
            errors.append(f'customSections[{idx}] missing {field}')

# 11. Metadata
meta = data.get('metadata', {})
for field in ['template', 'layout', 'css', 'page', 'design', 'typography', 'notes']:
    if field not in meta:
        errors.append(f'missing metadata.{field}')

# Report
if errors:
    print(f'❌ {len(errors)} issues found:')
    for e in errors:
        print(f'  - {e}')
    sys.exit(1)
else:
    print('✅ CV JSON is valid and ready for injection')
"

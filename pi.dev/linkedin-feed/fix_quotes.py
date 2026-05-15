#!/usr/bin/env python3
"""Fix all template literal quotes -> backticks."""
import re

path = "/opt/reactive-resume/src/routes/dashboard/job-search/-components/search-filters.tsx"

with open(path) as f:
    c = f.read()

# msg"text" -> msg`text`  and  t"text" -> t`text`
c = re.sub(r'\b(msg|t)"([^"]+)"', r'\1`\2`', c)

with open(path, "w") as f:
    f.write(c)

print("Fixed")

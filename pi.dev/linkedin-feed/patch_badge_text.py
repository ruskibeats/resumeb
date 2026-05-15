#!/usr/bin/env python3
"""Fix badge text for manual jobs."""
path = "/opt/reactive-resume/src/routes/dashboard/job-search/-components/job-card.tsx"

with open(path) as f:
    c = f.read()

old = '{job.job_publisher === "JobServe RSS" ? "JobServe" : "LinkedIn"}'
new = '{job.job_title.startsWith("\U0001fa77") ? "Manual" : job.job_publisher === "JobServe RSS" ? "JobServe" : "LinkedIn"}'

if old in c:
    c = c.replace(old, new)
    with open(path, "w") as f:
        f.write(c)
    print("OK: badge text updated")
else:
    print("Pattern not found")

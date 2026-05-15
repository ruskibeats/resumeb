#!/usr/bin/env python3
"""Add pink badge for manual jobs in job-card.tsx."""
path = "/opt/reactive-resume/src/routes/dashboard/job-search/-components/job-card.tsx"

with open(path) as f:
    c = f.read()

old = 'job.job_publisher === "JobServe RSS"\n                  ? "bg-lime-50 text-lime-700 dark:bg-lime-950/40 dark:text-lime-400"\n                  : "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400"'

new = 'job.job_title.startsWith("\U0001fa77")\n                  ? "bg-pink-50 text-pink-700 dark:bg-pink-950/40 dark:text-pink-400"\n                  : job.job_publisher === "JobServe RSS"\n                    ? "bg-lime-50 text-lime-700 dark:bg-lime-950/40 dark:text-lime-400"\n                    : "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400"'

if old in c:
    c = c.replace(old, new)
    with open(path, "w") as f:
        f.write(c)
    print("OK: pink badge added for manual jobs")
else:
    print("ERROR: pattern not found")
    # Debug what's there
    import re
    m = re.search(r'bg-lime-50.*bg-sky-400', c)
    if m:
        print("Found:", repr(m.group()))

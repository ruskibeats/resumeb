#!/usr/bin/env python3
"""Add colored source badge to job cards."""
import re

path = "/opt/reactive-resume/src/routes/dashboard/job-search/-components/job-card.tsx"

with open(path) as f:
    c = f.read()

# Add source badge after employer_name line
old = '          <p className="truncate text-sm text-muted-foreground">{job.employer_name}</p>'
new = '''          <p className="truncate text-sm text-muted-foreground">{job.employer_name}</p>
          {job.job_publisher && (
            <span
              className={`mt-0.5 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                job.job_publisher === "JobServe RSS"
                  ? "bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-400"
                  : "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400"
              }`}
            >
              {job.job_publisher === "JobServe RSS" ? "JobServe" : "LinkedIn"}
            </span>
          )}'''

c = c.replace(old, new)

with open(path, "w") as f:
    f.write(c)

print("Added colored source badge")

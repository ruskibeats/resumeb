#!/usr/bin/env python3
"""Find and duplicate the RSS input field for LinkedIn + JobServe feeds."""
import re

client_route = "/opt/reactive-resume/.output/public/assets/route-DNUWPzmn.js"

with open(client_route) as f:
    line = f.read()

# Find the complete jobserve-rss-url input section
# Pattern: from id:jobserve-rss-url through to the end of the input element
idx = line.find("id:`jobserve-rss-url`")
if idx == -1:
    print("ERROR: jobserve-rss-url not found")
    exit(1)

# Show context around it for analysis
start = max(0, idx - 100)
end = min(len(line), idx + 1200)
context = line[start:end]
print("=== CONTEXT AROUND jobserve-rss-url ===")
print(context[:1000])
print("...")
print()

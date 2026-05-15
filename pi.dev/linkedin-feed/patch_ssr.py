#!/usr/bin/env python3
"""Patch client SSR factory to handle linkedin-rss provider + zod enum."""
client_ssr = "/opt/reactive-resume/.output/server/_ssr/client-COD2Xpmr.mjs"

with open(client_ssr) as f:
    line = f.read()

changes = 0

# 1. Patch factory to handle linkedin-rss as alias for jobserve-rss
old = 'if (options.provider === "jobserve-rss")'
new = 'if (options.provider === "linkedin-rss") { return new (require("./jobserve-rss").JobServeRssProvider)(options.rssUrl) } if (options.provider === "jobserve-rss")'
if old in line and "linkedin-rss" not in line:
    line = line.replace(old, new)
    changes += 1

# 2. Add linkedin-rss to zod enum
line = line.replace(
    'zod_default.enum(["jsearch", "jobserve-rss"]).default("jsearch")',
    'zod_default.enum(["jsearch", "jobserve-rss", "linkedin-rss"]).default("jsearch")'
)
changes += 1

# 3. Add destructuring for linkedinRssUrl
line = line.replace(
    "rapidApiKey:n,jobServeRssUrl:r,testStatus:a",
    "rapidApiKey:n,jobServeRssUrl:r,linkedinRssUrl:o,testStatus:a"
)

with open(client_ssr, "w") as f:
    f.write(line)

print(f"Client SSR: {changes} changes made (factory + enum)")

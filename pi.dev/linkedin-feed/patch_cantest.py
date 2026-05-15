#!/usr/bin/env python3
"""Fix the canTest logic to support both RSS URL fields."""
client_route = "/opt/reactive-resume/.output/public/assets/route-DNUWPzmn.js"

with open(client_route) as f:
    line = f.read()

# The canTest logic is: f=u?!!n:!!r  (isJSearch ? !!rapidApiKey : !!jobServeRssUrl)
# We need it to also handle linkedin-rss: f=u?!!n:t===`jobserve-rss`?!!r:!!o

old = "f=u?!!n:!!r"
new = "f=u?!!n:t===`jobserve-rss`?!!r:!!o"

if old in line:
    line = line.replace(old, new)
    with open(client_route, "w") as f:
        f.write(line)
    print("✅ Client route: canTest logic fixed for LinkedIn RSS")
else:
    print("⚠️  Pattern not found")

# Also fix in client SSR
client_ssr = "/opt/reactive-resume/.output/server/_ssr/client-COD2Xpmr.mjs"
with open(client_ssr) as f:
    line = f.read()

old2 = 'isJSearch=provider==="jsearch",canTest=isJSearch?!!rapidApiKey:!!jobServeRssUrl'
new2 = 'isJSearch=provider==="jsearch",canTest=isJSearch?!!rapidApiKey:provider==="jobserve-rss"?!!jobServeRssUrl:!!linkedinRssUrl'

if old2 in line:
    line = line.replace(old2, new2)
    with open(client_ssr, "w") as f:
        f.write(line)
    print("✅ Client SSR: canTest logic fixed")
elif "canTest" in line:
    # Try to find the pattern
    import re
    for m in re.finditer(r"canTest[^,}]+", line):
        print(f"  Found canTest: {m.group()}")
else:
    print("⚠️  Client SSR: pattern not found")

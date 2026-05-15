#!/usr/bin/env python3
"""Fix scraped_at timezone comparison in deduplicate."""
path = "/opt/pi.dev/linkedin-feed/scrape.py"

with open(path) as f:
    c = f.read()

old = """        # Fallback to scraped_at
        scraped = job.get("scraped_at", "")
        if scraped and not posted:
            try:
                scraped_dt = datetime.fromisoformat(scraped)
                if scraped_dt < cutoff:
                    aged_out += 1
                    continue
            except:
                pass"""

new = """        # Fallback to scraped_at
        scraped = job.get("scraped_at", "")
        if scraped and not posted:
            try:
                scraped_dt = datetime.fromisoformat(scraped)
                if scraped_dt.tzinfo is None:
                    scraped_dt = scraped_dt.replace(tzinfo=timezone.utc)
                if scraped_dt < cutoff:
                    aged_out += 1
                    continue
            except:
                pass"""

if old in c:
    c = c.replace(old, new)
    with open(path, "w") as f:
        f.write(c)
    print("Fixed timezone comparison")
else:
    print("Pattern not found - checking what's there")
    import re
    m = re.search(r"# Fallback to scraped_at.*?pass", c, re.DOTALL)
    if m:
        print(repr(m.group()))

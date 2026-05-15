#!/usr/bin/env python3
"""Add pink marker to manual jobs in RSS feed."""
path = "/opt/pi.dev/linkedin-feed/server.py"

with open(path) as f:
    c = f.read()

old = "        description_text = \"\\n\".join(desc_parts)"
new = '''        description_text = "\\n".join(desc_parts)
        # Prepend pink heart for manual jobs
        if job.get("_manual"):
            title = "🩷 " + title'''

c = c.replace(old, new)

with open(path, "w") as f:
    f.write(c)
print("Done")

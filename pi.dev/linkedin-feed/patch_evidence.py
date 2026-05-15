#!/usr/bin/env python3
"""Add career evidence endpoint + matching logic to server.py."""
import re, json

path = "/opt/pi.dev/linkedin-feed/server.py"

with open(path) as f:
    c = f.read()

# Add career evidence endpoint
old = 'MANUAL_FILE = Path(__file__).parent / "manual_jobs.json"'
new = 'MANUAL_FILE = Path(__file__).parent / "manual_jobs.json"\nEVIDENCE_FILE = Path(__file__).parent / "career_evidence.json"'
c = c.replace(old, new)

# Add evidence endpoint before @app.get("/health")
old_end = '\n@app.get("/health")'
new_end = '''

@app.get("/api/career-evidence")
async def get_career_evidence(q: str = ""):
    """Return career evidence cards, optionally filtered by job description keywords."""
    if not EVIDENCE_FILE.exists():
        return {"cards": [], "matched": 0, "total": 0}

    with open(EVIDENCE_FILE) as f:
        cards = json.load(f)

    if not q:
        return {"cards": cards[:6], "matched": len(cards[:6]), "total": len(cards)}

    # Simple keyword matching against the job description
    query_words = set(q.lower().split())
    scored = []
    for card in cards:
        keywords = set(k.lower() for k in card.get("keywords", []))
        # Score by how many keywords match
        score = len(keywords & query_words)
        # Also check title and category
        title_words = set(card["title"].lower().split())
        cat_words = set(card["category"].lower().split())
        score += len(title_words & query_words) * 2
        score += len(cat_words & query_words) * 2
        if score > 0:
            scored.append((score, card))

    scored.sort(key=lambda x: -x[0])
    matched = [s[1] for s in scored]

    return {"cards": matched, "matched": len(matched), "total": len(cards)}


@app.get("/health")'''
c = c.replace(old_end, new_end)

with open(path, "w") as f:
    f.write(c)

print("Added career evidence endpoint")

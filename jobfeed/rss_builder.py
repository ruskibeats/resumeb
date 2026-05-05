from datetime import datetime, timezone
from email.utils import format_datetime
from xml.sax.saxutils import escape
from typing import Any, List, Dict


def _now_rfc2822():
    return format_datetime(datetime.now(timezone.utc))


def _str(val):
    return str(val or "")


def _rr_bits(j):
    """Build custom <rr:*> metadata elements for a job item."""
    bits = []
    for key in ("score", "match_level", "source", "enrichment_status",
                 "salary", "location", "employment_type", "company",
                 "expires_at", "is_expired", "job_id", "first_seen_at"):
        val = j.get(key) or j.get("_"+key, "")
        if val or val == 0:
            bits.append("      <rr:" + key + ">" + escape(_str(val)) + "</rr:" + key + ">")
    return "\n".join(bits) + "\n" if bits else ""


def _card_desc(j):
    """Build a multi-line card description with key fields first."""
    lines = []
    if j.get("company"):
        lines.append("Company: " + j["company"])
    if j.get("location"):
        lines.append("Location: " + j["location"])
    if j.get("salary"):
        lines.append("Rate: " + j["salary"])
    if j.get("employment_type"):
        lines.append("Type: " + j["employment_type"])
    source = j.get("source", "")
    score = j.get("_score") or j.get("score", "")
    if source or score:
        parts = []
        if source:
            parts.append("Source: " + source)
        if score:
            parts.append("Score: " + str(score))
        lines.append(" | ".join(parts))
    if j.get("expires_at"):
        lines.append("Expires: " + j["expires_at"])
    lines.append("")
    desc = (j.get("description") or "")[:800]
    if desc:
        lines.append(desc)
    return "\n".join(lines)


def build_jobs_rss(jobs, feed_url, title, description):
    pub = _now_rfc2822()
    items = []
    for j in jobs:
        score = j.get("_score") or j.get("score", "")
        job_title = j.get("title", "Unknown Position")
        prefix = "[" + str(score) + "] " if score else ""
        t = escape(prefix + job_title.strip())
        ln = escape(j.get("url", ""))
        desc = _card_desc(j)
        rr = _rr_bits(j)
        items.append("""  <item>
    <title>""" + t + """</title>
    <link>""" + ln + """</link>
    <guid isPermaLink="true">""" + ln + """</guid>
    <pubDate>""" + pub + """</pubDate>
    <description>""" + escape(desc) + """</description>
""" + rr + """  </item>""")
    return """<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:rr="https://rxresu.me/job-feed">
  <channel>
    <title>""" + escape(title) + """</title>
    <description>""" + escape(description) + """</description>
    <link>""" + escape(feed_url) + """</link>
    <language>en-gb</language>
    <lastBuildDate>""" + pub + """</lastBuildDate>
    <atom:link href=\"""" + escape(feed_url) + """ rel="self" type="application/rss+xml"/>
    <ttl>60</ttl>
""" + "\n".join(items) + """
  </channel>
</rss>"""

build_linkedin_rss = build_jobs_rss

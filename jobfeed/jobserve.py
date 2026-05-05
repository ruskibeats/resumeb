"""
jobfeed/jobserve.py — Fetch and parse JobServe RSS into unified Job schema.
"""
from __future__ import annotations
import html
import re
from xml.etree import ElementTree as ET
from typing import List
from .models import Job


def fetch_jobserve_rss(client, url: str, timeout: int = 30) -> str | None:
    """Synchronous fetch wrapper; caller provides a httpx/requests client."""
    try:
        resp = client.get(url, headers={"User-Agent": "Reactive Resume RSS Proxy"}, timeout=timeout)
        if resp.status_code == 200:
            return resp.text
    except Exception:
        pass
    return None


async def fetch_jobserve_rss_async(url: str, timeout: int = 30) -> str | None:
    """Async fetch using httpx."""
    try:
        import httpx
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, headers={"User-Agent": "Reactive Resume RSS Proxy"}, timeout=timeout)
            if resp.status_code == 200:
                return resp.text
    except Exception:
        pass
    return None


def _extract_field(desc: str, label: str) -> str:
    """Extract Rate/Location/Type from HTML-escaped JobServe description."""
    # Inline span: <span...>Label:</span> VALUE
    m = re.search(r'<span[^>]*>' + label + r':</span>\s*([^<&]+?)(?:\s*(?:&nbsp;|<br|$))', desc)
    if m:
        v = m.group(1).strip()
        if v:
            return v
    # Table row (3rd td): <strong>Label:</strong></td><td...>...</td><td...>VALUE</td>
    m = re.search(r'<strong>' + label + r':</strong></td><td[^>]*>[^<]*</td><td[^>]*>\s*([^<]+?)\s*</td>', desc)
    if m:
        v = html.unescape(m.group(1).strip())
        if v and v != '&nbsp;':
            return v
    # Fallback: line-based (tab-separated)
    for line in desc.split("\n"):
        ls = line.strip()
        if ls.startswith(label + ":"):
            v = ls.split("\t")[0].replace(label + ":", "").strip()
            if v:
                return html.unescape(v)
    return ""


def _clean_description(raw_desc: str) -> str:
    """Strip the metadata header and trailing table from a JobServe RSS description."""
    # Remove everything up to and including the first <br/><br/>
    text = re.sub(r'^.*?<br/><br/>\s*', '', raw_desc, count=1, flags=re.DOTALL)
    # Remove trailing <table>...</table>
    text = re.sub(r'<table[^>]*>.*</table>', '', text, flags=re.DOTALL).strip()
    return html.unescape(text)


def parse_jobserve_rss(xml: str) -> List[Job]:
    """Parse raw JobServe RSS XML into a list of unified Job objects."""
    try:
        root = ET.fromstring(xml)
    except ET.ParseError:
        return []

    jobs: List[Job] = []
    for item in root.findall(".//item"):
        title_elem = item.find("title")
        link_elem = item.find("link")
        desc_elem = item.find("description")
        pubdate_elem = item.find("pubDate")
        guid_elem = item.find("guid")

        title = (title_elem.text or "").strip()
        link = (link_elem.text if link_elem is not None else "").strip()
        pub_date = (pubdate_elem.text if pubdate_elem is not None else "").strip()
        guid = (guid_elem.text if guid_elem is not None else "").strip()

        if not title:
            continue

        raw_desc = desc_elem.text or ""

        location = _extract_field(raw_desc, "Location")
        salary = _extract_field(raw_desc, "Rate")
        employment_type = _extract_field(raw_desc, "Type")

        j = Job(
            source="jobserve",
            source_job_id=guid or link,
            title=title,
            company="JobServe",
            location=location,
            salary=salary,
            employment_type=employment_type,
            url=link,
            description=_clean_description(raw_desc),
            raw_description=raw_desc,
            posted_date=pub_date,
            scraped_at="",
        )
        jobs.append(j)

    return jobs

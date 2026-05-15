#!/usr/bin/env python3
"""Check patterns in compiled RR files for patching."""
import sys

filepath = sys.argv[1]
search = sys.argv[2] if len(sys.argv) > 2 else "jsearch"

with open(filepath) as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if search in line:
        idx = line.index(search)
        start = max(0, idx - 60)
        end = min(len(line), idx + len(search) + 60)
        print(f"Line {i} [{start}:{end}]: {line[start:end]}")

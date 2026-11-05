#!/usr/bin/env python3
"""Versioni ridotte della pianta di discover.html per telefoni e tablet.

js/vv-plan.js carica images/plan/villa-volpe-plan.webp (2048px, ~650 KB) con
srcset: su un telefono basta la -1024 (~1/4 del peso). Da rilanciare a OGNI
nuova pianta, prima del commit, altrimenti i telefoni vedono quella vecchia:

    python3 tools/plan-sizes.py
"""
import os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'images', 'plan', 'villa-volpe-plan.webp')

im = Image.open(SRC).convert('RGB')
for w in (1024, 1536):
    out = SRC.replace('.webp', '-%d.webp' % w)
    im.resize((w, round(im.height * w / im.width)), Image.LANCZOS).save(out, 'WEBP', quality=82, method=6)
    print('%s  %d KB' % (os.path.relpath(out, ROOT), os.path.getsize(out) // 1024))

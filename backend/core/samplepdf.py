"""Builds the demo attendance-policy PDF from the Markdown source (so 'PDF -> RAG' is a real PDF)."""
from __future__ import annotations

import html
import re

from .config import DATA_DIR

MD = DATA_DIR / "attendance" / "attendance_policy.md"
PDF = DATA_DIR / "attendance_policy.pdf"


def _inline(t: str) -> str:
    return re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", html.escape(t))


def _to_html(md: str) -> str:
    out, in_list = [], False
    for line in md.splitlines():
        if line.startswith("- "):
            if not in_list:
                out.append("<ul>")
                in_list = True
            out.append(f"<li>{_inline(line[2:])}</li>")
            continue
        if in_list:
            out.append("</ul>")
            in_list = False
        if line.startswith("## "):
            out.append(f"<h2>{_inline(line[3:])}</h2>")
        elif line.startswith("# "):
            out.append(f"<h1>{_inline(line[2:])}</h1>")
        elif line.strip():
            out.append(f"<p>{_inline(line)}</p>")
    if in_list:
        out.append("</ul>")
    return "\n".join(out)


def ensure_sample_pdf():
    if PDF.exists() and PDF.stat().st_mtime >= MD.stat().st_mtime:
        return PDF
    import pymupdf

    css = "h1{font-size:20pt;color:#111} h2{font-size:14pt;margin-top:10pt;color:#222} p,li{font-size:10.5pt;line-height:1.4}"
    story = pymupdf.Story(html=_to_html(MD.read_text(encoding="utf-8")), user_css=css)
    writer = pymupdf.DocumentWriter(str(PDF))
    mediabox = pymupdf.paper_rect("a4")
    where = mediabox + (50, 50, -50, -50)
    more = True
    while more:
        dev = writer.begin_page(mediabox)
        more, _ = story.place(where)
        story.draw(dev)
        writer.end_page()
    writer.close()
    return PDF

"""Documents, loaders, chunkers and the bundled corpora."""
from __future__ import annotations

import re
from dataclasses import dataclass, field, asdict
from pathlib import Path

from .config import DATA_DIR


@dataclass
class Document:
    id: str
    title: str
    text: str
    meta: dict = field(default_factory=dict)


@dataclass
class Chunk:
    id: str
    doc_id: str
    title: str
    section: str
    text: str
    start: int = 0
    meta: dict = field(default_factory=dict)

    def public(self) -> dict:
        return asdict(self)


# ── Loading ──────────────────────────────────────────────────────────────
def parse_frontmatter(raw: str) -> tuple[dict, str]:
    if raw.startswith("---"):
        end = raw.find("\n---", 3)
        if end != -1:
            meta = {}
            for line in raw[3:end].strip().splitlines():
                if ":" in line:
                    k, v = line.split(":", 1)
                    meta[k.strip()] = v.strip()
            return meta, raw[end + 4:].lstrip("\n")
    return {}, raw


def load_markdown_dir(folder: Path) -> list[Document]:
    docs = []
    for p in sorted(folder.glob("*.md")):
        meta, body = parse_frontmatter(p.read_text(encoding="utf-8"))
        h1 = re.search(r"^#\s+(.+)$", body, re.M)
        title = meta.get("title") or (h1.group(1).strip() if h1 else p.stem)
        docs.append(Document(id=p.name, title=title, text=body, meta=meta))
    return docs


LOADERS = {
    "pymupdf4llm": {"label": "PyMuPDF4LLM", "note": "Fast PDF -> Markdown. The default.", "module": "pymupdf4llm"},
    "docling": {"label": "Docling", "note": "Layout-model parsing (tables, reading order). First use downloads models.", "module": "docling"},
}


def loader_status() -> dict:
    import importlib.util as u

    out = {k: {**v, "available": u.find_spec(v["module"]) is not None} for k, v in LOADERS.items()}
    out["crawl4ai"] = {"label": "Crawl4AI", "note": "Crawl a web page into Markdown (needs `crawl4ai-setup` once).", "module": "crawl4ai",
                       "available": u.find_spec("crawl4ai") is not None}
    return out


def load_file(name: str, data: bytes, loader: str = "pymupdf4llm") -> tuple[str, str]:
    """Bytes -> (markdown text, loader name). PDFs use PyMuPDF4LLM by default, or Docling on request."""
    ext = Path(name).suffix.lower()
    if ext == ".pdf" and loader == "docling":
        import tempfile

        from docling.document_converter import DocumentConverter

        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "doc.pdf"
            path.write_bytes(data)
            return DocumentConverter().convert(str(path)).document.export_to_markdown(), "Docling"
    if ext == ".pdf":
        import pymupdf
        import pymupdf4llm

        doc = pymupdf.open(stream=data, filetype="pdf")
        return pymupdf4llm.to_markdown(doc), "PyMuPDF4LLM"
    return data.decode("utf-8", errors="replace"), "plain text"


def load_url(url: str) -> tuple[str, str]:
    """Crawl a web page to Markdown with Crawl4AI."""
    import asyncio

    from crawl4ai import AsyncWebCrawler

    if not url.startswith(("http://", "https://")):
        raise ValueError("Only http(s) URLs are supported.")

    async def _run():
        async with AsyncWebCrawler() as crawler:
            res = await crawler.arun(url=url)
            return str(res.markdown)

    return asyncio.run(_run()), "Crawl4AI"


# ── Bundled corpora ──────────────────────────────────────────────────────
_UPLOADS: dict[str, list[Document]] = {}


def register_upload(upload_id: str, docs: list[Document]) -> None:
    _UPLOADS[upload_id] = docs


def get_corpus(name: str) -> list[Document]:
    if name == "attendance":
        return load_markdown_dir(DATA_DIR / "attendance")
    if name == "ragpay":
        return load_markdown_dir(DATA_DIR / "ragpay")
    if name.startswith("upload:"):
        docs = _UPLOADS.get(name[7:])
        if docs is None:
            raise KeyError("Uploaded document not found (the server may have restarted).")
        return docs
    raise KeyError(f"unknown corpus '{name}'")


# ── Chunking ─────────────────────────────────────────────────────────────
def _section_map(text: str) -> list[tuple[int, str]]:
    """Positions of markdown headings -> lets any chunk know its section."""
    return [(m.start(), m.group(2).replace("**", "").strip()) for m in re.finditer(r"^(#{1,3})\s+(.+)$", text, re.M)]


def _section_at(sections: list[tuple[int, str]], pos: int) -> str:
    cur = ""
    for p, name in sections:
        if p <= pos:
            cur = name
        else:
            break
    return cur


def _fixed(text: str, size: int, overlap: int) -> list[tuple[int, str]]:
    step = max(size - overlap, 1)
    return [(i, text[i:i + size]) for i in range(0, len(text), step) if text[i:i + size].strip()]


def _sentence(text: str, size: int, overlap: int) -> list[tuple[int, str]]:
    from chonkie import SentenceChunker

    ch = SentenceChunker(tokenizer="character", chunk_size=size, chunk_overlap=min(overlap, size // 2))
    return [(c.start_index, c.text) for c in ch.chunk(text) if c.text.strip()]


def _recursive(text: str, size: int, overlap: int) -> list[tuple[int, str]]:
    """Split on paragraphs, then lines, then sentences, then words - keeps meaning together."""
    seps = ["\n\n", "\n", ". ", " "]

    def split(t: str, offset: int, level: int) -> list[tuple[int, str]]:
        if len(t) <= size or level >= len(seps):
            return [(offset, t)] if t.strip() else []
        parts, out, pos = t.split(seps[level]), [], 0
        buf, buf_start = "", 0
        for i, part in enumerate(parts):
            piece = part + (seps[level] if i < len(parts) - 1 else "")
            if len(buf) + len(piece) <= size:
                if not buf:
                    buf_start = pos
                buf += piece
            else:
                if buf:
                    out.append((offset + buf_start, buf))
                if len(piece) > size:
                    out += split(piece, offset + pos, level + 1)
                    buf = ""
                else:
                    buf, buf_start = piece, pos
            pos += len(piece)
        if buf.strip():
            out.append((offset + buf_start, buf))
        return out

    base = [(o, s) for o, s in split(text, 0, 0) if s.strip()]
    if overlap <= 0:
        return base
    return [(o, (text[max(o - overlap, 0):o] if i else "") + s) for i, (o, s) in enumerate(base)]


def _heading(text: str, size: int, overlap: int) -> list[tuple[int, str]]:
    """Structure-aware: one chunk per markdown section (split further only if huge)."""
    marks = [m.start() for m in re.finditer(r"^#{1,3}\s", text, re.M)]
    if not marks or marks[0] != 0:
        marks = [0] + marks
    marks.append(len(text))
    out, carry = [], ""
    n_blocks = len(marks) - 1
    for n, (a, b) in enumerate(zip(marks, marks[1:])):
        raw = text[a:b].strip()
        if not raw:
            continue
        if raw.startswith("# ") and len(raw) < 260 and n < n_blocks - 1:  # short title + intro: attach to the next section
            carry = raw + "\n\n"
            continue
        block, carry = carry + raw, ""
        if len(block) > size * 2:
            out += [(a + o, s) for o, s in _recursive(block, size * 2, 0)]
        else:
            out.append((a, block))
    return out


CHUNKERS = {
    "fixed": (_fixed, "Fixed size", "Cut every N characters. Simple, but can slice sentences in half."),
    "sentence": (_sentence, "Sentence (Chonkie)", "Groups whole sentences up to N characters."),
    "recursive": (_recursive, "Recursive", "Tries paragraphs, then lines, then sentences. LangChain-style default."),
    "heading": (_heading, "Heading-aware", "One chunk per document section. Keeps titles and structure."),
}


def chunk_documents(docs: list[Document], strategy: str = "recursive", size: int = 500, overlap: int = 50,
                    contextual: bool = True) -> list[Chunk]:
    """Chunk documents. With `contextual`, each chunk's text is prefixed with 'Title > Section'."""
    fn = CHUNKERS[strategy][0]
    chunks: list[Chunk] = []
    for d in docs:
        secs = _section_map(d.text)
        for i, (start, txt) in enumerate(fn(d.text, size, overlap)):
            txt = txt.strip()
            if not txt:
                continue
            section = _section_at(secs, start) or d.title
            body = f"{d.title} > {section}\n{txt}" if contextual else txt
            chunks.append(Chunk(id=f"{d.id}#{i}", doc_id=d.id, title=d.title, section=section,
                                text=body, start=start, meta=d.meta))
    return chunks

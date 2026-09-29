# 01 · Basic RAG (from scratch)

## WHAT
RAG with **no framework and no vector database**: PyMuPDF4LLM loads the PDF, plain Python chunks it, Sentence Transformers embeds it, a NumPy matrix stores it, a dot product retrieves, Groq generates.

## WHY
Before using LangChain or a vector DB, students should see that every "magic" box is a few lines of code.

## ARCHITECTURE
```
PDF -> load -> chunk -> embed -> store -> retrieve -> prompt -> Groq -> answer + sources
       (PyMuPDF4LLM)  (window)  (SBERT)  (ndarray)  (dot product)
```

## KEY FILES
- `rag.py` - the `BasicRAG` class. One method per pipeline stage.
- `router.py` - `/api/basic/step` lets the UI run one stage at a time and inspect its output; `/api/basic/upload` accepts your own PDF/text.

## HOW IT DIFFERS FROM PREVIOUS VERSION
First version. Everything later is measured against this one.


# 08 · Code RAG

## WHAT
Ask questions about a repository (a small bundled Flask API in `data/code_repo`) and get **file + line citations**.

## WHY
Code is not prose: structure matters, identifiers matter, and answers must be verifiable.

## ARCHITECTURE
```
*.py -> ast: one chunk per function/class -> Chroma (meaning) + BM25 on split identifiers -> RRF -> cross-encoder -> Groq -> answer + file:line
```

## KEY FILES
- `rag.py` - `chunk_file()` (AST chunking), `code_tokens()` (verify_token -> verify, token), `ask()`.

## HOW IT DIFFERS FROM PREVIOUS VERSION
Chunking by syntax tree instead of characters, identifier-aware keyword search, and citations that carry line numbers.


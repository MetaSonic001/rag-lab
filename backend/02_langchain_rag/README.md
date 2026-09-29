# 02 · RAG with LangChain + Chroma

## WHAT
The same pipeline expressed with **LangChain components** and a **Chroma** vector store (running in-process, no server).

## WHY
LangChain gives ready-made splitters, retrievers, prompt templates and model wrappers, and lets you compose them: `retriever | prompt | llm | parser`.

## ARCHITECTURE
```
RecursiveCharacterTextSplitter -> Chroma (SentenceTransformer embeddings)
question -> retriever -> ChatPromptTemplate -> ChatGroq -> StrOutputParser
```

## KEY FILES
- `rag.py` - splitter, embedding adapter, Chroma store, the LCEL chain.
- `router.py` - `/api/langchain/ask`.

## HOW IT DIFFERS FROM PREVIOUS VERSION
`diff 01_basic_rag/rag.py 02_langchain_rag/rag.py`: the hand-written chunker, NumPy matrix and prompt string are replaced by library components. Retrieval quality is *the same idea*; you gained composability and a vector DB, not accuracy.


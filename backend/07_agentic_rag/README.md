# 07 · Agentic RAG (LangGraph)

## WHAT
RAG as a **stateful graph**: classify the question, route to a specialised retriever, rerank, synthesise, **verify** the answer, and loop back to search wider if verification fails.

## WHY
Straight-line pipelines cannot make decisions. LangGraph gives you state, conditional edges and loops while each node stays a plain Python function.

## ARCHITECTURE
```
START -> classify -> retrieve_(payments|refunds|settlements|general) -> rerank -> synthesize -> verify
                                                                                         |-- ok --> END
                                                                                         '-- fail -> widen -> retrieve_general
```

## KEY FILES
- `rag.py` - `State`, one function per node, `build_graph()`; every node appends an event so the UI can replay the run.

## HOW IT DIFFERS FROM PREVIOUS VERSION
06 loops over sub-questions inside one function. 07 makes the workflow explicit and inspectable as a graph.


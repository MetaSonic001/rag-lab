# 11 · Security

## WHAT
Five attacks against the RAGPAY knowledge base, each run against a VULNERABLE and a DEFENDED pipeline: prompt injection, untrusted documents, missing evidence (hallucination), source spoofing, data leakage.

## WHY
Retrieved text is **data, not instructions**. Anything that can enter the index can influence the model.

## DEFENCES (all deterministic code you can read)
1. **Provenance**: trust comes from how a document entered the system (`origin`), never from what it says about itself.
2. **ACL at retrieval**: `acl` metadata excludes internal documents.
3. **Injection scanner**: regexes for instruction-like text and unknown links.
4. **Data fencing prompt**: passages wrapped in `<data>` tags; the model is told never to obey them.
5. **Relevance gate**: cross-encoder threshold + unknown-term check.
6. **Output scan**: blocks unknown URLs and secret-looking strings.

None is perfect. Defence in depth is the point.

## KEY FILES
`attacks.py` (scenarios + patterns), `rag.py` (both pipelines), `router.py`.

## HOW IT DIFFERS FROM PREVIOUS VERSION
Wraps the RAGPAY pipeline in defences and measures whether the poison reached the model.

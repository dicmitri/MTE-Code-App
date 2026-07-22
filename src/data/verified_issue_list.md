# Verified Issue List: Manual Audit Findings

> Historical note: this May 2026 audit is superseded by the July 2026 local-PDF audit. The newer audit found substantive differences that this document did not identify. Do not rely on the "no further discrepancies" conclusion below. See [Code Content Split](../../docs/content-migration/README.md) and its generated `code-pdf-audit.json` evidence.

This document supplements previous automated checks with findings from a rigorous manual and script-assisted audit comparing `codeData.json` against the verbatim text of the September 2024 PDF.

## 1. Glossary Rewritten (Fixed)
The original JSON `glossary` section was extensively paraphrased and missing 14 of the 38 definitions present in the PDF. This was the most significant discrepancy found. 
**Resolution:** The Glossary has been completely rewritten to match the PDF verbatim.

## 2. Scope Chapter Discrepancies (Fixed)
Several discrepancies were found in the Scope chapter:
- **1.1:** Formatting differences (using `<ul>` instead of PDF bullet points).
- **Q&A 1:** The JSON included a trailing period that was absent in the PDF.
- **2.1 & 2.2:** The PDF contained strict typos ("sponsorhip", "Professionalsthe", duplicated phrases). 
**Resolution:** The Scope chapter was updated to match the PDF exactly, applying corrections only for strict grammatical/spelling typos as requested.

## 3. Automated False Positives (Cleared)
Previous automated scans flagged several Q&As as truncated or containing extra content. Manual inspection confirmed these were **false positives** caused by the PDF's pagination (headers/footers interrupting the text flow in raw extraction). The JSON text for these was already perfectly verbatim.
- **Intro Q&A 3:** Flagged as truncated. Actually verbatim.
- **Chapter 1 Q&A 5 & 9:** Flagged as truncated/extra. Actually verbatim (Q&A 9 spans across page 20 and 21 in the PDF).
- **Chapter 4 Q&A 36:** Flagged as modified. Actually verbatim (minor typo corrections like adding missing spaces).
- **Chapter 2 Q&A 18 & 20:** Flagged as modified. Actually verbatim (JSON corrected PDF typos like "In Kkind" -> "In-Kind").

## Conclusion
Following a comprehensive continuous check through the chapters (Glossary, Scope, Administering the Code, Introduction, Chapters 1, 2, 4, 6), no further "missing paragraphs" or significant deviations were found. The JSON is highly accurate to the PDF, and any remaining differences are strictly related to acceptable HTML formatting choices (`<br/>`, `<ul>`, `<strong>`) or correction of obvious PDF typographical errors.

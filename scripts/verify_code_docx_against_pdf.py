#!/usr/bin/env python3
"""Independently verify the PDF-derived Code DOCX without reading JSON data."""

from __future__ import annotations

import argparse
import hashlib
import re
from collections import Counter
from difflib import SequenceMatcher
from pathlib import Path

from docx import Document
from docx.oxml.ns import qn
from pypdf import PdfReader


PROJECT_ROOT = Path(__file__).resolve().parent.parent
SOURCE_PDF = PROJECT_ROOT / "src" / "data" / "code-september-2024 (1).pdf"
SOURCE_DOCX = PROJECT_ROOT / "src" / "data" / "code-september-2024.docx"
SOURCE_SHA256 = "9ED658D0C9F858E35576C3905CC4423DF934DB894786F4C12D9A130E0602A148"

STANDARD_HEADERS = {
    "MEDTECH EUROPE – CODE OF ETHICAL BUSINESS PRACTICE",
    "MEDTECH EUROPE – CODE OF ETHICAL BUSINESS PRACTICE QUESTIONS AND ANSWERS",
}
RUNNING_HEADERS = {
    "SCOPE",
    "ADMINISTERING THE CODE",
    "INTRODUCTION",
    "CHAPTER 1: GENERAL CRITERIA FOR EVENT",
    "CHAPTER 2: THIRD PARTY ORGANISED EDUCATIONAL EVENTS",
    "CHAPTER 3: COMPANY EVENTS",
    "CHAPTER 4: GRANTS AND CHARITABLE DONATIONS",
    "CHAPTER 4: CONSULTING ARRANGEMENTS",
    "CHAPTER 6: RESEARCH",
    "CHAPTER 7: ROYALTIES",
    "CHAPTER 8: EDUCATIONAL ITEMS AND PROMOTIONAL ITEMS",
    "CHAPTER 9: DEMONSTRATION PRODUCTS AND SAMPLES",
    "CHAPTER 10: THIRD PARTY INTERMEDIARIES",
    "PART 2: COMPLAINT HANDLING AND DISPUTE RESOLUTION",
    "PART 3: Glossary and Definitions",
    "PART 3: Annexes",
}
MAJOR_TITLES = {
    5: "Scope",
    9: "Administering the Code",
    14: "Introduction",
    18: "Chapter 1: General Criteria for Event",
    24: "Chapter 2: Third Party Organised Educational Events",
    28: "Chapter 3: Company Events",
    33: "Chapter 4: Grants and Charitable Donations",
    41: "Chapter 5: Consulting Arrangements",
    46: "Chapter 6: Research",
    51: "Chapter 7: Royalties",
    53: "Chapter 8: Educational Items and Promotional Items",
    56: "Chapter 9: Demonstration Products and Samples",
    59: "Chapter 10: Third Party Intermediaries",
    62: (
        "MedTech Europe Code of Ethical Business Practice Part 2: "
        "Complaint handling and dispute resolution"
    ),
    67: (
        "MedTech Europe Code of Ethical Business Practice Part 3: "
        "Glossary and Definitions"
    ),
}
MAJOR_BODY_STARTS = {
    9: "Part 2 of the Code includes",
    18: "Member Companies may directly finance",
}
WORD_RE = re.compile(r"[^\W_]+(?:[’'][^\W_]+)*", re.UNICODE)
EDITORIAL_END = "Editorial correction record (not part of the Code)"


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest().upper()


def normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text or "").strip()


def words(text: str) -> list[str]:
    return [match.casefold() for match in WORD_RE.findall(normalize(text))]


def correction_rows(document: Document) -> dict[int, list[tuple[str, str]]]:
    table = document.tables[-1]
    corrections: dict[int, list[tuple[str, str]]] = {}
    for row in table.rows[1:]:
        values = [normalize(cell.text) for cell in row.cells]
        if len(values) != 4 or not values[0].isdigit():
            raise ValueError(f"Malformed correction row: {values}")
        corrections.setdefault(int(values[0]), []).append((values[1], values[2]))
    return corrections


def clean_pdf_page(
    reader: PdfReader,
    page_number: int,
    corrections: dict[int, list[tuple[str, str]]],
) -> str:
    lines = [
        normalize(line)
        for line in (reader.pages[page_number - 1].extract_text() or "").splitlines()
        if normalize(line)
    ]
    if lines and lines[0] in STANDARD_HEADERS:
        lines.pop(0)
    if lines and lines[0] == str(page_number):
        lines.pop(0)
    if lines and lines[0] in RUNNING_HEADERS:
        lines.pop(0)

    if page_number in MAJOR_TITLES:
        body_start = MAJOR_BODY_STARTS.get(page_number)
        if body_start:
            index = next(
                (
                    index
                    for index, line in enumerate(lines)
                    if line.startswith(body_start)
                ),
                None,
            )
            if index is None:
                raise ValueError(
                    f"Page {page_number}: body start not found: {body_start}"
                )
            text = f"{MAJOR_TITLES[page_number]} {' '.join(lines[index:])}"
        else:
            text = MAJOR_TITLES[page_number]
    else:
        text = " ".join(lines)
        if page_number == 72:
            text = f"Part 3: Annexes {text}"

    text = normalize(text)
    for original, replacement in corrections.get(page_number, []):
        count = text.count(original)
        if count != 1:
            raise ValueError(
                f"Page {page_number}: correction source matched {count} times: "
                f"{original!r}"
            )
        text = text.replace(original, replacement, 1)
    return text


def paragraph_text(element) -> str:
    if element.tag == qn("w:tbl"):
        return " ".join(
            " ".join(
                "".join(node.text or "" for node in paragraph.iter(qn("w:t")))
                for paragraph in cell.iter(qn("w:p"))
            )
            for cell in element.findall(".//w:tc", element.nsmap)
        )
    return "".join(node.text or "" for node in element.iter(qn("w:t")))


def docx_text_by_page(document: Document) -> dict[int, str]:
    pages: dict[int, list[str]] = {}
    current_page = None
    for child in document.element.body.iterchildren():
        text = normalize(paragraph_text(child))
        if child.tag == qn("w:p"):
            bookmark_names = [
                value
                for node in child.findall(".//w:bookmarkStart", child.nsmap)
                if (value := node.get(qn("w:name"), "")).startswith("pdf_page_")
            ]
            if bookmark_names:
                current_page = int(bookmark_names[-1].rsplit("_", 1)[-1])
            if text == EDITORIAL_END:
                break
        if current_page is not None and text:
            pages.setdefault(current_page, []).append(text)
    return {page: normalize(" ".join(parts)) for page, parts in pages.items()}


def compare_page(source_text: str, output_text: str) -> dict[str, object]:
    source_words = words(source_text)
    output_words = words(output_text)
    source_counter = Counter(source_words)
    output_counter = Counter(output_words)
    raw_missing = source_counter - output_counter
    list_markers = {
        "a",
        "b",
        "c",
        "d",
        "e",
        "f",
        "g",
        "h",
        "i",
        "ii",
        "iii",
        "iv",
        "v",
        "vi",
        "vii",
    }
    missing = Counter(
        {
            token: count
            for token, count in raw_missing.items()
            if token not in list_markers and not token.isdigit()
        }
    )
    extra = output_counter - source_counter
    matched = len(source_words) - sum(missing.values())
    return {
        "source_words": len(source_words),
        "output_words": len(output_words),
        "coverage": matched / len(source_words) if source_words else 1.0,
        "sequence_ratio": SequenceMatcher(
            None, source_words, output_words, autojunk=False
        ).ratio(),
        "raw_missing": raw_missing,
        "missing": missing,
        "extra": extra,
    }


def summarize(counter: Counter, limit: int = 12) -> str:
    return ", ".join(
        f"{token}×{count}" for token, count in counter.most_common(limit)
    )


def verify(pdf_path: Path, docx_path: Path) -> None:
    if sha256(pdf_path) != SOURCE_SHA256:
        raise ValueError("The PDF hash does not match the reviewed source.")
    reader = PdfReader(pdf_path)
    if len(reader.pages) != 80:
        raise ValueError(f"Expected 80 PDF pages; found {len(reader.pages)}")
    document = Document(docx_path)
    corrections = correction_rows(document)
    if sum(map(len, corrections.values())) < 30:
        raise ValueError("The correction record is unexpectedly short.")

    output_pages = docx_text_by_page(document)
    expected_pages = set(range(2, 81)) - {3, 4}
    missing_bookmarks = expected_pages - set(output_pages)
    if missing_bookmarks:
        raise ValueError(
            f"Missing source-page content/bookmarks: {sorted(missing_bookmarks)}"
        )

    failures = []
    results = {}
    for page_number in sorted(expected_pages):
        if page_number == 74:
            continue
        source_text = clean_pdf_page(reader, page_number, corrections)
        output_text = output_pages[page_number]
        if page_number == 73:
            source_text = normalize(
                f"{source_text} {clean_pdf_page(reader, 74, corrections)}"
            )
            output_text = normalize(
                f"{output_text} {output_pages.get(74, '')}"
            )
        result = compare_page(source_text, output_text)
        results[page_number] = result
        is_restructured_table_page = page_number in {72, 73, 75, 78}
        if result["coverage"] < 0.995 or (
            result["sequence_ratio"] < 0.97 and not is_restructured_table_page
        ):
            failures.append(page_number)

    source_word_total = sum(result["source_words"] for result in results.values())
    missing_word_total = sum(
        sum(result["missing"].values()) for result in results.values()
    )
    coverage = 1 - (missing_word_total / source_word_total)
    print(
        f"Verified {len(results)} source page groups; "
        f"{source_word_total} PDF words; {coverage:.4%} word coverage."
    )
    residual_pages = [
        page_number
        for page_number, result in results.items()
        if result["missing"]
    ]
    for page_number in residual_pages:
        result = results[page_number]
        print(
            f"Page {page_number} residual source words "
            f"(typically extraction/list-marker artifacts): "
            f"[{summarize(result['missing'])}]"
        )
    for page_number in failures:
        result = results[page_number]
        print(
            f"Page {page_number}: coverage={result['coverage']:.2%}; "
            f"sequence={result['sequence_ratio']:.2%}; "
            f"missing=[{summarize(result['missing'])}]; "
            f"extra=[{summarize(result['extra'])}]"
        )
    if failures or coverage < 0.995:
        raise ValueError(
            f"Fidelity threshold failed: pages={failures}, coverage={coverage:.4%}"
        )

    document_text = normalize(" ".join(paragraph.text for paragraph in document.paragraphs))
    forbidden = ("July 2026 Update", "Knowledge Quiz", "TPPT Checker", "Summary:")
    leaked = [value for value in forbidden if value in document_text]
    if leaked:
        raise ValueError(f"App/JSON-only text leaked into the DOCX: {leaked}")
    print(
        f"PASS: {len(corrections)} PDF pages contain "
        f"{sum(map(len, corrections.values()))} documented corrections; "
        "no app-only text detected."
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--pdf", type=Path, default=SOURCE_PDF)
    parser.add_argument("--docx", type=Path, default=SOURCE_DOCX)
    return parser.parse_args()


if __name__ == "__main__":
    arguments = parse_args()
    verify(arguments.pdf.resolve(), arguments.docx.resolve())

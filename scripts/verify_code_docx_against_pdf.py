#!/usr/bin/env python3
"""Strictly verify the PDF-derived Code DOCX against the published September 2024 PDF.

The check reads both documents directly; it never imports the build script or any JSON.
Each document becomes a stream of words and punctuation marks that keeps case,
superscript footnote references and whether a space precedes each token. The streams
must match exactly, apart from these allowances, each of which is itself checked:

- Corrections: every row of the DOCX's editorial correction record must match its PDF
  page (exactly once on text pages); the corrected wording is then expected instead.
- Page furniture: lines above and below the text area must be the known banner and the
  running header with the page number. They are not Code text.
- Chapter title pages: the display title and a hidden small copy of it must both equal
  the DOCX Heading 1 that carries the page's bookmark. The title then counts once.
- Page breaks: a paragraph that continues on the next PDF page is one DOCX paragraph,
  so its continuation may move ahead of the earlier page's footnotes and Q&As.
- Q&A labels: the PDF prints them in the Q&A column's margin, so they are compared as
  their own sequence, and each must open its question or answer paragraph.
- Bullets: DOCX bullets are list formatting, read from the numbering definitions.
  Letter, roman and number labels must be typed text.
- Annex table pages (72-75 and 78): table cells are read in a different order, so these
  pages are compared as token counts rather than as sequences.
- Spacing is not compared at PDF line starts or DOCX paragraph starts.

Requires: pip install pdfplumber python-docx
"""

from __future__ import annotations

import argparse
import hashlib
import re
import statistics
import sys
from collections import Counter
from dataclasses import dataclass
from difflib import SequenceMatcher
from pathlib import Path

import pdfplumber
from docx import Document
from docx.oxml.ns import qn


PROJECT_ROOT = Path(__file__).resolve().parent.parent
SOURCE_PDF = PROJECT_ROOT / "src" / "data" / "code-september-2024 (1).pdf"
SOURCE_DOCX = PROJECT_ROOT / "src" / "data" / "code-september-2024.docx"
SOURCE_SHA256 = "9ED658D0C9F858E35576C3905CC4423DF934DB894786F4C12D9A130E0602A148"
EDITORIAL_END = "Editorial correction record (not part of the Code)"

# PDF layout (points): furniture sits outside BODY_TOP..BODY_BOTTOM; two-column pages
# print Q&As right of SIDEBAR_X, with their Q/A labels left of LABEL_MARGIN_X.
BODY_TOP = 30.0
BODY_BOTTOM = 565.0
SIDEBAR_X = 455.0
LABEL_MARGIN_X = 485.0
TWO_COLUMN_PAGES = frozenset(
    (6, 17, 19, 20, 21, 22, 23, 25, 26, 27, 29, 30, 32, 34, 35, 36, 37, 38, 39, 47, 49, 50, 54)
)
# Annex V prints a disclaimer box beside its last list items.
REGION_OVERRIDES = {
    77: ((0, BODY_TOP, None, 495), (0, 495, 440, BODY_BOTTOM), (440, 495, None, BODY_BOTTOM)),
}
# Pages compared in order, and annex table pages compared as token counts.
SEGMENTS = (
    ("sequence", (2, *range(5, 72))),
    ("counts", (72, 73, 74, 75)),
    ("sequence", (76, 77)),
    ("counts", (78,)),
    ("sequence", (79, 80)),
)
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
    62: "MedTech Europe Code of Ethical Business Practice Part 2: Complaint handling and dispute resolution",
    67: "MedTech Europe Code of Ethical Business Practice Part 3: Glossary and Definitions",
}
TITLE_SIZE = 20.0  # display titles print at 26pt and 47pt
TITLE_BODY_SIZE = 8.5  # title-page text prints at 9.4pt; the hidden title copy at 7.5pt
BANNERS = {
    "MEDTECH EUROPE – CODE OF ETHICAL BUSINESS PRACTICE",
    "MEDTECH EUROPE – CODE OF ETHICAL BUSINESS PRACTICE QUESTIONS AND ANSWERS",
}
RUNNING_HEADERS = {
    "CONTENT",
    "SCOPE",
    "ADMINISTERING THE CODE",
    "INTRODUCTION",
    "CHAPTER 1: GENERAL CRITERIA FOR EVENT",
    "CHAPTER 2: THIRD PARTY ORGANISED EDUCATIONAL EVENTS",
    "CHAPTER 3: COMPANY EVENTS",
    "CHAPTER 4: GRANTS AND CHARITABLE DONATIONS",
    "CHAPTER 4: CONSULTING ARRANGEMENTS",  # sic: the PDF's own running header
    "CHAPTER 6: RESEARCH",
    "CHAPTER 7: ROYALTIES",
    "CHAPTER 8: EDUCATIONAL ITEMS AND PROMOTIONAL ITEMS",
    "CHAPTER 9: DEMONSTRATION PRODUCTS AND SAMPLES",
    "CHAPTER 10: THIRD PARTY INTERMEDIARIES",
    "PART 2: COMPLAINT HANDLING AND DISPUTE RESOLUTION",
    "PART 3: Glossary and Definitions",
    "PART 3: Annexes",
}

TOKEN_RE = re.compile(r"\w+(?:[’']\w+)*|[^\w\s]")
QA_LABEL_RE = re.compile(r"[QA]\d+")
SUPERSCRIPT_RATIO = 0.75  # glyphs this much smaller than their line are superscripts


class VerificationError(Exception):
    pass


@dataclass(frozen=True)
class Token:
    text: str
    sup: bool
    space: bool | None  # whitespace before it; None at a line or paragraph start
    page: int
    opens: bool = False  # first token of a DOCX paragraph, or of a PDF page's text

    @property
    def key(self) -> tuple[str, bool]:
        return self.text, self.sup


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest().upper()


def normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text or "").strip()


def tokenize(text: str, sup_flags: list[bool], page: int) -> list[Token]:
    """Words and punctuation; a superscript is its own token even where it touches a word."""
    tokens = []
    run_start = 0
    for index in range(1, len(text) + 1):
        if index < len(text) and sup_flags[index] == sup_flags[run_start]:
            continue
        for match in TOKEN_RE.finditer(text, run_start, index):
            start = match.start()
            space = None if not text[:start].strip() else text[start - 1].isspace()
            tokens.append(Token(match.group(), sup_flags[run_start], space, page))
        run_start = index
    return tokens


def tokenize_plain(text: str, page: int = 0) -> list[Token]:
    return tokenize(text, [False] * len(text), page)


def describe(tokens: list[Token]) -> str:
    return " ".join(f"^{token.text}" if token.sup else token.text for token in tokens)


# ---------------------------------------------------------------------------- PDF


def line_tokens(line: dict, page: int) -> list[Token]:
    text = line["text"]
    glyphs = [char for char in line["chars"] if char["text"].strip()]
    if [glyph["text"] for glyph in glyphs] != [char for char in text if not char.isspace()]:
        raise VerificationError(f"Page {page}: glyphs do not match line text {text!r}")
    size = statistics.median(glyph["size"] for glyph in glyphs)
    flags, index = [], 0
    for char in text:
        if char.isspace():
            flags.append(False)
            continue
        flags.append(glyphs[index]["size"] < size * SUPERSCRIPT_RATIO)
        index += 1
    return tokenize(text, flags, page)


def text_lines(page) -> list[dict]:
    return [
        line
        for line in page.extract_text_lines(strip=True, return_chars=True)
        if line["text"].strip()
    ]


def check_furniture(page, number: int) -> int:
    count = 0
    for line in text_lines(page):
        top, bottom = line["top"], line["bottom"]
        if top >= BODY_TOP and bottom <= BODY_BOTTOM:
            continue
        text = normalize(line["text"])
        header = re.fullmatch(rf"(.+) {number}", text)
        if bottom < BODY_TOP and text in BANNERS:
            count += 1
        elif top > BODY_BOTTOM and header and header.group(1) in RUNNING_HEADERS:
            count += 1
        else:
            raise VerificationError(f"Page {number}: unexpected text outside the body: {text!r}")
    return count


def regions(page, number: int) -> list[tuple[str, tuple[float, float, float, float]]]:
    width = float(page.width)
    if number in REGION_OVERRIDES:
        return [
            ("note" if index == 2 else "main", (x0, top, width if x1 is None else x1, bottom))
            for index, (x0, top, x1, bottom) in enumerate(REGION_OVERRIDES[number])
        ]
    if number in TWO_COLUMN_PAGES:
        body = page.crop((0, BODY_TOP, width, BODY_BOTTOM))
        if any(char["x0"] < SIDEBAR_X < char["x1"] for char in body.chars if char["text"].strip()):
            raise VerificationError(f"Page {number}: text crosses the Q&A column edge")
        return [
            ("main", (0, BODY_TOP, SIDEBAR_X, BODY_BOTTOM)),
            ("side", (SIDEBAR_X, BODY_TOP, width, BODY_BOTTOM)),
        ]
    return [("main", (0, BODY_TOP, width, BODY_BOTTOM))]


def title_page_tokens(page, number: int) -> list[Token]:
    title = MAJOR_TITLES[number]
    body = page.crop((0, BODY_TOP, float(page.width), BODY_BOTTOM))
    display = body.filter(lambda item: item.get("size", 0) >= TITLE_SIZE)
    hidden = body.filter(lambda item: 0 < item.get("size", 0) < TITLE_BODY_SIZE)
    for name, part in (("display", display), ("hidden", hidden)):
        found = normalize(part.extract_text())
        if found != title:
            raise VerificationError(f"Page {number}: {name} title {found!r} is not {title!r}")
    text = body.filter(lambda item: TITLE_BODY_SIZE <= item.get("size", 0) < TITLE_SIZE)
    tokens = tokenize_plain(title, number)
    for line in text_lines(text):
        tokens.extend(line_tokens(line, number))
    return tokens


def pdf_page_tokens(page, number: int, labels: list[tuple[str, int]]) -> list[Token]:
    if number in MAJOR_TITLES:
        tokens = title_page_tokens(page, number)
    else:
        tokens = []
        for column, bbox in regions(page, number):
            for line in text_lines(page.crop(bbox)):
                found = line_tokens(line, number)
                if (
                    column == "side"
                    and line["x0"] < LABEL_MARGIN_X
                    and QA_LABEL_RE.fullmatch(found[0].text)
                ):
                    labels.append((found[0].text, number))
                    found = found[1:]
                    if found:
                        found[0] = Token(found[0].text, found[0].sup, None, number)
                tokens.extend(found)
    if tokens:
        first = tokens[0]
        tokens[0] = Token(first.text, first.sup, first.space, first.page, opens=True)
    return tokens


# --------------------------------------------------------------------------- DOCX


def bullet_levels(document) -> dict[str, dict[int, tuple[str, str]]]:
    root = document.part.numbering_part.element
    abstracts = {}
    for abstract in root.findall(qn("w:abstractNum")):
        levels = {}
        for level in abstract.findall(qn("w:lvl")):
            number_format = level.find(qn("w:numFmt"))
            text = level.find(qn("w:lvlText"))
            levels[int(level.get(qn("w:ilvl")))] = (
                "" if number_format is None else number_format.get(qn("w:val")),
                "" if text is None else text.get(qn("w:val")),
            )
        abstracts[abstract.get(qn("w:abstractNumId"))] = levels
    numbers = {}
    for number in root.findall(qn("w:num")):
        if number.find(qn("w:lvlOverride")) is not None:
            raise VerificationError("Numbering level overrides are not expected")
        numbers[number.get(qn("w:numId"))] = abstracts[
            number.find(qn("w:abstractNumId")).get(qn("w:val"))
        ]
    return numbers


def paragraph_chars(paragraph) -> list[tuple[str, bool]]:
    chars = []
    for run in paragraph.iter(qn("w:r")):
        properties = run.find(qn("w:rPr"))
        alignment = None if properties is None else properties.find(qn("w:vertAlign"))
        sup = alignment is not None and alignment.get(qn("w:val")) == "superscript"
        for child in run:
            if child.tag == qn("w:t"):
                chars.extend((char, sup) for char in child.text or "")
            elif child.tag in (qn("w:tab"), qn("w:br"), qn("w:cr")):
                chars.append((" ", False))
    return chars


@dataclass
class DocxStream:
    tokens: dict[int, list[Token]]  # by segment index
    labels: list[tuple[str, int]]
    bookmarks: set[int]
    title_paragraphs: dict[int, tuple[str, str]]  # page -> (style, text)


def segment_of(page: int) -> int:
    for index, (_, pages) in enumerate(SEGMENTS):
        if page in pages:
            return index
    raise VerificationError(f"Page {page} belongs to no compared segment")


def docx_stream(document) -> DocxStream:
    style_names = {style.style_id: style.name for style in document.styles}
    numbering = bullet_levels(document)
    stream = DocxStream({}, [], set(), {})
    started = False
    page = 2
    paragraph_elements = []
    for child in document.element.body.iterchildren():
        if child.tag == qn("w:p"):
            paragraph_elements.append(child)
        elif child.tag == qn("w:tbl"):
            paragraph_elements.extend(child.iter(qn("w:p")))
    for paragraph in paragraph_elements:
        names = [node.get(qn("w:name"), "") for node in paragraph.iter(qn("w:bookmarkStart"))]
        pages = [int(name[9:]) for name in names if re.fullmatch(r"pdf_page_\d{3}", name)]
        stream.bookmarks.update(pages)
        chars = paragraph_chars(paragraph)
        text = "".join(char for char, _ in chars)
        if not started:
            if 2 not in pages:
                continue
            started = True
        if normalize(text) == EDITORIAL_END:
            return stream
        page = max([page, *pages])
        style_node = paragraph.find(f"{qn('w:pPr')}/{qn('w:pStyle')}")
        style = style_names.get(style_node.get(qn("w:val")), "") if style_node is not None else ""
        for number in pages:
            if number in MAJOR_TITLES:
                stream.title_paragraphs[number] = (style, normalize(text))
        numbering_properties = paragraph.find(f"{qn('w:pPr')}/{qn('w:numPr')}")
        if numbering_properties is not None:
            number_id = numbering_properties.find(qn("w:numId")).get(qn("w:val"))
            level = int(numbering_properties.find(qn("w:ilvl")).get(qn("w:val")))
            number_format, glyph = numbering[number_id][level]
            if number_format != "bullet":
                raise VerificationError(f"Automatic {number_format} numbering: {text[:60]!r}")
            chars = [(char, False) for char in f"{glyph} "] + chars
            text = "".join(char for char, _ in chars)
        tokens = tokenize(text, [sup for _, sup in chars], page)
        if not tokens:
            continue
        if style in ("Code Question", "Code Answer"):
            if QA_LABEL_RE.fullmatch(tokens[0].text):
                if (tokens[0].text[0] == "Q") != (style == "Code Question"):
                    raise VerificationError(f"{tokens[0].text} is styled {style}")
                stream.labels.append((tokens[0].text, page))
                tokens = tokens[1:]
            elif style == "Code Question":
                raise VerificationError(f"Question without a Q label: {text[:60]!r}")
        if not tokens:
            continue
        first = tokens[0]
        tokens[0] = Token(first.text, first.sup, None, first.page, opens=True)
        stream.tokens.setdefault(segment_of(page), []).extend(tokens)
    raise VerificationError(f"The DOCX has no {EDITORIAL_END!r} section")


def correction_rows(document) -> list[tuple[int, str, str]]:
    rows = []
    for row in document.tables[-1].rows[1:]:
        values = [normalize(cell.text) for cell in row.cells]
        if len(values) != 4 or not values[0].isdigit():
            raise VerificationError(f"Malformed correction row: {values}")
        rows.append((int(values[0]), values[1], values[2]))
    return rows


# ------------------------------------------------------------------ comparison


def apply_in_sequence(tokens: list[Token], page: int, source: str, corrected: str) -> list[Token]:
    wanted = tokenize_plain(source)
    hits = [
        start
        for start in range(len(tokens) - len(wanted) + 1)
        if all(
            token.page == page
            and not token.sup
            and token.text == want.text
            and (offset == 0 or token.space is None or token.space == want.space)
            for offset, (token, want) in enumerate(zip(tokens[start : start + len(wanted)], wanted))
        )
    ]
    if len(hits) != 1:
        raise VerificationError(f"Page {page}: correction source {source!r} matched {len(hits)} times")
    start = hits[0]
    replacement = tokenize_plain(corrected, page)
    replacement[0] = Token(replacement[0].text, False, tokens[start].space, page, tokens[start].opens)
    return tokens[:start] + replacement + tokens[start + len(wanted) :]


def apply_in_counts(counts: Counter, page: int, source: str, corrected: str) -> None:
    removed = Counter(token.key for token in tokenize_plain(source))
    if removed - counts:
        raise VerificationError(f"Page {page}: correction source {source!r} not found")
    counts.subtract(removed)
    counts.update(token.key for token in tokenize_plain(corrected))


def placements(tokens: list[Token], start: int, end: int) -> list[tuple[int, int]]:
    """Equivalent places for a deleted or inserted run: a diff may report any of them."""
    found = [(start, end)]
    low, high = start, end
    while low > 0 and tokens[low - 1].key == tokens[high - 1].key:
        low, high = low - 1, high - 1
        found.append((low, high))
    low, high = start, end
    while high < len(tokens) and tokens[low].key == tokens[high].key:
        low, high = low + 1, high + 1
        found.append((low, high))
    return found


def compare_sequence(pdf: list[Token], docx: list[Token]) -> tuple[list[str], list[str]]:
    matcher = SequenceMatcher(None, [t.key for t in pdf], [t.key for t in docx], autojunk=False)
    failures, moves = [], []
    deleted, inserted = [], []

    def check_spacing(i1: int, j1: int, size: int) -> None:
        for offset in range(size):
            a, b = pdf[i1 + offset], docx[j1 + offset]
            if a.space is not None and b.space is not None and a.space != b.space:
                where = "missing" if a.space else "extra"
                shown = describe(pdf[max(0, i1 + offset - 6) : i1 + offset + 4])
                failures.append(f"page {a.page}: {where} space before {a.text!r} in: {shown}")

    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == "equal":
            check_spacing(i1, j1, i2 - i1)
            continue
        if i2 > i1:
            deleted.append((i1, i2))
        if j2 > j1:
            inserted.append((j1, j2))
    for deletion in list(deleted):
        # A page-break continuation opens a PDF page and continues a DOCX paragraph.
        match = next(
            (
                (insertion, i1, j1)
                for insertion in inserted
                for i1, i2 in placements(pdf, *deletion)
                for j1, j2 in placements(docx, *insertion)
                if pdf[i1].opens
                and not docx[j1].opens
                and [t.key for t in pdf[i1:i2]] == [t.key for t in docx[j1:j2]]
            ),
            None,
        )
        if match:
            insertion, i1, j1 = match
            size = deletion[1] - deletion[0]
            deleted.remove(deletion)
            inserted.remove(insertion)
            check_spacing(i1 + 1, j1 + 1, size - 1)
            moves.append(f"page {pdf[i1].page}: {describe(pdf[i1 : i1 + size])[:70]}")
    for i1, i2 in deleted:
        failures.append(f"page {pdf[i1].page}: missing from DOCX: {describe(pdf[i1:i2])[:160]}")
    for j1, j2 in inserted:
        failures.append(f"page {docx[j1].page}: not in PDF: {describe(docx[j1:j2])[:160]}")
    return failures, moves


@dataclass
class PdfStream:
    pages: dict[int, list[Token]]
    labels: list[tuple[str, int]]
    furniture: int


def read_pdf(pdf_path: Path) -> PdfStream:
    if sha256(pdf_path) != SOURCE_SHA256:
        raise VerificationError("The PDF hash does not match the reviewed source.")
    labels: list[tuple[str, int]] = []
    with pdfplumber.open(pdf_path) as pdf:
        if len(pdf.pages) != 80:
            raise VerificationError(f"Expected 80 PDF pages; found {len(pdf.pages)}")
        furniture = sum(
            check_furniture(page, number) for number, page in enumerate(pdf.pages, start=1)
        )
        pages = {
            number: pdf_page_tokens(pdf.pages[number - 1], number, labels)
            for _, numbers in SEGMENTS
            for number in numbers
        }
    return PdfStream(pages, labels, furniture)


def compare(document, pdf: PdfStream) -> tuple[list[str], list[str]]:
    """(failures, summary) for a DOCX against the PDF's token streams."""
    corrections = correction_rows(document)
    stream = docx_stream(document)
    failures, summary = [], []

    missing_bookmarks = set(range(1, 81)) - stream.bookmarks
    if missing_bookmarks:
        failures.append(f"missing source-page bookmarks: {sorted(missing_bookmarks)}")
    for number, title in MAJOR_TITLES.items():
        style, text = stream.title_paragraphs.get(number, ("", ""))
        if (style, text) != ("Heading 1", title):
            failures.append(f"page {number}: bookmark is on {style or 'no'} paragraph {text!r}")

    applied = 0
    for index, (mode, pages) in enumerate(SEGMENTS):
        docx_tokens = stream.tokens.get(index, [])
        span = f"pages {pages[0]}-{pages[-1]}" if len(pages) > 1 else f"page {pages[0]}"
        if mode == "counts":
            counts = Counter(token.key for number in pages for token in pdf.pages[number])
            for page, source, corrected in corrections:
                if page in pages:
                    apply_in_counts(counts, page, source, corrected)
                    applied += 1
            found = Counter(token.key for token in docx_tokens)
            for label, difference in (("missing from DOCX", counts - found), ("not in PDF", found - counts)):
                if difference:
                    shown = ", ".join(
                        f"{'^' if sup else ''}{text}×{count}"
                        for (text, sup), count in difference.most_common(20)
                    )
                    failures.append(f"{span} {label}: {shown}")
            summary.append(f"{span}: {sum(counts.values())} tokens compared as counts")
            continue
        pdf_tokens = [token for number in pages for token in pdf.pages[number]]
        for page, source, corrected in corrections:
            if page in pages:
                pdf_tokens = apply_in_sequence(pdf_tokens, page, source, corrected)
                applied += 1
        found, moves = compare_sequence(pdf_tokens, docx_tokens)
        failures.extend(found)
        summary.append(
            f"{span}: {len(pdf_tokens)} tokens compared in order"
            + (f"; {len(moves)} page-break continuations" if moves else "")
        )
        summary.extend(f"    continuation {move}" for move in moves)

    if applied != len(corrections):
        failures.append(f"only {applied} of {len(corrections)} corrections are on compared pages")
    if [label for label, _ in pdf.labels] != [label for label, _ in stream.labels]:
        failures.append("Q&A label sequence differs between the PDF and the DOCX")
    summary.append(f"{len(pdf.labels)} Q&A labels in the same order, each opening its paragraph")
    digits = sum(t.sup for tokens in pdf.pages.values() for t in tokens if t.text.isdigit())
    summary.append(f"{digits} superscript footnote digits; {len(corrections)} documented corrections")
    summary.append(f"{pdf.furniture} header/footer lines; {len(MAJOR_TITLES)} title pages checked")
    return failures, summary


def verify(pdf_path: Path, docx_path: Path) -> list[str]:
    failures, summary = compare(Document(docx_path), read_pdf(pdf_path))
    for line in summary:
        print(line)
    return failures


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--pdf", type=Path, default=SOURCE_PDF)
    parser.add_argument("--docx", type=Path, default=SOURCE_DOCX)
    return parser.parse_args()


if __name__ == "__main__":
    arguments = parse_args()
    try:
        problems = verify(arguments.pdf.resolve(), arguments.docx.resolve())
    except VerificationError as error:
        problems = [str(error)]
    if problems:
        print(f"FAIL: {len(problems)} unexplained difference(s)")
        for problem in problems:
            print(f"  - {problem}")
        sys.exit(1)
    print("PASS: the DOCX matches the PDF word for word, apart from the documented corrections.")

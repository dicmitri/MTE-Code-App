#!/usr/bin/env python3
"""Build the editable MedTech Europe Code DOCX directly from the source PDF.

The PDF is the only content input. The split JSON chapters are deliberately not
read or imported. Obvious source typographical errors are corrected through the
explicit, page-scoped CORRECTIONS list below and recorded in the DOCX appendix.
"""

from __future__ import annotations

import argparse
import hashlib
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, Sequence

import pdfplumber
from docx import Document
from docx.enum.section import WD_ORIENT, WD_SECTION
from docx.enum.style import WD_STYLE_TYPE
from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor
from pypdf import PdfReader


PROJECT_ROOT = Path(__file__).resolve().parent.parent
SOURCE_PDF = PROJECT_ROOT / "src" / "data" / "code-september-2024 (1).pdf"
OUTPUT_DOCX = PROJECT_ROOT / "src" / "data" / "code-september-2024.docx"
SOURCE_SHA256 = "9ED658D0C9F858E35576C3905CC4423DF934DB894786F4C12D9A130E0602A148"

INK = RGBColor(0x20, 0x2A, 0x35)
MUTED = RGBColor(0x5E, 0x68, 0x75)
HEADING_BLUE = RGBColor(0x2E, 0x74, 0xB5)
HEADING_DARK_BLUE = RGBColor(0x1F, 0x4D, 0x78)
QUESTION_PURPLE = RGBColor(0x76, 0x54, 0xA1)
TEAL = RGBColor(0x00, 0x7A, 0x86)
LIGHT_BLUE = "E8EEF5"
LIGHT_GRAY = "F2F4F7"
NOTE_FILL = "F4F6F9"
TABLE_BORDER = "AAB4C0"

STANDARD_HEADER = "MEDTECH EUROPE – CODE OF ETHICAL BUSINESS PRACTICE"
QUESTIONS_HEADER = (
    "MEDTECH EUROPE – CODE OF ETHICAL BUSINESS PRACTICE QUESTIONS AND ANSWERS"
)


@dataclass(frozen=True)
class Correction:
    page: int
    pattern: str
    replacement: str
    original: str
    reason: str
    flags: int = 0


CORRECTIONS = (
    Correction(7, r"\bsponsorhip\b", "sponsorship", "sponsorhip", "Spelling"),
    Correction(
        7,
        r"\bProfessionalsthe\b",
        "Professionals the",
        "Professionalsthe",
        "Joined words",
    ),
    Correction(
        8,
        r"from the date of\s+the date of the change",
        "from the date of the change",
        "from the date of the date of the change",
        "Duplicated words",
    ),
    Correction(
        8,
        r"Assembly\.\.",
        "Assembly.",
        "Assembly..",
        "Duplicated punctuation",
    ),
    Correction(
        16,
        r"\bMedicalTechnologies\b",
        "Medical Technologies",
        "MedicalTechnologies",
        "Joined words",
    ),
    Correction(
        18,
        r"\bwith the the requirements\b",
        "with the requirements",
        "with the the requirements",
        "Duplicated word",
    ),
    Correction(
        22,
        r"\bCompanyMedical\b",
        "Company Medical",
        "CompanyMedical",
        "Joined words",
    ),
    Correction(
        22,
        r"\b7 \. Virtual Events\b",
        "7. Virtual Events",
        "7 . Virtual Events",
        "Numbering punctuation",
    ),
    Correction(
        26,
        r"a larger Third Party Organised Educational Conferences",
        "a larger Third Party Organised Educational Conference",
        "a larger Third Party Organised Educational Conferences",
        "Singular agreement",
    ),
    Correction(27, r"\bKkind\b", "Kind", "Kkind", "Spelling"),
    Correction(35, r"\bTechnoloy\b", "Technology", "Technoloy", "Spelling"),
    Correction(
        37,
        r"However,Member Ccompanies",
        "However, Member Companies",
        "However,Member Ccompanies",
        "Spacing and spelling",
    ),
    Correction(37, r"\bcritera\b", "criteria", "critera", "Spelling"),
    Correction(
        39,
        r"\bCompanyMedical\b",
        "Company Medical",
        "CompanyMedical",
        "Joined words",
    ),
    Correction(
        40,
        r"\bCcompany-organised\b",
        "Company-organised",
        "Ccompany-organised",
        "Spelling",
    ),
    Correction(
        48,
        r"\bethicalrequirements\b",
        "ethical requirements",
        "ethicalrequirements",
        "Joined words",
    ),
    Correction(49, r"\basFaculty\b", "as Faculty", "asFaculty", "Joined words"),
    Correction(
        49,
        r"\(“Glossary’\)",
        "(“Glossary”)",
        "(“Glossary’)",
        "Mismatched quotation mark",
    ),
    Correction(49, r"\byhird party-", "third party-", "yhird party-", "Spelling"),
    Correction(
        50,
        r"\bMember\s+company\s+to\s+conduct\s+collaborative\s+research\b",
        "Member Company to conduct collaborative research",
        "Member company to conduct collaborative research",
        "Defined-term capitalization",
    ),
    Correction(
        50,
        r"\bis clear expressed\b",
        "is clearly expressed",
        "is clear expressed",
        "Grammar",
    ),
    Correction(
        54,
        r"\bChapter 8\.Educational\b",
        "Chapter 8. Educational",
        "Chapter 8.Educational",
        "Missing space",
    ),
    Correction(54, r"\bPromotionl\b", "Promotional", "Promotionl", "Spelling"),
    Correction(57, r"\bMedica;l\b", "Medical", "Medica;l", "Spelling"),
    Correction(
        61,
        r"\bMember companies should encourage\b",
        "Member Companies should encourage",
        "Member companies should encourage",
        "Defined-term capitalization",
    ),
    Correction(
        61,
        r"\bapplicable applicable\b",
        "applicable",
        "applicable applicable",
        "Duplicated word",
    ),
    Correction(
        64,
        r"\blaid down in in this section\b",
        "laid down in this section",
        "laid down in in this section",
        "Duplicated word",
    ),
    Correction(
        71,
        r"\ba Members Company’s medical\b",
        "a Member Company’s medical",
        "a Members Company’s medical",
        "Defined-term spelling",
    ),
    Correction(
        73,
        r"\bdirectlyby\b",
        "directly by",
        "directlyby",
        "Joined words",
    ),
    Correction(
        76,
        r"agreement, the Member Company\.\s+- Should",
        "agreement, the Member Company:\n- Should",
        "agreement, the Member Company. - Should",
        "List-introducing punctuation",
    ),
    Correction(
        77,
        r"\bcountries specificities\b",
        "country specificities",
        "countries specificities",
        "Grammar",
    ),
    Correction(
        78,
        r"\bThird\s+Third\s+Party Organised Educational Event\b",
        "Third Party Organised Educational Event",
        "Third Third Party Organised Educational Event",
        "Duplicated word",
    ),
    Correction(
        78,
        r"\bit is a thirdpParty chooses\b",
        "a third party chooses",
        "it is a thirdpParty chooses",
        "Joined word and grammar",
    ),
    Correction(
        78,
        r"\bthird pParty\b",
        "third party",
        "third pParty",
        "Spelling",
    ),
    Correction(79, r"\b3D rending\b", "3D rendering", "3D rending", "Spelling"),
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
    62: (
        "MedTech Europe Code of Ethical Business Practice Part 2: "
        "Complaint handling and dispute resolution"
    ),
    67: (
        "MedTech Europe Code of Ethical Business Practice Part 3: "
        "Glossary and Definitions"
    ),
    72: "Part 3: Annexes",
}

COVER_BODY_STARTS = {
    9: "Part 2 of the Code includes",
    18: "Member Companies may directly finance",
}

RUNNING_HEADERS = {
    **{page: "SCOPE" for page in range(6, 9)},
    **{page: "ADMINISTERING THE CODE" for page in range(10, 14)},
    **{page: "INTRODUCTION" for page in range(15, 18)},
    **{page: "CHAPTER 1: GENERAL CRITERIA FOR EVENT" for page in range(19, 24)},
    **{
        page: "CHAPTER 2: THIRD PARTY ORGANISED EDUCATIONAL EVENTS"
        for page in range(25, 28)
    },
    **{page: "CHAPTER 3: COMPANY EVENTS" for page in range(29, 33)},
    **{
        page: "CHAPTER 4: GRANTS AND CHARITABLE DONATIONS"
        for page in range(34, 41)
    },
    **{page: "CHAPTER 4: CONSULTING ARRANGEMENTS" for page in range(42, 46)},
    **{page: "CHAPTER 6: RESEARCH" for page in range(47, 51)},
    52: "CHAPTER 7: ROYALTIES",
    **{
        page: "CHAPTER 8: EDUCATIONAL ITEMS AND PROMOTIONAL ITEMS"
        for page in range(54, 56)
    },
    **{
        page: "CHAPTER 9: DEMONSTRATION PRODUCTS AND SAMPLES"
        for page in range(57, 59)
    },
    **{
        page: "CHAPTER 10: THIRD PARTY INTERMEDIARIES"
        for page in range(60, 62)
    },
    **{
        page: "PART 2: COMPLAINT HANDLING AND DISPUTE RESOLUTION"
        for page in range(63, 67)
    },
    **{page: "PART 3: Glossary and Definitions" for page in range(68, 72)},
    **{page: "PART 3: Annexes" for page in range(72, 81)},
}

ADDITIONAL_HEADINGS = {
    "About MedTech Europe",
    "Promoting a balanced policy environment",
    "Demonstrating the value of medical technology",
    "Promoting an Ethical Industry",
    "Key Legislation",
    "Aims and Principles of the Code",
    "1. Tasks",
    "2. Composition",
    "3. MedTech Europe Compliance Panel Internal Procedural Rules",
    "2.1 New Member Companies",
    "2.2 New Association Members",
    "Advancement of Medical Technologies",
    "Safe and Effective Use of Medical Technology",
    "Research and Education",
    "Risk Assessment",
    "Due diligence",
    "Training",
    "Written Contract",
    "Oversight",
    "Appropriate Corrective Action",
    "Description:",
    "Guidance:",
    "What is an In-Kind Educational Grant?",
    "Types of In-Kind Educational Grant",
    "Value of In Kind Contributions",
    "Countries with National Associations:",
    (
        "Countries party to the European Economic Area agreement without a "
        "MedTech Europe National Association:"
    ),
    "Verification Of The Use Of Funds",
    "Annex IV",
    "Annex V",
    "ANNEX VII",
    (
        "The Criteria Applicable to Third Party Organised Procedure Trainings "
        "(Effective as of 3rd September 2018)"
    ),
    (
        "How can a Member Company verify that the Educational Grant is in fact "
        "used for the intended purpose as agreed in the Educational Grant agreement?"
    ),
    (
        "Grant to support Healthcare Professionals’ attendance at the Third Party "
        "Organised Educational Event:"
    ),
    (
        "Grant to support the costs related to organisation of the Third Party "
        "Organised Educational Event:"
    ),
    "Grant provided in a form of a Scholarship or Fellowship:",
    "Methodology Note Example",
    "Structure",
    "Disclosure scope and timelines",
    "Disclosures in case of partial performance or cancellation",
    "Cross-border activities",
    "Specific considerations:",
    "The Criteria Applicable to Third Party Organised Procedure Trainings",
    "CRITERIA FOR TPPT DETERMINATION",
    "1. Programme:",
    "2. Venue:",
    "3. Stand-alone event:",
    "4. Size:",
}

TERMINAL_RE = re.compile(r'[.!?;:](?:["”’\)])?$')
QUESTION_RE = re.compile(r"^Q\d+\b")
ANSWER_RE = re.compile(r"^A\d+\b")
LETTER_LIST_RE = re.compile(r"^([a-h])\.\s+(.*)$", re.IGNORECASE)
ROMAN_LIST_RE = re.compile(r"^(i{1,3}|iv|v|vi|vii)\s{2,}(.*)$", re.IGNORECASE)
DECIMAL_LIST_RE = re.compile(r"^(\d+)\.\s+(.*)$")
CLAUSE_RE = re.compile(r"^\d+\.\d+(?:\.\d+)?\.?\s")
SECTION_HEADING_RE = re.compile(r"^\d+\.\s+\D")
FOOTNOTE_RE = re.compile(r"^\d+\)\s+")


@dataclass
class Block:
    kind: str
    text: str
    page: int
    level: int = 0


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest().upper()


def normalize_space(text: str) -> str:
    return re.sub(r"[ \t]+", " ", text).strip()


def join_wrapped(left: str, right: str) -> str:
    left = left.rstrip()
    right = right.lstrip()
    if not left:
        return right
    if not right:
        return left
    if left.endswith(("-", "/", "–")):
        return left + right
    return f"{left} {right}"


def apply_page_corrections(page_number: int, text: str) -> str:
    for correction in (item for item in CORRECTIONS if item.page == page_number):
        text, count = re.subn(
            correction.pattern,
            correction.replacement,
            text,
            count=1,
            flags=correction.flags,
        )
        if count != 1:
            raise ValueError(
                f"Page {page_number}: correction did not match exactly once: "
                f"{correction.original!r} (matched {count})"
            )
    return text


def cleaned_page_lines(page_number: int, raw_text: str) -> list[str]:
    corrected = apply_page_corrections(page_number, raw_text)
    lines = [normalize_space(line) for line in corrected.splitlines()]
    lines = [line for line in lines if line]

    while lines and lines[0] in {STANDARD_HEADER, QUESTIONS_HEADER}:
        lines.pop(0)
    if lines and lines[0] == str(page_number):
        lines.pop(0)
    running_header = RUNNING_HEADERS.get(page_number)
    if lines and running_header and lines[0].casefold() == running_header.casefold():
        lines.pop(0)
    return split_inline_heading_lines(lines)


def split_inline_heading_lines(lines: Sequence[str]) -> list[str]:
    prefixes = ("2. Venue:", "3. Stand-alone event:", "4. Size:")
    result = []
    for line in lines:
        matched = False
        for prefix in prefixes:
            if line.startswith(prefix) and line != prefix:
                result.extend([prefix, normalize_space(line[len(prefix) :])])
                matched = True
                break
        if not matched:
            result.append(line)
    return result


def extract_toc_headings(reader: PdfReader) -> set[str]:
    headings = set(ADDITIONAL_HEADINGS)
    for page_number in (3, 4):
        for line in cleaned_page_lines(
            page_number, reader.pages[page_number - 1].extract_text() or ""
        ):
            if line in {"CONTENT", "Table of Contents"}:
                continue
            match = re.match(r"^(.*?)\s+\d+$", line)
            if match:
                value = normalize_space(match.group(1))
                if value:
                    headings.add(value)
    return headings


def strip_cover_text(page_number: int, lines: Sequence[str]) -> list[str]:
    body_start = COVER_BODY_STARTS.get(page_number)
    if body_start is None:
        return []
    for index, line in enumerate(lines):
        if line.startswith(body_start):
            return list(lines[index:])
    raise ValueError(f"Page {page_number}: cover body start not found: {body_start}")


def match_heading(
    lines: Sequence[str], start: int, headings: set[str]
) -> tuple[str, int] | None:
    lookup = {heading.casefold(): heading for heading in headings}
    for width in (3, 2, 1):
        if start + width > len(lines):
            continue
        candidate = normalize_space(" ".join(lines[start : start + width]))
        canonical = lookup.get(candidate.casefold())
        if canonical:
            return canonical, width
    return None


def is_boundary(line: str, headings: set[str]) -> bool:
    if not line:
        return True
    if line in headings:
        return True
    return bool(
        QUESTION_RE.match(line)
        or ANSWER_RE.match(line)
        or LETTER_LIST_RE.match(line)
        or ROMAN_LIST_RE.match(line)
        or DECIMAL_LIST_RE.match(line)
        or line.startswith(("• ", "■ ", "- "))
        or (
            SECTION_HEADING_RE.match(line)
            and len(line.split()) <= 14
            and not CLAUSE_RE.match(line)
        )
    )


def collect_wrapped(
    lines: Sequence[str],
    start: int,
    headings: set[str],
    *,
    stop_on_terminal: bool,
) -> tuple[str, int]:
    text = lines[start]
    index = start + 1
    while index < len(lines):
        if is_boundary(lines[index], headings):
            break
        if stop_on_terminal and TERMINAL_RE.search(text):
            break
        text = join_wrapped(text, lines[index])
        index += 1
    return text, index - start


def parse_blocks(
    page_number: int, lines: Sequence[str], headings: set[str]
) -> list[Block]:
    blocks: list[Block] = []
    index = 0
    while index < len(lines):
        heading_match = match_heading(lines, index, headings)
        if heading_match:
            text, consumed = heading_match
            level = 3 if re.match(r"^\d+\.\s", text) else 2
            blocks.append(Block("heading", text, page_number, level))
            index += consumed
            continue

        line = lines[index]
        if QUESTION_RE.match(line):
            text, consumed = collect_wrapped(
                lines, index, headings, stop_on_terminal=True
            )
            blocks.append(Block("question", text, page_number))
            index += consumed
            continue
        if ANSWER_RE.match(line):
            text, consumed = collect_wrapped(
                lines, index, headings, stop_on_terminal=True
            )
            blocks.append(Block("answer", text, page_number))
            index += consumed
            continue

        list_match = LETTER_LIST_RE.match(line)
        if list_match:
            text, consumed = collect_wrapped(
                [list_match.group(2), *lines[index + 1 :]],
                0,
                headings,
                stop_on_terminal=True,
            )
            blocks.append(Block("lower_letter", text, page_number))
            index += consumed
            continue

        roman_match = ROMAN_LIST_RE.match(line)
        if roman_match:
            text, consumed = collect_wrapped(
                [roman_match.group(2), *lines[index + 1 :]],
                0,
                headings,
                stop_on_terminal=True,
            )
            blocks.append(Block("lower_roman", text, page_number))
            index += consumed
            continue

        decimal_match = DECIMAL_LIST_RE.match(line)
        if decimal_match:
            text, consumed = collect_wrapped(
                [decimal_match.group(2), *lines[index + 1 :]],
                0,
                headings,
                stop_on_terminal=True,
            )
            blocks.append(Block("decimal", text, page_number))
            index += consumed
            continue

        if line.startswith(("• ", "■ ", "- ")):
            marker = line[0]
            text, consumed = collect_wrapped(
                [line[2:], *lines[index + 1 :]],
                0,
                headings,
                stop_on_terminal=True,
            )
            level = 1 if marker == "•" and blocks and blocks[-1].kind == "bullet" else 0
            blocks.append(Block("bullet", text, page_number, level))
            index += consumed
            continue

        if FOOTNOTE_RE.match(line):
            text, consumed = collect_wrapped(
                lines, index, headings, stop_on_terminal=True
            )
            blocks.append(Block("footnote", text, page_number))
            index += consumed
            continue

        text, consumed = collect_wrapped(
            lines, index, headings, stop_on_terminal=True
        )
        kind = "clause" if CLAUSE_RE.match(text) else "body"
        blocks.append(Block(kind, text, page_number))
        index += consumed
    return blocks


def set_run_font(
    run,
    *,
    name: str = "Calibri",
    size: float | None = None,
    color: RGBColor | None = None,
    bold: bool | None = None,
    italic: bool | None = None,
) -> None:
    run.font.name = name
    run._element.get_or_add_rPr().get_or_add_rFonts().set(qn("w:ascii"), name)
    run._element.get_or_add_rPr().get_or_add_rFonts().set(qn("w:hAnsi"), name)
    if size is not None:
        run.font.size = Pt(size)
    if color is not None:
        run.font.color.rgb = color
    if bold is not None:
        run.bold = bold
    if italic is not None:
        run.italic = italic


def configure_style(
    style,
    *,
    size: float,
    color: RGBColor,
    bold: bool = False,
    italic: bool = False,
    before: float = 0,
    after: float = 6,
    line_spacing: float = 1.25,
) -> None:
    style.font.name = "Calibri"
    style._element.get_or_add_rPr().get_or_add_rFonts().set(
        qn("w:ascii"), "Calibri"
    )
    style._element.get_or_add_rPr().get_or_add_rFonts().set(
        qn("w:hAnsi"), "Calibri"
    )
    style.font.size = Pt(size)
    style.font.color.rgb = color
    style.font.bold = bold
    style.font.italic = italic
    style.paragraph_format.space_before = Pt(before)
    style.paragraph_format.space_after = Pt(after)
    style.paragraph_format.line_spacing = line_spacing


def ensure_paragraph_style(document: Document, name: str):
    try:
        return document.styles[name]
    except KeyError:
        return document.styles.add_style(name, WD_STYLE_TYPE.PARAGRAPH)


def configure_styles(document: Document) -> None:
    configure_style(
        document.styles["Normal"], size=11, color=INK, after=6, line_spacing=1.25
    )
    configure_style(
        document.styles["Heading 1"],
        size=16,
        color=HEADING_BLUE,
        bold=True,
        before=18,
        after=10,
        line_spacing=1.0,
    )
    configure_style(
        document.styles["Heading 2"],
        size=13,
        color=HEADING_BLUE,
        bold=True,
        before=14,
        after=7,
        line_spacing=1.0,
    )
    configure_style(
        document.styles["Heading 3"],
        size=12,
        color=HEADING_DARK_BLUE,
        bold=True,
        before=10,
        after=5,
        line_spacing=1.0,
    )
    for heading_name in ("Heading 1", "Heading 2", "Heading 3"):
        document.styles[heading_name].paragraph_format.keep_with_next = True

    styles = {
        "Code Body": dict(size=11, color=INK),
        "Code Clause": dict(size=11, color=INK, after=8),
        "Code Question": dict(
            size=10.5, color=QUESTION_PURPLE, bold=True, before=8, after=3
        ),
        "Code Answer": dict(size=10.5, color=INK, before=0, after=7),
        "Code Footnote": dict(size=9, color=MUTED, after=4, line_spacing=1.1),
        "Code List": dict(size=11, color=INK, after=4),
        "Editorial Note": dict(
            size=10, color=MUTED, italic=True, after=6, line_spacing=1.15
        ),
        "Table Text": dict(size=9, color=INK, after=2, line_spacing=1.1),
        "Table Header": dict(
            size=9, color=INK, bold=True, after=2, line_spacing=1.05
        ),
    }
    for name, tokens in styles.items():
        configure_style(ensure_paragraph_style(document, name), **tokens)


def set_section_geometry(section, *, landscape: bool = False) -> None:
    if landscape:
        section.orientation = WD_ORIENT.LANDSCAPE
        section.page_width = Inches(11)
        section.page_height = Inches(8.5)
    else:
        section.orientation = WD_ORIENT.PORTRAIT
        section.page_width = Inches(8.5)
        section.page_height = Inches(11)
    section.top_margin = Inches(1)
    section.right_margin = Inches(1)
    section.bottom_margin = Inches(1)
    section.left_margin = Inches(1)
    section.header_distance = Inches(0.492)
    section.footer_distance = Inches(0.492)


def add_field(paragraph, instruction: str, placeholder: str = "") -> None:
    run = paragraph.add_run()
    begin = OxmlElement("w:fldChar")
    begin.set(qn("w:fldCharType"), "begin")
    instruction_element = OxmlElement("w:instrText")
    instruction_element.set(qn("xml:space"), "preserve")
    instruction_element.text = instruction
    separate = OxmlElement("w:fldChar")
    separate.set(qn("w:fldCharType"), "separate")
    text = OxmlElement("w:t")
    text.text = placeholder
    end = OxmlElement("w:fldChar")
    end.set(qn("w:fldCharType"), "end")
    run._r.extend([begin, instruction_element, separate, text, end])


def configure_header_footer(section) -> None:
    section.header.is_linked_to_previous = False
    header = section.header
    paragraph = header.paragraphs[0]
    paragraph.alignment = WD_ALIGN_PARAGRAPH.LEFT
    paragraph.paragraph_format.space_after = Pt(0)
    run = paragraph.add_run(
        "MedTech Europe Code of Ethical Business Practice · September 2024"
    )
    set_run_font(run, size=8.5, color=MUTED)

    section.footer.is_linked_to_previous = False
    footer = section.footer
    paragraph = footer.paragraphs[0]
    paragraph.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    paragraph.paragraph_format.space_before = Pt(0)
    run = paragraph.add_run("Page ")
    set_run_font(run, size=8.5, color=MUTED)
    add_field(paragraph, "PAGE", "1")


def add_bookmark(paragraph, name: str, bookmark_id: int) -> None:
    start = OxmlElement("w:bookmarkStart")
    start.set(qn("w:id"), str(bookmark_id))
    start.set(qn("w:name"), name)
    end = OxmlElement("w:bookmarkEnd")
    end.set(qn("w:id"), str(bookmark_id))
    paragraph._p.insert(0, start)
    paragraph._p.append(end)


class NumberingManager:
    def __init__(self, document: Document):
        self.numbering = document.part.numbering_part.element
        self.abstract_ids: dict[str, int] = {}
        self.next_abstract_id = self._next_id("w:abstractNum", "w:abstractNumId")
        self.next_num_id = self._next_id("w:num", "w:numId")

    def _next_id(self, element_name: str, attribute_name: str) -> int:
        values = [
            int(element.get(qn(attribute_name)))
            for element in self.numbering.findall(qn(element_name))
            if element.get(qn(attribute_name)) is not None
        ]
        return max(values, default=0) + 1

    def abstract(self, kind: str) -> int:
        if kind in self.abstract_ids:
            return self.abstract_ids[kind]
        abstract_id = self.next_abstract_id
        self.next_abstract_id += 1
        abstract = OxmlElement("w:abstractNum")
        abstract.set(qn("w:abstractNumId"), str(abstract_id))
        multi = OxmlElement("w:multiLevelType")
        multi.set(qn("w:val"), "multilevel")
        abstract.append(multi)

        for level in range(2):
            lvl = OxmlElement("w:lvl")
            lvl.set(qn("w:ilvl"), str(level))
            start = OxmlElement("w:start")
            start.set(qn("w:val"), "1")
            num_fmt = OxmlElement("w:numFmt")
            marker = OxmlElement("w:lvlText")
            if kind == "bullet":
                num_fmt.set(qn("w:val"), "bullet")
                marker.set(qn("w:val"), "•" if level == 0 else "◦")
            elif kind == "lower_letter":
                num_fmt.set(qn("w:val"), "lowerLetter")
                marker.set(qn("w:val"), "%1.")
            elif kind == "decimal":
                num_fmt.set(qn("w:val"), "decimal")
                marker.set(qn("w:val"), "%1.")
            else:
                num_fmt.set(qn("w:val"), "lowerRoman")
                marker.set(qn("w:val"), "%1")
            lvl.append(start)
            lvl.append(num_fmt)
            lvl.append(marker)
            paragraph_properties = OxmlElement("w:pPr")
            tabs = OxmlElement("w:tabs")
            tab = OxmlElement("w:tab")
            tab.set(qn("w:val"), "num")
            tab.set(qn("w:pos"), str(540 + level * 360))
            tabs.append(tab)
            indentation = OxmlElement("w:ind")
            indentation.set(qn("w:left"), str(540 + level * 360))
            indentation.set(qn("w:hanging"), "270")
            paragraph_properties.append(tabs)
            paragraph_properties.append(indentation)
            lvl.append(paragraph_properties)
            abstract.append(lvl)
        self.numbering.append(abstract)
        self.abstract_ids[kind] = abstract_id
        return abstract_id

    def new_list(self, kind: str) -> int:
        num_id = self.next_num_id
        self.next_num_id += 1
        num = OxmlElement("w:num")
        num.set(qn("w:numId"), str(num_id))
        abstract_id = OxmlElement("w:abstractNumId")
        abstract_id.set(qn("w:val"), str(self.abstract(kind)))
        num.append(abstract_id)
        self.numbering.append(num)
        return num_id

    @staticmethod
    def apply(paragraph, num_id: int, level: int = 0) -> None:
        paragraph_properties = paragraph._p.get_or_add_pPr()
        num_properties = paragraph_properties.find(qn("w:numPr"))
        if num_properties is None:
            num_properties = OxmlElement("w:numPr")
            paragraph_properties.append(num_properties)
        ilvl = OxmlElement("w:ilvl")
        ilvl.set(qn("w:val"), str(level))
        num = OxmlElement("w:numId")
        num.set(qn("w:val"), str(num_id))
        num_properties.extend([ilvl, num])


def shade_cell(cell, fill: str) -> None:
    properties = cell._tc.get_or_add_tcPr()
    shading = properties.find(qn("w:shd"))
    if shading is None:
        shading = OxmlElement("w:shd")
        properties.append(shading)
    shading.set(qn("w:fill"), fill)


def set_cell_margins(cell, *, top=80, start=120, bottom=80, end=120) -> None:
    properties = cell._tc.get_or_add_tcPr()
    margins = properties.first_child_found_in("w:tcMar")
    if margins is None:
        margins = OxmlElement("w:tcMar")
        properties.append(margins)
    for tag, value in (("top", top), ("start", start), ("bottom", bottom), ("end", end)):
        node = margins.find(qn(f"w:{tag}"))
        if node is None:
            node = OxmlElement(f"w:{tag}")
            margins.append(node)
        node.set(qn("w:w"), str(value))
        node.set(qn("w:type"), "dxa")


def set_repeat_table_header(row) -> None:
    properties = row._tr.get_or_add_trPr()
    node = OxmlElement("w:tblHeader")
    node.set(qn("w:val"), "true")
    properties.append(node)


def set_table_geometry(table, widths_dxa: Sequence[int], indent_dxa: int = 120) -> None:
    table.autofit = False
    properties = table._tbl.tblPr
    width = properties.first_child_found_in("w:tblW")
    if width is None:
        width = OxmlElement("w:tblW")
        properties.append(width)
    width.set(qn("w:w"), str(sum(widths_dxa)))
    width.set(qn("w:type"), "dxa")
    indent = properties.first_child_found_in("w:tblInd")
    if indent is None:
        indent = OxmlElement("w:tblInd")
        properties.append(indent)
    indent.set(qn("w:w"), str(indent_dxa))
    indent.set(qn("w:type"), "dxa")

    grid = table._tbl.tblGrid
    for child in list(grid):
        grid.remove(child)
    for value in widths_dxa:
        column = OxmlElement("w:gridCol")
        column.set(qn("w:w"), str(value))
        grid.append(column)

    for row in table.rows:
        for cell, value in zip(row.cells, widths_dxa):
            cell.width = Inches(value / 1440)
            properties = cell._tc.get_or_add_tcPr()
            cell_width = properties.first_child_found_in("w:tcW")
            if cell_width is None:
                cell_width = OxmlElement("w:tcW")
                properties.append(cell_width)
            cell_width.set(qn("w:w"), str(value))
            cell_width.set(qn("w:type"), "dxa")
            cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
            set_cell_margins(cell)


def set_table_borders(table) -> None:
    properties = table._tbl.tblPr
    borders = properties.first_child_found_in("w:tblBorders")
    if borders is None:
        borders = OxmlElement("w:tblBorders")
        properties.append(borders)
    for edge in ("top", "left", "bottom", "right", "insideH", "insideV"):
        node = borders.find(qn(f"w:{edge}"))
        if node is None:
            node = OxmlElement(f"w:{edge}")
            borders.append(node)
        node.set(qn("w:val"), "single")
        node.set(qn("w:sz"), "4")
        node.set(qn("w:color"), TABLE_BORDER)


def clear_cell(cell) -> None:
    for paragraph in cell.paragraphs[1:]:
        paragraph._element.getparent().remove(paragraph._element)
    cell.paragraphs[0].clear()


def fill_cell(
    cell,
    text: str,
    numbering: NumberingManager,
    *,
    header: bool = False,
) -> None:
    clear_cell(cell)
    lines = [normalize_space(line) for line in (text or "").splitlines() if line.strip()]
    if not lines:
        return
    list_num = None
    for index, line in enumerate(lines):
        paragraph = cell.paragraphs[0] if index == 0 else cell.add_paragraph()
        paragraph.style = "Table Header" if header else "Table Text"
        list_level = None
        if line.startswith("• "):
            list_level = 0
        elif line.startswith("◦ "):
            list_level = 1
        if list_level is not None:
            if list_num is None:
                list_num = numbering.new_list("bullet")
            NumberingManager.apply(paragraph, list_num, list_level)
            line = line[2:]
        paragraph.add_run(line)


def add_table(
    document: Document,
    rows: Sequence[Sequence[str]],
    widths_dxa: Sequence[int],
    numbering: NumberingManager,
    *,
    header_rows: int = 1,
    fill: str = LIGHT_BLUE,
) -> object:
    table = document.add_table(rows=len(rows), cols=len(widths_dxa))
    set_table_geometry(table, widths_dxa)
    set_table_borders(table)
    for row_index, values in enumerate(rows):
        for column_index, value in enumerate(values):
            fill_cell(
                table.cell(row_index, column_index),
                value or "",
                numbering,
                header=row_index < header_rows,
            )
            if row_index < header_rows:
                shade_cell(table.cell(row_index, column_index), fill)
        if row_index < header_rows:
            set_repeat_table_header(table.rows[row_index])
    document.add_paragraph().paragraph_format.space_after = Pt(0)
    return table


def add_note_box(document: Document, title: str, body: str) -> None:
    table = document.add_table(rows=1, cols=1)
    set_table_geometry(table, [9360])
    set_table_borders(table)
    cell = table.cell(0, 0)
    shade_cell(cell, NOTE_FILL)
    clear_cell(cell)
    paragraph = cell.paragraphs[0]
    paragraph.paragraph_format.space_after = Pt(4)
    run = paragraph.add_run(title)
    set_run_font(run, size=10, color=HEADING_DARK_BLUE, bold=True)
    paragraph = cell.add_paragraph(style="Editorial Note")
    paragraph.add_run(body)
    document.add_paragraph().paragraph_format.space_after = Pt(0)


def add_cover(document: Document) -> object:
    section = document.sections[0]
    section.different_first_page_header_footer = True
    paragraph = document.add_paragraph()
    paragraph.paragraph_format.space_before = Pt(118)
    paragraph.paragraph_format.space_after = Pt(18)
    paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = paragraph.add_run("MEDTECH EUROPE")
    set_run_font(run, size=11, color=TEAL, bold=True)

    paragraph = document.add_paragraph()
    paragraph.paragraph_format.space_after = Pt(10)
    paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = paragraph.add_run("Code of Ethical\nBusiness Practice")
    set_run_font(run, size=30, color=HEADING_DARK_BLUE, bold=True)

    paragraph = document.add_paragraph()
    paragraph.paragraph_format.space_after = Pt(66)
    paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = paragraph.add_run("September 2024")
    set_run_font(run, size=15, color=MUTED)

    paragraph = document.add_paragraph()
    paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = paragraph.add_run("Editable PDF-derived working copy")
    set_run_font(run, size=10.5, color=MUTED, italic=True)
    return paragraph


def add_front_matter(document: Document) -> None:
    document.add_page_break()
    heading = document.add_heading("Document status and editing guidance", level=1)
    add_note_box(
        document,
        "Provenance",
        (
            f"This working copy was generated only from {SOURCE_PDF.name} "
            f"(SHA-256 {SOURCE_SHA256}). Repeated PDF page furniture and the PDF’s "
            "fixed table-of-contents pagination were converted to Word-native "
            "formatting. No JSON content was used."
        ),
    )
    add_note_box(
        document,
        "Text policy",
        (
            "The source wording is preserved except for the explicit typographical "
            "corrections listed in the final Editorial correction record. That final "
            "record and this guidance page are editorial metadata, not Code text."
        ),
    )
    add_note_box(
        document,
        "Team editing",
        (
            "Edit the Code text directly and use Track Changes. Keep chapter, section, "
            "clause, Q-number, A-number, and annex labels intact unless renumbering is "
            "an intended amendment. PDF-page bookmarks named pdf_page_001 through "
            "pdf_page_080 provide stable source provenance for later JSON updates."
        ),
    )
    heading.paragraph_format.keep_with_next = True

    document.add_page_break()
    document.add_heading("Table of Contents", level=1)
    toc = document.add_paragraph()
    add_field(toc, 'TOC \\o "1-3" \\h \\z \\u', "Update this field in Word.")
    document.add_page_break()


def add_block(
    document: Document,
    block: Block,
    numbering: NumberingManager,
    list_state: dict[str, int | str | None],
):
    if block.kind == "heading":
        paragraph = document.add_heading(block.text, level=block.level)
        list_state["kind"] = None
        return paragraph
    style = {
        "body": "Code Body",
        "clause": "Code Clause",
        "question": "Code Question",
        "answer": "Code Answer",
        "footnote": "Code Footnote",
        "bullet": "Code List",
        "lower_letter": "Code List",
        "lower_roman": "Code List",
        "decimal": "Code List",
    }[block.kind]
    paragraph = document.add_paragraph(style=style)
    paragraph.add_run(block.text)
    if block.kind in {"question", "clause"}:
        paragraph.paragraph_format.keep_with_next = True
    if block.kind in {"bullet", "lower_letter", "lower_roman", "decimal"}:
        if list_state["kind"] != block.kind:
            list_state["kind"] = block.kind
            list_state["num_id"] = numbering.new_list(block.kind)
        NumberingManager.apply(
            paragraph, int(list_state["num_id"]), min(block.level, 1)
        )
    else:
        list_state["kind"] = None
    return paragraph


def smart_join_split(left: str | None, right: str | None) -> str:
    left = (left or "").rstrip()
    right = (right or "").lstrip()
    if not left:
        return right
    if not right:
        return left
    if left[-1].isalpha() and right[0].islower():
        return left + right
    return f"{left} {right}"


def annex_i_rows(plumber_document) -> list[list[str]]:
    tables = plumber_document.pages[71].find_tables()
    source = max((table.extract() for table in tables), key=len)
    header = [
        (
            "WHICH TYPE OF SUPPORT CAN MEMBER COMPANIES PROVIDE TO WHICH THIRD "
            "PARTY ORGANISED EDUCATIONAL EVENTS?"
        ),
        "",
        (
            "NATIONAL\nThird Party Organised Educational Events attended by "
            "delegates which are local HCPs only)"
        ),
        (
            "INTERNATIONAL\n(Third Party Organised Educational Events attended "
            "by delegates coming from at least two countries of the MedTech "
            "Europe Geographic Area1,2)"
        ),
        (
            "INTERNATIONAL\n(Third Party Organised Educational Events attended by "
            "delegates who are Healthcare Professionals registered and practising "
            "in the MedTech Europe Geographic Area3)"
        ),
        (
            "INTERNATIONAL\n(Third Party Organised Educational Events to which no "
            "Healthcare Professionals registered and practicing in the MedTech "
            "Europe Geographic Area attend, neither as speakers or delegates)"
        ),
    ]
    rows = [header]
    for row in source[3:]:
        processed = [
            row[0] or "",
            row[1] or "",
            row[2] or "",
            row[3] or "",
            smart_join_split(row[4], row[5]),
            row[6] or "",
        ]
        if "Attendance of Member" in processed[1]:
            # pdfplumber splits and interleaves two words across this cell's
            # artificial extraction columns. Reassemble the printed sentence.
            processed[4] = (
                "Member Company prior internal review against Code principles "
                "required"
            )
        rows.append(processed)
    return rows


def annex_ii_rows(plumber_document) -> list[list[str]]:
    page_73 = max(
        (table.extract() for table in plumber_document.pages[72].find_tables()),
        key=len,
    )
    page_74 = max(
        (table.extract() for table in plumber_document.pages[73].find_tables()),
        key=len,
    )
    rows = [
        [
            "IN-KIND CATEGORY",
            "EXAMPLES OF VALUES THAT CAN BE CONSIDERED, VAT EXCLUSIVE WHEN RELEVANT",
        ]
    ]
    goods_value = "\n".join(
        [
            "• Provision of used goods",
            "◦ Fair Market Value",
            "◦ Company book value",
            "• Provision of new goods",
            "◦ For third party goods, the listing price.",
            "◦ Contractual value or Fair Market Value",
            (
                "◦ Internal costs, whether relating to cost of manufacture "
                "or transfer price"
            ),
            "• Loaned goods",
            "◦ Rental equivalent based on depreciation",
            (
                "◦ Rental equivalent to highest-volume rate – NOTE: Rent "
                "cannot exceed accepted values if the equipment were to "
                "be donated or sold"
            ),
            (
                "◦ Exception: if single used products are bundled, they "
                "should be separated and valued as a donation of equipment"
            ),
        ]
    )
    for row in page_73[1:]:
        category = row[0] or ""
        value = smart_join_split(row[1], row[2])
        if category.startswith("Services provided"):
            # The narrow source columns interleave the parenthetical phrases.
            # Preserve the reading order visible in the PDF.
            value = (
                "The salary (inclusive social contributions), or a portion of "
                "the salary, for technical support provided by personnel employed "
                "by the Member Company (based on time spent and salary)"
            )
        elif category.startswith("Goods"):
            value = goods_value
        rows.append([category, value])
    for row in page_74:
        category = row[0] or ""
        value = smart_join_split(row[1], row[2])
        if category.startswith("Goods"):
            # Repair extraction-order artifacts while retaining the PDF's
            # wording and its editable bullet structure.
            value = goods_value
        rows.append([category, value])
    return rows


def annex_vi_rows(plumber_document) -> list[list[str]]:
    source = max(
        (table.extract() for table in plumber_document.pages[77].find_tables()),
        key=len,
    )
    rows = [["Event", "Setting", "Faculty /Speaker", "Delegates"]]
    for row in source[2:]:
        faculty = smart_join_split(row[3], row[4])
        if faculty == "Notallowed":
            faculty = "Not allowed"
        rows.append(
            [
                row[0] or "",
                "\n".join(value for value in (row[1], row[2]) if value),
                faculty,
                row[5] or "",
            ]
        )
    for row in rows:
        row[:] = [
            re.sub(
                r"\bThird\s+Third\s+Party Organised Educational Event\b",
                "Third Party Organised Educational Event",
                value,
            )
            for value in row
        ]
    return rows


def add_annex_i(
    document: Document,
    lines: Sequence[str],
    plumber_document,
    numbering: NumberingManager,
    bookmark_id: int,
) -> None:
    section = document.add_section(WD_SECTION.NEW_PAGE)
    set_section_geometry(section, landscape=True)
    configure_header_footer(section)
    heading = document.add_heading("Part 3: Annexes", level=1)
    add_bookmark(heading, "pdf_page_072", bookmark_id)
    document.add_heading("ANNEX I", level=2)
    document.add_heading("CVS scope: When are CVS assessments required?", level=3)
    paragraph = document.add_paragraph()
    paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = paragraph.add_run("PRIOR CVS SUBMISSION")
    set_run_font(run, size=10, color=HEADING_DARK_BLUE, bold=True)
    group_table = document.add_table(rows=1, cols=2)
    set_table_geometry(group_table, [6480, 6480], indent_dxa=0)
    fill_cell(
        group_table.cell(0, 0),
        "IN MEDTECH EUROPE GEOGRAPHIC AREA",
        numbering,
        header=True,
    )
    fill_cell(
        group_table.cell(0, 1),
        "OUTSIDE MEDTECH EUROPE GEOGRAPHIC AREA",
        numbering,
        header=True,
    )
    add_table(
        document,
        annex_i_rows(plumber_document),
        [1500, 2100, 2250, 2250, 2400, 2460],
        numbering,
    )
    footnote_start = next(
        (index for index, line in enumerate(lines) if line.startswith("1) ")),
        len(lines),
    )
    for block in parse_blocks(72, lines[footnote_start:], set()):
        block.kind = "footnote"
        add_block(document, block, numbering, {"kind": None, "num_id": None})

    section = document.add_section(WD_SECTION.NEW_PAGE)
    set_section_geometry(section)
    configure_header_footer(section)


def add_annex_ii(
    document: Document,
    page_73_lines: Sequence[str],
    page_74_lines: Sequence[str],
    headings: set[str],
    plumber_document,
    numbering: NumberingManager,
    bookmark_id_73: int,
    bookmark_id_74: int,
) -> None:
    heading = document.add_heading(
        "ANNEX II Calculating the value of In Kind Educational Grants", level=2
    )
    add_bookmark(heading, "pdf_page_073", bookmark_id_73)
    table_start = next(
        (
            index
            for index, line in enumerate(page_73_lines)
            if line.startswith("IN-KIND CATEGORY")
        ),
        len(page_73_lines),
    )
    state = {"kind": None, "num_id": None}
    for block in parse_blocks(73, page_73_lines[1:table_start], headings):
        add_block(document, block, numbering, state)
    add_table(
        document,
        annex_ii_rows(plumber_document),
        [2700, 6660],
        numbering,
    )
    marker = document.add_paragraph(style="Code Body")
    add_bookmark(marker, "pdf_page_074", bookmark_id_74)
    marker.add_run("In-Kind Educational Grant do not include the following:")
    postamble_start = next(
        (
            index
            for index, line in enumerate(page_74_lines)
            if line.startswith("In-Kind Educational Grant do not include")
        ),
        len(page_74_lines),
    )
    for block in parse_blocks(74, page_74_lines[postamble_start + 1 :], headings):
        add_block(document, block, numbering, state)


def add_annex_iii(
    document: Document,
    lines: Sequence[str],
    numbering: NumberingManager,
    bookmark_id: int,
) -> None:
    heading = document.add_heading("Annex III", level=2)
    add_bookmark(heading, "pdf_page_075", bookmark_id)
    document.add_heading(
        "The Geographical Area where the Code applies as the minimum standard",
        level=3,
    )
    document.add_paragraph(
        "The MedTech Europe Geographic Area currently includes",
        style="Code Body",
    )
    document.add_heading("Countries with National Associations:", level=3)
    country_lines = [line for line in lines if line.startswith("■ ")]
    country_rows = []
    for line in country_lines:
        values = [normalize_space(value) for value in line.split("■") if value.strip()]
        if len(values) == 1:
            country_rows.append([values[0], ""])
        else:
            country_rows.append(values[:2])
    split_index = next(
        (
            index
            for index, row in enumerate(country_rows)
            if row[0] == "Iceland"
        ),
        len(country_rows),
    )
    add_table(
        document,
        country_rows[:split_index],
        [4680, 4680],
        numbering,
        header_rows=0,
        fill=LIGHT_GRAY,
    )
    document.add_heading(
        (
            "Countries party to the European Economic Area agreement without a "
            "MedTech Europe National Association:"
        ),
        level=3,
    )
    state = {"kind": None, "num_id": None}
    for value in [item for row in country_rows[split_index:] for item in row if item]:
        add_block(document, Block("bullet", value, 75), numbering, state)
    footnote = next((line for line in lines if line.startswith("*Countries")), "")
    if footnote:
        document.add_paragraph(footnote, style="Code Footnote")


def add_annex_vi(
    document: Document,
    lines: Sequence[str],
    headings: set[str],
    plumber_document,
    numbering: NumberingManager,
    bookmark_id: int,
) -> None:
    section = document.add_section(WD_SECTION.NEW_PAGE)
    set_section_geometry(section, landscape=True)
    configure_header_footer(section)
    heading = document.add_heading(
        "ANNEX VI Direct support to HCP participation in Events", level=2
    )
    add_bookmark(heading, "pdf_page_078", bookmark_id)
    document.add_heading("Direct Support for HCP attendance", level=3)
    add_table(
        document,
        annex_vi_rows(plumber_document),
        [2200, 5000, 3000, 2760],
        numbering,
    )
    description_start = next(
        (index for index, line in enumerate(lines) if line == "Description:"),
        len(lines),
    )
    state = {"kind": None, "num_id": None}
    for block in parse_blocks(78, lines[description_start:], headings):
        add_block(document, block, numbering, state)

    section = document.add_section(WD_SECTION.NEW_PAGE)
    set_section_geometry(section)
    configure_header_footer(section)


def add_correction_record(
    document: Document, numbering: NumberingManager
) -> None:
    document.add_page_break()
    document.add_heading(
        "Editorial correction record (not part of the Code)", level=1
    )
    document.add_paragraph(
        (
            "Only the page-scoped corrections below differ from the source PDF’s "
            "visible wording. They correct obvious typographical defects without "
            "changing the intended normative meaning."
        ),
        style="Editorial Note",
    )
    rows = [["PDF page", "Source text", "Corrected text", "Reason"]]
    rows.extend(
        [
            str(item.page),
            item.original,
            item.replacement.replace("\n", " "),
            item.reason,
        ]
        for item in CORRECTIONS
    )
    add_table(
        document,
        rows,
        [900, 3000, 3360, 2100],
        numbering,
        fill=LIGHT_GRAY,
    )


def iter_document_text(document: Document) -> Iterable[str]:
    for paragraph in document.paragraphs:
        if paragraph.text:
            yield paragraph.text
    for table in document.tables:
        for row in table.rows:
            for cell in row.cells:
                for paragraph in cell.paragraphs:
                    if paragraph.text:
                        yield paragraph.text


def structural_audit(document: Document) -> None:
    required_styles = {
        "Heading 1",
        "Heading 2",
        "Heading 3",
        "Code Body",
        "Code Question",
        "Code Answer",
        "Code List",
        "Code Footnote",
    }
    missing = required_styles - {style.name for style in document.styles}
    if missing:
        raise ValueError(f"Missing required styles: {sorted(missing)}")
    if len(document.tables) < 7:
        raise ValueError(
            f"Expected editable annex/metadata tables; found {len(document.tables)}"
        )
    correction_heading = "Editorial correction record (not part of the Code)"
    body_paragraphs = []
    for paragraph in document.paragraphs:
        if paragraph.text == correction_heading:
            break
        if paragraph.text:
            body_paragraphs.append(paragraph.text)
    body_tables = document.tables[:-1] if document.tables else []
    text = "\n".join(
        [
            *body_paragraphs,
            *(
                paragraph.text
                for table in body_tables
                for row in table.rows
                for cell in row.cells
                for paragraph in cell.paragraphs
                if paragraph.text
            ),
        ]
    )
    forbidden = (
        "July 2026 Update",
        "Knowledge Quiz",
        "TPPT Checker",
        "Summary:",
    )
    found = [value for value in forbidden if value in text]
    if found:
        raise ValueError(f"Non-PDF/app-derived content leaked into DOCX: {found}")
    for correction in CORRECTIONS:
        if re.search(correction.pattern, text, correction.flags):
            raise ValueError(
                f"Uncorrected source typo remains in DOCX: {correction.original}"
            )
    for page_number in range(1, 81):
        bookmark = f"pdf_page_{page_number:03d}"
        if bookmark.encode() not in document.part.blob:
            raise ValueError(f"Missing source-page bookmark: {bookmark}")


def build(source_pdf: Path, output_docx: Path) -> None:
    if sha256(source_pdf) != SOURCE_SHA256:
        raise ValueError(
            "Source PDF hash does not match the reviewed September 2024 source."
        )
    reader = PdfReader(source_pdf)
    if len(reader.pages) != 80:
        raise ValueError(f"Expected 80 PDF pages; found {len(reader.pages)}")
    headings = extract_toc_headings(reader)
    page_lines = {
        page_number: cleaned_page_lines(
            page_number, reader.pages[page_number - 1].extract_text() or ""
        )
        for page_number in range(1, 81)
    }

    document = Document()
    configure_styles(document)
    set_section_geometry(document.sections[0])
    configure_header_footer(document.sections[0])
    document.core_properties.title = (
        "MedTech Europe Code of Ethical Business Practice — September 2024"
    )
    document.core_properties.subject = "Editable PDF-derived working copy"
    document.core_properties.author = "MedTech Europe"
    document.core_properties.comments = (
        f"Generated solely from {source_pdf.name}; SHA-256 {SOURCE_SHA256}."
    )
    numbering = NumberingManager(document)
    bookmark_id = 1

    cover_anchor = add_cover(document)
    add_bookmark(cover_anchor, "pdf_page_001", bookmark_id)
    bookmark_id += 1
    add_front_matter(document)
    toc_heading = next(
        paragraph
        for paragraph in document.paragraphs
        if paragraph.text == "Table of Contents"
    )
    add_bookmark(toc_heading, "pdf_page_003", bookmark_id)
    bookmark_id += 1
    add_bookmark(toc_heading, "pdf_page_004", bookmark_id)
    bookmark_id += 1

    state = {"kind": None, "num_id": None}
    with pdfplumber.open(source_pdf) as plumber_document:
        for page_number in range(2, 81):
            if page_number in (3, 4):
                continue
            if page_number == 72:
                add_annex_i(
                    document,
                    page_lines[72],
                    plumber_document,
                    numbering,
                    bookmark_id,
                )
                bookmark_id += 1
                continue
            if page_number == 73:
                add_annex_ii(
                    document,
                    page_lines[73],
                    page_lines[74],
                    headings,
                    plumber_document,
                    numbering,
                    bookmark_id,
                    bookmark_id + 1,
                )
                bookmark_id += 2
                continue
            if page_number == 74:
                continue
            if page_number == 75:
                add_annex_iii(
                    document, page_lines[75], numbering, bookmark_id
                )
                bookmark_id += 1
                continue
            if page_number == 78:
                add_annex_vi(
                    document,
                    page_lines[78],
                    headings,
                    plumber_document,
                    numbering,
                    bookmark_id,
                )
                bookmark_id += 1
                continue

            lines = page_lines[page_number]
            if page_number in MAJOR_TITLES:
                if page_number not in (72,):
                    document.add_page_break()
                anchor = document.add_heading(MAJOR_TITLES[page_number], level=1)
                add_bookmark(
                    anchor, f"pdf_page_{page_number:03d}", bookmark_id
                )
                bookmark_id += 1
                lines = strip_cover_text(page_number, lines)
                state = {"kind": None, "num_id": None}
            else:
                blocks = parse_blocks(page_number, lines, headings)
                if not blocks:
                    raise ValueError(f"Page {page_number}: no content blocks")
                anchor = None
                for block in blocks:
                    paragraph = add_block(document, block, numbering, state)
                    if anchor is None:
                        anchor = paragraph
                add_bookmark(
                    anchor, f"pdf_page_{page_number:03d}", bookmark_id
                )
                bookmark_id += 1
                continue

            for block in parse_blocks(page_number, lines, headings):
                add_block(document, block, numbering, state)

    add_correction_record(document, numbering)
    structural_audit(document)
    output_docx.parent.mkdir(parents=True, exist_ok=True)
    document.save(output_docx)

    reopened = Document(output_docx)
    structural_audit(reopened)
    print(
        f"Created {output_docx} from {source_pdf.name}: "
        f"{len(reopened.paragraphs)} paragraphs, {len(reopened.tables)} tables, "
        f"{len(reopened.sections)} sections, {len(CORRECTIONS)} corrections."
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=SOURCE_PDF)
    parser.add_argument("--output", type=Path, default=OUTPUT_DOCX)
    return parser.parse_args()


if __name__ == "__main__":
    arguments = parse_args()
    build(arguments.source.resolve(), arguments.output.resolve())

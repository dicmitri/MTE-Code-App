#!/usr/bin/env python3
"""Compare the app's Code text with the September 2024 source PDF.

This script is deliberately read-only. It never rewrites either source. The report
is an audit aid: exact preservation during the JSON split is enforced separately.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from collections import Counter
from dataclasses import dataclass
from difflib import SequenceMatcher
from html.parser import HTMLParser
from pathlib import Path
from typing import Any

try:
    from pypdf import PdfReader
except ImportError as error:  # pragma: no cover - depends on the local Python runtime
    raise SystemExit(
        "Missing Python package 'pypdf'. Install it with: python -m pip install pypdf"
    ) from error


PROJECT_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_CODE_DIR = PROJECT_ROOT / "src" / "data" / "code"
DEFAULT_MANIFEST_PATH = PROJECT_ROOT / "src" / "data" / "code-manifest.json"
DEFAULT_PDF_PATH = PROJECT_ROOT / "src" / "data" / "code-september-2024 (1).pdf"

# Inclusive, one-based PDF page ranges. Divider pages overlap where the PDF places
# the next chapter title at the end of the preceding chapter's final page.
CHAPTER_PAGES = {
    "scope": (5, 8),
    "admin": (9, 13),
    "intro": (13, 17),
    "ch1": (18, 23),
    "ch2": (24, 27),
    "ch3": (28, 32),
    "ch4": (33, 40),
    "ch5": (41, 45),
    "ch6": (46, 51),
    "ch7": (51, 53),
    "ch8": (53, 55),
    "ch9": (56, 59),
    "ch10": (59, 62),
    "part2": (62, 67),
    "glossary": (67, 71),
    "annex1": (72, 72),
    "annex2": (73, 74),
    "annex3": (75, 75),
    "annex4": (76, 76),
    "annex5": (77, 77),
    "annex6": (78, 78),
    "annex7": (79, 80),
}

BLOCK_TAGS = {
    "address",
    "article",
    "aside",
    "blockquote",
    "br",
    "dd",
    "div",
    "dl",
    "dt",
    "figcaption",
    "figure",
    "footer",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "header",
    "hr",
    "li",
    "main",
    "nav",
    "ol",
    "p",
    "section",
    "table",
    "tbody",
    "td",
    "tfoot",
    "th",
    "thead",
    "tr",
    "ul",
}
SKIPPED_TAGS = {"script", "style", "svg"}
PDF_FIXED_HEADER = re.compile(
    r"^MEDTECH EUROPE\s+[\-\u2013]\s+CODE OF ETHICAL BUSINESS PRACTICE"
)
PDF_RUNNING_HEADER = re.compile(
    r"^(?:SCOPE|ADMINISTERING THE CODE|INTRODUCTION|CHAPTER \d+:.+|"
    r"PART 2:.+|PART 3:.+)$"
)
QUESTION_PREFIX = re.compile(r"^Q&A\s+[^:]+:\s*", re.IGNORECASE)
FOOTNOTE_SEPARATOR = re.compile(r"<hr\b[^>]*>", re.IGNORECASE)
TOKEN_PATTERN = re.compile(r"\w+(?:[\u2019']\w+)*|[^\w\s]", re.UNICODE)
BULLETS = "\u2022\u2023\u25e6\u2043\u2219"


class VisibleTextParser(HTMLParser):
    """Extract visible text while retaining boundaries between block elements."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.parts: list[str] = []
        self.skip_depth = 0

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        del attrs
        tag = tag.lower()
        if tag in SKIPPED_TAGS:
            self.skip_depth += 1
            return
        if not self.skip_depth and tag in BLOCK_TAGS:
            self.parts.append("\n")

    def handle_startendtag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        del attrs
        if not self.skip_depth and tag.lower() in BLOCK_TAGS:
            self.parts.append("\n")

    def handle_endtag(self, tag: str) -> None:
        tag = tag.lower()
        if tag in SKIPPED_TAGS:
            self.skip_depth = max(0, self.skip_depth - 1)
            return
        if not self.skip_depth and tag in BLOCK_TAGS:
            self.parts.append("\n")

    def handle_data(self, data: str) -> None:
        if not self.skip_depth:
            self.parts.append(data)

    def text(self) -> str:
        return "".join(self.parts)


@dataclass(frozen=True)
class AuditField:
    path: str
    chapter_id: str
    kind: str
    text: str


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest().upper()


def report_path(path: Path) -> str:
    resolved = path.resolve()
    try:
        return resolved.relative_to(PROJECT_ROOT).as_posix()
    except ValueError:
        return str(resolved)


def load_code_data(args: argparse.Namespace) -> tuple[dict[str, Any], dict[str, Any]]:
    if args.code:
        code_bytes = args.code.read_bytes()
        return json.loads(code_bytes.decode("utf-8")), {
            "format": "monolith",
            "path": report_path(args.code),
            "sha256": sha256_bytes(code_bytes),
            "bytes": len(code_bytes),
        }

    manifest = json.loads(args.manifest.read_text(encoding="utf-8"))
    chapters = []
    file_records = []
    aggregate_hasher = hashlib.sha256()
    for chapter_id in manifest["chapterOrder"]:
        chapter_path = args.code_dir / f"{chapter_id}.json"
        chapter_bytes = chapter_path.read_bytes()
        chapter = json.loads(chapter_bytes.decode("utf-8"))
        if chapter.get("id") != chapter_id:
            raise ValueError(
                f"{chapter_path.name}: expected chapter ID {chapter_id!r}, "
                f"found {chapter.get('id')!r}"
            )
        chapters.append(chapter)
        aggregate_hasher.update(chapter_id.encode("utf-8"))
        aggregate_hasher.update(b"\0")
        aggregate_hasher.update(chapter_bytes)
        aggregate_hasher.update(b"\0")
        file_records.append(
            {
                "id": chapter_id,
                "file": report_path(chapter_path),
                "sha256": sha256_bytes(chapter_bytes),
                "bytes": len(chapter_bytes),
            }
        )

    return {"chapters": chapters}, {
        "format": "split-chapters",
        "path": report_path(args.code_dir),
        "splitFilesSha256": aggregate_hasher.hexdigest().upper(),
        "frozenMonolithSha256": manifest["source"]["sha256"],
        "files": file_records,
    }


def visible_text(value: str) -> str:
    parser = VisibleTextParser()
    parser.feed(value)
    parser.close()
    return parser.text()


def remove_pdf_page_furniture(page_text: str) -> str:
    lines = [line.rstrip() for line in page_text.replace("\r\n", "\n").split("\n")]
    if lines and PDF_FIXED_HEADER.match(lines[0].strip()):
        lines.pop(0)
        if lines and re.fullmatch(r"\d+", lines[0].strip()):
            lines.pop(0)
        if lines and PDF_RUNNING_HEADER.match(lines[0].strip()):
            lines.pop(0)
    return "\n".join(lines)


def normalize_layout(value: str, *, remove_wrap_hyphens: bool = False) -> str:
    value = value.replace("\r\n", "\n").replace("\r", "\n")
    value = value.replace("\u00a0", " ").replace("\u00ad", "")
    if remove_wrap_hyphens:
        value = re.sub(r"(?<=[A-Za-z])-\s*\n\s*(?=[a-z])", "", value)
    else:
        value = re.sub(r"-\s*\n\s*(?=\w)", "-", value)
    value = value.translate(str.maketrans({bullet: " " for bullet in BULLETS}))
    return re.sub(r"\s+", " ", value).strip()


def words_only(value: str, *, casefold: bool = False) -> str:
    words = re.findall(r"\w+", value, flags=re.UNICODE)
    joined = " ".join(words)
    return joined.casefold() if casefold else joined


def tokenize(value: str) -> list[str]:
    return TOKEN_PATTERN.findall(value)


def bounded_diff(expected: str, actual_scope: str) -> dict[str, Any]:
    expected_tokens = tokenize(expected)
    actual_tokens = tokenize(actual_scope)
    if not expected_tokens or not actual_tokens:
        return {
            "similarity": 0.0,
            "expected_excerpt": expected[:240],
            "pdf_excerpt": actual_scope[:240],
            "operations": [],
        }

    locator = SequenceMatcher(None, expected_tokens, actual_tokens, autojunk=False)
    matching_blocks = [block for block in locator.get_matching_blocks() if block.size >= 3]
    first_anchor = next(
        (block for block in matching_blocks if block.a <= max(20, len(expected_tokens) // 5)),
        None,
    )
    last_anchor = next(
        (
            block
            for block in reversed(matching_blocks)
            if block.a + block.size >= len(expected_tokens) - max(20, len(expected_tokens) // 5)
        ),
        None,
    )

    if first_anchor and last_anchor and first_anchor.b <= last_anchor.b:
        window_start = max(0, first_anchor.b - first_anchor.a)
        expected_tail = len(expected_tokens) - last_anchor.a - last_anchor.size
        window_end = min(len(actual_tokens), last_anchor.b + last_anchor.size + expected_tail)
    else:
        longest = max(locator.get_matching_blocks(), key=lambda block: block.size)
        estimated_start = max(0, longest.b - longest.a)
        window_start = estimated_start
        window_end = min(len(actual_tokens), estimated_start + len(expected_tokens))

    candidate = actual_tokens[window_start:window_end]
    matcher = SequenceMatcher(None, expected_tokens, candidate, autojunk=False)

    operations = []
    for operation, i1, i2, j1, j2 in matcher.get_opcodes():
        if operation == "equal":
            continue
        operations.append(
            {
                "operation": operation,
                "expected": " ".join(expected_tokens[i1:i2])[:500],
                "pdf": " ".join(candidate[j1:j2])[:500],
            }
        )
        if len(operations) == 12:
            break

    return {
        "similarity": round(matcher.ratio(), 6),
        "expected_excerpt": " ".join(expected_tokens[:40])[:300],
        "pdf_excerpt": " ".join(candidate[:40])[:300],
        "operationCount": sum(
            1 for operation, *_ in matcher.get_opcodes() if operation != "equal"
        ),
        "operations": operations,
    }


def collect_fields(code_data: dict[str, Any]) -> tuple[list[AuditField], list[str]]:
    fields: list[AuditField] = []
    exclusions: list[str] = []

    for chapter_index, chapter in enumerate(code_data.get("chapters", [])):
        chapter_id = chapter.get("id", "")
        chapter_path = f"chapters[{chapter_index}]({chapter_id})"
        exclusions.extend(
            [
                f"{chapter_path}.id (app metadata)",
                f"{chapter_path}.part (app metadata)",
                f"{chapter_path}.icon (app metadata)",
                f"{chapter_path}.summary (app-authored navigation summary)",
            ]
        )

        if chapter_id == "changelog":
            exclusions.append(f"{chapter_path} (app-only Version History chapter)")
            continue
        if chapter_id not in CHAPTER_PAGES:
            raise ValueError(f"No PDF page range configured for chapter ID {chapter_id!r}")

        fields.append(
            AuditField(f"{chapter_path}.title", chapter_id, "chapter_title", chapter["title"])
        )
        for section_index, section in enumerate(chapter.get("sections", [])):
            section_path = f"{chapter_path}.sections[{section_index}]"
            fields.append(
                AuditField(
                    f"{section_path}.title",
                    chapter_id,
                    "section_title",
                    section["title"],
                )
            )

            legal_parts = FOOTNOTE_SEPARATOR.split(section.get("legalText", ""))
            if legal_parts:
                fields.append(
                    AuditField(
                        f"{section_path}.legalText.body",
                        chapter_id,
                        "legal_text",
                        visible_text(legal_parts[0]),
                    )
                )
            for footnote_index, footnote in enumerate(legal_parts[1:]):
                fields.append(
                    AuditField(
                        f"{section_path}.legalText.footnote[{footnote_index}]",
                        chapter_id,
                        "footnote",
                        visible_text(footnote),
                    )
                )

            for qa_index, qa in enumerate(section.get("qas", [])):
                qa_path = f"{section_path}.qas[{qa_index}]"
                question = QUESTION_PREFIX.sub("", visible_text(qa.get("q", "")), count=1)
                fields.append(AuditField(f"{qa_path}.q", chapter_id, "question", question))
                fields.append(
                    AuditField(
                        f"{qa_path}.a",
                        chapter_id,
                        "answer",
                        visible_text(qa.get("a", "")),
                    )
                )

    return fields, exclusions


def compare_field(field: AuditField, strict_scope: str, dehyphenated_scope: str) -> dict[str, Any]:
    expected = normalize_layout(field.text)
    expected_dehyphenated = normalize_layout(field.text, remove_wrap_hyphens=True)
    record: dict[str, Any] = {
        "path": field.path,
        "chapterId": field.chapter_id,
        "kind": field.kind,
        "visibleTextSha256": sha256_bytes(expected.encode("utf-8")),
        "visibleCharacters": len(expected),
    }

    if expected and expected in strict_scope:
        record["status"] = "exact_after_layout_normalization"
        return record
    if expected_dehyphenated and expected_dehyphenated in dehyphenated_scope:
        record["status"] = "exact_after_pdf_wrap_dehyphenation"
        return record

    strict_words = words_only(expected)
    strict_pdf_words = words_only(strict_scope)
    folded_words = words_only(expected, casefold=True)
    folded_pdf_words = words_only(strict_scope, casefold=True)
    if strict_words and strict_words in strict_pdf_words:
        record["status"] = "punctuation_difference"
    elif folded_words and folded_words in folded_pdf_words:
        record["status"] = "case_or_punctuation_difference"
    elif field.kind == "footnote":
        record["status"] = "footnote_difference"
    else:
        record["status"] = "substantive_review_required"

    record["difference"] = bounded_diff(expected, strict_scope)
    return record


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    source_group = parser.add_mutually_exclusive_group()
    source_group.add_argument(
        "--code",
        type=Path,
        help="Audit a legacy monolithic codeData.json instead of the split files",
    )
    source_group.add_argument("--code-dir", type=Path, default=DEFAULT_CODE_DIR)
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST_PATH)
    parser.add_argument("--pdf", type=Path, default=DEFAULT_PDF_PATH)
    parser.add_argument("--output", type=Path, help="Write the full JSON report to this path")
    parser.add_argument(
        "--fail-on-review",
        action="store_true",
        help="Exit with status 1 when any non-exact field requires review",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    pdf_bytes = args.pdf.read_bytes()
    code_data, code_source = load_code_data(args)
    reader = PdfReader(args.pdf)

    page_texts = [remove_pdf_page_furniture(page.extract_text() or "") for page in reader.pages]
    chapter_scopes: dict[str, dict[str, str]] = {}
    for chapter_id, (first_page, last_page) in CHAPTER_PAGES.items():
        scope = "\n".join(page_texts[first_page - 1 : last_page])
        chapter_scopes[chapter_id] = {
            "strict": normalize_layout(scope),
            "dehyphenated": normalize_layout(scope, remove_wrap_hyphens=True),
        }

    fields, exclusions = collect_fields(code_data)
    results = [
        compare_field(
            field,
            chapter_scopes[field.chapter_id]["strict"],
            chapter_scopes[field.chapter_id]["dehyphenated"],
        )
        for field in fields
    ]
    statuses = Counter(result["status"] for result in results)
    review_count = sum(
        count
        for status, count in statuses.items()
        if status
        not in {"exact_after_layout_normalization", "exact_after_pdf_wrap_dehyphenation"}
    )

    report = {
        "auditVersion": 1,
        "sources": {
            "code": code_source,
            "pdf": {
                "path": report_path(args.pdf),
                "sha256": sha256_bytes(pdf_bytes),
                "bytes": len(pdf_bytes),
                "pages": len(reader.pages),
            },
        },
        "method": {
            "scope": "Visible source-backed text fields, compared within explicit chapter page ranges.",
            "layoutNormalization": [
                "HTML tags and styling are removed with Python's HTMLParser.",
                "PDF running headers, page numbers, whitespace, and bullet glyphs are ignored.",
                "Punctuation, capitalization, numbers, apostrophes, and wording remain significant.",
                "A second pass rejoins words visibly split with a line-end hyphen.",
            ],
            "excluded": exclusions,
        },
        "summary": {
            "fieldsCompared": len(results),
            "statusCounts": dict(sorted(statuses.items())),
            "fieldsRequiringReview": review_count,
        },
        "results": results,
    }

    rendered = json.dumps(report, ensure_ascii=False, indent=2) + "\n"
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(rendered, encoding="utf-8", newline="\n")

    if code_source["format"] == "monolith":
        print(f"Code SHA-256: {code_source['sha256']}")
    else:
        print(f"Frozen monolith SHA-256: {code_source['frozenMonolithSha256']}")
        print(f"Split files SHA-256:      {code_source['splitFilesSha256']}")
    print(f"PDF SHA-256:  {report['sources']['pdf']['sha256']}")
    print(f"Compared {len(results)} source-backed fields across {len(CHAPTER_PAGES)} chapters.")
    for status, count in sorted(statuses.items()):
        print(f"- {status}: {count}")
    if args.output:
        print(f"Full report: {args.output.resolve()}")
    if review_count:
        print(f"REVIEW REQUIRED: {review_count} field(s) are not exact after layout normalization.")

    return 1 if args.fail_on_review and review_count else 0


if __name__ == "__main__":
    sys.exit(main())

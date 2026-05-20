import { normalizeSourceText } from "./tpptParser.js";

function itemToTextRun(item) {
  if (!item || !("str" in item) || !item.str) return null;

  return {
    text: item.str,
    x: Number(item.transform?.[4] || 0),
    y: Number(item.transform?.[5] || 0),
    hasEOL: Boolean(item.hasEOL)
  };
}

export function extractPdfPageText(textContent) {
  const runs = textContent.items.map(itemToTextRun).filter(Boolean);
  let pageText = "";
  let lastY = null;
  let lastX = null;

  for (const run of runs) {
    const crossedLine = lastY !== null && Math.abs(run.y - lastY) > 5;
    const resetToLeft = lastX !== null && run.x + 8 < lastX && lastY !== null && Math.abs(run.y - lastY) <= 5;

    if ((crossedLine || resetToLeft) && !pageText.endsWith("\n")) {
      pageText += "\n";
    }

    pageText += run.text;

    if (run.hasEOL) {
      pageText += "\n";
    } else {
      pageText += " ";
    }

    lastY = run.y;
    lastX = run.x;
  }

  return normalizeSourceText(pageText);
}

export async function extractPdfTextFromPdf(pdf) {
  let fullText = "";

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const pageText = extractPdfPageText(textContent);

    if (pageText) {
      fullText += `${pageText}\n\n`;
    }
  }

  return normalizeSourceText(fullText);
}

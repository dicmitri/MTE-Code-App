import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import {
  calculateTpptEligibility,
  formatDuration,
  getSuggestedEventName,
  parseTpptSessions
} from '../src/utils/tpptParser.js';
import { extractPdfTextFromPdf } from '../src/utils/tpptExtraction.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

async function extractPdfText(filePath) {
  const data = new Uint8Array(fs.readFileSync(filePath));
  const loadingTask = pdfjsLib.getDocument({ data });
  const pdf = await loadingTask.promise;
  const text = await extractPdfTextFromPdf(pdf);

  return {
    pages: pdf.numPages,
    text
  };
}

function getPdfFilesFromArgs() {
  return process.argv
    .slice(2)
    .map((inputPath) => path.resolve(inputPath))
    .filter((filePath) => filePath.toLowerCase().endsWith('.pdf'));
}

function getDefaultPdfFiles() {
  const agendasDir = path.join(repoRoot, 'TPPT agendas');
  if (!fs.existsSync(agendasDir)) return [];

  return fs
    .readdirSync(agendasDir)
    .filter((fileName) => fileName.toLowerCase().endsWith('.pdf'))
    .map((fileName) => path.join(agendasDir, fileName));
}

async function runAnalysis() {
  const outDir = path.join(repoRoot, 'scratch', 'extracted');
  const parsedDir = path.join(repoRoot, 'scratch', 'parsed');
  const reportPath = path.join(repoRoot, 'scratch', 'agenda_analysis_report.md');
  const files = getPdfFilesFromArgs();
  const pdfFiles = files.length > 0 ? files : getDefaultPdfFiles();

  fs.mkdirSync(outDir, { recursive: true });
  fs.mkdirSync(parsedDir, { recursive: true });

  if (pdfFiles.length === 0) {
    console.log('No PDF agendas found. Pass file paths as arguments or add PDFs to "TPPT agendas".');
    return;
  }

  console.log(`\n=== Starting Analysis of ${pdfFiles.length} PDF Agenda(s) ===\n`);

  let reportMarkdown = `# Agenda Parsing Analysis Report\n\nGenerated on: ${new Date().toLocaleDateString()}\n\n`;
  reportMarkdown += `| File Name | Extracted Event Name (Suggested) | Pages | Sessions | Total Duration | Hands-on Duration (%) | Practical Duration (%) | Passes Agenda? |\n`;
  reportMarkdown += `| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n`;

  for (const filePath of pdfFiles) {
    const fileName = path.basename(filePath);

    try {
      console.log(`Processing: ${fileName}...`);
      const { pages, text } = await extractPdfText(filePath);

      const txtFile = fileName.replace(/\.pdf$/i, '.txt');
      fs.writeFileSync(path.join(outDir, txtFile), text);

      const suggestedName = getSuggestedEventName(text);
      const parsedSessions = parseTpptSessions(text);

      const jsonFile = fileName.replace(/\.pdf$/i, '_sessions.json');
      fs.writeFileSync(path.join(parsedDir, jsonFile), JSON.stringify(parsedSessions, null, 2));

      const result = calculateTpptEligibility(parsedSessions);
      const handsOnPct = result.total > 0 ? ((result.handsOn / result.total) * 100).toFixed(1) : '0';
      const practicalPct = result.total > 0 ? ((result.practical / result.total) * 100).toFixed(1) : '0';

      reportMarkdown += `| \`${fileName}\` | **${suggestedName}** | ${pages} | ${parsedSessions.length} | ${formatDuration(result.total)} | ${formatDuration(result.handsOn)} (${handsOnPct}%) | ${formatDuration(result.practical)} (${practicalPct}%) | ${result.passesAgenda ? 'PASS' : 'FAIL'} |\n`;
      console.log(`  - Extracted Name: "${suggestedName}"`);
      console.log(`  - Pages: ${pages}`);
      console.log(`  - Sessions parsed: ${parsedSessions.length}`);
      console.log(`  - Total Duration: ${formatDuration(result.total)}`);
      console.log(`  - Hands-on: ${formatDuration(result.handsOn)} (${handsOnPct}%)`);
      console.log(`  - Practical: ${formatDuration(result.practical)} (${practicalPct}%)`);
      console.log(`  - Passes Agenda: ${result.passesAgenda ? 'YES' : 'NO'}`);
      console.log('-----------------------------------------------');
    } catch (err) {
      console.error(`Error processing ${fileName}:`, err);
      reportMarkdown += `| \`${fileName}\` | *Error* | - | - | - | - | - | ERROR |\n`;
    }
  }

  fs.writeFileSync(reportPath, reportMarkdown);
  console.log(`\n=== Analysis Complete! ===\nSummary saved to: ${path.relative(repoRoot, reportPath)}\n`);
}

runAnalysis();

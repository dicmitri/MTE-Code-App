/**
 * One-time migration script for Decap CMS preparation:
 * 1. Converts VDOM summary objects to HTML strings in codeData.json
 * 2. Wraps codeData.json root array in { "chapters": [...] }
 * 3. Wraps treeData.json root array in { "trees": [...] }
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'src', 'data');

// ── VDOM → HTML converter ──────────────────────────────────────────
function vdomToHtml(node) {
  if (node === null || node === undefined) return '';
  if (typeof node === 'string') return escapeHtml(node);
  if (typeof node === 'number') return String(node);

  // Array of children
  if (Array.isArray(node)) {
    return node.map(child => vdomToHtml(child)).join('');
  }

  // VDOM object: { type, props, _owner, _store }
  if (node.type && node.props !== undefined) {
    const tag = node.type;
    const { children, className, ...restProps } = node.props || {};

    // Build attributes (skip className since we're going class-free)
    let attrs = '';
    // We intentionally drop className to produce clean, CMS-friendly HTML
    // The CSS rules in index.css will handle styling

    // Self-closing tags
    const selfClosing = ['br', 'hr', 'img', 'input'];
    if (selfClosing.includes(tag)) {
      return `<${tag}${attrs} />`;
    }

    const inner = children !== undefined ? vdomToHtml(children) : '';
    return `<${tag}${attrs}>${inner}</${tag}>`;
  }

  return '';
}

function escapeHtml(str) {
  // Don't double-escape — the content is already meant to be HTML-safe text
  return str;
}

// ── Process codeData.json ───────────────────────────────────────────
console.log('Reading codeData.json...');
const codeDataPath = path.join(DATA_DIR, 'codeData.json');
const codeData = JSON.parse(fs.readFileSync(codeDataPath, 'utf-8'));

let convertedCount = 0;
for (const chapter of codeData) {
  if (chapter.summary && typeof chapter.summary === 'object' && !Array.isArray(chapter.summary)) {
    const html = vdomToHtml(chapter.summary);
    console.log(`  ✓ Converted summary for "${chapter.id}": ${html.substring(0, 80)}...`);
    chapter.summary = html;
    convertedCount++;
  }
}
console.log(`Converted ${convertedCount} VDOM summaries to HTML strings.\n`);

// Wrap in object
const wrappedCodeData = { chapters: codeData };
fs.writeFileSync(codeDataPath, JSON.stringify(wrappedCodeData, null, 2) + '\n', 'utf-8');
console.log(`Wrote wrapped codeData.json (${codeData.length} chapters)\n`);

// ── Process treeData.json ───────────────────────────────────────────
console.log('Reading treeData.json...');
const treeDataPath = path.join(DATA_DIR, 'treeData.json');
const treeData = JSON.parse(fs.readFileSync(treeDataPath, 'utf-8'));

const wrappedTreeData = { trees: treeData };
fs.writeFileSync(treeDataPath, JSON.stringify(wrappedTreeData, null, 2) + '\n', 'utf-8');
console.log(`Wrote wrapped treeData.json (${treeData.length} trees)\n`);

console.log('✅ Migration complete. Now update codeData.js and treeData.js imports.');

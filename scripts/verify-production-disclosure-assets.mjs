import { createHash } from 'node:crypto';
import {
  existsSync,
  readFileSync,
  readdirSync,
} from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SCRIPT_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(SCRIPT_DIRECTORY, '..');

const DISCLOSURE_ASSETS = Object.freeze([
  {
    label: 'Disclosure Guidelines PDF',
    source: 'src/data/mte-code_disclosure_guidelines.pdf',
    emittedPattern: /^mte-code_disclosure_guidelines-[A-Za-z0-9_-]+\.pdf$/,
  },
  {
    label: 'Annex I CSV template',
    source: 'src/data/declaration-csv-template.csv',
    emittedPattern: /^declaration-csv-template-[A-Za-z0-9_-]+\.csv$/,
  },
]);

function sha256(value) {
  return createHash('sha256').update(value).digest('hex').toUpperCase();
}

function assert(condition, message, errors) {
  if (!condition) errors.push(message);
}

export function verifyProductionDisclosureAssets(projectRoot = PROJECT_ROOT) {
  const errors = [];
  const distDirectory = resolve(projectRoot, 'dist');
  const assetsDirectory = resolve(distDirectory, 'assets');
  const serviceWorkerPath = resolve(distDirectory, 'sw.js');

  assert(existsSync(assetsDirectory), 'Production assets are missing; run the build first.', errors);
  assert(existsSync(serviceWorkerPath), 'dist/sw.js is missing; the PWA build is incomplete.', errors);
  if (errors.length > 0) return { errors, assets: [] };

  const emittedFilenames = readdirSync(assetsDirectory);
  const serviceWorker = readFileSync(serviceWorkerPath, 'utf8');
  const precacheUrls = new Set(
    [...serviceWorker.matchAll(/\burl\s*:\s*["']([^"']+)["']/g)]
      .map((match) => match[1].replace(/^\/+/, '')),
  );
  const assets = [];

  DISCLOSURE_ASSETS.forEach((asset) => {
    const matches = emittedFilenames.filter((filename) => asset.emittedPattern.test(filename));
    assert(
      matches.length === 1,
      `${asset.label} must have exactly one emitted production file; found ${matches.length}.`,
      errors,
    );
    if (matches.length !== 1) return;

    const emittedFilename = matches[0];
    const sourceBytes = readFileSync(resolve(projectRoot, asset.source));
    const emittedBytes = readFileSync(resolve(assetsDirectory, emittedFilename));
    const sourceHash = sha256(sourceBytes);
    const emittedHash = sha256(emittedBytes);
    const productionUrl = `assets/${emittedFilename}`;

    assert(
      emittedBytes.length === sourceBytes.length && emittedHash === sourceHash,
      `${asset.label} production bytes do not exactly match ${asset.source}.`,
      errors,
    );
    assert(
      precacheUrls.has(productionUrl),
      `${asset.label} is not listed in the Workbox precache manifest (${productionUrl}).`,
      errors,
    );

    assets.push({
      label: asset.label,
      productionUrl,
      bytes: emittedBytes.length,
      sha256: emittedHash,
    });
  });

  return { errors, assets };
}

function printReport(result) {
  if (result.errors.length > 0) {
    console.error(
      `Production Disclosure asset verification failed with ${result.errors.length} `
      + `error${result.errors.length === 1 ? '' : 's'}:`,
    );
    result.errors.forEach((error) => console.error(`- ${error}`));
    return;
  }

  console.log('Production Disclosure assets are byte-exact and precached.');
  result.assets.forEach((asset) => {
    console.log(
      `${asset.label}: ${asset.bytes} bytes; ${asset.sha256}; ${asset.productionUrl}`,
    );
  });
}

const isDirectRun = process.argv[1]
  && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (isDirectRun) {
  try {
    const result = verifyProductionDisclosureAssets();
    printReport(result);
    if (result.errors.length > 0) process.exitCode = 1;
  } catch (error) {
    console.error(`Production Disclosure asset verification could not run: ${error.message}`);
    process.exitCode = 1;
  }
}

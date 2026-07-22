import { relative, resolve } from 'node:path';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { fileURLToPath } from 'node:url';

import { generateSectionId } from '../src/utils/textUtils.js';
import { collectStringEntries, sha256, stringEntriesSha256 } from './lib/code-content.mjs';
import { extractRootArrayProperty } from './lib/raw-json-array.mjs';

const PROJECT_ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const DEFAULT_SOURCE = resolve(PROJECT_ROOT, 'src/data/codeData.json');
const DEFAULT_OUTPUT = resolve(PROJECT_ROOT, 'src/data/code');
const DEFAULT_MANIFEST = resolve(PROJECT_ROOT, 'src/data/code-manifest.json');

function parseArguments(argv) {
  const options = {
    source: DEFAULT_SOURCE,
    output: DEFAULT_OUTPUT,
    manifest: DEFAULT_MANIFEST,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--source' || argument === '--output' || argument === '--manifest') {
      const value = argv[index + 1];
      if (!value) throw new Error(`${argument} requires a path.`);
      options[argument.slice(2)] = resolve(PROJECT_ROOT, value);
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }
  return options;
}

function countChapterContent(chapter) {
  const sections = Array.isArray(chapter.sections) ? chapter.sections : [];
  return {
    sections: sections.length,
    qas: sections.reduce((count, section) => count + (section.qas?.length ?? 0), 0),
    sectionIds: sections.map((section, index) => (
      generateSectionId(chapter.id, section.title, index)
    )),
  };
}

export function buildSplitPlan(source) {
  const parsedSource = JSON.parse(source);
  if (!Array.isArray(parsedSource?.chapters)) {
    throw new Error('Source must contain a root "chapters" array.');
  }

  const extraction = extractRootArrayProperty(source, 'chapters');
  if (extraction.elements.length !== parsedSource.chapters.length) {
    throw new Error('Raw chapter extraction count does not match JSON.parse().');
  }

  const seenIds = new Set();
  const chapters = extraction.elements.map((element, index) => {
    const chapter = JSON.parse(element.raw);
    const parsedChapter = parsedSource.chapters[index];
    if (JSON.stringify(chapter) !== JSON.stringify(parsedChapter)) {
      throw new Error(`Extracted chapter ${index} does not match JSON.parse().`);
    }
    if (!/^[a-z0-9][a-z0-9-]*$/.test(chapter.id ?? '')) {
      throw new Error(`Chapter ${index} has an unsafe file ID: "${chapter.id ?? ''}".`);
    }
    if (seenIds.has(chapter.id)) throw new Error(`Duplicate chapter ID: "${chapter.id}".`);
    seenIds.add(chapter.id);

    const strings = collectStringEntries(chapter);
    return {
      id: chapter.id,
      file: `${chapter.id}.json`,
      sourceStart: element.start,
      sourceEnd: element.end,
      raw: element.raw,
      rawBytes: Buffer.byteLength(element.raw, 'utf8'),
      rawSha256: sha256(element.raw),
      stringCount: strings.length,
      stringSha256: stringEntriesSha256(chapter),
      ...countChapterContent(chapter),
    };
  });

  const chapterOrder = chapters.map((chapter) => chapter.id);
  const totals = chapters.reduce((result, chapter) => ({
    sections: result.sections + chapter.sections,
    qas: result.qas + chapter.qas,
    strings: result.strings + chapter.stringCount,
  }), { sections: 0, qas: 0, strings: 0 });

  return {
    parsedSource,
    chapters,
    manifest: {
      manifestVersion: 1,
      migrationPolicy: 'Content-neutral raw extraction from the frozen monolith.',
      source: {
        file: 'src/data/codeData.json',
        bytes: Buffer.byteLength(source, 'utf8'),
        sha256: sha256(source),
      },
      chapterOrder,
      semanticSha256: sha256(JSON.stringify(parsedSource)),
      totals: {
        chapters: chapters.length,
        ...totals,
      },
      sourceReconstruction: {
        prefix: extraction.prefix,
        separators: extraction.separators,
        suffix: extraction.suffix,
      },
      chapters: chapters.map(({ raw, ...chapter }) => chapter),
    },
  };
}

export function writeSplitPlan({ sourcePath, outputDirectory, manifestPath }) {
  const source = readFileSync(sourcePath, 'utf8');
  const plan = buildSplitPlan(source);

  if (existsSync(outputDirectory) && readdirSync(outputDirectory).length > 0) {
    throw new Error(`Refusing to overwrite non-empty directory: ${outputDirectory}`);
  }
  if (existsSync(manifestPath)) {
    throw new Error(`Refusing to overwrite existing manifest: ${manifestPath}`);
  }

  mkdirSync(outputDirectory, { recursive: true });
  const lineEnding = source.includes('\r\n') ? '\r\n' : '\n';
  for (const chapter of plan.chapters) {
    writeFileSync(resolve(outputDirectory, chapter.file), `${chapter.raw}${lineEnding}`, 'utf8');
  }
  writeFileSync(manifestPath, `${JSON.stringify(plan.manifest, null, 2)}\n`, 'utf8');
  return plan.manifest;
}

const isDirectRun = process.argv[1]
  && import.meta.url === new URL(`file:///${resolve(process.argv[1]).replaceAll('\\', '/')}`).href;

if (isDirectRun) {
  try {
    const options = parseArguments(process.argv.slice(2));
    const manifest = writeSplitPlan({
      sourcePath: options.source,
      outputDirectory: options.output,
      manifestPath: options.manifest,
    });
    console.log(`Split ${manifest.totals.chapters} chapters without serializing their content.`);
    console.log(`Source SHA-256: ${manifest.source.sha256}`);
    console.log(`Output: ${relative(PROJECT_ROOT, options.output)}`);
    console.log(`Manifest: ${relative(PROJECT_ROOT, options.manifest)}`);
  } catch (error) {
    console.error(`Code data split failed: ${error.message}`);
    process.exitCode = 1;
  }
}

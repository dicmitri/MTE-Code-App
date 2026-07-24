import test from 'node:test';
import assert from 'node:assert/strict';

import { copyTextToClipboard } from '../src/utils/clipboardUtils.js';

test('writes text through the provided clipboard', async () => {
  const writes = [];
  const clipboard = {
    writeText: async (text) => {
      writes.push(text);
    },
  };

  await copyTextToClipboard('Reference text', clipboard);
  assert.deepEqual(writes, ['Reference text']);
});

test('reports unavailable and rejected clipboard access', async () => {
  await assert.rejects(
    copyTextToClipboard('Reference text', null),
    /Clipboard access is unavailable/,
  );

  await assert.rejects(
    copyTextToClipboard('Reference text', {
      writeText: async () => {
        throw new Error('Permission denied');
      },
    }),
    /Permission denied/,
  );
});

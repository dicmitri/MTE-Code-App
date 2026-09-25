import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_READER_SETTINGS } from '../src/config/readerSettings.js';
import { normalizeReaderSettings } from '../src/utils/readerSettingsUtils.js';

test('keeps saved reader settings that match offered options', () => {
  const saved = { size: '1.25rem', line: '1.80', space: '1rem', measure: '52', panel: 'off' };

  assert.deepEqual(normalizeReaderSettings(saved), saved);
});

test('adds the line length and side panel defaults to settings saved before they existed', () => {
  assert.deepEqual(
    normalizeReaderSettings({ size: '1.25rem', line: '1.80', space: '1rem' }),
    { size: '1.25rem', line: '1.80', space: '1rem', measure: '40', panel: 'on' },
  );
  assert.equal(normalizeReaderSettings({ measure: '999; width: 0' }).measure, DEFAULT_READER_SETTINGS.measure);
});

test('falls back to defaults for missing, unknown, or unexpected values', () => {
  assert.deepEqual(normalizeReaderSettings(null), DEFAULT_READER_SETTINGS);
  assert.deepEqual(normalizeReaderSettings('1rem'), DEFAULT_READER_SETTINGS);
  assert.deepEqual(
    normalizeReaderSettings({ size: '9rem; color: red', line: 1.65, space: undefined }),
    DEFAULT_READER_SETTINGS,
  );
});

test('keeps valid settings when only some saved values are unusable', () => {
  assert.deepEqual(
    normalizeReaderSettings({ size: '1.125rem', line: 'huge' }),
    { ...DEFAULT_READER_SETTINGS, size: '1.125rem' },
  );
});

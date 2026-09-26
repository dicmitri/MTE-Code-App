import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_READER_SETTINGS, getReaderMeasure } from '../src/config/readerSettings.js';
import { normalizeReaderSettings } from '../src/utils/readerSettingsUtils.js';

test('keeps saved reader settings that match offered options', () => {
  const saved = { size: '1.25rem', line: '1.80', space: '1rem', lineLength: 'full', panel: 'off' };

  assert.deepEqual(normalizeReaderSettings(saved), saved);
});

test('adds the line length and side panel defaults to settings saved before they existed', () => {
  assert.deepEqual(
    normalizeReaderSettings({ size: '1.25rem', line: '1.80', space: '1rem' }),
    { size: '1.25rem', line: '1.80', space: '1rem', lineLength: 'standard', panel: 'on' },
  );
  // An earlier preview saved the line length as a number under another name; it is dropped.
  assert.deepEqual(normalizeReaderSettings({ measure: '40' }), DEFAULT_READER_SETTINGS);
  assert.equal(
    normalizeReaderSettings({ lineLength: '999; width: 0' }).lineLength,
    DEFAULT_READER_SETTINGS.lineLength,
  );
});

test('turns the line length into the widest the text column may get', () => {
  assert.equal(getReaderMeasure('narrow'), 'calc(var(--reader-font-size) * 40)');
  assert.equal(getReaderMeasure('standard'), 'calc(var(--reader-font-size) * 52)');
  assert.equal(getReaderMeasure('full'), 'none');
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

import {
  DEFAULT_READER_SETTINGS,
  READER_FONT_SIZES,
  READER_LINE_HEIGHTS,
  READER_LINE_LENGTHS,
  READER_PARAGRAPH_SPACINGS,
  READER_SIDE_PANEL_OPTIONS,
} from '../config/readerSettings.js';

const pickOption = (value, options, fallback) => (
  options.some((option) => option.value === value) ? value : fallback
);

// Only offered values are kept, so an outdated or edited saved preference
// cannot write arbitrary values into the reader's CSS custom properties.
export function normalizeReaderSettings(value) {
  const settings = value && typeof value === 'object' ? value : {};

  return {
    size: pickOption(settings.size, READER_FONT_SIZES, DEFAULT_READER_SETTINGS.size),
    line: pickOption(settings.line, READER_LINE_HEIGHTS, DEFAULT_READER_SETTINGS.line),
    space: pickOption(
      settings.space,
      READER_PARAGRAPH_SPACINGS,
      DEFAULT_READER_SETTINGS.space,
    ),
    measure: pickOption(settings.measure, READER_LINE_LENGTHS, DEFAULT_READER_SETTINGS.measure),
    panel: pickOption(settings.panel, READER_SIDE_PANEL_OPTIONS, DEFAULT_READER_SETTINGS.panel),
  };
}

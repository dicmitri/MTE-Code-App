/**
 * Reading-settings options offered by the header's "Aa" panel. Saved
 * preferences are only accepted if they match one of these values.
 */
export const READER_FONT_SIZES = Object.freeze([
  { label: 'A-', name: 'Small', value: '0.95rem' },
  { label: 'A', name: 'Default', value: '1rem' },
  { label: 'A+', name: 'Large', value: '1.125rem' },
  { label: 'A++', name: 'Extra large', value: '1.25rem' },
]);

export const READER_LINE_HEIGHTS = Object.freeze([
  { label: 'Tight', name: 'Tight', value: '1.50' },
  { label: 'Normal', name: 'Normal', value: '1.65' },
  { label: 'Comfort', name: 'Comfortable', value: '1.80' },
]);

export const READER_PARAGRAPH_SPACINGS = Object.freeze([
  { label: '–', name: 'Compact', value: '0.5rem' },
  { label: '•', name: 'Normal', value: '0.75rem' },
  { label: '+', name: 'Relaxed', value: '1rem' },
]);

// The widest the text column gets, as a multiple of the text size (--reader-measure in
// index.css): about 80 and 105 characters per line. "Full" fills the space between the panes.
export const READER_LINE_LENGTHS = Object.freeze([
  { label: 'Narrow', name: 'Narrow', value: 'narrow', measure: 40 },
  { label: 'Standard', name: 'Standard', value: 'standard', measure: 52 },
  { label: 'Full', name: 'Full width', value: 'full', measure: null },
]);

// Wide screens show a panel beside the text with the page's contents, definitions and
// reference previews; "Off" keeps the pop-up for definitions and opens references directly.
export const READER_SIDE_PANEL_OPTIONS = Object.freeze([
  { label: 'On', name: 'On', value: 'on' },
  { label: 'Off', name: 'Off', value: 'off' },
]);

export const DEFAULT_READER_SETTINGS = Object.freeze({
  size: '1rem',
  line: '1.65',
  space: '0.75rem',
  lineLength: 'standard',
  panel: 'on',
});

export const getReaderMeasure = (lineLength) => {
  const option = READER_LINE_LENGTHS.find(({ value }) => value === lineLength);
  return option?.measure ? `calc(var(--reader-font-size) * ${option.measure})` : 'none';
};

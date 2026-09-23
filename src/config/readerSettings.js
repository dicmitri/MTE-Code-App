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

export const DEFAULT_READER_SETTINGS = Object.freeze({
  size: '1rem',
  line: '1.65',
  space: '0.75rem',
});

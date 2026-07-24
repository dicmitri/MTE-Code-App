import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { tsImport } from 'tsx/esm/api';

const { SuggestionModal } = await tsImport(
  '../src/components/SuggestionModal.jsx',
  import.meta.url,
);

test('renders nothing while the suggestion dialog is closed', () => {
  const markup = renderToStaticMarkup(
    React.createElement(SuggestionModal, {
      isOpen: false,
      onClose: () => {},
    }),
  );

  assert.equal(markup, '');
});

test('renders an accessible suggestion dialog contract', () => {
  const markup = renderToStaticMarkup(
    React.createElement(SuggestionModal, {
      isOpen: true,
      onClose: () => {},
    }),
  );

  assert.match(markup, /role="dialog"/);
  assert.match(markup, /aria-modal="true"/);
  assert.match(markup, /aria-labelledby="suggestion-modal-title"/);
  assert.match(markup, /id="suggestion-modal-title"/);
  assert.match(markup, /aria-describedby="suggestion-modal-description"/);
  assert.match(markup, /id="suggestion-modal-description"/);
  assert.match(markup, /for="suggestion-subject"/);
  assert.match(markup, /id="suggestion-subject"/);
  assert.match(markup, /for="suggestion-details"/);
  assert.match(markup, /id="suggestion-details"/);
  assert.match(markup, /aria-label="Close suggestion dialog"/);
});

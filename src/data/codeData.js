import FULL_CODE_DATA_JSON from './codeData.json';

export const FULL_CODE_DATA = FULL_CODE_DATA_JSON;

export const updateSearchStatus = (message) => {
  const statusEl = document.getElementById('search-status');
  if (statusEl) {
    statusEl.textContent = message;
  }
};

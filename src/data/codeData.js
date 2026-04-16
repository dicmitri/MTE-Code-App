import codeDataJson from './codeData.json';

export const FULL_CODE_DATA = codeDataJson.chapters;

export const updateSearchStatus = (message) => {
  const statusEl = document.getElementById('search-status');
  if (statusEl) {
    statusEl.textContent = message;
  }
};

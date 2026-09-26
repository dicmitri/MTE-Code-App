import { useEffect, useState } from 'react';
import { normalizeReaderSettings } from '../utils/readerSettingsUtils';

const STORAGE_KEY = 'mte_reader_settings';

export const useReaderSettings = () => {
  const [settings, setSettings] = useState(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      return normalizeReaderSettings(saved ? JSON.parse(saved) : null);
    } catch (error) {
      console.error('Could not load reader settings', error);
      return normalizeReaderSettings(null);
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Could not save reader settings', error);
    }
  }, [settings]);

  const setSetting = (key) => (value) => {
    setSettings((current) => normalizeReaderSettings({ ...current, [key]: value }));
  };

  return {
    readerSize: settings.size,
    setReaderSize: setSetting('size'),
    readerLine: settings.line,
    setReaderLine: setSetting('line'),
    readerSpace: settings.space,
    setReaderSpace: setSetting('space'),
    readerLineLength: settings.lineLength,
    setReaderLineLength: setSetting('lineLength'),
    readerSidePanel: settings.panel,
    setReaderSidePanel: setSetting('panel'),
  };
};

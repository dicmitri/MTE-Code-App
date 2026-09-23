import React from 'react';
import { AppIcon } from './AppIcons';

export const SectionLoadError = ({ sectionName, onGoHome }) => (
  <main className="flex-1 h-full overflow-y-auto bg-gray-50/50 custom-scrollbar p-8">
    <div
      role="alert"
      className="max-w-4xl mx-auto bg-white border border-slate-100 rounded-2xl shadow-sm p-6"
    >
      <p className="flex items-start gap-2 text-sm font-semibold text-gray-800">
        <AppIcon name="AlertTriangle" size={18} className="text-amber-600 shrink-0 mt-0.5" />
        The {sectionName} could not be loaded. Check your connection, then reload the page.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white bg-[#7654A1] hover:bg-[#634488] transition-colors"
        >
          <AppIcon name="RotateCcw" size={16} />
          Reload
        </button>
        <button
          type="button"
          onClick={onGoHome}
          className="px-4 py-2 rounded-xl text-sm font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
        >
          Back to Home
        </button>
      </div>
    </div>
  </main>
);

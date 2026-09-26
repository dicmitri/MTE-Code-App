import React from 'react';
import { AppIcon } from './AppIcons';
import CvsEventLookup from './CvsEventLookup';
import { useCvsLookup } from '../hooks/useCvsLookup';

export default function CvsPrototype({ onGoHome, scrollRef }) {
  const lookup = useCvsLookup();
  return (
    <main ref={scrollRef} className="flex-1 h-full overflow-y-auto bg-gray-50/50 custom-scrollbar print:h-auto print:overflow-visible">
      <div className="max-w-3xl mx-auto px-4 py-8 sm:px-8">
        <button type="button" onClick={onGoHome} className="no-print mb-6 flex items-center gap-2 text-sm text-slate-500 hover:text-[#7654A1]">
          <AppIcon name="ChevronLeft" size={16} /> Back to Home
        </button>
        <span className="inline-block rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold text-[#7654A1]">Internal prototype</span>
        <h1 className="mt-3 text-3xl font-bold text-slate-800">Find an event in CVS</h1>
        <p className="mt-3 text-slate-600">CVS status is retrieved live from the CVS platform.</p>
        <p className="mt-2 text-sm text-slate-500">Find the event, then select it to check its current status. This prototype does not make a sponsorship decision.</p>

        <CvsEventLookup lookup={lookup} />
      </div>
    </main>
  );
}

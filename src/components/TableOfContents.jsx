import React, { useEffect, useState } from 'react';

export const TableOfContents = ({ sections, showSummary }) => {
  const [activeSection, setActiveSection] = useState(null);

  useEffect(() => {
    if (!sections || sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // We want the highest intersecting element
        const intersecting = entries.filter((e) => e.isIntersecting);
        if (intersecting.length > 0) {
          // If multiple, pick the first one visible
          setActiveSection(intersecting[0].target.id);
        }
      },
      { rootMargin: '-10% 0px -80% 0px' }
    );

    sections.forEach((s) => {
      const el = document.getElementById(s.computedId);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [sections]);

  // If there's only 1 section and no summary, a TOC is useless
  if (!sections || (sections.length < 2 && !showSummary)) return null;

  return (
    <div className="space-y-4 font-sans no-print opacity-0 animate-fade-in" style={{ animationDelay: '300ms', animationFillMode: 'forwards' }}>
      <h4 className="text-[10px] font-bold text-[#0099A7] uppercase tracking-widest mb-4">On This Page</h4>
      <ul className="space-y-3 pl-2 border-l-2 border-gray-100">
        {showSummary && (
          <li>
            <button
              onClick={() => {
                const el = document.getElementById('summary-top');
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                setActiveSection('summary-top');
              }}
              className={`block pl-4 text-xs leading-relaxed transition-all text-left ${
                activeSection === 'summary-top' || !activeSection
                  ? 'text-[#0099A7] font-bold border-l-2 border-[#0099A7] -ml-[2px]'
                  : 'text-gray-500 hover:text-gray-900 border-l-2 border-transparent -ml-[2px]'
              }`}
            >
              Summary
            </button>
          </li>
        )}
        {sections.map((s) => (
          <li key={s.computedId}>
            <button
              onClick={() => {
                const el = document.getElementById(s.computedId);
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className={`block pl-4 text-xs leading-relaxed transition-all text-left ${
                activeSection === s.computedId
                  ? 'text-[#0099A7] font-bold border-l-2 border-[#0099A7] -ml-[2px]'
                  : 'text-gray-500 hover:text-gray-900 border-l-2 border-transparent -ml-[2px]'
              }`}
            >
              {s.title}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

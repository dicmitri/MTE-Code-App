import React, { useMemo } from 'react';
import { AppIcon } from './AppIcons';
import { parseSemicolonCsv } from '../utils/csvUtils';

export const CsvTemplatePreview = ({ csvText, downloadUrl, filename }) => {
  const generatedId = React.useId();
  const titleId = `declaration-template-preview-${generatedId}`;
  const parsed = useMemo(() => {
    try {
      return { data: parseSemicolonCsv(csvText), error: null };
    } catch (error) {
      return { data: null, error: error.message };
    }
  }, [csvText]);

  return (
    <aside
      className="no-print mt-5 overflow-hidden rounded-2xl border border-cyan-200 bg-cyan-50/50"
      aria-labelledby={titleId}
    >
      <div className="flex flex-col gap-4 border-b border-cyan-200 bg-white/80 p-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-cyan-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-cyan-800">
            <AppIcon name="CVSIcon" size={12} />
            Convenience preview
          </div>
          <h2
            id={titleId}
            className="text-base font-bold text-slate-900"
          >
            Declaration CSV template
          </h2>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-600">
            Generated directly from the bundled CSV file. This preview is not part
            of the published Disclosure Guidelines; download the file to use the
            template.
          </p>
        </div>
        <a
          href={downloadUrl}
          download={filename}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#7654A1] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-[#634488]"
        >
          <AppIcon name="Download" size={16} />
          Download CSV
        </a>
      </div>

      {parsed.error ? (
        <p role="alert" className="p-5 text-sm font-semibold text-red-700">
          The preview could not be rendered: {parsed.error}
        </p>
      ) : (
        <div className="overflow-x-auto p-4">
          <table className="min-w-max border-separate border-spacing-0 text-left text-xs">
            <caption className="sr-only">
              Exact columns and example rows contained in {filename}
            </caption>
            <thead>
              <tr>
                {parsed.data.headers.map((header) => (
                  <th
                    key={header}
                    scope="col"
                    className="max-w-52 border-b border-r border-slate-300 bg-slate-100 px-3 py-2.5 font-bold text-slate-700 first:border-l first:rounded-tl-lg last:rounded-tr-lg"
                  >
                    <span className="block break-words">{header}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {parsed.data.rows.map((cells, rowIndex) => (
                <tr key={`${rowIndex}-${cells.join('\u001f')}`} className="bg-white">
                  {cells.map((cell, cellIndex) => (
                    <td
                      key={`${cellIndex}-${cell}`}
                      className="max-w-52 border-b border-r border-slate-200 px-3 py-2.5 text-slate-700 first:border-l"
                    >
                      <span className="block break-words">
                        {cell || <span aria-label="Empty cell">&nbsp;</span>}
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </aside>
  );
};

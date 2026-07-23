import React, { useState } from 'react';
import { AppIcon } from './AppIcons';

export const SuggestionModal = ({ isOpen, onClose }) => {
  const [subject, setSubject] = useState('');
  const [details, setDetails] = useState('');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const recipientEmail = 'ethics@medtecheurope.org';

  const handleOpenDraft = (e) => {
    e.preventDefault();
    const mailtoSubject = subject.trim() ? `[Code App Suggestion] ${subject}` : '[Code App Suggestion] Feedback';
    const mailtoBody = details.trim() ? details : '(No details provided)';
    const mailtoUrl = `mailto:${recipientEmail}?subject=${encodeURIComponent(mailtoSubject)}&body=${encodeURIComponent(mailtoBody)}`;
    window.location.href = mailtoUrl;
    onClose();
  };

  const handleCopyClipboard = () => {
    const textToCopy = `To: ${recipientEmail}\nSubject: ${subject.trim() ? `[Code App Suggestion] ${subject}` : '[Code App Suggestion] Feedback'}\n\n${details.trim()}`;
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in no-print" onClick={onClose}>
      <div 
        className="bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-lg overflow-hidden animate-scale-up" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <AppIcon name="Lightbulb" size={22} className="text-amber-100 shrink-0" />
            <div>
              <h3 className="font-bold text-base leading-tight">Send a Suggestion</h3>
              <p className="text-xs text-amber-100 font-light">Direct feedback to ethics@medtecheurope.org</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-amber-100 hover:text-white p-1 rounded-lg hover:bg-amber-700/50 transition-colors"
            title="Close modal"
          >
            <AppIcon name="X" size={20} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleOpenDraft} className="p-6 space-y-4 text-left">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Title / Subject
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Feature Idea: Quick Search for Glossary"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3.5 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Details / Description
            </label>
            <textarea
              required
              rows={4}
              placeholder="Describe your requested change, feature idea, or feedback..."
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-500 transition-all resize-none"
            />
          </div>

          {copied && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl p-3 flex items-center gap-2 animate-fade-in">
              <AppIcon name="Check" size={16} className="text-emerald-600 shrink-0" />
              <span>Suggestion copied to clipboard! Paste it into your email client.</span>
            </div>
          )}

          {/* Action Footer */}
          <div className="pt-3 border-t border-gray-100 flex flex-col sm:flex-row gap-2.5 sm:justify-end">
            <button
              type="button"
              onClick={handleCopyClipboard}
              className="px-4 py-2.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors flex items-center justify-center gap-1.5"
              title="Copy formatted text for webmail users"
            >
              <AppIcon name="Copy" size={15} />
              <span>Copy text</span>
            </button>

            <button
              type="submit"
              className="px-5 py-2.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2"
            >
              <AppIcon name="Send" size={15} />
              <span>Open Email Draft</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

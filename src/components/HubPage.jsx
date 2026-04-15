import React from 'react';
import { Logo } from './Logo';
import { AppIcon } from './AppIcons';
import { SECTIONS } from '../config/sections';

export const HubPage = ({ onSelectSection }) => (
  <div className="animate-fade-in py-10 px-4 max-w-5xl mx-auto overflow-y-auto h-full custom-scrollbar pb-24">
    <div className="text-center mb-16">
      <div className="scale-90 sm:scale-100 origin-center flex justify-center">
        <Logo size={144} className="mx-auto mb-8" centerImage={true} />
      </div>
      <h1 className="text-4xl font-bold text-gray-900 mb-4 tracking-tight">
        The MedTech Europe Code of Ethical Business Practice
      </h1>
      <p className="text-xl text-gray-500 max-w-2xl mx-auto font-light leading-relaxed">
        Digital Compliance Toolkit — v1.0
      </p>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 max-w-3xl mx-auto">
      {SECTIONS.filter(s => s.available).map((section) => (
        <button
          key={section.id}
          onClick={() => onSelectSection(section.id)}
          className="hub-card group bg-white p-8 rounded-2xl border border-gray-200 shadow-sm text-left transition-all flex flex-col h-full active:scale-[0.97] relative overflow-hidden"
        >
          {/* Accent bar */}
          <div
            className="absolute top-0 left-0 right-0 h-1 transition-all duration-300 group-hover:h-1.5"
            style={{ backgroundColor: section.color }}
          />

          <div
            className="p-4 rounded-xl w-fit mb-5 transition-colors duration-300"
            style={{
              backgroundColor: `${section.color}12`,
              color: section.color,
            }}
          >
            <AppIcon name={section.icon} size={36} />
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {section.title}
          </h2>

          <p className="text-sm text-gray-500 font-light leading-relaxed mb-6 flex-1">
            {section.description}
          </p>

          <div
            className="flex items-center text-xs font-bold uppercase tracking-wider transition-colors duration-300"
            style={{ color: section.color }}
          >
            Open
            <AppIcon
              name="ChevronRight"
              size={14}
              className="ml-1 transition-transform group-hover:translate-x-1"
            />
          </div>
        </button>
      ))}
    </div>
  </div>
);

import React from 'react';
import { FULL_CODE_DATA } from '../data/codeData';
import { AppIcon } from './AppIcons';
import { Logo } from './Logo';

export const LandingPage = ({ onSelectChapter }) => (
    <div className="animate-fade-in py-10 px-4 max-w-6xl mx-auto overflow-y-auto h-full custom-scrollbar pb-24">
        <div className="text-center mb-16">
            <div className="scale-90 sm:scale-100 origin-center flex justify-center">
                <Logo size={144} className="mx-auto mb-8" centerImage={true} />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4 tracking-tight">The MedTech Europe Code of Ethical Business Practice</h1>
            <p className="text-xl text-gray-500 max-w-2xl mx-auto font-light leading-relaxed">
                Digital version 1.0. Code text: September 2024. 
            </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FULL_CODE_DATA.map((item) => (
                <button 
                    key={item.id}
                    onClick={() => onSelectChapter(item.id)}
                    className="chapter-card bg-white p-6 rounded-2xl border border-gray-200 shadow-sm text-left transition-all flex flex-col h-full active:scale-95 group"
                >
                    <div className="p-3 bg-purple-50 rounded-xl w-fit mb-4 text-[#0099A7] group-hover:bg-[#0099A7] group-hover:text-white transition-colors">
                        <AppIcon name={item.icon} size={28} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{item.title}</h3>
                    <div className="mt-6 flex items-center text-xs font-bold text-[#7654A1] uppercase tracking-wider">
                        View Chapter <AppIcon name="ChevronRight" size={14} className="ml-1 transition-transform group-hover:translate-x-1" />
                    </div>
                </button>
            ))}
        </div>
    </div>
);


import React, { useState } from 'react';
import { SEOData } from '../../types';

interface Props {
  seoData: SEOData | null;
  isGenerating: boolean;
  onRestart: () => void;
  hasScript: boolean;
  title?: string;
  script?: string;
}

const CopyButton: React.FC<{ text: string, label?: string, onClick?: () => void }> = ({ text, label = "Copy", onClick }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (onClick) {
      onClick();
    } else {
      navigator.clipboard.writeText(text);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className={`
        px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border flex items-center gap-1.5 shrink-0
        ${copied 
          ? 'bg-green-500/10 border-green-500/30 text-green-400' 
          : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700 hover:text-white'}
      `}
    >
      {copied ? (
        <>
           <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
           Copied
        </>
      ) : (
        <>
           <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
           {label}
        </>
      )}
    </button>
  );
};

const KeywordChip: React.FC<{ keyword: string }> = ({ keyword }) => {
  const [copied, setCopied] = useState(false);
  
  const handleClick = () => {
    navigator.clipboard.writeText(keyword);
    setCopied(true);
    setTimeout(() => setCopied(false), 1000);
  };

  return (
    <button 
      onClick={handleClick}
      className={`
        px-2 py-1.5 rounded border text-xs transition-all relative overflow-hidden group text-left
        ${copied 
          ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300' 
          : 'bg-[#0d1117] border-gray-800 text-gray-400 hover:border-gray-600 hover:text-gray-200'}
      `}
      title="Click to copy"
    >
      {keyword}
      {copied && (
        <span className="absolute inset-0 flex items-center justify-center bg-[#0d1117]/90 text-[9px] font-bold uppercase text-emerald-400 animate-fade-in backdrop-blur-sm">
          Copied
        </span>
      )}
    </button>
  );
};

export const Step4SEO: React.FC<Props> = ({ seoData, isGenerating, onRestart, hasScript, title, script }) => {
  
  const handleDownload = () => {
    if (!seoData) return;
    const content = `
TITLES OPTIONS:
${seoData.titles.map((t, i) => `${i+1}. ${t}`).join('\n')}

DESCRIPTION STACK:
${seoData.description}

${seoData.contextExpansion}

${seoData.hashtags.join('\n')}

KEYWORDS:
${seoData.keywords.join(', ')}
    `.trim();

    let baseName = title;
    if (!baseName && script) {
      baseName = script.split(/\s+/).slice(0, 5).join('_');
    }
    const safeTitle = baseName ? baseName.trim().replace(/[^a-z0-9]+/gi, '_').toLowerCase() : 'video_metadata';
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeTitle}_seo.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyDescriptionStack = () => {
    if (!seoData) return;
    const stack = [
        seoData.description,
        "",
        seoData.contextExpansion,
        "",
        seoData.hashtags.join('\n')
    ].join('\n');
    navigator.clipboard.writeText(stack);
  };

  // 1. Loading State
  if (isGenerating) {
    return (
      <div className="flex flex-col items-center justify-center h-80 space-y-6 animate-fade-in">
        <div className="relative w-16 h-16">
           <div className="absolute inset-0 rounded-full border-4 border-indigo-900/30"></div>
           <div className="absolute inset-0 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin"></div>
        </div>
        <div className="text-center">
          <p className="text-indigo-300 font-bold text-lg mb-1">Algorithmic Analysis...</p>
          <p className="text-gray-500 text-xs uppercase tracking-widest">Generating high-retention metadata</p>
        </div>
      </div>
    );
  }

  // 2. Empty State (No script provided yet)
  if (!hasScript) {
    return (
      <div className="flex flex-col items-center justify-center h-80 space-y-6 animate-fade-in text-center px-6">
        <div className="w-20 h-20 rounded-full bg-gray-800/50 border border-gray-700 flex items-center justify-center text-gray-600 mb-2">
           <svg className="w-8 h-8 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
        </div>
        <div>
           <h3 className="text-xl font-bold text-white mb-2">No Content to Optimize</h3>
           <p className="text-gray-400 text-sm max-w-sm mx-auto leading-relaxed">
             Please generate or paste a script in Step 1 or Step 2 first. 
             The AI needs context to generate effective titles and tags.
           </p>
        </div>
      </div>
    );
  }

  if (!seoData) return null;

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-4 border-b border-gray-800 pb-6">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">SEO & Metadata</h2>
          <p className="text-gray-500 text-sm">Optimized for search rankings and click-through rate.</p>
        </div>
        <div className="flex gap-3">
           <button
             onClick={handleDownload}
             className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow-lg shadow-indigo-900/20"
           >
             <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
             Download Full Report
           </button>
           <button
             onClick={onRestart}
             className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl font-bold text-xs uppercase tracking-wider transition-all"
           >
             Start Over
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* LEFT COLUMN: Titles & Keywords */}
        <div className="space-y-6">
            
            {/* Title Options */}
            <div className="bg-[#161b22] border border-gray-800 rounded-xl p-6 relative overflow-hidden">
               <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl"></div>
               <label className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-4 block">
                  Title Strategy (4 Variations)
               </label>
               <div className="space-y-3">
                  {seoData.titles.map((title, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-4 p-3 rounded-lg bg-[#0d1117] border border-gray-700/50 hover:border-indigo-500/50 transition-colors group">
                          <div className="flex items-center gap-3">
                              <span className="text-xs font-bold text-gray-600 bg-gray-800 px-1.5 py-0.5 rounded group-hover:bg-indigo-900/50 group-hover:text-indigo-300 transition-colors">{idx + 1}</span>
                              <span className="text-sm font-medium text-gray-200 group-hover:text-white">{title}</span>
                          </div>
                          <CopyButton text={title} />
                      </div>
                  ))}
               </div>
            </div>

            {/* LSI Keywords (Moved here) */}
            <div className="bg-[#161b22] border border-gray-800 rounded-xl p-6 group hover:border-gray-600 transition-colors">
                <div className="flex justify-between items-center mb-4">
                    <label className="text-xs font-bold text-emerald-500 uppercase tracking-widest">
                       LSI Keywords <span className="text-gray-600 font-normal ml-1">(Click to copy)</span>
                    </label>
                </div>
                <div className="flex flex-wrap gap-2">
                    {seoData.keywords.map((kw, i) => (
                        <KeywordChip key={i} keyword={kw} />
                    ))}
                </div>
            </div>

        </div>

        {/* RIGHT COLUMN: The Description Stack */}
        <div className="flex flex-col h-full">

            <div className="flex-1 bg-[#161b22] border border-gray-800 rounded-xl relative overflow-hidden flex flex-col group hover:border-gray-600 transition-colors shadow-2xl">
                {/* Decorative Header */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
                
                {/* Stack Header */}
                <div className="p-6 border-b border-gray-800 bg-[#0d1117]/80 flex justify-between items-center sticky top-0 backdrop-blur-md z-10">
                   <div>
                     <h3 className="text-sm font-bold text-white uppercase tracking-wide">Description Stack</h3>
                     <p className="text-[10px] text-gray-500">Includes Description, Deep Dive & Tags</p>
                   </div>
                   <CopyButton 
                     text="" 
                     label="Copy Full Stack" 
                     onClick={copyDescriptionStack} 
                   />
                </div>

                {/* Content Area */}
                <div className="p-6 space-y-8 overflow-y-auto custom-scrollbar flex-1 max-h-[600px]">
                   
                   {/* 1. Main Description */}
                   <div>
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 block">
                        Main Description
                      </span>
                      <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                        {seoData.description}
                      </p>
                   </div>

                   {/* 2. Context Expansion */}
                   <div className="relative">
                      <div className="absolute -left-3 top-0 bottom-0 w-1 bg-amber-500/20 rounded-full"></div>
                      <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-2 block">
                        Context Expansion (Deep Dive)
                      </span>
                      <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                        {seoData.contextExpansion}
                      </p>
                   </div>

                   {/* 3. Hashtags */}
                   <div>
                      <span className="text-[10px] font-bold text-pink-500 uppercase tracking-widest mb-3 block">
                        Viral Tags
                      </span>
                      <div className="flex flex-wrap gap-2 p-3 bg-[#0d1117] rounded-lg border border-gray-800/50">
                        {seoData.hashtags.map(tag => (
                            <span key={tag} className="text-pink-300/80 text-xs font-mono">
                                {tag}
                            </span>
                        ))}
                      </div>
                      <p className="text-[9px] text-gray-600 mt-2">*Copied as a vertical list for easy pasting.</p>
                   </div>

                </div>
            </div>

        </div>

      </div>
    </div>
  );
};

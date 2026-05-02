import React, { useState } from 'react';
import { ScriptAnalysis } from '@/types';
import { DEFAULT_SCRIPT_INSTRUCTION, DEFAULT_ANALYZE_INSTRUCTION } from '@/services/geminiService';
import { InstructionModal } from '@/components/sidebar/InstructionModal';

interface Props {
  script: string;
  onScriptChange: (val: string) => void;
  analysis: ScriptAnalysis | null;
  onAnalyze: (customInstruction?: string) => void;
  onImprove: (instruction: string, customInstruction?: string) => void;
  onGenerate: (topic: string, tone: string, customInstruction?: string) => void;
  isAnalyzing: boolean;
  isImproving: boolean;
  onNext: () => void;
  isAdvancedMode?: boolean;
}

// --- Icons ---
const CheckCircle = () => <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>;
const AlertTriangle = () => <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>;
const MagicWand = () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>;
const GearIcon = () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;

export const Step1Settings: React.FC<Props> = ({ 
  script, onScriptChange, analysis, onAnalyze, onImprove, onGenerate, isAnalyzing, isImproving, onNext, isAdvancedMode
}) => {
  const [topic, setTopic] = useState("");

  // Advanced Mode States
  const [customScriptInstruction, setCustomScriptInstruction] = useState(DEFAULT_SCRIPT_INSTRUCTION);
  const [customAnalyzeInstruction, setCustomAnalyzeInstruction] = useState(DEFAULT_ANALYZE_INSTRUCTION);
  
  const [isScriptModalOpen, setIsScriptModalOpen] = useState(false);
  const [isAnalyzeModalOpen, setIsAnalyzeModalOpen] = useState(false);

  // If script is empty, we show Generation Mode. If script exists, we show Editor/Analysis mode.
  const isEditorMode = script && script.length > 10;

  const handleGenerateClick = () => {
    if(!topic.trim()) return;
    onGenerate(topic, "Dramatic", isAdvancedMode ? customScriptInstruction : undefined); // Default tone since selector is removed
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) onScriptChange(text);
    } catch (e) {
      console.error("Paste failed", e);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400 border-green-500/30 bg-green-900/10';
    if (score >= 60) return 'text-amber-400 border-amber-500/30 bg-amber-900/10';
    return 'text-red-400 border-red-500/30 bg-red-900/10';
  };

  return (
    <div className="flex flex-col xl:flex-row gap-6 h-full animate-fade-in">
      
      {/* LEFT COLUMN: Input & Editor Area */}
      <div className="flex-1 flex flex-col gap-6">
        
        {/* GENERATOR CARD */}
        <div className="bg-[#161b22] border border-gray-800 rounded-xl p-6 shadow-xl relative overflow-hidden">
           <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl"></div>
           
           <div className="flex items-center justify-between mb-4 relative z-10">
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                   1. STORY GENERATOR
                </label>
                {isAdvancedMode && (
                  <button 
                    onClick={() => setIsScriptModalOpen(true)} 
                    className="text-amber-500 hover:text-amber-400 p-1 rounded hover:bg-amber-500/10 transition-colors" 
                    title="Edit AI Instructions"
                  >
                    <GearIcon />
                  </button>
                )}
              </div>
              {isEditorMode && (
                <button 
                  onClick={() => onScriptChange("")}
                  className="text-[10px] text-gray-500 hover:text-white uppercase tracking-wider transition-colors"
                >
                  Create New
                </button>
              )}
           </div>

           {!isEditorMode ? (
             <div className="space-y-4 animate-slide-up">
                <div>
                   <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">What is your story about?</label>
                   <input 
                      type="text"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder="e.g. The mysterious disappearance of Flight 19..."
                      className="w-full bg-[#0d1117] border border-gray-700 text-white rounded-lg p-4 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all placeholder-gray-600 mb-4"
                      onKeyDown={(e) => e.key === 'Enter' && handleGenerateClick()}
                   />
                </div>
                
                <div className="flex items-end">
                   <button 
                     onClick={handleGenerateClick}
                     disabled={!topic.trim() || isAnalyzing}
                     className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold p-3 rounded-lg shadow-lg shadow-indigo-900/20 hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                   >
                     {isAnalyzing ? (
                        <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Writing Script...</>
                     ) : (
                        <>Generate Story <MagicWand /></>
                     )}
                   </button>
                </div>
                <p className="text-[10px] text-gray-500 text-center pt-2">
                   The AI will generate a 3rd-person narrative script tailored for short-form video.
                </p>
             </div>
           ) : (
             <div className="flex items-center gap-4 animate-fade-in">
                <div className="w-10 h-10 bg-green-500/10 text-green-400 rounded-full flex items-center justify-center border border-green-500/20">
                   <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                </div>
                <div>
                   <h3 className="text-sm font-bold text-white">Script Generated Successfully</h3>
                   <p className="text-xs text-gray-500">You can edit the result below or regenerate.</p>
                </div>
             </div>
           )}
        </div>

        {/* EDITOR AREA (Visible only if script exists) */}
        {isEditorMode && (
          <div className="animate-slide-up flex flex-col gap-4 flex-1">
             <div className="relative group w-full h-[500px] md:h-[850px]">
               <div className="absolute -inset-0.5 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-xl blur opacity-50 group-hover:opacity-100 transition duration-1000"></div>
               <div className="relative h-full bg-[#161b22] border border-gray-800 rounded-xl overflow-hidden shadow-2xl flex flex-col">
                  <div className="h-10 border-b border-gray-800 bg-[#0d1117] flex items-center justify-between px-4 shrink-0">
                     <div className="flex items-center gap-3">
                         <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Script Editor</span>
                         <button 
                            onClick={handlePaste}
                            className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-gray-800 text-[10px] font-bold text-indigo-400 hover:text-indigo-300 uppercase tracking-wider transition-colors"
                         >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                            Paste
                         </button>
                     </div>
                     {analysis && analysis.estimatedDuration && (
                       <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">
                          ~{analysis.estimatedDuration}
                       </div>
                     )}
                  </div>
                  <textarea 
                    value={script}
                    onChange={(e) => onScriptChange(e.target.value)}
                    className="w-full flex-1 bg-transparent p-6 text-base text-gray-200 font-serif leading-relaxed resize-none focus:outline-none custom-scrollbar"
                    spellCheck="false"
                    placeholder="Your generated script will appear here..."
                  />
                  <div className="h-8 border-t border-gray-800 bg-[#0d1117] flex items-center justify-end px-4 shrink-0">
                     <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                        {script.split(/\s+/).filter(Boolean).length} words
                     </div>
                  </div>
               </div>
            </div>

            {/* Action Bar */}
            <div className="flex justify-end gap-3 items-center">
               {isAdvancedMode && (
                 <button 
                   onClick={() => setIsAnalyzeModalOpen(true)} 
                   className="text-amber-500 hover:text-amber-400 p-2 rounded hover:bg-amber-500/10 transition-colors" 
                   title="Edit AI Instructions"
                 >
                   <GearIcon />
                 </button>
               )}
               <button
                 onClick={() => onAnalyze(isAdvancedMode ? customAnalyzeInstruction : undefined)}
                 disabled={isAnalyzing}
                 className="px-6 py-3 bg-[#1F2937] hover:bg-gray-700 text-gray-300 font-bold text-xs uppercase tracking-wider rounded-xl transition-all border border-gray-700"
               >
                 {isAnalyzing ? "Re-Analyzing..." : "Re-Analyze"}
               </button>
               
                <button
                  onClick={onNext}
                  className="px-8 py-3 bg-green-600 hover:bg-green-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-green-900/40 hover:shadow-green-500/50 transition-all flex items-center gap-2 active:scale-95 border border-green-400/30"
                >
                  Proceed to Audio &rarr;
                </button>
            </div>
          </div>
        )}

      </div>

      {/* RIGHT COLUMN: Analysis Dashboard (Only Visible if Analysis Exists) */}
      {analysis && (
        <div className="xl:w-[450px] flex flex-col gap-5 animate-slide-left">
           
           <div className="flex items-center justify-between">
             <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                2. AI Analysis Report
             </label>
             {isAdvancedMode && (
                <button 
                  onClick={() => setIsAnalyzeModalOpen(true)} 
                  className="text-amber-500 hover:text-amber-400 p-1 rounded hover:bg-amber-500/10 transition-colors" 
                  title="Edit AI Instructions"
                >
                  <GearIcon />
                </button>
             )}
           </div>

           <div className="flex-1 bg-[#161b22]/40 backdrop-blur-2xl border border-gray-700/50 rounded-2xl overflow-hidden flex flex-col shadow-[0_8px_32px_rgba(0,0,0,0.5)] relative">
              
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none"></div>

              {/* Header Score & Bento Grip */}
              <div className="p-6 pb-4 relative z-10 space-y-4">
                 
                 <div className="flex items-start justify-between">
                   <div className="space-y-1">
                     <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Viral Potential</p>
                     <div className="flex items-baseline gap-2">
                       <span className={`text-5xl font-black tracking-tighter ${getScoreColor(analysis.score).split(' ')[0]}`}>
                         {analysis.score}
                       </span>
                       <span className="text-xl text-gray-600 font-bold">/100</span>
                     </div>
                   </div>
                   <div className={`px-4 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest shadow-lg ${getScoreColor(analysis.score)} bg-opacity-20`}>
                      {analysis.score >= 80 ? '🔥 Viral Hit' : analysis.score >= 60 ? '✨ Good' : '⚠️ Needs Work'}
                   </div>
                 </div>

                 {/* Metrics Grid */}
                 <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="bg-black/30 p-4 rounded-xl border border-white/5 shadow-inner">
                       <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Hook Rating</p>
                       <p className={`text-lg font-bold tracking-tight ${analysis.hookRating === 'Viral' ? 'text-pink-400 drop-shadow-[0_0_8px_rgba(244,114,182,0.5)]' : analysis.hookRating === 'Good' ? 'text-emerald-400' : 'text-amber-400'}`}>
                         {analysis.hookRating}
                       </p>
                    </div>
                    <div className="bg-black/30 p-4 rounded-xl border border-white/5 shadow-inner">
                       <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Pacing</p>
                       <p className="text-sm font-bold text-gray-200 capitalize leading-tight">{analysis.pacing}</p>
                    </div>
                 </div>
              </div>

              <div className="px-6 pb-6 space-y-5 overflow-y-auto custom-scrollbar flex-1 relative z-10">
                 
                 {/* Fact Check */}
                 <div className="bg-white/5 rounded-xl border border-white/5 p-4">
                    <h4 className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                       <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                       Fact Check & Safety
                    </h4>
                    <div className="space-y-2.5">
                       {(analysis.factCheck || []).map((fact, i) => (
                          <div key={i} className="flex items-start gap-2.5 text-xs text-gray-300">
                             <div className="mt-0.5 shrink-0">
                               {fact && fact.toLowerCase().includes('verified') ? <CheckCircle /> : <AlertTriangle />}
                             </div>
                             <span className="leading-relaxed font-medium">{fact}</span>
                          </div>
                       ))}
                    </div>
                 </div>

                 {/* Critique */}
                 <div className="bg-white/5 rounded-xl border border-white/5 p-4">
                    <h4 className="text-[10px] font-bold text-purple-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                       <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                       Structural Critique
                    </h4>
                    <div className="space-y-3">
                       {analysis.strengths && analysis.strengths.length > 0 && (
                         <div className="flex gap-3 bg-green-500/10 p-3 rounded-lg border border-green-500/20">
                            <span className="font-black text-green-400 shrink-0">+</span>
                            <span className="text-xs text-gray-200 font-medium leading-relaxed">{analysis.strengths[0]}</span>
                         </div>
                       )}
                       {analysis.weaknesses && analysis.weaknesses.length > 0 && (
                         <div className="flex gap-3 bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                            <span className="font-black text-red-400 shrink-0">-</span>
                            <span className="text-xs text-gray-200 font-medium leading-relaxed">{analysis.weaknesses[0]}</span>
                         </div>
                       )}
                    </div>
                 </div>

              </div>

              {/* Improvement Actions */}
              <div className="p-4 bg-black/40 backdrop-blur-xl border-t border-white/10 relative z-10">
                 <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-3 text-center">AI Editor Actions</p>
                 <div className="grid grid-cols-2 gap-3">
                    <button 
                       onClick={() => onImprove("Make the hook more viral and shocking.", isAdvancedMode ? customAnalyzeInstruction : undefined)}
                       disabled={isImproving}
                       className="bg-[#1F2937]/80 hover:bg-indigo-500/20 border border-gray-600 hover:border-indigo-400 text-gray-300 text-[10px] font-bold py-2.5 rounded-lg transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                       {isImproving ? <span className="animate-pulse">Processing...</span> : <><svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg> Boost Hook</>}
                    </button>
                    <button 
                       onClick={() => onImprove("Fix grammar and make the tone more conversational.", isAdvancedMode ? customAnalyzeInstruction : undefined)}
                       disabled={isImproving}
                       className="bg-[#1F2937]/80 hover:bg-indigo-500/20 border border-gray-600 hover:border-indigo-400 text-gray-300 text-[10px] font-bold py-2.5 rounded-lg transition-all disabled:opacity-50"
                    >
                       {isImproving ? <span className="animate-pulse">Processing...</span> : "Fix Grammar"}
                    </button>
                    <button 
                       onClick={() => onImprove("Make the script shorter and more punchy (under 40s).", isAdvancedMode ? customAnalyzeInstruction : undefined)}
                       disabled={isImproving}
                       className="bg-[#1F2937]/80 hover:bg-indigo-500/20 border border-gray-600 hover:border-indigo-400 text-gray-300 text-[10px] font-bold py-2.5 rounded-lg transition-all disabled:opacity-50"
                    >
                       {isImproving ? <span className="animate-pulse">Processing...</span> : "Shorten"}
                    </button>
                    <button 
                       onClick={() => onImprove(analysis.improvementSuggestion, isAdvancedMode ? customAnalyzeInstruction : undefined)}
                       disabled={isImproving}
                       className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-2.5 rounded-lg transition-all flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(79,70,229,0.4)] active:scale-95 disabled:opacity-50"
                    >
                       {isImproving ? (
                          <div className="flex items-center gap-1.5">
                             <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                             Applying...
                          </div>
                       ) : <><MagicWand /> Auto Fix</>}
                    </button>
                 </div>
              </div>

           </div>

        </div>
      )}

      {/* Advanced Mode Modals */}
      <InstructionModal
        isOpen={isScriptModalOpen}
        onClose={() => setIsScriptModalOpen(false)}
        title="Script Generator"
        instruction={customScriptInstruction}
        onInstructionChange={setCustomScriptInstruction}
        defaultInstruction={DEFAULT_SCRIPT_INSTRUCTION}
      />
      <InstructionModal
        isOpen={isAnalyzeModalOpen}
        onClose={() => setIsAnalyzeModalOpen(false)}
        title="Analyze & Improve"
        instruction={customAnalyzeInstruction}
        onInstructionChange={setCustomAnalyzeInstruction}
        defaultInstruction={DEFAULT_ANALYZE_INSTRUCTION}
      />

    </div>
  );
};
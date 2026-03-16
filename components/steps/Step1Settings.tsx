import React, { useState } from 'react';
import { ScriptAnalysis } from '../../types';
import { generateViralHooks } from '../../services/geminiService';
import { TONES } from '../../constants';

interface Props {
  script: string;
  onScriptChange: (val: string) => void;
  analysis: ScriptAnalysis | null;
  onAnalyze: () => void;
  onImprove: (instruction: string) => void;
  onGenerate: (topic: string, tone: string) => void;
  isAnalyzing: boolean;
  isImproving: boolean;
  onNext: () => void;
}

// --- Icons ---
const CheckCircle = () => <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>;
const AlertTriangle = () => <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>;
const MagicWand = () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>;

export const Step1Settings: React.FC<Props> = ({ 
  script, onScriptChange, analysis, onAnalyze, onImprove, onGenerate, isAnalyzing, isImproving, onNext
}) => {
  const [topic, setTopic] = useState("");
  const [selectedTone, setSelectedTone] = useState(TONES[0]);
  const [hookTopic, setHookTopic] = useState("");
  const [generatedHooks, setGeneratedHooks] = useState<string[]>([]);
  const [isGeneratingHooks, setIsGeneratingHooks] = useState(false);

  // If script is empty, we show Generation Mode. If script exists, we show Editor/Analysis mode.
  const isEditorMode = script && script.length > 10;

  const handleGenerateClick = () => {
    if(!topic.trim()) return;
    onGenerate(topic, selectedTone);
  };

  const handleGenerateHooks = async () => {
    if (!hookTopic.trim()) return;
    setIsGeneratingHooks(true);
    try {
      const hooks = await generateViralHooks(hookTopic);
      setGeneratedHooks(hooks);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingHooks(false);
    }
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
              <label className="text-xs font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                 1. STORY GENERATOR
              </label>
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
                      className="w-full bg-[#0d1117] border border-gray-700 text-white rounded-lg p-4 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all placeholder-gray-600"
                      onKeyDown={(e) => e.key === 'Enter' && handleGenerateClick()}
                   />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Narrative Tone</label>
                      <select 
                         value={selectedTone}
                         onChange={(e) => setSelectedTone(e.target.value)}
                         className="w-full bg-[#0d1117] border border-gray-700 text-white rounded-lg p-3 text-sm focus:outline-none focus:border-indigo-500"
                      >
                         {TONES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                   </div>
                   <div className="flex items-end">
                      <button 
                        onClick={handleGenerateClick}
                        disabled={!topic.trim() || isAnalyzing}
                        className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold p-3 rounded-lg shadow-lg shadow-indigo-900/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isAnalyzing ? (
                           <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Writing Script...</>
                        ) : (
                           <>Generate Story <MagicWand /></>
                        )}
                      </button>
                   </div>
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
            <div className="flex justify-end gap-3">
               <button
                 onClick={onAnalyze}
                 disabled={isAnalyzing}
                 className="px-6 py-3 bg-[#1F2937] hover:bg-gray-700 text-gray-300 font-bold text-xs uppercase tracking-wider rounded-xl transition-all border border-gray-700"
               >
                 {isAnalyzing ? "Re-Analyzing..." : "Re-Analyze"}
               </button>
               
               <button
                  onClick={onNext}
                  className="px-8 py-3 bg-green-600 hover:bg-green-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-green-900/20 transition-all flex items-center gap-2"
                >
                  Proceed to Audio &rarr;
                </button>
            </div>
            
            {/* Viral Hook Lab (Bottom Left) */}
            <div className="mt-2 border-t border-gray-800 pt-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-pink-400 font-bold text-xs uppercase tracking-wider">⚡ VIRAL HOOK LAB</span>
              </div>
              <div className="flex gap-2 mb-3">
                  <input 
                    type="text" 
                    value={hookTopic} 
                    onChange={e => setHookTopic(e.target.value)}
                    placeholder="Topic for hooks..."
                    className="flex-1 bg-[#0d1117] border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-pink-500"
                  />
                  <button 
                    onClick={handleGenerateHooks}
                    disabled={isGeneratingHooks}
                    className="bg-pink-600 hover:bg-pink-500 text-white px-3 py-2 rounded-lg text-xs font-bold uppercase disabled:opacity-50 min-w-[90px] flex items-center justify-center"
                  >
                    {isGeneratingHooks ? (
                      <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    ) : "GENERATE"}
                  </button>
              </div>
              {generatedHooks.length > 0 && (
                <div className="space-y-2">
                    {generatedHooks.map((hook, i) => (
                      <div key={i} onClick={() => navigator.clipboard.writeText(hook)} className="bg-[#1F2937] p-2 rounded border border-gray-700 text-xs text-gray-300 hover:text-white cursor-pointer hover:border-pink-500/50 transition-all">
                        "{hook}"
                      </div>
                    ))}
                </div>
              )}
            </div>

          </div>
        )}

      </div>

      {/* RIGHT COLUMN: Analysis Dashboard (Only Visible if Analysis Exists) */}
      {analysis && (
        <div className="xl:w-[400px] flex flex-col gap-6 animate-slide-left">
           
           <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">
              2. AI Analysis Report
           </label>

           <div className="flex-1 bg-[#161b22] border border-gray-800 rounded-xl overflow-hidden flex flex-col shadow-2xl">
              
              {/* Header Score */}
              <div className="p-6 border-b border-gray-800 bg-[#0d1117] flex items-center justify-between">
                 <div>
                   <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Viral Potential</p>
                   <div className={`text-4xl font-black ${getScoreColor(analysis.score).split(' ')[0]}`}>
                     {analysis.score}<span className="text-lg text-gray-600 font-medium">/100</span>
                   </div>
                 </div>
                 <div className={`px-4 py-2 rounded-lg border text-xs font-bold uppercase tracking-widest ${getScoreColor(analysis.score)}`}>
                    {analysis.score >= 80 ? 'Viral Hit' : analysis.score >= 60 ? 'Good' : 'Needs Work'}
                 </div>
              </div>

              <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
                 
                 {/* Metrics Grid */}
                 <div className="grid grid-cols-2 gap-3">
                    <div className="bg-[#1F2937] p-3 rounded-lg border border-gray-700">
                       <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Hook Rating</p>
                       <p className={`text-sm font-bold ${analysis.hookRating === 'Viral' ? 'text-pink-400' : analysis.hookRating === 'Good' ? 'text-white' : 'text-amber-400'}`}>
                         {analysis.hookRating}
                       </p>
                    </div>
                    <div className="bg-[#1F2937] p-3 rounded-lg border border-gray-700">
                       <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Pacing</p>
                       <p className="text-sm font-bold text-white">{analysis.pacing}</p>
                    </div>
                 </div>

                 {/* Fact Check */}
                 <div>
                    <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                       Fact Check / Safety
                       <div className="h-px bg-gray-800 flex-1"></div>
                    </h4>
                    <div className="space-y-2">
                       {analysis.factCheck.map((fact, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs text-gray-300 bg-[#0d1117] p-2 rounded border border-gray-800">
                             {fact.toLowerCase().includes('verified') ? <CheckCircle /> : <AlertTriangle />}
                             <span className="leading-relaxed">{fact}</span>
                          </div>
                       ))}
                    </div>
                 </div>

                 {/* Critique */}
                 <div>
                    <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                       Critique
                       <div className="h-px bg-gray-800 flex-1"></div>
                    </h4>
                    <div className="space-y-2">
                       <div className="text-xs text-green-300 flex gap-2">
                          <span className="font-bold shrink-0">+</span>
                          {analysis.strengths[0]}
                       </div>
                       <div className="text-xs text-red-300 flex gap-2">
                          <span className="font-bold shrink-0">-</span>
                          {analysis.weaknesses[0]}
                       </div>
                    </div>
                 </div>

              </div>

              {/* Improvement Actions */}
              <div className="p-4 bg-[#0d1117] border-t border-gray-800">
                 <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-3">AI Editor Actions</p>
                 <div className="grid grid-cols-2 gap-2">
                    <button 
                       onClick={() => onImprove("Make the hook more viral and shocking.")}
                       disabled={isImproving}
                       className="bg-[#1F2937] hover:bg-indigo-900/30 border border-gray-700 hover:border-indigo-500/50 text-gray-300 text-[10px] font-bold py-2 rounded transition-all flex items-center justify-center gap-1 disabled:opacity-50"
                    >
                       {isImproving ? <span className="animate-pulse">Processing...</span> : <><MagicWand /> Boost Hook</>}
                    </button>
                    <button 
                       onClick={() => onImprove("Fix grammar and make the tone more conversational.")}
                       disabled={isImproving}
                       className="bg-[#1F2937] hover:bg-indigo-900/30 border border-gray-700 hover:border-indigo-500/50 text-gray-300 text-[10px] font-bold py-2 rounded transition-all disabled:opacity-50"
                    >
                       {isImproving ? <span className="animate-pulse">Processing...</span> : "Fix Grammar"}
                    </button>
                    <button 
                       onClick={() => onImprove("Make the script shorter and more punchy (under 40s).")}
                       disabled={isImproving}
                       className="bg-[#1F2937] hover:bg-indigo-900/30 border border-gray-700 hover:border-indigo-500/50 text-gray-300 text-[10px] font-bold py-2 rounded transition-all disabled:opacity-50"
                    >
                       {isImproving ? <span className="animate-pulse">Processing...</span> : "Shorten"}
                    </button>
                    <button 
                       onClick={() => onImprove(analysis.improvementSuggestion)}
                       disabled={isImproving}
                       className="bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-500 text-[10px] font-bold py-2 rounded transition-all shadow-lg shadow-indigo-900/20 disabled:opacity-50"
                    >
                       {isImproving ? (
                          <div className="flex items-center gap-1">
                             <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                             Applying...
                          </div>
                       ) : "Auto Fix"}
                    </button>
                 </div>
              </div>

           </div>

        </div>
      )}

    </div>
  );
};

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, HelpCircle, BookOpen, Cpu, Layers, Zap, Info } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-4xl max-h-[90vh] bg-[#111827] border border-gray-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-bottom border-gray-800 bg-[#161b22]/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/20 rounded-lg">
                  <HelpCircle className="w-6 h-6 text-indigo-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">App Guide & Documentation</h2>
                  <p className="text-xs text-gray-400 uppercase tracking-widest mt-0.5">Gemini Creator Studio v1.0</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-gray-800 rounded-full transition-colors text-gray-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-10 custom-scrollbar">
              
              {/* Introduction */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 text-indigo-400">
                  <Info className="w-5 h-5" />
                  <h3 className="font-bold uppercase tracking-wider text-sm">Overview</h3>
                </div>
                <p className="text-gray-300 leading-relaxed">
                  Gemini Creator Studio is a professional-grade AI production pipeline designed for short-form content creators. 
                  It leverages the latest Gemini models to transform raw ideas into production-ready assets, including scripts, 
                  voiceovers, visual storyboards, and SEO metadata.
                </p>
              </section>

              {/* App Structure */}
              <section className="space-y-6">
                <div className="flex items-center gap-2 text-indigo-400">
                  <Layers className="w-5 h-5" />
                  <h3 className="font-bold uppercase tracking-wider text-sm">Production Pipeline</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-900/50 border border-gray-800 rounded-xl space-y-2">
                    <div className="flex items-center gap-2 text-white font-bold">
                      <span className="w-6 h-6 flex items-center justify-center bg-indigo-500 rounded text-[10px]">01</span>
                      Script Lab
                    </div>
                    <p className="text-xs text-gray-400">
                      Generate scripts from topics, analyze for viral potential, and refine with AI. 
                      Features a "Fact Check" engine and "Engagement Scoring".
                    </p>
                  </div>

                  <div className="p-4 bg-gray-900/50 border border-gray-800 rounded-xl space-y-2">
                    <div className="flex items-center gap-2 text-white font-bold">
                      <span className="w-6 h-6 flex items-center justify-center bg-indigo-500 rounded text-[10px]">02</span>
                      Audio Engine
                    </div>
                    <p className="text-xs text-gray-400">
                      Convert scripts to high-fidelity speech. Uses 24kHz PCM audio generation 
                      with 5 distinct AI personas (Zephyr, Fenrir, etc.).
                    </p>
                  </div>

                  <div className="p-4 bg-gray-900/50 border border-gray-800 rounded-xl space-y-2">
                    <div className="flex items-center gap-2 text-white font-bold">
                      <span className="w-6 h-6 flex items-center justify-center bg-indigo-500 rounded text-[10px]">03</span>
                      Visual Architect
                    </div>
                    <p className="text-xs text-gray-400">
                      Segments scripts into scenes. Plans layouts (Split, Grid, Flow) and 
                      generates high-quality images in 9:16, 16:9, or 1:1 ratios.
                    </p>
                  </div>

                  <div className="p-4 bg-gray-900/50 border border-gray-800 rounded-xl space-y-2">
                    <div className="flex items-center gap-2 text-white font-bold">
                      <span className="w-6 h-6 flex items-center justify-center bg-indigo-500 rounded text-[10px]">04</span>
                      SEO Specialist
                    </div>
                    <p className="text-xs text-gray-400">
                      Generates viral titles, descriptions, and optimized metadata. Includes 
                      "Deep Dive" context expansion for enhanced search visibility.
                    </p>
                  </div>
                </div>
              </section>

              {/* Technical Stack */}
              <section className="space-y-6">
                <div className="flex items-center gap-2 text-indigo-400">
                  <Cpu className="w-5 h-5" />
                  <h3 className="font-bold uppercase tracking-wider text-sm">AI Models & Intelligence</h3>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-start gap-4 p-4 bg-indigo-500/5 border border-indigo-500/20 rounded-xl">
                    <Zap className="w-6 h-6 text-indigo-400 mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="text-white font-bold">Gemini 2.0 Flash (Primary)</h4>
                      <p className="text-xs text-gray-400 mt-1">
                        Used for script generation, analysis, segmentation, and SEO. Optimized for speed and reasoning.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 bg-cyan-500/5 border border-cyan-500/20 rounded-xl">
                    <Zap className="w-6 h-6 text-cyan-400 mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="text-white font-bold">Gemini 2.5 Flash Image</h4>
                      <p className="text-xs text-gray-400 mt-1">
                        Powers the visual storyboard. Generates high-quality, thematically consistent images based on the selected aesthetic.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 bg-purple-500/5 border border-purple-500/20 rounded-xl">
                    <Zap className="w-6 h-6 text-purple-400 mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="text-white font-bold">Gemini 2.0 Pro (Optional)</h4>
                      <p className="text-xs text-gray-400 mt-1">
                        Available for complex scriptwriting and deep analysis tasks requiring higher reasoning levels.
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {/* App Elements & Controls */}
              <section className="space-y-6">
                <div className="flex items-center gap-2 text-indigo-400">
                  <Zap className="w-5 h-5" />
                  <h3 className="font-bold uppercase tracking-wider text-sm">App Elements & Controls</h3>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <h4 className="text-white text-xs font-bold uppercase tracking-tighter">Model Selector</h4>
                    <p className="text-[11px] text-gray-400">Located in the top-left. Switch between Flash (Speed) and Pro (Reasoning) models depending on your task complexity.</p>
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-white text-xs font-bold uppercase tracking-tighter">Session Management</h4>
                    <p className="text-[11px] text-gray-400">Save your progress as a .json file or load a previous session to restore all scripts, audio, and visual plans.</p>
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-white text-xs font-bold uppercase tracking-tighter">Script Lab Tools</h4>
                    <p className="text-[11px] text-gray-400">Use "Analyze" to get engagement scores or "Improve" to rewrite your script with specific AI instructions.</p>
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-white text-xs font-bold uppercase tracking-tighter">Visual Aesthetics</h4>
                    <p className="text-[11px] text-gray-400">Choose from 15+ styles (Anime, Whiteboard, Retro) to guide the AI in generating consistent storyboard visuals.</p>
                  </div>
                </div>
              </section>

              {/* System Logic & Architecture */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 text-indigo-400">
                  <BookOpen className="w-5 h-5" />
                  <h3 className="font-bold uppercase tracking-wider text-sm">System Logic & Architecture</h3>
                </div>
                <div className="bg-gray-900/80 p-5 rounded-xl border border-gray-800 font-mono text-[11px] text-gray-400 leading-relaxed space-y-4">
                  <div>
                    <p className="text-indigo-400 mb-1">// Production Flow</p>
                    <p>Idea → Script → Analysis → Audio → Segmentation → Visuals → SEO</p>
                  </div>
                  
                  <div>
                    <p className="text-indigo-400 mb-1">// Core Directives</p>
                    <p>• <span className="text-white">Visual Architect:</span> Classifies scenes into Structure, Process, Comparison, or Abstract to determine optimal layout (Split, Grid, Flow).</p>
                    <p>• <span className="text-white">Algorithm Specialist:</span> Analyzes script sentiment to generate high-CTR titles (Viral, SEO, Emotional, Punchy).</p>
                    <p>• <span className="text-white">Pacing Engine:</span> Enforces strict duration limits (1-5s per segment) for high-retention editing styles.</p>
                    <p>• <span className="text-white">Smart Labeling:</span> Automatically identifies when to add diagrams or annotations to visuals based on classification.</p>
                  </div>

                  <div>
                    <p className="text-indigo-400 mb-1">// Data Persistence</p>
                    <p>The app uses a <span className="text-white">Snapshot System</span>. You can export your entire project state as a JSON file and restore it later to continue your production pipeline without losing AI-generated assets.</p>
                  </div>
                </div>
              </section>

            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-800 bg-[#161b22]/50 flex items-center justify-between">
              <div className="text-[10px] text-gray-500 uppercase tracking-[0.2em]">
                Powered by Google Gemini API
              </div>
              <button 
                onClick={onClose}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition-all shadow-lg shadow-indigo-500/20"
              >
                Got it, let's create
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

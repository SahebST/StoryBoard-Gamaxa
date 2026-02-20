import React, { useState, useRef, useEffect } from 'react';
import { VOICES } from '../../constants';
import { base64PCMToWavBlob } from '../../services/geminiService';
import { ScriptSettings } from '../../types';

interface Props {
  script: string;
  durationStr: string;
  settings: ScriptSettings;
  onScriptChange: (newScript: string) => void;
  onRegenerateScript: () => void;
  onGenerateAudio: (voice: string) => void;
  audioBase64: string | null;
  isGeneratingAudio: boolean;
  onNext: () => void;
  isSegmenting?: boolean;
  selectedVoiceName?: string | null; // New prop from App
  title?: string;
}

export const Step2ScriptAudio: React.FC<Props> = ({ 
  script, durationStr, settings, onScriptChange, onRegenerateScript, 
  onGenerateAudio, audioBase64, isGeneratingAudio, onNext, isSegmenting,
  selectedVoiceName, title
}) => {
  const [selectedVoice, setSelectedVoice] = useState(VOICES[0]);
  const [isVoiceDropdownOpen, setIsVoiceDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Sync selected voice if provided by Auto Mode
  useEffect(() => {
    if (selectedVoiceName) {
      const voice = VOICES.find(v => v.name === selectedVoiceName);
      if (voice) setSelectedVoice(voice);
    }
  }, [selectedVoiceName]);

  useEffect(() => {
    if (audioBase64) {
      // Convert raw PCM to WAV Blob so the browser can play it
      const blob = base64PCMToWavBlob(audioBase64, 24000);
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setAudioUrl(null);
    }
  }, [audioBase64]);

  // Handle outside click for dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsVoiceDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(script);
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) onScriptChange(text);
    } catch (e) {
      console.error("Paste failed", e);
    }
  };

  const handleSaveTxt = () => {
    const safeTitle = title ? title.replace(/[^a-z0-9]/gi, '_').toLowerCase() : '';
    const filename = safeTitle ? `${safeTitle}.txt` : `script_${new Date().toISOString().slice(0,10)}.txt`;

    const blob = new Blob([script], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadAudio = () => {
    if (!audioBase64) return;
    const blob = base64PCMToWavBlob(audioBase64, 24000);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audio_${new Date().toISOString().slice(0,19).replace(/:/g, "-")}.wav`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleNextClick = () => {
    const wordCount = script.trim().split(/\s+/).filter(w => w.length > 0).length;
    if (wordCount <= 3) {
      alert("Your script is too short. Please enter a valid script.");
      return;
    }
    onNext();
  };

  return (
    <div className="flex flex-col h-full space-y-4 animate-fade-in">
      
      {/* 1. Header Actions (Regenerate & Toolbar) */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        {/* Left: Regenerate */}
        <button 
          onClick={onRegenerateScript}
          className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-teal-400 border border-teal-900/50 bg-teal-900/10 hover:bg-teal-900/30 rounded-md transition-colors uppercase tracking-wider"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
          Regenerate
        </button>

        {/* Right: Tools */}
        <div className="flex gap-2">
           <button 
             onClick={handleDownloadAudio} 
             disabled={!audioBase64}
             className="px-4 py-2 text-xs font-bold text-green-400 border border-green-900/50 bg-green-900/10 hover:bg-green-900/30 rounded-md uppercase disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
           >
             <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
             Download Audio
           </button>
           <button onClick={handleSaveTxt} className="px-4 py-2 text-xs font-bold text-gray-400 border border-gray-700 bg-gray-800/50 hover:bg-gray-700 rounded-md uppercase">Save .TXT</button>
           <button onClick={handleCopy} className="px-4 py-2 text-xs font-bold text-indigo-400 border border-indigo-900/50 bg-indigo-900/10 hover:bg-indigo-900/30 rounded-md uppercase">Copy</button>
        </div>
      </div>

      {/* SEPARATOR LINE */}
      <div className="w-full border-b border-gray-800/80 my-2"></div>

      {/* 3. Audio Control Dock (Moved Up) */}
      <div className={`bg-[#0d1117] border ${selectedVoiceName ? 'border-amber-500/30 shadow-amber-900/20' : 'border-gray-800'} rounded-xl p-4 flex flex-col md:flex-row items-center gap-4 shadow-lg transition-all`}>
        
        {/* Custom Voice Dropdown */}
        <div className="relative w-full md:w-64 shrink-0" ref={dropdownRef}>
           <button 
             onClick={() => setIsVoiceDropdownOpen(!isVoiceDropdownOpen)}
             className={`w-full bg-[#161b22] border text-white rounded-lg p-2 flex items-center justify-between transition-colors shadow-sm ${selectedVoiceName ? 'border-amber-500/50 ring-1 ring-amber-500/30' : 'border-gray-700 hover:border-gray-600'}`}
           >
             <div className="flex items-center gap-3">
               <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-inner border border-white/10 ${selectedVoice.avatarClass || 'bg-gray-700'}`}>
                 {selectedVoice.name[0]}
               </div>
               <div className="text-left">
                 <div className="text-sm font-bold flex items-center gap-2">
                    {selectedVoice.name}
                    <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide border ${selectedVoice.gender === 'Male' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-pink-500/10 text-pink-400 border-pink-500/20'}`}>
                      {selectedVoice.gender}
                    </span>
                    {selectedVoiceName && <span className="text-[9px] bg-amber-500 text-black px-1.5 py-0.5 rounded font-bold uppercase">AI Pick</span>}
                 </div>
                 <div className="text-[10px] text-gray-500 uppercase">{selectedVoice.traits}</div>
               </div>
             </div>
             <svg className={`w-4 h-4 text-gray-500 transition-transform ${isVoiceDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
           </button>

           {isVoiceDropdownOpen && (
             <div className="absolute top-full left-0 w-full mt-2 bg-[#161b22] border border-gray-700 rounded-lg shadow-2xl overflow-hidden z-20">
               {VOICES.map((voice) => (
                 <button
                   key={voice.id}
                   onClick={() => { setSelectedVoice(voice); setIsVoiceDropdownOpen(false); }}
                   className={`w-full flex items-center gap-3 p-3 text-left hover:bg-gray-800 transition-colors border-b border-gray-800/50 last:border-0
                     ${selectedVoice.id === voice.id ? 'bg-gray-800' : ''}
                   `}
                 >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm border border-white/10 ${voice.avatarClass || 'bg-gray-700'}`}>
                      {voice.name[0]}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white">{voice.name}</span>
                        <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide border ${voice.gender === 'Male' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-pink-500/10 text-pink-400 border-pink-500/20'}`}>
                          {voice.gender}
                        </span>
                      </div>
                      <div className="text-[10px] text-gray-500">{voice.traits}</div>
                    </div>
                 </button>
               ))}
             </div>
           )}
        </div>

        {/* Generate Button */}
        <button
            onClick={() => onGenerateAudio(selectedVoice.name)}
            disabled={isGeneratingAudio}
            className={`md:w-auto w-full px-6 py-3 rounded-lg font-bold transition-all flex items-center justify-center gap-2 shadow-lg ${selectedVoiceName ? 'bg-amber-600 hover:bg-amber-500 text-white' : 'bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50'}`}
        >
            {isGeneratingAudio ? (
              <span className="flex items-center gap-2 text-sm">
                 <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                 Generating...
              </span>
            ) : (
              <span className="text-sm">Generate Audio</span>
            )}
        </button>
        
        {/* Player Section */}
        <div className="flex-1 w-full bg-[#05070a] rounded-lg p-2 border border-gray-800 flex items-center gap-3 h-[60px] relative overflow-hidden">
           {audioUrl ? (
             <>
               <audio ref={audioRef} src={audioUrl} onEnded={() => setIsPlaying(false)} onPause={() => setIsPlaying(false)} onPlay={() => setIsPlaying(true)} className="hidden" />
               <button 
                onClick={togglePlay}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors shrink-0 z-10 ${selectedVoiceName ? 'bg-amber-500 hover:bg-amber-400 text-black' : 'bg-teal-500 hover:bg-teal-400 text-black'}`}
               >
                 {isPlaying ? (
                   <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/></svg>
                 ) : (
                   <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                 )}
               </button>
               
               {/* Visualizer bars (fake) */}
               <div className="flex-1 flex items-end gap-[2px] h-full py-2 opacity-50 z-0">
                  {Array.from({ length: 40 }).map((_, i) => (
                    <div 
                      key={i} 
                      className="bg-gray-500 w-full rounded-t-sm transition-all duration-300"
                      style={{ 
                        height: isPlaying ? `${Math.random() * 80 + 20}%` : '30%',
                        opacity: isPlaying ? 1 : 0.3
                      }}
                    ></div>
                  ))}
               </div>
             </>
           ) : (
             <div className="w-full h-full flex items-center justify-center text-xs text-gray-600 uppercase tracking-widest font-medium">
               Waiting for generation...
             </div>
           )}
        </div>

      </div>

      {/* 4. Script Editor (Dark Mode) - Moved Down */}
      <div className="h-[500px] flex flex-col relative group rounded-lg overflow-hidden border border-gray-800/50 focus-within:ring-1 focus-within:ring-gray-700 bg-[#0d1117]">
        {/* Header for Paste */}
        <div className="h-9 border-b border-gray-800 bg-[#161b22] flex items-center justify-between px-4 shrink-0">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Script Source</span>
            <button 
                onClick={handlePaste}
                className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-gray-800 text-[10px] font-bold text-indigo-400 hover:text-indigo-300 uppercase tracking-wider transition-colors"
            >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                Paste
            </button>
        </div>

        <textarea
          className="w-full flex-1 bg-transparent text-gray-300 p-6 font-serif text-lg leading-relaxed focus:outline-none resize-none shadow-inner custom-scrollbar relative z-10"
          value={script}
          onChange={(e) => onScriptChange(e.target.value)}
          placeholder="Enter or paste your script here..."
        />
        <div className="absolute bottom-4 right-4 text-xs text-gray-600 pointer-events-none z-20">
           {script.split(/\s+/).filter(Boolean).length} words
        </div>
      </div>

      {/* Next Button */}
       <div className="pt-2 flex justify-end">
        <button
          onClick={handleNextClick}
          disabled={isSegmenting}
          className="bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-wait text-white px-8 py-3 rounded-lg font-bold transition-all border border-gray-700 flex items-center gap-2"
        >
          {isSegmenting ? "Processing..." : "Next: Visuals →"}
        </button>
      </div>

    </div>
  );
};
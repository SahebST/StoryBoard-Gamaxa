
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { StepIndicator } from './components/StepIndicator';
import { HelpModal } from './components/HelpModal';
import { Step1Settings } from './components/steps/Step1Settings';
import { Step2ScriptAudio } from './components/steps/Step2ScriptAudio';
import { Step3Images } from './components/steps/Step3Images';
import { Step4SEO } from './components/steps/Step4SEO';
import { 
  AppState, 
  INITIAL_SETTINGS, 
  ScriptSettings, 
  Step, 
  Scene 
} from './types';
import { 
  analyzeScript,
  improveScript,
  generateAudio,
  generateSEO,
  segmentScript,
  generateSceneImage,
  downloadFile,
  base64PCMToWavBlob,
  generateScriptFromIdea,
  setActiveModel
} from './services/geminiService';

const wait = (ms: number) => new Promise(res => setTimeout(res, ms));

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    currentStep: Step.Settings,
    settings: INITIAL_SETTINGS,
    topic: "",
    scriptText: "",
    scriptAnalysis: null,
    audioBase64: null,
    selectedVoice: null,
    scenes: [],
    seoData: null,
    isAnalyzing: false,
    isImproving: false,
    isGeneratingAudio: false,
    isGeneratingSEO: false,
    isSegmenting: false,
  });

  const [currentModel, setCurrentModel] = useState("gemini-2.0-flash");
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const m = e.target.value;
    setCurrentModel(m);
    setActiveModel(m);
  };

  // --- Actions ---

  const handleStepClick = (targetStep: Step) => {
    setState(prev => ({ ...prev, currentStep: targetStep }));
  };

  const handleScriptChange = (newScript: string) => {
    setState(prev => ({ 
      ...prev, 
      scriptText: newScript,
      // Clear analysis if script changes significantly (optional, but good UX)
      scriptAnalysis: prev.scriptAnalysis ? null : prev.scriptAnalysis 
    }));
  };

  // --- Step 1: Script Generation & Analysis ---

  const handleGenerateScript = async (topic: string, tone: string) => {
    setState(prev => ({ ...prev, isAnalyzing: true, topic })); // Reuse analyzing spinner state
    try {
      const script = await generateScriptFromIdea(topic, tone);
      setState(prev => ({ ...prev, scriptText: script }));
      
      // Auto-analyze after generation
      const analysis = await analyzeScript(script);
      setState(prev => ({ 
        ...prev, 
        scriptAnalysis: analysis,
        isAnalyzing: false 
      }));
    } catch (e) {
      console.error(e);
      alert("Script generation failed. Please try again.");
      setState(prev => ({ ...prev, isAnalyzing: false }));
    }
  };

  const handleAnalyzeScript = async () => {
    if (!state.scriptText.trim()) return;
    setState(prev => ({ ...prev, isAnalyzing: true }));
    try {
      const analysis = await analyzeScript(state.scriptText);
      setState(prev => ({ 
        ...prev, 
        scriptAnalysis: analysis,
        isAnalyzing: false 
      }));
    } catch (e) {
      console.error(e);
      alert("Analysis failed. Please try again.");
      setState(prev => ({ ...prev, isAnalyzing: false }));
    }
  };

  const handleImproveScript = async (instruction: string) => {
    if (!state.scriptText.trim()) return;
    setState(prev => ({ ...prev, isImproving: true }));
    try {
      const newScript = await improveScript(state.scriptText, instruction);
      setState(prev => ({ 
        ...prev, 
        scriptText: newScript,
        scriptAnalysis: null, // Reset analysis as script changed
        isImproving: false 
      }));
      // Auto-analyze after improvement? Optional. 
      // await handleAnalyzeScript(); 
    } catch (e) {
      console.error(e);
      setState(prev => ({ ...prev, isImproving: false }));
    }
  };

  const handleGoToAudio = () => {
    setState(prev => ({ ...prev, currentStep: Step.ScriptAudio }));
  };

  // --- Step 2: Audio ---

  const handleGenerateAudio = async (voice: string) => {
    setState(prev => ({ ...prev, isGeneratingAudio: true }));
    const audioData = await generateAudio(state.scriptText, voice);
    setState(prev => ({
      ...prev,
      audioBase64: audioData,
      isGeneratingAudio: false
    }));
  };

  const handleGoToImages = async () => {
    setState(prev => ({ ...prev, currentStep: Step.Images }));
  };

  // --- Step 3: Images ---

  const handleUpdateScenes = (newScenes: Scene[]) => {
    setState(prev => ({ ...prev, scenes: newScenes }));
  };

  const handleUpdateScenesSingle = (updatedScene: Scene) => {
    setState(prev => ({
      ...prev,
      scenes: prev.scenes.map(s => s.id === updatedScene.id ? updatedScene : s)
    }));
  };

  const handleGoToSEO = () => {
    setState(prev => ({ ...prev, currentStep: Step.SEO }));
  };

  // --- Step 4: SEO ---

  const generateSEOData = useCallback(async () => {
    if (!state.scriptText || state.isGeneratingSEO) return;
    
    setState(prev => ({ ...prev, isGeneratingSEO: true }));
    try {
      // For tone/audience, we use defaults or could infer them, 
      // but the service function signature requires them.
      // We'll pass generic "General" placeholders since we removed those inputs.
      const seo = await generateSEO(state.scriptText, "General Audience", "Engaging");
      setState(prev => ({ ...prev, seoData: seo, isGeneratingSEO: false }));
    } catch (e) {
      console.error("SEO Generation failed", e);
      setState(prev => ({ ...prev, isGeneratingSEO: false }));
    }
  }, [state.scriptText, state.isGeneratingSEO]);

  useEffect(() => {
    if (state.currentStep === Step.SEO && !state.seoData && state.scriptText) {
      generateSEOData();
    }
  }, [state.currentStep, state.seoData, state.scriptText, generateSEOData]);

  // --- Global ---

  const handleSaveSession = () => {
    // Save complete state to allow full restoration
    const snapshot = {
      version: 1,
      timestamp: new Date().toISOString(),
      data: {
        currentStep: state.currentStep,
        settings: state.settings,
        topic: state.topic,
        scriptText: state.scriptText,
        scriptAnalysis: state.scriptAnalysis,
        audioBase64: state.audioBase64,
        selectedVoice: state.selectedVoice,
        scenes: state.scenes,
        seoData: state.seoData
      }
    };
    
    // Generate filename based on topic or script text
    let baseName = state.topic;
    if (!baseName && state.scriptText) {
      baseName = state.scriptText.split(/\s+/).slice(0, 5).join('_');
    }
    
    const safeTitle = baseName 
      ? baseName.trim().replace(/[^a-z0-9]+/gi, '_').toLowerCase() 
      : 'untitled_session';
      
    const timestamp = new Date().toISOString().replace(/[:.-]/g, '_'); // More precise timestamp
    const filename = `${safeTitle}_${timestamp}.json`;
    
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" });
    downloadFile(blob, filename);
  };

  const handleLoadSessionClick = () => {
    fileInputRef.current?.click();
  };

  const handleLoadSession = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        
        let loadedState: Partial<AppState> = {};

        if (data.version && data.data) {
           // New snapshot format
           loadedState = data.data;
        } else {
           // Fallback for older format (partial data)
           loadedState = {
              scriptText: data.script?.text,
              scriptAnalysis: data.script?.analysis,
              scenes: data.scenes,
              seoData: data.seo,
              // Attempt to guess the step or reset to settings if minimal data
              currentStep: data.seo ? Step.SEO : (data.scenes?.length > 0 ? Step.Images : Step.Settings)
           };
        }
        
        // Reset to initial state then apply loaded state to avoid ghost data
        const initialState: AppState = {
            currentStep: Step.Settings,
            settings: INITIAL_SETTINGS,
            topic: "",
            scriptText: "",
            scriptAnalysis: null,
            audioBase64: null,
            selectedVoice: null,
            scenes: [],
            seoData: null,
            isAnalyzing: false,
            isImproving: false,
            isGeneratingAudio: false,
            isGeneratingSEO: false,
            isSegmenting: false,
        };

        setState({
           ...initialState,
           ...loadedState,
           // Ensure loading flags are off
            isAnalyzing: false,
            isImproving: false,
            isGeneratingAudio: false,
            isGeneratingSEO: false,
            isSegmenting: false,
        });
        
        alert(`Session loaded: ${loadedState.topic || "Untitled"}`);

      } catch (err) {
        console.error("Load error", err);
        alert("Failed to load session file. Please check the file format.");
      }
    };
    reader.readAsText(file);
    event.target.value = ''; // Reset input to allow reloading same file
  };

  const handleRestart = () => {
    if(window.confirm("Are you sure? This will clear all current progress.")) {
      setState({
        currentStep: Step.Settings,
        settings: INITIAL_SETTINGS,
        topic: "",
        scriptText: "",
        scriptAnalysis: null,
        audioBase64: null,
        selectedVoice: null,
        scenes: [],
        seoData: null,
        isAnalyzing: false,
        isImproving: false,
        isGeneratingAudio: false,
        isGeneratingSEO: false,
        isSegmenting: false,
      });
    }
  };

  return (
    <div className="min-h-screen text-white flex flex-col items-center py-10 px-4 bg-[#0B0F19]">
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
      <div className="w-full max-w-6xl relative">
        
        {/* Header */}
        <div className="mb-8 flex flex-col items-center gap-6 relative">
          
          {/* Model Selector & Session Buttons Container */}
          <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4 z-20">
            {/* Model Selector */}
            <div className="relative group">
              <div className="flex items-center gap-2 bg-[#161b22]/80 backdrop-blur-md border border-gray-700/50 rounded-lg px-3 py-1.5 hover:border-gray-500 transition-all shadow-lg">
                <div className={`w-2 h-2 rounded-full ${currentModel.includes('pro') ? 'bg-purple-500' : 'bg-green-500'} shadow-[0_0_8px_rgba(34,197,94,0.4)]`}></div>
                <select 
                  value={currentModel}
                  onChange={handleModelChange}
                  className="bg-transparent text-xs font-bold text-gray-300 outline-none appearance-none cursor-pointer pr-5 hover:text-white transition-colors uppercase tracking-wider"
                >
                  <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                  <option value="gemini-2.0-pro-exp-02-05">Gemini 2.0 Pro (Exp)</option>
                  <option value="gemini-2.0-flash-lite-preview-02-05">Gemini 2.0 Flash Lite</option>
                </select>
                <svg className="w-3 h-3 text-gray-500 absolute right-2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>

            {/* Session Buttons */}
            <div className="flex items-center gap-2">
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleLoadSession} 
                className="hidden" 
                accept=".json"
              />
              <button
                 onClick={handleLoadSessionClick}
                 className="text-xs font-bold text-gray-500 hover:text-white flex items-center gap-2 border border-gray-800 hover:border-gray-600 bg-gray-900/50 hover:bg-gray-800 rounded-lg px-3 py-1.5 transition-all"
                 title="Upload previously saved .json session"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                <span className="hidden sm:inline">Load Session</span>
              </button>

              <button
                 onClick={handleSaveSession}
                 className="text-xs font-bold text-gray-500 hover:text-white flex items-center gap-2 border border-gray-800 hover:border-gray-600 bg-gray-900/50 hover:bg-gray-800 rounded-lg px-3 py-1.5 transition-all"
                 title="Save current progress as .json"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                <span className="hidden sm:inline">Save Session</span>
              </button>

              <button
                 onClick={() => setIsHelpOpen(true)}
                 className="text-xs font-bold text-indigo-400 hover:text-white flex items-center gap-2 border border-indigo-900/30 hover:border-indigo-500/50 bg-indigo-500/5 hover:bg-indigo-500/20 rounded-lg px-3 py-1.5 transition-all shadow-lg shadow-indigo-500/5"
                 title="App Guide & Documentation"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span className="hidden sm:inline">Help</span>
              </button>
            </div>
          </div>

          <div className="text-center">
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
              Gemini Creator Studio
            </h1>
            <p className="text-gray-500 mt-2">Script Analysis & Production Pipeline</p>
          </div>
        </div>

        {/* Wizard Progress */}
        <StepIndicator 
           currentStep={state.currentStep} 
           onStepClick={handleStepClick} 
        />

        {/* Main Content Area */}
        <div className="bg-[#111827]/50 border border-gray-800 shadow-2xl rounded-2xl p-4 sm:p-6 md:p-8 min-h-[600px] relative overflow-hidden backdrop-blur-sm transition-all duration-500">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-indigo-500/5 to-transparent pointer-events-none" />

          {state.currentStep === Step.Settings && (
            <Step1Settings 
              script={state.scriptText}
              onScriptChange={handleScriptChange}
              analysis={state.scriptAnalysis}
              onAnalyze={handleAnalyzeScript}
              onImprove={handleImproveScript}
              onGenerate={handleGenerateScript}
              isAnalyzing={state.isAnalyzing}
              isImproving={state.isImproving}
              onNext={handleGoToAudio}
            />
          )}

          {state.currentStep === Step.ScriptAudio && (
            <Step2ScriptAudio 
              script={state.scriptText}
              durationStr={state.scriptAnalysis?.estimatedDuration || "Unknown"}
              settings={state.settings}
              onScriptChange={handleScriptChange}
              onRegenerateScript={() => handleStepClick(Step.Settings)} // Redirect to analysis
              onGenerateAudio={handleGenerateAudio}
              audioBase64={state.audioBase64}
              isGeneratingAudio={state.isGeneratingAudio}
              onNext={handleGoToImages}
              isSegmenting={state.isSegmenting}
              selectedVoiceName={state.selectedVoice}
              title={state.topic}
            />
          )}

          {state.currentStep === Step.Images && (
            <Step3Images 
              script={state.scriptText}
              onScriptChange={handleScriptChange}
              scenes={state.scenes}
              onUpdateScenes={handleUpdateScenes}
              onUpdateSingleScene={handleUpdateScenesSingle}
              onNext={handleGoToSEO}
            />
          )}

          {state.currentStep === Step.SEO && (
            <Step4SEO 
              seoData={state.seoData}
              isGenerating={state.isGeneratingSEO}
              onRestart={handleRestart}
              hasScript={!!state.scriptText}
              title={state.topic}
              script={state.scriptText}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default App;


import React, { useState, useCallback, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { StepIndicator } from './components/StepIndicator';
import { ConfirmModal } from './components/ConfirmModal';
import { HelpModal } from './components/HelpModal';
import { CoreAIFallbackPopup } from './components/CoreAIFallbackPopup';
import { Step1Settings } from './components/steps/Step1Settings';
import { Step2ScriptAudio } from './components/steps/Step2ScriptAudio';
import { Step3Images } from './components/steps/Step3Images';
import { Step4SEO } from './components/steps/Step4SEO';
import { SessionManager } from './components/SessionManager';
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
  setActiveModel,
  generateMusicPrompt
} from './services/geminiService';

import { Sidebar } from './components/Sidebar';
import { Footer } from './components/Footer';

const wait = (ms: number) => new Promise(res => setTimeout(res, ms));

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('storyboard_gamaxa_state');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Ensure loading states are reset
        return {
          ...parsed,
          isAnalyzing: false,
          isImproving: false,
          isGeneratingAudio: false,
          isGeneratingSEO: false,
          isSegmenting: false,
          isGeneratingMusic: false,
        };
      } catch (e) {
        console.error("Failed to parse local storage state", e);
      }
    }
    return {
      currentStep: Step.Settings,
      settings: INITIAL_SETTINGS,
      sessionTitle: "",
      sessionId: null,
      topic: "",
      scriptText: "",
      scriptAnalysis: null,
      audioBase64: null,
      selectedVoice: null,
      scenes: [],
      seoData: null,
      musicPrompt: "",
      musicStyle: "Auto",
      musicIntensity: "Balanced",
      aiDirection: "",
      durationMode: 'auto',
      customDuration: "",
      isAnalyzing: false,
      isImproving: false,
      isGeneratingAudio: false,
      isGeneratingSEO: false,
      isSegmenting: false,
      isGeneratingMusic: false,
    };
  });

  useEffect(() => {
    localStorage.setItem('storyboard_gamaxa_state', JSON.stringify(state));
  }, [state]);

  const [currentProvider, setCurrentProvider] = useState(() => localStorage.getItem('storyboard_gamaxa_provider') || "google");
  const [currentModel, setCurrentModel] = useState(() => {
    const saved = localStorage.getItem('storyboard_gamaxa_model');
    if (saved === 'gemini-3-flash-preview') return 'gemini-2.5-flash';
    return saved || "gemini-2.5-flash";
  });

  const [audioProvider, setAudioProvider] = useState(() => localStorage.getItem('storyboard_gamaxa_audio_provider') || "google");
  const [audioModel, setAudioModel] = useState(() => localStorage.getItem('storyboard_gamaxa_audio_model') || "gemini-2.5-flash");

  const [imageProvider, setImageProvider] = useState(() => localStorage.getItem('storyboard_gamaxa_image_provider') || "google");
  const [imageModel, setImageModel] = useState(() => localStorage.getItem('storyboard_gamaxa_image_model') || "gemini-2.5-flash");

  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [direction, setDirection] = useState(0); // 1 for forward, -1 for backward
  const [isAdvancedMode, setIsAdvancedMode] = useState(false);
  const [fallbackState, setFallbackState] = useState<{
    isOpen: boolean;
    modelName: string;
    onRetry: () => void;
  }>({ isOpen: false, modelName: '', onRetry: () => {} });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem('storyboard_gamaxa_provider', currentProvider);
  }, [currentProvider]);

  useEffect(() => {
    localStorage.setItem('storyboard_gamaxa_model', currentModel);
    setActiveModel(currentModel, currentProvider);
  }, [currentModel, currentProvider]);

  useEffect(() => {
    localStorage.setItem('storyboard_gamaxa_audio_provider', audioProvider);
  }, [audioProvider]);

  useEffect(() => {
    localStorage.setItem('storyboard_gamaxa_audio_model', audioModel);
  }, [audioModel]);

  useEffect(() => {
    localStorage.setItem('storyboard_gamaxa_image_provider', imageProvider);
  }, [imageProvider]);

  useEffect(() => {
    localStorage.setItem('storyboard_gamaxa_image_model', imageModel);
  }, [imageModel]);

  const handleProviderChange = (providerId: string) => {
    setCurrentProvider(providerId);
  };

  const handleModelChange = (modelId: string) => {
    setCurrentModel(modelId);
  };

  const handleAudioProviderChange = (providerId: string) => {
    setAudioProvider(providerId);
  };

  const handleAudioModelChange = (modelId: string) => {
    setAudioModel(modelId);
  };

  const handleImageProviderChange = (providerId: string) => {
    setImageProvider(providerId);
  };

  const handleImageModelChange = (modelId: string) => {
    setImageModel(modelId);
  };

  // --- Actions ---

  const handleSaveLocalSession = () => {
    const snapshot = {
      version: 1,
      timestamp: new Date().toISOString(),
      data: state
    };
    
    let baseName = state.sessionTitle || state.topic;
    if (!baseName && state.scriptText) {
      baseName = state.scriptText.split(/\s+/).slice(0, 5).join('_');
    }
    
    const safeTitle = baseName 
      ? baseName.trim().replace(/[^a-z0-9]+/gi, '_').toLowerCase() 
      : 'untitled_session';
      
    const timestamp = new Date().toISOString().replace(/[:.-]/g, '_');
    const filename = `${safeTitle}_${timestamp}.json`;
    
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" });
    downloadFile(blob, filename);
  };

  const handleLoadLocalSessionClick = () => {
    fileInputRef.current?.click();
  };

  const handleLoadLocalSession = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        
        let loadedState: Partial<AppState> = {};

        if (data.version && data.data) {
           loadedState = data.data;
        } else {
           loadedState = {
              scriptText: data.script?.text,
              scriptAnalysis: data.script?.analysis,
              scenes: data.scenes,
              seoData: data.seo,
              currentStep: data.seo ? Step.SEO : (data.scenes?.length > 0 ? Step.Images : Step.Settings)
           };
        }
        
        const initialState: AppState = {
            currentStep: Step.Settings,
            settings: INITIAL_SETTINGS,
            sessionTitle: "",
            sessionId: null,
            topic: "",
            scriptText: "",
            scriptAnalysis: null,
            audioBase64: null,
            selectedVoice: null,
            scenes: [],
            seoData: null,
            musicPrompt: "",
            musicStyle: "Auto",
            musicIntensity: "Balanced",
            aiDirection: "",
            durationMode: 'auto',
            customDuration: "",
            isAnalyzing: false,
            isImproving: false,
            isGeneratingAudio: false,
            isGeneratingSEO: false,
            isSegmenting: false,
            isGeneratingMusic: false,
        };

        setState({
           ...initialState,
           ...loadedState,
            isAnalyzing: false,
            isImproving: false,
            isGeneratingAudio: false,
            isGeneratingSEO: false,
            isSegmenting: false,
            isGeneratingMusic: false,
        });
        
        console.log(`Local session loaded: ${loadedState.topic || "Untitled"}`);

      } catch (err) {
        console.error("Load error", err);
        console.error("Failed to load session file. Please check the file format.");
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleStepClick = (targetStep: Step) => {
    if (targetStep === state.currentStep) return;
    setDirection(targetStep > state.currentStep ? 1 : -1);
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
      console.error("Script generation failed. Please try again.");
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
      console.error("Analysis failed. Please try again.");
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
    setDirection(1);
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
    setDirection(1);
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
    setDirection(1);
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

  const [isConfirmingRestart, setIsConfirmingRestart] = useState(false);

  const handleRestart = () => {
    setState({
      currentStep: Step.Settings,
      settings: INITIAL_SETTINGS,
      sessionTitle: "",
      sessionId: null,
      topic: "",
      scriptText: "",
      scriptAnalysis: null,
      audioBase64: null,
      selectedVoice: null,
      scenes: [],
      seoData: null,
      musicPrompt: "",
      musicStyle: "Auto",
      musicIntensity: "Balanced",
      aiDirection: "",
      durationMode: 'auto',
      customDuration: "",
      isAnalyzing: false,
      isImproving: false,
      isGeneratingAudio: false,
      isGeneratingSEO: false,
      isSegmenting: false,
      isGeneratingMusic: false,
    });
    setIsConfirmingRestart(false);
  };

  return (
    <div className={`min-h-screen text-white flex flex-col items-center pt-3 pb-10 px-4 transition-colors duration-700 ${isAdvancedMode ? 'bg-[#1a1400]' : 'bg-[#0B0F19]'}`}>
      {fallbackState.isOpen && (
        <CoreAIFallbackPopup
          modelName={fallbackState.modelName}
          onConfirm={() => {
            fallbackState.onRetry();
            setFallbackState(prev => ({ ...prev, isOpen: false }));
          }}
          onCancel={() => setFallbackState(prev => ({ ...prev, isOpen: false }))}
        />
      )}
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
      <div className="w-full max-w-6xl relative">
        
        {/* Header */}
        <div className="mb-4 flex flex-col items-center gap-3 relative">
          
          <Sidebar 
            currentProvider={currentProvider}
            currentModel={currentModel}
            onProviderChange={handleProviderChange}
            onModelChange={handleModelChange}
            audioProvider={audioProvider}
            audioModel={audioModel}
            onAudioProviderChange={handleAudioProviderChange}
            onAudioModelChange={handleAudioModelChange}
            imageProvider={imageProvider}
            imageModel={imageModel}
            onImageProviderChange={handleImageProviderChange}
            onImageModelChange={handleImageModelChange}
            onLocalExport={handleSaveLocalSession}
            onLocalImport={handleLoadLocalSessionClick}
            sessionManagerNode={
              <SessionManager 
                currentState={state} 
                onLoadState={(newState) => setState(newState)} 
                onNewSession={handleRestart} 
                sessionTitle={state.sessionTitle}
                onSessionTitleChange={(title) => setState(prev => ({ ...prev, sessionTitle: title }))}
                isSidebar={true}
              />
            }
            onOpenHelp={() => setIsHelpOpen(true)}
          />
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleLoadLocalSession} 
            className="hidden" 
            accept=".json"
          />

          <div className="text-center">
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
              Gemini Creator Studio
            </h1>
            <div className="mt-3 flex items-center justify-center gap-3">
              <input
                type="text"
                value={state.sessionTitle}
                onChange={(e) => setState(prev => ({ ...prev, sessionTitle: e.target.value }))}
                placeholder={state.topic ? state.topic.substring(0, 30) + "..." : "Untitled Session"}
                className="bg-[#161b22]/80 border border-gray-700/50 rounded-lg px-3 py-1.5 text-sm text-center text-gray-300 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all w-64 placeholder-gray-600"
                title="Session Title"
              />
              <button
                onClick={() => setIsAdvancedMode(!isAdvancedMode)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border ${
                  isAdvancedMode 
                    ? 'bg-amber-900/40 text-amber-400 border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.2)]' 
                    : 'bg-gray-800/50 text-gray-500 border-gray-700 hover:text-gray-300 hover:bg-gray-800'
                }`}
                title="Toggle Advanced AI Instructions Control"
              >
                <div className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${isAdvancedMode ? 'bg-amber-400 animate-pulse' : 'bg-gray-600'}`} />
                  Advanced Control
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Wizard Progress */}
        <StepIndicator 
           currentStep={state.currentStep} 
           onStepClick={handleStepClick} 
        />

        {/* Main Content Area */}
        <div className={`border rounded-2xl p-4 sm:p-6 md:p-8 min-h-[600px] relative overflow-hidden backdrop-blur-sm transition-all duration-500 ${
          isAdvancedMode 
            ? 'bg-[#0b1625] border-amber-500/30 shadow-[0_20px_60px_rgba(0,0,0,0.6),0_0_40px_rgba(245,158,11,0.1)]' 
            : 'bg-[#0b1625] border-gray-800 shadow-[0_20px_50px_rgba(0,0,0,0.5),0_0_30px_rgba(79,70,229,0.05)]'
        } hover:shadow-2xl transition-all`}>
          <div className={`absolute top-0 left-0 w-full h-full pointer-events-none bg-gradient-to-b ${isAdvancedMode ? 'from-amber-500/10' : 'from-indigo-500/10'} to-transparent`} />

          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={state.currentStep}
              custom={direction}
              initial={{ opacity: 0, x: direction * 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -direction * 50 }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
              className="relative z-10"
            >
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
                  isAdvancedMode={isAdvancedMode}
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
                  musicPrompt={state.musicPrompt}
                  onMusicPromptChange={(p) => setState(prev => ({...prev, musicPrompt: p}))}
                  musicStyle={state.musicStyle}
                  onMusicStyleChange={(s) => setState(prev => ({...prev, musicStyle: s}))}
                  musicIntensity={state.musicIntensity}
                  onMusicIntensityChange={(i) => setState(prev => ({...prev, musicIntensity: i}))}
                  isGeneratingMusic={state.isGeneratingMusic}
                  isAdvancedMode={isAdvancedMode}
                  onGenerateMusicPrompt={async (isRegeneration, customInstruction) => {
                    setState(prev => ({ ...prev, isGeneratingMusic: true }));
                    try {
                      const prompt = await generateMusicPrompt(state.scriptText, state.musicStyle, state.musicIntensity, isRegeneration, customInstruction);
                      setState(prev => ({ ...prev, musicPrompt: prompt, isGeneratingMusic: false }));
                    } catch (e) {
                      console.error("Failed to generate music prompt. Try again.");
                      setState(prev => ({ ...prev, isGeneratingMusic: false }));
                    }
                  }}
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
                  aiDirection={state.aiDirection}
                  onAiDirectionChange={(d) => setState(prev => ({...prev, aiDirection: d}))}
                  durationMode={state.durationMode}
                  onDurationModeChange={(m) => setState(prev => ({...prev, durationMode: m}))}
                  customDuration={state.customDuration}
                  onCustomDurationChange={(d) => setState(prev => ({...prev, customDuration: d}))}
                  isAdvancedModeGlobal={isAdvancedMode}
                />
              )}

              {state.currentStep === Step.SEO && (
                <Step4SEO 
                  seoData={state.seoData}
                  isGenerating={state.isGeneratingSEO}
                  onRestart={() => setIsConfirmingRestart(true)}
                  hasScript={!!state.scriptText}
                  title={state.topic}
                  script={state.scriptText}
                  isAdvancedMode={isAdvancedMode}
                  onGenerateSEO={async (customInstruction) => {
                    setState(prev => ({ ...prev, isGeneratingSEO: true }));
                    try {
                      const data = await generateSEO(state.scriptText, state.settings.targetAudience, state.settings.tone, customInstruction);
                      setState(prev => ({ ...prev, seoData: data, isGeneratingSEO: false }));
                    } catch (e) {
                      console.error("Failed to generate SEO", e);
                      setState(prev => ({ ...prev, isGeneratingSEO: false }));
                    }
                  }}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
      
      <Footer />

      <ConfirmModal
        isOpen={isConfirmingRestart}
        title="Start New Session"
        message="Are you sure? This will clear all current progress."
        onConfirm={handleRestart}
        onCancel={() => setIsConfirmingRestart(false)}
      />
    </div>
  );
};

export default App;

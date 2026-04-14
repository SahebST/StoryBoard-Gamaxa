
import React, { useState, useEffect } from 'react';
import { Loader2, Check, Wand2, Copy } from 'lucide-react';
import { Scene } from '../../types';
import { segmentScript, generateSceneImage, generateSystemInstruction, analyzeScriptForVisuals } from '../../services/geminiService';
import { Preset, savePresetToFirebase, listUserPresets, deletePresetFromFirebase } from '../../services/presetService';
import { InstructionModal } from '../InstructionModal';
import { VisualEngineControl, STAGES_CONFIG } from '../VisualEngineControl';

interface Props {
  script: string;
  onScriptChange: (script: string) => void;
  scenes: Scene[];
  onUpdateScenes: (scenes: Scene[]) => void;
  onUpdateSingleScene: (scene: Scene) => void;
  onNext: () => void;
  
  // New props for image config
  aiDirection: string;
  onAiDirectionChange: (dir: string) => void;
  durationMode: 'auto' | 'custom';
  onDurationModeChange: (mode: 'auto' | 'custom') => void;
  customDuration: string;
  onCustomDurationChange: (dur: string) => void;
  isAdvancedModeGlobal?: boolean;
}

const GearIcon = () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;

const ASPECT_RATIOS = [
  { 
    id: "9:16", 
    label: "Shorts (9:16)", 
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /> 
  },
  { 
    id: "16:9", 
    label: "Landscape (16:9)", 
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /> 
  }, 
  { 
    id: "1:1", 
    label: "Square (1:1)", 
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /> 
  }
];

// NotebookLM Inspired Styles + New Advanced Styles
const AESTHETICS = [
  // --- NotebookLM Core ---
  { 
    label: 'Auto-select', 
    prompt: 'DYNAMIC STYLE SELECTOR: Analyze the script’s thematic tone (Technical/Data vs. Narrative/Story vs. Conceptual). Automatically select and apply the most effective visual style (e.g., Whiteboard for processes, Anime for stories) to maximize educational clarity.',
    desc: 'AI adapts style to content tone.' 
  },
  { 
    label: 'Classic', 
    prompt: 'Visual Style: Premium Editorial Vector Illustration. MANDATORY VISUALS: Clean, uniform geometric linework, flat minimalist color blocking, professional magazine layout. High-end aesthetic with balanced negative space. Sharp focus, high-resolution vector clarity, sophisticated color palette (e.g., Swiss Design influence).',
    desc: 'Balanced, editorial illustration.' 
  },
  { 
    label: 'Whiteboard', 
    prompt: 'Visual Style: Professional Schematic Whiteboard. MANDATORY VISUALS: High-resolution dry-erase marker texture, clean hand-drawn strokes on a pure white gloss surface. Schematic arrows, logical flowcharts, professional handwritten annotations. Sparse use of primary accent colors for emphasis. Realistic marker pressure and slight ink bleed.',
    desc: 'Minimalist diagrams & sketches.' 
  },
  { 
    label: 'Kawaii', 
    prompt: 'Visual Style: Premium 3D Kawaii Pop. MANDATORY VISUALS: Volumetric soft-shading, subsurface scattering on rounded forms, pastel dreamscape palette. Expressive anthropomorphic characters, sparkle and heart particles. High-quality clay-like texture, soft ambient occlusion, cheerful and vibrant studio lighting.',
    desc: 'Cute, rounded, playful.' 
  },
  { 
    label: 'Anime', 
    prompt: 'Visual Style: Master-Level Cinematic Anime. MANDATORY VISUALS: Dynamic cel-shading, atmospheric god rays, cinematic lens flares, extreme depth of field. High-fidelity background art with intricate environmental details. Dynamic camera angles (extreme low/high tilt), vibrant saturated tones, Makoto Shinkai inspired lighting.',
    desc: 'Vibrant, expressive, dynamic.' 
  },
  { 
    label: 'Watercolour', 
    prompt: 'Visual Style: Professional Fine Art Watercolour. MANDATORY VISUALS: Heavy-grain cold-press paper texture, pigment granulation, wet-in-wet bleeding edges. Organic brush strokes, translucent layering, soft atmospheric gradients. No hard outlines, dreamy and ethereal lighting, artistic masterpiece quality.',
    desc: 'Soft, painterly, artistic.' 
  },
  { 
    label: 'Retro Print', 
    prompt: 'Visual Style: 1970s Vintage Educational Print. MANDATORY VISUALS: Authentic halftone dot patterns, aged yellowed paper grain, misaligned CMYK printing plates. Muted vintage palette (mustard, burnt orange, avocado green). Authentic ink bleed, distressed edges, science textbook aesthetic from the mid-century.',
    desc: 'Vintage, halftone, aged.' 
  },
  { 
    label: 'Heritage', 
    prompt: 'Visual Style: Heritage Copperplate Engraving. MANDATORY VISUALS: Fine-line cross-hatching, intricate ink wash, aged parchment background. Ornate Victorian borders, encyclopedic scientific realism. High-contrast black ink rendering, historical academic tone, museum-quality archival detail.',
    desc: 'Rich, ornate, traditional.' 
  },
  { 
    label: 'Paper Craft', 
    prompt: 'Visual Style: Tactile 3D Paper-Cut Diorama. MANDATORY VISUALS: Distinct physical layers of textured cardstock, visible paper grain, soft drop shadows creating deep volumetric space. Tactile handmade aesthetic, professional studio lighting with soft shadows, vibrant layered composition, no digital outlines.',
    desc: 'Layered, textured 3D paper.' 
  },

  // --- New Advanced Styles ---
  { 
    label: 'Wireframe', 
    prompt: 'Visual Style: High-Tech Technical Wireframe. MANDATORY VISUALS: Luminous neon vector mesh, glowing vertices, triangular polygon topology. Deep space black background, transparent geometric surfaces. Minimalist edge glow, technical blueprint precision, 3D rotational perspective, cyber-grid aesthetic.',
    desc: 'Technical structure, neon mesh.' 
  },
  { 
    label: 'Bio-Fiber', 
    prompt: 'Visual Style: Microscopic Organic Bio-Fiber. MANDATORY VISUALS: Branching neural networks, bioluminescent pulses, translucent organic membranes. Fibrous textures, irregular biological curvature, subsurface scattering. Macro close-up perspective, earth tones with vibrant bio-glow accents, microscopic realism.',
    desc: 'Organic veins, living matter.' 
  },
  { 
    label: 'Glitch / HUD', 
    prompt: 'Visual Style: Digital Glitch & HUD Overlay. MANDATORY VISUALS: Chromatic aberration, scanline distortions, floating holographic UI elements. RGB signal separation, digital noise, pixelated artifacts. High-contrast data visualization, neon cyan and magenta accents on deep black, high-tech diagnostic interface.',
    desc: 'Cyberpunk UI, data distortion.' 
  },
  { 
    label: 'Hyper-Real 3D', 
    prompt: 'Visual Style: Unreal Engine 5.4 Photorealistic Render. MANDATORY VISUALS: Ray-traced global illumination, physically based rendering (PBR), 8k resolution textures. Micro-surface details (metal scratches, skin pores), cinematic depth of field (bokeh), HDR lighting, physically accurate materials and reflections.',
    desc: 'Cinematic photorealism.' 
  },
  { 
    label: 'Cybercore', 
    prompt: 'Visual Style: Industrial Cybercore Dystopia. MANDATORY VISUALS: Sharp mechanical edges, industrial symmetry, chrome and carbon fiber layering. Neon rim lighting, rainy night atmosphere with volumetric fog. High-contrast shadows, electric blue and purple accents, gritty high-tech urban aesthetic.',
    desc: 'Industrial neon dystopia.' 
  },
  { 
    label: 'Holography', 
    prompt: 'Visual Style: Volumetric Light Holography. MANDATORY VISUALS: Semi-transparent luminous forms, volumetric light grids, floating projections. Internal glow, light particles, scan-line transparency. Object floating in dark void, sci-fi projection aesthetic, shimmering interference patterns.',
    desc: 'Volumetric light projection.' 
  },
  { 
    label: 'Dark Fantasy', 
    prompt: 'Visual Style: Epic Cinematic Dark Fantasy. MANDATORY VISUALS: Gothic architecture, twisted organic forms, moody chiaroscuro lighting. Ethereal mist, ancient stone and rusted metal textures. Deep red and muted gold palette, mythic scale, ominous and heroic atmosphere, high-contrast shadows.',
    desc: 'Gothic, mythic, cinematic.' 
  },
  { 
    label: 'Psychedelic', 
    prompt: 'Visual Style: Surreal Fractal Psychedelia. MANDATORY VISUALS: Infinite fractal loops, iridescent liquid swirls, mind-bending fluid geometry. High-saturation neon rainbow gradients, optical illusion patterns. Self-glowing colors, no realistic shadows, kaleidoscopic symmetry, transcendental visual experience.',
    desc: 'Fractal, vivid, distorted.' 
  },

  { 
    label: 'Custom', 
    prompt: 'Custom', 
    desc: 'Define your own style.' 
  },
];

const PACING_OPTIONS = [
  "Adaptive Flow (Auto)",
  "Fixed 3s Intervals",
  "Fixed 4s Intervals",
  "Fixed 5s Intervals"
];

const getBadgeColor = (type: string | undefined) => {
  switch (type) {
    case "Structure": return "bg-blue-900/40 text-blue-300 border-blue-800";
    case "Process": return "bg-emerald-900/40 text-emerald-300 border-emerald-800";
    case "Comparison": return "bg-purple-900/40 text-purple-300 border-purple-800";
    case "Abstract": return "bg-amber-900/40 text-amber-300 border-amber-800";
    default: return "bg-gray-800 text-gray-400 border-gray-700";
  }
};

// --- Sub Components ---

const SectionHeader: React.FC<{ 
  label: string; 
  onClear?: () => void; 
  onPaste?: () => void;
  status?: 'idle' | 'loading' | 'success' | 'error';
  statusText?: string;
}> = ({ label, onClear, onPaste, status = 'idle', statusText }) => (
  <div className="flex justify-between items-end mb-3">
    <div className={`text-[10px] font-bold tracking-widest uppercase border-l-2 pl-2 flex items-center gap-2 ${
      status === 'loading' ? 'text-indigo-400 border-indigo-400' :
      status === 'success' ? 'text-emerald-400 border-emerald-400' :
      status === 'error' ? 'text-red-400 border-red-400' :
      'text-gray-500 border-indigo-500'
    }`}>
      {label}
      {status === 'loading' && <Loader2 className="w-3 h-3 animate-spin" />}
      {status === 'success' && <Check className="w-3 h-3" />}
      {statusText && <span className="text-[8px] opacity-80 normal-case tracking-normal">({statusText})</span>}
    </div>
    <div className="flex gap-3">
        {onPaste && (
        <button 
            onClick={onPaste} 
            className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 uppercase transition-colors flex items-center gap-1"
        >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
            Paste
        </button>
        )}
        {onClear && (
        <button 
            onClick={onClear} 
            className="text-[10px] font-bold text-gray-600 hover:text-white uppercase transition-colors"
        >
            Clear
        </button>
        )}
    </div>
  </div>
);

const SelectButton: React.FC<{ 
  label: string; 
  isActive: boolean; 
  onClick: () => void; 
  disabled?: boolean;
  icon?: React.ReactNode;
  subLabel?: string;
  className?: string;
}> = ({ label, isActive, onClick, disabled, icon, subLabel, className = "" }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`
      relative overflow-hidden group flex flex-col items-center justify-center p-4 rounded-xl border transition-all duration-300
      ${isActive 
        ? 'bg-indigo-600/20 border-indigo-500 shadow-[0_0_20px_rgba(79,70,229,0.2)]' 
        : 'bg-[#161b22] border-gray-800 hover:border-gray-600 hover:bg-[#1c222b]'}
      ${disabled ? 'opacity-40 cursor-not-allowed' : ''}
      ${className}
    `}
  >
    {isActive && (
      <div className="absolute top-2 right-2 w-2 h-2 bg-indigo-500 rounded-full shadow-[0_0_8px_rgba(79,70,229,1)]"></div>
    )}
    {icon && (
      <svg className={`w-6 h-6 mb-3 ${isActive ? 'text-indigo-400' : 'text-gray-500 group-hover:text-gray-300'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        {icon}
      </svg>
    )}
    <span className={`text-xs font-bold tracking-wide ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-200'}`}>
      {label}
    </span>
    {subLabel && (
      <span className="text-[9px] text-gray-600 mt-1 uppercase tracking-wider">{subLabel}</span>
    )}
  </button>
);

export const Step3Images: React.FC<Props> = ({ 
  script: initialScript, onScriptChange, scenes, onUpdateScenes, onUpdateSingleScene, onNext,
  aiDirection, onAiDirectionChange, durationMode, onDurationModeChange, customDuration, onCustomDurationChange,
  isAdvancedModeGlobal
}) => {
  const [localScript, setLocalScript] = useState(initialScript);
  
  // viewMode: 'standard' (Prompt + Image) or 'prompts' (Text Prompts Only)
  const [viewMode, setViewMode] = useState<'standard' | 'prompts'>('standard');
  const [generationType, setGenerationType] = useState<'visual' | 't2v' | null>(null);
  
  // Sync local script if global script changes (e.g. navigation back and forth)
  useEffect(() => {
    setLocalScript(initialScript);
  }, [initialScript]);

  // Determine initial generation type based on existing scenes data
  useEffect(() => {
    if (scenes.length > 0 && generationType === null) {
        // Heuristic: If we have textToVideoPrompt but no imagePrompt (or mostly), it's T2V.
        const isT2V = scenes.some(s => !!s.textToVideoPrompt && !s.imagePrompt);
        setGenerationType(isT2V ? 't2v' : 'visual');
        
        // If it looks like T2V, default to prompts view
        if (isT2V) {
            setViewMode('prompts');
        }
    }
  }, [scenes, generationType]);

  // Configuration
  const [activeRatio, setActiveRatio] = useState("9:16");
  const [selectedAesthetics, setSelectedAesthetics] = useState<string[]>(["Auto-select"]);
  const [isMultiSelect, setIsMultiSelect] = useState(false);
  const [editableAestheticPrompt, setEditableAestheticPrompt] = useState("");
  const [customAesthetic, setCustomAesthetic] = useState("");
  const [activePacing, setActivePacing] = useState("Adaptive Flow (Auto)");
  
  // Track last used config to show "Regenerate" vs "Update" state
  const [lastGeneratedConfig, setLastGeneratedConfig] = useState<{aesthetic: string, pacing: string, duration: string, aiDirection: string} | null>(null);

  // State
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [generatingImageId, setGeneratingImageId] = useState<number | null>(null);
  const [isAutoGenerating, setIsAutoGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // AI Direction System
  const [activeDirectionTab, setActiveDirectionTab] = useState<'ALL' | 'STAGE 1' | 'STAGE 2' | 'STAGE 3' | 'STAGE 4'>('ALL');
  const [aiDirectionAll, setAiDirectionAll] = useState(aiDirection || "");
  const [aiDirectionStages, setAiDirectionStages] = useState<Record<string, string>>({
    'STAGE 1': "",
    'STAGE 2': "",
    'STAGE 3': "",
    'STAGE 4': ""
  });
  const [defaultInstructions] = useState<Record<string, string>>(() => {
    const defaults: Record<string, string> = {};
    STAGES_CONFIG.forEach(s => {
      defaults[s.name] = s.instruction;
    });
    return defaults;
  });

  // Sync aiDirectionAll with global aiDirection
  useEffect(() => {
    onAiDirectionChange(aiDirectionAll);
  }, [aiDirectionAll]);

  const handleDirectionChange = (val: string) => {
    if (activeDirectionTab === 'ALL') {
      setAiDirectionAll(val);
    } else {
      setAiDirectionStages(prev => ({
        ...prev,
        [activeDirectionTab]: val
      }));
    }
  };

  const currentDirectionValue = activeDirectionTab === 'ALL' ? aiDirectionAll : aiDirectionStages[activeDirectionTab];

  // Advanced Mode State
  const [isVisualModalOpen, setIsVisualModalOpen] = useState(false);
  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);
  const [customSystemInstruction, setCustomSystemInstruction] = useState("");
  const [presets, setPresets] = useState<Preset[]>([]);
  const [presetName, setPresetName] = useState("");
  const [isSavingPreset, setIsSavingPreset] = useState(false);

  // Script Analysis Trigger State
  const [isAnalyzingScript, setIsAnalyzingScript] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [generatedStyles, setGeneratedStyles] = useState<{label: string, prompt: string, desc: string}[]>([]);
  const [suggestedPresets, setSuggestedPresets] = useState<string[]>([]);

  const handleAnalyzeScriptTrigger = async () => {
    if (!localScript.trim()) return;
    setIsAnalyzingScript(true);
    setAnalysisStatus('idle');
    try {
      const availablePresets = AESTHETICS.map(a => a.label).filter(l => l !== 'Custom' && l !== 'Auto-select');
      const result = await analyzeScriptForVisuals(localScript, availablePresets);
      
      const newStyles = result.styles_generated.map(s => ({
        label: s,
        prompt: `Visual Style: ${s}. MANDATORY VISUALS: Ensure the style strictly follows ${s}.`,
        desc: 'AI Generated Style'
      }));
      
      setGeneratedStyles(newStyles);
      setSuggestedPresets(result.best_presets);
      
      // Update UI state
      if (result.best_presets.length > 0) {
        setSelectedAesthetics([result.best_presets[0]]);
      }
      if (result.estimated_duration_sec) {
        onDurationModeChange('custom');
        onCustomDurationChange(result.estimated_duration_sec.toString());
      }
      
      setAnalysisStatus('success');
    } catch (error) {
      console.error("Script analysis failed:", error);
      setAnalysisStatus('error');
    } finally {
      setIsAnalyzingScript(false);
    }
  };

  const handleAestheticClick = (label: string) => {
    if (isMultiSelect) {
      setSelectedAesthetics(prev => {
        if (prev.includes(label)) {
          if (prev.length === 1) return prev; // Keep at least one
          return prev.filter(l => l !== label);
        }
        return [...prev, label];
      });
    } else {
      setSelectedAesthetics([label]);
    }
  };

  useEffect(() => {
    listUserPresets().then(setPresets).catch(console.error);
  }, []);

  // Sync editable prompt when selection changes
  useEffect(() => {
    const allStyles = [...AESTHETICS, ...generatedStyles];
    const prompts = selectedAesthetics.map(label => {
      if (label === 'Custom') return `Visual Style: ${customAesthetic}`;
      const style = allStyles.find(s => s.label === label);
      return style ? style.prompt : label;
    });
    
    // Combine prompts with a separator
    setEditableAestheticPrompt(prompts.join(' | '));
  }, [selectedAesthetics, customAesthetic, generatedStyles]);

  const handleToggleAdvancedMode = () => {
    const durationVal = (durationMode === 'custom' && customDuration) ? parseInt(customDuration, 10) : undefined;
    const defaultInstruction = generateSystemInstruction(editableAestheticPrompt, activePacing, generationType || 'visual', durationVal);
    setCustomSystemInstruction(defaultInstruction);
    setIsVisualModalOpen(true);
  };

  const handleSavePreset = async () => {
    if (!presetName.trim() || !customSystemInstruction.trim()) return;
    setIsSavingPreset(true);
    try {
      const newPreset = await savePresetToFirebase(presetName, customSystemInstruction);
      setPresets([newPreset, ...presets]);
      setPresetName("");
    } catch (error) {
      console.error("Failed to save preset", error);
    } finally {
      setIsSavingPreset(false);
    }
  };

  const handleDeletePreset = async (id: string) => {
    try {
      await deletePresetFromFirebase(id);
      setPresets(presets.filter(p => p.id !== id));
    } catch (error) {
      console.error("Failed to delete preset", error);
    }
  };

  // --- Handlers ---

  const handleScriptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setLocalScript(val);
    onScriptChange(val); // Sync to global state for SEO
  };

  const handlePaste = async () => {
    try {
        const text = await navigator.clipboard.readText();
        if (text) {
            setLocalScript(text);
            onScriptChange(text);
        }
    } catch (e) {
        console.error("Paste failed", e);
    }
  };

  const isConfigChanged = scenes.length > 0 && lastGeneratedConfig && (
    lastGeneratedConfig.aesthetic !== selectedAesthetics.join(',') || 
    lastGeneratedConfig.pacing !== activePacing ||
    lastGeneratedConfig.duration !== (durationMode === 'custom' ? customDuration : 'auto') ||
    lastGeneratedConfig.aiDirection !== aiDirection
  );

  const isLongScript = localScript.length > 8000;

  const handleGeneratePlan = async (type: 'visual' | 't2v', view: 'standard' | 'prompts') => {
    if (!localScript.trim()) return;
    
    if (isLongScript) {
        if (!window.confirm("This script is very long. Generating a visual plan might take a while or fail due to size limits. Continue anyway?")) {
            return;
        }
    }

    // Check if we need to confirm destruction of existing images
    const hasGeneratedImages = scenes.some(s => s.imageUrl);
    if (scenes.length > 0 && hasGeneratedImages) {
        if (!window.confirm("Updating the plan will remove all currently generated images. Continue?")) {
            return;
        }
    }

    setIsGeneratingPlan(true);
    setViewMode(view);
    setGenerationType(type);
    
    // Clear immediately to show feedback
    onUpdateScenes([]); 

    try {
      const durationVal = (durationMode === 'custom' && customDuration) ? parseInt(customDuration, 10) : undefined;

      // Pass aiDirection to service
      const newScenes = await segmentScript(
        localScript, 
        editableAestheticPrompt, 
        activePacing, 
        type, 
        durationVal, 
        aiDirectionAll,
        isAdvancedModeGlobal ? customSystemInstruction : undefined,
        aiDirectionStages['STAGE 1']
      );
      
      onUpdateScenes(newScenes);
      setLastGeneratedConfig({ 
        aesthetic: selectedAesthetics.join(','), 
        pacing: activePacing,
        duration: durationMode === 'custom' ? customDuration : 'auto',
        aiDirection: aiDirectionAll
      });
      
    } catch (e: any) {
      console.error("Plan generation failed", e);
      const msg = e?.message || e?.toString() || "";
      if (msg && (msg.includes("429") || msg.includes("quota") || msg.includes("exhausted") || msg.includes("RESOURCE_EXHAUSTED"))) {
         alert("Server is busy (Rate Limit Reached). Please wait a minute and try again.");
      } else {
         alert("Failed to generate plan. " + (msg ? msg.slice(0, 100) : "Unknown error"));
      }
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  const handleGenerateImage = async (scene: Scene) => {
    if (generatingImageId !== null || !scene.imagePrompt) return;
    
    setGeneratingImageId(scene.id);
    onUpdateSingleScene({ ...scene, isGeneratingImage: true });

    try {
      const imageUrl = await generateSceneImage(scene.imagePrompt, activeRatio);
      onUpdateSingleScene({ 
        ...scene, 
        imageUrl: imageUrl || undefined, 
        isGeneratingImage: false 
      });
    } catch (e) {
      console.error("Gen Image Error", e);
      onUpdateSingleScene({ ...scene, isGeneratingImage: false });
    } finally {
      setGeneratingImageId(null);
    }
  };

  // --- Sequential Generation Queue ---
  useEffect(() => {
    if (isAutoGenerating && generatingImageId === null) {
      // Only generate images for scenes that have an imagePrompt and no imageUrl yet
      const nextScene = scenes.find(s => !s.imageUrl && !!s.imagePrompt);
      if (nextScene) {
        handleGenerateImage(nextScene);
      } else {
        setIsAutoGenerating(false); // Done
      }
    }
  }, [isAutoGenerating, generatingImageId, scenes]);

  const toggleAutoGenerate = () => {
    setIsAutoGenerating(!isAutoGenerating);
  };

  const handleClearScenes = () => {
    if (window.confirm("Clear all scenes and images?")) {
        onUpdateScenes([]);
        setGenerationType(null);
        setLastGeneratedConfig(null);
    }
  };

  const getCleanFilename = (id: number, intent: string) => {
      // Format: "01 KEYWORD TEXT.png"
      const safeKeyword = intent 
        ? intent.trim().replace(/[^a-zA-Z0-9 ]/g, '')
        : 'SCENE';
      return `${String(id).padStart(2,'0')} ${safeKeyword}.png`;
  };

  const handleDownloadAll = () => {
    let delay = 0;
    scenes.forEach((scene) => {
      if (scene.imageUrl) {
        setTimeout(() => {
          const a = document.createElement('a');
          a.href = scene.imageUrl!;
          a.download = getCleanFilename(scene.id, scene.visualIntent);
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }, delay);
        delay += 300; // Stagger downloads slightly to prevent browser blocking
      }
    });
  };

  const handleCopyAll = (scene: Scene) => {
    const imgPrompt = scene.imagePrompt || "";
    const vidPrompt = scene.imageToVideoPrompt || scene.textToVideoPrompt || "";
    const text = `Image prompt :\n${imgPrompt}\nImage video prompt :\n${vidPrompt}`;
    navigator.clipboard.writeText(text);
    setCopiedId(scene.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const completedCount = scenes.filter(s => s.imageUrl).length;
  // All complete if we have images for all scenes OR if we are in T2V mode (no images to generate)
  const isAllComplete = scenes.length > 0 && (generationType === 't2v' || completedCount === scenes.length);
  const allImagesReady = scenes.length > 0 && completedCount === scenes.length;
  const isPlanReady = scenes.length > 0;
  const progressPercent = isPlanReady && generationType === 'visual' ? Math.round((completedCount / scenes.length) * 100) : 0;
  
  const currentAestheticDesc = [...AESTHETICS, ...generatedStyles].find(a => selectedAesthetics.includes(a.label))?.desc;

  return (
    <div className="space-y-12 animate-fade-in pb-24">
      
      {/* 01 - SCRIPT */}
      <div className="group">
         <SectionHeader label="01 — Script Source" onClear={() => { setLocalScript(''); onScriptChange(''); }} onPaste={handlePaste} />
         <div className="bg-[#161b22] border border-gray-800 rounded-xl p-1 focus-within:ring-1 focus-within:ring-indigo-500/50 transition-all shadow-inner relative">
            <textarea 
              value={localScript}
              onChange={handleScriptChange}
              className="w-full h-64 bg-transparent p-5 text-sm text-gray-300 font-serif leading-relaxed resize-none focus:outline-none custom-scrollbar z-10 relative"
              placeholder="Paste your script here or edit the existing one..."
            />
         </div>
         
         {/* Script Analysis Trigger */}
         <div className="mt-3 flex justify-end">
            <button
              onClick={handleAnalyzeScriptTrigger}
              disabled={isAnalyzingScript || !localScript.trim()}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                isAnalyzingScript 
                  ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/50' 
                  : analysisStatus === 'success'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                    : analysisStatus === 'error'
                      ? 'bg-red-500/20 text-red-400 border border-red-500/50'
                      : 'bg-[#161b22] text-gray-400 border border-gray-800 hover:border-indigo-500/50 hover:text-indigo-400'
              }`}
            >
              {isAnalyzingScript ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing Script...</>
              ) : analysisStatus === 'success' ? (
                <><Check className="w-4 h-4" /> Analysis Complete</>
              ) : analysisStatus === 'error' ? (
                <><Wand2 className="w-4 h-4" /> Analysis Failed - Retry</>
              ) : (
                <><Wand2 className="w-4 h-4" /> Auto-Configure from Script</>
              )}
            </button>
         </div>
      </div>

      {/* 02 - CONFIGURATION GRID */}
      <div className="grid grid-cols-1 gap-10">
        
        {/* Canvas Size (Row) */}
        <div>
          <SectionHeader label="02 — Canvas Size" />
          <div className="grid grid-cols-3 gap-4">
            {ASPECT_RATIOS.map((ratio) => (
              <SelectButton 
                key={ratio.id}
                label={ratio.label}
                icon={ratio.icon}
                isActive={activeRatio === ratio.id}
                onClick={() => setActiveRatio(ratio.id)}
              />
            ))}
          </div>
        </div>

        {/* Aesthetics (Grid) */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <SectionHeader 
              label="03 — Aesthetics" 
              status={isAnalyzingScript ? 'loading' : analysisStatus === 'success' ? 'success' : analysisStatus === 'error' ? 'error' : 'idle'}
              statusText={isAnalyzingScript ? 'Analyzing...' : analysisStatus === 'success' ? 'Success' : analysisStatus === 'error' ? 'Failed' : undefined}
            />
            <button 
              onClick={() => setIsMultiSelect(!isMultiSelect)}
              className={`text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded border transition-all ${isMultiSelect ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-transparent border-gray-700 text-gray-500 hover:text-gray-300'}`}
            >
              {isMultiSelect ? 'Multi-Select: ON' : 'Multi-Select: OFF'}
            </button>
          </div>
          
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1.5 mb-3">
            {[...AESTHETICS, ...generatedStyles].map(style => (
              <button
                key={style.label}
                onClick={() => handleAestheticClick(style.label)}
                className={`
                   py-2 px-1 rounded-lg text-[9px] font-bold uppercase tracking-wide border transition-all relative flex flex-col items-center justify-center text-center h-full min-h-[44px]
                   ${selectedAesthetics.includes(style.label)
                     ? 'bg-indigo-900/40 border-indigo-500 text-indigo-200 shadow-md' 
                     : suggestedPresets.includes(style.label)
                       ? 'bg-emerald-900/20 border-emerald-500/50 text-emerald-400 hover:border-emerald-400'
                       : generatedStyles.some(s => s.label === style.label)
                         ? 'bg-purple-900/20 border-purple-500/50 text-purple-400 hover:border-purple-400'
                         : 'bg-[#161b22] border-gray-800 text-gray-500 hover:border-gray-600 hover:text-gray-300'}
                `}
              >
                {selectedAesthetics.includes(style.label) && <span className="absolute top-1 right-1 w-1 h-1 bg-indigo-400 rounded-full"></span>}
                {suggestedPresets.includes(style.label) && !selectedAesthetics.includes(style.label) && <span className="absolute top-1 right-1 w-1 h-1 bg-emerald-400 rounded-full"></span>}
                {generatedStyles.some(s => s.label === style.label) && !selectedAesthetics.includes(style.label) && <span className="absolute top-1 right-1 w-1 h-1 bg-purple-400 rounded-full"></span>}
                <span className="leading-tight">{style.label}</span>
              </button>
            ))}
          </div>
          
          {selectedAesthetics.includes('Custom') && (
            <div className="mb-3">
              <input 
                type="text"
                value={customAesthetic}
                onChange={(e) => setCustomAesthetic(e.target.value)}
                placeholder="Describe your custom visual style..."
                className="w-full bg-[#0f1218] border border-gray-700 text-gray-200 text-sm rounded-lg p-3 focus:border-indigo-500 focus:outline-none placeholder-gray-600"
              />
            </div>
          )}

          <div className="mt-2 p-3 rounded-lg bg-[#0f1218] border border-gray-800/50">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-indigo-500"></div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">Visual Prompt (Editable)</span>
              </div>
              <span className="text-[8px] text-gray-600 uppercase">AI will use this exact text</span>
            </div>
            <textarea
              value={editableAestheticPrompt}
              onChange={(e) => setEditableAestheticPrompt(e.target.value)}
              className="w-full bg-[#161b22] border border-gray-800 rounded-lg p-3 text-[11px] text-gray-300 font-mono leading-relaxed resize-none h-24 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
              placeholder="The combined visual prompt will appear here..."
            />
            {currentAestheticDesc && !isMultiSelect && (
              <p className="mt-2 text-[9px] text-gray-500 italic">
                Note: {currentAestheticDesc}
              </p>
            )}
          </div>
        </div>

        {/* Pacing (Row) */}
        <div>
          <SectionHeader label="04 — Pacing" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {PACING_OPTIONS.map(opt => (
               <button
                 key={opt}
                 onClick={() => setActivePacing(opt)}
                 className={`
                    py-3 px-2 rounded-lg text-[10px] font-bold border transition-all text-center
                    ${activePacing === opt
                      ? 'bg-indigo-900/30 border-indigo-500 text-indigo-200' 
                      : 'bg-[#161b22] border-gray-800 text-gray-500 hover:bg-[#1c222b]'}
                 `}
               >
                 {opt}
               </button>
            ))}
          </div>
        </div>

        {/* Duration (Row) */}
        <div>
            <SectionHeader 
              label="05 — Script Duration" 
              status={isAnalyzingScript ? 'loading' : analysisStatus === 'success' ? 'success' : analysisStatus === 'error' ? 'error' : 'idle'}
              statusText={isAnalyzingScript ? 'Estimating...' : analysisStatus === 'success' ? 'Success' : analysisStatus === 'error' ? 'Failed' : undefined}
            />
            <div className="flex flex-col md:flex-row gap-4">
                <button
                    onClick={() => onDurationModeChange('auto')}
                    className={`flex-1 py-3 px-4 rounded-xl border text-xs font-bold uppercase tracking-wide transition-all ${durationMode === 'auto' ? 'bg-indigo-600/20 border-indigo-500 text-white' : 'bg-[#161b22] border-gray-800 text-gray-500 hover:bg-[#1c222b]'}`}
                >
                    Auto (AI Estimate)
                </button>
                
                <div className={`flex-1 flex items-center gap-2 rounded-xl border p-1 transition-all ${durationMode === 'custom' ? 'bg-indigo-600/10 border-indigo-500' : 'bg-[#161b22] border-gray-800'}`}>
                    <button
                        onClick={() => onDurationModeChange('custom')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${durationMode === 'custom' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        Custom
                    </button>
                    <input 
                        type="number"
                        value={customDuration}
                        onChange={(e) => { onCustomDurationChange(e.target.value); onDurationModeChange('custom'); }}
                        placeholder="Secs"
                        className="bg-transparent text-white font-mono text-sm w-full focus:outline-none px-2"
                        disabled={durationMode !== 'custom'}
                    />
                    <span className="text-xs text-gray-500 font-bold pr-3 uppercase">Sec</span>
                </div>
            </div>
        </div>

        {/* AI Direction & Advanced Control (Row) */}
        <div>
           <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
             <div className="text-[10px] font-bold tracking-widest text-gray-500 uppercase border-l-2 border-indigo-500 pl-2">
               06 — AI Direction
             </div>
             
             <div className="flex bg-[#161b22] p-1 rounded-xl border border-gray-800">
               {(['ALL', 'STAGE 1', 'STAGE 2', 'STAGE 3', 'STAGE 4'] as const).map((tab) => (
                 <button
                   key={tab}
                   onClick={() => setActiveDirectionTab(tab)}
                   className={`px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all ${
                     activeDirectionTab === tab 
                       ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' 
                       : 'text-gray-500 hover:text-gray-300'
                   }`}
                 >
                   {tab}
                 </button>
               ))}
             </div>
           </div>
           
           <div className="space-y-3">
             {/* Backbone Display (Read-only) */}
             {activeDirectionTab !== 'ALL' && (
               <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-3">
                 <div className="flex items-center gap-2 mb-1">
                   <div className="w-1 h-1 rounded-full bg-indigo-400"></div>
                   <span className="text-[8px] font-bold uppercase tracking-widest text-indigo-400/70">Default Backbone (Mandatory)</span>
                 </div>
                 <p className="text-[10px] text-gray-400 italic leading-relaxed">
                   {defaultInstructions[activeDirectionTab]}
                 </p>
               </div>
             )}

             <div className="bg-[#161b22] border border-gray-800 rounded-xl p-4 focus-within:ring-1 focus-within:ring-indigo-500/50 transition-all">
                 <div className="flex justify-between items-center mb-2">
                   <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">
                     {activeDirectionTab === 'ALL' ? 'Global Direction' : `${activeDirectionTab} Override`}
                   </span>
                   {currentDirectionValue && (
                     <span className="text-[8px] text-emerald-500 font-bold uppercase">Active</span>
                   )}
                 </div>
                 <textarea
                     value={currentDirectionValue}
                     onChange={(e) => handleDirectionChange(e.target.value)}
                     placeholder={activeDirectionTab === 'ALL' 
                       ? "Global instructions for all stages..." 
                       : `Specific instructions for ${activeDirectionTab}...`}
                     className="w-full bg-transparent text-sm text-gray-300 focus:outline-none resize-none h-24 placeholder-gray-600 custom-scrollbar"
                 />
             </div>
             
             <div className="flex items-center gap-2 px-2">
               <div className="w-1 h-1 rounded-full bg-gray-700"></div>
               <p className="text-[9px] text-gray-600 uppercase tracking-tight">
                 Priority: Default → ALL → Stage Direction (Overrides ALL)
               </p>
             </div>
           </div>
        </div>

      </div>

      {/* VISUAL ENGINE CONTROL */}
      <VisualEngineControl 
        script={localScript}
        aiDirection={aiDirectionAll}
        aiDirectionStages={aiDirectionStages}
        aesthetic={selectedAesthetics.join(', ')}
        pacing={activePacing}
        duration={durationMode === 'custom' ? customDuration : 'auto'}
        canvasSize={activeRatio}
        generationMode={generationType || 'visual'}
        scenes={scenes}
        onUpdateScenes={onUpdateScenes}
      />

      {/* STORYBOARD */}
      {isPlanReady && (
        <div className="space-y-6 pt-10 border-t border-gray-800/50 animate-slide-up">
           
           <h3 className="text-3xl font-extrabold text-white tracking-tight mb-8">
             {generationType === 't2v' ? 'Text-to-Video Plan' : 'Visual Storyboard'}
           </h3>

           {/* GENERATE ALL / PROGRESS BAR */}
           <div className="bg-[#111827] border border-gray-700 rounded-2xl p-6 relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-30"></div>
              
              <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
                 
                 {/* Stats */}
                 <div className="flex gap-6">
                    <div className="flex flex-col items-center justify-center w-16 h-16 rounded-full border-2 border-indigo-500/30 bg-indigo-900/10">
                      <span className="text-xl font-bold text-white">{scenes.length}</span>
                      <span className="text-[8px] font-bold text-gray-400 uppercase">Scenes</span>
                    </div>
                    <div className="flex flex-col justify-center">
                       <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-1">Estimated Duration</span>
                       <span className="text-xl font-mono text-gray-200">~{scenes.reduce((acc,s) => acc + s.duration, 0)}s</span>
                    </div>
                 </div>

                 {/* Progress Bar (Only visible in Visual Standard Mode) */}
                 {viewMode === 'standard' && generationType === 'visual' && (
                    <div className="flex-1 w-full max-w-md">
                        <div className="flex justify-between mb-2 text-[10px] font-bold uppercase tracking-widest text-gray-500">
                        <span>Rendering Progress</span>
                        <span>{progressPercent}%</span>
                        </div>
                        <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
                        </div>
                    </div>
                 )}
                 {/* Spacer for Prompts mode */}
                 {(viewMode === 'prompts' || generationType === 't2v') && <div className="flex-1"></div>}

                 {/* Buttons */}
                 <div className="flex items-center gap-3">
                    {/* Generate All Button (Only Standard Mode) */}
                    {viewMode === 'standard' && generationType === 'visual' && (
                        <button
                            onClick={toggleAutoGenerate}
                            disabled={allImagesReady}
                            className={`
                            px-5 py-3 rounded-full font-bold text-xs uppercase tracking-wider transition-all shadow-lg flex items-center gap-2 whitespace-nowrap
                            ${allImagesReady 
                                ? 'bg-green-500/10 text-green-400 border border-green-500/30 cursor-default'
                                : isAutoGenerating
                                ? 'bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20'
                                : 'bg-white text-black hover:scale-105 border border-white'}
                            `}
                        >
                            {allImagesReady ? (
                            <>
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                                Complete
                            </>
                            ) : isAutoGenerating ? (
                            <>
                                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                Stop
                            </>
                            ) : (
                            <>
                                Generate All
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                            </>
                            )}
                        </button>
                    )}

                    {/* Download All Button */}
                    {/* Only useful if images exist */}
                    {viewMode === 'standard' && generationType === 'visual' && (
                        <button
                        onClick={handleDownloadAll}
                        disabled={completedCount === 0}
                        className={`
                            px-4 py-3 rounded-full font-bold text-xs uppercase tracking-wider transition-all shadow-lg flex items-center gap-2 whitespace-nowrap
                            ${allImagesReady 
                            ? 'bg-indigo-600 text-white hover:bg-indigo-500 border border-indigo-500 shadow-indigo-900/50' 
                            : 'bg-gray-800 text-gray-400 border border-gray-600 hover:text-white hover:border-gray-500'}
                            ${completedCount === 0 ? 'opacity-50 cursor-not-allowed' : ''}
                        `}
                        title="Download all generated images"
                        >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        <span className="hidden sm:inline">Download All</span>
                        </button>
                    )}
                 </div>
              </div>
              
              {/* Info text */}
              {viewMode === 'standard' && generationType === 'visual' && (
                <div className="mt-4 text-center md:text-right">
                    <p className="text-[10px] text-gray-500 uppercase tracking-wide">
                    *Generates images sequentially (one by one) to ensure quality.
                    </p>
                </div>
              )}
           </div>

           {/* SCENE CARDS */}
           <div className="grid grid-cols-1 gap-8">
              {scenes.map((scene, index) => {
                 const startTime = scenes.slice(0, index).reduce((acc, s) => acc + s.duration, 0);
                 const endTime = startTime + scene.duration;
                 const timeRange = `${Math.floor(startTime/60)}:${(startTime%60).toString().padStart(2,'0')} - ${Math.floor(endTime/60)}:${(endTime%60).toString().padStart(2,'0')}`;
                 
                 return (
                   <div key={scene.id} className={`bg-[#111827] border border-gray-800 rounded-2xl overflow-hidden shadow-lg flex flex-col group hover:border-gray-700 transition-all relative ${viewMode === 'standard' ? 'lg:flex-row' : ''}`}>
                      {/* Copy All Button */}
                      <button 
                        onClick={() => handleCopyAll(scene)}
                        className="absolute top-4 right-4 z-40 p-2 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-lg text-indigo-400 hover:text-indigo-300 transition-all shadow-sm group/copy"
                        title="Copy both Image and Video prompts"
                      >
                        {copiedId === scene.id ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>

                      {/* Left: Info Panel (Script & Prompt) */}
                      <div className={`p-4 sm:p-6 flex flex-col justify-between border-b lg:border-b-0 bg-[#161b22]/50 relative ${viewMode === 'standard' ? 'lg:w-5/12 lg:border-r border-gray-800' : 'w-full'}`}>
                         <div>
                            {/* Meta Badges */}
                            <div className="flex flex-wrap items-start gap-2 mb-4">
                               <span className="bg-[#1F2937] text-gray-400 border border-gray-700 text-[10px] font-bold px-2 py-0.5 rounded">
                                 #{String(index + 1).padStart(2, '0')}
                               </span>
                               <span className="bg-indigo-900/20 text-indigo-300 border border-indigo-500/20 text-[10px] font-mono px-2 py-0.5 rounded">
                                 {timeRange}
                               </span>
                               {scene.classification && (
                                 <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${getBadgeColor(scene.classification)}`}>
                                   {scene.classification}
                                 </span>
                               )}
                               {scene.layout && (
                                 <span className="bg-gray-800 text-gray-400 border border-gray-700 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded">
                                   {scene.layout}
                                 </span>
                               )}
                            </div>
                            
                            {/* Core Concept & Notes */}
                            <div className="mb-4 space-y-2">
                               <div>
                                  <h4 className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1">Core Concept</h4>
                                  <input
                                      type="text"
                                      value={scene.visualIntent || ""}
                                      onChange={(e) => onUpdateSingleScene({...scene, visualIntent: e.target.value.toUpperCase()})}
                                      className="w-full bg-transparent text-sm font-bold text-white focus:outline-none border-b border-gray-800 focus:border-indigo-500 transition-colors"
                                  />
                               </div>
                               {scene.visualHierarchy && (
                                 <div>
                                   <h4 className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1">Architecture Notes</h4>
                                   <p className="text-[10px] text-gray-400 leading-tight">{scene.visualHierarchy}</p>
                                 </div>
                               )}
                            </div>
                            
                            <div className="bg-[#0f1218] p-3 rounded-lg border border-gray-800/50 mb-6">
                               <h4 className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1">Narration</h4>
                               <p className="text-gray-300 font-serif italic text-sm leading-relaxed">
                                  "{scene.text}"
                               </p>
                            </div>
                         </div>

                         {/* PROMPT GRIDS - ADAPTIVE */}
                         <div className={`grid gap-4 ${viewMode === 'prompts' && generationType === 'visual' ? 'md:grid-cols-2' : 'grid-cols-1'}`}>
                             
                             {/* 1. Visual Prompt (Image Gen) - Only show if mode is VISUAL */}
                             {generationType === 'visual' && (
                                <div className="bg-[#0f1218] rounded-lg p-3 border border-gray-800 relative group/prompt transition-all hover:border-gray-600">
                                    <div className="flex justify-between items-center mb-2">
                                    <span className="text-[9px] font-bold text-gray-500 uppercase flex items-center gap-1">
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                        Image Prompt
                                    </span>
                                    <button 
                                        onClick={() => navigator.clipboard.writeText(scene.imagePrompt || "")}
                                        className="text-[9px] font-bold text-gray-600 hover:text-white uppercase transition-colors"
                                    >
                                        Copy
                                    </button>
                                    </div>
                                    <textarea
                                    value={scene.imagePrompt || ""}
                                    onChange={(e) => onUpdateSingleScene({ ...scene, imagePrompt: e.target.value })}
                                    className="w-full bg-transparent text-xs text-gray-400 font-mono focus:outline-none resize-none h-24 custom-scrollbar leading-relaxed"
                                    />
                                </div>
                             )}

                             {/* 2. Image to Video Prompt - Only show if mode is VISUAL */}
                             {generationType === 'visual' && (
                                <div className="bg-[#0f1218] rounded-lg p-3 border border-gray-800 relative group/prompt transition-all hover:border-gray-600">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-[9px] font-bold text-gray-500 uppercase flex items-center gap-1">
                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                            Img-to-Video
                                        </span>
                                        <button 
                                            onClick={() => navigator.clipboard.writeText(scene.imageToVideoPrompt || "")}
                                            className="text-[9px] font-bold text-gray-600 hover:text-white uppercase transition-colors"
                                        >
                                            Copy
                                        </button>
                                    </div>
                                    <textarea
                                        value={scene.imageToVideoPrompt || ""}
                                        onChange={(e) => onUpdateSingleScene({ ...scene, imageToVideoPrompt: e.target.value })}
                                        placeholder="Describe motion (e.g., 'Slow zoom in')..."
                                        className="w-full bg-transparent text-xs text-gray-400 font-mono focus:outline-none resize-none h-24 custom-scrollbar leading-relaxed"
                                    />
                                </div>
                             )}

                             {/* 3. Text to Video Prompt - Only show if mode is T2V */}
                             {generationType === 't2v' && (
                                <div className="bg-[#0f1218] rounded-lg p-3 border border-gray-800 relative group/prompt transition-all hover:border-gray-600">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-[9px] font-bold text-indigo-400 uppercase flex items-center gap-1">
                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" /></svg>
                                            Text-to-Video
                                        </span>
                                        <button 
                                            onClick={() => navigator.clipboard.writeText(scene.textToVideoPrompt || "")}
                                            className="text-[9px] font-bold text-gray-600 hover:text-white uppercase transition-colors"
                                        >
                                            Copy
                                        </button>
                                    </div>
                                    <textarea
                                        value={scene.textToVideoPrompt || ""}
                                        onChange={(e) => onUpdateSingleScene({ ...scene, textToVideoPrompt: e.target.value })}
                                        placeholder="Full detailed scene description for Sora/Kling..."
                                        className="w-full bg-transparent text-xs text-gray-400 font-mono focus:outline-none resize-none h-28 custom-scrollbar leading-relaxed"
                                    />
                                </div>
                             )}

                         </div>
                      </div>

                      {/* Right: Image Canvas (Only in Standard Mode) */}
                      {viewMode === 'standard' && generationType === 'visual' && (
                        <div className="lg:w-7/12 bg-black relative h-[350px] lg:h-[450px] overflow-hidden flex flex-row">
                            {scene.imageUrl ? (
                                <>
                                {/* Image Area */}
                                <div className="flex-1 relative flex items-center justify-center p-4 bg-[#050505]">
                                    {/* Blurred Ambient BG */}
                                    <div className="absolute inset-0 bg-cover bg-center blur-3xl opacity-20" style={{ backgroundImage: `url(${scene.imageUrl})` }}></div>
                                    
                                    {/* Clickable Image */}
                                    <a href={scene.imageUrl} target="_blank" rel="noreferrer" className="relative z-10 w-full h-full flex items-center justify-center cursor-zoom-in transition-transform duration-300 hover:scale-[1.01]">
                                    <img src={scene.imageUrl} alt="Generated Scene" className="max-w-full max-h-full object-contain shadow-2xl rounded-sm" />
                                    </a>
                                </div>

                                {/* Sidebar Actions */}
                                <div className="w-16 bg-[#0B0F19] border-l border-gray-800 flex flex-col items-center justify-center gap-2 z-20 shrink-0">
                                    <a 
                                        href={scene.imageUrl} 
                                        target="_blank" 
                                        rel="noreferrer" 
                                        className="p-3 text-gray-500 hover:text-white hover:bg-gray-800 rounded-xl transition-colors tooltip-container" 
                                        title="Open Full Size"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                    </a>

                                    <a 
                                        href={scene.imageUrl} 
                                        download={getCleanFilename(scene.id, scene.visualIntent)}
                                        className="p-3 text-gray-500 hover:text-white hover:bg-gray-800 rounded-xl transition-colors tooltip-container" 
                                        title="Download Image"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                    </a>

                                    <div className="w-8 h-px bg-gray-800 my-2"></div>

                                    <button 
                                        onClick={() => handleGenerateImage(scene)} 
                                        disabled={generatingImageId !== null} 
                                        className="p-3 text-indigo-500 hover:text-white hover:bg-indigo-600 rounded-xl transition-colors disabled:opacity-50" 
                                        title="Regenerate"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                    </button>
                                </div>
                                </>
                            ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gray-800 to-gray-900">
                                <div className="w-16 h-16 rounded-full bg-[#161b22] border border-gray-700/50 flex items-center justify-center mb-6 text-gray-600 shadow-xl">
                                    <svg className="w-8 h-8 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                </div>
                                <button
                                    onClick={() => handleGenerateImage(scene)}
                                    disabled={generatingImageId !== null || isAutoGenerating}
                                    className={`
                                    relative overflow-hidden w-full max-w-[220px] py-3.5 rounded-xl border text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 group
                                    ${scene.isGeneratingImage 
                                        ? 'bg-indigo-900/20 border-indigo-500/50 text-indigo-300' 
                                        : 'bg-[#161b22] border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 hover:bg-[#1c222b]'}
                                    ${(generatingImageId !== null && generatingImageId !== scene.id) ? 'opacity-30 cursor-wait' : ''}
                                    `}
                                >
                                    {scene.isGeneratingImage ? (
                                    <>
                                        <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                        Generating...
                                    </>
                                    ) : isAutoGenerating ? (
                                    "Queued..."
                                    ) : (
                                    <>
                                        Generate Image
                                        <span className="absolute right-0 top-0 bottom-0 w-1 bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                                    </>
                                    )}
                                </button>
                            </div>
                            )}
                            
                            {/* Loading Overlay (Active Generation) */}
                            {scene.isGeneratingImage && (
                                <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50">
                                <svg className="animate-spin h-8 w-8 text-indigo-500" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                </div>
                            )}
                        </div>
                      )}

                   </div>
                 );
              })}
           </div>

           {/* NEXT */}
           <div className="flex justify-end pt-10">
              <button
                 onClick={onNext}
                 disabled={viewMode === 'standard' && !allImagesReady}
                 className={`
                   px-10 py-4 rounded-xl font-bold text-sm tracking-wide transition-all shadow-xl
                   ${(viewMode === 'prompts' || allImagesReady)
                     ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-indigo-500/50 hover:shadow-[0_0_20px_rgba(99,102,241,0.4)] hover:scale-105 border border-indigo-400/30' 
                     : 'bg-gray-800 text-gray-500 cursor-not-allowed opacity-50'}
                 `}
              >
                 Next: SEO Optimization →
              </button>
           </div>

        </div>
      )}

      <InstructionModal
        isOpen={isVisualModalOpen}
        onClose={() => setIsVisualModalOpen(false)}
        title="Visual Plan Generator"
        instruction={customSystemInstruction}
        onInstructionChange={setCustomSystemInstruction}
        defaultInstruction={generateSystemInstruction(
          editableAestheticPrompt,
          activePacing,
          generationType || 'visual',
          (durationMode === 'custom' && customDuration) ? parseInt(customDuration, 10) : undefined
        )}
      />

    </div>
  );
};

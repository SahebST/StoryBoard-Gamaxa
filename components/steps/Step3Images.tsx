
import React, { useState, useEffect } from 'react';
import { Scene } from '../../types';
import { segmentScript, generateSceneImage } from '../../services/geminiService';

interface Props {
  script: string;
  onScriptChange: (script: string) => void;
  scenes: Scene[];
  onUpdateScenes: (scenes: Scene[]) => void;
  onUpdateSingleScene: (scene: Scene) => void;
  onNext: () => void;
}

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
    prompt: 'Visual Style: Classic NotebookLM style. MANDATORY VISUALS: Flat vector-like colors, clean uniform lines, professional editorial composition. Neutral background. Clarity over clutter. Balanced and polished.',
    desc: 'Balanced, editorial illustration.' 
  },
  { 
    label: 'Whiteboard', 
    prompt: 'Visual Style: Whiteboard sketch aesthetic. MANDATORY VISUALS: Rough hand-drawn black marker lines, pure white background. Schematic arrows, circled text, handwritten labels. Focus on "process flow". Sparse accent colors (Red/Blue).',
    desc: 'Minimalist diagrams & sketches.' 
  },
  { 
    label: 'Kawaii', 
    prompt: 'Visual Style: Kawaii aesthetic. MANDATORY VISUALS: Soft pastel color palette (pinks, blues, mints), thick rounded linework, anthropomorphic objects with faces, sparkle effects. Friendly, safe, and simplified for children.',
    desc: 'Cute, rounded, playful.' 
  },
  { 
    label: 'Anime', 
    prompt: 'Visual Style: High-Fidelity Anime Art. MANDATORY VISUALS: Vibrant saturated colors, dramatic cinematic lighting (god rays, lens flare), cel-shaded detailing, dynamic camera angles (low/high tilt). "Makoto Shinkai" style background detail.',
    desc: 'Vibrant, expressive, dynamic.' 
  },
  { 
    label: 'Watercolour', 
    prompt: 'Visual Style: Traditional Watercolour. MANDATORY VISUALS: Wet-on-wet technique, bleeding edges, visible paper texture, organic brush strokes. Soft gradients, dreamy atmosphere. No hard black lines.',
    desc: 'Soft, painterly, artistic.' 
  },
  { 
    label: 'Retro Print', 
    prompt: 'Visual Style: 1970s Retro Print. MANDATORY VISUALS: Visible halftone dot pattern, aged yellowed paper texture, CMYK color shift/misalignment, muted vintage colors (mustard, teal, burnt orange). Look like an old science textbook.',
    desc: 'Vintage, halftone, aged.' 
  },
  { 
    label: 'Heritage', 
    prompt: 'Visual Style: Heritage Engraving. MANDATORY VISUALS: Cross-hatching shading, ink wash, parchment background, ornate borders, encyclopedic realism. Serious, historical, and academic tone.',
    desc: 'Rich, ornate, traditional.' 
  },
  { 
    label: 'Paper Craft', 
    prompt: 'Visual Style: 3D Paper Cutout Diorama. MANDATORY VISUALS: Distinct layers of colored paper, physical paper grain texture, soft drop shadows between layers to show depth. Tactile, handmade look. No outlines.',
    desc: 'Layered, textured 3D paper.' 
  },

  // --- New Advanced Styles ---
  { 
    label: 'Wireframe', 
    prompt: 'Visual Style: WIREFRAME MESH. Core Intent: Expose structure & Technical transparency. Geometry Logic: Only edges and vertices visible, No solid surfaces, Triangular or quad polygon mesh, Grid-based topology. Color Logic: Monochrome neon cyan/white/lime on deep black background. Texture: Pure vector line rendering, Transparent surfaces. Lighting: Minimal edge glow only. Composition: 3D object centered, Rotational perspective.',
    desc: 'Technical structure, neon mesh.' 
  },
  { 
    label: 'Bio-Fiber', 
    prompt: 'Visual Style: BIO-FIBER. Core Intent: Organic structure & Living material. Geometry Logic: Branching networks, Veins/fibers/neural strands, Irregular curvature, No straight lines. Color Logic: Earth tones + bio glow, Soft greens/beige/amber. Texture: Fibrous, Slight translucency, Organic membrane surfaces. Lighting: Bioluminescent highlights, Subsurface scattering. Composition: Macro close-up, Dense layered structure.',
    desc: 'Organic veins, living matter.' 
  },
  { 
    label: 'Glitch / HUD', 
    prompt: 'Visual Style: GLITCH / HUD. Core Intent: Digital interface & Corrupted signal. Geometry Logic: Rectangular UI frames, Overlapping data layers, Grid alignment, Broken distortions. Color Logic: RGB separation, Neon cyan/magenta/red on Black background. Texture: Scanlines, Digital noise, Pixel distortion. Lighting: Screen glow, High contrast data points. Composition: Central subject, Floating UI around it.',
    desc: 'Cyberpunk UI, data distortion.' 
  },
  { 
    label: 'Hyper-Real 3D', 
    prompt: 'Visual Style: HYPER-REAL 3D. Core Intent: Extreme realism beyond photography. Geometry Logic: Physically accurate proportions, Micro surface details, High poly modeling. Color Logic: Natural color grading, Cinematic tones, HDR. Texture: PBR materials, Skin pores/metal scratches. Lighting: Ray-traced lighting, Global illumination, Cinematic depth. Composition: DSLR framing, Bokeh depth-of-field.',
    desc: 'Cinematic photorealism.' 
  },
  { 
    label: 'Cybercore', 
    prompt: 'Visual Style: CYBERCORE. Core Intent: High-tech dystopian aesthetic. Geometry Logic: Sharp edges, Industrial symmetry, Mechanical layering. Color Logic: Black base, Neon purple/electric blue, Chrome highlights. Texture: Metal panels, Carbon fiber, LED strips. Lighting: High contrast, Neon rim lighting, Fog haze. Composition: Aggressive perspective, Wide lens distortion.',
    desc: 'Industrial neon dystopia.' 
  },
  { 
    label: 'Holography', 
    prompt: 'Visual Style: HOLOGRAPHY. Core Intent: Projection of light as structure. Geometry Logic: Semi-transparent forms, Volumetric light grids, Floating projections. Color Logic: Cyan/blue dominant, Rainbow diffraction edges. Texture: Light particles, Thin-line rendering, Scan layer transparency. Lighting: Internal glow, Volumetric beams. Composition: Object floating mid-air, Dark environment.',
    desc: 'Volumetric light projection.' 
  },
  { 
    label: 'Dark Fantasy', 
    prompt: 'Visual Style: DARK FANTASY. Core Intent: Mythic + ominous atmosphere. Geometry Logic: Gothic shapes, Spires/twisted forms, Organic + medieval hybrid. Color Logic: Deep red, Charcoal, Muted gold, Cold blue shadows. Texture: Rough stone, Ancient metal, Smoke & ash. Lighting: Dramatic spotlight, High shadow contrast, Mist & fog. Composition: Central heroic subject, Strong vertical scale.',
    desc: 'Gothic, mythic, cinematic.' 
  },
  { 
    label: 'Psychedelic', 
    prompt: 'Visual Style: PSYCHEDELIC. Core Intent: Perceptual distortion & Mind-expansion. Geometry Logic: Fractals, Infinite loops, Fluid morphing shapes. Color Logic: High saturation, Neon rainbow, Gradient waves. Texture: Liquid swirl, Pattern repetition, Optical illusions. Lighting: Self-glowing colors, No realistic shadows, Intense color bloom. Composition: Symmetry or kaleidoscope, Central focal vortex.',
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

const SectionHeader: React.FC<{ label: string; onClear?: () => void; onPaste?: () => void }> = ({ label, onClear, onPaste }) => (
  <div className="flex justify-between items-end mb-3">
    <div className="text-[10px] font-bold tracking-widest text-gray-500 uppercase border-l-2 border-indigo-500 pl-2">
      {label}
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

export const Step3Images: React.FC<Props> = ({ script: initialScript, onScriptChange, scenes, onUpdateScenes, onUpdateSingleScene, onNext }) => {
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
  const [activeAesthetic, setActiveAesthetic] = useState("Auto-select");
  const [customAesthetic, setCustomAesthetic] = useState("");
  const [activePacing, setActivePacing] = useState("Adaptive Flow (Auto)");
  const [aiDirection, setAiDirection] = useState("");
  
  // Duration Configuration
  const [durationMode, setDurationMode] = useState<'auto' | 'custom'>('auto');
  const [customDuration, setCustomDuration] = useState<string>("");

  // Track last used config to show "Regenerate" vs "Update" state
  const [lastGeneratedConfig, setLastGeneratedConfig] = useState<{aesthetic: string, pacing: string, duration: string, aiDirection: string} | null>(null);

  // State
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [generatingImageId, setGeneratingImageId] = useState<number | null>(null);
  const [isAutoGenerating, setIsAutoGenerating] = useState(false);

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
    lastGeneratedConfig.aesthetic !== activeAesthetic || 
    lastGeneratedConfig.pacing !== activePacing ||
    lastGeneratedConfig.duration !== (durationMode === 'custom' ? customDuration : 'auto') ||
    lastGeneratedConfig.aiDirection !== aiDirection
  );

  const handleGeneratePlan = async (type: 'visual' | 't2v', view: 'standard' | 'prompts') => {
    if (!localScript.trim()) return;
    
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
      const selectedStyle = AESTHETICS.find(s => s.label === activeAesthetic);
      const promptToUse = activeAesthetic === "Custom" ? `Visual Style: ${customAesthetic}` : (selectedStyle ? selectedStyle.prompt : activeAesthetic);
      
      const durationVal = (durationMode === 'custom' && customDuration) ? parseInt(customDuration, 10) : undefined;

      // Pass aiDirection to service
      const newScenes = await segmentScript(
        localScript, 
        promptToUse, 
        activePacing, 
        type, 
        durationVal, 
        aiDirection
      );
      
      onUpdateScenes(newScenes);
      setLastGeneratedConfig({ 
        aesthetic: activeAesthetic, 
        pacing: activePacing,
        duration: durationMode === 'custom' ? customDuration : 'auto',
        aiDirection: aiDirection
      });
      
    } catch (e: any) {
      console.error("Plan generation failed", e);
      const msg = e.message || e.toString();
      if (msg.includes("429") || msg.includes("quota") || msg.includes("exhausted") || msg.includes("RESOURCE_EXHAUSTED")) {
         alert("Server is busy (Rate Limit Reached). Please wait a minute and try again.");
      } else {
         alert("Failed to generate plan. " + msg.slice(0, 100));
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

  const completedCount = scenes.filter(s => s.imageUrl).length;
  // All complete if we have images for all scenes OR if we are in T2V mode (no images to generate)
  const isAllComplete = scenes.length > 0 && (generationType === 't2v' || completedCount === scenes.length);
  const allImagesReady = scenes.length > 0 && completedCount === scenes.length;
  const isPlanReady = scenes.length > 0;
  const progressPercent = isPlanReady && generationType === 'visual' ? Math.round((completedCount / scenes.length) * 100) : 0;
  
  const currentAestheticDesc = AESTHETICS.find(a => a.label === activeAesthetic)?.desc;

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
          <SectionHeader label="03 — Aesthetics" />
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1.5 mb-3">
            {AESTHETICS.map(style => (
              <button
                key={style.label}
                onClick={() => setActiveAesthetic(style.label)}
                className={`
                   py-2 px-1 rounded-lg text-[9px] font-bold uppercase tracking-wide border transition-all relative flex flex-col items-center justify-center text-center h-full min-h-[44px]
                   ${activeAesthetic === style.label 
                     ? 'bg-indigo-900/40 border-indigo-500 text-indigo-200 shadow-md' 
                     : 'bg-[#161b22] border-gray-800 text-gray-500 hover:border-gray-600 hover:text-gray-300'}
                `}
              >
                {activeAesthetic === style.label && <span className="absolute top-1 right-1 w-1 h-1 bg-indigo-400 rounded-full"></span>}
                <span className="leading-tight">{style.label}</span>
              </button>
            ))}
          </div>
          
          {activeAesthetic === 'Custom' ? (
            <input 
              type="text"
              value={customAesthetic}
              onChange={(e) => setCustomAesthetic(e.target.value)}
              placeholder="Describe your custom visual style..."
              className="w-full bg-[#0f1218] border border-gray-700 text-gray-200 text-sm rounded-lg p-3 focus:border-indigo-500 focus:outline-none placeholder-gray-600"
            />
          ) : currentAestheticDesc && (
            <div className="mt-2 p-2.5 rounded-lg bg-[#0f1218] border border-gray-800/50 flex items-start gap-3">
              <div className="mt-1 w-1 h-1 rounded-full bg-indigo-500 shrink-0"></div>
              <p className="text-[10px] text-gray-400 leading-relaxed">
                <strong className="text-indigo-400">Effect:</strong> {currentAestheticDesc}
              </p>
            </div>
          )}
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
            <SectionHeader label="05 — Script Duration" />
            <div className="flex flex-col md:flex-row gap-4">
                <button
                    onClick={() => setDurationMode('auto')}
                    className={`flex-1 py-3 px-4 rounded-xl border text-xs font-bold uppercase tracking-wide transition-all ${durationMode === 'auto' ? 'bg-indigo-600/20 border-indigo-500 text-white' : 'bg-[#161b22] border-gray-800 text-gray-500 hover:bg-[#1c222b]'}`}
                >
                    Auto (AI Estimate)
                </button>
                
                <div className={`flex-1 flex items-center gap-2 rounded-xl border p-1 transition-all ${durationMode === 'custom' ? 'bg-indigo-600/10 border-indigo-500' : 'bg-[#161b22] border-gray-800'}`}>
                    <button
                        onClick={() => setDurationMode('custom')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${durationMode === 'custom' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        Custom
                    </button>
                    <input 
                        type="number"
                        value={customDuration}
                        onChange={(e) => { setCustomDuration(e.target.value); setDurationMode('custom'); }}
                        placeholder="Secs"
                        className="bg-transparent text-white font-mono text-sm w-full focus:outline-none px-2"
                        disabled={durationMode !== 'custom'}
                    />
                    <span className="text-xs text-gray-500 font-bold pr-3 uppercase">Sec</span>
                </div>
            </div>
        </div>

        {/* AI Direction (Row) */}
        <div>
           <SectionHeader label="06 — AI Direction" />
           <div className="bg-[#161b22] border border-gray-800 rounded-xl p-4 focus-within:ring-1 focus-within:ring-indigo-500/50 transition-all">
               <textarea
                   value={aiDirection}
                   onChange={(e) => setAiDirection(e.target.value)}
                   placeholder="Optional: Provide specific visual instructions (e.g. 'Dark and moody lighting', 'Use a specific color palette', 'Focus on character expressions')..."
                   className="w-full bg-transparent text-sm text-gray-300 focus:outline-none resize-none h-20 placeholder-gray-600 custom-scrollbar"
               />
           </div>
        </div>

      </div>

      {/* GENERATE PLAN ACTION */}
      <div className="pt-6 space-y-3">
        <div className="flex gap-3">
            {isPlanReady && (
            <button
                onClick={handleClearScenes}
                className="bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white px-6 py-4 rounded-xl font-bold text-xs uppercase tracking-widest transition-all"
            >
                Clear
            </button>
            )}
            
            {/* Main Visual Plan Button */}
            <button
                onClick={() => handleGeneratePlan('visual', 'standard')}
                disabled={isGeneratingPlan || !localScript.trim()}
                className={`flex-1 py-5 font-bold uppercase tracking-widest rounded-xl shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-3
                    ${isConfigChanged 
                        ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-900/20 ring-2 ring-amber-400/50' 
                        : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-indigo-900/20'
                    }
                `}
            >
                {isGeneratingPlan && generationType === 'visual' ? (
                    <>
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        {isConfigChanged ? 'Updating Plan...' : 'Creating Visual Plan...'}
                    </>
                ) : isConfigChanged ? (
                    <>
                       <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                       Update Visual Plan
                    </>
                ) : isPlanReady && generationType === 'visual' ? (
                    "Regenerate Visual Plan" 
                ) : (
                    "Generate Visual Plan →"
                )}
            </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
            {/* Generate Visual Prompts Only */}
            <button
            onClick={() => handleGeneratePlan('visual', 'prompts')}
            disabled={isGeneratingPlan || !localScript.trim()}
            className="w-full py-4 bg-[#1F2937] hover:bg-gray-700 border border-gray-600 text-gray-300 hover:text-white font-bold uppercase tracking-widest rounded-xl shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
            {isGeneratingPlan && generationType === 'visual' && viewMode === 'prompts' ? (
                <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    Generating...
                </>
            ) : (
                <>
                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    Visual Prompts (Text)
                </>
            )}
            </button>

            {/* Generate Text-to-Video Prompts Only */}
            <button
            onClick={() => handleGeneratePlan('t2v', 'prompts')}
            disabled={isGeneratingPlan || !localScript.trim()}
            className="w-full py-4 bg-[#1F2937] hover:bg-indigo-900/30 border border-gray-600 hover:border-indigo-500/50 text-indigo-300 hover:text-white font-bold uppercase tracking-widest rounded-xl shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
            {isGeneratingPlan && generationType === 't2v' ? (
                <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    Generating T2V...
                </>
            ) : (
                <>
                    <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" /></svg>
                    Text-to-Video Prompts
                </>
            )}
            </button>
        </div>
      </div>

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
                   <div key={scene.id} className={`bg-[#111827] border border-gray-800 rounded-2xl overflow-hidden shadow-lg flex flex-col group hover:border-gray-700 transition-all ${viewMode === 'standard' ? 'xl:flex-row' : ''}`}>
                      
                      {/* Left: Info Panel (Script & Prompt) */}
                      <div className={`p-6 flex flex-col justify-between border-b xl:border-b-0 bg-[#161b22]/50 relative ${viewMode === 'standard' ? 'xl:w-5/12 xl:border-r border-gray-800' : 'w-full'}`}>
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
                                      value={scene.visualIntent}
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
                        <div className="xl:w-7/12 bg-black relative h-[350px] xl:h-[450px] overflow-hidden flex flex-row">
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
                     ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-indigo-900/40 hover:scale-105' 
                     : 'bg-gray-800 text-gray-500 cursor-not-allowed opacity-50'}
                 `}
              >
                 Next: SEO Optimization →
              </button>
           </div>

        </div>
      )}

    </div>
  );
};

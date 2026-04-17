import React, { useState } from 'react';
import { fetchAIResponse } from '../services/geminiService';
import { Scene } from '../types';

interface VisualEngineControlProps {
  script: string;
  aiDirection: string;
  aiDirectionStages: Record<string, string>;
  aesthetic: string;
  pacing: string;
  duration: string;
  canvasSize: string;
  scenes: Scene[];
  onUpdateScenes: (scenes: Scene[]) => void;
}

interface StageState {
  id: number;
  name: string;
  instruction: string;
  status: 'idle' | 'loading' | 'complete' | 'error';
}

export const STAGES_CONFIG = [
  {
    id: 1,
    name: 'STAGE 1',
    instruction: `STAGE 1 — SEGMENTATION ENGINE
The model must read the full script and break it into micro visual segments optimized for generation. Segmentation is driven by actions (verbs), reactions, and meaning shifts, not sentence boundaries. Each segment must represent a single clear visual unit that can be understood instantly and fits within ~1.5–4 seconds of narration.
The model must aggressively split content using action detection, clause separation, and cause→effect logic. If an event produces a result, they must be separated into two segments. If multiple actions exist in one sentence, they must be separated. If a segment feels overloaded or unclear, it must be split further.
The model must prioritize clarity over grammatical structure. It must not preserve sentence form if it reduces visual clarity. Segments must be rewritten if necessary to ensure each one represents a complete, simple, and visualizable idea. Avoid long or abstract segments at all cost.
The output must be a clean ordered list of segments.
OUTPUT FORMAT: JSON array of objects with { id, text, duration }.`,
  },
  {
    id: 2,
    name: 'STAGE 2',
    instruction: `STAGE 2 — VISUAL TRANSLATOR ENGINE
The model must convert each segment into a literal, real-world visual description. The goal is not creativity but instant readability. Every visual must show what is physically happening using human actions, objects, environments, or simple systems.
The model must enforce Action → Visible Result mapping. If something happens, the output must show how it appears visually. For example, failure must appear as an error, instability as distortion, and processes as motion or change. Do not describe concepts—show them happening.
For abstract ideas, the model must convert them into clear visual systems using diagrams, simulations, or universal metaphors. Use standard shorthand like maze (logic), battery (power), water (parallel flow), glitch (failure), ice (cold). Avoid complex or artistic interpretations unless absolutely necessary.
Each segment must contain exactly one visual idea. No mixing of multiple actions or concepts. Maintain continuity by reusing or evolving objects between segments when possible.
OUTPUT FORMAT: Update the input JSON array by adding { visualIntent, classification, layout } to each segment.`,
  },
  {
    id: 3,
    name: 'STAGE 3',
    instruction: `STAGE 3 — IMAGE PROMPT GENERATOR
The model must convert each visual description into a high-quality static image prompt optimized for image generation models. The output must describe a single frozen moment with clear subject, environment, and action state.
Prompts must be physically grounded and visually specific. Include subject identity, object interaction, environment type, and visible state. Avoid abstract wording. The model must ensure the image can be generated without ambiguity or hallucination.
The model may include lighting, composition, and realism cues, but must avoid overly cinematic or complex phrasing. Keep prompts clean, descriptive, and generation-friendly. The goal is accuracy and consistency, not artistic writing.
Each output must map 1:1 with the input segment and preserve continuity across prompts. No new elements should be introduced unless required for clarity.
OUTPUT FORMAT: Update the input JSON array by adding { imagePrompt } to each segment.`,
  },
  {
    id: 4,
    name: 'STAGE 4',
    instruction: `STAGE 4 — IMAGE → VIDEO PROMPT GENERATOR
The model must convert each image prompt into a controlled motion prompt for image-to-video generation. The goal is to describe natural, minimal movement over time, not create new scenes.
Motion must be derived from the existing image: small actions like hand movement, screen changes, fluid motion, environmental shifts. Avoid chaos, fast cuts, or unrealistic transitions. The motion must feel physically believable and stable.
Each prompt must include clear temporal behavior (~2–4 seconds) and describe how the scene evolves. Movement must support the idea, not distract from it. Avoid adding new objects, characters, or environments.
Continuity must be preserved across segments. The model must ensure that motion logically follows previous states.
OUTPUT FORMAT: Update the input JSON array by adding { imageToVideoPrompt } to each segment.`,
  }
];

export const VisualEngineControl: React.FC<VisualEngineControlProps> = ({
  script,
  aiDirection,
  aiDirectionStages,
  aesthetic,
  pacing,
  duration,
  canvasSize,
  scenes,
  onUpdateScenes
}) => {
  const [stages, setStages] = useState<StageState[]>(
    STAGES_CONFIG.map(s => ({ ...s, status: 'idle' }))
  );
  const [activeStageId, setActiveStageId] = useState<number>(1);
  const [showRaw, setShowRaw] = useState(false);

  const getSystemInstruction = (stageId: number) => {
    const stage = STAGES_CONFIG.find(s => s.id === stageId);
    const stageName = `STAGE ${stageId}`;
    const backbone = stage?.instruction || "";
    const globalDir = aiDirection;
    const stageDir = aiDirectionStages[stageName];

    let instruction = `You are a visual engine assistant.\n\n`;
    
    instruction += `--- CORE PROTOCOL (MANDATORY BACKBONE) ---\n${backbone}\n\n`;
    
    if (globalDir) {
      instruction += `--- GLOBAL DIRECTION ---\n${globalDir}\n\n`;
    }
    
    if (stageDir) {
      instruction += `--- STAGE-SPECIFIC DIRECTION (OVERRIDES GLOBAL) ---\n${stageDir}\n\n`;
    }
    
    instruction += `SETTINGS:\n`;
    instruction += `- Aesthetics: ${aesthetic}\n`;
    instruction += `- Pacing: ${pacing}\n`;
    instruction += `- Script Duration: ${duration}s\n`;
    instruction += `- Canvas Size: ${canvasSize}\n`;
    
    instruction += `\nIMPORTANT: Return ONLY valid JSON. The output must be an array of scene objects.`;
    
    return instruction;
  };

  const runStage = async (stageId: number, input: string | Scene[]) => {
    setStages(prev => prev.map(s => s.id === stageId ? { ...s, status: 'loading' } : s));
    setActiveStageId(stageId);
    
    try {
      const systemInstruction = getSystemInstruction(stageId);
      const prompt = `INPUT:\n${typeof input === 'string' ? input : JSON.stringify(input, null, 2)}\n\nPlease process this input according to your instructions and return the updated JSON array.`;
      
      const response = await fetchAIResponse(prompt, systemInstruction, 'json');
      
      if (response) {
        // Try to parse the JSON response
        let parsedScenes: Scene[] = [];
        try {
           // Sometimes the AI wraps JSON in markdown blocks
           let cleanJson = response.replace(/```json\n?|```/g, '').trim();
           
           // If the JSON is truncated (doesn't end with ] or }), try to fix it
           if (!cleanJson.endsWith(']') && !cleanJson.endsWith('}')) {
             console.warn("JSON response appears truncated, attempting to fix...");
             // Find the last complete object
             const lastBraceIndex = cleanJson.lastIndexOf('}');
             if (lastBraceIndex !== -1) {
               cleanJson = cleanJson.substring(0, lastBraceIndex + 1);
               if (cleanJson.startsWith('[')) {
                 cleanJson += ']';
               }
             }
           }
           
           parsedScenes = JSON.parse(cleanJson);
           
           // Ensure it's an array
           if (parsedScenes && Array.isArray(parsedScenes)) {
             // If it returned an object with a key like "visual_segments", extract it
             // But we asked for an array directly.
             onUpdateScenes(parsedScenes);
             setStages(prev => prev.map(s => s.id === stageId ? { ...s, status: 'complete' } : s));
           } else if (parsedScenes && typeof parsedScenes === 'object' && Object.values(parsedScenes).some(Array.isArray)) {
             // Fallback if it wrapped it in an object
             const arrayVal = Object.values(parsedScenes).find(Array.isArray) as unknown as Scene[];
             onUpdateScenes(arrayVal);
             setStages(prev => prev.map(s => s.id === stageId ? { ...s, status: 'complete' } : s));
           } else {
             throw new Error("Invalid JSON structure returned");
           }
        } catch (parseError) {
           console.error("Failed to parse JSON from AI:", response);
           throw new Error("Failed to parse JSON");
        }
      } else {
        throw new Error("Empty response");
      }
      
    } catch (error) {
      console.error(`Stage ${stageId} failed:`, error);
      setStages(prev => prev.map(s => s.id === stageId ? { ...s, status: 'error' } : s));
    }
  };

  const handleGenerate = () => {
    setStages(STAGES_CONFIG.map(s => ({ ...s, status: 'idle' })));
    onUpdateScenes([]);
    runStage(1, script);
  };

  const handleNext = () => {
    const currentStage = stages.find(s => s.id === activeStageId);
    if (!currentStage || currentStage.status !== 'complete' || activeStageId >= 4) return;
    
    runStage(activeStageId + 1, scenes);
  };

  const handleRegenerate = () => {
    const input = activeStageId === 1 ? script : scenes;
    runStage(activeStageId, input);
  };

  const activeStage = stages.find(s => s.id === activeStageId);

  return (
    <div className="w-full bg-[#111827] border border-gray-800 rounded-xl overflow-hidden shadow-2xl mt-8 animate-in fade-in slide-in-from-bottom-4">
      <div className="p-4 border-b border-gray-800 bg-[#0d1117] flex justify-between items-center">
        <h3 className="text-sm font-bold text-gray-300 uppercase tracking-widest flex items-center gap-2">
          <svg className="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
          Visual Engine Control
        </h3>
        
        <div className="flex gap-2">
          <button
            onClick={handleGenerate}
            disabled={!script.trim() || stages[0].status === 'loading'}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-[10px] font-bold uppercase tracking-wider rounded transition-colors"
          >
            Generate
          </button>
          <button
            onClick={handleRegenerate}
            disabled={activeStage?.status === 'loading' || activeStage?.status === 'idle'}
            className="px-4 py-1.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white text-[10px] font-bold uppercase tracking-wider rounded transition-colors"
          >
            Regenerate
          </button>
          <button
            onClick={handleNext}
            disabled={activeStage?.status !== 'complete' || activeStageId >= 4}
            className="px-4 py-1.5 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-[10px] font-bold uppercase tracking-wider rounded transition-colors"
          >
            Next
          </button>
        </div>
      </div>

      <div className="flex border-b border-gray-800">
        {stages.map(stage => (
          <button
            key={stage.id}
            onClick={() => setActiveStageId(stage.id)}
            className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-widest transition-colors border-r border-gray-800 last:border-r-0 flex items-center justify-center gap-2
              ${activeStageId === stage.id ? 'bg-indigo-900/20 text-indigo-400 border-b-2 border-b-indigo-500' : 'bg-transparent text-gray-500 hover:bg-gray-800/50'}
            `}
          >
            {stage.status === 'complete' && <svg className="w-3 h-3 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>}
            {stage.status === 'loading' && <svg className="animate-spin w-3 h-3 text-indigo-500" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
            {stage.name}
          </button>
        ))}
      </div>

      <div className="px-4 py-2 bg-[#0d1117] flex justify-between items-center border-b border-gray-800">
        <button 
          onClick={() => setShowRaw(!showRaw)}
          className="text-[9px] font-bold text-gray-500 hover:text-indigo-400 uppercase tracking-widest flex items-center gap-1 transition-colors"
        >
          <svg className={`w-3 h-3 transition-transform ${showRaw ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
          {showRaw ? 'Hide Raw Protocol' : 'View Raw Protocol & Input'}
        </button>
        <span className="text-[10px] text-gray-500 uppercase tracking-widest">
          Status: <span className={activeStage?.status === 'complete' ? 'text-green-400' : activeStage?.status === 'error' ? 'text-red-400' : 'text-gray-400'}>{activeStage?.status}</span>
        </span>
      </div>

      {showRaw && (
        <div className="p-4 bg-[#080a0f] border-b border-gray-800 space-y-4 animate-in fade-in slide-in-from-top-2">
           <div>
             <h4 className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest mb-2">System Instruction (Stage {activeStageId})</h4>
             <pre className="text-[10px] text-gray-400 bg-black/30 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed border border-gray-800">
               {getSystemInstruction(activeStageId)}
             </pre>
           </div>
           <div>
             <h4 className="text-[9px] font-bold text-purple-400 uppercase tracking-widest mb-2">Input Data</h4>
             <pre className="text-[10px] text-gray-400 bg-black/30 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed border border-gray-800">
               {activeStageId === 1 ? script : JSON.stringify(scenes, null, 2)}
             </pre>
           </div>
        </div>
      )}
    </div>
  );
};

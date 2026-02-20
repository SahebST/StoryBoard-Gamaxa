
import { GoogleGenAI, Modality, Type, Schema } from "@google/genai";
import { ScriptSettings, Scene, SEOData, ScriptAnalysis } from "../types";

// Helper to get AI instance
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- Model Configuration ---
let activeModel = 'gemini-2.0-flash';

export const setActiveModel = (model: string) => {
  console.log(`Switched AI Model to: ${model}`);
  activeModel = model;
};

export const getActiveModel = () => activeModel;

// --- Utils ---

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function callWithRetry<T>(fn: () => Promise<T>, retries = 3, baseDelay = 3000): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (e: any) {
      // Check for 429 Rate Limit, 503 Service Unavailable, or Resource Exhausted
      const msg = e.message || e.toString() || '';
      const isTransientError = 
        e.status === 429 || 
        e.code === 429 || 
        e.status === 503 || 
        e.code === 503 || 
        msg.includes('429') ||
        msg.includes('Quota exceeded') ||
        msg.includes('RESOURCE_EXHAUSTED') || 
        (e.response && e.response.status === 429);
      
      if (isTransientError && i < retries - 1) {
        const delayTime = baseDelay * Math.pow(2, i); // e.g. 3000, 6000, 12000
        console.warn(`API Busy (429/503). Retrying in ${delayTime}ms...`, msg);
        await wait(delayTime);
        continue;
      }
      throw e;
    }
  }
  throw new Error("Max retries exceeded");
}

function cleanJSON(text: string): string {
  // Remove markdown code blocks if present
  let clean = text.trim();
  if (clean.startsWith('```json')) {
    clean = clean.replace(/^```json/, '').replace(/```$/, '');
  } else if (clean.startsWith('```')) {
    clean = clean.replace(/^```/, '').replace(/```$/, '');
  }
  return clean.trim();
}

export const downloadFile = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// --- Step 1: Script Creation, Analysis & Improvement ---

export const generateScriptFromIdea = async (topic: string, tone: string): Promise<string> => {
  const ai = getAI();
  const prompt = `
  TASK: Write a compelling short-form video script (TikTok/Reels/Shorts) based on the topic below.
  
  TOPIC: "${topic}"
  TONE: ${tone}
  
  CONSTRAINTS:
  1. NARRATIVE STYLE: Use a 3rd Person Narrator perspective. (e.g., "He walked into the room..." or "The universe is expanding..."). Do not use "I" or "We" unless quoting someone.
  2. LENGTH: 30 to 60 seconds spoken duration (approx 100-160 words).
  3. FORMAT: Return ONLY the spoken words. Do not include visual directions, scene headers, or character names. Just the raw script text.
  4. HOOK: Start with a strong hook in the first sentence.
  `;

  return callWithRetry(async () => {
    const response = await ai.models.generateContent({
      model: activeModel,
      contents: prompt,
    });
    return response.text?.trim() || "";
  });
};

export const analyzeScript = async (script: string): Promise<ScriptAnalysis> => {
  const ai = getAI();
  const prompt = `
  TASK: Analyze this short-form video script (TikTok/Reels/Shorts).
  
  SCRIPT:
  "${script}"

  REQUIREMENTS:
  1. Score it (0-100) based on engagement, hook quality, and retention.
  2. Rate the Hook (First 3 seconds).
  3. Check for Factual Errors. If none, return ["Verified. No factual errors found."].
  4. Identify 2 key Strengths and 2 Weaknesses.
  5. Provide one main Improvement Suggestion.

  OUTPUT (Strict JSON):
  {
    "score": 85,
    "hookRating": "Weak" | "Good" | "Viral",
    "pacing": "Too Slow" | "Good" | "Too Fast",
    "wordCount": 120,
    "estimatedDuration": "45s",
    "factCheck": ["Error 1...", "Error 2..."] or ["Verified..."],
    "strengths": ["...", "..."],
    "weaknesses": ["...", "..."],
    "improvementSuggestion": "..."
  }
  `;

  return callWithRetry(async () => {
    const response = await ai.models.generateContent({
      model: activeModel,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER },
            hookRating: { type: Type.STRING },
            pacing: { type: Type.STRING },
            wordCount: { type: Type.NUMBER },
            estimatedDuration: { type: Type.STRING },
            factCheck: { type: Type.ARRAY, items: { type: Type.STRING } },
            strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
            weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
            improvementSuggestion: { type: Type.STRING }
          },
          required: ['score', 'hookRating', 'factCheck', 'strengths', 'weaknesses']
        }
      }
    });

    const text = response.text || "{}";
    try {
      return JSON.parse(text);
    } catch (e) {
      console.error("Failed to parse analysis JSON", e);
      throw new Error("Analysis failed");
    }
  });
};

export const improveScript = async (script: string, instruction: string): Promise<string> => {
  const ai = getAI();
  const prompt = `
  TASK: Improve this video script based on the instruction.
  
  ORIGINAL SCRIPT:
  "${script}"

  INSTRUCTION:
  "${instruction}"

  CONSTRAINTS:
  - Keep it in spoken word format.
  - Maintain the original topic.
  - Output ONLY the new script text. No intro/outro.
  `;

  return callWithRetry(async () => {
    const response = await ai.models.generateContent({
      model: activeModel,
      contents: prompt,
    });
    return response.text?.trim() || script;
  });
};

export const generateViralHooks = async (topic: string): Promise<string[]> => {
  const ai = getAI();
  const prompt = `
  TASK: Write 5 distinct, scroll-stopping "Viral Hooks" for a short-form video about: "${topic}".
  
  RULES:
  - Each hook must be under 15 words.
  - Use patterns like "Stop doing this", "The secret to...", "I tried...", "Why everyone is wrong about...".
  - Make them catchy and high-click-through (clickbait but honest).
  - No intro text. Just the 5 hooks separated by newlines.
  `;

  return callWithRetry(async () => {
      const response = await ai.models.generateContent({
        model: activeModel,
        contents: prompt,
      });
      const text = response.text || "";
      // Clean up the output (remove bullets, numbers)
      return text.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .map(line => line.replace(/^[\d\-\*\•]+\.?\s*/, ''));
  });
};

// --- Step 2: Audio Generation ---

export const generateAudio = async (text: string, voiceName: string): Promise<string | null> => {
  const ai = getAI();
  
  try {
    return await callWithRetry(async () => {
      // NOTE: We keep Audio generation fixed to 'gemini-2.0-flash' as it has stable audio output support.
      // 'pro' models might not support Modality.AUDIO response yet.
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: [{ parts: [{ text: text }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voiceName },
            },
          },
        },
      });
      return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
    });
  } catch (e) {
    console.error("TTS Error", e);
    return null;
  }
};

// --- Step 3: Script Segmentation & Plan Generation ---

export const segmentScript = async (
  script: string, 
  visualStylePrompt: string, 
  pacing: string,
  mode: 'visual' | 't2v' = 'visual',
  totalDuration?: number,
  userInstruction: string = ""
): Promise<Scene[]> => {
  const ai = getAI();
  
  // 1. Handle Duration Overrides
  let durationContext = "";
  if (totalDuration) {
    durationContext = `
    CRITICAL INSTRUCTION - TOTAL DURATION:
    The user requires the video to be EXACTLY ${totalDuration} seconds long.
    You MUST plan the segments so their 'duration' values sum up to approximately ${totalDuration}.
    
    Guidance:
    - If the script is short, extend the duration of visual segments (e.g. slow motion, lingering shots).
    - If the script is long, tighten the duration (fast cuts).
    - Verify your math: Sum of all 'duration' fields MUST equal ${totalDuration} (within 1-2s margin).
    `;
  }

  // 2. Strict Pacing Logic
  let specificPacingInstruction = "";
  if (pacing.includes("Fixed")) {
    // Extract X from "Fixed Xs Intervals" (e.g. 3, 4, 5)
    const seconds = pacing.match(/(\d+)s/)?.[1] || "3"; 
    specificPacingInstruction = `
    STRICT PACING MODE: Fixed ${seconds} Second Intervals.
    1. Divide the script into segments that take EXACTLY ${seconds} seconds.
    2. The 'duration' field for EVERY segment must be ${seconds} (float is okay, e.g. ${seconds}.0).
    3. Ignore natural sentence boundaries if necessary to maintain this fixed rhythm.
    `;
  } else {
    // Adaptive Flow
    if (totalDuration) {
         specificPacingInstruction = `
        PACING STRATEGY: Fit to ${totalDuration}s.
        1. Break the script into logical visual segments.
        2. Allocate time to each segment based on the density of information.
        3. Ensure the total time accumulates to exactly ${totalDuration}s.
        4. If necessary to reach ${totalDuration}s, allow individual segments to be longer (up to 8s).
        `;
    } else {
        specificPacingInstruction = `
        ADAPTIVE FAST-PACED EDITING:
        1. GLOBAL CONSTRAINT: Every visual segment MUST have a duration between 1.0 seconds and 5.0 seconds. NO EXCEPTIONS.
        2. If a sentence is long, you MUST split it into multiple visual segments of 2-4 seconds each.
        3. If a phrase is very short (under 1s), merge it with the adjacent phrase.
        4. Ideal Target: Aim for a varied rhythm averaging 3 seconds per segment to maintain high engagement (TikTok/Shorts style).
        `;
    }
  }

  // 3. Dynamic Prompt Engineering Instructions based on Mode
  let promptEngineeringSection = "";
  if (mode === 't2v') {
     promptEngineeringSection = `
4. **Prompt Engineering (Text-to-Video Focus)**:
   - **'text_to_video_prompt' (PRIORITY)**: Write a comprehensive, standalone prompt for video generation (Sora/Kling/Gen-3). Must include: Subject appearance, Action/Movement, Environment, Lighting, Camera Angle, and Style.
   - 'final_image_prompt': A static reference image prompt matching the video style.
   - 'image_to_video_prompt': A concise motion description (e.g., "Drone shot", "Tracking shot").
     `;
  } else {
     promptEngineeringSection = `
4. **Prompt Engineering (Static Image + Animation Focus)**:
   - **'final_image_prompt' (PRIORITY)**: Write a detailed static image prompt. START with the *Visual Style Name*. Follow with Subject, Labeling Logic (if structure/process), and Composition.
   - **'image_to_video_prompt' (PRIORITY)**: Describe 2-5 words of camera motion or subject animation to turn this static image into a video (e.g., "Slow zoom in", "Pan left", "Particles floating").
   - 'text_to_video_prompt': A standalone video prompt as backup.
     `;
  }

  // Use the advanced "Educational Visual Architect" system instruction
  const systemInstruction = `
You are an expert Educational Visual Architect, modeled after the sophisticated visual logic of advanced notebooking AIs.

GOAL: Convert an educational script into a structured visual plan with a consistent, authoritative visual language.

---
CORE VISUAL PROTOCOL:
${visualStylePrompt}
---

PACING & TIMING RULES (CRITICAL):
${durationContext}
${specificPacingInstruction}

---
SMART LABELING & DIAGRAMMING LOGIC:
1. IF Classification is "Structure" or "Process":
   - The visual MUST be a "Labeled Diagram", "Schematic", or "Annotated Chart".
   - You MUST explicitly include instructions for labels in the 'final_image_prompt'.
   - Examples: "Include clear text labels for the nucleus and mitochondria", "Annotate the flow of energy with arrows and text".
   - Match the label style to the aesthetic (e.g., "Handwritten labels" for Whiteboard, "Bold Serif Typography" for Retro).

2. IF Classification is "Abstract" or "Comparison":
   - Avoid heavy text. Use visual metaphors.
   - Use iconography to represent concepts.

---
STAGES OF PRODUCTION:
1. **Semantic Analysis**: Extract core concepts (Structure, Process, Comparison, Abstract).
2. **Segmentation**: Break down the script into segments strictly following the PACING RULES above.
3. **Architecture Planning**: Define the layout (Split, Center, Flow, Grid) and visual hierarchy.
${promptEngineeringSection}

Output JSON format with 'visual_segments' array.
  `;

  // Append user instruction if provided
  const finalSystemInstruction = userInstruction && userInstruction.trim() 
  ? `${systemInstruction}\n\n--- ADDITIONAL USER DIRECTION ---\nThe user has provided specific instructions to guide your generation:\n"${userInstruction}"\n\nEnsure you adhere to these instructions alongside the core protocol.`
  : systemInstruction;


  // Define Schema with strict strict layout and classification types
  const schema = {
    type: Type.OBJECT,
    properties: {
      visual_segments: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.INTEGER },
            script_segment: { type: Type.STRING },
            core_concept: { type: Type.STRING },
            duration: { 
                type: Type.NUMBER, 
                description: totalDuration 
                    ? `Duration in seconds. The sum of all segments MUST be exactly ${totalDuration}.` 
                    : "Strictly follow pacing rules. Adaptive: 1-5s. Fixed: Requested Fixed Time." 
            },
            classification: { type: Type.STRING, enum: ["Structure", "Process", "Comparison", "Abstract"] },
            visual_hierarchy: { type: Type.STRING },
            layout: { type: Type.STRING },
            final_image_prompt: { type: Type.STRING },
            image_to_video_prompt: { type: Type.STRING },
            text_to_video_prompt: { type: Type.STRING }
          },
          // IMPORTANT: Require prompts to ensure they are generated
          required: ["id", "script_segment", "core_concept", "duration", "final_image_prompt", "image_to_video_prompt", "text_to_video_prompt"]
        }
      }
    }
  };

  return callWithRetry(async () => {
    const response = await ai.models.generateContent({
      model: activeModel,
      contents: script,
      config: {
        systemInstruction: finalSystemInstruction,
        responseMimeType: 'application/json',
        responseSchema: schema,
      }
    });

    const text = cleanJSON(response.text || "{}");
    let data;
    try {
        data = JSON.parse(text);
    } catch(e) {
        console.error("Failed to parse segment JSON", e);
        throw new Error("Segmentation failed");
    }

    if (!data.visual_segments) return [];

    return data.visual_segments.map((seg: any) => ({
        id: seg.id,
        text: seg.script_segment,
        duration: seg.duration,
        visualIntent: seg.core_concept,
        imagePrompt: seg.final_image_prompt,
        imageToVideoPrompt: seg.image_to_video_prompt,
        textToVideoPrompt: seg.text_to_video_prompt,
        classification: seg.classification,
        layout: seg.layout,
        visualHierarchy: seg.visual_hierarchy,
        imageUrl: undefined,
        isGeneratingImage: false
    }));
  });
};

// --- Image Generation ---

export const generateSceneImage = async (prompt: string, aspectRatio: string): Promise<string | null> => {
    const ai = getAI();
    return callWithRetry(async () => {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [{ text: prompt }]
            },
            config: {
                imageConfig: {
                    aspectRatio: aspectRatio as any
                }
            }
        });
        
        if (response.candidates?.[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData && part.inlineData.mimeType.startsWith('image')) {
                     return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                }
            }
        }
        return null;
    });
};

// --- SEO Generation ---

export const generateSEO = async (script: string, audience: string, tone: string): Promise<SEOData> => {
    const ai = getAI();
    
    // Expert Persona Prompt
    const prompt = `
    ROLE: You are an elite YouTube/TikTok Algorithm Specialist. Your goal is to maximize CTR (Click-Through Rate) and Watch Time for the following video script.

    INPUT SCRIPT:
    "${script.slice(0, 3000)}"

    AUDIENCE PROFILE: ${audience}
    TONE: ${tone}

    TASK:
    1. **Titles (4 Distinct Strategies)**:
       - *Viral/Clickbait*: High curiosity, open loop (e.g., "Stop Doing This...").
       - *SEO Optimized*: Keyword-heavy for search traffic.
       - *Emotional/Benefit*: Focuses on the user's pain or desire.
       - *Short/Punchy*: Under 40 characters, bold.

    2. **Description (Highly Detailed)**:
       - *The Hook*: First 2 lines must grab attention.
       - *Summary*: A compelling breakdown of the video content.
       - *CTA*: A call to action.

    3. **Context Expansion (Deep Dive)**:
       - Identify 2-3 complex or interesting concepts mentioned in the script that were too short to explain fully.
       - Write a "Deep Dive" section explaining these concepts in detail (2-3 paragraphs) to add value in the description.
       - This is crucial for "Search Generative Experience" (SGE) optimization.

    4. **Hashtags**: 10-15 high-volume, niche-specific tags.

    5. **Keywords**: 15-20 LSI (Latent Semantic Indexing) keywords for metadata.

    OUTPUT FORMAT (Strict JSON):
    {
       "titles": ["Title 1", "Title 2", "Title 3", "Title 4"],
       "description": "Full description text...",
       "contextExpansion": "Header: Deep Dive... [Detailed explanation of missed points]...",
       "hashtags": ["#tag1", "#tag2", ...],
       "keywords": ["keyword1", "keyword2", ...]
    }
    `;

    return callWithRetry(async () => {
        const response = await ai.models.generateContent({
            model: activeModel,
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        titles: { 
                            type: Type.ARRAY, 
                            items: { type: Type.STRING },
                            description: "4 distinct title variations: Viral, SEO, Emotional, Short."
                        },
                        description: { 
                            type: Type.STRING,
                            description: "Compelling video description with hook and summary." 
                        },
                        contextExpansion: {
                            type: Type.STRING,
                            description: "Detailed explanation of points the script missed or skimmed over."
                        },
                        hashtags: { type: Type.ARRAY, items: { type: Type.STRING } },
                        keywords: { type: Type.ARRAY, items: { type: Type.STRING } }
                    },
                    required: ['titles', 'description', 'contextExpansion', 'hashtags', 'keywords']
                }
            }
        });
        
        const text = cleanJSON(response.text || "{}");
        return JSON.parse(text) as SEOData;
    });
};

// --- Utils: Audio ---

export const base64PCMToWavBlob = (base64PCM: string, sampleRate: number = 24000): Blob => {
    const binaryString = atob(base64PCM);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }

    const wavHeader = new ArrayBuffer(44);
    const view = new DataView(wavHeader);
    const numChannels = 1;
    const byteRate = sampleRate * numChannels * 2;
    const blockAlign = numChannels * 2;
    const dataSize = bytes.length;

    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, 16, true);
    writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);

    return new Blob([view, bytes], { type: 'audio/wav' });
};

const writeString = (view: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
};

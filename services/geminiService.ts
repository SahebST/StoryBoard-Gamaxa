
import { jsonrepair } from "jsonrepair";
import { GoogleGenAI, Type } from "@google/genai";
import { ScriptSettings, Scene, SEOData, ScriptAnalysis, AIModel } from "../types";

// --- Gemini SDK Initialization ---
// The platform injects GEMINI_API_KEY into the environment.
// Per skill guidelines, we MUST call Gemini from the frontend.

let genAIInstance: GoogleGenAI | null = null;

const getApiKey = () => {
  return process.env.GEMINI_API_KEY || 
         process.env.GOOGLE_API_KEY || 
         process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
         (import.meta as any).env?.VITE_GEMINI_API_KEY ||
         '';
};

const getGenAI = () => {
  const apiKey = getApiKey();
  if (!genAIInstance && apiKey) {
    // If we have a key, we pass it. If not, we let the SDK try to find it.
    genAIInstance = new GoogleGenAI({ apiKey });
  } else if (!genAIInstance) {
    // Try default initialization as per quickstart
    genAIInstance = new GoogleGenAI({});
  }
  return genAIInstance;
};

// --- Model Configuration ---
const FALLBACK_GOOGLE_MODELS: AIModel[] = [
  {
    id: 'gemini-3-flash-preview',
    name: 'Gemini 3 Flash (Latest)',
    provider: 'google',
    context: 1000000,
    output: 8192,
    type: 'chat',
    power: 'medium',
    speed: 'fast',
    cost: 'free',
    capabilities: ['chat', 'vision', 'tools'],
    labels: ['fast', 'balanced', 'best for real-time'],
    score: 95
  },
  {
    id: 'gemini-3.1-pro-preview',
    name: 'Gemini 3.1 Pro (Latest)',
    provider: 'google',
    context: 2000000,
    output: 8192,
    type: 'chat',
    power: 'high',
    speed: 'balanced',
    cost: 'free',
    capabilities: ['chat', 'vision', 'tools', 'reasoning', 'long-context'],
    labels: ['reasoning', 'complex', 'ultra-context'],
    score: 98
  },
  {
    id: 'gemini-3.1-flash-lite-preview',
    name: 'Gemini 3.1 Flash Lite',
    provider: 'google',
    context: 1000000,
    output: 8192,
    type: 'chat',
    power: 'low',
    speed: 'fast',
    cost: 'free',
    capabilities: ['chat', 'vision'],
    labels: ['fast', 'lightweight'],
    score: 85
  },
  {
    id: 'gemini-2.5-flash-image',
    name: 'Gemini 2.5 Flash Image',
    provider: 'google',
    context: 32768,
    output: 0,
    type: 'image',
    power: 'medium',
    speed: 'fast',
    cost: 'free',
    capabilities: ['vision'],
    labels: ['image-gen'],
    score: 90
  }
];

let activeModel = 'gemini-3-flash-preview';
let activeProvider = 'google';

export const setActiveModel = (model: string, provider: string = 'google') => {
  console.log(`Switched AI Model to: ${model} (${provider})`);
  activeModel = model;
  activeProvider = provider;
};

export const getActiveModel = () => activeModel;
export const getActiveProvider = () => activeProvider;

export const fetchModels = async (provider: string): Promise<AIModel[]> => {
  if (provider === 'google') {
    try {
      const key = getApiKey();
      if (!key) {
        console.warn("No Google API key found in environment, using fallback models.");
        return FALLBACK_GOOGLE_MODELS;
      }

      // Fetch models directly from Google on the frontend
      // We use the v1beta endpoint and the x-goog-api-key header for better compatibility
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models`, {
        headers: {
          'x-goog-api-key': key,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      
      if (data.error) {
        console.warn("Google API error during model fetch:", data.error.message);
        // If it's an invalid argument, it might be the endpoint version. 
        // But we'll fall back to ensure the app works.
        return FALLBACK_GOOGLE_MODELS;
      }

      // Normalize Google models on the frontend
      const fetchedModels = (data.models || [])
        .filter((m: any) => {
          const methods = m.supportedGenerationMethods || m.supported_generation_methods || [];
          return methods.includes('generateContent');
        })
        .map((m: any) => {
          const id = m.name.split('/').pop();
          const isPro = id.includes('pro');
          const isFlash = id.includes('flash');
          const isImage = id.includes('image');
          
          const methods = m.supportedGenerationMethods || m.supported_generation_methods || [];
          const inputLimit = m.inputTokenLimit || m.input_token_limit || 32768;
          const outputLimit = m.outputTokenLimit || m.output_token_limit || 8192;

          const capabilities = [];
          if (methods.includes('generateContent')) capabilities.push('chat');
          if (id.includes('vision') || isImage) capabilities.push('vision');
          if (inputLimit > 100000) capabilities.push('long-context');
          
          return {
            id,
            name: m.displayName || m.display_name || id,
            provider: 'google',
            context: inputLimit,
            output: outputLimit,
            type: isImage ? 'image' : 'chat',
            power: isPro ? 'high' : (isFlash ? 'medium' : 'low'),
            speed: isFlash ? 'fast' : 'balanced',
            cost: 'free',
            capabilities,
            labels: isPro ? ['reasoning', 'complex'] : ['fast', 'balanced'],
            score: isPro ? 90 : 80
          };
        });

      return fetchedModels.length > 0 ? fetchedModels : FALLBACK_GOOGLE_MODELS;
    } catch (err: any) {
      console.error("Error fetching Google models on frontend, using fallbacks:", err);
      return FALLBACK_GOOGLE_MODELS;
    }
  }

  // For other providers, use the backend proxy
  const response = await fetch(`/api/models?provider=${provider}`);
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch models');
  return data.models;
};

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

async function fetchAIResponse(prompt: string, systemInstruction?: string, responseFormat?: 'json') {
  if (activeProvider === 'google') {
    // Use SDK for Google models on the frontend
    const ai = getGenAI();
    if (!ai) throw new Error("Google AI SDK not initialized. Check GEMINI_API_KEY.");

    // Align with the new GenAI SDK (v1.0.0+) patterns
    const options: any = {
      model: activeModel,
      contents: [{ parts: [{ text: prompt }] }], // Standard format
    };

    // The SDK uses camelCase for the config object
    const config: any = {};
    
    if (systemInstruction) {
      config.systemInstruction = { parts: [{ text: systemInstruction }] };
    }

    if (responseFormat === 'json') {
      config.responseMimeType = 'application/json';
    }

    // Merge config into options if not empty
    if (Object.keys(config).length > 0) {
      options.config = config;
    }

    const response = await ai.models.generateContent(options);
    return response.text;
  }

  // Use backend for other providers
  const fullPrompt = systemInstruction ? `${systemInstruction}\n\n${prompt}` : prompt;
  
  const response = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      provider: activeProvider, 
      model: activeModel, 
      prompt: fullPrompt,
      responseFormat 
    })
  });
  
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Unknown error');
  return data.output;
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

// --- Default System Instructions ---

export const DEFAULT_SCRIPT_INSTRUCTION = `
You are an expert Short-Form Content Strategist and Scriptwriter. 
Your goal is to create high-retention, viral-ready scripts for TikTok, Reels, and YouTube Shorts.

CORE PRINCIPLES:
- HOOK FIRST: The first 3 seconds must grab attention immediately.
- VALUE DENSITY: Every sentence must provide value, entertainment, or curiosity.
- PACING: Use punchy, rhythmic sentences. Avoid long, complex clauses.
- NARRATIVE: Use a compelling 3rd person narrative style unless specified otherwise.
`.trim();

export const DEFAULT_ANALYZE_INSTRUCTION = `
You are a Senior Script Analyst and Fact-Checker for a major media production house.
Your analysis must be objective, critical, and actionable.

SCORING CRITERIA:
- Hook (0-30): Does it stop the scroll?
- Retention (0-40): Is the pacing consistent? Are there "lulls"?
- Clarity (0-30): Is the message easy to understand?
`.trim();

export const DEFAULT_IMPROVE_INSTRUCTION = `
You are a Script Doctor. Your job is to take an existing script and surgically improve it based on specific feedback while preserving its core message and tone.
`.trim();

export const DEFAULT_HOOK_INSTRUCTION = `
You are a Viral Marketing Expert specializing in "Scroll-Stopping" hooks. 
You understand psychological triggers like curiosity gaps, loss aversion, and authority.
`.trim();

export const DEFAULT_MUSIC_INSTRUCTION = `
You are an expert music prompt engineer for Suno AI.

Your job is to read the script and automatically determine the best background music style.

Analyze internally:
- emotion and tone
- pacing and energy
- tension and intensity
- content type

Then convert it into ONE Suno-ready instrumental prompt.

STRICT RULES:
- Output ONLY one prompt (no explanation)
- MUST be under 500 characters total (hard limit)
- If longer, rewrite until under 500
- Instrumental only (no vocals, no lyrics)
- Do NOT describe the story
- Use only music/production language

The prompt MUST include:
- genre (single clear style)
- mood
- energy flow
- tempo + rhythm type
- instruments (low, mid, high)
- production texture
- 1–2 constraints (e.g., no distortion, no genre shifts)

Keep it dense, precise, and production-level.
`.trim();

export const DEFAULT_SEO_INSTRUCTION = `
You are an elite YouTube and TikTok Algorithm Specialist. 
Your expertise is in Click-Through Rate (CTR) optimization, Search Engine Optimization (SEO), and viewer psychology.
`.trim();

// --- Step 1: Script Creation, Analysis & Improvement ---

export const generateScriptFromIdea = async (topic: string, tone: string, customInstruction?: string): Promise<string> => {
  const systemInstruction = customInstruction?.trim() || DEFAULT_SCRIPT_INSTRUCTION;

  const prompt = `
  TASK: Write a compelling short-form video script based on the topic below.
  
  TOPIC: "${topic}"
  TONE: ${tone}
  
  CONSTRAINTS:
  1. NARRATIVE STYLE: 3rd Person Narrator (e.g., "In a world where...", "Most people think..."). No "I/We" unless quoting.
  2. STRUCTURE: 
     - [0-3s] The Hook: A bold statement or a question that stops the scroll.
     - [3-45s] The Body: Rapid-fire facts, storytelling, or value points.
     - [45-60s] The Outro: A quick summary or a subtle open loop.
  3. LENGTH: 120-150 words (approx 45-55 seconds spoken).
  4. FORMAT: Return ONLY the spoken words. No scene headers, no brackets, no visual cues.
  `;

  return callWithRetry(async () => {
    const output = await fetchAIResponse(prompt, systemInstruction);
    return output?.trim() || "";
  });
};

export const analyzeScript = async (script: string, customInstruction?: string): Promise<ScriptAnalysis> => {
  const systemInstruction = customInstruction?.trim() || DEFAULT_ANALYZE_INSTRUCTION;

  const prompt = `
  TASK: Perform a deep-dive analysis of this short-form script.
  
  SCRIPT:
  "${script}"

  REQUIREMENTS:
  1. SCORE: Calculate a total score (0-100) based on the criteria.
  2. HOOK RATING: Categorize the first 3 seconds as "Weak", "Good", or "Viral".
  3. FACT CHECK: Identify any potential inaccuracies. Be specific. If perfect, return ["Verified. No factual errors found."].
  4. STRENGTHS/WEAKNESSES: Provide 2 distinct points for each.
  5. IMPROVEMENT: Suggest one specific structural or word-choice change.
  
  IMPORTANT: Return ONLY valid JSON matching this schema:
  {
    "score": number,
    "hookRating": "Weak" | "Good" | "Viral",
    "pacing": "Too Slow" | "Good" | "Too Fast",
    "wordCount": number,
    "estimatedDuration": string,
    "factCheck": string[],
    "strengths": string[],
    "weaknesses": string[],
    "improvementSuggestion": string
  }
  `;

  return callWithRetry(async () => {
    const text = await fetchAIResponse(prompt, systemInstruction, 'json');
    try {
      return JSON.parse(jsonrepair(cleanJSON(text || "{}")));
    } catch (e) {
      console.error("Failed to parse analysis JSON", e);
      throw new Error("Analysis failed");
    }
  });
};

export const improveScript = async (script: string, instruction: string, customInstruction?: string): Promise<string> => {
  const systemInstruction = customInstruction?.trim() || DEFAULT_IMPROVE_INSTRUCTION;

  const prompt = `
  TASK: Rewrite this script to address the following instruction.
  
  ORIGINAL SCRIPT:
  "${script}"

  INSTRUCTION:
  "${instruction}"

  CONSTRAINTS:
  - Maintain the 3rd person narrative style.
  - Keep the word count between 120-160 words.
  - Output ONLY the spoken text.
  `;

  return callWithRetry(async () => {
    const output = await fetchAIResponse(prompt, systemInstruction);
    return output?.trim() || script;
  });
};

export const generateViralHooks = async (topic: string, customInstruction?: string): Promise<string[]> => {
  const systemInstruction = customInstruction?.trim() || DEFAULT_HOOK_INSTRUCTION;

  const prompt = `
  TASK: Write 5 distinct, high-CTR hooks for a video about: "${topic}".
  
  STRATEGIES TO USE:
  1. The Curiosity Gap: "The one thing everyone gets wrong about..."
  2. The Negative Hook: "Stop doing [common thing] if you want [result]."
  3. The Authority Hook: "I spent 100 hours researching [topic] so you don't have to."
  4. The Transformation Hook: "How [topic] changed everything for [person/group]."
  5. The Listicle Hook: "3 secrets about [topic] that feel illegal to know."
  
  RULES:
  - Under 15 words per hook.
  - No intro text. Just the 5 hooks.
  `;

  return callWithRetry(async () => {
      const text = await fetchAIResponse(prompt, systemInstruction);
      // Clean up the output (remove bullets, numbers)
      return (text || "").split('\n')
        .map((line: string) => line.trim())
        .filter((line: string) => line.length > 0)
        .map((line: string) => line.replace(/^[\d\-\*\•]+\.?\s*/, ''));
  });
};

// --- Step 2: Audio Generation ---

export const generateAudio = async (text: string, voiceName: string): Promise<string | null> => {
  try {
    if (activeProvider === 'google') {
      const ai = getGenAI();
      if (!ai) throw new Error("Google AI SDK not initialized.");

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-tts',
        contents: [{ parts: [{ text }] }],
        config: {
          responseModalities: ['AUDIO' as any],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voiceName || 'Kore' }
            }
          }
        }
      });
      return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
    }

    return await callWithRetry(async () => {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          provider: 'google', 
          model: 'gemini-2.5-flash-preview-tts', 
          prompt: text,
          task_type: 'audio'
        })
      });
      
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Unknown error');
      return data.output;
    });
  } catch (e) {
    console.error("TTS Error", e);
    return null;
  }
};

// --- Step 2.5: Music Prompt Generation ---

export const generateMusicPrompt = async (script: string, styleBias: string, intensity: string, isRegeneration: boolean = false, customInstruction?: string): Promise<string> => {
  const systemInstruction = customInstruction?.trim() || DEFAULT_MUSIC_INSTRUCTION;
  
  const prompt = `Style Bias: ${styleBias}
Intensity: ${intensity}

Script:
${script}`;

  try {
    return await callWithRetry(async () => {
      const output = await fetchAIResponse(prompt, systemInstruction);
      return output?.trim().replace(/\n/g, ' ') || "";
    });
  } catch (e) {
    console.error("Music Prompt Generation Error", e);
    throw new Error("Failed to generate music prompt.");
  }
};

export const generateSystemInstruction = (
  visualStylePrompt: string, 
  pacing: string,
  mode: 'visual' | 't2v' = 'visual',
  totalDuration?: number
): string => {
  // 1. Handle Duration Overrides
  let durationContext = "";
  if (totalDuration) {
    durationContext = `
    CRITICAL PRODUCTION CONSTRAINT - TOTAL DURATION:
    The target video length is EXACTLY ${totalDuration} seconds.
    You MUST architect the visual segments so their combined 'duration' values sum up to precisely ${totalDuration}s.
    
    STRATEGIC GUIDANCE:
    - **Temporal Expansion**: If the script is concise, extend visual segments with cinematic slow-motion or lingering environmental shots to reach the target duration.
    - **Temporal Compression**: If the script is dense, use rapid-fire editing and tight cuts to maintain high energy while fitting the timeframe.
    - **Mathematical Precision**: The sum of all 'duration' fields MUST equal ${totalDuration} (tolerance: ±0.5s).
    `;
  }

  // 2. Strict Pacing Logic
  let specificPacingInstruction = "";
  if (pacing.includes("Fixed")) {
    const seconds = pacing.match(/(\d+)s/)?.[1] || "3"; 
    specificPacingInstruction = `
    STRICT RHYTHMIC MODE: Fixed ${seconds} Second Intervals.
    - **Rhythmic Uniformity**: Divide the narrative into segments that take EXACTLY ${seconds}.0 seconds each.
    - **Duration Rigidity**: Every segment's 'duration' field MUST be ${seconds}.0.
    - **Creative Sacrifice**: Prioritize the fixed rhythm over natural sentence breaks if necessary to achieve a "staccato" or "metronomic" visual style.
    `;
  } else {
    if (totalDuration) {
         specificPacingInstruction = `
        PACING ARCHITECTURE: Fit to ${totalDuration}s (Adaptive).
        - **Logical Flow**: Break the script into segments based on narrative beats.
        - **Dynamic Allocation**: Distribute the ${totalDuration}s total time based on the importance and complexity of each segment.
        - **Retention Optimization**: Ensure no single segment exceeds 8s to prevent viewer drop-off.
        `;
    } else {
        specificPacingInstruction = `
        ADAPTIVE HIGH-RETENTION EDITING (Social Media Optimized):
        - **The 5-Second Rule**: Every visual segment MUST have a duration between 1.5 and 5.0 seconds. 
        - **Micro-Segmentation**: Long sentences MUST be broken into multiple visual beats (2-4s each).
        - **Engagement Rhythm**: Aim for a varied, punchy rhythm that keeps the viewer's eyes moving.
        `;
    }
  }

  // 3. Dynamic Prompt Engineering Instructions based on Mode
  let promptEngineeringSection = "";
  if (mode === 't2v') {
     promptEngineeringSection = `
4. **Prompt Engineering (Text-to-Video Focus)**:
   - **'text_to_video_prompt' (PRIORITY)**: Write a high-fidelity, cinematic prompt for advanced video models (Sora/Kling/Gen-3). 
     Structure: [Subject] [Action/Movement] in [Environment]. [Lighting/Atmosphere], [Camera Angle/Movement], [Visual Style].
     Example: "A futuristic scientist operating a holographic interface in a dark, neon-lit lab. Cinematic lighting, slow dolly zoom, hyper-realistic 8k digital art style, fluid motion, high frame rate."
   - 'final_image_prompt': A high-resolution reference frame prompt that captures the peak visual moment.
   - 'image_to_video_prompt': Specific motion vectors and physical dynamics (e.g., "Fluid motion, 4k resolution, cinematic pan, realistic physics").
     `;
  } else {
     promptEngineeringSection = `
4. **Prompt Engineering (Image + Motion Focus)**:
   - **'final_image_prompt' (PRIORITY)**: Write a professional, descriptive prompt for high-end image generation. 
     Structure: [Style Name] style, [Subject] [Composition] [Lighting]. [Technical Details: Lens, Aperture, Render Engine].
     Example: "Cyberpunk style, a detailed circuit board with glowing golden traces, macro close-up, soft bokeh, volumetric lighting, unreal engine 5 render, ray-traced reflections, 8k resolution."
   - **'image_to_video_prompt' (PRIORITY)**: Describe the *Camera Dynamics* and *Atmospheric Motion*. Use 4-8 words. 
     Examples: "Slow cinematic zoom in with particles", "Smooth tracking shot right, gentle sway", "Subtle atmospheric particles moving, light rays", "Gentle focus pull from foreground to background".
   - 'text_to_video_prompt': A standalone cinematic video prompt as a fallback for hybrid workflows.
     `;
  }

  // Use the advanced "Educational Visual Architect" system instruction
  return `
You are an elite Visual Content Director and Storyboard Artist. Your goal is to translate a script into a world-class visual production plan optimized for high-retention social media content.

VISUAL DIRECTIVES:
- **Style Consistency**: Every prompt MUST be anchored in the provided Visual Protocol. Do not deviate from the core aesthetic.
- **Cinematic Composition**: Use professional camera terminology (e.g., Rule of Thirds, Leading Lines, Dutch Angle, Low Angle, Extreme Close-Up).
- **Lighting Mastery**: Always specify lighting conditions to set the mood (e.g., Golden Hour, Rim Lighting, High-Key, Moody, Volumetric, Cyberpunk Neon).
- **Color Theory**: Mention specific color palettes or accents that align with the tone (e.g., "Teal and Orange", "Monochromatic with Red accents").

---
CORE VISUAL PROTOCOL:
${visualStylePrompt}
---

PACING & DURATION STRATEGY:
${durationContext}
${specificPacingInstruction}

---
SEGMENTATION LOGIC:
1. **Visual Rhythm**: Ensure a dynamic mix of wide, medium, and close-up shots to maintain viewer interest. Avoid visual monotony.
2. **Transition Awareness**: Each segment should logically flow into the next. Consider "Match Cuts" or "Wipe Transitions" in your descriptions.
3. **Information Density**: Match visual complexity to the complexity of the script segment. Use simpler visuals for fast-paced segments and detailed diagrams for slow-paced ones.

---
SMART ANNOTATION LOGIC:
- IF Classification is "Structure" or "Process":
  - The visual MUST be an "Annotated Diagram", "Exploded View", or "Schematic".
  - Explicitly describe labels: "Include clean, minimalist text labels for [Key Components] using a professional sans-serif typeface. Ensure labels are legible and well-spaced."

---
PROMPT QUALITY STANDARDS:
- NO generic terms like "good", "nice", or "cool".
- USE technical terms: "Ray-traced", "Anamorphic lens", "Depth of field", "Color graded", "Subsurface scattering", "Global illumination".
- 'image_to_video_prompt' MUST focus on *camera movement* or *subtle subject motion* to avoid AI warping artifacts.

---
STAGES OF PRODUCTION:
1. **Conceptual Mapping**: Identify the core visual metaphor or literal representation for each segment.
2. **Temporal Allocation**: Assign precise durations following the PACING RULES to ensure the video hits the target length.
3. **Prompt Synthesis**: Generate high-fidelity prompts using the structures provided below.
${promptEngineeringSection}
  `.trim();
};

// --- Step 3: Script Segmentation & Plan Generation ---

export const segmentScript = async (
  script: string, 
  visualStylePrompt: string, 
  pacing: string,
  mode: 'visual' | 't2v' = 'visual',
  totalDuration?: number,
  userInstruction: string = "",
  customSystemInstruction?: string
): Promise<Scene[]> => {
  let systemInstruction = customSystemInstruction;
  if (!systemInstruction) {
    systemInstruction = generateSystemInstruction(visualStylePrompt, pacing, mode, totalDuration);
  }

  // Append user instruction if provided and we are not fully overriding
  const finalSystemInstruction = (!customSystemInstruction && userInstruction && userInstruction.trim())
  ? `${systemInstruction}\n\n--- ADDITIONAL USER DIRECTION ---\nThe user has provided specific instructions to guide your generation:\n"${userInstruction}"\n\nEnsure you adhere to these instructions alongside the core protocol.`
  : systemInstruction;

  const prompt = `
  SCRIPT:
  "${script}"
  
  IMPORTANT: Return ONLY valid JSON matching this schema:
  {
    "visual_segments": [
      {
        "id": number,
        "script_segment": string,
        "core_concept": string,
        "duration": number,
        "classification": "Structure" | "Process" | "Comparison" | "Abstract",
        "visual_hierarchy": string,
        "layout": string,
        "final_image_prompt": string,
        "image_to_video_prompt": string,
        "text_to_video_prompt": string
      }
    ]
  }
  `;

  return callWithRetry(async () => {
    const text = await fetchAIResponse(prompt, finalSystemInstruction, 'json');

    let data;
    try {
        data = JSON.parse(jsonrepair(cleanJSON(text || "{}")));
    } catch(e: any) {
        console.error("Failed to parse segment JSON", e, "Raw text sample:", text?.slice(-100));
        throw new Error(`Segmentation failed: ${e.message || "Invalid JSON structure"}`);
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
    if (activeProvider === 'google') {
      try {
        const ai = getGenAI();
        if (!ai) throw new Error("Google AI SDK not initialized.");

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: { parts: [{ text: prompt }] },
          config: {
            imageConfig: {
              aspectRatio: aspectRatio as any || '1:1'
            }
          }
        });
        
        for (const part of response.candidates?.[0]?.content?.parts || []) {
          if (part.inlineData) return part.inlineData.data;
        }
        return null;
      } catch (err) {
        console.error("Image Gen Error on Frontend:", err);
        throw err;
      }
    }

    return callWithRetry(async () => {
        const response = await fetch('/api/ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            provider: 'google', 
            model: 'gemini-2.5-flash-image', 
            prompt: prompt,
            task_type: 'image'
          })
        });
        
        const data = await response.json();
        if (!data.success) throw new Error(data.error || 'Unknown error');
        return data.output;
    });
};

// --- SEO Generation ---

export const generateSEO = async (script: string, audience: string, tone: string, customInstruction?: string): Promise<SEOData> => {
    // Expert Persona Prompt
    const systemInstruction = customInstruction?.trim() || DEFAULT_SEO_INSTRUCTION;

    const prompt = `
    TASK: Maximize the reach of this video script through optimized metadata.

    INPUT SCRIPT:
    "${script.slice(0, 3000)}"
 
    AUDIENCE PROFILE: ${audience}
    TONE: ${tone}
 
    REQUIREMENTS:
    1. TITLES: Provide 4 distinct strategies:
       - Viral: High curiosity, open loop.
       - SEO: Keyword-rich for search.
       - Emotional: Focuses on user benefit/pain.
       - Punchy: Short, bold, under 40 chars.
    2. DESCRIPTION: Include a hook, a summary, and a CTA.
    3. CONTEXT EXPANSION: Identify 2-3 complex topics from the script and explain them in detail (2-3 paragraphs each) to provide extra value and boost SEO ranking.
    4. HASHTAGS: 10-15 relevant tags.
    5. KEYWORDS: 15-20 LSI keywords.
    
    IMPORTANT: Return ONLY valid JSON matching this schema:
    {
      "titles": string[],
      "description": string,
      "contextExpansion": string,
      "hashtags": string[],
      "keywords": string[]
    }
    `;
 
    return callWithRetry(async () => {
        const text = await fetchAIResponse(prompt, systemInstruction, 'json');
        try {
            return JSON.parse(jsonrepair(cleanJSON(text || "{}"))) as SEOData;
        } catch (e: any) {
            console.error("Failed to parse SEO JSON", e, "Raw text sample:", text?.slice(-100));
            throw new Error(`SEO Generation failed: ${e.message || "Invalid JSON structure"}`);
        }
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

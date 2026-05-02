
import { jsonrepair } from "jsonrepair";
import { GoogleGenAI, Type } from "@google/genai";
import { ScriptSettings, Scene, SEOData, ScriptAnalysis, AIModel } from "../types";
import { appLogger } from './loggerService';

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
    appLogger.warn("System", "No Gemini API key found. Default GoogleGenAI initialization attempted.");
    genAIInstance = new GoogleGenAI({});
  }
  return genAIInstance;
};

// --- Model Configuration ---
const FALLBACK_GOOGLE_MODELS: AIModel[] = [
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    provider: 'google',
    context: 1000000,
    output: 8192,
    type: 'chat',
    power: 'medium',
    speed: 'fast',
    cost: 'free',
    capabilities: ['chat', 'vision', 'tools'],
    labels: ['FREE', 'free-tier', 'fast', 'balanced', 'best for real-time'],
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
    labels: ['FREE', 'free-tier', 'reasoning', 'complex', 'ultra-context'],
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
    labels: ['FREE', 'free-tier', 'fast', 'lightweight'],
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
    labels: ['FREE', 'free-tier', 'image-gen'],
    score: 90
  }
];

let activeModel = 'gemini-2.5-flash';
let activeProvider = 'google';

export const setActiveModel = (model: string, provider: string = 'google') => {
  console.log(`Switched AI Model to: ${model} (${provider})`);
  activeModel = model;
  activeProvider = provider;
};

export const getActiveModel = () => activeModel;
export const getActiveProvider = () => activeProvider;

export const fetchModels = async (provider: string): Promise<AIModel[]> => {
  appLogger.api('Discovery Engine', `Fetching models for provider: ${provider}`);
  if (provider === 'google') {
    try {
      const key = getApiKey();
      if (!key) {
        appLogger.warn('Discovery Engine', 'No Google API key found in environment, using fallback models.');
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
        appLogger.error('Discovery Engine', `Error from Google API: ${data.error.message}`);
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
          
          const labels = isPro ? ['reasoning', 'complex'] : ['fast', 'balanced'];
          labels.push('FREE');
          labels.push('free-tier');
          
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
            labels,
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
  try {
    const response = await fetch(`/api/models?provider=${provider}`);
    const data = await response.json();
    if (!data.success) {
      appLogger.error('Discovery Engine', `Proxy error`, data);
      throw new Error(data.error || 'Failed to fetch models');
    }
    appLogger.info('Discovery Engine', `Fetched ${data.models?.length || 0} models from ${provider}`);
    return data.models;
  } catch (err: any) {
    appLogger.error('Discovery Engine', `Error fetching ${provider} models`, { error: err.message });
    throw err;
  }
};

// --- Utils ---

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function callWithRetry<T>(fn: () => Promise<T>, retries = 3, baseDelay = 3000): Promise<T> {
  const startTime = Date.now();
  for (let i = 0; i < retries; i++) {
    try {
      const result = await fn();
      const latency = Date.now() - startTime;
      appLogger.api('API Engine', `Call succeeded`, { attempts: i + 1, latencyMs: latency });
      return result;
    } catch (e: any) {
      // Check for 429 Rate Limit, 503 Service Unavailable, or Resource Exhausted
      const msg = e.message || e.toString() || '';
      appLogger.error('API Engine', `Call failed (Attempt ${i + 1}/${retries})`, { error: msg });
      
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
        appLogger.warn('API Engine', `API Busy (429/503). Retrying in ${delayTime}ms...`, msg);
        console.warn(`API Busy (429/503). Retrying in ${delayTime}ms...`, msg);
        await wait(delayTime);
        continue;
      }
      throw e;
    }
  }
  throw new Error("Max retries exceeded");
}

export async function fetchAIResponse(prompt: string, systemInstruction?: string, responseFormat?: 'json') {
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
    const config: any = {
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
      ]
    };
    
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

    appLogger.setActivity('outgoing');
    appLogger.api('GenAI Engine', `Generating content with ${activeModel}`, { options });
    
    try {
      const response = await ai.models.generateContent(options);
      appLogger.setActivity('incoming');
      appLogger.info('GenAI Engine', `Received response`, { 
        fullResponse: response,
        textPreview: response.text?.slice(0, 50) + "..." 
      });
      
      appLogger.setActivity('idle');
      // Safely extract text
      let text = '';
      if (response.text) {
        text = response.text;
      } else if (response.candidates?.[0]?.content?.parts?.[0]?.text) {
        text = response.candidates[0].content.parts[0].text;
      }
      
      if (!text) {
        appLogger.warn('GenAI Engine', 'Empty text in AI response', { response });
        console.warn("Empty text in AI response:", response);
      }
      
      return text;
    } catch (error: any) {
      appLogger.setActivity('idle');
      appLogger.error('GenAI Engine', 'Generation Failed', { error: error.message, stack: error.stack });
      throw error;
    }
  }

  // Use backend for other providers
  const fullPrompt = systemInstruction ? `${systemInstruction}\n\n${prompt}` : prompt;
  
  appLogger.setActivity('outgoing');
  appLogger.api('GenAI Engine', `Proxying request to ${activeProvider}/${activeModel}`, { prompt: fullPrompt });

  try {
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
    
    appLogger.setActivity('incoming');
    const data = await response.json();
    appLogger.setActivity('idle');

    if (!data.success) {
      appLogger.error('API Engine', `Proxy error`, data);
      throw new Error(data.error || 'Unknown error');
    }

    appLogger.info('GenAI Engine', `Proxy response received`, { output: data.output });
    return data.output;
  } catch (error: any) {
    appLogger.setActivity('idle');
    appLogger.error('GenAI Engine', 'Proxy Request Failed', { error: error.message });
    throw error;
  }
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

export const DEFAULT_ANALYZE_VISUALS_INSTRUCTION = `You are an elite video director and aesthetic consultant. Your job is to analyze a script and architect high-end visual styles.
  
  CRITICAL RULE FOR NAMES:
  - The "name" field MUST be extremely short (1-3 words max). 
  - This is a UI label for a button. 
  - DO NOT include prefixes. 
  - Example: "Neon Cyber", "Vibrant Anime", "Clean Editorial".
  
  CRITICAL RULE FOR DETAILED PROMPTS:
  - The "detailed_prompt" MUST be 30-50 words. 
  - It must be technical and descriptive (lighting, texture, composition).
  - DO NOT include prefixes like "MANDATORY VISUALS:". 
  - Do NOT repeat the style name in the prompt.`;

export const analyzeScriptForVisuals = async (script: string, availablePresets: string[], customInstruction?: string): Promise<{
  styles_generated: { name: string; detailed_prompt: string }[];
  best_presets: string[];
  estimated_duration_sec: number;
}> => {
  const systemInstruction = customInstruction?.trim() || DEFAULT_ANALYZE_VISUALS_INSTRUCTION;

  const prompt = `
  TASK: Analyze the script to generate unique aesthetic visual styles, match with presets, and estimate duration.

  SCRIPT:
  "${script}"

  AVAILABLE PRESETS:
  ${JSON.stringify(availablePresets)}

  REQUIREMENTS:
  1. styles_generated: Create 3 distinct new visual styles. 
     - "name": Concise UI label (1-2 words).
     - "detailed_prompt": Exhaustive technical description (30-50 words). Focus on soft-focus macro shots, lighting, and textures.
  2. best_presets: Select the best 2 preset names from the list.
  3. estimated_duration_sec: Natural speech pace estimate in seconds.

  IMPORTANT: Return ONLY valid JSON:
  {
    "styles_generated": [
      { "name": "Short Name", "detailed_prompt": "Technical description..." },
      { "name": "Short Name", "detailed_prompt": "Technical description..." },
      { "name": "Short Name", "detailed_prompt": "Technical description..." }
    ],
    "best_presets": ["string", "string"],
    "estimated_duration_sec": number
  }
  `;

  return callWithRetry(async () => {
    const text = await fetchAIResponse(prompt, systemInstruction, 'json');
    try {
      const result = JSON.parse(jsonrepair(cleanJSON(text || "{}")));
      // Safety check to ensure name is not too long
      if (result.styles_generated) {
        result.styles_generated = result.styles_generated.map((s: any) => ({
          ...s,
          name: typeof s.name === 'string' ? s.name.split(' ').slice(0, 3).join(' ') : 'Custom Style'
        }));
      }
      return result;
    } catch (e) {
      console.error("Failed to parse visual analysis JSON", e);
      throw new Error("Visual analysis failed");
    }
  });
};

export const improveScript = async (script: string, instruction: string, customInstruction?: string, globalDirection?: string): Promise<string> => {
  let systemInstruction = customInstruction?.trim() || DEFAULT_IMPROVE_INSTRUCTION;
  
  if (globalDirection?.trim()) {
    systemInstruction += `\n\n--- GLOBAL DIRECTION ---\n${globalDirection}`;
  }

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

// --- Step 2: Audio Generation ---

export interface Voice {
  id: string;
  name: string;
  gender: string;
  traits: string;
  avatarClass?: string;
  provider?: string;
}

export const fetchVoices = async (provider: string, model: string): Promise<Voice[]> => {
  // Static set for Google Gemini TTS as listing via API is restricted in standard JS SDK
  if (provider === 'google') {
    return [
      { name: "Puck", gender: "Male", traits: "Deep & Resonant", id: "Puck", avatarClass: "bg-gradient-to-br from-indigo-500 via-purple-500 to-indigo-800", provider: "google" },
      { name: "Charon", gender: "Male", traits: "Deep & Serious", id: "Charon", avatarClass: "bg-gradient-to-br from-gray-700 via-gray-800 to-black", provider: "google" },
      { name: "Fenrir", gender: "Male", traits: "Aggressive & Intense", id: "Fenrir", avatarClass: "bg-gradient-to-br from-red-500 via-orange-600 to-red-800", provider: "google" },
      { name: "Kore", gender: "Female", traits: "Soothing & Calm", id: "Kore", avatarClass: "bg-gradient-to-br from-pink-300 via-rose-400 to-pink-500", provider: "google" },
      { name: "Aoede", gender: "Female", traits: "Higher Pitch & Clear", id: "Aoede", avatarClass: "bg-gradient-to-br from-teal-300 via-emerald-400 to-teal-600", provider: "google" }
    ];
  }

  // Fetch from backend for other providers
  try {
    const response = await fetch(`/api/voices?provider=${provider}&model=${model}`);
    const data = await response.json();
    if (data.success) {
      return data.voices;
    }
    return [];
  } catch (e) {
    console.error("Failed to fetch voices", e);
    return [];
  }
};

export const generateAudio = async (text: string, voiceName: string, provider: string = 'google', model: string = 'gemini-2.5-flash-preview-tts'): Promise<string | null> => {
  try {
    if (provider === 'google') {
      const ai = getGenAI();
      if (!ai) throw new Error("Google AI SDK not initialized.");

      appLogger.setActivity('outgoing');
      appLogger.api('TTS Engine', `Generating audio with Google ${model} (Voice: ${voiceName})`);
      return await callWithRetry(async () => {
        const response = await ai.models.generateContent({
          model: model, // Use passed model
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
        
        appLogger.setActivity('incoming');
        const base64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
        if (base64) appLogger.info('TTS Engine', `Audio generated successfully`, { bytesSize: base64.length });
        appLogger.setActivity('idle');
        return base64;
      });
    }

    appLogger.setActivity('outgoing');
    appLogger.api('TTS Engine', `Generating audio via Proxy with ${provider} ${model}`);
    return await callWithRetry(async () => {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          provider: provider, 
          model: model, 
          prompt: text,
          voice: voiceName,
          task_type: 'audio'
        })
      });
      
      appLogger.setActivity('incoming');
      const data = await response.json();
      appLogger.setActivity('idle');

      if (!data.success) {
        appLogger.error('TTS Engine', `Proxy error`, data);
        throw new Error(data.error || 'Unknown error');
      }
      appLogger.info('TTS Engine', `Proxy audio generated successfully`);
      return data.output;
    });
  } catch (e: any) {
    appLogger.setActivity('idle');
    appLogger.error('TTS Engine', `TTS Error`, { error: e.message });
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

export const DEFAULT_PROMPT_ENGINEERING_RULES = `
4. **Prompt Engineering (Image + Motion Focus)**:
   - **'final_image_prompt' (PRIORITY)**: Write a professional, descriptive prompt for high-end image generation. 
     Structure: [Style Name] style, [Subject] [Composition] [Lighting]. [Technical Details: Lens, Aperture, Render Engine].
     Example: "Cyberpunk style, a detailed circuit board with glowing golden traces, macro close-up, soft bokeh, volumetric lighting, unreal engine 5 render, ray-traced reflections, 8k resolution."
   - **'image_to_video_prompt' (PRIORITY)**: Describe the *Camera Dynamics* and *Atmospheric Motion*. Use 4-8 words. 
     Examples: "Slow cinematic zoom in with particles", "Smooth tracking shot right, gentle sway", "Subtle atmospheric particles moving, light rays", "Gentle focus pull from foreground to background".
   - 'text_to_video_prompt': A standalone cinematic video prompt as a fallback for hybrid workflows.
`.trim();

export const generateSystemInstruction = (
  visualStylePrompt: string, 
  pacing: string,
  promptEngineeringRules?: string,
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

  // 3. Dynamic Prompt Engineering Instructions
  const promptEngineeringSection = promptEngineeringRules || DEFAULT_PROMPT_ENGINEERING_RULES;

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
  promptEngineeringRules?: string,
  totalDuration?: number,
  userInstruction: string = "",
  customSystemInstruction?: string,
  stageDirection: string = "",
  isHighPriority: boolean = false,
  isOverride: boolean = false
): Promise<Scene[]> => {
  let systemInstruction = customSystemInstruction;
  if (!systemInstruction) {
    systemInstruction = generateSystemInstruction(visualStylePrompt, pacing, promptEngineeringRules, totalDuration);
  }

  // Append user instruction if provided and we are not fully overriding
  let finalSystemInstruction = systemInstruction;
  if (!customSystemInstruction) {
    const hasInstructions = userInstruction?.trim() || stageDirection?.trim();
    
    // If override is enabled AND we have instructions, we use only the instructions
    if (isOverride && hasInstructions) {
      finalSystemInstruction = `TASK: You are a visual storyboard artist and director. Generate a detailed visual plan for the following script based EXCLUSIVELY on these custom instructions.\n\n`;
      if (userInstruction?.trim()) {
        finalSystemInstruction += `--- GLOBAL DIRECTION ---\n${userInstruction}\n\n`;
      }
      if (stageDirection?.trim()) {
        finalSystemInstruction += `--- STAGE-SPECIFIC DIRECTION ---\n${stageDirection}\n\n`;
      }
      finalSystemInstruction += `\nPASTING THE SCRIPT BELOW. ADHERE TO THE ABOVE INSTRUCTIONS STRICTLY.`;
    } else {
      // Normal or High Priority logic
      if (userInstruction?.trim()) {
        const globalBlock = `\n\n--- GLOBAL DIRECTION ${isHighPriority ? '(HIGH PRIORITY)' : ''} ---\n${userInstruction}`;
        if (isHighPriority) {
          finalSystemInstruction = globalBlock + "\n\n" + finalSystemInstruction;
        } else {
          finalSystemInstruction += globalBlock;
        }
      }
      if (stageDirection?.trim()) {
        const stageBlock = `\n\n--- STAGE-SPECIFIC DIRECTION ${isHighPriority ? '(HIGH PRIORITY)' : '(OVERRIDES GLOBAL)'} ---\n${stageDirection}`;
        if (isHighPriority) {
          finalSystemInstruction = stageBlock + "\n\n" + finalSystemInstruction;
        } else {
          finalSystemInstruction += stageBlock;
        }
      }
    }
  }

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

        appLogger.setActivity('outgoing');
        appLogger.api('Image Engine', `Generating image with Google Gemini (AR: ${aspectRatio})`, { prompt });
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: { parts: [{ text: prompt }] },
          config: {
            imageConfig: {
              aspectRatio: aspectRatio as any || '1:1'
            }
          }
        });
        
        appLogger.setActivity('incoming');
        for (const part of response.candidates?.[0]?.content?.parts || []) {
          if (part.inlineData) {
            appLogger.info('Image Engine', `Image generated successfully`, { bytesSize: part.inlineData.data.length });
            appLogger.setActivity('idle');
            return part.inlineData.data;
          }
        }
        appLogger.setActivity('idle');
        appLogger.warn('Image Engine', `Image generation succeeded but returned no inlineData`);
        return null;
      } catch (err: any) {
        appLogger.setActivity('idle');
        appLogger.error('Image Engine', `Frontend Generation Error`, { error: err.message });
        console.error("Image Gen Error on Frontend:", err);
        throw err;
      }
    }

    appLogger.setActivity('outgoing');
    appLogger.api('Image Engine', `Generating image via Proxy with Google Gemini`, { prompt });
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
        
        appLogger.setActivity('incoming');
        const data = await response.json();
        appLogger.setActivity('idle');

        if (!data.success) {
          appLogger.error('Image Engine', `Proxy error`, data);
          throw new Error(data.error || 'Unknown error');
        }
        appLogger.info('Image Engine', `Proxy image generated successfully`);
        return data.output;
    });
};

// --- SEO Generation ---

export const generateSEO = async (script: string, audience: string, tone: string, customInstruction?: string, globalDirection?: string): Promise<SEOData> => {
    // Expert Persona Prompt
    let systemInstruction = customInstruction?.trim() || DEFAULT_SEO_INSTRUCTION;

    if (globalDirection?.trim()) {
      systemInstruction += `\n\n--- GLOBAL DIRECTION ---\n${globalDirection}`;
    }

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

// --- Chat Functionality ---

export type ChatModel = 'gemini-3.1-pro-preview' | 'gemini-3-flash-preview' | 'gemini-3.1-flash-lite-preview';

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

/**
 * Generates a concise, AI-readable JSON representation of the app's current state.
 * Optimized for LLM context windows by stripping binary data and unnecessary UI state.
 */
export const getAppStateContext = (state: any) => {
  if (!state) return '';
  
  const optimizedState = {
    meta: {
      currentStep: state.currentStep,
      sessionTitle: state.sessionTitle,
      topic: state.topic,
    },
    settings: {
      durationMode: state.durationMode,
      customDuration: state.customDuration,
      aiDirection: state.aiDirection,
      music: {
        style: state.musicStyle,
        intensity: state.musicIntensity,
        prompt: state.musicPrompt
      }
    },
    content: {
      script: state.scriptText,
      analysis: state.scriptAnalysis ? {
        score: state.scriptAnalysis.score,
        pacing: state.scriptAnalysis.pacing,
        estimatedDuration: state.scriptAnalysis.estimatedDuration,
        strengths: state.scriptAnalysis.strengths,
        weaknesses: state.scriptAnalysis.weaknesses
      } : null,
      scenes: state.scenes?.map((s: any) => ({
        id: s.id,
        text: s.text,
        duration: s.duration,
        visualIntent: s.visualIntent,
        imagePrompt: s.imagePrompt,
        classification: s.classification,
        layout: s.layout
      })),
      seo: state.seoData
    }
  };

  return JSON.stringify(optimizedState, null, 2);
};

export const sendMessageToChat = async (
  messages: ChatMessage[],
  systemInstruction: string = "You are a helpful creative assistant in the Gemini Creator Studio app. You help users with scriptwriting, aesthetic choices, and general creative direction.",
  model: string = activeModel,
  provider: string = activeProvider,
  appContext?: string
) => {
  // Integrate app context into system instruction if available
  let finalSystemInstruction = systemInstruction;
  if (appContext) {
    finalSystemInstruction += `\n\n--- CURRENT APPLICATION DATA (JSON) ---\n${appContext}\n\nUser is currently editing this data. Use this as context for your suggestions.`;
  }

  if (provider === 'google') {
    const ai = getGenAI();
    
    // Format messages for the SDK
    const contents = messages.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));

    const response = await ai.models.generateContent({
      model: model,
      contents: contents,
      config: {
        systemInstruction: finalSystemInstruction,
      }
    });

    return response.text;
  } else {
    // Call multi-provider backend
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider,
        model,
        messages,
        system_instruction: finalSystemInstruction
      })
    });
    
    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'Failed to generate response');
    return data.output;
  }
};

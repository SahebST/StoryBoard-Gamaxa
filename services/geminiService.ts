
import { GoogleGenAI, Modality, Type, Schema } from "@google/genai";
import { jsonrepair } from "jsonrepair";
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
  const systemInstruction = `
  You are an expert Short-Form Content Strategist and Scriptwriter. 
  Your goal is to create high-retention, viral-ready scripts for TikTok, Reels, and YouTube Shorts.
  
  CORE PRINCIPLES:
  - HOOK FIRST: The first 3 seconds must grab attention immediately.
  - VALUE DENSITY: Every sentence must provide value, entertainment, or curiosity.
  - PACING: Use punchy, rhythmic sentences. Avoid long, complex clauses.
  - NARRATIVE: Use a compelling 3rd person narrative style unless specified otherwise.
  `;

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
    const response = await ai.models.generateContent({
      model: activeModel,
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7, // Balanced creativity and focus
      }
    });
    return response.text?.trim() || "";
  });
};

export const analyzeScript = async (script: string): Promise<ScriptAnalysis> => {
  const ai = getAI();
  const systemInstruction = `
  You are a Senior Script Analyst and Fact-Checker for a major media production house.
  Your analysis must be objective, critical, and actionable.
  
  SCORING CRITERIA:
  - Hook (0-30): Does it stop the scroll?
  - Retention (0-40): Is the pacing consistent? Are there "lulls"?
  - Clarity (0-30): Is the message easy to understand?
  `;

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
  `;

  return callWithRetry(async () => {
    const response = await ai.models.generateContent({
      model: activeModel,
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        maxOutputTokens: 8192,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER },
            hookRating: { type: Type.STRING, enum: ["Weak", "Good", "Viral"] },
            pacing: { type: Type.STRING, enum: ["Too Slow", "Good", "Too Fast"] },
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
      return JSON.parse(jsonrepair(text));
    } catch (e) {
      console.error("Failed to parse analysis JSON", e);
      throw new Error("Analysis failed");
    }
  });
};

export const improveScript = async (script: string, instruction: string): Promise<string> => {
  const ai = getAI();
  const systemInstruction = `
  You are a Script Doctor. Your job is to take an existing script and surgically improve it based on specific feedback while preserving its core message and tone.
  `;

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
    const response = await ai.models.generateContent({
      model: activeModel,
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.6,
      }
    });
    return response.text?.trim() || script;
  });
};

export const generateViralHooks = async (topic: string): Promise<string[]> => {
  const ai = getAI();
  const systemInstruction = `
  You are a Viral Marketing Expert specializing in "Scroll-Stopping" hooks. 
  You understand psychological triggers like curiosity gaps, loss aversion, and authority.
  `;

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
      const response = await ai.models.generateContent({
        model: activeModel,
        contents: prompt,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.8,
        }
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
  const systemInstruction = `
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
        maxOutputTokens: 16384,
        responseMimeType: 'application/json',
        responseSchema: schema,
      }
    });

    const text = cleanJSON(response.text || "{}");
    let data;
    try {
        data = JSON.parse(jsonrepair(text));
    } catch(e: any) {
        console.error("Failed to parse segment JSON", e, "Raw text sample:", text.slice(-100));
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
    const systemInstruction = `
    You are an elite YouTube and TikTok Algorithm Specialist. 
    Your expertise is in Click-Through Rate (CTR) optimization, Search Engine Optimization (SEO), and viewer psychology.
    `;

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
    `;
 
    return callWithRetry(async () => {
        const response = await ai.models.generateContent({
            model: activeModel,
            contents: prompt,
            config: {
                systemInstruction: systemInstruction,
                maxOutputTokens: 8192,
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
        try {
            return JSON.parse(jsonrepair(text)) as SEOData;
        } catch (e: any) {
            console.error("Failed to parse SEO JSON", e, "Raw text sample:", text.slice(-100));
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

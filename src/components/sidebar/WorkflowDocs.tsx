import React from 'react';
import { Bot, Code, Zap, Database, Mic, ImageIcon, Settings2, FileText, Network } from 'lucide-react';

const Block = ({ title, icon: Icon, children }: { title: string, icon: any, children: React.ReactNode }) => (
  <div className="bg-white/5 border border-white/10 rounded-xl p-5 hover:bg-white/10 transition-colors">
    <div className="flex items-center gap-2 mb-3">
      <Icon className="w-4 h-4 text-gray-400" />
      <h3 className="text-sm font-bold text-white uppercase tracking-wider">{title}</h3>
    </div>
    {children}
  </div>
);

const JsonDisplay = ({ data }: { data: any }) => (
  <div className="relative mt-2">
    <div className="absolute top-0 right-0 px-2 py-1 bg-black/40 text-[10px] text-gray-500 rounded-bl-lg rounded-tr-xl border-b border-l border-white/10">JSON</div>
    <pre className="bg-black/40 text-gray-300 p-4 rounded-xl text-xs overflow-x-auto border border-white/5 font-mono shadow-inner">
      <code dangerouslySetInnerHTML={{ 
        __html: JSON.stringify(data, null, 2)
          .replace(/"(.*?)":/g, '<span class="text-blue-300">"$1"</span>:')
          .replace(/"(.*?)"(?=,|\n)/g, '<span class="text-emerald-300">"$1"</span>')
          .replace(/\b(true|false|null)\b/g, '<span class="text-fuchsia-300">$1</span>')
          .replace(/\b(\d+)\b(?!")/g, '<span class="text-amber-300">$1</span>')
      }} />
    </pre>
  </div>
);

const PromptDisplay = ({ title, text }: { title: string, text: string }) => (
  <div className="relative mt-2">
    <div className="absolute top-0 right-0 px-2 py-1 bg-black/40 text-[10px] text-indigo-300 rounded-bl-lg rounded-tr-xl border-b border-l border-white/10 tracking-widest uppercase">{title}</div>
    <pre className="bg-[#0b1120]/50 text-indigo-100/80 p-4 pt-8 rounded-xl text-xs border border-indigo-500/10 font-mono shadow-inner whitespace-pre-wrap leading-relaxed">
      {text}
    </pre>
  </div>
);

export const Step1Doc = () => (
  <div className="space-y-6">
    <Block title="The Script Lab Pipeline" icon={Network}>
      <p className="text-sm text-gray-300 leading-relaxed mb-4">
        The <strong>Script Lab</strong> is the foundational Engine of the workflow. It operates on a <span className="text-indigo-300 font-semibold">Dual-Pass Generation System</span>. Pass 1 handles the creative synthesis of the narrative using deep instructional prompts, while Pass 2 acts as an automated "Quality Assurance" layer that critiques the generated text against engagement and retention benchmarks.
      </p>
      <div className="flex flex-col gap-2 mt-4 text-xs">
        <div className="flex items-center gap-3 bg-white/5 p-3 rounded-lg border border-white/5">
          <div className="w-6 h-6 shrink-0 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold border border-indigo-500/30">1</div>
          <span className="text-gray-300"><strong>Generation Pass:</strong> Compiles the raw inputs (Topic, Tone, AI Instructions) into a master context prompt. Outputs raw narrative text.</span>
        </div>
        <div className="flex items-center gap-3 bg-white/5 p-3 rounded-lg border border-white/5">
          <div className="w-6 h-6 shrink-0 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-400 font-bold border border-violet-500/30">2</div>
          <span className="text-gray-300"><strong>Analysis Pass:</strong> Immediately evaluates the output from Pass 1. Formats the evaluation into a precise JSON schema containing quality metrics.</span>
        </div>
      </div>
    </Block>

    <Block title="Control Matrix & Initial Payload" icon={Settings2}>
      <p className="text-sm text-gray-400 mb-3">The generation endpoint compiles three distinct user inputs before invoking the LLM:</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <div className="bg-black/30 p-3 rounded-lg border border-white/5 border-t-amber-500/30">
          <div className="text-xs font-bold text-amber-400 mb-1">Topic</div>
          <div className="text-xs text-gray-400">Core subject matter. Sets factual boundaries.</div>
        </div>
        <div className="bg-black/30 p-3 rounded-lg border border-white/5 border-t-pink-400/30">
          <div className="text-xs font-bold text-pink-400 mb-1">Tone</div>
          <div className="text-xs text-gray-400">Narrative voice. Dictates vocabulary pacing.</div>
        </div>
        <div className="bg-black/30 p-3 rounded-lg border border-white/5 border-t-cyan-500/30">
          <div className="text-xs font-bold text-cyan-400 mb-1">AI Instructions</div>
          <div className="text-xs text-gray-400">Advanced Control block. Injected as overriding constraints.</div>
        </div>
      </div>
      <JsonDisplay data={{ 
        topic: "The dark forest theory", 
        tone: "Suspenseful, dramatic",
        aiInstructions: "Never use the word 'delve' or 'testament'. Keep paragraphs under 3 sentences. Emphasize silence in space."
      }} />
    </Block>

    <Block title="Prompt Engineering Structure" icon={FileText}>
       <p className="text-sm text-gray-400 mb-3">When generation begins, the payload is formatted into a strict system prompt to guarantee clean, usable output without LLM "chatter" or formatting artifacts:</p>
       <PromptDisplay title="Master System Prompt (Abridged)" text={`You are an elite scriptwriter for viral short-form video content.

### CONSTRAINTS
- Topic: {topic}
- Tone: {tone}
- Custom Directives: {aiInstructions}

### STRUCTURAL REQUIREMENTS
1. Hook: The first 3 seconds must immediately disrupt scrolling.
2. Pacing: High information density, zero filler. Short, punchy sentences.
3. Tone enforcement: Strictly adhere to the requested emotional tone.

### OUTPUT FORMAT
Return ONLY the spoken word script. Do not include markdown formatting, scene descriptions, visual cues, or bracketed tags (e.g., [Intro], [Music fades]). Just the text to be sent directly to the TTS engine.`} />
    </Block>

    <Block title="Output Phase: Structured Analysis" icon={Database}>
      <div className="grid grid-cols-1 gap-4">
        <div>
          <p className="text-sm text-gray-400 mb-2">Once the raw script is generated, the <span className="text-white font-medium">Analysis Pass</span> interrogates the script and forces the LLM to output a strictly typed JSON object matching the <code className="bg-black/40 px-1 rounded text-pink-300">ScriptAnalysis</code> interface. This data populates the AI Analysis Report UI.</p>
          <JsonDisplay data={{ 
            "score": 92, 
            "hookRating": "Viral", 
            "pacing": "Relentless, fast-paced build-up.", 
            "wordCount": 142,
            "estimatedDuration": "58s",
            "factCheck": [
              "Verified: Fermi Paradox context accurate",
              "Warning: Light-speed communication delays simplified"
            ],
            "strengths": [
              "Visceral opening hook",
              "Strong emotional conclusion"
            ],
            "weaknesses": [
              "Mid-section might lose viewers expecting fast action"
            ],
            "improvementSuggestion": "Add a concrete example of a recognizable signal."
          }} />
        </div>
      </div>
    </Block>
  </div>
);

export const Step2Doc = () => (
  <div className="space-y-6">
    <Block title="The Audio Synthesis Engine" icon={Network}>
      <p className="text-sm text-gray-300 leading-relaxed mb-4">
        The <strong>Audio Engine</strong> acts as the bridge between raw script text and the final audio mix. It operates a <span className="text-violet-300 font-semibold">Dual-Track Audio Pipeline</span>. Track 1 drives the high-fidelity Text-to-Speech (TTS) Voice Persona, while Track 2 calculates constraints for the background music generation, ensuring the emotional intensity matches the vocal cadence.
      </p>
      <div className="flex flex-col gap-2 mt-4 text-xs">
        <div className="flex items-center gap-3 bg-white/5 p-3 rounded-lg border border-white/5">
          <div className="w-6 h-6 shrink-0 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-400 font-bold border border-violet-500/30">1</div>
          <span className="text-gray-300"><strong>Vocal Synthesis (TTS):</strong> Reads the verified `scriptText`. Assigns the selected Voice Model IDs (e.g., Puck, Zephyr) and translates plain text into a raw Base64 PCM audio stream.</span>
        </div>
        <div className="flex items-center gap-3 bg-white/5 p-3 rounded-lg border border-white/5">
          <div className="w-6 h-6 shrink-0 rounded-full bg-fuchsia-500/20 flex items-center justify-center text-fuchsia-400 font-bold border border-fuchsia-500/30">2</div>
          <span className="text-gray-300"><strong>Music Dynamics (BGM):</strong> Evaluates the chosen Style and Intensity constraints to construct a highly specific music generation prompt, laying the groundwork for spatial audio mixing.</span>
        </div>
      </div>
    </Block>

    <Block title="TTS Control Matrix & Parameters" icon={Settings2}>
      <p className="text-sm text-gray-400 mb-3">Before submitting the speech request, the application locks in three core properties to guarantee consistent voice modeling:</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <div className="bg-black/30 p-3 rounded-lg border border-white/5 border-t-violet-500/30">
          <div className="text-xs font-bold text-violet-400 mb-1">Target Script</div>
          <div className="text-xs text-gray-400">The sanitized string stripped of markdown or director cues.</div>
        </div>
        <div className="bg-black/30 p-3 rounded-lg border border-white/5 border-t-fuchsia-400/30">
          <div className="text-xs font-bold text-fuchsia-400 mb-1">Voice ID</div>
          <div className="text-xs text-gray-400">The unique identifier binding the TTS engine to a specific Persona.</div>
        </div>
        <div className="bg-black/30 p-3 rounded-lg border border-white/5 border-t-cyan-500/30">
          <div className="text-xs font-bold text-cyan-400 mb-1">Codec Format</div>
          <div className="text-xs text-gray-400">Audio response schema. Requires decoding from PCM/Bytes to WAV.</div>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
           <p className="text-xs text-gray-400 font-bold mb-1">TTS Invocation Payload</p>
           <JsonDisplay data={{ 
            model: "gemini-2.5-flash",
            text: "The universe is expanding faster than we thought.", 
            voiceId: "Aoede",
            outputFormat: "Base64_PCM"
          }} />
        </div>
        <div>
           <p className="text-xs text-gray-400 font-bold mb-1">Music Generation Config</p>
           <JsonDisplay data={{ 
            style: "Cinematic Synthwave", 
            intensity: "Building to climax",
            aiDirection: "Use heavy bass with ethereal arpeggios"
          }} />
        </div>
      </div>
    </Block>

    <Block title="Audio Data Lifecycle" icon={Database}>
      <div className="grid grid-cols-1 gap-4">
        <div>
          <p className="text-sm text-gray-400 mb-2">The Audio step doesn't just call an API; it handles complex browser-level data transformations. The API returns a highly compressed <code className="bg-black/40 px-1 rounded text-violet-300">Base64</code> string. The client-side utility <code className="bg-black/40 px-1 rounded text-fuchsia-300">base64PCMToWavBlob</code> must decode this string, inject a valid WAV header, and mount it into memory so standard HTML5 Audio players can read it.</p>
          <PromptDisplay title="Data Transformation Flow" text={`1. API Response Phase
-> Receives: { "audioContent": "UklGRiQAAABXQVZFZ..." } (String)

2. Buffer Evaluation Phase
-> Convert Base64 String -> Uint8Array (Byte Array)
-> Allocate ArrayBuffer based on expected Sample Rate (24kHz typically)

3. Header Injection Phase
-> Write RIFF Chunk Descriptor
-> Write "WAVE" format markers
-> Write "fmt " sub-chunk (Audio Format, Channels, Sample Rate)

4. Mounting Phase
-> Wrap raw bytes in a new Blob([data], { type: 'audio/wav' })
-> URL.createObjectURL(blob) mounts the data to the browser memory.`} />
        </div>
      </div>
    </Block>
  </div>
);

export const Step3Doc = () => (
  <div className="space-y-6">
    <Block title="The Visual Architect Pipeline (4-Stage Engine)" icon={Network}>
      <p className="text-sm text-gray-300 leading-relaxed mb-4">
        The <strong>Visual Engine</strong> handles the heaviest logic block in the workflow. Rather than blindly generating one image per sentence, it employs a strict <span className="text-fuchsia-300 font-semibold">4-Stage Render Pipeline</span> to ensure temporal and thematic consistency across the final video timeline.
      </p>
      <div className="flex flex-col gap-2 mt-4 text-xs">
        <div className="flex items-center gap-3 bg-white/5 p-3 rounded-lg border border-white/5">
          <div className="w-6 h-6 shrink-0 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold border border-indigo-500/30">1</div>
          <span className="text-gray-300"><strong>Semantic Segmentation:</strong> An LLM parses the script to find natural camera cuts, grouping text into timeline <code className="bg-black/40 px-1 rounded text-cyan-300">Scene</code> blocks based on auditory durations.</span>
        </div>
        <div className="flex items-center gap-3 bg-white/5 p-3 rounded-lg border border-white/5">
          <div className="w-6 h-6 shrink-0 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-400 font-bold border border-violet-500/30">2</div>
          <span className="text-gray-300"><strong>Conceptual Mapping:</strong> Analyzes narrative context to assign core Visual Intents, Layout structures (e.g., Centered, Grid), and hierarchy rules to each scene.</span>
        </div>
        <div className="flex items-center gap-3 bg-white/5 p-3 rounded-lg border border-white/5">
          <div className="w-6 h-6 shrink-0 rounded-full bg-fuchsia-500/20 flex items-center justify-center text-fuchsia-400 font-bold border border-fuchsia-500/30">3</div>
          <span className="text-gray-300"><strong>Aesthetic Bias Injection:</strong> Generates highly specific `imagePrompt` strings designed for AI models, rigorously forcing them through the lens of the Global Style parameters.</span>
        </div>
        <div className="flex items-center gap-3 bg-white/5 p-3 rounded-lg border border-white/5">
          <div className="w-6 h-6 shrink-0 rounded-full bg-pink-500/20 flex items-center justify-center text-pink-400 font-bold border border-pink-500/30">4</div>
          <span className="text-gray-300"><strong>Parallel Media Synthesis:</strong> Concurrently invokes the actual Diffusion or Image-to-Video models for all scenes, generating rendering artifacts and mapping local Object URLs to the Timeline.</span>
        </div>
      </div>
    </Block>

    <Block title="Semantic Segmentation Directives" icon={FileText}>
      <p className="text-sm text-gray-400 mb-3">To ensure the image prompts are highly descriptive and temporally accurate, the system injects a strict parsing directive to the LLM prior to generation:</p>
      <PromptDisplay title="Scene Extraction Prompt (Abridged)" text={`You are a Master Storyboard Artist.

TASK:
Analyze the provided script and segment it into sequential visual scenes.

RULES:
1. Duration: Each scene should roughly cover 3 to 7 seconds of spoken text.
2. Visual Intent: Define the core subject focus (e.g., "Macro shot of an eye", "Wide landscape").
3. Layout & Hierarchy: Assign a classification ("Grid", "Split-Screen", "Centered") and note the visual weighting.
4. Image Prompt: Write a standalone, highly detailed prompt for an image generation AI. State the subject, lighting, camera angle, and atmosphere. DO NOT reference previous scenes (Image AI has no context memory).`} />
    </Block>

    <Block title="Global Aesthetic Matrix" icon={Settings2}>
      <p className="text-sm text-gray-400 mb-3">To prevent visual dissonance between scenes, the pipeline wraps a <strong>Style Modifier</strong> around every individual scene prompt, guaranteeing uniformity.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-gray-400 font-bold mb-1">State Config: Aesthetics</p>
          <JsonDisplay data={{ 
            selectedStyle: "Cybercore",
            customModifier: "Neon accents, volatile atmosphere",
            aspectRatio: "9:16 (Vertical)"
          }} />
        </div>
        <div>
          <p className="text-xs text-gray-400 font-bold mb-1">Final Composited Prompt (Sent to Image AI)</p>
          <JsonDisplay data={{ 
            finalPrompt: "[Cybercore, Neon accents, volatile atmosphere] A bustling futuristic marketplace, rain slicked streets reflecting pink neon, low angle shot."
          }} />
        </div>
      </div>
    </Block>

    <Block title="The Scene Object Architecture" icon={Database}>
      <p className="text-sm text-gray-400 mb-2">The output of the segmentation LLM must perfectly match this TypeScript interface, serving as the master state array for the video timeline and render queue.</p>
      <div className="grid grid-cols-1 gap-4">
        <JsonDisplay data={{ 
          scenes: [
            {
              id: 1,
              text: "Your brain is being hacked. Not by a shadow organization...",
              duration: 5.2,
              visualIntent: "Cybernetic neural visualization",
              classification: "Abstract",
              layout: "Centered",
              visualHierarchy: "Glowing neurons dominate foreground",
              imagePrompt: "Close-up macro photography of glowing blue neural pathways, fiber optic cables, cinematic depth of field"
            },
            {
              id: 2,
              text: "...but by the very algorithms designed to keep you scrolling.",
              duration: 4.8,
              visualIntent: "Infinite digital feed",
              classification: "Process",
              layout: "Grid",
              visualHierarchy: "Descending columns of bright UI elements",
              imagePrompt: "Endless towering monoliths made of glowing social media UI panes, harsh artificial light, dystopian"
            }
          ]
        }} />
      </div>
    </Block>
  </div>
);

export const Step4Doc = () => (
  <div className="space-y-6">
    <Block title="The Visibility Pipeline" icon={Network}>
      <p className="text-sm text-gray-300 leading-relaxed mb-4">
        The <strong>SEO Engine</strong> is the final gate before distribution. It operates on a <span className="text-pink-300 font-semibold">Reverse-Context Discovery Pipeline</span>. Instead of generating generic tags based on the topic alone, it ingests the entire crafted narrative and calculates Click-Through Rate (CTR) optimized metadata specifically tailored for algorithmic discovery (TikTok, Shorts, Reels).
      </p>
      <div className="flex flex-col gap-2 mt-4 text-xs">
        <div className="flex items-center gap-3 bg-white/5 p-3 rounded-lg border border-white/5">
          <div className="w-6 h-6 shrink-0 rounded-full bg-pink-500/20 flex items-center justify-center text-pink-400 font-bold border border-pink-500/30">1</div>
          <span className="text-gray-300"><strong>Narrative Ingestion:</strong> Evaluates the finalized `scriptText` and raw `topic` to build a semantic profile of the video's core value proposition.</span>
        </div>
        <div className="flex items-center gap-3 bg-white/5 p-3 rounded-lg border border-white/5">
          <div className="w-6 h-6 shrink-0 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 font-bold border border-amber-500/30">2</div>
          <span className="text-gray-300"><strong>A/B Title Generation:</strong> Drafts multiple psychological hooks (Curiosity, Fear of Missing Out, Educational) optimized for 50-character cutoff limits.</span>
        </div>
        <div className="flex items-center gap-3 bg-white/5 p-3 rounded-lg border border-white/5">
          <div className="w-6 h-6 shrink-0 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold border border-indigo-500/30">3</div>
          <span className="text-gray-300"><strong>LSI Indexing:</strong> Extracts Latent Semantic Indexing (LSI) keywords and generates algorithm-friendly hashtags and deep-dive metadata.</span>
        </div>
      </div>
    </Block>

    <Block title="Algorithmic Tuning Directives" icon={FileText}>
      <p className="text-sm text-gray-400 mb-3">The SEO engine is instructed with strict behavioral bounds to avoid shadow-banning traps (like keyword stuffing) and prioritize human psychology:</p>
      <PromptDisplay title="SEO Extraction Prompt (Abridged)" text={`You are an elite Growth Hacker and YouTube/TikTok SEO Architect.

TASK:
Analyze the following script and topic, then generate a viral metadata package.

RULES FOR TITLES:
- Generate exactly 4 distinct titles.
- DO NOT use clickbait that isn't fulfilled in the script.
- Keep them under 60 characters to avoid truncation.
- Mix psychological triggers (Urgency, Curiosity, Authority, Listicle).

RULES FOR HASHTAGS & KEYWORDS:
- Hashtags: Suggest 5 highly-targeted, niche-specific tags (avoid oversaturated tags like #fyp).
- Keywords: Provide 6 LSI (Latent Semantic Indexing) phrases for YouTube search ranking.

OUTPUT SCHEMA:
Return ONLY a valid JSON object adhering to the specified schema.`} />
    </Block>

    <Block title="Metadata Data Structure" icon={Database}>
      <p className="text-sm text-gray-400 mb-2">The system enforces an absolute schema adherence on the LLM, ensuring the resulting data maps instantly to the UI components allowing users to easily copy/paste attributes for publishing.</p>
      <div className="grid grid-cols-1 gap-4">
        <JsonDisplay data={{ 
          titles: [
            "Your Brain is Being Hacked (Here's How)", 
            "The Algorithm's Darkest Secret 🧠",
            "Why You Can't Stop Scrolling (Neuroscience)",
            "Step Inside the Digital Matrix"
          ], 
          description: "Ever wonder why you can't put your phone down? It's not a lack of willpower; it's by design. In this video, we break down the neural hacking tactics used by massive social algorithms.", 
          contextExpansion: "Beyond the surface level of machine learning, modern algorithms employ variable-ratio scheduling—the same psychological trick used in slot machines—to keep dopamine levels volatile.",
          hashtags: [
            "#neuroscience", 
            "#algorithms", 
            "#digitalminimalism", 
            "#techdystopia", 
            "#dopamine"
          ],
          keywords: [
            "social media addiction psychology", 
            "how algorithms hack your brain", 
            "dopamine detox", 
            "variable ratio scheduling social media"
          ]
        }} />
      </div>
    </Block>
  </div>
);

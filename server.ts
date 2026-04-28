import express from "express";
import { createServer as createViteServer } from "vite";
import axios from "axios";
import path from "path";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.get('/api/models', async (req, res) => {
    const { provider } = req.query;

    try {
      let rawModels = [];
      
      // Google models are handled exclusively on the frontend.
      if (provider === 'google') {
        return res.json({ success: true, models: [] });
      }

      switch(provider) {
        case 'openrouter':
          const orKey = process.env.OPENROUTER_KEY;
          if (!orKey) throw new Error('OPENROUTER_KEY is not configured');
          const orRes = await axios.get('https://openrouter.ai/api/v1/models', {
            headers: { Authorization: `Bearer ${orKey}` }
          });
          rawModels = orRes.data.data.map((m: any) => ({
            id: m.id,
            name: m.name,
            provider: 'openrouter',
            context: m.context_length || 0,
            output: m.top_provider?.max_completion_tokens || 0,
            pricing: {
              prompt: parseFloat(String(m.pricing?.prompt || "0")),
              completion: parseFloat(String(m.pricing?.completion || "0")),
              request: parseFloat(String(m.pricing?.request || "0"))
            },
            architecture: m.architecture
          }));
          break;

        case 'groq':
          const groqKey = process.env.GROQ_KEY;
          if (!groqKey) throw new Error('GROQ_KEY is not configured');
          const groqRes = await axios.get('https://api.groq.com/openai/v1/models', {
            headers: { Authorization: `Bearer ${groqKey}` }
          });
          rawModels = groqRes.data.data.map((m: any) => ({
            id: m.id,
            name: m.id,
            provider: 'groq',
            context: m.context_window || 0,
            output: m.max_completion_tokens || 0
          }));
          break;

        case 'snova':
          const snovaKey = process.env.SNOVA_KEY;
          if (!snovaKey) throw new Error('SNOVA_KEY is not configured');
          const snovaRes = await axios.get('https://api.sambanova.ai/v1/models', {
            headers: { Authorization: `Bearer ${snovaKey}` }
          });
          rawModels = snovaRes.data.data.map((m: any) => ({
            id: m.id,
            name: m.id,
            provider: 'snova',
            context: m.context_window || 0,
            output: m.max_completion_tokens || 0
          }));
          break;

        case 'deepseek':
          const dsKey = process.env.DEEPSEEK_KEY;
          if (!dsKey) throw new Error('DEEPSEEK_KEY is not configured');
          const dsRes = await axios.get('https://api.deepseek.com/models', {
            headers: { Authorization: `Bearer ${dsKey}` }
          });
          rawModels = dsRes.data.data.map((m: any) => ({
            id: m.id,
            name: m.id,
            provider: 'deepseek',
            context: 64000,
            output: 8000
          }));
          break;

        case 'huggingface':
          rawModels = [
            { id: 'meta-llama/Llama-3.3-70B-Instruct', name: 'Llama 3.3 70B', provider: 'huggingface', context: 128000, output: 4096 },
            { id: 'mistralai/Mixtral-8x7B-Instruct-v0.1', name: 'Mixtral 8x7B', provider: 'huggingface', context: 32768, output: 4096 },
            { id: 'google/gemma-2-9b-it', name: 'Gemma 2 9B', provider: 'huggingface', context: 8192, output: 2048 },
            { id: 'microsoft/Phi-3-mini-4k-instruct', name: 'Phi-3 Mini', provider: 'huggingface', context: 4096, output: 1024 }
          ];
          break;

        default:
          throw new Error('Unknown provider');
      }

      const models = rawModels.map((m: any) => {
        const id = m.id.toLowerCase();
        
        // TYPE
        let type: "chat" | "image" | "audio" | "multimodal" = "chat";
        if (id.includes("whisper") || id.includes("tts")) type = "audio";
        else if (id.includes("diffusion") || id.includes("flux")) type = "image";
        else if (m.architecture?.input_modalities?.includes("image")) type = "multimodal";

        // POWER
        let power: "high" | "medium" | "low" = "medium";
        if (id.includes("70b") || id.includes("opus") || id.includes("gpt-4") || id.includes("pro") || id.includes("405b")) power = "high";
        else if (id.includes("mini") || id.includes("lite") || id.includes("7b") || id.includes("flash")) power = "low";

        // SPEED
        let speed: "fast" | "balanced" | "slow" = "balanced";
        if (id.includes("flash") || id.includes("turbo") || id.includes("instant")) speed = "fast";
        else if (power === "high") speed = "slow";

        // COST LOGIC (Fix Checklist Implementation)
        let cost: "free" | "paid" | "unknown" = "unknown";
        
        if (m.provider === 'google' || m.provider === 'groq') {
          // Google and Groq are always free in this context
          cost = "free";
        } else if (m.provider === 'openrouter') {
          // OpenRouter logic: check ID for :free first
          if (m.id.toLowerCase().includes(':free')) {
            cost = "free";
          } else if (m.pricing) {
            // Use converted numeric pricing values
            if (m.pricing.prompt === 0 && m.pricing.completion === 0 && m.pricing.request === 0) {
              cost = "free";
            } else {
              cost = "paid";
            }
          } else {
            cost = "paid"; // Default for OpenRouter if not explicitly free
          }
        } else if (m.provider === 'huggingface') {
          // Hugging Face logic: pricing exists -> PAID, missing -> UNKNOWN
          if (m.pricing || m.providers?.some((p: any) => p.pricing)) {
            cost = "paid";
          } else {
            cost = "unknown";
          }
        } else if (m.pricing) {
          // Generic fallback for other providers
          const promptPrice = parseFloat(String(m.pricing.prompt || m.pricing.input || "0"));
          if (promptPrice === 0) cost = "free";
          else cost = "paid";
        }

        // CAPABILITIES
        const capabilities: string[] = [];
        if (m.architecture?.input_modalities?.includes("image") || m.supported_parameters?.includes("image")) capabilities.push("vision");
        if (m.supported_parameters?.includes("tools") || id.includes("instruct")) capabilities.push("tools");
        if (m.thinking === true || id.includes("reasoner") || id.includes("r1")) capabilities.push("reasoning");
        if (m.context > 100000) capabilities.push("long-context");

        // LABELS
        const labels: string[] = [];
        if (m.context >= 1000000) labels.push("ultra-context");
        else if (m.context >= 100000) labels.push("long-context");
        
        labels.push(cost.toUpperCase());
        labels.push(speed);

        if (capabilities.includes("long-context")) labels.push("best for long documents");
        if (speed === "fast") labels.push("best for real-time");
        if (power === "high") labels.push("best for reasoning");

        // SMART SCORE
        const contextScore = Math.min(m.context / 128000, 1) * 30;
        const outputScore = Math.min(m.output / 8000, 1) * 10;
        const powerScore = (power === "high" ? 25 : power === "medium" ? 15 : 5);
        const speedScore = (speed === "fast" ? 15 : speed === "balanced" ? 10 : 5);
        const costScore = (cost === "free" ? 20 : 0);
        const capabilityScore = capabilities.length * 5;

        const score = contextScore + outputScore + powerScore + speedScore + costScore + capabilityScore;

        return {
          id: m.id,
          name: m.name,
          provider: m.provider,
          context: m.context,
          output: m.output,
          type,
          power,
          speed,
          cost,
          capabilities,
          labels,
          score
        };
      });

      res.json({ success: true, models });
    } catch (err: any) {
      const errorDetail = err.response?.data?.error?.message || err.response?.data || err.message;
      console.error(`Error fetching models for ${provider}:`, errorDetail);
      res.status(500).json({ success: false, error: errorDetail });
    }
  });

  app.get('/api/voices', async (req, res) => {
    const { provider, model } = req.query;

    try {
      let voices = [];
      
      if (provider === 'google') {
        voices = [
          { name: "Puck", gender: "Male", traits: "Deep & Resonant", id: "Puck", avatarClass: "bg-gradient-to-br from-indigo-500 via-purple-500 to-indigo-800" },
          { name: "Charon", gender: "Male", traits: "Deep & Serious", id: "Charon", avatarClass: "bg-gradient-to-br from-gray-700 via-gray-800 to-black" },
          { name: "Fenrir", gender: "Male", traits: "Aggressive & Intense", id: "Fenrir", avatarClass: "bg-gradient-to-br from-red-500 via-orange-600 to-red-800" },
          { name: "Kore", gender: "Female", traits: "Soothing & Calm", id: "Kore", avatarClass: "bg-gradient-to-br from-pink-300 via-rose-400 to-pink-500" },
          { name: "Aoede", gender: "Female", traits: "Higher Pitch & Clear", id: "Aoede", avatarClass: "bg-gradient-to-br from-teal-300 via-emerald-400 to-teal-600" }
        ];
      } else if (provider === 'openrouter') {
        // Mock voices for OpenRouter if it had TTS
        voices = [
          { name: "Echo", gender: "Neutral", traits: "Electronic & Clean", id: "echo", avatarClass: "bg-gradient-to-br from-cyan-500 to-blue-500" },
          { name: "Nova", gender: "Female", traits: "Energetic & Modern", id: "nova", avatarClass: "bg-gradient-to-br from-purple-500 to-pink-500" }
        ];
      } else {
        voices = [
          { name: "Default Voice", gender: "Neutral", traits: "Standard", id: "default", avatarClass: "bg-gray-600" }
        ];
      }

      res.json({ success: true, voices });
    } catch (err: any) {
      console.error(`Error fetching voices:`, err.message);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/ai', async (req, res) => {
    const { provider, model, prompt, messages, system_instruction, task_type } = req.body;

    try {
      let response;
      let output;

      // Handle both single prompt and multi-turn messages
      const chatMessages = messages || [{ role: 'user', content: prompt }];
      
      // Map roles for compatibility and ensure strictly allowed values
      const normalizedMessages = chatMessages.map(m => {
        let role = m.role;
        if (role === 'model' || role === 'ai' || role === 'bot') role = 'assistant';
        // Extreme fallback: if it's not a standard role, default to user to prevent API crashes
        if (role !== 'system' && role !== 'user' && role !== 'assistant') role = 'user';
        
        return {
          role,
          content: m.content || ''
        };
      });

      // Some providers support system instructions differently. 
      // We'll prepend it if provided and not already there for simplicity in this proxy.
      const formattedMessages = [...normalizedMessages];
      if (system_instruction && formattedMessages.length > 0) {
        if (provider === 'openrouter' || provider === 'groq' || provider === 'snova' || provider === 'deepseek') {
          formattedMessages.unshift({ role: 'system', content: system_instruction });
        } else {
          // Fallback: prepend to first user message
          formattedMessages[0].content = `${system_instruction}\n\n${formattedMessages[0].content}`;
        }
      }

      if (task_type === 'image') {
        throw new Error('Image generation not supported for this provider yet');
      } else if (task_type === 'audio') {
        throw new Error('Audio generation not supported for this provider yet');
      } else {
        switch(provider) {
          case 'huggingface':
            const hfKey = process.env.HF_TOKEN;
            if (!hfKey) throw new Error('HF_TOKEN is not configured');
            // Hugging Face inference API usually expects a single string for simple models
            const hfPrompt = formattedMessages.map(m => `${m.role}: ${m.content}`).join('\n');
            response = await axios.post(`https://api-inference.huggingface.co/models/${model}`, 
              { inputs: hfPrompt }, 
              { headers: { Authorization: `Bearer ${hfKey}` } }
            );
            output = response.data?.[0]?.generated_text || response.data;
            break;

          case 'openrouter':
            const orKey = process.env.OPENROUTER_KEY;
            if (!orKey) throw new Error('OPENROUTER_KEY is not configured');
            response = await axios.post(`https://openrouter.ai/api/v1/chat/completions`, 
              { model, messages: formattedMessages }, 
              { headers: { Authorization: `Bearer ${orKey}` } }
            );
            output = response.data?.choices?.[0]?.message?.content;
            break;

          case 'groq':
            const groqKey = process.env.GROQ_KEY;
            if (!groqKey) throw new Error('GROQ_KEY is not configured');
            response = await axios.post(`https://api.groq.com/openai/v1/chat/completions`, 
              { model, messages: formattedMessages }, 
              { headers: { Authorization: `Bearer ${groqKey}` } }
            );
            output = response.data?.choices?.[0]?.message?.content;
            break;

          case 'snova':
            const snovaKey = process.env.SNOVA_KEY;
            if (!snovaKey) throw new Error('SNOVA_KEY is not configured');
            response = await axios.post(`https://api.sambanova.ai/v1/chat/completions`, 
              { model, messages: formattedMessages }, 
              { headers: { Authorization: `Bearer ${snovaKey}` } }
            );
            output = response.data?.choices?.[0]?.message?.content;
            break;

          case 'deepseek':
            const dsKey = process.env.DEEPSEEK_KEY;
            if (!dsKey) throw new Error('DEEPSEEK_KEY is not configured');
            response = await axios.post(`https://api.deepseek.com/chat/completions`, 
              { model, messages: formattedMessages }, 
              { headers: { Authorization: `Bearer ${dsKey}` } }
            );
            output = response.data?.choices?.[0]?.message?.content;
            break;

          default:
            throw new Error(`Provider ${provider} is not supported on the backend. Google models must be called from the frontend.`);
        }
      }

      res.json({ success: true, output });
    } catch(err: any) {
      console.error(err.response?.data || err.message);
      res.status(500).json({ success: false, error: err.response?.data?.error?.message || err.message || 'API request failed' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

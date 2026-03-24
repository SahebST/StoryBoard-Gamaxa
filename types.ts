
export enum Step {
  Settings = 1, // Renamed conceptually to "Script Lab" in UI
  ScriptAudio = 2,
  Images = 3,
  SEO = 4,
}

export interface ScriptSettings {
  // We keep these for context in later steps (SEO/Images) if needed, 
  // but they are no longer the primary driver for Step 1.
  duration: string; 
}

export interface ScriptAnalysis {
  score: number; // 0-100
  hookRating: "Weak" | "Good" | "Viral";
  pacing: string;
  wordCount: number;
  estimatedDuration: string;
  factCheck: string[]; // List of potential issues or ["No factual errors found"]
  strengths: string[];
  weaknesses: string[];
  improvementSuggestion: string;
}

export interface Scene {
  id: number;
  text: string;
  duration: number; // approximate duration in seconds
  visualIntent: string; // Core Concept / Subject Focus
  imagePrompt?: string; // The exact prompt for the image generator (Optional in T2V mode)
  imageUrl?: string;
  isGeneratingImage?: boolean;
  imageToVideoPrompt?: string; // Prompt for image-to-video generation
  textToVideoPrompt?: string; // Prompt for text-to-video generation
  
  // New Visual Architect Fields
  classification?: "Structure" | "Process" | "Comparison" | "Abstract" | string;
  layout?: "Centered" | "Split-Screen" | "Flow" | "Layered Cutaway" | "Grid" | string;
  visualHierarchy?: string;
}

export interface SEOData {
  titles: string[]; // 4 distinct options
  description: string; // Main video description
  contextExpansion: string; // "What was missed" / Deep dive
  hashtags: string[];
  keywords: string[]; // LSI Keywords
}

export interface AppState {
  currentStep: Step;
  settings: ScriptSettings;
  
  // Script Data
  topic: string;
  scriptText: string;
  scriptAnalysis: ScriptAnalysis | null;
  
  // Assets
  audioBase64: string | null;
  selectedVoice: string | null;
  scenes: Scene[];
  seoData: SEOData | null;
  
  // New: Music & Image Config
  musicPrompt: string;
  musicStyle: string;
  musicIntensity: string;
  aiDirection: string;
  durationMode: 'auto' | 'custom';
  customDuration: string;
  
  // Loading States
  isAnalyzing: boolean;
  isImproving: boolean;
  isGeneratingAudio: boolean;
  isGeneratingSEO: boolean;
  isSegmenting: boolean;
  isGeneratingMusic: boolean;
}

export const INITIAL_SETTINGS: ScriptSettings = {
  duration: "60s",
};

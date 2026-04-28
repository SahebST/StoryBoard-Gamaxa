# Application Workflow Documentation

## Step 1: Script Generation & Analysis

This document explains the technical implementation and workflow logic of the first stage of our video creation pipeline.

### 1. Objective
Transform a raw, user-provided idea (topic and tone) into a refined, professional-grade script, enhanced by automated AI-driven quality assessment and optimization guidance.

### 2. Workflow & Logic Flow (Step-by-Step)

The workflow consists of an orchestrated sequence of two major AI calls triggered from `App.tsx`:

1.  **Orchestration (App.tsx)**:
    -   User triggers `handleGenerateScript(topic, tone)`.
    -   State `isAnalyzing` is set to `true`, providing visual feedback.
    -   **Phase A: Generation**: Calls `generateScriptFromIdea`.
    -   **Phase B: Analysis**: Upon successful script generation, `App.tsx` *automatically* chains the result into the analysis phase by calling `analyzeScript(generatedScript)`.
    -   **State Sync**: Finally, updates `scriptAnalysis` data and toggles `isAnalyzing` to `false`.

2.  **Logic Logic (geminiService.ts)**:
    -   **`generateScriptFromIdea`**: 
        -   Constructs a highly constrained System Prompt for Gemini.
        -   Enforces stylistic rules (narrative style, pacing, length).
        -   Extracts only the script text as the final block.
    -   **`analyzeScript`**:
        -   Takes the *final output* of Phase A as input.
        -   Utilizes a dedicated "System Critique" prompt designed to evaluate scripts against benchmark viral/engaging content metrics.
        -   Forces the AI to return a strict `application/json` output validatable against the `ScriptAnalysis` TypeScript interface.

### 3. Core Input/Output (JSON Structures)

#### Input: Step 1 Initiation (To AI)
The payload sent for the generation phase:
```json
{
  "topic": "The future of space travel",
  "tone": "Inspiring"
}
```

#### Output A: Generated Script (String)
The raw string content used for playback and the input for the next step.

#### Output B: Quality Analysis (JSON)
The structure returned by `analyzeScript` to inform the user's iterative process:
```json
{
  "score": 85,
  "hookRating": "Viral",
  "pacing": "Fast-paced, high energy.",
  "wordCount": 150,
  "estimatedDuration": "60s",
  "factCheck": ["No factual errors found"],
  "strengths": ["Clear structure", "Engaging hook"],
  "weaknesses": ["Could use more data points in mid-section"],
  "improvementSuggestion": "Add a specific statistic about SpaceX launch frequency."
}
```

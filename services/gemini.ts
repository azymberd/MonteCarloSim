import { GoogleGenAI, Type, Schema } from "@google/genai";
import { ProjectData } from "../types";

const apiKey = process.env.API_KEY || ''; // Injected by the environment
const ai = new GoogleGenAI({ apiKey });

const projectSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    projectName: { type: Type.STRING, description: "A short, descriptive name for the project." },
    description: { type: Type.STRING, description: "A brief summary of what the project entails." },
    tasks: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING, description: "Unique identifier for the task (e.g., 'task_1')." },
          name: { type: Type.STRING, description: "Descriptive name of the task." },
          optimistic: { type: Type.NUMBER, description: "Best case duration in days." },
          mostLikely: { type: Type.NUMBER, description: "Most likely duration in days." },
          pessimistic: { type: Type.NUMBER, description: "Worst case duration in days." },
          dependencies: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING },
            description: "List of task IDs that must be completed before this task starts."
          },
          resourceType: { type: Type.STRING, description: "Role or resource needed (e.g. 'Developer', 'Server')." },
          resourceCount: { type: Type.NUMBER, description: "Quantity of the resource needed." }
        },
        required: ["id", "name", "optimistic", "mostLikely", "pessimistic", "dependencies"],
      }
    }
  },
  required: ["projectName", "tasks"]
};

const responseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    message: { type: Type.STRING, description: "Conversational response to the user. Ask clarifying questions here if the project is vague." },
    projectData: projectSchema,
    isComplete: { type: Type.BOOLEAN, description: "True if the project data is sufficient to run a simulation. False if more info is needed." }
  },
  required: ["message", "isComplete"]
};

export async function analyzeProjectDescription(history: {role: string, content: string}[], currentInput: string): Promise<{
    message: string;
    projectData?: ProjectData;
    isComplete: boolean;
}> {
  
  const systemInstruction = `
    You are an expert Project Management Consultant and Monte Carlo Simulation Specialist.
    
    Your goal is to help the user define a project structure so we can run a Monte Carlo simulation.
    
    1.  **Analyze** the user's input to identify tasks, durations, and dependencies.
    2.  **Estimate** missing values reasonably if the user is vague (e.g., if they say "Build a wall", assume reasonable construction times like 1-3 days if context suggests a small shed, or ask if unsure).
    3.  **Structure** the output strictly according to the JSON schema.
    4.  **Dependencies**: infer logical dependencies (e.g., "Roof" comes after "Walls").
    5.  **Uncertainty**: Always produce three duration estimates (optimistic, mostLikely, pessimistic). If the user gives one number (e.g., "5 days"), generate a range around it (e.g., 4, 5, 8) based on typical project uncertainty.
    6.  **Completeness**: If the project seems to have enough basic tasks to be interesting, mark 'isComplete' as true. If it's just "Hello" or "I want to build a house" with no details, mark 'isComplete' as false and ask guiding questions in the 'message' field.
    
    Current conversation context is provided.
  `;

  const contents = [
    ...history.map(h => ({ role: h.role === 'user' ? 'user' : 'model', parts: [{ text: h.content }] })),
    { role: 'user', parts: [{ text: currentInput }] }
  ];

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    const parsed = JSON.parse(text);
    return parsed;

  } catch (error) {
    console.error("Gemini API Error:", error);
    return {
      message: "I'm having trouble connecting to the planning engine. Please try again.",
      isComplete: false
    };
  }
}

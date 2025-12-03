export interface Task {
  id: string;
  name: string;
  optimistic: number;
  mostLikely: number;
  pessimistic: number;
  dependencies: string[]; // IDs of tasks that must finish before this starts
  resourceType?: string; // e.g., "Developer", "Designer", "Budget"
  resourceCount?: number;
}

export interface ProjectData {
  projectName: string;
  description: string;
  tasks: Task[];
}

export interface SimulationResult {
  runId: number;
  totalDuration: number;
  criticalPath: string[]; // List of task IDs
  taskDurations: Record<string, number>; // Actual duration sampled for each task in this run
  taskStartTimes: Record<string, number>; // Start time for each task in this run
  peakResources: Record<string, number>; // Max resource usage for this run
}

export interface SimulationStats {
  mean: number;
  median: number;
  stdDev: number;
  min: number;
  max: number;
  p50: number;
  p90: number;
  p95: number;
  p99: number;
  resourceStats: Record<string, {
    meanPeak: number;
    p90Peak: number;
    maxPeak: number;
  }>;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  isProjectUpdate?: boolean;
}
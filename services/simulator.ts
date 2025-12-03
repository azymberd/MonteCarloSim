import { Task, SimulationResult, SimulationStats, ProjectData } from '../types';

// Helper: Triangular Distribution Sampler
function sampleTriangular(min: number, mode: number, max: number): number {
  const u = Math.random();
  const f = (mode - min) / (max - min);
  if (u < f) {
    return min + Math.sqrt(u * (max - min) * (mode - min));
  } else {
    return max - Math.sqrt((1 - u) * (max - min) * (max - mode));
  }
}

// Topological Sort to ensure we process dependencies correctly
function topologicalSort(tasks: Task[]): Task[] {
  const visited = new Set<string>();
  const result: Task[] = [];
  const temp = new Set<string>();

  const visit = (taskId: string) => {
    if (temp.has(taskId)) throw new Error("Circular dependency detected");
    if (visited.has(taskId)) return;

    temp.add(taskId);
    const task = tasks.find((t) => t.id === taskId);
    if (task) {
      task.dependencies.forEach((depId) => visit(depId));
      visited.add(taskId);
      result.push(task);
    }
    temp.delete(taskId);
  };

  tasks.forEach((t) => {
    if (!visited.has(t.id)) visit(t.id);
  });

  return result;
}

export function runSimulation(project: ProjectData, iterations: number = 2000): { results: SimulationResult[]; stats: SimulationStats } {
  const sortedTasks = topologicalSort(project.tasks);
  const results: SimulationResult[] = [];
  
  // Identify all unique resource types
  const resourceTypes = new Set<string>();
  project.tasks.forEach(t => {
    if (t.resourceType) resourceTypes.add(t.resourceType);
  });

  for (let i = 0; i < iterations; i++) {
    const taskDurations: Record<string, number> = {};
    const taskStartTimes: Record<string, number> = {};
    const taskFinishTimes: Record<string, number> = {};
    
    // 1. Sample durations
    project.tasks.forEach((t) => {
      taskDurations[t.id] = sampleTriangular(t.optimistic, t.mostLikely, t.pessimistic);
    });

    // 2. Calculate schedule (Forward Pass)
    let projectDuration = 0;
    
    sortedTasks.forEach((task) => {
      let startTime = 0;
      if (task.dependencies.length > 0) {
        startTime = Math.max(...task.dependencies.map(depId => taskFinishTimes[depId] || 0));
      }
      const finishTime = startTime + taskDurations[task.id];
      taskStartTimes[task.id] = startTime;
      taskFinishTimes[task.id] = finishTime;
      
      if (finishTime > projectDuration) {
        projectDuration = finishTime;
      }
    });

    // 3. Calculate Resource Peaks for this run
    const peakResources: Record<string, number> = {};
    
    // Create event points for resource changes
    const events: { time: number; type: string; change: number }[] = [];
    project.tasks.forEach(t => {
      if (t.resourceType && t.resourceCount) {
        events.push({ time: taskStartTimes[t.id], type: t.resourceType, change: t.resourceCount });
        events.push({ time: taskFinishTimes[t.id], type: t.resourceType, change: -t.resourceCount });
      }
    });

    // Sort events by time
    events.sort((a, b) => a.time - b.time);

    const currentUsage: Record<string, number> = {};
    events.forEach(e => {
      currentUsage[e.type] = (currentUsage[e.type] || 0) + e.change;
      peakResources[e.type] = Math.max(peakResources[e.type] || 0, currentUsage[e.type]);
    });

    results.push({
      runId: i,
      totalDuration: projectDuration,
      criticalPath: [], 
      taskDurations,
      taskStartTimes,
      peakResources
    });
  }

  // 4. Calculate Stats
  const durations = results.map(r => r.totalDuration).sort((a, b) => a - b);
  const sum = durations.reduce((a, b) => a + b, 0);
  const mean = sum / durations.length;
  const median = durations[Math.floor(durations.length / 2)];
  
  // Standard Deviation
  const variance = durations.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / durations.length;
  const stdDev = Math.sqrt(variance);

  const getPercentile = (p: number) => durations[Math.floor(durations.length * p)];

  // Resource Stats Aggregation
  const resourceStats: Record<string, { meanPeak: number; p90Peak: number; maxPeak: number }> = {};
  
  resourceTypes.forEach(type => {
    const peaks = results.map(r => r.peakResources[type] || 0).sort((a, b) => a - b);
    resourceStats[type] = {
      meanPeak: peaks.reduce((a, b) => a + b, 0) / peaks.length,
      p90Peak: peaks[Math.floor(peaks.length * 0.9)],
      maxPeak: peaks[peaks.length - 1]
    };
  });

  const stats: SimulationStats = {
    mean,
    median,
    stdDev,
    min: durations[0],
    max: durations[durations.length - 1],
    p50: median,
    p90: getPercentile(0.90),
    p95: getPercentile(0.95),
    p99: getPercentile(0.99),
    resourceStats
  };

  return { results, stats };
}
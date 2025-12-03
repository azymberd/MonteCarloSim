import React, { useMemo, useState } from 'react';
import { SimulationStats, SimulationResult, ProjectData } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, AreaChart, Area, ReferenceLine, Label, Legend, ComposedChart, Line } from 'recharts';
import { ArrowLeft, Clock, AlertTriangle, CheckCircle2, TrendingUp, Users, Calendar } from 'lucide-react';

interface DashboardProps {
  stats: SimulationStats;
  results: SimulationResult[];
  project: ProjectData;
  onBack: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ stats, results, project, onBack }) => {
  const [selectedRunType, setSelectedRunType] = useState<'optimistic' | 'median' | 'pessimistic'>('median');

  // Prepare Histogram Data
  const histogramData = useMemo(() => {
    const durationCounts: Record<number, number> = {};
    results.forEach(r => {
      const d = Math.round(r.totalDuration);
      durationCounts[d] = (durationCounts[d] || 0) + 1;
    });
    return Object.keys(durationCounts)
      .map(d => ({ duration: parseInt(d), count: durationCounts[parseInt(d)] }))
      .sort((a, b) => a.duration - b.duration);
  }, [results]);

  // Prepare CDF Data
  const cdfData = useMemo(() => {
    let cumulative = 0;
    return histogramData.map(d => {
      cumulative += d.count;
      return {
        duration: d.duration,
        probability: (cumulative / results.length) * 100
      };
    });
  }, [histogramData, results.length]);

  // Select Representative Run for Visualization (Gantt & Resources)
  const representativeRun = useMemo(() => {
    const sortedResults = [...results].sort((a, b) => a.totalDuration - b.totalDuration);
    if (selectedRunType === 'optimistic') return sortedResults[Math.floor(sortedResults.length * 0.05)]; // P05
    if (selectedRunType === 'pessimistic') return sortedResults[Math.floor(sortedResults.length * 0.95)]; // P95
    return sortedResults[Math.floor(sortedResults.length * 0.5)]; // Median
  }, [results, selectedRunType]);

  // Prepare Gantt Data
  const ganttData = useMemo(() => {
    if (!representativeRun) return [];
    return project.tasks.map(t => ({
      id: t.id,
      name: t.name,
      start: representativeRun.taskStartTimes[t.id],
      duration: representativeRun.taskDurations[t.id],
      end: representativeRun.taskStartTimes[t.id] + representativeRun.taskDurations[t.id],
      resource: t.resourceType
    })).sort((a, b) => a.start - b.start);
  }, [project.tasks, representativeRun]);

  // Prepare Daily Resource Usage Data for the Representative Run
  const resourceTimeline = useMemo(() => {
    if (!representativeRun) return [];
    
    const maxDay = Math.ceil(representativeRun.totalDuration);
    const data: any[] = [];
    const resourceTypes = Array.from(new Set(project.tasks.map(t => t.resourceType).filter(Boolean))) as string[];

    for (let day = 0; day <= maxDay; day++) {
      const dayData: any = { day };
      resourceTypes.forEach(type => dayData[type] = 0);
      
      // For each task, if it is active on this day, add its resource count
      project.tasks.forEach(t => {
        if (!t.resourceType || !t.resourceCount) return;
        
        const start = representativeRun.taskStartTimes[t.id];
        const end = start + representativeRun.taskDurations[t.id];
        
        // Simple overlap check: if the day index is within [start, end)
        if (day >= Math.floor(start) && day < Math.ceil(end)) {
          dayData[t.resourceType] += t.resourceCount;
        }
      });
      data.push(dayData);
    }
    return data;
  }, [representativeRun, project.tasks]);

  const resourceTypes = Object.keys(stats.resourceStats);
  const colors = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

  return (
    <div className="h-full flex flex-col bg-slate-50 overflow-y-auto">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Simulation Results</h1>
                <p className="text-sm text-slate-500">{project.projectName} • {results.length.toLocaleString()} iterations</p>
              </div>
            </div>
            <div className="flex gap-4">
                <div className="text-right">
                    <p className="text-xs text-slate-500 uppercase font-semibold">Mean Duration</p>
                    <p className="text-lg font-bold text-slate-800">{stats.mean.toFixed(1)} days</p>
                </div>
                 <div className="text-right">
                    <p className="text-xs text-slate-500 uppercase font-semibold">95% Confidence</p>
                    <p className="text-lg font-bold text-indigo-600">{stats.p95.toFixed(1)} days</p>
                </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
        
        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600"><CheckCircle2 className="w-5 h-5" /></div>
              <span className="text-sm font-medium text-slate-500">Optimistic (Best Case)</span>
            </div>
            <p className="text-2xl font-bold text-slate-800">{stats.min.toFixed(1)} <span className="text-sm font-normal text-slate-400">days</span></p>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
             <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-100 rounded-lg text-blue-600"><Clock className="w-5 h-5" /></div>
              <span className="text-sm font-medium text-slate-500">Median (P50)</span>
            </div>
            <p className="text-2xl font-bold text-slate-800">{stats.median.toFixed(1)} <span className="text-sm font-normal text-slate-400">days</span></p>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm ring-2 ring-indigo-500/20">
             <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600"><TrendingUp className="w-5 h-5" /></div>
              <span className="text-sm font-medium text-slate-500">Likely (Mean)</span>
            </div>
            <p className="text-2xl font-bold text-indigo-600">{stats.mean.toFixed(1)} <span className="text-sm font-normal text-slate-400">days</span></p>
          </div>
           <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
             <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-amber-100 rounded-lg text-amber-600"><AlertTriangle className="w-5 h-5" /></div>
              <span className="text-sm font-medium text-slate-500">Risk (P95)</span>
            </div>
            <p className="text-2xl font-bold text-slate-800">{stats.p95.toFixed(1)} <span className="text-sm font-normal text-slate-400">days</span></p>
          </div>
        </div>

        {/* Resource Requirements */}
        {resourceTypes.length > 0 && (
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-6">
               <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                Resource Requirements
              </h3>
            </div>
           
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {resourceTypes.map((type, idx) => (
                <div key={type} className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                  <h4 className="font-semibold text-slate-700 mb-2">{type}</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500">Avg Peak Usage</span>
                      <span className="font-medium">{stats.resourceStats[type].meanPeak.toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500">P90 Peak (High Load)</span>
                      <span className="font-bold text-indigo-600">{stats.resourceStats[type].p90Peak}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500">Max Possible</span>
                      <span className="text-slate-900">{stats.resourceStats[type].maxPeak}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Schedule & Timeline Visualization Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gantt Chart */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-600" />
                Indicative Schedule
              </h3>
              <select 
                value={selectedRunType}
                onChange={(e) => setSelectedRunType(e.target.value as any)}
                className="text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="optimistic">Optimistic (P5)</option>
                <option value="median">Likely (Median)</option>
                <option value="pessimistic">Conservative (P95)</option>
              </select>
            </div>
            
            <div className="flex-1 overflow-y-auto min-h-[300px] max-h-[400px]">
               <div className="relative">
                 {ganttData.map((task, idx) => {
                   const maxDuration = representativeRun.totalDuration;
                   const leftPct = (task.start / maxDuration) * 100;
                   const widthPct = Math.max((task.duration / maxDuration) * 100, 1); // Min 1% width
                   
                   return (
                     <div key={task.id} className="mb-3">
                       <div className="flex justify-between text-xs mb-1">
                         <span className="font-medium text-slate-700 truncate max-w-[150px]">{task.name}</span>
                         <span className="text-slate-400">{Math.round(task.start)}d - {Math.round(task.end)}d</span>
                       </div>
                       <div className="w-full bg-slate-100 rounded-full h-2.5 relative overflow-hidden">
                         <div 
                            className="absolute h-full rounded-full opacity-80"
                            style={{ 
                              left: `${leftPct}%`, 
                              width: `${widthPct}%`,
                              backgroundColor: colors[idx % colors.length]
                            }}
                         />
                       </div>
                     </div>
                   );
                 })}
               </div>
               
               {/* Time Axis for Gantt */}
               <div className="w-full border-t border-slate-200 mt-4 pt-2 flex justify-between text-xs text-slate-400">
                  <span>Day 0</span>
                  <span>Day {Math.round(representativeRun.totalDuration / 2)}</span>
                  <span>Day {Math.round(representativeRun.totalDuration)}</span>
               </div>
            </div>
          </div>

          {/* Resource Load Chart */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
             <div className="mb-4">
              <h3 className="text-lg font-semibold text-slate-800">Work & Resource Distribution</h3>
              <p className="text-xs text-slate-500">Projected active resources per day based on the {selectedRunType} schedule.</p>
            </div>
            <div className="h-[300px]">
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={resourceTimeline} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="day" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                    <RechartsTooltip 
                      cursor={{fill: '#f1f5f9'}}
                      contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                    {resourceTypes.map((type, idx) => (
                      <Bar 
                        key={type} 
                        dataKey={type} 
                        stackId="a" 
                        fill={colors[idx % colors.length]} 
                        name={type}
                        radius={idx === resourceTypes.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                      />
                    ))}
                    {resourceTypes.length === 0 && (
                      <Bar dataKey="val" fill="#cbd5e1" name="No resources defined" />
                    )}
                 </BarChart>
               </ResponsiveContainer>
               {resourceTypes.length === 0 && (
                 <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm">
                   Define resource types in tasks to see workload distribution.
                 </div>
               )}
            </div>
          </div>
        </div>

        {/* Existing Distribution Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Histogram */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Duration Frequency Distribution</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={histogramData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="duration" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <RechartsTooltip 
                    cursor={{fill: '#f1f5f9'}}
                    contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                  />
                  <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  <ReferenceLine x={stats.mean} stroke="#ef4444" strokeDasharray="3 3">
                    <Label value="Mean" position="top" fill="#ef4444" fontSize={10} />
                  </ReferenceLine>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* CDF */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Completion Probability (S-Curve)</h3>
            <div className="h-64">
               <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cdfData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="duration" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} unit="%" />
                  <RechartsTooltip 
                     contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                  />
                  <Area type="monotone" dataKey="probability" stroke="#0ea5e9" fill="#e0f2fe" strokeWidth={2} />
                  <ReferenceLine y={90} stroke="#f59e0b" strokeDasharray="3 3">
                     <Label value="90%" position="insideTopLeft" fill="#f59e0b" fontSize={10} />
                  </ReferenceLine>
                  <ReferenceLine x={stats.p90} stroke="#f59e0b" strokeDasharray="3 3" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
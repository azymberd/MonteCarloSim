import React from 'react';
import { Task, ProjectData } from '../types';
import { Trash2, Plus, PlayCircle, AlertTriangle } from 'lucide-react';

interface TaskTableProps {
  project: ProjectData | null;
  setProject: (p: ProjectData) => void;
  onRunSimulation: () => void;
}

export const TaskTable: React.FC<TaskTableProps> = ({ project, setProject, onRunSimulation }) => {
  if (!project) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
        <AlertTriangle className="w-12 h-12 mb-4 opacity-20" />
        <p>No project data yet.</p>
        <p className="text-sm">Chat with the AI to generate a plan.</p>
      </div>
    );
  }

  const handleTaskChange = (idx: number, field: keyof Task, value: any) => {
    const newTasks = [...project.tasks];
    newTasks[idx] = { ...newTasks[idx], [field]: value };
    setProject({ ...project, tasks: newTasks });
  };

  const removeTask = (idx: number) => {
    const newTasks = project.tasks.filter((_, i) => i !== idx);
    setProject({ ...project, tasks: newTasks });
  };

  const addTask = () => {
    const newTask: Task = {
      id: `task_${Date.now()}`,
      name: "New Task",
      optimistic: 1,
      mostLikely: 2,
      pessimistic: 4,
      dependencies: []
    };
    setProject({ ...project, tasks: [...project.tasks, newTask] });
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
        <div>
           <h2 className="font-semibold text-slate-800">{project.projectName || "New Project"}</h2>
           <p className="text-xs text-slate-500">{project.tasks.length} tasks defined</p>
        </div>
        <button 
          onClick={onRunSimulation}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-sm hover:shadow-md active:scale-95"
        >
          <PlayCircle className="w-4 h-4" />
          Run Simulation
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 sticky top-0 z-10">
            <tr>
              <th className="p-3 font-medium border-b w-[25%]">Task Name</th>
              <th className="p-3 font-medium border-b w-[10%] text-center" title="Optimistic (Best Case)">Opt</th>
              <th className="p-3 font-medium border-b w-[10%] text-center" title="Most Likely">Nom</th>
              <th className="p-3 font-medium border-b w-[10%] text-center" title="Pessimistic (Worst Case)">Pess</th>
              <th className="p-3 font-medium border-b w-[15%]">Dependencies</th>
               <th className="p-3 font-medium border-b w-[15%]">Resource</th>
              <th className="p-3 font-medium border-b w-[5%]"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {project.tasks.map((task, idx) => (
              <tr key={task.id} className="hover:bg-slate-50/50 group">
                <td className="p-2">
                  <input 
                    type="text" 
                    value={task.name}
                    onChange={(e) => handleTaskChange(idx, 'name', e.target.value)}
                    className="w-full bg-transparent border-none focus:ring-0 text-slate-700 font-medium"
                  />
                </td>
                <td className="p-2">
                   <input 
                    type="number" 
                    min="0"
                    value={task.optimistic}
                    onChange={(e) => handleTaskChange(idx, 'optimistic', parseFloat(e.target.value))}
                    className="w-full text-center bg-transparent border border-transparent hover:border-slate-200 focus:border-indigo-400 rounded p-1"
                  />
                </td>
                <td className="p-2">
                   <input 
                    type="number" 
                    min="0"
                    value={task.mostLikely}
                    onChange={(e) => handleTaskChange(idx, 'mostLikely', parseFloat(e.target.value))}
                    className="w-full text-center bg-indigo-50/50 border border-transparent focus:border-indigo-400 rounded p-1 font-semibold text-indigo-700"
                  />
                </td>
                <td className="p-2">
                   <input 
                    type="number" 
                    min="0"
                    value={task.pessimistic}
                    onChange={(e) => handleTaskChange(idx, 'pessimistic', parseFloat(e.target.value))}
                    className="w-full text-center bg-transparent border border-transparent hover:border-slate-200 focus:border-indigo-400 rounded p-1"
                  />
                </td>
                <td className="p-2">
                   <input 
                    type="text" 
                    placeholder="e.g. task_1"
                    value={task.dependencies.join(', ')}
                    onChange={(e) => handleTaskChange(idx, 'dependencies', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                    className="w-full text-xs text-slate-500 bg-transparent"
                  />
                </td>
                 <td className="p-2">
                   <input 
                    type="text" 
                    placeholder="-"
                    value={task.resourceType || ''}
                    onChange={(e) => handleTaskChange(idx, 'resourceType', e.target.value)}
                    className="w-full text-xs text-slate-500 bg-transparent"
                  />
                </td>
                <td className="p-2 text-center">
                  <button onClick={() => removeTask(idx)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="p-3 border-t border-slate-100 bg-slate-50">
        <button onClick={addTask} className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 font-medium px-2 py-1 rounded hover:bg-indigo-50 transition-colors">
          <Plus className="w-4 h-4" />
          Add Task Manually
        </button>
      </div>
    </div>
  );
};

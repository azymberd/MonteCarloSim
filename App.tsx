import React, { useState, useEffect } from 'react';
import { ProjectData, ChatMessage, SimulationResult, SimulationStats } from './types';
import { ChatInterface } from './components/ChatInterface';
import { TaskTable } from './components/TaskTable';
import { Dashboard } from './components/Dashboard';
import { analyzeProjectDescription } from './services/gemini';
import { runSimulation } from './services/simulator';
import { Activity } from 'lucide-react';

const App: React.FC = () => {
  const [view, setView] = useState<'planner' | 'results'>('planner');
  
  // State for Project Data
  const [project, setProject] = useState<ProjectData | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // State for Simulation Results
  const [simResults, setSimResults] = useState<SimulationResult[]>([]);
  const [simStats, setSimStats] = useState<SimulationStats | null>(null);

  const handleSendMessage = async (text: string) => {
    // Optimistic UI update
    const newMessages = [...messages, { role: 'user', text } as ChatMessage];
    setMessages(newMessages);
    setIsAiLoading(true);

    try {
      // Call Gemini Service
      const response = await analyzeProjectDescription(
        newMessages.map(m => ({ role: m.role, content: m.text })),
        text
      );

      // Handle Response
      const aiMsg: ChatMessage = {
        role: 'model',
        text: response.message,
        isProjectUpdate: !!response.projectData
      };

      setMessages(prev => [...prev, aiMsg]);

      if (response.projectData) {
        setProject(response.projectData);
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: 'model', text: "Sorry, I encountered an error processing your request." }]);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleRunSimulation = () => {
    if (!project || project.tasks.length === 0) return;
    
    // Run Monte Carlo
    // Small delay to allow UI to show loading if we wanted, but JS is fast enough for <5000 runs usually
    setTimeout(() => {
        const { results, stats } = runSimulation(project, 2000); // 2000 runs
        setSimResults(results);
        setSimStats(stats);
        setView('results');
    }, 100);
  };

  return (
    <div className="h-full flex flex-col bg-slate-100">
      {/* Navbar */}
      <nav className="bg-slate-900 text-white h-14 flex items-center px-6 shrink-0 shadow-lg z-30">
        <div className="flex items-center gap-2 font-bold text-lg tracking-tight">
          <Activity className="text-indigo-400" />
          <span>MonteCarlo<span className="text-indigo-400">Sim</span></span>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden relative">
        {view === 'planner' ? (
          <div className="h-full max-w-7xl mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left: Chat */}
            <div className="lg:col-span-4 h-[50vh] lg:h-full min-h-[400px]">
              <ChatInterface 
                messages={messages} 
                isLoading={isAiLoading} 
                onSendMessage={handleSendMessage} 
              />
            </div>

            {/* Right: Task Table */}
            <div className="lg:col-span-8 h-full flex flex-col">
              <TaskTable 
                project={project} 
                setProject={setProject} 
                onRunSimulation={handleRunSimulation} 
              />
            </div>

          </div>
        ) : (
          <div className="h-full animate-in fade-in zoom-in-95 duration-300">
            {simStats && project && (
              <Dashboard 
                stats={simStats} 
                results={simResults} 
                project={project} 
                onBack={() => setView('planner')} 
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default App;

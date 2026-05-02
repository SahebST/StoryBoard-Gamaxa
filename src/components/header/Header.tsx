import React from 'react';
import { motion } from 'motion/react';
import { Sidebar } from '@/components/sidebar/Sidebar';
import { SessionManager } from '@/components/sidebar/SessionManager';

interface HeaderProps {
  topic: string;
  sessionTitle: string;
  onSessionTitleChange: (title: string) => void;
  isAdvancedMode: boolean;
  onToggleAdvancedMode: () => void;
  
  // Sidebar props
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
  currentProvider: string;
  currentModel: string;
  onProviderChange: (provider: string) => void;
  onModelChange: (model: string) => void;
  audioProvider: string;
  audioModel: string;
  onAudioProviderChange: (provider: string) => void;
  onAudioModelChange: (model: string) => void;
  imageProvider: string;
  imageModel: string;
  onImageProviderChange: (provider: string) => void;
  onImageModelChange: (model: string) => void;
  onLocalExport: () => void;
  onLocalImport: () => void;
  onOpenHelp: () => void;
  onSideNavigate: (step: number) => void;
  onOpenWorkflowStep1: () => void;
  onOpenWorkflowStep2: () => void;
  onOpenWorkflowStep3: () => void;
  onOpenWorkflowStep4: () => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  handleLoadLocalSession: (e: React.ChangeEvent<HTMLInputElement>) => void;
  
  // App state for session manager
  currentState: any;
  onLoadState: (state: any) => void;
  onNewSession: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  topic,
  sessionTitle,
  onSessionTitleChange,
  isAdvancedMode,
  onToggleAdvancedMode,
  isSidebarOpen,
  setIsSidebarOpen,
  currentProvider,
  currentModel,
  onProviderChange,
  onModelChange,
  audioProvider,
  audioModel,
  onAudioProviderChange,
  onAudioModelChange,
  imageProvider,
  imageModel,
  onImageProviderChange,
  onImageModelChange,
  onLocalExport,
  onLocalImport,
  onOpenHelp,
  onSideNavigate,
  onOpenWorkflowStep1,
  onOpenWorkflowStep2,
  onOpenWorkflowStep3,
  onOpenWorkflowStep4,
  fileInputRef,
  handleLoadLocalSession,
  currentState,
  onLoadState,
  onNewSession
}) => {
  return (
    <div className="mb-4 flex flex-col items-center gap-3 relative">
      <Sidebar 
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        currentProvider={currentProvider}
        currentModel={currentModel}
        onProviderChange={onProviderChange}
        onModelChange={onModelChange}
        audioProvider={audioProvider}
        audioModel={audioModel}
        onAudioProviderChange={onAudioProviderChange}
        onAudioModelChange={onAudioModelChange}
        imageProvider={imageProvider}
        imageModel={imageModel}
        onImageProviderChange={onImageProviderChange}
        onImageModelChange={onImageModelChange}
        onLocalExport={onLocalExport}
        onLocalImport={onLocalImport}
        sessionManagerNode={
          <SessionManager 
            currentState={currentState} 
            onLoadState={onLoadState} 
            onNewSession={onNewSession} 
            sessionTitle={sessionTitle}
            onSessionTitleChange={onSessionTitleChange}
            isSidebar={true}
          />
        }
        onOpenHelp={onOpenHelp}
        onSideNavigate={onSideNavigate}
        onOpenWorkflowStep1={onOpenWorkflowStep1}
        onOpenWorkflowStep2={onOpenWorkflowStep2}
        onOpenWorkflowStep3={onOpenWorkflowStep3}
        onOpenWorkflowStep4={onOpenWorkflowStep4}
      />
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleLoadLocalSession} 
        className="hidden" 
        accept=".json"
      />

      <div className="text-center">
        <motion.h1 
          initial={{ opacity: 0, scale: 0.98, filter: 'blur(8px)', backgroundPosition: '200% 0%' }}
          animate={{ 
            opacity: 1, 
            scale: 1,
            filter: 'blur(0px)',
            backgroundPosition: ['150% 0%', '-150% 0%']
          }}
          transition={{ 
            opacity: { duration: 1.2 },
            scale: { duration: 1.2 },
            backgroundPosition: { 
              duration: 8, 
              repeat: Infinity, 
              ease: "linear",
              repeatDelay: 2
            },
            ease: [0.23, 1, 0.32, 1] 
          }}
          style={{ 
            backgroundImage: 'linear-gradient(110deg, #cbd5e1 30%, #f8fafc 45%, #ffffff 50%, #f8fafc 55%, #cbd5e1 70%)',
            backgroundSize: '200% 100%',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text'
          }}
          className="text-4xl md:text-5xl font-black tracking-tighter text-transparent cursor-default drop-shadow-[0_2px_10px_rgba(255,255,255,0.1)] py-4 select-none"
        >
          Gemini Creator Studio
        </motion.h1>
        <div className="mt-3 flex items-center justify-center gap-3">
          <input
            type="text"
            value={sessionTitle}
            onChange={(e) => onSessionTitleChange(e.target.value)}
            placeholder={topic ? topic.substring(0, 30) + "..." : "Untitled Session"}
            className="bg-[#161b22]/80 border border-gray-700/50 rounded-lg px-3 py-1.5 text-sm text-center text-gray-300 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all w-64 placeholder-gray-600"
            title="Session Title"
          />
          <button
            onClick={onToggleAdvancedMode}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border ${
              isAdvancedMode 
                ? 'bg-amber-900/40 text-amber-400 border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.2)]' 
                : 'bg-gray-800/50 text-gray-500 border-gray-700 hover:text-gray-300 hover:bg-gray-800'
            }`}
            title="Toggle Advanced AI Instructions Control"
          >
            <div className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${isAdvancedMode ? 'bg-amber-400 animate-pulse' : 'bg-gray-600'}`} />
              Advanced Control
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { Menu, X, Download, Upload, Cloud, Copy, LogIn, LogOut, Info, Settings, Database, User, Trash2, Mic, Image as ImageIcon, BookOpen, Layers } from 'lucide-react';
import { ProviderModelSelector, clearModelCache } from '@/components/sidebar/ProviderModelSelector';
import { Step } from '@/types';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  // Core
  currentProvider: string;
  currentModel: string;
  onProviderChange: (providerId: string) => void;
  onModelChange: (modelId: string) => void;
  
  // Audio
  audioProvider: string;
  audioModel: string;
  onAudioProviderChange: (providerId: string) => void;
  onAudioModelChange: (modelId: string) => void;

  // Image
  imageProvider: string;
  imageModel: string;
  onImageProviderChange: (providerId: string) => void;
  onImageModelChange: (modelId: string) => void;

  // Navigation
  onSideNavigate: (step: Step) => void;
  onOpenWorkflowStep1: () => void;
  onOpenWorkflowStep2: () => void;
  onOpenWorkflowStep3: () => void;
  onOpenWorkflowStep4: () => void;

  // Local
  onLocalExport: () => void;
  onLocalImport: () => void;
  
  // Account (SessionManager handles this, but we can pass a children prop or specific props)
  sessionManagerNode: React.ReactNode;
  
  // Info
  onOpenHelp: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  setIsOpen,
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
  onSideNavigate,
  onOpenWorkflowStep1,
  onOpenWorkflowStep2,
  onOpenWorkflowStep3,
  onOpenWorkflowStep4,
  onLocalExport,
  onLocalImport,
  sessionManagerNode,
  onOpenHelp
}) => {
  return (
    <>
      {/* Hamburger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-4 left-4 z-40 p-2 bg-[#161b22]/80 backdrop-blur-md border border-gray-700/50 rounded-lg text-white hover:bg-gray-800 transition-colors shadow-lg"
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-md z-50 transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div 
        className={`fixed top-0 left-0 h-full w-80 bg-[#0d1117] border-r border-gray-800 z-50 transform transition-transform duration-300 ease-in-out flex flex-col shadow-[10px_0_30px_rgba(0,0,0,0.5),inset_-1px_0_0_rgba(255,255,255,0.05)] ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-gradient-to-r from-gray-900/50 to-transparent">
          <h2 className="text-lg font-black text-white flex items-center gap-2 tracking-tight">
            <Menu className="w-5 h-5 text-indigo-500" />
            MENU
          </h2>
          <button 
            onClick={() => setIsOpen(false)}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all active:scale-90"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
          
          {/* Core Section */}
          <div className="space-y-3 group/section">
            <h3 className="text-xs font-black text-gray-500 group-hover/section:text-indigo-400 uppercase tracking-widest flex items-center gap-2 transition-colors">
              <Settings className="w-4 h-4 text-indigo-400/70 group-hover/section:text-indigo-400" />
              Core
            </h3>
            <div className="flex flex-col gap-2">
              <ProviderModelSelector 
                currentProvider={currentProvider}
                currentModel={currentModel}
                onProviderChange={onProviderChange}
                onModelChange={onModelChange}
                isSidebar={true}
                tagLabel="Core AI"
                storageKeyPrefix="core"
              />
            </div>
          </div>
          
          <div className="h-[3px] w-full bg-gradient-to-r from-transparent via-indigo-500/60 to-transparent my-4 relative overflow-hidden rounded-full">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-300/40 to-transparent animate-shimmer" />
          </div>

          {/* Audio Section */}
          <div className="space-y-3 group/section">
            <h3 className="text-xs font-black text-gray-500 group-hover/section:text-pink-400 uppercase tracking-widest flex items-center gap-2 transition-colors">
              <Mic className="w-4 h-4 text-pink-400/70 group-hover/section:text-pink-400" />
              Audio Generation
            </h3>
            <div className="flex flex-col gap-2">
              <ProviderModelSelector 
                currentProvider={audioProvider}
                currentModel={audioModel}
                onProviderChange={onAudioProviderChange}
                onModelChange={onAudioModelChange}
                isSidebar={true}
                tagLabel="Default"
                storageKeyPrefix="audio"
              />
            </div>
          </div>

          <div className="h-[3px] w-full bg-gradient-to-r from-transparent via-indigo-500/60 to-transparent my-4 relative overflow-hidden rounded-full">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-300/40 to-transparent animate-shimmer" />
          </div>

          {/* Image Section */}
          <div className="space-y-3 group/section">
            <h3 className="text-xs font-black text-gray-500 group-hover/section:text-blue-400 uppercase tracking-widest flex items-center gap-2 transition-colors">
              <ImageIcon className="w-4 h-4 text-blue-400/70 group-hover/section:text-blue-400" />
              Image Generator
            </h3>
            <div className="flex flex-col gap-2">
              <ProviderModelSelector 
                currentProvider={imageProvider}
                currentModel={imageModel}
                onProviderChange={onImageProviderChange}
                onModelChange={onImageModelChange}
                isSidebar={true}
                tagLabel="Default"
                storageKeyPrefix="image"
              />
            </div>
          </div>

          <div className="h-[3px] w-full bg-gradient-to-r from-transparent via-indigo-500/60 to-transparent my-4 relative overflow-hidden rounded-full">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-300/40 to-transparent animate-shimmer" />
          </div>

          {/* Local Section */}
          <div className="space-y-3 group/section">
            <h3 className="text-xs font-black text-gray-500 group-hover/section:text-emerald-400 uppercase tracking-widest flex items-center gap-2 transition-colors">
              <Database className="w-4 h-4 text-emerald-400/70 group-hover/section:text-emerald-400" />
              Local
            </h3>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => { onLocalExport(); setIsOpen(false); }}
                className="flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-800/50 hover:shadow-[0_0_15px_rgba(16,185,129,0.1)] rounded-lg transition-all w-full text-left group"
              >
                <Upload className="w-4 h-4 group-hover:text-emerald-400 transition-colors" />
                Local Export
              </button>
              <button
                onClick={() => { onLocalImport(); setIsOpen(false); }}
                className="flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-800/50 hover:shadow-[0_0_15px_rgba(16,185,129,0.1)] rounded-lg transition-all w-full text-left group"
              >
                <Download className="w-4 h-4 group-hover:text-emerald-400 transition-colors" />
                Local Import
              </button>
            </div>
          </div>

          <div className="h-[3px] w-full bg-gradient-to-r from-transparent via-indigo-500/60 to-transparent my-4 relative overflow-hidden rounded-full">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-300/40 to-transparent animate-shimmer" />
          </div>

          {/* Account Section */}
          <div className="space-y-3 group/section">
            <h3 className="text-xs font-black text-gray-500 group-hover/section:text-purple-400 uppercase tracking-widest flex items-center gap-2 transition-colors">
              <User className="w-4 h-4 text-purple-400/70 group-hover/section:text-purple-400" />
              Account
            </h3>
            <div className="flex flex-col gap-2">
              {sessionManagerNode}
            </div>
          </div>

          <div className="h-[3px] w-full bg-gradient-to-r from-transparent via-indigo-500/60 to-transparent my-4 relative overflow-hidden rounded-full">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-300/40 to-transparent animate-shimmer" />
          </div>

          {/* Info Section */}
          <div className="space-y-3 group/section">
            <h3 className="text-xs font-black text-gray-500 group-hover/section:text-cyan-400 uppercase tracking-widest flex items-center gap-2 transition-colors">
              <Info className="w-4 h-4 text-cyan-400/70 group-hover/section:text-cyan-400" />
              Info
            </h3>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => { onOpenHelp(); setIsOpen(false); }}
                className="flex items-center gap-3 px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-800/50 hover:shadow-[0_0_15px_rgba(34,211,238,0.1)] rounded-lg transition-all w-full text-left group"
              >
                <Info className="w-4 h-4 group-hover:text-cyan-400 transition-colors" />
                About (?)
              </button>
            </div>
          </div>

          <div className="h-[3px] w-full bg-gradient-to-r from-transparent via-indigo-500/60 to-transparent my-4 relative overflow-hidden rounded-full">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-300/40 to-transparent animate-shimmer" />
          </div>

          {/* Workflow Navigation Section */}
          <div className="space-y-3 group/section">
            <h3 className="text-xs font-black text-gray-500 group-hover/section:text-fuchsia-400 uppercase tracking-widest flex items-center gap-2 transition-colors">
              <Layers className="w-4 h-4 text-fuchsia-400/70 group-hover/section:text-fuchsia-400" />
              Workflow
            </h3>
            <div className="flex flex-col gap-1">
              <button onClick={() => { onOpenWorkflowStep1(); setIsOpen(false); }} className="flex items-center gap-3 px-3 py-2 text-sm text-indigo-300 hover:text-white hover:bg-indigo-900/40 rounded-lg transition-all w-full text-left"><BookOpen className="w-4 h-4 text-indigo-400" /> Step 1: Script Lab</button>
              <button onClick={() => { onOpenWorkflowStep2(); setIsOpen(false); }} className="flex items-center gap-3 px-3 py-2 text-sm text-violet-300 hover:text-white hover:bg-violet-900/40 rounded-lg transition-all w-full text-left"><Mic className="w-4 h-4 text-violet-400" /> Step 2: Audio</button>
              <button onClick={() => { onOpenWorkflowStep3(); setIsOpen(false); }} className="flex items-center gap-3 px-3 py-2 text-sm text-fuchsia-300 hover:text-white hover:bg-fuchsia-900/40 rounded-lg transition-all w-full text-left"><ImageIcon className="w-4 h-4 text-fuchsia-400" /> Step 3: Visuals</button>
              <button onClick={() => { onOpenWorkflowStep4(); setIsOpen(false); }} className="flex items-center gap-3 px-3 py-2 text-sm text-pink-300 hover:text-white hover:bg-pink-900/40 rounded-lg transition-all w-full text-left"><Settings className="w-4 h-4 text-pink-400" /> Step 4: SEO</button>
            </div>
          </div>

        </div>
      </div>
    </>
  );
};

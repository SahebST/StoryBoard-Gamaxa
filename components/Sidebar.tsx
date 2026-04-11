import React, { useState } from 'react';
import { Menu, X, Download, Upload, Cloud, Copy, LogIn, LogOut, Info, Settings, Database, User, Trash2 } from 'lucide-react';
import { ProviderModelSelector, clearModelCache } from './ProviderModelSelector';

interface SidebarProps {
  // Core
  currentProvider: string;
  currentModel: string;
  onProviderChange: (providerId: string) => void;
  onModelChange: (modelId: string) => void;
  
  // Local
  onLocalExport: () => void;
  onLocalImport: () => void;
  
  // Account (SessionManager handles this, but we can pass a children prop or specific props)
  sessionManagerNode: React.ReactNode;
  
  // Info
  onOpenHelp: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentProvider,
  currentModel,
  onProviderChange,
  onModelChange,
  onLocalExport,
  onLocalImport,
  sessionManagerNode,
  onOpenHelp
}) => {
  const [isOpen, setIsOpen] = useState(false);

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
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div 
        className={`fixed top-0 left-0 h-full w-80 bg-[#0d1117] border-r border-gray-800 z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Menu className="w-5 h-5" />
            MENU
          </h2>
          <button 
            onClick={() => setIsOpen(false)}
            className="p-1 text-gray-400 hover:text-white hover:bg-gray-800 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
          
          {/* Core Section */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
              <Settings className="w-4 h-4 text-indigo-400" />
              Core
            </h3>
            <div className="flex flex-col gap-2">
              <ProviderModelSelector 
                currentProvider={currentProvider}
                currentModel={currentModel}
                onProviderChange={onProviderChange}
                onModelChange={onModelChange}
                isSidebar={true}
              />
            </div>
          </div>

          <hr className="border-gray-800" />

          {/* Local Section */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-400" />
              Local
            </h3>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => { onLocalExport(); setIsOpen(false); }}
                className="flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors w-full text-left"
              >
                <Upload className="w-4 h-4" />
                Local Export
              </button>
              <button
                onClick={() => { onLocalImport(); setIsOpen(false); }}
                className="flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors w-full text-left"
              >
                <Download className="w-4 h-4" />
                Local Import
              </button>
            </div>
          </div>

          <hr className="border-gray-800" />

          {/* Account Section */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
              <User className="w-4 h-4 text-purple-400" />
              Account
            </h3>
            <div className="flex flex-col gap-2">
              {sessionManagerNode}
            </div>
          </div>

          <hr className="border-gray-800" />

          {/* Info Section */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
              <Info className="w-4 h-4 text-cyan-400" />
              Info
            </h3>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => { onOpenHelp(); setIsOpen(false); }}
                className="flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors w-full text-left"
              >
                <Info className="w-4 h-4" />
                About (?)
              </button>
            </div>
          </div>

        </div>
      </div>
    </>
  );
};

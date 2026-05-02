import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, BookOpen, Layers, Mic, Image as ImageIcon, Settings } from 'lucide-react';

export type WorkflowTheme = 'indigo' | 'violet' | 'fuchsia' | 'pink';

interface WorkflowDocModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOk: () => void;
  title: string;
  content: React.ReactNode;
  themeColor: WorkflowTheme;
}

const THEME_MAP: Record<WorkflowTheme, { text: string; bgSoft: string; border: string; btn: string; shadow: string; icon: React.ElementType }> = {
  indigo: {
    text: 'text-indigo-400',
    bgSoft: 'bg-indigo-500/20',
    border: 'border-indigo-500/30',
    btn: 'bg-indigo-600 hover:bg-indigo-500',
    shadow: 'shadow-indigo-500/20',
    icon: BookOpen
  },
  violet: {
    text: 'text-violet-400',
    bgSoft: 'bg-violet-500/20',
    border: 'border-violet-500/30',
    btn: 'bg-violet-600 hover:bg-violet-500',
    shadow: 'shadow-violet-500/20',
    icon: Mic
  },
  fuchsia: {
    text: 'text-fuchsia-400',
    bgSoft: 'bg-fuchsia-500/20',
    border: 'border-fuchsia-500/30',
    btn: 'bg-fuchsia-600 hover:bg-fuchsia-500',
    shadow: 'shadow-fuchsia-500/20',
    icon: ImageIcon
  },
  pink: {
    text: 'text-pink-400',
    bgSoft: 'bg-pink-500/20',
    border: 'border-pink-500/30',
    btn: 'bg-pink-600 hover:bg-pink-500',
    shadow: 'shadow-pink-500/20',
    icon: Settings
  }
};

export const WorkflowDocModal: React.FC<WorkflowDocModalProps> = ({ isOpen, onClose, onOk, title, content, themeColor }) => {
  const theme = THEME_MAP[themeColor] || THEME_MAP.indigo;
  const Icon = theme.icon;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className={`relative w-full max-w-4xl max-h-[90vh] bg-[#0d162a]/40 backdrop-blur-3xl border ${theme.border} rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col`}
          >
            <div className={`flex items-center justify-between p-6 border-b border-white/5 bg-white/5`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${theme.bgSoft}`}>
                  <Icon className={`w-6 h-6 ${theme.text}`} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Workflow Guide: {title}</h2>
                  <p className="text-xs text-gray-400 uppercase tracking-widest mt-0.5">Gemini Creator Studio Step Documentation</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 custom-scrollbar text-gray-200">
              {content}
            </div>

            <div className={`p-6 border-t border-white/5 bg-white/5 flex justify-end`}>
              <button 
                onClick={onOk}
                className={`px-6 py-2 ${theme.btn} text-white text-xs font-bold rounded-lg transition-all shadow-lg ${theme.shadow}`}
              >
                OK
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

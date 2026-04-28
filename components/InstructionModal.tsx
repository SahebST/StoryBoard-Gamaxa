import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, X, RotateCcw, Save } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  instruction: string;
  onInstructionChange: (val: string) => void;
  defaultInstruction: string;
}

export const InstructionModal: React.FC<Props> = ({ isOpen, onClose, title, instruction, onInstructionChange, defaultInstruction }) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Subtle backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/20 backdrop-blur-sm pointer-events-auto"
            onClick={onClose}
          />

          {/* Floating Drawer / Window */}
          <motion.div 
            initial={{ x: '100%', opacity: 0, scale: 0.95 }}
            animate={{ x: 0, opacity: 1, scale: 1 }}
            exit={{ x: '100%', opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-4 bottom-4 right-4 z-[101] w-[500px] max-w-[calc(100vw-32px)] bg-[#0d1117]/95 backdrop-blur-2xl border border-amber-500/30 rounded-2xl shadow-2xl shadow-amber-900/20 flex flex-col overflow-hidden pointer-events-auto"
          >
            {/* Header */}
            <div className="p-5 border-b border-gray-800 flex justify-between items-center bg-gradient-to-r from-amber-500/10 to-transparent">
              <h3 className="text-amber-500 font-bold uppercase tracking-widest text-sm flex items-center gap-2">
                <Settings className="w-4 h-4" />
                {title} Configuration
              </h3>
              <button 
                onClick={onClose} 
                className="text-gray-500 hover:text-white transition-colors p-1.5 hover:bg-gray-800 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-5 flex flex-col gap-4">
              <div className="bg-[#161b22] border border-gray-800 rounded-xl p-4">
                <p className="text-xs text-gray-400 leading-relaxed font-medium">
                  Modify the underlying system prompt for this AI feature. Leave empty or reset to default if you encounter errors.
                </p>
              </div>

              <div className="flex-1 flex flex-col relative min-h-[300px]">
                <textarea
                  value={instruction}
                  onChange={(e) => onInstructionChange(e.target.value)}
                  className="absolute inset-0 w-full h-full bg-[#161b22] border border-gray-800 rounded-xl p-5 text-[13px] text-amber-100/90 font-mono focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 transition-all custom-scrollbar resize-none leading-relaxed"
                  placeholder="Enter AI instructions here..."
                  spellCheck="false"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-gray-800 bg-[#0d1117] flex justify-between items-center gap-4">
              <button 
                onClick={() => onInstructionChange(defaultInstruction)}
                className="text-xs text-gray-400 hover:text-amber-400 transition-colors flex items-center gap-1.5 font-medium px-3 py-2 rounded-lg hover:bg-gray-800"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Default
              </button>
              <button 
                onClick={onClose}
                className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-amber-900/20 flex items-center gap-2 active:scale-95"
              >
                <Save className="w-4 h-4" />
                Save & Close
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
};

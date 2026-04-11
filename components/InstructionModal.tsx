import React from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  instruction: string;
  onInstructionChange: (val: string) => void;
  defaultInstruction: string;
}

export const InstructionModal: React.FC<Props> = ({ isOpen, onClose, title, instruction, onInstructionChange, defaultInstruction }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-[#161b22] border border-amber-500/50 rounded-xl w-full max-w-3xl shadow-2xl shadow-amber-900/20 flex flex-col overflow-hidden animate-slide-up">
        <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-[#0d1117]">
          <h3 className="text-amber-500 font-bold uppercase tracking-widest text-sm flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            Advanced AI Instructions: {title}
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="p-4 bg-[#0d1117]">
          <p className="text-xs text-gray-400 mb-3">
            Modify the underlying system prompt for this AI feature. Leave empty or reset to default if you encounter errors.
          </p>
          <textarea
            value={instruction}
            onChange={(e) => onInstructionChange(e.target.value)}
            className="w-full h-80 bg-[#161b22] border border-gray-700 rounded-lg p-4 text-sm text-amber-100/80 font-mono focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 transition-all custom-scrollbar resize-none"
            placeholder="Enter AI instructions here..."
            spellCheck="false"
          />
        </div>
        <div className="p-4 border-t border-gray-800 bg-[#0d1117] flex justify-between items-center">
          <button 
            onClick={() => onInstructionChange(defaultInstruction)}
            className="text-xs text-gray-500 hover:text-amber-400 transition-colors underline"
          >
            Reset to Default
          </button>
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-all shadow-lg shadow-amber-900/20"
          >
            Save & Close
          </button>
        </div>
      </div>
    </div>
  );
};

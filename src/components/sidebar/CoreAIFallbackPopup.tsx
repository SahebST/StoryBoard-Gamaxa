import React from 'react';

interface Props {
  modelName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const CoreAIFallbackPopup: React.FC<Props> = ({ modelName, onConfirm, onCancel }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#161b22] border border-gray-700 rounded-xl p-6 shadow-2xl w-80 animate-in zoom-in-95 duration-200">
        <h3 className="text-sm font-bold text-white mb-2">Task Failed</h3>
        <p className="text-xs text-gray-400 mb-4">The selected AI model failed to execute the task. Would you like to retry using your Core AI model?</p>
        <div className="flex gap-2">
          <button 
            onClick={onCancel}
            className="flex-1 px-3 py-2 text-xs font-bold text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={onConfirm}
            className="flex-1 px-3 py-2 text-xs font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-all"
          >
            Run with {modelName}
          </button>
        </div>
      </div>
    </div>
  );
};

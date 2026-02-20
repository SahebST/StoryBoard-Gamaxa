
import React from 'react';

interface Props {
  status: string;
  isGlobal?: boolean;
  onStop?: () => void;
}

export const AutonomousStatusBar: React.FC<Props> = ({ status, isGlobal = false, onStop }) => {
  if (!status) return null;

  return (
    <div className={`${isGlobal ? 'fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-2xl' : 'w-full mb-6'}`}>
      <div className="bg-[#1F2937] border border-amber-500/50 rounded-xl p-4 shadow-2xl shadow-amber-900/40 relative overflow-hidden backdrop-blur-md">
        
        {/* Animated Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-amber-900/20 via-orange-900/20 to-amber-900/20 animate-pulse"></div>
        
        <div className="relative z-10 flex items-center gap-4">
           {/* Spinner */}
           <div className="relative w-5 h-5 shrink-0">
              <div className="absolute inset-0 border-2 border-amber-500/30 rounded-full"></div>
              <div className="absolute inset-0 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
           </div>

           {/* Text */}
           <div className="flex-1">
             <p className="text-sm font-bold text-amber-100 tracking-wide animate-pulse">
               {status}
             </p>
           </div>

           {/* Stop Button */}
           {onStop && (
             <button 
               onClick={onStop}
               className="px-3 py-1 bg-red-900/50 hover:bg-red-900/80 border border-red-500/50 text-red-200 text-xs font-bold rounded uppercase tracking-wider transition-all flex items-center gap-1.5"
             >
               <div className="w-2 h-2 bg-red-500 rounded-sm"></div>
               Stop
             </button>
           )}
        </div>

        {/* Progress Bar Line */}
        <div className="absolute bottom-0 left-0 w-full h-1 bg-gray-800">
           <div className="h-full bg-gradient-to-r from-amber-500 to-orange-500 w-1/3 animate-[progress_2s_ease-in-out_infinite]"></div>
        </div>
      </div>
      <style>{`
        @keyframes progress {
          0% { width: 0%; margin-left: 0; }
          50% { width: 50%; margin-left: 25%; }
          100% { width: 0%; margin-left: 100%; }
        }
      `}</style>
    </div>
  );
};

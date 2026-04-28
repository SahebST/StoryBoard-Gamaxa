
import React from 'react';
import { motion } from 'motion/react';
import { Step } from '../types';
import { ChevronRight } from 'lucide-react';

interface StepIndicatorProps {
  currentStep: Step;
  onStepClick: (step: Step) => void;
  isAutonomousMode?: boolean;
}

const steps = [
  { id: Step.Settings, label: "Script Lab", color: "#6366f1", glow: "rgba(99, 102, 241, 0.5)" },
  { id: Step.ScriptAudio, label: "Audio", color: "#8b5cf6", glow: "rgba(139, 92, 246, 0.5)" },
  { id: Step.Images, label: "Visuals", color: "#d946ef", glow: "rgba(217, 70, 239, 0.5)" },
  { id: Step.SEO, label: "SEO", color: "#ec4899", glow: "rgba(236, 72, 153, 0.5)" },
];

export const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep, onStepClick, isAutonomousMode = false }) => {
  return (
    <div className="w-full mb-8 relative group">
      
      <div className="relative bg-[#161b22]/80 backdrop-blur-md rounded-2xl p-4 overflow-x-auto custom-scrollbar border border-gray-800 shadow-xl">
        <div className="flex justify-between items-start relative min-w-[320px] px-2 pb-6">
          {steps.map((s, index) => {
            const isActive = s.id === currentStep;
            const isCompleted = s.id < currentStep;
            const stepColor = isAutonomousMode ? '#f59e0b' : s.color;
            const stepGlow = isAutonomousMode ? 'rgba(245, 158, 11, 0.5)' : s.glow;
            
            return (
              <React.Fragment key={s.id}>
                <button
                  onClick={() => onStepClick(s.id)}
                  disabled={isAutonomousMode}
                  className={`flex flex-col items-center group focus:outline-none relative z-10 ${isAutonomousMode ? 'cursor-default' : 'cursor-pointer'}`}
                >
                  <motion.div 
                    initial={false}
                    animate={{
                      scale: isActive ? [1.15, 1.2, 1.15] : 1,
                      backgroundColor: isActive || isCompleted ? stepColor : '#1f2937',
                      borderColor: isActive || isCompleted ? stepColor : '#374151',
                      boxShadow: isActive ? `0 0 25px ${stepGlow}` : '0 0 0px transparent'
                    }}
                    transition={{
                      scale: isActive ? { repeat: Infinity, duration: 2 } : { duration: 0.3 }
                    }}
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-black border-2 transition-all duration-300
                    ${isActive || isCompleted ? 'text-white' : 'text-gray-500 hover:border-gray-500'}
                    `}
                  >
                    {isCompleted ? '✓' : s.id}
                  </motion.div>
                  <span 
                    className={`absolute top-11 text-[10px] font-black transition-all duration-300 whitespace-nowrap uppercase tracking-widest ${isActive ? 'opacity-100 translate-y-0' : 'opacity-50 -translate-y-1'}`}
                    style={{ color: isActive ? stepColor : '#6b7280' }}
                  >
                    {s.label}
                  </span>
                </button>

                {index < steps.length - 1 && (
                  <div className="flex-1 flex items-center justify-center h-9 px-1 relative z-0">
                    {/* Gradient Line */}
                    <div className="h-[6px] w-full relative overflow-hidden rounded-full bg-gray-800/50 shadow-[inset_0_1px_3px_rgba(0,0,0,0.4)]">
                      <motion.div 
                        initial={false}
                        animate={{
                          width: isCompleted ? '100%' : '0%',
                          background: `linear-gradient(to right, ${steps[index].color}, ${steps[index+1].color})`
                        }}
                        className="absolute inset-0 transition-all duration-700 ease-in-out"
                      />
                      {/* Sequential flowing shimmer effect */}
                      <motion.div 
                        initial={{ x: '-100%' }}
                        animate={{ x: '100%' }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          repeatDelay: 3.0, // (3 lines - 1) * 1.5
                          delay: index * 1.5,
                          ease: "linear"
                        }}
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-50" 
                      />
                    </div>
                    {/* Static Arrow */}
                    <div
                      className="absolute transition-all duration-300"
                      style={{ 
                        color: isCompleted ? steps[index+1].color : '#4b5563',
                        opacity: isActive || isCompleted ? 1 : 0.3,
                        transform: isActive ? 'scale(1.2)' : 'scale(1)'
                      }}
                    >
                      <ChevronRight className="w-5 h-5 drop-shadow-[0_0_8px_currentColor]" />
                    </div>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};

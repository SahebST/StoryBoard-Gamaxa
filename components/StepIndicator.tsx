
import React from 'react';
import { Step } from '../types';

interface StepIndicatorProps {
  currentStep: Step;
  onStepClick: (step: Step) => void;
  isAutonomousMode?: boolean;
}

const steps = [
  { id: Step.Settings, label: "Script Lab" },
  { id: Step.ScriptAudio, label: "Audio" },
  { id: Step.Images, label: "Visuals" },
  { id: Step.SEO, label: "SEO" },
];

export const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep, onStepClick, isAutonomousMode = false }) => {
  const activeColor = isAutonomousMode ? 'bg-amber-500 border-amber-400' : 'bg-indigo-600 border-indigo-400';
  const activeText = isAutonomousMode ? 'text-amber-400' : 'text-indigo-400';
  const completedColor = isAutonomousMode ? 'bg-amber-700 border-amber-600' : 'bg-green-600 border-green-400';

  return (
    <div className="w-full mb-8 overflow-x-auto custom-scrollbar pb-2">
      <div className="flex justify-between relative min-w-[320px] px-2">
        <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-700 -z-10 -translate-y-1/2 rounded"></div>
        {steps.map((s) => {
          const isActive = s.id === currentStep;
          const isCompleted = s.id < currentStep;
          
          return (
            <button
              key={s.id}
              onClick={() => onStepClick(s.id)}
              disabled={isAutonomousMode}
              className={`flex flex-col items-center group focus:outline-none ${isAutonomousMode ? 'cursor-default' : 'cursor-pointer'}`}
            >
              <div 
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all duration-300
                ${isActive ? `${activeColor} text-white scale-110 shadow-lg` : 
                  isCompleted ? `${completedColor} text-white` : 'bg-gray-800 border-gray-600 text-gray-400'}
                `}
              >
                {isCompleted ? '✓' : s.id}
              </div>
              <span className={`mt-2 text-xs font-medium transition-colors duration-300 ${isActive ? activeText : 'text-gray-500'}`}>
                {s.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

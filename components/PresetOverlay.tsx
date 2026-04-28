import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, Save, Trash2, FolderOpen, Plus, Loader2, Check } from 'lucide-react';
import { Preset, savePresetToFirebase, listUserPresets, deletePresetFromFirebase } from '../services/presetService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentInstructions: Record<string, string>;
  onApplyPreset: (instructions: Record<string, string>) => void;
}

export const PresetOverlay: React.FC<Props> = ({ isOpen, onClose, currentInstructions, onApplyPreset }) => {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadPresets();
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  const loadPresets = async () => {
    setLoading(true);
    try {
      const data = await listUserPresets();
      const filtered = data.filter(p => {
        try {
          const parsed = JSON.parse(p.instructions);
          return parsed && typeof parsed === 'object' && ('ALL' in parsed || 'STAGE 1' in parsed);
        } catch {
          return false;
        }
      });
      setPresets(filtered);
    } catch (err) {
      console.error("Failed to load presets", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!presetName.trim()) {
      setError("Please enter a name for the preset");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const instructionsJson = JSON.stringify(currentInstructions);
      const newPreset = await savePresetToFirebase(presetName, instructionsJson);
      setPresets(prev => [newPreset, ...prev]);
      setPresetName("");
      setSuccess("Preset saved successfully!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to save preset");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this preset?")) return;
    try {
      await deletePresetFromFirebase(id);
      setPresets(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      console.error("Failed to delete preset", err);
    }
  };

  const handleApply = (preset: Preset) => {
    try {
      const parsed = JSON.parse(preset.instructions);
      onApplyPreset(parsed);
      onClose();
    } catch (err) {
      console.error("Failed to parse preset", err);
      setError("This preset seems to be corrupted.");
    }
  };

  const overlay = (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />
          
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-md bg-[#0d1117] border border-gray-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
          >
            {/* Header */}
            <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gradient-to-r from-indigo-500/10 to-transparent">
              <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                <FolderOpen className="w-4 h-4" />
                AI Direction Presets
              </h3>
              <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Save New Section */}
            <div className="p-4 bg-indigo-500/5 border-b border-gray-800">
              <div className="flex flex-col gap-3">
                 <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={presetName}
                      onChange={(e) => setPresetName(e.target.value)}
                      placeholder="New Preset Name..."
                      className="flex-1 bg-black/40 border border-gray-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                    <button 
                      onClick={handleSave}
                      disabled={saving || !presetName.trim()}
                      className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white p-2 rounded-lg transition-all flex items-center justify-center min-w-[40px]"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    </button>
                 </div>
                 {error && <p className="text-[10px] text-red-400 font-medium px-1">{error}</p>}
                 {success && <p className="text-[10px] text-emerald-400 font-medium px-1 flex items-center gap-1"><Check className="w-3 h-3" /> {success}</p>}
              </div>
            </div>

            {/* List Section */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-2">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-10 gap-3">
                  <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                  <span className="text-xs text-gray-500 font-medium">Loading presets...</span>
                </div>
              ) : presets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2 border-2 border-dashed border-gray-800 rounded-xl">
                  <FolderOpen className="w-8 h-8 text-gray-700" />
                  <span className="text-xs text-gray-500 font-medium">No direction presets found</span>
                  <p className="text-[10px] text-gray-600 px-6 text-center">Save your current instructions as a preset to reuse them later.</p>
                </div>
              ) : (
                presets.map((preset) => (
                  <div 
                    key={preset.id}
                    className="group flex items-center justify-between p-3 rounded-xl bg-[#161b22] border border-gray-800 hover:border-indigo-500/50 transition-all cursor-pointer"
                    onClick={() => handleApply(preset)}
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-bold text-gray-200 group-hover:text-white transition-colors">{preset.name}</span>
                      <span className="text-[10px] text-gray-500 font-mono italic">
                        {new Date(preset.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 transition-opacity">
                       <button 
                         onClick={(e) => { 
                           e.stopPropagation(); 
                           e.preventDefault();
                           handleDelete(preset.id); 
                         }}
                         className="p-1.5 hover:bg-red-500/10 text-gray-500 hover:text-red-400 rounded-lg transition-colors"
                       >
                         <Trash2 className="w-3.5 h-3.5" />
                       </button>
                       <div className="bg-indigo-600 text-white px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider">
                         Load
                       </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer info */}
            <div className="p-3 bg-[#0d1117] border-t border-gray-800">
               <p className="text-[9px] text-gray-600 text-center uppercase tracking-tight">
                 Presets save all 5 direction stages (ALL + STAGE 1-4)
               </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(overlay, document.body);
};


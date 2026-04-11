import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, Filter, SortAsc, Zap, Shield, DollarSign, Cpu, Check, X, AlertCircle, Star, FastForward, Maximize2, ChevronDown, Trash2, ChevronUp } from 'lucide-react';
import { fetchModels } from '../services/geminiService';
import { AIModel } from '../types';

export interface ProviderOption {
  id: string;
  name: string;
}

const PROVIDERS: ProviderOption[] = [
  { id: 'google', name: 'Google' },
  { id: 'openrouter', name: 'OpenRouter' },
  { id: 'groq', name: 'Groq' },
  { id: 'snova', name: 'SambaNova' },
  { id: 'deepseek', name: 'DeepSeek' },
  { id: 'huggingface', name: 'Hugging Face' }
];

interface Props {
  currentProvider: string;
  currentModel: string;
  onProviderChange: (providerId: string) => void;
  onModelChange: (modelId: string) => void;
  isSidebar?: boolean;
}

// Global cache for models
let modelCache: Record<string, AIModel[]> = {};

export const clearModelCache = () => {
  modelCache = {};
};

export const ProviderModelSelector: React.FC<Props> = ({
  currentProvider,
  currentModel,
  onProviderChange,
  onModelChange,
  isSidebar = false
}) => {
  const [isProviderOpen, setIsProviderOpen] = useState(false);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [availableModels, setAvailableModels] = useState<AIModel[]>(modelCache[currentProvider] || []);
  
  // Filters & Sorting
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterCost, setFilterCost] = useState<string>('all');
  const [filterPower, setFilterPower] = useState<string>('all');
  const [filterSpeed, setFilterSpeed] = useState<string>('all');
  const [minContext, setMinContext] = useState(0);
  const [selectedCapabilities, setSelectedCapabilities] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'smart' | 'context' | 'power' | 'speed' | 'cost'>('smart');
  const [showFilters, setShowFilters] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const providerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (providerRef.current && !providerRef.current.contains(event.target as Node)) {
        setIsProviderOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFetch = async (providerId: string = currentProvider) => {
    setIsLoadingModels(true);
    setFetchError(null);
    try {
      const models = await fetchModels(providerId);
      modelCache[providerId] = models;
      setAvailableModels(models);
    } catch (err: any) {
      setFetchError(err.message);
    } finally {
      setIsLoadingModels(false);
    }
  };

  const handleProviderSelect = (providerId: string) => {
    onProviderChange(providerId);
    setIsProviderOpen(false);
    if (modelCache[providerId]) {
      setAvailableModels(modelCache[providerId]);
    } else {
      setAvailableModels([]);
    }
  };

  const filteredAndSortedModels = useMemo(() => {
    let result = [...availableModels];

    if (search) {
      const s = search.toLowerCase();
      result = result.filter(m => m.name.toLowerCase().includes(s) || m.id.toLowerCase().includes(s));
    }

    if (filterType !== 'all') result = result.filter(m => m.type === filterType);
    if (filterCost !== 'all') result = result.filter(m => m.cost === filterCost);
    if (filterPower !== 'all') result = result.filter(m => m.power === filterPower);
    if (filterSpeed !== 'all') result = result.filter(m => m.speed === filterSpeed);
    if (minContext > 0) result = result.filter(m => m.context >= minContext);
    if (selectedCapabilities.length > 0) {
      result = result.filter(m => selectedCapabilities.every(c => m.capabilities.includes(c)));
    }

    result.sort((a, b) => {
      if (sortBy === 'smart') return b.score - a.score;
      if (sortBy === 'context') return b.context - a.context;
      if (sortBy === 'power') {
        const powerMap = { high: 3, medium: 2, low: 1 };
        return powerMap[b.power] - powerMap[a.power];
      }
      if (sortBy === 'speed') {
        const speedMap = { fast: 3, balanced: 2, slow: 1 };
        return speedMap[b.speed] - speedMap[a.speed];
      }
      if (sortBy === 'cost') {
        if (a.cost === b.cost) return b.score - a.score;
        return a.cost === 'free' ? -1 : 1;
      }
      return 0;
    });

    return result;
  }, [availableModels, search, filterType, filterCost, filterPower, filterSpeed, minContext, selectedCapabilities, sortBy]);

  const bestModels = useMemo(() => {
    if (filteredAndSortedModels.length === 0) return null;
    const bestOverall = filteredAndSortedModels[0];
    const bestFree = filteredAndSortedModels.find(m => m.cost === 'free');
    const fastest = [...filteredAndSortedModels].sort((a, b) => {
      const speedMap = { fast: 3, balanced: 2, slow: 1 };
      if (speedMap[b.speed] !== speedMap[a.speed]) return speedMap[b.speed] - speedMap[a.speed];
      return b.score - a.score;
    })[0];
    const bestLongContext = [...filteredAndSortedModels].sort((a, b) => b.context - a.context)[0];
    return { bestOverall, bestFree, fastest, bestLongContext };
  }, [filteredAndSortedModels]);

  const activeProvider = PROVIDERS.find(p => p.id === currentProvider) || PROVIDERS[0];
  const activeModelObj = availableModels.find(m => m.id === currentModel) || { id: currentModel, name: currentModel };

  return (
    <div className="space-y-4">
      {/* Provider Selector */}
      <div className="relative" ref={providerRef}>
        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">AI Provider</label>
        <button
          onClick={() => setIsProviderOpen(!isProviderOpen)}
          className="w-full bg-[#161b22] border border-gray-700 text-white p-2.5 rounded-xl flex justify-between items-center text-xs hover:border-gray-500 transition-all"
        >
          <span className="font-bold">{activeProvider.name}</span>
          <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isProviderOpen ? 'rotate-180' : ''}`} />
        </button>
        
        {isProviderOpen && (
          <div className="absolute w-full bg-[#161b22] border border-gray-700 rounded-xl shadow-2xl mt-1 z-50 overflow-hidden">
            <ul className="max-h-60 overflow-y-auto custom-scrollbar">
              {PROVIDERS.map(p => (
                <li
                  key={p.id}
                  onClick={() => handleProviderSelect(p.id)}
                  className={`p-3 text-xs cursor-pointer transition-colors flex items-center justify-between ${
                    currentProvider === p.id ? 'bg-indigo-500/10 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  {p.name}
                  {currentProvider === p.id && <Check className="w-3 h-3 text-indigo-500" />}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Fetch Button */}
      {!availableModels.length && !isLoadingModels && (
        <button
          onClick={() => handleFetch()}
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
        >
          <Zap className="w-4 h-4" />
          Fetch Models
        </button>
      )}

      {isLoadingModels && (
        <div className="w-full bg-gray-900/50 border border-gray-800 p-4 rounded-xl flex flex-col items-center justify-center gap-2">
          <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-[10px] text-gray-500 font-medium">Discovering models...</p>
        </div>
      )}

      {fetchError && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
          <p className="text-[10px] text-red-400 mb-2">{fetchError}</p>
          <button 
            onClick={() => handleFetch()}
            className="text-[10px] bg-red-500 text-white px-3 py-1 rounded-lg font-bold"
          >
            Retry
          </button>
        </div>
      )}

      {/* Discovery Engine UI (Visible after fetch) */}
      {availableModels.length > 0 && !isLoadingModels && (
        <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
          {/* Search & Filter Toggle & Actions */}
          <div className="flex gap-1.5 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500" />
              <input
                type="text"
                placeholder="Search models..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-[#0d1117] border border-gray-800 text-white text-[10px] pl-7 pr-2 py-1.5 rounded-lg focus:outline-none focus:border-indigo-500 transition-all"
              />
            </div>
            
            {/* Clear Cache Button (Sky Blue Box) */}
            <button
              onClick={() => { clearModelCache(); alert('Model cache cleared!'); }}
              title="Clear Model Cache"
              className="p-1.5 rounded-lg border border-sky-500/30 bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>

            {/* Collapse/Expand Button (Yellow Area) */}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              title={isCollapsed ? "Expand List" : "Collapse List"}
              className={`p-1.5 rounded-lg border transition-all ${
                isCollapsed 
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20' 
                : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/20'
              }`}
            >
              {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-1.5 rounded-lg border transition-all ${showFilters ? 'bg-indigo-500 border-indigo-500 text-white' : 'bg-[#161b22] border-gray-800 text-gray-400 hover:border-gray-600'}`}
            >
              <Filter className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Filter Panel */}
          {showFilters && !isCollapsed && (
            <div className="p-4 bg-[#161b22] border border-gray-800 rounded-xl space-y-4 animate-in zoom-in-95 duration-200">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] text-gray-500 uppercase font-bold mb-1 block">Type</label>
                  <select value={filterType} onChange={e => setFilterType(e.target.value)} className="w-full bg-[#0d1117] border border-gray-800 text-gray-300 text-[10px] p-1.5 rounded-lg">
                    <option value="all">All</option>
                    <option value="chat">Chat</option>
                    <option value="image">Image</option>
                    <option value="audio">Audio</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] text-gray-500 uppercase font-bold mb-1 block">Cost</label>
                  <select value={filterCost} onChange={e => setFilterCost(e.target.value)} className="w-full bg-[#0d1117] border border-gray-800 text-gray-300 text-[10px] p-1.5 rounded-lg">
                    <option value="all">Any</option>
                    <option value="free">Free</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] text-gray-500 uppercase font-bold mb-1 block">Power</label>
                  <select value={filterPower} onChange={e => setFilterPower(e.target.value)} className="w-full bg-[#0d1117] border border-gray-800 text-gray-300 text-[10px] p-1.5 rounded-lg">
                    <option value="all">Any</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] text-gray-500 uppercase font-bold mb-1 block">Speed</label>
                  <select value={filterSpeed} onChange={e => setFilterSpeed(e.target.value)} className="w-full bg-[#0d1117] border border-gray-800 text-gray-300 text-[10px] p-1.5 rounded-lg">
                    <option value="all">Any</option>
                    <option value="fast">Fast</option>
                    <option value="balanced">Balanced</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[9px] text-gray-500 uppercase font-bold mb-1 block">Sort By</label>
                <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} className="w-full bg-[#0d1117] border border-gray-800 text-indigo-400 text-[10px] p-1.5 rounded-lg font-bold">
                  <option value="smart">Smart Score</option>
                  <option value="context">Context Window</option>
                  <option value="power">Intelligence</option>
                  <option value="speed">Speed</option>
                  <option value="cost">Free First</option>
                </select>
              </div>
            </div>
          )}

          {/* Best Models Section */}
          {bestModels && !search && !showFilters && !isCollapsed && (
            <div className="grid grid-cols-2 gap-1.5">
              <div className="bg-indigo-500/10 border border-indigo-500/20 p-2 rounded-lg">
                <span className="text-[7px] font-bold text-indigo-400 uppercase block mb-0.5">Best Overall</span>
                <h4 className="text-[9px] font-bold text-white truncate mb-1">{bestModels.bestOverall.name}</h4>
                <button onClick={() => onModelChange(bestModels.bestOverall.id)} className="w-full py-0.5 bg-indigo-500 text-white text-[8px] font-bold rounded">Select</button>
              </div>
              {bestModels.bestFree && (
                <div className="bg-green-500/10 border border-green-500/20 p-2 rounded-lg">
                  <span className="text-[7px] font-bold text-green-400 uppercase block mb-0.5">Best Free</span>
                  <h4 className="text-[9px] font-bold text-white truncate mb-1">{bestModels.bestFree.name}</h4>
                  <button onClick={() => onModelChange(bestModels.bestFree!.id)} className="w-full py-0.5 bg-green-500 text-white text-[8px] font-bold rounded">Select</button>
                </div>
              )}
            </div>
          )}

          {/* Model List (Card Layout) */}
          {!isCollapsed && (
            <div className="space-y-1.5 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
              {filteredAndSortedModels.map(m => (
                <div 
                  key={m.id}
                  onClick={() => onModelChange(m.id)}
                  className={`p-2 rounded-lg border cursor-pointer transition-all group ${
                    currentModel === m.id 
                    ? 'bg-indigo-500/10 border-indigo-500 shadow-[0_0_10px_rgba(79,70,229,0.05)]' 
                    : 'bg-[#161b22] border-gray-800 hover:border-gray-600'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-[11px] font-bold text-white truncate group-hover:text-indigo-400 transition-colors">{m.name}</h4>
                      <div className="flex items-center flex-wrap gap-1.5 mt-1">
                        <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase ${m.cost === 'free' ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'}`}>
                          {m.cost}
                        </span>
                        <span className="text-[8px] text-gray-500 font-mono">{(m.context/1000).toFixed(0)}k ctx</span>
                        
                        {/* Labels moved here for space saving */}
                        <div className="flex gap-1">
                          {m.labels.slice(0, 2).map(label => (
                            <span key={label} className="px-1 py-0.5 rounded bg-gray-900/50 text-gray-500 text-[7px] font-medium border border-gray-800/50">
                              {label}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    {currentModel === m.id && <Check className="w-3 h-3 text-indigo-500 mt-1" />}
                  </div>
                </div>
              ))}
              {filteredAndSortedModels.length === 0 && (
                <div className="p-8 text-center">
                  <p className="text-xs text-gray-500">No models available</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

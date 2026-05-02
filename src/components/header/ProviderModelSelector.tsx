import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Search, Filter, SortAsc, Zap, Shield, DollarSign, Cpu, Check, X, AlertCircle, Heart, FastForward, Maximize2, ChevronDown, ChevronUp } from 'lucide-react';
import { fetchModels } from '@/services/geminiService';
import { AIModel } from '@/types';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { saveModelsToCloud, getModelsFromCloud } from '@/services/modelCacheService';

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
  tagLabel?: string;
  storageKeyPrefix?: string;
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
  isSidebar = false,
  tagLabel = 'Core AI',
  storageKeyPrefix = 'core'
}) => {
  const [isProviderOpen, setIsProviderOpen] = useState(false);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [availableModels, setAvailableModels] = useState<AIModel[]>(modelCache[currentProvider] || []);
  const [hasFetched, setHasFetched] = useState<Record<string, boolean>>({});
  
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
  const [isCollapsed, setIsCollapsed] = useState(true);

  const [defaultCoreModel, setDefaultCoreModel] = useState<AIModel | null>(() => {
    const saved = localStorage.getItem(`defaultCoreModel_${storageKeyPrefix}`);
    return saved ? JSON.parse(saved) : null;
  });

  const [favoriteModels, setFavoriteModels] = useState<AIModel[]>(() => {
    const saved = localStorage.getItem(`favoriteModels_${storageKeyPrefix}`);
    return saved ? JSON.parse(saved) : [];
  });

  const [showFavoritesPanel, setShowFavoritesPanel] = useState(false);
  const favoritesRef = useRef<HTMLDivElement>(null);
  const favoritesToggleRef = useRef<HTMLButtonElement>(null);
  const filterToggleRef = useRef<HTMLButtonElement>(null);
  const modelDisplayToggleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (defaultCoreModel) {
      localStorage.setItem(`defaultCoreModel_${storageKeyPrefix}`, JSON.stringify(defaultCoreModel));
    } else {
      localStorage.removeItem(`defaultCoreModel_${storageKeyPrefix}`);
    }
  }, [defaultCoreModel, storageKeyPrefix]);

  useEffect(() => {
    localStorage.setItem(`favoriteModels_${storageKeyPrefix}`, JSON.stringify(favoriteModels));
  }, [favoriteModels, storageKeyPrefix]);

  const currentModelInfo = useMemo(() => {
    return availableModels.find(m => m.id === currentModel) || 
           favoriteModels.find(m => m.id === currentModel) || 
           (defaultCoreModel?.id === currentModel ? defaultCoreModel : null) ||
           { 
             id: currentModel, 
             name: currentModel, 
             provider: currentProvider, 
             context: 0, 
             output: 0,
             type: 'chat',
             power: 'medium',
             speed: 'balanced',
             cost: 'unknown', 
             capabilities: [],
             labels: ['unknown'],
             score: 0
           } as AIModel;
  }, [availableModels, favoriteModels, currentModel, defaultCoreModel, currentProvider]);

  const providerRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      if (providerRef.current && !providerRef.current.contains(target)) {
        setIsProviderOpen(false);
      }

      if (filterRef.current && !filterRef.current.contains(target)) {
        // If click is outside the entire discovery section, close everything
        setIsCollapsed(true);
        setShowFilters(false);
        setShowFavoritesPanel(false);
      } else {
        // Click is INSIDE discovery section, but check specific overlays
        if (favoritesRef.current && !favoritesRef.current.contains(target)) {
          // Clicked outside favorites panel, check if it was the toggle
          if (favoritesToggleRef.current && !favoritesToggleRef.current.contains(target)) {
            setShowFavoritesPanel(false);
          }
        }
        
        // Filter panel is also inside filterRef, but we might want to close it 
        // if clicking search or model list
        if (showFilters && !filterToggleRef.current?.contains(target) && !target.parentElement?.closest('.custom-select-container')) {
           // This is a bit complex because of CustomSelect, but generally 
           // if we click outside the filter panel (which is inside filterRef)
           // we might want to close it. However, showFilters is usually 
           // managed by the toggle button.
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showFilters]);

  const handleFetch = async (providerId: string = currentProvider) => {
    setIsLoadingModels(true);
    setFetchError(null);
    try {
      const models = await fetchModels(providerId);
      modelCache[providerId] = models;
      setAvailableModels(models);
      setHasFetched(prev => ({ ...prev, [providerId]: true }));
      setIsCollapsed(false); // Auto expand after fetch
      
      // Save to Local
      localStorage.setItem(`cachedModels_${providerId}`, JSON.stringify(models));
      // Save to Cloud
      await saveModelsToCloud(providerId, models);
    } catch (err: any) {
      setFetchError(err.message);
    } finally {
      setIsLoadingModels(false);
    }
  };

  const loadCachedModels = async (providerId: string) => {
    // 1. Check Memory Cache
    if (modelCache[providerId]) {
      setAvailableModels(modelCache[providerId]);
      setHasFetched(prev => ({ ...prev, [providerId]: true }));
      return;
    }

    // 2. Check Local Storage
    const local = localStorage.getItem(`cachedModels_${providerId}`);
    if (local) {
      const models = JSON.parse(local);
      modelCache[providerId] = models;
      setAvailableModels(models);
      setHasFetched(prev => ({ ...prev, [providerId]: true }));
      return;
    }

    // 3. Check Cloud
    const cloud = await getModelsFromCloud(providerId);
    if (cloud) {
      modelCache[providerId] = cloud;
      setAvailableModels(cloud);
      setHasFetched(prev => ({ ...prev, [providerId]: true }));
      // Sync to Local
      localStorage.setItem(`cachedModels_${providerId}`, JSON.stringify(cloud));
    } else {
      setAvailableModels([]);
    }
  };

  const handleProviderSelect = (providerId: string) => {
    onProviderChange(providerId);
    setIsProviderOpen(false);
    loadCachedModels(providerId);
  };

  useEffect(() => {
    loadCachedModels(currentProvider);
  }, [currentProvider]);

  const toggleFavorite = (e: React.MouseEvent, model: AIModel) => {
    e.stopPropagation();
    setFavoriteModels(prev => {
      if (prev.find(m => m.id === model.id)) {
        return prev.filter(m => m.id !== model.id);
      }
      return [...prev, model];
    });
  };

  const toggleDefaultCore = (e: React.MouseEvent, model: AIModel) => {
    e.stopPropagation();
    if (defaultCoreModel?.id === model.id) {
      setDefaultCoreModel(null);
    } else {
      setDefaultCoreModel(model);
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
      {/* Provider & Fetch Selector */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">AI Provider & Discovery</label>
        <div className="flex gap-2">
          <div className="relative flex-1" ref={providerRef}>
            <button
              onClick={() => setIsProviderOpen(!isProviderOpen)}
              className="w-full bg-[#161b22] border border-gray-700 text-white py-1 px-2 rounded-xl flex justify-between items-center text-xs hover:border-gray-500 transition-all"
            >
              <span className="font-bold truncate">{activeProvider.name}</span>
              <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform shrink-0 ${isProviderOpen ? 'rotate-180' : ''}`} />
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

          <button
            onClick={() => handleFetch()}
            disabled={isLoadingModels}
            className={`flex-1 text-[10px] font-bold py-1 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg ${
              hasFetched[currentProvider]
                ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600/30'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20'
            }`}
          >
            {isLoadingModels ? (
              <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Zap className={`w-3 h-3 ${hasFetched[currentProvider] ? 'text-emerald-400' : ''}`} />
            )}
            {hasFetched[currentProvider] ? 'Refresh List' : 'Fetch Models'}
          </button>
        </div>
      </div>

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

      {/* Discovery Engine UI (Always visible, search integrated) */}
      {!isLoadingModels && (
        <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
          {/* Search & Filter Toggle & Actions */}
          <div className="relative" ref={filterRef}>
            <div className="flex gap-1.5 items-center">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search models..."
                  value={search}
                  onClick={() => setIsCollapsed(false)}
                  onChange={e => {
                    setSearch(e.target.value);
                    setIsCollapsed(false);
                  }}
                  className="w-full bg-[#0d1117] border border-gray-800 text-white text-[10px] pl-7 pr-2 py-1.5 rounded-lg focus:outline-none focus:border-indigo-500 transition-all"
                />
              </div>
              
              {/* Favorites Button */}
              <button
                ref={favoritesToggleRef}
                onClick={() => setShowFavoritesPanel(!showFavoritesPanel)}
                title="Show Favorite Models"
                className={`favorites-toggle-btn p-1.5 rounded-lg border transition-all hover:shadow-[0_0_15px_rgba(239,68,68,0.15)] ${
                  showFavoritesPanel 
                  ? 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20' 
                  : 'bg-[#161b22] border-gray-800 text-gray-400 hover:border-gray-600'
                }`}
              >
                <Heart className={`w-3.5 h-3.5 ${showFavoritesPanel ? 'fill-red-400' : ''}`} />
              </button>

              <button
                ref={filterToggleRef}
                onClick={() => setShowFilters(!showFilters)}
                className={`filter-toggle-btn p-1.5 rounded-lg border transition-all hover:shadow-[0_0_15px_rgba(79,70,229,0.15)] ${showFilters ? 'bg-indigo-500 border-indigo-500 text-white' : 'bg-[#161b22] border-gray-800 text-gray-400 hover:border-gray-600'}`}
              >
                <Filter className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Selected Model Display (Always visible) */}
            {currentModelInfo && (
              <div 
                ref={modelDisplayToggleRef}
                onClick={() => setIsCollapsed(!isCollapsed)}
                className={`model-display-toggle pl-[9px] pb-[6px] pr-2 pt-2 mt-2 rounded-lg border bg-[#161b22]/40 backdrop-blur-md cursor-pointer transition-all group ${
                  !isCollapsed ? 'border-indigo-500/50 shadow-[0_0_15px_rgba(79,70,229,0.2)]' : 'border-gray-800/50 hover:border-indigo-500/30 hover:bg-[#1c212b]/60 hover:shadow-[0_0_10px_rgba(79,70,229,0.1)] shadow-sm'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-[11px] font-bold text-white truncate group-hover:text-indigo-400 transition-colors">{currentModelInfo.name}</h4>
                      {defaultCoreModel?.id === currentModelInfo.id && (
                        <span className="text-[8px] bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                          ({tagLabel})
                        </span>
                      )}
                    </div>
                    <div className="flex items-center flex-wrap gap-1.5 mt-1">
                      <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase ${
                        currentModelInfo.cost === 'free' ? 'bg-green-500/20 text-green-400' : 
                        currentModelInfo.cost === 'paid' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {currentModelInfo.cost}
                      </span>
                      <span className="text-[8px] px-1.5 py-0.5 rounded bg-gray-800/50 text-gray-400 font-mono border border-gray-700/50">{(currentModelInfo.context/1000).toFixed(0)}k ctx</span>
                      
                      <div className="flex gap-1">
                        {currentModelInfo.labels.slice(0, 2).map(label => (
                          <span key={label} className="px-1 py-0.5 rounded bg-gray-900/50 text-gray-500 text-[7px] font-medium border border-gray-800/50">
                            {label}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  {isCollapsed ? (
                    <ChevronDown className="w-3.5 h-3.5 text-gray-500 mt-1 group-hover:text-white transition-colors" />
                  ) : (
                    <ChevronUp className="w-3.5 h-3.5 text-indigo-400 mt-1 transition-colors" />
                  )}
                </div>
              </div>
            )}

            {/* Favorites Panel Overlay */}
            {showFavoritesPanel && (
              <div ref={favoritesRef} className="absolute top-full left-0 right-0 mt-2 bg-[#161b22] border border-gray-700 rounded-xl shadow-2xl z-[70] overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center p-3 border-b border-gray-800">
                  <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                    <Heart className="w-3.5 h-3.5 text-red-400 fill-red-400" />
                    Favorite Models
                  </h3>
                  <button onClick={() => setShowFavoritesPanel(false)} className="text-gray-500 hover:text-white transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="max-h-[300px] overflow-y-auto custom-scrollbar p-1.5 space-y-1">
                  {favoriteModels.map(m => {
                    const isDefaultCore = defaultCoreModel?.id === m.id;
                    return (
                      <div 
                        key={m.id}
                        onClick={() => {
                          if (m.provider && m.provider !== currentProvider) {
                            onProviderChange(m.provider);
                          }
                          onModelChange(m.id);
                          setShowFavoritesPanel(false);
                          setIsCollapsed(true);
                        }}
                        className={`p-2 rounded-lg border cursor-pointer transition-all group ${
                          currentModel === m.id 
                          ? 'bg-indigo-500/10 border-indigo-500 shadow-[0_0_10px_rgba(79,70,229,0.05)]' 
                          : 'bg-[#0d1117] border-gray-800 hover:border-gray-600'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="text-[11px] font-bold text-white truncate group-hover:text-indigo-400 transition-colors">{m.name}</h4>
                              <button
                                onClick={(e) => toggleDefaultCore(e, m)}
                                className={`text-[8px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider transition-colors ${
                                  isDefaultCore 
                                  ? 'bg-indigo-500 text-white' 
                                  : 'bg-gray-800 text-gray-400 hover:bg-indigo-500/20 hover:text-indigo-400'
                                }`}
                              >
                                {isDefaultCore ? `(${tagLabel})` : `Set ${tagLabel}`}
                              </button>
                            </div>
                            <div className="flex items-center flex-wrap gap-1.5 mt-1">
                              <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase ${
                                m.cost === 'free' ? 'bg-green-500/20 text-green-400' : 
                                m.cost === 'paid' ? 'bg-amber-500/20 text-amber-400' :
                                'bg-gray-500/20 text-gray-400'
                              }`}>
                                {m.cost}
                              </span>
                              <span className="text-[8px] px-1.5 py-0.5 rounded bg-gray-800/50 text-gray-400 font-mono border border-gray-700/50">{(m.context/1000).toFixed(0)}k ctx</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => toggleFavorite(e, m)}
                              className="p-1 rounded hover:bg-gray-800 transition-colors"
                            >
                              <Heart className="w-3.5 h-3.5 fill-red-400 text-red-400" />
                            </button>
                            {currentModel === m.id && <Check className="w-3 h-3 text-indigo-500 mt-1" />}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {favoriteModels.length === 0 && (
                    <div className="p-8 text-center">
                      <p className="text-xs text-gray-500">No favorite models yet</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Filter Panel Overlay */}
            {showFilters && !isCollapsed && (
              <div className="absolute top-full left-0 right-0 mt-2 p-4 bg-[#161b22] border border-gray-700 rounded-xl space-y-4 animate-in zoom-in-95 duration-200 z-[60] shadow-2xl">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                    <Filter className="w-3.5 h-3.5 text-indigo-400" />
                    Filters & Sorting
                  </h3>
                  <button onClick={() => setShowFilters(false)} className="text-gray-500 hover:text-white transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <CustomSelect
                    label="Type"
                    value={filterType}
                    onChange={setFilterType}
                    options={[
                      { value: 'all', label: 'All' },
                      { value: 'chat', label: 'Chat' },
                      { value: 'image', label: 'Image' },
                      { value: 'audio', label: 'Audio' }
                    ]}
                  />
                  <CustomSelect
                    label="Cost"
                    value={filterCost}
                    onChange={setFilterCost}
                    options={[
                      { value: 'all', label: 'Any' },
                      { value: 'free', label: 'Free' },
                      { value: 'paid', label: 'Paid' }
                    ]}
                  />
                  <CustomSelect
                    label="Power"
                    value={filterPower}
                    onChange={setFilterPower}
                    options={[
                      { value: 'all', label: 'Any' },
                      { value: 'high', label: 'High' },
                      { value: 'medium', label: 'Medium' },
                      { value: 'low', label: 'Low' }
                    ]}
                  />
                  <CustomSelect
                    label="Speed"
                    value={filterSpeed}
                    onChange={setFilterSpeed}
                    options={[
                      { value: 'all', label: 'Any' },
                      { value: 'fast', label: 'Fast' },
                      { value: 'balanced', label: 'Balanced' }
                    ]}
                  />
                </div>
                <div className="pt-2 border-t border-gray-800">
                  <CustomSelect
                    label="Sort By"
                    value={sortBy}
                    onChange={(val) => setSortBy(val as any)}
                    options={[
                      { value: 'smart', label: 'Smart Score' },
                      { value: 'context', label: 'Context Window' },
                      { value: 'power', label: 'Intelligence' },
                      { value: 'speed', label: 'Speed' },
                      { value: 'cost', label: 'Free First' }
                    ]}
                  />
                </div>
              </div>
            )}
            {/* Model List Dropdown */}
            {!isCollapsed && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-[#0d1117]/95 backdrop-blur-2xl border border-indigo-500/40 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.6),0_0_30px_rgba(79,70,229,0.2)] z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="max-h-[400px] overflow-y-auto custom-scrollbar p-1.5 space-y-1">
                  {filteredAndSortedModels.map(m => {
                    const isFavorite = favoriteModels.some(fav => fav.id === m.id);
                    const isDefaultCore = defaultCoreModel?.id === m.id;
                    return (
                      <div 
                        key={m.id}
                        onClick={() => {
                          if (m.provider && m.provider !== currentProvider) {
                            onProviderChange(m.provider);
                          }
                          onModelChange(m.id);
                          setIsCollapsed(true);
                        }}
                        className={`p-2 rounded-lg border cursor-pointer transition-all group ${
                          currentModel === m.id 
                          ? 'bg-indigo-500/10 border-indigo-500/40 shadow-[0_0_15px_rgba(79,70,229,0.1)]' 
                          : 'bg-[#161b22]/40 border-gray-800/50 hover:border-indigo-500/30 hover:bg-indigo-500/5'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="text-[11px] font-bold text-white truncate group-hover:text-indigo-400 transition-colors">{m.name}</h4>
                            <button
                                onClick={(e) => toggleDefaultCore(e, m)}
                                className={`text-[8px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider transition-colors ${
                                  isDefaultCore 
                                  ? 'bg-indigo-500 text-white' 
                                  : 'bg-gray-800 text-gray-400 hover:bg-indigo-500/20 hover:text-indigo-400'
                                }`}
                              >
                                {isDefaultCore ? `(${tagLabel})` : `Set ${tagLabel}`}
                              </button>
                            </div>
                            <div className="flex items-center flex-wrap gap-1.5 mt-1">
                              <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase ${
                                m.cost === 'free' ? 'bg-green-500/20 text-green-400' : 
                                m.cost === 'paid' ? 'bg-amber-500/20 text-amber-400' :
                                'bg-gray-500/20 text-gray-400'
                              }`}>
                                {m.cost}
                              </span>
                              <span className="text-[8px] px-1.5 py-0.5 rounded bg-gray-800/50 text-gray-400 font-mono border border-gray-700/50">{(m.context/1000).toFixed(0)}k ctx</span>
                              
                              <div className="flex gap-1">
                                {m.labels.slice(0, 2).map(label => (
                                  <span key={label} className="px-1 py-0.5 rounded bg-gray-900/50 text-gray-500 text-[7px] font-medium border border-gray-800/50">
                                    {label}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => toggleFavorite(e, m)}
                              className="p-1 rounded hover:bg-gray-800 transition-colors"
                            >
                              <Heart className={`w-3.5 h-3.5 ${isFavorite ? 'fill-red-400 text-red-400' : 'text-gray-500 hover:text-red-400'}`} />
                            </button>
                            {currentModel === m.id && <Check className="w-3 h-3 text-indigo-500 mt-1" />}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {filteredAndSortedModels.length === 0 && (
                    <div className="p-8 text-center">
                      <p className="text-xs text-gray-500">No models available</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

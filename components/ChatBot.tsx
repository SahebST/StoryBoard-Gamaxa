
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, Send, X, Bot, User, Sparkles, Minus, Maximize2, Trash2, Cpu, Settings as SettingsIcon, ChevronLeft, Plus, Copy, Check } from 'lucide-react';
import { sendMessageToChat, ChatMessage } from '../services/geminiService';
import { ProviderModelSelector } from './ProviderModelSelector';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const CopyButton = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="p-1 px-2 mt-2 flex items-center gap-1.5 rounded-lg bg-gray-900/40 border border-gray-700/50 hover:bg-gray-700 transition-all text-[10px] font-bold text-gray-400 hover:text-white group"
      title="Copy message"
    >
      {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3 group-hover:text-indigo-400" />}
      {copied ? 'Copied!' : 'Copy UI Output'}
    </button>
  );
};

interface ChatBotProps {
  history: ChatMessage[];
  onHistoryChange: (history: ChatMessage[]) => void;
  systemInstruction?: string;
  appContext?: string;
  currentProvider: string;
  currentModel: string;
  onProviderChange: (providerId: string) => void;
  onModelChange: (modelId: string) => void;
}

export const ChatBot: React.FC<ChatBotProps> = ({ 
  history, 
  onHistoryChange, 
  systemInstruction,
  appContext,
  currentProvider,
  currentModel,
  onProviderChange,
  onModelChange
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [viewMode, setViewMode] = useState<'chat' | 'settings'>('chat');
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Adding a slight delay to ensure UI reflow handles react-markdown height properly before scrolling
    const timeout = setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
    return () => clearTimeout(timeout);
  }, [history?.length, isLoading, isOpen, viewMode]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: ChatMessage = { role: 'user', content: inputValue };
    const newHistory = [...(history || []), userMessage];
    onHistoryChange(newHistory);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await sendMessageToChat(newHistory, systemInstruction, currentModel, currentProvider, appContext);
      onHistoryChange([...newHistory, { role: 'model', content: response }]);
    } catch (error: any) {
      console.error('Chat error:', error);
      onHistoryChange([...newHistory, { role: 'model', content: `Error: ${error.message || "Unknown error encountered."}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    onHistoryChange([]);
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100] font-sans">
      {/* Chat Button */}
      {!isOpen && (
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 shadow-lg shadow-indigo-500/25 flex items-center justify-center text-white border border-white/20 hover:shadow-indigo-500/40 transition-shadow"
        >
          <MessageSquare className="w-6 h-6" />
          <motion.div 
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full border-2 border-slate-900"
          />
        </motion.button>
      )}

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20, transformOrigin: 'bottom right' }}
            animate={{ 
              opacity: 1, 
              scale: 1, 
              y: 0,
              height: isMinimized ? '60px' : '600px',
              width: isMinimized ? '250px' : '400px'
            }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-[#0f172a] border border-gray-700/50 rounded-2xl shadow-2xl overflow-hidden flex flex-col backdrop-blur-xl"
          >
            {/* Header */}
            <div className="p-4 bg-gray-800/50 border-b border-gray-700/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {viewMode === 'settings' ? (
                  <button 
                    onClick={() => setViewMode('chat')}
                    className="p-1.5 hover:bg-gray-700 rounded-lg text-gray-400 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                  </div>
                )}
                <div>
                  <h3 className="text-sm font-bold text-gray-100 flex items-center gap-2 text-nowrap">
                    {viewMode === 'settings' ? 'AI configuration' : 'Gemini AI Assistant'}
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  </h3>
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest font-mono">
                    {viewMode === 'settings' ? 'Model Discovery' : (currentProvider === 'google' ? 'Powered by Google' : `Using ${currentProvider}`)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {viewMode === 'chat' && (
                  <button 
                    onClick={() => setViewMode('settings')}
                    className="p-1.5 hover:bg-gray-700 rounded-lg text-gray-400 transition-colors"
                    title="Model Discovery"
                  >
                    <SettingsIcon className="w-4 h-4" />
                  </button>
                )}
                <button 
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="p-1.5 hover:bg-gray-700 rounded-lg text-gray-400 transition-colors"
                >
                  {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                </button>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 hover:bg-red-500/20 hover:text-red-400 rounded-lg text-gray-400 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {!isMinimized && (
              <>
                {viewMode === 'settings' ? (
                  <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-gray-900/20">
                    <div className="space-y-6">
                      <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                        <p className="text-[10px] text-indigo-300 leading-relaxed font-medium">
                          Select a model from the discovery engine. Your choice will apply both to this chat and core AI features like script analysis.
                        </p>
                      </div>
                      <ProviderModelSelector 
                        currentProvider={currentProvider}
                        currentModel={currentModel}
                        onProviderChange={onProviderChange}
                        onModelChange={onModelChange}
                        isSidebar={true}
                        tagLabel="Chat AI"
                        storageKeyPrefix="chat"
                      />
                      <button 
                        onClick={() => setViewMode('chat')}
                        className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2"
                      >
                        Apply & Back to Chat
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Compact Model Info Bar */}
                    <div className="px-4 py-2 bg-gray-900/40 border-b border-gray-800 flex items-center justify-between">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <Cpu className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <span className="text-[10px] font-bold text-gray-300 truncate">{currentModel}</span>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <button 
                          onClick={handleClearHistory}
                          className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors border border-gray-700/50 hover:border-gray-600 bg-gray-800/30"
                          title="Start New Chat"
                        >
                          <Plus className="w-3 h-3" />
                          <span className="text-[10px] font-bold uppercase tracking-wider">New Chat</span>
                        </button>
                      </div>
                    </div>

                    {/* Messages */}
                    <div 
                      className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth"
                    >
                      {(!history || history.length === 0) && (
                        <div className="h-full flex flex-col items-center justify-center text-center p-6">
                          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-4">
                            <Sparkles className="w-8 h-8 text-indigo-400/50" />
                          </div>
                          <h4 className="text-gray-200 font-bold mb-2">How can I help you?</h4>
                          <p className="text-xs text-gray-500 leading-relaxed">
                            I am currently using <span className="text-indigo-400 font-bold">{currentModel}</span>. I can help with scripts, visuals, or AI settings.
                          </p>
                        </div>
                      )}
                      {history.map((msg, i) => (
                        <div 
                          key={i} 
                          className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                              msg.role === 'user' 
                                ? 'bg-purple-500/20 border-purple-500/30' 
                                : 'bg-indigo-500/20 border-indigo-500/30'
                            }`}>
                              {msg.role === 'user' ? <User className="w-4 h-4 text-purple-400" /> : <Bot className="w-4 h-4 text-indigo-400" />}
                            </div>
                            <div className={`p-3 rounded-2xl text-sm leading-relaxed overflow-hidden ${
                              msg.role === 'user' 
                                ? 'bg-purple-600/10 text-gray-100 rounded-tr-none' 
                                : 'bg-gray-800/80 text-gray-200 rounded-tl-none border border-gray-700/50 shadow-sm'
                            }`}>
                              {msg.role === 'user' ? (
                                msg.content
                              ) : (
                                <>
                                  <div className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-[#0d1117] prose-pre:border prose-pre:border-gray-800">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                                  </div>
                                  <div className="flex justify-start border-t border-gray-700/30 mt-2">
                                     <CopyButton text={msg.content} />
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      {isLoading && (
                        <div className="flex justify-start">
                          <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
                              <Bot className="w-4 h-4 text-indigo-400" />
                            </div>
                            <div className="p-3 bg-gray-800/80 rounded-2xl rounded-tl-none border border-gray-700/50 flex gap-1 items-center">
                              <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                              <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                              <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" />
                            </div>
                          </div>
                        </div>
                      )}
                      {/* Invisible dummy div for auto-scrolling to bottom */}
                      <div ref={bottomRef} className="h-1 w-full shrink-0" />
                    </div>

                    {/* Input */}
                    <div className="p-4 bg-gray-900/50 border-t border-gray-800">
                      <form 
                        onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
                        className="relative"
                      >
                        <textarea
                          value={inputValue}
                          onChange={(e) => setInputValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSendMessage();
                            }
                          }}
                          placeholder="Ask anything..."
                          rows={1}
                          className="w-full bg-[#1e293b] border border-gray-700/50 rounded-xl px-4 py-3 pr-12 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all resize-none shadow-inner"
                        />
                        <button
                          type="submit"
                          disabled={!inputValue.trim() || isLoading}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg transition-all"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </form>
                      <p className="mt-2 text-[10px] text-gray-500 text-center font-mono">
                        POWERED BY ADVANCED AI ENGINE
                      </p>
                    </div>
                  </>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

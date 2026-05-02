import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Terminal, X, Trash2, Wifi, WifiOff, Activity, AlertTriangle, AlertCircle, Info, Database, ArrowUp, ArrowDown } from 'lucide-react';
import { appLogger, LogEntry, ActivityState } from '@/services/loggerService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const SystemConsole: React.FC<Props> = ({ isOpen, onClose }) => {
  const [mounted, setMounted] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [activity, setActivity] = useState<ActivityState>('idle');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    
    // Subscribe to logger logs
    const unsubscribeLogs = appLogger.subscribe((newLogs) => {
      setLogs(newLogs);
    });

    // Subscribe to activity
    const unsubscribeActivity = appLogger.subscribeActivity((state) => {
      setActivity(state);
    });

    // Monitor network
    const handleOffline = () => appLogger.network('System', 'Internet connection lost. App is offline.');
    const handleOnline = () => appLogger.network('System', 'Internet connection restored. App is online.');
    
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      unsubscribeLogs();
      unsubscribeActivity();
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs.length, isOpen]);

  const getIcon = (level: string) => {
    switch (level) {
      case 'error': return <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />;
      case 'warn': return <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />;
      case 'api': return <Activity className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />;
      case 'network': return <Wifi className="w-3.5 h-3.5 text-green-400 shrink-0 mt-0.5" />;
      case 'info':
      default: return <Info className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />;
    }
  };

  const getTextColor = (level: string) => {
    switch (level) {
      case 'error': return 'text-red-400';
      case 'warn': return 'text-amber-300';
      case 'api': return 'text-indigo-200';
      case 'network': return 'text-emerald-300';
      case 'info':
      default: return 'text-gray-300';
    }
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}.${d.getMilliseconds().toString().padStart(3, '0')}`;
  };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/20 backdrop-blur-sm pointer-events-auto"
            onClick={onClose}
          />

          <motion.div 
            initial={{ x: '100%', opacity: 0, scale: 0.95 }}
            animate={{ x: 0, opacity: 1, scale: 1 }}
            exit={{ x: '100%', opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-4 bottom-4 right-4 z-[201] w-[600px] max-w-[calc(100vw-32px)] bg-[#0d1117] border border-gray-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden pointer-events-auto"
          >
            {/* Header */}
            <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-[#161b22]">
              <div className="flex flex-col">
                <h3 className="text-gray-200 font-bold uppercase tracking-widest text-xs flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  System Console
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <div className={`w-1.5 h-1.5 rounded-full ${navigator.onLine ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`} />
                  <span className="text-[9px] text-gray-500 uppercase tracking-tighter">
                    {navigator.onLine ? 'Network Online' : 'Network Offline'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => appLogger.clear()}
                  className="px-2 py-1.5 flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-white bg-[#0d1117] border border-gray-800 hover:border-gray-600 rounded-md transition-colors"
                  title="Clear Logs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear
                </button>
                <button 
                  onClick={onClose} 
                  className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-800 rounded-lg transition-colors ml-2"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Log Stream */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 flex flex-col gap-2 font-mono text-[11px] bg-[#0d1117] custom-scrollbar scroll-smooth relative"
            >
              {/* Activity Indicator Overlay */}
              <div className="sticky top-0 z-10 -mx-4 px-4 pb-2 bg-[#0d1117]/80 backdrop-blur-md pointer-events-none">
                <AnimatePresence>
                  {activity !== 'idle' && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className={`p-2 rounded-lg text-[10px] font-bold flex items-center justify-between border shadow-lg ${
                        activity === 'outgoing' 
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-500' 
                          : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
                      }`}
                    >
                      <div className="flex items-center gap-2 text-current">
                        <div className="w-2 h-2 rounded-full bg-current animate-pulse" />
                        {activity === 'outgoing' ? 'SENDING REQUEST / UPLOADING DATA...' : 'RECEIVING RESPONSE / DOWNLOADING DATA...'}
                      </div>
                      <div className="text-current">
                        {activity === 'outgoing' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {logs.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-600 gap-2 h-full py-20">
                  <Database className="w-8 h-8 opacity-20" />
                  <p>Awaiting system activity...</p>
                </div>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="flex flex-col hover:bg-[#161b22] p-1.5 rounded-md border border-transparent hover:border-gray-800/50 transition-colors group">
                    <div className="flex gap-3 items-baseline">
                      <div className="text-gray-500 shrink-0 w-[80px]">
                        {formatTime(log.timestamp)}
                      </div>
                      <div className="shrink-0">
                        {getIcon(log.level)}
                      </div>
                      <div className="flex items-baseline gap-2 min-w-0 flex-1">
                        <span className="text-gray-500 font-bold shrink-0">[{log.source}]</span>
                        <span className={`${getTextColor(log.level)} whitespace-pre-wrap break-words font-medium`}>
                          {log.message}
                        </span>
                      </div>
                    </div>
                    {log.data && (
                      <pre className="mt-1.5 p-2 bg-black/40 border border-gray-800/50 rounded-lg text-gray-400 text-[10px] overflow-x-auto w-full shadow-inner font-mono">
                        {typeof log.data === 'string' ? log.data : JSON.stringify(log.data, null, 2)}
                      </pre>
                    )}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
};

export type LogLevel = 'info' | 'warn' | 'error' | 'api' | 'network';
export type ActivityState = 'idle' | 'outgoing' | 'incoming';

export interface LogEntry {
  id: string;
  timestamp: number;
  level: LogLevel;
  source: string;
  message: string;
  data?: any;
}

type LogListener = (logs: LogEntry[]) => void;
type ActivityListener = (state: ActivityState) => void;

class LoggerService {
  private logs: LogEntry[] = [];
  private listeners: Set<LogListener> = new Set();
  private activityListeners: Set<ActivityListener> = new Set();
  private maxLogs = 500;
  private currentActivity: ActivityState = 'idle';

  private notify() {
    const logsCopy = [...this.logs];
    this.listeners.forEach(l => l(logsCopy));
  }

  private notifyActivity() {
    this.activityListeners.forEach(l => l(this.currentActivity));
  }

  public subscribe(listener: LogListener) {
    this.listeners.add(listener);
    listener([...this.logs]);
    return () => { this.listeners.delete(listener); };
  }

  public subscribeActivity(listener: ActivityListener) {
    this.activityListeners.add(listener);
    listener(this.currentActivity);
    return () => { this.activityListeners.delete(listener); };
  }

  public setActivity(state: ActivityState) {
    this.currentActivity = state;
    this.notifyActivity();
    // Auto-reset to idle after a delay if it gets stuck, but usually we handle manually
    if (state !== 'idle') {
      setTimeout(() => {
        if (this.currentActivity === state) {
          this.setActivity('idle');
        }
      }, 5000);
    }
  }

  public clear() {
    this.logs = [];
    this.notify();
  }

  public log(level: LogLevel, source: string, message: string, data?: any) {
    const entry: LogEntry = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      level,
      source,
      message,
      data
    };
    
    this.logs.push(entry);
    if(this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
    
    this.notify();
  }

  public info(source: string, message: string, data?: any) { this.log('info', source, message, data); }
  public warn(source: string, message: string, data?: any) { this.log('warn', source, message, data); }
  public error(source: string, message: string, data?: any) { this.log('error', source, message, data); }
  public api(source: string, message: string, data?: any) { this.log('api', source, message, data); }
  public network(source: string, message: string, data?: any) { this.log('network', source, message, data); }
}

export const appLogger = new LoggerService();

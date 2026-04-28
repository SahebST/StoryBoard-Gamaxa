import React, { useState, useEffect } from 'react';
import { auth } from '../firebase';
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { saveSessionToFirebase, loadSessionFromFirebase, listUserSessions, SessionMeta, deleteSessionFromFirebase } from '../services/sessionService';
import { AppState } from '../types';
import { ConfirmModal } from './ConfirmModal';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';

interface SessionManagerProps {
  currentState: AppState;
  onLoadState: (state: AppState) => void;
  onNewSession: () => void;
  sessionTitle: string;
  onSessionTitleChange: (title: string) => void;
  isSidebar?: boolean;
}

export const SessionManager: React.FC<SessionManagerProps> = ({ currentState, onLoadState, onNewSession, sessionTitle, onSessionTitleChange, isSidebar = false }) => {
  const [user, setUser] = useState<User | null>(null);
  const [sessions, setSessions] = useState<SessionMeta[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  const [isConfirmingNew, setIsConfirmingNew] = useState(false);
  const [hasAutoLoaded, setHasAutoLoaded] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await fetchSessions();
      } else {
        setSessions([]);
        setHasAutoLoaded(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Load the last session when the user logs in for the first time
  useEffect(() => {
    if (user && sessions.length > 0 && !currentState.sessionId && !currentState.topic && !currentState.scriptText && !hasAutoLoaded) {
      // Auto-load the most recent session if the current state is empty
      handleLoadSession(sessions[0].id);
      setHasAutoLoaded(true);
    }
  }, [user, sessions, currentState.sessionId, currentState.topic, currentState.scriptText, hasAutoLoaded]);

  const fetchSessions = async () => {
    setIsLoading(true);
    try {
      const userSessions = await listUserSessions();
      setSessions(userSessions);
    } catch (e) {
      console.error("Failed to fetch sessions", e);
    }
    setIsLoading(false);
  };

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  const handleSaveSession = async () => {
    if (!user) {
      console.error("Please log in to save your session.");
      return;
    }
    
    let nameToSave = sessionTitle;
    if (!nameToSave) {
      nameToSave = currentState.topic || "Untitled Session";
    }
    // Ensure name is within 100 characters to pass Firestore rules
    if (nameToSave.length > 100) {
      nameToSave = nameToSave.substring(0, 97) + "...";
    }

    const idToSave = currentState.sessionId || Date.now().toString();
    const existingSession = sessions.find(s => s.id === idToSave);
    const createdAt = existingSession ? existingSession.createdAt : new Date().toISOString();
    
    setIsLoading(true);
    try {
      await saveSessionToFirebase(idToSave, nameToSave, currentState, createdAt);
      onLoadState({ ...currentState, sessionId: idToSave });
      onSessionTitleChange(nameToSave);
      await fetchSessions();
    } catch (error: any) {
      console.error(`Failed to save session: ${error.message}`);
    }
    setIsLoading(false);
  };

  const handleDuplicateSession = async () => {
    if (!user) {
      console.error("Please log in to duplicate your session.");
      return;
    }
    
    let baseName = sessionTitle;
    if (!baseName) {
      baseName = currentState.topic || "Untitled Session";
    }
    
    let nameToSave = `${baseName} v2`;
    
    // Ensure name is within 100 characters to pass Firestore rules
    if (nameToSave.length > 100) {
      nameToSave = nameToSave.substring(0, 97) + "...";
    }

    const idToSave = Date.now().toString();
    const createdAt = new Date().toISOString();
    
    const newState = {
      ...currentState,
      sessionId: idToSave,
      sessionTitle: nameToSave
    };
    
    setIsLoading(true);
    try {
      await saveSessionToFirebase(idToSave, nameToSave, newState, createdAt);
      onLoadState(newState);
      onSessionTitleChange(nameToSave);
      await fetchSessions();
    } catch (error: any) {
      console.error(`Failed to duplicate session: ${error.message}`);
    }
    setIsLoading(false);
  };

  const handleLoadSession = async (id: string) => {
    setIsLoading(true);
    try {
      const state = await loadSessionFromFirebase(id);
      if (state) {
        onLoadState({ ...state, sessionId: id });
        const session = sessions.find(s => s.id === id);
        if (session) onSessionTitleChange(session.name);
        setIsModalOpen(false);
      } else {
        console.error("Failed to load session data.");
      }
    } catch (error: any) {
      console.error(`Failed to load session: ${error.message}`);
    }
    setIsLoading(false);
  };

  const confirmDeleteSession = async () => {
    if (!sessionToDelete) return;
    setIsLoading(true);
    try {
      await deleteSessionFromFirebase(sessionToDelete);
      if (currentState.sessionId === sessionToDelete) {
        onLoadState({ ...currentState, sessionId: null });
        onSessionTitleChange('');
      }
      await fetchSessions();
    } catch (error: any) {
      console.error(`Failed to delete session: ${error.message}`);
    }
    setSessionToDelete(null);
    setIsLoading(false);
  };

  const confirmNewSession = () => {
    onNewSession();
    onSessionTitleChange('');
    setIsConfirmingNew(false);
    setHasAutoLoaded(true);
  };

  return (
    <>
      <div className={`flex ${isSidebar ? 'flex-col' : 'items-center'} gap-3 ${!isSidebar ? 'bg-[#161b22]/80 backdrop-blur-md p-1.5 rounded-xl border border-gray-700/50 shadow-xl' : ''}`}>
        {!user ? (
        <button 
          onClick={handleLogin} 
          className={`text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg font-bold transition-all hover:shadow-[0_0_20px_rgba(99,102,241,0.4)] flex items-center justify-center gap-2 ${isSidebar ? 'w-full' : ''}`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3 3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>
          <span>Cloud Login</span>
        </button>
      ) : (
        <div className={`flex flex-col gap-3 ${isSidebar ? 'w-full' : ''}`}>
          {/* User Profile Card */}
          <div className="bg-gradient-to-br from-gray-900/80 via-[#161b22]/90 to-indigo-900/20 backdrop-blur-md rounded-xl p-3 border border-gray-800/50 flex items-center gap-3 group transition-all hover:border-indigo-500/40 shadow-[inset_0_0_20px_rgba(0,0,0,0.4)]">
            <div className="relative w-11 h-11 flex items-center justify-center">
              {/* Inner Dark Mask to create the ring effect (optional now, but kept for sizing) */}
              <div className="absolute inset-[2px] bg-[#0d1117] rounded-full z-10" />
              
              {/* Profile Image */}
              <img src={user.photoURL || ''} alt="User" className="w-9 h-9 rounded-full relative z-20" />
              
              {/* Online Status Indicator */}
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-[#0d1117] rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)] z-30"></div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black text-white truncate tracking-tight group-hover:text-indigo-300 transition-colors">{user.displayName}</p>
              <p className="text-[10px] text-gray-500 truncate font-medium">{user.email}</p>
            </div>
            <button 
              onClick={handleLogout} 
              className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all active:scale-90" 
              title="Logout"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            </button>
          </div>
          
          {/* Action Grid */}
          <div className="grid grid-cols-2 gap-2">
            <button 
              onClick={() => setIsConfirmingNew(true)}
              className="text-[10px] bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 p-2 rounded-lg font-black transition-all flex items-center justify-center gap-1.5 hover:shadow-[0_0_15px_rgba(16,185,129,0.2)] active:scale-95 uppercase tracking-wider"
              title="Start New Session"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
              <span>New</span>
            </button>

            <button 
              onClick={() => { setIsModalOpen(true); fetchSessions(); }}
              className="text-[10px] bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 p-2 rounded-lg font-black transition-all flex items-center justify-center gap-1.5 hover:shadow-[0_0_15px_rgba(14,165,233,0.2)] active:scale-95 uppercase tracking-wider"
              title="Load Session from Cloud"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /></svg>
              <span>Load</span>
            </button>

            <button 
              onClick={handleSaveSession}
              disabled={isLoading}
              className="col-span-2 text-[10px] bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white p-2.5 rounded-lg font-black transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/40 hover:shadow-indigo-500/50 active:scale-[0.98] disabled:opacity-50 uppercase tracking-widest"
              title="Save Session to Cloud"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
              <span>{isLoading ? 'Saving...' : 'Cloud Save'}</span>
            </button>

            <button 
              onClick={handleDuplicateSession}
              disabled={isLoading}
              className="col-span-2 text-[10px] bg-purple-600/10 hover:bg-purple-600/20 text-purple-400 border border-purple-500/30 p-2 rounded-lg font-black transition-all flex items-center justify-center gap-2 disabled:opacity-50 hover:shadow-[0_0_15px_rgba(168,85,247,0.2)] active:scale-[0.98] uppercase tracking-wider"
              title="Duplicate Current Session"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" /></svg>
              <span>Duplicate Session</span>
            </button>
          </div>
        </div>
      )}
      </div>

      {isModalOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={() => setIsModalOpen(false)}
          />
          
          <div className="relative w-full max-w-4xl max-h-[90vh] bg-[#111827] border border-gray-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-800 bg-[#161b22]/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/20 rounded-lg">
                  <svg className="w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /></svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Cloud Sessions</h2>
                  <p className="text-xs text-gray-400 uppercase tracking-widest mt-0.5">Manage and load your saved progress</p>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="p-2 hover:bg-gray-800 rounded-full transition-colors text-gray-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar">
              <div className="max-w-7xl mx-auto">
              {isLoading && sessions.length === 0 ? (
                <div className="text-center py-32 text-gray-400 flex flex-col items-center gap-6">
                  <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin shadow-[0_0_20px_rgba(99,102,241,0.3)]"></div>
                  <p className="text-xl font-bold tracking-tight">Syncing with cloud...</p>
                </div>
              ) : sessions.length === 0 ? (
                <div className="text-center py-32 text-gray-500 flex flex-col items-center gap-6">
                  <div className="w-24 h-24 bg-gray-900/50 rounded-3xl flex items-center justify-center border border-gray-800 shadow-inner">
                    <svg className="w-12 h-12 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
                  </div>
                  <div className="max-w-md">
                    <p className="text-2xl font-black text-gray-400">No sessions found</p>
                    <p className="text-gray-600 mt-2">Start a new project and save it to the cloud to see it here. Your work is automatically backed up when you click Save.</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {sessions.map(session => (
                    <div 
                      key={session.id} 
                      className={`group relative flex flex-col p-4 rounded-xl border transition-all duration-300 ${
                        currentState.sessionId === session.id 
                        ? 'bg-indigo-500/5 border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.1)] ring-1 ring-indigo-500/50' 
                        : 'bg-[#161b22] border-gray-800 hover:border-gray-600 hover:shadow-xl hover:-translate-y-1'
                      }`}
                    >
                      {currentState.sessionId === session.id && (
                        <div className="absolute -top-2 -right-2 bg-indigo-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-lg z-10 animate-pulse">
                          ACTIVE
                        </div>
                      )}
                      
                      <div className="flex-1 min-w-0 mb-4">
                        <h3 className="font-bold text-gray-100 text-lg truncate pr-6 group-hover:text-indigo-400 transition-colors duration-300" title={session.name || 'Untitled Session'}>
                          {session.name || 'Untitled Session'}
                        </h3>
                        <div className="flex flex-col gap-1.5 mt-3">
                          <div className="flex items-center gap-2 text-[11px] text-gray-500 bg-gray-900/50 px-2 py-1 rounded-lg w-fit">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            <span>{new Date(session.createdAt).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-indigo-400/70 bg-indigo-500/5 px-2 py-1 rounded-lg w-fit">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            <span>Modified: {new Date(session.updatedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 items-center pt-4 border-t border-gray-800/50">
                        <button 
                          onClick={() => handleLoadSession(session.id)}
                          className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white h-10 rounded-xl text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 active:scale-95"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                          Load Session
                        </button>
                        <button 
                          onClick={() => setSessionToDelete(session.id)}
                          className="w-10 h-10 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 hover:border-red-500 rounded-xl transition-all duration-300 flex items-center justify-center active:scale-95"
                          title="Delete Session"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      <ConfirmModal
        isOpen={isConfirmingNew}
        title="Start New Session"
        message="Are you sure? This will clear all current progress."
        onConfirm={confirmNewSession}
        onCancel={() => setIsConfirmingNew(false)}
      />

      <ConfirmModal
        isOpen={!!sessionToDelete}
        title="Delete Session"
        message="Are you sure you want to delete this session? This action cannot be undone."
        onConfirm={confirmDeleteSession}
        onCancel={() => setSessionToDelete(null)}
        isDestructive={true}
        confirmText="Delete"
      />
    </>
  );
};

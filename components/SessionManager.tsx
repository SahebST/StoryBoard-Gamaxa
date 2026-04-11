import React, { useState, useEffect } from 'react';
import { auth } from '../firebase';
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { saveSessionToFirebase, loadSessionFromFirebase, listUserSessions, SessionMeta, deleteSessionFromFirebase } from '../services/sessionService';
import { AppState } from '../types';
import { ConfirmModal } from './ConfirmModal';

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
      console.error("Please log in to save your season.");
      return;
    }
    
    let nameToSave = sessionTitle;
    if (!nameToSave) {
      nameToSave = currentState.topic || "Untitled Season";
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
      console.error(`Failed to save season: ${error.message}`);
    }
    setIsLoading(false);
  };

  const handleDuplicateSession = async () => {
    if (!user) {
      console.error("Please log in to duplicate your season.");
      return;
    }
    
    let baseName = sessionTitle;
    if (!baseName) {
      baseName = currentState.topic || "Untitled Season";
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
      console.error(`Failed to duplicate season: ${error.message}`);
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
        console.error("Failed to load season data.");
      }
    } catch (error: any) {
      console.error(`Failed to load season: ${error.message}`);
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
      console.error(`Failed to delete season: ${error.message}`);
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
      <div className={`flex ${isSidebar ? 'flex-col' : 'items-center'} gap-2 ${!isSidebar ? 'bg-[#161b22]/80 backdrop-blur-md p-1 rounded-lg border border-gray-700/50 shadow-lg' : ''}`}>
        {!user ? (
        <button onClick={handleLogin} className={`text-xs bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-400 border border-indigo-500/30 px-2.5 py-1.5 rounded-md font-bold transition-colors flex items-center gap-2 ${isSidebar ? 'w-full justify-start py-2 px-3' : ''}`}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>
          <span className={isSidebar ? '' : 'hidden lg:inline'}>Cloud Login</span>
        </button>
      ) : (
        <>
          <div className={`flex items-center gap-2 bg-gray-900/50 rounded-md p-1 pr-2 border border-gray-700/50 ${isSidebar ? 'w-full mb-2' : 'mr-1'}`}>
            <img src={user.photoURL || ''} alt="User" className="w-5 h-5 rounded-full" />
            <span className={`text-[10px] text-gray-400 truncate ${isSidebar ? 'flex-1' : 'max-w-[80px] hidden sm:inline'}`}>{user.displayName}</span>
            <button onClick={handleLogout} className="text-[10px] text-gray-500 hover:text-red-400 ml-1 transition-colors" title="Logout">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            </button>
          </div>
          
          <button 
            onClick={() => setIsConfirmingNew(true)}
            className={`text-xs bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 px-2.5 py-1.5 rounded-md font-bold transition-colors flex items-center gap-2 ${isSidebar ? 'w-full justify-start py-2 px-3' : ''}`}
            title="Start New Season"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
            <span className={isSidebar ? '' : 'hidden lg:inline'}>New</span>
          </button>

          <button 
            onClick={() => { setIsModalOpen(true); fetchSessions(); }}
            className={`text-xs text-gray-400 hover:text-white hover:bg-gray-700 px-2.5 py-1.5 rounded-md font-bold transition-colors flex items-center gap-2 ${isSidebar ? 'w-full justify-start py-2 px-3' : ''}`}
            title="Load Season from Cloud"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /></svg>
            <span className={isSidebar ? '' : 'hidden lg:inline'}>Cloud Load</span>
          </button>

          <button 
            onClick={handleSaveSession}
            disabled={isLoading}
            className={`text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-2.5 py-1.5 rounded-md font-bold transition-colors disabled:opacity-50 flex items-center gap-2 ${isSidebar ? 'w-full justify-start py-2 px-3' : ''}`}
            title="Save Season to Cloud"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
            <span className={isSidebar ? '' : 'hidden lg:inline'}>{isLoading ? 'Saving...' : 'Cloud Save'}</span>
          </button>

          <button 
            onClick={handleDuplicateSession}
            disabled={isLoading}
            className={`text-xs bg-purple-600/20 hover:bg-purple-600/40 text-purple-400 border border-purple-500/30 px-2.5 py-1.5 rounded-md font-bold transition-colors disabled:opacity-50 flex items-center gap-2 ${isSidebar ? 'w-full justify-start py-2 px-3' : ''}`}
            title="Duplicate Current Season"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" /></svg>
            <span className={isSidebar ? '' : 'hidden lg:inline'}>Duplicate</span>
          </button>
        </>
      )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-[#0f1218] border border-gray-800 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            <div className="p-5 border-b border-gray-800 flex justify-between items-center bg-[#161b22]">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /></svg>
                Your Cloud Seasons
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-gray-800">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar bg-[#0B0F19]">
              {isLoading ? (
                <div className="text-center py-12 text-gray-400 flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                  <p>Loading seasons...</p>
                </div>
              ) : sessions.length === 0 ? (
                <div className="text-center py-12 text-gray-500 flex flex-col items-center gap-3">
                  <svg className="w-12 h-12 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
                  <p>No saved seasons found in the cloud.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {sessions.map(session => (
                    <div key={session.id} className={`flex flex-col justify-between p-5 rounded-xl border transition-all ${currentState.sessionId === session.id ? 'bg-indigo-900/20 border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.1)]' : 'bg-[#161b22] border-gray-800 hover:border-gray-700 hover:shadow-lg hover:bg-[#1a202c]'}`}>
                      <div className="mb-4">
                        <h3 className="font-bold text-gray-200 text-lg line-clamp-1" title={session.name || 'Untitled Season'}>{session.name || 'Untitled Season'}</h3>
                        <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          <span>{new Date(session.updatedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</span>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-auto pt-4 border-t border-gray-800/50">
                        <button 
                          onClick={() => handleLoadSession(session.id)}
                          className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                          Load
                        </button>
                        <button 
                          onClick={() => setSessionToDelete(session.id)}
                          className="bg-red-900/20 hover:bg-red-900/40 text-red-400 border border-red-900/30 hover:border-red-500/50 px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center justify-center"
                          title="Delete Season"
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
      )}

      <ConfirmModal
        isOpen={isConfirmingNew}
        title="Start New Season"
        message="Are you sure? This will clear all current progress."
        onConfirm={confirmNewSession}
        onCancel={() => setIsConfirmingNew(false)}
      />

      <ConfirmModal
        isOpen={!!sessionToDelete}
        title="Delete Season"
        message="Are you sure you want to delete this season? This action cannot be undone."
        onConfirm={confirmDeleteSession}
        onCancel={() => setSessionToDelete(null)}
        isDestructive={true}
        confirmText="Delete"
      />
    </>
  );
};

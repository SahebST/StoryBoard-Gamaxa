import { collection, doc, setDoc, getDocs, deleteDoc, query, where, orderBy, getDoc } from 'firebase/firestore';
import { db, auth } from '@/firebase';
import { AppState } from '@/types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export interface SessionMeta {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export const saveSessionToFirebase = async (sessionId: string, name: string, appState: AppState, createdAt: string): Promise<void> => {
  if (!auth.currentUser) throw new Error("User must be logged in to save a session.");
  
  const path = `sessions/${sessionId}`;
  try {
    // Strip audioBase64 to save cloud storage space
    const stateToSave = { ...appState, audioBase64: null };
    const serializedState = JSON.stringify(stateToSave);
    
    if (serializedState.length > 1000000) {
      throw new Error("Session is too large to save. Try clearing some generated images or audio.");
    }
    
    const now = new Date().toISOString();
    const docRef = doc(db, 'sessions', sessionId);

    await setDoc(docRef, {
      uid: auth.currentUser.uid,
      name,
      appState: serializedState,
      createdAt,
      updatedAt: now
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const loadSessionFromFirebase = async (sessionId: string): Promise<AppState | null> => {
  if (!auth.currentUser) return null;
  
  const path = `sessions/${sessionId}`;
  try {
    const docRef = doc(db, 'sessions', sessionId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return JSON.parse(data.appState) as AppState;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
};

export const listUserSessions = async (): Promise<SessionMeta[]> => {
  if (!auth.currentUser) return [];
  
  const path = 'sessions';
  try {
    const q = query(
      collection(db, 'sessions'), 
      where('uid', '==', auth.currentUser.uid)
    );
    
    const querySnapshot = await getDocs(q);
    const sessions: SessionMeta[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      sessions.push({
        id: doc.id,
        name: data.name,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt
      });
    });
    
    // Sort by updatedAt descending
    return sessions.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
};

export const deleteSessionFromFirebase = async (sessionId: string): Promise<void> => {
  if (!auth.currentUser) return;
  
  const path = `sessions/${sessionId}`;
  try {
    await deleteDoc(doc(db, 'sessions', sessionId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

import { collection, doc, setDoc, getDocs, deleteDoc, query, where, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';

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

export interface Preset {
  id: string;
  name: string;
  instructions: string;
  createdAt: string;
}

export const savePresetToFirebase = async (name: string, instructions: string): Promise<Preset> => {
  if (!auth.currentUser) throw new Error("User must be logged in to save a preset.");
  
  const presetId = Date.now().toString();
  const path = `presets/${presetId}`;
  try {
    if (instructions.length > 50000) {
      throw new Error("Preset instructions are too large.");
    }
    
    const now = new Date().toISOString();
    const docRef = doc(db, 'presets', presetId);

    await setDoc(docRef, {
      uid: auth.currentUser.uid,
      name,
      instructions,
      createdAt: now
    });

    return {
      id: presetId,
      name,
      instructions,
      createdAt: now
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
};

export const listUserPresets = async (): Promise<Preset[]> => {
  if (!auth.currentUser) return [];
  
  const path = 'presets';
  try {
    const q = query(
      collection(db, 'presets'), 
      where('uid', '==', auth.currentUser.uid)
    );
    
    const querySnapshot = await getDocs(q);
    const presets: Preset[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      presets.push({
        id: doc.id,
        name: data.name,
        instructions: data.instructions,
        createdAt: data.createdAt
      });
    });
    
    // Sort by createdAt descending
    return presets.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
};

export const deletePresetFromFirebase = async (presetId: string): Promise<void> => {
  if (!auth.currentUser) return;
  
  const path = `presets/${presetId}`;
  try {
    await deleteDoc(doc(db, 'presets', presetId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

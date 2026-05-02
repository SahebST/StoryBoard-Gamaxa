import { collection, doc, setDoc, getDocs, query, where } from 'firebase/firestore';
import { db, auth } from '@/firebase';
import { AIModel } from '@/types';

export const saveModelsToCloud = async (providerId: string, models: AIModel[]): Promise<void> => {
  if (!auth.currentUser) return;
  
  const cacheId = `${auth.currentUser.uid}_${providerId}`;
  const docRef = doc(db, 'modelCache', cacheId);
  
  try {
    await setDoc(docRef, {
      uid: auth.currentUser.uid,
      providerId,
      models: JSON.stringify(models),
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to save models to cloud:', error);
  }
};

export const getModelsFromCloud = async (providerId: string): Promise<AIModel[] | null> => {
  if (!auth.currentUser) return null;
  
  const cacheId = `${auth.currentUser.uid}_${providerId}`;
  const docRef = doc(db, 'modelCache', cacheId);
  
  try {
    const q = query(
      collection(db, 'modelCache'),
      where('uid', '==', auth.currentUser.uid),
      where('providerId', '==', providerId)
    );
    
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const data = querySnapshot.docs[0].data();
      return JSON.parse(data.models);
    }
    return null;
  } catch (error) {
    console.error('Failed to get models from cloud:', error);
    return null;
  }
};

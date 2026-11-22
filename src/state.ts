import { create } from 'zustand';

export type CivicRole = 'citizen' | 'engineer' | 'officer' | 'auditor';

type SessionState = {
  role: CivicRole;
  language: string;
  authIdentifier: string;
  draftPhotoUri: string | null;
  coordinates: { latitude: number; longitude: number } | null;
  setRole: (role: CivicRole) => void;
  setLanguage: (language: string) => void;
  setAuthIdentifier: (identifier: string) => void;
  setDraftPhotoUri: (uri: string | null) => void;
  setCoordinates: (coordinates: { latitude: number; longitude: number } | null) => void;
};

export const useSessionStore = create<SessionState>((set) => ({
  role: 'citizen',
  language: 'English',
  authIdentifier: '',
  draftPhotoUri: null,
  coordinates: null,
  setRole: (role) => set({ role }),
  setLanguage: (language) => set({ language }),
  setAuthIdentifier: (authIdentifier) => set({ authIdentifier }),
  setDraftPhotoUri: (draftPhotoUri) => set({ draftPhotoUri }),
  setCoordinates: (coordinates) => set({ coordinates }),
}));

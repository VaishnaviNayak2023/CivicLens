import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { seedPosts, seedReports, type Post, type Report, type Role } from './data';

type CivicState = {
  role: Role;
  name: string;
  signedIn: boolean;
  reports: Report[];
  posts: Post[];
  saved: string[];
  setRole: (role: Role) => void;
  signIn: (role: Role, name?: string) => void;
  signOut: () => void;
  createReport: (draft: Omit<Report, 'id' | 'ticket' | 'status' | 'created' | 'votes' | 'due'>) => Report;
  updateReport: (id: string, update: Partial<Report>) => void;
  supportReport: (id: string) => void;
  toggleSaved: (id: string) => void;
  createPost: (body: string) => void;
};

const Context = createContext<CivicState | null>(null);
const safeRead = <T,>(key: string, fallback: T): T => {
  try { const value = localStorage.getItem(key); return value ? JSON.parse(value) as T : fallback; }
  catch { return fallback; }
};

export function CivicProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>(() => safeRead('civiclens-role', 'Citizen'));
  const [name, setName] = useState(() => safeRead('civiclens-name', 'Riya'));
  const [signedIn, setSignedIn] = useState(() => safeRead('civiclens-signed-in', false));
  const [reports, setReports] = useState<Report[]>(() => safeRead('civiclens-reports', seedReports));
  const [posts, setPosts] = useState<Post[]>(() => safeRead('civiclens-posts', seedPosts));
  const [saved, setSaved] = useState<string[]>(() => safeRead('civiclens-saved', ['2049']));

  useEffect(() => { localStorage.setItem('civiclens-role', JSON.stringify(role)); }, [role]);
  useEffect(() => { localStorage.setItem('civiclens-name', JSON.stringify(name)); }, [name]);
  useEffect(() => { localStorage.setItem('civiclens-signed-in', JSON.stringify(signedIn)); }, [signedIn]);
  useEffect(() => { localStorage.setItem('civiclens-reports', JSON.stringify(reports)); }, [reports]);
  useEffect(() => { localStorage.setItem('civiclens-posts', JSON.stringify(posts)); }, [posts]);
  useEffect(() => { localStorage.setItem('civiclens-saved', JSON.stringify(saved)); }, [saved]);

  const value = useMemo<CivicState>(() => ({
    role, name, signedIn, reports, posts, saved,
    setRole,
    signIn: (nextRole, nextName = 'Riya') => { setRole(nextRole); setName(nextName); setSignedIn(true); },
    signOut: () => setSignedIn(false),
    createReport: (draft) => {
      const serial = String(Date.now()).slice(-5);
      const report: Report = { ...draft, id: serial, ticket: `CL-${serial}`, status: 'Verifying', created: 'Just now', votes: 1, due: draft.severity === 'Critical' ? '24 h left' : draft.severity === 'High' ? '72 h left' : '7 d left' };
      setReports((current) => [report, ...current]);
      return report;
    },
    updateReport: (id, update) => setReports((current) => current.map((report) => report.id === id ? { ...report, ...update } : report)),
    supportReport: (id) => setReports((current) => current.map((report) => report.id === id ? { ...report, votes: report.votes + 1 } : report)),
    toggleSaved: (id) => setSaved((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]),
    createPost: (body) => setPosts((current) => [{ id: String(Date.now()), author: name, initials: name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase(), location: 'Panaji · just now', time: 'Open', body, votes: 0, comments: 0 }, ...current]),
  }), [role, name, signedIn, reports, posts, saved]);

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useCivic() {
  const value = useContext(Context);
  if (!value) throw new Error('useCivic must be used inside CivicProvider');
  return value;
}

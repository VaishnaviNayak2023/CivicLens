import { useMemo, useState, type ButtonHTMLAttributes, type FormEvent, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react';
import { Link, Navigate, Outlet, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  Activity, ArrowLeft, ArrowRight, Bell, BookOpen, Camera, Check, CheckCircle2,
  ChevronRight, CircleHelp, Clock3, FileCheck2, Home, Info,
  Landmark, Languages, LockKeyhole, LogOut, Map, MapPin, MessageCircle,
  Plus, Search, Send, ShieldCheck, SlidersHorizontal, ThumbsUp, TrendingUp,
  UserRound, Users, Vote, X,
} from 'lucide-react';
import { categories, type Report, type Role, type Severity, type Status } from './data';
import { useCivic } from './store';
import { supabase } from './supabase';

const roles: Role[] = ['Citizen', 'Engineer', 'Officer'];

function Logo() {
  return <Link to="/home" className="brand" aria-label="CivicLens home"><span className="brand-mark"><ScanMark /></span><span><strong>CivicLens</strong><small>we check they get solved</small></span></Link>;
}
function ScanMark() { return <span className="scan-mark"><span /></span>; }

function Button({ children, variant = 'primary', className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'soft' | 'plain' | 'danger' }) {
  return <button className={`button button-${variant} ${className}`} {...props}>{children}</button>;
}
function SectionTitle({ title, action, to }: { title: string; action?: string; to?: string }) {
  return <div className="section-title"><h2>{title}</h2>{action && to && <Link to={to} className="text-link">{action} <ArrowRight size={16} /></Link>}</div>;
}
function Badge({ children, kind = 'neutral' }: { children: React.ReactNode; kind?: 'neutral' | 'green' | 'amber' | 'red' | 'purple' }) {
  return <span className={`badge badge-${kind}`}>{children}</span>;
}
function statusKind(status: Status): 'neutral' | 'green' | 'amber' | 'red' {
  if (status === 'Resolved') return 'green';
  if (status === 'Overdue' || status === 'Rejected') return 'red';
  if (status === 'Verifying' || status === 'Approved') return 'amber';
  return 'neutral';
}
function ReportStatus({ status }: { status: Status }) { return <Badge kind={statusKind(status)}>{status}</Badge>; }
function SeverityBadge({ severity }: { severity: Severity }) {
  const kind = severity === 'Critical' ? 'red' : severity === 'High' || severity === 'Medium' ? 'amber' : 'green';
  return <Badge kind={kind}>{severity}</Badge>;
}
function PageIntro({ eyebrow, title, description, children }: { eyebrow?: string; title: string; description?: string; children?: ReactNode }) {
  return <div className="page-intro">{eyebrow && <div className="eyebrow">{eyebrow}</div>}<h1>{title}</h1>{description && <p>{description}</p>}{children}</div>;
}
function Field({ label, hint, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  return <label className="field"><span>{label}</span><input {...props} />{hint && <small>{hint}</small>}</label>;
}
function TextArea({ label, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  return <label className="field"><span>{label}</span><textarea {...props} /></label>;
}
function EmptyState({ icon, title, body, action }: { icon: ReactNode; title: string; body: string; action?: ReactNode }) {
  return <div className="empty-state"><span className="empty-icon">{icon}</span><h2>{title}</h2><p>{body}</p>{action}</div>;
}

function SignInPage() {
  const civic = useCivic();
  const navigate = useNavigate();
  const [role, setRole] = useState<Role>('Citizen');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault(); setError(''); setBusy(true);
    try {
      if (supabase && otpSent && role === 'Citizen') {
        const result = await supabase.auth.verifyOtp({ token: code, type: identifier.includes('@') ? 'email' : 'sms', ...(identifier.includes('@') ? { email: identifier } : { phone: identifier }) });
        if (result.error) throw result.error;
      } else if (supabase && role === 'Citizen') {
        if (!identifier.trim()) throw new Error('Enter your phone number or email.');
        const result = identifier.includes('@')
          ? await supabase.auth.signInWithOtp({ email: identifier, options: { shouldCreateUser: true } })
          : await supabase.auth.signInWithOtp({ phone: identifier, options: { shouldCreateUser: true } });
        if (result.error) throw result.error;
        setOtpSent(true); setBusy(false); return;
      } else if (supabase) {
        const result = identifier.includes('@')
          ? await supabase.auth.signInWithPassword({ email: identifier, password })
          : await supabase.auth.signInWithPassword({ phone: identifier, password });
        if (result.error) throw result.error;
      }
      civic.signIn(role, identifier.includes('@') ? identifier.split('@')[0] : 'Riya Naik');
      navigate(role === 'Engineer' ? '/jobs' : role === 'Officer' ? '/officer' : '/home');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'We could not sign you in. Try again.');
    } finally { setBusy(false); }
  }

  return <main className="auth-page">
    <div className="auth-brand"><Logo /></div>
    <section className="auth-card">
      <p className="hand-note">Welcome back</p>
      <h1>Sign in to<br /><strong>CivicLens</strong></h1>
      <div className="role-pills" role="tablist" aria-label="Choose sign-in role">{roles.map((item) => <button key={item} className={role === item ? 'selected' : ''} onClick={() => { setRole(item); setOtpSent(false); }} type="button">{item}</button>)}</div>
      <form onSubmit={submit} className="auth-form">
        <Field label="Phone or email" type="text" autoComplete="username" placeholder="name@example.com" value={identifier} onChange={(event) => setIdentifier(event.target.value)} required />
        {role !== 'Citizen' && <Field label="Department password" type="password" autoComplete="current-password" placeholder="Enter your password" value={password} onChange={(event) => setPassword(event.target.value)} required />}
        {otpSent && <Field label="6 digit code" inputMode="numeric" maxLength={6} placeholder="Enter the code" value={code} onChange={(event) => setCode(event.target.value)} required />}
        {!otpSent && <div className="form-links">{role === 'Citizen' ? <Link to="/forgot-password">Forgot your password?</Link> : <span className="muted small">Demo sign-in skips department credentials.</span>}<button type="button" className="text-link" onClick={() => { setIdentifier(role === 'Citizen' ? 'riya@example.com' : role === 'Engineer' ? 'engineer@civiclens.demo' : 'officer@civiclens.demo'); setPassword('demo1234'); }}>Fill demo details</button></div>}
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="notice-note">{role === 'Citizen' ? 'Citizens sign in with a one-time code.' : 'Engineers and officers use their department ID and password.'} Demo uses simulated civic data.</div>
        <Button type="submit" className="wide-button" disabled={busy}>{busy ? 'Please wait…' : otpSent ? 'Verify code' : role === 'Citizen' ? 'Send sign-in code' : 'Sign in'}</Button>
      </form>
      <p className="auth-footer">New to CivicLens? <Link to="/signup">Create an account</Link></p>
    </section>
  </main>;
}

function SignupPage() {
  const civic = useCivic(); const navigate = useNavigate();
  const [name, setName] = useState(''); const [role, setRole] = useState<Role>('Citizen'); const [language, setLanguage] = useState('English');
  return <main className="auth-page"><div className="auth-brand"><Logo /></div><section className="auth-card signup-card">
    <p className="hand-note">Welcome to CivicLens</p><h1>Who is using<br /><strong>this account?</strong></h1><p className="muted">CivicLens only shows what your role needs.</p>
    <div className="role-options">{roles.map((item) => <button type="button" key={item} className={`role-option ${role === item ? 'active' : ''}`} onClick={() => setRole(item)}><span className="role-initial">{item[0]}</span><span><strong>{item === 'Citizen' ? 'I am a citizen' : item === 'Engineer' ? 'I am on a repair crew' : 'I am a department officer'}</strong><small>{item === 'Citizen' ? 'Report potholes and track repairs' : item === 'Engineer' ? 'Jobs and repair photos' : 'Review, approve and assign'}</small></span>{role === item && <Check size={20} />}</button>)}</div>
    <Field label="Your name" placeholder="Riya Naik" value={name} onChange={(event) => setName(event.target.value)} required />
    <label className="field"><span>Choose your language</span><select value={language} onChange={(event) => setLanguage(event.target.value)}>{['English', 'हिन्दी', 'मराठी', 'कोंकणी', 'ಕನ್ನಡ'].map((item) => <option key={item}>{item}</option>)}</select></label>
    <div className="notice-note">Just trying it? Use the demo citizen, Riya. Data is simulated.</div>
    <Button className="wide-button" onClick={() => { civic.signIn(role, name.trim() || 'Riya Naik'); navigate(role === 'Engineer' ? '/jobs' : role === 'Officer' ? '/officer' : '/home'); }}>Continue</Button>
    <p className="auth-footer">Already registered? <Link to="/signin">Sign in</Link></p>
  </section></main>;
}

function ForgotPasswordPage() {
  const [email, setEmail] = useState(''); const [sent, setSent] = useState(false); const [error, setError] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault(); setError('');
    if (supabase) {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
      if (resetError) { setError(resetError.message); return; }
    }
    setSent(true);
  }
  return <main className="auth-page"><div className="auth-brand"><Logo /></div><section className="auth-card"><Link to="/signin" className="back-link"><ArrowLeft size={17} /> Back to sign in</Link><p className="hand-note">One quick step</p><h1>Forgot your<br /><strong>password?</strong></h1><p className="muted">We will send a code to reset it.</p>{sent ? <div className="notice-note">If the account exists, a reset link is on its way.</div> : <form onSubmit={submit} className="auth-form"><Field label="Phone or email" type="email" placeholder="name@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required /><div className="notice-note">Engineers and officers: ask your department admin to reset your ID.</div>{error && <p className="form-error">{error}</p>}<Button className="wide-button">Send reset code</Button></form>}</section></main>;
}

function ResetPasswordPage() {
  const navigate = useNavigate(); const [password, setPassword] = useState(''); const [done, setDone] = useState(false); const [error, setError] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault(); setError('');
    if (!supabase) { setError('Password reset requires the CivicLens Supabase connection.'); return; }
    const { error: resetError } = await supabase.auth.updateUser({ password });
    if (resetError) { setError(resetError.message); return; }
    setDone(true);
  }
  return <main className="auth-page"><div className="auth-brand"><Logo /></div><section className="auth-card"><p className="hand-note">Almost there</p><h1>Choose a new<br /><strong>password</strong></h1>{done ? <Button className="wide-button" onClick={() => navigate('/signin')}>Back to sign in</Button> : <form onSubmit={submit} className="auth-form"><Field label="New password" type="password" autoComplete="new-password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required /><p className="field-hint">Use at least 8 characters.</p>{error && <p className="form-error">{error}</p>}<Button className="wide-button">Save password</Button></form>}</section></main>;
}

function AuthGate() { const { signedIn } = useCivic(); const location = useLocation(); return signedIn ? <Outlet /> : <Navigate to="/signin" replace state={{ from: location.pathname }} />; }

function Shell() {
  const civic = useCivic(); const navigate = useNavigate(); const location = useLocation();
  const tabs = civic.role === 'Engineer'
    ? [{ to: '/jobs', label: 'Jobs', icon: <Home size={18} /> }, { to: '/map', label: 'Map', icon: <Map size={18} /> }, { to: '/reports', label: 'Reports', icon: <FileCheck2 size={18} /> }, { to: '/profile', label: 'Profile', icon: <UserRound size={18} /> }]
    : civic.role === 'Officer'
      ? [{ to: '/officer', label: 'Queue', icon: <Home size={18} /> }, { to: '/map', label: 'Map', icon: <Map size={18} /> }, { to: '/reports', label: 'Reports', icon: <FileCheck2 size={18} /> }, { to: '/profile', label: 'Profile', icon: <UserRound size={18} /> }]
      : [{ to: '/home', label: 'Home', icon: <Home size={18} /> }, { to: '/map', label: 'Map', icon: <Map size={18} /> }, { to: '/reports', label: 'Reports', icon: <FileCheck2 size={18} /> }, { to: '/profile', label: 'Profile', icon: <UserRound size={18} /> }];
  const active = (to: string) => location.pathname === to || (to === '/reports' && location.pathname.startsWith('/reports/'));
  return <div className="app-shell">
    <header className="topbar"><Logo /><div className="topbar-right"><Link to="/community" className="top-link"><Users size={16} /> Ward 4</Link><Link to="/information" className="top-link desktop-only"><Landmark size={16} /> Civic info</Link><Link to="/alerts" className="top-icon" aria-label="Alerts"><Bell size={19} /><i /></Link><button className="avatar" onClick={() => navigate('/profile')} aria-label="Open profile">{civic.name.charAt(0).toUpperCase()}</button></div></header>
    <main className="main-content"><Outlet /></main>
    <nav className="bottom-nav" aria-label="Main navigation"><div className="nav-pill">{tabs.map((tab) => <Link key={tab.to} to={tab.to} className={`nav-item ${active(tab.to) ? 'active' : ''}`}>{tab.icon}<span>{tab.label}</span></Link>)}</div><button className="nav-add" aria-label="Create a report" onClick={() => navigate('/reports/new')}><Plus size={26} /></button></nav>
    <div className="desktop-shortcuts"><Link to="/community"><Users size={15} /> Community</Link><Link to="/polls"><Vote size={15} /> Polls</Link><Link to="/information"><Info size={15} /> Civic information</Link></div>
  </div>;
}

function PhotoThumb({ label = 'Road photo' }: { label?: string }) { return <div className="photo-thumb" role="img" aria-label={label}><span className="road-hole" /></div>; }

function ReportCard({ report, compact = false }: { report: Report; compact?: boolean }) {
  return <Link to={`/reports/${report.id}`} className={`report-card ${compact ? 'compact' : ''}`}>
    <PhotoThumb />
    <div className="report-card-copy"><div className="report-card-top"><strong>{report.location}</strong><ReportStatus status={report.status} /></div><p>{report.ticket} · {report.category}</p><div className="report-card-bottom"><SeverityBadge severity={report.severity} /><span><ThumbsUp size={14} /> {report.votes}</span><span>{report.due}</span></div></div>
    <ChevronRight className="report-chevron" size={18} />
  </Link>;
}

function HomePage() {
  const civic = useCivic(); const navigate = useNavigate();
  if (civic.role === 'Engineer') return <Navigate to="/jobs" replace />;
  if (civic.role === 'Officer') return <Navigate to="/officer" replace />;
  const resolved = civic.reports.filter((report) => report.status === 'Resolved').length;
  return <>
    <section className="home-hero"><div><p className="hand-note">Small steps,<br />safer roads</p><h1>Good morning,<br /><strong>{civic.name.split(' ')[0]}</strong></h1><p className="hero-subtitle">Here is how your reports are doing.</p></div><div className="hero-actions"><Button onClick={() => navigate('/reports/new')}><Camera size={18} /> Report by photo</Button><Button variant="soft" onClick={() => navigate('/reports/new?voice=1')}>Speak it</Button></div></section>
    <section className="monthly-progress"><div><span>This month</span><strong>{Math.max(3, resolved)} <small>/ 5</small></strong><b>reports fixed and verified</b></div><div className="progress-track"><span style={{ width: `${Math.min(100, Math.max(60, (resolved / 5) * 100))}%` }} /></div></section>
    <section className="section-block"><SectionTitle title="Nearby reports" action="See all" to="/map" /><div className="nearby-grid">{civic.reports.slice(0, 2).map((report) => <ReportCard key={report.id} report={report} compact />)}</div></section>
    <section className="section-block updates-block"><SectionTitle title="Today’s updates" action={`${civic.reports.length} updates`} to="/alerts" /><div className="update-row"><span className="update-mark success"><Check size={17} /></span><strong>Repair verified on MG Road</strong><span className="update-time">4:20 PM</span></div><div className="update-row"><span className="update-mark alert"><X size={17} /></span><strong>Deadline near: Dona Paula Rd</strong><span className="update-time">6 h left</span></div></section>
    <section className="quick-links"><Link to="/community"><Users size={18} /><span><strong>Neighbourhood</strong><small>Share a local update</small></span><ChevronRight size={18} /></Link><Link to="/information"><Landmark size={18} /><span><strong>Civic information</strong><small>Services, notices and contacts</small></span><ChevronRight size={18} /></Link></section>
  </>;
}

function ReportsPage() {
  const { reports } = useCivic(); const [filter, setFilter] = useState('All'); const [search, setSearch] = useState('');
  const filtered = reports.filter((report) => {
    const matchesFilter = filter === 'All' || (filter === 'Open' ? !['Resolved', 'Rejected'].includes(report.status) : filter === 'Verified' ? report.status === 'Resolved' : report.status === 'Rejected');
    const query = search.toLowerCase();
    return matchesFilter && `${report.title} ${report.location} ${report.ticket}`.toLowerCase().includes(query);
  });
  return <><PageIntro eyebrow="Citizen · Ward 4" title="My complaints" description={`${reports.length} reports · ${reports.filter((item) => item.status === 'Resolved').length} verified fixes`} />
    <div className="toolbar"><div className="segmented">{['All', 'Open', 'Verified', 'Rejected'].map((item) => <button key={item} className={filter === item ? 'active' : ''} onClick={() => setFilter(item)}>{item}</button>)}</div><label className="search-field"><Search size={17} /><input placeholder="Search my reports" value={search} onChange={(event) => setSearch(event.target.value)} /></label></div>
    <div className="report-list">{filtered.length ? filtered.map((report) => <ReportCard key={report.id} report={report} />) : <EmptyState icon={<FileCheck2 />} title="No reports found" body="Try another filter or search term." />}</div>
  </>;
}

function MapIllustration({ reports, onSelect }: { reports: Report[]; onSelect: (id: string) => void }) {
  return <div className="map-illustration" aria-label="Map of nearby civic reports"><div className="map-block block-one" /><div className="map-block block-two" /><div className="map-block block-three" /><div className="map-water" /><div className="road road-a" /><div className="road road-b" /><div className="road road-c" /><div className="road road-d" />
    {reports.slice(0, 4).map((report, index) => <button key={report.id} className={`map-pin pin-${index + 1}`} aria-label={`${report.title}, ${report.severity}`} onClick={() => onSelect(report.id)}><MapPin size={18} fill="currentColor" /></button>)}
    <span className="map-label label-mg">MG Road</span><span className="map-label label-dp">Dona Paula</span><span className="map-scale">500 m</span>
  </div>;
}

function MapPage() {
  const civic = useCivic(); const navigate = useNavigate();
  const [search, setSearch] = useState(''); const [filterOpen, setFilterOpen] = useState(false); const [severity, setSeverity] = useState('All'); const [status, setStatus] = useState('All'); const [sort, setSort] = useState('Newest');
  const results = useMemo(() => civic.reports.filter((report) => {
    const matchText = `${report.location} ${report.title} ${report.ticket}`.toLowerCase().includes(search.toLowerCase());
    const matchSeverity = severity === 'All' || report.severity === severity;
    const matchStatus = status === 'All' || (status === 'Open' ? !['Resolved', 'Rejected'].includes(report.status) : status === 'Overdue' ? report.status === 'Overdue' : report.status === 'Resolved');
    return matchText && matchSeverity && matchStatus;
  }).sort((a, b) => sort === 'Most supported' ? b.votes - a.votes : sort === 'Nearest' ? a.location.localeCompare(b.location) : 0), [civic.reports, search, severity, status, sort]);
  return <><PageIntro eyebrow="Ward 4 · Panaji" title="Nearby issues" description="Find reports and follow work happening around you." />
    <div className="map-toolbar"><label className="search-field"><Search size={17} /><input placeholder="Search a road or area" value={search} onChange={(event) => setSearch(event.target.value)} /></label><Button variant="soft" onClick={() => setFilterOpen((open) => !open)}><SlidersHorizontal size={17} /> Filters</Button><select className="sort-select" value={sort} onChange={(event) => setSort(event.target.value)}><option>Newest</option><option>Most supported</option><option>Nearest</option></select></div>
    {filterOpen && <div className="filter-panel"><div><strong>Status</strong>{['All', 'Open', 'Overdue', 'Verified'].map((item) => <button className={`filter-chip ${status === item ? 'active' : ''}`} key={item} onClick={() => setStatus(item)}>{item}</button>)}</div><div><strong>Severity</strong>{['All', 'Low', 'Medium', 'High', 'Critical'].map((item) => <button className={`filter-chip ${severity === item ? 'active' : ''}`} key={item} onClick={() => setSeverity(item)}>{item}</button>)}</div></div>}
    <div className="map-layout"><MapIllustration reports={results} onSelect={(id) => navigate(`/reports/${id}`)} /><aside className="map-results"><div className="result-heading"><strong>{results.length} results</strong><span>Heatmap on</span></div>{results.length ? results.map((report) => <ReportCard key={report.id} report={report} compact />) : <EmptyState icon={<Search />} title="No reports found" body="Try a different road or clear the filters." action={<Button variant="soft" onClick={() => { setSearch(''); setSeverity('All'); setStatus('All'); }}>Clear filters</Button>} />}</aside></div>
  </>;
}

function NewReportPage() {
  const civic = useCivic(); const navigate = useNavigate();
  const [step, setStep] = useState(1); const [category, setCategory] = useState(''); const [title, setTitle] = useState(''); const [description, setDescription] = useState(''); const [location, setLocation] = useState('MG Road, Panaji'); const [photo, setPhoto] = useState<File | null>(null); const [photoPreview, setPhotoPreview] = useState(''); const [severity, setSeverity] = useState<Severity>('High'); const [error, setError] = useState(''); const [submitting, setSubmitting] = useState(false);
  function next() {
    setError('');
    if (step === 1 && !category) return setError('Choose the closest issue category to continue.');
    if (step === 2 && (title.trim().length < 4 || description.trim().length < 10)) return setError('Add a title and at least 10 characters of description.');
    if (step === 3 && !photo) return setError('Add a photo of the issue before continuing.');
    setStep((current) => Math.min(4, current + 1));
  }
  async function locate() {
    if (!navigator.geolocation) return setError('Location is not available in this browser. Enter the location manually.');
    navigator.geolocation.getCurrentPosition(({ coords }) => setLocation(`${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)} · nearby`), () => setError('Location permission was not granted. You can enter the place manually.'));
  }
  async function submit() {
    setSubmitting(true);
    try {
      const image = photo ? await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error('Could not read that photo.')); reader.readAsDataURL(photo); }) : undefined;
      const report = civic.createReport({ title, description, category, location, ward: 'Ward 4', severity, ...(image ? { image } : {}) });
      navigate(`/reports/${report.id}`);
    } catch { setError('Could not attach that photo. Try another image.'); setSubmitting(false); }
  }
  return <><PageIntro eyebrow={`Report an issue · Step ${step} of 4`} title={['', 'What is the problem?', 'Add details', 'Photo and location', 'Ready to file'][step]} description="Nothing is filed until you approve it." />
    <div className="stepper">{['Issue', 'Details', 'Evidence', 'Review'].map((label, index) => <div className={step >= index + 1 ? 'current' : ''} key={label}><span>{step > index + 1 ? <Check size={15} /> : index + 1}</span>{label}</div>)}</div>
    <section className="form-card">
      {step === 1 && <><h2>Choose an issue category</h2><div className="category-grid">{categories.map((item) => <button type="button" key={item.name} className={`category-option ${category === item.name ? 'selected' : ''}`} onClick={() => { setCategory(item.name); setSeverity(item.name === 'Pothole' ? 'High' : 'Medium'); }}><span className="category-dot">{item.name === 'Pothole' ? 'P' : item.name[0]}</span><strong>{item.name}</strong><small>{item.hint}</small>{category === item.name && <CheckCircle2 size={17} />}</button>)}</div><p className="inline-note">Not sure? Choose the closest one. The officer can re-categorise it.</p></>}
      {step === 2 && <div className="form-stack"><Field label="Title" placeholder="Large pothole near the bus stop" value={title} onChange={(event) => setTitle(event.target.value)} required /><TextArea label="Description" placeholder="Deep hole on the left lane. Two-wheelers swerve to avoid it." value={description} onChange={(event) => setDescription(event.target.value)} rows={5} /><p className="field-hint">Add at least 10 characters. A clear description helps crews act faster.</p></div>}
      {step === 3 && <div className="form-stack"><label className="upload-zone"><input type="file" accept="image/*" capture="environment" onChange={(event) => { const file = event.target.files?.[0] ?? null; setPhoto(file); setPhotoPreview(file ? URL.createObjectURL(file) : ''); setError(''); }} /><span className="upload-icon"><Camera size={22} /></span><strong>{photo?.name || 'Add a live photo'}</strong><small>Use your camera or choose a photo from this device.</small></label>{photoPreview && <img className="upload-preview" src={photoPreview} alt="Selected report evidence" />}<div className="location-box"><MapPin size={20} /><div><strong>Report location</strong><small>{location}</small></div><Button type="button" variant="soft" onClick={locate}>Use my location</Button></div><Field label="Location description" value={location} onChange={(event) => setLocation(event.target.value)} /></div>}
      {step === 4 && <div className="review-card"><div className="review-head"><Badge kind="green">{category || 'Issue'}</Badge><SeverityBadge severity={severity} /></div><h2>{title}</h2><p>{description}</p><div className="review-row"><MapPin size={17} /><span>{location}</span></div>{photo && <><div className="review-row"><Camera size={17} /><span>{photo.name}</span></div><img className="review-preview" src={photoPreview} alt="Report evidence preview" /></>}<div className="priority-note">{severity === 'High' ? 'Fix within 72 hours' : severity === 'Critical' ? 'Fix within 24 hours' : 'This report will be reviewed by your ward office.'}</div><p className="muted small">If another report is nearby, you can add your voice to it after submission.</p></div>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="form-actions">{step > 1 && <Button variant="soft" onClick={() => { setError(''); setStep((current) => current - 1); }}>Back</Button>}{step < 4 ? <Button onClick={next}>Continue <ArrowRight size={16} /></Button> : <Button onClick={submit} disabled={submitting}>{submitting ? 'Filing…' : 'Submit report'}</Button>}</div>
    </section>
  </>;
}

function ReportDetailPage() {
  const { reportId = '' } = useParams(); const civic = useCivic(); const navigate = useNavigate();
  const report = civic.reports.find((item) => item.id === reportId) ?? civic.reports[0]; const [tab, setTab] = useState('Timeline');
  const saved = civic.saved.includes(report.id);
  if (!report) return <EmptyState icon={<FileCheck2 />} title="Report not found" body="This report may have been removed." action={<Link to="/reports">Back to reports</Link>} />;
  return <><div className="back-row"><button className="back-link" onClick={() => navigate(-1)}><ArrowLeft size={17} /> Back</button><Badge kind="neutral">{report.ticket}</Badge></div>
    <PageIntro eyebrow={`${report.category} · ${report.location}`} title={report.title} description={report.description}>
      <div className="intro-badges"><ReportStatus status={report.status} /><SeverityBadge severity={report.severity} /><span className="muted">{report.due}</span></div>
    </PageIntro>
    <div className="detail-grid"><section className="detail-main"><div className="service-clock"><div><span>Service clock · {report.severity} severity</span><strong>{report.due}</strong><small>Submitted {report.created}</small></div><Clock3 size={28} /></div>
      <div className="timeline-card"><div className="section-title"><h2>Report progress</h2><button className="text-link" onClick={() => setTab(tab === 'Timeline' ? 'Audit trail' : 'Timeline')}>{tab === 'Timeline' ? 'View audit trail' : 'View timeline'} <ChevronRight size={16} /></button></div>
        {tab === 'Timeline' ? <div className="timeline-list">{['Submitted', 'AI checked', 'Approved', 'Assigned', report.status === 'Resolved' ? 'Resolved' : 'Verifying'].map((item, index) => <div className={`timeline-item ${index < 3 || (report.status === 'Resolved' && index === 4) ? 'done' : ''}`} key={item}><span>{index < 3 || (report.status === 'Resolved' && index === 4) ? <Check size={13} /> : ''}</span><div><strong>{item}</strong><small>{index === 0 ? report.created : index === 4 && report.status === 'Verifying' ? 'After photo uploaded · 40 min ago' : index < 3 ? '18 Nov · verified' : 'Awaiting department update'}</small></div></div>)}</div> : <div className="audit-list">{['Repair verified · record #6', 'After photo uploaded · record #5', 'Assigned to PWD Ward 4 · record #4', 'Approved by officer · record #3'].map((item) => <div key={item}><ShieldCheck size={17} /><span>{item}</span><code>9f2c…a41e</code></div>)}</div>}
      </div>
      <div className="detail-actions"><Button variant="soft" onClick={() => civic.supportReport(report.id)}><ThumbsUp size={16} /> Support · {report.votes}</Button><Button variant="soft" onClick={() => civic.toggleSaved(report.id)}>{saved ? <Check size={16} /> : <Activity size={16} />}{saved ? 'Saved' : 'Save report'}</Button><Button variant="plain" onClick={() => navigate(`/reports/${report.id}/audit`)}>Public audit trail</Button></div>
      {report.status === 'Resolved' && <div className="success-note"><CheckCircle2 size={20} /> All four repair checks passed. Does the road look fixed to you? <Button variant="plain" onClick={() => civic.updateReport(report.id, { status: 'Overdue' })}>Not fixed</Button></div>}
    </section><aside className="detail-aside"><PhotoThumb label="Reported road photo" /><div className="side-card"><h3>Why this priority?</h3><p>{report.severity === 'High' ? 'Main road, near the bus stop, and several linked reports.' : 'Based on the location and the issue details provided.'}</p><div className="side-stat"><span>Location</span><strong>{report.location}</strong></div><div className="side-stat"><span>Ward</span><strong>{report.ward}</strong></div><div className="side-stat"><span>Category</span><strong>{report.category}</strong></div></div><Link className="side-link" to="/map"><MapPin size={17} /> View nearby reports</Link></aside></div>
  </>;
}

function AuditPage() {
  const { reportId = '' } = useParams(); const civic = useCivic(); const report = civic.reports.find((item) => item.id === reportId) ?? civic.reports[0];
  return <><PageIntro eyebrow={`Ticket ${report?.ticket ?? ''} · append-only`} title="Audit trail" description="A public record of every action on this ticket." /><div className="audit-integrity"><ShieldCheck size={22} /><div><strong>Chain intact</strong><small>6 records recomputed just now</small></div><Badge kind="green">Verified</Badge></div><div className="audit-page-list">{['Repair verified · 18 Nov, 4:20 PM', 'After photo uploaded · 18 Nov, 4:12 PM', 'Assigned to PWD Ward 4 · 17 Nov, 9:40 AM', 'Approved by officer · 17 Nov, 9:12 AM', 'AI checks passed · 16 Nov, 5:03 PM', 'Ticket created · 16 Nov, 5:02 PM'].map((line, index) => <div key={line}><span>#{6 - index}</span><strong>{line}</strong><code>{['9f2c…a41e', '77b0…c5d2', '1de8…09ab'][index % 3]} ← {['77b0…c5d2', '1de8…09ab', 'c03f…7e11'][index % 3]}</code></div>)}</div></>;
}

function CommunityPage() {
  const civic = useCivic(); const { posts } = civic; const [feed, setFeed] = useState('Latest'); const navigate = useNavigate(); const [voted, setVoted] = useState<string[]>([]);
  return <><PageIntro eyebrow="Ward 4 · Panaji" title="Neighbourhood" description="Local updates from your ward." /><div className="feed-toolbar"><div className="segmented">{['Latest', 'Trending', 'Polls', 'Notices'].map((item) => <button key={item} className={feed === item ? 'active' : ''} onClick={() => item === 'Polls' ? navigate('/polls') : item === 'Notices' ? navigate('/notices') : setFeed(item)}>{item}</button>)}</div><Button onClick={() => navigate('/community/new')}><Plus size={16} /> Create post</Button></div>
    <div className="feed-list">{posts.map((post) => <article className="post-card" key={post.id}><div className="post-author"><span className="initial-avatar">{post.initials}</span><div><strong>{post.author}</strong><small>{post.location}</small></div><Badge kind={post.time === 'Open' ? 'amber' : 'green'}>{post.time}</Badge></div><button className="post-body" onClick={() => navigate(`/community/${post.id}`)}>{post.body}</button><div className="post-actions"><button onClick={() => setVoted((current) => current.includes(post.id) ? current : [...current, post.id])}><ThumbsUp size={16} /> Support {post.votes + (voted.includes(post.id) ? 1 : 0)}</button><button onClick={() => navigate(`/community/${post.id}`)}><MessageCircle size={16} /> Comments {post.comments}</button><button onClick={() => civic.toggleSaved(post.id)}><Activity size={16} /> Save</button></div></article>)}</div>
  </>;
}

function NewPostPage() {
  const civic = useCivic(); const navigate = useNavigate(); const [type, setType] = useState('Update'); const [title, setTitle] = useState(''); const [body, setBody] = useState(''); const [error, setError] = useState('');
  function submit(event: FormEvent) { event.preventDefault(); if (title.trim().length < 4 || body.trim().length < 10) return setError('Add a title and a few details before posting.'); civic.createPost(`${title.trim()} — ${body.trim()}`); navigate('/community'); }
  return <><PageIntro eyebrow="Share with Ward 4" title="Create a post" description="Share an update, question, or suggestion with your neighbourhood." /><form className="form-card form-stack" onSubmit={submit}><div className="segmented">{['Update', 'Question', 'Suggestion'].map((item) => <button key={item} type="button" className={type === item ? 'active' : ''} onClick={() => setType(item)}>{item}</button>)}</div><Field label="Title" placeholder="Blocked drain near Dona Paula school" value={title} onChange={(event) => setTitle(event.target.value)} /><TextArea label="Details" rows={5} placeholder="Describe what you saw and when." value={body} onChange={(event) => setBody(event.target.value)} /><div className="location-box"><MapPin size={18} /><span>Dona Paula school gate</span><Badge kind="green">Ward 4</Badge></div>{error && <p className="form-error">{error}</p>}<div className="form-actions"><Button type="submit">Post to Ward 4</Button></div></form></>;
}

function PostDetailPage() {
  const { postId = '' } = useParams(); const civic = useCivic(); const post = civic.posts.find((item) => item.id === postId) ?? civic.posts[0]; const [comment, setComment] = useState(''); const [comments, setComments] = useState(['Same here. Drain near the gate is blocked.', 'Crew booked for tomorrow 11 AM. Will post the after photo.']);
  function send(event: FormEvent) { event.preventDefault(); if (!comment.trim()) return; setComments((current) => [...current, comment.trim()]); setComment(''); }
  return <><PageIntro eyebrow="Dona Paula · Anita Fernandes" title="Neighbourhood post" /><article className="post-card post-detail"><div className="post-author"><span className="initial-avatar">{post.initials}</span><div><strong>{post.author}</strong><small>{post.location}</small></div><Badge kind="amber">{post.time}</Badge></div><p>{post.body}</p><div className="post-actions"><button><ThumbsUp size={16} /> Support {post.votes}</button><button><MessageCircle size={16} /> {comments.length} comments</button></div></article><section className="comments"><SectionTitle title="Comments" /><div className="comment-list">{comments.map((item, index) => <div className="comment" key={`${index}-${item}`}><span className="initial-avatar small-avatar">{index === 0 ? 'MK' : 'SP'}</span><div><strong>{index === 0 ? 'Meera Kamat' : 'Sanjay P. · PWD'}</strong><p>{item}</p><small>{index === 0 ? '1 h ago · Support 8' : '40 min ago'}</small></div></div>)}</div><form className="comment-form" onSubmit={send}><input aria-label="Write a comment" placeholder="Add a comment" value={comment} onChange={(event) => setComment(event.target.value)} /><Button aria-label="Send comment"><Send size={17} /></Button></form></section></>;
}

function PollsPage() {
  const [selected, setSelected] = useState<Record<string, string>>({}); const [submitted, setSubmitted] = useState<string[]>([]);
  const polls = [{ id: 'road', question: 'Which road should be resurfaced first this quarter?', options: ['MG Road', 'Dona Paula Rd', 'Porvorim Link Rd'], votes: [48, 31, 21], total: 214 }, { id: 'speed', question: 'Add speed breakers near Dona Paula school?', options: ['Yes', 'No', 'Need more information'], votes: [0, 0, 0], total: 0 }];
  return <><PageIntro eyebrow="Ward 4 · Have your say" title="Polls" description="Help decide local priorities. One vote per citizen." /><div className="poll-list">{polls.map((poll) => <section className="poll-card" key={poll.id}><h2>{poll.question}</h2><div className="poll-options">{poll.options.map((option, index) => <button key={option} className={`poll-option ${selected[poll.id] === option ? 'chosen' : ''}`} onClick={() => !submitted.includes(poll.id) && setSelected((current) => ({ ...current, [poll.id]: option }))}><span>{option}</span>{submitted.includes(poll.id) && <><i style={{ width: `${poll.votes[index] || (option === selected[poll.id] ? 49 : 25)}%` }} /><strong>{poll.votes[index] || (option === selected[poll.id] ? 49 : 25)}%</strong></>}</button>)}</div><div className="poll-bottom"><span>{poll.total || 215} votes · Ends in {poll.id === 'road' ? '2 days' : '5 days'}</span>{submitted.includes(poll.id) ? <Badge kind="green">Vote recorded</Badge> : <Button disabled={!selected[poll.id]} onClick={() => setSubmitted((current) => [...current, poll.id])}>Vote</Button>}</div></section>)}</div></>;
}

function InformationPage() {
  const navigate = useNavigate(); return <><PageIntro eyebrow="Services, notices and contacts" title="Civic information" description="Find public services, notices and the people responsible for your ward." /><label className="search-field information-search"><Search size={17} /><input placeholder="Search services or departments" onChange={(event) => { if (event.target.value.toLowerCase().includes('notice')) navigate('/notices'); }} /></label><div className="info-grid"><InfoCard icon={<Bell />} title="Public notices" copy="Roads, water, power and awareness updates." action="4 new" to="/notices" /><InfoCard icon={<Landmark />} title="Departments" copy="PWD, Water, Sanitation and more." action="View departments" to="/department" /><InfoCard icon={<PhoneIcon />} title="Important contacts" copy="Helplines and ward representatives." action="Ward office" to="/department" /><InfoCard icon={<BookOpen />} title="Public services" copy="How to report potholes, drainage and other issues." action="Read service guide" to="/department" /><div className="info-feature"><span className="eyebrow">Public services</span><h2>Pothole and road repair</h2><p>Target: 24 h critical to 14 d low.</p><button onClick={() => navigate('/reports/new')}>Report a road issue <ArrowRight size={16} /></button></div></div></>;
}
function PhoneIcon() { return <CircleHelp />; }
function InfoCard({ icon, title, copy, action, to }: { icon: ReactNode; title: string; copy: string; action: string; to: string }) { return <Link className="info-card" to={to}><span className="info-icon">{icon}</span><h2>{title}</h2><p>{copy}</p><strong>{action} <ChevronRight size={15} /></strong></Link>; }

function NoticesPage() {
  const [category, setCategory] = useState('All'); const items = [{ type: 'Water', date: '22 Nov', title: 'Supply interruption, Dona Paula', body: '24 Nov, 10 AM to 4 PM for pipeline work.' }, { type: 'Roads', date: '21 Nov', title: 'MG Road lane closed for resurfacing', body: 'Closed 11 PM to 5 AM for two nights.' }, { type: 'Awareness', date: '20 Nov', title: 'Monsoon road safety advisory', body: 'Report waterlogged potholes with a live photo.' }, { type: 'Power', date: '19 Nov', title: 'Planned maintenance, Caranzalem', body: '25 Nov, 9 AM to 12 PM.' }];
  const visible = items.filter((item) => category === 'All' || item.type === category);
  return <><PageIntro eyebrow="Panaji Ward 4" title="Public notices" description="Updates from departments and ward offices." /><div className="segmented notice-filters">{['All', 'Roads', 'Water', 'Power', 'Awareness'].map((item) => <button key={item} className={category === item ? 'active' : ''} onClick={() => setCategory(item)}>{item}</button>)}</div><div className="notice-list">{visible.map((item) => <article className="notice-card" key={item.title}><div className="notice-card-top"><Badge kind={item.type === 'Roads' ? 'amber' : 'green'}>{item.type}</Badge><span>{item.date}</span></div><h2>{item.title}</h2><p>{item.body}</p></article>)}</div></>;
}

function DepartmentPage() {
  return <><PageIntro eyebrow="Public Works Department" title="PWD Ward 4" description="Department contacts and service standards for Panaji Ward 4." /><div className="department-score"><div><span>Efficiency score</span><strong>82 <small>/ 100</small></strong><p>41 h average to resolve</p></div><TrendingUp size={26} /></div><section className="service-clocks"><SectionTitle title="Service clocks" /><div className="severity-grid"><Badge kind="red">Critical · 24 h</Badge><Badge kind="amber">High · 72 h</Badge><Badge kind="amber">Medium · 7 d</Badge><Badge kind="green">Low · 14 d</Badge></div></section><div className="side-card contact-card"><h2>Ward office</h2><p><strong>Phone</strong><span>0832-000 0000</span></p><p><strong>Hours</strong><span>Mon to Sat, 9 AM to 5:30 PM</span></p><p><strong>Officer</strong><span>R. Naik</span></p><small>Contact numbers shown here are placeholders.</small><Button variant="soft" onClick={() => window.location.href = 'tel:0832000000'}>Call ward office</Button></div></>;
}

function JobsPage() {
  const civic = useCivic(); const navigate = useNavigate(); const [day, setDay] = useState('Fri'); const jobs = civic.reports.filter((report) => !['Resolved', 'Rejected'].includes(report.status));
  return <><PageIntro eyebrow="PWD Ward 4 · Engineer" title="Today’s jobs" description="Your assigned work and repair photo queue." ><Badge kind="green">Offline queue: 0</Badge></PageIntro><div className="week-strip">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((item, index) => <button key={item} onClick={() => setDay(item)} className={day === item ? 'active' : ''}><span>{item}</span><strong>{16 + index}</strong></button>)}</div><div className="job-list">{jobs.map((report, index) => <article className={`job-card ${index === 0 ? 'job-critical' : ''}`} key={report.id}><div className="job-card-top"><SeverityBadge severity={report.severity} /><Badge kind={report.severity === 'Critical' ? 'red' : 'amber'}>{report.due}</Badge></div><h2>{report.location}</h2><p>{report.title}</p><div className="job-meta"><span><MapPin size={14} /> {index ? '2.4 km away' : '0.8 km away'}</span><span><Clock3 size={14} /> {report.ticket}</span></div><label className="button button-primary job-upload"><Camera size={16} /> Upload repair photo<input type="file" accept="image/*" capture="environment" onChange={(event) => { const file = event.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => civic.updateReport(report.id, { status: 'Verifying', image: String(reader.result) }); reader.readAsDataURL(file); }} /></label><Button variant="soft" onClick={() => navigate(`/reports/${report.id}`)}>Open job details <ArrowRight size={15} /></Button></article>)}</div></>;
}

function OfficerPage() {
  const civic = useCivic(); const navigate = useNavigate(); const [tab, setTab] = useState('All 14'); const queue = civic.reports.filter((item) => item.status !== 'Resolved' && item.status !== 'Rejected').filter((item) => tab.startsWith('Needs review') ? item.status === 'Verifying' : tab.startsWith('Overdue') ? item.status === 'Overdue' : true);
  return <><PageIntro eyebrow="Officer R. Naik · Ward 4" title="Review queue" description="Department efficiency · 82 / 100" ><div className="intro-badges"><Badge kind="amber">{queue.length} open</Badge><Badge kind="red">3 overdue</Badge></div></PageIntro><div className="metric-row"><div><span>Department efficiency</span><strong>82 <small>/ 100</small></strong></div><div><span>Open reports</span><strong>{queue.length}</strong></div><div><span>Overdue</span><strong>3</strong></div></div><div className="segmented officer-tabs">{['All 14', 'Needs review 2', 'Overdue 3'].map((item) => <button key={item} className={tab === item ? 'active' : ''} onClick={() => setTab(item)}>{item}</button>)}</div><div className="report-list">{queue.map((report) => <button className="queue-row" key={report.id} onClick={() => navigate(`/reports/${report.id}/review`)}><PhotoThumb /><div><div className="queue-head"><SeverityBadge severity={report.severity} /><ReportStatus status={report.status} /></div><strong>{report.location}</strong><p>{report.ticket} · AI confidence 94% · authenticity 0.97</p></div><ChevronRight /></button>)}</div><Button variant="soft" onClick={() => navigate('/stats')}>Department statistics <ArrowRight size={16} /></Button></>;
}

function StatsPage() {
  const civic = useCivic(); return <><PageIntro eyebrow="Ward 4 · last 30 days" title="Department stats" description="Verified fixes and response times for your ward." /><div className="stats-hero"><strong>82</strong><span>Efficiency score<br />Up 6 points this month.</span></div><div className="stat-grid"><div><strong>41 h</strong><span>Average to resolve</span></div><div><strong>91%</strong><span>Verified first time</span></div><div><strong>{civic.reports.filter((item) => item.status === 'Overdue').length || 3}</strong><span>Overdue now</span></div></div><section className="section-block"><SectionTitle title="Resolved per week" /><div className="chart-bars">{[9, 12, 11, 17].map((value, index) => <div key={value}><span style={{ height: `${value * 7}px` }} /><small>W{index + 1}</small><b>{value}</b></div>)}</div></section><section className="section-block"><SectionTitle title="Recurring trouble spots" /><p className="trouble-row">MG Road near bus stop <Badge kind="amber">5 repeats</Badge></p><p className="trouble-row">Dona Paula school zone <Badge kind="amber">3 repeats</Badge></p></section></>;
}

function ReportReviewPage() {
  const { reportId = '' } = useParams(); const civic = useCivic(); const navigate = useNavigate(); const report = civic.reports.find((item) => item.id === reportId) ?? civic.reports[0]; const [reason, setReason] = useState(''); const [assign, setAssign] = useState('Sanjay P., Engineer');
  return <><div className="back-row"><Link to="/officer" className="back-link"><ArrowLeft size={17} /> Review queue</Link><Badge>{report.ticket}</Badge></div><PageIntro eyebrow={`${report.location} · ${report.category}`} title="Review report" description="AI supports your judgement and never replaces it." /><div className="review-score-grid"><div><span>Authenticity</span><strong>0.97</strong></div><div><span>Depth</span><strong>6.5 ±1.5 cm</strong></div><div><span>Estimated cost</span><strong>₹2.3k</strong></div></div><div className="side-card form-stack"><label className="field"><span>Assign to</span><select value={assign} onChange={(event) => setAssign(event.target.value)}><option>Sanjay P., Engineer</option><option>Ward 4 repair crew</option><option>Unassigned</option></select></label><TextArea label="Reason (required to reject)" placeholder="Add a reason shown to the citizen" value={reason} onChange={(event) => setReason(event.target.value)} rows={3} /><div className="form-actions"><Button variant="danger" disabled={!reason.trim()} onClick={() => { civic.updateReport(report.id, { status: 'Rejected' }); navigate('/officer'); }}>Reject</Button><Button onClick={() => { civic.updateReport(report.id, { status: 'Approved' }); navigate('/officer'); }}>Approve and assign</Button></div><p className="field-hint">Every action is added to the public audit trail.</p></div></>;
}

function AlertsPage() {
  const [snoozed, setSnoozed] = useState(false); const [done, setDone] = useState(false);
  return <><PageIntro eyebrow="Three things need you" title="Alerts" description="Updates about reports you follow." />{done ? <EmptyState icon={<CheckCircle2 />} title="All caught up" body="We will tell you the moment a report moves." action={<Link to="/home">Back to home</Link>} /> : <div className="alert-list"><article className="alert-card success-alert"><Badge kind="green">Repair verified</Badge><h2>Your MG Road repair was verified</h2><p>All four checks passed. See the before and after.</p><Link to="/reports/2057">See the evidence <ArrowRight size={15} /></Link></article><article className="alert-card warning-alert"><Badge kind="red">Needs you now</Badge><h2>Deadline near on Dona Paula Rd</h2><p>6 hours left. The officer has been reminded.</p><div className="alert-actions"><Link to="/reports/2049">Open report</Link><button onClick={() => setSnoozed(true)}>{snoozed ? 'Reminder snoozed' : 'Remind me later'}</button></div></article><article className="alert-card"><Badge>Earlier</Badge><h2>Confirm two words in your voice report</h2><p>Jan-Vaani was not sure about “bus stop” and “pothole”.</p><Link to="/reports/2057">Review words <ArrowRight size={15} /></Link></article><Button variant="soft" onClick={() => setDone(true)}>Mark all as read</Button></div>}</>;
}

function ProfilePage() {
  const civic = useCivic(); const navigate = useNavigate(); const [quiet, setQuiet] = useState(true);
  const rows = [{ label: 'Alerts and SMS', description: 'Push, SMS, quiet hours', icon: <Bell />, to: '/settings/alerts' }, { label: 'Language and text size', description: 'English, Medium', icon: <Languages />, to: '/settings/language' }, { label: 'Photo privacy', description: 'Faces and plates blurred', icon: <LockKeyhole />, to: '/settings/privacy' }, { label: 'Help and support', description: 'FAQ and contact', icon: <CircleHelp />, to: '/help' }, { label: 'Terms and privacy', description: 'Version 1.0', icon: <BookOpen />, to: '/legal' }];
  return <><PageIntro eyebrow="You control your data" title="Profile and privacy" /><div className="profile-card"><span className="avatar large-avatar">{civic.name[0]}</span><div><strong>{civic.name}</strong><small>+91 98765 43210 · {civic.role}</small></div><button className="text-link" onClick={() => navigate('/settings')}>Edit</button></div><div className="settings-list">{rows.map((row) => <Link key={row.label} to={row.to} className="settings-row"><span className="settings-icon">{row.icon}</span><span><strong>{row.label}</strong><small>{row.description}</small></span><ChevronRight size={17} /></Link>)}</div><section className="profile-section"><h2>Switch role <small>demo only</small></h2><div className="role-pills small-pills">{roles.map((role) => <button key={role} className={civic.role === role ? 'selected' : ''} onClick={() => { civic.setRole(role); navigate(role === 'Engineer' ? '/jobs' : role === 'Officer' ? '/officer' : '/home'); }}>{role}</button>)}</div><h2>Privacy</h2><div className="setting-toggle"><span><strong>Quiet hours</strong><small>10 PM to 7 AM</small></span><button className={`toggle ${quiet ? 'on' : ''}`} aria-label="Toggle quiet hours" onClick={() => setQuiet(!quiet)} /></div><p className="muted small">Public audit records never show your name.</p></section><Button variant="plain" onClick={() => { civic.signOut(); navigate('/signin'); }}><LogOut size={17} /> Log out</Button></>;
}

function SettingPage({ kind }: { kind: 'alerts' | 'language' | 'privacy' }) {
  const navigate = useNavigate(); const [saved, setSaved] = useState(false); const [language, setLanguage] = useState('English'); const [textSize, setTextSize] = useState('Medium');
  const title = kind === 'alerts' ? 'Alerts and SMS' : kind === 'language' ? 'Language and text size' : 'Photo privacy';
  return <><div className="back-row"><button className="back-link" onClick={() => navigate('/profile')}><ArrowLeft size={17} /> Profile and privacy</button></div><PageIntro eyebrow={kind === 'privacy' ? 'Applied on your device before upload' : 'Account and app preferences'} title={title} description={kind === 'alerts' ? 'Choose what reaches you.' : kind === 'language' ? 'Voice reporting works in all of them.' : 'Choose how report photos are handled.'} />
    <div className="settings-list settings-card">{kind === 'alerts' && ['Push alerts', 'SMS fallback', 'Repair verified', 'Deadline near', 'Crew assigned'].map((item, index) => <ToggleRow key={item} label={item} description={['On this phone', 'If push cannot reach you', 'With before and after', '6 hours before', 'When a crew takes the job'][index]} defaultOn={index < 4} />)}
      {kind === 'privacy' && ['Blur faces', 'Blur number plates', 'Remove personal photo data', 'Show my name on public tickets'].map((item, index) => <ToggleRow key={item} label={item} description={['Automatic', 'Automatic', 'Strips device details', 'Off keeps you anonymous'][index]} defaultOn={index < 3} />)}
      {kind === 'language' && <><label className="field"><span>Language</span><select value={language} onChange={(event) => setLanguage(event.target.value)}>{['English', 'हिन्दी', 'मराठी', 'कोंकणी', 'ಕನ್ನಡ'].map((item) => <option key={item}>{item}</option>)}</select></label><div className="field"><span>Text size</span><div className="segmented">{['Small', 'Medium', 'Large'].map((item) => <button key={item} onClick={() => setTextSize(item)} className={textSize === item ? 'active' : ''}>{item}</button>)}</div></div><div className="preview-note"><strong>Preview</strong><p>Pothole on MG Road, near the bus stop.</p></div></>}
    </div>{kind === 'alerts' && <div className="notice-note">Critical deadline alerts still arrive during quiet hours.</div>}{kind === 'privacy' && <div className="notice-note">Public audit records never show your name.</div>}{saved ? <p className="success-text"><CheckCircle2 size={16} /> Preferences saved.</p> : null}<Button onClick={() => setSaved(true)}>Save</Button></>;
}
function ToggleRow({ label, description, defaultOn }: { label: string; description: string; defaultOn: boolean }) { const [on, setOn] = useState(defaultOn); return <div className="setting-toggle"><span><strong>{label}</strong><small>{description}</small></span><button type="button" role="switch" aria-checked={on} aria-label={label} className={`toggle ${on ? 'on' : ''}`} onClick={() => setOn(!on)} /></div>; }

function HelpPage() { const [open, setOpen] = useState('How do I know a repair is real?'); const questions = [{ q: 'How do I know a repair is real?', a: 'A repair is closed only after four checks pass: location, visual match, pothole gone and an authentic photo. You can also confirm or dispute it.' }, { q: 'Why can’t I upload from my gallery?', a: 'Live photos help verify that a repair happened at the reported place and time.' }, { q: 'What if my language is not listed?', a: 'Voice reporting supports additional languages. Choose the closest one in settings.' }, { q: 'Can I delete a report?', a: 'Tickets are part of a public audit trail and cannot be deleted.' }]; return <><PageIntro eyebrow="Quick answers first" title="Help and support" /><div className="segmented"><button className="active">Reporting</button><button>Verification</button><button>Privacy</button></div><div className="faq-list">{questions.map(({ q, a }) => <button className={`faq-item ${open === q ? 'open' : ''}`} key={q} onClick={() => setOpen(open === q ? '' : q)}><span><strong>{q}</strong>{open === q && <p>{a}</p>}</span>{open === q ? <X size={16} /> : <Plus size={16} />}</button>)}</div><div className="notice-note">Still stuck? <Link to="/support">Contact support</Link></div></>; }
function SupportPage() { const [message, setMessage] = useState(''); const [sent, setSent] = useState(false); return <><PageIntro eyebrow="Tell us what happened" title="Contact support" description="Replies come as an alert in the app and by SMS." />{sent ? <EmptyState icon={<CheckCircle2 />} title="Message sent" body="We will reply in the app and by SMS." /> : <form className="form-card form-stack" onSubmit={(event) => { event.preventDefault(); if (message.trim().length > 4) setSent(true); }}><label className="field"><span>About</span><select><option>A report</option><option>My account</option><option>Other</option></select></label><Field label="Ticket (optional)" placeholder="CL-2057" /><TextArea label="Message" rows={5} placeholder="What should we look at?" value={message} onChange={(event) => setMessage(event.target.value)} /><Button>Send message</Button></form>}</>; }
function LegalPage() { return <><PageIntro eyebrow="Version 1.0" title="Privacy and terms" /><section className="legal-card"><h2>What we collect</h2><p>Your location only while you report, live photos you take, and voice clips only if you approve them.</p><h2>What is public</h2><p>Ticket history, photos of the road and repair checks. Your name is never shown.</p><h2>Your controls</h2><p>Download your data, or delete your profile and voice clips at any time.</p><h2>Using CivicLens</h2><p>Report real road problems you have seen. AI estimates are planning estimates; crews measure on site.</p><h2>Audit records</h2><p>Tickets cannot be deleted. Every action is added to an append-only trail.</p></section></>; }

function SettingsPage() { const navigate = useNavigate(); const settings = [{ name: 'Alerts and SMS', sub: 'Push, SMS, quiet hours', path: '/settings/alerts', icon: <Bell /> }, { name: 'Language and text size', sub: 'English, Medium', path: '/settings/language', icon: <Languages /> }, { name: 'Photo privacy', sub: 'Faces and plates blurred', path: '/settings/privacy', icon: <LockKeyhole /> }, { name: 'Help and support', sub: 'FAQ and contact', path: '/help', icon: <CircleHelp /> }, { name: 'Terms and privacy', sub: 'Version 1.0', path: '/legal', icon: <BookOpen /> }]; return <><PageIntro eyebrow="Account and app preferences" title="Settings" /><div className="settings-list">{settings.map((row) => <Link key={row.name} to={row.path} className="settings-row"><span className="settings-icon">{row.icon}</span><span><strong>{row.name}</strong><small>{row.sub}</small></span><ChevronRight size={17} /></Link>)}</div><Button variant="plain" onClick={() => navigate('/profile')}>Back to profile</Button></>; }
function NotFound() { return <EmptyState icon={<CircleHelp />} title="Page not found" body="This CivicLens page does not exist." action={<Link to="/home">Back to home</Link>} />; }

export function App() {
  return <Routes>
    <Route path="/" element={<Navigate to="/signin" replace />} />
    <Route path="/signin" element={<SignInPage />} /><Route path="/signup" element={<SignupPage />} /><Route path="/forgot-password" element={<ForgotPasswordPage />} /><Route path="/reset-password" element={<ResetPasswordPage />} />
    <Route element={<AuthGate />}>
      <Route element={<Shell />}>
        <Route path="/home" element={<HomePage />} /><Route path="/map" element={<MapPage />} /><Route path="/reports" element={<ReportsPage />} /><Route path="/reports/new" element={<NewReportPage />} /><Route path="/reports/:reportId" element={<ReportDetailPage />} /><Route path="/reports/:reportId/audit" element={<AuditPage />} />
        <Route path="/community" element={<CommunityPage />} /><Route path="/community/new" element={<NewPostPage />} /><Route path="/community/:postId" element={<PostDetailPage />} /><Route path="/polls" element={<PollsPage />} /><Route path="/information" element={<InformationPage />} /><Route path="/notices" element={<NoticesPage />} /><Route path="/department" element={<DepartmentPage />} />
        <Route path="/jobs" element={<JobsPage />} /><Route path="/officer" element={<OfficerPage />} /><Route path="/reports/:reportId/review" element={<ReportReviewPage />} /><Route path="/stats" element={<StatsPage />} /><Route path="/alerts" element={<AlertsPage />} />
        <Route path="/profile" element={<ProfilePage />} /><Route path="/settings" element={<SettingsPage />} /><Route path="/settings/alerts" element={<SettingPage kind="alerts" />} /><Route path="/settings/language" element={<SettingPage kind="language" />} /><Route path="/settings/privacy" element={<SettingPage kind="privacy" />} /><Route path="/help" element={<HelpPage />} /><Route path="/support" element={<SupportPage />} /><Route path="/legal" element={<LegalPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Route>
  </Routes>;
}

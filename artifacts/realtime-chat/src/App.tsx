import { useEffect, useRef, useState, type ButtonHTMLAttributes, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import {
  useHealthCheck,
  useRegister,
  useLogin,
  useLogout,
  useGetMe,
  getGetMeQueryKey,
  useSearchUsers,
  getSearchUsersQueryKey,
  useUpdateProfile,
  useListConversations,
  getListConversationsQueryKey,
  useCreateConversation,
  useListMessages,
  getListMessagesQueryKey,
  useCreateMessage,
  useDeleteMessage,
  useMarkConversationRead,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { io, type Socket } from 'socket.io-client';
import { Link, useLocation } from 'wouter';
import {
  ArrowLeft,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronLeft,
  CircleAlert,
  LogOut,
  Menu,
  MessageCircle,
  MoreHorizontal,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserPlus,
  Users,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import {
  Route,
  Switch,
  Router as WouterRouter,
} from 'wouter';

const queryClient = new QueryClient();
let activeSocket: Socket | null = null;

function useRealtime(userId?: string) {
  const [connected, setConnected] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) {
      setConnected(false);
      return;
    }

    const socket = io({
      path: '/api/socket.io',
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 600,
    });
    activeSocket = socket;

    const refreshChat = () => {
      queryClient.invalidateQueries();
    };
    const updatePresence = ({ userId: changedId, isOnline, lastSeen }: { userId: string; isOnline: boolean; lastSeen: string | null }) => {
      queryClient.setQueryData(getListConversationsQueryKey(), (current: any[] | undefined) =>
        Array.isArray(current) ? current.map((conversation) =>
          conversation.participant.id === changedId
            ? { ...conversation, participant: { ...conversation.participant, isOnline, lastSeen } }
            : conversation,
        ) : current,
      );
    };

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('connect_error', () => setConnected(false));
    socket.on('new_message', refreshChat);
    socket.on('message_delivered', refreshChat);
    socket.on('message_read', refreshChat);
    socket.on('message_deleted', refreshChat);
    socket.on('user_online', updatePresence);
    socket.on('user_offline', updatePresence);

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      if (activeSocket === socket) activeSocket = null;
      setConnected(false);
    };
  }, [queryClient, userId]);

  return { connected, socket: activeSocket };
}

function Avatar({ name, avatar, online = false, size = 'md' }: { name?: string; avatar?: string | null; online?: boolean; size?: 'sm' | 'md' | 'lg' }) {
  const initials = (name || '?').split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
  const sizes = { sm: 'h-8 w-8 text-[10px]', md: 'h-10 w-10 text-xs', lg: 'h-14 w-14 text-lg' };
  return <span className={`relative inline-flex shrink-0 ${sizes[size]}`}><span className="flex h-full w-full items-center justify-center overflow-hidden rounded-[1.1rem] bg-primary/15 font-bold text-primary">{avatar ? <img src={avatar} alt="" className="h-full w-full object-cover" /> : initials}</span>{online && <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card bg-primary" />}</span>;
}

function Button({ children, className = '', variant = 'primary', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'soft' | 'danger' }) {
  const variants = { primary: 'bg-primary text-primary-foreground shadow-sm hover:brightness-95', ghost: 'text-muted-foreground hover:bg-muted hover:text-foreground', soft: 'bg-secondary text-secondary-foreground hover:bg-secondary/75', danger: 'text-destructive hover:bg-destructive/10' };
  return <button {...props} className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all duration-200 active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`} />;
}

function Input({ className = '', ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`w-full rounded-xl border bg-background px-3.5 py-3 text-sm outline-none transition-all placeholder:text-muted-foreground/70 focus:border-primary focus:ring-4 focus:ring-primary/10 ${className}`} />;
}

function LoadingScreen() {
  return <div className="flex min-h-[100dvh] items-center justify-center bg-background"><div className="w-64 space-y-3"><div className="skeleton h-3 w-20 rounded-full" /><div className="skeleton h-10 w-full rounded-2xl" /><div className="skeleton h-10 w-4/5 rounded-2xl" /><div className="skeleton h-24 w-full rounded-2xl" /></div></div>;
}

function AuthLayout({ children, eyebrow, title, detail }: { children: ReactNode; eyebrow: string; title: string; detail: string }) {
  return <main className="flex min-h-[100dvh] items-center justify-center overflow-hidden bg-background px-5 py-10"><div className="absolute left-0 top-0 h-72 w-72 -translate-x-1/3 -translate-y-1/3 rounded-full bg-primary/15 blur-3xl" /><div className="absolute bottom-0 right-0 h-80 w-80 translate-x-1/3 translate-y-1/3 rounded-full bg-accent/20 blur-3xl" /><section className="relative grid w-full max-w-5xl overflow-hidden rounded-[2rem] border bg-card shadow-float lg:grid-cols-[.85fr_1.15fr]"><div className="hidden bg-primary p-12 text-primary-foreground lg:block"><Link href="/" className="flex items-center gap-2 text-sm font-extrabold tracking-tight"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-accent-foreground"><MessageCircle size={18} /></span>relay</Link><div className="mt-28"><div className="mb-8 h-1 w-14 rounded-full bg-accent" /><h2 className="max-w-xs text-4xl font-extrabold leading-tight">Good conversations have room to breathe.</h2><p className="mt-5 max-w-xs text-sm leading-6 text-primary-foreground/70">A calmer place for the people you talk to most.</p></div><div className="mt-28 flex items-center gap-3 text-xs text-primary-foreground/60"><ShieldCheck size={16} /> Private by default</div></div><div className="p-7 sm:p-12"><div className="mb-10 lg:hidden"><Link href="/" className="flex items-center gap-2 text-sm font-extrabold"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground"><MessageCircle size={18} /></span>relay</Link></div><p className="font-mono-app text-[11px] font-medium uppercase tracking-[.18em] text-primary">{eyebrow}</p><h1 className="mt-3 text-3xl font-extrabold tracking-[-.04em] sm:text-4xl">{title}</h1><p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground">{detail}</p><div className="mt-8">{children}</div></div></section></main>;
}

function Login() {
  const login = useLogin();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const submit = (event: FormEvent) => { event.preventDefault(); setError(''); login.mutate({ data: { email, password } }, { onSuccess: () => setLocation('/'), onError: () => setError('That email and password combination did not work.') }); };
  return <AuthLayout eyebrow="Welcome back" title="Pick up where you left off." detail="Your conversations are waiting, exactly where you left them."><form onSubmit={submit} className="space-y-5"><label className="block text-sm font-bold">Email<Input data-testid="input-email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className="mt-2" /></label><label className="block text-sm font-bold">Password<Input data-testid="input-password" type="password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" className="mt-2" /></label>{error && <ErrorNotice message={error} />}{login.isPending && <p className="text-xs text-muted-foreground">Checking your details…</p>}<Button data-testid="button-submit-login" type="submit" className="w-full py-3.5">Sign in <ArrowLeft className="rotate-180" size={16} /></Button><p className="text-center text-sm text-muted-foreground">New to relay? <Link data-testid="link-register" href="/register" className="font-bold text-primary hover:underline">Create an account</Link></p></form></AuthLayout>;
}

function Register() {
  const register = useRegister();
  const [, setLocation] = useLocation();
  const [form, setForm] = useState({ name: '', username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const submit = (event: FormEvent) => { event.preventDefault(); setError(''); register.mutate({ data: form }, { onSuccess: () => setLocation('/'), onError: () => setError('We could not create that account. Check your details and try again.') }); };
  const update = (key: keyof typeof form) => (event: ChangeEvent<HTMLInputElement>) => setForm({ ...form, [key]: event.target.value });
  return <AuthLayout eyebrow="Make an account" title="A better way to stay close." detail="Choose a handle your people will remember. You can change the rest later."><form onSubmit={submit} className="space-y-4"><label className="block text-sm font-bold">Your name<Input data-testid="input-name" required minLength={2} value={form.name} onChange={update('name')} placeholder="Mina Park" className="mt-2" /></label><label className="block text-sm font-bold">Username<Input data-testid="input-username" required minLength={3} value={form.username} onChange={update('username')} placeholder="minapark" className="mt-2" /></label><label className="block text-sm font-bold">Email<Input data-testid="input-email" type="email" required value={form.email} onChange={update('email')} placeholder="you@example.com" className="mt-2" /></label><label className="block text-sm font-bold">Password<Input data-testid="input-password" type="password" required minLength={8} value={form.password} onChange={update('password')} placeholder="At least 8 characters" className="mt-2" /></label>{error && <ErrorNotice message={error} />}<Button data-testid="button-submit-register" type="submit" className="mt-2 w-full py-3.5">Create account <ArrowLeft className="rotate-180" size={16} /></Button><p className="text-center text-sm text-muted-foreground">Already have an account? <Link data-testid="link-login" href="/login" className="font-bold text-primary hover:underline">Sign in</Link></p></form></AuthLayout>;
}

function ErrorNotice({ message }: { message: string }) { return <div role="alert" data-testid="status-error" className="flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2.5 text-xs font-semibold text-destructive"><CircleAlert size={15} className="mt-0.5 shrink-0" />{message}</div>; }

function AppNav({ me, onLogout, online }: { me: any; onLogout: () => void; online: boolean }) {
  const [location] = useLocation();
  const [menu, setMenu] = useState(false);
  return <header className="flex h-[4.5rem] items-center justify-between border-b bg-card/80 px-4 backdrop-blur-xl sm:px-7"><Link data-testid="link-brand" href="/" className="flex items-center gap-2.5"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground"><MessageCircle size={18} /></span><span className="text-lg font-extrabold tracking-[-.05em]">relay</span></Link><div className="flex items-center gap-2"><span data-testid="status-connection" className="hidden items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1.5 text-[10px] font-bold text-muted-foreground sm:flex">{online ? <Wifi size={12} className="text-primary" /> : <WifiOff size={12} className="text-destructive" />}{online ? 'Connected' : 'Offline'}</span><div className="relative"><button data-testid="button-account-menu" onClick={() => setMenu(!menu)} className="flex items-center gap-2 rounded-xl p-1.5 pr-2 transition-colors hover:bg-muted"><Avatar name={me.name} avatar={me.avatar} online={me.isOnline} size="sm" /><span className="hidden text-left sm:block"><span className="block text-xs font-bold">{me.name}</span><span className="block text-[10px] text-muted-foreground">@{me.username}</span></span><ChevronDown size={14} className="text-muted-foreground" /></button>{menu && <div className="absolute right-0 top-12 z-30 w-48 rounded-2xl border bg-card p-1.5 shadow-float"><Link data-testid="link-settings" href="/settings" onClick={() => setMenu(false)} className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold hover:bg-muted ${location === '/settings' ? 'bg-muted' : ''}`}><Settings size={15} /> Settings</Link><button data-testid="button-logout" onClick={onLogout} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-destructive hover:bg-destructive/10"><LogOut size={15} /> Sign out</button></div>}</div></div></header>;
}

function Home() {
  const { data: me, isError: authError } = useGetMe({ query: { queryKey: getGetMeQueryKey(), retry: false } });
  const [, setLocation] = useLocation();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileList, setMobileList] = useState(true);
  const { data: conversations, isLoading, isError, refetch } = useListConversations({ query: { queryKey: getListConversationsQueryKey(), refetchInterval: 12000 } });
  const logout = useLogout();
  const health = useHealthCheck({ query: { queryKey: ['/api/healthz'], refetchInterval: 30000 } });
  const realtime = useRealtime(me?.id);
  const list = Array.isArray(conversations) ? conversations : [];
  const selected = list.find((conversation) => conversation.id === selectedId) || list[0];
  useEffect(() => { if (authError) setLocation('/login'); }, [authError, setLocation]);
  useEffect(() => { if (!selectedId && list[0]) setSelectedId(list[0].id); }, [selectedId, list]);
  if (!me) return <LoadingScreen />;
  return <div className="flex min-h-[100dvh] flex-col bg-background"><AppNav me={me} online={realtime.connected && !health.isError} onLogout={() => logout.mutate(undefined, { onSuccess: () => setLocation('/login') })} /><main className="mx-auto flex min-h-0 w-full max-w-[1500px] flex-1 overflow-hidden p-0 md:p-5"><div className={`w-full md:grid md:grid-cols-[minmax(270px,340px)_1fr] md:gap-4 ${mobileList ? '' : 'hidden md:grid'}`}><ConversationList conversations={list} selectedId={selected?.id} isLoading={isLoading} isError={isError} onRetry={() => refetch()} onSelect={(id) => { setSelectedId(id); setMobileList(false); }} /></div><div className={`min-w-0 flex-1 ${mobileList ? 'hidden md:flex' : 'flex'}`}>{selected ? <Thread conversation={selected} me={me} onBack={() => setMobileList(true)} /> : <EmptyThread onCreate={() => setMobileList(true)} />}</div></main></div>;
}

function ConversationList({ conversations, selectedId, isLoading, isError, onRetry, onSelect }: { conversations: any[]; selectedId?: string; isLoading: boolean; isError: boolean; onRetry: () => void; onSelect: (id: string) => void }) {
  const [search, setSearch] = useState('');
  const [showNew, setShowNew] = useState(false);
  const visible = conversations.filter((conversation) => `${conversation.participant.name} ${conversation.participant.username}`.toLowerCase().includes(search.toLowerCase()));
  return <aside className="flex min-h-0 flex-col border-r bg-card md:rounded-[1.5rem] md:border md:shadow-soft"><div className="flex items-center justify-between p-5 pb-3"><div><p className="font-mono-app text-[10px] uppercase tracking-[.16em] text-primary">Your circle</p><h1 className="mt-1 text-2xl font-extrabold tracking-[-.05em]">Messages</h1></div><button data-testid="button-new-conversation" onClick={() => setShowNew(true)} className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-accent-foreground transition-transform hover:rotate-3"><UserPlus size={18} /></button></div><div className="px-5 pb-4"><div className="relative"><Search size={15} className="absolute left-3 top-3.5 text-muted-foreground" /><Input data-testid="input-search-conversations" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search conversations" className="pl-9 py-2.5" /></div></div><div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">{isLoading ? <div className="space-y-2 p-3"><div className="skeleton h-16 rounded-2xl" /><div className="skeleton h-16 rounded-2xl" /><div className="skeleton h-16 rounded-2xl" /></div> : isError ? <div className="m-3 rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-sm"><p className="font-bold text-destructive">Could not load messages.</p><button data-testid="button-retry-conversations" onClick={onRetry} className="mt-2 font-bold text-destructive underline">Try again</button></div> : visible.length ? visible.map((conversation) => <button data-testid={`button-conversation-${conversation.id}`} key={conversation.id} onClick={() => onSelect(conversation.id)} className={`group flex w-full items-center gap-3 rounded-2xl p-3 text-left transition-all ${selectedId === conversation.id ? 'bg-primary text-primary-foreground shadow-soft' : 'hover:bg-muted'}`}><Avatar name={conversation.participant.name} avatar={conversation.participant.avatar} online={conversation.participant.isOnline} /><span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-2"><span className="truncate text-sm font-extrabold">{conversation.participant.name}</span><span className={`font-mono-app text-[10px] ${selectedId === conversation.id ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>{formatTime(conversation.lastMessageAt)}</span></span><span className={`mt-1 block truncate text-xs ${selectedId === conversation.id ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>{conversation.lastMessage || 'Start a conversation'}</span></span>{conversation.unreadCount > 0 && <span className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-extrabold ${selectedId === conversation.id ? 'bg-accent text-accent-foreground' : 'bg-accent text-accent-foreground'}`}>{conversation.unreadCount}</span>}</button>) : <div className="px-4 py-14 text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground"><Users size={20} /></div><p className="mt-4 text-sm font-bold">{search ? 'No matches here' : 'Your circle is quiet'}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{search ? 'Try a different name or handle.' : 'Start a conversation with someone you know.'}</p></div>}</div>{showNew && <NewConversation onClose={() => setShowNew(false)} onCreated={(id) => onSelect(id)} />}</aside>;
}

function NewConversation({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const [q, setQ] = useState('');
  const create = useCreateConversation();
  const query = useSearchUsers({ q }, { query: { enabled: q.trim().length > 0, queryKey: getSearchUsersQueryKey({ q }), staleTime: 15000 } });
  const results = query.data ?? [];
  return <div className="fixed inset-0 z-40 flex items-end justify-center bg-foreground/20 p-0 backdrop-blur-sm sm:items-center sm:p-5"><div className="w-full max-w-md rounded-t-[2rem] border bg-card p-6 shadow-float sm:rounded-[2rem]"><div className="flex items-center justify-between"><div><p className="font-mono-app text-[10px] uppercase tracking-[.16em] text-primary">New thread</p><h2 className="mt-1 text-xl font-extrabold">Who do you want to reach?</h2></div><button data-testid="button-close-new-conversation" onClick={onClose} className="rounded-xl p-2 text-muted-foreground hover:bg-muted"><X size={18} /></button></div><div className="relative mt-5"><Search size={15} className="absolute left-3 top-3.5 text-muted-foreground" /><Input data-testid="input-search-users" autoFocus value={q} onChange={(event) => setQ(event.target.value)} placeholder="Search by name or username" className="pl-9" /></div><div className="mt-3 max-h-64 overflow-y-auto">{q.trim() && query.isLoading && <p className="p-4 text-sm text-muted-foreground">Looking around…</p>}{q.trim() && query.isError && <ErrorNotice message="Search is unavailable right now." />}{q.trim() && !query.isLoading && !query.isError && !results.length && <p className="p-4 text-sm text-muted-foreground">No people found. Ask them to create an account first.</p>}{results.map((user) => <button data-testid={`button-user-result-${user.id}`} key={user.id} disabled={create.isPending} onClick={() => create.mutate({ data: { participantId: user.id } }, { onSuccess: (conversation) => { onCreated(conversation.id); onClose(); } })} className="flex w-full items-center gap-3 rounded-2xl p-3 text-left hover:bg-muted"><Avatar name={user.name} avatar={user.avatar} online={user.isOnline} /><span><span className="block text-sm font-extrabold">{user.name}</span><span className="block text-xs text-muted-foreground">@{user.username}</span></span><ArrowLeft className="ml-auto rotate-180 text-muted-foreground" size={16} /></button>)}</div>{!q.trim() && <p className="mt-5 rounded-xl bg-secondary p-3 text-xs leading-5 text-muted-foreground">Search for a name or handle to start a one-to-one thread.</p>}</div></div>;
}

function EmptyThread({ onCreate }: { onCreate: () => void }) { return <section className="flex min-h-[70vh] flex-1 items-center justify-center bg-card p-6 md:rounded-[1.5rem] md:border md:shadow-soft"><div className="max-w-xs text-center"><div className="mx-auto flex h-16 w-16 rotate-3 items-center justify-center rounded-[1.4rem] bg-accent text-accent-foreground"><Sparkles size={26} /></div><h2 className="mt-6 text-2xl font-extrabold tracking-[-.04em]">Make the first move.</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Choose someone from your circle, then let the conversation find its rhythm.</p><Button data-testid="button-start-conversation" onClick={onCreate} className="mt-6">Start a conversation</Button></div></section>; }

function Thread({ conversation, me, onBack }: { conversation: any; me: any; onBack: () => void }) {
  const [draft, setDraft] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [before, setBefore] = useState<string | undefined>();
  const [optimistic, setOptimistic] = useState<any[]>([]);
  const [latestMessages, setLatestMessages] = useState<any[]>([]);
  const [olderMessages, setOlderMessages] = useState<any[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const key = getListMessagesQueryKey(conversation.id, before ? { before, limit: 50 } : { limit: 50 });
  const { data, isLoading, isError, refetch } = useListMessages(conversation.id, before ? { before, limit: 50 } : { limit: 50 }, { query: { queryKey: key } });
  const create = useCreateMessage();
  const remove = useDeleteMessage();
  const read = useMarkConversationRead();
  const [typing, setTyping] = useState(false);
  const loadedMessages = before ? [...olderMessages, ...latestMessages] : data?.messages || [];
  const messages = [...loadedMessages, ...optimistic.filter((message) => !loadedMessages.some((loaded) => loaded.id === message.id))];
  useEffect(() => { setOptimistic([]); setBefore(undefined); setLatestMessages([]); setOlderMessages([]); }, [conversation.id]);
  useEffect(() => {
    if (!before && data?.messages) setLatestMessages(data.messages);
    if (before && data?.messages) {
      setOlderMessages((current) => {
        const known = new Set(current.map((message) => message.id));
        return [...data.messages.filter((message) => !known.has(message.id)), ...current];
      });
    }
  }, [before, data?.messages]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [data?.messages?.length, conversation.id]);
  useEffect(() => { if (conversation.unreadCount > 0) read.mutate({ conversationId: conversation.id }); }, [conversation.id, conversation.unreadCount]);
  useEffect(() => {
    const socket = activeSocket;
    if (!socket) return;
    socket.emit('join_conversation', conversation.id);
    const onTypingStart = ({ userId }: { userId: string }) => {
      if (userId !== me.id) setTyping(true);
    };
    const onTypingStop = ({ userId }: { userId: string }) => {
      if (userId !== me.id) setTyping(false);
    };
    socket.on('typing_start', onTypingStart);
    socket.on('typing_stop', onTypingStop);
    return () => {
      socket.emit('leave_conversation', conversation.id);
      socket.off('typing_start', onTypingStart);
      socket.off('typing_stop', onTypingStop);
    };
  }, [conversation.id, me.id]);
  useEffect(() => {
    const socket = activeSocket;
    if (!socket || !draft.trim()) return;
    socket.emit('typing_start', { conversationId: conversation.id });
    const timeout = window.setTimeout(() => socket.emit('typing_stop', { conversationId: conversation.id }), 700);
    return () => window.clearTimeout(timeout);
  }, [conversation.id, draft]);
  const send = (event: FormEvent) => { event.preventDefault(); const content = draft.trim(); if (!content || create.isPending) return; setDraft(''); create.mutate({ data: { conversationId: conversation.id, content, replyTo } }, { onSuccess: (message) => { setOptimistic((current) => [...current, message]); setReplyTo(null); queryClient.invalidateQueries({ queryKey: getListMessagesQueryKey(conversation.id, { limit: 50 }) }); }, onError: () => setDraft(content) }); };
  const deleteOne = (id: string) => { if (window.confirm('Delete this message?')) remove.mutate({ messageId: id }, { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListMessagesQueryKey(conversation.id, { limit: 50 }) }); setOptimistic((items) => items.filter((item) => item.id !== id)); } }); };
  return <section className="flex min-h-0 flex-1 flex-col bg-card md:rounded-[1.5rem] md:border md:shadow-soft"><header className="flex items-center gap-3 border-b px-4 py-3.5 sm:px-6"><button data-testid="button-back-conversations" onClick={onBack} className="rounded-xl p-2 text-muted-foreground hover:bg-muted md:hidden"><ChevronLeft size={20} /></button><Avatar name={conversation.participant.name} avatar={conversation.participant.avatar} online={conversation.participant.isOnline} /><div className="min-w-0 flex-1"><h2 className="truncate text-sm font-extrabold">{conversation.participant.name}</h2><p className="text-xs text-muted-foreground">{typing ? 'Typing…' : conversation.participant.isOnline ? 'Active now' : conversation.participant.lastSeen ? `Last seen ${formatTime(conversation.participant.lastSeen)}` : `@${conversation.participant.username}`}</p></div><button data-testid="button-thread-more" className="rounded-xl p-2 text-muted-foreground hover:bg-muted"><MoreHorizontal size={19} /></button></header><div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-6 sm:px-8"><div className="mx-auto w-full max-w-2xl">{data?.hasMore && <Button data-testid="button-load-older" variant="soft" onClick={() => { const first = data.messages[0]; if (first) setBefore(first.createdAt); }} className="mx-auto mb-5 block text-xs">Load earlier messages</Button>}{isLoading ? <div className="space-y-3"><div className="skeleton ml-auto h-14 w-2/3 rounded-2xl" /><div className="skeleton h-12 w-1/2 rounded-2xl" /><div className="skeleton ml-auto h-20 w-3/4 rounded-2xl" /></div> : isError ? <div className="py-16 text-center"><ErrorNotice message="This conversation could not be loaded." /><Button data-testid="button-retry-messages" onClick={() => refetch()} variant="soft" className="mt-4">Try again</Button></div> : messages.length ? <div className="space-y-2">{messages.map((message, index) => <MessageBubble key={`${message.id}-${index}`} message={message} mine={message.senderId === me.id} onReply={() => setReplyTo(message.id)} onDelete={() => deleteOne(message.id)} />)}</div> : <div className="py-20 text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-primary"><MessageCircle size={21} /></div><p className="mt-4 text-sm font-extrabold">No messages yet</p><p className="mt-1 text-xs text-muted-foreground">Say something kind. Or unexpected.</p></div>}<div ref={bottomRef} /></div></div><div className="border-t bg-card px-4 py-3.5 sm:px-8 sm:py-4"><div className="mx-auto max-w-2xl">{replyTo && <div className="mb-2 flex items-center justify-between rounded-xl bg-secondary px-3 py-2 text-xs text-muted-foreground"><span>Replying to a message</span><button data-testid="button-cancel-reply" onClick={() => setReplyTo(null)}><X size={14} /></button></div>}<form onSubmit={send} className="flex items-end gap-2 rounded-2xl border bg-background p-1.5 pl-4 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10"><textarea data-testid="input-message" value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); send(event); } }} rows={1} maxLength={4000} placeholder={`Message ${conversation.participant.name.split(' ')[0]}`} className="max-h-32 min-h-10 flex-1 resize-none bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground" /><button data-testid="button-send-message" disabled={!draft.trim() || create.isPending} type="submit" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-all hover:brightness-95 disabled:opacity-40"><Send size={16} /></button></form><div className="mt-2 flex justify-between px-1 text-[10px] text-muted-foreground"><span>Enter to send · Shift + Enter for a new line</span><span>{draft.length}/4000</span></div></div></div></section>;
}

function MessageBubble({ message, mine, onReply, onDelete }: { message: any; mine: boolean; onReply: () => void; onDelete: () => void }) {
  const [actions, setActions] = useState(false);
  return <div className={`message-in group flex ${mine ? 'justify-end' : 'justify-start'}`}><div className={`relative max-w-[84%] sm:max-w-[68%] ${mine ? 'items-end' : 'items-start'} flex flex-col`}><div className={`rounded-[1.25rem] px-4 py-3 text-sm leading-6 ${mine ? 'rounded-br-md bg-primary text-primary-foreground' : 'rounded-bl-md bg-secondary text-secondary-foreground'}`}><p className="whitespace-pre-wrap break-words">{message.content}</p></div><div className={`mt-1 flex items-center gap-1.5 px-1 font-mono-app text-[9px] text-muted-foreground ${mine ? 'flex-row-reverse' : ''}`}><span>{formatTime(message.createdAt)}</span>{mine && (message.status === 'read' ? <CheckCheck size={12} className="text-primary" /> : message.status === 'delivered' ? <CheckCheck size={12} /> : <Check size={12} />)}</div>{<div className={`absolute top-1/2 -translate-y-1/2 ${mine ? '-left-20' : '-right-20'} hidden items-center gap-1 rounded-xl border bg-card p-1 shadow-soft group-hover:flex`}><button data-testid={`button-reply-message-${message.id}`} onClick={onReply} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted" title="Reply"><MessageCircle size={13} /></button>{mine && <button data-testid={`button-delete-message-${message.id}`} onClick={onDelete} className="rounded-lg p-1.5 text-destructive hover:bg-destructive/10" title="Delete"><Trash2 size={13} /></button>}</div>}</div></div>;
}

function SettingsPage() {
  const { data: me } = useGetMe({ query: { queryKey: getGetMeQueryKey() } });
  const update = useUpdateProfile();
  const logout = useLogout();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [saved, setSaved] = useState(false);
  const [dark, setDark] = useState(() => localStorage.getItem('relay-theme') === 'dark');
  const [form, setForm] = useState({ name: '', username: '', bio: '', avatar: '' });
  useEffect(() => { if (me) setForm({ name: me.name, username: me.username, bio: me.bio || '', avatar: me.avatar || '' }); }, [me]);
  useEffect(() => { document.documentElement.classList.toggle('dark', dark); localStorage.setItem('relay-theme', dark ? 'dark' : 'light'); }, [dark]);
  if (!me) return <LoadingScreen />;
  const submit = (event: FormEvent) => { event.preventDefault(); update.mutate({ data: { ...form, bio: form.bio || null, avatar: form.avatar || null } }, { onSuccess: (user) => { queryClient.setQueryData(getGetMeQueryKey(), user); setSaved(true); window.setTimeout(() => setSaved(false), 2400); } }); };
  return <div className="min-h-[100dvh] bg-background"><AppNav me={me} online onLogout={() => logout.mutate(undefined, { onSuccess: () => setLocation('/login') })} /><main className="mx-auto max-w-3xl px-5 py-8 sm:px-8 sm:py-12"><Link data-testid="link-back-home" href="/" className="mb-8 inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground"><ChevronLeft size={16} /> Back to messages</Link><div className="mb-10"><p className="font-mono-app text-[10px] uppercase tracking-[.16em] text-primary">Your space</p><h1 className="mt-2 text-4xl font-extrabold tracking-[-.06em]">Settings</h1><p className="mt-2 text-sm text-muted-foreground">Keep your profile current and make relay feel like yours.</p></div><div className="space-y-5"><section className="rounded-[1.5rem] border bg-card p-5 shadow-soft sm:p-7"><div className="flex items-center gap-4 border-b pb-5"><Avatar name={me.name} avatar={me.avatar} online={me.isOnline} size="lg" /><div><h2 className="font-extrabold">Profile</h2><p className="mt-1 text-xs text-muted-foreground">This is how people see you.</p></div></div><form onSubmit={submit} className="mt-6 space-y-4"><label className="block text-sm font-bold">Name<Input data-testid="input-profile-name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="mt-2" /></label><label className="block text-sm font-bold">Username<Input data-testid="input-profile-username" value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} className="mt-2" /></label><label className="block text-sm font-bold">Bio<textarea data-testid="input-profile-bio" maxLength={280} value={form.bio} onChange={(event) => setForm({ ...form, bio: event.target.value })} className="mt-2 min-h-24 w-full resize-y rounded-xl border bg-background px-3.5 py-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10" placeholder="A small detail about you" /></label><label className="block text-sm font-bold">Avatar URL<span className="mt-2 block text-xs font-normal text-muted-foreground">Optional. Use a square image URL.</span><Input data-testid="input-profile-avatar" value={form.avatar} onChange={(event) => setForm({ ...form, avatar: event.target.value })} className="mt-2" placeholder="https://…" /></label><div className="flex items-center justify-end gap-3 pt-2">{saved && <span data-testid="status-profile-saved" className="flex items-center gap-1 text-xs font-bold text-primary"><Check size={14} /> Saved</span>}{update.isError && <span className="text-xs font-bold text-destructive">Could not save</span>}<Button data-testid="button-save-profile" type="submit" disabled={update.isPending}>{update.isPending ? 'Saving…' : 'Save changes'}</Button></div></form></section><section className="rounded-[1.5rem] border bg-card p-5 shadow-soft sm:p-7"><div className="flex items-start justify-between gap-4"><div><h2 className="font-extrabold">Appearance</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">A softer palette for daylight. A deeper one for late nights.</p></div><button data-testid="button-toggle-theme" onClick={() => setDark(!dark)} className={`relative h-7 w-12 rounded-full p-1 transition-colors ${dark ? 'bg-primary' : 'bg-secondary'}`}><span className={`block h-5 w-5 rounded-full bg-card shadow-sm transition-transform ${dark ? 'translate-x-5' : ''}`} /></button></div><div className="mt-5 flex items-center gap-3 rounded-xl bg-secondary/60 p-3 text-xs text-muted-foreground"><Sparkles size={15} className="text-accent" /> Theme preference is saved on this device.</div></section><section className="rounded-[1.5rem] border bg-card p-5 shadow-soft sm:p-7"><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 text-primary" size={20} /><div><h2 className="font-extrabold">Account & privacy</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">Your conversations are one-to-one and your profile is only visible to people who search for you.</p><p className="mt-4 font-mono-app text-[10px] uppercase tracking-[.12em] text-muted-foreground">Member since {new Date(me.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</p></div></div></section></div></main></div>;
}

function formatTime(value?: string | null) { if (!value) return ''; const date = new Date(value); const today = new Date(); if (date.toDateString() === today.toDateString()) return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); return date.toLocaleDateString([], { month: 'short', day: 'numeric' }); }

function Router() {
  return (
    // Keep a shared shell (sidebar, navbar) outside the boundary so it
    // survives a page crash.
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route path="/settings" component={SettingsPage} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

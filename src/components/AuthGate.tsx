import { createContext, useContext, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { setStorageUserId } from '../lib/persistence';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

interface AuthGateProps {
  children: ReactNode;
}

interface AuthContextValue {
  user: User;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthGate.');
  return value;
}

export function AuthGate({ children }: AuthGateProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let active = true;
    const applySession = (nextSession: Session | null) => {
      setStorageUserId(nextSession?.user.id ?? null);
      setSession(nextSession);
    };
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (active) applySession(nextSession);
    });

    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) setErrorMessage(error.message);
      applySession(data.session);
      setLoading(false);
    }).catch((error: unknown) => {
      if (!active) return;
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load your session.');
      setLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) return;

    setSubmitting(true);
    setErrorMessage('');
    setNotice('');
    try {
      if (mode === 'sign-in') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        if (!data.session) {
          setNotice('Check your email to confirm your account, then sign in.');
          setMode('sign-in');
        }
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Authentication failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const signOut = async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  if (!isSupabaseConfigured) {
    return (
      <AuthShell>
        <h1 className="font-serif font-bold text-2xl text-almanac-ink">Connect Supabase Auth</h1>
        <p className="text-sm text-almanac-muted leading-relaxed">
          Supabase Auth is enabled in the project dashboard, but this app still needs the project URL
          and public key. Add <code>VITE_SUPABASE_URL</code>, <code>VITE_SUPABASE_ANON_KEY</code>,{' '}
          <code>SUPABASE_URL</code>, and <code>SUPABASE_ANON_KEY</code> to <code>.env</code>, then
          restart the app.
        </p>
        <p className="text-xs text-almanac-muted">
          Use the project&apos;s publishable/anon key only. Never put a service-role key in the browser.
        </p>
      </AuthShell>
    );
  }

  if (loading) {
    return (
      <AuthShell>
        <p className="text-sm text-almanac-muted">Checking your Supabase session…</p>
      </AuthShell>
    );
  }

  if (!session) {
    return (
      <AuthShell>
        <div className="space-y-2">
          <span className="text-xs font-mono uppercase tracking-wider text-almanac-forest font-bold">
            Private farm workspace
          </span>
          <h1 className="font-serif font-bold text-2xl text-almanac-ink">
            {mode === 'sign-in' ? 'Welcome back, farmer' : 'Create your account'}
          </h1>
          <p className="text-sm text-almanac-muted">
            Sign in to open your farm planner.
          </p>
        </div>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block space-y-1.5 text-sm font-medium text-almanac-ink">
            Email
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-almanac-borderDark bg-white px-3 py-2.5 text-gray-900 outline-none focus:ring-2 focus:ring-almanac-forest/30"
            />
          </label>
          <label className="block space-y-1.5 text-sm font-medium text-almanac-ink">
            Password
            <input
              type="password"
              autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-almanac-borderDark bg-white px-3 py-2.5 text-gray-900 outline-none focus:ring-2 focus:ring-almanac-forest/30"
            />
          </label>
          {errorMessage && (
            <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">
              {errorMessage}
            </p>
          )}
          {notice && (
            <p role="status" className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              {notice}
            </p>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-almanac-forest btn-forest px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
          >
            {submitting ? 'Please wait…' : mode === 'sign-in' ? 'Sign in' : 'Create account'}
          </button>
        </form>
        <button
          type="button"
          className="text-sm font-semibold text-almanac-forest hover:underline"
          onClick={() => {
            setMode((current) => (current === 'sign-in' ? 'sign-up' : 'sign-in'));
            setErrorMessage('');
            setNotice('');
          }}
        >
          {mode === 'sign-in' ? 'New here? Create an account' : 'Already registered? Sign in'}
        </button>
      </AuthShell>
    );
  }

  return (
    <AuthContext.Provider value={{ user: session.user, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen flex items-center justify-center bg-almanac-bg p-4">
      <section className="w-full max-w-md space-y-6 rounded-3xl border border-almanac-border bg-almanac-card p-7 shadow-xl">
        <div className="space-y-1">
          <p className="text-xs font-mono uppercase tracking-widest text-almanac-forest font-bold">
            Tomatoes with TARS
          </p>
          <p className="text-xs text-almanac-muted">NASA Farm Almanac</p>
        </div>
        {children}
      </section>
    </main>
  );
}

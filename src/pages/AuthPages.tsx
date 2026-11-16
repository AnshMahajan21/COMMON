import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { CommonLogo, HeadingWithAccent } from '../components/BrandAndIcons';

const DEMO_ACCOUNTS = [
  {
    email: 'aarav@common.in',
    name: 'Aarav Sharma',
    summary: 'Lodhi Colony · Walks, Photography & Cycling',
    tint: 'bg-[#E9EDC9] border-[#D7DEB0]',
  },
  {
    email: 'meera@common.in',
    name: 'Meera Nair',
    summary: 'Hauz Khas · Cafés, Sketching & Board Games',
    tint: 'bg-[#FAEDCD] border-[#EAD8B0]',
  },
  {
    email: 'kabir@common.in',
    name: 'Kabir Verma',
    summary: 'Gurugram · Badminton, Cycling & Music',
    tint: 'bg-[#CCD5AE] border-[#B9C496]',
  },
];

export function LoginPage() {
  const { login, demoLogin } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const nextPath = searchParams.get('next') || '/activities';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password) {
      setError('Please enter both your email address and password.');
      return;
    }

    setSubmitting(true);
    try {
      await login(email.trim(), password);
      navigate(nextPath, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Sign in failed. Please check your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemo = async (demoEmail: string) => {
    setError('');
    setSubmitting(true);
    try {
      await demoLogin(demoEmail);
      navigate(nextPath, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Could not sign into demo account.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto py-4 space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex justify-center">
          <CommonLogo />
        </div>
        <HeadingWithAccent
          as="h1"
          prefix="Welcome back to"
          accent="COMMON"
          className="text-3xl font-bold pt-2"
        />
        <p className="text-sm text-[#5A4D3F]">
          Sign in to join activities, connect with people, and share experiences.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-2xl bg-[#FAEDCD] border border-[#D4A373] px-4 py-3 text-sm font-medium text-[#8C3B2B]"
        >
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="rounded-3xl bg-[#FEFAE0] border border-[#E4DEC3] p-6 sm:p-8 space-y-4"
      >
        <div>
          <label htmlFor="login-email" className="block text-sm font-semibold text-[#2B3322] mb-1.5">
            Email address
          </label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-2xl bg-[#F7F5EE] border border-[#D7DEB0] px-4 py-3 text-sm text-[#2B3322] focus:border-[#2B3322] focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="login-password" className="block text-sm font-semibold text-[#2B3322] mb-1.5">
            Password
          </label>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            className="w-full rounded-2xl bg-[#F7F5EE] border border-[#D7DEB0] px-4 py-3 text-sm text-[#2B3322] focus:border-[#2B3322] focus:outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-full bg-[#2B3322] px-6 py-3.5 text-sm font-semibold text-[#FEFAE0] hover:bg-[#3B462F] disabled:opacity-60 transition-colors"
        >
          {submitting ? 'Signing in...' : 'Sign in'}
        </button>

        <p className="text-center text-sm text-[#5A4D3F] pt-2">
          New to COMMON?{' '}
          <Link
            to={`/signup${nextPath ? `?next=${encodeURIComponent(nextPath)}` : ''}`}
            className="font-semibold text-[#2B3322] hover:underline"
          >
            Create an account
          </Link>
        </p>
      </form>

      {/* One-Click Demo Sign-In */}
      <div className="rounded-3xl bg-[#FEFAE0] border border-[#E4DEC3] p-6 space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-[#2B3322]">
            Quick demo accounts
          </h2>
          <p className="text-xs text-[#5A4D3F] mt-0.5">
            Explore COMMON immediately as a seeded Delhi-NCR member (password: common-demo-2026).
          </p>
        </div>

        <div className="space-y-2.5">
          {DEMO_ACCOUNTS.map((demo) => (
            <button
              key={demo.email}
              type="button"
              disabled={submitting}
              onClick={() => handleDemo(demo.email)}
              className={`w-full flex items-center justify-between gap-3 rounded-2xl border p-3.5 text-left transition-transform hover:-translate-y-0.5 disabled:opacity-60 ${demo.tint}`}
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#2B3322]">{demo.name}</p>
                <p className="text-xs text-[#4A4238] truncate">{demo.summary}</p>
              </div>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#2B3322] shrink-0">
                Sign in
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const nextPath = searchParams.get('next') || '/profile';

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [location, setLocation] = useState('New Delhi');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (fullName.trim().length < 2) {
      setError('Please enter your full name.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Password confirmation does not match.');
      return;
    }

    setSubmitting(true);
    try {
      await signup({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        confirmPassword,
        location: location.trim(),
      });
      navigate(nextPath, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Could not create your account.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto py-4 space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex justify-center">
          <CommonLogo />
        </div>
        <HeadingWithAccent
          as="h1"
          prefix="Join"
          accent="COMMON"
          className="text-3xl font-bold pt-2"
        />
        <p className="text-sm text-[#5A4D3F]">
          Create your account to join activities, select your interests, and meet local people.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-2xl bg-[#FAEDCD] border border-[#D4A373] px-4 py-3 text-sm font-medium text-[#8C3B2B]"
        >
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="rounded-3xl bg-[#FEFAE0] border border-[#E4DEC3] p-6 sm:p-8 space-y-4"
      >
        <div>
          <label htmlFor="signup-name" className="block text-sm font-semibold text-[#2B3322] mb-1.5">
            Full name
          </label>
          <input
            id="signup-name"
            type="text"
            autoComplete="name"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="e.g. Riya Malhotra"
            className="w-full rounded-2xl bg-[#F7F5EE] border border-[#D7DEB0] px-4 py-3 text-sm text-[#2B3322] focus:border-[#2B3322] focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="signup-email" className="block text-sm font-semibold text-[#2B3322] mb-1.5">
            Email address
          </label>
          <input
            id="signup-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-2xl bg-[#F7F5EE] border border-[#D7DEB0] px-4 py-3 text-sm text-[#2B3322] focus:border-[#2B3322] focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="signup-location" className="block text-sm font-semibold text-[#2B3322] mb-1.5">
            Neighbourhood or city
          </label>
          <input
            id="signup-location"
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. Hauz Khas, New Delhi"
            className="w-full rounded-2xl bg-[#F7F5EE] border border-[#D7DEB0] px-4 py-3 text-sm text-[#2B3322] focus:border-[#2B3322] focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="signup-password" className="block text-sm font-semibold text-[#2B3322] mb-1.5">
              Password (min 6 chars)
            </label>
            <input
              id="signup-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-2xl bg-[#F7F5EE] border border-[#D7DEB0] px-4 py-3 text-sm text-[#2B3322] focus:border-[#2B3322] focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="signup-confirm" className="block text-sm font-semibold text-[#2B3322] mb-1.5">
              Confirm password
            </label>
            <input
              id="signup-confirm"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-2xl bg-[#F7F5EE] border border-[#D7DEB0] px-4 py-3 text-sm text-[#2B3322] focus:border-[#2B3322] focus:outline-none"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-full bg-[#2B3322] px-6 py-3.5 text-sm font-semibold text-[#FEFAE0] hover:bg-[#3B462F] disabled:opacity-60 transition-colors"
        >
          {submitting ? 'Creating account...' : 'Create account'}
        </button>

        <p className="text-center text-sm text-[#5A4D3F] pt-2">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-[#2B3322] hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}

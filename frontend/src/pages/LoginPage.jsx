import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Loader2, ChevronDown, Hexagon } from 'lucide-react';

const DEMO_ACCOUNTS = [
  { email: 'trainer@company.com', password: 'AMA2026!', name: 'Demo Trainer', role: 'Trainer', initial: 'T' },
  { email: 'marketing@company.com', password: 'AMA2026!', name: 'Marketing Head', role: 'Marketing', initial: 'M' },
  { email: 'admin@company.com', password: 'AMA2026!', name: 'System Admin', role: 'Admin', initial: 'A' },
];

/* Clean input component */
function CleanInput({ id, label, type = 'text', placeholder, register, error, suffix }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-medium text-[#94a3b8] tracking-wide">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={type}
          placeholder={placeholder}
          autoComplete="off"
          {...register}
          className="w-full bg-[#0F0F13] border border-[#27272a] rounded-lg text-[#f8fafc] text-sm px-3.5 py-2.5 outline-none transition-all duration-150 focus:border-[#0F62FE] focus:ring-1 focus:ring-[#0F62FE]/30 placeholder:text-[#52525b]"
          style={{ paddingRight: suffix ? 40 : undefined }}
        />
        {suffix && <div className="absolute right-3 top-1/2 -translate-y-1/2">{suffix}</div>}
      </div>
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-[11px] text-red-400"
        >
          {error}
        </motion.p>
      )}
    </div>
  );
}

/* Email dropdown with demo accounts */
function EmailDropdown({ value, onChange, onBlurValidate, error }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div className="flex flex-col gap-1.5" ref={ref}>
      <label className="text-xs font-medium text-[#94a3b8] tracking-wide">Email</label>
      <div className="relative">
        <input
          type="email"
          autoComplete="off"
          placeholder="you@company.com"
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={onBlurValidate}
          className="w-full bg-[#0F0F13] border border-[#27272a] rounded-lg text-[#f8fafc] text-sm px-3.5 py-2.5 pr-10 outline-none transition-all duration-150 focus:border-[#0F62FE] focus:ring-1 focus:ring-[#0F62FE]/30 placeholder:text-[#52525b]"
        />
        <motion.div
          className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#52525b]"
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown size={14} />
        </motion.div>

        <AnimatePresence>
          {open && (
            <motion.div
              className="absolute left-0 right-0 top-full mt-1.5 z-50 overflow-hidden rounded-xl border border-[#27272a] bg-[#16161D] shadow-2xl"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
            >
              <div className="px-3 py-2 border-b border-[#27272a]">
                <span className="text-[10px] font-semibold tracking-widest text-[#52525b] uppercase">
                  Demo Accounts
                </span>
              </div>
              {DEMO_ACCOUNTS.map(acc => (
                <button
                  key={acc.email}
                  type="button"
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-[#0F62FE]/8 transition-colors duration-150"
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => { onChange(acc.email, acc.password); setOpen(false); }}
                >
                  <div className="w-7 h-7 rounded-lg bg-[#0F62FE]/10 border border-[#0F62FE]/20 flex items-center justify-center text-[11px] font-bold text-[#60a5fa] flex-shrink-0">
                    {acc.initial}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#f8fafc]">{acc.name}</p>
                    <p className="text-[11px] text-[#52525b] truncate">{acc.email}</p>
                  </div>
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[#27272a] text-[#94a3b8]">
                    {acc.role}
                  </span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {error && (
        <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="text-[11px] text-red-400">
          {error}
        </motion.p>
      )}
    </div>
  );
}

/* Main LoginPage */
export default function LoginPage() {
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [emailValue, setEmailValue] = useState('');
  const [emailError, setEmailError] = useState('');

  const { register, handleSubmit, setValue, formState: { errors } } = useForm({ defaultValues: { password: '' } });

  const handleEmailChange = (email, autoPassword) => {
    setEmailValue(email); setValue('email', email); setEmailError('');
    if (autoPassword) setValue('password', autoPassword);
  };

  const onSubmit = async (data) => {
    if (!emailValue) { setEmailError('Email is required'); return; }
    setIsLoading(true);
    try { await login(emailValue, data.password); }
    catch (err) { toast.error(err.message || 'Invalid credentials'); }
    finally { setIsLoading(false); }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center px-4 relative overflow-hidden">

      {/* ── Pure CSS gradient background (always visible) ── */}
      <div className="absolute inset-0" style={{ zIndex: 0, background: 'radial-gradient(ellipse 120% 80% at 60% 50%, #0a0a1a 0%, #050508 60%, #000 100%)' }} />
      <div className="absolute inset-0" style={{ zIndex: 0, background: 'radial-gradient(ellipse 60% 60% at 70% 40%, rgba(15,98,254,0.08) 0%, transparent 70%)' }} />

      {/* ── Spline 3D background (desktop only — too heavy for mobile) ── */}
      <iframe
        src="https://my.spline.design/retrofuturismbganimation-CNIv0tEDpl9Wf8Uqdutu6VIY/"
        frameBorder="0"
        className="absolute inset-0 w-full h-full pointer-events-none hidden md:block"
        style={{ zIndex: 1, filter: 'brightness(1.3) saturate(1.15)' }}
        title="Background animation"
      />

      {/* ── Global dark veil ── */}
      <div className="absolute inset-0 pointer-events-none hidden md:block" style={{ zIndex: 2, background: 'rgba(8,8,16,0.30)' }} />

      {/* ── Left-side mask (desktop) ── */}
      <div
        className="absolute inset-y-0 left-0 pointer-events-none hidden md:block"
        style={{ zIndex: 2, width: '48%', background: 'linear-gradient(to right, rgba(5,5,12,1) 0%, rgba(5,5,12,1) 50%, rgba(5,5,12,0.6) 75%, transparent 100%)' }}
      />

      {/* ── Bottom fade ── */}
      <div className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none hidden md:block" style={{ zIndex: 2, background: 'linear-gradient(to top, rgba(5,5,12,0.98) 0%, transparent 100%)' }} />
      <div className="absolute bottom-0 right-0 w-52 h-12 pointer-events-none hidden md:block" style={{ zIndex: 3, background: 'rgba(5,5,12,0.99)' }} />

      <motion.div
        className="relative w-full max-w-[400px]"
        style={{ zIndex: 10 }}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Card — frosted glass over Spline bg */}
        <div className="rounded-2xl overflow-hidden shadow-2xl"
          style={{
            background: 'rgba(18, 18, 25, 0.82)',
            border: '1px solid rgba(255,255,255,0.1)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
          }}
        >

          {/* Header */}
          <div className="px-6 sm:px-9 pt-8 sm:pt-10 pb-6 sm:pb-7 border-b border-[#27272a]/60">
            {/* Logo */}
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl bg-[#0F62FE]/10 border border-[#0F62FE]/20 flex items-center justify-center text-[#60a5fa] flex-shrink-0">
                <Hexagon size={20} />
              </div>
              <div>
                <p className="text-[16px] font-bold text-[#f8fafc] tracking-tight leading-none">KIAS</p>
                <p className="text-[10px] text-[#52525b] tracking-[0.14em] uppercase mt-1 font-medium">Nexus Platform</p>
              </div>
            </div>
            {/* Heading */}
            <h1 className="text-2xl font-semibold text-[#f8fafc] mb-2 leading-tight">Sign in</h1>
            <p className="text-[13px] text-[#71717a] leading-relaxed">Access your AI content workspace</p>
          </div>

          {/* Form */}
          <div className="px-6 sm:px-9 py-6 sm:py-8">
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
              <EmailDropdown
                value={emailValue}
                onChange={handleEmailChange}
                onBlurValidate={() => {
                  if (!emailValue) setEmailError('Email required');
                  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) setEmailError('Invalid email');
                  else setEmailError('');
                }}
                error={emailError}
              />

              <CleanInput
                id="password"
                label="Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                register={register('password', { required: 'Password required' })}
                error={errors.password?.message}
                suffix={
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    className="text-[#52525b] hover:text-[#94a3b8] transition-colors"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                }
              />

              <button
                type="submit"
                disabled={isLoading}
                className="mt-1 w-full py-2.5 rounded-lg bg-[#0F62FE] hover:bg-[#0F62FE]/90 text-white text-sm font-semibold transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <><Loader2 size={15} className="animate-spin" /> Signing in…</>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>

            {/* Footer */}
            <div className="mt-6 pt-5 border-t border-[#27272a]/60 text-center">
              <p className="text-[11px] text-[#3f3f46] tracking-wider">
                KIAS · Powered by Gemini 2.5 · Secured
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

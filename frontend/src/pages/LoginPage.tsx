import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, ArrowRight, ArrowLeft, ShieldCheck, Settings, Lock } from 'lucide-react'
import { useAuth } from '../store/authStore'
import { ErrorMsg } from '../components/ui'

const schema = z.object({
  email: z.string().email('Enter a valid work email'),
  password: z.string().min(1, 'Password required'),
})
type Form = z.infer<typeof schema>

type Step = 'email' | 'password'

/* ──────────────────────────────────────────────────────────────────────────
   Gear geometry — builds an SVG path for a mechanical gear.
   Even-odd fill rule punches the hub hole out.
─────────────────────────────────────────────────────────────────────────── */
function gearPath(cx: number, cy: number, teeth: number, outerR: number, innerR: number, holeR = 0, toothFrac = 0.28) {
  const TWO_PI = Math.PI * 2
  const step = TWO_PI / teeth
  const half = step * toothFrac
  let d = ''
  for (let i = 0; i < teeth; i++) {
    const base = i * step - Math.PI / 2
    const pts: [number, number][] = [
      [innerR, base],
      [outerR, base + half],
      [outerR, base + half * 2],
      [innerR, base + half * 3],
    ]
    pts.forEach(([r, a], j) => {
      const x = cx + r * Math.cos(a)
      const y = cy + r * Math.sin(a)
      d += (i === 0 && j === 0) ? `M${x.toFixed(2)},${y.toFixed(2)}` : `L${x.toFixed(2)},${y.toFixed(2)}`
    })
  }
  d += 'Z'
  if (holeR > 0) {
    const hx = cx + holeR
    d += ` M${hx.toFixed(2)},${cy.toFixed(2)} A${holeR},${holeR} 0 1 0 ${(cx - holeR).toFixed(2)},${cy.toFixed(2)} A${holeR},${holeR} 0 1 0 ${hx.toFixed(2)},${cy.toFixed(2)} Z`
  }
  return d
}

interface GearSpec {
  cx: number; cy: number; teeth: number; outerR: number; innerR: number; holeR: number
  color: string; opacity: number; dir: 'cw' | 'ccw'; duration: number
}

/* Scene laid out in a 600 × 900 viewBox; scaled with "slice" to cover the panel. */
const GEARS: GearSpec[] = [
  { cx: 528, cy: 72,  teeth: 28, outerR: 150, innerR: 118, holeR: 40, color: '#ffffff', opacity: 0.055, dir: 'cw',  duration: 22 },
  { cx: 516, cy: 450, teeth: 18, outerR: 95,  innerR: 72,  holeR: 22, color: '#ffffff', opacity: 0.065, dir: 'ccw', duration: 14 },
  { cx: 192, cy: 468, teeth: 40, outerR: 215, innerR: 175, holeR: 64, color: '#f97316', opacity: 0.03,  dir: 'ccw', duration: 38 },
  { cx: 60,  cy: 396, teeth: 12, outerR: 58,  innerR: 44,  holeR: 13, color: '#ffffff', opacity: 0.08,  dir: 'cw',  duration: 8  },
  { cx: 84,  cy: 738, teeth: 16, outerR: 80,  innerR: 60,  holeR: 19, color: '#ffffff', opacity: 0.065, dir: 'ccw', duration: 12 },
  { cx: 30,  cy: 108, teeth: 8,  outerR: 38,  innerR: 28,  holeR: 8,  color: '#f97316', opacity: 0.12,  dir: 'cw',  duration: 5  },
  { cx: 288, cy: 873, teeth: 20, outerR: 104, innerR: 80,  holeR: 26, color: '#f97316', opacity: 0.055, dir: 'cw',  duration: 17 },
  { cx: 408, cy: 261, teeth: 9,  outerR: 44,  innerR: 33,  holeR: 10, color: '#ffffff', opacity: 0.09,  dir: 'cw',  duration: 6  },
]

function GearScene() {
  return (
    <svg
      viewBox="0 0 600 900"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 h-full w-full"
      aria-hidden="true"
    >
      {GEARS.map((g, i) => (
        <g
          key={i}
          style={{
            transformOrigin: `${g.cx}px ${g.cy}px`,
            animation: `gear-${g.dir} ${g.duration}s linear infinite`,
          }}
        >
          <path d={gearPath(g.cx, g.cy, g.teeth, g.outerR, g.innerR, g.holeR)} fill={g.color} fillOpacity={g.opacity} fillRule="evenodd" />
          <circle cx={g.cx} cy={g.cy} r={g.innerR * 0.86} fill="none" stroke={g.color} strokeOpacity={g.opacity * 0.7} strokeWidth={1} />
        </g>
      ))}
    </svg>
  )
}

/* Brand showcase — the dark right panel (desktop only). */
function Showcase() {
  return (
    <div className="relative hidden lg:flex flex-1 items-center overflow-hidden bg-[#080f1e]">
      {/* warm radial glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 55% 60% at 32% 55%, rgba(249,115,22,0.10) 0%, transparent 70%),' +
            'radial-gradient(ellipse 40% 50% at 80% 80%, rgba(249,115,22,0.06) 0%, transparent 70%)',
        }}
      />
      <GearScene />

      {/* Branding */}
      <div className="relative z-10 max-w-md pl-[8%] pr-[40%] text-white">
        <p className="mb-3.5 text-[11px] font-semibold uppercase tracking-[0.32em] text-white/35">Welcome to</p>
        <h2 className="text-5xl font-black leading-[1.05] tracking-tight xl:text-6xl">
          Shree<br />
          <span className="text-orange-500 [text-shadow:0_0_40px_rgba(249,115,22,0.45)]">Engineering</span>
        </h2>
        <div className="my-5 flex items-center gap-3.5">
          <span className="h-px flex-1 bg-white/10" />
          <span className="flex items-center gap-1.5 whitespace-nowrap text-[9.5px] font-bold uppercase tracking-[0.25em] text-white/25">
            <Settings size={13} className="animate-[gear-cw_2s_linear_infinite] opacity-60" />
            Fully Engineered
          </span>
          <span className="h-px flex-1 bg-white/10" />
        </div>
      </div>

      {/* Worker figure (transparent PNG) */}
      <img
        src="/worker.png"
        alt=""
        aria-hidden="true"
        onError={(e) => { (e.currentTarget.style.display = 'none') }}
        className="absolute bottom-0 right-0 z-[8] h-[88%] max-h-[700px] object-contain"
        style={{ filter: 'drop-shadow(0 0 50px rgba(249,115,22,0.22)) drop-shadow(0 30px 60px rgba(0,0,0,0.5))' }}
      />
    </div>
  )
}

export default function LoginPage() {
  const { login } = useAuth()
  const nav = useNavigate()
  const [step, setStep] = useState<Step>('email')
  const [err, setErr] = useState('')
  const [showPass, setShowPass] = useState(false)

  const {
    register, handleSubmit, trigger, getValues, setFocus,
    formState: { errors, isSubmitting },
  } = useForm<Form>({ resolver: zodResolver(schema), mode: 'onSubmit' })

  // Step 1 → validate email format only, then reveal the password screen.
  const goToPassword = async () => {
    setErr('')
    const ok = await trigger('email')
    if (!ok) return
    setStep('password')
    setTimeout(() => setFocus('password'), 50)
  }

  const backToEmail = () => {
    setErr('')
    setStep('email')
    setTimeout(() => setFocus('email'), 50)
  }

  // Step 2 → real authentication via existing /auth/login.
  const onSubmit = async (d: Form) => {
    setErr('')
    try {
      await login(d.email, d.password)
      nav('/')
    } catch (e: any) {
      if (!e.response) setErr('Cannot connect to server. Make sure the API is running.')
      else setErr(e.response?.data?.detail || 'Invalid email or password')
    }
  }

  const onEmailKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); goToPassword() }
  }

  return (
    <>
      {/* Gear keyframes (Tailwind has no built-in spin variants for both directions) */}
      <style>{`
        @keyframes gear-cw  { from { transform: rotate(0deg); }   to { transform: rotate(360deg); } }
        @keyframes gear-ccw { from { transform: rotate(0deg); }   to { transform: rotate(-360deg); } }
        @keyframes step-in  { from { opacity: 0; transform: translateX(14px); } to { opacity: 1; transform: translateX(0); } }
      `}</style>

      <div className="flex min-h-screen bg-[#080f1e]">
        {/* ── LEFT: form panel ───────────────────────────────────────── */}
        <div className="flex w-full flex-col justify-center bg-white px-7 py-10 shadow-[4px_0_40px_rgba(0,0,0,0.25)] sm:px-12 lg:w-[42%] lg:min-w-[380px] lg:px-16">
          <div className="mx-auto w-full max-w-[400px]">
            {/* Brand mark */}
            <div className="mb-12 flex items-center gap-2.5">
              <Settings size={24} className="animate-[gear-cw_3s_linear_infinite] text-orange-500" />
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Shree Engineering</span>
            </div>

            {/* ── STEP 1: EMAIL ── */}
            {step === 'email' && (
              <div style={{ animation: 'step-in 0.35s ease both' }}>
                <h1 className="mb-11 text-[2.6rem] font-black leading-[1.12] tracking-tight text-slate-900 sm:text-5xl">
                  Login to <span className="text-orange-500">Continue</span><br />
                  Your Today's Work.
                </h1>

                <label htmlFor="login-email" className="mb-2.5 block text-[10.5px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  Work Email
                </label>
                <div className="flex items-stretch overflow-hidden rounded-[14px] border-2 border-slate-200 transition-all focus-within:border-orange-500 focus-within:shadow-[0_0_0_5px_rgba(249,115,22,0.10)]">
                  <input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    autoFocus
                    placeholder="yourname@shreeng.com"
                    onKeyDown={onEmailKeyDown}
                    className="w-full bg-transparent px-5 py-4 text-[15px] text-slate-900 outline-none placeholder:text-slate-300"
                    {...register('email')}
                  />
                  <button
                    type="button"
                    onClick={goToPassword}
                    aria-label="Continue"
                    className="flex flex-shrink-0 items-center justify-center rounded-r-xl bg-orange-500 px-6 text-white transition-all hover:scale-[1.04] hover:bg-orange-600"
                  >
                    <ArrowRight size={20} />
                  </button>
                </div>
                {errors.email && <p className="mt-2 text-xs text-red-500">{errors.email.message}</p>}

                <p className="mt-6 flex items-center gap-1.5 text-[11.5px] text-slate-400">
                  <ShieldCheck size={13} /> Secure access · Shree ERP System
                </p>
              </div>
            )}

            {/* ── STEP 2: PASSWORD ── */}
            {step === 'password' && (
              <form onSubmit={handleSubmit(onSubmit)} style={{ animation: 'step-in 0.35s ease both' }}>
                <button
                  type="button"
                  onClick={backToEmail}
                  className="mb-6 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 transition-colors hover:text-orange-500"
                >
                  <ArrowLeft size={14} /> Back
                </button>

                <h1 className="mb-2 text-[2.6rem] font-black leading-[1.12] tracking-tight text-slate-900 sm:text-5xl">
                  Enter Your<br /><span className="text-orange-500">Password</span>
                </h1>

                {/* Identity chip — the email already entered */}
                <div className="mb-8 mt-4 inline-flex max-w-full items-center gap-2 rounded-full bg-slate-100 px-3.5 py-1.5">
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-orange-500 text-[11px] font-bold uppercase text-white">
                    {(getValues('email')?.[0] ?? '?')}
                  </span>
                  <span className="truncate text-[13px] font-medium text-slate-600">{getValues('email')}</span>
                </div>

                <label htmlFor="login-password" className="mb-2.5 block text-[10.5px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  Password
                </label>
                <div className="flex items-stretch overflow-hidden rounded-[14px] border-2 border-slate-200 transition-all focus-within:border-orange-500 focus-within:shadow-[0_0_0_5px_rgba(249,115,22,0.10)]">
                  <span className="flex items-center pl-5 text-slate-300"><Lock size={17} /></span>
                  <input
                    id="login-password"
                    type={showPass ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="w-full bg-transparent px-3.5 py-4 text-[15px] text-slate-900 outline-none placeholder:text-slate-300"
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(s => !s)}
                    aria-label={showPass ? 'Hide password' : 'Show password'}
                    className="flex flex-shrink-0 items-center pr-5 text-slate-400 transition-colors hover:text-slate-600"
                  >
                    {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.password && <p className="mt-2 text-xs text-red-500">{errors.password.message}</p>}

                <div className="mt-4 flex items-center justify-between text-sm">
                  <label className="flex cursor-pointer items-center gap-2 text-slate-500">
                    <input type="checkbox" className="rounded border-slate-300 text-orange-500 focus:ring-orange-500" />
                    Remember Me
                  </label>
                  <span className="cursor-pointer text-xs text-orange-600 hover:underline">Recover Password</span>
                </div>

                {err && <div className="mt-4"><ErrorMsg msg={err} /></div>}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-orange-500 py-4 text-sm font-bold text-white shadow-lg transition-all hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? 'Signing in…' : <>Sign In <ArrowRight size={16} /></>}
                </button>

                <p className="mt-6 flex items-center gap-1.5 text-[11.5px] text-slate-400">
                  <ShieldCheck size={13} /> Secure access · Shree ERP System
                </p>
              </form>
            )}
          </div>
        </div>

        {/* ── RIGHT: brand showcase (desktop) ────────────────────────── */}
        <Showcase />
      </div>
    </>
  )
}

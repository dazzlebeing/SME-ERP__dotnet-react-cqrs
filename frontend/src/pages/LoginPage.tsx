import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../store/authStore'
import { ErrorMsg } from '../components/ui'

const schema = z.object({
  email: z.string().email('Valid email required'),
  password: z.string().min(1, 'Password required'),
})
type Form = z.infer<typeof schema>

/**
 * Shree logo — replicates the original PHP login page exactly:
 *   • Outer gear ring (gear.png) spins continuously
 *   • Inner Shree circle (shree.png) stays perfectly still in the center
 */
function ShreeLogo({ size = 110, fast = false }: { size?: number; fast?: boolean }) {
  const gearSize = size
  const innerSize = Math.round(size * 0.60)
  const innerOffset = Math.round((gearSize - innerSize) / 2)
  return (
    <div style={{ position: 'relative', width: gearSize, height: gearSize }}>
      {/* Gear ring — spins. Original: 1.7s 0→360 linear infinite */}
      <img
        src="/gear.png"
        alt=""
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: gearSize,
          height: gearSize,
          animation: `gear-spin ${fast ? 0.6 : 1.7}s linear infinite`,
        }}
      />
      {/* Shree logo — static, centered in the hub */}
      <img
        src="/shree.png"
        alt="Shree"
        style={{
          position: 'absolute',
          top: innerOffset,
          left: innerOffset,
          width: innerSize,
          height: innerSize,
          borderRadius: '50%',
          background: '#fff',
        }}
      />
    </div>
  )
}

export default function LoginPage() {
  const { login } = useAuth()
  const nav = useNavigate()
  const [err, setErr] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [spinning, setSpinning] = useState(false)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Form>({ resolver: zodResolver(schema) })

  const onSubmit = async (d: Form) => {
    setErr('')
    setSpinning(true)
    try {
      await login(d.email, d.password)
      nav('/')
    } catch (e: any) {
      if (!e.response) {
        setErr('Cannot connect to server. Make sure the API is running.')
      } else {
        setErr(e.response?.data?.detail || 'Invalid email or password')
      }
      setSpinning(false)
    }
  }

  return (
    <>
      {/* Spin keyframe injected as a style tag */}
      <style>{`
        @keyframes gear-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>

      <div className="min-h-screen flex items-center justify-center p-4"
        style={{ background: 'linear-gradient(135deg, #1565C0 0%, #0D47A1 50%, #1976D2 100%)' }}>
        <div className="w-full max-w-sm">
          {/* Spinning gear logo above the card */}
          <div className="flex justify-center mb-6">
            <ShreeLogo size={110} fast={spinning} />
          </div>

          {/* Login card */}
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
            {/* Green top bar */}
            <div className="h-1.5 bg-gradient-to-r from-green-400 to-green-500" />

            <div className="px-8 py-7">
              <h1 className="text-2xl font-black text-slate-800 tracking-wide text-center mb-6">
                ADMIN LOGIN
              </h1>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {/* Email */}
                <div>
                  <input
                    type="email"
                    placeholder="Email address"
                    className="w-full px-4 py-3 rounded-lg border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
                    {...register('email')}
                  />
                  {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
                </div>

                {/* Password */}
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    placeholder="Password"
                    className="w-full px-4 py-3 pr-11 rounded-lg border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                  {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
                </div>

                {/* Row: remember me + recover */}
                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center gap-2 text-slate-600 cursor-pointer">
                    <input type="checkbox" className="rounded border-slate-300" />
                    Remember Me
                  </label>
                  <span className="text-blue-600 hover:underline cursor-pointer text-xs">Recover Password</span>
                </div>

                {err && <ErrorMsg msg={err} />}

                {/* Login button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 rounded-full text-white font-semibold text-sm transition-all
                    bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800
                    disabled:opacity-60 disabled:cursor-not-allowed shadow-lg"
                >
                  {isSubmitting ? 'Signing in…' : 'Login'}
                </button>
              </form>
            </div>
          </div>

          <p className="text-center text-xs text-blue-200 mt-4 opacity-70">
            Shree Engineering Works — ERP System
          </p>
        </div>
      </div>
    </>
  )
}

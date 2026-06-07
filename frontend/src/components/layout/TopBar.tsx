import { useState, useRef, useEffect } from 'react'
import { ChevronDown, LogOut, KeyRound, UserCircle } from 'lucide-react'
import { useAuth } from '../../store/authStore'

interface TopBarProps {
  onChangePassword: () => void
  onLogoutRequest: () => void
}

/**
 * Top bar — replicates the original PHP `#email` header element:
 *   email + down-arrow → click reveals dropdown with Logout + Change Password.
 * Both actions delegate to AppLayout-owned modals (styled, not native confirm()).
 */
export default function TopBar({ onChangePassword, onLogoutRequest }: TopBarProps) {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click + Escape
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  return (
    <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-end">
      <div className="relative" ref={ref}>
        <button
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors text-sm"
          aria-haspopup="menu"
          aria-expanded={open}
        >
          <UserCircle size={18} className="text-slate-500" />
          <span className="text-slate-700 lowercase">{user?.email}</span>
          <ChevronDown size={14} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-1 bg-white shadow-lg border border-slate-200 rounded-lg overflow-hidden min-w-[200px]" role="menu">
            <div className="px-4 py-2.5 border-b border-slate-100">
              <p className="text-xs text-slate-400">Signed in as</p>
              <p className="text-sm text-slate-700 truncate lowercase">{user?.email}</p>
              <p className="text-xs text-blue-500 mt-0.5">{user?.roles.join(', ')}</p>
            </div>
            <button
              onClick={() => { setOpen(false); onChangePassword() }}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
              role="menuitem"
            >
              <KeyRound size={14} />
              Change Password
            </button>
            <button
              onClick={() => { setOpen(false); onLogoutRequest() }}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors border-t border-slate-100"
              role="menuitem"
            >
              <LogOut size={14} />
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  )
}

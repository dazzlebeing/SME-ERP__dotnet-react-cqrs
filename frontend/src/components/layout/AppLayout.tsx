import { Outlet } from 'react-router-dom'
import { useState } from 'react'
import { LogOut } from 'lucide-react'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import ChangePasswordModal from './ChangePasswordModal'
import { ConfirmDialog } from '../ui'
import { useAuth } from '../../store/authStore'

export default function AppLayout() {
  const { logout } = useAuth()
  const [showChangePwd, setShowChangePwd] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  const handleConfirmLogout = async () => {
    setLoggingOut(true)
    try { await logout() } finally { setLoggingOut(false) }
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar
        onChangePassword={() => setShowChangePwd(true)}
        onLogoutRequest={() => setShowLogoutConfirm(true)}
      />
      <div className="flex-1 ml-60 flex flex-col min-h-screen">
        <TopBar
          onChangePassword={() => setShowChangePwd(true)}
          onLogoutRequest={() => setShowLogoutConfirm(true)}
        />
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>

      {showChangePwd && <ChangePasswordModal onClose={() => setShowChangePwd(false)} />}

      {showLogoutConfirm && (
        <ConfirmDialog
          title="Sign out"
          msg="Are you sure you want to sign out of your account?"
          confirmLabel="Sign out"
          cancelLabel="Stay signed in"
          confirmVariant="primary"
          loading={loggingOut}
          icon={
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
              <LogOut size={18} className="text-blue-600" />
            </div>
          }
          onConfirm={handleConfirmLogout}
          onCancel={() => setShowLogoutConfirm(false)}
        />
      )}
    </div>
  )
}

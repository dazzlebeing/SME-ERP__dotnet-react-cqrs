import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Building2, Users, FileText,
  Truck, Receipt, CreditCard, ShoppingCart, Wallet, DollarSign,
  TrendingUp, BarChart3, LogOut, ShieldCheck, Factory, KeyRound, UserCog
} from 'lucide-react'
import { useAuth } from '../../store/authStore'

// Shree gear logo — uses real project assets (gear.png + shree.png)
// Gear ring spins slowly, Shree badge stays still — matches original PHP login page style
function ShreeLogo({ size = 52 }: { size?: number }) {
  const innerSize = Math.round(size * 0.6)
  const innerOffset = Math.round((size - innerSize) / 2)
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <style>{`@keyframes gear-spin-sidebar{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      <img src="/gear.png" alt="" style={{
        position: 'absolute', top: 0, left: 0, width: size, height: size,
        animation: 'gear-spin-sidebar 4s linear infinite',
        filter: 'invert(1)',  /* white gear ring to suit dark sidebar */
      }} />
      <img src="/shree.png" alt="Shree" style={{
        position: 'absolute', top: innerOffset, left: innerOffset,
        width: innerSize, height: innerSize,
        borderRadius: '50%',
      }} />
    </div>
  )
}

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/gatepasses', label: 'Gatepasses', icon: FileText },
  { to: '/chalans', label: 'Chalans', icon: Truck },
  { to: '/bills', label: 'Bills', icon: Receipt },
  { to: '/payments', label: 'Payments', icon: CreditCard },
  { to: '/expenses', label: 'Expenses', icon: ShoppingCart },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/employees', label: 'Employees', icon: Users },
  { to: '/salary', label: 'Salary', icon: DollarSign },
  { to: '/advances', label: 'Advances', icon: TrendingUp },
  { to: '/vouchers', label: 'Vouchers', icon: Wallet },
]

const moreItems = [
  { to: '/companies', label: 'Companies', icon: Building2 },
  { to: '/vendors', label: 'Vendors', icon: Factory },
]

interface SidebarProps {
  onChangePassword: () => void
  onLogoutRequest: () => void
}
export default function Sidebar({ onChangePassword, onLogoutRequest }: SidebarProps) {
  const { user, isAdmin } = useAuth()

  return (
    // h-screen (not min-h-screen) so the fixed aside has a bounded height
    // and the inner <nav> with flex-1 overflow-y-auto can actually scroll.
    <aside className="w-60 h-screen flex flex-col fixed left-0 top-0 z-20 shadow-xl"
      style={{ background: 'linear-gradient(180deg, #1a237e 0%, #283593 60%, #3949ab 100%)' }}>

      {/* Subtle custom scrollbar to blend with the dark gradient */}
      <style>{`
        .sidebar-scroll::-webkit-scrollbar { width: 6px; }
        .sidebar-scroll::-webkit-scrollbar-track { background: transparent; }
        .sidebar-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.18); border-radius: 3px; }
        .sidebar-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.32); }
        .sidebar-scroll { scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.18) transparent; }
      `}</style>

      {/* Brand — flex-shrink-0 so it never gets squeezed when nav is long */}
      <div className="flex flex-col items-center py-5 border-b border-white/10 flex-shrink-0">
        <ShreeLogo size={52} />
        <p className="font-bold text-sm text-white mt-2 leading-tight text-center">Shree Engineering</p>
        <p className="text-xs text-blue-200 text-center">Works ERP</p>
      </div>

      {/* Nav — scrolls when content exceeds viewport */}
      <nav className="flex-1 overflow-y-auto py-2 sidebar-scroll">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 text-sm transition-all ${
                isActive
                  ? 'bg-white/20 text-white font-semibold border-l-4 border-blue-300'
                  : 'text-blue-100 hover:bg-white/10 hover:text-white border-l-4 border-transparent'
              }`
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}

        {/* More section */}
        <div className="mt-2 border-t border-white/10 pt-2">
          <p className="px-4 py-1.5 text-xs text-blue-300 font-semibold uppercase tracking-wider">More</p>
          {moreItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 text-sm transition-all ${
                  isActive
                    ? 'bg-white/20 text-white font-semibold border-l-4 border-blue-300'
                    : 'text-blue-100 hover:bg-white/10 hover:text-white border-l-4 border-transparent'
                }`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
          {isAdmin() && (
            <>
              <NavLink
                to="/users"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-2.5 text-sm transition-all ${
                    isActive
                      ? 'bg-white/20 text-white font-semibold border-l-4 border-blue-300'
                      : 'text-blue-100 hover:bg-white/10 hover:text-white border-l-4 border-transparent'
                  }`
                }
              >
                <UserCog size={16} />
                Users
              </NavLink>
              <NavLink
                to="/audit-logs"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-2.5 text-sm transition-all ${
                    isActive
                      ? 'bg-white/20 text-white font-semibold border-l-4 border-blue-300'
                      : 'text-blue-100 hover:bg-white/10 hover:text-white border-l-4 border-transparent'
                  }`
                }
              >
                <ShieldCheck size={16} />
                Audit Logs
              </NavLink>
            </>
          )}
        </div>
      </nav>

      {/* User panel — flex-shrink-0 so it never shrinks/disappears when nav is long */}
      <div className="p-4 border-t border-white/10 bg-black/20 flex-shrink-0">
        <p className="text-xs text-blue-200 truncate">{user?.email}</p>
        <p className="text-xs text-blue-400 mb-3">{user?.roles.join(', ')}</p>
        <div className="flex flex-col gap-1.5">
          <button
            onClick={onChangePassword}
            className="flex items-center gap-2 text-sm text-blue-100 hover:text-white transition-colors"
          >
            <KeyRound size={14} />
            Change Password
          </button>
          <button
            onClick={onLogoutRequest}
            className="flex items-center gap-2 text-sm text-blue-100 hover:text-white transition-colors"
          >
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      </div>
    </aside>
  )
}

import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import { Loader2, AlertCircle, ChevronLeft, ChevronRight, Search } from 'lucide-react'

// ── SearchBox ───────────────────────────────────────────────────────────────
// Replicates the original PHP search bar:
//   • Pill-shaped input (border-radius:50px), 1px solid #ccc → dodgerblue on focus
//   • Dodgerblue circle search icon on the right (green when input is focused)
//   • Autofocus on mount
//   • Alt+S shortcut focuses the box from anywhere on the page
interface SearchBoxProps {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  autoFocus?: boolean
  width?: number
}
export function SearchBox({ value, onChange, placeholder = 'Search', autoFocus = true, width = 280 }: SearchBoxProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [focused, setFocused] = useState(false)
  useEffect(() => {
    if (autoFocus) inputRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === 's' || e.key === 'S')) {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [autoFocus])
  return (
    <div style={{ position: 'relative', width, display: 'inline-block' }}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        title="Press Alt+S to focus"
        style={{
          width: '100%',
          padding: '10px 42px 10px 16px',
          borderRadius: 50,
          border: `1px solid ${focused ? '#1e90ff' : '#ccc'}`,
          outline: 'none',
          fontSize: 14,
          transition: 'border-color 0.2s',
          background: '#fff',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 3,
          right: 3,
          width: 34,
          height: 34,
          borderRadius: '50%',
          background: focused ? '#22c55e' : '#1e90ff',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'background 0.2s',
          pointerEvents: 'none',
        }}
      >
        <Search size={16} />
      </div>
    </div>
  )
}

// ── Button ──────────────────────────────────────────────────────────────────
interface BtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md'
  loading?: boolean
}
export function Button({ variant = 'primary', size = 'md', loading, children, className = '', ...p }: BtnProps) {
  const base = 'inline-flex items-center gap-2 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-slate-100 text-slate-700 hover:bg-slate-200',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    ghost: 'text-slate-600 hover:bg-slate-100',
  }
  const sizes = { sm: 'px-3 py-1.5 text-sm', md: 'px-4 py-2 text-sm' }
  return (
    <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} disabled={loading || p.disabled} {...p}>
      {loading && <Loader2 size={14} className="animate-spin" />}
      {children}
    </button>
  )
}

// ── Card ─────────────────────────────────────────────────────────────────────
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`bg-white rounded-xl border border-slate-200 shadow-sm ${className}`}>{children}</div>
}
export function CardHeader({ title, actions }: { title: string; actions?: ReactNode }) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
      <h2 className="text-base font-semibold text-slate-800">{title}</h2>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}

// ── Input ─────────────────────────────────────────────────────────────────────
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> { label?: string; error?: string }
export function Input({ label, error, className = '', ...p }: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-medium text-slate-700">{label}</label>}
      <input className={`border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${error ? 'border-red-400' : ''} ${className}`} {...p} />
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  )
}

// ── Select ────────────────────────────────────────────────────────────────────
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> { label?: string; error?: string }
export function Select({ label, error, children, className = '', ...p }: SelectProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-medium text-slate-700">{label}</label>}
      <select className={`border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white ${error ? 'border-red-400' : ''} ${className}`} {...p}>
        {children}
      </select>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  )
}

// ── Textarea ──────────────────────────────────────────────────────────────────
interface TAProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> { label?: string; error?: string }
export function Textarea({ label, error, className = '', ...p }: TAProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-medium text-slate-700">{label}</label>}
      <textarea className={`border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${error ? 'border-red-400' : ''} ${className}`} rows={3} {...p} />
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  )
}

// ── Table ─────────────────────────────────────────────────────────────────────
export function Table({ children }: { children: ReactNode }) {
  return <div className="overflow-x-auto"><table className="w-full text-sm">{children}</table></div>
}
export function Th({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <th className={`px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 ${className}`}>{children}</th>
}
/** Sortable column header — pass sortBy/sortDir/onSort from usePaginatedList */
export function SortableTh({
  children, field, sortBy, sortDir, onSort, className = ''
}: {
  children: ReactNode; field: string; sortBy: string; sortDir: 'asc' | 'desc';
  onSort: (f: string) => void; className?: string
}) {
  const active = sortBy === field
  return (
    <th
      onClick={() => onSort(field)}
      className={`px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50
        cursor-pointer select-none hover:bg-slate-100 transition-colors ${className}`}
    >
      <span className="flex items-center gap-1">
        {children}
        <span className={`text-[10px] ${active ? 'text-blue-500' : 'text-slate-300'}`}>
          {active ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}
        </span>
      </span>
    </th>
  )
}
export function Td({ children, className = '', colSpan }: { children: ReactNode; className?: string; colSpan?: number }) {
  return <td colSpan={colSpan} className={`px-4 py-3 text-slate-700 border-t border-slate-100 ${className}`}>{children}</td>
}

// ── Badge ─────────────────────────────────────────────────────────────────────
const badgeColors: Record<string, string> = {
  Pending: 'bg-yellow-100 text-yellow-700',
  Delivered: 'bg-green-100 text-green-700',
  Active: 'bg-blue-100 text-blue-700',
  Inactive: 'bg-red-100 text-red-700',
  Unpaid: 'bg-red-100 text-red-700',
  Partial: 'bg-orange-100 text-orange-700',
  Paid: 'bg-green-100 text-green-700',
  Admin: 'bg-purple-100 text-purple-700',
  Accountant: 'bg-blue-100 text-blue-700',
  Viewer: 'bg-slate-100 text-slate-600',
}
export function Badge({ label }: { label: string }) {
  const cls = badgeColors[label] ?? 'bg-slate-100 text-slate-600'
  return <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{label}</span>
}

// ── Loader / Error ─────────────────────────────────────────────────────────────
export function Loader() { return <div className="flex items-center justify-center py-16"><Loader2 className="animate-spin text-blue-500" size={32} /></div> }
export function ErrorMsg({ msg }: { msg: string }) {
  return <div className="flex items-center gap-2 p-4 bg-red-50 text-red-700 rounded-lg text-sm"><AlertCircle size={16} />{msg}</div>
}

// ── Modal ─────────────────────────────────────────────────────────────────────
export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="font-semibold text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

// ── Pagination ────────────────────────────────────────────────────────────────
export function Pagination({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (p: number) => void }) {
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-center gap-2 py-4">
      <button onClick={() => onPage(page - 1)} disabled={page === 1} className="p-1 rounded hover:bg-slate-100 disabled:opacity-40">
        <ChevronLeft size={18} />
      </button>
      <span className="text-sm text-slate-600">Page {page} of {totalPages}</span>
      <button onClick={() => onPage(page + 1)} disabled={page === totalPages} className="p-1 rounded hover:bg-slate-100 disabled:opacity-40">
        <ChevronRight size={18} />
      </button>
    </div>
  )
}

// ── Page Header ───────────────────────────────────────────────────────────────
export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}

// ── Confirm Dialog ────────────────────────────────────────────────────────────
interface ConfirmDialogProps {
  msg: string
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
  title?: string
  confirmLabel?: string
  cancelLabel?: string
  confirmVariant?: 'primary' | 'danger' | 'secondary'
  icon?: ReactNode
}
export function ConfirmDialog({
  msg, onConfirm, onCancel, loading,
  title = 'Confirm',
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  confirmVariant = 'danger',
  icon,
}: ConfirmDialogProps) {
  return (
    <Modal title={title} onClose={onCancel}>
      <div className="flex items-start gap-3 mb-6">
        {icon && <div className="flex-shrink-0">{icon}</div>}
        <p className="text-slate-600">{msg}</p>
      </div>
      <div className="flex gap-3 justify-end">
        <Button variant="secondary" onClick={onCancel} disabled={loading}>{cancelLabel}</Button>
        <Button variant={confirmVariant} onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
      </div>
    </Modal>
  )
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
export function StatCard({ label, value, sub, color = 'blue' }: { label: string; value: string | number; sub?: string; color?: string }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600', green: 'bg-green-50 text-green-600',
    orange: 'bg-orange-50 text-orange-600', purple: 'bg-purple-50 text-purple-600',
  }
  return (
    <div className={`rounded-xl p-5 ${colors[color] ?? colors.blue}`}>
      <p className="text-xs font-medium uppercase tracking-wider opacity-70">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      {sub && <p className="text-xs opacity-60 mt-0.5">{sub}</p>}
    </div>
  )
}

import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { useAuth } from './store/authStore'
import AppLayout from './components/layout/AppLayout'

// Pages
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import CompaniesPage from './pages/CompaniesPage'
import VendorsPage from './pages/VendorsPage'
import EmployeesPage from './pages/EmployeesPage'
import GatepassesPage from './pages/GatepassesPage'
import ChalansPage from './pages/ChalansPage'
import BillsPage from './pages/BillsPage'
import PaymentsPage from './pages/PaymentsPage'
import ExpensesPage from './pages/ExpensesPage'
import VouchersPage from './pages/VouchersPage'
import SalaryPage from './pages/SalaryPage'
import AdvancesPage from './pages/AdvancesPage'
import ReportsPage from './pages/ReportsPage'
import AuditLogsPage from './pages/AuditLogsPage'
import UsersPage from './pages/UsersPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30000,
    },
  },
})

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-500">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { isAdmin } = useAuth()
  if (!isAdmin()) return <Navigate to="/" replace />
  return <>{children}</>
}

function AppInitializer() {
  const loadUser = useAuth(s => s.loadUser)
  useEffect(() => { loadUser() }, [loadUser])
  return null
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppInitializer />
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected — all inside layout */}
          <Route path="/" element={
            <RequireAuth>
              <AppLayout />
            </RequireAuth>
          }>
            <Route index element={<DashboardPage />} />
            <Route path="companies" element={<CompaniesPage />} />
            <Route path="vendors" element={<VendorsPage />} />
            <Route path="employees" element={<EmployeesPage />} />
            <Route path="gatepasses" element={<GatepassesPage />} />
            <Route path="chalans" element={<ChalansPage />} />
            <Route path="bills" element={<BillsPage />} />
            <Route path="payments" element={<PaymentsPage />} />
            <Route path="expenses" element={<ExpensesPage />} />
            <Route path="vouchers" element={<VouchersPage />} />
            <Route path="salary" element={<SalaryPage />} />
            <Route path="advances" element={<AdvancesPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="audit-logs" element={
              <RequireAdmin>
                <AuditLogsPage />
              </RequireAdmin>
            } />
            <Route path="users" element={
              <RequireAdmin>
                <UsersPage />
              </RequireAdmin>
            } />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors closeButton />
    </QueryClientProvider>
  )
}

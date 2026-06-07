import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Plus, KeyRound, Trash2 } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../store/authStore'
import { Card, CardHeader, Table, Th, Td, Button, Input, Select, Modal, ConfirmDialog, PageHeader, Loader } from '../components/ui'
import api from '../lib/api'
import { toast } from 'sonner'
import { fmt } from '../lib/formatters'

interface AppUser { id: string; email: string; roles: string[]; createdAt: string; lockoutEnabled: boolean }

const ROLES = ['Admin', 'Accountant', 'Viewer']

export default function UsersPage() {
  const { isAdmin } = useAuth()
  const [showCreate, setShowCreate] = useState(false)
  const [showPwdModal, setShowPwdModal] = useState<AppUser | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const qc = useQueryClient()

  const { data: users = [], isLoading } = useQuery<AppUser[]>({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then(r => r.data),
  })

  const createMut = useMutation({
    mutationFn: (d: any) => api.post('/users', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('User created'); setShowCreate(false) },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed to create user'),
  })

  const roleMut = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => api.patch(`/users/${id}/role`, { role }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('Role updated') },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed'),
  })

  const pwdMut = useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) => api.patch(`/users/${id}/password`, { password }),
    onSuccess: () => { toast.success('Password reset'); setShowPwdModal(null) },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed'),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); setDeleteId(null); toast.success('User deleted') },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed'),
  })

  const { register: regCreate, handleSubmit: hsCreate, reset: resetCreate, formState: { errors: errCreate } } = useForm<any>()
  const { register: regPwd, handleSubmit: hsPwd, reset: resetPwd, formState: { errors: errPwd } } = useForm<any>()

  if (!isAdmin()) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-slate-400">Admin access required</p>
    </div>
  )

  return (
    <div className="space-y-6">
      <PageHeader title="User Management" subtitle={`${users.length} users`}
        actions={<Button onClick={() => { resetCreate({}); setShowCreate(true) }}><Plus size={16} />Add User</Button>} />

      <Card>
        <CardHeader title="System Users" />
        {isLoading ? <Loader /> : (
          <Table>
            <thead><tr>
              <Th>Email</Th>
              <Th>Role</Th>
              <Th>Created</Th>
              <Th>Actions</Th>
            </tr></thead>
            <tbody>
              {users.length === 0 && <tr><Td colSpan={4} className="text-center text-slate-400 py-8">No users</Td></tr>}
              {users.map(u => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <Td>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-sm font-bold">
                        {u.email[0].toUpperCase()}
                      </div>
                      <span className="font-medium">{u.email}</span>
                    </div>
                  </Td>
                  <Td>
                    <select
                      value={u.roles[0] || 'Viewer'}
                      onChange={e => roleMut.mutate({ id: u.id, role: e.target.value })}
                      className="text-xs border border-slate-200 rounded px-2 py-1 bg-white text-slate-700 cursor-pointer hover:border-blue-400 focus:outline-none"
                    >
                      {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </Td>
                  <Td>{u.createdAt ? fmt.date(u.createdAt) : '—'}</Td>
                  <Td>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => { resetPwd({}); setShowPwdModal(u) }} title="Reset password">
                        <KeyRound size={14} className="text-amber-500" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteId(u.id)} title="Delete user">
                        <Trash2 size={14} className="text-red-400" />
                      </Button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      {/* Create user modal */}
      {showCreate && (
        <Modal title="Create User" onClose={() => setShowCreate(false)}>
          <form onSubmit={hsCreate(d => createMut.mutate(d))} className="space-y-4">
            <Input label="Email *" type="email" error={errCreate.email?.message as string}
              {...regCreate('email', { required: 'Required', pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email' } })} />
            <Input label="Password *" type="password" error={errCreate.password?.message as string}
              {...regCreate('password', { required: 'Required', minLength: { value: 8, message: 'Min 8 characters' } })} />
            <Select label="Role *" {...regCreate('role', { required: 'Required' })}>
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </Select>
            <div className="flex gap-3 pt-2">
              <Button type="submit" loading={createMut.isPending}>Create User</Button>
              <Button variant="secondary" type="button" onClick={() => setShowCreate(false)}>Cancel</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Reset password modal */}
      {showPwdModal && (
        <Modal title={`Reset Password — ${showPwdModal.email}`} onClose={() => setShowPwdModal(null)}>
          <form onSubmit={hsPwd(d => pwdMut.mutate({ id: showPwdModal.id, password: d.password }))} className="space-y-4">
            <Input label="New Password *" type="password" error={errPwd.password?.message as string}
              {...regPwd('password', { required: 'Required', minLength: { value: 8, message: 'Min 8 characters' } })} />
            <div className="flex gap-3 pt-2">
              <Button type="submit" loading={pwdMut.isPending}>Reset Password</Button>
              <Button variant="secondary" type="button" onClick={() => setShowPwdModal(null)}>Cancel</Button>
            </div>
          </form>
        </Modal>
      )}

      {deleteId && (
        <ConfirmDialog
          msg="Delete this user? This cannot be undone."
          onConfirm={() => deleteMut.mutate(deleteId)}
          onCancel={() => setDeleteId(null)}
          loading={deleteMut.isPending}
        />
      )}
    </div>
  )
}

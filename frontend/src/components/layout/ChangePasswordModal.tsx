import { useForm } from 'react-hook-form'
import { useMutation } from '@tanstack/react-query'
import { X } from 'lucide-react'
import api from '../../lib/api'
import { toast } from 'sonner'

export default function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<any>()
  const mut = useMutation({
    mutationFn: (d: any) => api.put('/auth/change-password', d),
    onSuccess: () => { toast.success('Password changed'); reset(); onClose() },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed to change password'),
  })
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-800">Change Password</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit(d => mut.mutate(d))} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Current Password *</label>
            <input type="password" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              {...register('currentPassword', { required: 'Required' })} />
            {errors.currentPassword && <p className="text-xs text-red-500 mt-1">{errors.currentPassword.message as string}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">New Password *</label>
            <input type="password" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              {...register('newPassword', { required: 'Required', minLength: { value: 8, message: 'Min 8 characters' } })} />
            {errors.newPassword && <p className="text-xs text-red-500 mt-1">{errors.newPassword.message as string}</p>}
          </div>
          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={mut.isPending}
              className="flex-1 bg-blue-600 text-white text-sm font-medium py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {mut.isPending ? 'Saving…' : 'Change Password'}
            </button>
            <button type="button" onClick={onClose}
              className="flex-1 border border-slate-200 text-slate-600 text-sm font-medium py-2 rounded-lg hover:bg-slate-50 transition-colors">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

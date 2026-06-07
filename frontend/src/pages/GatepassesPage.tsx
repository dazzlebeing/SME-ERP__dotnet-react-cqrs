import { useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { Trash2, Plus, CheckCircle } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { usePaginatedList, useDelete, useSimpleList } from '../hooks/useCrud'
import { useAuth } from '../store/authStore'
import { Card, CardHeader, Table, SortableTh, Th, Td, Button, Input, Select, Modal, ConfirmDialog, Pagination, PageHeader, Loader, Badge, SearchBox } from '../components/ui'
import { fmt } from '../lib/formatters'
import api from '../lib/api'
import { toast } from 'sonner'

interface Gatepass { id: number; companyId: number; companyName: string; gatepassNumber: string; gatepassDate: string; rollsInfo?: string; status: string; createdAt: string }
interface Company { id: number; name: string }
interface RollItem { quantity: number; description: string }

function formatRolls(rolls: RollItem[]): string {
  const valid = rolls.filter(r => r.quantity || r.description)
  return valid.length ? JSON.stringify(valid) : ''
}

function rollsDisplay(rollsInfo?: string) {
  if (!rollsInfo) return '—'
  try {
    const rolls = JSON.parse(rollsInfo) as RollItem[]
    if (Array.isArray(rolls)) return rolls.map(r => `${r.quantity}× ${r.description}`).join(', ')
  } catch { /* */ }
  return rollsInfo
}

export default function GatepassesPage() {
  const { canWrite, isAdmin } = useAuth()
  const [showForm, setShowForm] = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [companyFilter, setCompanyFilter] = useState('')
  const qc = useQueryClient()

  const { data, isLoading, setPage, search, setSearch, sortBy, sortDir, toggleSort } = usePaginatedList<Gatepass>('gatepasses', '/gatepasses', {
    ...(statusFilter && { status: statusFilter }),
    ...(companyFilter && { companyId: companyFilter }),
  })
  const del = useDelete('gatepasses', id => `/gatepasses/${id}`)
  const { data: companies = [] } = useSimpleList<Company>('companies-list', '/companies/list')

  const approveMut = useMutation({
    mutationFn: (id: number) => api.patch(`/gatepasses/${id}/status`, { status: 'Delivered' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['gatepasses'] }); toast.success('Gatepass approved') },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed'),
  })

  const saveMut = useMutation({
    mutationFn: (d: any) => api.post('/gatepasses', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['gatepasses'] }); toast.success('Gatepass created'); setShowForm(false) },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed'),
  })

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<any>({
    defaultValues: { rolls: [{ quantity: 1, description: '' }] }
  })
  const { fields, append, remove } = useFieldArray({ control, name: 'rolls' })

  const openNew = () => {
    reset({
      gatepassDate: new Date().toISOString().split('T')[0],
      rolls: [{ quantity: 1, description: '' }]
    })
    setShowForm(true)
  }

  const onSubmit = (d: any) => {
    saveMut.mutate({
      companyId: Number(d.companyId),
      gatepassNumber: d.gatepassNumber,
      gatepassDate: d.gatepassDate,
      rollsInfo: formatRolls(d.rolls),
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Gatepasses" subtitle={`${data?.totalCount ?? 0} total`}
        actions={<div className="flex gap-2 flex-wrap">
          <Select value={companyFilter} onChange={e => setCompanyFilter(e.target.value)}>
            <option value="">All Companies</option>
            {(companies as Company[]).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All Status</option>
            <option value="Pending">Pending</option>
            <option value="Delivered">Delivered</option>
          </Select>
          {canWrite() && <Button onClick={openNew}><Plus size={16} />Add Gatepass</Button>}
        </div>} />

      <Card>
        <CardHeader title="All Gatepasses" actions={
          <SearchBox value={search} onChange={v => { setSearch(v); setPage(1) }} placeholder="Search GP no / company..." />
        } />
        {isLoading ? <Loader /> : (
          <>
            <Table>
              <thead><tr>
                <SortableTh field="gatepassNumber" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort}>GP Number</SortableTh>
                <SortableTh field="companyName" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort}>Company</SortableTh>
                <SortableTh field="gatepassDate" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort}>Date</SortableTh>
                <Th>Rolls Info</Th><Th>Status</Th><Th>Actions</Th>
              </tr></thead>
              <tbody>
                {data?.items.length === 0 && <tr><Td colSpan={6} className="text-center text-slate-400 py-8">No gatepasses</Td></tr>}
                {data?.items.map(g => (
                  <tr key={g.id} className="hover:bg-slate-50">
                    <Td><span className="font-mono font-medium text-blue-700">{g.gatepassNumber}</span></Td>
                    <Td>{g.companyName}</Td>
                    <Td>{fmt.date(g.gatepassDate)}</Td>
                    <Td><span className="text-xs text-slate-500">{rollsDisplay(g.rollsInfo)}</span></Td>
                    <Td><Badge label={g.status} /></Td>
                    <Td><div className="flex gap-2">
                      {isAdmin() && g.status === 'Pending' && (
                        <Button variant="ghost" size="sm" onClick={() => approveMut.mutate(g.id)} title="Approve">
                          <CheckCircle size={14} className="text-green-500" />
                        </Button>
                      )}
                      {isAdmin() && <Button variant="ghost" size="sm" onClick={() => setDeleteId(g.id)}><Trash2 size={14} className="text-red-400" /></Button>}
                    </div></Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <Pagination page={data?.page ?? 1} totalPages={data?.totalPages ?? 1} onPage={setPage} />
          </>
        )}
      </Card>

      {showForm && (
        <Modal title="Create Gatepass" onClose={() => setShowForm(false)}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Select label="Company Name *" error={errors.companyId?.message as string} {...register('companyId', { required: 'Required' })}>
              <option value="">---Select Company---</option>
              {(companies as Company[]).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            <Input label="Gatepass Number *" error={errors.gatepassNumber?.message as string} {...register('gatepassNumber', { required: 'Required' })} />
            <Input label="Gatepass Date *" type="date" error={errors.gatepassDate?.message as string} {...register('gatepassDate', { required: 'Required' })} />

            {/* Rolls Info dynamic table — same as PHP project */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Rolls Info</label>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-700 text-white">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs w-8">#</th>
                      <th className="px-3 py-2 text-left text-xs w-24">Quantity</th>
                      <th className="px-3 py-2 text-left text-xs">Description</th>
                      <th className="w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {fields.map((f, i) => (
                      <tr key={f.id} className="border-t border-slate-100">
                        <td className="px-3 py-2 text-slate-500 text-xs">{i + 1}</td>
                        <td className="px-1 py-1">
                          <input type="number" step="0.5" min="0"
                            className="w-full border-0 outline-none text-sm px-2 py-1 bg-transparent"
                            placeholder="Qty"
                            {...register(`rolls.${i}.quantity`)} />
                        </td>
                        <td className="px-1 py-1">
                          <input
                            className="w-full border-0 outline-none text-sm px-2 py-1 bg-transparent"
                            placeholder="Roll size / description"
                            {...register(`rolls.${i}.description`)} />
                        </td>
                        <td className="px-1 py-1 text-center">
                          <button type="button" onClick={() => remove(i)}
                            className="text-xs text-white bg-red-500 hover:bg-red-600 px-2 py-0.5 rounded transition-colors">
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button type="button"
                onClick={() => append({ quantity: 1, description: '' })}
                className="mt-2 text-sm border border-slate-300 rounded px-3 py-1 hover:bg-slate-50 transition-colors">
                + Add Roll
              </button>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" loading={saveMut.isPending}>Save</Button>
              <Button variant="secondary" type="button" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </form>
        </Modal>
      )}
      {deleteId && <ConfirmDialog msg="Delete this gatepass?" onConfirm={() => del.mutate(deleteId, { onSuccess: () => setDeleteId(null) })} onCancel={() => setDeleteId(null)} loading={del.isPending} />}
    </div>
  )
}

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Trash2, Plus, Pencil } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { usePaginatedList, useDelete, useSimpleList } from '../hooks/useCrud'
import { useAuth } from '../store/authStore'
import { Card, CardHeader, Table, SortableTh, Th, Td, Button, Input, Select, Modal, ConfirmDialog, Pagination, PageHeader, Loader, SearchBox } from '../components/ui'
import { fmt } from '../lib/formatters'
import api from '../lib/api'
import { toast } from 'sonner'

interface Chalan { id: number; companyId: number; companyName: string; gatepassNumber: string; vehicleNumber?: string; rollsInfo?: string; date: string }
interface Company { id: number; name: string }

const MONTHS = fmt.MONTHS

export default function ChalansPage() {
  const { canWrite, isAdmin } = useAuth()
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [monthFilter, setMonthFilter] = useState('')
  const [yearFilter, setYearFilter] = useState('')
  const [gpLookupLoading, setGpLookupLoading] = useState(false)
  const qc = useQueryClient()

  const filters = {
    ...(monthFilter && { month: monthFilter }),
    ...(yearFilter && { year: yearFilter }),
  }
  const { data, isLoading, setPage, search, setSearch, sortBy, sortDir, toggleSort } = usePaginatedList<Chalan>('chalans', '/chalans', filters)
  const del = useDelete('chalans', id => `/chalans/${id}`)
  const { data: companies = [] } = useSimpleList<Company>('companies-list', '/companies/list')

  const saveMut = useMutation({
    mutationFn: (d: any) => editId ? api.put(`/chalans/${editId}`, d) : api.post('/chalans', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['chalans'] }); toast.success(editId ? 'Updated' : 'Created'); setShowForm(false) },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed'),
  })

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<any>()

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i)

  const openNew = () => { setEditId(null); reset({ date: new Date().toISOString().split('T')[0] }); setShowForm(true) }
  const openEdit = (c: Chalan) => { setEditId(c.id); reset({ ...c, date: fmt.dateInput(c.date) }); setShowForm(true) }

  // Auto-fill company, vehicle, rolls from gatepass number on blur
  const lookupGatepass = async (gpNumber: string) => {
    if (!gpNumber || editId) return // don't auto-fill when editing
    setGpLookupLoading(true)
    try {
      const res = await api.get(`/gatepasses/details/${encodeURIComponent(gpNumber)}`)
      const gp = res.data
      setValue('companyId', String(gp.companyId))
      setValue('vehicleNumber', gp.vehicleNumber || '')
      setValue('rollsInfo', gp.rollsInfo || '')
      toast.success(`Gatepass found: ${gp.companyName}`)
    } catch {
      // GP not found — user can fill manually, no error shown
    } finally {
      setGpLookupLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Chalans" subtitle={`${data?.totalCount ?? 0} total`}
        actions={<div className="flex gap-2 flex-wrap">
          <Select value={monthFilter} onChange={e => setMonthFilter(e.target.value)}>
            <option value="">All Months</option>
            {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
          </Select>
          <Select value={yearFilter} onChange={e => setYearFilter(e.target.value)}>
            <option value="">All Years</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </Select>
          {canWrite() && <Button onClick={openNew}><Plus size={16} />Add Chalan</Button>}
        </div>} />

      <Card>
        <CardHeader title="All Chalans" actions={
          <SearchBox value={search} onChange={v => { setSearch(v); setPage(1) }} placeholder="Search GP no / company..." />
        } />
        {isLoading ? <Loader /> : (
          <>
            <Table>
              <thead><tr>
                <SortableTh field="date" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort}>Date</SortableTh>
                <SortableTh field="companyName" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort}>Company</SortableTh>
                <SortableTh field="gatepassNumber" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort}>Gatepass No</SortableTh>
                <Th>Vehicle</Th><Th>Rolls Info</Th>
                {canWrite() && <Th>Actions</Th>}
              </tr></thead>
              <tbody>
                {data?.items.length === 0 && <tr><Td colSpan={6} className="text-center text-slate-400 py-8">No chalans</Td></tr>}
                {data?.items.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <Td>{fmt.date(c.date)}</Td>
                    <Td>{c.companyName}</Td>
                    <Td><span className="font-mono">{c.gatepassNumber}</span></Td>
                    <Td>{c.vehicleNumber || '—'}</Td>
                    <Td><span className="text-xs text-slate-500">{c.rollsInfo || '—'}</span></Td>
                    {canWrite() && <Td><div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(c)}><Pencil size={14} /></Button>
                      {isAdmin() && <Button variant="ghost" size="sm" onClick={() => setDeleteId(c.id)}><Trash2 size={14} className="text-red-400" /></Button>}
                    </div></Td>}
                  </tr>
                ))}
              </tbody>
            </Table>
            <Pagination page={data?.page ?? 1} totalPages={data?.totalPages ?? 1} onPage={setPage} />
          </>
        )}
      </Card>

      {showForm && (
        <Modal title={editId ? 'Edit Chalan' : 'Create Chalan'} onClose={() => setShowForm(false)}>
          <form onSubmit={handleSubmit(d => saveMut.mutate({ ...d, companyId: Number(d.companyId) }))} className="space-y-4">
            {!editId && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-700">
                Enter Gatepass Number first — Company, Vehicle & Rolls will auto-fill.
              </div>
            )}
            <Input
              label="Gatepass Number *"
              error={errors.gatepassNumber?.message as string}
              {...register('gatepassNumber', { required: 'Required' })}
              onBlur={e => lookupGatepass(e.target.value)}
              placeholder="e.g. GP-2024-001"
            />
            {gpLookupLoading && <p className="text-xs text-blue-500 -mt-3 pl-1">Looking up gatepass…</p>}
            <Select label="Company *" error={errors.companyId?.message as string} {...register('companyId', { required: 'Required' })}>
              <option value="">Select company...</option>
              {(companies as Company[]).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            <Input label="Date *" type="date" {...register('date', { required: 'Required' })} />
            <Input label="Vehicle Number" {...register('vehicleNumber')} placeholder="e.g. MP-09-AB-1234" />
            <Input label="Rolls Info" {...register('rollsInfo')} placeholder="e.g. 2× 500mm, 1× 300mm" />
            <div className="flex gap-3 pt-2">
              <Button type="submit" loading={saveMut.isPending}>Save</Button>
              <Button variant="secondary" type="button" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </form>
        </Modal>
      )}
      {deleteId && <ConfirmDialog msg="Delete this chalan?" onConfirm={() => del.mutate(deleteId, { onSuccess: () => setDeleteId(null) })} onCancel={() => setDeleteId(null)} loading={del.isPending} />}
    </div>
  )
}

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Trash2, Plus, Pencil } from 'lucide-react'
import { usePaginatedList, useDelete, useSave } from '../hooks/useCrud'
import { useAuth } from '../store/authStore'
import { Card, CardHeader, Table, SortableTh, Th, Td, Button, Input, Select, Modal, ConfirmDialog, Pagination, PageHeader, Loader, Textarea, SearchBox } from '../components/ui'
import { fmt } from '../lib/formatters'

interface Voucher { id: number; date: string; amount: number; paidTo: string; description?: string }

const MONTHS = fmt.MONTHS

export default function VouchersPage() {
  const { canWrite, isAdmin } = useAuth()
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<Voucher | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [monthFilter, setMonthFilter] = useState('')
  const [yearFilter, setYearFilter] = useState('')

  const filters = {
    ...(monthFilter && { month: monthFilter }),
    ...(yearFilter && { year: yearFilter }),
  }
  const { data, isLoading, setPage, search, setSearch, sortBy, sortDir, toggleSort } = usePaginatedList<Voucher>('vouchers', '/vouchers', filters)
  const del = useDelete('vouchers', id => `/vouchers/${id}`)
  const save = useSave('vouchers', '/vouchers', editItem?.id)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<any>()

  const openNew = () => {
    setEditItem(null)
    reset({ date: new Date().toISOString().split('T')[0], amount: 0 })
    setShowForm(true)
  }

  const openEdit = (v: Voucher) => {
    setEditItem(v)
    reset({ ...v, date: fmt.dateInput(v.date) })
    setShowForm(true)
  }

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i)

  return (
    <div className="space-y-6">
      <PageHeader title="Vouchers" subtitle={`${data?.totalCount ?? 0} total`}
        actions={<div className="flex gap-2">
          <Select value={monthFilter} onChange={e => setMonthFilter(e.target.value)}>
            <option value="">All Months</option>
            {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
          </Select>
          <Select value={yearFilter} onChange={e => setYearFilter(e.target.value)}>
            <option value="">All Years</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </Select>
          {canWrite() && <Button onClick={openNew}><Plus size={16} />Add Voucher</Button>}
        </div>} />

      <Card>
        <CardHeader title="All Vouchers" actions={
          <SearchBox value={search} onChange={v => { setSearch(v); setPage(1) }} placeholder="Search paid to..." />
        } />
        {isLoading ? <Loader /> : (
          <>
            <Table>
              <thead><tr>
                <SortableTh field="date" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort}>Date</SortableTh>
                <SortableTh field="paidTo" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort}>Paid To</SortableTh>
                <SortableTh field="amount" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort}>Amount</SortableTh>
                <Th>Description</Th>
                {canWrite() && <Th>Actions</Th>}
              </tr></thead>
              <tbody>
                {data?.items.length === 0 && <tr><Td colSpan={5} className="text-center text-slate-400 py-8">No vouchers</Td></tr>}
                {data?.items.map(v => (
                  <tr key={v.id} className="hover:bg-slate-50">
                    <Td>{fmt.date(v.date)}</Td>
                    <Td className="font-medium">{v.paidTo}</Td>
                    <Td className="font-semibold">{fmt.currency(v.amount)}</Td>
                    <Td><span className="text-xs text-slate-500 truncate max-w-[200px] block">{v.description || '—'}</span></Td>
                    {canWrite() && <Td><div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(v)}><Pencil size={14} /></Button>
                      {isAdmin() && <Button variant="ghost" size="sm" onClick={() => setDeleteId(v.id)}><Trash2 size={14} className="text-red-400" /></Button>}
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
        <Modal title={editItem ? 'Edit Voucher' : 'Add Voucher'} onClose={() => setShowForm(false)}>
          <form onSubmit={handleSubmit(d => save.mutate({ ...d, amount: Number(d.amount) }, { onSuccess: () => setShowForm(false) }))} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input label="Date *" type="date" error={errors.date?.message as string} {...register('date', { required: 'Required' })} />
              <Input label="Amount (₹) *" type="number" step="0.01" error={errors.amount?.message as string}
                {...register('amount', { required: 'Required', min: { value: 0.01, message: 'Must be > 0' } })} />
            </div>
            <Input label="Paid To *" error={errors.paidTo?.message as string} {...register('paidTo', { required: 'Required' })} />
            <Textarea label="Description / Remarks" {...register('description')} />
            <div className="flex gap-3 pt-2">
              <Button type="submit" loading={save.isPending}>Save</Button>
              <Button variant="secondary" type="button" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </form>
        </Modal>
      )}
      {deleteId && <ConfirmDialog msg="Delete this voucher?" onConfirm={() => del.mutate(deleteId, { onSuccess: () => setDeleteId(null) })} onCancel={() => setDeleteId(null)} loading={del.isPending} />}
    </div>
  )
}

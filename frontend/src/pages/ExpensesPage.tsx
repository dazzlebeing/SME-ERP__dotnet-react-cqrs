import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Trash2, Plus, Pencil } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { usePaginatedList, useDelete, useSimpleList } from '../hooks/useCrud'
import { useAuth } from '../store/authStore'
import { Card, CardHeader, Table, SortableTh, Th, Td, Button, Input, Select, Modal, ConfirmDialog, Pagination, PageHeader, Loader, Textarea, SearchBox } from '../components/ui'
import { fmt } from '../lib/formatters'
import api from '../lib/api'
import { toast } from 'sonner'

interface Expense { id: number; invoiceNumber?: string; date: string; vendorId: number; vendorName: string; taxPercentage: number; cgst: number; sgst: number; igst: number; amount: number; total: number; description?: string }
interface Vendor { id: number; name: string }

const MONTHS = fmt.MONTHS
const TAX_OPTIONS = [
  { label: 'None (0%)', value: 0, cgst: 0, sgst: 0, igst: 0 },
  { label: 'GST 5% (CGST 2.5% + SGST 2.5%)', value: 5, cgst: 2.5, sgst: 2.5, igst: 0 },
  { label: 'GST 12% (CGST 6% + SGST 6%)', value: 12, cgst: 6, sgst: 6, igst: 0 },
  { label: 'GST 18% (CGST 9% + SGST 9%)', value: 18, cgst: 9, sgst: 9, igst: 0 },
  { label: 'GST 28% (CGST 14% + SGST 14%)', value: 28, cgst: 14, sgst: 14, igst: 0 },
  { label: 'IGST 18%', value: 18, cgst: 0, sgst: 0, igst: 18 },
]

export default function ExpensesPage() {
  const { canWrite, isAdmin } = useAuth()
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [monthFilter, setMonthFilter] = useState('')
  const [yearFilter, setYearFilter] = useState('')
  const [vendorFilter, setVendorFilter] = useState('')
  const qc = useQueryClient()

  const filters = {
    ...(monthFilter && { month: monthFilter }),
    ...(yearFilter && { year: yearFilter }),
    ...(vendorFilter && { vendorId: vendorFilter }),
  }
  const { data, isLoading, setPage, search, setSearch, sortBy, sortDir, toggleSort } = usePaginatedList<Expense>('expenses', '/expenses', filters)
  const del = useDelete('expenses', id => `/expenses/${id}`)
  const { data: vendors = [] } = useSimpleList<Vendor>('vendors-list', '/vendors/list')

  const saveMut = useMutation({
    mutationFn: (d: any) => editId ? api.put(`/expenses/${editId}`, d) : api.post('/expenses', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['expenses'] }); toast.success(editId ? 'Updated' : 'Created'); setShowForm(false) },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed'),
  })

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<any>()

  const watchAmount = Number(watch('amount') || 0)

  const openNew = () => {
    setEditId(null)
    reset({ date: new Date().toISOString().split('T')[0], taxPercentage: 0, cgst: 0, sgst: 0, igst: 0, amount: 0 })
    setShowForm(true)
  }

  const openEdit = (e: Expense) => {
    setEditId(e.id)
    reset({ ...e, date: fmt.dateInput(e.date) })
    setShowForm(true)
  }

  const handleTaxChange = (pct: number) => {
    const opt = TAX_OPTIONS.find(t => t.value === pct) || TAX_OPTIONS[0]
    const cgst = +(watchAmount * opt.cgst / 100).toFixed(2)
    const sgst = +(watchAmount * opt.sgst / 100).toFixed(2)
    const igst = +(watchAmount * opt.igst / 100).toFixed(2)
    setValue('taxPercentage', pct)
    setValue('cgst', cgst)
    setValue('sgst', sgst)
    setValue('igst', igst)
    setValue('total', +(watchAmount + cgst + sgst + igst).toFixed(2))
  }

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i)

  return (
    <div className="space-y-6">
      <PageHeader title="Expenses" subtitle={`${data?.totalCount ?? 0} total`}
        actions={<div className="flex gap-2 flex-wrap">
          <Select value={vendorFilter} onChange={e => setVendorFilter(e.target.value)}>
            <option value="">All Vendors</option>
            {(vendors as Vendor[]).map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          </Select>
          <Select value={monthFilter} onChange={e => setMonthFilter(e.target.value)}>
            <option value="">All Months</option>
            {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
          </Select>
          <Select value={yearFilter} onChange={e => setYearFilter(e.target.value)}>
            <option value="">All Years</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </Select>
          {canWrite() && <Button onClick={openNew}><Plus size={16} />Add Expense</Button>}
        </div>} />

      <Card>
        <CardHeader title="All Expenses" actions={
          <SearchBox value={search} onChange={v => { setSearch(v); setPage(1) }} placeholder="Search invoice / vendor..." />
        } />
        {isLoading ? <Loader /> : (
          <>
            <Table>
              <thead><tr>
                <SortableTh field="date" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort}>Date</SortableTh>
                <Th>Invoice No</Th>
                <SortableTh field="vendorName" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort}>Vendor</SortableTh>
                <SortableTh field="amount" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort}>Amount</SortableTh>
                <Th>Tax</Th>
                <SortableTh field="total" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort}>Total</SortableTh>
                <Th>Description</Th>
                {canWrite() && <Th>Actions</Th>}
              </tr></thead>
              <tbody>
                {data?.items.length === 0 && <tr><Td colSpan={8} className="text-center text-slate-400 py-8">No expenses</Td></tr>}
                {data?.items.map(e => (
                  <tr key={e.id} className="hover:bg-slate-50">
                    <Td>{fmt.date(e.date)}</Td>
                    <Td><span className="font-mono text-xs">{e.invoiceNumber || '—'}</span></Td>
                    <Td>{e.vendorName}</Td>
                    <Td>{fmt.currency(e.amount)}</Td>
                    <Td><span className="text-xs text-slate-500">{e.taxPercentage}%{e.cgst > 0 ? ` (C+S)` : e.igst > 0 ? ` (IGST)` : ''}</span></Td>
                    <Td className="font-semibold">{fmt.currency(e.total)}</Td>
                    <Td><span className="text-xs text-slate-500 truncate max-w-[150px] block">{e.description || '—'}</span></Td>
                    {canWrite() && <Td><div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(e)}><Pencil size={14} /></Button>
                      {isAdmin() && <Button variant="ghost" size="sm" onClick={() => setDeleteId(e.id)}><Trash2 size={14} className="text-red-400" /></Button>}
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
        <Modal title={editId ? 'Edit Expense' : 'Add Expense'} onClose={() => setShowForm(false)}>
          <form onSubmit={handleSubmit(d => saveMut.mutate({
            ...d,
            vendorId: Number(d.vendorId),
            taxPercentage: Number(d.taxPercentage),
            cgst: Number(d.cgst),
            sgst: Number(d.sgst),
            igst: Number(d.igst),
            amount: Number(d.amount),
            total: Number(d.total),
          }))} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input label="Invoice Number" {...register('invoiceNumber')} />
              <Input label="Date *" type="date" error={errors.date?.message as string} {...register('date', { required: 'Required' })} />
            </div>
            <Select label="Vendor *" error={errors.vendorId?.message as string} {...register('vendorId', { required: 'Required' })}>
              <option value="">Select vendor...</option>
              {(vendors as Vendor[]).map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </Select>
            <Input label="Base Amount (₹) *" type="number" step="0.01"
              error={errors.amount?.message as string}
              {...register('amount', { required: 'Required', onChange: (e) => {
                const amt = Number(e.target.value || 0)
                const pct = Number(watch('taxPercentage') || 0)
                const opt = TAX_OPTIONS.find(t => t.value === pct) || TAX_OPTIONS[0]
                const c = +(amt * opt.cgst / 100).toFixed(2)
                const s = +(amt * opt.sgst / 100).toFixed(2)
                const ig = +(amt * opt.igst / 100).toFixed(2)
                setValue('cgst', c); setValue('sgst', s); setValue('igst', ig)
                setValue('total', +(amt + c + s + ig).toFixed(2))
              }})} />
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tax Type</label>
              <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                onChange={e => handleTaxChange(Number(e.target.value))}
                defaultValue={watch('taxPercentage') || 0}>
                {TAX_OPTIONS.map((t, i) => <option key={i} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Input label="CGST (₹)" type="number" step="0.01" {...register('cgst')} readOnly className="bg-slate-50" />
              <Input label="SGST (₹)" type="number" step="0.01" {...register('sgst')} readOnly className="bg-slate-50" />
              <Input label="IGST (₹)" type="number" step="0.01" {...register('igst')} readOnly className="bg-slate-50" />
            </div>
            <Input label="Total (₹)" type="number" step="0.01" {...register('total')} readOnly className="bg-slate-50 font-semibold" />
            <Textarea label="Description" {...register('description')} />
            <div className="flex gap-3 pt-2">
              <Button type="submit" loading={saveMut.isPending}>Save</Button>
              <Button variant="secondary" type="button" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </form>
        </Modal>
      )}
      {deleteId && <ConfirmDialog msg="Delete this expense?" onConfirm={() => del.mutate(deleteId, { onSuccess: () => setDeleteId(null) })} onCancel={() => setDeleteId(null)} loading={del.isPending} />}
    </div>
  )
}

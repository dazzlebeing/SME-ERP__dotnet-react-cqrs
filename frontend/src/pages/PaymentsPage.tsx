import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Trash2, Plus } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { usePaginatedList, useDelete, useSimpleList } from '../hooks/useCrud'
import { useAuth } from '../store/authStore'
import { Card, CardHeader, Table, SortableTh, Th, Td, Button, Input, Select, Modal, ConfirmDialog, Pagination, PageHeader, Loader, Textarea, SearchBox } from '../components/ui'
import { fmt } from '../lib/formatters'
import api from '../lib/api'
import { toast } from 'sonner'

interface Payment { id: number; paymentDate: string; companyId: number; companyName: string; modeOfPayment: string; paymentAmount: number; paidBills?: string; description?: string }
interface Company { id: number; name: string }

const MONTHS = fmt.MONTHS

export default function PaymentsPage() {
  const { canWrite, isAdmin } = useAuth()
  const [showForm, setShowForm] = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [monthFilter, setMonthFilter] = useState('')
  const [yearFilter, setYearFilter] = useState('')
  const [companyFilter, setCompanyFilter] = useState('')
  const qc = useQueryClient()

  const filters = {
    ...(monthFilter && { month: monthFilter }),
    ...(yearFilter && { year: yearFilter }),
    ...(companyFilter && { companyId: companyFilter }),
  }
  const { data, isLoading, setPage, search, setSearch, sortBy, sortDir, toggleSort } = usePaginatedList<Payment>('payments', '/payments', filters)
  const del = useDelete('payments', id => `/payments/${id}`)
  const { data: companies = [] } = useSimpleList<Company>('companies-list', '/companies/list')

  const saveMut = useMutation({
    mutationFn: (d: any) => api.post('/payments', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['payments'] }); toast.success('Payment recorded'); setShowForm(false) },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed'),
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<any>()

  const openNew = () => {
    reset({ paymentDate: new Date().toISOString().split('T')[0], modeOfPayment: 'Cash' })
    setShowForm(true)
  }

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i)

  return (
    <div className="space-y-6">
      <PageHeader title="Payments" subtitle={`${data?.totalCount ?? 0} total`}
        actions={<div className="flex gap-2 flex-wrap">
          <Select value={companyFilter} onChange={e => setCompanyFilter(e.target.value)}>
            <option value="">All Companies</option>
            {(companies as Company[]).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <Select value={monthFilter} onChange={e => setMonthFilter(e.target.value)}>
            <option value="">All Months</option>
            {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
          </Select>
          <Select value={yearFilter} onChange={e => setYearFilter(e.target.value)}>
            <option value="">All Years</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </Select>
          {canWrite() && <Button onClick={openNew}><Plus size={16} />Add Payment</Button>}
        </div>} />

      <Card>
        <CardHeader title="All Payments" actions={
          <SearchBox value={search} onChange={v => { setSearch(v); setPage(1) }} placeholder="Search company..." />
        } />
        {isLoading ? <Loader /> : (
          <>
            <Table>
              <thead><tr>
                <SortableTh field="paymentDate" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort}>Date</SortableTh>
                <SortableTh field="companyName" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort}>Company</SortableTh>
                <Th>Mode</Th>
                <SortableTh field="paymentAmount" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort}>Amount</SortableTh>
                <Th>Description</Th>
                {isAdmin() && <Th>Actions</Th>}
              </tr></thead>
              <tbody>
                {data?.items.length === 0 && <tr><Td colSpan={6} className="text-center text-slate-400 py-8">No payments</Td></tr>}
                {data?.items.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <Td>{fmt.date(p.paymentDate)}</Td>
                    <Td className="font-medium">{p.companyName}</Td>
                    <Td><span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">{p.modeOfPayment}</span></Td>
                    <Td className="font-semibold text-green-700">{fmt.currency(p.paymentAmount)}</Td>
                    <Td><span className="text-xs text-slate-500 truncate max-w-[200px] block">{p.description || '—'}</span></Td>
                    {isAdmin() && <Td>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteId(p.id)}><Trash2 size={14} className="text-red-400" /></Button>
                    </Td>}
                  </tr>
                ))}
              </tbody>
            </Table>
            <Pagination page={data?.page ?? 1} totalPages={data?.totalPages ?? 1} onPage={setPage} />
          </>
        )}
      </Card>

      {showForm && (
        <Modal title="Record Payment" onClose={() => setShowForm(false)}>
          <form onSubmit={handleSubmit(d => saveMut.mutate({
            ...d, companyId: Number(d.companyId), paymentAmount: Number(d.paymentAmount)
          }))} className="space-y-4">
            <Select label="Company *" error={errors.companyId?.message as string} {...register('companyId', { required: 'Required' })}>
              <option value="">Select company...</option>
              {(companies as Company[]).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Payment Date *" type="date" error={errors.paymentDate?.message as string} {...register('paymentDate', { required: 'Required' })} />
              <Select label="Mode of Payment *" error={errors.modeOfPayment?.message as string} {...register('modeOfPayment', { required: 'Required' })}>
                <option value="Cash">Cash</option>
                <option value="Cheque">Cheque</option>
                <option value="RTGS">RTGS</option>
                <option value="NEFT">NEFT</option>
                <option value="UPI">UPI</option>
              </Select>
            </div>
            <Input label="Payment Amount (₹) *" type="number" step="0.01" error={errors.paymentAmount?.message as string}
              {...register('paymentAmount', { required: 'Required', min: { value: 0.01, message: 'Must be > 0' } })} />
            <Textarea label="Paid Bills (bill numbers, comma separated)" {...register('paidBills')} />
            <Textarea label="Description / Remarks" {...register('description')} />
            <div className="flex gap-3 pt-2">
              <Button type="submit" loading={saveMut.isPending}>Save Payment</Button>
              <Button variant="secondary" type="button" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </form>
        </Modal>
      )}
      {deleteId && <ConfirmDialog msg="Delete this payment? This cannot be undone." onConfirm={() => del.mutate(deleteId, { onSuccess: () => setDeleteId(null) })} onCancel={() => setDeleteId(null)} loading={del.isPending} />}
    </div>
  )
}

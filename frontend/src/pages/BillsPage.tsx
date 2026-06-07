import { useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { Trash2, Plus, FileDown } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { usePaginatedList, useDelete, useSimpleList } from '../hooks/useCrud'
import { useAuth } from '../store/authStore'
import { Card, CardHeader, Table, SortableTh, Th, Td, Button, Input, Select, Modal, ConfirmDialog, Pagination, PageHeader, Loader, Badge, Textarea, SearchBox } from '../components/ui'
import { fmt } from '../lib/formatters'
import api from '../lib/api'
import { toast } from 'sonner'

interface Bill { id: number; billNumber: string; billDate: string; companyName: string; companyId: number; gatepassNumber?: string; billTotal: number; billStatus: string; paymentStatus: string; paymentReceived: number }
interface Company { id: number; name: string }

const TAX_RATE = 9 // CGST/SGST each

export default function BillsPage() {
  const { canWrite, isAdmin } = useAuth()
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [payFilter, setPayFilter] = useState('')
  const [companyFilter, setCompanyFilter] = useState('')
  const qc = useQueryClient()

  const { data, isLoading, setPage, search, setSearch, sortBy, sortDir, toggleSort } = usePaginatedList<Bill>('bills', '/bills',
    {
      ...(statusFilter && { billStatus: statusFilter }),
      ...(payFilter && { paymentStatus: payFilter }),
      ...(companyFilter && { companyId: companyFilter }),
    })
  const del = useDelete('bills', id => `/bills/${id}`)
  const { data: companies = [] } = useSimpleList<Company>('companies-list', '/companies/list')

  const saveMut = useMutation({
    mutationFn: (d: any) => editId ? api.put(`/bills/${editId}`, d) : api.post('/bills', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bills'] }); toast.success(editId ? 'Updated' : 'Created'); setShowForm(false) },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed'),
  })

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => api.patch(`/bills/${id}/status`, { status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bills'] }); toast.success('Status updated') },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed'),
  })

  const { register, handleSubmit, reset, watch, control } = useForm<any>({
    defaultValues: { particulars: [{ description: '', quantity: 1, price: 0, total: 0 }], billDate: new Date().toISOString().split('T')[0] }
  })
  const { fields, append, remove } = useFieldArray({ control, name: 'particulars' })

  const particulars = watch('particulars') || []
  const taxType = watch('taxType') || 'CGST/SGST'

  const calcTotals = () => {
    const billAmount = particulars.reduce((s: number, p: any) => s + (Number(p.quantity) * Number(p.price)), 0)
    let cgst = 0, sgst = 0, igst = 0
    if (taxType === 'CGST/SGST') { cgst = billAmount * TAX_RATE / 100; sgst = cgst }
    else { igst = billAmount * 18 / 100 }
    const billTotal = billAmount + cgst + sgst + igst
    return { billAmount: +billAmount.toFixed(2), cgst: +cgst.toFixed(2), sgst: +sgst.toFixed(2), igst: +igst.toFixed(2), billTotal: +billTotal.toFixed(2) }
  }

  const openNew = () => {
    setEditId(null)
    reset({ particulars: [{ description: '', quantity: 1, price: 0, total: 0 }], billDate: new Date().toISOString().split('T')[0], taxType: 'CGST/SGST' })
    setShowForm(true)
  }

  const onSubmit = (d: any) => {
    const tots = calcTotals()
    const payload = {
      billDate: d.billDate, billNumber: d.billNumber, hsnCode: d.hsnCode,
      companyId: Number(d.companyId), gatepassNumber: d.gatepassNumber, vehicleNumber: d.vehicleNumber,
      ...tots, roundOff: 0, remarks: d.remarks,
      particulars: d.particulars.map((p: any) => ({
        description: p.description, quantity: Number(p.quantity),
        price: Number(p.price), total: +(Number(p.quantity) * Number(p.price)).toFixed(2)
      }))
    }
    saveMut.mutate(payload)
  }

  const downloadPdf = (id: number, billNo: string) => {
    api.get(`/export/bills/${id}/pdf`, { responseType: 'blob' }).then(r => {
      const url = URL.createObjectURL(r.data)
      const a = document.createElement('a'); a.href = url; a.download = `Bill-${billNo}.pdf`; a.click()
    }).catch(() => toast.error('PDF failed'))
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Bills" subtitle={`${data?.totalCount ?? 0} total`}
        actions={<div className="flex gap-2 flex-wrap">
          <Select value={companyFilter} onChange={e => setCompanyFilter(e.target.value)}>
            <option value="">All Companies</option>
            {(companies as Company[]).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All Status</option><option value="Active">Active</option><option value="Inactive">Inactive</option>
          </Select>
          <Select value={payFilter} onChange={e => setPayFilter(e.target.value)}>
            <option value="">All Payment</option><option value="Unpaid">Unpaid</option><option value="Partial">Partial</option><option value="Paid">Paid</option>
          </Select>
          {canWrite() && <Button onClick={openNew}><Plus size={16} />New Bill</Button>}
        </div>} />

      <Card>
        <CardHeader title="Bills" actions={
          <SearchBox value={search} onChange={v => { setSearch(v); setPage(1) }} placeholder="Search bill no / company..." />
        } />
        {isLoading ? <Loader /> : (
          <>
            <Table>
              <thead><tr>
                <SortableTh field="billNumber" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort}>Bill No</SortableTh>
                <SortableTh field="billDate" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort}>Date</SortableTh>
                <SortableTh field="companyName" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort}>Company</SortableTh>
                <Th>GP No</Th>
                <SortableTh field="billTotal" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort}>Total</SortableTh>
                <Th>Status</Th><Th>Payment</Th><Th>Actions</Th>
              </tr></thead>
              <tbody>
                {data?.items.length === 0 && <tr><Td colSpan={8} className="text-center text-slate-400 py-8">No bills</Td></tr>}
                {data?.items.map(b => (
                  <tr key={b.id} className="hover:bg-slate-50">
                    <Td><span className="font-mono font-medium text-blue-600">{b.billNumber}</span></Td>
                    <Td>{fmt.date(b.billDate)}</Td>
                    <Td>{b.companyName}</Td>
                    <Td><span className="font-mono text-xs">{b.gatepassNumber || '—'}</span></Td>
                    <Td className="font-semibold">{fmt.currency(b.billTotal)}</Td>
                    <Td>
                      {isAdmin()
                        ? <select
                            value={b.billStatus}
                            onChange={e => statusMut.mutate({ id: b.id, status: e.target.value })}
                            className="text-xs border border-slate-200 rounded px-2 py-0.5 bg-white text-slate-700 cursor-pointer hover:border-blue-400 focus:outline-none">
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                          </select>
                        : <Badge label={b.billStatus} />}
                    </Td>
                    <Td><div><Badge label={b.paymentStatus} /><p className="text-xs text-slate-400 mt-0.5">{fmt.currency(b.paymentReceived)} recv</p></div></Td>
                    <Td><div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => downloadPdf(b.id, b.billNumber)} title="PDF"><FileDown size={14} className="text-blue-500" /></Button>
                      {isAdmin() && <Button variant="ghost" size="sm" onClick={() => setDeleteId(b.id)}><Trash2 size={14} className="text-red-400" /></Button>}
                    </div></Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <Pagination page={data?.page ?? 1} totalPages={data?.totalPages ?? 1} onPage={p => setPage(p)} />
          </>
        )}
      </Card>

      {showForm && (
        <Modal title={editId ? 'Edit Bill' : 'Create Bill'} onClose={() => setShowForm(false)}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input label="Bill Number *" {...register('billNumber', { required: true })} />
              <Input label="Bill Date *" type="date" {...register('billDate', { required: true })} />
            </div>
            <Select label="Company *" {...register('companyId', { required: true })}>
              <option value="">Select company...</option>
              {(companies as Company[]).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Gatepass Number" {...register('gatepassNumber')} />
              <Input label="Vehicle Number" {...register('vehicleNumber')} />
              <Input label="HSN Code" {...register('hsnCode')} />
              <Select label="Tax Type" {...register('taxType')}>
                <option value="CGST/SGST">CGST + SGST (Intra-state)</option>
                <option value="IGST">IGST (Inter-state)</option>
              </Select>
            </div>

            {/* Particulars */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-slate-700">Particulars *</label>
                <Button type="button" variant="secondary" size="sm" onClick={() => append({ description: '', quantity: 1, price: 0, total: 0 })}>
                  <Plus size={12} />Add Row
                </Button>
              </div>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50"><tr>
                    <th className="text-left p-2 text-xs text-slate-500">Description</th>
                    <th className="text-right p-2 text-xs text-slate-500 w-16">Qty</th>
                    <th className="text-right p-2 text-xs text-slate-500 w-24">Rate</th>
                    <th className="text-right p-2 text-xs text-slate-500 w-24">Amount</th>
                    <th className="w-8"></th>
                  </tr></thead>
                  <tbody>
                    {fields.map((f, i) => {
                      const qty = Number(watch(`particulars.${i}.quantity`) || 0)
                      const price = Number(watch(`particulars.${i}.price`) || 0)
                      return (
                        <tr key={f.id} className="border-t">
                          <td className="p-1"><input className="w-full border-0 outline-none text-sm px-1 py-1" {...register(`particulars.${i}.description`)} placeholder="Description" /></td>
                          <td className="p-1"><input className="w-full border-0 outline-none text-sm px-1 py-1 text-right" type="number" step="0.01" {...register(`particulars.${i}.quantity`)} /></td>
                          <td className="p-1"><input className="w-full border-0 outline-none text-sm px-1 py-1 text-right" type="number" step="0.01" {...register(`particulars.${i}.price`)} /></td>
                          <td className="p-1 text-right text-sm font-medium pr-2">{fmt.currency(qty * price)}</td>
                          <td className="p-1"><button type="button" onClick={() => remove(i)} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={12} /></button></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              {/* Tax summary */}
              {(() => { const t = calcTotals(); return (
                <div className="mt-2 text-sm text-right space-y-0.5 text-slate-600">
                  <p>Subtotal: <b>{fmt.currency(t.billAmount)}</b></p>
                  {t.cgst > 0 && <><p>CGST (9%): {fmt.currency(t.cgst)}</p><p>SGST (9%): {fmt.currency(t.sgst)}</p></>}
                  {t.igst > 0 && <p>IGST (18%): {fmt.currency(t.igst)}</p>}
                  <p className="font-bold text-slate-800">Total: {fmt.currency(t.billTotal)}</p>
                </div>
              )})()}
            </div>

            <Textarea label="Remarks" {...register('remarks')} />
            <div className="flex gap-3 pt-2">
              <Button type="submit" loading={saveMut.isPending}>Save Bill</Button>
              <Button variant="secondary" type="button" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </form>
        </Modal>
      )}
      {deleteId && <ConfirmDialog msg="Delete this bill?" onConfirm={() => del.mutate(deleteId, { onSuccess: () => setDeleteId(null) })} onCancel={() => setDeleteId(null)} loading={del.isPending} />}
    </div>
  )
}

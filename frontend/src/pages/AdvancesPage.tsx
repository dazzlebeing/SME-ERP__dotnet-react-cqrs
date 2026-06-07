import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Trash2, Plus } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { usePaginatedList, useDelete, useSimpleList } from '../hooks/useCrud'
import { useAuth } from '../store/authStore'
import { Card, CardHeader, Table, SortableTh, Th, Td, Button, Input, Select, Modal, ConfirmDialog, Pagination, PageHeader, Loader, SearchBox } from '../components/ui'
import { fmt } from '../lib/formatters'
import api from '../lib/api'
import { toast } from 'sonner'

interface Advance { id: number; employeeId: number; employeeName: string; date: string; takenAmount: number; returnedAmount: number; totalDue: number }
interface Employee { id: number; name: string }

export default function AdvancesPage() {
  const { canWrite, isAdmin } = useAuth()
  const [showForm, setShowForm] = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [employeeFilter, setEmployeeFilter] = useState('')
  const qc = useQueryClient()

  const { data, isLoading, setPage, search, setSearch, sortBy, sortDir, toggleSort } = usePaginatedList<Advance>('advances', '/advances', employeeFilter ? { employeeId: employeeFilter } : {})
  const del = useDelete('advances', id => `/advances/${id}`)
  const { data: employees = [] } = useSimpleList<Employee>('employees-list', '/employees/list')

  const saveMut = useMutation({
    mutationFn: (d: any) => api.post('/advances', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['advances'] }); toast.success('Advance recorded'); setShowForm(false) },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed'),
  })

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<any>()

  const watchTaken = Number(watch('takenAmount') || 0)
  const watchReturned = Number(watch('returnedAmount') || 0)

  const openNew = () => {
    reset({ date: new Date().toISOString().split('T')[0], takenAmount: 0, returnedAmount: 0, totalDue: 0 })
    setShowForm(true)
  }

  const recalcDue = (taken: number, returned: number) => {
    setValue('totalDue', +(taken - returned).toFixed(2))
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Advances" subtitle={`${data?.totalCount ?? 0} total`}
        actions={<div className="flex gap-2">
          <Select value={employeeFilter} onChange={e => setEmployeeFilter(e.target.value)}>
            <option value="">All Employees</option>
            {(employees as Employee[]).map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </Select>
          {canWrite() && <Button onClick={openNew}><Plus size={16} />Add Advance</Button>}
        </div>} />

      <Card>
        <CardHeader title="Advance Records" actions={
          <SearchBox value={search} onChange={v => { setSearch(v); setPage(1) }} placeholder="Search employee..." />
        } />
        {isLoading ? <Loader /> : (
          <>
            <Table>
              <thead><tr>
                <SortableTh field="date" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort}>Date</SortableTh>
                <SortableTh field="employeeName" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort}>Employee</SortableTh>
                <SortableTh field="takenAmount" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort}>Taken</SortableTh>
                <SortableTh field="returnedAmount" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort}>Returned</SortableTh>
                <SortableTh field="totalDue" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort}>Due</SortableTh>
                {isAdmin() && <Th>Actions</Th>}
              </tr></thead>
              <tbody>
                {data?.items.length === 0 && <tr><Td colSpan={6} className="text-center text-slate-400 py-8">No advance records</Td></tr>}
                {data?.items.map(a => (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <Td>{fmt.date(a.date)}</Td>
                    <Td className="font-medium">{a.employeeName}</Td>
                    <Td>{fmt.currency(a.takenAmount)}</Td>
                    <Td className="text-green-700">{fmt.currency(a.returnedAmount)}</Td>
                    <Td>
                      <span className={`font-semibold ${a.totalDue > 0 ? 'text-red-600' : 'text-slate-600'}`}>
                        {fmt.currency(a.totalDue)}
                      </span>
                    </Td>
                    {isAdmin() && <Td>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteId(a.id)}><Trash2 size={14} className="text-red-400" /></Button>
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
        <Modal title="Add Advance Record" onClose={() => setShowForm(false)}>
          <form onSubmit={handleSubmit(d => saveMut.mutate({
            employeeId: Number(d.employeeId),
            date: d.date,
            takenAmount: Number(d.takenAmount),
            returnedAmount: Number(d.returnedAmount),
            totalDue: Number(d.totalDue),
          }))} className="space-y-4">
            <Select label="Employee *" error={errors.employeeId?.message as string} {...register('employeeId', { required: 'Required' })}>
              <option value="">Select employee...</option>
              {(employees as Employee[]).map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </Select>
            <Input label="Date *" type="date" error={errors.date?.message as string} {...register('date', { required: 'Required' })} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Taken Amount (₹) *" type="number" step="0.01"
                {...register('takenAmount', { required: 'Required', onChange: e => recalcDue(Number(e.target.value || 0), watchReturned) })} />
              <Input label="Returned Amount (₹)" type="number" step="0.01"
                {...register('returnedAmount', { onChange: e => recalcDue(watchTaken, Number(e.target.value || 0)) })} />
            </div>
            <Input label="Total Due (₹)" type="number" step="0.01" {...register('totalDue')} readOnly className="bg-slate-50 font-semibold" />
            <div className="flex gap-3 pt-2">
              <Button type="submit" loading={saveMut.isPending}>Save</Button>
              <Button variant="secondary" type="button" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </form>
        </Modal>
      )}
      {deleteId && <ConfirmDialog msg="Delete this advance record?" onConfirm={() => del.mutate(deleteId, { onSuccess: () => setDeleteId(null) })} onCancel={() => setDeleteId(null)} loading={del.isPending} />}
    </div>
  )
}

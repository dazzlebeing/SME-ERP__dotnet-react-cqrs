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

interface SalaryRecord { id: number; employeeId: number; employeeName: string; workingDays: number; month: number; year: number; amount: number; date: string }
interface Employee { id: number; name: string; salary?: number }

const MONTHS = fmt.MONTHS

export default function SalaryPage() {
  const { canWrite, isAdmin } = useAuth()
  const [showForm, setShowForm] = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [employeeFilter, setEmployeeFilter] = useState('')
  const [monthFilter, setMonthFilter] = useState('')
  const [yearFilter, setYearFilter] = useState('')
  const qc = useQueryClient()

  const filters = {
    ...(employeeFilter && { employeeId: employeeFilter }),
    ...(monthFilter && { month: monthFilter }),
    ...(yearFilter && { year: yearFilter }),
  }
  const { data, isLoading, setPage, search, setSearch, sortBy, sortDir, toggleSort } = usePaginatedList<SalaryRecord>('salary', '/salary', filters)
  const del = useDelete('salary', id => `/salary/${id}`)
  const { data: employees = [] } = useSimpleList<Employee>('employees-list', '/employees/list')

  const saveMut = useMutation({
    mutationFn: (d: any) => api.post('/salary', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['salary'] }); toast.success('Salary record added'); setShowForm(false) },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed'),
  })

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<any>()

  const watchEmployeeId = watch('employeeId')
  const watchWorkingDays = Number(watch('workingDays') || 0)
  const selectedEmployee = (employees as Employee[]).find(e => String(e.id) === String(watchEmployeeId))

  // Auto-calculate salary amount from working days and employee base salary
  const autoCalcAmount = (days: number, emp?: Employee) => {
    if (!emp?.salary || days <= 0) return
    const calculated = +((days / 26) * emp.salary).toFixed(2)
    setValue('amount', calculated)
  }

  const openNew = () => {
    const now = new Date()
    reset({ month: now.getMonth() + 1, year: now.getFullYear(), workingDays: 26, amount: 0 })
    setShowForm(true)
  }

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i)

  return (
    <div className="space-y-6">
      <PageHeader title="Salary Records" subtitle={`${data?.totalCount ?? 0} total`}
        actions={<div className="flex gap-2 flex-wrap">
          <Select value={employeeFilter} onChange={e => setEmployeeFilter(e.target.value)}>
            <option value="">All Employees</option>
            {(employees as Employee[]).map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </Select>
          <Select value={monthFilter} onChange={e => setMonthFilter(e.target.value)}>
            <option value="">All Months</option>
            {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
          </Select>
          <Select value={yearFilter} onChange={e => setYearFilter(e.target.value)}>
            <option value="">All Years</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </Select>
          {canWrite() && <Button onClick={openNew}><Plus size={16} />Add Salary</Button>}
        </div>} />

      <Card>
        <CardHeader title="Salary Records" actions={
          <SearchBox value={search} onChange={v => { setSearch(v); setPage(1) }} placeholder="Search employee..." />
        } />
        {isLoading ? <Loader /> : (
          <>
            <Table>
              <thead><tr>
                <SortableTh field="employeeName" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort}>Employee</SortableTh>
                <SortableTh field="month" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort}>Month/Year</SortableTh>
                <SortableTh field="workingDays" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort}>Working Days</SortableTh>
                <SortableTh field="amount" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort}>Amount</SortableTh>
                {isAdmin() && <Th>Actions</Th>}
              </tr></thead>
              <tbody>
                {data?.items.length === 0 && <tr><Td colSpan={5} className="text-center text-slate-400 py-8">No salary records</Td></tr>}
                {data?.items.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <Td className="font-medium">{s.employeeName}</Td>
                    <Td>{MONTHS[(s.month ?? 1) - 1]} {s.year}</Td>
                    <Td>{s.workingDays} days</Td>
                    <Td className="font-semibold">{fmt.currency(s.amount)}</Td>
                    {isAdmin() && <Td>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteId(s.id)}><Trash2 size={14} className="text-red-400" /></Button>
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
        <Modal title="Add Salary Record" onClose={() => setShowForm(false)}>
          <form onSubmit={handleSubmit(d => saveMut.mutate({
            employeeId: Number(d.employeeId),
            workingDays: Number(d.workingDays),
            month: Number(d.month),
            year: Number(d.year),
            amount: Number(d.amount),
          }))} className="space-y-4">
            <Select label="Employee *" error={errors.employeeId?.message as string}
              {...register('employeeId', {
                required: 'Required',
                onChange: e => {
                  const emp = (employees as Employee[]).find(em => String(em.id) === String(e.target.value))
                  autoCalcAmount(watchWorkingDays, emp)
                }
              })}>
              <option value="">Select employee...</option>
              {(employees as Employee[]).map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </Select>
            {selectedEmployee?.salary && (
              <p className="text-xs text-slate-500 -mt-2 pl-1">
                Monthly salary: <strong>{fmt.currency(selectedEmployee.salary)}</strong>
                {watchWorkingDays > 0 && ` → ${watchWorkingDays} days = `}
                {watchWorkingDays > 0 && <strong>{fmt.currency(+((watchWorkingDays / 26) * selectedEmployee.salary).toFixed(2))}</strong>}
              </p>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Select label="Month *" error={errors.month?.message as string} {...register('month', { required: 'Required' })}>
                {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
              </Select>
              <Select label="Year *" {...register('year', { required: 'Required' })}>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </Select>
            </div>
            <Input label="Working Days" type="number" step="0.5"
              {...register('workingDays', {
                onChange: e => autoCalcAmount(Number(e.target.value || 0), selectedEmployee)
              })} />
            <Input label="Salary Amount (₹) *" type="number" step="0.01"
              error={errors.amount?.message as string}
              {...register('amount', { required: 'Required', min: { value: 1, message: 'Must be > 0' } })} />
            <div className="flex gap-3 pt-2">
              <Button type="submit" loading={saveMut.isPending}>Save</Button>
              <Button variant="secondary" type="button" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </form>
        </Modal>
      )}
      {deleteId && <ConfirmDialog msg="Delete this salary record?" onConfirm={() => del.mutate(deleteId, { onSuccess: () => setDeleteId(null) })} onCancel={() => setDeleteId(null)} loading={del.isPending} />}
    </div>
  )
}

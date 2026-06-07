import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Pencil, Trash2, Plus } from 'lucide-react'
import { usePaginatedList, useDelete, useSave } from '../hooks/useCrud'
import { useAuth } from '../store/authStore'
import { Card, CardHeader, Table, SortableTh, Th, Td, Button, Input, Modal, ConfirmDialog, Pagination, PageHeader, Loader, SearchBox } from '../components/ui'
import { fmt } from '../lib/formatters'

interface Employee { id: number; name: string; qualification?: string; mobileNumber?: string; aadhar?: string; joiningDate?: string; salary: number; createdAt: string }

export default function EmployeesPage() {
  const { canWrite, isAdmin } = useAuth()
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<Employee | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)

  const { data, isLoading, setPage, search, setSearch, sortBy, sortDir, toggleSort } = usePaginatedList<Employee>('employees', '/employees')
  const del = useDelete('employees', id => `/employees/${id}`)
  const save = useSave('employees', '/employees', editItem?.id)
  const { register, handleSubmit, reset, formState: { errors } } = useForm<any>()

  const openEdit = (e: Employee) => { setEditItem(e); reset({ ...e, joiningDate: e.joiningDate ? fmt.dateInput(e.joiningDate) : '' }); setShowForm(true) }
  const openNew = () => { setEditItem(null); reset({ salary: 0 }); setShowForm(true) }

  return (
    <div className="space-y-6">
      <PageHeader title="Employees" subtitle={`${data?.totalCount ?? 0} employees`}
        actions={canWrite() && <Button onClick={openNew}><Plus size={16} />Add Employee</Button>} />
      <Card>
        <CardHeader title="All Employees" actions={
          <SearchBox value={search} onChange={v => { setSearch(v); setPage(1) }} placeholder="Search name..." />
        } />
        {isLoading ? <Loader /> : (
          <>
            <Table>
              <thead><tr>
                <SortableTh field="name" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort}>Name</SortableTh>
                <Th>Mobile</Th><Th>Qualification</Th>
                <SortableTh field="salary" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort}>Salary</SortableTh>
                <SortableTh field="joiningDate" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort}>Joining</SortableTh>
                {canWrite() && <Th>Actions</Th>}
              </tr></thead>
              <tbody>
                {data?.items.length === 0 && <tr><Td colSpan={6} className="text-center text-slate-400 py-8">No employees</Td></tr>}
                {data?.items.map(e => (
                  <tr key={e.id} className="hover:bg-slate-50">
                    <Td><p className="font-medium">{e.name}</p></Td>
                    <Td>{e.mobileNumber || '—'}</Td>
                    <Td>{e.qualification || '—'}</Td>
                    <Td className="font-medium">{fmt.currency(e.salary)}</Td>
                    <Td>{e.joiningDate ? fmt.date(e.joiningDate) : '—'}</Td>
                    {canWrite() && <Td><div className="flex gap-2">
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
        <Modal title={editItem ? 'Edit Employee' : 'Add Employee'} onClose={() => setShowForm(false)}>
          <form onSubmit={handleSubmit(d => save.mutate({ ...d, salary: Number(d.salary) }, { onSuccess: () => setShowForm(false) }))} className="space-y-4">
            <Input label="Full Name *" error={errors.name?.message as string} {...register('name', { required: 'Required' })} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Qualification" {...register('qualification')} />
              <Input label="Mobile" {...register('mobileNumber')} />
              <Input label="Aadhar No" {...register('aadhar')} />
              <Input label="Joining Date" type="date" {...register('joiningDate')} />
            </div>
            <Input label="Monthly Salary (₹)" type="number" step="0.01" {...register('salary')} />
            <div className="flex gap-3 pt-2">
              <Button type="submit" loading={save.isPending}>Save</Button>
              <Button variant="secondary" type="button" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </form>
        </Modal>
      )}
      {deleteId && <ConfirmDialog msg="Delete this employee?" onConfirm={() => del.mutate(deleteId, { onSuccess: () => setDeleteId(null) })} onCancel={() => setDeleteId(null)} loading={del.isPending} />}
    </div>
  )
}

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Pencil, Trash2, Plus } from 'lucide-react'
import { usePaginatedList, useDelete, useSave } from '../hooks/useCrud'
import { useAuth } from '../store/authStore'
import { Card, CardHeader, Table, SortableTh, Th, Td, Button, Input, Modal, ConfirmDialog, Pagination, PageHeader, Loader, ErrorMsg, SearchBox } from '../components/ui'
import { fmt } from '../lib/formatters'

interface Company { id: number; name: string; address?: string; gstin?: string; contactPerson1?: string; contactNumber1?: string; contactPerson2?: string; contactNumber2?: string; createdAt: string }

export default function CompaniesPage() {
  const { canWrite, isAdmin } = useAuth()
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<Company | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)

  const { data, isLoading, isError, setPage, search, setSearch, sortBy, sortDir, toggleSort } = usePaginatedList<Company>('companies', '/companies')
  const del = useDelete('companies', id => `/companies/${id}`)
  const save = useSave('companies', '/companies', editItem?.id)
  const { register, handleSubmit, reset, formState: { errors } } = useForm<any>()

  const openEdit = (c: Company) => { setEditItem(c); reset(c); setShowForm(true) }
  const openNew = () => { setEditItem(null); reset({}); setShowForm(true) }
  const onSubmit = (d: any) => save.mutate(d, { onSuccess: () => setShowForm(false) })

  return (
    <div className="space-y-6">
      <PageHeader title="Companies" subtitle={`${data?.totalCount ?? 0} total`}
        actions={canWrite() && <Button onClick={openNew}><Plus size={16} />Add Company</Button>} />

      <Card>
        <CardHeader title="All Companies" actions={
          <SearchBox value={search} onChange={v => { setSearch(v); setPage(1) }} placeholder="Search companies..." />
        } />
        {isLoading ? <Loader /> : isError ? <ErrorMsg msg="Failed to load companies" /> : (
          <>
            <Table>
              <thead><tr>
                <SortableTh field="name" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort}>Name</SortableTh>
                <SortableTh field="gstin" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort}>GSTIN</SortableTh>
                <Th>Contact</Th><Th>Phone</Th>
                <SortableTh field="createdAt" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort}>Added</SortableTh>
                {canWrite() && <Th>Actions</Th>}
              </tr></thead>
              <tbody>
                {data?.items.length === 0 && <tr><Td colSpan={6} className="text-center text-slate-400 py-8">No companies found</Td></tr>}
                {data?.items.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <Td><p className="font-medium">{c.name}</p><p className="text-xs text-slate-400">{c.address}</p></Td>
                    <Td><span className="font-mono text-xs">{c.gstin || '—'}</span></Td>
                    <Td>{c.contactPerson1 || '—'}</Td>
                    <Td>{c.contactNumber1 || '—'}</Td>
                    <Td>{fmt.date(c.createdAt)}</Td>
                    {canWrite() && <Td>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(c)}><Pencil size={14} /></Button>
                        {isAdmin() && <Button variant="ghost" size="sm" onClick={() => setDeleteId(c.id)}><Trash2 size={14} className="text-red-400" /></Button>}
                      </div>
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
        <Modal title={editItem ? 'Edit Company' : 'Add Company'} onClose={() => setShowForm(false)}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input label="Company Name *" error={errors.name?.message as string} {...register('name', { required: 'Required' })} />
            <Input label="Address" {...register('address')} />
            <Input label="GSTIN" placeholder="23AAOPJ2936N1ZC" {...register('gstin')} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Contact Person 1" {...register('contactPerson1')} />
              <Input label="Phone 1" {...register('contactNumber1')} />
              <Input label="Contact Person 2" {...register('contactPerson2')} />
              <Input label="Phone 2" {...register('contactNumber2')} />
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="submit" loading={save.isPending}>Save</Button>
              <Button variant="secondary" type="button" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </form>
        </Modal>
      )}

      {deleteId && <ConfirmDialog msg="Delete this company?" onConfirm={() => del.mutate(deleteId, { onSuccess: () => setDeleteId(null) })} onCancel={() => setDeleteId(null)} loading={del.isPending} />}
    </div>
  )
}

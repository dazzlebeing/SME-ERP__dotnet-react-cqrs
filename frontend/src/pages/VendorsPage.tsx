import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Pencil, Trash2, Plus } from 'lucide-react'
import { usePaginatedList, useDelete, useSave } from '../hooks/useCrud'
import { useAuth } from '../store/authStore'
import { Card, CardHeader, Table, SortableTh, Th, Td, Button, Input, Textarea, Modal, ConfirmDialog, Pagination, PageHeader, Loader, SearchBox } from '../components/ui'
import { fmt } from '../lib/formatters'

interface Vendor { id: number; name: string; address?: string; gstin?: string; description?: string; createdAt: string }

export default function VendorsPage() {
  const { canWrite, isAdmin } = useAuth()
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<Vendor | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)

  const { data, isLoading, setPage, search, setSearch, sortBy, sortDir, toggleSort } = usePaginatedList<Vendor>('vendors', '/vendors')
  const del = useDelete('vendors', id => `/vendors/${id}`)
  const save = useSave('vendors', '/vendors', editItem?.id)
  const { register, handleSubmit, reset, formState: { errors } } = useForm<any>()

  const openEdit = (v: Vendor) => { setEditItem(v); reset(v); setShowForm(true) }
  const openNew = () => { setEditItem(null); reset({}); setShowForm(true) }

  return (
    <div className="space-y-6">
      <PageHeader title="Vendors" subtitle={`${data?.totalCount ?? 0} vendors`}
        actions={canWrite() && <Button onClick={openNew}><Plus size={16} />Add Vendor</Button>} />
      <Card>
        <CardHeader title="All Vendors" actions={
          <SearchBox value={search} onChange={v => { setSearch(v); setPage(1) }} placeholder="Search vendors..." />
        } />
        {isLoading ? <Loader /> : (
          <>
            <Table>
              <thead><tr>
                <SortableTh field="name" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort}>Name</SortableTh>
                <SortableTh field="gstin" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort}>GSTIN</SortableTh>
                <Th>Address</Th>
                <SortableTh field="createdAt" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort}>Added</SortableTh>
                {canWrite() && <Th>Actions</Th>}
              </tr></thead>
              <tbody>
                {data?.items.length === 0 && <tr><Td colSpan={5} className="text-center text-slate-400 py-8">No vendors</Td></tr>}
                {data?.items.map(v => (
                  <tr key={v.id} className="hover:bg-slate-50">
                    <Td><p className="font-medium">{v.name}</p><p className="text-xs text-slate-400">{v.description}</p></Td>
                    <Td><span className="font-mono text-xs">{v.gstin || '—'}</span></Td>
                    <Td>{v.address || '—'}</Td>
                    <Td>{fmt.date(v.createdAt)}</Td>
                    {canWrite() && <Td><div className="flex gap-2">
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
        <Modal title={editItem ? 'Edit Vendor' : 'Add Vendor'} onClose={() => setShowForm(false)}>
          <form onSubmit={handleSubmit(d => save.mutate(d, { onSuccess: () => setShowForm(false) }))} className="space-y-4">
            <Input label="Vendor Name *" error={errors.name?.message as string} {...register('name', { required: 'Required' })} />
            <Input label="Address" {...register('address')} />
            <Input label="GSTIN" {...register('gstin')} />
            <Textarea label="Description" {...register('description')} />
            <div className="flex gap-3 pt-2">
              <Button type="submit" loading={save.isPending}>Save</Button>
              <Button variant="secondary" type="button" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </form>
        </Modal>
      )}
      {deleteId && <ConfirmDialog msg="Delete this vendor?" onConfirm={() => del.mutate(deleteId, { onSuccess: () => setDeleteId(null) })} onCancel={() => setDeleteId(null)} loading={del.isPending} />}
    </div>
  )
}

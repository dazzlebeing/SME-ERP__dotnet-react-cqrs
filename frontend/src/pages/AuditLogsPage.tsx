import { useState } from 'react'
import { usePaginatedList } from '../hooks/useCrud'
import { Card, CardHeader, Table, Th, Td, Select, Pagination, PageHeader, Loader } from '../components/ui'
import { fmt } from '../lib/formatters'

interface AuditLog { id: number; tableName: string; recordId: number; action: string; oldValues?: string; newValues?: string; userId?: string; userEmail?: string; timestamp: string }

const ACTION_COLORS: Record<string, string> = {
  Created: 'bg-green-100 text-green-700',
  Updated: 'bg-blue-100 text-blue-700',
  Deleted: 'bg-red-100 text-red-700',
}

export default function AuditLogsPage() {
  const [entityFilter, setEntityFilter] = useState('')
  const [actionFilter, setActionFilter] = useState('')

  const filters = {
    ...(entityFilter && { entity: entityFilter }),
    ...(actionFilter && { action: actionFilter }),
  }
  const { data, isLoading, setPage } = usePaginatedList<AuditLog>('audit-logs', '/audit-logs', filters)

  const ENTITIES = ['Bills', 'Companies', 'Vendors', 'Employees', 'Gatepasses', 'Chalans', 'Payments', 'Expenses', 'Vouchers', 'SalaryRecords', 'Advances']

  return (
    <div className="space-y-6">
      <PageHeader title="Audit Log" subtitle={`${data?.totalCount ?? 0} records`}
        actions={<div className="flex gap-2 flex-wrap">
          <Select value={entityFilter} onChange={e => setEntityFilter(e.target.value)}>
            <option value="">All Entities</option>
            {ENTITIES.map(e => <option key={e} value={e}>{e}</option>)}
          </Select>
          <Select value={actionFilter} onChange={e => setActionFilter(e.target.value)}>
            <option value="">All Actions</option>
            <option value="Created">Created</option>
            <option value="Updated">Updated</option>
            <option value="Deleted">Deleted</option>
          </Select>
        </div>} />

      <Card>
        <CardHeader title="All Audit Entries" />
        {isLoading ? <Loader /> : (
          <>
            <Table>
              <thead><tr><Th>Timestamp</Th><Th>Entity</Th><Th>Record ID</Th><Th>Action</Th><Th>User</Th><Th>Details</Th></tr></thead>
              <tbody>
                {data?.items.length === 0 && <tr><Td colSpan={6} className="text-center text-slate-400 py-8">No audit logs</Td></tr>}
                {data?.items.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <Td><span className="text-xs font-mono">{fmt.date(log.timestamp)}</span></Td>
                    <Td><span className="font-medium text-slate-700">{log.tableName}</span></Td>
                    <Td><span className="font-mono text-xs text-slate-500">#{log.recordId}</span></Td>
                    <Td>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${ACTION_COLORS[log.action] || 'bg-slate-100 text-slate-700'}`}>
                        {log.action}
                      </span>
                    </Td>
                    <Td><span className="text-xs text-slate-500">{log.userEmail || log.userId || 'System'}</span></Td>
                    <Td>
                      <div className="text-xs text-slate-500 max-w-[300px]">
                        {log.newValues && (
                          <details>
                            <summary className="cursor-pointer text-blue-600 hover:text-blue-800">View changes</summary>
                            <div className="mt-1 space-y-1">
                              {log.oldValues && <div><span className="text-red-500">Before: </span><code className="bg-red-50 px-1 rounded">{log.oldValues.substring(0, 100)}{log.oldValues.length > 100 ? '...' : ''}</code></div>}
                              <div><span className="text-green-600">After: </span><code className="bg-green-50 px-1 rounded">{log.newValues.substring(0, 100)}{log.newValues.length > 100 ? '...' : ''}</code></div>
                            </div>
                          </details>
                        )}
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <Pagination page={data?.page ?? 1} totalPages={data?.totalPages ?? 1} onPage={setPage} />
          </>
        )}
      </Card>
    </div>
  )
}

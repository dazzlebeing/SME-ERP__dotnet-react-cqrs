import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FileDown, BarChart2, ShoppingCart, TrendingUp } from 'lucide-react'
import { Card, CardHeader, Table, Th, Td, Button, Select, PageHeader, Loader } from '../components/ui'
import { fmt } from '../lib/formatters'
import api from '../lib/api'
import { toast } from 'sonner'

const MONTHS = fmt.MONTHS
type TabId = 'gstr1' | 'gstr2' | 'gstr3b' | 'sales' | 'purchase'

export default function ReportsPage() {
  const [tab, setTab] = useState<TabId>('gstr1')
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())

  const currentYear = now.getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i)

  const { data: gstr1Data, isLoading: gstr1Loading } = useQuery({
    queryKey: ['gstr1', month, year],
    queryFn: () => api.get(`/reports/gst/gstr1?month=${month}&year=${year}`).then(r => r.data),
    enabled: tab === 'gstr1',
  })
  const { data: gstr2Data, isLoading: gstr2Loading } = useQuery({
    queryKey: ['gstr2', month, year],
    queryFn: () => api.get(`/reports/gst/gstr2?month=${month}&year=${year}`).then(r => r.data),
    enabled: tab === 'gstr2',
  })
  const { data: gstr3b, isLoading: gstr3bLoading } = useQuery({
    queryKey: ['gstr3b', month, year],
    queryFn: () => api.get(`/reports/gst/3b?month=${month}&year=${year}`).then(r => r.data),
    enabled: tab === 'gstr3b',
  })
  const { data: salesData, isLoading: salesLoading } = useQuery({
    queryKey: ['sales-report', month, year],
    queryFn: () => api.get(`/reports/sales?month=${month}&year=${year}`).then(r => r.data),
    enabled: tab === 'sales',
  })
  const { data: purchaseData, isLoading: purchaseLoading } = useQuery({
    queryKey: ['purchase-report', month, year],
    queryFn: () => api.get(`/reports/purchase?month=${month}&year=${year}`).then(r => r.data),
    enabled: tab === 'purchase',
  })

  const downloadExcel = (endpoint: string, filename: string) => {
    api.get(`/export/${endpoint}?month=${month}&year=${year}`, { responseType: 'blob' })
      .then(r => {
        const url = URL.createObjectURL(r.data)
        const a = document.createElement('a'); a.href = url; a.download = filename; a.click()
      })
      .catch(() => toast.error('Export failed'))
  }

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'gstr1', label: 'GSTR-1 (Outward)', icon: <TrendingUp size={14} /> },
    { id: 'gstr2', label: 'GSTR-2 (Inward)', icon: <ShoppingCart size={14} /> },
    { id: 'gstr3b', label: 'GSTR-3B Summary', icon: <BarChart2 size={14} /> },
    { id: 'sales', label: 'Sales Report', icon: <TrendingUp size={14} /> },
    { id: 'purchase', label: 'Purchase Report', icon: <ShoppingCart size={14} /> },
  ]

  return (
    <div className="space-y-6">
      <PageHeader title="GST & Reports" subtitle="Monthly tax and business reports"
        actions={
          <div className="flex gap-2">
            <Select value={month} onChange={e => setMonth(Number(e.target.value))}>
              {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
            </Select>
            <Select value={year} onChange={e => setYear(Number(e.target.value))}>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </Select>
          </div>
        } />

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors
              ${tab === t.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* GSTR-1 */}
      {tab === 'gstr1' && (
        <Card>
          <CardHeader title={`GSTR-1 — ${MONTHS[month - 1]} ${year}`}
            actions={
              <Button variant="secondary" size="sm" onClick={() => downloadExcel('reports/gstr1/excel', `GSTR1-${MONTHS[month - 1]}-${year}.xlsx`)}>
                <FileDown size={14} />Excel
              </Button>
            } />
          {gstr1Loading ? <Loader /> : (
            <Table>
              <thead><tr><Th>Company (Recipient)</Th><Th>GSTIN</Th><Th>Bill No</Th><Th>Bill Date</Th><Th>Taxable Value</Th><Th>CGST</Th><Th>SGST</Th><Th>IGST</Th><Th>Total</Th></tr></thead>
              <tbody>
                {(!gstr1Data || gstr1Data.length === 0) && <tr><Td colSpan={9} className="text-center text-slate-400 py-8">No data for {MONTHS[month - 1]} {year}</Td></tr>}
                {gstr1Data?.map((r: any) => (
                  <tr key={r.billNumber} className="hover:bg-slate-50">
                    <Td>{r.companyName}</Td>
                    <Td><span className="font-mono text-xs">{r.gstin || '—'}</span></Td>
                    <Td><span className="font-mono text-sm font-medium text-blue-600">{r.billNumber}</span></Td>
                    <Td>{fmt.date(r.billDate)}</Td>
                    <Td>{fmt.currency(r.taxableValue)}</Td>
                    <Td>{fmt.currency(r.cgst)}</Td>
                    <Td>{fmt.currency(r.sgst)}</Td>
                    <Td>{fmt.currency(r.igst)}</Td>
                    <Td className="font-semibold">{fmt.currency(r.billTotal)}</Td>
                  </tr>
                ))}
                {gstr1Data && gstr1Data.length > 0 && (
                  <tr className="bg-slate-50 font-bold">
                    <Td colSpan={4}>Total</Td>
                    <Td>{fmt.currency(gstr1Data.reduce((s: number, r: any) => s + r.taxableValue, 0))}</Td>
                    <Td>{fmt.currency(gstr1Data.reduce((s: number, r: any) => s + r.cgst, 0))}</Td>
                    <Td>{fmt.currency(gstr1Data.reduce((s: number, r: any) => s + r.sgst, 0))}</Td>
                    <Td>{fmt.currency(gstr1Data.reduce((s: number, r: any) => s + r.igst, 0))}</Td>
                    <Td>{fmt.currency(gstr1Data.reduce((s: number, r: any) => s + r.billTotal, 0))}</Td>
                  </tr>
                )}
              </tbody>
            </Table>
          )}
        </Card>
      )}

      {/* GSTR-2 */}
      {tab === 'gstr2' && (
        <Card>
          <CardHeader title={`GSTR-2 — ${MONTHS[month - 1]} ${year}`}
            actions={
              <Button variant="secondary" size="sm" onClick={() => downloadExcel('reports/gstr2/excel', `GSTR2-${MONTHS[month - 1]}-${year}.xlsx`)}>
                <FileDown size={14} />Excel
              </Button>
            } />
          {gstr2Loading ? <Loader /> : (
            <Table>
              <thead><tr><Th>Vendor</Th><Th>GSTIN</Th><Th>Invoice No</Th><Th>Date</Th><Th>Taxable Value</Th><Th>CGST</Th><Th>SGST</Th><Th>IGST</Th><Th>Total</Th></tr></thead>
              <tbody>
                {(!gstr2Data || gstr2Data.length === 0) && <tr><Td colSpan={9} className="text-center text-slate-400 py-8">No data for {MONTHS[month - 1]} {year}</Td></tr>}
                {gstr2Data?.map((r: any, i: number) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <Td>{r.vendorName}</Td>
                    <Td><span className="font-mono text-xs">{r.gstin || '—'}</span></Td>
                    <Td><span className="font-mono text-sm">{r.invoiceNumber || '—'}</span></Td>
                    <Td>{fmt.date(r.date)}</Td>
                    <Td>{fmt.currency(r.taxableValue)}</Td>
                    <Td>{fmt.currency(r.cgst)}</Td>
                    <Td>{fmt.currency(r.sgst)}</Td>
                    <Td>{fmt.currency(r.igst)}</Td>
                    <Td className="font-semibold">{fmt.currency(r.total)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      )}

      {/* GSTR-3B */}
      {tab === 'gstr3b' && (
        <Card>
          <CardHeader title={`GSTR-3B Summary — ${MONTHS[month - 1]} ${year}`} />
          {gstr3bLoading ? <Loader /> : gstr3b && (
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">3.1 — Outward Supplies (Sales)</h3>
                  <div className="bg-blue-50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between text-sm"><span>Total Taxable Value</span><strong>{fmt.currency(gstr3b.totalTaxableValue)}</strong></div>
                    <div className="flex justify-between text-sm"><span>Total CGST</span><strong>{fmt.currency(gstr3b.totalCgst)}</strong></div>
                    <div className="flex justify-between text-sm"><span>Total SGST</span><strong>{fmt.currency(gstr3b.totalSgst)}</strong></div>
                    <div className="flex justify-between text-sm"><span>Total IGST</span><strong>{fmt.currency(gstr3b.totalIgst)}</strong></div>
                    <div className="flex justify-between text-sm font-bold border-t pt-2"><span>Total Tax Liability</span><span>{fmt.currency(gstr3b.totalTaxLiability)}</span></div>
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">4 — Input Tax Credit (Purchases)</h3>
                  <div className="bg-green-50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between text-sm"><span>Input CGST</span><strong>{fmt.currency(gstr3b.inputCgst)}</strong></div>
                    <div className="flex justify-between text-sm"><span>Input SGST</span><strong>{fmt.currency(gstr3b.inputSgst)}</strong></div>
                    <div className="flex justify-between text-sm"><span>Input IGST</span><strong>{fmt.currency(gstr3b.inputIgst)}</strong></div>
                    <div className="flex justify-between text-sm font-bold border-t pt-2"><span>Total ITC</span><span>{fmt.currency(gstr3b.totalItc)}</span></div>
                  </div>
                </div>
              </div>
              <div className={`rounded-lg p-4 ${gstr3b.netTaxPayable > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                <div className="flex justify-between text-lg font-bold">
                  <span>Net Tax Payable (after ITC)</span>
                  <span className={gstr3b.netTaxPayable > 0 ? 'text-red-700' : 'text-green-700'}>{fmt.currency(gstr3b.netTaxPayable)}</span>
                </div>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Sales Report */}
      {tab === 'sales' && (
        <Card>
          <CardHeader title={`Sales Report — ${MONTHS[month - 1]} ${year}`}
            actions={
              <Button variant="secondary" size="sm" onClick={() => downloadExcel('reports/sales/excel', `Sales-${MONTHS[month - 1]}-${year}.xlsx`)}>
                <FileDown size={14} />Excel
              </Button>
            } />
          {salesLoading ? <Loader /> : salesData && (
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-4 gap-4">
                {[
                  { label: 'Total Bills', value: salesData.totalBills, isCurrency: false },
                  { label: 'Gross Sales', value: salesData.grossSales, isCurrency: true },
                  { label: 'Tax Collected', value: salesData.totalTax, isCurrency: true },
                  { label: 'Net Sales', value: salesData.netSales, isCurrency: true },
                ].map(s => (
                  <div key={s.label} className="bg-slate-50 rounded-lg p-4 text-center">
                    <p className="text-xs text-slate-500 mb-1">{s.label}</p>
                    <p className="text-xl font-bold text-slate-800">{s.isCurrency ? fmt.currency(s.value) : s.value}</p>
                  </div>
                ))}
              </div>
              <Table>
                <thead><tr><Th>Company</Th><Th>Bills</Th><Th>Sales</Th><Th>CGST</Th><Th>SGST</Th><Th>IGST</Th><Th>Total</Th></tr></thead>
                <tbody>
                  {salesData.items?.map((r: any) => (
                    <tr key={r.companyId} className="hover:bg-slate-50">
                      <Td>{r.companyName}</Td>
                      <Td>{r.billCount}</Td>
                      <Td>{fmt.currency(r.billAmount)}</Td>
                      <Td>{fmt.currency(r.cgst)}</Td>
                      <Td>{fmt.currency(r.sgst)}</Td>
                      <Td>{fmt.currency(r.igst)}</Td>
                      <Td className="font-semibold">{fmt.currency(r.billTotal)}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Card>
      )}

      {/* Purchase Report */}
      {tab === 'purchase' && (
        <Card>
          <CardHeader title={`Purchase Report — ${MONTHS[month - 1]} ${year}`}
            actions={
              <Button variant="secondary" size="sm" onClick={() => downloadExcel('reports/purchase/excel', `Purchase-${MONTHS[month - 1]}-${year}.xlsx`)}>
                <FileDown size={14} />Excel
              </Button>
            } />
          {purchaseLoading ? <Loader /> : purchaseData && (
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-4 gap-4">
                {[
                  { label: 'Total Invoices', value: purchaseData.totalExpenses, isCurrency: false },
                  { label: 'Gross Purchase', value: purchaseData.grossPurchase, isCurrency: true },
                  { label: 'Tax Paid (ITC)', value: purchaseData.totalTax, isCurrency: true },
                  { label: 'Total Outflow', value: purchaseData.totalAmount, isCurrency: true },
                ].map(s => (
                  <div key={s.label} className="bg-slate-50 rounded-lg p-4 text-center">
                    <p className="text-xs text-slate-500 mb-1">{s.label}</p>
                    <p className="text-xl font-bold text-slate-800">{s.isCurrency ? fmt.currency(s.value) : s.value}</p>
                  </div>
                ))}
              </div>
              <Table>
                <thead><tr><Th>Vendor</Th><Th>Invoices</Th><Th>Base Amount</Th><Th>CGST</Th><Th>SGST</Th><Th>IGST</Th><Th>Total</Th></tr></thead>
                <tbody>
                  {purchaseData.items?.map((r: any) => (
                    <tr key={r.vendorId} className="hover:bg-slate-50">
                      <Td>{r.vendorName}</Td>
                      <Td>{r.invoiceCount}</Td>
                      <Td>{fmt.currency(r.amount)}</Td>
                      <Td>{fmt.currency(r.cgst)}</Td>
                      <Td>{fmt.currency(r.sgst)}</Td>
                      <Td>{fmt.currency(r.igst)}</Td>
                      <Td className="font-semibold">{fmt.currency(r.total)}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}

export const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
]

export const fmt = {
  currency: (n: number) => `₹${(n ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
  date: (d: string | Date) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
  dateInput: (d: string | Date) => new Date(d).toISOString().split('T')[0],
  MONTHS,
}

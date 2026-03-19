interface TableProps {
  children: React.ReactNode
  className?: string
}

export function Table({ children, className = '' }: TableProps) {
  return (
    <div className="overflow-x-auto">
      <table className={`min-w-full divide-y divide-slate-200/70 ${className}`}>
        {children}
      </table>
    </div>
  )
}

export function TableHead({ children }: { children: React.ReactNode }) {
  return <thead className="bg-primary-50/50">{children}</thead>
}

export function TableBody({ children }: { children: React.ReactNode }) {
  return <tbody className="divide-y divide-slate-200/70 bg-white/70 backdrop-blur">{children}</tbody>
}

export function TableRow({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return <tr className={`hover:bg-primary-50/60 transition-colors ${className}`}>{children}</tr>
}

export function TableTh({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <th
      scope="col"
      className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-primary-800 ${className}`}
    >
      {children}
    </th>
  )
}

export function TableTd({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return <td className={`px-4 py-3 text-sm text-slate-900 ${className}`}>{children}</td>
}

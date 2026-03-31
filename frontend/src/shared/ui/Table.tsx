interface TableProps {
  children: React.ReactNode
  className?: string
  /** Sin marco extra (p. ej. tabla anidada o dentro de otro panel con borde). */
  plain?: boolean
}

export function Table({ children, className = '', plain = false }: TableProps) {
  return (
    <div
      className={
        plain
          ? 'overflow-x-auto'
          : 'overflow-hidden rounded-xl border border-emerald-100/55 bg-white shadow-sm ring-1 ring-emerald-100/25'
      }
    >
      <div className="overflow-x-auto">
        <table className={`min-w-full border-collapse text-sm ${className}`}>{children}</table>
      </div>
    </div>
  )
}

export function TableHead({ children }: { children: React.ReactNode }) {
  return <thead className="bg-gradient-table-head shadow-sm">{children}</thead>
}

export function TableBody({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return <tbody className={`divide-y divide-emerald-100/45 bg-white ${className}`}>{children}</tbody>
}

export function TableRow({
  children,
  className = '',
  /** Fila de cabecera (`<thead>`): sin rayas ni hover de cuerpo. */
  header = false,
}: {
  children: React.ReactNode
  className?: string
  header?: boolean
}) {
  if (header) {
    return (
      <tr
        className={`border-b border-emerald-200/55 bg-gradient-to-r from-emerald-50/60 via-white to-teal-50/35 ${className}`}
      >
        {children}
      </tr>
    )
  }
  return (
    <tr
      className={`group/row transition-colors duration-150 hover:bg-emerald-50/65 even:bg-slate-50/50 ${className}`}
    >
      {children}
    </tr>
  )
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
      className={`px-4 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-emerald-900/90 ${className}`}
    >
      {children}
    </th>
  )
}

export function TableTd({
  children,
  className = '',
  colSpan,
  title,
}: {
  children: React.ReactNode
  className?: string
  colSpan?: number
  title?: string
}) {
  return (
    <td colSpan={colSpan} title={title} className={`px-4 py-3.5 align-middle text-sm text-slate-800 ${className}`}>
      {children}
    </td>
  )
}

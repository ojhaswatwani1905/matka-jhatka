import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

interface Column<T> {
  key: string;
  label: string;
  render?: (item: T) => React.ReactNode;
  className?: string;
}

interface HistoryTableProps<T> {
  columns: Column<T>[];
  data: T[];
  emptyMessage?: string;
  isLoading?: boolean;
}

export default function HistoryTable<T extends { id?: string }>({
  columns,
  data,
  emptyMessage = 'No records found',
  isLoading,
}: HistoryTableProps<T>) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="skeleton h-14 rounded-[var(--radius-md)]" />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-surface-light flex items-center justify-center mb-4">
          <span className="text-2xl">📭</span>
        </div>
        <p className="text-navy-500 text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto scrollbar-hide">
      {/* Desktop table */}
      <table className="w-full hidden sm:table">
        <thead>
          <tr className="border-b border-border">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  'text-left text-xs font-semibold text-navy-500 uppercase tracking-wider py-3 px-4',
                  col.className
                )}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item, i) => (
            <motion.tr
              key={(item as Record<string, unknown>).id as string || i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="border-b border-border/50 hover:bg-white/[0.02] transition-colors"
            >
              {columns.map((col) => (
                <td key={col.key} className={cn('py-3.5 px-4 text-sm', col.className)}>
                  {col.render
                    ? col.render(item)
                    : String((item as Record<string, unknown>)[col.key] ?? '')}
                </td>
              ))}
            </motion.tr>
          ))}
        </tbody>
      </table>

      {/* Mobile cards */}
      <div className="sm:hidden space-y-2">
        {data.map((item, i) => (
          <motion.div
            key={(item as Record<string, unknown>).id as string || i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-surface border border-border rounded-[var(--radius-md)] p-3.5 space-y-2"
          >
            {columns.map((col) => (
              <div key={col.key} className="flex items-center justify-between">
                <span className="text-xs text-navy-500">{col.label}</span>
                <span className="text-sm text-white font-medium">
                  {col.render
                    ? col.render(item)
                    : String((item as Record<string, unknown>)[col.key] ?? '')}
                </span>
              </div>
            ))}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// Status badge helper
export function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    win:       'bg-[rgba(46,204,113,0.12)] text-[#2ECC71] border-[rgba(46,204,113,0.3)]',
    loss:      'bg-[rgba(255,77,109,0.12)] text-[#FF4D6D] border-[rgba(255,77,109,0.3)]',
    pending:   'bg-[rgba(212,175,55,0.12)] text-[#D4AF37] border-[rgba(212,175,55,0.3)]',
    completed: 'bg-[rgba(46,204,113,0.12)] text-[#2ECC71] border-[rgba(46,204,113,0.3)]',
    failed:    'bg-[rgba(255,77,109,0.12)] text-[#FF4D6D] border-[rgba(255,77,109,0.3)]',
    cancelled: 'bg-[rgba(212,175,55,0.08)] text-[rgba(212,175,55,0.5)] border-[rgba(212,175,55,0.2)]',
  };

  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize',
      styles[status.toLowerCase()] || styles.pending
    )}>
      {status}
    </span>
  );
}

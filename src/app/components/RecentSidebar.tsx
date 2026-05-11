import { Clock, Star, Trash2 } from 'lucide-react';
import type { SummaryRecord } from '../types/summary';

interface RecentSidebarProps {
  records: SummaryRecord[];
  onLoad: (record: SummaryRecord) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string) => void;
}

/** Compact sidebar showing recent summaries for quick access */
export function RecentSidebar({
  records,
  onLoad,
  onDelete,
  onToggleFavorite,
}: RecentSidebarProps) {
  const recentRecords = records.slice(0, 5);

  if (records.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center px-4 py-8">
        <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
          <Clock className="w-6 h-6 text-slate-300 dark:text-slate-600" />
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">
          No summaries yet
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500">
          Generate your first summary to see it here
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200 dark:border-slate-800">
        <Clock className="w-4 h-4 text-slate-400" />
        <h3 className="text-sm text-slate-700 dark:text-slate-300">
          Recent Summaries
        </h3>
        <span className="ml-auto text-xs text-slate-400 dark:text-slate-500">
          {records.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {recentRecords.map(record => {
            const date = new Date(record.createdAt);
            const timeAgo = getTimeAgo(date);

            return (
              <div
                key={record.id}
                className="group p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors duration-200 cursor-pointer"
                onClick={() => onLoad(record)}
              >
                <div className="flex items-start gap-2">
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      onToggleFavorite(record.id);
                    }}
                    className="mt-0.5 shrink-0"
                  >
                    <Star
                      className={`w-3.5 h-3.5 transition-colors duration-200 ${
                        record.isFavorited
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-slate-300 dark:text-slate-600 group-hover:text-slate-400'
                      }`}
                    />
                  </button>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-900 dark:text-slate-100 line-clamp-2 mb-1">
                      {record.title}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
                      <span>{timeAgo}</span>
                      <span>·</span>
                      <span>{record.stats.compressionRatio}% compressed</span>
                    </div>
                  </div>

                  <button
                    onClick={e => {
                      e.stopPropagation();
                      onDelete(record.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-all duration-200 shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {records.length > 5 && (
        <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800">
          <p className="text-xs text-center text-slate-400 dark:text-slate-500">
            +{records.length - 5} more in History
          </p>
        </div>
      )}
    </div>
  );
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

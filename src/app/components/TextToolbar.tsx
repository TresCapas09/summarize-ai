import { useEffect, useRef } from 'react';
import { Sparkles, Zap, List, BookOpen, Loader2 } from 'lucide-react';
import type { SnippetAction } from '../types/summary';

interface TextToolbarProps {
  /** Pixel position from the viewport top where the toolbar should anchor */
  anchorTop: number;
  /** Pixel position from the viewport left where the toolbar should anchor */
  anchorLeft: number;
  /** The action currently loading (null if idle) */
  loadingAction: SnippetAction | null;
  /** Callback when user clicks an action button */
  onAction: (action: SnippetAction) => void;
  /** Callback when the toolbar should dismiss */
  onDismiss: () => void;
}

const ACTIONS: { id: SnippetAction; label: string; icon: typeof Sparkles; color: string }[] = [
  {
    id: 'summarize',
    label: 'Condense',
    icon: Sparkles,
    color: 'hover:bg-indigo-500/20 hover:text-indigo-300',
  },
  {
    id: 'simplify',
    label: 'Simplify',
    icon: Zap,
    color: 'hover:bg-amber-500/20 hover:text-amber-300',
  },
  {
    id: 'keypoints',
    label: 'Key Points',
    icon: List,
    color: 'hover:bg-emerald-500/20 hover:text-emerald-300',
  },
  {
    id: 'expand',
    label: 'Expand',
    icon: BookOpen,
    color: 'hover:bg-violet-500/20 hover:text-violet-300',
  },
];

/**
 * Floating AI mini-toolbar that appears above highlighted text in the summary panel.
 * Inspired by Microsoft Word's mini formatting toolbar.
 */
export function TextToolbar({
  anchorTop,
  anchorLeft,
  loadingAction,
  onAction,
  onDismiss,
}: TextToolbarProps) {
  const toolbarRef = useRef<HTMLDivElement>(null);

  // Dismiss when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        onDismiss();
      }
    }
    // Small delay so the mouseup event that triggered the show doesn't immediately dismiss
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClick);
    }, 100);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClick);
    };
  }, [onDismiss]);

  const isLoading = loadingAction !== null;

  return (
    <div
      ref={toolbarRef}
      style={{
        position: 'fixed',
        top: anchorTop - 56,
        left: anchorLeft,
        transform: 'translateX(-50%)',
        zIndex: 9999,
      }}
      className="animate-in fade-in zoom-in-95 duration-150 slide-in-from-bottom-2"
    >
      {/* Arrow tip */}
      <div className="flex justify-center mb-0.5">
        <div className="w-2.5 h-2.5 rotate-45 bg-slate-800/95 border-r border-b border-slate-600/50 translate-y-1.5" />
      </div>

      {/* Main pill */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 rounded-2xl bg-slate-800/95 backdrop-blur-md border border-slate-600/50 shadow-2xl shadow-black/40">
        {ACTIONS.map((action, i) => {
          const Icon = action.icon;
          const isThisLoading = loadingAction === action.id;
          return (
            <div key={action.id} className="flex items-center">
              <button
                onClick={() => !isLoading && onAction(action.id)}
                disabled={isLoading}
                title={action.label}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all duration-150
                  ${isLoading
                    ? 'cursor-not-allowed opacity-50 text-slate-500'
                    : `text-slate-300 cursor-pointer ${action.color}`
                  }`}
              >
                {isThisLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                ) : (
                  <Icon className="w-3.5 h-3.5" />
                )}
                <span className="hidden sm:inline">{isThisLoading ? '…' : action.label}</span>
              </button>
              {/* Divider between buttons, not after last */}
              {i < ACTIONS.length - 1 && (
                <div className="w-px h-4 bg-slate-600/50 mx-0.5" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

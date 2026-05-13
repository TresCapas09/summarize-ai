import { useState, useEffect, useRef } from 'react';
import { MessageSquarePlus, Send, X } from 'lucide-react';

interface CommentToolbarProps {
  /** Callback with the comment text when the user submits */
  onSubmit: (comment: string) => void;
  /** Callback when the toolbar should dismiss */
  onDismiss: () => void;
}

/**
 * Floating comment input toolbar.
 * Premium glassmorphism design inspired by Microsoft Word's mini toolbar.
 */
export function CommentToolbar({
  onSubmit,
  onDismiss,
}: CommentToolbarProps) {
  const [comment, setComment] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus the input on mount
  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 80);
    return () => clearTimeout(timer);
  }, []);

  function handleSubmit() {
    const trimmed = comment.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setComment('');
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape') {
      onDismiss();
    }
  }

  return (
    <div className="flex items-center gap-1.5 px-2.5 py-2 rounded-2xl bg-slate-800/95 backdrop-blur-md border border-slate-600/50 shadow-2xl shadow-black/40 min-w-[260px]">
      <div className="p-1.5 rounded-lg bg-indigo-500/20">
        <MessageSquarePlus className="w-3.5 h-3.5 text-indigo-400" />
      </div>

      <input
        ref={inputRef}
        type="text"
        value={comment}
        onChange={e => setComment(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Add a comment…"
        className="flex-1 bg-transparent text-sm text-slate-100 placeholder-slate-500 outline-none min-w-0 px-1"
      />

      <div className="flex items-center gap-1">
        <button
          onClick={handleSubmit}
          disabled={!comment.trim()}
          className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed text-white transition-all duration-150"
          title="Save comment"
        >
          <Send className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onDismiss}
          className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-all duration-150"
          title="Cancel"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

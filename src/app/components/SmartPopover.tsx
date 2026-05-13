import { useState, useLayoutEffect, useRef, ReactNode } from 'react';

interface SmartPopoverProps {
  /** The bounding rect of the element to anchor to */
  anchorRect: DOMRect | null;
  /** Content to render inside the popover */
  children: ReactNode;
  /** Margin from the anchor element */
  margin?: number;
  /** Optional callback when dismissed */
  onDismiss?: () => void;
  /** Whether the popover is active */
  isOpen: boolean;
}

type Side = 'right' | 'left' | 'top' | 'bottom';

/**
 * Smart positioning popover that avoids viewport collisions.
 * Priorities: Right -> Left -> Top -> Bottom.
 */
export function SmartPopover({
  anchorRect,
  children,
  margin = 12,
  isOpen,
}: SmartPopoverProps) {
  const [coords, setCoords] = useState<{ top: number; left: number; side: Side } | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!isOpen || !anchorRect || !popoverRef.current) {
      setCoords(null);
      return;
    }

    const popover = popoverRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let side: Side = 'right';
    let top = 0;
    let left = 0;

    // 1. Try RIGHT
    if (anchorRect.right + margin + popover.width < vw - 20) {
      side = 'right';
      left = anchorRect.right + margin;
      top = anchorRect.top + anchorRect.height / 2 - popover.height / 2;
    }
    // 2. Try LEFT
    else if (anchorRect.left - margin - popover.width > 20) {
      side = 'left';
      left = anchorRect.left - margin - popover.width;
      top = anchorRect.top + anchorRect.height / 2 - popover.height / 2;
    }
    // 3. Try TOP
    else if (anchorRect.top - margin - popover.height > 20) {
      side = 'top';
      left = anchorRect.left + anchorRect.width / 2 - popover.width / 2;
      top = anchorRect.top - margin - popover.height;
    }
    // 4. Try BOTTOM (Fallback)
    else {
      side = 'bottom';
      left = anchorRect.left + anchorRect.width / 2 - popover.width / 2;
      top = anchorRect.bottom + margin;
    }

    // Viewport clamping for top/bottom
    if (side === 'right' || side === 'left') {
      top = Math.max(10, Math.min(top, vh - popover.height - 10));
    } else {
      left = Math.max(10, Math.min(left, vw - popover.width - 10));
    }

    setCoords({ top, left, side });
  }, [isOpen, anchorRect, margin]);

  if (!isOpen || !anchorRect) return null;

  return (
    <div
      ref={popoverRef}
      style={{
        position: 'fixed',
        top: coords?.top ?? 0,
        left: coords?.left ?? 0,
        zIndex: 9999,
        opacity: coords ? 1 : 0,
        pointerEvents: coords ? 'auto' : 'none',
      }}
      className={`transition-opacity duration-200 ${coords ? 'animate-in fade-in zoom-in-95' : ''}`}
    >
      {/* Arrow pointer */}
      {coords && (
        <div
          className={`absolute w-3 h-3 rotate-45 bg-slate-800/95 border-slate-600/50 
            ${coords.side === 'right' ? 'left-0 -translate-x-1.5 top-1/2 -translate-y-1/2 border-l border-b' : ''}
            ${coords.side === 'left' ? 'right-0 translate-x-1.5 top-1/2 -translate-y-1/2 border-r border-t' : ''}
            ${coords.side === 'top' ? 'bottom-0 translate-y-1.5 left-1/2 -translate-x-1/2 border-r border-b' : ''}
            ${coords.side === 'bottom' ? 'top-0 -translate-y-1.5 left-1/2 -translate-x-1/2 border-l border-t' : ''}
          `}
        />
      )}

      {/* Popover content */}
      <div className="relative">
        {children}
      </div>
    </div>
  );
}

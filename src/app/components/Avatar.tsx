import { useState } from 'react';
import type { AvatarId } from '../types/profile';

interface AvatarProps {
  avatarId: AvatarId;
  avatarUrl?: string; // Custom uploaded image — overrides gradient
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const AVATAR_GRADIENTS: Record<AvatarId, string> = {
  'gradient-blue': 'bg-gradient-to-br from-blue-400 to-blue-600',
  'gradient-purple': 'bg-gradient-to-br from-purple-400 to-purple-600',
  'gradient-pink': 'bg-gradient-to-br from-pink-400 to-pink-600',
  'gradient-orange': 'bg-gradient-to-br from-orange-400 to-orange-600',
  'gradient-green': 'bg-gradient-to-br from-green-400 to-green-600',
  'gradient-teal': 'bg-gradient-to-br from-teal-400 to-teal-600',
};

const AVATAR_ICONS: Record<AvatarId, string> = {
  'gradient-blue': '⚡',
  'gradient-purple': '✨',
  'gradient-pink': '💫',
  'gradient-orange': '🔥',
  'gradient-green': '🌿',
  'gradient-teal': '💎',
};

const SIZE_CLASSES = {
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-14 h-14 text-xl',
  xl: 'w-20 h-20 text-3xl',
};

/** User avatar — shows uploaded image if available, otherwise gradient icon */
export function Avatar({
  avatarId,
  avatarUrl,
  size = 'md',
  className = '',
}: AvatarProps) {
  const sizeClass = SIZE_CLASSES[size];
  const [isImgLoading, setIsImgLoading] = useState(true);

  if (avatarUrl) {
    return (
      <div className={`relative inline-block ${className}`}>
        {/* Shimmer Skeleton */}
        {isImgLoading && (
          <div className={`${sizeClass} rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden relative shadow-lg`}>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
          </div>
        )}
        <img
          src={avatarUrl}
          alt="Profile"
          onLoad={() => setIsImgLoading(false)}
          className={`${sizeClass} rounded-full object-cover shadow-lg ring-2 ring-white/20 transition-all duration-300 ${isImgLoading ? 'absolute top-0 left-0 opacity-0 scale-95' : 'opacity-100 scale-100'}`}
        />
      </div>
    );
  }

  const gradient = AVATAR_GRADIENTS[avatarId];
  const icon = AVATAR_ICONS[avatarId];

  return (
    <div className={`relative inline-block ${className}`}>
      <div
        className={`${sizeClass} ${gradient} rounded-full flex items-center justify-center shadow-lg transition-transform duration-200 hover:scale-105 cursor-default select-none`}
      >
        <span className="filter drop-shadow-sm pointer-events-none">{icon}</span>
      </div>
    </div>
  );
}

/** Avatar picker — preset gradients + upload option handled in ProfileDropdown */
interface AvatarPickerProps {
  selected: AvatarId;
  onSelect: (avatarId: AvatarId) => void;
}

export function AvatarPicker({ selected, onSelect }: AvatarPickerProps) {
  const avatars: AvatarId[] = [
    'gradient-blue',
    'gradient-purple',
    'gradient-pink',
    'gradient-orange',
    'gradient-green',
    'gradient-teal',
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {avatars.map(avatarId => (
        <button
          key={avatarId}
          type="button"
          onClick={() => onSelect(avatarId)}
          className={`p-2 rounded-xl border-2 transition-all duration-200 hover:scale-105
            ${
              selected === avatarId
                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40'
                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
            }`}
        >
          <Avatar avatarId={avatarId} size="lg" />
        </button>
      ))}
    </div>
  );
}

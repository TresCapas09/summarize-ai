import { useState, useRef, useEffect } from 'react';
import {
  Mail,
  Calendar,
  LogOut,
  Edit2,
  Check,
  X,
  Trash2,
  TrendingUp,
  Clock,
  FileText,
  Camera,
  Loader2,
  Lock,
  Palette,
  Move,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Avatar, AvatarPicker } from './Avatar';
import type { AvatarId, UserStats, BannerType } from '../types/profile';
import { toast } from 'sonner';

interface ProfileDropdownProps {
  stats: UserStats;
  onClose: () => void;
  onLogout: () => void;
}

export function ProfileDropdown({ stats, onClose, onLogout }: ProfileDropdownProps) {
  const { user, updateProfile, uploadAvatar, uploadBanner, updatePassword, deleteAccount } = useAuth();

  // General States
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Profile Info States
  const [editName, setEditName] = useState(user?.displayName || '');
  const [selectedAvatar, setSelectedAvatar] = useState<AvatarId>(user?.avatar || 'gradient-blue');
  
  // Banner States
  const [bannerType, setBannerType] = useState<BannerType>(user?.bannerType || 'color');
  const [colorStart, setColorStart] = useState(user?.bannerColorStart || '#6366f1');
  const [colorEnd, setColorEnd] = useState(user?.bannerColorEnd || '#ec4899');
  const [bannerPosY, setBannerPosY] = useState(user?.bannerPosY || 50);
  
  // Repositioning Logic
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [startPos, setStartPos] = useState(50);
  
  // Upload States
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);

  // Security States
  const [showSecurity, setShowSecurity] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Delete States
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  if (!user) return null;

  const joinedDate = new Date(user.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  });

  // Handle Avatar File
  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  }

  // Handle Banner File
  function handleBannerChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setBannerFile(file);
      setBannerPreview(URL.createObjectURL(file));
      setBannerPosY(50); // Reset position for new image
    }
  }

  // Repositioning Events
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isEditing || !(bannerPreview || user?.bannerUrl)) return;
    setIsDragging(true);
    setStartY(e.clientY);
    setStartPos(bannerPosY);
  };

  const [isBannerLoading, setIsBannerLoading] = useState(false);
  
  // Track Banner Loading
  useEffect(() => {
    const url = bannerPreview || user?.bannerUrl;
    if (url && (bannerType === 'image' || bannerPreview)) {
      setIsBannerLoading(true);
      const img = new Image();
      img.src = url;
      img.onload = () => setIsBannerLoading(false);
      img.onerror = () => setIsBannerLoading(false);
    } else {
      setIsBannerLoading(false);
    }
  }, [bannerPreview, user?.bannerUrl, bannerType]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaY = e.clientY - startY;
      // 1px roughly equals 0.5% in a 200px container (approximate scaling)
      const newPos = Math.max(0, Math.min(100, startPos - deltaY * 0.5));
      setBannerPosY(newPos);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, startY, startPos]);

  async function handleSave() {
    if (!editName.trim()) return toast.error('Name cannot be empty');
    setIsSaving(true);
    try {
      if (avatarFile) await uploadAvatar(avatarFile);
      if (bannerFile) await uploadBanner(bannerFile);

      await updateProfile({
        displayName: editName,
        avatar: selectedAvatar,
        bannerType: bannerPreview || user?.bannerUrl ? 'image' : 'color',
        bannerColorStart: colorStart,
        bannerColorEnd: colorEnd,
        bannerPosY: bannerPosY,
      });

      toast.success('Profile updated!');
      setIsEditing(false);
      resetPreviews();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRemoveBanner() {
    try {
      setIsSaving(true);
      await updateProfile({ bannerUrl: null, bannerType: 'color', bannerPosY: 50 });
      setBannerPreview(null);
      setBannerFile(null);
      setBannerPosY(50);
      toast.success('Banner image removed');
    } catch (err) {
      toast.error('Failed to remove banner');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRemoveAvatar() {
    try {
      setIsSaving(true);
      await updateProfile({ avatarUrl: null });
      setAvatarPreview(null);
      setAvatarFile(null);
      toast.success('Profile photo removed');
    } catch (err) {
      toast.error('Failed to remove photo');
    } finally {
      setIsSaving(false);
    }
  }

  async function handlePasswordChange() {
    if (!currentPassword || !newPassword) return toast.error('Fill all fields');
    if (newPassword !== confirmPassword) return toast.error('Passwords do not match');
    if (newPassword.length < 6) return toast.error('Min 6 characters');

    setIsSaving(true);
    try {
      await updatePassword(currentPassword, newPassword);
      toast.success('Password updated!');
      setShowSecurity(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSaving(false);
    }
  }

  function resetPreviews() {
    setAvatarPreview(null);
    setBannerPreview(null);
    setAvatarFile(null);
    setBannerFile(null);
  }

  function handleCancel() {
    setEditName(user?.displayName || '');
    setSelectedAvatar(user?.avatar || 'gradient-blue');
    setBannerType(user?.bannerType || 'color');
    setColorStart(user?.bannerColorStart || '#6366f1');
    setColorEnd(user?.bannerColorEnd || '#ec4899');
    setBannerPosY(user?.bannerPosY || 50);
    resetPreviews();
    setIsEditing(false);
  }

  // Banner Style
  const bannerStyle = (bannerPreview || user?.bannerUrl)
    ? { 
        backgroundImage: `url(${bannerPreview || user?.bannerUrl})`, 
        backgroundSize: 'cover', 
        backgroundPosition: `center ${bannerPosY}%` 
      }
    : { background: `linear-gradient(to bottom right, ${colorStart}, ${colorEnd})` };

  return (
    <div className="w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
      
        {/* Dynamic Banner with Repositioning */}
        <div 
          style={bannerStyle}
          onMouseDown={handleMouseDown}
          className={`relative h-28 flex items-center justify-center group select-none transition-shadow ${isEditing && (bannerPreview || user?.bannerUrl) ? (isDragging ? 'cursor-grabbing ring-2 ring-indigo-500 z-10' : 'cursor-grab hover:ring-2 hover:ring-indigo-500/50') : 'cursor-default'}`}
        >
          {/* Skeleton Overlay */}
          {isBannerLoading && (
            <div className="absolute inset-0 bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
            </div>
          )}
          <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors pointer-events-none" />
          
          {isEditing && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              {(bannerPreview || user?.bannerUrl) ? (
                <div className="flex flex-col items-center bg-black/40 p-2 rounded-lg backdrop-blur-sm">
                  <Move className="w-5 h-5 mb-1 animate-pulse" />
                  <span className="text-[10px] uppercase font-bold tracking-wider">Drag to reposition</span>
                </div>
              ) : null}
            </div>
          )}

          {/* Banner Actions (Camera & Delete) */}
          {isEditing && (
            <div className="absolute top-2 right-2 flex gap-1.5 z-20">
              <button 
                onClick={(e) => { e.stopPropagation(); bannerInputRef.current?.click(); }}
                className="p-1.5 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors"
                title="Change banner image"
              >
                <Camera className="w-4 h-4" />
              </button>
              {(bannerPreview || user?.bannerUrl) && (
                <button 
                  onClick={(e) => { e.stopPropagation(); handleRemoveBanner(); }}
                  className="p-1.5 bg-red-500/80 hover:bg-red-600 text-white rounded-full transition-colors shadow-lg"
                  title="Remove banner image"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          <input ref={bannerInputRef} type="file" accept="image/*" className="hidden" onChange={handleBannerChange} />
        </div>

        {/* Profile Header */}
        <div className="relative px-6 -mt-10 mb-2">
          <div className="relative inline-block group">
            <div className="bg-white dark:bg-slate-900 rounded-full p-1 shadow-xl">
              <Avatar 
                avatarId={user?.avatar || 'gradient-blue'} 
                avatarUrl={avatarPreview || user?.avatarUrl} 
                size="xl" 
              />
            </div>
            {isEditing && (
              <div className="absolute inset-0 z-10">
                <button 
                  onClick={() => avatarInputRef.current?.click()}
                  className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity"
                >
                  <Camera className="w-6 h-6" />
                </button>
                {(avatarPreview || user?.avatarUrl) && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleRemoveAvatar(); }}
                    className="absolute -top-1 -right-1 p-1 bg-red-500 hover:bg-red-600 text-white rounded-full transition-all shadow-lg scale-0 group-hover:scale-100"
                    title="Remove profile photo"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
            <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>
        </div>

        <div className="px-6 pb-4">
          {isEditing ? (
            <div className="space-y-4">


              {/* Gradient Controls */}
              <div className="space-y-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2 mb-1">
                  <Palette className="w-3.5 h-3.5 text-indigo-500" />
                  <label className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-widest">
                    Gradient Background
                  </label>
                </div>
                
                <div className="flex gap-4">
                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 font-medium">Color 1</span>
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colorStart }} />
                    </div>
                    <input 
                      type="color" 
                      value={colorStart} 
                      onChange={e => setColorStart(e.target.value)} 
                      className="w-full h-10 p-0 rounded-lg bg-transparent border-none cursor-pointer overflow-hidden transition-all scale-100 hover:scale-[1.02]" 
                    />
                  </div>
                  
                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 font-medium">Color 2</span>
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colorEnd }} />
                    </div>
                    <input 
                      type="color" 
                      value={colorEnd} 
                      onChange={e => setColorEnd(e.target.value)} 
                      className="w-full h-10 p-0 rounded-lg bg-transparent border-none cursor-pointer overflow-hidden transition-all scale-100 hover:scale-[1.02]" 
                    />
                  </div>
                </div>
              </div>

              {/* Basic Info */}
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block tracking-widest ml-1">
                    Display Name
                  </label>
                  <input 
                    type="text" 
                    value={editName} 
                    onChange={e => setEditName(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 ring-indigo-500/20"
                    placeholder="Enter your name"
                  />
                </div>
                {!avatarPreview && !user.avatarUrl && (
                  <AvatarPicker selected={selectedAvatar} onSelect={setSelectedAvatar} />
                )}
              </div>

              <div className="flex gap-2">
                <button onClick={handleSave} disabled={isSaving} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2">
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4" /> Save</>}
                </button>
                <button onClick={handleCancel} className="flex-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 py-2 rounded-lg text-sm font-medium">Cancel</button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">{user?.displayName}</h3>
                  <p className="text-xs text-slate-500 font-medium">@{user?.email?.split('@')[0]}</p>
                </div>
                <button onClick={() => setIsEditing(true)} className="p-2 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-lg transition-colors">
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>

              {/* Stats Glass Card */}
              <div className="p-3 rounded-xl bg-slate-50/50 dark:bg-slate-800/50 backdrop-blur-sm border border-white/20 dark:border-slate-700/50">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600"><FileText className="w-4 h-4" /></div>
                    <div><p className="text-lg font-bold text-slate-900 dark:text-white leading-none">{stats.summariesGenerated}</p><p className="text-[10px] text-slate-500 uppercase font-medium">Summaries</p></div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600"><Clock className="w-4 h-4" /></div>
                    <div><p className="text-lg font-bold text-slate-900 dark:text-white leading-none">{(stats.totalTimeSaved/60).toFixed(1)}h</p><p className="text-[10px] text-slate-500 uppercase font-medium">Saved</p></div>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <button onClick={() => setShowSecurity(!showSecurity)} className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm transition-colors">
                  <div className="flex items-center gap-2"><Lock className="w-4 h-4" /> Security Settings</div>
                  <span className={`transition-transform ${showSecurity ? 'rotate-180' : ''}`}>▼</span>
                </button>

                {showSecurity && (
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 space-y-3 mt-1">
                    <input type="password" placeholder="Current Password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md outline-none" />
                    <input type="password" placeholder="New Password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md outline-none" />
                    <input type="password" placeholder="Confirm New Password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md outline-none" />
                    <button onClick={handlePasswordChange} disabled={isSaving} className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-1.5 rounded-md text-xs font-bold disabled:opacity-50">
                      {isSaving ? 'Updating...' : 'Update Password'}
                    </button>
                  </div>
                )}
                
                <button onClick={onLogout} className="w-full flex items-center gap-2 p-2.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 text-red-600 text-sm transition-colors">
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </div>

              {/* Delete Account */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                {showDeleteConfirm ? (
                  <div className="space-y-2 p-2 bg-red-50 dark:bg-red-950/10 rounded-lg border border-red-100 dark:border-red-900/30">
                    <p className="text-[10px] text-red-600 font-medium">Verify password to delete account permanently:</p>
                    <input type="password" value={deletePassword} onChange={e => setDeletePassword(e.target.value)} placeholder="Password" className="w-full px-2 py-1.5 text-xs border border-red-200 dark:border-red-900/50 rounded" />
                    <div className="flex gap-2">
                      <button onClick={() => deleteAccount(deletePassword)} className="flex-1 bg-red-600 text-white py-1.5 rounded text-xs font-bold">Delete</button>
                      <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 py-1.5 rounded text-xs font-bold">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setShowDeleteConfirm(true)} className="text-[10px] text-slate-400 hover:text-red-500 uppercase font-bold tracking-widest px-2 transition-colors">Delete Account</button>
                )}
              </div>
            </div>
          )}
        </div>
    </div>
  );
}

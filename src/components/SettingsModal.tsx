import React, { useRef, useState } from 'react';
import { CodexArchive, CodexSettings } from '../types/codex';
import { GoogleSignInButton } from './GoogleSignInButton';
import { ImageCropperModal } from './ImageCropperModal';
import {
  generateInzoiBackgroundDataUrl,
  INZOI_BACKDROP_PRESETS,
} from '../../tools/backgroundGenerator';
import {
  Cloud,
  Crop,
  Download,
  Image as ImageIcon,
  LogOut,
  RefreshCw,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  settings: CodexSettings;
  onUpdateSettings: (patch: Partial<CodexSettings>) => void;
  userEmail: string | null;
  rememberedEmail?: string | null;
  isAuthenticated: boolean;
  isSyncing: boolean;
  lastSyncedAt: string | null;
  driveFileId: string | null;
  syncError: string | null;
  onGoogleLogin: () => void;
  onGoogleLogout: () => void;
  onSyncToDriveRequest: () => void;
  onPullFromDriveRequest: () => void;
  onDeleteDriveFileRequest: () => void;
  onExportLocalJson: () => void;
  onImportLocalJson: (file: File) => void;
  onClearAllEntriesRequest: () => void;
  archive: CodexArchive;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  settings,
  onUpdateSettings,
  userEmail,
  rememberedEmail,
  isAuthenticated,
  isSyncing,
  lastSyncedAt,
  driveFileId,
  syncError,
  onGoogleLogin,
  onGoogleLogout,
  onSyncToDriveRequest,
  onPullFromDriveRequest,
  onDeleteDriveFileRequest,
  onExportLocalJson,
  onImportLocalJson,
  onClearAllEntriesRequest,
  archive,
  onClose,
}) => {
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [isBgCropperOpen, setIsBgCropperOpen] = useState(false);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
    >
      <div className="w-full max-w-3xl inzoi-glass-panel shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="inzoi-glass-header flex items-center justify-between px-6 py-4 shrink-0">
          <div className="flex items-center gap-3">
            <Settings className="h-5 w-5 text-[#2DD4BF]" />
            <h2
              id="settings-modal-title"
              className="font-display text-lg font-semibold text-[#F8FAFC]"
            >
              Codex Settings, Site Background &amp; Google Drive Sync
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="p-1.5 text-[#94A3B8] hover:bg-white/[0.08] hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto p-6 space-y-8">
          {/* 1. Google Drive Sync & Authentication */}
          <section className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.10] pb-2">
              <h3 className="font-display text-sm font-semibold text-[#F8FAFC] flex items-center gap-2">
                <Cloud className="h-4 w-4 text-[#2DD4BF]" />
                <span>Google Drive Cloud Sync &amp; Remembered Login</span>
              </h3>
              <span className="text-xs font-mono-tabular text-[#2DD4BF]">
                {isAuthenticated
                  ? 'Connected · Auto-Sync Active'
                  : rememberedEmail
                    ? `Remembered (${rememberedEmail})`
                    : 'Local Vault Active'}
              </span>
            </div>

            <div className="inzoi-glass-card p-4 space-y-4">
              {!isAuthenticated ? (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="text-sm font-semibold text-[#F8FAFC] flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-[#2DD4BF]" />
                      <span>
                        {rememberedEmail
                          ? `Remembered Account: ${rememberedEmail}`
                          : 'Private Single-User Google Drive Storage'}
                      </span>
                    </div>
                    <p className="text-xs text-[#94A3B8] leading-relaxed">
                      {rememberedEmail
                        ? 'Your Google account is remembered on this browser. Click to resume your active Google Drive token and sync all edits automatically.'
                        : 'Sign in with your Google account to remember your login across visits and automatically save every Zoi, location, social post, background, and photo edit to your Google Drive.'}
                    </p>
                  </div>
                  <div className="shrink-0">
                    <GoogleSignInButton
                      onClick={onGoogleLogin}
                      label={
                        rememberedEmail
                          ? `Resume as ${rememberedEmail}`
                          : 'Sign in with Google'
                      }
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.10] pb-3">
                    <div>
                      <div className="text-xs text-[#94A3B8]">
                        Remembered &amp; Active Account (Every Edit Auto-Saved to
                        Google Drive)
                      </div>
                      <div className="text-sm font-semibold text-[#F8FAFC] font-mono-tabular">
                        {userEmail || 'Authenticated Google User'}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={onGoogleLogout}
                      className="inline-flex items-center gap-1.5 border border-white/[0.14] bg-white/[0.05] px-3 py-1.5 text-xs font-medium text-[#CBD5E1] hover:text-white transition-colors whitespace-nowrap shrink-0"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label
                        htmlFor="drive-filename-input"
                        className="block text-[#94A3B8] mb-1"
                      >
                        Google Drive Archive Filename
                      </label>
                      <input
                        id="drive-filename-input"
                        type="text"
                        value={settings.driveFileName}
                        onChange={(e) =>
                          onUpdateSettings({ driveFileName: e.target.value })
                        }
                        className="w-full border border-white/[0.14] bg-black/65 px-3 py-1.5 text-xs text-[#F8FAFC] font-mono-tabular focus:border-[#2DD4BF] focus:outline-none"
                      />
                    </div>
                    <div className="flex flex-col justify-end">
                      <div className="text-[#94A3B8]">Last Cloud Sync</div>
                      <div className="font-mono-tabular text-[#E2E8F0] mt-1">
                        {lastSyncedAt
                          ? new Date(lastSyncedAt).toLocaleString()
                          : 'Auto-sync active'}
                      </div>
                    </div>
                  </div>

                  {syncError && (
                    <div className="border border-[#EF4444] bg-[#EF4444]/10 p-2.5 text-xs text-[#FCA5A5]">
                      {syncError}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2.5 pt-1">
                    <button
                      type="button"
                      disabled={isSyncing}
                      onClick={onSyncToDriveRequest}
                      className="inline-flex items-center gap-2 bg-[#2DD4BF] px-4 py-2 text-xs font-semibold text-[#050608] hover:bg-[#5EEAD4] disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
                    >
                      <RefreshCw
                        className={`h-3.5 w-3.5 ${
                          isSyncing ? 'animate-spin' : ''
                        }`}
                      />
                      <span>
                        {isSyncing
                          ? 'Syncing with Google Drive...'
                          : 'Save & Sync to Google Drive Now'}
                      </span>
                    </button>

                    <button
                      type="button"
                      disabled={isSyncing}
                      onClick={onPullFromDriveRequest}
                      className="inline-flex items-center gap-2 border border-white/[0.14] bg-white/[0.05] px-3.5 py-2 text-xs font-medium text-[#E2E8F0] hover:border-[#2DD4BF] disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
                    >
                      <Download className="h-3.5 w-3.5 text-[#2DD4BF]" />
                      <span>Load Latest from Google Drive</span>
                    </button>

                    {driveFileId && (
                      <button
                        type="button"
                        disabled={isSyncing}
                        onClick={onDeleteDriveFileRequest}
                        className="inline-flex items-center gap-1.5 border border-white/[0.14] bg-white/[0.05] px-3 py-2 text-xs font-medium text-[#EF4444] hover:bg-[#EF4444]/15 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Delete Drive Archive File</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* 2. Global Default Site Background Support */}
          <section className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.10] pb-2">
              <h3 className="font-display text-sm font-semibold text-[#F8FAFC] flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-[#2DD4BF]" />
                <span>Default Site Background (All Pages)</span>
              </h3>
              <span className="text-xs font-mono-tabular text-[#94A3B8]">
                {settings.defaultSiteBackgroundUrl
                  ? 'Custom Default Assigned'
                  : 'Default Black Glass Studio'}
              </span>
            </div>

            <div className="inzoi-glass-card p-4 space-y-4">
              <p className="text-xs text-[#94A3B8] leading-relaxed">
                Assign a default background image for all pages across the site.
                When viewing an individual Zoi or Location entry page, you can
                also upload a dedicated background for that specific entry which
                automatically overrides this default.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                <div className="md:col-span-5">
                  {settings.defaultSiteBackgroundUrl ? (
                    <div className="relative aspect-[16/9] w-full overflow-hidden border border-white/[0.14] bg-black/75">
                      <img
                        src={settings.defaultSiteBackgroundUrl}
                        alt="Default site background preview"
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute bottom-2 left-2 bg-black/85 border border-white/[0.14] px-2 py-0.5 text-[10px] font-mono-tabular text-[#2DD4BF]">
                        Active Site Default
                      </div>
                    </div>
                  ) : (
                    <div className="aspect-[16/9] w-full border border-dashed border-white/[0.16] bg-black/65 flex flex-col items-center justify-center p-4 text-center">
                      <ImageIcon className="h-6 w-6 text-[#2DD4BF]/70 mb-1.5" />
                      <span className="text-xs font-medium text-[#E2E8F0]">
                        No Default Background Image
                      </span>
                      <span className="text-[11px] text-[#94A3B8] mt-0.5">
                        Using inZOI Black Glass Canvas
                      </span>
                    </div>
                  )}
                </div>

                <div className="md:col-span-7 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsBgCropperOpen(true)}
                      className="inline-flex items-center gap-2 bg-[#2DD4BF] px-4 py-2 text-xs font-semibold text-[#050608] hover:bg-[#5EEAD4] transition-colors whitespace-nowrap shrink-0"
                    >
                      <Crop className="h-3.5 w-3.5" />
                      <span>
                        {settings.defaultSiteBackgroundUrl
                          ? 'Upload / Re-Crop Default Background'
                          : 'Upload Default Site Background'}
                      </span>
                    </button>

                    {settings.defaultSiteBackgroundUrl && (
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateSettings({
                            defaultSiteBackgroundUrl: '',
                            rawDefaultSiteBackgroundUrl: undefined,
                            defaultSiteBackgroundCropConfig: undefined,
                          })
                        }
                        className="inline-flex items-center gap-1.5 border border-white/[0.14] bg-white/[0.05] px-3 py-2 text-xs font-medium text-[#EF4444] hover:bg-[#EF4444]/15 transition-colors whitespace-nowrap shrink-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Clear Background</span>
                      </button>
                    )}
                  </div>

                  {/* inZOI Studio Preset Backdrops */}
                  <div className="space-y-1.5 pt-1">
                    <div className="text-[11px] font-medium text-[#94A3B8] flex items-center gap-1.5">
                      <Sparkles className="h-3 w-3 text-[#2DD4BF]" />
                      <span>Quick inZOI City &amp; Studio Backdrop Presets:</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {INZOI_BACKDROP_PRESETS.map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => {
                            const dataUrl = generateInzoiBackgroundDataUrl(
                              preset.id
                            );
                            onUpdateSettings({
                              defaultSiteBackgroundUrl: dataUrl,
                              rawDefaultSiteBackgroundUrl: dataUrl,
                            });
                          }}
                          className="border border-white/[0.14] bg-white/[0.05] px-2.5 py-1.5 text-xs text-[#E2E8F0] hover:border-[#2DD4BF] hover:text-[#2DD4BF] transition-colors whitespace-nowrap shrink-0"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Overlay Dimming Control */}
                  <div className="pt-2 border-t border-white/[0.10]">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <label
                        htmlFor="bg-opacity-slider"
                        className="text-[#CBD5E1] font-medium"
                      >
                        Background Dimming Overlay (Readability)
                      </label>
                      <span className="font-mono-tabular text-[#2DD4BF]">
                        {Math.round(
                          (settings.siteBackgroundOverlayOpacity ?? 0.78) * 100
                        )}
                        %
                      </span>
                    </div>
                    <input
                      id="bg-opacity-slider"
                      type="range"
                      min={0.45}
                      max={0.92}
                      step={0.01}
                      value={settings.siteBackgroundOverlayOpacity ?? 0.78}
                      onChange={(e) =>
                        onUpdateSettings({
                          siteBackgroundOverlayOpacity: parseFloat(
                            e.target.value
                          ),
                        })
                      }
                      className="w-full accent-[#2DD4BF]"
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 3. Directory Layout & Profile Standard */}
          <section className="space-y-4">
            <h3 className="font-display text-sm font-semibold text-[#F8FAFC] border-b border-white/[0.10] pb-2">
              Encyclopedia Dossier &amp; Directory Layout
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="inzoi-glass-card p-4 flex flex-col justify-between">
                <div>
                  <span className="block text-xs font-semibold text-[#E2E8F0] mb-1">
                    Standard Zoi Profile Layout
                  </span>
                  <p className="text-[11px] text-[#94A3B8]">
                    All Zois use the unified{' '}
                    <strong className="text-white">Encyclopedia Dossier</strong>{' '}
                    layout paired with a dedicated X-inspired Social Feed tab.
                  </p>
                </div>
                <div className="mt-3 border border-[#2DD4BF]/40 bg-[#2DD4BF]/10 px-3 py-2 text-xs font-semibold text-[#2DD4BF]">
                  Encyclopedia Dossier (Active Standard)
                </div>
              </div>

              <div className="inzoi-glass-card p-4">
                <span className="block text-xs font-semibold text-[#E2E8F0] mb-1">
                  Selection Page Grid Density
                </span>
                <p className="text-[11px] text-[#94A3B8] mb-3">
                  Number of portrait cards per row on desktop screens.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {([3, 4] as const).map((cols) => (
                    <button
                      key={cols}
                      type="button"
                      onClick={() =>
                        onUpdateSettings({ directoryGridColumns: cols })
                      }
                      className={`py-2 text-xs font-medium border transition-colors ${
                        settings.directoryGridColumns === cols
                          ? 'border-[#2DD4BF] bg-[#2DD4BF]/15 text-[#F8FAFC]'
                          : 'border-white/[0.10] bg-black/60 text-[#94A3B8]'
                      }`}
                    >
                      {cols} Columns
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* 4. Hyperlinking & Safety Confirmations */}
          <section className="space-y-4">
            <h3 className="font-display text-sm font-semibold text-[#F8FAFC] border-b border-white/[0.10] pb-2">
              Hyperlinking &amp; City Simulation Preferences
            </h3>

            <div className="space-y-2.5">
              <label className="flex items-start justify-between gap-4 inzoi-glass-card p-3.5 cursor-pointer">
                <div>
                  <div className="text-xs font-semibold text-[#F8FAFC]">
                    Auto-Hyperlink Zoi &amp; Location Names
                  </div>
                  <div className="text-[11px] text-[#94A3B8] mt-0.5">
                    Automatically turn matching Zoi and Location names into
                    clickable profile links even without [[double brackets]].
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.autoHyperlinkNames}
                  onChange={(e) =>
                    onUpdateSettings({
                      autoHyperlinkNames: e.target.checked,
                    })
                  }
                  className="mt-1 h-4 w-4 accent-[#2DD4BF]"
                />
              </label>

              <label className="flex items-start justify-between gap-4 inzoi-glass-card p-3.5 cursor-pointer">
                <div>
                  <div className="text-xs font-semibold text-[#F8FAFC]">
                    Show Hover Preview Cards on Internal Hyperlinks
                  </div>
                  <div className="text-[11px] text-[#94A3B8] mt-0.5">
                    Display a summary tooltip when hovering over a linked Zoi or
                    location.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.showLinkPreviews}
                  onChange={(e) =>
                    onUpdateSettings({
                      showLinkPreviews: e.target.checked,
                    })
                  }
                  className="mt-1 h-4 w-4 accent-[#2DD4BF]"
                />
              </label>

              <label className="flex items-start justify-between gap-4 inzoi-glass-card p-3.5 cursor-pointer">
                <div>
                  <div className="text-xs font-semibold text-[#F8FAFC]">
                    Confirm Before Manual Google Drive Overwrite
                  </div>
                  <div className="text-[11px] text-[#94A3B8] mt-0.5">
                    Prompt for confirmation when manually clicking Save &amp;
                    Sync to Google Drive.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.confirmBeforeCloudOverwrite}
                  onChange={(e) =>
                    onUpdateSettings({
                      confirmBeforeCloudOverwrite: e.target.checked,
                    })
                  }
                  className="mt-1 h-4 w-4 accent-[#2DD4BF]"
                />
              </label>

              <label className="flex items-start justify-between gap-4 inzoi-glass-card p-3.5 cursor-pointer">
                <div>
                  <div className="text-xs font-semibold text-[#F8FAFC]">
                    Ambient AI City Life Dispatches (inZOI Style)
                  </div>
                  <div className="text-[11px] text-[#94A3B8] mt-0.5">
                    Occasionally generate anonymous, living-city updates on the
                    Community Hub with mindful API rate-limit cooldowns shared
                    with AI social posts and comments.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.enableAiCityEvents}
                  onChange={(e) =>
                    onUpdateSettings({
                      enableAiCityEvents: e.target.checked,
                    })
                  }
                  className="mt-1 h-4 w-4 accent-[#2DD4BF]"
                />
              </label>

              {settings.enableAiCityEvents && (
                <div className="inzoi-glass-card p-3.5 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold text-[#F8FAFC]">
                      Automatic AI Dispatch Cooldown Interval
                    </div>
                    <div className="text-[11px] text-[#94A3B8] mt-0.5">
                      Minimum time between background AI dispatches to respect
                      generation limits.
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {([2, 5, 15] as const).map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() =>
                          onUpdateSettings({ aiCooldownMinutes: mins })
                        }
                        className={`px-2.5 py-1 text-xs font-mono-tabular border transition-colors ${
                          settings.aiCooldownMinutes === mins
                            ? 'border-[#2DD4BF] bg-[#2DD4BF]/15 text-[#F8FAFC]'
                            : 'border-white/[0.10] bg-black/60 text-[#94A3B8]'
                        }`}
                      >
                        {mins}m
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* 5. Local Archive Backup & Reset */}
          <section className="space-y-4">
            <h3 className="font-display text-sm font-semibold text-[#F8FAFC] border-b border-white/[0.10] pb-2">
              Archive Portability &amp; Reset
            </h3>

            <div className="flex flex-wrap items-center justify-between gap-3 inzoi-glass-card p-4">
              <div className="text-xs text-[#94A3B8] font-mono-tabular">
                Current Vault: {archive.characters.length} Zois ·{' '}
                {archive.locations.length} Locations · {archive.photos.length}{' '}
                Photos · {(archive.socialPosts || []).length} Posts
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <input
                  ref={importInputRef}
                  type="file"
                  accept="application/json"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      onImportLocalJson(file);
                      e.target.value = '';
                    }
                  }}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={onExportLocalJson}
                  className="inline-flex items-center gap-1.5 border border-white/[0.14] bg-white/[0.05] px-3 py-1.5 text-xs font-medium text-[#E2E8F0] hover:border-[#2DD4BF] transition-colors whitespace-nowrap shrink-0"
                >
                  <Download className="h-3.5 w-3.5 text-[#2DD4BF]" />
                  <span>Export JSON Backup</span>
                </button>

                <button
                  type="button"
                  onClick={() => importInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 border border-white/[0.14] bg-white/[0.05] px-3 py-1.5 text-xs font-medium text-[#E2E8F0] hover:border-[#2DD4BF] transition-colors whitespace-nowrap shrink-0"
                >
                  <Upload className="h-3.5 w-3.5 text-[#2DD4BF]" />
                  <span>Import JSON Backup</span>
                </button>

                <button
                  type="button"
                  onClick={onClearAllEntriesRequest}
                  className="inline-flex items-center gap-1.5 border border-white/[0.14] bg-white/[0.05] px-3 py-1.5 text-xs font-medium text-[#EF4444] hover:bg-[#EF4444]/15 transition-colors whitespace-nowrap shrink-0"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Reset Local Archive</span>
                </button>
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-white/[0.10] px-6 py-3.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="bg-[#2DD4BF] px-5 py-2 text-xs font-semibold text-[#050608] hover:bg-[#5EEAD4] transition-colors whitespace-nowrap shrink-0"
          >
            Done
          </button>
        </div>
      </div>

      {/* Cropper Modal for Default Site Background */}
      <ImageCropperModal
        isOpen={isBgCropperOpen}
        initialRawImage={
          settings.rawDefaultSiteBackgroundUrl ||
          settings.defaultSiteBackgroundUrl
        }
        initialConfig={settings.defaultSiteBackgroundCropConfig}
        defaultAspect="16:9"
        entityName="Default Site Background"
        onApply={(croppedDataUrl, rawDataUrl, config) => {
          onUpdateSettings({
            defaultSiteBackgroundUrl: croppedDataUrl,
            rawDefaultSiteBackgroundUrl: rawDataUrl,
            defaultSiteBackgroundCropConfig: config,
          });
          setIsBgCropperOpen(false);
        }}
        onClose={() => setIsBgCropperOpen(false)}
      />
    </div>
  );
};

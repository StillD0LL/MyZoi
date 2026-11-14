import React, { useMemo, useState } from 'react';
import {
  CharacterEntry,
  CityFeedEvent,
  GalleryPhoto,
  LOCATION_CATEGORIES,
  LocationEntry,
} from '../types/codex';
import {
  getAllSubmittedPhotosForHub,
  HubDisplayPhoto,
} from '../utils/codexLogic';
import { HyperlinkedText } from './HyperlinkedText';
import { GoogleSignInButton } from './GoogleSignInButton';
import {
  Building2,
  Camera,
  Check,
  Clock,
  Cloud,
  Home,
  Images,
  Landmark,
  MapPin,
  Newspaper,
  Plus,
  Radio,
  RefreshCw,
  Sparkles,
  User,
  X,
} from 'lucide-react';

interface CommunityHubViewProps {
  characters: CharacterEntry[];
  locations: LocationEntry[];
  photos: GalleryPhoto[];
  feedEvents: CityFeedEvent[];
  autoHyperlinkNames: boolean;
  showLinkPreviews: boolean;
  isAuthenticated: boolean;
  userEmail?: string | null;
  rememberedEmail?: string | null;
  isSyncing?: boolean;
  lastSyncedAt?: string | null;
  isGeneratingAiUpdate: boolean;
  aiCooldownRemainingSec: number;
  aiError: string | null;
  enableAiCityEvents: boolean;
  onTriggerAiCityUpdate: () => void;
  onOpenPhotoUpload: () => void;
  onCreateCharacter: () => void;
  onCreateLocation: () => void;
  onNavigate: (type: 'character' | 'location', id: string) => void;
  onNavigateDirectory: (view: 'characters' | 'locations') => void;
  onGoogleLogin: () => void;
}

export const CommunityHubView: React.FC<CommunityHubViewProps> = ({
  characters,
  locations,
  photos,
  feedEvents,
  autoHyperlinkNames,
  showLinkPreviews,
  isAuthenticated,
  userEmail,
  rememberedEmail,
  isSyncing = false,
  lastSyncedAt,
  isGeneratingAiUpdate,
  aiCooldownRemainingSec,
  aiError,
  enableAiCityEvents,
  onTriggerAiCityUpdate,
  onOpenPhotoUpload,
  onCreateCharacter,
  onCreateLocation,
  onNavigate,
  onNavigateDirectory,
  onGoogleLogin,
}) => {
  const [feedFilter, setFeedFilter] = useState<
    'all' | 'site_update' | 'ai_inzoi'
  >('all');
  const [lightboxPhoto, setLightboxPhoto] = useState<HubDisplayPhoto | null>(
    null
  );

  const allSubmittedPhotos = useMemo(
    () => getAllSubmittedPhotosForHub(characters, locations, photos),
    [characters, locations, photos]
  );

  const filteredEvents = useMemo(() => {
    if (feedFilter === 'all') return feedEvents;
    return feedEvents.filter((e) => e.kind === feedFilter);
  }, [feedEvents, feedFilter]);

  const lotCategoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      City: 0,
      'Residential lot': 0,
      'Community lot': 0,
      'Business lot': 0,
    };
    for (const loc of locations) {
      counts[loc.category] = (counts[loc.category] || 0) + 1;
    }
    return counts;
  }, [locations]);

  const resolveCharacterName = (id: string) =>
    characters.find((c) => c.id === id)?.name;
  const resolveLocationName = (id: string) =>
    locations.find((l) => l.id === id)?.name;

  return (
    <div className="space-y-8">
      {/* INZOI WIKI PORTAL WELCOME & CATEGORY NAVIGATION BAR */}
      <section
        aria-label="Wiki Portal Navigation"
        className="inzoi-glass-panel overflow-hidden"
      >
        <div className="inzoi-glass-header px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-xs text-[#CBD5E1]">
            <span className="font-semibold text-[#2DD4BF]">
              inZOI Wiki Portal
            </span>
            <span aria-hidden="true">·</span>
            <span>Living City Encyclopedia &amp; Original Zoi Database</span>
          </div>

          <div className="flex items-center gap-2 text-xs">
            {isAuthenticated ? (
              <span className="inline-flex items-center gap-1.5 text-[#2DD4BF] font-medium">
                {isSyncing ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Auto-Saving to Google Drive...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    <span>
                      Auto-Sync Active ({userEmail || 'Google Drive'})
                    </span>
                  </>
                )}
              </span>
            ) : rememberedEmail ? (
              <button
                type="button"
                onClick={onGoogleLogin}
                className="inline-flex items-center gap-1.5 text-[#38BDF8] hover:text-[#2DD4BF] font-medium transition-colors"
              >
                <Cloud className="h-3.5 w-3.5" />
                <span>Resume Google Drive Sync ({rememberedEmail})</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onGoogleLogin}
                className="inline-flex items-center gap-1.5 text-[#94A3B8] hover:text-[#2DD4BF] transition-colors"
              >
                <Cloud className="h-3.5 w-3.5 text-[#2DD4BF]" />
                <span>Connect Google Drive for Auto-Sync</span>
              </button>
            )}
          </div>
        </div>

        {/* Wiki Category Portal Tiles (Inspired by InZOI Wiki Main Page Categories) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-white/[0.08]">
          <button
            type="button"
            onClick={() => onNavigateDirectory('characters')}
            className="p-4 sm:p-5 text-left hover:bg-white/[0.04] transition-colors group flex items-center justify-between gap-3"
          >
            <div>
              <div className="text-[11px] text-[#94A3B8] group-hover:text-[#2DD4BF] transition-colors">
                The Zoi · Residents
              </div>
              <div className="mt-0.5 font-display text-base font-bold text-[#F8FAFC] group-hover:text-[#2DD4BF] transition-colors">
                Zoi Profiles
              </div>
              <div className="mt-1 text-xs font-mono-tabular text-[#64748B]">
                {characters.length} {characters.length === 1 ? 'Zoi' : 'Zois'}
              </div>
            </div>
            <User className="h-5 w-5 text-[#2DD4BF]/80 shrink-0" />
          </button>

          <button
            type="button"
            onClick={() => onNavigateDirectory('locations')}
            className="p-4 sm:p-5 text-left hover:bg-white/[0.04] transition-colors group flex items-center justify-between gap-3"
          >
            <div>
              <div className="text-[11px] text-[#94A3B8] group-hover:text-[#2DD4BF] transition-colors">
                World &amp; Lots
              </div>
              <div className="mt-0.5 font-display text-base font-bold text-[#F8FAFC] group-hover:text-[#2DD4BF] transition-colors">
                Cities &amp; Locations
              </div>
              <div className="mt-1 text-xs font-mono-tabular text-[#64748B]">
                {locations.length}{' '}
                {locations.length === 1 ? 'Location' : 'Locations'}
              </div>
            </div>
            <MapPin className="h-5 w-5 text-[#2DD4BF]/80 shrink-0" />
          </button>

          <button
            type="button"
            onClick={onOpenPhotoUpload}
            className="p-4 sm:p-5 text-left hover:bg-white/[0.04] transition-colors group flex items-center justify-between gap-3"
          >
            <div>
              <div className="text-[11px] text-[#94A3B8] group-hover:text-[#2DD4BF] transition-colors">
                Media &amp; Screenshots
              </div>
              <div className="mt-0.5 font-display text-base font-bold text-[#F8FAFC] group-hover:text-[#2DD4BF] transition-colors">
                Photo Gallery
              </div>
              <div className="mt-1 text-xs font-mono-tabular text-[#64748B]">
                {allSubmittedPhotos.length} Submitted
              </div>
            </div>
            <Camera className="h-5 w-5 text-[#2DD4BF]/80 shrink-0" />
          </button>

          <button
            type="button"
            onClick={onTriggerAiCityUpdate}
            disabled={isGeneratingAiUpdate || aiCooldownRemainingSec > 0}
            className="p-4 sm:p-5 text-left hover:bg-white/[0.04] disabled:opacity-60 transition-colors group flex items-center justify-between gap-3"
          >
            <div>
              <div className="text-[11px] text-[#94A3B8] group-hover:text-[#2DD4BF] transition-colors">
                Simulation Feed
              </div>
              <div className="mt-0.5 font-display text-base font-bold text-[#F8FAFC] group-hover:text-[#2DD4BF] transition-colors">
                {isGeneratingAiUpdate
                  ? 'Observing City...'
                  : aiCooldownRemainingSec > 0
                    ? `Cooldown (${aiCooldownRemainingSec}s)`
                    : 'Pulse City Life'}
              </div>
              <div className="mt-1 text-xs font-mono-tabular text-[#64748B]">
                {feedEvents.length} City Dispatches
              </div>
            </div>
            <Sparkles className="h-5 w-5 text-[#2DD4BF]/80 shrink-0" />
          </button>
        </div>
      </section>

      {/* TOP SECTION: All Photos Submitted to Zoi & Location Pages */}
      <section
        aria-labelledby="hub-photos-heading"
        className="inzoi-glass-panel overflow-hidden"
      >
        <div className="inzoi-glass-header px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs text-[#2DD4BF] font-medium mb-1">
              Visual City Chronicle · {allSubmittedPhotos.length} Submitted{' '}
              {allSubmittedPhotos.length === 1 ? 'Photo' : 'Photos'}
            </div>
            <h1
              id="hub-photos-heading"
              className="font-display text-2xl sm:text-3xl font-bold text-[#F8FAFC] tracking-tight"
            >
              Submitted Photos &amp; Zoi Snapshots
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onOpenPhotoUpload}
              className="inline-flex items-center gap-2 bg-[#2DD4BF] px-4 py-2 text-xs font-semibold text-[#050608] hover:bg-[#5EEAD4] transition-colors whitespace-nowrap shrink-0"
            >
              <Camera className="h-3.5 w-3.5" />
              <span>Submit Photos</span>
            </button>
          </div>
        </div>

        <div className="p-6">
          {allSubmittedPhotos.length === 0 ? (
            <div className="border border-dashed border-white/[0.14] bg-black/55 backdrop-blur-md p-8 text-center space-y-3">
              <Images className="mx-auto h-7 w-7 text-[#2DD4BF]/80" />
              <h2 className="font-display text-base font-semibold text-[#F8FAFC]">
                No Photos Submitted Yet
              </h2>
              <p className="text-xs text-[#94A3B8] max-w-xl mx-auto leading-relaxed">
                Every portrait, district illustration, and multi-image gallery
                screenshot submitted to your Zoi and location pages will appear
                here automatically.
              </p>
              <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={onOpenPhotoUpload}
                  className="inline-flex items-center gap-1.5 border border-[#2DD4BF] bg-[#2DD4BF]/15 px-4 py-2 text-xs font-semibold text-[#F8FAFC] hover:bg-[#2DD4BF] hover:text-[#050608] transition-colors whitespace-nowrap shrink-0"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Upload First Snapshot</span>
                </button>
                <button
                  type="button"
                  onClick={onCreateCharacter}
                  className="inline-flex items-center gap-1.5 border border-white/[0.14] bg-white/[0.04] px-4 py-2 text-xs font-medium text-[#E2E8F0] hover:border-[#2DD4BF] transition-colors whitespace-nowrap shrink-0"
                >
                  <User className="h-3.5 w-3.5 text-[#2DD4BF]" />
                  <span>Create Zoi Profile</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {allSubmittedPhotos.slice(0, 8).map((photo) => {
                const taggedChars = photo.taggedCharacterIds
                  .map((id) => ({ id, name: resolveCharacterName(id) }))
                  .filter((c): c is { id: string; name: string } =>
                    Boolean(c.name)
                  );
                const taggedLocs = photo.taggedLocationIds
                  .map((id) => ({ id, name: resolveLocationName(id) }))
                  .filter((l): l is { id: string; name: string } =>
                    Boolean(l.name)
                  );

                return (
                  <div
                    key={photo.id}
                    className="group inzoi-glass-card flex flex-col justify-between overflow-hidden hover:border-[#2DD4BF] transition-colors"
                  >
                    <button
                      type="button"
                      onClick={() => setLightboxPhoto(photo)}
                      className="relative aspect-[4/3] w-full overflow-hidden bg-black/70 border-b border-white/[0.08] text-left cursor-pointer"
                    >
                      <img
                        src={photo.imageDataUrl}
                        alt={photo.caption}
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
                      />
                      <div className="bg-gradient-to-t from-black/90 via-black/35 to-transparent absolute inset-x-0 bottom-0 p-3 pt-8">
                        <div className="text-xs font-semibold text-white truncate">
                          {photo.caption}
                        </div>
                      </div>
                    </button>

                    <div className="px-3 py-2.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] text-[#94A3B8]">
                      {taggedChars.length === 0 && taggedLocs.length === 0 ? (
                        <span>Untagged Snapshot</span>
                      ) : (
                        <>
                          {taggedChars.map((tc, idx) => (
                            <React.Fragment key={tc.id}>
                              {idx > 0 && <span aria-hidden="true">·</span>}
                              <button
                                type="button"
                                onClick={() => onNavigate('character', tc.id)}
                                className="text-[#2DD4BF] hover:underline font-medium truncate"
                              >
                                {tc.name}
                              </button>
                            </React.Fragment>
                          ))}
                          {taggedChars.length > 0 && taggedLocs.length > 0 && (
                            <span aria-hidden="true">·</span>
                          )}
                          {taggedLocs.map((tl, idx) => (
                            <React.Fragment key={tl.id}>
                              {idx > 0 && <span aria-hidden="true">·</span>}
                              <button
                                type="button"
                                onClick={() => onNavigate('location', tl.id)}
                                className="text-[#2DD4BF] hover:underline font-medium truncate"
                              >
                                {tl.name}
                              </button>
                            </React.Fragment>
                          ))}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* LOWER SPLIT: Community Hub Activity Feed (Left) & Wiki Infobox Rail (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Anonymous Living Community Updates + inZOI AI Dispatches */}
        <section
          aria-labelledby="hub-feed-heading"
          className="lg:col-span-8 inzoi-glass-panel overflow-hidden"
        >
          <div className="inzoi-glass-header px-6 py-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs text-[#94A3B8] mb-1">
                Municipal &amp; Neighborhood Feed · Live Wiki Activity
              </div>
              <h2
                id="hub-feed-heading"
                className="font-display text-xl sm:text-2xl font-bold text-[#F8FAFC] tracking-tight"
              >
                Community Hub &amp; City Updates
              </h2>
            </div>

            {/* Mindful AI Dispatch Trigger with Cooldown */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isGeneratingAiUpdate || aiCooldownRemainingSec > 0}
                onClick={onTriggerAiCityUpdate}
                className="inline-flex items-center gap-2 border border-[#2DD4BF] bg-[#2DD4BF]/15 px-3.5 py-2 text-xs font-semibold text-[#F8FAFC] hover:bg-[#2DD4BF] hover:text-[#050608] disabled:opacity-50 disabled:pointer-events-none transition-colors whitespace-nowrap shrink-0"
                title="Generate an atmospheric inZOI-style city life update based on your Zois and locations"
              >
                <Sparkles className="h-3.5 w-3.5 text-[#2DD4BF]" />
                {isGeneratingAiUpdate ? (
                  <span>Observing City Life...</span>
                ) : aiCooldownRemainingSec > 0 ? (
                  <span className="font-mono-tabular">
                    AI Cooldown ({aiCooldownRemainingSec}s)
                  </span>
                ) : (
                  <span>Pulse City Life (AI)</span>
                )}
              </button>
            </div>
          </div>

          <div className="p-6 space-y-5">
            {/* Filter Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    { id: 'all', label: `All Updates (${feedEvents.length})` },
                    {
                      id: 'site_update',
                      label: `Registry & Site Updates (${
                        feedEvents.filter((e) => e.kind === 'site_update').length
                      })`,
                    },
                    {
                      id: 'ai_inzoi',
                      label: `City Life Dispatches (${
                        feedEvents.filter((e) => e.kind === 'ai_inzoi').length
                      })`,
                    },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setFeedFilter(tab.id)}
                    className={`px-3 py-1.5 text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
                      feedFilter === tab.id
                        ? 'border-[#2DD4BF] bg-[#2DD4BF] text-[#050608] font-semibold'
                        : 'border-white/[0.12] bg-black/50 text-[#94A3B8] hover:text-white hover:border-white/[0.24]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {enableAiCityEvents && (
                <span className="text-[11px] text-[#94A3B8] flex items-center gap-1.5 font-mono-tabular">
                  <Clock className="h-3 w-3 text-[#2DD4BF]" />
                  <span>Shared AI Cooldown Active</span>
                </span>
              )}
            </div>

            {aiError && (
              <div className="border border-[#EF4444]/60 bg-[#EF4444]/10 px-4 py-2.5 text-xs text-[#FCA5A5]">
                {aiError}
              </div>
            )}

            {/* Feed Stream */}
            {filteredEvents.length === 0 ? (
              <div className="border border-white/[0.10] bg-black/50 p-8 text-center space-y-4">
                <Newspaper className="mx-auto h-7 w-7 text-[#2DD4BF]/80" />
                <div className="space-y-1">
                  <h3 className="font-display text-base font-semibold text-[#F8FAFC]">
                    The City Bulletin is Quiet
                  </h3>
                  <p className="text-xs text-[#94A3B8] max-w-lg mx-auto leading-relaxed">
                    As you document Zois, charter locations, or submit photos,
                    anonymous municipal updates appear here automatically. You
                    can also pulse an AI-driven city life update in the style of
                    inZOI.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                  <button
                    type="button"
                    disabled={isGeneratingAiUpdate || aiCooldownRemainingSec > 0}
                    onClick={onTriggerAiCityUpdate}
                    className="inline-flex items-center gap-2 bg-[#2DD4BF] px-4 py-2 text-xs font-semibold text-[#050608] hover:bg-[#5EEAD4] disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Generate First City Life Dispatch</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredEvents.map((event) => {
                  const resolvedThumbnailUrl =
                    event.imageUrl ||
                    (event.relatedEntityType === 'character' &&
                    event.relatedEntityId
                      ? characters.find((c) => c.id === event.relatedEntityId)
                          ?.portraitDataUrl
                      : event.relatedEntityType === 'location' &&
                          event.relatedEntityId
                        ? locations.find((l) => l.id === event.relatedEntityId)
                            ?.imageDataUrl
                        : undefined);

                  return (
                    <article
                      key={event.id}
                      className="inzoi-glass-card p-5 transition-colors hover:border-[#2DD4BF]/50"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#94A3B8] mb-2">
                        <div className="flex items-center gap-2">
                          {event.kind === 'ai_inzoi' ? (
                            <Radio className="h-3.5 w-3.5 text-[#2DD4BF]" />
                          ) : (
                            <Newspaper className="h-3.5 w-3.5 text-[#2DD4BF]" />
                          )}
                          <span className="font-semibold text-[#2DD4BF]">
                            {event.category}
                          </span>
                          {event.districtOrMood && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span>{event.districtOrMood}</span>
                            </>
                          )}
                        </div>
                        <time
                          dateTime={event.createdAt}
                          className="font-mono-tabular text-[11px] text-[#64748B]"
                        >
                          {new Date(event.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}{' '}
                          · {event.createdAt.slice(0, 10)}
                        </time>
                      </div>

                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1.5 flex-1">
                          <h3 className="font-display text-base font-semibold text-[#F8FAFC]">
                            {event.relatedEntityId && event.relatedEntityType ? (
                              <button
                                type="button"
                                onClick={() =>
                                  onNavigate(
                                    event.relatedEntityType!,
                                    event.relatedEntityId!
                                  )
                                }
                                className="hover:text-[#2DD4BF] transition-colors text-left"
                              >
                                {event.headline}
                              </button>
                            ) : (
                              event.headline
                            )}
                          </h3>
                          <p className="text-sm text-[#CBD5E1] leading-relaxed">
                            <HyperlinkedText
                              text={event.body}
                              characters={characters}
                              locations={locations}
                              autoHyperlinkNames={autoHyperlinkNames}
                              showLinkPreviews={showLinkPreviews}
                              onNavigate={onNavigate}
                            />
                          </p>
                        </div>

                        {resolvedThumbnailUrl && (
                          <img
                            src={resolvedThumbnailUrl}
                            alt={event.headline}
                            referrerPolicy="no-referrer"
                            className="h-16 w-16 object-cover border border-white/[0.14] shrink-0"
                          />
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Right Column: Wiki Infobox Rail, Lot Categories, Quick Directory, Google Drive Sync */}
        <aside className="lg:col-span-4 space-y-6">
          {/* City Census Overview Wiki Box */}
          <div className="inzoi-glass-panel overflow-hidden">
            <div className="inzoi-glass-header px-5 py-3.5 flex items-center justify-between">
              <h2 className="font-display text-sm font-semibold text-[#F8FAFC]">
                City Census &amp; Overview
              </h2>
              <span className="text-[11px] font-mono-tabular text-[#2DD4BF]">
                WIKI DATABASE
              </span>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-px bg-white/[0.10] border border-white/[0.10]">
                <button
                  type="button"
                  onClick={() => onNavigateDirectory('characters')}
                  className="bg-[#07090D]/90 p-3.5 text-left hover:bg-white/[0.06] transition-colors"
                >
                  <div className="text-[11px] text-[#94A3B8]">Zois</div>
                  <div className="mt-1 font-mono-tabular text-xl font-bold text-[#F8FAFC]">
                    {characters.length}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => onNavigateDirectory('locations')}
                  className="bg-[#07090D]/90 p-3.5 text-left hover:bg-white/[0.06] transition-colors"
                >
                  <div className="text-[11px] text-[#94A3B8]">Locations</div>
                  <div className="mt-1 font-mono-tabular text-xl font-bold text-[#F8FAFC]">
                    {locations.length}
                  </div>
                </button>

                <div className="bg-[#07090D]/90 p-3.5">
                  <div className="text-[11px] text-[#94A3B8]">
                    Submitted Photos
                  </div>
                  <div className="mt-1 font-mono-tabular text-xl font-bold text-[#2DD4BF]">
                    {allSubmittedPhotos.length}
                  </div>
                </div>

                <div className="bg-[#07090D]/90 p-3.5">
                  <div className="text-[11px] text-[#94A3B8]">City Updates</div>
                  <div className="mt-1 font-mono-tabular text-xl font-bold text-[#F8FAFC]">
                    {feedEvents.length}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={onCreateCharacter}
                  className="flex items-center justify-center gap-1.5 bg-[#2DD4BF] px-3 py-2 text-xs font-semibold text-[#050608] hover:bg-[#5EEAD4] transition-colors whitespace-nowrap shrink-0"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>New Zoi</span>
                </button>
                <button
                  type="button"
                  onClick={onCreateLocation}
                  className="flex items-center justify-center gap-1.5 border border-white/[0.14] bg-white/[0.05] px-3 py-2 text-xs font-medium text-[#F8FAFC] hover:border-[#2DD4BF] transition-colors whitespace-nowrap shrink-0"
                >
                  <Plus className="h-3.5 w-3.5 text-[#2DD4BF]" />
                  <span>New Location</span>
                </button>
              </div>
            </div>
          </div>

          {/* Locations by Category Wiki Infobox */}
          <div className="inzoi-glass-panel overflow-hidden">
            <div className="inzoi-glass-header px-5 py-3 flex items-center justify-between">
              <h3 className="font-display text-sm font-semibold text-[#F8FAFC]">
                World &amp; Lot Categories
              </h3>
              <button
                type="button"
                onClick={() => onNavigateDirectory('locations')}
                className="text-xs text-[#2DD4BF] hover:underline"
              >
                Explore All
              </button>
            </div>
            <div className="p-4 grid grid-cols-2 gap-2">
              {LOCATION_CATEGORIES.map((cat) => {
                const Icon =
                  cat === 'City'
                    ? Landmark
                    : cat === 'Residential lot'
                      ? Home
                      : cat === 'Business lot'
                        ? Building2
                        : MapPin;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => onNavigateDirectory('locations')}
                    className="border border-white/[0.08] bg-black/50 p-3 text-left hover:border-[#2DD4BF]/60 transition-colors flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-[#E2E8F0] truncate">
                        {cat}
                      </div>
                      <div className="text-[11px] font-mono-tabular text-[#64748B]">
                        {lotCategoryCounts[cat] || 0} lots
                      </div>
                    </div>
                    <Icon className="h-4 w-4 text-[#2DD4BF] shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Registered Zois Quick List */}
          <div className="inzoi-glass-panel overflow-hidden">
            <div className="inzoi-glass-header px-5 py-3 flex items-center justify-between">
              <h3 className="font-display text-sm font-semibold text-[#F8FAFC]">
                Registered Zois
              </h3>
              <button
                type="button"
                onClick={() => onNavigateDirectory('characters')}
                className="text-xs text-[#2DD4BF] hover:underline"
              >
                View All
              </button>
            </div>

            <div className="p-5">
              {characters.length === 0 ? (
                <p className="text-xs text-[#94A3B8]">
                  No Zois registered yet.
                </p>
              ) : (
                <div className="divide-y divide-white/[0.08]">
                  {characters.slice(0, 5).map((char) => (
                    <button
                      key={char.id}
                      type="button"
                      onClick={() => onNavigate('character', char.id)}
                      className="w-full flex items-center justify-between py-2.5 text-left hover:text-[#2DD4BF] transition-colors group"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-[#F8FAFC] group-hover:text-[#2DD4BF] truncate">
                          {char.name}
                        </div>
                        <div className="text-[11px] text-[#94A3B8] truncate">
                          {[char.occupation || char.role, char.gender]
                            .filter(Boolean)
                            .join(' · ') || 'Zoi'}
                        </div>
                      </div>
                      <User className="h-3.5 w-3.5 text-[#64748B] group-hover:text-[#2DD4BF] shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Chartered Locations Quick List */}
          <div className="inzoi-glass-panel overflow-hidden">
            <div className="inzoi-glass-header px-5 py-3 flex items-center justify-between">
              <h3 className="font-display text-sm font-semibold text-[#F8FAFC]">
                Districts &amp; Locations
              </h3>
              <button
                type="button"
                onClick={() => onNavigateDirectory('locations')}
                className="text-xs text-[#2DD4BF] hover:underline"
              >
                View All
              </button>
            </div>

            <div className="p-5">
              {locations.length === 0 ? (
                <p className="text-xs text-[#94A3B8]">
                  No locations chartered yet.
                </p>
              ) : (
                <div className="divide-y divide-white/[0.08]">
                  {locations.slice(0, 5).map((loc) => (
                    <button
                      key={loc.id}
                      type="button"
                      onClick={() => onNavigate('location', loc.id)}
                      className="w-full flex items-center justify-between py-2.5 text-left hover:text-[#2DD4BF] transition-colors group"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-[#F8FAFC] group-hover:text-[#2DD4BF] truncate">
                          {loc.name}
                        </div>
                        <div className="text-[11px] text-[#94A3B8] truncate">
                          {[loc.category, loc.region]
                            .filter(Boolean)
                            .join(' · ') || 'Location'}
                        </div>
                      </div>
                      <MapPin className="h-3.5 w-3.5 text-[#64748B] group-hover:text-[#2DD4BF] shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Google Drive Cloud Auto-Sync & Remembered Account Status */}
          <div className="inzoi-glass-panel overflow-hidden">
            <div className="inzoi-glass-header px-5 py-3 flex items-center justify-between">
              <h3 className="font-display text-xs font-semibold text-[#F8FAFC]">
                Google Drive Auto-Sync
              </h3>
              <span className="text-[11px] font-mono-tabular text-[#2DD4BF]">
                {isAuthenticated
                  ? 'CONNECTED'
                  : rememberedEmail
                    ? 'REMEMBERED'
                    : 'CLOUD'}
              </span>
            </div>
            <div className="p-5 space-y-3">
              {isAuthenticated ? (
                <>
                  <p className="text-xs text-[#CBD5E1] leading-relaxed">
                    Signed in as{' '}
                    <strong className="text-[#F8FAFC]">{userEmail}</strong>.
                    Every edit to Zois, locations, social posts, backgrounds,
                    and photos is automatically saved to your Google Drive.
                  </p>
                  {lastSyncedAt && (
                    <div className="text-[11px] font-mono-tabular text-[#2DD4BF]">
                      Last synced:{' '}
                      {new Date(lastSyncedAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </div>
                  )}
                </>
              ) : rememberedEmail ? (
                <>
                  <p className="text-xs text-[#CBD5E1] leading-relaxed">
                    Welcome back,{' '}
                    <strong className="text-[#F8FAFC]">
                      {rememberedEmail}
                    </strong>
                    . Your account is remembered—resume your Google Drive token
                    in one click to auto-sync your latest edits.
                  </p>
                  <GoogleSignInButton
                    onClick={onGoogleLogin}
                    label={`Resume as ${rememberedEmail}`}
                  />
                </>
              ) : (
                <>
                  <p className="text-xs text-[#94A3B8] leading-relaxed">
                    Connect your Google Drive to automatically save every edit
                    and remember your login across visits and updates.
                  </p>
                  <GoogleSignInButton
                    onClick={onGoogleLogin}
                    label="Sign in with Google Drive"
                  />
                </>
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* Lightbox for Top Submitted Photos */}
      {lightboxPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Submitted Photo Viewer"
        >
          <div className="w-full max-w-3xl inzoi-glass-panel shadow-2xl">
            <div className="inzoi-glass-header flex items-center justify-between px-5 py-3.5">
              <span className="font-display text-sm font-semibold text-[#F8FAFC]">
                {lightboxPhoto.caption}
              </span>
              <button
                type="button"
                onClick={() => setLightboxPhoto(null)}
                aria-label="Close photo viewer"
                className="p-1 text-[#94A3B8] hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="bg-black/80 p-4 flex items-center justify-center max-h-[70vh]">
              <img
                src={lightboxPhoto.imageDataUrl}
                alt={lightboxPhoto.caption}
                referrerPolicy="no-referrer"
                className="max-h-[65vh] max-w-full object-contain border border-white/[0.12]"
              />
            </div>
            <div className="border-t border-white/[0.10] px-5 py-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[#94A3B8]">
              <div className="flex flex-wrap items-center gap-2">
                <span>Tagged:</span>
                {lightboxPhoto.taggedCharacterIds.map((id) => {
                  const name = resolveCharacterName(id);
                  if (!name) return null;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        setLightboxPhoto(null);
                        onNavigate('character', id);
                      }}
                      className="text-[#2DD4BF] hover:underline font-medium"
                    >
                      {name}
                    </button>
                  );
                })}
                {lightboxPhoto.taggedLocationIds.map((id) => {
                  const name = resolveLocationName(id);
                  if (!name) return null;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        setLightboxPhoto(null);
                        onNavigate('location', id);
                      }}
                      className="text-[#2DD4BF] hover:underline font-medium"
                    >
                      {name}
                    </button>
                  );
                })}
              </div>
              <span className="font-mono-tabular">
                {lightboxPhoto.createdAt.slice(0, 10)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

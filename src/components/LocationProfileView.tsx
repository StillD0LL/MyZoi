import React, { useMemo, useState } from 'react';
import {
  CharacterEntry,
  GalleryPhoto,
  ImageCropConfig,
  LocationEntry,
  SocialCommentReply,
  SocialMediaPost,
  SocialPostComment,
} from '../types/codex';
import {
  findBacklinksForEntity,
  formatSocialHandle,
  getSocialPostsForEntity,
} from '../utils/codexLogic';
import { HyperlinkedText } from './HyperlinkedText';
import { SectionRenderer } from './SectionRenderer';
import { PhotoGallerySection } from './PhotoGallerySection';
import { ImageCropperModal } from './ImageCropperModal';
import { AiSocialGenerationParams, SocialFeedView } from './SocialFeedView';
import {
  ArrowLeft,
  BookOpen,
  Camera,
  Edit3,
  Image as ImageIcon,
  Link2,
  MapPin,
  MessageCircle,
  Trash2,
  User,
} from 'lucide-react';

interface LocationProfileViewProps {
  location: LocationEntry;
  characters: CharacterEntry[];
  locations: LocationEntry[];
  photos: GalleryPhoto[];
  socialPosts: SocialMediaPost[];
  autoHyperlinkNames: boolean;
  showLinkPreviews: boolean;
  isGeneratingAi: boolean;
  aiCooldownRemainingSec: number;
  onBack: () => void;
  onEdit: (id: string) => void;
  onDeleteRequest: (location: LocationEntry) => void;
  onUpdateLocationBackground: (
    locationId: string,
    backgroundDataUrl: string,
    rawBackgroundDataUrl?: string,
    backgroundCropConfig?: ImageCropConfig
  ) => void;
  onOpenPhotoUpload: (locationId: string) => void;
  onUpdatePhoto: (photo: GalleryPhoto) => void;
  onDeletePhotoRequest: (photo: GalleryPhoto) => void;
  onCreateSocialPost: (post: SocialMediaPost) => void;
  onDeleteSocialPost: (postId: string) => void;
  onToggleLikeSocialPost: (postId: string) => void;
  onToggleRepostSocialPost: (postId: string) => void;
  onAddSocialComment: (postId: string, comment: SocialPostComment) => void;
  onDeleteSocialComment: (postId: string, commentId: string) => void;
  onAddSocialReply: (
    postId: string,
    commentId: string,
    reply: SocialCommentReply
  ) => void;
  onDeleteSocialReply: (
    postId: string,
    commentId: string,
    replyId: string
  ) => void;
  onTriggerAiSocial: (params: AiSocialGenerationParams) => Promise<void>;
  onNavigate: (type: 'character' | 'location', id: string) => void;
}

export const LocationProfileView: React.FC<LocationProfileViewProps> = ({
  location,
  characters,
  locations,
  photos,
  socialPosts,
  autoHyperlinkNames,
  showLinkPreviews,
  isGeneratingAi,
  aiCooldownRemainingSec,
  onBack,
  onEdit,
  onDeleteRequest,
  onUpdateLocationBackground,
  onOpenPhotoUpload,
  onUpdatePhoto,
  onDeletePhotoRequest,
  onCreateSocialPost,
  onDeleteSocialPost,
  onToggleLikeSocialPost,
  onToggleRepostSocialPost,
  onAddSocialComment,
  onDeleteSocialComment,
  onAddSocialReply,
  onDeleteSocialReply,
  onTriggerAiSocial,
  onNavigate,
}) => {
  const [activeProfileView, setActiveProfileView] = useState<
    'dossier' | 'social'
  >('dossier');
  const [isBgCropperOpen, setIsBgCropperOpen] = useState(false);

  const backlinks = useMemo(
    () =>
      findBacklinksForEntity(
        location.id,
        location.name,
        characters,
        locations
      ),
    [location.id, location.name, characters, locations]
  );

  const entitySocialPosts = useMemo(
    () => getSocialPostsForEntity('location', location.id, socialPosts),
    [location.id, socialPosts]
  );

  const coreLocationRows = useMemo(() => {
    const base = [
      { label: 'Location / Lot Type', value: location.category },
      { label: 'Region / District', value: location.region },
      { label: 'Climate / Atmosphere', value: location.climate },
      { label: 'Key Figures / Faction', value: location.rulerOrFaction },
      { label: 'Era / Coordinates', value: location.eraOrCoordinates },
    ].filter((r) => r.value && r.value.trim().length > 0);

    const custom = location.attributes
      .filter((a) => a.label.trim() || a.value.trim())
      .map((a) => ({ label: a.label, value: a.value }));

    return [...base, ...custom];
  }, [location]);

  return (
    <div className="space-y-6">
      {/* Top Contextual Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.11] pb-4">
        <div className="flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 text-xs font-medium text-[#94A3B8] hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Locations</span>
          </button>

          {/* Encyclopedia Dossier vs Twitter/X Social Feed Switcher */}
          <div
            className="flex items-center border border-white/[0.14] bg-black/70 backdrop-blur-md p-0.5"
            role="tablist"
            aria-label="Location Entry Page Mode"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeProfileView === 'dossier'}
              onClick={() => setActiveProfileView('dossier')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                activeProfileView === 'dossier'
                  ? 'bg-[#2DD4BF] text-[#050608] font-semibold'
                  : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span>Encyclopedia Dossier</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeProfileView === 'social'}
              onClick={() => setActiveProfileView('social')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                activeProfileView === 'social'
                  ? 'bg-[#2DD4BF] text-[#050608] font-semibold'
                  : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              <MessageCircle className="h-3.5 w-3.5" />
              <span>
                Social Feed (X) · {formatSocialHandle(location.name)} (
                {entitySocialPosts.length})
              </span>
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Individual Page Background Upload / Clear directly from Location Entry Page */}
          <button
            type="button"
            onClick={() => setIsBgCropperOpen(true)}
            className="inline-flex items-center gap-1.5 border border-white/[0.14] bg-white/[0.04] backdrop-blur-md px-3 py-1.5 text-xs font-medium text-white hover:border-[#2DD4BF] transition-colors whitespace-nowrap shrink-0"
          >
            <ImageIcon className="h-3.5 w-3.5 text-[#2DD4BF]" />
            <span>
              {location.backgroundDataUrl
                ? 'Change Page Background'
                : 'Set Page Background'}
            </span>
          </button>

          {location.backgroundDataUrl && (
            <button
              type="button"
              onClick={() =>
                onUpdateLocationBackground(
                  location.id,
                  '',
                  undefined,
                  undefined
                )
              }
              aria-label="Reset location page background"
              className="inline-flex items-center gap-1 border border-white/[0.14] bg-white/[0.04] px-2.5 py-1.5 text-xs font-medium text-[#94A3B8] hover:text-[#EF4444] transition-colors whitespace-nowrap shrink-0"
            >
              <span>Reset Bg</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onOpenPhotoUpload(location.id)}
            className="inline-flex items-center gap-1.5 border border-white/[0.14] bg-white/[0.04] backdrop-blur-md px-3 py-1.5 text-xs font-medium text-white hover:border-[#2DD4BF] transition-colors whitespace-nowrap shrink-0"
          >
            <Camera className="h-3.5 w-3.5 text-[#2DD4BF]" />
            <span>Add Photos</span>
          </button>

          <button
            type="button"
            onClick={() => onEdit(location.id)}
            className="inline-flex items-center gap-1.5 border border-white/[0.14] bg-white/[0.04] backdrop-blur-md px-3.5 py-1.5 text-xs font-medium text-white hover:border-[#2DD4BF] transition-colors whitespace-nowrap shrink-0"
          >
            <Edit3 className="h-3.5 w-3.5 text-[#2DD4BF]" />
            <span>Edit Location</span>
          </button>

          <button
            type="button"
            onClick={() => onDeleteRequest(location)}
            aria-label={`Delete location ${location.name}`}
            className="inline-flex items-center gap-1.5 border border-white/[0.14] bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-[#EF4444] hover:bg-[#EF4444]/15 transition-colors whitespace-nowrap shrink-0"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* TWITTER/X-INSPIRED SOCIAL MEDIA PAGE FOR THIS LOCATION */}
      {activeProfileView === 'social' ? (
        <SocialFeedView
          entityType="location"
          location={location}
          characters={characters}
          locations={locations}
          socialPosts={socialPosts}
          autoHyperlinkNames={autoHyperlinkNames}
          showLinkPreviews={showLinkPreviews}
          isGeneratingAi={isGeneratingAi}
          aiCooldownRemainingSec={aiCooldownRemainingSec}
          onCreatePost={onCreateSocialPost}
          onDeletePost={onDeleteSocialPost}
          onToggleLikePost={onToggleLikeSocialPost}
          onToggleRepost={onToggleRepostSocialPost}
          onAddComment={onAddSocialComment}
          onDeleteComment={onDeleteSocialComment}
          onAddReply={onAddSocialReply}
          onDeleteReply={onDeleteSocialReply}
          onTriggerAiSocial={onTriggerAiSocial}
          onNavigate={onNavigate}
        />
      ) : (
        /* Main Two-Column Encyclopedia Layout for Location */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8 space-y-8 order-2 lg:order-1 inzoi-glass-panel p-6 sm:p-8">
            <header className="border-b border-white/[0.10] pb-5">
              <div className="flex flex-wrap items-center gap-2 text-xs text-[#94A3B8] mb-2">
                <span className="font-semibold text-[#2DD4BF] uppercase tracking-wider">
                  {location.category}
                </span>
                {location.region && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{location.region}</span>
                  </>
                )}
                {location.backgroundDataUrl && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="text-[#38BDF8] font-mono-tabular">
                      Custom Location Background Active
                    </span>
                  </>
                )}
              </div>
              <h1 className="font-display text-3xl sm:text-4xl font-bold text-white tracking-tight">
                {location.name}
              </h1>
              {location.subtitle && (
                <p className="mt-1.5 font-editorial text-xl italic text-[#2DD4BF]">
                  {location.subtitle}
                </p>
              )}
              {location.summary && (
                <div className="mt-4 text-[15px] leading-relaxed text-[#CBD5E1] max-w-[72ch] whitespace-pre-line">
                  <HyperlinkedText
                    text={location.summary}
                    characters={characters}
                    locations={locations}
                    autoHyperlinkNames={autoHyperlinkNames}
                    showLinkPreviews={showLinkPreviews}
                    excludeEntityId={location.id}
                    onNavigate={onNavigate}
                  />
                </div>
              )}
            </header>

            {/* Modular Sections */}
            <div className="space-y-8">
              {location.sections.map((sec, idx) => (
                <SectionRenderer
                  key={sec.id}
                  section={sec}
                  index={idx}
                  characters={characters}
                  locations={locations}
                  autoHyperlinkNames={autoHyperlinkNames}
                  showLinkPreviews={showLinkPreviews}
                  excludeEntityId={location.id}
                  onNavigate={onNavigate}
                />
              ))}
            </div>

            {/* Photo & Screenshot Gallery for Location */}
            <PhotoGallerySection
              entityType="location"
              entityId={location.id}
              entityName={location.name}
              photos={photos}
              characters={characters}
              locations={locations}
              onOpenUploadModal={() => onOpenPhotoUpload(location.id)}
              onUpdatePhoto={onUpdatePhoto}
              onDeletePhotoRequest={onDeletePhotoRequest}
              onNavigate={onNavigate}
            />

            {/* Notable Zois & Linked Entries */}
            <div className="mt-10 border-t border-white/[0.10] pt-6">
              <h3 className="font-display text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <Link2 className="h-4 w-4 text-[#2DD4BF]" />
                <span>
                  Associated Zois &amp; Linked Entries ({backlinks.length})
                </span>
              </h3>
              {backlinks.length === 0 ? (
                <p className="text-xs text-[#94A3B8]">
                  No Zois or other locations reference {location.name} yet. Set
                  a Zoi&apos;s Primary Location to{' '}
                  <strong className="text-white">{location.name}</strong> or use{' '}
                  <code className="font-mono-tabular text-[#2DD4BF]">
                    [[{location.name}]]
                  </code>{' '}
                  in any section to link them here.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {backlinks.map((item) => (
                    <button
                      key={`${item.sourceType}-${item.sourceId}`}
                      type="button"
                      onClick={() =>
                        onNavigate(item.sourceType, item.sourceId)
                      }
                      className="flex items-start justify-between inzoi-glass-card p-3.5 text-left hover:border-[#2DD4BF] transition-all group"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          {item.sourceType === 'character' ? (
                            <User className="h-3.5 w-3.5 text-[#2DD4BF] shrink-0" />
                          ) : (
                            <MapPin className="h-3.5 w-3.5 text-[#2DD4BF] shrink-0" />
                          )}
                          <span className="font-display text-sm font-semibold text-white group-hover:text-[#2DD4BF] truncate">
                            {item.sourceName}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-[#94A3B8] truncate">
                          {item.sourceSubtitle} · Via {item.contextLabel}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Gazetteer Infobox */}
          <aside className="lg:col-span-4 inzoi-glass-panel order-1 lg:order-2">
            <div className="inzoi-glass-header px-4 py-3 text-center">
              <h2 className="font-display text-base font-bold text-white">
                {location.name}
              </h2>
              <p className="text-xs text-[#2DD4BF] mt-0.5 font-medium">
                {location.category}
                {location.subtitle ? ` · ${location.subtitle}` : ''}
              </p>
            </div>

            <div className="p-3">
              {location.imageDataUrl ? (
                <div className="relative w-full aspect-[4/3] overflow-hidden bg-black/80 border border-white/[0.11]">
                  <img
                    src={location.imageDataUrl}
                    alt={`${location.name} illustration`}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : (
                <div className="relative w-full aspect-[4/3] flex flex-col items-center justify-center bg-black/70 border border-white/[0.11] p-6 text-center">
                  <MapPin className="h-10 w-10 text-[#2DD4BF]/60 mb-2" />
                  <span className="text-xs text-[#94A3B8]">
                    {location.name}
                  </span>
                </div>
              )}
            </div>

            {/* Quick Social Feed CTA inside Infobox */}
            <div className="px-3 pb-3">
              <button
                type="button"
                onClick={() => setActiveProfileView('social')}
                className="w-full flex items-center justify-between border border-white/[0.12] bg-black/60 px-3 py-2 text-xs text-[#CBD5E1] hover:border-[#2DD4BF] hover:text-[#2DD4BF] transition-colors"
              >
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <MessageCircle className="h-3.5 w-3.5 text-[#2DD4BF]" />
                  <span>Open {formatSocialHandle(location.name)} on X</span>
                </span>
                <span className="font-mono-tabular text-[11px] text-[#94A3B8]">
                  {entitySocialPosts.length} posts
                </span>
              </button>
            </div>

            {coreLocationRows.length > 0 && (
              <div className="border-t border-white/[0.10]">
                <div className="inzoi-glass-header px-4 py-2 text-xs font-semibold text-[#2DD4BF]">
                  Lot &amp; Gazetteer Data
                </div>
                <dl className="divide-y divide-white/[0.08] text-xs">
                  {coreLocationRows.map((row, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-12 px-4 py-2.5 gap-2"
                    >
                      <dt className="col-span-5 font-medium text-[#94A3B8]">
                        {row.label}
                      </dt>
                      <dd className="col-span-7 text-white font-mono-tabular">
                        <HyperlinkedText
                          text={row.value}
                          characters={characters}
                          locations={locations}
                          autoHyperlinkNames={autoHyperlinkNames}
                          showLinkPreviews={showLinkPreviews}
                          excludeEntityId={location.id}
                          onNavigate={onNavigate}
                        />
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </aside>
        </div>
      )}

      {/* Individual Location Background Uploader & Cropper Modal */}
      <ImageCropperModal
        isOpen={isBgCropperOpen}
        initialRawImage={
          location.rawBackgroundDataUrl || location.backgroundDataUrl
        }
        initialConfig={location.backgroundCropConfig}
        defaultAspect="16:9"
        entityName={`${location.name} Page Background`}
        onApply={(croppedDataUrl, rawDataUrl, config) => {
          onUpdateLocationBackground(
            location.id,
            croppedDataUrl,
            rawDataUrl,
            config
          );
          setIsBgCropperOpen(false);
        }}
        onClose={() => setIsBgCropperOpen(false)}
      />
    </div>
  );
};

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
  formatRelationshipDisplay,
  formatSocialHandle,
  getPersonalityTraitMeta,
  getSocialPostsForEntity,
  parsePersonalityTraits,
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

interface CharacterProfileViewProps {
  character: CharacterEntry;
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
  onDeleteRequest: (character: CharacterEntry) => void;
  onUpdateCharacterBackground: (
    characterId: string,
    backgroundDataUrl: string,
    rawBackgroundDataUrl?: string,
    backgroundCropConfig?: ImageCropConfig
  ) => void;
  onUpdateCharacterSocialBanner: (
    characterId: string,
    socialBannerDataUrl: string,
    rawSocialBannerDataUrl?: string,
    socialBannerCropConfig?: ImageCropConfig
  ) => void;
  onTriggerNaturalFollow?: (preferredZoiId?: string) => void;
  onOpenPhotoUpload: (characterId: string) => void;
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

export const CharacterProfileView: React.FC<CharacterProfileViewProps> = ({
  character,
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
  onUpdateCharacterBackground,
  onUpdateCharacterSocialBanner,
  onTriggerNaturalFollow,
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
  // Primary page is the Zoi's Social Feed ('social'), Encyclopedia Dossier is the 2nd page ('dossier')
  const [activeProfileView, setActiveProfileView] = useState<
    'social' | 'dossier'
  >('social');
  const [isBgCropperOpen, setIsBgCropperOpen] = useState(false);

  const backlinks = useMemo(
    () =>
      findBacklinksForEntity(
        character.id,
        character.name,
        characters,
        locations
      ),
    [character.id, character.name, characters, locations]
  );

  const entitySocialPosts = useMemo(
    () => getSocialPostsForEntity('character', character.id, socialPosts),
    [character.id, socialPosts]
  );

  const personalityTags = useMemo(
    () => parsePersonalityTraits(character.personality),
    [character.personality]
  );

  const genderValue = character.gender || character.species || '';
  const relationshipDisplay = formatRelationshipDisplay(
    character.relationshipStatus,
    character.relationshipPartner,
    character.relationships
  );

  const corePersonalRows = useMemo<
    Array<{ label: string; value: string; isTraits?: boolean }>
  >(() => {
    const base: Array<{ label: string; value: string; isTraits?: boolean }> = [
      { label: 'Status', value: character.status || 'Alive' },
      { label: 'Gender', value: genderValue },
      { label: 'Pronouns', value: character.pronouns },
      { label: 'Birth Month', value: character.birthdate },
      { label: 'Age', value: character.age },
      { label: 'Height', value: character.height },
      { label: 'Household Status', value: character.householdStatus || '' },
      { label: 'Relationship Status', value: relationshipDisplay },
      { label: 'Occupation / Life Path', value: character.occupation },
      { label: 'Role / Archetype', value: character.role },
      {
        label: 'Personality / Traits',
        value: character.personality,
        isTraits: true,
      },
      { label: 'Ambition / Desire', value: character.ambition },
      { label: 'Affiliation / Household', value: character.affiliation },
      { label: 'Primary Location', value: character.originLocation },
    ].filter((r) => r.value && r.value.trim().length > 0);

    const custom = character.personalAttributes
      .filter((a) => a.label.trim() || a.value.trim())
      .map((a) => ({ label: a.label, value: a.value }));

    return [...base, ...custom];
  }, [character, genderValue, relationshipDisplay]);

  const renderPortraitElement = (aspectClass: string = 'aspect-[3/4]') => {
    if (character.portraitDataUrl) {
      return (
        <div
          className={`relative w-full ${aspectClass} overflow-hidden bg-black/80 border border-white/[0.11]`}
        >
          <img
            src={character.portraitDataUrl}
            alt={`${character.name} full portrait`}
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover"
          />
        </div>
      );
    }

    const initials =
      character.name
        .split(/\s+/)
        .map((w) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase() || 'Z';

    return (
      <div
        className={`relative w-full ${aspectClass} flex flex-col items-center justify-center bg-black/70 border border-white/[0.11] p-6 text-center`}
      >
        <div className="flex h-20 w-20 items-center justify-center border border-[#2DD4BF]/40 bg-white/[0.04] font-display text-2xl font-bold text-[#2DD4BF]">
          {initials}
        </div>
        <span className="mt-3 text-xs text-[#94A3B8]">{character.name}</span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Contextual Action & View Switcher Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.11] pb-4">
        <div className="flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 text-xs font-medium text-[#94A3B8] hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Zois</span>
          </button>

          {/* 1st Page: Social Feed (X) | 2nd Page: Encyclopedia Dossier */}
          <div
            className="flex items-center border border-white/[0.14] bg-black/70 backdrop-blur-md p-0.5"
            role="tablist"
            aria-label="Zoi Entry Page Mode"
          >
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
                Social Feed (X) · {formatSocialHandle(character.name)} (
                {entitySocialPosts.length})
              </span>
            </button>
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
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsBgCropperOpen(true)}
            className="inline-flex items-center gap-1.5 border border-white/[0.14] bg-white/[0.04] backdrop-blur-md px-3 py-1.5 text-xs font-medium text-white hover:border-[#2DD4BF] transition-colors whitespace-nowrap shrink-0"
          >
            <ImageIcon className="h-3.5 w-3.5 text-[#2DD4BF]" />
            <span>
              {character.backgroundDataUrl
                ? 'Change Page Background'
                : 'Set Page Background'}
            </span>
          </button>

          {character.backgroundDataUrl && (
            <button
              type="button"
              onClick={() =>
                onUpdateCharacterBackground(
                  character.id,
                  '',
                  undefined,
                  undefined
                )
              }
              aria-label="Reset Zoi page background"
              className="inline-flex items-center gap-1 border border-white/[0.14] bg-white/[0.04] px-2.5 py-1.5 text-xs font-medium text-[#94A3B8] hover:text-[#EF4444] transition-colors whitespace-nowrap shrink-0"
            >
              <span>Reset Bg</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onOpenPhotoUpload(character.id)}
            className="inline-flex items-center gap-1.5 border border-white/[0.14] bg-white/[0.04] backdrop-blur-md px-3 py-1.5 text-xs font-medium text-white hover:border-[#2DD4BF] transition-colors whitespace-nowrap shrink-0"
          >
            <Camera className="h-3.5 w-3.5 text-[#2DD4BF]" />
            <span>Add Photos</span>
          </button>

          <button
            type="button"
            onClick={() => onEdit(character.id)}
            className="inline-flex items-center gap-1.5 border border-white/[0.14] bg-white/[0.04] backdrop-blur-md px-3.5 py-1.5 text-xs font-medium text-white hover:border-[#2DD4BF] transition-colors whitespace-nowrap shrink-0"
          >
            <Edit3 className="h-3.5 w-3.5 text-[#2DD4BF]" />
            <span>Edit Zoi</span>
          </button>

          <button
            type="button"
            onClick={() => onDeleteRequest(character)}
            aria-label={`Delete Zoi ${character.name}`}
            className="inline-flex items-center gap-1.5 border border-white/[0.14] bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-[#EF4444] hover:bg-[#EF4444]/15 transition-colors whitespace-nowrap shrink-0"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* 1ST PAGE (PRIMARY): TWITTER/X-INSPIRED SOCIAL MEDIA PAGE FOR THIS ZOI */}
      {activeProfileView === 'social' ? (
        <SocialFeedView
          entityType="character"
          character={character}
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
          onUpdateSocialBanner={(bannerUrl, rawBannerUrl, bannerCfg) =>
            onUpdateCharacterSocialBanner(
              character.id,
              bannerUrl,
              rawBannerUrl,
              bannerCfg
            )
          }
          onTriggerNaturalFollow={onTriggerNaturalFollow}
          onNavigate={onNavigate}
          onOpenDossier={() => setActiveProfileView('dossier')}
        />
      ) : (
        /* 2ND PAGE: ENCYCLOPEDIA DOSSIER — inZOI Wiki Article + Infobox */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Main Encyclopedia Article Column */}
          <div className="lg:col-span-8 space-y-8 order-2 lg:order-1 inzoi-glass-panel p-6 sm:p-8">
            <header className="border-b border-white/[0.10] pb-5">
              <div className="flex flex-wrap items-center gap-2 text-xs text-[#94A3B8] mb-2">
                <span className="text-[#2DD4BF] font-semibold uppercase tracking-wider">
                  Zoi Dossier
                </span>
                {(character.occupation || character.role) && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{character.occupation || character.role}</span>
                  </>
                )}
                {genderValue && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{genderValue}</span>
                  </>
                )}
                {character.householdStatus && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{character.householdStatus} Household</span>
                  </>
                )}
                {character.affiliation && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{character.affiliation}</span>
                  </>
                )}
              </div>
              <h1 className="font-display text-3xl sm:text-4xl font-bold text-white tracking-tight">
                {character.name}
              </h1>
              {character.title && (
                <p className="mt-1.5 font-editorial text-xl italic text-[#2DD4BF]">
                  {character.title}
                </p>
              )}
              {character.summary && (
                <div className="mt-4 text-[15px] leading-relaxed text-[#CBD5E1] max-w-[72ch] whitespace-pre-line">
                  <HyperlinkedText
                    text={character.summary}
                    characters={characters}
                    locations={locations}
                    autoHyperlinkNames={autoHyperlinkNames}
                    showLinkPreviews={showLinkPreviews}
                    excludeEntityId={character.id}
                    onNavigate={onNavigate}
                  />
                </div>
              )}
            </header>

            {character.sections.length >= 2 && (
              <nav
                aria-label="Profile Table of Contents"
                className="inzoi-glass-card p-4 max-w-sm"
              >
                <div className="text-xs font-semibold text-white mb-2 border-b border-white/[0.10] pb-1.5">
                  Contents
                </div>
                <ol className="space-y-1 text-xs text-[#94A3B8]">
                  {character.sections.map((sec, idx) => (
                    <li key={sec.id} className="flex items-baseline gap-2">
                      <span className="font-mono-tabular text-[#2DD4BF]">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <a
                        href={`#section-${sec.id}`}
                        className="text-[#38BDF8] hover:text-[#60A5FA] transition-colors"
                      >
                        {sec.title || 'Untitled Section'}
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
            )}

            <div className="space-y-8">
              {character.sections.map((sec, idx) => (
                <SectionRenderer
                  key={sec.id}
                  section={sec}
                  index={idx}
                  characters={characters}
                  locations={locations}
                  autoHyperlinkNames={autoHyperlinkNames}
                  showLinkPreviews={showLinkPreviews}
                  excludeEntityId={character.id}
                  onNavigate={onNavigate}
                />
              ))}
            </div>

            <PhotoGallerySection
              entityType="character"
              entityId={character.id}
              entityName={character.name}
              photos={photos}
              characters={characters}
              locations={locations}
              onOpenUploadModal={() => onOpenPhotoUpload(character.id)}
              onUpdatePhoto={onUpdatePhoto}
              onDeletePhotoRequest={onDeletePhotoRequest}
              onNavigate={onNavigate}
            />

            {/* Backlinks Footer */}
            <div className="mt-10 border-t border-white/[0.10] pt-6">
              <h3 className="font-display text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <Link2 className="h-4 w-4 text-[#38BDF8]" />
                <span>Referenced In ({backlinks.length})</span>
              </h3>
              {backlinks.length === 0 ? (
                <p className="text-xs text-[#94A3B8]">
                  No other Zois or locations reference {character.name} yet. Use{' '}
                  <code className="font-mono-tabular text-[#38BDF8]">
                    [[{character.name}]]
                  </code>{' '}
                  in any entry to link here.
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
                      className="flex items-start justify-between inzoi-glass-card p-3.5 text-left hover:border-[#38BDF8] transition-all group"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          {item.sourceType === 'character' ? (
                            <User className="h-3.5 w-3.5 text-[#38BDF8] shrink-0" />
                          ) : (
                            <MapPin className="h-3.5 w-3.5 text-[#38BDF8] shrink-0" />
                          )}
                          <span className="font-display text-sm font-semibold text-[#38BDF8] group-hover:text-[#60A5FA] underline decoration-[#38BDF8]/50 truncate">
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

          {/* Right Wikipedia-Style Portrait & Quick Status Infobox */}
          <aside className="lg:col-span-4 inzoi-glass-panel order-1 lg:order-2">
            <div className="inzoi-glass-header px-4 py-3 text-center">
              <h2 className="font-display text-base font-bold text-white">
                {character.name}
              </h2>
              {character.title && (
                <p className="text-xs text-[#2DD4BF] mt-0.5">
                  {character.title}
                </p>
              )}
            </div>

            <div className="p-3">{renderPortraitElement('aspect-[3/4]')}</div>

            {/* Quick Social Feed CTA inside Infobox */}
            <div className="px-3 pb-3">
              <button
                type="button"
                onClick={() => setActiveProfileView('social')}
                className="w-full flex items-center justify-between border border-white/[0.12] bg-black/60 px-3 py-2 text-xs text-[#CBD5E1] hover:border-[#2DD4BF] hover:text-[#2DD4BF] transition-colors"
              >
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <MessageCircle className="h-3.5 w-3.5 text-[#2DD4BF]" />
                  <span>Open {formatSocialHandle(character.name)} on X</span>
                </span>
                <span className="font-mono-tabular text-[11px] text-[#94A3B8]">
                  {entitySocialPosts.length} posts
                </span>
              </button>
            </div>

            {corePersonalRows.length > 0 && (
              <div className="border-t border-white/[0.10]">
                <div className="inzoi-glass-header px-4 py-2 text-xs font-semibold text-[#2DD4BF]">
                  Personal Information
                </div>
                <dl className="divide-y divide-white/[0.08] text-xs">
                  {corePersonalRows.map((row, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-12 px-4 py-2.5 gap-2"
                    >
                      <dt className="col-span-5 font-medium text-[#94A3B8]">
                        {row.label}
                      </dt>
                      <dd className="col-span-7 text-white font-mono-tabular">
                        {row.isTraits && personalityTags.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {personalityTags.map((tag) => {
                              const meta = getPersonalityTraitMeta(tag);
                              const badgeColor =
                                meta.category === 'positive'
                                  ? 'border-[#2DD4BF]/50 bg-[#2DD4BF]/12 text-[#5EEAD4]'
                                  : meta.category === 'negative'
                                    ? 'border-[#F87171]/50 bg-[#F87171]/12 text-[#FCA5A5]'
                                    : meta.category === 'innocent'
                                      ? 'border-[#38BDF8]/50 bg-[#38BDF8]/12 text-[#7DD3FC]'
                                      : meta.category === 'suggestive'
                                        ? 'border-[#C084FC]/50 bg-[#C084FC]/12 text-[#D8B4FE]'
                                        : 'border-white/[0.18] bg-white/[0.06] text-[#E2E8F0]';
                              return (
                                <span
                                  key={tag}
                                  className={`inline-block border px-1.5 py-0.5 text-[11px] font-medium ${badgeColor}`}
                                >
                                  {tag}
                                </span>
                              );
                            })}
                          </div>
                        ) : (
                          <HyperlinkedText
                            text={row.value}
                            characters={characters}
                            locations={locations}
                            autoHyperlinkNames={autoHyperlinkNames}
                            showLinkPreviews={showLinkPreviews}
                            excludeEntityId={character.id}
                            onNavigate={onNavigate}
                          />
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </aside>
        </div>
      )}

      {/* Individual Zoi Background Uploader & Cropper Modal */}
      <ImageCropperModal
        isOpen={isBgCropperOpen}
        initialRawImage={
          character.rawBackgroundDataUrl || character.backgroundDataUrl
        }
        initialConfig={character.backgroundCropConfig}
        defaultAspect="16:9"
        entityName={`${character.name} Page Background`}
        onApply={(croppedDataUrl, rawDataUrl, config) => {
          onUpdateCharacterBackground(
            character.id,
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


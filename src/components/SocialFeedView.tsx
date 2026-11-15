import React, { useMemo, useState } from 'react';
import {
  CharacterEntry,
  ImageCropConfig,
  LocationEntry,
  SocialCommentReply,
  SocialMediaPost,
  SocialPostComment,
} from '../types/codex';
import {
  formatRelationshipDisplay,
  formatSocialHandle,
  getFollowersForZoi,
  getFollowingForZoi,
  getPersonalityTraitMeta,
  getSocialPostsForEntity,
  parsePersonalityTraits,
  pickWeightedCommenterZoi,
} from '../utils/codexLogic';
import { HyperlinkedText } from './HyperlinkedText';
import { ImageCropperModal } from './ImageCropperModal';
import {
  BookOpen,
  Calendar,
  Clock,
  CornerDownRight,
  Heart,
  Image as ImageIcon,
  MapPin,
  MessageCircle,
  Repeat2,
  Send,
  Sparkles,
  Trash2,
  User,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react';

export interface AiSocialGenerationParams {
  mode: 'post' | 'comment' | 'reply';
  pageEntityType: 'character' | 'location';
  pageEntityId: string;
  actingEntityType?: 'character' | 'location';
  actingEntityId?: string;
  postId?: string;
  commentId?: string;
}

interface SocialFeedViewProps {
  entityType: 'character' | 'location';
  character?: CharacterEntry;
  location?: LocationEntry;
  characters: CharacterEntry[];
  locations: LocationEntry[];
  socialPosts: SocialMediaPost[];
  autoHyperlinkNames: boolean;
  showLinkPreviews: boolean;
  isGeneratingAi: boolean;
  aiCooldownRemainingSec: number;
  onCreatePost: (post: SocialMediaPost) => void;
  onDeletePost: (postId: string) => void;
  onToggleLikePost: (postId: string) => void;
  onToggleRepost: (postId: string) => void;
  onAddComment: (postId: string, comment: SocialPostComment) => void;
  onDeleteComment: (postId: string, commentId: string) => void;
  onAddReply: (
    postId: string,
    commentId: string,
    reply: SocialCommentReply
  ) => void;
  onDeleteReply: (postId: string, commentId: string, replyId: string) => void;
  onTriggerAiSocial: (params: AiSocialGenerationParams) => Promise<void>;
  onUpdateSocialBanner?: (
    socialBannerDataUrl: string,
    rawSocialBannerDataUrl?: string,
    socialBannerCropConfig?: ImageCropConfig
  ) => void;
  onTriggerNaturalFollow?: (preferredZoiId?: string) => void;
  onOpenDossier?: () => void;
  onNavigate: (type: 'character' | 'location', id: string) => void;
}

export const SocialFeedView: React.FC<SocialFeedViewProps> = ({
  entityType,
  character,
  location,
  characters,
  locations,
  socialPosts,
  autoHyperlinkNames,
  showLinkPreviews,
  isGeneratingAi,
  aiCooldownRemainingSec,
  onCreatePost,
  onDeletePost,
  onToggleLikePost,
  onToggleRepost,
  onDeleteComment,
  onDeleteReply,
  onTriggerAiSocial,
  onUpdateSocialBanner,
  onTriggerNaturalFollow,
  onOpenDossier,
  onNavigate,
}) => {
  const [isBannerCropperOpen, setIsBannerCropperOpen] = useState(false);
  const [newPostText, setNewPostText] = useState('');

  const entityId =
    entityType === 'character' ? character?.id || '' : location?.id || '';
  const entityName =
    entityType === 'character'
      ? character?.name || 'Zoi'
      : location?.name || 'Location';
  const entityHandle = formatSocialHandle(entityName);
  const entityAvatar =
    entityType === 'character'
      ? character?.portraitDataUrl || ''
      : location?.imageDataUrl || '';

  // Dedicated social media profile banner image (strictly separate from backgroundDataUrl)
  const socialBannerUrl =
    entityType === 'character'
      ? character?.socialBannerDataUrl || ''
      : location?.socialBannerDataUrl || '';
  const rawSocialBannerUrl =
    entityType === 'character'
      ? character?.rawSocialBannerDataUrl || character?.socialBannerDataUrl || ''
      : location?.rawSocialBannerDataUrl || location?.socialBannerDataUrl || '';
  const socialBannerCropConfig =
    entityType === 'character'
      ? character?.socialBannerCropConfig
      : location?.socialBannerCropConfig;

  const entitySubtitle =
    entityType === 'character'
      ? [
          character?.age,
          character?.occupation || character?.role,
          character?.title,
        ]
          .filter(Boolean)
          .join(' · ') || 'Zoi Resident'
      : [location?.category, location?.region].filter(Boolean).join(' · ') ||
        'City Lot';
  const entityBio =
    entityType === 'character'
      ? character?.summary || ''
      : location?.summary || '';

  const characterTraits = useMemo(
    () =>
      entityType === 'character'
        ? parsePersonalityTraits(character?.personality)
        : [],
    [entityType, character?.personality]
  );

  const entityPosts = useMemo(
    () => getSocialPostsForEntity(entityType, entityId, socialPosts),
    [entityType, entityId, socialPosts]
  );

  // Following & Followers lists for Zoi pages
  const followingZois = useMemo(
    () =>
      entityType === 'character' && character
        ? getFollowingForZoi(character, characters)
        : [],
    [entityType, character, characters]
  );

  const followerZois = useMemo(
    () =>
      entityType === 'character' && character
        ? getFollowersForZoi(character.id, characters)
        : [],
    [entityType, character, characters]
  );

  const otherZois = useMemo(
    () => characters.filter((c) => c.id !== entityId),
    [characters, entityId]
  );

  const resolveAvatarByAuthor = (
    authorType: 'character' | 'location',
    authorId: string
  ): string => {
    if (authorType === 'character') {
      return characters.find((c) => c.id === authorId)?.portraitDataUrl || '';
    }
    return locations.find((l) => l.id === authorId)?.imageDataUrl || '';
  };

  const handlePublishManualPost = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newPostText.trim();
    if (!trimmed) return;

    const post: SocialMediaPost = {
      id: `spost-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      pageEntityType: entityType,
      pageEntityId: entityId,
      authorType: entityType,
      authorId: entityId,
      authorName: entityName,
      authorHandle: entityHandle,
      content: trimmed,
      likesCount: 1,
      repostsCount: 0,
      isAiGenerated: false,
      comments: [],
      createdAt: new Date().toISOString(),
    };
    onCreatePost(post);
    setNewPostText('');
  };

  const handleSparkAutoComment = (post: SocialMediaPost) => {
    const existingCommenterIds = post.comments.map((c) => c.authorId);
    const picked = pickWeightedCommenterZoi(
      entityId,
      characters,
      existingCommenterIds
    );
    const actingType = picked ? 'character' : entityType;
    const actingId = picked ? picked.zoi.id : entityId;

    void onTriggerAiSocial({
      mode: 'comment',
      pageEntityType: entityType,
      pageEntityId: entityId,
      actingEntityType: actingType,
      actingEntityId: actingId,
      postId: post.id,
    });
  };

  const totalCommentsCount = useMemo(
    () =>
      entityPosts.reduce(
        (acc, p) =>
          acc +
          p.comments.length +
          p.comments.reduce((rAcc, c) => rAcc + c.replies.length, 0),
        0
      ),
    [entityPosts]
  );

  const relationshipText = character
    ? formatRelationshipDisplay(
        character.relationshipStatus,
        character.relationshipPartner,
        character.relationships
      )
    : '';

  return (
    <div className="mx-auto max-w-4xl inzoi-glass-panel overflow-hidden">
      {/* Twitter/X Inspired Profile Banner Header (Separate from Entry Page Background) */}
      <div className="relative h-40 sm:h-48 w-full bg-black/80 border-b border-white/[0.11] overflow-hidden group">
        {socialBannerUrl ? (
          <>
            <img
              src={socialBannerUrl}
              alt={`${entityName} social media banner`}
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#050608] via-black/30 to-transparent" />
          </>
        ) : (
          <div className="h-full w-full bg-gradient-to-r from-[#070B12] via-[#0B1622] to-[#050608] flex items-center justify-between px-8">
            <div className="text-xs font-mono-tabular text-[#64748B]">
              Dedicated Social Media Banner (Separate from Page Background)
            </div>
            <span className="font-mono-tabular text-xs uppercase tracking-widest text-[#2DD4BF]/40">
              ZoiNet · Primary Social Feed
            </span>
          </div>
        )}

        {/* Social Media Banner Upload / Reset Controls */}
        {onUpdateSocialBanner && (
          <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsBannerCropperOpen(true)}
              className="inline-flex items-center gap-1.5 border border-white/[0.18] bg-black/75 backdrop-blur-md px-3 py-1.5 text-xs font-medium text-white hover:border-[#2DD4BF] hover:text-[#2DD4BF] transition-colors"
            >
              <ImageIcon className="h-3.5 w-3.5 text-[#2DD4BF]" />
              <span>
                {socialBannerUrl
                  ? 'Change Social Banner'
                  : 'Upload Social Banner'}
              </span>
            </button>

            {socialBannerUrl && (
              <button
                type="button"
                onClick={() =>
                  onUpdateSocialBanner('', undefined, undefined)
                }
                aria-label="Reset social media banner"
                className="inline-flex items-center gap-1 border border-white/[0.18] bg-black/75 backdrop-blur-md px-2.5 py-1.5 text-xs font-medium text-[#94A3B8] hover:text-[#EF4444] transition-colors"
              >
                <span>Reset Banner</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Profile Identity Strip */}
      <div className="px-6 pb-5 border-b border-white/[0.11] relative">
        <div className="flex flex-wrap items-end justify-between gap-4 -mt-12 sm:-mt-14 mb-3">
          <div className="h-24 w-24 sm:h-28 sm:w-28 border-2 border-[#2DD4BF] bg-[#050608] overflow-hidden shrink-0 shadow-xl">
            {entityAvatar ? (
              <img
                src={entityAvatar}
                alt={entityName}
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center bg-black/90 text-[#2DD4BF] font-display text-2xl font-bold">
                {entityName.slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>

          {/* Shared AI Cooldown Status, Encyclopedia Dossier Page 2 Link & AI Post Trigger */}
          <div className="flex flex-wrap items-center gap-2">
            {onOpenDossier && (
              <button
                type="button"
                onClick={onOpenDossier}
                className="inline-flex items-center gap-1.5 border border-white/[0.16] bg-black/75 px-3 py-1.5 text-xs font-medium text-[#38BDF8] hover:border-[#38BDF8] hover:text-[#60A5FA] transition-colors whitespace-nowrap shrink-0"
              >
                <BookOpen className="h-3.5 w-3.5" />
                <span>Encyclopedia Dossier (2nd Page)</span>
              </button>
            )}

            <span className="text-[11px] font-mono-tabular text-[#94A3B8] flex items-center gap-1.5 border border-white/[0.10] bg-black/60 px-2.5 py-1.5">
              <Clock className="h-3 w-3 text-[#2DD4BF]" />
              <span>
                {aiCooldownRemainingSec > 0
                  ? `Shared AI Cooldown: ${aiCooldownRemainingSec}s`
                  : 'Shared Site AI Ready'}
              </span>
            </span>

            <button
              type="button"
              disabled={isGeneratingAi}
              onClick={() =>
                void onTriggerAiSocial({
                  mode: 'post',
                  pageEntityType: entityType,
                  pageEntityId: entityId,
                })
              }
              className="inline-flex items-center gap-1.5 bg-[#2DD4BF] px-3.5 py-1.5 text-xs font-semibold text-[#050608] hover:bg-[#5EEAD4] disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>
                {isGeneratingAi
                  ? 'Drafting Post...'
                  : `Generate Post as ${entityName}`}
              </span>
            </button>
          </div>
        </div>

        <div className="space-y-2.5">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-xl sm:text-2xl font-bold text-white">
                {entityName}
              </h2>
              <span className="text-[11px] font-mono-tabular uppercase tracking-wider text-[#2DD4BF] border border-[#2DD4BF]/40 bg-[#2DD4BF]/10 px-1.5 py-0.5">
                {entityType === 'character' ? 'Verified Zoi' : location?.category}
              </span>
            </div>
            <div className="text-xs font-mono-tabular text-[#94A3B8]">
              {entityHandle} · {entitySubtitle}
            </div>
          </div>

          {entityBio && (
            <p className="text-sm text-[#E2E8F0] leading-relaxed max-w-2xl">
              <HyperlinkedText
                text={entityBio}
                characters={characters}
                locations={locations}
                autoHyperlinkNames={autoHyperlinkNames}
                showLinkPreviews={showLinkPreviews}
                excludeEntityId={entityId}
                onNavigate={onNavigate}
              />
            </p>
          )}

          {characterTraits.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              {characterTraits.map((trait) => {
                const meta = getPersonalityTraitMeta(trait);
                return (
                  <span
                    key={trait}
                    className={`px-2 py-0.5 text-[11px] border ${meta.badgeClass}`}
                  >
                    {trait}
                  </span>
                );
              })}
            </div>
          )}

          {/* Metadata Line (Location, Relationship, Birth Month, Following/Followers, Posts Count) */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-1 text-xs text-[#94A3B8]">
            {entityType === 'character' && character?.originLocation && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-[#38BDF8]" />
                <HyperlinkedText
                  text={character.originLocation}
                  characters={characters}
                  locations={locations}
                  autoHyperlinkNames={autoHyperlinkNames}
                  showLinkPreviews={showLinkPreviews}
                  excludeEntityId={entityId}
                  onNavigate={onNavigate}
                />
              </span>
            )}
            {entityType === 'character' && character?.birthdate && (
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-[#2DD4BF]" />
                <span>Birth Month: {character.birthdate}</span>
              </span>
            )}
            {entityType === 'character' && relationshipText && (
              <span className="inline-flex items-center gap-1">
                <Heart className="h-3.5 w-3.5 text-[#2DD4BF]" />
                <HyperlinkedText
                  text={relationshipText}
                  characters={characters}
                  locations={locations}
                  autoHyperlinkNames={autoHyperlinkNames}
                  showLinkPreviews={showLinkPreviews}
                  excludeEntityId={entityId}
                  onNavigate={onNavigate}
                />
              </span>
            )}
            {entityType === 'character' && (
              <>
                <span className="font-mono-tabular text-white font-semibold">
                  {followingZois.length}{' '}
                  <span className="font-normal text-[#94A3B8]">Following</span>
                </span>
                <span className="font-mono-tabular text-white font-semibold">
                  {followerZois.length}{' '}
                  <span className="font-normal text-[#94A3B8]">Followers</span>
                </span>
              </>
            )}
            <span className="font-mono-tabular text-white font-semibold">
              {entityPosts.length}{' '}
              <span className="font-normal text-[#94A3B8]">Posts</span>
            </span>
            <span className="font-mono-tabular text-white font-semibold">
              {totalCommentsCount}{' '}
              <span className="font-normal text-[#94A3B8]">
                Auto-Comments &amp; Replies
              </span>
            </span>
          </div>

          {/* Natural Zoi Following Connections Panel */}
          {entityType === 'character' && (
            <div className="mt-3 border border-white/[0.10] bg-black/55 p-3.5 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs">
                  <Users className="h-3.5 w-3.5 text-[#2DD4BF]" />
                  <span className="font-semibold text-white">
                    ZoiNet Social Circle
                  </span>
                  <span className="text-[11px] text-[#94A3B8]">
                    · Zois naturally follow each other, boosting their chance of
                    commenting and posting about one another
                  </span>
                </div>

                {onTriggerNaturalFollow && otherZois.length > 0 && (
                  <button
                    type="button"
                    onClick={() => onTriggerNaturalFollow(entityId)}
                    className="inline-flex items-center gap-1 border border-[#2DD4BF]/50 bg-[#2DD4BF]/12 px-2.5 py-1 text-[11px] font-semibold text-[#2DD4BF] hover:bg-[#2DD4BF] hover:text-[#050608] transition-colors whitespace-nowrap shrink-0"
                  >
                    <UserPlus className="h-3 w-3" />
                    <span>Spark Natural Follow</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
                <div className="space-y-1">
                  <div className="text-[11px] font-mono-tabular text-[#94A3B8] flex items-center gap-1">
                    <UserCheck className="h-3 w-3 text-[#2DD4BF]" />
                    <span>Following ({followingZois.length})</span>
                  </div>
                  {followingZois.length === 0 ? (
                    <p className="text-[11px] text-[#64748B]">
                      Not following any Zois yet — connections form naturally over
                      time.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {followingZois.map((target) => (
                        <button
                          key={target.id}
                          type="button"
                          onClick={() => onNavigate('character', target.id)}
                          className="inline-flex items-center gap-1 border border-[#38BDF8]/40 bg-[#38BDF8]/10 px-2 py-0.5 text-[11px] font-medium text-[#38BDF8] hover:bg-[#38BDF8]/20 transition-colors"
                        >
                          <span>{target.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="text-[11px] font-mono-tabular text-[#94A3B8] flex items-center gap-1">
                    <Users className="h-3 w-3 text-[#38BDF8]" />
                    <span>Followers ({followerZois.length})</span>
                  </div>
                  {followerZois.length === 0 ? (
                    <p className="text-[11px] text-[#64748B]">
                      No followers yet — other Zois will discover {entityName} on
                      the city feed.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {followerZois.map((follower) => (
                        <button
                          key={follower.id}
                          type="button"
                          onClick={() => onNavigate('character', follower.id)}
                          className="inline-flex items-center gap-1 border border-[#2DD4BF]/40 bg-[#2DD4BF]/10 px-2 py-0.5 text-[11px] font-medium text-[#2DD4BF] hover:bg-[#2DD4BF]/20 transition-colors"
                        >
                          <span>{follower.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Compose New Post Box (As Page Owner) */}
      <form
        onSubmit={handlePublishManualPost}
        className="p-5 border-b border-white/[0.11] bg-black/50 space-y-3"
      >
        <div className="flex items-start gap-3.5">
          <div className="h-10 w-10 border border-white/[0.14] bg-black/80 overflow-hidden shrink-0">
            {entityAvatar ? (
              <img
                src={entityAvatar}
                alt={entityName}
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-xs font-bold text-[#2DD4BF]">
                {entityName.slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>

          <div className="flex-1 space-y-2.5">
            <textarea
              rows={3}
              value={newPostText}
              onChange={(e) => setNewPostText(e.target.value)}
              placeholder={`What's happening with ${entityName}? Use [[Zoi Name]] or [[Location Name]] to tag entries...`}
              aria-label={`Write a post as ${entityName}`}
              className="w-full border border-white/[0.14] bg-black/70 p-3 text-sm text-white placeholder-[#64748B] focus:border-[#2DD4BF] focus:outline-none"
            />

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {characters.length > 1 && (
                  <select
                    aria-label="Mention a Zoi in post"
                    value=""
                    onChange={(e) => {
                      if (e.target.value) {
                        setNewPostText((prev) =>
                          `${prev}${prev.endsWith(' ') || !prev ? '' : ' '}[[${e.target.value}]] `
                        );
                      }
                    }}
                    className="border border-white/[0.14] bg-black/75 px-2.5 py-1 text-xs text-[#2DD4BF]"
                  >
                    <option value="">+ Mention Zoi...</option>
                    {characters
                      .filter((c) => c.id !== entityId)
                      .map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                )}

                {locations.length > 0 && (
                  <select
                    aria-label="Mention a Location in post"
                    value=""
                    onChange={(e) => {
                      if (e.target.value) {
                        setNewPostText((prev) =>
                          `${prev}${prev.endsWith(' ') || !prev ? '' : ' '}[[${e.target.value}]] `
                        );
                      }
                    }}
                    className="border border-white/[0.14] bg-black/75 px-2.5 py-1 text-xs text-[#2DD4BF]"
                  >
                    <option value="">+ Mention Location...</option>
                    {locations.map((l) => (
                      <option key={l.id} value={l.name}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={!newPostText.trim()}
                  className="inline-flex items-center gap-1.5 bg-[#2DD4BF] px-4 py-1.5 text-xs font-semibold text-[#050608] hover:bg-[#5EEAD4] disabled:opacity-40 transition-colors whitespace-nowrap shrink-0"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Post</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* Timeline Feed */}
      <div className="divide-y divide-white/[0.10]">
        {entityPosts.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <MessageCircle className="mx-auto h-7 w-7 text-[#2DD4BF]/75" />
            <h3 className="font-display text-base font-semibold text-white">
              No Posts on {entityName}&apos;s Feed Yet
            </h3>
            <p className="text-xs text-[#94A3B8] max-w-md mx-auto leading-relaxed">
              {entityName} will automatically populate this feed with posts over
              time, or you can post above. Comments from other Zois (especially
              followers) and replies are generated automatically.
            </p>
          </div>
        ) : (
          entityPosts.map((post) => (
            <article
              key={post.id}
              className="p-5 sm:p-6 space-y-4 hover:bg-white/[0.02] transition-colors"
            >
              {/* Post Author Row */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 border border-white/[0.14] bg-black/80 overflow-hidden shrink-0">
                    {entityAvatar ? (
                      <img
                        src={entityAvatar}
                        alt={post.authorName}
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-xs font-bold text-[#2DD4BF]">
                        {post.authorName.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-display text-sm font-bold text-white">
                        {post.authorName}
                      </span>
                      <span className="text-xs font-mono-tabular text-[#94A3B8]">
                        {post.authorHandle}
                      </span>
                      <span className="text-xs text-[#64748B]">·</span>
                      <time
                        dateTime={post.createdAt}
                        className="text-xs font-mono-tabular text-[#64748B]"
                      >
                        {new Date(post.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}{' '}
                        · {post.createdAt.slice(0, 10)}
                      </time>
                      {post.isAiGenerated && (
                        <span className="text-[10px] font-mono-tabular text-[#2DD4BF] border border-[#2DD4BF]/30 bg-[#2DD4BF]/10 px-1.5 py-0.5">
                          Auto-Zoi
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onDeletePost(post.id)}
                  aria-label="Delete post"
                  className="p-1 text-[#64748B] hover:text-[#EF4444] transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Post Body */}
              <div className="text-[15px] text-[#F1F5F9] leading-relaxed whitespace-pre-line pl-0 sm:pl-13">
                <HyperlinkedText
                  text={post.content}
                  characters={characters}
                  locations={locations}
                  autoHyperlinkNames={autoHyperlinkNames}
                  showLinkPreviews={showLinkPreviews}
                  onNavigate={onNavigate}
                />
              </div>

              {/* Post Interaction Metrics Bar */}
              <div className="flex flex-wrap items-center justify-between gap-4 pl-0 sm:pl-13 pt-1 text-xs text-[#94A3B8]">
                <div className="flex flex-wrap items-center gap-6">
                  <span className="inline-flex items-center gap-1.5 font-mono-tabular">
                    <MessageCircle className="h-3.5 w-3.5 text-[#2DD4BF]" />
                    <span>{post.comments.length} Auto-Comments</span>
                  </span>

                  <button
                    type="button"
                    onClick={() => onToggleRepost(post.id)}
                    className="inline-flex items-center gap-1.5 font-mono-tabular hover:text-[#2DD4BF] transition-colors"
                  >
                    <Repeat2 className="h-3.5 w-3.5" />
                    <span>{post.repostsCount} Reposts</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onToggleLikePost(post.id)}
                    className="inline-flex items-center gap-1.5 font-mono-tabular hover:text-[#F43F5E] transition-colors"
                  >
                    <Heart className="h-3.5 w-3.5 text-[#F43F5E]" />
                    <span>{post.likesCount} Likes</span>
                  </button>
                </div>

                {/* Automatic Comment Trigger (Weighted by Followers — no manual commenting as other Zois) */}
                {otherZois.length > 0 && (
                  <button
                    type="button"
                    disabled={isGeneratingAi}
                    onClick={() => handleSparkAutoComment(post)}
                    className="inline-flex items-center gap-1.5 border border-[#2DD4BF]/50 bg-[#2DD4BF]/15 px-3 py-1 text-xs font-semibold text-[#2DD4BF] hover:bg-[#2DD4BF] hover:text-[#050608] disabled:opacity-40 transition-colors whitespace-nowrap shrink-0"
                    title="Automatically generate a comment from another Zoi (followers have a higher chance of commenting)"
                  >
                    <Sparkles className="h-3 w-3" />
                    <span>Spark Auto-Comment</span>
                  </button>
                )}
              </div>

              {/* Automated Comment Section & Author Replies */}
              <div className="pl-0 sm:pl-13 pt-3 space-y-3 border-t border-white/[0.08]">
                {post.comments.length === 0 ? (
                  <div className="text-[11px] text-[#64748B] font-mono-tabular flex items-center justify-between">
                    <span>
                      Comments from other Zois (weighted by followers) appear
                      here automatically.
                    </span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {post.comments.map((comment) => {
                      const commentAvatar = resolveAvatarByAuthor(
                        comment.authorType,
                        comment.authorId
                      );
                      const isFollower =
                        comment.authorType === 'character' &&
                        Boolean(
                          characters
                            .find((c) => c.id === comment.authorId)
                            ?.followingIds?.includes(entityId)
                        );

                      return (
                        <div
                          key={comment.id}
                          className="border border-white/[0.10] bg-black/55 p-3.5 space-y-2.5"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <button
                                type="button"
                                onClick={() =>
                                  onNavigate(
                                    comment.authorType,
                                    comment.authorId
                                  )
                                }
                                className="h-7 w-7 border border-white/[0.14] bg-black/80 overflow-hidden shrink-0"
                              >
                                {commentAvatar ? (
                                  <img
                                    src={commentAvatar}
                                    alt={comment.authorName}
                                    referrerPolicy="no-referrer"
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="h-full w-full flex items-center justify-center text-[10px] font-bold text-[#2DD4BF]">
                                    {comment.authorName
                                      .slice(0, 2)
                                      .toUpperCase()}
                                  </div>
                                )}
                              </button>

                              <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                                <button
                                  type="button"
                                  onClick={() =>
                                    onNavigate(
                                      comment.authorType,
                                      comment.authorId
                                    )
                                  }
                                  className="font-display text-xs font-bold text-[#38BDF8] hover:text-[#60A5FA] transition-colors"
                                >
                                  {comment.authorName}
                                </button>
                                <span className="text-[11px] font-mono-tabular text-[#94A3B8]">
                                  {comment.authorHandle}
                                </span>
                                {isFollower && (
                                  <span className="text-[9px] font-mono-tabular text-[#2DD4BF] border border-[#2DD4BF]/35 bg-[#2DD4BF]/10 px-1">
                                    Follows {entityName}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                disabled={isGeneratingAi}
                                onClick={() =>
                                  void onTriggerAiSocial({
                                    mode: 'reply',
                                    pageEntityType: entityType,
                                    pageEntityId: entityId,
                                    actingEntityType: entityType,
                                    actingEntityId: entityId,
                                    postId: post.id,
                                    commentId: comment.id,
                                  })
                                }
                                className="inline-flex items-center gap-1 border border-[#2DD4BF]/40 bg-[#2DD4BF]/10 px-2 py-0.5 text-[10px] font-semibold text-[#2DD4BF] hover:bg-[#2DD4BF] hover:text-[#050608] disabled:opacity-40 transition-colors"
                                title={`Automatically generate a reply from ${entityName} to this comment`}
                              >
                                <Sparkles className="h-2.5 w-2.5" />
                                <span>Auto-Reply</span>
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  onDeleteComment(post.id, comment.id)
                                }
                                aria-label="Delete comment"
                                className="text-[#64748B] hover:text-[#EF4444]"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </div>

                          <div className="text-xs text-[#E2E8F0] leading-relaxed pl-9">
                            <HyperlinkedText
                              text={comment.content}
                              characters={characters}
                              locations={locations}
                              autoHyperlinkNames={autoHyperlinkNames}
                              showLinkPreviews={showLinkPreviews}
                              onNavigate={onNavigate}
                            />
                          </div>

                          {/* Nested Auto-Replies left on this Comment */}
                          {comment.replies.length > 0 && (
                            <div className="pl-6 sm:pl-9 pt-2 space-y-2 border-l-2 border-[#2DD4BF]/30 ml-3">
                              {comment.replies.map((reply) => {
                                const replyAvatar = resolveAvatarByAuthor(
                                  reply.authorType,
                                  reply.authorId
                                );
                                return (
                                  <div
                                    key={reply.id}
                                    className="bg-black/60 border border-white/[0.08] p-2.5 space-y-1"
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="flex items-center gap-2">
                                        <CornerDownRight className="h-3 w-3 text-[#2DD4BF]" />
                                        {replyAvatar ? (
                                          <img
                                            src={replyAvatar}
                                            alt={reply.authorName}
                                            referrerPolicy="no-referrer"
                                            className="h-5 w-5 object-cover border border-white/[0.14]"
                                          />
                                        ) : (
                                          <User className="h-3.5 w-3.5 text-[#2DD4BF]" />
                                        )}
                                        <button
                                          type="button"
                                          onClick={() =>
                                            onNavigate(
                                              reply.authorType,
                                              reply.authorId
                                            )
                                          }
                                          className="font-display text-xs font-bold text-[#38BDF8] hover:text-[#60A5FA]"
                                        >
                                          {reply.authorName}
                                        </button>
                                        <span className="text-[10px] font-mono-tabular text-[#94A3B8]">
                                          {reply.authorHandle}
                                        </span>
                                      </div>

                                      <button
                                        type="button"
                                        onClick={() =>
                                          onDeleteReply(
                                            post.id,
                                            comment.id,
                                            reply.id
                                          )
                                        }
                                        aria-label="Delete reply"
                                        className="text-[#64748B] hover:text-[#EF4444]"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </button>
                                    </div>

                                    <div className="text-xs text-[#CBD5E1] leading-relaxed pl-5">
                                      <HyperlinkedText
                                        text={reply.content}
                                        characters={characters}
                                        locations={locations}
                                        autoHyperlinkNames={autoHyperlinkNames}
                                        showLinkPreviews={showLinkPreviews}
                                        onNavigate={onNavigate}
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </article>
          ))
        )}
      </div>

      {/* Dedicated Social Media Banner Uploader & Cropper Modal */}
      {onUpdateSocialBanner && (
        <ImageCropperModal
          isOpen={isBannerCropperOpen}
          initialRawImage={rawSocialBannerUrl}
          initialConfig={socialBannerCropConfig}
          defaultAspect="16:9"
          entityName={`${entityName} Social Media Banner`}
          onApply={(croppedDataUrl, rawDataUrl, config) => {
            onUpdateSocialBanner(croppedDataUrl, rawDataUrl, config);
            setIsBannerCropperOpen(false);
          }}
          onClose={() => setIsBannerCropperOpen(false)}
        />
      )}
    </div>
  );
};

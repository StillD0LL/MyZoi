import React, { useMemo, useState } from 'react';
import {
  CharacterEntry,
  LocationEntry,
  SocialCommentReply,
  SocialMediaPost,
  SocialPostComment,
} from '../types/codex';
import {
  formatRelationshipDisplay,
  formatSocialHandle,
  getSocialPostsForEntity,
} from '../utils/codexLogic';
import { HyperlinkedText } from './HyperlinkedText';
import {
  Calendar,
  Clock,
  CornerDownRight,
  Heart,
  MapPin,
  MessageCircle,
  Repeat2,
  Send,
  Sparkles,
  Trash2,
  User,
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
  onAddComment,
  onDeleteComment,
  onAddReply,
  onDeleteReply,
  onTriggerAiSocial,
  onNavigate,
}) => {
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
  const entityBanner =
    entityType === 'character'
      ? character?.backgroundDataUrl || character?.portraitDataUrl || ''
      : location?.backgroundDataUrl || location?.imageDataUrl || '';
  const entitySubtitle =
    entityType === 'character'
      ? [character?.occupation || character?.role, character?.title]
          .filter(Boolean)
          .join(' · ') || 'Zoi Resident'
      : [location?.category, location?.region].filter(Boolean).join(' · ') ||
        'City Lot';
  const entityBio =
    entityType === 'character'
      ? character?.summary || ''
      : location?.summary || '';

  const entityPosts = useMemo(
    () => getSocialPostsForEntity(entityType, entityId, socialPosts),
    [entityType, entityId, socialPosts]
  );

  // Other Zois available to comment on this page's posts
  const otherZois = useMemo(
    () => characters.filter((c) => c.id !== entityId),
    [characters, entityId]
  );

  const [newPostText, setNewPostText] = useState('');
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>(
    {}
  );
  const [selectedCommenterByPost, setSelectedCommenterByPost] = useState<
    Record<string, string>
  >({});
  const [activeReplyCommentId, setActiveReplyCommentId] = useState<
    string | null
  >(null);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [selectedReplierByComment, setSelectedReplierByComment] = useState<
    Record<string, string>
  >({});

  const resolveCommenterEntity = (postId: string) => {
    const selectedId = selectedCommenterByPost[postId];
    if (selectedId) {
      const foundZoi = characters.find((c) => c.id === selectedId);
      if (foundZoi) {
        return {
          type: 'character' as const,
          id: foundZoi.id,
          name: foundZoi.name,
          handle: formatSocialHandle(foundZoi.name),
          avatar: foundZoi.portraitDataUrl,
        };
      }
      const foundLoc = locations.find((l) => l.id === selectedId);
      if (foundLoc) {
        return {
          type: 'location' as const,
          id: foundLoc.id,
          name: foundLoc.name,
          handle: formatSocialHandle(foundLoc.name),
          avatar: foundLoc.imageDataUrl,
        };
      }
    }
    // Default to first other Zoi if one exists, otherwise the page owner
    if (otherZois.length > 0) {
      const firstOther = otherZois[0];
      return {
        type: 'character' as const,
        id: firstOther.id,
        name: firstOther.name,
        handle: formatSocialHandle(firstOther.name),
        avatar: firstOther.portraitDataUrl,
      };
    }
    return {
      type: entityType,
      id: entityId,
      name: entityName,
      handle: entityHandle,
      avatar: entityAvatar,
    };
  };

  const resolveReplierEntity = (commentId: string) => {
    const selectedId = selectedReplierByComment[commentId];
    if (selectedId) {
      const foundZoi = characters.find((c) => c.id === selectedId);
      if (foundZoi) {
        return {
          type: 'character' as const,
          id: foundZoi.id,
          name: foundZoi.name,
          handle: formatSocialHandle(foundZoi.name),
        };
      }
      const foundLoc = locations.find((l) => l.id === selectedId);
      if (foundLoc) {
        return {
          type: 'location' as const,
          id: foundLoc.id,
          name: foundLoc.name,
          handle: formatSocialHandle(foundLoc.name),
        };
      }
    }
    // Default replier is the page's Zoi / Location replying to comments left on their post
    return {
      type: entityType,
      id: entityId,
      name: entityName,
      handle: entityHandle,
    };
  };

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

  const handlePublishManualComment = (postId: string) => {
    const draft = (commentDrafts[postId] || '').trim();
    if (!draft) return;

    const commenter = resolveCommenterEntity(postId);
    const newComment: SocialPostComment = {
      id: `scomm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      postId,
      authorType: commenter.type,
      authorId: commenter.id,
      authorName: commenter.name,
      authorHandle: commenter.handle,
      content: draft,
      likesCount: 0,
      isAiGenerated: false,
      replies: [],
      createdAt: new Date().toISOString(),
    };

    onAddComment(postId, newComment);
    setCommentDrafts((prev) => ({ ...prev, [postId]: '' }));
  };

  const handlePublishManualReply = (postId: string, commentId: string) => {
    const draft = (replyDrafts[commentId] || '').trim();
    if (!draft) return;

    const replier = resolveReplierEntity(commentId);
    const newReply: SocialCommentReply = {
      id: `sreply-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      authorType: replier.type,
      authorId: replier.id,
      authorName: replier.name,
      authorHandle: replier.handle,
      content: draft,
      likesCount: 0,
      isAiGenerated: false,
      createdAt: new Date().toISOString(),
    };

    onAddReply(postId, commentId, newReply);
    setReplyDrafts((prev) => ({ ...prev, [commentId]: '' }));
    setActiveReplyCommentId(null);
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
      {/* Twitter/X Inspired Profile Banner & Header */}
      <div className="relative h-36 sm:h-44 w-full bg-black/80 border-b border-white/[0.11] overflow-hidden">
        {entityBanner ? (
          <>
            <img
              src={entityBanner}
              alt={`${entityName} banner`}
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover opacity-55"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#050608] via-black/40 to-transparent" />
          </>
        ) : (
          <div className="h-full w-full bg-gradient-to-r from-[#070B12] via-[#0B1622] to-[#050608] flex items-center justify-end px-8">
            <span className="font-mono-tabular text-xs uppercase tracking-widest text-[#2DD4BF]/40">
              ZoiNet · City Social Feed
            </span>
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

          {/* Shared AI Cooldown Status & AI Post Trigger */}
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-[11px] font-mono-tabular text-[#94A3B8] flex items-center gap-1.5 border border-white/[0.10] bg-black/60 px-2.5 py-1.5">
              <Clock className="h-3 w-3 text-[#2DD4BF]" />
              <span>
                {aiCooldownRemainingSec > 0
                  ? `Shared Site AI Cooldown: ${aiCooldownRemainingSec}s`
                  : 'Shared Site AI Ready'}
              </span>
            </span>

            <button
              type="button"
              disabled={isGeneratingAi || aiCooldownRemainingSec > 0}
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
                  ? 'Drafting AI Post...'
                  : aiCooldownRemainingSec > 0
                    ? `AI Cooldown (${aiCooldownRemainingSec}s)`
                    : `AI Post as ${entityName}`}
              </span>
            </button>
          </div>
        </div>

        <div className="space-y-2">
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

          {/* Metadata Line (Location, Relationship, Birth Month, Posts Count) */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-1 text-xs text-[#94A3B8]">
            {entityType === 'character' && character?.originLocation && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-[#2DD4BF]" />
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
            <span className="font-mono-tabular text-white font-semibold">
              {entityPosts.length}{' '}
              <span className="font-normal text-[#94A3B8]">Posts</span>
            </span>
            <span className="font-mono-tabular text-white font-semibold">
              {totalCommentsCount}{' '}
              <span className="font-normal text-[#94A3B8]">
                Comments &amp; Replies
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Compose New Post Box (Twitter/X Style) */}
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
              Write a post above or generate an in-character AI post. Other Zois
              can leave comments on every post, and {entityName} can reply
              directly to their comments.
            </p>
          </div>
        ) : (
          entityPosts.map((post) => {
            const commenter = resolveCommenterEntity(post.id);

            return (
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
                            AI
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
                <div className="flex flex-wrap items-center gap-6 pl-0 sm:pl-13 pt-1 text-xs text-[#94A3B8]">
                  <span className="inline-flex items-center gap-1.5 font-mono-tabular">
                    <MessageCircle className="h-3.5 w-3.5 text-[#2DD4BF]" />
                    <span>{post.comments.length} Comments</span>
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

                {/* Comment Section & Thread (Other Zois Commenting + Author Replying) */}
                <div className="pl-0 sm:pl-13 pt-3 space-y-3 border-t border-white/[0.08]">
                  {/* Existing Comments */}
                  {post.comments.length > 0 && (
                    <div className="space-y-3">
                      {post.comments.map((comment) => {
                        const commentAvatar = resolveAvatarByAuthor(
                          comment.authorType,
                          comment.authorId
                        );
                        const isReplyBoxOpen =
                          activeReplyCommentId === comment.id;

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
                                    className="font-display text-xs font-bold text-white hover:text-[#2DD4BF] transition-colors"
                                  >
                                    {comment.authorName}
                                  </button>
                                  <span className="text-[11px] font-mono-tabular text-[#94A3B8]">
                                    {comment.authorHandle}
                                  </span>
                                  {comment.isAiGenerated && (
                                    <span className="text-[9px] font-mono-tabular text-[#2DD4BF] border border-[#2DD4BF]/30 px-1">
                                      AI
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setActiveReplyCommentId(
                                      isReplyBoxOpen ? null : comment.id
                                    )
                                  }
                                  className="text-[11px] font-medium text-[#2DD4BF] hover:underline"
                                >
                                  Reply
                                </button>

                                <button
                                  type="button"
                                  disabled={
                                    isGeneratingAi ||
                                    aiCooldownRemainingSec > 0
                                  }
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
                                  title={`Generate an AI reply from ${entityName} to this comment`}
                                >
                                  <Sparkles className="h-2.5 w-2.5" />
                                  <span>
                                    {aiCooldownRemainingSec > 0
                                      ? `${aiCooldownRemainingSec}s`
                                      : `AI Reply`}
                                  </span>
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

                            {/* Nested Replies left on this Comment */}
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
                                            className="font-display text-xs font-bold text-white hover:text-[#2DD4BF]"
                                          >
                                            {reply.authorName}
                                          </button>
                                          <span className="text-[10px] font-mono-tabular text-[#94A3B8]">
                                            {reply.authorHandle}
                                          </span>
                                          {reply.isAiGenerated && (
                                            <span className="text-[9px] font-mono-tabular text-[#2DD4BF] border border-[#2DD4BF]/30 px-1">
                                              AI
                                            </span>
                                          )}
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
                                          autoHyperlinkNames={
                                            autoHyperlinkNames
                                          }
                                          showLinkPreviews={showLinkPreviews}
                                          onNavigate={onNavigate}
                                        />
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {/* Inline Reply Composer for this Comment */}
                            {isReplyBoxOpen && (
                              <div className="pl-6 sm:pl-9 pt-2 flex flex-wrap items-center gap-2">
                                <select
                                  aria-label="Select Zoi replying to comment"
                                  value={
                                    selectedReplierByComment[comment.id] ||
                                    entityId
                                  }
                                  onChange={(e) =>
                                    setSelectedReplierByComment((prev) => ({
                                      ...prev,
                                      [comment.id]: e.target.value,
                                    }))
                                  }
                                  className="border border-white/[0.14] bg-black/80 px-2 py-1.5 text-xs text-[#2DD4BF]"
                                >
                                  <option value={entityId}>
                                    Reply as {entityName}
                                  </option>
                                  {characters
                                    .filter((c) => c.id !== entityId)
                                    .map((c) => (
                                      <option key={c.id} value={c.id}>
                                        Reply as {c.name}
                                      </option>
                                    ))}
                                </select>

                                <input
                                  type="text"
                                  value={replyDrafts[comment.id] || ''}
                                  onChange={(e) =>
                                    setReplyDrafts((prev) => ({
                                      ...prev,
                                      [comment.id]: e.target.value,
                                    }))
                                  }
                                  placeholder={`Reply to ${comment.authorName}...`}
                                  aria-label={`Reply to ${comment.authorName}`}
                                  className="flex-1 min-w-[180px] border border-white/[0.14] bg-black/80 px-3 py-1.5 text-xs text-white focus:border-[#2DD4BF] focus:outline-none"
                                />

                                <button
                                  type="button"
                                  onClick={() =>
                                    handlePublishManualReply(
                                      post.id,
                                      comment.id
                                    )
                                  }
                                  className="bg-[#2DD4BF] px-3 py-1.5 text-xs font-semibold text-[#050608] hover:bg-[#5EEAD4] transition-colors"
                                >
                                  Send Reply
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Add a Comment Box (As Another Zoi or Location) */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <select
                      aria-label="Select commenting Zoi"
                      value={selectedCommenterByPost[post.id] || commenter.id}
                      onChange={(e) =>
                        setSelectedCommenterByPost((prev) => ({
                          ...prev,
                          [post.id]: e.target.value,
                        }))
                      }
                      className="border border-white/[0.14] bg-black/75 px-2.5 py-1.5 text-xs text-[#2DD4BF]"
                    >
                      {otherZois.map((z) => (
                        <option key={z.id} value={z.id}>
                          Comment as {z.name} (Zoi)
                        </option>
                      ))}
                      <option value={entityId}>
                        Comment as {entityName}
                      </option>
                      {locations
                        .filter((l) => l.id !== entityId)
                        .map((l) => (
                          <option key={l.id} value={l.id}>
                            Comment as {l.name} (Lot)
                          </option>
                        ))}
                    </select>

                    <input
                      type="text"
                      value={commentDrafts[post.id] || ''}
                      onChange={(e) =>
                        setCommentDrafts((prev) => ({
                          ...prev,
                          [post.id]: e.target.value,
                        }))
                      }
                      placeholder={`Write a comment as ${commenter.name}...`}
                      aria-label={`Write a comment on ${post.authorName}'s post`}
                      className="flex-1 min-w-[200px] border border-white/[0.14] bg-black/75 px-3 py-1.5 text-xs text-white placeholder-[#64748B] focus:border-[#2DD4BF] focus:outline-none"
                    />

                    <button
                      type="button"
                      onClick={() => handlePublishManualComment(post.id)}
                      disabled={!(commentDrafts[post.id] || '').trim()}
                      className="border border-white/[0.14] bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-white hover:border-[#2DD4BF] disabled:opacity-40 transition-colors whitespace-nowrap shrink-0"
                    >
                      Comment
                    </button>

                    <button
                      type="button"
                      disabled={isGeneratingAi || aiCooldownRemainingSec > 0}
                      onClick={() =>
                        void onTriggerAiSocial({
                          mode: 'comment',
                          pageEntityType: entityType,
                          pageEntityId: entityId,
                          actingEntityType: commenter.type,
                          actingEntityId: commenter.id,
                          postId: post.id,
                        })
                      }
                      className="inline-flex items-center gap-1 border border-[#2DD4BF]/50 bg-[#2DD4BF]/15 px-3 py-1.5 text-xs font-semibold text-[#2DD4BF] hover:bg-[#2DD4BF] hover:text-[#050608] disabled:opacity-40 transition-colors whitespace-nowrap shrink-0"
                      title="Generate an in-character comment from the selected Zoi (shares site AI cooldown)"
                    >
                      <Sparkles className="h-3 w-3" />
                      <span>
                        {aiCooldownRemainingSec > 0
                          ? `AI (${aiCooldownRemainingSec}s)`
                          : 'AI Zoi Comment'}
                      </span>
                    </button>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
};

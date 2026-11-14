import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActiveRoute,
  CharacterEntry,
  CityFeedEvent,
  CodexArchive,
  CodexSettings,
  GalleryPhoto,
  ImageCropConfig,
  LocationEntry,
  SocialCommentReply,
  SocialMediaPost,
  SocialPostComment,
} from './types/codex';
import {
  createAnonymousSiteFeedEvent,
  createEmptyArchive,
  formatSocialHandle,
  resolveActivePageBackground,
  validateAndNormalizeArchive,
} from './utils/codexLogic';
import {
  deleteDriveArchiveFile,
  downloadDriveArchive,
  findDriveArchiveFile,
  googleSignIn,
  initAuth,
  loadIndexedDbVaultArchive,
  loadLocalVaultArchive,
  logout,
  saveLocalVaultArchive,
  uploadDriveArchive,
} from './services/driveSyncService';
import { CommunityHubView } from './components/CommunityHubView';
import { CharacterDirectoryView } from './components/CharacterDirectoryView';
import { CharacterProfileView } from './components/CharacterProfileView';
import { CharacterEditorView } from './components/CharacterEditorView';
import { LocationDirectoryView } from './components/LocationDirectoryView';
import { LocationProfileView } from './components/LocationProfileView';
import { LocationEditorView } from './components/LocationEditorView';
import { PhotoUploadModal } from './components/PhotoUploadModal';
import { SearchCommandModal } from './components/SearchCommandModal';
import { SettingsModal } from './components/SettingsModal';
import { ConfirmModal } from './components/ConfirmModal';
import { AiSocialGenerationParams } from './components/SocialFeedView';
import { devLogger } from '../dev/logger';

interface PendingConfirmation {
  title: string;
  description: string;
  affectedItems?: string[];
  confirmLabel: string;
  variant: 'danger' | 'primary';
  onConfirm: () => void;
}

const CLIENT_MANUAL_AI_COOLDOWN_SEC = 60;

function createFallbackInzoiEvent(
  characters: CharacterEntry[],
  locations: LocationEntry[]
): CityFeedEvent {
  const char =
    characters.length > 0
      ? characters[Math.floor(Math.random() * characters.length)]
      : undefined;
  const loc =
    locations.length > 0
      ? locations[Math.floor(Math.random() * locations.length)]
      : undefined;

  const charName = char ? `[[${char.name}]]` : 'several local Zois';
  const locName = loc ? `[[${loc.name}]]` : 'the central boulevard';

  const templates: Array<{
    category: string;
    headline: string;
    body: string;
    districtOrMood: string;
  }> = [
    {
      category: 'Zoi Sighting',
      headline: `Late-Afternoon Espresso & Street Sketching Near ${loc ? loc.name : 'Central Plaza'}`,
      body: `Passersby noticed ${charName} lingering at an outdoor corner table near ${locName} while street musicians tested a new acoustic set under the transit awning.`,
      districtOrMood: 'Warm Street Vibe',
    },
    {
      category: 'City Karma',
      headline: `Evening Karma & Transit Harmony Index Reaches Seasonal High`,
      body: `Neighborhood kiosks around ${locName} reported unusually high civic courtesy today, with ${charName} spotted helping organize a pop-up book and vinyl exchange.`,
      districtOrMood: 'Flourishing Karma',
    },
    {
      category: 'Street Chatter',
      headline: `Unscheduled Rooftop Light Projection Spotted Over ${loc ? loc.name : 'Harbor District'}`,
      body: `Night owls near ${locName} shared snapshots of an ambient holographic projection test. Witnesses claim ${charName} was seen calibrating a portable projector nearby.`,
      districtOrMood: 'Curious Chatter',
    },
    {
      category: 'Weather & Vibe',
      headline: `Golden Hour Mist Settles Across ${loc ? loc.name : 'Midtown Promenades'}`,
      body: `A soft reflection rolled off the glass facades around ${locName}, prompting ${charName} and nearby commuters to pause for street-level photographs.`,
      districtOrMood: 'Serene Evening',
    },
  ];

  const picked = templates[Math.floor(Math.random() * templates.length)];

  return {
    id: `feed-ai-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    kind: 'ai_inzoi',
    category: picked.category,
    headline: picked.headline,
    body: picked.body,
    districtOrMood: picked.districtOrMood,
    relatedEntityType: char ? 'character' : loc ? 'location' : undefined,
    relatedEntityId: char ? char.id : loc ? loc.id : undefined,
    createdAt: new Date().toISOString(),
  };
}

export default function App() {
  const [archive, setArchive] = useState<CodexArchive>(() =>
    loadLocalVaultArchive()
  );
  const archiveRef = useRef<CodexArchive>(archive);
  useEffect(() => {
    archiveRef.current = archive;
  }, [archive]);

  // Community Hub is the main entry page
  const [route, setRoute] = useState<ActiveRoute>({ view: 'hub' });
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Photo Upload Modal state (with optional default tags when opened from a profile)
  const [photoModalState, setPhotoModalState] = useState<{
    isOpen: boolean;
    defaultTaggedCharacterId?: string;
    defaultTaggedLocationId?: string;
  }>({
    isOpen: false,
  });

  // Shared Mindful AI Cooldown & Generation State (shared across City Dispatches, Social Posts, Comments, and Replies)
  const [isGeneratingAiUpdate, setIsGeneratingAiUpdate] = useState(false);
  const [aiCooldownUntilMs, setAiCooldownUntilMs] = useState<number>(0);
  const [aiCooldownRemainingSec, setAiCooldownRemainingSec] =
    useState<number>(0);
  const [aiError, setAiError] = useState<string | null>(null);
  const lastAutoAiTimestampRef = useRef<number>(Date.now());

  // Auth & Google Drive Sync State (with persistent remembered login across reloads/updates)
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [rememberedEmail, setRememberedEmail] = useState<string | null>(null);
  const [driveFileId, setDriveFileId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  // Track whether initial cloud reconciliation has completed to enable automatic Drive saving on every edit
  const isReadyForAutoDriveSyncRef = useRef(false);
  const lastUploadedUpdatedAtRef = useRef<string>('');

  // Explicit Confirmation Dialog State
  const [pendingConfirm, setPendingConfirm] =
    useState<PendingConfirmation | null>(null);

  const showTransientBanner = useCallback((msg: string) => {
    setStatusBanner(msg);
    setTimeout(() => {
      setStatusBanner((current) => (current === msg ? null : current));
    }, 4000);
  }, []);

  // Hydrate from IndexedDB on initial mount if IndexedDB holds fuller image data than localStorage
  useEffect(() => {
    let mounted = true;
    void loadIndexedDbVaultArchive().then((idbArchive) => {
      if (!mounted || !idbArchive) {
        return;
      }
      setArchive((current) => {
        const idbHasMoreData =
          idbArchive.photos.length > current.photos.length ||
          idbArchive.characters.length > current.characters.length ||
          idbArchive.locations.length > current.locations.length ||
          (idbArchive.socialPosts || []).length >
            (current.socialPosts || []).length ||
          idbArchive.updatedAt >= current.updatedAt;
        return idbHasMoreData ? idbArchive : current;
      });
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Persist to local vault (IndexedDB + quota-safe localStorage) whenever archive updates
  useEffect(() => {
    saveLocalVaultArchive(archive);
  }, [archive]);

  // Countdown ticker for shared AI cooldown
  useEffect(() => {
    const updateRemaining = () => {
      const diffSec = Math.max(
        0,
        Math.ceil((aiCooldownUntilMs - Date.now()) / 1000)
      );
      setAiCooldownRemainingSec(diffSec);
    };
    updateRemaining();
    const timer = window.setInterval(updateRemaining, 1000);
    return () => window.clearInterval(timer);
  }, [aiCooldownUntilMs]);

  // Global keyboard shortcut Ctrl+K / Cmd+K for quick search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const executeUploadToDrive = useCallback(
    async (targetArchive: CodexArchive, silent: boolean = false) => {
      setIsSyncing(true);
      setSyncError(null);
      try {
        const meta = await uploadDriveArchive(
          targetArchive,
          targetArchive.settings.driveFileName,
          driveFileId
        );
        setDriveFileId(meta.id);
        const syncedTime = meta.modifiedTime || new Date().toISOString();
        setLastSyncedAt(syncedTime);
        lastUploadedUpdatedAtRef.current = targetArchive.updatedAt;
        if (!silent) {
          showTransientBanner(`Synced "${meta.name}" to your Google Drive.`);
        }
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Google Drive sync failed.';
        if (message === 'AUTH_REQUIRED') {
          setIsAuthenticated(false);
          isReadyForAutoDriveSyncRef.current = false;
          setSyncError(
            'Your Google Drive token expired. Click Resume Session to reconnect.'
          );
        } else {
          setSyncError(message);
        }
      } finally {
        setIsSyncing(false);
      }
    },
    [driveFileId, showTransientBanner]
  );

  // Initialize Firebase Auth + IndexedDB persistent OAuth session listener
  useEffect(() => {
    let active = true;
    const unsubscribe = initAuth(
      (user) => {
        if (!active) return;
        const email = user.email || user.displayName || 'Authenticated User';
        setIsAuthenticated(true);
        setUserEmail(email);
        setRememberedEmail(user.email || null);

        // Automatically reconcile with Google Drive on restored session
        void (async () => {
          try {
            setIsSyncing(true);
            const currentArchive = archiveRef.current;
            const existingFile = await findDriveArchiveFile(
              currentArchive.settings.driveFileName
            );
            if (!active) return;

            if (existingFile) {
              setDriveFileId(existingFile.id);
              const isLocalEmpty =
                currentArchive.characters.length === 0 &&
                currentArchive.locations.length === 0 &&
                currentArchive.photos.length === 0 &&
                (currentArchive.socialPosts || []).length === 0 &&
                !currentArchive.settings.defaultSiteBackgroundUrl;

              if (isLocalEmpty) {
                const cloudArchive = await downloadDriveArchive(existingFile.id);
                if (!active) return;
                lastUploadedUpdatedAtRef.current = cloudArchive.updatedAt;
                setArchive(cloudArchive);
                setLastSyncedAt(
                  existingFile.modifiedTime || new Date().toISOString()
                );
              } else {
                setLastSyncedAt(
                  existingFile.modifiedTime || new Date().toISOString()
                );
              }
            }
            isReadyForAutoDriveSyncRef.current = true;
          } catch (err) {
            devLogger.warn('Auto-restore Drive check', String(err));
            isReadyForAutoDriveSyncRef.current = true;
          } finally {
            if (active) {
              setIsSyncing(false);
            }
          }
        })();
      },
      (user) => {
        if (!active) return;
        setIsAuthenticated(false);
        setUserEmail(null);
        setRememberedEmail(user?.email || null);
        isReadyForAutoDriveSyncRef.current = false;
      }
    );
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  // Automatically save & sync EVERY edit to Google Drive when authenticated
  useEffect(() => {
    if (!isAuthenticated || !isReadyForAutoDriveSyncRef.current) return;
    if (archive.updatedAt === lastUploadedUpdatedAtRef.current) return;

    const timer = window.setTimeout(() => {
      void executeUploadToDrive(archive, true);
    }, 750);
    return () => window.clearTimeout(timer);
  }, [archive, executeUploadToDrive, isAuthenticated]);

  // Trigger an AI inZOI-style city life update with shared mindful cooldown protection
  const handleTriggerAiCityUpdate = useCallback(async () => {
    if (isGeneratingAiUpdate || Date.now() < aiCooldownUntilMs) {
      return;
    }

    setIsGeneratingAiUpdate(true);
    setAiError(null);
    try {
      const response = await fetch('/api/city-feed/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characters: archive.characters.map((c) => ({
            id: c.id,
            name: c.name,
            gender: c.gender,
            occupation: c.occupation,
            role: c.role,
            personality: c.personality,
            ambition: c.ambition,
            affiliation: c.affiliation,
          })),
          locations: archive.locations.map((l) => ({
            id: l.id,
            name: l.name,
            category: l.category,
            region: l.region,
          })),
        }),
      });

      if (response.status === 429) {
        const data = await response.json().catch(() => ({}));
        const retrySec =
          typeof data.cooldownRemainingSeconds === 'number'
            ? data.cooldownRemainingSeconds
            : CLIENT_MANUAL_AI_COOLDOWN_SEC;
        setAiCooldownUntilMs(Date.now() + retrySec * 1000);
        return;
      }

      if (response.ok) {
        const data = await response.json();
        if (data?.cooldownActive) {
          const retrySec =
            typeof data.cooldownRemainingSeconds === 'number'
              ? data.cooldownRemainingSeconds
              : CLIENT_MANUAL_AI_COOLDOWN_SEC;
          setAiCooldownUntilMs(Date.now() + retrySec * 1000);
          return;
        }

        const primaryUpdate =
          data?.event || (Array.isArray(data?.updates) ? data.updates[0] : null);
        if (primaryUpdate && primaryUpdate.headline && primaryUpdate.body) {
          const matchedChar = archive.characters.find(
            (c) =>
              primaryUpdate.headline
                .toLowerCase()
                .includes(c.name.toLowerCase()) ||
              primaryUpdate.body.toLowerCase().includes(c.name.toLowerCase())
          );
          const matchedLoc = archive.locations.find(
            (l) =>
              primaryUpdate.headline
                .toLowerCase()
                .includes(l.name.toLowerCase()) ||
              primaryUpdate.body.toLowerCase().includes(l.name.toLowerCase())
          );

          const newEvent: CityFeedEvent = {
            id: `feed-ai-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            kind: 'ai_inzoi',
            category: primaryUpdate.category || 'City Life',
            headline: primaryUpdate.headline,
            body: primaryUpdate.body,
            districtOrMood: primaryUpdate.districtOrMood || 'City Pulse',
            relatedEntityType: matchedChar
              ? 'character'
              : matchedLoc
                ? 'location'
                : undefined,
            relatedEntityId: matchedChar
              ? matchedChar.id
              : matchedLoc
                ? matchedLoc.id
                : undefined,
            createdAt: new Date().toISOString(),
          };

          setArchive((prev) => ({
            ...prev,
            updatedAt: new Date().toISOString(),
            feedEvents: [newEvent, ...prev.feedEvents].slice(0, 80),
          }));

          const cooldownSec = Math.max(
            CLIENT_MANUAL_AI_COOLDOWN_SEC,
            typeof data.cooldownSeconds === 'number'
              ? data.cooldownSeconds
              : CLIENT_MANUAL_AI_COOLDOWN_SEC
          );
          setAiCooldownUntilMs(Date.now() + cooldownSec * 1000);
          lastAutoAiTimestampRef.current = Date.now();
          return;
        }
      }

      const fallbackEvent = createFallbackInzoiEvent(
        archive.characters,
        archive.locations
      );
      setArchive((prev) => ({
        ...prev,
        updatedAt: new Date().toISOString(),
        feedEvents: [fallbackEvent, ...prev.feedEvents].slice(0, 80),
      }));
      setAiCooldownUntilMs(Date.now() + CLIENT_MANUAL_AI_COOLDOWN_SEC * 1000);
      lastAutoAiTimestampRef.current = Date.now();
    } catch (err) {
      devLogger.error('handleTriggerAiCityUpdate', err);
      const fallbackEvent = createFallbackInzoiEvent(
        archive.characters,
        archive.locations
      );
      setArchive((prev) => ({
        ...prev,
        updatedAt: new Date().toISOString(),
        feedEvents: [fallbackEvent, ...prev.feedEvents].slice(0, 80),
      }));
      setAiCooldownUntilMs(Date.now() + CLIENT_MANUAL_AI_COOLDOWN_SEC * 1000);
    } finally {
      setIsGeneratingAiUpdate(false);
    }
  }, [
    aiCooldownUntilMs,
    archive.characters,
    archive.locations,
    isGeneratingAiUpdate,
  ]);

  // Automatic ambient inZOI city update interval (respecting user settings & shared mindful cooldowns)
  useEffect(() => {
    if (!archive.settings.enableAiCityEvents) return;
    if (archive.characters.length === 0 && archive.locations.length === 0) {
      return;
    }

    const intervalMs = archive.settings.aiCooldownMinutes * 60 * 1000;
    const timer = window.setInterval(() => {
      const elapsed = Date.now() - lastAutoAiTimestampRef.current;
      if (
        elapsed >= intervalMs &&
        Date.now() >= aiCooldownUntilMs &&
        !isGeneratingAiUpdate
      ) {
        void handleTriggerAiCityUpdate();
      }
    }, 30_000);

    return () => window.clearInterval(timer);
  }, [
    aiCooldownUntilMs,
    archive.characters.length,
    archive.locations.length,
    archive.settings.aiCooldownMinutes,
    archive.settings.enableAiCityEvents,
    handleTriggerAiCityUpdate,
    isGeneratingAiUpdate,
  ]);

  // Social Media CRUD & Shared AI Social Generation Handlers
  const resolveEntityMeta = useCallback(
    (type: 'character' | 'location', id: string) => {
      if (type === 'character') {
        const char = archive.characters.find((c) => c.id === id);
        if (char) {
          return {
            name: char.name,
            handle: formatSocialHandle(char.name),
            subtitle: char.occupation || char.role || char.title || 'Zoi',
            summary: char.summary,
            personality: char.personality,
          };
        }
      } else {
        const loc = archive.locations.find((l) => l.id === id);
        if (loc) {
          return {
            name: loc.name,
            handle: formatSocialHandle(loc.name),
            subtitle: loc.category || loc.subtitle || 'Location',
            summary: loc.summary,
            personality: loc.climate,
          };
        }
      }
      return {
        name: 'Zoi',
        handle: '@zoi',
        subtitle: 'Zoi',
        summary: '',
        personality: '',
      };
    },
    [archive.characters, archive.locations]
  );

  const handleCreateSocialPost = useCallback((newPost: SocialMediaPost) => {
    setArchive((prev) => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      socialPosts: [newPost, ...(prev.socialPosts || [])],
    }));
  }, []);

  const handleDeleteSocialPost = useCallback((postId: string) => {
    setArchive((prev) => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      socialPosts: (prev.socialPosts || []).filter((p) => p.id !== postId),
    }));
  }, []);

  const handleToggleLikeSocialPost = useCallback((postId: string) => {
    setArchive((prev) => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      socialPosts: (prev.socialPosts || []).map((p) =>
        p.id === postId ? { ...p, likesCount: p.likesCount + 1 } : p
      ),
    }));
  }, []);

  const handleToggleRepostSocialPost = useCallback((postId: string) => {
    setArchive((prev) => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      socialPosts: (prev.socialPosts || []).map((p) =>
        p.id === postId ? { ...p, repostsCount: p.repostsCount + 1 } : p
      ),
    }));
  }, []);

  const handleAddSocialComment = useCallback(
    (postId: string, newComment: SocialPostComment) => {
      setArchive((prev) => ({
        ...prev,
        updatedAt: new Date().toISOString(),
        socialPosts: (prev.socialPosts || []).map((p) =>
          p.id === postId
            ? { ...p, comments: [...p.comments, newComment] }
            : p
        ),
      }));
    },
    []
  );

  const handleDeleteSocialComment = useCallback(
    (postId: string, commentId: string) => {
      setArchive((prev) => ({
        ...prev,
        updatedAt: new Date().toISOString(),
        socialPosts: (prev.socialPosts || []).map((p) =>
          p.id === postId
            ? {
                ...p,
                comments: p.comments.filter((c) => c.id !== commentId),
              }
            : p
        ),
      }));
    },
    []
  );

  const handleAddSocialReply = useCallback(
    (postId: string, commentId: string, newReply: SocialCommentReply) => {
      setArchive((prev) => ({
        ...prev,
        updatedAt: new Date().toISOString(),
        socialPosts: (prev.socialPosts || []).map((p) => {
          if (p.id !== postId) return p;
          return {
            ...p,
            comments: p.comments.map((c) =>
              c.id === commentId
                ? { ...c, replies: [...c.replies, newReply] }
                : c
            ),
          };
        }),
      }));
    },
    []
  );

  const handleDeleteSocialReply = useCallback(
    (postId: string, commentId: string, replyId: string) => {
      setArchive((prev) => ({
        ...prev,
        updatedAt: new Date().toISOString(),
        socialPosts: (prev.socialPosts || []).map((p) => {
          if (p.id !== postId) return p;
          return {
            ...p,
            comments: p.comments.map((c) =>
              c.id === commentId
                ? {
                    ...c,
                    replies: c.replies.filter((r) => r.id !== replyId),
                  }
                : c
            ),
          };
        }),
      }));
    },
    []
  );

  // Trigger AI Social Post, Comment, or Reply sharing the global AI generation cooldown
  const handleTriggerAiSocial = useCallback(
    async (params: AiSocialGenerationParams) => {
      if (isGeneratingAiUpdate || Date.now() < aiCooldownUntilMs) {
        return;
      }

      setIsGeneratingAiUpdate(true);
      setAiError(null);

      const actingType = params.actingEntityType || params.pageEntityType;
      const actingId = params.actingEntityId || params.pageEntityId;
      const authorMeta = resolveEntityMeta(actingType, actingId);
      const targetPost = params.postId
        ? (archive.socialPosts || []).find((p) => p.id === params.postId)
        : undefined;
      const targetComment =
        targetPost && params.commentId
          ? targetPost.comments.find((c) => c.id === params.commentId)
          : undefined;

      try {
        const response = await fetch('/api/social/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: params.mode,
            authorName: authorMeta.name,
            authorType: actingType,
            authorSubtitle: authorMeta.subtitle,
            authorPersonality: authorMeta.personality,
            authorSummary: authorMeta.summary,
            targetPostAuthorName: targetPost?.authorName,
            targetPostContent: targetPost?.content,
            targetCommentAuthorName: targetComment?.authorName,
            targetCommentContent: targetComment?.content,
            otherEntityNames: [
              ...archive.characters
                .filter((c) => c.id !== actingId)
                .map((c) => c.name),
              ...archive.locations
                .filter((l) => l.id !== actingId)
                .map((l) => l.name),
            ],
          }),
        });

        const data = await response.json().catch(() => ({}));
        if (data?.cooldownActive) {
          const retrySec =
            typeof data.cooldownRemainingSeconds === 'number'
              ? data.cooldownRemainingSeconds
              : CLIENT_MANUAL_AI_COOLDOWN_SEC;
          setAiCooldownUntilMs(Date.now() + retrySec * 1000);
          return;
        }

        const generatedText =
          typeof data?.content === 'string' && data.content.trim()
            ? data.content.trim()
            : params.mode === 'post'
              ? `Taking in the evening atmosphere as ${authorMeta.name}. #ZoiNet`
              : params.mode === 'comment'
                ? `Always great catching up with [[${targetPost?.authorName || authorMeta.name}]]!`
                : `Appreciate the comment, [[${targetComment?.authorName || 'friend'}]]!`;

        const nowIso = new Date().toISOString();

        if (params.mode === 'post') {
          handleCreateSocialPost({
            id: `post-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            pageEntityType: params.pageEntityType,
            pageEntityId: params.pageEntityId,
            authorType: actingType,
            authorId: actingId,
            authorName: authorMeta.name,
            authorHandle: authorMeta.handle,
            content: generatedText,
            likesCount: Math.floor(Math.random() * 5) + 1,
            repostsCount: 0,
            isAiGenerated: true,
            comments: [],
            createdAt: nowIso,
          });
        } else if (params.mode === 'comment' && params.postId) {
          handleAddSocialComment(params.postId, {
            id: `comment-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            postId: params.postId,
            authorType: actingType,
            authorId: actingId,
            authorName: authorMeta.name,
            authorHandle: authorMeta.handle,
            content: generatedText,
            likesCount: 0,
            isAiGenerated: true,
            replies: [],
            createdAt: nowIso,
          });
        } else if (
          params.mode === 'reply' &&
          params.postId &&
          params.commentId
        ) {
          handleAddSocialReply(params.postId, params.commentId, {
            id: `reply-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            authorType: actingType,
            authorId: actingId,
            authorName: authorMeta.name,
            authorHandle: authorMeta.handle,
            content: generatedText,
            likesCount: 0,
            isAiGenerated: true,
            createdAt: nowIso,
          });
        }

        const cooldownSec = Math.max(
          CLIENT_MANUAL_AI_COOLDOWN_SEC,
          typeof data.cooldownSeconds === 'number'
            ? data.cooldownSeconds
            : CLIENT_MANUAL_AI_COOLDOWN_SEC
        );
        setAiCooldownUntilMs(Date.now() + cooldownSec * 1000);
        lastAutoAiTimestampRef.current = Date.now();
      } catch (err) {
        devLogger.error('handleTriggerAiSocial', err);
        setAiCooldownUntilMs(Date.now() + CLIENT_MANUAL_AI_COOLDOWN_SEC * 1000);
      } finally {
        setIsGeneratingAiUpdate(false);
      }
    },
    [
      aiCooldownUntilMs,
      archive.characters,
      archive.locations,
      archive.socialPosts,
      handleAddSocialComment,
      handleAddSocialReply,
      handleCreateSocialPost,
      isGeneratingAiUpdate,
      resolveEntityMeta,
    ]
  );

  const handleGoogleLogin = async () => {
    setSyncError(null);
    try {
      const result = await googleSignIn(rememberedEmail || userEmail);
      if (!result) return;
      const email =
        result.user.email || result.user.displayName || 'Google Drive User';
      setIsAuthenticated(true);
      setUserEmail(email);
      setRememberedEmail(result.user.email || null);

      setIsSyncing(true);
      const existingFile = await findDriveArchiveFile(
        archive.settings.driveFileName
      );
      if (existingFile) {
        setDriveFileId(existingFile.id);
        const cloudArchive = await downloadDriveArchive(existingFile.id);
        if (
          archive.characters.length === 0 &&
          archive.locations.length === 0 &&
          archive.photos.length === 0 &&
          (archive.socialPosts || []).length === 0 &&
          !archive.settings.defaultSiteBackgroundUrl
        ) {
          lastUploadedUpdatedAtRef.current = cloudArchive.updatedAt;
          setArchive(cloudArchive);
          setLastSyncedAt(
            existingFile.modifiedTime || new Date().toISOString()
          );
          isReadyForAutoDriveSyncRef.current = true;
          showTransientBanner(
            `Loaded ${cloudArchive.characters.length} Zois and ${cloudArchive.locations.length} locations from Google Drive.`
          );
        } else {
          setPendingConfirm({
            title: 'Cloud Archive Found in Google Drive',
            description: `Found existing "${existingFile.name}" in your Google Drive (${cloudArchive.characters.length} Zois, ${cloudArchive.locations.length} locations). Would you like to load the Google Drive version or keep and sync your current local edits?`,
            affectedItems: [
              ...cloudArchive.characters.map((c) => `Zoi: ${c.name}`),
              ...cloudArchive.locations.map((l) => `Location: ${l.name}`),
            ],
            confirmLabel: 'Load Google Drive Archive',
            variant: 'primary',
            onConfirm: () => {
              lastUploadedUpdatedAtRef.current = cloudArchive.updatedAt;
              setArchive(cloudArchive);
              setLastSyncedAt(
                existingFile.modifiedTime || new Date().toISOString()
              );
              isReadyForAutoDriveSyncRef.current = true;
              setPendingConfirm(null);
              showTransientBanner('Loaded archive from Google Drive.');
            },
          });
          isReadyForAutoDriveSyncRef.current = true;
        }
      } else {
        await executeUploadToDrive(archive);
        isReadyForAutoDriveSyncRef.current = true;
      }
    } catch (err: unknown) {
      devLogger.error('handleGoogleLogin', err);
      const msg =
        err instanceof Error
          ? err.message
          : 'Google Sign-In could not be completed.';
      setSyncError(msg);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleGoogleLogout = async () => {
    await logout();
    setIsAuthenticated(false);
    setUserEmail(null);
    setRememberedEmail(null);
    setDriveFileId(null);
    isReadyForAutoDriveSyncRef.current = false;
    showTransientBanner('Signed out of Google Drive.');
  };

  const handleSyncToDriveRequest = () => {
    if (!isAuthenticated) {
      setIsSettingsOpen(true);
      return;
    }

    if (archive.settings.confirmBeforeCloudOverwrite && driveFileId) {
      setPendingConfirm({
        title: `Update "${archive.settings.driveFileName}" in Google Drive?`,
        description:
          'This will overwrite your stored Google Drive archive file with your current Zois, portraits, social posts, backgrounds, photos, and locations.',
        affectedItems: [
          `${archive.characters.length} Zoi profile(s)`,
          `${archive.locations.length} Location profile(s)`,
          `${archive.photos.length} Gallery photo(s)`,
        ],
        confirmLabel: 'Update Google Drive File',
        variant: 'primary',
        onConfirm: () => {
          setPendingConfirm(null);
          void executeUploadToDrive(archive);
        },
      });
    } else {
      void executeUploadToDrive(archive);
    }
  };

  const handlePullFromDriveRequest = async () => {
    if (!isAuthenticated) return;
    setIsSyncing(true);
    setSyncError(null);
    try {
      const existing = await findDriveArchiveFile(
        archive.settings.driveFileName
      );
      if (!existing) {
        setSyncError(
          `No file named "${archive.settings.driveFileName}" was found in your Google Drive.`
        );
        return;
      }
      setDriveFileId(existing.id);
      const cloudArchive = await downloadDriveArchive(existing.id);
      setPendingConfirm({
        title: `Replace Local Session with "${existing.name}"?`,
        description:
          'Loading from Google Drive will replace your current local entries with the cloud copy.',
        affectedItems: [
          `${cloudArchive.characters.length} Cloud Zoi(s)`,
          `${cloudArchive.locations.length} Cloud Location(s)`,
        ],
        confirmLabel: 'Load from Google Drive',
        variant: 'primary',
        onConfirm: () => {
          lastUploadedUpdatedAtRef.current = cloudArchive.updatedAt;
          setArchive(cloudArchive);
          setLastSyncedAt(existing.modifiedTime || new Date().toISOString());
          setPendingConfirm(null);
          showTransientBanner('Synchronized from Google Drive.');
        },
      });
    } catch (err: unknown) {
      setSyncError(
        err instanceof Error ? err.message : 'Failed to pull from Google Drive.'
      );
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteDriveFileRequest = () => {
    if (!driveFileId) return;
    setPendingConfirm({
      title: 'Delete Archive File from Google Drive?',
      description: `Are you sure you want to permanently delete "${archive.settings.driveFileName}" from your Google Drive? Your local entries on this browser will remain intact, but the cloud file will be removed.`,
      affectedItems: [archive.settings.driveFileName],
      confirmLabel: 'Delete from Google Drive',
      variant: 'danger',
      onConfirm: async () => {
        const targetId = driveFileId;
        setPendingConfirm(null);
        if (!targetId) return;
        setIsSyncing(true);
        try {
          await deleteDriveArchiveFile(targetId);
          setDriveFileId(null);
          setLastSyncedAt(null);
          showTransientBanner('Deleted archive file from Google Drive.');
        } catch (err: unknown) {
          setSyncError(
            err instanceof Error
              ? err.message
              : 'Failed to delete Google Drive file.'
          );
        } finally {
          setIsSyncing(false);
        }
      },
    });
  };

  // Zoi CRUD handlers + Anonymous Community Hub Feed Dispatches
  const handleSaveCharacter = (
    savedChar: CharacterEntry,
    newPhotos: GalleryPhoto[] = []
  ) => {
    setArchive((prev) => {
      const exists = prev.characters.some((c) => c.id === savedChar.id);
      const nextCharacters = exists
        ? prev.characters.map((c) => (c.id === savedChar.id ? savedChar : c))
        : [...prev.characters, savedChar];

      const siteEvent = createAnonymousSiteFeedEvent({
        action: exists ? 'character_updated' : 'character_created',
        entityName: savedChar.name,
        entityId: savedChar.id,
        entitySubtitle:
          savedChar.occupation || savedChar.role || savedChar.title,
        secondaryContext: savedChar.affiliation || savedChar.originLocation,
        imageUrl: savedChar.portraitDataUrl || undefined,
      });

      const nextEvents = [siteEvent, ...prev.feedEvents];
      if (newPhotos.length > 0) {
        const photoEvent = createAnonymousSiteFeedEvent({
          action: 'photo_submitted',
          entityName: `New Snapshots Added for ${savedChar.name}`,
          entityId: savedChar.id,
          secondaryContext: `[[${savedChar.name}]]`,
          imageUrl: newPhotos[0]?.imageDataUrl,
        });
        nextEvents.unshift(photoEvent);
      }

      return {
        ...prev,
        updatedAt: new Date().toISOString(),
        characters: nextCharacters,
        photos: [...newPhotos, ...prev.photos],
        feedEvents: nextEvents.slice(0, 80),
      };
    });
    setRoute({ view: 'character_detail', id: savedChar.id });
    showTransientBanner(
      isAuthenticated
        ? `Saved "${savedChar.name}" and auto-syncing to Google Drive.`
        : `Saved Zoi profile "${savedChar.name}".`
    );
  };

  const handleUpdateCharacterBackground = (
    characterId: string,
    backgroundDataUrl: string,
    rawBackgroundDataUrl?: string,
    backgroundCropConfig?: ImageCropConfig
  ) => {
    setArchive((prev) => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      characters: prev.characters.map((c) =>
        c.id === characterId
          ? {
              ...c,
              backgroundDataUrl: backgroundDataUrl || undefined,
              rawBackgroundDataUrl: rawBackgroundDataUrl || undefined,
              backgroundCropConfig,
              updatedAt: new Date().toISOString(),
            }
          : c
      ),
    }));
    showTransientBanner(
      backgroundDataUrl
        ? 'Updated individual Zoi page background.'
        : 'Reset Zoi page background to site default.'
    );
  };

  const handleDeleteCharacterRequest = (character: CharacterEntry) => {
    setPendingConfirm({
      title: `Delete Zoi "${character.name}"?`,
      description:
        'This will permanently remove this Zoi profile, portrait, and all sections from your archive.',
      affectedItems: [character.name],
      confirmLabel: 'Delete Zoi',
      variant: 'danger',
      onConfirm: () => {
        setArchive((prev) => ({
          ...prev,
          updatedAt: new Date().toISOString(),
          characters: prev.characters.filter((c) => c.id !== character.id),
        }));
        setPendingConfirm(null);
        setRoute({ view: 'characters' });
        showTransientBanner(`Deleted "${character.name}".`);
      },
    });
  };

  // Location CRUD handlers + Anonymous Community Hub Feed Dispatches
  const handleSaveLocation = (
    savedLoc: LocationEntry,
    newPhotos: GalleryPhoto[] = []
  ) => {
    setArchive((prev) => {
      const exists = prev.locations.some((l) => l.id === savedLoc.id);
      const nextLocations = exists
        ? prev.locations.map((l) => (l.id === savedLoc.id ? savedLoc : l))
        : [...prev.locations, savedLoc];

      const siteEvent = createAnonymousSiteFeedEvent({
        action: exists ? 'location_updated' : 'location_created',
        entityName: savedLoc.name,
        entityId: savedLoc.id,
        entitySubtitle: `${savedLoc.category}${savedLoc.subtitle ? ` · ${savedLoc.subtitle}` : ''}`,
        secondaryContext: savedLoc.region || savedLoc.category,
        imageUrl: savedLoc.imageDataUrl || undefined,
      });

      const nextEvents = [siteEvent, ...prev.feedEvents];
      if (newPhotos.length > 0) {
        const photoEvent = createAnonymousSiteFeedEvent({
          action: 'photo_submitted',
          entityName: `District Photography Added: ${savedLoc.name}`,
          entityId: savedLoc.id,
          secondaryContext: `[[${savedLoc.name}]]`,
          imageUrl: newPhotos[0]?.imageDataUrl,
        });
        nextEvents.unshift(photoEvent);
      }

      return {
        ...prev,
        updatedAt: new Date().toISOString(),
        locations: nextLocations,
        photos: [...newPhotos, ...prev.photos],
        feedEvents: nextEvents.slice(0, 80),
      };
    });
    setRoute({ view: 'location_detail', id: savedLoc.id });
    showTransientBanner(
      isAuthenticated
        ? `Saved "${savedLoc.name}" and auto-syncing to Google Drive.`
        : `Saved location profile "${savedLoc.name}".`
    );
  };

  const handleUpdateLocationBackground = (
    locationId: string,
    backgroundDataUrl: string,
    rawBackgroundDataUrl?: string,
    backgroundCropConfig?: ImageCropConfig
  ) => {
    setArchive((prev) => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      locations: prev.locations.map((l) =>
        l.id === locationId
          ? {
              ...l,
              backgroundDataUrl: backgroundDataUrl || undefined,
              rawBackgroundDataUrl: rawBackgroundDataUrl || undefined,
              backgroundCropConfig,
              updatedAt: new Date().toISOString(),
            }
          : l
      ),
    }));
    showTransientBanner(
      backgroundDataUrl
        ? 'Updated individual location page background.'
        : 'Reset location page background to site default.'
    );
  };

  const handleDeleteLocationRequest = (location: LocationEntry) => {
    setPendingConfirm({
      title: `Delete Location "${location.name}"?`,
      description:
        'This will permanently remove this location profile and all its sections from your archive.',
      affectedItems: [location.name],
      confirmLabel: 'Delete Location',
      variant: 'danger',
      onConfirm: () => {
        setArchive((prev) => ({
          ...prev,
          updatedAt: new Date().toISOString(),
          locations: prev.locations.filter((l) => l.id !== location.id),
        }));
        setPendingConfirm(null);
        setRoute({ view: 'locations' });
        showTransientBanner(`Deleted "${location.name}".`);
      },
    });
  };

  // Photo Gallery CRUD handlers
  const handleSavePhotosBatch = (newPhotos: GalleryPhoto[]) => {
    if (newPhotos.length === 0) return;
    setArchive((prev) => {
      const allCharIds = Array.from(
        new Set(newPhotos.flatMap((p) => p.taggedCharacterIds))
      );
      const allLocIds = Array.from(
        new Set(newPhotos.flatMap((p) => p.taggedLocationIds))
      );

      const taggedNames: string[] = [];
      for (const cId of allCharIds) {
        const c = prev.characters.find((item) => item.id === cId);
        if (c) taggedNames.push(`[[${c.name}]]`);
      }
      for (const lId of allLocIds) {
        const l = prev.locations.find((item) => item.id === lId);
        if (l) taggedNames.push(`[[${l.name}]]`);
      }

      const headline =
        newPhotos[0]?.caption ||
        (newPhotos.length === 1
          ? 'New Snapshot Submitted to City Gallery'
          : `${newPhotos.length} New Snapshots Submitted to City Gallery`);

      const photoEvent = createAnonymousSiteFeedEvent({
        action: 'photo_submitted',
        entityName: headline,
        secondaryContext:
          taggedNames.length > 0 ? taggedNames.join(', ') : undefined,
        imageUrl: newPhotos[0]?.imageDataUrl,
      });

      return {
        ...prev,
        updatedAt: new Date().toISOString(),
        photos: [...newPhotos, ...prev.photos],
        feedEvents: [photoEvent, ...prev.feedEvents].slice(0, 80),
      };
    });
    showTransientBanner(
      `Submitted ${newPhotos.length} ${
        newPhotos.length === 1 ? 'photo' : 'photos'
      } to the archive.`
    );
  };

  const handleUpdatePhoto = (updatedPhoto: GalleryPhoto) => {
    setArchive((prev) => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      photos: prev.photos.map((p) =>
        p.id === updatedPhoto.id ? updatedPhoto : p
      ),
    }));
  };

  const handleDeletePhotoRequest = (photo: GalleryPhoto) => {
    setPendingConfirm({
      title: 'Delete Gallery Photo?',
      description:
        'Are you sure you want to remove this photo from the archive and all tagged profiles?',
      affectedItems: [photo.caption || 'Gallery Snapshot'],
      confirmLabel: 'Delete Photo',
      variant: 'danger',
      onConfirm: () => {
        setArchive((prev) => ({
          ...prev,
          updatedAt: new Date().toISOString(),
          photos: prev.photos.filter((p) => p.id !== photo.id),
        }));
        setPendingConfirm(null);
        showTransientBanner('Removed photo from gallery.');
      },
    });
  };

  // Settings & Backup handlers
  const handleUpdateSettings = (patch: Partial<CodexSettings>) => {
    setArchive((prev) => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      settings: {
        ...prev.settings,
        ...patch,
      },
    }));
  };

  const handleExportLocalJson = () => {
    const blob = new Blob([JSON.stringify(archive, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = archive.settings.driveFileName || 'codex_noctis_archive.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportLocalJson = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const normalized = validateAndNormalizeArchive(parsed);
        setPendingConfirm({
          title: 'Import Archive JSON File?',
          description: `Importing "${file.name}" will replace your current local session with ${normalized.characters.length} Zoi(s) and ${normalized.locations.length} location(s).`,
          affectedItems: [
            ...normalized.characters.map((c) => `Zoi: ${c.name}`),
            ...normalized.locations.map((l) => `Location: ${l.name}`),
          ],
          confirmLabel: 'Import Archive',
          variant: 'primary',
          onConfirm: () => {
            setArchive(normalized);
            setPendingConfirm(null);
            setRoute({ view: 'hub' });
            showTransientBanner('Imported JSON archive successfully.');
          },
        });
      } catch (err) {
        devLogger.error('handleImportLocalJson', err);
      }
    };
    reader.readAsText(file);
  };

  const handleClearAllEntriesRequest = () => {
    setPendingConfirm({
      title: 'Reset Entire Local Archive?',
      description:
        'Are you sure you want to remove all Zois, locations, social posts, photos, backgrounds, and city updates from your local workspace? This action cannot be undone.',
      affectedItems: [
        `${archive.characters.length} Zoi(s)`,
        `${archive.locations.length} Location(s)`,
        `${archive.photos.length} Photo(s)`,
      ],
      confirmLabel: 'Reset Archive',
      variant: 'danger',
      onConfirm: () => {
        setArchive(createEmptyArchive());
        setPendingConfirm(null);
        setIsSettingsOpen(false);
        setRoute({ view: 'hub' });
        showTransientBanner('Archive reset to a clean slate.');
      },
    });
  };

  const handleNavigateEntity = (
    type: 'character' | 'location',
    id: string
  ) => {
    if (type === 'character') {
      setRoute({ view: 'character_detail', id });
    } else {
      setRoute({ view: 'location_detail', id });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const activeCharacter =
    route.view === 'character_detail' || route.view === 'character_edit'
      ? archive.characters.find((c) => c.id === route.id)
      : undefined;

  const activeLocation =
    route.view === 'location_detail' || route.view === 'location_edit'
      ? archive.locations.find((l) => l.id === route.id)
      : undefined;

  // Resolve active background (individual Zoi/location override vs default site background)
  const activeBackground = useMemo(
    () => resolveActivePageBackground(route, archive),
    [route, archive]
  );

  const isHubActive = route.view === 'hub';
  const isCharactersActive =
    route.view === 'characters' ||
    route.view === 'character_detail' ||
    route.view === 'character_edit';
  const isLocationsActive =
    route.view === 'locations' ||
    route.view === 'location_detail' ||
    route.view === 'location_edit';

  return (
    <div className="relative min-h-screen flex flex-col bg-transparent text-[#F8FAFC]">
      {/* Site / Individual Entry Background Layer */}
      {activeBackground.imageUrl && (
        <div
          className="fixed inset-0 z-0 pointer-events-none overflow-hidden"
          aria-hidden="true"
        >
          <img
            src={activeBackground.imageUrl}
            alt=""
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover transition-opacity duration-300"
          />
          <div
            className="absolute inset-0 bg-[#050608]"
            style={{ opacity: activeBackground.overlayOpacity }}
          />
        </div>
      )}

      {/* Strict 3-Zone Top Navigation Bar — Sleek Black Frosted Glass */}
      <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-y-2.5 gap-x-4 px-4 sm:px-6 py-3.5 sm:py-4 border-b border-white/[0.11] bg-[#050608]/80 backdrop-blur-xl">
        {/* Zone 1: Brand Title (Single Element) */}
        <button
          type="button"
          onClick={() => setRoute({ view: 'hub' })}
          className="font-display text-base sm:text-lg font-bold tracking-tight text-white hover:text-[#2DD4BF] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          Codex Noctis
        </button>

        {/* Zone 2: Single-Line Navigation Links */}
        <nav
          aria-label="Primary Navigation"
          className="order-3 sm:order-2 w-full sm:w-auto flex items-center justify-between sm:justify-center gap-3 sm:gap-6 text-xs sm:text-sm font-medium text-[#94A3B8] border-t sm:border-t-0 border-white/[0.08] pt-2 sm:pt-0"
        >
          <button
            type="button"
            onClick={() => setRoute({ view: 'hub' })}
            className={`transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
              isHubActive
                ? 'text-white border-b-2 border-[#2DD4BF]'
                : 'hover:text-white'
            }`}
          >
            Hub
          </button>
          <button
            type="button"
            onClick={() => setRoute({ view: 'characters' })}
            className={`transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
              isCharactersActive
                ? 'text-white border-b-2 border-[#2DD4BF]'
                : 'hover:text-white'
            }`}
          >
            Zois
          </button>
          <button
            type="button"
            onClick={() => setRoute({ view: 'locations' })}
            className={`transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
              isLocationsActive
                ? 'text-white border-b-2 border-[#2DD4BF]'
                : 'hover:text-white'
            }`}
          >
            Locations
          </button>
          <button
            type="button"
            onClick={() => setIsSearchOpen(true)}
            className="hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            Search
          </button>
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className="hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            Settings
          </button>
        </nav>

        {/* Zone 3: 1 Primary Action */}
        <div className="order-2 sm:order-3 flex items-center gap-3 shrink-0">
          {isLocationsActive ? (
            <button
              type="button"
              onClick={() => setRoute({ view: 'location_edit' })}
              className="px-3.5 sm:px-4 py-1.5 sm:py-2 text-xs font-semibold text-[#050608] bg-[#2DD4BF] hover:bg-[#5EEAD4] transition-colors whitespace-nowrap shrink-0"
            >
              New Location
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setRoute({ view: 'character_edit' })}
              className="px-3.5 sm:px-4 py-1.5 sm:py-2 text-xs font-semibold text-[#050608] bg-[#2DD4BF] hover:bg-[#5EEAD4] transition-colors whitespace-nowrap shrink-0"
            >
              New Zoi
            </button>
          )}
        </div>
      </header>

      {/* Transient Feedback Banner */}
      {statusBanner && (
        <div
          role="status"
          className="relative z-20 border-b border-[#2DD4BF]/40 bg-[#050608]/90 backdrop-blur-xl px-6 py-2 text-xs text-[#E2E8F0] flex items-center justify-between"
        >
          <span>{statusBanner}</span>
          <button
            type="button"
            onClick={() => setStatusBanner(null)}
            className="text-[#94A3B8] hover:text-white ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Content Container */}
      <main className="relative z-10 flex-1 mx-auto w-full max-w-[1280px] px-6 py-8">
        {route.view === 'hub' && (
          <CommunityHubView
            characters={archive.characters}
            locations={archive.locations}
            photos={archive.photos}
            feedEvents={archive.feedEvents}
            autoHyperlinkNames={archive.settings.autoHyperlinkNames}
            showLinkPreviews={archive.settings.showLinkPreviews}
            isAuthenticated={isAuthenticated}
            userEmail={userEmail}
            rememberedEmail={rememberedEmail}
            isSyncing={isSyncing}
            lastSyncedAt={lastSyncedAt}
            isGeneratingAiUpdate={isGeneratingAiUpdate}
            aiCooldownRemainingSec={aiCooldownRemainingSec}
            aiError={aiError}
            enableAiCityEvents={archive.settings.enableAiCityEvents}
            onTriggerAiCityUpdate={handleTriggerAiCityUpdate}
            onOpenPhotoUpload={() =>
              setPhotoModalState({
                isOpen: true,
              })
            }
            onCreateCharacter={() => setRoute({ view: 'character_edit' })}
            onCreateLocation={() => setRoute({ view: 'location_edit' })}
            onNavigate={handleNavigateEntity}
            onNavigateDirectory={(view) => setRoute({ view })}
            onGoogleLogin={handleGoogleLogin}
          />
        )}

        {route.view === 'characters' && (
          <CharacterDirectoryView
            characters={archive.characters}
            gridColumns={archive.settings.directoryGridColumns}
            isAuthenticated={isAuthenticated}
            rememberedEmail={rememberedEmail}
            onSelectCharacter={(id) =>
              setRoute({ view: 'character_detail', id })
            }
            onCreateCharacter={() => setRoute({ view: 'character_edit' })}
            onGoogleLogin={handleGoogleLogin}
          />
        )}

        {route.view === 'character_detail' && activeCharacter && (
          <CharacterProfileView
            character={activeCharacter}
            characters={archive.characters}
            locations={archive.locations}
            photos={archive.photos}
            socialPosts={archive.socialPosts || []}
            autoHyperlinkNames={archive.settings.autoHyperlinkNames}
            showLinkPreviews={archive.settings.showLinkPreviews}
            isGeneratingAi={isGeneratingAiUpdate}
            aiCooldownRemainingSec={aiCooldownRemainingSec}
            onBack={() => setRoute({ view: 'characters' })}
            onEdit={(id) => setRoute({ view: 'character_edit', id })}
            onDeleteRequest={handleDeleteCharacterRequest}
            onUpdateCharacterBackground={handleUpdateCharacterBackground}
            onNavigate={handleNavigateEntity}
            onOpenPhotoUpload={(charId) =>
              setPhotoModalState({
                isOpen: true,
                defaultTaggedCharacterId: charId,
              })
            }
            onUpdatePhoto={handleUpdatePhoto}
            onDeletePhotoRequest={handleDeletePhotoRequest}
            onCreateSocialPost={handleCreateSocialPost}
            onDeleteSocialPost={handleDeleteSocialPost}
            onToggleLikeSocialPost={handleToggleLikeSocialPost}
            onToggleRepostSocialPost={handleToggleRepostSocialPost}
            onAddSocialComment={handleAddSocialComment}
            onDeleteSocialComment={handleDeleteSocialComment}
            onAddSocialReply={handleAddSocialReply}
            onDeleteSocialReply={handleDeleteSocialReply}
            onTriggerAiSocial={handleTriggerAiSocial}
          />
        )}

        {route.view === 'character_edit' && (
          <CharacterEditorView
            initialCharacter={activeCharacter}
            characters={archive.characters}
            locations={archive.locations}
            existingPhotos={archive.photos}
            onSave={handleSaveCharacter}
            onCancel={() =>
              activeCharacter
                ? setRoute({
                    view: 'character_detail',
                    id: activeCharacter.id,
                  })
                : setRoute({ view: 'characters' })
            }
          />
        )}

        {route.view === 'locations' && (
          <LocationDirectoryView
            locations={archive.locations}
            characters={archive.characters}
            gridColumns={archive.settings.directoryGridColumns}
            onSelectLocation={(id) => setRoute({ view: 'location_detail', id })}
            onCreateLocation={() => setRoute({ view: 'location_edit' })}
          />
        )}

        {route.view === 'location_detail' && activeLocation && (
          <LocationProfileView
            location={activeLocation}
            characters={archive.characters}
            locations={archive.locations}
            photos={archive.photos}
            socialPosts={archive.socialPosts || []}
            autoHyperlinkNames={archive.settings.autoHyperlinkNames}
            showLinkPreviews={archive.settings.showLinkPreviews}
            isGeneratingAi={isGeneratingAiUpdate}
            aiCooldownRemainingSec={aiCooldownRemainingSec}
            onBack={() => setRoute({ view: 'locations' })}
            onEdit={(id) => setRoute({ view: 'location_edit', id })}
            onDeleteRequest={handleDeleteLocationRequest}
            onUpdateLocationBackground={handleUpdateLocationBackground}
            onNavigate={handleNavigateEntity}
            onOpenPhotoUpload={(locId) =>
              setPhotoModalState({
                isOpen: true,
                defaultTaggedLocationId: locId,
              })
            }
            onUpdatePhoto={handleUpdatePhoto}
            onDeletePhotoRequest={handleDeletePhotoRequest}
            onCreateSocialPost={handleCreateSocialPost}
            onDeleteSocialPost={handleDeleteSocialPost}
            onToggleLikeSocialPost={handleToggleLikeSocialPost}
            onToggleRepostSocialPost={handleToggleRepostSocialPost}
            onAddSocialComment={handleAddSocialComment}
            onDeleteSocialComment={handleDeleteSocialComment}
            onAddSocialReply={handleAddSocialReply}
            onDeleteSocialReply={handleDeleteSocialReply}
            onTriggerAiSocial={handleTriggerAiSocial}
          />
        )}

        {route.view === 'location_edit' && (
          <LocationEditorView
            initialLocation={activeLocation}
            characters={archive.characters}
            locations={archive.locations}
            existingPhotos={archive.photos}
            onSave={handleSaveLocation}
            onCancel={() =>
              activeLocation
                ? setRoute({
                    view: 'location_detail',
                    id: activeLocation.id,
                  })
                : setRoute({ view: 'locations' })
            }
          />
        )}
      </main>

      {/* Quiet Studio Footer — Sleek Black Glass */}
      <footer className="relative z-10 border-t border-white/[0.10] bg-[#050608]/85 backdrop-blur-xl px-6 py-4 text-xs text-[#64748B] flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span>
            Codex Noctis · inZOI Wiki Portal &amp; Original Zoi Archive
          </span>
          {activeBackground.source !== 'none' && (
            <span className="text-[#2DD4BF] font-mono-tabular">
              ·{' '}
              {activeBackground.source === 'character'
                ? 'Zoi Background Active'
                : activeBackground.source === 'location'
                  ? 'Location Background Active'
                  : 'Site Background Active'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setIsSearchOpen(true)}
            className="hover:text-white transition-colors"
          >
            Quick Search (Ctrl+K)
          </button>
          <span aria-hidden="true">·</span>
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className="hover:text-white transition-colors"
          >
            {isAuthenticated
              ? isSyncing
                ? `Auto-Syncing to Google Drive...`
                : `Google Drive Auto-Sync (${userEmail})`
              : rememberedEmail
                ? `Resume Google Drive (${rememberedEmail})`
                : 'Connect Google Drive'}
          </button>
        </div>
      </footer>

      {/* Modals */}
      <PhotoUploadModal
        isOpen={photoModalState.isOpen}
        characters={archive.characters}
        locations={archive.locations}
        defaultTaggedCharacterId={photoModalState.defaultTaggedCharacterId}
        defaultTaggedLocationId={photoModalState.defaultTaggedLocationId}
        onSubmitPhotos={handleSavePhotosBatch}
        onClose={() =>
          setPhotoModalState((prev) => ({ ...prev, isOpen: false }))
        }
      />

      <SearchCommandModal
        isOpen={isSearchOpen}
        characters={archive.characters}
        locations={archive.locations}
        onClose={() => setIsSearchOpen(false)}
        onNavigate={handleNavigateEntity}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        settings={archive.settings}
        onUpdateSettings={handleUpdateSettings}
        userEmail={userEmail}
        rememberedEmail={rememberedEmail}
        isAuthenticated={isAuthenticated}
        isSyncing={isSyncing}
        lastSyncedAt={lastSyncedAt}
        driveFileId={driveFileId}
        syncError={syncError}
        onGoogleLogin={handleGoogleLogin}
        onGoogleLogout={handleGoogleLogout}
        onSyncToDriveRequest={handleSyncToDriveRequest}
        onPullFromDriveRequest={handlePullFromDriveRequest}
        onDeleteDriveFileRequest={handleDeleteDriveFileRequest}
        onExportLocalJson={handleExportLocalJson}
        onImportLocalJson={handleImportLocalJson}
        onClearAllEntriesRequest={handleClearAllEntriesRequest}
        archive={archive}
        onClose={() => setIsSettingsOpen(false)}
      />

      <ConfirmModal
        isOpen={Boolean(pendingConfirm)}
        title={pendingConfirm?.title || ''}
        description={pendingConfirm?.description || ''}
        affectedItems={pendingConfirm?.affectedItems}
        confirmLabel={pendingConfirm?.confirmLabel}
        variant={pendingConfirm?.variant}
        onConfirm={() => pendingConfirm?.onConfirm()}
        onCancel={() => setPendingConfirm(null)}
      />
    </div>
  );
}

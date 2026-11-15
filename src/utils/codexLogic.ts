import {
  ActiveRoute,
  BusinessStaffMember,
  CharacterEntry,
  CharacterSortOption,
  CityFeedEvent,
  CodexArchive,
  CodexSettings,
  GalleryPhoto,
  HouseholdStatusType,
  ImageCropConfig,
  LOCATION_CATEGORIES,
  LocationCategoryType,
  LocationEntry,
  LocationSortOption,
  RelationshipStatusType,
  SocialCommentReply,
  SocialMediaPost,
  SocialPostComment,
  ZOI_AGE_OPTIONS,
  ZOI_PERSONALITY_TRAIT_GROUPS,
  ZoiPersonalityTraitCategory,
} from '../types/codex';

export const DEFAULT_SETTINGS: CodexSettings = {
  defaultProfileDesign: 'encyclopedia',
  autoHyperlinkNames: true,
  directoryGridColumns: 3,
  showLinkPreviews: true,
  driveFileName: 'codex_noctis_archive.json',
  confirmBeforeCloudOverwrite: false,
  enableAiCityEvents: true,
  aiCooldownMinutes: 5,
  defaultSiteBackgroundUrl: '',
  siteBackgroundOverlayOpacity: 0.78,
};

/**
 * Generates a Twitter/X-style handle from a Zoi or Location name (e.g., "Kaelen Vance" -> "@kaelen_vance").
 */
export function formatSocialHandle(name: string): string {
  const cleaned = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return `@${cleaned || 'zoi_resident'}`;
}

/**
 * Formats a Zoi's Age stage ('Child' | 'Teenager' | 'Young Adult' | 'Adult' | 'Elder' | 'Ageless')
 * with an optional exact numbered age (e.g. "Young Adult (24)" or "Young Adult").
 */
export function formatZoiAge(stage: string, exactAge?: string): string {
  const cleanStage = (stage || '').trim();
  const cleanExact = (exactAge || '').replace(/[^0-9+]/g, '').trim();

  if (cleanStage && cleanExact) {
    return `${cleanStage} (${cleanExact})`;
  }
  if (cleanStage) {
    return cleanStage;
  }
  if (cleanExact) {
    return cleanExact;
  }
  return '';
}

/**
 * Parses a stored Zoi `age` string into `{ stage, exactAge }` for the 6-stage dropdown + optional number input.
 * Gracefully migrates legacy values like "Child (6–12)", "Teenager (13–17)", or standalone numbers like "24".
 */
export function parseZoiAge(rawAge?: string): {
  stage: string;
  exactAge: string;
} {
  const trimmed = (rawAge || '').trim();
  if (!trimmed) {
    return { stage: '', exactAge: '' };
  }

  // Handle legacy range labels from earlier archives
  if (/^child\s*\(6[–-]12\)$/i.test(trimmed)) {
    return { stage: 'Child', exactAge: '' };
  }
  if (/^teenager\s*\(13[–-]17\)$/i.test(trimmed)) {
    return { stage: 'Teenager', exactAge: '' };
  }

  // Match "Stage (24)" or "Stage - 24"
  const stageWithNumMatch = trimmed.match(
    /^(Child|Teenager|Young Adult|Adult|Elder|Ageless)\s*(?:\(([0-9+]+)\)|[-·]\s*([0-9+]+))?$/i
  );
  if (stageWithNumMatch) {
    const matchedStage =
      ZOI_AGE_OPTIONS.find(
        (opt) => opt.toLowerCase() === stageWithNumMatch[1].toLowerCase()
      ) || stageWithNumMatch[1];
    const numPart = (stageWithNumMatch[2] || stageWithNumMatch[3] || '').trim();
    return {
      stage: matchedStage,
      exactAge: numPart,
    };
  }

  // If rawAge is a standalone number like "24" or "75+"
  if (/^[0-9+]+$/.test(trimmed)) {
    const numericVal = parseInt(trimmed, 10);
    let inferredStage = 'Young Adult';
    if (!Number.isNaN(numericVal)) {
      if (numericVal <= 12) inferredStage = 'Child';
      else if (numericVal <= 17) inferredStage = 'Teenager';
      else if (numericVal <= 29) inferredStage = 'Young Adult';
      else if (numericVal <= 59) inferredStage = 'Adult';
      else inferredStage = 'Elder';
    }
    return {
      stage: inferredStage,
      exactAge: trimmed,
    };
  }

  return {
    stage: trimmed,
    exactAge: '',
  };
}

/**
 * Parses a Zoi's stored personality string into an array of unique trait tags.
 */
export function parsePersonalityTraits(rawPersonality?: string): string[] {
  if (!rawPersonality) return [];
  const parts = rawPersonality
    .split(/[,·;|]+/)
    .map((t) => t.trim())
    .filter(Boolean);

  const unique: string[] = [];
  const seen = new Set<string>();
  for (const part of parts) {
    const key = part.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(part);
    }
  }
  return unique;
}

/**
 * Serializes an array of selected personality trait tags into a clean comma-separated string.
 */
export function serializePersonalityTraits(traits: string[]): string {
  return parsePersonalityTraits(traits.join(', ')).join(', ');
}

/**
 * Resolves the category metadata for a given personality trait tag.
 */
export function getPersonalityTraitMeta(trait: string): {
  category: ZoiPersonalityTraitCategory | 'custom';
  label: string;
  badgeClass: string;
} {
  const lower = trait.trim().toLowerCase();
  for (const group of ZOI_PERSONALITY_TRAIT_GROUPS) {
    if (group.traits.some((t) => t.toLowerCase() === lower)) {
      return {
        category: group.id,
        label: group.label,
        badgeClass: group.badgeClass,
      };
    }
  }
  return {
    category: 'custom',
    label: 'Custom Trait',
    badgeClass: 'border-white/[0.18] bg-white/[0.06] text-[#E2E8F0]',
  };
}

/**
 * Formats a Zoi's Relationship Status and optional Partner hyperlink string for display in the Encyclopedia Dossier.
 * Ensures partner names are wrapped in [[Partner Name]] so they render as clickable hyperlinks.
 */
export function formatRelationshipDisplay(
  relationshipStatus?: string,
  relationshipPartner?: string,
  legacyRelationships?: string
): string {
  const status = (relationshipStatus || '').trim();
  const rawPartner = (relationshipPartner || '').trim();

  if (status) {
    if (status !== 'Single' && rawPartner) {
      const cleanPartner = rawPartner.replace(/^\[\[|\]\]$/g, '').trim();
      const linkedPartner = cleanPartner ? `[[${cleanPartner}]]` : '';
      if (status === 'Married') {
        return linkedPartner ? `Married to ${linkedPartner}` : 'Married';
      }
      if (status === 'Engaged') {
        return linkedPartner ? `Engaged to ${linkedPartner}` : 'Engaged';
      }
      if (status === 'Dating') {
        return linkedPartner ? `Dating ${linkedPartner}` : 'Dating';
      }
      return linkedPartner ? `${status} · ${linkedPartner}` : status;
    }
    return status;
  }

  return (legacyRelationships || '').trim();
}

/**
 * Returns all Twitter/X social media posts belonging to a specific Zoi or Location entry, newest first.
 */
export function getSocialPostsForEntity(
  entityType: 'character' | 'location',
  entityId: string,
  socialPosts: SocialMediaPost[]
): SocialMediaPost[] {
  return socialPosts
    .filter(
      (post) =>
        post.pageEntityType === entityType && post.pageEntityId === entityId
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/**
 * Normalizes a location category string into one of the four official inZOI lot/location types:
 * 'City', 'Residential lot', 'Community lot', or 'Business lot'.
 */
export function normalizeLocationCategory(raw?: unknown): LocationCategoryType {
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    const exact = LOCATION_CATEGORIES.find(
      (cat) => cat.toLowerCase() === trimmed.toLowerCase()
    );
    if (exact) return exact;

    const lower = trimmed.toLowerCase();
    if (
      lower.includes('residen') ||
      lower.includes('home') ||
      lower.includes('apartment') ||
      lower.includes('house') ||
      lower.includes('villa')
    ) {
      return 'Residential lot';
    }
    if (
      lower.includes('business') ||
      lower.includes('office') ||
      lower.includes('cafe') ||
      lower.includes('shop') ||
      lower.includes('studio') ||
      lower.includes('store') ||
      lower.includes('corp')
    ) {
      return 'Business lot';
    }
    if (
      lower.includes('community') ||
      lower.includes('park') ||
      lower.includes('plaza') ||
      lower.includes('citadel') ||
      lower.includes('sanctuary')
    ) {
      return 'Community lot';
    }
    if (
      lower.includes('city') ||
      lower.includes('district') ||
      lower.includes('metropolis') ||
      /\btown\b/.test(lower)
    ) {
      return 'City';
    }
  }
  return 'Community lot';
}

export interface ActivePageBackgroundResolution {
  imageUrl: string;
  source: 'character' | 'location' | 'site_default' | 'none';
  overlayOpacity: number;
}

/**
 * Resolves the active background image for the current route:
 * - On a Zoi profile or editor page, uses the Zoi's individual background if uploaded; otherwise falls back to the site default background.
 * - On a location profile or editor page, uses the location's individual background if uploaded; otherwise falls back to the site default background.
 * - On all other pages (Hub, Zoi Directory, Location Directory), uses the site default background.
 */
export function resolveActivePageBackground(
  route: ActiveRoute,
  archive: CodexArchive
): ActivePageBackgroundResolution {
  const overlayOpacity =
    typeof archive.settings.siteBackgroundOverlayOpacity === 'number'
      ? Math.min(
          0.92,
          Math.max(0.45, archive.settings.siteBackgroundOverlayOpacity)
        )
      : 0.78;

  if (
    (route.view === 'character_detail' || route.view === 'character_edit') &&
    route.id
  ) {
    const char = archive.characters.find((c) => c.id === route.id);
    if (char?.backgroundDataUrl && char.backgroundDataUrl.trim().length > 0) {
      return {
        imageUrl: char.backgroundDataUrl,
        source: 'character',
        overlayOpacity,
      };
    }
  }

  if (
    (route.view === 'location_detail' || route.view === 'location_edit') &&
    route.id
  ) {
    const loc = archive.locations.find((l) => l.id === route.id);
    if (loc?.backgroundDataUrl && loc.backgroundDataUrl.trim().length > 0) {
      return {
        imageUrl: loc.backgroundDataUrl,
        source: 'location',
        overlayOpacity,
      };
    }
  }

  if (
    archive.settings.defaultSiteBackgroundUrl &&
    archive.settings.defaultSiteBackgroundUrl.trim().length > 0
  ) {
    return {
      imageUrl: archive.settings.defaultSiteBackgroundUrl,
      source: 'site_default',
      overlayOpacity,
    };
  }

  return {
    imageUrl: '',
    source: 'none',
    overlayOpacity,
  };
}

/**
 * Creates a fresh, empty archive with zero pre-populated Zois or locations.
 */
export function createEmptyArchive(): CodexArchive {
  return {
    version: 5,
    updatedAt: new Date().toISOString(),
    characters: [],
    locations: [],
    photos: [],
    feedEvents: [],
    socialPosts: [],
    settings: { ...DEFAULT_SETTINGS },
  };
}

export interface HyperlinkSegment {
  type: 'text' | 'link';
  text: string;
  targetType?: 'character' | 'location';
  targetId?: string;
  targetName?: string;
  subtitle?: string;
}

interface LookupEntity {
  id: string;
  name: string;
  nameLower: string;
  type: 'character' | 'location';
  subtitle: string;
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Parses text into plain text segments and clickable hyperlink segments
 * linking to Zois or Locations.
 * Supports explicit [[Entity Name]] or [[Entity Name|Custom Text]] syntax,
 * plus optional automatic name matching for existing Zois and locations.
 */
export function parseHyperlinkedSegments(
  text: string,
  characters: CharacterEntry[],
  locations: LocationEntry[],
  autoHyperlinkNames: boolean = true,
  excludeEntityId?: string
): HyperlinkSegment[] {
  if (!text) return [];

  const entities: LookupEntity[] = [
    ...characters.map((c) => ({
      id: c.id,
      name: c.name.trim(),
      nameLower: c.name.trim().toLowerCase(),
      type: 'character' as const,
      subtitle:
        [c.title, c.occupation || c.role].filter(Boolean).join(' · ') || 'Zoi',
    })),
    ...locations.map((l) => ({
      id: l.id,
      name: l.name.trim(),
      nameLower: l.name.trim().toLowerCase(),
      type: 'location' as const,
      subtitle:
        [l.category, l.region].filter(Boolean).join(' · ') || 'Location',
    })),
  ].filter((e) => e.name.length > 0);

  const findEntity = (rawTarget: string): LookupEntity | undefined => {
    const clean = rawTarget.trim();
    const cleanLower = clean.toLowerCase();
    return (
      entities.find((e) => e.id === clean) ||
      entities.find((e) => e.nameLower === cleanLower)
    );
  };

  // Pass 1: Split by explicit [[target|label]] or [[target]] tokens
  const explicitRegex = /\[\[([^\]]+)\]\]/g;
  const firstPass: HyperlinkSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = explicitRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      firstPass.push({
        type: 'text',
        text: text.slice(lastIndex, match.index),
      });
    }
    const inner = match[1];
    const [targetPart, labelPart] = inner.split('|');
    const entity = findEntity(targetPart);
    const displayLabel = (labelPart ?? targetPart).trim();

    if (entity) {
      firstPass.push({
        type: 'link',
        text: displayLabel,
        targetType: entity.type,
        targetId: entity.id,
        targetName: entity.name,
        subtitle: entity.subtitle,
      });
    } else {
      firstPass.push({
        type: 'text',
        text: displayLabel,
      });
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    firstPass.push({
      type: 'text',
      text: text.slice(lastIndex),
    });
  }

  if (!autoHyperlinkNames) {
    return firstPass;
  }

  // Pass 2: Automatically detect existing Zoi and location names in remaining plain text segments
  const linkableEntities = entities
    .filter((e) => e.id !== excludeEntityId && e.name.length >= 2)
    .sort((a, b) => b.name.length - a.name.length);

  if (linkableEntities.length === 0) {
    return firstPass;
  }

  const pattern = linkableEntities.map((e) => escapeRegExp(e.name)).join('|');
  const autoRegex = new RegExp(`\\b(${pattern})\\b`, 'gi');

  const finalSegments: HyperlinkSegment[] = [];

  for (const seg of firstPass) {
    if (seg.type !== 'text' || !seg.text) {
      finalSegments.push(seg);
      continue;
    }

    let cursor = 0;
    let autoMatch: RegExpExecArray | null;
    autoRegex.lastIndex = 0;

    while ((autoMatch = autoRegex.exec(seg.text)) !== null) {
      const matchedStr = autoMatch[1];
      const entity = linkableEntities.find(
        (e) => e.nameLower === matchedStr.toLowerCase()
      );

      if (!entity) continue;

      if (autoMatch.index > cursor) {
        finalSegments.push({
          type: 'text',
          text: seg.text.slice(cursor, autoMatch.index),
        });
      }

      finalSegments.push({
        type: 'link',
        text: matchedStr,
        targetType: entity.type,
        targetId: entity.id,
        targetName: entity.name,
        subtitle: entity.subtitle,
      });

      cursor = autoMatch.index + autoMatch[0].length;
    }

    if (cursor < seg.text.length) {
      finalSegments.push({
        type: 'text',
        text: seg.text.slice(cursor),
      });
    }
  }

  return finalSegments;
}

export function formatEntityLinkToken(
  entityName: string,
  customLabel?: string
): string {
  const cleanName = entityName.trim();
  const cleanLabel = customLabel?.trim();
  if (cleanLabel && cleanLabel !== cleanName) {
    return `[[${cleanName}|${cleanLabel}]]`;
  }
  return `[[${cleanName}]]`;
}

export interface BacklinkItem {
  sourceType: 'character' | 'location';
  sourceId: string;
  sourceName: string;
  sourceSubtitle: string;
  contextLabel: string;
}

function collectCharacterSearchableStrings(
  char: CharacterEntry
): Array<{ label: string; text: string }> {
  const fields: Array<{ label: string; text: string }> = [
    { label: 'Origin / Location', text: char.originLocation || '' },
    { label: 'Affiliation', text: char.affiliation || '' },
    { label: 'Occupation', text: char.occupation || '' },
    { label: 'Personality', text: char.personality || '' },
    { label: 'Ambition', text: char.ambition || '' },
    {
      label: 'Relationship Status',
      text: formatRelationshipDisplay(
        char.relationshipStatus,
        char.relationshipPartner,
        char.relationships
      ),
    },
    { label: 'Relationships', text: char.relationships || '' },
    { label: 'Partner', text: char.relationshipPartner || '' },
    { label: 'Summary', text: char.summary || '' },
  ];
  for (const attr of char.personalAttributes) {
    fields.push({ label: attr.label || 'Attribute', text: attr.value });
  }
  for (const sec of char.sections) {
    if (sec.content) {
      fields.push({ label: sec.title || 'Section', text: sec.content });
    }
    if (sec.attribution) {
      fields.push({ label: sec.title || 'Quote', text: sec.attribution });
    }
    for (const item of sec.items || []) {
      fields.push({
        label: `${sec.title}: ${item.label}`,
        text: item.value,
      });
    }
    for (const b of sec.bullets || []) {
      fields.push({
        label: sec.title || 'List',
        text: `${b.title} ${b.content}`,
      });
    }
  }
  return fields;
}

function collectLocationSearchableStrings(
  loc: LocationEntry
): Array<{ label: string; text: string }> {
  const fields: Array<{ label: string; text: string }> = [
    { label: 'Region', text: loc.region || '' },
    { label: 'Ruler / Faction', text: loc.rulerOrFaction || '' },
    { label: 'Summary', text: loc.summary || '' },
  ];

  if (loc.category === 'Business lot') {
    if (loc.businessOwner) {
      fields.push({
        label: 'Business Owner',
        text: loc.businessOwner,
      });
    }
    for (const staff of loc.businessStaff || []) {
      fields.push({
        label: `Business Staff (${staff.role || 'Staff'})`,
        text: `${staff.name} ${staff.role} ${staff.shiftOrNotes || ''}`,
      });
    }
  }

  for (const attr of loc.attributes) {
    fields.push({ label: attr.label || 'Attribute', text: attr.value });
  }
  for (const sec of loc.sections) {
    if (sec.content) {
      fields.push({ label: sec.title || 'Section', text: sec.content });
    }
    if (sec.attribution) {
      fields.push({ label: sec.title || 'Quote', text: sec.attribution });
    }
    for (const item of sec.items || []) {
      fields.push({
        label: `${sec.title}: ${item.label}`,
        text: item.value,
      });
    }
    for (const b of sec.bullets || []) {
      fields.push({
        label: sec.title || 'List',
        text: `${b.title} ${b.content}`,
      });
    }
  }
  return fields;
}

/**
 * Finds all Zois and Locations connected to a given target entity
 * (both incoming references from other entries, outgoing references from the target entry,
 * and shared photo tags).
 */
export function findBacklinksForEntity(
  targetId: string,
  targetName: string,
  characters: CharacterEntry[],
  locations: LocationEntry[]
): BacklinkItem[] {
  const cleanName = targetName.trim();
  if (!cleanName) return [];

  const regex = new RegExp(
    `(\\[\\[${escapeRegExp(cleanName)}(\\|[^\\]]+)?\\]\\]|\\b${escapeRegExp(cleanName)}\\b)`,
    'i'
  );

  const results: BacklinkItem[] = [];
  const seenKeys = new Set<string>();

  const addResult = (item: BacklinkItem) => {
    const key = `${item.sourceType}:${item.sourceId}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      results.push(item);
    }
  };

  // 1. Incoming references from other Zois & locations
  for (const char of characters) {
    if (char.id === targetId) continue;
    const fields = collectCharacterSearchableStrings(char);
    const matchedField = fields.find(
      (f) => f.text === targetId || regex.test(f.text)
    );
    if (matchedField) {
      addResult({
        sourceType: 'character',
        sourceId: char.id,
        sourceName: char.name,
        sourceSubtitle:
          [char.title, char.occupation || char.role]
            .filter(Boolean)
            .join(' · ') || 'Zoi',
        contextLabel: matchedField.label,
      });
    }
  }

  for (const loc of locations) {
    if (loc.id === targetId) continue;
    const fields = collectLocationSearchableStrings(loc);
    const matchedField = fields.find(
      (f) => f.text === targetId || regex.test(f.text)
    );
    if (matchedField) {
      addResult({
        sourceType: 'location',
        sourceId: loc.id,
        sourceName: loc.name,
        sourceSubtitle:
          [loc.category, loc.region].filter(Boolean).join(' · ') || 'Location',
        contextLabel: matchedField.label,
      });
    }
  }

  // 2. Outgoing references from the target entity itself to any other Zoi or location
  const sourceChar = characters.find((c) => c.id === targetId);
  const sourceLoc = locations.find((l) => l.id === targetId);
  const ownFields = sourceChar
    ? collectCharacterSearchableStrings(sourceChar)
    : sourceLoc
      ? collectLocationSearchableStrings(sourceLoc)
      : [];

  if (ownFields.length > 0) {
    for (const char of characters) {
      if (char.id === targetId || !char.name.trim()) continue;
      const charRegex = new RegExp(
        `(\\[\\[${escapeRegExp(char.name.trim())}(\\|[^\\]]+)?\\]\\]|\\b${escapeRegExp(char.name.trim())}\\b)`,
        'i'
      );
      const hit = ownFields.find(
        (f) => f.text === char.id || charRegex.test(f.text)
      );
      if (hit) {
        addResult({
          sourceType: 'character',
          sourceId: char.id,
          sourceName: char.name,
          sourceSubtitle:
            [char.title, char.occupation || char.role]
              .filter(Boolean)
              .join(' · ') || 'Zoi',
          contextLabel: hit.label,
        });
      }
    }

    for (const loc of locations) {
      if (loc.id === targetId || !loc.name.trim()) continue;
      const locRegex = new RegExp(
        `(\\[\\[${escapeRegExp(loc.name.trim())}(\\|[^\\]]+)?\\]\\]|\\b${escapeRegExp(loc.name.trim())}\\b)`,
        'i'
      );
      const hit = ownFields.find(
        (f) => f.text === loc.id || locRegex.test(f.text)
      );
      if (hit) {
        addResult({
          sourceType: 'location',
          sourceId: loc.id,
          sourceName: loc.name,
          sourceSubtitle:
            [loc.category, loc.region].filter(Boolean).join(' · ') ||
            'Location',
          contextLabel: hit.label,
        });
      }
    }
  }

  return results;
}

/**
 * Returns all GalleryPhotos where a specific Zoi or Location is tagged.
 */
export function getPhotosForEntity(
  entityType: 'character' | 'location',
  entityId: string,
  photos: GalleryPhoto[]
): GalleryPhoto[] {
  return photos
    .filter((p) =>
      entityType === 'character'
        ? p.taggedCharacterIds.includes(entityId)
        : p.taggedLocationIds.includes(entityId)
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export interface HubDisplayPhoto {
  id: string;
  imageDataUrl: string;
  caption: string;
  taggedCharacterIds: string[];
  taggedLocationIds: string[];
  createdAt: string;
  isPrimaryPortraitOrCover?: boolean;
}

/**
 * Aggregates all submitted photos across the site for the Community Hub top showcase:
 * includes all GalleryPhotos plus primary portraits/covers submitted on Zoi & Location pages.
 */
export function getAllSubmittedPhotosForHub(
  characters: CharacterEntry[],
  locations: LocationEntry[],
  photos: GalleryPhoto[]
): HubDisplayPhoto[] {
  const result: HubDisplayPhoto[] = [];
  const seenUrls = new Set<string>();

  for (const p of photos) {
    if (!p.imageDataUrl) continue;
    seenUrls.add(p.imageDataUrl);
    result.push({
      id: p.id,
      imageDataUrl: p.imageDataUrl,
      caption: p.caption || 'Community Snapshot',
      taggedCharacterIds: p.taggedCharacterIds,
      taggedLocationIds: p.taggedLocationIds,
      createdAt: p.createdAt,
      isPrimaryPortraitOrCover: false,
    });
  }

  for (const char of characters) {
    if (char.portraitDataUrl && !seenUrls.has(char.portraitDataUrl)) {
      seenUrls.add(char.portraitDataUrl);
      result.push({
        id: `portrait-${char.id}`,
        imageDataUrl: char.portraitDataUrl,
        caption: `${char.name}${char.title ? ` — ${char.title}` : ''}`,
        taggedCharacterIds: [char.id],
        taggedLocationIds: [],
        createdAt: char.updatedAt || char.createdAt,
        isPrimaryPortraitOrCover: true,
      });
    }
  }

  for (const loc of locations) {
    if (loc.imageDataUrl && !seenUrls.has(loc.imageDataUrl)) {
      seenUrls.add(loc.imageDataUrl);
      result.push({
        id: `cover-${loc.id}`,
        imageDataUrl: loc.imageDataUrl,
        caption: `${loc.name}${loc.subtitle ? ` — ${loc.subtitle}` : ''}`,
        taggedCharacterIds: [],
        taggedLocationIds: [loc.id],
        createdAt: loc.updatedAt || loc.createdAt,
        isPrimaryPortraitOrCover: true,
      });
    }
  }

  return result.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/**
 * Builds an anonymous, living-city style feed event whenever a site entry or photo is added/updated.
 * Never mentions who made the change so the hub feels like a living local city portal.
 */
export function createAnonymousSiteFeedEvent(params: {
  action:
    | 'character_created'
    | 'character_updated'
    | 'location_created'
    | 'location_updated'
    | 'photo_submitted';
  entityName: string;
  entityId?: string;
  entitySubtitle?: string;
  secondaryContext?: string;
  imageUrl?: string;
}): CityFeedEvent {
  const now = new Date().toISOString();
  const id = `feed-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  switch (params.action) {
    case 'character_created':
      return {
        id,
        kind: 'site_update',
        category: 'Zoi Registry',
        headline: `New Zoi Arrival: ${params.entityName}`,
        body: `City census records have been updated with a full Encyclopedia Dossier for [[${params.entityName}]]${params.entitySubtitle ? ` (${params.entitySubtitle})` : ''}.${params.secondaryContext ? ` Currently associated with ${params.secondaryContext}.` : ''}`,
        districtOrMood: 'Municipal Archive',
        relatedEntityType: 'character',
        relatedEntityId: params.entityId,
        imageUrl: params.imageUrl,
        createdAt: now,
      };
    case 'character_updated':
      return {
        id,
        kind: 'site_update',
        category: 'Dossier Revision',
        headline: `Updated Zoi Dossier for ${params.entityName}`,
        body: `Recent observations, personal records, and life-path details for [[${params.entityName}]] have been logged in the city directory.`,
        districtOrMood: 'Records Bureau',
        relatedEntityType: 'character',
        relatedEntityId: params.entityId,
        imageUrl: params.imageUrl,
        createdAt: now,
      };
    case 'location_created':
      return {
        id,
        kind: 'site_update',
        category: 'Urban Survey',
        headline: `District Landmark Chartered: ${params.entityName}`,
        body: `The municipal gazetteer now includes survey notes and environmental data for [[${params.entityName}]]${params.entitySubtitle ? ` — ${params.entitySubtitle}` : ''}.`,
        districtOrMood: params.secondaryContext || 'City Planning',
        relatedEntityType: 'location',
        relatedEntityId: params.entityId,
        imageUrl: params.imageUrl,
        createdAt: now,
      };
    case 'location_updated':
      return {
        id,
        kind: 'site_update',
        category: 'District Notice',
        headline: `Gazetteer Update: ${params.entityName}`,
        body: `Local conditions, regional notes, and district records for [[${params.entityName}]] were refreshed following recent street surveys.`,
        districtOrMood: params.secondaryContext || 'District Watch',
        relatedEntityType: 'location',
        relatedEntityId: params.entityId,
        imageUrl: params.imageUrl,
        createdAt: now,
      };
    case 'photo_submitted':
      return {
        id,
        kind: 'site_update',
        category: 'Street Photography',
        headline: params.entityName || 'New Snapshot Added to City Feed',
        body: params.secondaryContext
          ? `A new visual snapshot was captured in the city archives featuring ${params.secondaryContext}.`
          : 'A new photograph was submitted to the public city gallery.',
        districtOrMood: 'Visual Feed',
        imageUrl: params.imageUrl,
        createdAt: now,
      };
  }
}

export interface SearchResultItem {
  id: string;
  type: 'character' | 'location';
  name: string;
  subtitle: string;
  matchedField: string;
  snippet: string;
  score: number;
  imageUrl: string;
}

/**
 * Searches across all Zois and locations by name, metadata, and section contents.
 */
export function searchCodexEntries(
  query: string,
  filterType: 'all' | 'character' | 'location',
  characters: CharacterEntry[],
  locations: LocationEntry[]
): SearchResultItem[] {
  const q = query.trim().toLowerCase();
  const results: SearchResultItem[] = [];

  if (filterType === 'all' || filterType === 'character') {
    for (const char of characters) {
      const genderLabel = char.gender || char.species || '';
      const subtitle =
        [char.title, char.occupation || char.role, genderLabel]
          .filter(Boolean)
          .join(' · ') || 'Zoi Profile';

      if (!q) {
        results.push({
          id: char.id,
          type: 'character',
          name: char.name,
          subtitle,
          matchedField: 'Directory',
          snippet: char.summary || 'Zoi entry',
          score: 50,
          imageUrl: char.portraitDataUrl,
        });
        continue;
      }

      const nameLower = char.name.toLowerCase();
      if (nameLower === q) {
        results.push({
          id: char.id,
          type: 'character',
          name: char.name,
          subtitle,
          matchedField: 'Exact Name Match',
          snippet: char.summary || subtitle,
          score: 100,
          imageUrl: char.portraitDataUrl,
        });
        continue;
      }
      if (nameLower.includes(q) || subtitle.toLowerCase().includes(q)) {
        results.push({
          id: char.id,
          type: 'character',
          name: char.name,
          subtitle,
          matchedField: 'Zoi Identity',
          snippet: char.summary || subtitle,
          score: 85,
          imageUrl: char.portraitDataUrl,
        });
        continue;
      }

      const fields = collectCharacterSearchableStrings(char);
      const hit = fields.find((f) => f.text.toLowerCase().includes(q));
      if (hit) {
        results.push({
          id: char.id,
          type: 'character',
          name: char.name,
          subtitle,
          matchedField: hit.label,
          snippet: hit.text.slice(0, 140),
          score: 60,
          imageUrl: char.portraitDataUrl,
        });
      }
    }
  }

  if (filterType === 'all' || filterType === 'location') {
    for (const loc of locations) {
      const subtitle =
        [loc.category, loc.region, loc.climate].filter(Boolean).join(' · ') ||
        'Location Profile';

      if (!q) {
        results.push({
          id: loc.id,
          type: 'location',
          name: loc.name,
          subtitle,
          matchedField: 'Directory',
          snippet: loc.summary || 'Location entry',
          score: 50,
          imageUrl: loc.imageDataUrl,
        });
        continue;
      }

      const nameLower = loc.name.toLowerCase();
      if (nameLower === q) {
        results.push({
          id: loc.id,
          type: 'location',
          name: loc.name,
          subtitle,
          matchedField: 'Exact Name Match',
          snippet: loc.summary || subtitle,
          score: 100,
          imageUrl: loc.imageDataUrl,
        });
        continue;
      }
      if (nameLower.includes(q) || subtitle.toLowerCase().includes(q)) {
        results.push({
          id: loc.id,
          type: 'location',
          name: loc.name,
          subtitle,
          matchedField: 'Location Identity',
          snippet: loc.summary || subtitle,
          score: 85,
          imageUrl: loc.imageDataUrl,
        });
        continue;
      }

      const fields = collectLocationSearchableStrings(loc);
      const hit = fields.find((f) => f.text.toLowerCase().includes(q));
      if (hit) {
        results.push({
          id: loc.id,
          type: 'location',
          name: loc.name,
          subtitle,
          matchedField: hit.label,
          snippet: hit.text.slice(0, 140),
          score: 60,
          imageUrl: loc.imageDataUrl,
        });
      }
    }
  }

  return results.sort(
    (a, b) => b.score - a.score || a.name.localeCompare(b.name)
  );
}

/**
 * Computes output pixel dimensions for a crop aspect ratio preset.
 */
export function getAspectDimensions(
  aspectRatio: ImageCropConfig['aspectRatio'],
  baseWidth: number = 600
): { width: number; height: number } {
  switch (aspectRatio) {
    case '3:4':
      return { width: baseWidth, height: Math.round((baseWidth * 4) / 3) };
    case '2:3':
      return { width: baseWidth, height: Math.round((baseWidth * 3) / 2) };
    case '1:1':
      return { width: baseWidth, height: baseWidth };
    case '16:9':
      return { width: baseWidth, height: Math.round((baseWidth * 9) / 16) };
  }
}

export interface CropDrawParams {
  dx: number;
  dy: number;
  dWidth: number;
  dHeight: number;
}

/**
 * Pure geometry calculation for rendering a moved, resized, and cropped image onto a target canvas.
 */
export function calculateCropDrawParams(
  sourceWidth: number,
  sourceHeight: number,
  config: ImageCropConfig
): CropDrawParams {
  const safeSrcW = Math.max(1, sourceWidth);
  const safeSrcH = Math.max(1, sourceHeight);
  const outW = Math.max(1, config.outputWidth);
  const outH = Math.max(1, config.outputHeight);

  const baseCoverScale = Math.max(outW / safeSrcW, outH / safeSrcH);
  const clampedScale = Math.min(4.0, Math.max(0.2, config.scale));
  const effectiveScale = baseCoverScale * clampedScale;

  const dWidth = safeSrcW * effectiveScale;
  const dHeight = safeSrcH * effectiveScale;

  const dx = (outW - dWidth) / 2 + config.offsetX;
  const dy = (outH - dHeight) / 2 + config.offsetY;

  return {
    dx: Math.round(dx * 100) / 100,
    dy: Math.round(dy * 100) / 100,
    dWidth: Math.round(dWidth * 100) / 100,
    dHeight: Math.round(dHeight * 100) / 100,
  };
}

/**
 * Validates and normalizes an archive payload loaded from Google Drive or JSON import,
 * including migrating legacy `species` to `gender`, normalizing `status` to `'Alive'`,
 * normalizing `age` stage + exact age, normalizing `businessOwner` & `businessStaff`,
 * enforcing `'encyclopedia'` as the main profile layout, and normalizing `socialPosts`.
 */
export function validateAndNormalizeArchive(raw: unknown): CodexArchive {
  const fallback = createEmptyArchive();
  if (!raw || typeof raw !== 'object') {
    return fallback;
  }
  const obj = raw as Record<string, unknown>;
  const rawChars = Array.isArray(obj.characters) ? obj.characters : [];
  const characters: CharacterEntry[] = rawChars
    .filter(
      (c) =>
        c &&
        typeof c === 'object' &&
        typeof (c as CharacterEntry).id === 'string'
    )
    .map((c) => {
      const ch = c as Partial<CharacterEntry>;
      const rawStatus = (ch.status || '').trim();
      const normalizedStatus =
        !rawStatus || rawStatus.toLowerCase() === 'active'
          ? 'Alive'
          : rawStatus;

      const householdStatus: HouseholdStatusType | '' =
        ch.householdStatus === 'Family'
          ? 'Family'
          : ch.householdStatus === 'Single'
            ? 'Single'
            : '';

      const validRelStatuses: RelationshipStatusType[] = [
        'Single',
        'Dating',
        'Engaged',
        'Married',
      ];
      const relationshipStatus: RelationshipStatusType | '' =
        validRelStatuses.includes(
          ch.relationshipStatus as RelationshipStatusType
        )
          ? (ch.relationshipStatus as RelationshipStatusType)
          : '';

      const relationshipPartner = ch.relationshipPartner || '';
      const relationships =
        formatRelationshipDisplay(
          relationshipStatus,
          relationshipPartner,
          ch.relationships
        ) ||
        ch.relationships ||
        '';

      const parsedAge = parseZoiAge(ch.age);
      const normalizedAge = formatZoiAge(parsedAge.stage, parsedAge.exactAge);

      const followingIds = Array.isArray(ch.followingIds)
        ? Array.from(
            new Set(
              ch.followingIds.filter(
                (id): id is string =>
                  typeof id === 'string' && id.trim().length > 0 && id !== ch.id
              )
            )
          )
        : [];

      return {
        id: ch.id!,
        name: ch.name || 'Unnamed Zoi',
        title: ch.title || '',
        role: ch.role || '',
        gender: ch.gender ?? ch.species ?? '',
        pronouns: ch.pronouns || '',
        age: normalizedAge || ch.age || '',
        birthdate: ch.birthdate || '',
        height: ch.height || '',
        occupation: ch.occupation || '',
        personality: ch.personality || '',
        ambition: ch.ambition || '',
        householdStatus,
        relationshipStatus,
        relationshipPartner,
        relationships,
        affiliation: ch.affiliation || '',
        status: normalizedStatus,
        originLocation: ch.originLocation || '',
        summary: ch.summary || '',
        followingIds,
        portraitDataUrl: ch.portraitDataUrl || '',
        rawPortraitDataUrl: ch.rawPortraitDataUrl,
        cropConfig: ch.cropConfig,
        backgroundDataUrl: ch.backgroundDataUrl || '',
        rawBackgroundDataUrl: ch.rawBackgroundDataUrl,
        backgroundCropConfig: ch.backgroundCropConfig,
        socialBannerDataUrl: ch.socialBannerDataUrl || '',
        rawSocialBannerDataUrl: ch.rawSocialBannerDataUrl,
        socialBannerCropConfig: ch.socialBannerCropConfig,
        profileDesign: 'encyclopedia',
        personalAttributes: Array.isArray(ch.personalAttributes)
          ? ch.personalAttributes
          : [],
        sections: Array.isArray(ch.sections) ? ch.sections : [],
        createdAt: ch.createdAt || new Date().toISOString(),
        updatedAt: ch.updatedAt || new Date().toISOString(),
      };
    });

  const rawLocations = Array.isArray(obj.locations) ? obj.locations : [];
  const locations: LocationEntry[] = rawLocations
    .filter(
      (l) =>
        l &&
        typeof l === 'object' &&
        typeof (l as LocationEntry).id === 'string'
    )
    .map((l) => {
      const loc = l as Partial<LocationEntry>;
      const category = normalizeLocationCategory(loc.category);
      const businessOwner =
        category === 'Business lot' && typeof loc.businessOwner === 'string'
          ? loc.businessOwner.trim()
          : undefined;
      const businessStaff: BusinessStaffMember[] | undefined =
        category === 'Business lot' && Array.isArray(loc.businessStaff)
          ? loc.businessStaff
              .filter(
                (s) =>
                  s &&
                  typeof s === 'object' &&
                  typeof (s as BusinessStaffMember).name === 'string'
              )
              .map((s, idx) => ({
                id:
                  typeof s.id === 'string' && s.id
                    ? s.id
                    : `staff-${Date.now()}-${idx}`,
                name: (s.name || '').trim(),
                role: (s.role || '').trim(),
                shiftOrNotes:
                  typeof s.shiftOrNotes === 'string'
                    ? s.shiftOrNotes.trim()
                    : undefined,
              }))
          : undefined;

      return {
        id: loc.id!,
        name: loc.name || 'Unnamed Location',
        subtitle: loc.subtitle || '',
        category,
        region: loc.region || '',
        climate: loc.climate || '',
        rulerOrFaction: loc.rulerOrFaction || '',
        eraOrCoordinates: loc.eraOrCoordinates || '',
        summary: loc.summary || '',
        businessOwner,
        businessStaff,
        imageDataUrl: loc.imageDataUrl || '',
        rawImageDataUrl: loc.rawImageDataUrl,
        cropConfig: loc.cropConfig,
        backgroundDataUrl: loc.backgroundDataUrl || '',
        rawBackgroundDataUrl: loc.rawBackgroundDataUrl,
        backgroundCropConfig: loc.backgroundCropConfig,
        socialBannerDataUrl: loc.socialBannerDataUrl || '',
        rawSocialBannerDataUrl: loc.rawSocialBannerDataUrl,
        socialBannerCropConfig: loc.socialBannerCropConfig,
        attributes: Array.isArray(loc.attributes) ? loc.attributes : [],
        sections: Array.isArray(loc.sections) ? loc.sections : [],
        createdAt: loc.createdAt || new Date().toISOString(),
        updatedAt: loc.updatedAt || new Date().toISOString(),
      };
    });

  const photos = Array.isArray(obj.photos)
    ? (obj.photos.filter(
        (p) =>
          p &&
          typeof p === 'object' &&
          typeof (p as GalleryPhoto).id === 'string'
      ) as GalleryPhoto[])
    : [];

  const feedEvents = Array.isArray(obj.feedEvents)
    ? (obj.feedEvents.filter(
        (f) =>
          f &&
          typeof f === 'object' &&
          typeof (f as CityFeedEvent).id === 'string'
      ) as CityFeedEvent[])
    : [];

  const socialPosts: SocialMediaPost[] = Array.isArray(obj.socialPosts)
    ? (obj.socialPosts
        .filter(
          (p) =>
            p &&
            typeof p === 'object' &&
            typeof (p as SocialMediaPost).id === 'string'
        )
        .map((p) => {
          const post = p as Partial<SocialMediaPost>;
          return {
            id: post.id!,
            pageEntityType:
              post.pageEntityType === 'location' ? 'location' : 'character',
            pageEntityId: post.pageEntityId || '',
            authorType:
              post.authorType === 'location' ? 'location' : 'character',
            authorId: post.authorId || '',
            authorName: post.authorName || 'Zoi',
            authorHandle:
              post.authorHandle || formatSocialHandle(post.authorName || 'zoi'),
            content: post.content || '',
            imageUrl: post.imageUrl,
            likesCount:
              typeof post.likesCount === 'number' ? post.likesCount : 0,
            repostsCount:
              typeof post.repostsCount === 'number' ? post.repostsCount : 0,
            isAiGenerated: Boolean(post.isAiGenerated),
            comments: Array.isArray(post.comments)
              ? post.comments.map((cm) => ({
                  ...cm,
                  replies: Array.isArray(cm.replies) ? cm.replies : [],
                }))
              : [],
            createdAt: post.createdAt || new Date().toISOString(),
          };
        }) as SocialMediaPost[])
    : [];

  const rawSettings =
    obj.settings && typeof obj.settings === 'object'
      ? (obj.settings as Partial<CodexSettings>)
      : {};

  const validCooldowns: Array<2 | 5 | 15> = [2, 5, 15];
  const aiCooldownMinutes = validCooldowns.includes(
    rawSettings.aiCooldownMinutes as 2 | 5 | 15
  )
    ? (rawSettings.aiCooldownMinutes as 2 | 5 | 15)
    : DEFAULT_SETTINGS.aiCooldownMinutes;

  const siteBackgroundOverlayOpacity =
    typeof rawSettings.siteBackgroundOverlayOpacity === 'number'
      ? Math.min(
          0.92,
          Math.max(0.45, rawSettings.siteBackgroundOverlayOpacity)
        )
      : DEFAULT_SETTINGS.siteBackgroundOverlayOpacity;

  return {
    version: 5,
    updatedAt:
      typeof obj.updatedAt === 'string'
        ? obj.updatedAt
        : new Date().toISOString(),
    characters,
    locations,
    photos,
    feedEvents,
    socialPosts,
    settings: {
      defaultProfileDesign: 'encyclopedia',
      autoHyperlinkNames:
        typeof rawSettings.autoHyperlinkNames === 'boolean'
          ? rawSettings.autoHyperlinkNames
          : DEFAULT_SETTINGS.autoHyperlinkNames,
      directoryGridColumns: rawSettings.directoryGridColumns === 4 ? 4 : 3,
      showLinkPreviews:
        typeof rawSettings.showLinkPreviews === 'boolean'
          ? rawSettings.showLinkPreviews
          : DEFAULT_SETTINGS.showLinkPreviews,
      driveFileName:
        typeof rawSettings.driveFileName === 'string' &&
        rawSettings.driveFileName.trim().length > 0
          ? rawSettings.driveFileName.trim()
          : DEFAULT_SETTINGS.driveFileName,
      confirmBeforeCloudOverwrite:
        typeof rawSettings.confirmBeforeCloudOverwrite === 'boolean'
          ? rawSettings.confirmBeforeCloudOverwrite
          : DEFAULT_SETTINGS.confirmBeforeCloudOverwrite,
      enableAiCityEvents:
        typeof rawSettings.enableAiCityEvents === 'boolean'
          ? rawSettings.enableAiCityEvents
          : DEFAULT_SETTINGS.enableAiCityEvents,
      aiCooldownMinutes,
      defaultSiteBackgroundUrl:
        typeof rawSettings.defaultSiteBackgroundUrl === 'string'
          ? rawSettings.defaultSiteBackgroundUrl
          : DEFAULT_SETTINGS.defaultSiteBackgroundUrl,
      rawDefaultSiteBackgroundUrl:
        typeof rawSettings.rawDefaultSiteBackgroundUrl === 'string'
          ? rawSettings.rawDefaultSiteBackgroundUrl
          : undefined,
      defaultSiteBackgroundCropConfig:
        rawSettings.defaultSiteBackgroundCropConfig,
      siteBackgroundOverlayOpacity,
    },
  };
}

/**
 * Compacts an archive before persisting to browser storage by removing redundant
 * uncropped `raw*DataUrl` duplicates (falling back to the cropped image when re-editing)
 * and optionally stripping large base64 strings if `localStorage` is over its 5MB quota
 * (while IndexedDB and Google Drive retain the full-resolution images).
 */
export function compactArchiveForStorage(
  archive: CodexArchive,
  stripAllLargeDataUrls: boolean = false
): CodexArchive {
  const isOversizedDataUrl = (val?: string) =>
    Boolean(
      stripAllLargeDataUrls &&
        val &&
        val.startsWith('data:') &&
        val.length > 4096
    );

  return {
    ...archive,
    characters: archive.characters.map((c) => ({
      ...c,
      portraitDataUrl: isOversizedDataUrl(c.portraitDataUrl)
        ? ''
        : c.portraitDataUrl,
      rawPortraitDataUrl: undefined,
      backgroundDataUrl: isOversizedDataUrl(c.backgroundDataUrl)
        ? undefined
        : c.backgroundDataUrl,
      rawBackgroundDataUrl: undefined,
      socialBannerDataUrl: isOversizedDataUrl(c.socialBannerDataUrl)
        ? undefined
        : c.socialBannerDataUrl,
      rawSocialBannerDataUrl: undefined,
    })),
    locations: archive.locations.map((l) => ({
      ...l,
      imageDataUrl: isOversizedDataUrl(l.imageDataUrl) ? '' : l.imageDataUrl,
      rawImageDataUrl: undefined,
      backgroundDataUrl: isOversizedDataUrl(l.backgroundDataUrl)
        ? undefined
        : l.backgroundDataUrl,
      rawBackgroundDataUrl: undefined,
      socialBannerDataUrl: isOversizedDataUrl(l.socialBannerDataUrl)
        ? undefined
        : l.socialBannerDataUrl,
      rawSocialBannerDataUrl: undefined,
    })),
    photos: stripAllLargeDataUrls
      ? []
      : archive.photos.map((p) => ({
          ...p,
          rawImageDataUrl: undefined,
        })),
    feedEvents: archive.feedEvents.slice(0, 60).map((f) => ({
      ...f,
      imageUrl:
        f.imageUrl && f.imageUrl.startsWith('data:') && f.imageUrl.length > 16384
          ? undefined
          : f.imageUrl,
    })),
    socialPosts: (archive.socialPosts || []).map((post) => ({
      ...post,
      imageUrl: isOversizedDataUrl(post.imageUrl) ? undefined : post.imageUrl,
    })),
    settings: {
      ...archive.settings,
      defaultSiteBackgroundUrl: isOversizedDataUrl(
        archive.settings.defaultSiteBackgroundUrl
      )
        ? ''
        : archive.settings.defaultSiteBackgroundUrl,
      rawDefaultSiteBackgroundUrl: undefined,
    },
  };
}

/**
 * Returns all Zois who follow `targetZoiId` on ZoiNet.
 */
export function getFollowersForZoi(
  targetZoiId: string,
  characters: CharacterEntry[]
): CharacterEntry[] {
  return characters.filter(
    (c) =>
      c.id !== targetZoiId &&
      Array.isArray(c.followingIds) &&
      c.followingIds.includes(targetZoiId)
  );
}

/**
 * Returns all Zois that `zoi` is currently following on ZoiNet.
 */
export function getFollowingForZoi(
  zoi: CharacterEntry,
  characters: CharacterEntry[]
): CharacterEntry[] {
  const ids = new Set(zoi.followingIds || []);
  return characters.filter((c) => c.id !== zoi.id && ids.has(c.id));
}

function getAgeSortScore(rawAge: string): number {
  const { stage, exactAge } = parseZoiAge(rawAge);
  const stageRanks: Record<string, number> = {
    Child: 100,
    Teenager: 200,
    'Young Adult': 300,
    Adult: 400,
    Elder: 500,
    Ageless: 600,
  };
  const baseRank = stageRanks[stage] ?? 900;
  const numericExact = parseInt(exactAge, 10);
  return baseRank + (Number.isNaN(numericExact) ? 50 : numericExact);
}

/**
 * Sorts Zoi entries for the Zoi Directory page:
 * - PRIMARY PARTITION RULE: Entries WITHOUT an uploaded profile image (`portraitDataUrl`)
 *   are ALWAYS moved to the bottom of the list.
 * - SECONDARY SORT RULE: Within each group, sorts by the selected `CharacterSortOption`.
 */
export function sortCharactersForDirectory(
  characters: CharacterEntry[],
  sortBy: CharacterSortOption = 'recent'
): CharacterEntry[] {
  const followerCounts = new Map<string, number>();
  for (const c of characters) {
    followerCounts.set(c.id, 0);
  }
  for (const c of characters) {
    for (const targetId of c.followingIds || []) {
      followerCounts.set(targetId, (followerCounts.get(targetId) || 0) + 1);
    }
  }

  return [...characters].sort((a, b) => {
    const aHasImage = Boolean(a.portraitDataUrl && a.portraitDataUrl.trim());
    const bHasImage = Boolean(b.portraitDataUrl && b.portraitDataUrl.trim());
    if (aHasImage !== bHasImage) {
      return aHasImage ? -1 : 1;
    }

    switch (sortBy) {
      case 'name_asc':
        return a.name.localeCompare(b.name);
      case 'name_desc':
        return b.name.localeCompare(a.name);
      case 'created_desc':
        return (
          (b.createdAt || '').localeCompare(a.createdAt || '') ||
          a.name.localeCompare(b.name)
        );
      case 'age_asc':
        return (
          getAgeSortScore(a.age) - getAgeSortScore(b.age) ||
          a.name.localeCompare(b.name)
        );
      case 'affiliation_asc': {
        const affA = (a.affiliation || '').trim() || 'zzzz';
        const affB = (b.affiliation || '').trim() || 'zzzz';
        return affA.localeCompare(affB) || a.name.localeCompare(b.name);
      }
      case 'followers_desc': {
        const fA = followerCounts.get(a.id) || 0;
        const fB = followerCounts.get(b.id) || 0;
        return fB - fA || a.name.localeCompare(b.name);
      }
      case 'recent':
      default:
        return (
          (b.updatedAt || b.createdAt || '').localeCompare(
            a.updatedAt || a.createdAt || ''
          ) || a.name.localeCompare(b.name)
        );
    }
  });
}

/**
 * Sorts Location entries for the Location Directory page:
 * - PRIMARY PARTITION RULE: Entries WITHOUT an uploaded profile/cover image (`imageDataUrl`)
 *   are ALWAYS moved to the bottom of the list.
 * - SECONDARY SORT RULE: Within each group, sorts by the selected `LocationSortOption`.
 */
export function sortLocationsForDirectory(
  locations: LocationEntry[],
  sortBy: LocationSortOption = 'recent'
): LocationEntry[] {
  return [...locations].sort((a, b) => {
    const aHasImage = Boolean(a.imageDataUrl && a.imageDataUrl.trim());
    const bHasImage = Boolean(b.imageDataUrl && b.imageDataUrl.trim());
    if (aHasImage !== bHasImage) {
      return aHasImage ? -1 : 1;
    }

    switch (sortBy) {
      case 'name_asc':
        return a.name.localeCompare(b.name);
      case 'name_desc':
        return b.name.localeCompare(a.name);
      case 'created_desc':
        return (
          (b.createdAt || '').localeCompare(a.createdAt || '') ||
          a.name.localeCompare(b.name)
        );
      case 'category_asc':
        return (
          a.category.localeCompare(b.category) || a.name.localeCompare(b.name)
        );
      case 'region_asc': {
        const regA = (a.region || '').trim() || 'zzzz';
        const regB = (b.region || '').trim() || 'zzzz';
        return regA.localeCompare(regB) || a.name.localeCompare(b.name);
      }
      case 'recent':
      default:
        return (
          (b.updatedAt || b.createdAt || '').localeCompare(
            a.updatedAt || a.createdAt || ''
          ) || a.name.localeCompare(b.name)
        );
    }
  });
}

/**
 * Computes social affinity weight between two Zois for natural following & social interaction.
 */
export function calculateFollowAffinityWeight(
  sourceZoi: CharacterEntry,
  targetZoi: CharacterEntry
): number {
  if (sourceZoi.id === targetZoi.id) return 0;
  let weight = 1.0;

  const cleanPartner = (sourceZoi.relationshipPartner || '')
    .replace(/^\[\[|\]\]$/g, '')
    .trim()
    .toLowerCase();
  if (cleanPartner && cleanPartner === targetZoi.name.trim().toLowerCase()) {
    weight += 4.0;
  }

  if (
    sourceZoi.affiliation &&
    targetZoi.affiliation &&
    sourceZoi.affiliation.trim().toLowerCase() ===
      targetZoi.affiliation.trim().toLowerCase()
  ) {
    weight += 1.8;
  }

  if (
    sourceZoi.originLocation &&
    targetZoi.originLocation &&
    sourceZoi.originLocation
      .replace(/^\[\[|\]\]$/g, '')
      .trim()
      .toLowerCase() ===
      targetZoi.originLocation
        .replace(/^\[\[|\]\]$/g, '')
        .trim()
        .toLowerCase()
  ) {
    weight += 1.5;
  }

  const sourceTraits = new Set(
    parsePersonalityTraits(sourceZoi.personality).map((t) => t.toLowerCase())
  );
  const targetTraits = parsePersonalityTraits(targetZoi.personality).map((t) =>
    t.toLowerCase()
  );
  for (const t of targetTraits) {
    if (sourceTraits.has(t)) {
      weight += 1.1;
    }
  }

  // Mutual follow-back boost
  if ((targetZoi.followingIds || []).includes(sourceZoi.id)) {
    weight += 2.2;
  }

  return weight;
}

/**
 * Naturally gives a Zoi a chance to start following another Zoi on ZoiNet.
 * Returns the updated characters list along with the follower and target Zoi if a new follow occurred.
 */
export function evolveNaturalZoiFollow(
  characters: CharacterEntry[],
  preferredZoiId?: string
): {
  updatedCharacters: CharacterEntry[];
  follower: CharacterEntry;
  target: CharacterEntry;
} | null {
  if (characters.length < 2) return null;

  const candidates: Array<{
    follower: CharacterEntry;
    target: CharacterEntry;
    weight: number;
  }> = [];

  for (const follower of characters) {
    const existingFollows = new Set(follower.followingIds || []);
    for (const target of characters) {
      if (follower.id === target.id) continue;
      if (existingFollows.has(target.id)) continue;

      let weight = calculateFollowAffinityWeight(follower, target);
      if (
        preferredZoiId &&
        (follower.id === preferredZoiId || target.id === preferredZoiId)
      ) {
        weight *= 3.0;
      }
      candidates.push({ follower, target, weight });
    }
  }

  if (candidates.length === 0) return null;

  const totalWeight = candidates.reduce((acc, c) => acc + c.weight, 0);
  let roll = Math.random() * totalWeight;
  let chosen = candidates[0];
  for (const item of candidates) {
    roll -= item.weight;
    if (roll <= 0) {
      chosen = item;
      break;
    }
  }

  const now = new Date().toISOString();
  const updatedCharacters = characters.map((c) => {
    if (c.id !== chosen.follower.id) return c;
    const nextFollowing = Array.from(
      new Set([...(c.followingIds || []), chosen.target.id])
    );
    return {
      ...c,
      followingIds: nextFollowing,
      updatedAt: now,
    };
  });

  const updatedFollower =
    updatedCharacters.find((c) => c.id === chosen.follower.id) ||
    chosen.follower;

  return {
    updatedCharacters,
    follower: updatedFollower,
    target: chosen.target,
  };
}

/**
 * Selects another Zoi to comment on a post, giving a 3.5x probability boost
 * to Zois who follow the post author (and an extra 1.5x boost for mutual followers).
 */
export function pickWeightedCommenterZoi(
  postAuthorId: string,
  characters: CharacterEntry[],
  excludeCommenterIds: string[] = []
): { zoi: CharacterEntry; isFollower: boolean; weight: number } | null {
  const otherZois = characters.filter((c) => c.id !== postAuthorId);
  if (otherZois.length === 0) return null;

  const pool =
    otherZois.filter((c) => !excludeCommenterIds.includes(c.id)).length > 0
      ? otherZois.filter((c) => !excludeCommenterIds.includes(c.id))
      : otherZois;

  const postAuthor = characters.find((c) => c.id === postAuthorId);

  const weightedPool = pool.map((zoi) => {
    const isFollower = (zoi.followingIds || []).includes(postAuthorId);
    const isFollowedByAuthor = Boolean(
      postAuthor && (postAuthor.followingIds || []).includes(zoi.id)
    );
    let weight = 1.0;
    if (isFollower) {
      // Following someone strongly increases the chance of commenting on their posts
      weight *= 3.5;
    }
    if (isFollowedByAuthor) {
      weight *= 1.5;
    }
    if (postAuthor) {
      weight +=
        (calculateFollowAffinityWeight(zoi, postAuthor) - 1.0) * 0.35;
    }
    return { zoi, isFollower, weight };
  });

  const totalWeight = weightedPool.reduce((acc, item) => acc + item.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const item of weightedPool) {
    roll -= item.weight;
    if (roll <= 0) {
      return item;
    }
  }
  return weightedPool[0];
}

/**
 * Picks another Zoi for `author` to mention/post about on their social feed,
 * giving a 4x higher chance to Zois that `author` follows.
 */
export function pickFollowedZoiForMention(
  author: CharacterEntry,
  characters: CharacterEntry[]
): CharacterEntry | null {
  const others = characters.filter((c) => c.id !== author.id);
  if (others.length === 0) return null;

  const followingSet = new Set(author.followingIds || []);
  const weighted = others.map((target) => ({
    target,
    weight: followingSet.has(target.id) ? 4.0 : 1.0,
  }));

  const totalWeight = weighted.reduce((acc, w) => acc + w.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const item of weighted) {
    roll -= item.weight;
    if (roll <= 0) {
      return item.target;
    }
  }
  return weighted[0].target;
}

/**
 * Generates an autonomous in-character social media post for a Zoi,
 * with a boosted probability of posting about a Zoi they follow or a city location.
 */
export function generateAutonomousZoiPost(
  author: CharacterEntry,
  characters: CharacterEntry[],
  locations: LocationEntry[]
): SocialMediaPost {
  const followingZois = getFollowingForZoi(author, characters);
  const mentionedZoi =
    followingZois.length > 0 && Math.random() < 0.72
      ? followingZois[Math.floor(Math.random() * followingZois.length)]
      : Math.random() < 0.45
        ? pickFollowedZoiForMention(author, characters)
        : null;

  const cleanOrigin = (author.originLocation || '')
    .replace(/^\[\[|\]\]$/g, '')
    .trim();
  const matchedLoc =
    locations.find(
      (l) => l.name.toLowerCase() === cleanOrigin.toLowerCase()
    ) ||
    (locations.length > 0
      ? locations[Math.floor(Math.random() * locations.length)]
      : undefined);

  const locTag = matchedLoc
    ? `[[${matchedLoc.name}]]`
    : cleanOrigin
      ? `[[${cleanOrigin}]]`
      : 'the central promenade';
  const roleDesc = author.occupation || author.role || 'city resident';
  const traits = parsePersonalityTraits(author.personality);
  const primaryTrait = traits[0] || 'observant';

  const templatesWithFollowedZoi = mentionedZoi
    ? [
        `Just caught up with [[${mentionedZoi.name}]] near ${locTag}! Always love seeing what they're working on lately. #ZoiNet #CityLife`,
        `Saw [[${mentionedZoi.name}]]'s latest update and had to shout them out — best energy around ${locTag} today. ✨ #ZoiNet`,
        `Grabbing an iced espresso at ${locTag} before meeting up with [[${mentionedZoi.name}]]. Being a ${roleDesc} never slows down! #inZOI`,
        `Honestly glad I started following [[${mentionedZoi.name}]] on here. Running into them around ${locTag} always makes the evening better.`,
      ]
    : [];

  const soloTemplates = [
    `Wrapping up another shift as ${roleDesc} near ${locTag}. The city lights hit different when you're feeling ${primaryTrait.toLowerCase()}. #ZoiNet`,
    `Taking a quiet walk through ${locTag} to clear my head and focus on my next goal${author.ambition ? `: ${author.ambition.toLowerCase()}` : ''}. #CityVibes`,
    `Late-afternoon breeze rolling across ${locTag}. Anyone else out and about this evening? #ZoiNet`,
    `Between ${roleDesc} duties and life in ${locTag}, today actually turned out pretty unforgettable. #inZOI`,
  ];

  const pool =
    templatesWithFollowedZoi.length > 0
      ? [...templatesWithFollowedZoi, ...templatesWithFollowedZoi, ...soloTemplates]
      : soloTemplates;
  const content = pool[Math.floor(Math.random() * pool.length)];

  return {
    id: `post-auto-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    pageEntityType: 'character',
    pageEntityId: author.id,
    authorType: 'character',
    authorId: author.id,
    authorName: author.name,
    authorHandle: formatSocialHandle(author.name),
    content,
    likesCount: Math.floor(Math.random() * 6) + 1,
    repostsCount: Math.floor(Math.random() * 2),
    isAiGenerated: true,
    comments: [],
    createdAt: new Date().toISOString(),
  };
}

/**
 * Generates an automatic in-character comment from `commenter` on `post`.
 */
export function generateAutonomousZoiComment(
  commenter: CharacterEntry,
  post: SocialMediaPost
): SocialPostComment {
  const isFollowingAuthor = (commenter.followingIds || []).includes(
    post.authorId
  );
  const authorLink = `[[${post.authorName}]]`;
  const traits = parsePersonalityTraits(commenter.personality);
  const traitFlavor = traits[0] ? ` (${traits[0]})` : '';

  const followerTemplates = [
    `Glad I follow your feed ${authorLink}! Always love seeing your updates pop up on my timeline.`,
    `Couldn't agree more, ${authorLink}! Let's catch up soon next time we're in the same district.`,
    `Every time ${authorLink} posts, it's a highlight on my ZoiNet feed. Keep shining!`,
    `Wait for me ${authorLink}! I'm heading over that way right now${traitFlavor}.`,
  ];

  const generalTemplates = [
    `Spotted this on the city feed — hope your day is going great, ${authorLink}!`,
    `That vibe is unmatched, ${authorLink}. Might swing by later this evening!`,
    `Classic ${authorLink}! The whole neighborhood has been talking about this.`,
    `Love this update ${authorLink} — definitely keeping an eye on what happens next.`,
  ];

  const templates = isFollowingAuthor
    ? [...followerTemplates, ...generalTemplates]
    : generalTemplates;

  return {
    id: `comment-auto-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    postId: post.id,
    authorType: 'character',
    authorId: commenter.id,
    authorName: commenter.name,
    authorHandle: formatSocialHandle(commenter.name),
    content: templates[Math.floor(Math.random() * templates.length)],
    likesCount: Math.floor(Math.random() * 3) + 1,
    isAiGenerated: true,
    replies: [],
    createdAt: new Date().toISOString(),
  };
}

/**
 * Generates an automatic in-character reply from the post author to a comment left on their post.
 */
export function generateAutonomousZoiReply(
  postAuthorName: string,
  postAuthorType: 'character' | 'location',
  postAuthorId: string,
  comment: SocialPostComment
): SocialCommentReply {
  const commenterLink = `[[${comment.authorName}]]`;
  const templates = [
    `Thanks so much ${commenterLink}! Let's definitely link up soon.`,
    `Always appreciate hearing from you, ${commenterLink}! 🙌`,
    `Haha you know me too well, ${commenterLink}! See you around the district.`,
    `Means a lot coming from you, ${commenterLink}! Coffee is on me next time.`,
  ];

  return {
    id: `reply-auto-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    authorType: postAuthorType,
    authorId: postAuthorId,
    authorName: postAuthorName,
    authorHandle: formatSocialHandle(postAuthorName),
    content: templates[Math.floor(Math.random() * templates.length)],
    likesCount: Math.floor(Math.random() * 2) + 1,
    isAiGenerated: true,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Creates a Community Hub feed event when a Zoi naturally starts following another Zoi.
 */
export function createAutonomousFollowFeedEvent(
  follower: CharacterEntry,
  target: CharacterEntry
): CityFeedEvent {
  return {
    id: `feed-follow-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    kind: 'ai_inzoi',
    category: 'ZoiNet Connection',
    headline: `${follower.name} Started Following ${target.name} on ZoiNet`,
    body: `Social circles in the city continue to evolve — [[${follower.name}]] (${formatSocialHandle(follower.name)}) is now following [[${target.name}]] (${formatSocialHandle(target.name)}), increasing their chances of commenting and posting together.`,
    districtOrMood: 'Social Network',
    relatedEntityType: 'character',
    relatedEntityId: follower.id,
    imageUrl: follower.portraitDataUrl || target.portraitDataUrl || undefined,
    createdAt: new Date().toISOString(),
  };
}

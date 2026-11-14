import {
  ActiveRoute,
  CharacterEntry,
  CityFeedEvent,
  CodexArchive,
  CodexSettings,
  GalleryPhoto,
  HouseholdStatusType,
  ImageCropConfig,
  LOCATION_CATEGORIES,
  LocationCategoryType,
  LocationEntry,
  RelationshipStatusType,
  SocialMediaPost,
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
    version: 4,
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

      return {
        id: ch.id!,
        name: ch.name || 'Unnamed Zoi',
        title: ch.title || '',
        role: ch.role || '',
        gender: ch.gender ?? ch.species ?? '',
        pronouns: ch.pronouns || '',
        age: ch.age || '',
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
        portraitDataUrl: ch.portraitDataUrl || '',
        rawPortraitDataUrl: ch.rawPortraitDataUrl,
        cropConfig: ch.cropConfig,
        backgroundDataUrl: ch.backgroundDataUrl || '',
        rawBackgroundDataUrl: ch.rawBackgroundDataUrl,
        backgroundCropConfig: ch.backgroundCropConfig,
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
      return {
        id: loc.id!,
        name: loc.name || 'Unnamed Location',
        subtitle: loc.subtitle || '',
        category: normalizeLocationCategory(loc.category),
        region: loc.region || '',
        climate: loc.climate || '',
        rulerOrFaction: loc.rulerOrFaction || '',
        eraOrCoordinates: loc.eraOrCoordinates || '',
        summary: loc.summary || '',
        imageDataUrl: loc.imageDataUrl || '',
        rawImageDataUrl: loc.rawImageDataUrl,
        cropConfig: loc.cropConfig,
        backgroundDataUrl: loc.backgroundDataUrl || '',
        rawBackgroundDataUrl: loc.rawBackgroundDataUrl,
        backgroundCropConfig: loc.backgroundCropConfig,
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
    version: 4,
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
    })),
    locations: archive.locations.map((l) => ({
      ...l,
      imageDataUrl: isOversizedDataUrl(l.imageDataUrl) ? '' : l.imageDataUrl,
      rawImageDataUrl: undefined,
      backgroundDataUrl: isOversizedDataUrl(l.backgroundDataUrl)
        ? undefined
        : l.backgroundDataUrl,
      rawBackgroundDataUrl: undefined,
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

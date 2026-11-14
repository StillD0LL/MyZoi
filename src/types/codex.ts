export type ProfileDesignType =
  | 'encyclopedia'
  | 'visual_novel'
  | 'tactical_file'
  | 'monograph';

export type LocationCategoryType =
  | 'City'
  | 'Residential lot'
  | 'Community lot'
  | 'Business lot';

export const LOCATION_CATEGORIES: readonly LocationCategoryType[] = [
  'City',
  'Residential lot',
  'Community lot',
  'Business lot',
] as const;

export const ZOI_STATUS_OPTIONS = [
  'Alive',
  'Deceased',
  'Missing',
  'Unknown',
] as const;

export const ZOI_GENDER_OPTIONS = [
  'Female',
  'Male',
  'Non-Binary',
  'Genderfluid',
  'Agender',
  'Other',
] as const;

export const ZOI_PRONOUN_OPTIONS = [
  'She/Her',
  'He/Him',
  'They/Them',
  'She/They',
  'He/They',
  'Any Pronouns',
  'Other',
] as const;

export const ZOI_BIRTH_MONTH_OPTIONS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

export const ZOI_AGE_OPTIONS = [
  'Child (6–12)',
  'Teenager (13–17)',
  '18',
  '19',
  '20',
  '21',
  '22',
  '23',
  '24',
  '25',
  '26',
  '27',
  '28',
  '29',
  '30',
  '31',
  '32',
  '33',
  '34',
  '35',
  '36',
  '37',
  '38',
  '39',
  '40',
  '41',
  '42',
  '43',
  '44',
  '45',
  '46',
  '47',
  '48',
  '49',
  '50',
  '55',
  '60',
  '65',
  '70',
  '75+',
  'Ageless',
] as const;

export const ZOI_HEIGHT_OPTIONS = [
  'Under 155 cm (5\'1")',
  '155–159 cm (5\'1"–5\'2")',
  '160–164 cm (5\'3"–5\'4")',
  '165–169 cm (5\'5"–5\'6")',
  '170–174 cm (5\'7"–5\'8")',
  '175–179 cm (5\'9"–5\'10")',
  '180–184 cm (5\'11"–6\'0")',
  '185–189 cm (6\'1"–6\'2")',
  '190+ cm (6\'3"+)',
] as const;

export type HouseholdStatusType = 'Single' | 'Family';

export const ZOI_HOUSEHOLD_STATUS_OPTIONS: readonly HouseholdStatusType[] = [
  'Single',
  'Family',
] as const;

export type RelationshipStatusType =
  | 'Single'
  | 'Dating'
  | 'Engaged'
  | 'Married';

export const ZOI_RELATIONSHIP_STATUS_OPTIONS: readonly RelationshipStatusType[] =
  ['Single', 'Dating', 'Engaged', 'Married'] as const;

export type SectionType =
  | 'infobox'
  | 'paragraph'
  | 'bullets'
  | 'quote'
  | 'trivia';

export interface KeyValueItem {
  id: string;
  label: string;
  value: string;
}

export interface BulletItem {
  id: string;
  title: string;
  content: string;
}

export interface ProfileSection {
  id: string;
  type: SectionType;
  title: string;
  /** Used by 'paragraph' and 'quote' */
  content?: string;
  /** Used by 'quote' for speaker / source attribution */
  attribution?: string;
  /** Used by 'infobox' (Wikipedia-style quick status info) */
  items?: KeyValueItem[];
  /** Used by 'bullets' and 'trivia' */
  bullets?: BulletItem[];
}

export interface ImageCropConfig {
  /** Zoom / scale factor (0.2 to 4.0) */
  scale: number;
  /** Horizontal pan offset in normalized canvas coordinates (-500 to 500) */
  offsetX: number;
  /** Vertical pan offset in normalized canvas coordinates (-500 to 500) */
  offsetY: number;
  /** Crop aspect preset ('3:4' | '2:3' | '1:1' | '16:9') */
  aspectRatio: '3:4' | '2:3' | '1:1' | '16:9';
  /** Output width in pixels */
  outputWidth: number;
  /** Output height in pixels */
  outputHeight: number;
}

export interface GalleryPhoto {
  id: string;
  imageDataUrl: string;
  rawImageDataUrl?: string;
  cropConfig?: ImageCropConfig;
  caption: string;
  /** IDs of Zois tagged in this photo/screenshot */
  taggedCharacterIds: string[];
  /** IDs of locations tagged in this photo/screenshot */
  taggedLocationIds: string[];
  createdAt: string;
}

export interface CityFeedEvent {
  id: string;
  kind: 'site_update' | 'ai_inzoi';
  category: string;
  headline: string;
  /** Supports [[Zoi]] and [[Location]] hyperlinks. Never attributes a user/author. */
  body: string;
  districtOrMood?: string;
  imageUrl?: string;
  relatedEntityType?: 'character' | 'location';
  relatedEntityId?: string;
  createdAt: string;
}

export interface SocialCommentReply {
  id: string;
  authorType: 'character' | 'location';
  authorId: string;
  authorName: string;
  authorHandle: string;
  content: string;
  likesCount: number;
  isAiGenerated?: boolean;
  createdAt: string;
}

export interface SocialPostComment {
  id: string;
  postId: string;
  authorType: 'character' | 'location';
  authorId: string;
  authorName: string;
  authorHandle: string;
  content: string;
  likesCount: number;
  isAiGenerated?: boolean;
  replies: SocialCommentReply[];
  createdAt: string;
}

export interface SocialMediaPost {
  id: string;
  /** Which Zoi or Location profile feed this post belongs to */
  pageEntityType: 'character' | 'location';
  pageEntityId: string;
  authorType: 'character' | 'location';
  authorId: string;
  authorName: string;
  authorHandle: string;
  content: string;
  imageUrl?: string;
  likesCount: number;
  repostsCount: number;
  isAiGenerated?: boolean;
  comments: SocialPostComment[];
  createdAt: string;
}

export interface CharacterEntry {
  id: string;
  name: string;
  title: string;
  role: string;
  /** Gender selection */
  gender: string;
  /** Legacy fallback field if loaded from older archive */
  species?: string;
  pronouns: string;
  age: string;
  /** Birth Month selection */
  birthdate: string;
  height: string;
  occupation: string;
  personality: string;
  ambition: string;
  /** Household status: Single or Family */
  householdStatus?: HouseholdStatusType | '';
  /** Relationship status: Single, Dating, Engaged, or Married */
  relationshipStatus?: RelationshipStatusType | '';
  /** Partner Zoi name or [[Zoi Name]] hyperlink when Dating, Engaged, or Married */
  relationshipPartner?: string;
  /** Formatted or legacy relationships string (supports [[Zoi]] hyperlinks) */
  relationships: string;
  affiliation: string;
  /** Defaults to 'Alive' */
  status: string;
  /** Optional ID or Name of primary Location entry */
  originLocation: string;
  summary: string;
  /** Full portrait image (cropped data URL) used for selection grid & profile */
  portraitDataUrl: string;
  /** Raw source image data URL if user re-opens cropper */
  rawPortraitDataUrl?: string;
  cropConfig?: ImageCropConfig;
  /** Optional individual background image for this Zoi's entry page */
  backgroundDataUrl?: string;
  rawBackgroundDataUrl?: string;
  backgroundCropConfig?: ImageCropConfig;
  /** Main and only layout: Encyclopedia Dossier ('encyclopedia') */
  profileDesign: ProfileDesignType;
  /** Quick personal info rows in the primary header/sidebar */
  personalAttributes: KeyValueItem[];
  /** Flexible extra sections (Wikipedia quick status, paragraphs, bullets, quotes, trivia) */
  sections: ProfileSection[];
  updatedAt: string;
  createdAt: string;
}

export interface LocationEntry {
  id: string;
  name: string;
  subtitle: string;
  /** Location type category: City, Residential lot, Community lot, or Business lot */
  category: LocationCategoryType;
  region: string;
  climate: string;
  rulerOrFaction: string;
  eraOrCoordinates: string;
  summary: string;
  /** Cover / portrait image for the location */
  imageDataUrl: string;
  rawImageDataUrl?: string;
  cropConfig?: ImageCropConfig;
  /** Optional individual background image for this location's entry page */
  backgroundDataUrl?: string;
  rawBackgroundDataUrl?: string;
  backgroundCropConfig?: ImageCropConfig;
  /** Quick status attributes for the location */
  attributes: KeyValueItem[];
  /** Modular sections (Wikipedia quick status, paragraphs, bullets, quotes, trivia) */
  sections: ProfileSection[];
  updatedAt: string;
  createdAt: string;
}

export interface CodexSettings {
  /** Main profile design: Encyclopedia Dossier ('encyclopedia') */
  defaultProfileDesign: ProfileDesignType;
  /** Automatically detect & hyperlink Zoi/location names in prose even without [[brackets]] */
  autoHyperlinkNames: boolean;
  /** Grid density on the Zoi & Location selection screens */
  directoryGridColumns: 3 | 4;
  /** Show quick hover preview cards on internal links */
  showLinkPreviews: boolean;
  /** Custom Google Drive archive filename */
  driveFileName: string;
  /** Require confirmation dialog before overwriting Google Drive cloud file */
  confirmBeforeCloudOverwrite: boolean;
  /** Enable occasional inZOI-style AI ambient updates on the Community Hub */
  enableAiCityEvents: boolean;
  /** Cooldown in minutes between automatic AI city dispatches (mindful rate limit) */
  aiCooldownMinutes: 2 | 5 | 15;
  /** Default site background image applied across all pages unless overridden by an entry's individual background */
  defaultSiteBackgroundUrl: string;
  rawDefaultSiteBackgroundUrl?: string;
  defaultSiteBackgroundCropConfig?: ImageCropConfig;
  /** Readability overlay opacity over the background image (0.45 to 0.92) */
  siteBackgroundOverlayOpacity: number;
}

export interface CodexArchive {
  version: number;
  updatedAt: string;
  characters: CharacterEntry[];
  locations: LocationEntry[];
  /** Shared photo & screenshot gallery across Zois and locations */
  photos: GalleryPhoto[];
  /** Living community hub feed updates (anonymous site changes + AI inZOI dispatches) */
  feedEvents: CityFeedEvent[];
  /** Twitter/X-inspired social media posts, comments, and replies for Zois and locations */
  socialPosts: SocialMediaPost[];
  settings: CodexSettings;
}

export type ActiveRoute =
  | { view: 'hub' }
  | { view: 'characters' }
  | { view: 'character_detail'; id: string }
  | { view: 'character_edit'; id?: string }
  | { view: 'locations' }
  | { view: 'location_detail'; id: string }
  | { view: 'location_edit'; id?: string };

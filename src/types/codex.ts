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

export type ZoiAgeStageType =
  | 'Child'
  | 'Teenager'
  | 'Young Adult'
  | 'Adult'
  | 'Elder'
  | 'Ageless';

export const ZOI_AGE_OPTIONS: readonly ZoiAgeStageType[] = [
  'Child',
  'Teenager',
  'Young Adult',
  'Adult',
  'Elder',
  'Ageless',
] as const;

export type ZoiPersonalityTraitCategory =
  | 'positive'
  | 'negative'
  | 'innocent'
  | 'suggestive';

export interface ZoiPersonalityTraitGroup {
  id: ZoiPersonalityTraitCategory;
  label: string;
  subtitle: string;
  badgeClass: string;
  activeClass: string;
  traits: readonly string[];
}

export const ZOI_PERSONALITY_TRAIT_GROUPS: readonly ZoiPersonalityTraitGroup[] = [
  {
    id: 'positive',
    label: 'inZOI Positive Traits',
    subtitle: 'Constructive, prosocial, and aspirational life-sim traits',
    badgeClass: 'border-[#2DD4BF]/40 bg-[#2DD4BF]/10 text-[#2DD4BF]',
    activeClass: 'border-[#2DD4BF] bg-[#2DD4BF] text-[#050608] font-semibold',
    traits: [
      'Volunteer',
      'Socialite',
      'Perfectionist',
      'Adventurer',
      'Caregiver',
      'Mediator',
      'Entertainer',
      'Leader',
      'Explorer',
      'Scholar',
      'Charismatic',
      'Creative Visionary',
      'Empathetic Listener',
      'Loyal Companion',
    ],
  },
  {
    id: 'negative',
    label: 'inZOI Negative Traits',
    subtitle: 'Flawed, volatile, or challenging interpersonal traits',
    badgeClass: 'border-[#F43F5E]/40 bg-[#F43F5E]/10 text-[#FDA4AF]',
    activeClass: 'border-[#F43F5E] bg-[#F43F5E] text-white font-semibold',
    traits: [
      'Authoritarian',
      'Recluse',
      'Individualist',
      'Hot-Headed',
      'Workaholic',
      'Jealous',
      'Gossip Hound',
      'Overthinker',
      'Materialistic',
      'Impulsive',
      'Cynical',
      'Vain',
      'Rebellious',
      'Commitment-Phobic',
    ],
  },
  {
    id: 'innocent',
    label: 'Innocent & Wholesome (Teen–Adult)',
    subtitle: 'Sweet, earnest, shy, and heartfelt traits across youth & adulthood',
    badgeClass: 'border-[#38BDF8]/40 bg-[#38BDF8]/10 text-[#7DD3FC]',
    activeClass: 'border-[#38BDF8] bg-[#38BDF8] text-[#050608] font-semibold',
    traits: [
      'Hopeless Romantic',
      'Shy Daydreamer',
      'First Crush Jitters',
      'Bookworm',
      'Soft-Hearted',
      'Cozy Homebody',
      'Animal Lover',
      'Naive Optimist',
      'Secret Poet',
      'Stargazer',
      'Sweet Tooth',
      'Awkwardly Charming',
    ],
  },
  {
    id: 'suggestive',
    label: 'Suggestive & Mature (Teen–Adult)',
    subtitle: 'Alluring, flirtatious, intense, and after-hours romantic traits',
    badgeClass: 'border-[#C084FC]/40 bg-[#C084FC]/10 text-[#E9D5FF]',
    activeClass: 'border-[#C084FC] bg-[#C084FC] text-[#050608] font-semibold',
    traits: [
      'Shameless Flirt',
      'Heartbreaker',
      'Tease',
      'Seductive Charm',
      'Nightlife Magnet',
      'Thrill-Seeking Romantic',
      'Magnetic Gaze',
      'Secretly Passionate',
      'Forbidden Romance Seeker',
      'Alluring & Mysterious',
      'Wild Child',
      'Irresistible Temptation',
      'After-Hours Socialite',
      'Possessive Lover',
    ],
  },
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

export interface BusinessStaffMember {
  id: string;
  /** Zoi name or [[Zoi Name]] */
  name: string;
  /** Job title or role at the business */
  role: string;
  /** Optional schedule, shift, or specialty notes */
  shiftOrNotes?: string;
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

export type CharacterSortOption =
  | 'recent'
  | 'created_desc'
  | 'name_asc'
  | 'name_desc'
  | 'age_asc'
  | 'affiliation_asc'
  | 'followers_desc';

export type LocationSortOption =
  | 'recent'
  | 'created_desc'
  | 'name_asc'
  | 'name_desc'
  | 'category_asc'
  | 'region_asc';

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
  /** Formatted age stage + optional exact numbered age, e.g. "Young Adult (24)" or "Young Adult" */
  age: string;
  /** Birth Month selection */
  birthdate: string;
  height: string;
  occupation: string;
  /** Comma-separated multi-select personality traits */
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
  /** IDs of other Zois that this Zoi naturally follows on their social media page */
  followingIds?: string[];
  /** Full portrait image (cropped data URL) used for selection grid & profile */
  portraitDataUrl: string;
  /** Raw source image data URL if user re-opens cropper */
  rawPortraitDataUrl?: string;
  cropConfig?: ImageCropConfig;
  /** Optional individual background image for this Zoi's entry page */
  backgroundDataUrl?: string;
  rawBackgroundDataUrl?: string;
  backgroundCropConfig?: ImageCropConfig;
  /** Optional separate social media profile banner image for this Zoi's X-style feed */
  socialBannerDataUrl?: string;
  rawSocialBannerDataUrl?: string;
  socialBannerCropConfig?: ImageCropConfig;
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
  /** Strictly for Business lot: Business Owner Zoi name or [[Zoi Name]] */
  businessOwner?: string;
  /** Strictly for Business lot: Staff roster with roles and shifts */
  businessStaff?: BusinessStaffMember[];
  /** Cover / portrait image for the location */
  imageDataUrl: string;
  rawImageDataUrl?: string;
  cropConfig?: ImageCropConfig;
  /** Optional individual background image for this location's entry page */
  backgroundDataUrl?: string;
  rawBackgroundDataUrl?: string;
  backgroundCropConfig?: ImageCropConfig;
  /** Optional separate social media profile banner image for this location's X-style feed */
  socialBannerDataUrl?: string;
  rawSocialBannerDataUrl?: string;
  socialBannerCropConfig?: ImageCropConfig;
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

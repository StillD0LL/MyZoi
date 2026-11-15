import React, { useRef, useState } from 'react';
import {
  BulletItem,
  BusinessStaffMember,
  CharacterEntry,
  GalleryPhoto,
  ImageCropConfig,
  KeyValueItem,
  LOCATION_CATEGORIES,
  LocationCategoryType,
  LocationEntry,
  ProfileSection,
  SectionType,
} from '../types/codex';
import { normalizeLocationCategory } from '../utils/codexLogic';
import { compressImageFileToDataUrl } from '../utils/imageCompression';
import { ImageCropperModal } from './ImageCropperModal';
import { SectionBuilder } from './SectionBuilder';
import {
  ArrowLeft,
  Briefcase,
  Building2,
  Camera,
  Clock,
  Crop,
  Home,
  Image as ImageIcon,
  Images,
  Landmark,
  MapPin,
  Plus,
  Save,
  Sparkles,
  Trash2,
  Upload,
  Users,
} from 'lucide-react';

interface PendingLocationPhoto {
  id: string;
  imageDataUrl: string;
  caption: string;
  taggedCharacterIds: string[];
}

interface LocationEditorViewProps {
  initialLocation?: LocationEntry;
  characters: CharacterEntry[];
  locations: LocationEntry[];
  existingPhotos: GalleryPhoto[];
  aiCooldownRemainingSec?: number;
  onAiCooldownStarted?: (cooldownSeconds: number) => void;
  onSave: (location: LocationEntry, addedPhotos: GalleryPhoto[]) => void;
  onCancel: () => void;
}

const LOCATION_TYPE_META: Array<{
  type: LocationCategoryType;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    type: 'City',
    description: 'Metropolis, regional district, or urban hub',
    icon: Landmark,
  },
  {
    type: 'Residential lot',
    description: 'Apartment, home, studio loft, or private residence',
    icon: Home,
  },
  {
    type: 'Community lot',
    description: 'Public park, plaza, cultural center, or civic venue',
    icon: MapPin,
  },
  {
    type: 'Business lot',
    description: 'Cafe, workplace, retail storefront, or studio office',
    icon: Building2,
  },
];

export const LocationEditorView: React.FC<LocationEditorViewProps> = ({
  initialLocation,
  characters,
  locations,
  existingPhotos,
  aiCooldownRemainingSec = 0,
  onAiCooldownStarted,
  onSave,
  onCancel,
}) => {
  const [name, setName] = useState(initialLocation?.name || '');
  const [subtitle, setSubtitle] = useState(initialLocation?.subtitle || '');
  const [category, setCategory] = useState<LocationCategoryType>(
    initialLocation?.category
      ? normalizeLocationCategory(initialLocation.category)
      : 'City'
  );
  const [region, setRegion] = useState(initialLocation?.region || '');
  const [climate, setClimate] = useState(initialLocation?.climate || '');
  const [rulerOrFaction, setRulerOrFaction] = useState(
    initialLocation?.rulerOrFaction || ''
  );
  const [eraOrCoordinates, setEraOrCoordinates] = useState(
    initialLocation?.eraOrCoordinates || ''
  );
  const [summary, setSummary] = useState(initialLocation?.summary || '');

  // Strictly for Business lot: Business Owner & Staff Roster
  const [businessOwner, setBusinessOwner] = useState(
    initialLocation?.businessOwner || ''
  );
  const [businessStaff, setBusinessStaff] = useState<BusinessStaffMember[]>(
    initialLocation?.businessStaff || []
  );

  // AI Entry Prompt & AI Summary Prompt states
  const [aiEntryPrompt, setAiEntryPrompt] = useState('');
  const [isGeneratingEntry, setIsGeneratingEntry] = useState(false);
  const [aiSummaryPrompt, setAiSummaryPrompt] = useState('');
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  const [imageDataUrl, setImageDataUrl] = useState(
    initialLocation?.imageDataUrl || ''
  );
  const [rawImageDataUrl, setRawImageDataUrl] = useState(
    initialLocation?.rawImageDataUrl || ''
  );
  const [cropConfig, setCropConfig] = useState<ImageCropConfig | undefined>(
    initialLocation?.cropConfig
  );

  // Individual Location Page Background State
  const [backgroundDataUrl, setBackgroundDataUrl] = useState(
    initialLocation?.backgroundDataUrl || ''
  );
  const [rawBackgroundDataUrl, setRawBackgroundDataUrl] = useState(
    initialLocation?.rawBackgroundDataUrl || ''
  );
  const [backgroundCropConfig, setBackgroundCropConfig] = useState<
    ImageCropConfig | undefined
  >(initialLocation?.backgroundCropConfig);

  // Separate Social Media Profile Banner State
  const [socialBannerDataUrl, setSocialBannerDataUrl] = useState(
    initialLocation?.socialBannerDataUrl || ''
  );
  const [rawSocialBannerDataUrl, setRawSocialBannerDataUrl] = useState(
    initialLocation?.rawSocialBannerDataUrl || ''
  );
  const [socialBannerCropConfig, setSocialBannerCropConfig] = useState<
    ImageCropConfig | undefined
  >(initialLocation?.socialBannerCropConfig);

  const [attributes, setAttributes] = useState<KeyValueItem[]>(
    initialLocation?.attributes || []
  );
  const [sections, setSections] = useState<ProfileSection[]>(
    initialLocation?.sections || []
  );

  const [pendingPhotos, setPendingPhotos] = useState<PendingLocationPhoto[]>(
    []
  );
  const multiFileInputRef = useRef<HTMLInputElement | null>(null);

  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [isBgCropperOpen, setIsBgCropperOpen] = useState(false);
  const [isSocialBannerCropperOpen, setIsSocialBannerCropperOpen] =
    useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const alreadyTaggedPhotos = initialLocation
    ? existingPhotos.filter((p) =>
        p.taggedLocationIds.includes(initialLocation.id)
      )
    : [];

  const handleGenerateFullLocationWithAi = async () => {
    if (isGeneratingEntry || aiCooldownRemainingSec > 0) return;
    const promptToUse =
      aiEntryPrompt.trim() ||
      (name.trim()
        ? `Create a full ${category} profile for ${name.trim()}`
        : `A lively ${category.toLowerCase()} in the central district`);

    setIsGeneratingEntry(true);
    setErrorMessage(null);
    try {
      const response = await fetch('/api/entry/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType: 'location',
          prompt: promptToUse,
          category,
          existingCharacters: characters.map((c) => c.name),
          existingLocations: locations.map((l) => l.name),
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (data?.cooldownActive) {
        onAiCooldownStarted?.(
          typeof data.cooldownRemainingSeconds === 'number'
            ? data.cooldownRemainingSeconds
            : 15
        );
        return;
      }

      const generated = data?.entry;
      if (generated) {
        if (generated.name) setName(String(generated.name).trim());
        if (generated.subtitle) setSubtitle(String(generated.subtitle).trim());
        if (generated.category) {
          setCategory(normalizeLocationCategory(generated.category));
        }
        if (generated.region) setRegion(String(generated.region).trim());
        if (generated.climate) setClimate(String(generated.climate).trim());
        if (generated.rulerOrFaction) {
          setRulerOrFaction(String(generated.rulerOrFaction).trim());
        }
        if (generated.eraOrCoordinates) {
          setEraOrCoordinates(String(generated.eraOrCoordinates).trim());
        }
        if (generated.summary) setSummary(String(generated.summary).trim());

        if (typeof generated.businessOwner === 'string') {
          setBusinessOwner(generated.businessOwner.trim());
        }
        if (Array.isArray(generated.businessStaff)) {
          setBusinessStaff(
            generated.businessStaff.map(
              (
                s: { name?: string; role?: string; shiftOrNotes?: string },
                idx: number
              ) => ({
                id: `staff-ai-${Date.now()}-${idx}`,
                name: (s.name || '').trim(),
                role: (s.role || '').trim(),
                shiftOrNotes: (s.shiftOrNotes || '').trim(),
              })
            )
          );
        }

        if (Array.isArray(generated.attributes)) {
          setAttributes(
            generated.attributes.map(
              (a: { label?: string; value?: string }, idx: number) => ({
                id: `loc-attr-ai-${Date.now()}-${idx}`,
                label: (a.label || '').trim(),
                value: (a.value || '').trim(),
              })
            )
          );
        }

        if (Array.isArray(generated.sections)) {
          const validTypes: SectionType[] = [
            'infobox',
            'paragraph',
            'bullets',
            'quote',
            'trivia',
          ];
          const builtSections: ProfileSection[] = generated.sections.map(
            (
              sec: {
                type?: string;
                title?: string;
                content?: string;
                attribution?: string;
                bullets?: Array<{ title?: string; content?: string }>;
              },
              idx: number
            ) => {
              const secType: SectionType = validTypes.includes(
                sec.type as SectionType
              )
                ? (sec.type as SectionType)
                : 'paragraph';
              return {
                id: `loc-sec-ai-${Date.now()}-${idx}`,
                type: secType,
                title: (sec.title || 'Gazetteer Section').trim(),
                content:
                  typeof sec.content === 'string'
                    ? sec.content.trim()
                    : undefined,
                attribution:
                  typeof sec.attribution === 'string'
                    ? sec.attribution.trim()
                    : undefined,
                bullets: Array.isArray(sec.bullets)
                  ? sec.bullets.map(
                      (b, bIdx): BulletItem => ({
                        id: `loc-bl-ai-${Date.now()}-${idx}-${bIdx}`,
                        title: (b.title || '').trim(),
                        content: (b.content || '').trim(),
                      })
                    )
                  : undefined,
              };
            }
          );
          setSections(builtSections);
        }
      }

      onAiCooldownStarted?.(
        typeof data?.cooldownSeconds === 'number' ? data.cooldownSeconds : 15
      );
    } finally {
      setIsGeneratingEntry(false);
    }
  };

  const handleAiAssistSummary = async () => {
    if (isGeneratingSummary || aiCooldownRemainingSec > 0) return;
    setIsGeneratingSummary(true);
    try {
      const response = await fetch('/api/section/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType: 'location',
          entityName: name || 'Location',
          entityRoleOrSubtitle: `${category}${subtitle ? ` · ${subtitle}` : ''}`,
          entityPersonality: climate,
          targetType: 'summary',
          sectionTitle: 'Overview / Gazetteer Summary',
          userPrompt:
            aiSummaryPrompt.trim() ||
            `Write or refine an Encyclopedia Dossier summary for this ${category}.`,
          existingContent: summary,
          existingCharacters: characters.map((c) => c.name),
          existingLocations: locations.map((l) => l.name),
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (data?.cooldownActive) {
        onAiCooldownStarted?.(
          typeof data.cooldownRemainingSeconds === 'number'
            ? data.cooldownRemainingSeconds
            : 15
        );
        return;
      }

      if (typeof data?.result?.content === 'string') {
        setSummary(data.result.content.trim());
      }
      onAiCooldownStarted?.(
        typeof data?.cooldownSeconds === 'number' ? data.cooldownSeconds : 15
      );
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const handleMultiFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    Array.from(fileList).forEach((file) => {
      void compressImageFileToDataUrl(file, 1360, 0.82).then((dataUrl) => {
        const cleanCaption = file.name.replace(/\.[^/.]+$/, '');
        setPendingPhotos((prev) => [
          ...prev,
          {
            id: `loc-pend-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            imageDataUrl: dataUrl,
            caption: cleanCaption,
            taggedCharacterIds: [],
          },
        ]);
      });
    });
    e.target.value = '';
  };

  const handleAddAttribute = () => {
    setAttributes((prev) => [
      ...prev,
      {
        id: `loc-attr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        label: '',
        value: '',
      },
    ]);
  };

  const handleAddStaffMember = () => {
    setBusinessStaff((prev) => [
      ...prev,
      {
        id: `staff-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: '',
        role: '',
        shiftOrNotes: '',
      },
    ]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage('Please enter a Location Name before saving.');
      return;
    }

    const now = new Date().toISOString();
    const locId =
      initialLocation?.id ||
      `loc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    const isBusinessLot = category === 'Business lot';
    const cleanedStaff = isBusinessLot
      ? businessStaff
          .filter((s) => s.name.trim() || s.role.trim())
          .map((s) => ({
            ...s,
            name: s.name.trim(),
            role: s.role.trim() || 'Staff Member',
            shiftOrNotes: s.shiftOrNotes?.trim() || undefined,
          }))
      : undefined;

    const entry: LocationEntry = {
      id: locId,
      name: name.trim(),
      subtitle: subtitle.trim(),
      category,
      region: region.trim(),
      climate: climate.trim(),
      rulerOrFaction: rulerOrFaction.trim(),
      eraOrCoordinates: eraOrCoordinates.trim(),
      summary: summary.trim(),
      businessOwner: isBusinessLot ? businessOwner.trim() || undefined : undefined,
      businessStaff: isBusinessLot ? cleanedStaff : undefined,
      imageDataUrl,
      rawImageDataUrl: rawImageDataUrl || undefined,
      cropConfig,
      backgroundDataUrl: backgroundDataUrl || undefined,
      rawBackgroundDataUrl: rawBackgroundDataUrl || undefined,
      backgroundCropConfig,
      socialBannerDataUrl: socialBannerDataUrl || undefined,
      rawSocialBannerDataUrl: rawSocialBannerDataUrl || undefined,
      socialBannerCropConfig,
      attributes: attributes.filter((a) => a.label.trim() || a.value.trim()),
      sections,
      createdAt: initialLocation?.createdAt || now,
      updatedAt: now,
    };

    const createdGalleryPhotos: GalleryPhoto[] = pendingPhotos.map((p) => ({
      id: `photo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      imageDataUrl: p.imageDataUrl,
      rawImageDataUrl: p.imageDataUrl,
      caption: p.caption.trim() || `${entry.name} Snapshot`,
      taggedCharacterIds: p.taggedCharacterIds,
      taggedLocationIds: [locId],
      createdAt: now,
    }));

    onSave(entry, createdGalleryPhotos);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 pb-12">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.11] pb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-1.5 border border-white/[0.14] bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-[#CBD5E1] hover:text-white transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Cancel</span>
          </button>
          <h1 className="font-display text-xl sm:text-2xl font-bold text-[#F1F5F9]">
            {initialLocation
              ? `Edit Location: ${initialLocation.name}`
              : 'Create New Location / Lot Profile'}
          </h1>
        </div>

        <button
          type="submit"
          className="inline-flex items-center gap-2 bg-[#2DD4BF] px-5 py-2 text-xs font-semibold text-[#071018] hover:bg-[#5EEAD4] transition-colors whitespace-nowrap shrink-0"
        >
          <Save className="h-4 w-4" />
          <span>Save Location Profile</span>
        </button>
      </div>

      {/* AI Entry Generator Banner — Populate Location from User Prompt */}
      <div className="inzoi-glass-panel border border-[#2DD4BF]/40 p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#2DD4BF]" />
            <h2 className="font-display text-sm font-bold text-white">
              Create &amp; Populate Location Entry with AI Prompt
            </h2>
          </div>
          <span className="text-[11px] font-mono-tabular text-[#94A3B8] flex items-center gap-1.5">
            <Clock className="h-3 w-3 text-[#2DD4BF]" />
            <span>
              {aiCooldownRemainingSec > 0
                ? `Shared Site AI Cooldown: ${aiCooldownRemainingSec}s`
                : 'Shared Site AI Ready'}
            </span>
          </span>
        </div>

        <p className="text-xs text-[#CBD5E1] leading-relaxed">
          Describe a city, residential lot, community lot, or business lot
          below (e.g.,{' '}
          <span className="italic text-[#38BDF8]">
            &ldquo;A neon-lit rooftop espresso &amp; vinyl lounge in Dowon
            run by local musicians&rdquo;
          </span>
          ) to automatically populate its gazetteer details, Business Owner
          &amp; Staff (for Business lots), and sections.
        </p>

        <div className="flex flex-wrap items-center gap-2.5">
          <input
            type="text"
            value={aiEntryPrompt}
            onChange={(e) => setAiEntryPrompt(e.target.value)}
            placeholder="Enter a prompt to generate and populate this Location / Lot..."
            aria-label="Prompt to generate Location profile with AI"
            className="flex-1 min-w-[240px] border border-white/[0.16] bg-black/80 px-3.5 py-2 text-xs text-white placeholder-[#64748B] focus:border-[#2DD4BF] focus:outline-none"
          />
          <button
            type="button"
            disabled={isGeneratingEntry || aiCooldownRemainingSec > 0}
            onClick={() => void handleGenerateFullLocationWithAi()}
            className="inline-flex items-center gap-2 bg-[#2DD4BF] px-4 py-2 text-xs font-semibold text-[#050608] hover:bg-[#5EEAD4] disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>
              {isGeneratingEntry
                ? 'Populating Location...'
                : aiCooldownRemainingSec > 0
                  ? `AI Cooldown (${aiCooldownRemainingSec}s)`
                  : 'Generate & Populate Location with AI'}
            </span>
          </button>
        </div>
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="border border-[#EF4444] bg-[#EF4444]/10 px-4 py-3 text-xs text-[#FCA5A5]"
        >
          {errorMessage}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Location Cover Image + Individual Page Background + Gallery */}
        <div className="lg:col-span-4 space-y-6">
          <div className="inzoi-glass-panel p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-sm font-semibold text-[#F1F5F9]">
                Location Cover Image
              </h2>
              <span className="text-[11px] font-mono-tabular text-[#94A3B8]">
                Move · Resize · Crop
              </span>
            </div>

            {imageDataUrl ? (
              <div className="relative aspect-[16/9] w-full overflow-hidden border border-white/[0.14] bg-black/80">
                <img
                  src={imageDataUrl}
                  alt="Location preview"
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
              </div>
            ) : (
              <div className="aspect-[16/9] w-full border border-dashed border-white/[0.16] bg-black/70 flex flex-col items-center justify-center p-6 text-center">
                <Upload className="h-7 w-7 text-[#2DD4BF] mb-2" />
                <p className="text-xs font-medium text-[#E2E8F0]">
                  No Location Image Assigned
                </p>
                <p className="mt-1 text-[11px] text-[#94A3B8]">
                  Upload and crop a landscape, lot exterior, or city map.
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={() => setIsCropperOpen(true)}
              className="w-full flex items-center justify-center gap-2 border border-[#2DD4BF] bg-[#2DD4BF]/15 px-4 py-2.5 text-xs font-semibold text-[#F1F5F9] hover:bg-[#2DD4BF] hover:text-[#071018] transition-colors whitespace-nowrap shrink-0"
            >
              <Crop className="h-4 w-4" />
              <span>
                {imageDataUrl
                  ? 'Move, Resize & Re-Crop Image'
                  : 'Open Image Uploader & Cropper'}
              </span>
            </button>
          </div>

          {/* Separate Social Media Profile Banner Uploader */}
          <div className="inzoi-glass-panel p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-sm font-semibold text-[#F1F5F9] flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-[#38BDF8]" />
                <span>Social Media Profile Banner</span>
              </h2>
              <span className="text-[11px] font-mono-tabular text-[#38BDF8]">
                Social Header Only
              </span>
            </div>

            <p className="text-xs text-[#94A3B8] leading-relaxed">
              Upload a dedicated header banner for this location&apos;s
              X/Twitter-inspired social media profile page, separate from the
              entry&apos;s page background.
            </p>

            {socialBannerDataUrl ? (
              <div className="relative aspect-[16/9] w-full overflow-hidden border border-white/[0.14] bg-black/80">
                <img
                  src={socialBannerDataUrl}
                  alt="Location social media banner preview"
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
              </div>
            ) : (
              <div className="aspect-[16/9] w-full border border-dashed border-white/[0.16] bg-black/70 flex flex-col items-center justify-center p-4 text-center">
                <ImageIcon className="h-6 w-6 text-[#38BDF8]/60 mb-1.5" />
                <span className="text-xs text-[#94A3B8]">
                  Default ZoiNet Gradient Header
                </span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsSocialBannerCropperOpen(true)}
                className="flex-1 flex items-center justify-center gap-1.5 border border-white/[0.14] bg-white/[0.04] px-3 py-2 text-xs font-medium text-[#F1F5F9] hover:border-[#38BDF8] transition-colors whitespace-nowrap shrink-0"
              >
                <Crop className="h-3.5 w-3.5 text-[#38BDF8]" />
                <span>
                  {socialBannerDataUrl
                    ? 'Change Social Banner'
                    : 'Upload Social Banner'}
                </span>
              </button>

              {socialBannerDataUrl && (
                <button
                  type="button"
                  onClick={() => {
                    setSocialBannerDataUrl('');
                    setRawSocialBannerDataUrl('');
                    setSocialBannerCropConfig(undefined);
                  }}
                  aria-label="Clear location social banner"
                  className="border border-white/[0.14] bg-white/[0.04] px-3 py-2 text-xs text-[#EF4444] hover:bg-[#EF4444]/15 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Individual Location Page Background Uploader */}
          <div className="inzoi-glass-panel p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-sm font-semibold text-[#F1F5F9] flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-[#2DD4BF]" />
                <span>Individual Page Background</span>
              </h2>
              <span className="text-[11px] font-mono-tabular text-[#94A3B8]">
                Entry Override
              </span>
            </div>

            <p className="text-xs text-[#94A3B8] leading-relaxed">
              Assign a custom background image displayed behind this
              location&apos;s profile page (separate from the social media
              profile banner).
            </p>

            {backgroundDataUrl ? (
              <div className="relative aspect-[16/9] w-full overflow-hidden border border-white/[0.14] bg-black/80">
                <img
                  src={backgroundDataUrl}
                  alt="Location page background preview"
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
              </div>
            ) : (
              <div className="aspect-[16/9] w-full border border-dashed border-white/[0.16] bg-black/70 flex flex-col items-center justify-center p-4 text-center">
                <ImageIcon className="h-6 w-6 text-[#2DD4BF]/60 mb-1.5" />
                <span className="text-xs text-[#94A3B8]">
                  Uses Default Site Background
                </span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsBgCropperOpen(true)}
                className="flex-1 flex items-center justify-center gap-1.5 border border-white/[0.14] bg-white/[0.04] px-3 py-2 text-xs font-medium text-[#F1F5F9] hover:border-[#2DD4BF] transition-colors whitespace-nowrap shrink-0"
              >
                <Crop className="h-3.5 w-3.5 text-[#2DD4BF]" />
                <span>
                  {backgroundDataUrl
                    ? 'Change Background'
                    : 'Upload Location Background'}
                </span>
              </button>

              {backgroundDataUrl && (
                <button
                  type="button"
                  onClick={() => {
                    setBackgroundDataUrl('');
                    setRawBackgroundDataUrl('');
                    setBackgroundCropConfig(undefined);
                  }}
                  aria-label="Clear location background"
                  className="border border-white/[0.14] bg-white/[0.04] px-3 py-2 text-xs text-[#EF4444] hover:bg-[#EF4444]/15 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Multi-Image Gallery Upload Box for Location */}
          <div className="inzoi-glass-panel p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-sm font-semibold text-[#F1F5F9] flex items-center gap-2">
                <Images className="h-4 w-4 text-[#2DD4BF]" />
                <span>Location Photo Gallery</span>
              </h2>
              <span className="text-[11px] font-mono-tabular text-[#94A3B8]">
                {alreadyTaggedPhotos.length + pendingPhotos.length} total
              </span>
            </div>

            <p className="text-xs text-[#94A3B8] leading-relaxed">
              Upload multiple street scenes, interiors, or screenshots for this
              location. Tag any Zois featured in the shots so they appear on
              their Zoi profiles too.
            </p>

            <input
              ref={multiFileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleMultiFilesChange}
              className="hidden"
              aria-label="Upload multiple location gallery photos"
            />

            <button
              type="button"
              onClick={() => multiFileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 border border-white/[0.14] bg-white/[0.04] px-4 py-2 text-xs font-medium text-[#F1F5F9] hover:border-[#2DD4BF] transition-colors whitespace-nowrap shrink-0"
            >
              <Camera className="h-3.5 w-3.5 text-[#2DD4BF]" />
              <span>Upload Multiple Gallery Images</span>
            </button>

            {pendingPhotos.length > 0 && (
              <div className="space-y-3 pt-2 border-t border-white/[0.10]">
                {pendingPhotos.map((p, idx) => (
                  <div
                    key={p.id}
                    className="border border-white/[0.12] bg-black/75 p-2.5 space-y-2"
                  >
                    <div className="flex items-center gap-2.5">
                      <img
                        src={p.imageDataUrl}
                        alt={p.caption}
                        className="h-12 w-16 object-cover border border-white/[0.14] shrink-0"
                      />
                      <input
                        type="text"
                        value={p.caption}
                        onChange={(e) => {
                          const next = [...pendingPhotos];
                          next[idx] = { ...p, caption: e.target.value };
                          setPendingPhotos(next);
                        }}
                        placeholder="Photo caption..."
                        className="flex-1 border border-white/[0.14] bg-black/80 px-2 py-1 text-xs text-[#F1F5F9]"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setPendingPhotos(
                            pendingPhotos.filter((item) => item.id !== p.id)
                          )
                        }
                        aria-label="Remove staged location photo"
                        className="p-1 text-[#94A3B8] hover:text-[#EF4444]"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {characters.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1 pt-1">
                        <span className="text-[10px] text-[#94A3B8] mr-1">
                          Tag Zoi:
                        </span>
                        {characters.map((char) => {
                          const tagged = p.taggedCharacterIds.includes(char.id);
                          return (
                            <button
                              key={char.id}
                              type="button"
                              onClick={() => {
                                const nextChars = tagged
                                  ? p.taggedCharacterIds.filter(
                                      (id) => id !== char.id
                                    )
                                  : [...p.taggedCharacterIds, char.id];
                                const next = [...pendingPhotos];
                                next[idx] = {
                                  ...p,
                                  taggedCharacterIds: nextChars,
                                };
                                setPendingPhotos(next);
                              }}
                              className={`px-1.5 py-0.5 text-[10px] border transition-colors ${
                                tagged
                                  ? 'border-[#2DD4BF] text-[#2DD4BF] bg-[#2DD4BF]/10'
                                  : 'border-white/[0.12] text-[#94A3B8]'
                              }`}
                            >
                              {char.name}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Basic Location Data + Lot Category Selector + Business Owner/Staff + Modular Sections */}
        <div className="lg:col-span-8 space-y-6">
          <div className="inzoi-glass-panel p-6 space-y-5">
            <h2 className="font-display text-base font-semibold text-[#F1F5F9] border-b border-white/[0.10] pb-3">
              Location Type &amp; Gazetteer Information
            </h2>

            {/* Location Type Selector: City, Residential lot, Community lot, Business lot */}
            <div className="space-y-2">
              <label
                htmlFor="loc-category-input"
                className="block text-xs font-medium text-[#CBD5E1]"
              >
                Location / Lot Category *
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {LOCATION_TYPE_META.map((item) => {
                  const Icon = item.icon;
                  const active = category === item.type;
                  return (
                    <button
                      key={item.type}
                      type="button"
                      onClick={() => setCategory(item.type)}
                      className={`flex items-start gap-3 p-3 border text-left transition-colors ${
                        active
                          ? 'border-[#2DD4BF] bg-[#2DD4BF]/15 text-[#F1F5F9]'
                          : 'border-white/[0.12] bg-black/60 text-[#94A3B8] hover:border-white/30 hover:text-white'
                      }`}
                    >
                      <Icon
                        className={`h-4 w-4 mt-0.5 shrink-0 ${
                          active ? 'text-[#2DD4BF]' : 'text-[#64748B]'
                        }`}
                      />
                      <div>
                        <div className="text-xs font-semibold text-[#F1F5F9]">
                          {item.type}
                        </div>
                        <div className="text-[11px] text-[#94A3B8] mt-0.5">
                          {item.description}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <select
                id="loc-category-input"
                aria-label="Category / Settlement Type"
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value as LocationCategoryType)
                }
                className="w-full border border-white/[0.14] bg-black/80 px-3 py-2 text-xs text-[#F1F5F9] focus:border-[#2DD4BF] focus:outline-none"
              >
                {LOCATION_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="loc-name-input"
                  className="block text-xs font-medium text-[#CBD5E1] mb-1.5"
                >
                  Location Name *
                </label>
                <input
                  id="loc-name-input"
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="e.g. Dowon Arts Plaza, Velvet Roast Lounge"
                  className="w-full border border-white/[0.14] bg-black/80 px-3 py-2 text-sm text-[#F1F5F9] focus:border-[#2DD4BF] focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="loc-subtitle-input"
                  className="block text-xs font-medium text-[#CBD5E1] mb-1.5"
                >
                  Subtitle / Epithet
                </label>
                <input
                  id="loc-subtitle-input"
                  type="text"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="e.g. Waterfront Creative Hub"
                  className="w-full border border-white/[0.14] bg-black/80 px-3 py-2 text-sm text-[#F1F5F9] focus:border-[#2DD4BF] focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="loc-region-input"
                  className="block text-xs font-medium text-[#CBD5E1] mb-1.5"
                >
                  Parent Region / District
                </label>
                <input
                  id="loc-region-input"
                  type="text"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  placeholder="e.g. Central Waterfront"
                  className="w-full border border-white/[0.14] bg-black/80 px-3 py-2 text-sm text-[#F1F5F9] focus:border-[#2DD4BF] focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="loc-climate-input"
                  className="block text-xs font-medium text-[#CBD5E1] mb-1.5"
                >
                  Climate / Atmosphere
                </label>
                <input
                  id="loc-climate-input"
                  type="text"
                  value={climate}
                  onChange={(e) => setClimate(e.target.value)}
                  placeholder="e.g. Temperate Coastal Breeze · Neon Dusk"
                  className="w-full border border-white/[0.14] bg-black/80 px-3 py-2 text-sm text-[#F1F5F9] focus:border-[#2DD4BF] focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="loc-faction-input"
                  className="block text-xs font-medium text-[#CBD5E1] mb-1.5"
                >
                  Key Figures / Household / Faction
                </label>
                <input
                  id="loc-faction-input"
                  type="text"
                  value={rulerOrFaction}
                  onChange={(e) => setRulerOrFaction(e.target.value)}
                  placeholder="Supports [[Zoi Name]] hyperlinks"
                  className="w-full border border-white/[0.14] bg-black/80 px-3 py-2 text-sm text-[#F1F5F9] focus:border-[#2DD4BF] focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="loc-coords-input"
                  className="block text-xs font-medium text-[#CBD5E1] mb-1.5"
                >
                  Address / Sector / Coordinates
                </label>
                <input
                  id="loc-coords-input"
                  type="text"
                  value={eraOrCoordinates}
                  onChange={(e) => setEraOrCoordinates(e.target.value)}
                  placeholder="e.g. Block 4, Harbor Promenade"
                  className="w-full border border-white/[0.14] bg-black/80 px-3 py-2 text-sm text-[#F1F5F9] focus:border-[#2DD4BF] focus:outline-none"
                />
              </div>
            </div>

            {/* STRICTLY FOR BUSINESS LOTS: BUSINESS OWNER & STAFF UNIQUE SECTION */}
            {category === 'Business lot' && (
              <div className="border border-[#38BDF8]/45 bg-[#38BDF8]/5 p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.10] pb-3">
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-[#38BDF8]" />
                    <h3 className="font-display text-sm font-bold text-white">
                      Business Owner &amp; Staff Roster (Business Lot Exclusive)
                    </h3>
                  </div>
                  <span className="text-[11px] font-mono-tabular text-[#38BDF8]">
                    Auto-Hyperlinks to Zoi Profiles
                  </span>
                </div>

                {/* Business Owner Field */}
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label
                      htmlFor="biz-owner-input"
                      className="text-xs font-semibold text-[#E2E8F0]"
                    >
                      Business Owner / Proprietor
                    </label>
                    {characters.length > 0 && (
                      <select
                        aria-label="Select existing Zoi as Business Owner"
                        value=""
                        onChange={(e) => {
                          if (e.target.value) {
                            setBusinessOwner(`[[${e.target.value}]]`);
                          }
                        }}
                        className="border border-white/[0.14] bg-black/80 px-2.5 py-1 text-xs text-[#38BDF8]"
                      >
                        <option value="">Assign existing Zoi as Owner...</option>
                        {characters.map((c) => (
                          <option key={c.id} value={c.name}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  <input
                    id="biz-owner-input"
                    type="text"
                    value={businessOwner}
                    onChange={(e) => setBusinessOwner(e.target.value)}
                    placeholder="e.g. [[Kaelen Vance]] or Sora Han"
                    className="w-full border border-white/[0.14] bg-black/80 px-3 py-2 text-sm text-white focus:border-[#38BDF8] focus:outline-none"
                  />
                </div>

                {/* Business Staff Roster List */}
                <div className="space-y-2.5 pt-2 border-t border-white/[0.08]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#E2E8F0] flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-[#38BDF8]" />
                      <span>Business Staff &amp; Employees ({businessStaff.length})</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleAddStaffMember}
                      className="inline-flex items-center gap-1 border border-[#38BDF8]/50 bg-[#38BDF8]/15 px-3 py-1 text-xs font-semibold text-white hover:bg-[#38BDF8] hover:text-[#050608] transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add Staff Member</span>
                    </button>
                  </div>

                  {businessStaff.length === 0 ? (
                    <p className="text-xs text-[#94A3B8] italic">
                      No staff members added yet. Click &ldquo;Add Staff
                      Member&rdquo; to list Zois working at this business.
                    </p>
                  ) : (
                    <div className="space-y-2.5">
                      {businessStaff.map((staff, idx) => (
                        <div
                          key={staff.id}
                          className="border border-white/[0.12] bg-black/75 p-3 space-y-2"
                        >
                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                            <div className="sm:col-span-5">
                              <input
                                type="text"
                                value={staff.name}
                                onChange={(e) => {
                                  const next = [...businessStaff];
                                  next[idx] = { ...staff, name: e.target.value };
                                  setBusinessStaff(next);
                                }}
                                placeholder="Staff Zoi Name (e.g. [[Mina Park]])"
                                aria-label={`Staff member ${idx + 1} name`}
                                className="w-full border border-white/[0.14] bg-black/80 px-2.5 py-1.5 text-xs text-white focus:border-[#38BDF8] focus:outline-none"
                              />
                            </div>
                            <div className="sm:col-span-4">
                              <input
                                type="text"
                                value={staff.role}
                                onChange={(e) => {
                                  const next = [...businessStaff];
                                  next[idx] = { ...staff, role: e.target.value };
                                  setBusinessStaff(next);
                                }}
                                placeholder="Role / Job Title (e.g. Head Barista)"
                                aria-label={`Staff member ${idx + 1} role`}
                                className="w-full border border-white/[0.14] bg-black/80 px-2.5 py-1.5 text-xs text-white focus:border-[#38BDF8] focus:outline-none"
                              />
                            </div>
                            <div className="sm:col-span-3 flex items-center gap-1.5">
                              <input
                                type="text"
                                value={staff.shiftOrNotes || ''}
                                onChange={(e) => {
                                  const next = [...businessStaff];
                                  next[idx] = {
                                    ...staff,
                                    shiftOrNotes: e.target.value,
                                  };
                                  setBusinessStaff(next);
                                }}
                                placeholder="Shift / Notes"
                                aria-label={`Staff member ${idx + 1} shift or notes`}
                                className="flex-1 min-w-0 border border-white/[0.14] bg-black/80 px-2.5 py-1.5 text-xs text-[#CBD5E1] focus:border-[#38BDF8] focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  setBusinessStaff(
                                    businessStaff.filter((s) => s.id !== staff.id)
                                  )
                                }
                                aria-label={`Remove staff member ${idx + 1}`}
                                className="p-1.5 text-[#94A3B8] hover:text-[#EF4444]"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>

                          {characters.length > 0 && (
                            <div className="flex items-center gap-2 text-[11px]">
                              <span className="text-[#94A3B8]">
                                Quick Pick Registered Zoi:
                              </span>
                              <select
                                aria-label={`Select registered Zoi for staff slot ${idx + 1}`}
                                value=""
                                onChange={(e) => {
                                  if (e.target.value) {
                                    const next = [...businessStaff];
                                    next[idx] = {
                                      ...staff,
                                      name: `[[${e.target.value}]]`,
                                    };
                                    setBusinessStaff(next);
                                  }
                                }}
                                className="border border-white/[0.14] bg-black/80 px-2 py-0.5 text-[11px] text-[#38BDF8]"
                              >
                                <option value="">Choose Zoi...</option>
                                {characters.map((c) => (
                                  <option key={c.id} value={c.name}>
                                    {c.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Overview Summary + Context-Aware AI Summary Assistant */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label
                  htmlFor="loc-summary-input"
                  className="block text-xs font-medium text-[#CBD5E1]"
                >
                  Overview / Gazetteer Summary (Supports [[Entry]] Hyperlinks)
                </label>
                <span className="text-[11px] font-mono-tabular text-[#94A3B8]">
                  {summary.trim()
                    ? 'AI will use your current summary as context to edit/improve'
                    : 'AI can draft a fresh summary from your prompt'}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 border border-[#2DD4BF]/30 bg-[#2DD4BF]/5 p-2.5">
                <input
                  type="text"
                  value={aiSummaryPrompt}
                  onChange={(e) => setAiSummaryPrompt(e.target.value)}
                  placeholder={
                    summary.trim()
                      ? 'Prompt AI to edit or improve existing summary...'
                      : 'Prompt AI to write gazetteer summary...'
                  }
                  aria-label="AI prompt for Location summary"
                  className="flex-1 min-w-[200px] border border-white/[0.14] bg-black/80 px-3 py-1.5 text-xs text-white placeholder-[#64748B] focus:border-[#2DD4BF] focus:outline-none"
                />
                <button
                  type="button"
                  disabled={isGeneratingSummary || aiCooldownRemainingSec > 0}
                  onClick={() => void handleAiAssistSummary()}
                  className="inline-flex items-center gap-1.5 bg-[#2DD4BF] px-3 py-1.5 text-xs font-semibold text-[#050608] hover:bg-[#5EEAD4] disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>
                    {isGeneratingSummary
                      ? 'AI Writing...'
                      : aiCooldownRemainingSec > 0
                        ? `Cooldown (${aiCooldownRemainingSec}s)`
                        : summary.trim()
                          ? 'AI Edit / Improve Summary'
                          : 'AI Write Summary'}
                  </span>
                </button>
              </div>

              <textarea
                id="loc-summary-input"
                rows={4}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Describe this city, residential lot, community lot, or business lot..."
                className="w-full border border-white/[0.14] bg-black/80 px-3 py-2 text-sm text-[#F1F5F9] focus:border-[#2DD4BF] focus:outline-none leading-relaxed"
              />
            </div>

            {/* Extra Infobox Rows */}
            <div className="pt-3 border-t border-white/[0.10] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#E2E8F0]">
                  Additional Gazetteer Status Rows
                </span>
                <button
                  type="button"
                  onClick={handleAddAttribute}
                  className="inline-flex items-center gap-1 border border-white/[0.14] bg-white/[0.04] px-2.5 py-1 text-xs text-[#2DD4BF] hover:border-[#2DD4BF]"
                >
                  <Plus className="h-3 w-3" />
                  <span>Add Field</span>
                </button>
              </div>

              {attributes.map((attr, idx) => (
                <div key={attr.id} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={attr.label}
                    onChange={(e) => {
                      const next = [...attributes];
                      next[idx] = { ...attr, label: e.target.value };
                      setAttributes(next);
                    }}
                    placeholder="Label (e.g. Lot Value, Amenities)"
                    className="w-1/3 border border-white/[0.14] bg-black/80 px-2.5 py-1.5 text-xs text-[#F1F5F9]"
                  />
                  <input
                    type="text"
                    value={attr.value}
                    onChange={(e) => {
                      const next = [...attributes];
                      next[idx] = { ...attr, value: e.target.value };
                      setAttributes(next);
                    }}
                    placeholder="Value (supports [[Entry]])"
                    className="flex-1 border border-white/[0.14] bg-black/80 px-2.5 py-1.5 text-xs text-[#F1F5F9]"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setAttributes(attributes.filter((a) => a.id !== attr.id))
                    }
                    aria-label="Remove location attribute"
                    className="p-1.5 text-[#94A3B8] hover:text-[#EF4444]"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <SectionBuilder
            sections={sections}
            onChange={setSections}
            characters={characters}
            locations={locations}
            currentEntityId={initialLocation?.id}
            entityType="location"
            entityName={name}
            entityRoleOrSubtitle={`${category}${subtitle ? ` · ${subtitle}` : ''}`}
            entityPersonality={climate}
            aiCooldownRemainingSec={aiCooldownRemainingSec}
            onAiCooldownStarted={onAiCooldownStarted}
          />
        </div>
      </div>

      <ImageCropperModal
        isOpen={isCropperOpen}
        initialRawImage={rawImageDataUrl || imageDataUrl}
        initialConfig={cropConfig}
        defaultAspect="16:9"
        entityName={name || 'Location Cover'}
        onApply={(cropped, raw, cfg) => {
          setImageDataUrl(cropped);
          setRawImageDataUrl(raw);
          setCropConfig(cfg);
          setIsCropperOpen(false);
        }}
        onClose={() => setIsCropperOpen(false)}
      />

      <ImageCropperModal
        isOpen={isBgCropperOpen}
        initialRawImage={rawBackgroundDataUrl || backgroundDataUrl}
        initialConfig={backgroundCropConfig}
        defaultAspect="16:9"
        entityName={`${name || 'Location'} Page Background`}
        onApply={(cropped, raw, cfg) => {
          setBackgroundDataUrl(cropped);
          setRawBackgroundDataUrl(raw);
          setBackgroundCropConfig(cfg);
          setIsBgCropperOpen(false);
        }}
        onClose={() => setIsBgCropperOpen(false)}
      />

      <ImageCropperModal
        isOpen={isSocialBannerCropperOpen}
        initialRawImage={rawSocialBannerDataUrl || socialBannerDataUrl}
        initialConfig={socialBannerCropConfig}
        defaultAspect="16:9"
        entityName={`${name || 'Location'} Social Media Profile Banner`}
        onApply={(cropped, raw, cfg) => {
          setSocialBannerDataUrl(cropped);
          setRawSocialBannerDataUrl(raw);
          setSocialBannerCropConfig(cfg);
          setIsSocialBannerCropperOpen(false);
        }}
        onClose={() => setIsSocialBannerCropperOpen(false)}
      />
    </form>
  );
};

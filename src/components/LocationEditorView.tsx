import React, { useRef, useState } from 'react';
import {
  CharacterEntry,
  GalleryPhoto,
  ImageCropConfig,
  KeyValueItem,
  LOCATION_CATEGORIES,
  LocationCategoryType,
  LocationEntry,
  ProfileSection,
} from '../types/codex';
import { normalizeLocationCategory } from '../utils/codexLogic';
import { compressImageFileToDataUrl } from '../utils/imageCompression';
import { ImageCropperModal } from './ImageCropperModal';
import { SectionBuilder } from './SectionBuilder';
import {
  ArrowLeft,
  Building2,
  Camera,
  Crop,
  Home,
  Image as ImageIcon,
  Images,
  Landmark,
  MapPin,
  Plus,
  Save,
  Trash2,
  Upload,
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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const alreadyTaggedPhotos = initialLocation
    ? existingPhotos.filter((p) =>
        p.taggedLocationIds.includes(initialLocation.id)
      )
    : [];

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
      imageDataUrl,
      rawImageDataUrl: rawImageDataUrl || undefined,
      cropConfig,
      backgroundDataUrl: backgroundDataUrl || undefined,
      rawBackgroundDataUrl: rawBackgroundDataUrl || undefined,
      backgroundCropConfig,
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
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#233044] pb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-1.5 border border-[#2C3B52] bg-[#162030] px-3 py-1.5 text-xs font-medium text-[#CBD5E1] hover:text-white transition-colors"
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
          <div className="border border-[#233044] bg-[#111722]/90 backdrop-blur-md p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-sm font-semibold text-[#F1F5F9]">
                Location Cover Image
              </h2>
              <span className="text-[11px] font-mono-tabular text-[#94A3B8]">
                Move · Resize · Crop
              </span>
            </div>

            {imageDataUrl ? (
              <div className="relative aspect-[16/9] w-full overflow-hidden border border-[#2C3B52] bg-[#090D14]">
                <img
                  src={imageDataUrl}
                  alt="Location preview"
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
              </div>
            ) : (
              <div className="aspect-[16/9] w-full border border-dashed border-[#2C3B52] bg-[#090D14] flex flex-col items-center justify-center p-6 text-center">
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

          {/* Individual Location Page Background Uploader */}
          <div className="border border-[#233044] bg-[#111722]/90 backdrop-blur-md p-5 space-y-4">
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
              Assign a custom background image displayed behind this location&apos;s
              profile page (overrides the default site background).
            </p>

            {backgroundDataUrl ? (
              <div className="relative aspect-[16/9] w-full overflow-hidden border border-[#2C3B52] bg-[#090D14]">
                <img
                  src={backgroundDataUrl}
                  alt="Location page background preview"
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
              </div>
            ) : (
              <div className="aspect-[16/9] w-full border border-dashed border-[#2C3B52] bg-[#090D14] flex flex-col items-center justify-center p-4 text-center">
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
                className="flex-1 flex items-center justify-center gap-1.5 border border-[#2C3B52] bg-[#162030] px-3 py-2 text-xs font-medium text-[#F1F5F9] hover:border-[#2DD4BF] transition-colors whitespace-nowrap shrink-0"
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
                  className="border border-[#2C3B52] bg-[#162030] px-3 py-2 text-xs text-[#EF4444] hover:bg-[#EF4444]/15 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Multi-Image Gallery Upload Box for Location */}
          <div className="border border-[#233044] bg-[#111722]/90 backdrop-blur-md p-5 space-y-4">
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
              location. Tag any characters featured in the shots so they appear
              on their character profiles too.
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
              className="w-full flex items-center justify-center gap-2 border border-[#2C3B52] bg-[#162030] px-4 py-2 text-xs font-medium text-[#F1F5F9] hover:border-[#2DD4BF] transition-colors whitespace-nowrap shrink-0"
            >
              <Camera className="h-3.5 w-3.5 text-[#2DD4BF]" />
              <span>Upload Multiple Gallery Images</span>
            </button>

            {pendingPhotos.length > 0 && (
              <div className="space-y-3 pt-2 border-t border-[#233044]">
                {pendingPhotos.map((p, idx) => (
                  <div
                    key={p.id}
                    className="border border-[#233044] bg-[#090D14] p-2.5 space-y-2"
                  >
                    <div className="flex items-center gap-2.5">
                      <img
                        src={p.imageDataUrl}
                        alt={p.caption}
                        className="h-12 w-16 object-cover border border-[#2C3B52] shrink-0"
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
                        className="flex-1 border border-[#2C3B52] bg-[#111722] px-2 py-1 text-xs text-[#F1F5F9]"
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
                          Tag Character:
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
                                  : 'border-[#233044] text-[#94A3B8]'
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

        {/* Right: Basic Location Data + Lot Category Selector + Modular Sections */}
        <div className="lg:col-span-8 space-y-6">
          <div className="border border-[#233044] bg-[#111722]/90 backdrop-blur-md p-6 space-y-5">
            <h2 className="font-display text-base font-semibold text-[#F1F5F9] border-b border-[#233044] pb-3">
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
                          : 'border-[#233044] bg-[#090D14] text-[#94A3B8] hover:border-[#2C3B52] hover:text-white'
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
                className="w-full border border-[#2C3B52] bg-[#090D14] px-3 py-2 text-xs text-[#F1F5F9] focus:border-[#2DD4BF] focus:outline-none"
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
                  placeholder="e.g. Dowon Arts Plaza, Bliss Bay Loft"
                  className="w-full border border-[#2C3B52] bg-[#090D14] px-3 py-2 text-sm text-[#F1F5F9] focus:border-[#2DD4BF] focus:outline-none"
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
                  className="w-full border border-[#2C3B52] bg-[#090D14] px-3 py-2 text-sm text-[#F1F5F9] focus:border-[#2DD4BF] focus:outline-none"
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
                  className="w-full border border-[#2C3B52] bg-[#090D14] px-3 py-2 text-sm text-[#F1F5F9] focus:border-[#2DD4BF] focus:outline-none"
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
                  className="w-full border border-[#2C3B52] bg-[#090D14] px-3 py-2 text-sm text-[#F1F5F9] focus:border-[#2DD4BF] focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="loc-faction-input"
                  className="block text-xs font-medium text-[#CBD5E1] mb-1.5"
                >
                  Key Figures / Household / Owner
                </label>
                <input
                  id="loc-faction-input"
                  type="text"
                  value={rulerOrFaction}
                  onChange={(e) => setRulerOrFaction(e.target.value)}
                  placeholder="Supports [[Character Name]] hyperlinks"
                  className="w-full border border-[#2C3B52] bg-[#090D14] px-3 py-2 text-sm text-[#F1F5F9] focus:border-[#2DD4BF] focus:outline-none"
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
                  className="w-full border border-[#2C3B52] bg-[#090D14] px-3 py-2 text-sm text-[#F1F5F9] focus:border-[#2DD4BF] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="loc-summary-input"
                className="block text-xs font-medium text-[#CBD5E1] mb-1.5"
              >
                Overview / Gazetteer Summary (Supports [[Entry]] Hyperlinks)
              </label>
              <textarea
                id="loc-summary-input"
                rows={4}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Describe this city, residential lot, community lot, or business lot..."
                className="w-full border border-[#2C3B52] bg-[#090D14] px-3 py-2 text-sm text-[#F1F5F9] focus:border-[#2DD4BF] focus:outline-none leading-relaxed"
              />
            </div>

            {/* Extra Infobox Rows */}
            <div className="pt-3 border-t border-[#233044] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#E2E8F0]">
                  Additional Gazetteer Status Rows
                </span>
                <button
                  type="button"
                  onClick={handleAddAttribute}
                  className="inline-flex items-center gap-1 border border-[#2C3B52] bg-[#162030] px-2.5 py-1 text-xs text-[#2DD4BF] hover:border-[#2DD4BF]"
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
                    className="w-1/3 border border-[#2C3B52] bg-[#090D14] px-2.5 py-1.5 text-xs text-[#F1F5F9]"
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
                    className="flex-1 border border-[#2C3B52] bg-[#090D14] px-2.5 py-1.5 text-xs text-[#F1F5F9]"
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

          <div className="border border-[#233044] bg-[#111722]/90 backdrop-blur-md p-6">
            <SectionBuilder
              sections={sections}
              onChange={setSections}
              characters={characters}
              locations={locations}
            />
          </div>
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
    </form>
  );
};

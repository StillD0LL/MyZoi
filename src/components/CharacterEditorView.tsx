import React, { useRef, useState } from 'react';
import {
  CharacterEntry,
  GalleryPhoto,
  HouseholdStatusType,
  ImageCropConfig,
  KeyValueItem,
  LocationEntry,
  ProfileSection,
  RelationshipStatusType,
  ZOI_AGE_OPTIONS,
  ZOI_BIRTH_MONTH_OPTIONS,
  ZOI_GENDER_OPTIONS,
  ZOI_HEIGHT_OPTIONS,
  ZOI_HOUSEHOLD_STATUS_OPTIONS,
  ZOI_PRONOUN_OPTIONS,
  ZOI_RELATIONSHIP_STATUS_OPTIONS,
  ZOI_STATUS_OPTIONS,
} from '../types/codex';
import { formatRelationshipDisplay } from '../utils/codexLogic';
import { compressImageFileToDataUrl } from '../utils/imageCompression';
import { ImageCropperModal } from './ImageCropperModal';
import { SectionBuilder } from './SectionBuilder';
import {
  ArrowLeft,
  Camera,
  Crop,
  Image as ImageIcon,
  Images,
  Plus,
  Save,
  Trash2,
  Upload,
} from 'lucide-react';

interface PendingEditorPhoto {
  id: string;
  imageDataUrl: string;
  caption: string;
  taggedCharacterIds: string[];
  taggedLocationIds: string[];
}

interface CharacterEditorViewProps {
  initialCharacter?: CharacterEntry;
  characters: CharacterEntry[];
  locations: LocationEntry[];
  existingPhotos: GalleryPhoto[];
  onSave: (character: CharacterEntry, addedPhotos: GalleryPhoto[]) => void;
  onCancel: () => void;
}

export const CharacterEditorView: React.FC<CharacterEditorViewProps> = ({
  initialCharacter,
  characters,
  locations,
  existingPhotos,
  onSave,
  onCancel,
}) => {
  const [name, setName] = useState(initialCharacter?.name || '');
  const [title, setTitle] = useState(initialCharacter?.title || '');
  const [role, setRole] = useState(initialCharacter?.role || '');
  const [gender, setGender] = useState(
    initialCharacter?.gender ?? initialCharacter?.species ?? ''
  );
  const [pronouns, setPronouns] = useState(initialCharacter?.pronouns || '');
  const [age, setAge] = useState(initialCharacter?.age || '');
  const [birthMonth, setBirthMonth] = useState(
    initialCharacter?.birthdate || ''
  );
  const [height, setHeight] = useState(initialCharacter?.height || '');
  const [occupation, setOccupation] = useState(
    initialCharacter?.occupation || ''
  );
  const [personality, setPersonality] = useState(
    initialCharacter?.personality || ''
  );
  const [ambition, setAmbition] = useState(initialCharacter?.ambition || '');

  // Household Status dropdown ('Single' | 'Family')
  const [householdStatus, setHouseholdStatus] = useState<HouseholdStatusType>(
    initialCharacter?.householdStatus === 'Family' ? 'Family' : 'Single'
  );

  // Relationship Status dropdown ('Single' | 'Dating' | 'Engaged' | 'Married') + Partner hyperlink
  const [relationshipStatus, setRelationshipStatus] =
    useState<RelationshipStatusType>(
      initialCharacter?.relationshipStatus &&
        ZOI_RELATIONSHIP_STATUS_OPTIONS.includes(
          initialCharacter.relationshipStatus
        )
        ? initialCharacter.relationshipStatus
        : 'Single'
    );
  const [relationshipPartner, setRelationshipPartner] = useState(
    (initialCharacter?.relationshipPartner || '')
      .replace(/^\[\[|\]\]$/g, '')
      .trim()
  );

  const [affiliation, setAffiliation] = useState(
    initialCharacter?.affiliation || ''
  );
  // Status defaults to 'Alive'
  const [status, setStatus] = useState(
    initialCharacter?.status &&
      initialCharacter.status.toLowerCase() !== 'active'
      ? initialCharacter.status
      : 'Alive'
  );
  const [originLocation, setOriginLocation] = useState(
    initialCharacter?.originLocation || ''
  );
  const [summary, setSummary] = useState(initialCharacter?.summary || '');
  const [portraitDataUrl, setPortraitDataUrl] = useState(
    initialCharacter?.portraitDataUrl || ''
  );
  const [rawPortraitDataUrl, setRawPortraitDataUrl] = useState(
    initialCharacter?.rawPortraitDataUrl ||
      initialCharacter?.portraitDataUrl ||
      ''
  );
  const [cropConfig, setCropConfig] = useState<ImageCropConfig | undefined>(
    initialCharacter?.cropConfig
  );
  // Individual Zoi Page Background State
  const [backgroundDataUrl, setBackgroundDataUrl] = useState(
    initialCharacter?.backgroundDataUrl || ''
  );
  const [rawBackgroundDataUrl, setRawBackgroundDataUrl] = useState(
    initialCharacter?.rawBackgroundDataUrl || ''
  );
  const [backgroundCropConfig, setBackgroundCropConfig] = useState<
    ImageCropConfig | undefined
  >(initialCharacter?.backgroundCropConfig);

  const [personalAttributes, setPersonalAttributes] = useState<KeyValueItem[]>(
    initialCharacter?.personalAttributes || []
  );
  const [sections, setSections] = useState<ProfileSection[]>(
    initialCharacter?.sections || []
  );

  // Multi-image uploads inside editor
  const [pendingPhotos, setPendingPhotos] = useState<PendingEditorPhoto[]>([]);
  const multiFileInputRef = useRef<HTMLInputElement | null>(null);

  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [isBgCropperOpen, setIsBgCropperOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const alreadyTaggedPhotos = initialCharacter
    ? existingPhotos.filter((p) =>
        p.taggedCharacterIds.includes(initialCharacter.id)
      )
    : [];

  const otherZois = characters.filter((c) => c.id !== initialCharacter?.id);

  const handleMultiFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    const files: File[] = Array.from(fileList);

    files.forEach((file: File) => {
      void compressImageFileToDataUrl(file, 1360, 0.82).then((dataUrl) => {
        setPendingPhotos((prev) => [
          ...prev,
          {
            id: `pend-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            imageDataUrl: dataUrl,
            caption: file.name.replace(/\.[^/.]+$/, ''),
            taggedCharacterIds: [],
            taggedLocationIds: [],
          },
        ]);
      });
    });
    e.target.value = '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMessage('Zoi Name is required before saving.');
      return;
    }

    const now = new Date().toISOString();
    const charId =
      initialCharacter?.id ||
      `char-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    const cleanPartner =
      relationshipStatus === 'Single'
        ? ''
        : relationshipPartner.replace(/^\[\[|\]\]$/g, '').trim();

    const formattedRelationship = formatRelationshipDisplay(
      relationshipStatus,
      cleanPartner
    );

    const saved: CharacterEntry = {
      id: charId,
      name: trimmedName,
      title: title.trim(),
      role: role.trim(),
      gender: gender.trim(),
      pronouns: pronouns.trim(),
      age: age.trim(),
      birthdate: birthMonth.trim(),
      height: height.trim(),
      occupation: occupation.trim(),
      personality: personality.trim(),
      ambition: ambition.trim(),
      householdStatus,
      relationshipStatus,
      relationshipPartner: cleanPartner,
      relationships: formattedRelationship,
      affiliation: affiliation.trim(),
      status: status.trim() || 'Alive',
      originLocation: originLocation.trim(),
      summary: summary.trim(),
      portraitDataUrl,
      rawPortraitDataUrl,
      cropConfig,
      backgroundDataUrl: backgroundDataUrl || undefined,
      rawBackgroundDataUrl: rawBackgroundDataUrl || undefined,
      backgroundCropConfig,
      profileDesign: 'encyclopedia',
      personalAttributes,
      sections,
      createdAt: initialCharacter?.createdAt || now,
      updatedAt: now,
    };

    const createdGalleryPhotos: GalleryPhoto[] = pendingPhotos.map(
      (p, idx) => ({
        id: `photo-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 5)}`,
        imageDataUrl: p.imageDataUrl,
        caption: p.caption.trim() || `${trimmedName} Snapshot`,
        taggedCharacterIds: Array.from(
          new Set([charId, ...p.taggedCharacterIds])
        ),
        taggedLocationIds: p.taggedLocationIds,
        createdAt: now,
      })
    );

    onSave(saved, createdGalleryPhotos);
  };

  const renderSelectWithLegacyOption = (
    currentVal: string,
    options: readonly string[],
    placeholderLabel: string
  ) => {
    const hasCustomLegacy =
      currentVal && !options.includes(currentVal as never);
    return (
      <>
        <option value="">{placeholderLabel}</option>
        {hasCustomLegacy && (
          <option value={currentVal}>{currentVal}</option>
        )}
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </>
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Top Action Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.11] pb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#94A3B8] hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Cancel</span>
          </button>
          <span className="text-white/[0.16]">|</span>
          <h1 className="font-display text-xl font-bold text-white">
            {initialCharacter
              ? `Edit Zoi: ${initialCharacter.name}`
              : 'Create New Zoi'}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="border border-white/[0.14] bg-white/[0.04] px-4 py-2 text-xs font-medium text-[#CBD5E1] hover:bg-white/[0.08] transition-colors whitespace-nowrap shrink-0"
          >
            Discard
          </button>
          <button
            type="submit"
            className="inline-flex items-center gap-2 bg-[#2DD4BF] px-5 py-2 text-xs font-semibold text-[#050608] hover:bg-[#5EEAD4] transition-colors whitespace-nowrap shrink-0"
          >
            <Save className="h-3.5 w-3.5" />
            <span>Save Zoi Profile</span>
          </button>
        </div>
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="border border-[#EF4444] bg-[#EF4444]/10 px-4 py-3 text-xs font-medium text-[#FCA5A5]"
        >
          {errorMessage}
        </div>
      )}

      {/* Main Grid: Left Portrait & Media, Right Personal Info & Dropdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Portrait Uploader + Individual Page Background + Gallery */}
        <div className="lg:col-span-4 space-y-6">
          <div className="inzoi-glass-panel p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-sm font-semibold text-white">
                Zoi Portrait Image
              </h2>
              {portraitDataUrl && (
                <button
                  type="button"
                  onClick={() => {
                    setPortraitDataUrl('');
                    setRawPortraitDataUrl('');
                  }}
                  className="text-xs text-[#EF4444] hover:underline"
                >
                  Clear
                </button>
              )}
            </div>

            {portraitDataUrl ? (
              <div className="relative aspect-[3/4] w-full border border-white/[0.14] bg-black/80 overflow-hidden">
                <img
                  src={portraitDataUrl}
                  alt="Zoi portrait preview"
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
              </div>
            ) : (
              <div className="aspect-[3/4] w-full border border-dashed border-white/[0.16] bg-black/70 flex flex-col items-center justify-center p-6 text-center">
                <Upload className="h-8 w-8 text-[#2DD4BF] mb-2" />
                <p className="text-xs font-medium text-white">
                  No Portrait Assigned
                </p>
                <p className="mt-1 text-[11px] text-[#94A3B8]">
                  Upload and crop a full portrait for Zoi selection cards,
                  Encyclopedia Dossier, and Social Feed avatar.
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={() => setIsCropperOpen(true)}
              className="w-full flex items-center justify-center gap-2 border border-[#2DD4BF] bg-[#2DD4BF]/15 px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#2DD4BF] hover:text-[#050608] transition-colors whitespace-nowrap shrink-0"
            >
              <Crop className="h-4 w-4" />
              <span>
                {portraitDataUrl
                  ? 'Move, Resize & Re-Crop Portrait'
                  : 'Open Portrait Uploader & Cropper'}
              </span>
            </button>
          </div>

          {/* Individual Zoi Page Background Uploader */}
          <div className="inzoi-glass-panel p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-sm font-semibold text-white flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-[#2DD4BF]" />
                <span>Individual Page Background</span>
              </h2>
              <span className="text-[11px] font-mono-tabular text-[#94A3B8]">
                Entry Override
              </span>
            </div>

            <p className="text-xs text-[#94A3B8] leading-relaxed">
              Assign a custom background image displayed behind this Zoi&apos;s
              Encyclopedia Dossier and Social Feed banner.
            </p>

            {backgroundDataUrl ? (
              <div className="relative aspect-[16/9] w-full overflow-hidden border border-white/[0.14] bg-black/80">
                <img
                  src={backgroundDataUrl}
                  alt="Zoi page background preview"
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
                className="flex-1 flex items-center justify-center gap-1.5 border border-white/[0.14] bg-white/[0.04] px-3 py-2 text-xs font-medium text-white hover:border-[#2DD4BF] transition-colors whitespace-nowrap shrink-0"
              >
                <Crop className="h-3.5 w-3.5 text-[#2DD4BF]" />
                <span>
                  {backgroundDataUrl
                    ? 'Change Background'
                    : 'Upload Zoi Background'}
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
                  aria-label="Clear Zoi background"
                  className="border border-white/[0.14] bg-white/[0.04] px-3 py-2 text-xs text-[#EF4444] hover:bg-[#EF4444]/15 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Multi-Image & Screenshot Gallery Upload Box */}
          <div className="inzoi-glass-panel p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-sm font-semibold text-white flex items-center gap-2">
                <Images className="h-4 w-4 text-[#2DD4BF]" />
                <span>Zoi Photo Gallery</span>
              </h2>
              <span className="text-[11px] font-mono-tabular text-[#94A3B8]">
                {alreadyTaggedPhotos.length + pendingPhotos.length} total
              </span>
            </div>

            <p className="text-xs text-[#94A3B8] leading-relaxed">
              Upload multiple additional images or screenshots for this Zoi. You
              can also tag other Zois and locations so the photos appear on
              their pages too.
            </p>

            <input
              ref={multiFileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleMultiFilesChange}
              className="hidden"
              aria-label="Upload multiple gallery photos"
            />

            <button
              type="button"
              onClick={() => multiFileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 border border-white/[0.14] bg-white/[0.04] px-4 py-2 text-xs font-medium text-white hover:border-[#2DD4BF] transition-colors whitespace-nowrap shrink-0"
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
                        className="flex-1 border border-white/[0.14] bg-black/80 px-2 py-1 text-xs text-white"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setPendingPhotos(
                            pendingPhotos.filter((item) => item.id !== p.id)
                          )
                        }
                        aria-label="Remove staged photo"
                        className="p-1 text-[#94A3B8] hover:text-[#EF4444]"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {locations.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1 pt-1">
                        <span className="text-[10px] text-[#94A3B8] mr-1">
                          Tag Location:
                        </span>
                        {locations.map((loc) => {
                          const tagged = p.taggedLocationIds.includes(loc.id);
                          return (
                            <button
                              key={loc.id}
                              type="button"
                              onClick={() => {
                                const nextLocs = tagged
                                  ? p.taggedLocationIds.filter(
                                      (id) => id !== loc.id
                                    )
                                  : [...p.taggedLocationIds, loc.id];
                                const next = [...pendingPhotos];
                                next[idx] = {
                                  ...p,
                                  taggedLocationIds: nextLocs,
                                };
                                setPendingPhotos(next);
                              }}
                              className={`px-1.5 py-0.5 text-[10px] border transition-colors ${
                                tagged
                                  ? 'border-[#2DD4BF] text-[#2DD4BF] bg-[#2DD4BF]/10'
                                  : 'border-white/[0.12] text-[#94A3B8]'
                              }`}
                            >
                              {loc.name}
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

        {/* Right Column: Zoi Identity Dropdowns + Life-Sim Fields + Modular Sections */}
        <div className="lg:col-span-8 space-y-6">
          <div className="inzoi-glass-panel p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-white/[0.10] pb-3">
              <h2 className="font-display text-base font-semibold text-white">
                Zoi Personal Identity &amp; Encyclopedia Dossier Vitals
              </h2>
              <span className="text-xs font-mono-tabular text-[#2DD4BF]">
                Encyclopedia Dossier Layout
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="char-name-input"
                  className="block text-xs font-medium text-[#CBD5E1] mb-1.5"
                >
                  Zoi Name *
                </label>
                <input
                  id="char-name-input"
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="e.g. Kaelen Vance"
                  className="w-full border border-white/[0.14] bg-black/75 px-3 py-2 text-sm text-white focus:border-[#2DD4BF] focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="char-title-input"
                  className="block text-xs font-medium text-[#CBD5E1] mb-1.5"
                >
                  Title / Epithet
                </label>
                <input
                  id="char-title-input"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Sound Architect of Dowon"
                  className="w-full border border-white/[0.14] bg-black/75 px-3 py-2 text-sm text-white focus:border-[#2DD4BF] focus:outline-none"
                />
              </div>

              {/* Status Dropdown (Defaults to Alive) */}
              <div>
                <label
                  htmlFor="char-status-select"
                  className="block text-xs font-medium text-[#CBD5E1] mb-1.5"
                >
                  Status
                </label>
                <select
                  id="char-status-select"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full border border-white/[0.14] bg-black/75 px-3 py-2 text-sm text-white focus:border-[#2DD4BF] focus:outline-none"
                >
                  {ZOI_STATUS_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              {/* Gender Dropdown */}
              <div>
                <label
                  htmlFor="char-gender-select"
                  className="block text-xs font-medium text-[#CBD5E1] mb-1.5"
                >
                  Gender
                </label>
                <select
                  id="char-gender-select"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full border border-white/[0.14] bg-black/75 px-3 py-2 text-sm text-white focus:border-[#2DD4BF] focus:outline-none"
                >
                  {renderSelectWithLegacyOption(
                    gender,
                    ZOI_GENDER_OPTIONS,
                    'Select Gender...'
                  )}
                </select>
              </div>

              {/* Pronouns Dropdown */}
              <div>
                <label
                  htmlFor="char-pronouns-select"
                  className="block text-xs font-medium text-[#CBD5E1] mb-1.5"
                >
                  Pronouns
                </label>
                <select
                  id="char-pronouns-select"
                  value={pronouns}
                  onChange={(e) => setPronouns(e.target.value)}
                  className="w-full border border-white/[0.14] bg-black/75 px-3 py-2 text-sm text-white focus:border-[#2DD4BF] focus:outline-none"
                >
                  {renderSelectWithLegacyOption(
                    pronouns,
                    ZOI_PRONOUN_OPTIONS,
                    'Select Pronouns...'
                  )}
                </select>
              </div>

              {/* Birth Month Dropdown */}
              <div>
                <label
                  htmlFor="char-birthmonth-select"
                  className="block text-xs font-medium text-[#CBD5E1] mb-1.5"
                >
                  Birth Month
                </label>
                <select
                  id="char-birthmonth-select"
                  value={birthMonth}
                  onChange={(e) => setBirthMonth(e.target.value)}
                  className="w-full border border-white/[0.14] bg-black/75 px-3 py-2 text-sm text-white focus:border-[#2DD4BF] focus:outline-none"
                >
                  {renderSelectWithLegacyOption(
                    birthMonth,
                    ZOI_BIRTH_MONTH_OPTIONS,
                    'Select Birth Month...'
                  )}
                </select>
              </div>

              {/* Age Dropdown */}
              <div>
                <label
                  htmlFor="char-age-select"
                  className="block text-xs font-medium text-[#CBD5E1] mb-1.5"
                >
                  Age
                </label>
                <select
                  id="char-age-select"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="w-full border border-white/[0.14] bg-black/75 px-3 py-2 text-sm text-white focus:border-[#2DD4BF] focus:outline-none"
                >
                  {renderSelectWithLegacyOption(
                    age,
                    ZOI_AGE_OPTIONS,
                    'Select Age...'
                  )}
                </select>
              </div>

              {/* Height Dropdown */}
              <div>
                <label
                  htmlFor="char-height-select"
                  className="block text-xs font-medium text-[#CBD5E1] mb-1.5"
                >
                  Height
                </label>
                <select
                  id="char-height-select"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  className="w-full border border-white/[0.14] bg-black/75 px-3 py-2 text-sm text-white focus:border-[#2DD4BF] focus:outline-none"
                >
                  {renderSelectWithLegacyOption(
                    height,
                    ZOI_HEIGHT_OPTIONS,
                    'Select Height...'
                  )}
                </select>
              </div>

              {/* Household Status Dropdown (Single vs Family) */}
              <div>
                <label
                  htmlFor="char-household-select"
                  className="block text-xs font-medium text-[#CBD5E1] mb-1.5"
                >
                  Household Status
                </label>
                <select
                  id="char-household-select"
                  value={householdStatus}
                  onChange={(e) =>
                    setHouseholdStatus(e.target.value as HouseholdStatusType)
                  }
                  className="w-full border border-white/[0.14] bg-black/75 px-3 py-2 text-sm text-white focus:border-[#2DD4BF] focus:outline-none"
                >
                  {ZOI_HOUSEHOLD_STATUS_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt} Household
                    </option>
                  ))}
                </select>
              </div>

              {/* Relationship Status Dropdown (Single, Dating, Engaged, Married) */}
              <div>
                <label
                  htmlFor="char-relationship-select"
                  className="block text-xs font-medium text-[#CBD5E1] mb-1.5"
                >
                  Relationship Status
                </label>
                <select
                  id="char-relationship-select"
                  value={relationshipStatus}
                  onChange={(e) =>
                    setRelationshipStatus(
                      e.target.value as RelationshipStatusType
                    )
                  }
                  className="w-full border border-white/[0.14] bg-black/75 px-3 py-2 text-sm text-white focus:border-[#2DD4BF] focus:outline-none"
                >
                  {ZOI_RELATIONSHIP_STATUS_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Partner Hyperlink Selection when Relationship Status is Dating, Engaged, or Married */}
            {relationshipStatus !== 'Single' && (
              <div className="border border-[#2DD4BF]/40 bg-[#2DD4BF]/5 p-4 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label
                    htmlFor="char-partner-input"
                    className="text-xs font-semibold text-[#2DD4BF]"
                  >
                    {relationshipStatus} Partner Zoi (Automatically Hyperlinked
                    in Profile)
                  </label>
                  {otherZois.length > 0 && (
                    <select
                      aria-label="Select partner Zoi from roster"
                      value={
                        otherZois.some((z) => z.name === relationshipPartner)
                          ? relationshipPartner
                          : ''
                      }
                      onChange={(e) => {
                        if (e.target.value) {
                          setRelationshipPartner(e.target.value);
                        }
                      }}
                      className="border border-white/[0.14] bg-black/80 px-2.5 py-1 text-xs text-[#2DD4BF]"
                    >
                      <option value="">Select existing Zoi partner...</option>
                      {otherZois.map((z) => (
                        <option key={z.id} value={z.name}>
                          {z.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <input
                  id="char-partner-input"
                  type="text"
                  value={relationshipPartner}
                  onChange={(e) => setRelationshipPartner(e.target.value)}
                  placeholder="Enter Partner Zoi's Name (e.g. Elena Rostova)"
                  className="w-full border border-white/[0.14] bg-black/80 px-3 py-2 text-sm text-white focus:border-[#2DD4BF] focus:outline-none"
                />
                <p className="text-[11px] text-[#94A3B8]">
                  Displays as{' '}
                  <span className="font-mono-tabular text-[#2DD4BF]">
                    {formatRelationshipDisplay(
                      relationshipStatus,
                      relationshipPartner || 'Partner Name'
                    )}
                  </span>{' '}
                  with a clickable hyperlink to their Zoi profile.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="char-occupation-input"
                  className="block text-xs font-medium text-[#CBD5E1] mb-1.5"
                >
                  Occupation / Life Path
                </label>
                <input
                  id="char-occupation-input"
                  type="text"
                  value={occupation}
                  onChange={(e) => setOccupation(e.target.value)}
                  placeholder="e.g. Urban Architect · Sound Designer"
                  className="w-full border border-white/[0.14] bg-black/75 px-3 py-2 text-sm text-white focus:border-[#2DD4BF] focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="char-role-input"
                  className="block text-xs font-medium text-[#CBD5E1] mb-1.5"
                >
                  Role / Archetype
                </label>
                <input
                  id="char-role-input"
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="e.g. Protagonist · Confidant"
                  className="w-full border border-white/[0.14] bg-black/75 px-3 py-2 text-sm text-white focus:border-[#2DD4BF] focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="char-personality-input"
                  className="block text-xs font-medium text-[#CBD5E1] mb-1.5"
                >
                  Personality / Traits
                </label>
                <input
                  id="char-personality-input"
                  type="text"
                  value={personality}
                  onChange={(e) => setPersonality(e.target.value)}
                  placeholder="e.g. Observant · Empathetic · Night Owl"
                  className="w-full border border-white/[0.14] bg-black/75 px-3 py-2 text-sm text-white focus:border-[#2DD4BF] focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="char-affiliation-input"
                  className="block text-xs font-medium text-[#CBD5E1] mb-1.5"
                >
                  Affiliation / Household Name
                </label>
                <input
                  id="char-affiliation-input"
                  type="text"
                  value={affiliation}
                  onChange={(e) => setAffiliation(e.target.value)}
                  placeholder="e.g. Vance Design Studio"
                  className="w-full border border-white/[0.14] bg-black/75 px-3 py-2 text-sm text-white focus:border-[#2DD4BF] focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label
                  htmlFor="char-ambition-input"
                  className="block text-xs font-medium text-[#CBD5E1] mb-1.5"
                >
                  Ambition / Life Desire
                </label>
                <input
                  id="char-ambition-input"
                  type="text"
                  value={ambition}
                  onChange={(e) => setAmbition(e.target.value)}
                  placeholder="e.g. Establish the Cultural Arts District"
                  className="w-full border border-white/[0.14] bg-black/75 px-3 py-2 text-sm text-white focus:border-[#2DD4BF] focus:outline-none"
                />
              </div>
            </div>

            {/* Origin / Primary Location with quick link selector */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="char-location-input"
                  className="text-xs font-medium text-[#CBD5E1]"
                >
                  Primary Location / Residence (Auto-hyperlinks to Location
                  Profile)
                </label>
                {locations.length > 0 && (
                  <select
                    aria-label="Quick select existing location"
                    value=""
                    onChange={(e) => {
                      if (e.target.value) {
                        setOriginLocation(`[[${e.target.value}]]`);
                      }
                    }}
                    className="border border-white/[0.14] bg-black/75 px-2 py-1 text-xs text-[#2DD4BF]"
                  >
                    <option value="">Link existing location...</option>
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.name}>
                        {loc.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <input
                id="char-location-input"
                type="text"
                value={originLocation}
                onChange={(e) => setOriginLocation(e.target.value)}
                placeholder="e.g. [[Dowon Central Plaza]]"
                className="w-full border border-white/[0.14] bg-black/75 px-3 py-2 text-sm text-white focus:border-[#2DD4BF] focus:outline-none"
              />
            </div>

            {/* Overview Summary */}
            <div>
              <label
                htmlFor="char-summary-input"
                className="block text-xs font-medium text-[#CBD5E1] mb-1.5"
              >
                Overview / Lead Summary (Supports [[Zoi]] &amp; [[Location]]
                links)
              </label>
              <textarea
                id="char-summary-input"
                rows={4}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Introduce the Zoi's core identity, appearance, and role in the city..."
                className="w-full border border-white/[0.14] bg-black/75 p-3 text-sm text-white leading-relaxed focus:border-[#2DD4BF] focus:outline-none"
              />
            </div>

            {/* Custom Personal Info Fields */}
            <div className="pt-2 border-t border-white/[0.10]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-white">
                  Additional Infobox Attributes
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setPersonalAttributes([
                      ...personalAttributes,
                      {
                        id: `attr-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
                        label: '',
                        value: '',
                      },
                    ])
                  }
                  className="inline-flex items-center gap-1 border border-white/[0.14] bg-white/[0.04] px-2.5 py-1 text-xs font-medium text-[#2DD4BF] hover:bg-white/[0.08]"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Custom Field</span>
                </button>
              </div>

              {personalAttributes.length > 0 && (
                <div className="space-y-2">
                  {personalAttributes.map((attr, idx) => (
                    <div key={attr.id} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={attr.label}
                        onChange={(e) => {
                          const next = [...personalAttributes];
                          next[idx] = { ...attr, label: e.target.value };
                          setPersonalAttributes(next);
                        }}
                        placeholder="Attribute (e.g. Voice, Hobby, Favorite Dish)"
                        aria-label={`Custom attribute ${idx + 1} label`}
                        className="w-2/5 border border-white/[0.14] bg-black/75 px-3 py-1.5 text-xs text-[#CBD5E1] focus:border-[#2DD4BF] focus:outline-none"
                      />
                      <input
                        type="text"
                        value={attr.value}
                        onChange={(e) => {
                          const next = [...personalAttributes];
                          next[idx] = { ...attr, value: e.target.value };
                          setPersonalAttributes(next);
                        }}
                        placeholder="Value (supports [[Links]])"
                        aria-label={`Custom attribute ${idx + 1} value`}
                        className="flex-1 border border-white/[0.14] bg-black/75 px-3 py-1.5 text-xs text-white focus:border-[#2DD4BF] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setPersonalAttributes(
                            personalAttributes.filter((a) => a.id !== attr.id)
                          )
                        }
                        aria-label={`Remove custom attribute ${idx + 1}`}
                        className="border border-white/[0.14] bg-white/[0.04] p-1.5 text-[#94A3B8] hover:text-[#EF4444]"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Modular Extra Sections Builder */}
          <SectionBuilder
            sections={sections}
            onChange={setSections}
            characters={characters}
            locations={locations}
            currentEntityId={initialCharacter?.id}
          />
        </div>
      </div>

      <ImageCropperModal
        isOpen={isCropperOpen}
        initialRawImage={rawPortraitDataUrl}
        initialConfig={cropConfig}
        defaultAspect="3:4"
        entityName={name}
        onApply={(cropped, raw, cfg) => {
          setPortraitDataUrl(cropped);
          setRawPortraitDataUrl(raw);
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
        entityName={`${name || 'Zoi'} Page Background`}
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

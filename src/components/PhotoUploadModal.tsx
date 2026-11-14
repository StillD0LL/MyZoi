import React, { useRef, useState } from 'react';
import {
  CharacterEntry,
  GalleryPhoto,
  ImageCropConfig,
  LocationEntry,
} from '../types/codex';
import { ImageCropperModal } from './ImageCropperModal';
import { compressImageFileToDataUrl } from '../utils/imageCompression';
import { generateSampleCityScreenshot } from '../../tools/backgroundGenerator';
import {
  Camera,
  Check,
  Crop,
  MapPin,
  Plus,
  Sparkles,
  Trash2,
  Upload,
  User,
  X,
} from 'lucide-react';

interface StagedPhotoItem {
  tempId: string;
  imageDataUrl: string;
  rawImageDataUrl: string;
  cropConfig?: ImageCropConfig;
  caption: string;
  taggedCharacterIds: string[];
  taggedLocationIds: string[];
}

interface PhotoUploadModalProps {
  isOpen: boolean;
  characters: CharacterEntry[];
  locations: LocationEntry[];
  defaultTaggedCharacterId?: string;
  defaultTaggedLocationId?: string;
  onSubmitPhotos: (newPhotos: GalleryPhoto[]) => void;
  onClose: () => void;
}

export const PhotoUploadModal: React.FC<PhotoUploadModalProps> = ({
  isOpen,
  characters,
  locations,
  defaultTaggedCharacterId,
  defaultTaggedLocationId,
  onSubmitPhotos,
  onClose,
}) => {
  const [stagedItems, setStagedItems] = useState<StagedPhotoItem[]>([]);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [cropperTargetIndex, setCropperTargetIndex] = useState<number | null>(
    null
  );

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const createDefaultTags = () => ({
    chars: defaultTaggedCharacterId ? [defaultTaggedCharacterId] : [],
    locs: defaultTaggedLocationId ? [defaultTaggedLocationId] : [],
  });

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    const files: File[] = Array.from(fileList);

    const defaults = createDefaultTags();

    files.forEach((file: File) => {
      void compressImageFileToDataUrl(file, 1360, 0.82).then((dataUrl) => {
        setStagedItems((prev) => [
          ...prev,
          {
            tempId: `staged-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            imageDataUrl: dataUrl,
            rawImageDataUrl: dataUrl,
            caption: file.name.replace(/\.[^/.]+$/, ''),
            taggedCharacterIds: [...defaults.chars],
            taggedLocationIds: [...defaults.locs],
          },
        ]);
      });
    });

    e.target.value = '';
  };

  const handleAddSampleScreenshot = () => {
    const defaults = createDefaultTags();
    const url = generateSampleCityScreenshot(stagedItems.length);
    const nextItem: StagedPhotoItem = {
      tempId: `staged-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      imageDataUrl: url,
      rawImageDataUrl: url,
      caption: 'Evening District Snapshot',
      taggedCharacterIds: [...defaults.chars],
      taggedLocationIds: [...defaults.locs],
    };
    setStagedItems((prev) => [...prev, nextItem]);
    setActiveIndex(stagedItems.length);
  };

  const currentItem = stagedItems[activeIndex] || stagedItems[0];

  const handleUpdateCurrentItem = (patch: Partial<StagedPhotoItem>) => {
    if (!currentItem) return;
    setStagedItems((prev) =>
      prev.map((item) =>
        item.tempId === currentItem.tempId ? { ...item, ...patch } : item
      )
    );
  };

  const handleToggleCharacterTag = (charId: string) => {
    if (!currentItem) return;
    const exists = currentItem.taggedCharacterIds.includes(charId);
    const next = exists
      ? currentItem.taggedCharacterIds.filter((id) => id !== charId)
      : [...currentItem.taggedCharacterIds, charId];
    handleUpdateCurrentItem({ taggedCharacterIds: next });
  };

  const handleToggleLocationTag = (locId: string) => {
    if (!currentItem) return;
    const exists = currentItem.taggedLocationIds.includes(locId);
    const next = exists
      ? currentItem.taggedLocationIds.filter((id) => id !== locId)
      : [...currentItem.taggedLocationIds, locId];
    handleUpdateCurrentItem({ taggedLocationIds: next });
  };

  const handleRemoveStaged = (tempId: string) => {
    setStagedItems((prev) => {
      const next = prev.filter((i) => i.tempId !== tempId);
      if (activeIndex >= next.length) {
        setActiveIndex(Math.max(0, next.length - 1));
      }
      return next;
    });
  };

  const handleSaveAll = () => {
    if (stagedItems.length === 0) return;
    const now = new Date().toISOString();
    const created: GalleryPhoto[] = stagedItems.map((item, idx) => ({
      id: `photo-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
      imageDataUrl: item.imageDataUrl,
      rawImageDataUrl: item.rawImageDataUrl,
      cropConfig: item.cropConfig,
      caption: item.caption.trim() || 'City Snapshot',
      taggedCharacterIds: item.taggedCharacterIds,
      taggedLocationIds: item.taggedLocationIds,
      createdAt: now,
    }));
    onSubmitPhotos(created);
    setStagedItems([]);
    onClose();
  };

  const cropTarget =
    cropperTargetIndex !== null ? stagedItems[cropperTargetIndex] : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="photo-upload-modal-title"
    >
      <div className="w-full max-w-4xl border border-[#2C3B52] bg-[#111722] shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#233044] px-6 py-4 shrink-0">
          <div className="flex items-center gap-3">
            <Camera className="h-5 w-5 text-[#2DD4BF]" />
            <h2
              id="photo-upload-modal-title"
              className="font-display text-lg font-semibold text-[#F3F4F6]"
            >
              Submit Photos &amp; Tag Characters / Locations
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close photo uploader"
            className="p-1.5 text-[#9CA3AF] hover:bg-[#1C212B] hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFilesSelected}
          className="hidden"
          aria-label="Select multiple image files"
        />

        {/* Body */}
        <div className="overflow-y-auto p-6 flex-1">
          {stagedItems.length === 0 ? (
            <div className="border border-dashed border-[#2C3B52] bg-[#090D14] p-10 text-center space-y-4">
              <Upload className="mx-auto h-9 w-9 text-[#2DD4BF]" />
              <div className="space-y-1">
                <h3 className="font-display text-base font-semibold text-[#F3F4F6]">
                  Upload Single or Multiple Photos &amp; Screenshots
                </h3>
                <p className="text-xs text-[#9CA3AF] max-w-lg mx-auto leading-relaxed">
                  Select multiple images from your device at once. Tag any
                  characters and locations featured in each screenshot so they
                  automatically appear on those entry pages and on the main
                  Community Hub.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 bg-[#2DD4BF] px-5 py-2.5 text-xs font-semibold text-[#090D14] hover:bg-[#5EEAD4] transition-colors whitespace-nowrap shrink-0"
                >
                  <Upload className="h-4 w-4" />
                  <span>Select Image Files (Multiple Supported)</span>
                </button>
                <button
                  type="button"
                  onClick={handleAddSampleScreenshot}
                  className="inline-flex items-center gap-2 border border-[#2C3B52] bg-[#162030] px-4 py-2.5 text-xs font-medium text-[#E5E7EB] hover:border-[#2DD4BF] transition-colors whitespace-nowrap shrink-0"
                >
                  <Sparkles className="h-4 w-4 text-[#2DD4BF]" />
                  <span>Generate Sample City Snapshot</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left: Staged Multi-Image Queue + Preview */}
              <div className="lg:col-span-7 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-[#E5E7EB]">
                    Staged Photos ({stagedItems.length})
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 border border-[#2C3B52] bg-[#162030] px-3 py-1.5 text-xs font-medium text-[#F3F4F6] hover:border-[#2DD4BF] transition-colors whitespace-nowrap shrink-0"
                    >
                      <Plus className="h-3.5 w-3.5 text-[#2DD4BF]" />
                      <span>Add More Files</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleAddSampleScreenshot}
                      className="inline-flex items-center gap-1.5 border border-[#2C3B52] bg-[#162030] px-3 py-1.5 text-xs font-medium text-[#D1D5DB] hover:border-[#2DD4BF] transition-colors whitespace-nowrap shrink-0"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-[#2DD4BF]" />
                      <span>Add Sample Shot</span>
                    </button>
                  </div>
                </div>

                {/* Thumbnail Strip for Multi-Upload */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2">
                  {stagedItems.map((item, idx) => (
                    <button
                      key={item.tempId}
                      type="button"
                      onClick={() => setActiveIndex(idx)}
                      className={`relative h-16 w-24 shrink-0 border overflow-hidden transition-colors ${
                        idx === activeIndex
                          ? 'border-[#2DD4BF] ring-1 ring-[#2DD4BF]'
                          : 'border-[#233044] opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={item.imageDataUrl}
                        alt={item.caption || `Staged ${idx + 1}`}
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover"
                      />
                    </button>
                  ))}
                </div>

                {/* Active Image Preview */}
                {currentItem && (
                  <div className="border border-[#233044] bg-[#090D14] p-3 space-y-3">
                    <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#0D131F] border border-[#233044]">
                      <img
                        src={currentItem.imageDataUrl}
                        alt={currentItem.caption}
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-contain"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setCropperTargetIndex(activeIndex)}
                        className="inline-flex items-center gap-1.5 border border-[#2C3B52] bg-[#162030] px-3 py-1.5 text-xs font-medium text-[#E5E7EB] hover:border-[#2DD4BF] transition-colors whitespace-nowrap shrink-0"
                      >
                        <Crop className="h-3.5 w-3.5 text-[#2DD4BF]" />
                        <span>Move, Resize &amp; Crop This Image</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRemoveStaged(currentItem.tempId)}
                        className="inline-flex items-center gap-1.5 border border-[#2C3B52] bg-[#162030] px-3 py-1.5 text-xs font-medium text-[#EF4444] hover:bg-[#EF4444]/15 transition-colors whitespace-nowrap shrink-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Right: Caption & Character / Location Tagging */}
              {currentItem && (
                <div className="lg:col-span-5 space-y-5 border border-[#233044] bg-[#090D14] p-5">
                  <div>
                    <label
                      htmlFor="staged-photo-caption"
                      className="block text-xs font-semibold text-[#E5E7EB] mb-1.5"
                    >
                      Photo / Screenshot Caption
                    </label>
                    <input
                      id="staged-photo-caption"
                      type="text"
                      value={currentItem.caption}
                      onChange={(e) =>
                        handleUpdateCurrentItem({ caption: e.target.value })
                      }
                      placeholder="Describe the moment or screenshot..."
                      className="w-full border border-[#2C3B52] bg-[#111722] px-3 py-2 text-xs text-[#F3F4F6] focus:border-[#2DD4BF] focus:outline-none"
                    />
                  </div>

                  {/* Tag Characters */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-[#E5E7EB] flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-[#2DD4BF]" />
                        <span>Tag Characters in Photo</span>
                      </span>
                      <span className="text-[11px] font-mono-tabular text-[#9CA3AF]">
                        {currentItem.taggedCharacterIds.length} tagged
                      </span>
                    </div>
                    {characters.length === 0 ? (
                      <p className="text-xs text-[#6B7280] border border-[#1E232D] bg-[#111722] p-3">
                        No characters registered yet.
                      </p>
                    ) : (
                      <div className="max-h-36 overflow-y-auto border border-[#233044] bg-[#111722] divide-y divide-[#1A1E26]">
                        {characters.map((char) => {
                          const isChecked =
                            currentItem.taggedCharacterIds.includes(char.id);
                          return (
                            <button
                              key={char.id}
                              type="button"
                              onClick={() => handleToggleCharacterTag(char.id)}
                              className="w-full flex items-center justify-between px-3 py-2 text-xs text-left hover:bg-[#181C24] transition-colors"
                            >
                              <span
                                className={
                                  isChecked
                                    ? 'font-semibold text-[#2DD4BF]'
                                    : 'text-[#D1D5DB]'
                                }
                              >
                                {char.name}
                              </span>
                              {isChecked && (
                                <Check className="h-3.5 w-3.5 text-[#2DD4BF]" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Tag Locations */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-[#E5E7EB] flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-[#2DD4BF]" />
                        <span>Tag Locations in Photo</span>
                      </span>
                      <span className="text-[11px] font-mono-tabular text-[#9CA3AF]">
                        {currentItem.taggedLocationIds.length} tagged
                      </span>
                    </div>
                    {locations.length === 0 ? (
                      <p className="text-xs text-[#6B7280] border border-[#1E232D] bg-[#111722] p-3">
                        No locations registered yet.
                      </p>
                    ) : (
                      <div className="max-h-36 overflow-y-auto border border-[#233044] bg-[#111722] divide-y divide-[#1A1E26]">
                        {locations.map((loc) => {
                          const isChecked =
                            currentItem.taggedLocationIds.includes(loc.id);
                          return (
                            <button
                              key={loc.id}
                              type="button"
                              onClick={() => handleToggleLocationTag(loc.id)}
                              className="w-full flex items-center justify-between px-3 py-2 text-xs text-left hover:bg-[#181C24] transition-colors"
                            >
                              <span
                                className={
                                  isChecked
                                    ? 'font-semibold text-[#2DD4BF]'
                                    : 'text-[#D1D5DB]'
                                }
                              >
                                {loc.name}
                              </span>
                              {isChecked && (
                                <Check className="h-3.5 w-3.5 text-[#2DD4BF]" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[#233044] px-6 py-4 shrink-0">
          <span className="text-xs text-[#9CA3AF]">
            Tagged photos automatically appear on each tagged character and
            location profile as well as the main Community Hub.
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="border border-[#2C3B52] bg-[#162030] px-4 py-2 text-xs font-medium text-[#D1D5DB] hover:bg-[#1F2430] transition-colors whitespace-nowrap shrink-0"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={stagedItems.length === 0}
              onClick={handleSaveAll}
              className="bg-[#2DD4BF] px-5 py-2 text-xs font-semibold text-[#090D14] hover:bg-[#5EEAD4] disabled:opacity-40 disabled:pointer-events-none transition-colors whitespace-nowrap shrink-0"
            >
              Publish {stagedItems.length > 0 ? `${stagedItems.length} ` : ''}
              Photo{stagedItems.length === 1 ? '' : 's'}
            </button>
          </div>
        </div>
      </div>

      {cropTarget && cropperTargetIndex !== null && (
        <ImageCropperModal
          isOpen={true}
          initialRawImage={cropTarget.rawImageDataUrl}
          initialConfig={cropTarget.cropConfig}
          defaultAspect="16:9"
          entityName={cropTarget.caption}
          onApply={(cropped, raw, cfg) => {
            setStagedItems((prev) =>
              prev.map((item, idx) =>
                idx === cropperTargetIndex
                  ? {
                      ...item,
                      imageDataUrl: cropped,
                      rawImageDataUrl: raw,
                      cropConfig: cfg,
                    }
                  : item
              )
            );
            setCropperTargetIndex(null);
          }}
          onClose={() => setCropperTargetIndex(null)}
        />
      )}
    </div>
  );
};

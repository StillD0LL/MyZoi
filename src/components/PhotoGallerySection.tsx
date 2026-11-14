import React, { useMemo, useState } from 'react';
import {
  CharacterEntry,
  GalleryPhoto,
  LocationEntry,
} from '../types/codex';
import { getPhotosForEntity } from '../utils/codexLogic';
import {
  Camera,
  Check,
  Images,
  MapPin,
  Plus,
  Trash2,
  User,
  X,
} from 'lucide-react';

interface PhotoGallerySectionProps {
  entityType: 'character' | 'location';
  entityId: string;
  entityName: string;
  photos: GalleryPhoto[];
  characters: CharacterEntry[];
  locations: LocationEntry[];
  onOpenUploadModal: () => void;
  onUpdatePhoto?: (photo: GalleryPhoto) => void;
  onDeletePhotoRequest?: (photo: GalleryPhoto) => void;
  onNavigate: (type: 'character' | 'location', id: string) => void;
}

export const PhotoGallerySection: React.FC<PhotoGallerySectionProps> = ({
  entityType,
  entityId,
  entityName,
  photos,
  characters,
  locations,
  onOpenUploadModal,
  onUpdatePhoto,
  onDeletePhotoRequest,
  onNavigate,
}) => {
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  const [isEditingTags, setIsEditingTags] = useState(false);

  const entityPhotos = useMemo(
    () => getPhotosForEntity(entityType, entityId, photos),
    [entityType, entityId, photos]
  );

  const activeLightboxPhoto = useMemo(
    () => photos.find((p) => p.id === selectedPhotoId) || null,
    [photos, selectedPhotoId]
  );

  const resolveCharacterName = (id: string) =>
    characters.find((c) => c.id === id)?.name;
  const resolveLocationName = (id: string) =>
    locations.find((l) => l.id === id)?.name;

  return (
    <section className="mt-10 border-t border-[#233044] pt-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Images className="h-4 w-4 text-[#2DD4BF]" />
          <h3 className="font-display text-base font-semibold text-[#F3F4F6]">
            Photo &amp; Screenshot Gallery ({entityPhotos.length})
          </h3>
        </div>

        <button
          type="button"
          onClick={onOpenUploadModal}
          className="inline-flex items-center gap-1.5 border border-[#2DD4BF] bg-[#2DD4BF]/15 px-3.5 py-1.5 text-xs font-semibold text-[#F3F4F6] hover:bg-[#2DD4BF] hover:text-[#090D14] transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add Photos / Screenshots</span>
        </button>
      </div>

      {entityPhotos.length === 0 ? (
        <div className="border border-dashed border-[#233044] bg-[#111722] p-6 text-center">
          <Camera className="mx-auto h-6 w-6 text-[#2DD4BF]/70 mb-2" />
          <p className="text-xs text-[#9CA3AF]">
            No photos or screenshots tagged with{' '}
            <strong className="text-[#E5E7EB]">{entityName}</strong> yet. Upload
            multiple images or tag {entityName} in any screenshot to display
            them here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {entityPhotos.map((photo) => {
            const taggedChars = photo.taggedCharacterIds
              .map((id) => ({ id, name: resolveCharacterName(id) }))
              .filter((c): c is { id: string; name: string } => Boolean(c.name));
            const taggedLocs = photo.taggedLocationIds
              .map((id) => ({ id, name: resolveLocationName(id) }))
              .filter((l): l is { id: string; name: string } => Boolean(l.name));

            return (
              <div
                key={photo.id}
                className="group border border-[#233044] bg-[#111722] flex flex-col justify-between overflow-hidden hover:border-[#2DD4BF] transition-colors"
              >
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPhotoId(photo.id);
                    setIsEditingTags(false);
                  }}
                  className="relative aspect-[16/10] w-full overflow-hidden bg-[#090D14] border-b border-[#233044] text-left cursor-pointer"
                >
                  <img
                    src={photo.imageDataUrl}
                    alt={photo.caption || `${entityName} gallery photo`}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
                  />
                </button>

                <div className="p-3 space-y-1.5">
                  <div className="text-xs font-medium text-[#F3F4F6] truncate">
                    {photo.caption || 'Snapshot'}
                  </div>

                  {/* Clean inline metadata showing tagged characters & locations */}
                  {(taggedChars.length > 0 || taggedLocs.length > 0) && (
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-[#9CA3AF]">
                      {taggedChars.map((tc, idx) => (
                        <React.Fragment key={tc.id}>
                          {idx > 0 && <span aria-hidden="true">·</span>}
                          <button
                            type="button"
                            onClick={() => onNavigate('character', tc.id)}
                            className="hover:text-[#2DD4BF] underline decoration-[#2DD4BF]/40 underline-offset-2 transition-colors"
                          >
                            {tc.name}
                          </button>
                        </React.Fragment>
                      ))}
                      {taggedChars.length > 0 && taggedLocs.length > 0 && (
                        <span aria-hidden="true">·</span>
                      )}
                      {taggedLocs.map((tl, idx) => (
                        <React.Fragment key={tl.id}>
                          {idx > 0 && <span aria-hidden="true">·</span>}
                          <button
                            type="button"
                            onClick={() => onNavigate('location', tl.id)}
                            className="hover:text-[#2DD4BF] underline decoration-[#2DD4BF]/40 underline-offset-2 transition-colors"
                          >
                            {tl.name}
                          </button>
                        </React.Fragment>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox Modal */}
      {activeLightboxPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Photo Lightbox Viewer"
        >
          <div className="w-full max-w-4xl border border-[#2C3B52] bg-[#111722] shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#233044] px-5 py-3.5">
              <div className="font-display text-sm font-semibold text-[#F3F4F6] truncate">
                {activeLightboxPhoto.caption || 'Snapshot'}
              </div>
              <div className="flex items-center gap-2">
                {onUpdatePhoto && (
                  <button
                    type="button"
                    onClick={() => setIsEditingTags((prev) => !prev)}
                    className="border border-[#2C3B52] bg-[#162030] px-3 py-1 text-xs font-medium text-[#D1D5DB] hover:border-[#2DD4BF] transition-colors whitespace-nowrap shrink-0"
                  >
                    {isEditingTags ? 'Done Tagging' : 'Edit Tags & Caption'}
                  </button>
                )}
                {onDeletePhotoRequest && (
                  <button
                    type="button"
                    onClick={() => {
                      const target = activeLightboxPhoto;
                      setSelectedPhotoId(null);
                      onDeletePhotoRequest(target);
                    }}
                    aria-label="Delete photo"
                    className="border border-[#2C3B52] bg-[#162030] p-1.5 text-[#EF4444] hover:bg-[#EF4444]/15 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedPhotoId(null)}
                  aria-label="Close photo viewer"
                  className="p-1.5 text-[#9CA3AF] hover:text-white transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12">
              <div
                className={`${
                  isEditingTags ? 'lg:col-span-8' : 'lg:col-span-12'
                } bg-[#090D14] flex items-center justify-center p-4 max-h-[70vh]`}
              >
                <img
                  src={activeLightboxPhoto.imageDataUrl}
                  alt={activeLightboxPhoto.caption}
                  referrerPolicy="no-referrer"
                  className="max-h-[64vh] max-w-full object-contain border border-[#233044]"
                />
              </div>

              {isEditingTags && onUpdatePhoto && (
                <div className="lg:col-span-4 border-t lg:border-t-0 lg:border-l border-[#233044] p-4 space-y-4 max-h-[70vh] overflow-y-auto">
                  <div>
                    <label className="block text-xs font-semibold text-[#E5E7EB] mb-1">
                      Caption
                    </label>
                    <input
                      type="text"
                      value={activeLightboxPhoto.caption}
                      onChange={(e) =>
                        onUpdatePhoto({
                          ...activeLightboxPhoto,
                          caption: e.target.value,
                        })
                      }
                      className="w-full border border-[#2C3B52] bg-[#090D14] px-2.5 py-1.5 text-xs text-[#F3F4F6]"
                    />
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-[#E5E7EB] mb-1.5 flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-[#2DD4BF]" />
                      <span>Tagged Characters</span>
                    </div>
                    <div className="max-h-36 overflow-y-auto border border-[#233044] bg-[#090D14] divide-y divide-[#1A1E26]">
                      {characters.map((c) => {
                        const tagged =
                          activeLightboxPhoto.taggedCharacterIds.includes(c.id);
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              const nextIds = tagged
                                ? activeLightboxPhoto.taggedCharacterIds.filter(
                                    (id) => id !== c.id
                                  )
                                : [
                                    ...activeLightboxPhoto.taggedCharacterIds,
                                    c.id,
                                  ];
                              onUpdatePhoto({
                                ...activeLightboxPhoto,
                                taggedCharacterIds: nextIds,
                              });
                            }}
                            className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs text-left hover:bg-[#162030]"
                          >
                            <span
                              className={
                                tagged
                                  ? 'text-[#2DD4BF] font-semibold'
                                  : 'text-[#D1D5DB]'
                              }
                            >
                              {c.name}
                            </span>
                            {tagged && (
                              <Check className="h-3.5 w-3.5 text-[#2DD4BF]" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-[#E5E7EB] mb-1.5 flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-[#2DD4BF]" />
                      <span>Tagged Locations</span>
                    </div>
                    <div className="max-h-36 overflow-y-auto border border-[#233044] bg-[#090D14] divide-y divide-[#1A1E26]">
                      {locations.map((l) => {
                        const tagged =
                          activeLightboxPhoto.taggedLocationIds.includes(l.id);
                        return (
                          <button
                            key={l.id}
                            type="button"
                            onClick={() => {
                              const nextIds = tagged
                                ? activeLightboxPhoto.taggedLocationIds.filter(
                                    (id) => id !== l.id
                                  )
                                : [
                                    ...activeLightboxPhoto.taggedLocationIds,
                                    l.id,
                                  ];
                              onUpdatePhoto({
                                ...activeLightboxPhoto,
                                taggedLocationIds: nextIds,
                              });
                            }}
                            className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs text-left hover:bg-[#162030]"
                          >
                            <span
                              className={
                                tagged
                                  ? 'text-[#2DD4BF] font-semibold'
                                  : 'text-[#D1D5DB]'
                              }
                            >
                              {l.name}
                            </span>
                            {tagged && (
                              <Check className="h-3.5 w-3.5 text-[#2DD4BF]" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-[#233044] bg-[#0E1116] px-5 py-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[#9CA3AF]">
              <div className="flex flex-wrap items-center gap-2">
                <span>Featured in photo:</span>
                {activeLightboxPhoto.taggedCharacterIds.map((id) => {
                  const name = resolveCharacterName(id);
                  if (!name) return null;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        setSelectedPhotoId(null);
                        onNavigate('character', id);
                      }}
                      className="text-[#2DD4BF] hover:underline font-medium"
                    >
                      {name}
                    </button>
                  );
                })}
                {activeLightboxPhoto.taggedLocationIds.map((id) => {
                  const name = resolveLocationName(id);
                  if (!name) return null;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        setSelectedPhotoId(null);
                        onNavigate('location', id);
                      }}
                      className="text-[#2DD4BF] hover:underline font-medium"
                    >
                      {name}
                    </button>
                  );
                })}
              </div>
              <span className="font-mono-tabular">
                {activeLightboxPhoto.createdAt.slice(0, 10)}
              </span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

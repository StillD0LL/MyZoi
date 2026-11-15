import React, { useMemo, useState } from 'react';
import {
  CharacterEntry,
  LOCATION_CATEGORIES,
  LocationCategoryType,
  LocationEntry,
  LocationSortOption,
} from '../types/codex';
import {
  findBacklinksForEntity,
  sortLocationsForDirectory,
} from '../utils/codexLogic';
import {
  ArrowUpDown,
  Building2,
  Home,
  Landmark,
  MapPin,
  Plus,
  Search,
} from 'lucide-react';

interface LocationDirectoryViewProps {
  locations: LocationEntry[];
  characters: CharacterEntry[];
  gridColumns: 3 | 4;
  onSelectLocation: (id: string) => void;
  onCreateLocation: () => void;
}

const LOCATION_SORT_OPTIONS: Array<{
  value: LocationSortOption;
  label: string;
}> = [
  { value: 'recent', label: 'Sort: Recently Updated' },
  { value: 'created_desc', label: 'Sort: Newest Added' },
  { value: 'name_asc', label: 'Sort: Name (A → Z)' },
  { value: 'name_desc', label: 'Sort: Name (Z → A)' },
  { value: 'category_asc', label: 'Sort: Lot Type' },
  { value: 'region_asc', label: 'Sort: Region / District' },
];

export function getLocationCategoryIcon(category: LocationCategoryType) {
  switch (category) {
    case 'City':
      return Landmark;
    case 'Residential lot':
      return Home;
    case 'Business lot':
      return Building2;
    case 'Community lot':
    default:
      return MapPin;
  }
}

export const LocationDirectoryView: React.FC<LocationDirectoryViewProps> = ({
  locations,
  characters,
  gridColumns,
  onSelectLocation,
  onCreateLocation,
}) => {
  const [filterQuery, setFilterQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<
    'all' | LocationCategoryType
  >('all');
  const [sortBy, setSortBy] = useState<LocationSortOption>('recent');

  const sortedAndFilteredLocations = useMemo(() => {
    const q = filterQuery.trim().toLowerCase();
    const filtered = locations.filter((l) => {
      if (activeCategory !== 'all' && l.category !== activeCategory) {
        return false;
      }
      if (!q) return true;
      return (
        l.name.toLowerCase().includes(q) ||
        l.subtitle.toLowerCase().includes(q) ||
        l.category.toLowerCase().includes(q) ||
        l.region.toLowerCase().includes(q) ||
        l.rulerOrFaction.toLowerCase().includes(q)
      );
    });
    return sortLocationsForDirectory(filtered, sortBy);
  }, [locations, filterQuery, activeCategory, sortBy]);

  if (locations.length === 0) {
    return (
      <div className="inzoi-glass-panel p-10 text-center max-w-3xl mx-auto my-6 space-y-4">
        <MapPin className="mx-auto h-8 w-8 text-[#2DD4BF]" />
        <div className="text-xs font-semibold text-[#2DD4BF] uppercase tracking-wider">
          inZOI Wiki Portal · World &amp; Lot Atlas
        </div>
        <h1 className="font-display text-2xl font-bold text-white">
          No Locations or Lots Documented Yet
        </h1>
        <p className="text-sm text-[#94A3B8] max-w-xl mx-auto leading-relaxed">
          Charter dedicated page profiles for your world&apos;s{' '}
          <strong className="text-white">City</strong> hubs,{' '}
          <strong className="text-white">Residential lots</strong>,{' '}
          <strong className="text-white">Community lots</strong>, and{' '}
          <strong className="text-white">Business lots</strong>. Characters and
          locations can be hyperlinked bidirectionally using{' '}
          <code className="font-mono-tabular text-[#38BDF8]">
            [[Location Name]]
          </code>
          .
        </p>
        <div className="pt-2">
          <button
            type="button"
            onClick={onCreateLocation}
            className="inline-flex items-center gap-2 bg-[#2DD4BF] px-5 py-2.5 text-xs font-semibold text-[#050608] hover:bg-[#5EEAD4] transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>Create First Location</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Sort Bar */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-white/[0.11] pb-5">
        <div>
          <div className="text-xs font-semibold text-[#2DD4BF] uppercase tracking-wider mb-1">
            World &amp; City Lots · {locations.length}{' '}
            {locations.length === 1 ? 'Location' : 'Locations'}
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Locations &amp; Lot Directory
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Sorting Dropdown (Locations without uploaded images automatically move to bottom) */}
          <div className="relative flex items-center">
            <ArrowUpDown className="h-3.5 w-3.5 text-[#2DD4BF] absolute left-3 pointer-events-none" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as LocationSortOption)}
              aria-label="Sort Location entries"
              className="border border-white/[0.14] bg-black/75 backdrop-blur-md pl-8 pr-3 py-1.5 text-xs text-white focus:border-[#2DD4BF] focus:outline-none"
            >
              {LOCATION_SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="relative">
            <Search className="h-3.5 w-3.5 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Filter locations & lots..."
              aria-label="Filter locations"
              className="border border-white/[0.14] bg-black/65 backdrop-blur-md pl-8 pr-3 py-1.5 text-xs text-white placeholder-[#64748B] focus:border-[#2DD4BF] focus:outline-none w-48 sm:w-56"
            />
          </div>

          <button
            type="button"
            onClick={onCreateLocation}
            className="inline-flex items-center gap-1.5 bg-[#2DD4BF] px-4 py-1.5 text-xs font-semibold text-[#050608] hover:bg-[#5EEAD4] transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Location</span>
          </button>
        </div>
      </div>

      {/* Location Category Filter Tabs (City, Residential lot, Community lot, Business lot) */}
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => setActiveCategory('all')}
          className={`px-3 py-1.5 text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
            activeCategory === 'all'
              ? 'border-[#2DD4BF] bg-[#2DD4BF] text-[#050608] font-semibold'
              : 'border-white/[0.12] bg-black/60 backdrop-blur-md text-[#94A3B8] hover:text-white'
          }`}
        >
          All Locations ({locations.length})
        </button>
        {LOCATION_CATEGORIES.map((cat) => {
          const count = locations.filter((l) => l.category === cat).length;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
                activeCategory === cat
                  ? 'border-[#2DD4BF] bg-[#2DD4BF] text-[#050608] font-semibold'
                  : 'border-white/[0.12] bg-black/60 backdrop-blur-md text-[#94A3B8] hover:text-white'
              }`}
            >
              {cat} ({count})
            </button>
          );
        })}
      </div>

      {/* Locations Grid */}
      <div
        className={`grid grid-cols-1 sm:grid-cols-2 ${
          gridColumns === 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3'
        } gap-6`}
      >
        {sortedAndFilteredLocations.map((loc) => {
          const backlinkCount = findBacklinksForEntity(
            loc.id,
            loc.name,
            characters,
            locations
          ).length;
          const CategoryIcon = getLocationCategoryIcon(loc.category);

          return (
            <button
              key={loc.id}
              type="button"
              onClick={() => onSelectLocation(loc.id)}
              className="group flex flex-col inzoi-glass-card text-left hover:border-[#2DD4BF] transition-all overflow-hidden"
            >
              <div className="relative aspect-[16/9] w-full overflow-hidden bg-black/80 border-b border-white/[0.10]">
                {loc.imageDataUrl ? (
                  <img
                    src={loc.imageDataUrl}
                    alt={`${loc.name} cover`}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center bg-black/70 p-6">
                    <CategoryIcon className="h-7 w-7 text-[#2DD4BF]/60" />
                    <span className="mt-1.5 text-[10px] font-mono-tabular text-[#64748B]">
                      No Cover Image Uploaded
                    </span>
                  </div>
                )}

                <div className="bg-gradient-to-t from-black/95 via-black/45 to-transparent absolute inset-x-0 bottom-0 p-4">
                  <h2 className="font-display text-lg font-bold text-white group-hover:text-[#2DD4BF] transition-colors truncate">
                    {loc.name}
                  </h2>
                  {loc.subtitle && (
                    <p className="font-editorial text-sm italic text-[#CBD5E1] truncate">
                      {loc.subtitle}
                    </p>
                  )}
                </div>
              </div>

              <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                <div className="flex flex-wrap items-center gap-1.5 text-xs text-[#94A3B8]">
                  <span className="font-semibold text-[#2DD4BF]">
                    {loc.category}
                  </span>
                  {loc.region && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>{loc.region}</span>
                    </>
                  )}
                  {loc.climate && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>{loc.climate}</span>
                    </>
                  )}
                </div>

                {loc.summary && (
                  <p className="text-xs text-[#CBD5E1] line-clamp-2 leading-relaxed">
                    {loc.summary}
                  </p>
                )}

                <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between text-[11px] text-[#64748B] font-mono-tabular">
                  <span>{backlinkCount} Linked Entries</span>
                  <span>
                    {loc.backgroundDataUrl ? 'Custom Bg · ' : ''}
                    {loc.sections.length} Sections
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

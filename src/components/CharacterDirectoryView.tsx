import React, { useMemo, useState } from 'react';
import { CharacterEntry, CharacterSortOption } from '../types/codex';
import {
  getFollowersForZoi,
  sortCharactersForDirectory,
} from '../utils/codexLogic';
import { GoogleSignInButton } from './GoogleSignInButton';
import {
  ArrowUpDown,
  Cloud,
  Crop,
  Link2,
  MessageCircle,
  Plus,
  Search,
  User,
  Users,
} from 'lucide-react';

interface CharacterDirectoryViewProps {
  characters: CharacterEntry[];
  gridColumns: 3 | 4;
  isAuthenticated: boolean;
  rememberedEmail?: string | null;
  onSelectCharacter: (id: string) => void;
  onCreateCharacter: () => void;
  onGoogleLogin: () => void;
}

const CHARACTER_SORT_OPTIONS: Array<{
  value: CharacterSortOption;
  label: string;
}> = [
  { value: 'recent', label: 'Sort: Recently Updated' },
  { value: 'created_desc', label: 'Sort: Newest Added' },
  { value: 'name_asc', label: 'Sort: Name (A → Z)' },
  { value: 'name_desc', label: 'Sort: Name (Z → A)' },
  { value: 'age_asc', label: 'Sort: Age Stage' },
  { value: 'affiliation_asc', label: 'Sort: Affiliation / Household' },
  { value: 'followers_desc', label: 'Sort: Most Followers' },
];

export const CharacterDirectoryView: React.FC<CharacterDirectoryViewProps> = ({
  characters,
  gridColumns,
  isAuthenticated,
  rememberedEmail,
  onSelectCharacter,
  onCreateCharacter,
  onGoogleLogin,
}) => {
  const [filterQuery, setFilterQuery] = useState('');
  const [activeAffiliation, setActiveAffiliation] = useState<string>('all');
  const [sortBy, setSortBy] = useState<CharacterSortOption>('recent');

  const affiliations = useMemo(() => {
    const set = new Set<string>();
    characters.forEach((c) => {
      if (c.affiliation && c.affiliation.trim()) {
        set.add(c.affiliation.trim());
      }
    });
    return Array.from(set).sort();
  }, [characters]);

  const sortedAndFilteredCharacters = useMemo(() => {
    const q = filterQuery.trim().toLowerCase();
    const filtered = characters.filter((c) => {
      if (
        activeAffiliation !== 'all' &&
        c.affiliation.trim() !== activeAffiliation
      ) {
        return false;
      }
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        c.role.toLowerCase().includes(q) ||
        (c.occupation || '').toLowerCase().includes(q) ||
        (c.gender || c.species || '').toLowerCase().includes(q) ||
        c.affiliation.toLowerCase().includes(q)
      );
    });
    return sortCharactersForDirectory(filtered, sortBy);
  }, [characters, filterQuery, activeAffiliation, sortBy]);

  if (characters.length === 0) {
    return (
      <div className="space-y-8 py-4">
        {/* Fresh Start Hero Split — Sleek Black Frosted Glass */}
        <div className="grid grid-cols-1 lg:grid-cols-12 inzoi-glass-panel items-stretch">
          <div className="lg:col-span-7 p-8 sm:p-10 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-white/[0.10]">
            <div className="space-y-4">
              <div className="text-xs font-semibold text-[#2DD4BF] uppercase tracking-wider">
                inZOI Wiki Portal · The Zoi Resident Directory
              </div>
              <h1
                className="font-display text-3xl sm:text-4xl font-bold text-white tracking-tight"
                style={{ textWrap: 'balance' }}
              >
                Your Zoi Roster is Ready for Its First Entry
              </h1>
              <p className="text-sm sm:text-base text-[#94A3B8] leading-relaxed max-w-[62ch]">
                Document original Zois and locations from a clean slate. Upload
                and crop full portraits, build Encyclopedia Dossier profiles,
                explore each Zoi&apos;s X-inspired social media feed, and
                interlink your world with automatic Google Drive synchronization.
              </p>
            </div>

            <div className="mt-8 pt-6 border-t border-white/[0.10] flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={onCreateCharacter}
                className="inline-flex items-center gap-2 bg-[#2DD4BF] px-5 py-2.5 text-xs font-semibold text-[#050608] hover:bg-[#5EEAD4] transition-colors whitespace-nowrap shrink-0"
              >
                <Plus className="h-4 w-4" />
                <span>Create First Zoi</span>
              </button>

              {!isAuthenticated && (
                <GoogleSignInButton
                  onClick={onGoogleLogin}
                  label={
                    rememberedEmail
                      ? `Resume Drive (${rememberedEmail})`
                      : 'Sign in with Google Drive'
                  }
                />
              )}
            </div>
          </div>

          {/* Right Column: Architectural Capabilities Summary */}
          <div className="lg:col-span-5 bg-black/50 p-8 flex flex-col justify-between space-y-6">
            <div className="space-y-5">
              <div className="flex items-start gap-3.5">
                <Crop className="h-4 w-4 text-[#2DD4BF] mt-0.5 shrink-0" />
                <div>
                  <h2 className="font-display text-sm font-semibold text-white">
                    01. Interactive Portrait Framing Studio
                  </h2>
                  <p className="mt-1 text-xs text-[#94A3B8] leading-relaxed">
                    Move, pan, resize, and crop local portraits to exact aspect
                    ratios for selection cards and Zoi dossiers.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <MessageCircle className="h-4 w-4 text-[#2DD4BF] mt-0.5 shrink-0" />
                <div>
                  <h2 className="font-display text-sm font-semibold text-white">
                    02. Encyclopedia Dossier &amp; X Social Feed
                  </h2>
                  <p className="mt-1 text-xs text-[#94A3B8] leading-relaxed">
                    Every Zoi and Location features a Wikipedia-style
                    Encyclopedia Dossier plus an X-inspired social media page
                    with automatic comments, replies, and follower connections.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <Link2 className="h-4 w-4 text-[#2DD4BF] mt-0.5 shrink-0" />
                <div>
                  <h2 className="font-display text-sm font-semibold text-white">
                    03. Bidirectional Wiki Hyperlinking
                  </h2>
                  <p className="mt-1 text-xs text-[#94A3B8] leading-relaxed">
                    Cross-reference Zois, partners, and locations effortlessly
                    using{' '}
                    <code className="font-mono-tabular text-[#38BDF8]">
                      [[Entry Name]]
                    </code>{' '}
                    or automatic entity recognition.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <Cloud className="h-4 w-4 text-[#2DD4BF] mt-0.5 shrink-0" />
                <div>
                  <h2 className="font-display text-sm font-semibold text-white">
                    04. Automatic Google Drive Cloud Sync
                  </h2>
                  <p className="mt-1 text-xs text-[#94A3B8] leading-relaxed">
                    Every edit to your site is automatically saved and synced to
                    your Google Drive with persistent login support.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Directory Header, Sort Selector & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-white/[0.11] pb-5">
        <div>
          <div className="text-xs text-[#2DD4BF] font-semibold uppercase tracking-wider mb-1">
            The Zoi Directory · {characters.length}{' '}
            {characters.length === 1 ? 'Zoi Entry' : 'Zoi Entries'}
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Zoi Selection
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Sorting Dropdown (Entries without uploaded profile images automatically move to bottom) */}
          <div className="relative flex items-center">
            <ArrowUpDown className="h-3.5 w-3.5 text-[#2DD4BF] absolute left-3 pointer-events-none" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as CharacterSortOption)}
              aria-label="Sort Zoi entries"
              className="border border-white/[0.14] bg-black/75 backdrop-blur-md pl-8 pr-3 py-1.5 text-xs text-white focus:border-[#2DD4BF] focus:outline-none"
            >
              {CHARACTER_SORT_OPTIONS.map((opt) => (
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
              placeholder="Filter Zoi roster..."
              aria-label="Filter Zoi roster"
              className="border border-white/[0.14] bg-black/65 backdrop-blur-md pl-8 pr-3 py-1.5 text-xs text-white placeholder-[#64748B] focus:border-[#2DD4BF] focus:outline-none w-48 sm:w-56"
            />
          </div>

          <button
            type="button"
            onClick={onCreateCharacter}
            className="inline-flex items-center gap-1.5 bg-[#2DD4BF] px-4 py-1.5 text-xs font-semibold text-[#050608] hover:bg-[#5EEAD4] transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Zoi</span>
          </button>
        </div>
      </div>

      {/* Affiliation Segmented Filter if multiple affiliations exist */}
      {affiliations.length > 1 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveAffiliation('all')}
            className={`px-3 py-1 text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
              activeAffiliation === 'all'
                ? 'border-[#2DD4BF] bg-[#2DD4BF]/15 text-white'
                : 'border-white/[0.12] bg-black/60 text-[#94A3B8] hover:text-white'
            }`}
          >
            All Affiliations
          </button>
          {affiliations.map((aff) => (
            <button
              key={aff}
              type="button"
              onClick={() => setActiveAffiliation(aff)}
              className={`px-3 py-1 text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
                activeAffiliation === aff
                  ? 'border-[#2DD4BF] bg-[#2DD4BF]/15 text-white'
                  : 'border-white/[0.12] bg-black/60 text-[#94A3B8] hover:text-white'
              }`}
            >
              {aff}
            </button>
          ))}
        </div>
      )}

      {/* Portrait Selection Grid */}
      <div
        className={`grid grid-cols-1 sm:grid-cols-2 ${
          gridColumns === 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3'
        } gap-6`}
      >
        {sortedAndFilteredCharacters.map((char) => {
          const initials =
            char.name
              .split(/\s+/)
              .map((w) => w[0])
              .join('')
              .slice(0, 2)
              .toUpperCase() || 'Z';
          const followersCount = getFollowersForZoi(char.id, characters).length;
          const followingCount = (char.followingIds || []).length;

          return (
            <button
              key={char.id}
              type="button"
              onClick={() => onSelectCharacter(char.id)}
              className="group flex flex-col inzoi-glass-card text-left hover:border-[#2DD4BF] transition-all overflow-hidden"
            >
              {/* Full Portrait Container */}
              <div className="relative aspect-[3/4] w-full overflow-hidden bg-black/80 border-b border-white/[0.10]">
                {char.portraitDataUrl ? (
                  <img
                    src={char.portraitDataUrl}
                    alt={`${char.name} portrait`}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center bg-black/70 p-6">
                    <div className="flex h-16 w-16 items-center justify-center border border-[#2DD4BF]/40 bg-white/[0.04] font-display text-xl font-bold text-[#2DD4BF]">
                      {initials}
                    </div>
                    <User className="mt-3 h-4 w-4 text-[#475569]" />
                    <span className="mt-1.5 text-[10px] font-mono-tabular text-[#64748B]">
                      No Portrait Uploaded
                    </span>
                  </div>
                )}

                <div className="bg-gradient-to-t from-black/95 via-black/45 to-transparent absolute inset-x-0 bottom-0 p-4 pt-12">
                  <h2 className="font-display text-lg font-bold text-white group-hover:text-[#2DD4BF] transition-colors truncate">
                    {char.name}
                  </h2>
                  {char.title && (
                    <p className="font-editorial text-sm italic text-[#CBD5E1] truncate">
                      {char.title}
                    </p>
                  )}
                </div>
              </div>

              {/* Clean Unboxed Metadata Footer */}
              <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                <div className="flex flex-wrap items-center gap-1.5 text-xs text-[#94A3B8]">
                  <span>{char.occupation || char.role || 'Zoi'}</span>
                  {(char.gender || char.species) && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>{char.gender || char.species}</span>
                    </>
                  )}
                  {char.age && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>{char.age}</span>
                    </>
                  )}
                  {char.status && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="text-[#2DD4BF]">{char.status}</span>
                    </>
                  )}
                </div>

                {char.summary && (
                  <p className="text-xs text-[#CBD5E1] line-clamp-2 leading-relaxed">
                    {char.summary}
                  </p>
                )}

                <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between text-[11px] text-[#64748B] font-mono-tabular">
                  <span className="inline-flex items-center gap-1 text-[#94A3B8]">
                    <Users className="h-3 w-3 text-[#2DD4BF]" />
                    <span>
                      {followersCount} Followers · {followingCount} Following
                    </span>
                  </span>
                  <span>{char.sections.length} Sections</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CharacterEntry, LocationEntry } from '../types/codex';
import { searchCodexEntries } from '../utils/codexLogic';
import { ArrowRight, MapPin, Search, User, X } from 'lucide-react';

interface SearchCommandModalProps {
  isOpen: boolean;
  characters: CharacterEntry[];
  locations: LocationEntry[];
  onClose: () => void;
  onNavigate: (type: 'character' | 'location', id: string) => void;
}

export const SearchCommandModal: React.FC<SearchCommandModalProps> = ({
  isOpen,
  characters,
  locations,
  onClose,
  onNavigate,
}) => {
  const [query, setQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'character' | 'location'>(
    'all'
  );
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setTimeout(() => {
        inputRef.current?.focus();
      }, 20);
    }
  }, [isOpen]);

  const results = useMemo(
    () => searchCodexEntries(query, filterType, characters, locations),
    [query, filterType, characters, locations]
  );

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 backdrop-blur-md pt-16 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="search-modal-title"
    >
      <div className="w-full max-w-2xl inzoi-glass-panel shadow-2xl">
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 inzoi-glass-header px-4 py-3.5">
          <Search className="h-4 w-4 text-[#2DD4BF] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Zois, locations, attributes, quotes, or trivia..."
            aria-label="Search Zois and locations"
            id="search-modal-title"
            className="w-full bg-transparent text-sm text-white placeholder-[#64748B] focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close search"
            className="p-1 text-[#94A3B8] hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center justify-between border-b border-white/[0.10] bg-black/75 px-4 py-2">
          <div className="flex items-center gap-1.5">
            {(['all', 'character', 'location'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setFilterType(type)}
                className={`px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  filterType === type
                    ? 'bg-[#2DD4BF] text-[#050608] font-semibold'
                    : 'text-[#94A3B8] hover:text-white'
                }`}
              >
                {type === 'all'
                  ? `All Entries (${characters.length + locations.length})`
                  : type === 'character'
                    ? `Zois (${characters.length})`
                    : `Locations (${locations.length})`}
              </button>
            ))}
          </div>
          <span className="text-[11px] text-[#64748B] font-mono-tabular">
            {results.length} {results.length === 1 ? 'match' : 'matches'}
          </span>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto divide-y divide-white/[0.08]">
          {results.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-sm text-[#94A3B8]">
                {characters.length === 0 && locations.length === 0
                  ? 'Your archive is currently empty. Create a Zoi or location to search entries.'
                  : `No entries matched "${query}".`}
              </p>
            </div>
          ) : (
            results.map((item) => (
              <button
                key={`${item.type}-${item.id}`}
                type="button"
                onClick={() => {
                  onNavigate(item.type, item.id);
                  onClose();
                }}
                className="w-full flex items-center justify-between gap-4 px-4 py-3.5 text-left hover:bg-white/[0.05] transition-colors group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      referrerPolicy="no-referrer"
                      className="h-11 w-11 object-cover border border-white/[0.14] shrink-0"
                    />
                  ) : (
                    <div className="flex h-11 w-11 items-center justify-center border border-white/[0.14] bg-black/80 shrink-0">
                      {item.type === 'character' ? (
                        <User className="h-4 w-4 text-[#2DD4BF]" />
                      ) : (
                        <MapPin className="h-4 w-4 text-[#2DD4BF]" />
                      )}
                    </div>
                  )}

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-display text-sm font-semibold text-white group-hover:text-[#2DD4BF] truncate">
                        {item.name}
                      </span>
                      <span className="text-xs text-[#94A3B8] truncate">
                        · {item.subtitle}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-[#94A3B8] truncate">
                      <span className="text-[#2DD4BF] font-mono-tabular">
                        [{item.matchedField}]
                      </span>{' '}
                      {item.snippet}
                    </p>
                  </div>
                </div>

                <ArrowRight className="h-4 w-4 text-[#64748B] group-hover:text-[#2DD4BF] shrink-0" />
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

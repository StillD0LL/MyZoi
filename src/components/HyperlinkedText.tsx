import React, { useMemo } from 'react';
import { CharacterEntry, LocationEntry } from '../types/codex';
import { parseHyperlinkedSegments } from '../utils/codexLogic';
import { MapPin, User } from 'lucide-react';

interface HyperlinkedTextProps {
  text: string;
  characters: CharacterEntry[];
  locations: LocationEntry[];
  autoHyperlinkNames: boolean;
  showLinkPreviews?: boolean;
  excludeEntityId?: string;
  onNavigate: (type: 'character' | 'location', id: string) => void;
  className?: string;
}

export const HyperlinkedText: React.FC<HyperlinkedTextProps> = ({
  text,
  characters,
  locations,
  autoHyperlinkNames,
  showLinkPreviews = true,
  excludeEntityId,
  onNavigate,
  className = '',
}) => {
  const segments = useMemo(
    () =>
      parseHyperlinkedSegments(
        text,
        characters,
        locations,
        autoHyperlinkNames,
        excludeEntityId
      ),
    [text, characters, locations, autoHyperlinkNames, excludeEntityId]
  );

  if (!text) return null;

  return (
    <span className={className}>
      {segments.map((seg, idx) => {
        if (seg.type === 'link' && seg.targetId && seg.targetType) {
          const targetType = seg.targetType;
          const targetId = seg.targetId;
          const linkedChar =
            targetType === 'character'
              ? characters.find((c) => c.id === targetId)
              : undefined;
          const linkedLoc =
            targetType === 'location'
              ? locations.find((l) => l.id === targetId)
              : undefined;
          const previewSummary =
            linkedChar?.summary || linkedLoc?.summary || '';

          return (
            <span key={idx} className="relative inline-block group">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigate(targetType, targetId);
                }}
                className="inline items-center gap-1 text-[#2DD4BF] underline decoration-[#2DD4BF]/50 underline-offset-4 hover:text-[#F0C37B] hover:decoration-[#F0C37B] transition-colors font-medium cursor-pointer"
                title={`View ${targetType}: ${seg.targetName}`}
              >
                {seg.text}
              </button>

              {showLinkPreviews && (
                <span className="pointer-events-none invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-opacity duration-150 absolute bottom-full left-0 mb-2 z-40 w-64 border border-[#2C3B52] bg-[#111722] p-3 shadow-2xl text-left block">
                  <span className="flex items-center gap-2 border-b border-[#233044] pb-2">
                    {targetType === 'character' ? (
                      <User className="h-3.5 w-3.5 text-[#2DD4BF] shrink-0" />
                    ) : (
                      <MapPin className="h-3.5 w-3.5 text-[#2DD4BF] shrink-0" />
                    )}
                    <span className="font-display text-xs font-semibold text-[#F3F4F6] truncate">
                      {seg.targetName}
                    </span>
                  </span>
                  {seg.subtitle && (
                    <span className="mt-1.5 block text-[11px] text-[#9CA3AF] truncate">
                      {seg.subtitle}
                    </span>
                  )}
                  {previewSummary && (
                    <span className="mt-1.5 block text-xs text-[#D1D5DB] line-clamp-2 leading-relaxed">
                      {previewSummary}
                    </span>
                  )}
                </span>
              )}
            </span>
          );
        }
        return <React.Fragment key={idx}>{seg.text}</React.Fragment>;
      })}
    </span>
  );
};

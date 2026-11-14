import React from 'react';
import {
  CharacterEntry,
  LocationEntry,
  ProfileSection,
} from '../types/codex';
import { HyperlinkedText } from './HyperlinkedText';

interface SectionRendererProps {
  section: ProfileSection;
  index: number;
  characters: CharacterEntry[];
  locations: LocationEntry[];
  autoHyperlinkNames: boolean;
  showLinkPreviews: boolean;
  excludeEntityId?: string;
  variant?: 'default' | 'monograph' | 'tactical';
  onNavigate: (type: 'character' | 'location', id: string) => void;
}

export const SectionRenderer: React.FC<SectionRendererProps> = ({
  section,
  index,
  characters,
  locations,
  autoHyperlinkNames,
  showLinkPreviews,
  excludeEntityId,
  variant = 'default',
  onNavigate,
}) => {
  const chapterNumber = String(index + 1).padStart(2, '0');

  return (
    <section
      id={`section-${section.id}`}
      className="border-b border-[#233044] pb-8 last:border-b-0"
    >
      {/* Section Heading */}
      <div className="mb-4 flex items-baseline gap-3">
        {variant === 'monograph' && (
          <span className="font-mono-tabular text-xs font-medium text-[#2DD4BF]">
            {chapterNumber}.
          </span>
        )}
        <h3
          className={`${
            variant === 'monograph'
              ? 'font-editorial text-2xl font-semibold text-[#F3F4F6]'
              : 'font-display text-lg font-semibold text-[#F3F4F6] tracking-tight'
          }`}
        >
          {section.title || 'Untitled Section'}
        </h3>
      </div>

      {/* 1. Wikipedia-Style Quick Status Info Table */}
      {section.type === 'infobox' && (
        <div className="border border-[#233044] bg-[#111722]">
          <div className="divide-y divide-[#1E232D]">
            {(section.items || [])
              .filter((item) => item.label.trim() || item.value.trim())
              .map((item) => (
                <div
                  key={item.id}
                  className="grid grid-cols-1 sm:grid-cols-12 px-4 py-2.5 text-sm gap-2"
                >
                  <div className="sm:col-span-4 font-medium text-[#9CA3AF]">
                    {item.label}
                  </div>
                  <div className="sm:col-span-8 text-[#F3F4F6] font-mono-tabular">
                    <HyperlinkedText
                      text={item.value}
                      characters={characters}
                      locations={locations}
                      autoHyperlinkNames={autoHyperlinkNames}
                      showLinkPreviews={showLinkPreviews}
                      excludeEntityId={excludeEntityId}
                      onNavigate={onNavigate}
                    />
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* 2. Full Paragraph Section */}
      {section.type === 'paragraph' && (
        <div className="space-y-4 text-[15px] leading-relaxed text-[#D1D5DB] max-w-[72ch]">
          {(section.content || '')
            .split(/\n\n+/)
            .filter((p) => p.trim().length > 0)
            .map((para, pIdx) => (
              <p key={pIdx} className="whitespace-pre-line">
                <HyperlinkedText
                  text={para}
                  characters={characters}
                  locations={locations}
                  autoHyperlinkNames={autoHyperlinkNames}
                  showLinkPreviews={showLinkPreviews}
                  excludeEntityId={excludeEntityId}
                  onNavigate={onNavigate}
                />
              </p>
            ))}
        </div>
      )}

      {/* 3. Quote Section */}
      {section.type === 'quote' && (
        <figure className="border border-[#233044] bg-[#111722] p-6">
          <blockquote className="font-editorial text-xl italic leading-relaxed text-[#F3F4F6]">
            “
            <HyperlinkedText
              text={section.content || ''}
              characters={characters}
              locations={locations}
              autoHyperlinkNames={autoHyperlinkNames}
              showLinkPreviews={showLinkPreviews}
              excludeEntityId={excludeEntityId}
              onNavigate={onNavigate}
            />
            ”
          </blockquote>
          {section.attribution && (
            <figcaption className="mt-3 text-xs text-[#9CA3AF]">
              —{' '}
              <HyperlinkedText
                text={section.attribution}
                characters={characters}
                locations={locations}
                autoHyperlinkNames={autoHyperlinkNames}
                showLinkPreviews={showLinkPreviews}
                excludeEntityId={excludeEntityId}
                onNavigate={onNavigate}
              />
            </figcaption>
          )}
        </figure>
      )}

      {/* 4. Bullet Point Section */}
      {section.type === 'bullets' && (
        <ul className="space-y-3">
          {(section.bullets || [])
            .filter((b) => b.title.trim() || b.content.trim())
            .map((b) => (
              <li
                key={b.id}
                className="border border-[#233044] bg-[#111722] p-4"
              >
                {b.title && (
                  <div className="font-display text-sm font-semibold text-[#F3F4F6] mb-1">
                    <HyperlinkedText
                      text={b.title}
                      characters={characters}
                      locations={locations}
                      autoHyperlinkNames={autoHyperlinkNames}
                      showLinkPreviews={showLinkPreviews}
                      excludeEntityId={excludeEntityId}
                      onNavigate={onNavigate}
                    />
                  </div>
                )}
                {b.content && (
                  <div className="text-sm text-[#D1D5DB] leading-relaxed">
                    <HyperlinkedText
                      text={b.content}
                      characters={characters}
                      locations={locations}
                      autoHyperlinkNames={autoHyperlinkNames}
                      showLinkPreviews={showLinkPreviews}
                      excludeEntityId={excludeEntityId}
                      onNavigate={onNavigate}
                    />
                  </div>
                )}
              </li>
            ))}
        </ul>
      )}

      {/* 5. Trivia Section */}
      {section.type === 'trivia' && (
        <ol className="space-y-2.5">
          {(section.bullets || [])
            .filter((b) => b.title.trim() || b.content.trim())
            .map((b, bIdx) => (
              <li
                key={b.id}
                className="flex items-baseline gap-3 border-b border-[#1A1E26] pb-2.5 last:border-b-0 text-sm text-[#D1D5DB]"
              >
                <span className="font-mono-tabular text-xs text-[#2DD4BF] shrink-0">
                  {String(bIdx + 1).padStart(2, '0')}.
                </span>
                <div className="leading-relaxed">
                  {b.title && (
                    <strong className="font-semibold text-[#F3F4F6] mr-1.5">
                      {b.title}:
                    </strong>
                  )}
                  <HyperlinkedText
                    text={b.content}
                    characters={characters}
                    locations={locations}
                    autoHyperlinkNames={autoHyperlinkNames}
                    showLinkPreviews={showLinkPreviews}
                    excludeEntityId={excludeEntityId}
                    onNavigate={onNavigate}
                  />
                </div>
              </li>
            ))}
        </ol>
      )}
    </section>
  );
};

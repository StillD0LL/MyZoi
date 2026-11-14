import React, { useState } from 'react';
import {
  BulletItem,
  CharacterEntry,
  KeyValueItem,
  LocationEntry,
  ProfileSection,
  SectionType,
} from '../types/codex';
import { formatEntityLinkToken } from '../utils/codexLogic';
import {
  AlignLeft,
  ArrowDown,
  ArrowUp,
  HelpCircle,
  Link2,
  List,
  Plus,
  Quote,
  Table2,
  Trash2,
} from 'lucide-react';

interface SectionBuilderProps {
  sections: ProfileSection[];
  onChange: (sections: ProfileSection[]) => void;
  characters: CharacterEntry[];
  locations: LocationEntry[];
  currentEntityId?: string;
}

const SECTION_TYPE_META: Array<{
  type: SectionType;
  label: string;
  defaultTitle: string;
  icon: React.FC<{ className?: string }>;
}> = [
  {
    type: 'infobox',
    label: 'Quick Status Info (Wiki Table)',
    defaultTitle: 'Status & Classification',
    icon: Table2,
  },
  {
    type: 'paragraph',
    label: 'Full Paragraph Section',
    defaultTitle: 'Biography & History',
    icon: AlignLeft,
  },
  {
    type: 'bullets',
    label: 'Bullet Point Section',
    defaultTitle: 'Abilities & Equipment',
    icon: List,
  },
  {
    type: 'quote',
    label: 'Notable Quote',
    defaultTitle: 'Signature Quote',
    icon: Quote,
  },
  {
    type: 'trivia',
    label: 'Trivia & Notes',
    defaultTitle: 'Character Trivia',
    icon: HelpCircle,
  },
];

export const SectionBuilder: React.FC<SectionBuilderProps> = ({
  sections,
  onChange,
  characters,
  locations,
  currentEntityId,
}) => {
  const [activeLinkPickerSectionId, setActiveLinkPickerSectionId] = useState<
    string | null
  >(null);

  const linkableEntities = [
    ...characters
      .filter((c) => c.id !== currentEntityId)
      .map((c) => ({ id: c.id, name: c.name, kind: 'Character' })),
    ...locations
      .filter((l) => l.id !== currentEntityId)
      .map((l) => ({ id: l.id, name: l.name, kind: 'Location' })),
  ];

  const handleAddSection = (type: SectionType) => {
    const meta = SECTION_TYPE_META.find((m) => m.type === type)!;
    const newSec: ProfileSection = {
      id: `sec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type,
      title: meta.defaultTitle,
      content: type === 'paragraph' || type === 'quote' ? '' : undefined,
      attribution: type === 'quote' ? '' : undefined,
      items:
        type === 'infobox'
          ? [
              {
                id: `kv-${Date.now()}`,
                label: '',
                value: '',
              },
            ]
          : undefined,
      bullets:
        type === 'bullets' || type === 'trivia'
          ? [
              {
                id: `bl-${Date.now()}`,
                title: '',
                content: '',
              },
            ]
          : undefined,
    };
    onChange([...sections, newSec]);
  };

  const handleUpdateSection = (
    id: string,
    patch: Partial<ProfileSection>
  ) => {
    onChange(sections.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const handleRemoveSection = (id: string) => {
    onChange(sections.filter((s) => s.id !== id));
  };

  const handleMoveSection = (index: number, direction: -1 | 1) => {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= sections.length) return;
    const copy = [...sections];
    const [moved] = copy.splice(index, 1);
    copy.splice(targetIdx, 0, moved);
    onChange(copy);
  };

  const handleAppendLinkToSection = (sec: ProfileSection, entityName: string) => {
    const token = formatEntityLinkToken(entityName);
    if (sec.type === 'paragraph' || sec.type === 'quote') {
      const nextContent = sec.content
        ? `${sec.content} ${token}`
        : token;
      handleUpdateSection(sec.id, { content: nextContent });
    } else if (sec.type === 'infobox') {
      const items = [...(sec.items || [])];
      if (items.length === 0) {
        items.push({
          id: `kv-${Date.now()}`,
          label: 'Related Entry',
          value: token,
        });
      } else {
        const lastIdx = items.length - 1;
        items[lastIdx] = {
          ...items[lastIdx],
          value: items[lastIdx].value
            ? `${items[lastIdx].value} ${token}`
            : token,
        };
      }
      handleUpdateSection(sec.id, { items });
    } else if (sec.type === 'bullets' || sec.type === 'trivia') {
      const bullets = [...(sec.bullets || [])];
      if (bullets.length === 0) {
        bullets.push({
          id: `bl-${Date.now()}`,
          title: entityName,
          content: token,
        });
      } else {
        const lastIdx = bullets.length - 1;
        bullets[lastIdx] = {
          ...bullets[lastIdx],
          content: bullets[lastIdx].content
            ? `${bullets[lastIdx].content} ${token}`
            : token,
        };
      }
      handleUpdateSection(sec.id, { bullets });
    }
    setActiveLinkPickerSectionId(null);
  };

  return (
    <div className="space-y-6">
      {/* Add Section Toolbar */}
      <div className="border border-[#233044] bg-[#111722] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h3 className="font-display text-sm font-semibold text-[#F3F4F6]">
            Modular Profile Sections
          </h3>
          <span className="text-xs text-[#9CA3AF]">
            Tip: Wrap any character or location name in{' '}
            <code className="font-mono-tabular text-[#2DD4BF]">
              [[Entry Name]]
            </code>{' '}
            to hyperlink it.
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {SECTION_TYPE_META.map((meta) => {
            const Icon = meta.icon;
            return (
              <button
                key={meta.type}
                type="button"
                onClick={() => handleAddSection(meta.type)}
                className="inline-flex items-center gap-2 border border-[#2C3B52] bg-[#162030] px-3 py-2 text-xs font-medium text-[#E5E7EB] hover:border-[#2DD4BF] hover:text-white transition-colors whitespace-nowrap shrink-0"
              >
                <Plus className="h-3.5 w-3.5 text-[#2DD4BF]" />
                <Icon className="h-3.5 w-3.5 text-[#9CA3AF]" />
                <span>Add {meta.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Section Cards */}
      {sections.length === 0 ? (
        <div className="border border-dashed border-[#233044] bg-[#0E1116] p-8 text-center">
          <p className="text-sm text-[#9CA3AF]">
            No extra sections added yet. Choose a section type above (Quick
            Status Info, Full Paragraph, Bullet Points, Quote, or Trivia) to
            expand this profile.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sections.map((sec, idx) => {
            const meta = SECTION_TYPE_META.find((m) => m.type === sec.type);
            const Icon = meta?.icon || AlignLeft;

            return (
              <div
                key={sec.id}
                className="border border-[#233044] bg-[#111722] p-5 space-y-4"
              >
                {/* Section Header Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#233044] pb-3">
                  <div className="flex items-center gap-2.5 flex-1 min-w-[220px]">
                    <Icon className="h-4 w-4 text-[#2DD4BF] shrink-0" />
                    <input
                      type="text"
                      value={sec.title}
                      onChange={(e) =>
                        handleUpdateSection(sec.id, { title: e.target.value })
                      }
                      placeholder="Section Title"
                      aria-label={`Section ${idx + 1} title`}
                      className="w-full border border-[#2C3B52] bg-[#090D14] px-3 py-1.5 text-sm font-semibold text-[#F3F4F6] focus:border-[#2DD4BF] focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 relative">
                    {/* Quick Hyperlink Insertion Button */}
                    <button
                      type="button"
                      onClick={() =>
                        setActiveLinkPickerSectionId(
                          activeLinkPickerSectionId === sec.id ? null : sec.id
                        )
                      }
                      className="inline-flex items-center gap-1.5 border border-[#2C3B52] bg-[#162030] px-2.5 py-1.5 text-xs font-medium text-[#D1D5DB] hover:border-[#2DD4BF] hover:text-white transition-colors whitespace-nowrap shrink-0"
                      title="Insert hyperlink to an existing Character or Location"
                    >
                      <Link2 className="h-3.5 w-3.5 text-[#2DD4BF]" />
                      <span>Insert Link</span>
                    </button>

                    {activeLinkPickerSectionId === sec.id && (
                      <div className="absolute right-0 top-full mt-1 z-30 w-64 border border-[#2C3B52] bg-[#090D14] p-2 shadow-2xl">
                        <p className="text-[11px] font-medium text-[#9CA3AF] px-2 py-1 border-b border-[#233044]">
                          Click entry to insert [[Link]]
                        </p>
                        {linkableEntities.length === 0 ? (
                          <p className="p-2 text-xs text-[#6B7280]">
                            No other characters or locations created yet.
                          </p>
                        ) : (
                          <div className="max-h-44 overflow-y-auto divide-y divide-[#181C24]">
                            {linkableEntities.map((ent) => (
                              <button
                                key={ent.id}
                                type="button"
                                onClick={() =>
                                  handleAppendLinkToSection(sec, ent.name)
                                }
                                className="w-full flex items-center justify-between px-2 py-1.5 text-xs text-left text-[#E5E7EB] hover:bg-[#162030] hover:text-[#2DD4BF]"
                              >
                                <span className="truncate">{ent.name}</span>
                                <span className="text-[10px] text-[#9CA3AF] ml-2 shrink-0">
                                  {ent.kind}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMoveSection(idx, -1)}
                      aria-label={`Move section ${sec.title} up`}
                      className="border border-[#2C3B52] bg-[#162030] p-1.5 text-[#9CA3AF] hover:text-white disabled:opacity-30"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === sections.length - 1}
                      onClick={() => handleMoveSection(idx, 1)}
                      aria-label={`Move section ${sec.title} down`}
                      className="border border-[#2C3B52] bg-[#162030] p-1.5 text-[#9CA3AF] hover:text-white disabled:opacity-30"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveSection(sec.id)}
                      aria-label={`Delete section ${sec.title}`}
                      className="border border-[#2C3B52] bg-[#162030] p-1.5 text-[#EF4444] hover:bg-[#EF4444]/15"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Section Body by Type */}
                {sec.type === 'paragraph' && (
                  <div>
                    <textarea
                      rows={5}
                      value={sec.content || ''}
                      onChange={(e) =>
                        handleUpdateSection(sec.id, { content: e.target.value })
                      }
                      placeholder="Write full narrative paragraphs here. Reference any character or location using [[Name]]..."
                      aria-label={`${sec.title} content`}
                      className="w-full border border-[#2C3B52] bg-[#090D14] p-3 text-sm text-[#E5E7EB] leading-relaxed focus:border-[#2DD4BF] focus:outline-none"
                    />
                  </div>
                )}

                {sec.type === 'quote' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-[#9CA3AF] mb-1">
                        Quote Text
                      </label>
                      <textarea
                        rows={3}
                        value={sec.content || ''}
                        onChange={(e) =>
                          handleUpdateSection(sec.id, {
                            content: e.target.value,
                          })
                        }
                        placeholder="Enter the character or location quotation..."
                        aria-label={`${sec.title} quote text`}
                        className="w-full border border-[#2C3B52] bg-[#090D14] p-3 text-sm italic text-[#F3F4F6] focus:border-[#2DD4BF] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#9CA3AF] mb-1">
                        Speaker / Context Attribution
                      </label>
                      <input
                        type="text"
                        value={sec.attribution || ''}
                        onChange={(e) =>
                          handleUpdateSection(sec.id, {
                            attribution: e.target.value,
                          })
                        }
                        placeholder="e.g., Spoken to [[Character Name]] during the Fall of Aethelgard"
                        aria-label={`${sec.title} attribution`}
                        className="w-full border border-[#2C3B52] bg-[#090D14] px-3 py-2 text-xs text-[#D1D5DB] focus:border-[#2DD4BF] focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {sec.type === 'infobox' && (
                  <div className="space-y-2.5">
                    {(sec.items || []).map((item: KeyValueItem, itemIdx) => (
                      <div key={item.id} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={item.label}
                          onChange={(e) => {
                            const next = [...(sec.items || [])];
                            next[itemIdx] = {
                              ...item,
                              label: e.target.value,
                            };
                            handleUpdateSection(sec.id, { items: next });
                          }}
                          placeholder="Status Label (e.g. Alignment, Weapon)"
                          aria-label={`${sec.title} row ${itemIdx + 1} label`}
                          className="w-2/5 border border-[#2C3B52] bg-[#090D14] px-3 py-1.5 text-xs font-medium text-[#D1D5DB] focus:border-[#2DD4BF] focus:outline-none"
                        />
                        <input
                          type="text"
                          value={item.value}
                          onChange={(e) => {
                            const next = [...(sec.items || [])];
                            next[itemIdx] = {
                              ...item,
                              value: e.target.value,
                            };
                            handleUpdateSection(sec.id, { items: next });
                          }}
                          placeholder="Value (supports [[Links]])"
                          aria-label={`${sec.title} row ${itemIdx + 1} value`}
                          className="flex-1 border border-[#2C3B52] bg-[#090D14] px-3 py-1.5 text-xs text-[#F3F4F6] focus:border-[#2DD4BF] focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const next = (sec.items || []).filter(
                              (i) => i.id !== item.id
                            );
                            handleUpdateSection(sec.id, { items: next });
                          }}
                          aria-label={`Remove status row ${itemIdx + 1}`}
                          className="border border-[#2C3B52] bg-[#162030] p-1.5 text-[#9CA3AF] hover:text-[#EF4444]"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        const next = [
                          ...(sec.items || []),
                          {
                            id: `kv-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
                            label: '',
                            value: '',
                          },
                        ];
                        handleUpdateSection(sec.id, { items: next });
                      }}
                      className="inline-flex items-center gap-1.5 border border-[#2C3B52] bg-[#162030] px-3 py-1.5 text-xs font-medium text-[#2DD4BF] hover:bg-[#1F2430] transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Quick Status Row
                    </button>
                  </div>
                )}

                {(sec.type === 'bullets' || sec.type === 'trivia') && (
                  <div className="space-y-3">
                    {(sec.bullets || []).map((b: BulletItem, bIdx) => (
                      <div
                        key={b.id}
                        className="flex items-start gap-2 border border-[#1E232D] bg-[#0E1116] p-3"
                      >
                        <span className="font-mono-tabular text-xs text-[#2DD4BF] pt-1.5 w-6 shrink-0">
                          {sec.type === 'trivia'
                            ? `${String(bIdx + 1).padStart(2, '0')}.`
                            : '·'}
                        </span>
                        <div className="flex-1 space-y-2">
                          <input
                            type="text"
                            value={b.title}
                            onChange={(e) => {
                              const next = [...(sec.bullets || [])];
                              next[bIdx] = { ...b, title: e.target.value };
                              handleUpdateSection(sec.id, { bullets: next });
                            }}
                            placeholder={
                              sec.type === 'trivia'
                                ? 'Trivia highlight or topic (optional)'
                                : 'Bullet heading (e.g. Astral Resonance)'
                            }
                            aria-label={`${sec.title} item ${bIdx + 1} heading`}
                            className="w-full border border-[#2C3B52] bg-[#090D14] px-3 py-1.5 text-xs font-semibold text-[#F3F4F6] focus:border-[#2DD4BF] focus:outline-none"
                          />
                          <textarea
                            rows={2}
                            value={b.content}
                            onChange={(e) => {
                              const next = [...(sec.bullets || [])];
                              next[bIdx] = { ...b, content: e.target.value };
                              handleUpdateSection(sec.id, { bullets: next });
                            }}
                            placeholder="Details (supports [[Character]] and [[Location]] hyperlinks)..."
                            aria-label={`${sec.title} item ${bIdx + 1} details`}
                            className="w-full border border-[#2C3B52] bg-[#090D14] p-2.5 text-xs text-[#D1D5DB] leading-relaxed focus:border-[#2DD4BF] focus:outline-none"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const next = (sec.bullets || []).filter(
                              (item) => item.id !== b.id
                            );
                            handleUpdateSection(sec.id, { bullets: next });
                          }}
                          aria-label={`Remove item ${bIdx + 1}`}
                          className="border border-[#2C3B52] bg-[#162030] p-1.5 text-[#9CA3AF] hover:text-[#EF4444]"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        const next = [
                          ...(sec.bullets || []),
                          {
                            id: `bl-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
                            title: '',
                            content: '',
                          },
                        ];
                        handleUpdateSection(sec.id, { bullets: next });
                      }}
                      className="inline-flex items-center gap-1.5 border border-[#2C3B52] bg-[#162030] px-3 py-1.5 text-xs font-medium text-[#2DD4BF] hover:bg-[#1F2430] transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      {sec.type === 'trivia'
                        ? 'Add Trivia Point'
                        : 'Add Bullet Point'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

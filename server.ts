import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const SERVER_COOLDOWN_MS = 15_000; // Shared mindful server-side minimum cooldown across ALL AI generations on the site
let lastGenerationTimestamp = 0;
let upstreamQuotaPausedUntil = 0;

interface GenerateFeedRequestBody {
  characters?: Array<{
    name: string;
    role?: string;
    occupation?: string;
    gender?: string;
    personality?: string;
    originLocation?: string;
  }>;
  locations?: Array<{
    name: string;
    category?: string;
    region?: string;
    climate?: string;
  }>;
}

interface GeneratedFeedItem {
  category: string;
  headline: string;
  body: string;
  districtOrMood: string;
}

interface GenerateSocialRequestBody {
  mode: 'post' | 'comment' | 'reply';
  authorName?: string;
  authorType?: 'character' | 'location';
  authorSubtitle?: string;
  authorPersonality?: string;
  authorSummary?: string;
  targetPostAuthorName?: string;
  targetPostContent?: string;
  targetCommentAuthorName?: string;
  targetCommentContent?: string;
  otherEntityNames?: string[];
  pageEntity?: {
    id: string;
    type: 'character' | 'location';
    name: string;
    subtitle?: string;
    summary?: string;
    personality?: string;
    ambition?: string;
    originLocation?: string;
    relationshipInfo?: string;
  };
  actingEntity?: {
    id: string;
    type: 'character' | 'location';
    name: string;
    subtitle?: string;
    personality?: string;
  };
  postContent?: string;
  commentContent?: string;
  commentAuthorName?: string;
  characters?: Array<{
    id?: string;
    name: string;
    role?: string;
    occupation?: string;
    personality?: string;
    originLocation?: string;
  }>;
  locations?: Array<{
    id?: string;
    name: string;
    category?: string;
    region?: string;
  }>;
}

interface GenerateEntryRequestBody {
  entityType: 'character' | 'location';
  prompt: string;
  category?: string;
  existingCharacters?: string[];
  existingLocations?: string[];
}

interface GenerateSectionRequestBody {
  entityType: 'character' | 'location';
  entityName?: string;
  entityRoleOrSubtitle?: string;
  entityPersonality?: string;
  targetType: 'summary' | 'infobox' | 'paragraph' | 'bullets' | 'quote' | 'trivia';
  sectionTitle?: string;
  userPrompt: string;
  existingContent?: string;
  existingAttribution?: string;
  existingItems?: Array<{ id?: string; label: string; value: string }>;
  existingBullets?: Array<{ id?: string; title: string; content: string }>;
  existingCharacters?: string[];
  existingLocations?: string[];
}

/**
 * Generates contextual inZOI-style city life dispatches using the user's documented
 * Zois and locations whenever the upstream Gemini API free-tier quota is exhausted
 * or unavailable, ensuring uninterrupted simulation without API errors.
 */
function buildContextualInzoiDispatches(
  chars: NonNullable<GenerateFeedRequestBody['characters']>,
  locs: NonNullable<GenerateFeedRequestBody['locations']>
): GeneratedFeedItem[] {
  const pickChar = (offset: number) =>
    chars.length > 0 ? chars[(Date.now() + offset) % chars.length] : undefined;
  const pickLoc = (offset: number) =>
    locs.length > 0 ? locs[(Date.now() + offset) % locs.length] : undefined;

  const c1 = pickChar(0);
  const c2 = pickChar(1);
  const l1 = pickLoc(0);
  const l2 = pickLoc(1);

  const char1Tag = c1?.name ? `[[${c1.name}]]` : 'several local Zois';
  const char2Tag = c2?.name ? `[[${c2.name}]]` : 'neighborhood Zois';
  const loc1Title = l1?.name || 'Central Promenade';
  const loc1Tag = l1?.name ? `[[${l1.name}]]` : 'the central boulevard';
  const loc2Title = l2?.name || 'Harbor Plaza';
  const loc2Tag = l2?.name ? `[[${l2.name}]]` : 'the waterfront district';

  const pool: GeneratedFeedItem[] = [
    {
      category: 'Zoi Sighting',
      headline: `Late-Afternoon Espresso & Sketching Near ${loc1Title}`,
      body: `Passersby spotted ${char1Tag} lingering at an outdoor corner table near ${loc1Tag} while street musicians tested a new acoustic set under the transit awning.`,
      districtOrMood: 'Karma: Harmonious',
    },
    {
      category: 'District Bulletin',
      headline: `Evening Karma & Transit Harmony Reaches Seasonal High in ${loc2Title}`,
      body: `Neighborhood kiosks around ${loc2Tag} logged unusually high civic courtesy today, with ${char2Tag} seen helping organize a pop-up book and vinyl exchange.`,
      districtOrMood: l2?.category || 'Flourishing Vibe',
    },
    {
      category: 'Weather & Mood',
      headline: `Neon Dusk Reflections Settle Over ${loc1Title}`,
      body: `A cool coastal breeze rolled past ${loc1Tag} just before twilight, prompting ${char1Tag} and nearby studio regulars to pause for street-level snapshots.`,
      districtOrMood: 'Serene Evening',
    },
    {
      category: 'Social Ripple',
      headline: `Unscheduled Rooftop Light Projection Spotted Above ${loc2Title}`,
      body: `Night owls near ${loc2Tag} shared photos of an ambient holographic projection test while ${char2Tag} calibrated studio lighting equipment nearby.`,
      districtOrMood: 'Creative Pulse',
    },
  ];

  const startIndex = Math.floor(Date.now() / 1000) % pool.length;
  return [pool[startIndex], pool[(startIndex + 1) % pool.length]];
}

/**
 * Contextual fallback generator for Twitter/X-style Zoi and Location social posts, comments, and replies.
 */
function buildContextualSocialText(body: GenerateSocialRequestBody): string {
  const pageName =
    body.pageEntity?.name ||
    body.targetPostAuthorName ||
    body.authorName ||
    'Zoi';
  const actorName =
    body.actingEntity?.name || body.authorName || pageName;
  const otherNames = Array.isArray(body.otherEntityNames)
    ? body.otherEntityNames
    : [];
  const otherTag = otherNames.length > 0 ? `[[${otherNames[0]}]]` : '';

  if (body.mode === 'comment') {
    const commentTemplates = [
      `Saw this earlier! The vibe today has been unreal. Let's catch up soon, [[${pageName}]].`,
      `Honestly couldn't agree more, [[${pageName}]]. Let me know if you're still out in the district later this evening!`,
      `Classic [[${pageName}]] energy. Save me a seat next time you're out there! #ZoiLife`,
    ];
    return commentTemplates[Math.floor(Date.now() / 1000) % commentTemplates.length];
  }

  if (body.mode === 'reply') {
    const targetCommenter =
      body.targetCommentAuthorName || body.commentAuthorName
        ? `[[${body.targetCommentAuthorName || body.commentAuthorName}]]`
        : 'friend';
    const replyTemplates = [
      `Appreciate it ${targetCommenter}! Definitely swing by whenever you're free.`,
      `You know it, ${targetCommenter}! Next coffee is on me when we cross paths.`,
      `Haha thanks ${targetCommenter}! Still wrapping up a few things here but let's link up soon.`,
    ];
    return replyTemplates[Math.floor(Date.now() / 1000) % replyTemplates.length];
  }

  if ((body.authorType || body.pageEntity?.type) === 'location') {
    return `Evening lights are officially on across [[${actorName}]]. Transit kiosks report smooth traffic and plenty of open patio seating tonight.${otherTag ? ` Spotted ${otherTag} passing through the main concourse.` : ''} #CityPulse #inZOI`;
  }

  return `Taking a quick breather with an iced espresso as ${actorName}.${otherTag ? ` Just ran into ${otherTag} on the corner!` : ''} Nothing beats the golden hour atmosphere in this city. #ZoiLife #CityVibes`;
}

/**
 * Prompt-aware fallback generator for creating a complete Zoi or Location entry from a user prompt.
 */
function buildContextualGeneratedEntry(body: GenerateEntryRequestBody) {
  const promptText = (body.prompt || '').trim();
  const existingLocs = Array.isArray(body.existingLocations)
    ? body.existingLocations
    : [];
  const existingChars = Array.isArray(body.existingCharacters)
    ? body.existingCharacters
    : [];

  // Extract a plausible capitalized name if the user mentioned one in the prompt
  const nameMatch =
    promptText.match(
      /(?:named|called|name is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/
    ) ||
    promptText.match(
      /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})(?:,|\s+is\b|\s+—|\s+-)/
    );
  const words = promptText
    .replace(/[^a-zA-Z0-9\s'-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  if (body.entityType === 'location') {
    const lowerPrompt = promptText.toLowerCase();
    const detectedCategory =
      body.category ||
      (lowerPrompt.includes('cafe') ||
      lowerPrompt.includes('bar') ||
      lowerPrompt.includes('lounge') ||
      lowerPrompt.includes('shop') ||
      lowerPrompt.includes('studio') ||
      lowerPrompt.includes('business') ||
      lowerPrompt.includes('roastery') ||
      lowerPrompt.includes('club')
        ? 'Business lot'
        : lowerPrompt.includes('apartment') ||
            lowerPrompt.includes('home') ||
            lowerPrompt.includes('loft') ||
            lowerPrompt.includes('house') ||
            lowerPrompt.includes('villa')
          ? 'Residential lot'
          : lowerPrompt.includes('city') || lowerPrompt.includes('metropolis')
            ? 'City'
            : 'Community lot');

    const locName =
      nameMatch?.[1] ||
      (words.length >= 2
        ? `${words[0].charAt(0).toUpperCase() + words[0].slice(1)} ${words[1].charAt(0).toUpperCase() + words[1].slice(1)}`
        : 'Luminary Promenade');

    const ownerName =
      existingChars[0] ? `[[${existingChars[0]}]]` : 'Sora Han';
    const secondStaffName =
      existingChars[1] ? `[[${existingChars[1]}]]` : 'Min-Jae Seo';

    return {
      name: locName,
      subtitle:
        detectedCategory === 'Business lot'
          ? 'Signature District Establishment & Social Venue'
          : 'Notable Urban Landmark & Gathering Hub',
      category: detectedCategory,
      region: existingLocs[0] ? `[[${existingLocs[0]}]]` : 'Central Waterfront District',
      climate: 'Neon Dusk · Temperate Urban Breeze',
      rulerOrFaction: ownerName,
      eraOrCoordinates: 'Sector 04 · Boulevard Level',
      summary: `Inspired by "${promptText || locName}", ${locName} is a landmark ${detectedCategory.toLowerCase()} known for its sleek architectural glasswork, ambient lighting, and lively foot traffic throughout the day and night.`,
      businessOwner: detectedCategory === 'Business lot' ? ownerName : undefined,
      businessStaff:
        detectedCategory === 'Business lot'
          ? [
              {
                name: ownerName,
                role: 'Founder & Managing Director',
                shiftOrNotes: 'All Hours · Executive Oversight',
              },
              {
                name: secondStaffName,
                role: 'Lead Specialist & Host',
                shiftOrNotes: 'Evening Shift (17:00 – 01:00)',
              },
            ]
          : undefined,
      attributes: [
        { label: 'Lot Vibe', value: 'High Karma · Bustling Foot Traffic' },
        { label: 'Peak Hours', value: '18:00 – 01:30' },
      ],
      sections: [
        {
          type: 'paragraph',
          title: 'Architecture & Atmosphere',
          content: `${locName} was designed around the concept: ${promptText || 'a contemporary urban sanctuary'}. Polished concrete, warm timber accents, and floor-to-ceiling glass give Zois an unobstructed view of the surrounding street life.`,
        },
        {
          type: 'bullets',
          title: 'Notable Features & Amenities',
          bullets: [
            {
              title: 'Main Concourse & Lounge',
              content:
                'Equipped with custom acoustic paneling and curated lighting that shifts from bright daylight to warm amber at dusk.',
            },
            {
              title: 'Regular Clientele',
              content: `Frequented by local Zois${existingChars[0] ? ` including [[${existingChars[0]}]]` : ''} looking to unwind or collaborate.`,
            },
          ],
        },
        {
          type: 'trivia',
          title: 'Gazetteer Trivia',
          bullets: [
            {
              title: 'Hidden Detail',
              content:
                'The rooftop terrace offers one of the clearest sunset vantage points in the district.',
            },
          ],
        },
      ],
    };
  }

  // Character (Zoi) fallback generation
  const lowerPrompt = promptText.toLowerCase();
  const isFemalePrompt = /\b(female|woman|girl|she|her)\b/i.test(promptText);
  const isMalePrompt = /\b(male|man|boy|he|him)\b/i.test(promptText);
  const zoiName =
    nameMatch?.[1] ||
    (isFemalePrompt
      ? 'Yuna Seo'
      : isMalePrompt
        ? 'Kaelen Vance'
        : 'Ji-Hoon Park');

  const formattedName = zoiName
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  const isTeen =
    lowerPrompt.includes('teen') ||
    lowerPrompt.includes('high school') ||
    lowerPrompt.includes('student');
  const isChild = lowerPrompt.includes('child') || lowerPrompt.includes('kid');
  const isElder = lowerPrompt.includes('elder') || lowerPrompt.includes('retired');
  const isAdult =
    lowerPrompt.includes('adult') && !lowerPrompt.includes('young adult');

  const ageStage = isChild
    ? 'Child'
    : isTeen
      ? 'Teenager'
      : isElder
        ? 'Elder'
        : isAdult
          ? 'Adult'
          : 'Young Adult';

  const exactAgeMatch = promptText.match(/\b([1-8][0-9])\b/);
  const exactAge =
    exactAgeMatch?.[1] ||
    (ageStage === 'Teenager'
      ? '17'
      : ageStage === 'Adult'
        ? '32'
        : ageStage === 'Elder'
          ? '64'
          : '24');

  const traits: string[] = ['Charismatic', 'Creative Visionary'];
  if (lowerPrompt.includes('hopeless romantic') || lowerPrompt.includes('romantic')) {
    traits.push('Hopeless Romantic');
  }
  if (
    lowerPrompt.includes('flirt') ||
    lowerPrompt.includes('seduc') ||
    lowerPrompt.includes('nightlife') ||
    lowerPrompt.includes('tease') ||
    lowerPrompt.includes('romance')
  ) {
    traits.push('Shameless Flirt', 'Nightlife Magnet', 'Magnetic Gaze');
  } else if (
    lowerPrompt.includes('shy') ||
    lowerPrompt.includes('innocent') ||
    lowerPrompt.includes('sweet') ||
    lowerPrompt.includes('book')
  ) {
    traits.push('Hopeless Romantic', 'Shy Daydreamer', 'Soft-Hearted');
  } else {
    traits.push('Socialite', 'Hopeless Romantic', 'Alluring & Mysterious');
  }
  if (
    lowerPrompt.includes('rebel') ||
    lowerPrompt.includes('hot-headed') ||
    lowerPrompt.includes('jealous')
  ) {
    traits.push('Rebellious');
  } else {
    traits.push('Overthinker');
  }

  const linkedLoc = existingLocs[0] ? `[[${existingLocs[0]}]]` : 'Dowon Arts District';

  return {
    name: formattedName,
    title: 'Rising Voice of the District',
    role: 'Protagonist · Urban Insider',
    gender:
      lowerPrompt.includes('female') || lowerPrompt.includes('she')
        ? 'Female'
        : lowerPrompt.includes('male') || lowerPrompt.includes('he')
          ? 'Male'
          : 'Non-Binary',
    pronouns:
      lowerPrompt.includes('female') || lowerPrompt.includes('she')
        ? 'She/Her'
        : lowerPrompt.includes('male') || lowerPrompt.includes('he')
          ? 'He/Him'
          : 'They/Them',
    ageStage,
    exactAge,
    birthMonth: 'October',
    height: '170–174 cm (5\'7"–5\'8")',
    occupation:
      promptText.length > 4 && promptText.length < 45
        ? promptText
        : 'Creative Director & Late-Night Acoustic Producer',
    personalityTraits: traits,
    ambition: 'Leave an unforgettable mark on the city cultural scene',
    householdStatus: 'Single',
    relationshipStatus: 'Single',
    relationshipPartner: '',
    affiliation: 'Independent Studio Collective',
    status: 'Alive',
    originLocation: linkedLoc,
    summary: `${formattedName} is a ${ageStage.toLowerCase()} Zoi shaped by the concept: "${promptText || 'an expressive city resident with big ambitions'}". Often seen around ${linkedLoc}, ${formattedName} balances a polished public persona with an active late-night social life.`,
    personalAttributes: [
      { label: 'Signature Style', value: 'Tailored Monochrome Streetwear' },
      { label: 'Favorite Hangout', value: linkedLoc },
    ],
    sections: [
      {
        type: 'paragraph',
        title: 'Biography & Background',
        content: `Guided by the prompt "${promptText || formattedName}", ${formattedName} quickly became a recognizable figure around ${linkedLoc}. Known for blending ${traits.slice(0, 2).join(' and ')} energy, they navigate both daytime creative work and after-hours social circles with effortless magnetism.`,
      },
      {
        type: 'bullets',
        title: 'Skills, Habits & Reputation',
        bullets: [
          {
            title: 'Social Reputation',
            content: `Embodies ${traits.join(', ')} traits in everyday interactions across the city.`,
          },
          {
            title: 'Daily Routine',
            content: `Starts mornings with espresso near ${linkedLoc} before diving into evening projects.`,
          },
        ],
      },
      {
        type: 'quote',
        title: 'Signature Quote',
        content:
          'Every street corner in this city has a story if you stay awake long enough to hear it.',
        attribution: `${formattedName}, late evening at ${linkedLoc}`,
      },
      {
        type: 'trivia',
        title: 'Zoi Trivia',
        bullets: [
          {
            title: 'Hidden Habit',
            content:
              'Keeps a private notebook of midnight lyric fragments and overheard café conversations.',
          },
        ],
      },
    ],
  };
}

/**
 * Context-aware fallback generator for a specific Zoi or Location section.
 * If existing content is provided, refines and expands it using the user's prompt.
 */
function buildContextualSectionContent(body: GenerateSectionRequestBody) {
  const name = body.entityName || 'this Zoi';
  const prompt = (body.userPrompt || '').trim();
  const hasExistingText = Boolean(
    body.existingContent && body.existingContent.trim().length > 0
  );
  const existingText = (body.existingContent || '').trim();
  const locRef =
    Array.isArray(body.existingLocations) && body.existingLocations.length > 0
      ? `[[${body.existingLocations[0]}]]`
      : 'the central district';

  if (body.targetType === 'summary' || body.targetType === 'paragraph') {
    const content = hasExistingText
      ? `${existingText}\n\nBuilding upon this background (${prompt || 'expanded narrative detail'}), ${name} continues to shape daily life around ${locRef}, drawing on their ${body.entityPersonality || 'distinctive'} temperament and evolving ambitions.`
      : `${name} (${body.entityRoleOrSubtitle || 'Resident'}) is closely tied to ${locRef}. ${prompt ? `Specifically: ${prompt}. ` : ''}Their presence brings a distinct energy shaped by ${body.entityPersonality || 'their personal traits and ambitions'}, making them a memorable figure in the local community.`;
    return { content };
  }

  if (body.targetType === 'quote') {
    const content = hasExistingText
      ? `${existingText} — ${prompt ? `Refined with ${prompt}` : 'And I still stand by every word.'}`
      : `"${prompt ? `When you look at ${prompt}, you realize this city never truly sleeps.` : `The lights around ${locRef} always tell you who's still chasing a dream tonight.`}"`;
    const attribution =
      body.existingAttribution && body.existingAttribution.trim()
        ? body.existingAttribution.trim()
        : `— ${name}, spoken near ${locRef}`;
    return { content, attribution };
  }

  if (body.targetType === 'infobox') {
    const existingItems = Array.isArray(body.existingItems)
      ? body.existingItems.filter((i) => i.label.trim() || i.value.trim())
      : [];
    const generatedItems = [
      ...existingItems,
      {
        label: prompt ? prompt.slice(0, 28) : 'Karma Standing',
        value: prompt
          ? ` Influenced by ${prompt} near ${locRef}`
          : 'Harmonious · Active in District',
      },
      {
        label: 'Frequent Spot',
        value: locRef,
      },
    ];
    return { items: generatedItems };
  }

  // 'bullets' or 'trivia'
  const existingBullets = Array.isArray(body.existingBullets)
    ? body.existingBullets.filter((b) => b.title.trim() || b.content.trim())
    : [];
  const generatedBullets = [
    ...existingBullets.map((b) =>
      prompt
        ? {
            title: b.title || 'Updated Detail',
            content: `${b.content} (Updated context: ${prompt})`,
          }
        : b
    ),
    {
      title: prompt ? `Highlight: ${prompt.slice(0, 32)}` : 'Notable Detail',
      content: `Connected to ${name}'s experiences around ${locRef}${prompt ? ` — ${prompt}` : ''}.`,
    },
  ];
  return { bullets: generatedBullets };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '25mb' }));

  app.get('/api/city-feed/status', (_req, res) => {
    const now = Date.now();
    const elapsed = now - lastGenerationTimestamp;
    const remainingMs = Math.max(0, SERVER_COOLDOWN_MS - elapsed);
    res.json({
      cooldownRemainingMs: remainingMs,
      minimumCooldownMs: SERVER_COOLDOWN_MS,
    });
  });

  app.post('/api/city-feed/generate', async (req, res) => {
    const now = Date.now();
    const elapsed = now - lastGenerationTimestamp;
    const cooldownSec = Math.ceil(SERVER_COOLDOWN_MS / 1000);

    if (lastGenerationTimestamp > 0 && elapsed < SERVER_COOLDOWN_MS) {
      const remainingSeconds = Math.ceil((SERVER_COOLDOWN_MS - elapsed) / 1000);
      res.status(200).json({
        cooldownActive: true,
        cooldownRemainingMs: SERVER_COOLDOWN_MS - elapsed,
        cooldownRemainingSeconds: remainingSeconds,
        updates: [],
      });
      return;
    }

    const body = (req.body || {}) as GenerateFeedRequestBody;
    const chars = Array.isArray(body.characters)
      ? body.characters.slice(0, 12)
      : [];
    const locs = Array.isArray(body.locations)
      ? body.locations.slice(0, 12)
      : [];

    lastGenerationTimestamp = now;

    const apiKey = process.env.GEMINI_API_KEY;
    if (
      !apiKey ||
      apiKey === 'MY_GEMINI_API_KEY' ||
      now < upstreamQuotaPausedUntil
    ) {
      const fallbackUpdates = buildContextualInzoiDispatches(chars, locs);
      res.json({
        updates: fallbackUpdates,
        event: fallbackUpdates[0],
        cooldownMs: SERVER_COOLDOWN_MS,
        cooldownSeconds: cooldownSec,
        source: 'simulation_engine',
      });
      return;
    }

    const charContext =
      chars.length > 0
        ? chars
            .map(
              (c) =>
                `- [[${c.name}]] (${[c.occupation || c.role, c.personality, c.originLocation].filter(Boolean).join(', ') || 'Zoi'})`
            )
            .join('\n')
        : 'No named Zois registered yet; reference general city Zois, commuters, street musicians, and cafe patrons.';

    const locContext =
      locs.length > 0
        ? locs
            .map(
              (l) =>
                `- [[${l.name}]] (${[l.category, l.region, l.climate].filter(Boolean).join(', ') || 'District'})`
            )
            .join('\n')
        : 'No named districts registered yet; reference central avenues, transit plazas, waterfront parks, and corner studios.';

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const prompt = `Generate 2 short, atmospheric life-simulation city updates in the style of the game inZOI for a living community hub website.
Rules:
1. NEVER mention any website user, editor, or author who made changes. Write as an anonymous, living municipal & neighborhood bulletin where the city and its Zois evolve on their own.
2. Refer to residents as "Zois" (singular "Zoi"). Reflect the grounded, hyper-detailed slice-of-life & urban simulation vibe of inZOI: neighborhood karma reports, ambient weather/mood shifts, street-corner sightings, cafe encounters, public transit advisories, studio schedules, or subtle interpersonal moments.
3. Whenever you mention one of the documented Zois or locations listed below, wrap their exact name in double brackets like [[Name]] so the site hyperlinks them automatically.
4. Keep each update concise (1 to 2 sentences for summary, plus a short headline and category).

Documented Zois:
${charContext}

Documented Locations:
${locContext}`;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          systemInstruction:
            'You are the ambient urban life simulation chronicler for a living city community hub inspired by inZOI. Return strictly valid JSON matching the requested schema. Keep each update under 45 words.',
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                category: {
                  type: Type.STRING,
                  description:
                    'Short category label such as City Life, Zoi Sighting, District Bulletin, Weather & Mood, or Social Ripple.',
                },
                headline: {
                  type: Type.STRING,
                  description: 'Concise editorial headline for the city update.',
                },
                body: {
                  type: Type.STRING,
                  description:
                    '1-2 sentence atmospheric update text. Wrap any existing Zoi or location names in [[Double Brackets]].',
                },
                districtOrMood: {
                  type: Type.STRING,
                  description:
                    'Short ambient tag such as "Karma: Harmonious", "Evening Drizzle", or "Downtown Plaza".',
                },
              },
              required: ['category', 'headline', 'body', 'districtOrMood'],
            },
          },
        },
      });

      const rawText = (response.text ?? '[]').trim();
      const parsed = JSON.parse(rawText);
      const validUpdates: GeneratedFeedItem[] =
        Array.isArray(parsed) && parsed.length > 0
          ? parsed
          : buildContextualInzoiDispatches(chars, locs);

      res.json({
        updates: validUpdates,
        event: validUpdates[0],
        cooldownMs: SERVER_COOLDOWN_MS,
        cooldownSeconds: cooldownSec,
        source: 'gemini',
      });
    } catch {
      upstreamQuotaPausedUntil = Date.now() + 15 * 60 * 1000;
      const fallbackUpdates = buildContextualInzoiDispatches(chars, locs);
      res.status(200).json({
        updates: fallbackUpdates,
        event: fallbackUpdates[0],
        cooldownMs: SERVER_COOLDOWN_MS,
        cooldownSeconds: cooldownSec,
        source: 'simulation_fallback',
      });
    }
  });

  /**
   * Shared AI Social Media generator for Twitter/X-style Zoi & Location posts, comments, and comment replies.
   */
  app.post('/api/social/generate', async (req, res) => {
    const now = Date.now();
    const elapsed = now - lastGenerationTimestamp;
    const cooldownSec = Math.ceil(SERVER_COOLDOWN_MS / 1000);

    if (lastGenerationTimestamp > 0 && elapsed < SERVER_COOLDOWN_MS) {
      const remainingSeconds = Math.ceil((SERVER_COOLDOWN_MS - elapsed) / 1000);
      res.status(200).json({
        cooldownActive: true,
        cooldownRemainingMs: SERVER_COOLDOWN_MS - elapsed,
        cooldownRemainingSeconds: remainingSeconds,
      });
      return;
    }

    const body = (req.body || {}) as GenerateSocialRequestBody;
    lastGenerationTimestamp = now;

    const apiKey = process.env.GEMINI_API_KEY;
    if (
      !apiKey ||
      apiKey === 'MY_GEMINI_API_KEY' ||
      now < upstreamQuotaPausedUntil
    ) {
      const fallbackText = buildContextualSocialText(body);
      res.json({
        content: fallbackText,
        cooldownMs: SERVER_COOLDOWN_MS,
        cooldownSeconds: cooldownSec,
        source: 'simulation_engine',
      });
      return;
    }

    const authorName =
      body.authorName || body.actingEntity?.name || body.pageEntity?.name || 'Zoi';
    const authorSubtitle =
      body.authorSubtitle ||
      body.actingEntity?.subtitle ||
      body.pageEntity?.subtitle ||
      'Resident';
    const authorPersonality =
      body.authorPersonality ||
      body.actingEntity?.personality ||
      body.pageEntity?.personality ||
      'expressive';
    const otherNames = Array.isArray(body.otherEntityNames)
      ? body.otherEntityNames.slice(0, 12)
      : [];

    let taskPrompt = '';
    if (body.mode === 'comment') {
      taskPrompt = `Write a short, realistic Twitter/X-style comment from "${authorName}" (${authorSubtitle}, traits: ${authorPersonality}) reacting to a social media post by [[${body.targetPostAuthorName || 'a fellow Zoi'}]].
Original Post: "${body.targetPostContent || body.postContent || ''}"
Keep the comment casual, in-character, and under 35 words. Wrap any mentioned Zoi or Location names in [[Double Brackets]].`;
    } else if (body.mode === 'reply') {
      taskPrompt = `Write a short, realistic Twitter/X-style reply from "${authorName}" (${authorSubtitle}) responding directly to a comment left by [[${body.targetCommentAuthorName || body.commentAuthorName || 'a fellow Zoi'}]] on their post.
Original Post: "${body.targetPostContent || body.postContent || ''}"
Comment: "${body.targetCommentContent || body.commentContent || ''}"
Keep the reply conversational, natural, and under 30 words. Wrap any mentioned Zoi or Location names in [[Double Brackets]].`;
    } else {
      const isLoc =
        (body.authorType || body.pageEntity?.type) === 'location';
      taskPrompt = isLoc
        ? `Write a short, atmospheric Twitter/X-style update post from the official community account of the location "${authorName}" (${authorSubtitle}). Summary: ${body.authorSummary || body.pageEntity?.summary || ''}. Mention local vibes, events, or a visiting Zoi wrapped in [[Double Brackets]], plus 1-2 hashtags. Keep under 40 words.`
        : `Write a short, authentic Twitter/X-style post from the Zoi "${authorName}" (${authorSubtitle}, personality traits: ${authorPersonality}). Summary: ${body.authorSummary || ''}. Mention their day in the city, mood, or another Zoi/Location from the list below wrapped in [[Double Brackets]], plus 1-2 hashtags. Keep under 40 words.`;
    }

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `${taskPrompt}\n\nKnown Zois & Locations in the city (wrap exact names in [[Double Brackets]] if referenced): ${otherNames.join(', ') || 'None yet'}`,
        config: {
          systemInstruction:
            'You write in-character Twitter/X-style social media posts, comments, and replies for Zois and Locations in an inZOI-inspired life simulation world. Return strictly valid JSON with a "content" string.',
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              content: {
                type: Type.STRING,
                description:
                  'The social media post, comment, or reply text. Wrap any existing Zoi or Location names in [[Double Brackets]].',
              },
            },
            required: ['content'],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      const content =
        typeof parsed.content === 'string' && parsed.content.trim().length > 0
          ? parsed.content.trim()
          : buildContextualSocialText(body);

      res.json({
        content,
        cooldownMs: SERVER_COOLDOWN_MS,
        cooldownSeconds: cooldownSec,
        source: 'gemini',
      });
    } catch {
      upstreamQuotaPausedUntil = Date.now() + 15 * 60 * 1000;
      const fallbackText = buildContextualSocialText(body);
      res.status(200).json({
        content: fallbackText,
        cooldownMs: SERVER_COOLDOWN_MS,
        cooldownSeconds: cooldownSec,
        source: 'simulation_fallback',
      });
    }
  });

  /**
   * AI Entry Generator: Populates a full Zoi ('character') or Location ('location') entry
   * and its modular sections automatically from a user-given prompt.
   * Shares the global AI cooldown.
   */
  app.post('/api/entry/generate', async (req, res) => {
    const now = Date.now();
    const elapsed = now - lastGenerationTimestamp;
    const cooldownSec = Math.ceil(SERVER_COOLDOWN_MS / 1000);

    if (lastGenerationTimestamp > 0 && elapsed < SERVER_COOLDOWN_MS) {
      const remainingSeconds = Math.ceil((SERVER_COOLDOWN_MS - elapsed) / 1000);
      res.status(200).json({
        cooldownActive: true,
        cooldownRemainingMs: SERVER_COOLDOWN_MS - elapsed,
        cooldownRemainingSeconds: remainingSeconds,
      });
      return;
    }

    const body = (req.body || {}) as GenerateEntryRequestBody;
    lastGenerationTimestamp = now;

    const apiKey = process.env.GEMINI_API_KEY;
    if (
      !apiKey ||
      apiKey === 'MY_GEMINI_API_KEY' ||
      now < upstreamQuotaPausedUntil
    ) {
      const generated = buildContextualGeneratedEntry(body);
      res.json({
        entry: generated,
        cooldownMs: SERVER_COOLDOWN_MS,
        cooldownSeconds: cooldownSec,
        source: 'simulation_engine',
      });
      return;
    }

    const existingChars = Array.isArray(body.existingCharacters)
      ? body.existingCharacters.slice(0, 15)
      : [];
    const existingLocs = Array.isArray(body.existingLocations)
      ? body.existingLocations.slice(0, 15)
      : [];

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      if (body.entityType === 'location') {
        const locPrompt = `Create a rich, detailed Location / Lot entry for an inZOI-inspired living city encyclopedia based on this user prompt:
User Prompt: "${body.prompt || 'A vibrant urban business lot in the city'}"
Preferred Category (if specified): "${body.category || 'Auto-detect from City, Residential lot, Community lot, or Business lot'}"
Existing Zois in Archive (wrap exact names in [[Double Brackets]] if linked): ${existingChars.join(', ') || 'None yet'}
Existing Locations in Archive: ${existingLocs.join(', ') || 'None yet'}

Rules:
- Category MUST be one of: "City", "Residential lot", "Community lot", "Business lot".
- If Category is "Business lot", populate "businessOwner" (e.g. a Zoi name wrapped in [[Brackets]] if from existing Zois) and 2-3 "businessStaff" members with name, role, and shiftOrNotes.
- Include 2-3 modular sections (e.g. a 'paragraph' section for Architecture & History, a 'bullets' section for Amenities/Highlights, and a 'trivia' section).`;

        const response = await ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: locPrompt,
          config: {
            systemInstruction:
              'You design rich, atmospheric location dossiers for an inZOI life-simulation encyclopedia. Return strictly valid JSON matching the schema.',
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                subtitle: { type: Type.STRING },
                category: {
                  type: Type.STRING,
                  description:
                    'Must be City, Residential lot, Community lot, or Business lot',
                },
                region: { type: Type.STRING },
                climate: { type: Type.STRING },
                rulerOrFaction: { type: Type.STRING },
                eraOrCoordinates: { type: Type.STRING },
                summary: { type: Type.STRING },
                businessOwner: { type: Type.STRING },
                businessStaff: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      role: { type: Type.STRING },
                      shiftOrNotes: { type: Type.STRING },
                    },
                    required: ['name', 'role'],
                  },
                },
                attributes: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      label: { type: Type.STRING },
                      value: { type: Type.STRING },
                    },
                    required: ['label', 'value'],
                  },
                },
                sections: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      type: {
                        type: Type.STRING,
                        description:
                          'paragraph, bullets, quote, trivia, or infobox',
                      },
                      title: { type: Type.STRING },
                      content: { type: Type.STRING },
                      attribution: { type: Type.STRING },
                      bullets: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            title: { type: Type.STRING },
                            content: { type: Type.STRING },
                          },
                          required: ['title', 'content'],
                        },
                      },
                    },
                    required: ['type', 'title'],
                  },
                },
              },
              required: ['name', 'subtitle', 'category', 'summary', 'sections'],
            },
          },
        });

        const parsed = JSON.parse((response.text ?? '{}').trim());
        res.json({
          entry: parsed.name ? parsed : buildContextualGeneratedEntry(body),
          cooldownMs: SERVER_COOLDOWN_MS,
          cooldownSeconds: cooldownSec,
          source: 'gemini',
        });
        return;
      }

      // Character (Zoi) entry generation
      const charPrompt = `Create a rich, complete Zoi (resident character) profile for an inZOI-inspired encyclopedia based on this user prompt:
User Prompt: "${body.prompt || 'A charismatic young adult Zoi living in the city'}"
Existing Zois in Archive (wrap exact names in [[Double Brackets]] if linked): ${existingChars.join(', ') || 'None yet'}
Existing Locations in Archive (wrap exact names in [[Double Brackets]] if linked): ${existingLocs.join(', ') || 'None yet'}

Rules:
- "ageStage" MUST be one of: "Child", "Teenager", "Young Adult", "Adult", "Elder", "Ageless".
- "exactAge" should be an optional number string matching the stage (e.g. "16" for Teenager, "24" for Young Adult, "35" for Adult, or "" for Ageless).
- "gender" should be one of: "Female", "Male", "Non-Binary", "Genderfluid", "Agender", "Other".
- "pronouns" should be one of: "She/Her", "He/Him", "They/Them", "She/They", "He/They", "Any Pronouns".
- "birthMonth" should be a full month name ("January" to "December").
- "height" should be one of: "Under 155 cm (5'1\\")", "155–159 cm (5'1\\"–5'2\\")", "160–164 cm (5'3\\"–5'4\\")", "165–169 cm (5'5\\"–5'6\\")", "170–174 cm (5'7\\"–5'8\\")", "175–179 cm (5'9\\"–5'10\\")", "180–184 cm (5'11\\"–6'0\\")", "185–189 cm (6'1\\"–6'2\\")", "190+ cm (6'3\\"+)".
- "householdStatus" MUST be "Single" or "Family".
- "relationshipStatus" MUST be "Single", "Dating", "Engaged", or "Married".
- "personalityTraits" should be 3 to 6 traits chosen from: Volunteer, Socialite, Perfectionist, Adventurer, Caregiver, Mediator, Entertainer, Leader, Explorer, Scholar, Charismatic, Creative Visionary, Empathetic Listener, Loyal Companion, Authoritarian, Recluse, Individualist, Hot-Headed, Workaholic, Jealous, Gossip Hound, Overthinker, Materialistic, Impulsive, Cynical, Vain, Rebellious, Commitment-Phobic, Hopeless Romantic, Shy Daydreamer, First Crush Jitters, Bookworm, Soft-Hearted, Cozy Homebody, Animal Lover, Naive Optimist, Secret Poet, Stargazer, Sweet Tooth, Awkwardly Charming, Shameless Flirt, Heartbreaker, Tease, Seductive Charm, Nightlife Magnet, Thrill-Seeking Romantic, Magnetic Gaze, Secretly Passionate, Forbidden Romance Seeker, Alluring & Mysterious, Wild Child, Irresistible Temptation, After-Hours Socialite, Possessive Lover.
- Include 3-4 modular sections ('paragraph' biography, 'bullets' skills/lifestyle, 'quote' signature quote, 'trivia' character trivia).`;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: charPrompt,
        config: {
          systemInstruction:
            'You design complete, vivid Zoi character dossiers for an inZOI life-simulation encyclopedia. Return strictly valid JSON matching the schema.',
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              title: { type: Type.STRING },
              role: { type: Type.STRING },
              gender: { type: Type.STRING },
              pronouns: { type: Type.STRING },
              ageStage: { type: Type.STRING },
              exactAge: { type: Type.STRING },
              birthMonth: { type: Type.STRING },
              height: { type: Type.STRING },
              occupation: { type: Type.STRING },
              personalityTraits: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              ambition: { type: Type.STRING },
              householdStatus: { type: Type.STRING },
              relationshipStatus: { type: Type.STRING },
              relationshipPartner: { type: Type.STRING },
              affiliation: { type: Type.STRING },
              originLocation: { type: Type.STRING },
              summary: { type: Type.STRING },
              personalAttributes: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    label: { type: Type.STRING },
                    value: { type: Type.STRING },
                  },
                  required: ['label', 'value'],
                },
              },
              sections: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    type: {
                      type: Type.STRING,
                      description: 'paragraph, bullets, quote, trivia, or infobox',
                    },
                    title: { type: Type.STRING },
                    content: { type: Type.STRING },
                    attribution: { type: Type.STRING },
                    bullets: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          title: { type: Type.STRING },
                          content: { type: Type.STRING },
                        },
                        required: ['title', 'content'],
                      },
                    },
                  },
                  required: ['type', 'title'],
                },
              },
            },
            required: [
              'name',
              'title',
              'gender',
              'pronouns',
              'ageStage',
              'occupation',
              'personalityTraits',
              'summary',
              'sections',
            ],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      res.json({
        entry: parsed.name ? parsed : buildContextualGeneratedEntry(body),
        cooldownMs: SERVER_COOLDOWN_MS,
        cooldownSeconds: cooldownSec,
        source: 'gemini',
      });
    } catch {
      upstreamQuotaPausedUntil = Date.now() + 15 * 60 * 1000;
      const generated = buildContextualGeneratedEntry(body);
      res.status(200).json({
        entry: generated,
        cooldownMs: SERVER_COOLDOWN_MS,
        cooldownSeconds: cooldownSec,
        source: 'simulation_fallback',
      });
    }
  });

  /**
   * AI Section Assistance: Generates or edits/improves a specific section in the Zoi / Location editor
   * using a user-written prompt. If the section already has content filled out, the AI uses it as context
   * to edit, refine, or improve it.
   */
  app.post('/api/section/generate', async (req, res) => {
    const now = Date.now();
    const elapsed = now - lastGenerationTimestamp;
    const cooldownSec = Math.ceil(SERVER_COOLDOWN_MS / 1000);

    if (lastGenerationTimestamp > 0 && elapsed < SERVER_COOLDOWN_MS) {
      const remainingSeconds = Math.ceil((SERVER_COOLDOWN_MS - elapsed) / 1000);
      res.status(200).json({
        cooldownActive: true,
        cooldownRemainingMs: SERVER_COOLDOWN_MS - elapsed,
        cooldownRemainingSeconds: remainingSeconds,
      });
      return;
    }

    const body = (req.body || {}) as GenerateSectionRequestBody;
    lastGenerationTimestamp = now;

    const apiKey = process.env.GEMINI_API_KEY;
    if (
      !apiKey ||
      apiKey === 'MY_GEMINI_API_KEY' ||
      now < upstreamQuotaPausedUntil
    ) {
      const result = buildContextualSectionContent(body);
      res.json({
        result,
        cooldownMs: SERVER_COOLDOWN_MS,
        cooldownSeconds: cooldownSec,
        source: 'simulation_engine',
      });
      return;
    }

    const existingContextSummary = (() => {
      if (body.existingContent && body.existingContent.trim()) {
        return `EXISTING CONTENT TO EDIT/IMPROVE:\n"${body.existingContent.trim()}"`;
      }
      if (Array.isArray(body.existingItems) && body.existingItems.length > 0) {
        const rows = body.existingItems
          .filter((i) => i.label.trim() || i.value.trim())
          .map((i) => `- ${i.label}: ${i.value}`)
          .join('\n');
        if (rows) return `EXISTING INFOBOX ROWS TO EDIT/IMPROVE:\n${rows}`;
      }
      if (
        Array.isArray(body.existingBullets) &&
        body.existingBullets.length > 0
      ) {
        const bullets = body.existingBullets
          .filter((b) => b.title.trim() || b.content.trim())
          .map((b) => `- ${b.title}: ${b.content}`)
          .join('\n');
        if (bullets) return `EXISTING BULLET POINTS TO EDIT/IMPROVE:\n${bullets}`;
      }
      return 'NO EXISTING CONTENT YET — Generate fresh content for this section.';
    })();

    const knownEntities = [
      ...(body.existingCharacters || []),
      ...(body.existingLocations || []),
    ]
      .slice(0, 20)
      .join(', ');

    const prompt = `You are assisting a user in editing a section of an inZOI encyclopedia entry.
Entry Type: ${body.entityType === 'location' ? 'Location' : 'Zoi (Character)'}
Entry Name: ${body.entityName || 'Unnamed Entry'}
Role / Subtitle: ${body.entityRoleOrSubtitle || ''}
Personality / Traits: ${body.entityPersonality || ''}
Section Type: ${body.targetType}
Section Title: ${body.sectionTitle || body.targetType}

${existingContextSummary}

USER PROMPT / INSTRUCTIONS:
"${body.userPrompt || 'Expand and polish this section with vivid inZOI life-simulation details.'}"

Rules:
1. If existing content is provided above, use it as context and edit, improve, or expand it according to the User Prompt while preserving key facts and [[Hyperlinks]].
2. Wrap any mentioned Zois or Locations from this list in double brackets like [[Name]]: ${knownEntities || 'None'}.`;

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          systemInstruction:
            'You are a context-aware editorial assistant for an inZOI character and location wiki. Return strictly valid JSON matching the requested schema.',
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              content: {
                type: Type.STRING,
                description:
                  'Used when targetType is summary, paragraph, or quote.',
              },
              attribution: {
                type: Type.STRING,
                description: 'Used when targetType is quote.',
              },
              items: {
                type: Type.ARRAY,
                description: 'Used when targetType is infobox.',
                items: {
                  type: Type.OBJECT,
                  properties: {
                    label: { type: Type.STRING },
                    value: { type: Type.STRING },
                  },
                  required: ['label', 'value'],
                },
              },
              bullets: {
                type: Type.ARRAY,
                description: 'Used when targetType is bullets or trivia.',
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    content: { type: Type.STRING },
                  },
                  required: ['title', 'content'],
                },
              },
            },
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      res.json({
        result: parsed,
        cooldownMs: SERVER_COOLDOWN_MS,
        cooldownSeconds: cooldownSec,
        source: 'gemini',
      });
    } catch {
      upstreamQuotaPausedUntil = Date.now() + 15 * 60 * 1000;
      const result = buildContextualSectionContent(body);
      res.status(200).json({
        result,
        cooldownMs: SERVER_COOLDOWN_MS,
        cooldownSeconds: cooldownSec,
        source: 'simulation_fallback',
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    // Server listening on port 3000
  });
}

void startServer();

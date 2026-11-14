import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const SERVER_COOLDOWN_MS = 45_000; // Shared mindful server-side minimum cooldown across ALL AI generations on the site
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
  pageEntity: {
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
  const pageName = body.pageEntity?.name || 'Zoi';
  const actorName = body.actingEntity?.name || pageName;
  const chars = Array.isArray(body.characters) ? body.characters : [];
  const locs = Array.isArray(body.locations) ? body.locations : [];

  const otherChar = chars.find(
    (c) => c.name.toLowerCase() !== actorName.toLowerCase()
  );
  const sampleLoc =
    locs.find((l) => l.name.toLowerCase() !== actorName.toLowerCase()) ||
    locs[0];

  const otherCharTag = otherChar ? `[[${otherChar.name}]]` : '';
  const locTag = sampleLoc
    ? `[[${sampleLoc.name}]]`
    : body.pageEntity?.originLocation
      ? body.pageEntity.originLocation
      : 'the district plaza';

  if (body.mode === 'comment') {
    const commentTemplates = [
      `Saw this earlier near ${locTag}! The vibe today has been unreal. Let's catch up soon, [[${pageName}]].`,
      `Honestly couldn't agree more. Let me know if you're still around ${locTag} later this evening!`,
      `Classic [[${pageName}]] energy. Save me a seat next time you're out there! #ZoiLife`,
      `The street lighting around ${locTag} has been top tier all week. Great update!`,
    ];
    return commentTemplates[Math.floor(Date.now() / 1000) % commentTemplates.length];
  }

  if (body.mode === 'reply') {
    const targetCommenter = body.commentAuthorName
      ? `[[${body.commentAuthorName}]]`
      : 'friend';
    const replyTemplates = [
      `Appreciate it ${targetCommenter}! Definitely swing by ${locTag} whenever you're free.`,
      `You know it, ${targetCommenter}! Next coffee is on me when we cross paths.`,
      `Haha thanks ${targetCommenter}! Still wrapping up a few things here but let's link up soon.`,
    ];
    return replyTemplates[Math.floor(Date.now() / 1000) % replyTemplates.length];
  }

  // mode === 'post'
  if (body.pageEntity?.type === 'location') {
    const locPostTemplates = [
      `Evening lights are officially on across [[${pageName}]]. Transit kiosks report smooth traffic and plenty of open patio seating tonight.${otherCharTag ? ` Spotted ${otherCharTag} passing through the main concourse.` : ''} #CityPulse #inZOI`,
      `Fresh breeze rolling through [[${pageName}]] this afternoon. Local cafes and community spaces are open for all Zois looking for a quiet place to unwind. #DistrictUpdate`,
      `Late-night ambient check from [[${pageName}]]: neon reflections on the pavement and calm neighborhood karma across the block. #ZoiCity`,
    ];
    return locPostTemplates[Math.floor(Date.now() / 1000) % locPostTemplates.length];
  }

  const zoiPostTemplates = [
    `Taking a quick breather near ${locTag} with an iced espresso.${otherCharTag ? ` Just ran into ${otherCharTag} on the corner!` : ''} Nothing beats the golden hour atmosphere in this city. #ZoiLife #CityVibes`,
    `Long session working on new plans today${body.pageEntity?.subtitle ? ` (${body.pageEntity.subtitle})` : ''}. Stepping out to ${locTag} to clear my head and enjoy the night air. #Zoi`,
    `Does anyone else feel like the street music around ${locTag} gets better every week?${otherCharTag ? ` Thinking ${otherCharTag} would love this set.` : ''} #NightWalk #inZOI`,
  ];
  return zoiPostTemplates[Math.floor(Date.now() / 1000) % zoiPostTemplates.length];
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
   * Shares `lastGenerationTimestamp` and `SERVER_COOLDOWN_MS` with all other AI generations on the site.
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

    const chars = Array.isArray(body.characters)
      ? body.characters.slice(0, 10)
      : [];
    const locs = Array.isArray(body.locations)
      ? body.locations.slice(0, 10)
      : [];

    const entitiesList = [
      ...chars.map((c) => `Zoi: [[${c.name}]] (${c.occupation || c.role || 'Resident'})`),
      ...locs.map((l) => `Location: [[${l.name}]] (${l.category || 'Lot'})`),
    ].join('; ');

    let taskPrompt = '';
    if (body.mode === 'comment') {
      const commenter = body.actingEntity || body.pageEntity;
      taskPrompt = `Write a short, realistic Twitter/X-style comment from the Zoi "${commenter?.name}" (${commenter?.subtitle || 'Zoi'}, personality: ${commenter?.personality || 'expressive'}) reacting to a social media post by [[${body.pageEntity?.name}]].
Original Post by [[${body.pageEntity?.name}]]: "${body.postContent || ''}"
Keep the comment casual, in-character, and under 35 words. Wrap any mentioned Zoi or Location names in [[Double Brackets]].`;
    } else if (body.mode === 'reply') {
      const replier = body.actingEntity || body.pageEntity;
      taskPrompt = `Write a short, realistic Twitter/X-style reply from "${replier?.name}" (${replier?.subtitle || 'Zoi'}) responding directly to a comment left by [[${body.commentAuthorName || 'a fellow Zoi'}]] on their post.
Original Post: "${body.postContent || ''}"
Comment from [[${body.commentAuthorName || 'Zoi'}]]: "${body.commentContent || ''}"
Keep the reply conversational, natural, and under 30 words. Wrap any mentioned Zoi or Location names in [[Double Brackets]].`;
    } else {
      const isLoc = body.pageEntity?.type === 'location';
      taskPrompt = isLoc
        ? `Write a short, atmospheric Twitter/X-style update post from the official community account of the location "${body.pageEntity?.name}" (${body.pageEntity?.subtitle || 'City Lot'}). Summary: ${body.pageEntity?.summary || ''}. Mention local vibes, events, or a visiting Zoi wrapped in [[Double Brackets]], plus 1-2 hashtags. Keep under 40 words.`
        : `Write a short, authentic Twitter/X-style post from the Zoi "${body.pageEntity?.name}" (${body.pageEntity?.subtitle || 'Zoi'}, personality: ${body.pageEntity?.personality || 'observant'}, ambition: ${body.pageEntity?.ambition || ''}, relationship: ${body.pageEntity?.relationshipInfo || ''}). Mention their day in the city, mood, or another Zoi/Location from the list below wrapped in [[Double Brackets]], plus 1-2 hashtags. Keep under 40 words.`;
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
        contents: `${taskPrompt}\n\nKnown Zois & Locations in the city (wrap exact names in [[Double Brackets]] if referenced): ${entitiesList || 'None yet'}`,
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

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateCropDrawParams,
  compactArchiveForStorage,
  createAnonymousSiteFeedEvent,
  createEmptyArchive,
  findBacklinksForEntity,
  formatEntityLinkToken,
  formatRelationshipDisplay,
  formatSocialHandle,
  getAllSubmittedPhotosForHub,
  getAspectDimensions,
  getPhotosForEntity,
  getSocialPostsForEntity,
  normalizeLocationCategory,
  parseHyperlinkedSegments,
  resolveActivePageBackground,
  searchCodexEntries,
  validateAndNormalizeArchive,
} from './codexLogic';
import {
  CharacterEntry,
  GalleryPhoto,
  LocationEntry,
  SocialMediaPost,
} from '../types/codex';

const mockLocation: LocationEntry = {
  id: 'loc-1',
  name: 'Obsidian Spire',
  subtitle: 'Seat of the High Synod',
  category: 'Community lot',
  region: 'Northern Wastes',
  climate: 'Sub-zero',
  rulerOrFaction: 'High Synod',
  eraOrCoordinates: '4th Astral Era',
  summary: 'An ancient spire where [[Vaelen Thorne]] was exiled.',
  imageDataUrl: 'data:image/jpeg;base64,loc1',
  backgroundDataUrl: 'data:image/jpeg;base64,locBg1',
  attributes: [],
  sections: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const mockCharacter: CharacterEntry = {
  id: 'char-1',
  name: 'Vaelen Thorne',
  title: 'The Ash Warden',
  role: 'Inquisitor',
  gender: 'Male',
  pronouns: 'He/Him',
  age: '34',
  birthdate: 'November',
  height: '185–189 cm (6\'1"–6\'2")',
  occupation: 'Chief Archivist',
  personality: 'Stoic · Observant',
  ambition: 'Chart the Northern Wastes',
  householdStatus: 'Single',
  relationshipStatus: 'Married',
  relationshipPartner: 'Elena Rostova',
  relationships: 'Married to [[Elena Rostova]]',
  affiliation: 'High Synod',
  status: 'Alive',
  originLocation: 'Obsidian Spire',
  summary:
    'Born in the shadow of [[Obsidian Spire]], Vaelen guards the northern passes.',
  portraitDataUrl: 'data:image/jpeg;base64,char1',
  backgroundDataUrl: 'data:image/jpeg;base64,charBg1',
  profileDesign: 'encyclopedia',
  personalAttributes: [
    { id: 'attr-1', label: 'Weapon', value: 'Halberd of Glass' },
  ],
  sections: [
    {
      id: 'sec-1',
      type: 'trivia',
      title: 'Trivia',
      bullets: [
        {
          id: 'b-1',
          title: 'Scar Origin',
          content: 'Received during the siege of Obsidian Spire.',
        },
      ],
    },
  ],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const mockPhoto: GalleryPhoto = {
  id: 'photo-1',
  imageDataUrl: 'data:image/jpeg;base64,shot1',
  caption: 'Patrol at dusk',
  taggedCharacterIds: ['char-1'],
  taggedLocationIds: ['loc-1'],
  createdAt: '2026-01-02T00:00:00.000Z',
};

test('createEmptyArchive produces a clean start with zero pre-populated entries', () => {
  const archive = createEmptyArchive();
  assert.equal(archive.characters.length, 0);
  assert.equal(archive.locations.length, 0);
  assert.equal(archive.photos.length, 0);
  assert.equal(archive.feedEvents.length, 0);
  assert.equal(archive.socialPosts.length, 0);
  assert.equal(archive.settings.defaultProfileDesign, 'encyclopedia');
  assert.equal(archive.settings.defaultSiteBackgroundUrl, '');
});

test('parseHyperlinkedSegments resolves explicit [[wiki]] links and automatic entity names', () => {
  const segments = parseHyperlinkedSegments(
    'He traveled from [[Obsidian Spire|the Spire]] to meet Vaelen Thorne.',
    [mockCharacter],
    [mockLocation],
    true
  );

  const linkSegments = segments.filter((s) => s.type === 'link');
  assert.equal(linkSegments.length, 2);
  assert.equal(linkSegments[0].text, 'the Spire');
  assert.equal(linkSegments[0].targetType, 'location');
  assert.equal(linkSegments[0].targetId, 'loc-1');

  assert.equal(linkSegments[1].text, 'Vaelen Thorne');
  assert.equal(linkSegments[1].targetType, 'character');
  assert.equal(linkSegments[1].targetId, 'char-1');
});

test('findBacklinksForEntity locates bidirectional references across Zois and locations including relationshipPartner', () => {
  const partnerZoi: CharacterEntry = {
    ...mockCharacter,
    id: 'char-2',
    name: 'Elena Rostova',
    originLocation: '',
    summary: 'Architect in Dowon.',
    relationshipStatus: 'Married',
    relationshipPartner: 'Vaelen Thorne',
    relationships: 'Married to [[Vaelen Thorne]]',
    sections: [],
  };

  const backlinksToLocation = findBacklinksForEntity(
    'loc-1',
    'Obsidian Spire',
    [mockCharacter],
    [mockLocation]
  );
  assert.equal(backlinksToLocation.length, 1);
  assert.equal(backlinksToLocation[0].sourceId, 'char-1');
  assert.equal(backlinksToLocation[0].sourceType, 'character');

  const backlinksToPartner = findBacklinksForEntity(
    'char-2',
    'Elena Rostova',
    [mockCharacter, partnerZoi],
    [mockLocation]
  );
  assert.equal(backlinksToPartner.length, 1);
  assert.equal(backlinksToPartner[0].sourceId, 'char-1');
});

test('getPhotosForEntity and getAllSubmittedPhotosForHub filter and aggregate tagged photos', () => {
  const charPhotos = getPhotosForEntity('character', 'char-1', [mockPhoto]);
  assert.equal(charPhotos.length, 1);
  assert.equal(charPhotos[0].id, 'photo-1');

  const locPhotos = getPhotosForEntity('location', 'loc-1', [mockPhoto]);
  assert.equal(locPhotos.length, 1);

  const hubPhotos = getAllSubmittedPhotosForHub(
    [mockCharacter],
    [mockLocation],
    [mockPhoto]
  );
  assert.equal(hubPhotos.length, 3);
});

test('createAnonymousSiteFeedEvent creates living city updates with Zoi terminology and no user attribution', () => {
  const evt = createAnonymousSiteFeedEvent({
    action: 'character_created',
    entityName: 'Vaelen Thorne',
    entityId: 'char-1',
    entitySubtitle: 'Chief Archivist',
  });
  assert.equal(evt.kind, 'site_update');
  assert.ok(evt.headline.includes('New Zoi Arrival'));
  assert.ok(evt.body.includes('[[Vaelen Thorne]]'));
  assert.ok(!evt.body.toLowerCase().includes('user'));
  assert.ok(!evt.body.toLowerCase().includes('admin'));
});

test('searchCodexEntries matches names, attributes, occupation, and nested trivia content', () => {
  const byWeapon = searchCodexEntries(
    'Halberd of Glass',
    'all',
    [mockCharacter],
    [mockLocation]
  );
  assert.equal(byWeapon.length, 1);
  assert.equal(byWeapon[0].id, 'char-1');

  const byOccupation = searchCodexEntries(
    'Chief Archivist',
    'character',
    [mockCharacter],
    [mockLocation]
  );
  assert.equal(byOccupation.length, 1);
  assert.equal(byOccupation[0].id, 'char-1');
});

test('image cropper geometry math calculates deterministic cover scaling and offsets', () => {
  const dims = getAspectDimensions('3:4', 600);
  assert.equal(dims.width, 600);
  assert.equal(dims.height, 800);

  const draw = calculateCropDrawParams(1200, 1600, {
    scale: 1.5,
    offsetX: 25,
    offsetY: -40,
    aspectRatio: '3:4',
    outputWidth: 600,
    outputHeight: 800,
  });

  assert.equal(draw.dWidth, 900);
  assert.equal(draw.dHeight, 1200);
  assert.equal(draw.dx, -125);
  assert.equal(draw.dy, -240);
});

test('formatEntityLinkToken and validateAndNormalizeArchive normalize status to Alive and enforce encyclopedia design', () => {
  assert.equal(formatEntityLinkToken('Obsidian Spire'), '[[Obsidian Spire]]');

  assert.equal(normalizeLocationCategory('City'), 'City');
  assert.equal(normalizeLocationCategory('Residential lot'), 'Residential lot');
  assert.equal(normalizeLocationCategory('Community lot'), 'Community lot');
  assert.equal(normalizeLocationCategory('Business lot'), 'Business lot');

  const normalized = validateAndNormalizeArchive({
    characters: [
      {
        id: 'c-legacy',
        name: 'Lyra',
        species: 'Non-Binary',
        status: 'Active',
        profileDesign: 'tactical_file',
        householdStatus: 'Family',
        relationshipStatus: 'Engaged',
        relationshipPartner: 'Vaelen Thorne',
        backgroundDataUrl: 'data:image/png;base64,charBg',
      },
    ],
    locations: [
      {
        id: 'l-1',
        name: 'Dowon',
        category: 'City',
        backgroundDataUrl: 'data:image/png;base64,locBg',
      },
    ],
    settings: {
      defaultProfileDesign: 'tactical_file',
      directoryGridColumns: 4,
      defaultSiteBackgroundUrl: 'data:image/png;base64,siteBg',
    },
  });
  assert.equal(normalized.characters.length, 1);
  assert.equal(normalized.characters[0].gender, 'Non-Binary');
  assert.equal(normalized.characters[0].status, 'Alive');
  assert.equal(normalized.characters[0].profileDesign, 'encyclopedia');
  assert.equal(normalized.characters[0].householdStatus, 'Family');
  assert.equal(normalized.characters[0].relationshipStatus, 'Engaged');
  assert.equal(
    normalized.characters[0].relationships,
    'Engaged to [[Vaelen Thorne]]'
  );
  assert.equal(normalized.settings.defaultProfileDesign, 'encyclopedia');
});

test('formatRelationshipDisplay, formatSocialHandle, and getSocialPostsForEntity work accurately', () => {
  assert.equal(formatSocialHandle('Kaelen Vance'), '@kaelen_vance');
  assert.equal(
    formatRelationshipDisplay('Married', 'Elena Rostova'),
    'Married to [[Elena Rostova]]'
  );
  assert.equal(
    formatRelationshipDisplay('Dating', '[[Vaelen Thorne]]'),
    'Dating [[Vaelen Thorne]]'
  );
  assert.equal(formatRelationshipDisplay('Single', ''), 'Single');

  const samplePosts: SocialMediaPost[] = [
    {
      id: 'post-1',
      pageEntityType: 'character',
      pageEntityId: 'char-1',
      authorType: 'character',
      authorId: 'char-1',
      authorName: 'Vaelen Thorne',
      authorHandle: '@vaelen_thorne',
      content: 'Quiet morning at [[Obsidian Spire]].',
      likesCount: 4,
      repostsCount: 1,
      comments: [],
      createdAt: '2026-01-03T10:00:00.000Z',
    },
    {
      id: 'post-2',
      pageEntityType: 'location',
      pageEntityId: 'loc-1',
      authorType: 'location',
      authorId: 'loc-1',
      authorName: 'Obsidian Spire',
      authorHandle: '@obsidian_spire',
      content: 'Evening transit advisory.',
      likesCount: 2,
      repostsCount: 0,
      comments: [],
      createdAt: '2026-01-03T11:00:00.000Z',
    },
  ];

  const charFeed = getSocialPostsForEntity('character', 'char-1', samplePosts);
  assert.equal(charFeed.length, 1);
  assert.equal(charFeed[0].id, 'post-1');

  const locFeed = getSocialPostsForEntity('location', 'loc-1', samplePosts);
  assert.equal(locFeed.length, 1);
  assert.equal(locFeed[0].id, 'post-2');
});

test('resolveActivePageBackground prioritizes individual Zoi/location backgrounds over default site background', () => {
  const archive = createEmptyArchive();
  archive.settings.defaultSiteBackgroundUrl =
    'data:image/jpeg;base64,defaultSiteBg';
  archive.characters = [mockCharacter];
  archive.locations = [mockLocation];

  const hubBg = resolveActivePageBackground({ view: 'hub' }, archive);
  assert.equal(hubBg.source, 'site_default');
  assert.equal(hubBg.imageUrl, 'data:image/jpeg;base64,defaultSiteBg');

  const charBg = resolveActivePageBackground(
    { view: 'character_detail', id: 'char-1' },
    archive
  );
  assert.equal(charBg.source, 'character');
  assert.equal(charBg.imageUrl, 'data:image/jpeg;base64,charBg1');

  const locBg = resolveActivePageBackground(
    { view: 'location_detail', id: 'loc-1' },
    archive
  );
  assert.equal(locBg.source, 'location');
  assert.equal(locBg.imageUrl, 'data:image/jpeg;base64,locBg1');
});

test('compactArchiveForStorage removes redundant raw*DataUrl fields and prevents localStorage quota overflow', () => {
  const archive = createEmptyArchive();
  archive.characters = [
    {
      ...mockCharacter,
      rawPortraitDataUrl: 'data:image/png;base64,' + 'A'.repeat(20000),
      rawBackgroundDataUrl: 'data:image/png;base64,' + 'B'.repeat(20000),
    },
  ];
  archive.settings.rawDefaultSiteBackgroundUrl =
    'data:image/png;base64,' + 'C'.repeat(20000);

  const compacted = compactArchiveForStorage(archive, false);
  assert.equal(compacted.characters[0].rawPortraitDataUrl, undefined);
  assert.equal(compacted.characters[0].rawBackgroundDataUrl, undefined);
  assert.equal(compacted.settings.rawDefaultSiteBackgroundUrl, undefined);
  assert.equal(
    compacted.characters[0].portraitDataUrl,
    mockCharacter.portraitDataUrl
  );
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateCropDrawParams,
  compactArchiveForStorage,
  createAnonymousSiteFeedEvent,
  createEmptyArchive,
  evolveNaturalZoiFollow,
  findBacklinksForEntity,
  formatEntityLinkToken,
  formatRelationshipDisplay,
  formatSocialHandle,
  formatZoiAge,
  generateAutonomousZoiComment,
  generateAutonomousZoiPost,
  generateAutonomousZoiReply,
  getAllSubmittedPhotosForHub,
  getAspectDimensions,
  getFollowersForZoi,
  getFollowingForZoi,
  getPersonalityTraitMeta,
  getPhotosForEntity,
  getSocialPostsForEntity,
  normalizeLocationCategory,
  parseHyperlinkedSegments,
  parsePersonalityTraits,
  parseZoiAge,
  pickWeightedCommenterZoi,
  resolveActivePageBackground,
  searchCodexEntries,
  serializePersonalityTraits,
  sortCharactersForDirectory,
  sortLocationsForDirectory,
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
  socialBannerDataUrl: 'data:image/jpeg;base64,locBanner1',
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
  age: 'Adult (34)',
  birthdate: 'November',
  height: '185–189 cm (6\'1"–6\'2")',
  occupation: 'Chief Archivist',
  personality: 'Socialite, Hopeless Romantic, Shameless Flirt',
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
  followingIds: [],
  portraitDataUrl: 'data:image/jpeg;base64,char1',
  backgroundDataUrl: 'data:image/jpeg;base64,charBg1',
  socialBannerDataUrl: 'data:image/jpeg;base64,charBanner1',
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

test('findBacklinksForEntity locates bidirectional references across Zois and locations including Business lot owner & staff', () => {
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

  const businessLocation: LocationEntry = {
    ...mockLocation,
    id: 'loc-biz',
    name: 'Velvet Roast Lounge',
    category: 'Business lot',
    summary: 'Late-night espresso and jazz bar.',
    businessOwner: '[[Elena Rostova]]',
    businessStaff: [
      {
        id: 'staff-1',
        name: 'Vaelen Thorne',
        role: 'Head Roaster',
        shiftOrNotes: 'Evening Shift',
      },
    ],
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
    [mockLocation, businessLocation]
  );
  assert.equal(backlinksToPartner.length, 2);
  assert.ok(backlinksToPartner.some((b) => b.sourceId === 'char-1'));
  assert.ok(backlinksToPartner.some((b) => b.sourceId === 'loc-biz'));
});

test('formatZoiAge and parseZoiAge handle the 6 life stages plus optional exact numbered age', () => {
  assert.equal(formatZoiAge('Young Adult', '24'), 'Young Adult (24)');
  assert.equal(formatZoiAge('Teenager', ''), 'Teenager');
  assert.equal(formatZoiAge('Ageless', ''), 'Ageless');

  assert.deepEqual(parseZoiAge('Young Adult (24)'), {
    stage: 'Young Adult',
    exactAge: '24',
  });
  assert.deepEqual(parseZoiAge('Elder'), {
    stage: 'Elder',
    exactAge: '',
  });
  assert.deepEqual(parseZoiAge('24'), {
    stage: 'Young Adult',
    exactAge: '24',
  });
  assert.deepEqual(parseZoiAge('Teenager (13–17)'), {
    stage: 'Teenager',
    exactAge: '',
  });
});

test('parsePersonalityTraits, serializePersonalityTraits, and getPersonalityTraitMeta handle multi-select inZOI traits', () => {
  const parsed = parsePersonalityTraits(
    'Socialite, Recluse · Hopeless Romantic, Shameless Flirt, Socialite'
  );
  assert.deepEqual(parsed, [
    'Socialite',
    'Recluse',
    'Hopeless Romantic',
    'Shameless Flirt',
  ]);

  assert.equal(
    serializePersonalityTraits(parsed),
    'Socialite, Recluse, Hopeless Romantic, Shameless Flirt'
  );

  assert.equal(getPersonalityTraitMeta('Socialite').category, 'positive');
  assert.equal(getPersonalityTraitMeta('Recluse').category, 'negative');
  assert.equal(
    getPersonalityTraitMeta('Hopeless Romantic').category,
    'innocent'
  );
  assert.equal(
    getPersonalityTraitMeta('Shameless Flirt').category,
    'suggestive'
  );
  assert.equal(getPersonalityTraitMeta('Night Owl').category, 'custom');
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

test('searchCodexEntries matches names, attributes, occupation, and Business lot staff', () => {
  const byWeapon = searchCodexEntries(
    'Halberd of Glass',
    'all',
    [mockCharacter],
    [mockLocation]
  );
  assert.equal(byWeapon.length, 1);
  assert.equal(byWeapon[0].id, 'char-1');

  const bizLoc: LocationEntry = {
    ...mockLocation,
    id: 'loc-biz-2',
    name: 'Neon Vinyl Studio',
    category: 'Business lot',
    businessOwner: 'Vaelen Thorne',
    businessStaff: [
      { id: 'st-1', name: 'Mina Park', role: 'Master Mastering Engineer' },
    ],
  };

  const byStaffRole = searchCodexEntries(
    'Mastering Engineer',
    'location',
    [mockCharacter],
    [bizLoc]
  );
  assert.equal(byStaffRole.length, 1);
  assert.equal(byStaffRole[0].id, 'loc-biz-2');
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

test('formatEntityLinkToken and validateAndNormalizeArchive normalize status, age, followingIds, socialBannerDataUrl, and Business lot fields', () => {
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
        age: '22',
        status: 'Active',
        profileDesign: 'tactical_file',
        householdStatus: 'Family',
        relationshipStatus: 'Engaged',
        relationshipPartner: 'Vaelen Thorne',
        followingIds: ['char-1', 'c-legacy', 'char-1'],
        backgroundDataUrl: 'data:image/png;base64,charBg',
        socialBannerDataUrl: 'data:image/png;base64,charSocialBanner',
      },
    ],
    locations: [
      {
        id: 'l-1',
        name: 'Dowon Espresso Bar',
        category: 'Business lot',
        businessOwner: '[[Lyra]]',
        businessStaff: [{ id: 's1', name: 'Vaelen Thorne', role: 'Barista' }],
        backgroundDataUrl: 'data:image/png;base64,locBg',
        socialBannerDataUrl: 'data:image/png;base64,locSocialBanner',
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
  assert.equal(normalized.characters[0].age, 'Young Adult (22)');
  assert.equal(normalized.characters[0].status, 'Alive');
  assert.equal(normalized.characters[0].profileDesign, 'encyclopedia');
  assert.deepEqual(normalized.characters[0].followingIds, ['char-1']);
  assert.equal(
    normalized.characters[0].socialBannerDataUrl,
    'data:image/png;base64,charSocialBanner'
  );
  assert.equal(normalized.locations[0].businessOwner, '[[Lyra]]');
  assert.equal(normalized.locations[0].businessStaff?.length, 1);
  assert.equal(
    normalized.locations[0].socialBannerDataUrl,
    'data:image/png;base64,locSocialBanner'
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
      rawSocialBannerDataUrl: 'data:image/png;base64,' + 'D'.repeat(20000),
    },
  ];
  archive.settings.rawDefaultSiteBackgroundUrl =
    'data:image/png;base64,' + 'C'.repeat(20000);

  const compacted = compactArchiveForStorage(archive, false);
  assert.equal(compacted.characters[0].rawPortraitDataUrl, undefined);
  assert.equal(compacted.characters[0].rawBackgroundDataUrl, undefined);
  assert.equal(compacted.characters[0].rawSocialBannerDataUrl, undefined);
  assert.equal(compacted.settings.rawDefaultSiteBackgroundUrl, undefined);
  assert.equal(
    compacted.characters[0].portraitDataUrl,
    mockCharacter.portraitDataUrl
  );
  assert.equal(
    compacted.characters[0].socialBannerDataUrl,
    mockCharacter.socialBannerDataUrl
  );
});

test('sortCharactersForDirectory and sortLocationsForDirectory always move entries without uploaded profile images to the bottom', () => {
  const zoiNoImageA: CharacterEntry = {
    ...mockCharacter,
    id: 'z-no-img-a',
    name: 'Aaron NoImage',
    age: 'Child (9)',
    portraitDataUrl: '',
    updatedAt: '2026-03-10T00:00:00.000Z',
  };
  const zoiWithImageZ: CharacterEntry = {
    ...mockCharacter,
    id: 'z-img-z',
    name: 'Zara WithImage',
    age: 'Elder (68)',
    portraitDataUrl: 'data:image/jpeg;base64,imgZ',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
  const zoiWithImageB: CharacterEntry = {
    ...mockCharacter,
    id: 'z-img-b',
    name: 'Bram WithImage',
    age: 'Young Adult (24)',
    portraitDataUrl: 'data:image/jpeg;base64,imgB',
    updatedAt: '2026-02-01T00:00:00.000Z',
  };

  const sortedByNameAsc = sortCharactersForDirectory(
    [zoiNoImageA, zoiWithImageZ, zoiWithImageB],
    'name_asc'
  );
  assert.deepEqual(
    sortedByNameAsc.map((c) => c.id),
    ['z-img-b', 'z-img-z', 'z-no-img-a']
  );

  const sortedByRecent = sortCharactersForDirectory(
    [zoiNoImageA, zoiWithImageZ, zoiWithImageB],
    'recent'
  );
  assert.deepEqual(
    sortedByRecent.map((c) => c.id),
    ['z-img-b', 'z-img-z', 'z-no-img-a']
  );

  const locNoImageA: LocationEntry = {
    ...mockLocation,
    id: 'l-no-img-a',
    name: 'Alpha Lot NoImage',
    category: 'City',
    imageDataUrl: '',
    updatedAt: '2026-03-10T00:00:00.000Z',
  };
  const locWithImageZ: LocationEntry = {
    ...mockLocation,
    id: 'l-img-z',
    name: 'Zenith Plaza WithImage',
    category: 'Residential lot',
    imageDataUrl: 'data:image/jpeg;base64,locZ',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  const sortedLocs = sortLocationsForDirectory(
    [locNoImageA, locWithImageZ],
    'name_asc'
  );
  assert.deepEqual(
    sortedLocs.map((l) => l.id),
    ['l-img-z', 'l-no-img-a']
  );
});

test('evolveNaturalZoiFollow, pickWeightedCommenterZoi, and autonomous post/comment/reply helpers work accurately', () => {
  const zoi1: CharacterEntry = {
    ...mockCharacter,
    id: 'z-1',
    name: 'Kaelen Vance',
    followingIds: [],
  };
  const zoi2: CharacterEntry = {
    ...mockCharacter,
    id: 'z-2',
    name: 'Sora Han',
    followingIds: [],
  };

  const evolved = evolveNaturalZoiFollow([zoi1, zoi2], 'z-1');
  assert.ok(evolved);
  assert.equal(evolved.updatedCharacters.length, 2);
  const totalFollows = evolved.updatedCharacters.reduce(
    (acc, c) => acc + (c.followingIds?.length || 0),
    0
  );
  assert.equal(totalFollows, 1);

  const zoiFollower: CharacterEntry = {
    ...zoi2,
    followingIds: ['z-1'],
  };
  const followersOfZoi1 = getFollowersForZoi('z-1', [zoi1, zoiFollower]);
  assert.equal(followersOfZoi1.length, 1);
  assert.equal(followersOfZoi1[0].id, 'z-2');

  const followingOfZoi2 = getFollowingForZoi(zoiFollower, [zoi1, zoiFollower]);
  assert.equal(followingOfZoi2.length, 1);
  assert.equal(followingOfZoi2[0].id, 'z-1');

  const pickedCommenter = pickWeightedCommenterZoi('z-1', [zoi1, zoiFollower]);
  assert.ok(pickedCommenter);
  assert.equal(pickedCommenter.zoi.id, 'z-2');
  assert.equal(pickedCommenter.isFollower, true);
  assert.ok(pickedCommenter.weight >= 3.5);

  const autoPost = generateAutonomousZoiPost(
    zoiFollower,
    [zoi1, zoiFollower],
    [mockLocation]
  );
  assert.equal(autoPost.authorId, 'z-2');
  assert.ok(autoPost.content.length > 10);

  const autoComment = generateAutonomousZoiComment(zoiFollower, autoPost);
  assert.equal(autoComment.authorId, 'z-2');
  assert.ok(autoComment.content.length > 5);

  const autoReply = generateAutonomousZoiReply(
    zoi1.name,
    'character',
    zoi1.id,
    autoComment
  );
  assert.equal(autoReply.authorId, 'z-1');
  assert.ok(autoReply.content.includes('[[Sora Han]]'));
});

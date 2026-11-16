import 'dotenv/config';
import { prisma, hashPassword } from '../src/server/auth';

const IMAGES = {
  morningWalk: '/src/assets/images/hero_delhi_morning_walk_1794851444677.jpg',
  cafeSketch: '/src/assets/images/activity_cafe_sketchbook_1794851446562.jpg',
  badminton: '/src/assets/images/activity_badminton_park_1794851446825.jpg',
  cycling: '/src/assets/images/activity_cycling_trail_1794851445486.jpg',
  boardgames: '/src/assets/images/activity_boardgames_books_1794851447804.jpg',
  photowalk: '/src/assets/images/activity_photography_walk_1794851448216.jpg',
  openMic: '/src/assets/images/event_open_mic_courtyard_1794855066863.jpg',
  foodMarket: '/src/assets/images/event_food_market_delhi_1794855067442.jpg',
  sunriseTrek: '/src/assets/images/event_aravalli_sunrise_trek_1794855066292.jpg',
};

function addDays(base: Date, days: number, hour = 8, minute = 0) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return d;
}

export async function seedDatabase(forceReset = false) {
  const existingCount = await prisma.activity.count();
  if (existingCount > 0 && !forceReset) {
    return;
  }

  if (forceReset) {
    await prisma.ticket.deleteMany();
    await prisma.order.deleteMany();
    await prisma.ticketTier.deleteMany();
    await prisma.agendaItem.deleteMany();
    await prisma.message.deleteMany();
    await prisma.conversationMember.deleteMany();
    await prisma.conversation.deleteMany();
    await prisma.participation.deleteMany();
    await prisma.communityMember.deleteMany();
    await prisma.activity.deleteMany();
    await prisma.community.deleteMany();
    await prisma.userInterest.deleteMany();
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
    await prisma.category.deleteMany();
    await prisma.interest.deleteMany();
  }

  const interestDefs = [
    { name: 'Sports', slug: 'sports', icon: 'trophy' },
    { name: 'Photography', slug: 'photography', icon: 'camera' },
    { name: 'Music', slug: 'music', icon: 'music' },
    { name: 'Reading', slug: 'reading', icon: 'book' },
    { name: 'Travel', slug: 'travel', icon: 'compass' },
    { name: 'Fitness', slug: 'fitness', icon: 'activity' },
    { name: 'Gaming', slug: 'gaming', icon: 'gamepad' },
    { name: 'Art', slug: 'art', icon: 'palette' },
    { name: 'Food', slug: 'food', icon: 'coffee' },
    { name: 'Learning', slug: 'learning', icon: 'graduation' },
    { name: 'Outdoor activities', slug: 'outdoor-activities', icon: 'trees' },
    { name: 'Cycling', slug: 'cycling', icon: 'bike' },
  ];

  const interests: Record<string, string> = {};
  for (const item of interestDefs) {
    const created = await prisma.interest.create({ data: item });
    interests[item.slug] = created.id;
  }

  const categoryDefs = [
    {
      name: 'Sports and Fitness',
      slug: 'sports-fitness',
      description: 'Badminton, football, morning runs, yoga on the lawn, and park movement.',
      icon: 'trophy',
      tintColor: 'sage',
      sortOrder: 1,
    },
    {
      name: 'Outdoor Activities',
      slug: 'outdoor-activities',
      description: 'Nature walks, cycling loops, biodiversity hikes, and sunrise gatherings.',
      icon: 'trees',
      tintColor: 'light-sage',
      sortOrder: 2,
    },
    {
      name: 'Food and Cafés',
      slug: 'food-cafes',
      description: 'Filter coffee mornings, neighbourhood chai walks, and slow bakery tastings.',
      icon: 'coffee',
      tintColor: 'peach',
      sortOrder: 3,
    },
    {
      name: 'Arts and Creativity',
      slug: 'arts-creativity',
      description: 'Plein-air sketching, pottery circles, zine workshops, and shared craft.',
      icon: 'palette',
      tintColor: 'cream',
      sortOrder: 4,
    },
    {
      name: 'Music',
      slug: 'music',
      description: 'Acoustic park jams, listening sessions, and informal vocal circles.',
      icon: 'music',
      tintColor: 'peach',
      sortOrder: 5,
    },
    {
      name: 'Photography',
      slug: 'photography',
      description: 'Golden hour heritage walks, street framing, and analog film meetups.',
      icon: 'camera',
      tintColor: 'earth',
      sortOrder: 6,
    },
    {
      name: 'Gaming',
      slug: 'gaming',
      description: 'Strategy board games, chess evenings, and friendly tabletop sessions.',
      icon: 'gamepad',
      tintColor: 'sage',
      sortOrder: 7,
    },
    {
      name: 'Reading and Learning',
      slug: 'reading-learning',
      description: 'Silent reading picnics, book swaps, and curiosity-led discussions.',
      icon: 'book',
      tintColor: 'cream',
      sortOrder: 8,
    },
    {
      name: 'Travel and Exploration',
      slug: 'travel-exploration',
      description: 'Stepwell trails, urban history walks, and hidden Delhi-NCR corners.',
      icon: 'compass',
      tintColor: 'light-sage',
      sortOrder: 9,
    },
    {
      name: 'Social Gatherings',
      slug: 'social-gatherings',
      description: 'New-in-city picnics, neighbourhood brunches, and low-pressure hangouts.',
      icon: 'users',
      tintColor: 'peach',
      sortOrder: 10,
    },
    {
      name: 'Education and Study',
      slug: 'education-study',
      description: 'Language exchanges, focused co-study rooms, and skill-sharing hours.',
      icon: 'graduation',
      tintColor: 'light-sage',
      sortOrder: 11,
    },
    {
      name: 'Other Interests',
      slug: 'other-interests',
      description: 'Birdwatching, urban gardening, stargazing, and community tinkering.',
      icon: 'sparkles',
      tintColor: 'cream',
      sortOrder: 12,
    },
  ];

  const categories: Record<string, string> = {};
  for (const cat of categoryDefs) {
    const created = await prisma.category.create({ data: cat });
    categories[cat.slug] = created.id;
  }

  const demoPasswordHash = hashPassword('common-demo-2026');

  const userSeeds = [
    {
      email: 'aarav@common.in',
      fullName: 'Aarav Sharma',
      bio: 'Architect who loves early morning walks in Lodhi Garden, film photography, and slow filter coffee.',
      location: 'Lodhi Colony, New Delhi',
      avatarTone: 'sage',
      interests: ['outdoor-activities', 'photography', 'cycling', 'reading'],
    },
    {
      email: 'meera@common.in',
      fullName: 'Meera Nair',
      bio: 'Recently moved to Delhi for work. Looking for weekend sketchbook buddies, cozy cafés, and board game nights.',
      location: 'Hauz Khas, New Delhi',
      avatarTone: 'peach',
      interests: ['art', 'food', 'gaming', 'reading'],
    },
    {
      email: 'kabir@common.in',
      fullName: 'Kabir Verma',
      bio: 'Badminton regular, Aravalli cyclist, and acoustic guitar learner. Always up for a 6:30 AM court session.',
      location: 'DLF Phase 4, Gurugram',
      avatarTone: 'earth',
      interests: ['sports', 'fitness', 'cycling', 'music'],
    },
    {
      email: 'ananya@common.in',
      fullName: 'Ananya Gupta',
      bio: 'Urban heritage nerd and notebook collector. Hosting slow walks around Mehrauli and Shahpur Jat.',
      location: 'Green Park, New Delhi',
      avatarTone: 'light-sage',
      interests: ['travel', 'photography', 'reading', 'learning'],
    },
    {
      email: 'rohan@common.in',
      fullName: 'Rohan Malhotra',
      bio: 'Product designer by week, Catan and Terraforming Mars organiser by Sunday afternoon.',
      location: 'Saket, New Delhi',
      avatarTone: 'cream',
      interests: ['gaming', 'food', 'art', 'music'],
    },
    {
      email: 'sana@common.in',
      fullName: 'Sana Khan',
      bio: 'Botany researcher who spends weekends identifying trees at Sundar Nursery and hosting silent reading circles.',
      location: 'Nizamuddin East, New Delhi',
      avatarTone: 'sage',
      interests: ['outdoor-activities', 'reading', 'photography', 'learning'],
    },
    {
      email: 'vikram@common.in',
      fullName: 'Vikramjit Singh',
      bio: 'Endurance cyclist and football keeper. Believe most good friendships start after a long morning ride.',
      location: 'Vasant Kunj, New Delhi',
      avatarTone: 'earth',
      interests: ['cycling', 'sports', 'fitness', 'outdoor-activities'],
    },
    {
      email: 'priya@common.in',
      fullName: 'Priya Menon',
      bio: 'Illustration teacher and matcha enthusiast. Love small creative meetups where nobody checks their phone.',
      location: 'Defence Colony, New Delhi',
      avatarTone: 'peach',
      interests: ['art', 'food', 'music', 'travel'],
    },
    {
      email: 'dev@common.in',
      fullName: 'Devansh Joshi',
      bio: 'Classical and indie vinyl fan. Organising park listening picnics and beginner Hindi-Urdu poetry readings.',
      location: 'Civil Lines, Delhi',
      avatarTone: 'light-sage',
      interests: ['music', 'reading', 'learning', 'food'],
    },
    {
      email: 'tara@common.in',
      fullName: 'Tara Deshmukh',
      bio: 'Moved from Pune six months ago. Discovering Delhi through morning runs, pottery, and community brunches.',
      location: 'Sector 18, Noida',
      avatarTone: 'cream',
      interests: ['fitness', 'art', 'food', 'outdoor-activities'],
    },
    {
      email: 'nikhil@common.in',
      fullName: 'Nikhil Bansal',
      bio: 'Amateur chess player and software engineer who enjoys weekend co-study sessions and park walks.',
      location: 'Indirapuram, Ghaziabad',
      avatarTone: 'sage',
      interests: ['gaming', 'learning', 'sports', 'reading'],
    },
    {
      email: 'ishita@common.in',
      fullName: 'Ishita Roy',
      bio: 'Documentary photographer exploring Old Delhi mornings and architectural geometry.',
      location: 'Jangpura, New Delhi',
      avatarTone: 'earth',
      interests: ['photography', 'travel', 'art', 'food'],
    },
    {
      email: 'arjun@common.in',
      fullName: 'Arjun Kapoor',
      bio: 'Early riser, runner, and weekend cook. Hosting post-run breakfasts near Khan Market.',
      location: 'Jor Bagh, New Delhi',
      avatarTone: 'peach',
      interests: ['fitness', 'sports', 'food', 'outdoor-activities'],
    },
    {
      email: 'kavya@common.in',
      fullName: 'Kavya Iyer',
      bio: 'Linguistics grad running online study hours and bilingual reading groups across Delhi-NCR.',
      location: 'Mayur Vihar, Delhi',
      avatarTone: 'light-sage',
      interests: ['learning', 'reading', 'music', 'gaming'],
    },
    {
      email: 'sid@common.in',
      fullName: 'Siddharth Rao',
      bio: 'Trail hiker and birdwatcher who knows every quiet path in the Aravalli Biodiversity Park.',
      location: 'Sushant Lok, Gurugram',
      avatarTone: 'sage',
      interests: ['outdoor-activities', 'travel', 'photography', 'fitness'],
    },
  ];

  const users: Record<string, string> = {};
  for (const u of userSeeds) {
    const created = await prisma.user.create({
      data: {
        email: u.email,
        passwordHash: demoPasswordHash,
        fullName: u.fullName,
        bio: u.bio,
        location: u.location,
        avatarTone: u.avatarTone,
        role: 'MEMBER',
        interests: {
          create: u.interests.map((slug) => ({
            interestId: interests[slug],
          })),
        },
      },
    });
    users[u.email] = created.id;
  }

  const communitySeeds = [
    {
      name: 'Delhi Photowalk Collective',
      slug: 'delhi-photowalk-collective',
      description: 'Slow weekend photo walks through heritage arches, morning markets, and leafy parks across Delhi-NCR. Film, digital, and phone cameras all welcome.',
      neighborhood: 'Mehrauli & Central Delhi',
      tintColor: 'earth',
      imageUrl: IMAGES.photowalk,
      categorySlug: 'photography',
      memberEmails: ['aarav@common.in', 'ananya@common.in', 'ishita@common.in', 'sana@common.in', 'sid@common.in'],
    },
    {
      name: 'Weekend Aravalli & Central Cyclists',
      slug: 'aravalli-central-cyclists',
      description: 'No-drop sunrise rides through Lutyens boulevards and Aravalli trails, always ending with bun maska and chai.',
      neighborhood: 'India Gate & Gurugram',
      tintColor: 'light-sage',
      imageUrl: IMAGES.cycling,
      categorySlug: 'outdoor-activities',
      memberEmails: ['kabir@common.in', 'vikram@common.in', 'aarav@common.in', 'tara@common.in', 'arjun@common.in'],
    },
    {
      name: 'South Delhi Book & Chai Circle',
      slug: 'south-delhi-book-chai',
      description: 'A calm circle for silent reading picnics, monthly book swaps, and thoughtful conversations over warm chai.',
      neighborhood: 'Lodhi Colony & Hauz Khas',
      tintColor: 'cream',
      imageUrl: IMAGES.boardgames,
      categorySlug: 'reading-learning',
      memberEmails: ['meera@common.in', 'sana@common.in', 'dev@common.in', 'kavya@common.in', 'aarav@common.in'],
    },
    {
      name: 'Lodhi Morning Badminton & Run Club',
      slug: 'lodhi-morning-badminton-run',
      description: 'Friendly morning movement for all skill levels—badminton rallies on grass courts, 5K park loops, and stretching under the trees.',
      neighborhood: 'Lodhi & Nehru Park',
      tintColor: 'sage',
      imageUrl: IMAGES.badminton,
      categorySlug: 'sports-fitness',
      memberEmails: ['kabir@common.in', 'arjun@common.in', 'vikram@common.in', 'tara@common.in', 'nikhil@common.in'],
    },
    {
      name: 'Champa Gali Sketch & Café Society',
      slug: 'champa-gali-sketch-cafe',
      description: 'Bring a notebook, watercolors, or just curiosity. We gather in sunlit garden cafés to draw, sip pour-overs, and unwind.',
      neighborhood: 'Saket & Hauz Khas',
      tintColor: 'peach',
      imageUrl: IMAGES.cafeSketch,
      categorySlug: 'arts-creativity',
      memberEmails: ['meera@common.in', 'priya@common.in', 'rohan@common.in', 'ishita@common.in', 'tara@common.in'],
    },
    {
      name: 'NCR Tabletop & Board Game Guild',
      slug: 'ncr-tabletop-boardgames',
      description: 'Strategy games, cooperative adventures, and beginner-friendly evenings across South Delhi, Noida, and Gurugram.',
      neighborhood: 'Saket & Noida',
      tintColor: 'sage',
      imageUrl: IMAGES.boardgames,
      categorySlug: 'gaming',
      memberEmails: ['rohan@common.in', 'meera@common.in', 'nikhil@common.in', 'kavya@common.in', 'dev@common.in'],
    },
  ];

  const communities: Record<string, string> = {};
  for (const c of communitySeeds) {
    const created = await prisma.community.create({
      data: {
        name: c.name,
        slug: c.slug,
        description: c.description,
        neighborhood: c.neighborhood,
        tintColor: c.tintColor,
        imageUrl: c.imageUrl,
        categoryId: categories[c.categorySlug],
        members: {
          create: c.memberEmails.map((email) => ({ userId: users[email] })),
        },
      },
    });
    communities[c.slug] = created.id;
  }

  const now = new Date();

  const activitySeeds = [
    {
      title: 'Lodhi Garden Morning Walk & Chai',
      description: 'An unhurried 4 km morning walk past the Bara Gumbad and Athpula bridge while the gardens are still cool and quiet. After the loop, we sit on the lawn with flasks of masala chai and get to know one another naturally.',
      activityType: 'IN_PERSON',
      daysOffset: 1,
      startTime: '07:00',
      durationMins: 90,
      location: 'Lodhi Garden Gate 1 (Near Khan Market)',
      neighborhood: 'Lodhi Colony',
      latitude: 28.5931,
      longitude: 77.2197,
      capacity: 18,
      imageUrl: IMAGES.morningWalk,
      tintColor: 'light-sage',
      organiserEmail: 'aarav@common.in',
      categorySlug: 'outdoor-activities',
      communitySlug: 'south-delhi-book-chai',
      participantEmails: ['aarav@common.in', 'meera@common.in', 'sana@common.in', 'arjun@common.in', 'tara@common.in'],
    },
    {
      title: 'Sunday Grass-Court Badminton Rallies',
      description: 'Casual doubles and rotation games on a shaded lawn court at Nehru Park. Bring a racket if you have one—we keep two spare rackets and extra shuttlecocks for newcomers.',
      activityType: 'IN_PERSON',
      daysOffset: 2,
      startTime: '06:45',
      durationMins: 90,
      location: 'Nehru Park East Lawn, Chanakyapuri',
      neighborhood: 'Chanakyapuri',
      latitude: 28.5924,
      longitude: 77.1947,
      capacity: 12,
      imageUrl: IMAGES.badminton,
      tintColor: 'sage',
      organiserEmail: 'kabir@common.in',
      categorySlug: 'sports-fitness',
      communitySlug: 'lodhi-morning-badminton-run',
      participantEmails: ['kabir@common.in', 'arjun@common.in', 'vikram@common.in', 'tara@common.in', 'aarav@common.in'],
    },
    {
      title: 'Sketchbook & Iced Pour-Over Morning',
      description: 'Join a warm wooden table at Champa Gali for two hours of relaxed botanical sketching and cold brew. Beginners who only draw stick figures are wholeheartedly welcome.',
      activityType: 'IN_PERSON',
      daysOffset: 3,
      startTime: '10:30',
      durationMins: 120,
      location: 'Blue Tokai Courtyard, Champa Gali, Saket',
      neighborhood: 'Saket',
      latitude: 28.5194,
      longitude: 77.2022,
      capacity: 10,
      imageUrl: IMAGES.cafeSketch,
      tintColor: 'peach',
      organiserEmail: 'meera@common.in',
      categorySlug: 'arts-creativity',
      communitySlug: 'champa-gali-sketch-cafe',
      participantEmails: ['meera@common.in', 'priya@common.in', 'ishita@common.in', 'tara@common.in'],
    },
    {
      title: 'Mehrauli Golden Hour Film & Street Walk',
      description: 'Explore Jamali Kamali, Balban’s Tomb, and the sandstone arches of Mehrauli Archaeological Park as the afternoon light turns amber. We pause halfway to swap framing tips.',
      activityType: 'IN_PERSON',
      daysOffset: 4,
      startTime: '16:15',
      durationMins: 120,
      location: 'Mehrauli Archaeological Park Main Entrance',
      neighborhood: 'Mehrauli',
      latitude: 28.5227,
      longitude: 77.1855,
      capacity: 14,
      imageUrl: IMAGES.photowalk,
      tintColor: 'earth',
      organiserEmail: 'ishita@common.in',
      categorySlug: 'photography',
      communitySlug: 'delhi-photowalk-collective',
      participantEmails: ['ishita@common.in', 'aarav@common.in', 'ananya@common.in', 'sid@common.in'],
    },
    {
      title: 'Kartavya Path Sunrise Cycling Loop',
      description: 'An easy-paced 18 km loop starting near India Gate, riding down quiet tree-lined Lutyens avenues before traffic wakes up, followed by toast and filter coffee near Connaught Place.',
      activityType: 'IN_PERSON',
      daysOffset: 5,
      startTime: '06:00',
      durationMins: 105,
      location: 'India Gate C-Hexagon North Point',
      neighborhood: 'Central Delhi',
      latitude: 28.6129,
      longitude: 77.2295,
      capacity: 16,
      imageUrl: IMAGES.cycling,
      tintColor: 'light-sage',
      organiserEmail: 'vikram@common.in',
      categorySlug: 'outdoor-activities',
      communitySlug: 'aravalli-central-cyclists',
      participantEmails: ['vikram@common.in', 'kabir@common.in', 'aarav@common.in', 'arjun@common.in'],
    },
    {
      title: 'Strategy Board Games & Chai Evening',
      description: 'Unplug with Wingspan, Azul, Codenames, and Cascadia around sunlit wooden tables. Rules are taught gently at the start of every round.',
      activityType: 'IN_PERSON',
      daysOffset: 6,
      startTime: '17:30',
      durationMins: 150,
      location: 'Unlocked Board Game Café, Shahpur Jat',
      neighborhood: 'Shahpur Jat',
      latitude: 28.5493,
      longitude: 77.2135,
      capacity: 12,
      imageUrl: IMAGES.boardgames,
      tintColor: 'cream',
      organiserEmail: 'rohan@common.in',
      categorySlug: 'gaming',
      communitySlug: 'ncr-tabletop-boardgames',
      participantEmails: ['rohan@common.in', 'meera@common.in', 'nikhil@common.in', 'kavya@common.in'],
    },
    {
      title: 'Silent Reading Picnic at Sundar Nursery',
      description: 'Bring whatever book you are currently reading. We read quietly under the neem trees for 50 minutes, then share one passage or thought that stayed with us.',
      activityType: 'IN_PERSON',
      daysOffset: 7,
      startTime: '09:00',
      durationMins: 110,
      location: 'Sundar Nursery Lotus Pond Lawn',
      neighborhood: 'Nizamuddin',
      latitude: 28.5944,
      longitude: 77.2452,
      capacity: 20,
      imageUrl: IMAGES.boardgames,
      tintColor: 'cream',
      organiserEmail: 'sana@common.in',
      categorySlug: 'reading-learning',
      communitySlug: 'south-delhi-book-chai',
      participantEmails: ['sana@common.in', 'meera@common.in', 'aarav@common.in', 'dev@common.in', 'kavya@common.in'],
    },
    {
      title: 'Weekend Acoustic Jam & Song Circle',
      description: 'Bring an acoustic guitar, ukulele, cajon, or simply your voice. We trade folk, indie, and classic Hindi songs in a shaded Deer Park clearing.',
      activityType: 'IN_PERSON',
      daysOffset: 8,
      startTime: '16:30',
      durationMins: 120,
      location: 'Deer Park Duck Pond Amphitheatre',
      neighborhood: 'Hauz Khas',
      latitude: 28.5570,
      longitude: 77.1930,
      capacity: 15,
      imageUrl: IMAGES.morningWalk,
      tintColor: 'peach',
      organiserEmail: 'dev@common.in',
      categorySlug: 'music',
      communitySlug: null,
      participantEmails: ['dev@common.in', 'kabir@common.in', 'priya@common.in', 'rohan@common.in'],
    },
    {
      title: 'Online Silent Reading & Book Notes Hour',
      description: 'Can’t make it across town? Hop onto a calm 75-minute video room for silent reading with your own tea, followed by 20 minutes of gentle book recommendations.',
      activityType: 'ONLINE',
      daysOffset: 4,
      startTime: '20:00',
      durationMins: 75,
      location: 'Online Video Room (Link shared after joining)',
      neighborhood: 'Online · Delhi-NCR',
      latitude: null,
      longitude: null,
      capacity: 25,
      imageUrl: IMAGES.boardgames,
      tintColor: 'cream',
      organiserEmail: 'kavya@common.in',
      categorySlug: 'reading-learning',
      communitySlug: 'south-delhi-book-chai',
      participantEmails: ['kavya@common.in', 'meera@common.in', 'sana@common.in', 'nikhil@common.in'],
    },
    {
      title: 'Hauz Khas Stepwell & Heritage Trail',
      description: 'A guided peer-led walk weaving through Hauz Khas Complex, lesser-known madrasa arches, and medieval water reservoirs with stories about Delhi’s seven cities.',
      activityType: 'IN_PERSON',
      daysOffset: 9,
      startTime: '08:00',
      durationMins: 120,
      location: 'Hauz Khas Village Monument Gate',
      neighborhood: 'Hauz Khas',
      latitude: 28.5535,
      longitude: 77.1942,
      capacity: 16,
      imageUrl: IMAGES.photowalk,
      tintColor: 'light-sage',
      organiserEmail: 'ananya@common.in',
      categorySlug: 'travel-exploration',
      communitySlug: 'delhi-photowalk-collective',
      participantEmails: ['ananya@common.in', 'aarav@common.in', 'ishita@common.in'],
    },
    {
      title: 'New-in-Delhi Slow Brunch Table',
      description: 'Moved to NCR recently or looking for a grounded weekend table? Eight seats, shared pastries, and warm conversation prompts—no awkward networking pitches.',
      activityType: 'IN_PERSON',
      daysOffset: 10,
      startTime: '11:00',
      durationMins: 120,
      location: 'Perch Coffee Bar, Khan Market',
      neighborhood: 'Khan Market',
      latitude: 28.6001,
      longitude: 77.2270,
      capacity: 8,
      imageUrl: IMAGES.cafeSketch,
      tintColor: 'peach',
      organiserEmail: 'tara@common.in',
      categorySlug: 'social-gatherings',
      communitySlug: null,
      participantEmails: ['tara@common.in', 'meera@common.in', 'arjun@common.in', 'priya@common.in'],
    },
    {
      title: 'Aravalli Biodiversity Park Bird & Trail Walk',
      description: 'An early morning interpretive walk along the scrub forest trails in Gurugram. Binoculars are handy if you have them; sturdy walking shoes recommended.',
      activityType: 'IN_PERSON',
      daysOffset: 11,
      startTime: '06:30',
      durationMins: 120,
      location: 'Aravalli Biodiversity Park Gate, Gurugram',
      neighborhood: 'Gurugram',
      latitude: 28.5042,
      longitude: 77.1520,
      capacity: 14,
      imageUrl: IMAGES.morningWalk,
      tintColor: 'sage',
      organiserEmail: 'sid@common.in',
      categorySlug: 'other-interests',
      communitySlug: null,
      participantEmails: ['sid@common.in', 'sana@common.in', 'kabir@common.in'],
    },
    {
      title: 'Co-Study Pomodoro & Language Practice (Online)',
      description: 'Two 45-minute quiet study/deep-work sprints with a friendly 10-minute check-in between rounds for folks learning new skills or working on personal projects.',
      activityType: 'ONLINE',
      daysOffset: 3,
      startTime: '19:30',
      durationMins: 105,
      location: 'Online Study Circle (Jitsi Room)',
      neighborhood: 'Online · Delhi-NCR',
      latitude: null,
      longitude: null,
      capacity: 20,
      imageUrl: IMAGES.cafeSketch,
      tintColor: 'light-sage',
      organiserEmail: 'kavya@common.in',
      categorySlug: 'education-study',
      communitySlug: null,
      participantEmails: ['kavya@common.in', 'nikhil@common.in', 'ananya@common.in'],
    },
    {
      title: 'Majnu Ka Tila Laphing & Tea Tasting Walk',
      description: 'Explore Tibetan bakeries, small alley bookshops, and riverside prayer flags with a slow tasting stop for butter tea and handmade laphing.',
      activityType: 'IN_PERSON',
      daysOffset: 12,
      startTime: '11:30',
      durationMins: 120,
      location: 'Majnu Ka Tila Footbridge Entrance',
      neighborhood: 'North Delhi',
      latitude: 28.7006,
      longitude: 77.2280,
      capacity: 12,
      imageUrl: IMAGES.cafeSketch,
      tintColor: 'peach',
      organiserEmail: 'priya@common.in',
      categorySlug: 'food-cafes',
      communitySlug: 'champa-gali-sketch-cafe',
      participantEmails: ['priya@common.in', 'dev@common.in', 'ishita@common.in'],
    },
    {
      title: '5K Jahanpanah Forest Morning Run',
      description: 'Conversational pace 5K on soft dirt trails under the forest canopy. Nobody gets left behind, and we stretch together near the stone pavilion afterwards.',
      activityType: 'IN_PERSON',
      daysOffset: 13,
      startTime: '06:30',
      durationMins: 75,
      location: 'Jahanpanah City Forest Gate 2, Chirag Delhi',
      neighborhood: 'South Delhi',
      latitude: 28.5327,
      longitude: 77.2422,
      capacity: 16,
      imageUrl: IMAGES.badminton,
      tintColor: 'sage',
      organiserEmail: 'arjun@common.in',
      categorySlug: 'sports-fitness',
      communitySlug: 'lodhi-morning-badminton-run',
      participantEmails: ['arjun@common.in', 'vikram@common.in', 'tara@common.in', 'kabir@common.in'],
    },
    {
      title: 'Connaught Place Espresso & Zine Making',
      description: 'Fold a 8-page paper zine about your favourite Delhi memory over afternoon coffee. Paper, pens, and scissors provided.',
      activityType: 'IN_PERSON',
      daysOffset: 14,
      startTime: '15:00',
      durationMins: 120,
      location: 'Sardar Patel Marg / CP Outer Circle Café',
      neighborhood: 'Connaught Place',
      latitude: 28.6315,
      longitude: 77.2167,
      capacity: 10,
      imageUrl: IMAGES.cafeSketch,
      tintColor: 'cream',
      organiserEmail: 'priya@common.in',
      categorySlug: 'arts-creativity',
      communitySlug: 'champa-gali-sketch-cafe',
      participantEmails: ['priya@common.in', 'meera@common.in', 'ananya@common.in'],
    },
    {
      title: 'Gurugram CyberHub Evening Chess & Chai',
      description: 'Three wooden chess sets, relaxed 15+10 clocks (or untimed casual boards), and warm cardamom tea on the outdoor deck.',
      activityType: 'IN_PERSON',
      daysOffset: 15,
      startTime: '18:30',
      durationMins: 120,
      location: 'CyberHub Courtyard Amphitheatre, Gurugram',
      neighborhood: 'Gurugram',
      latitude: 28.4950,
      longitude: 77.0895,
      capacity: 12,
      imageUrl: IMAGES.boardgames,
      tintColor: 'sage',
      organiserEmail: 'nikhil@common.in',
      categorySlug: 'gaming',
      communitySlug: 'ncr-tabletop-boardgames',
      participantEmails: ['nikhil@common.in', 'kabir@common.in', 'rohan@common.in'],
    },
    {
      title: 'Noida Sector 18 Pottery & Ceramic Talk',
      description: 'An intimate studio visit and hand-building pinch-pot workshop where everyone shapes a small tea cup to fire later.',
      activityType: 'IN_PERSON',
      daysOffset: 16,
      startTime: '11:00',
      durationMins: 150,
      location: 'Clay & Calm Studio, Sector 18, Noida',
      neighborhood: 'Noida',
      latitude: 28.5708,
      longitude: 77.3261,
      capacity: 8,
      imageUrl: IMAGES.cafeSketch,
      tintColor: 'peach',
      organiserEmail: 'tara@common.in',
      categorySlug: 'arts-creativity',
      communitySlug: null,
      participantEmails: ['tara@common.in', 'meera@common.in', 'priya@common.in'],
    },
    {
      title: 'Evening Acoustic Guitar Feedback Circle (Online)',
      description: 'Share one chord progression or verse you have been practising this week in a supportive virtual listening room.',
      activityType: 'ONLINE',
      daysOffset: 9,
      startTime: '20:30',
      durationMins: 60,
      location: 'Online Listening Room (Audio/Video)',
      neighborhood: 'Online · Delhi-NCR',
      latitude: null,
      longitude: null,
      capacity: 15,
      imageUrl: IMAGES.morningWalk,
      tintColor: 'peach',
      organiserEmail: 'dev@common.in',
      categorySlug: 'music',
      communitySlug: null,
      participantEmails: ['dev@common.in', 'kabir@common.in', 'kavya@common.in'],
    },
    {
      title: 'Qutub Institutional Area Dawn Run & Stretch',
      description: 'A past Saturday session around Sanjay Van edge trails followed by warm stretching and coconut water.',
      activityType: 'IN_PERSON',
      daysOffset: -3,
      startTime: '06:30',
      durationMins: 75,
      location: 'Qutub Institutional Area Trailhead',
      neighborhood: 'Mehrauli',
      latitude: 28.5356,
      longitude: 77.1846,
      capacity: 12,
      imageUrl: IMAGES.badminton,
      tintColor: 'light-sage',
      organiserEmail: 'aarav@common.in',
      categorySlug: 'sports-fitness',
      communitySlug: 'lodhi-morning-badminton-run',
      participantEmails: ['aarav@common.in', 'kabir@common.in', 'arjun@common.in'],
    },
  ];

  const createdActivities: Array<{ id: string; title: string; participantIds: string[]; organiserId: string }> = [];

  for (const act of activitySeeds) {
    const [hh, mm] = act.startTime.split(':').map(Number);
    const activityDate = addDays(now, act.daysOffset, hh, mm);
    const organiserId = users[act.organiserEmail];
    const uniqueParticipants = Array.from(new Set(act.participantEmails));

    const created = await prisma.activity.create({
      data: {
        title: act.title,
        description: act.description,
        activityType: act.activityType,
        date: activityDate,
        startTime: act.startTime,
        durationMins: act.durationMins,
        location: act.location,
        neighborhood: act.neighborhood,
        latitude: act.latitude,
        longitude: act.longitude,
        capacity: act.capacity,
        imageUrl: act.imageUrl,
        tintColor: act.tintColor,
        status: 'ACTIVE',
        organiserId,
        categoryId: categories[act.categorySlug],
        communityId: act.communitySlug ? communities[act.communitySlug] : null,
        participations: {
          create: uniqueParticipants.map((email) => ({
            userId: users[email],
          })),
        },
      },
    });

    createdActivities.push({
      id: created.id,
      title: created.title,
      participantIds: uniqueParticipants.map((e) => users[e]),
      organiserId,
    });
  }

  // Create initial Activity Conversations for the top 3 activities
  for (const act of createdActivities.slice(0, 3)) {
    const conv = await prisma.conversation.create({
      data: {
        type: 'ACTIVITY',
        title: act.title,
        activityId: act.id,
        members: {
          create: act.participantIds.map((userId) => ({ userId })),
        },
      },
    });

    await prisma.message.create({
      data: {
        conversationId: conv.id,
        senderId: act.organiserId,
        content: `Welcome everyone! Looking forward to seeing you at ${act.title}. Feel free to drop a note here if you are running a few minutes late or need directions.`,
      },
    });

    const otherParticipant = act.participantIds.find((id) => id !== act.organiserId);
    if (otherParticipant) {
      await prisma.message.create({
        data: {
          conversationId: conv.id,
          senderId: otherParticipant,
          content: 'Excited for this! Bringing an extra thermos of ginger chai to share afterwards.',
        },
      });
    }
  }

  // Create a 1-to-1 conversation between Aarav and Meera (who share Lodhi Garden walk)
  const directConv = await prisma.conversation.create({
    data: {
      type: 'DIRECT',
      members: {
        create: [
          { userId: users['aarav@common.in'] },
          { userId: users['meera@common.in'] },
        ],
      },
    },
  });

  await prisma.message.createMany({
    data: [
      {
        conversationId: directConv.id,
        senderId: users['meera@common.in'],
        content: 'Hey Aarav! Saw we are both joining the Lodhi Garden walk and the reading circle—do you usually enter from Gate 1 near Khan Market?',
      },
      {
        conversationId: directConv.id,
        senderId: users['aarav@common.in'],
        content: 'Yes! Gate 1 right opposite the parking lane is easiest to spot everyone. See you at 7 AM!',
      },
    ],
  });

  // ==========================================
  // SEED 8 ORGANISED EVENTS (4 PAID ₹199-₹1499 incl. 1 CANCELLED, 4 FREE)
  // ==========================================
  const eventSeeds = [
    {
      title: 'Hauz Khas Courtyard Acoustic Open Mic',
      tagline: 'Lantern-lit courtyard folk, indie originals, and warm spiced kahwa.',
      description:
        'An intimate Sunday evening showcase tucked inside a quiet sandstone courtyard in Hauz Khas Village. Twelve local songwriters and poets share two pieces each, followed by an open-floor singalong and tea by the terrace.',
      activityType: 'IN_PERSON',
      daysOffset: 3,
      startTime: '18:30',
      endTime: '21:15',
      durationMins: 165,
      location: 'Naad Courtyard Terrace, Hauz Khas Village',
      venueName: 'Naad Courtyard Terrace',
      fullAddress: '24A Hauz Khas Village, Deer Park Lane, New Delhi 110016',
      neighborhood: 'Hauz Khas',
      latitude: 28.5538,
      longitude: 77.1948,
      capacity: 40,
      imageUrl: IMAGES.openMic,
      tintColor: 'peach',
      hostName: 'Devansh Joshi & Raga Collective',
      refundPolicy: 'Full refund up to 24 hours before the gathering. Ticket transfers to a friend are always welcome.',
      status: 'ACTIVE',
      organiserEmail: 'dev@common.in',
      categorySlug: 'music',
      communitySlug: null,
      participantEmails: ['dev@common.in', 'aarav@common.in', 'meera@common.in', 'priya@common.in', 'kabir@common.in'],
      agenda: [
        { time: '18:30', title: 'Doors open & warm kahwa', description: 'Settle onto floor cushions and meet fellow listeners.' },
        { time: '19:00', title: 'First acoustic set (6 artists)', description: 'Originals, folk covers, and spoken word.' },
        { time: '20:00', title: 'Tea pause & instrument swap', description: 'Chai break and informal conversations.' },
        { time: '20:20', title: 'Second set & community chorus', description: 'Closing acoustic circle under string lights.' },
      ],
      tiers: [
        { name: 'Early Bird', description: 'Includes entry and a cup of Kashmiri kahwa.', priceInr: 199, quantity: 15 },
        { name: 'General', description: 'Standard courtyard seating.', priceInr: 349, quantity: 20 },
        { name: 'Couple Pass', description: 'Admits two together with two warm beverages.', priceInr: 649, quantity: 5 },
      ],
    },
    {
      title: 'Sundar Nursery Artisanal Food & Chai Table',
      tagline: 'Seasonal Delhi winter bakes, regional teas, and long garden tables.',
      description:
        'A curated morning culinary gathering under the neem canopy at Sundar Nursery. Sample small-batch sourdough, cardamom buns, Assam first-flush tastings, and millet bowls made by neighbourhood home bakers.',
      activityType: 'IN_PERSON',
      daysOffset: 5,
      startTime: '09:30',
      endTime: '12:30',
      durationMins: 180,
      location: 'Sundar Nursery Amphitheatre Lawn, Nizamuddin',
      venueName: 'Sundar Nursery Pavilion Lawn',
      fullAddress: 'Bharat Scouts and Guides Marg, Nizamuddin West, New Delhi 110013',
      neighborhood: 'Nizamuddin',
      latitude: 28.5951,
      longitude: 77.2462,
      capacity: 36,
      imageUrl: IMAGES.foodMarket,
      tintColor: 'earth',
      hostName: 'Tara Deshmukh & Priya Menon',
      refundPolicy: '100% refundable up to 48 hours prior. Because bakers prep ingredients fresh, cancellations within 48 hours are non-refundable.',
      status: 'ACTIVE',
      organiserEmail: 'tara@common.in',
      categorySlug: 'food-cafes',
      communitySlug: 'champa-gali-sketch-cafe',
      participantEmails: ['tara@common.in', 'priya@common.in', 'meera@common.in', 'aarav@common.in', 'sana@common.in'],
      agenda: [
        { time: '09:30', title: 'Welcome iced hibiscus & table seating', description: 'Pick your tasting card and greet your table.' },
        { time: '10:00', title: 'Artisanal sourdough & winter preserve flight', description: 'Tasting led by three local micro-bakers.' },
        { time: '11:10', title: 'Single-origin chai & filter coffee pairing', description: 'Brewing notes and relaxed garden stroll.' },
      ],
      tiers: [
        { name: 'Early Bird Tasting', description: 'Full tasting flight + 2 beverage pairings.', priceInr: 499, quantity: 12 },
        { name: 'General Table', description: 'Full tasting flight + pastry box to take home.', priceInr: 799, quantity: 18 },
        { name: 'Couple Table', description: 'Two full tasting passes seated together.', priceInr: 1499, quantity: 6 },
      ],
    },
    {
      title: 'Aravalli Sunrise Ridge Trek & Breakfast',
      tagline: 'Guided 7 km quartz ridge trail at first light with millet porridge afterwards.',
      description:
        'Beat the city noise with a guided sunrise ascent along the Mangar-Aravalli quartzite ridge. Led by naturalist Siddharth Rao, we stop at two panoramic overlooks to spot peacocks and raptors before sharing a warm outdoor breakfast.',
      activityType: 'IN_PERSON',
      daysOffset: 6,
      startTime: '05:45',
      endTime: '09:30',
      durationMins: 225,
      location: 'Aravalli Mangar Trailhead, Faridabad-Gurugram Road',
      venueName: 'Aravalli Ridge Conservation Trailhead',
      fullAddress: 'Mangar Bani Forest Edge Road, Sector 42 Link, Gurugram 122009',
      neighborhood: 'Gurugram',
      latitude: 28.4422,
      longitude: 77.1296,
      capacity: 24,
      imageUrl: IMAGES.sunriseTrek,
      tintColor: 'sage',
      hostName: 'Siddharth Rao',
      refundPolicy: 'Full refund if weather forces a reschedule or if you cancel at least 24 hours before trail start.',
      status: 'ACTIVE',
      organiserEmail: 'sid@common.in',
      categorySlug: 'outdoor-activities',
      communitySlug: null,
      participantEmails: ['sid@common.in', 'kabir@common.in', 'vikram@common.in', 'aarav@common.in', 'arjun@common.in'],
      agenda: [
        { time: '05:45', title: 'Trailhead briefing & hydration check', description: 'Meet at the trail marker and warm up.' },
        { time: '06:05', title: 'Quartz ridge climb to Sunrise Point', description: 'Steady 3.5 km trail through dhok forest.' },
        { time: '07:45', title: 'Birdwatching & quiet ridge pause', description: 'Binocular sharing and morning light.' },
        { time: '08:30', title: 'Outdoor breakfast picnic', description: 'Warm porridge, fruit, and ginger tea.' },
      ],
      tiers: [
        { name: 'Early Bird Walker', description: 'Guided trek + trail breakfast.', priceInr: 299, quantity: 10 },
        { name: 'General Trek Pass', description: 'Guided trek + trail breakfast + binocular loan.', priceInr: 449, quantity: 14 },
      ],
    },
    {
      title: 'Lodhi Lawns Evening Vinyl & Jazz Listening Session',
      tagline: 'Warm outdoor hi-fi listening on picnic rugs as dusk settles over the palms.',
      description:
        'We set up a battery-powered vintage turntable rig beneath the palm avenue at Lodhi Garden and listen end-to-end to two classic jazz & Hindustani fusion records without phones or chatter during the A-side.',
      activityType: 'IN_PERSON',
      daysOffset: 4,
      startTime: '17:00',
      endTime: '19:15',
      durationMins: 135,
      location: 'Lodhi Garden Palm Avenue Lawn (Near Gate 4)',
      venueName: 'Lodhi Garden Palm Avenue',
      fullAddress: 'Lodhi Road, Opposite Amrita Shergill Marg Gate 4, New Delhi 110003',
      neighborhood: 'Lodhi Colony',
      latitude: 28.5919,
      longitude: 77.2225,
      capacity: 30,
      imageUrl: IMAGES.morningWalk,
      tintColor: 'light-sage',
      hostName: 'Devansh Joshi',
      refundPolicy: 'Free community event—if your plans change, release your ticket so a neighbour on the waitlist can join.',
      status: 'ACTIVE',
      organiserEmail: 'dev@common.in',
      categorySlug: 'music',
      communitySlug: null,
      participantEmails: ['dev@common.in', 'meera@common.in', 'aarav@common.in', 'sana@common.in'],
      agenda: [
        { time: '17:00', title: 'Picnic rug setup & crate browsing', description: 'Flip through guest vinyl sleeves.' },
        { time: '17:30', title: 'Deep listening: Side A & Side B', description: '45 minutes of uninterrupted vinyl playback.' },
        { time: '18:20', title: 'Liner notes chat & chai', description: 'Share favourite tracks and stories.' },
      ],
      tiers: [
        { name: 'Free Lawn Pass', description: 'Bring a mat or cushion and join the circle.', priceInr: 0, quantity: 30 },
      ],
    },
    {
      title: 'Nehru Park Sunday Community Book Swap & Picnic',
      tagline: 'Bring two pre-loved books, leave with two new stories and three new friends.',
      description:
        'An open-air literary picnic celebrating slow reading in Delhi. Wrap two books you adored in kraft paper with a handwritten note about why they stayed with you, then browse the picnic blankets for your next read.',
      activityType: 'IN_PERSON',
      daysOffset: 7,
      startTime: '10:00',
      endTime: '12:30',
      durationMins: 150,
      location: 'Nehru Park Rose Garden Lawn, Chanakyapuri',
      venueName: 'Nehru Park Rose Garden Lawn',
      fullAddress: 'Vinay Marg, Chanakyapuri Diplomatic Enclave, New Delhi 110021',
      neighborhood: 'Chanakyapuri',
      latitude: 28.5912,
      longitude: 77.1932,
      capacity: 45,
      imageUrl: IMAGES.boardgames,
      tintColor: 'cream',
      hostName: 'Sana Khan & South Delhi Book Circle',
      refundPolicy: 'Free gathering. Please cancel your ticket at least 4 hours ahead if you cannot attend.',
      status: 'ACTIVE',
      organiserEmail: 'sana@common.in',
      categorySlug: 'reading-learning',
      communitySlug: 'south-delhi-book-chai',
      participantEmails: ['sana@common.in', 'meera@common.in', 'kavya@common.in', 'aarav@common.in'],
      agenda: [
        { time: '10:00', title: 'Book drop & kraft-paper notes', description: 'Place your wrapped books on the genre mats.' },
        { time: '10:40', title: 'Slow browsing & 20-min reading huddle', description: 'Read the opening chapter together.' },
        { time: '11:30', title: 'Open book circle recommendations', description: 'Optional 1-minute pitches of books you love.' },
      ],
      tiers: [
        { name: 'Reader Pass (Free)', description: 'Includes entry to the swap tables.', priceInr: 0, quantity: 45 },
      ],
    },
    {
      title: 'Online Delhi-NCR Indie Zine & Poetry Evening',
      tagline: 'Calm Saturday night virtual salon for spoken word, essays, and visual zines.',
      description:
        'Join from your study desk with a mug of chamomile or chai. Writers, sketchers, and curious listeners across Delhi-NCR gather for an unhurried showcase of short poetry, notebook spreads, and gentle feedback.',
      activityType: 'ONLINE',
      daysOffset: 9,
      startTime: '20:00',
      endTime: '21:30',
      durationMins: 90,
      location: 'Online Salon Room (Link unlocked with ticket)',
      venueName: 'COMMON Virtual Salon',
      fullAddress: 'Online Video Room · Link sent in activity chat',
      neighborhood: 'Online · Delhi-NCR',
      latitude: null,
      longitude: null,
      capacity: 50,
      imageUrl: IMAGES.cafeSketch,
      tintColor: 'peach',
      hostName: 'Kavya Iyer',
      refundPolicy: 'Free online event. Ticket confirms your room seat and reading slot.',
      status: 'ACTIVE',
      organiserEmail: 'kavya@common.in',
      categorySlug: 'arts-creativity',
      communitySlug: 'south-delhi-book-chai',
      participantEmails: ['kavya@common.in', 'meera@common.in', 'dev@common.in'],
      agenda: [
        { time: '20:00', title: 'Gentle check-in & prompts', description: 'Meet everyone in the room.' },
        { time: '20:15', title: 'Poetry & essay readings', description: '5-minute reader slots.' },
        { time: '21:00', title: 'Open notebook show-and-tell', description: 'Share sketches or zine spreads.' },
      ],
      tiers: [
        { name: 'Listener Seat (Free)', description: 'Join to listen and share feedback.', priceInr: 0, quantity: 35 },
        { name: 'Reader Slot (Free)', description: 'Reserve a 5-minute reading spot.', priceInr: 0, quantity: 15 },
      ],
    },
    {
      title: 'Connaught Place Monsoon Ceramic & Terracotta Fair',
      tagline: 'Rescheduled due to courtyard maintenance — all paid tickets automatically refunded.',
      description:
        'An evening potter’s wheel showcase and terracotta glaze market near Janpath Courtyard. Due to unexpected courtyard resurfacing work this week, this edition has been cancelled and all ticket holders have been issued full refunds.',
      activityType: 'IN_PERSON',
      daysOffset: 10,
      startTime: '16:00',
      endTime: '19:30',
      durationMins: 210,
      location: 'Janpath Heritage Courtyard, Connaught Place',
      venueName: 'Janpath Heritage Courtyard',
      fullAddress: '18 Janpath Lane, Connaught Place, New Delhi 110001',
      neighborhood: 'Connaught Place',
      latitude: 28.6289,
      longitude: 77.2194,
      capacity: 30,
      imageUrl: IMAGES.cafeSketch,
      tintColor: 'cream',
      hostName: 'Priya Menon',
      refundPolicy: 'Automatic 100% refund upon organiser cancellation.',
      status: 'CANCELLED',
      organiserEmail: 'priya@common.in',
      categorySlug: 'arts-creativity',
      communitySlug: null,
      participantEmails: ['priya@common.in', 'aarav@common.in', 'meera@common.in'],
      agenda: [
        { time: '16:00', title: 'Clay wheel demonstration', description: 'Intro to stoneware throwing.' },
        { time: '17:30', title: 'Tea & craft table', description: 'Glaze swatches and artisan Q&A.' },
      ],
      tiers: [
        { name: 'General Craft Pass', description: 'Includes clay hand-building kit.', priceInr: 349, quantity: 30 },
      ],
    },
    {
      title: 'India Gate Dawn Heritage & Architecture Walk',
      tagline: 'Early morning walk examining sandstone colonnades and Edwin Lutyens’ city axis.',
      description:
        'Meet before the city traffic builds for a calm 90-minute walk led by urban historian Ananya Gupta, tracing symmetry, water channels, and red-sandstone craft around Central Vista.',
      activityType: 'IN_PERSON',
      daysOffset: -2,
      startTime: '06:45',
      endTime: '08:15',
      durationMins: 90,
      location: 'National War Memorial Outer Lawn, India Gate',
      venueName: 'India Gate East Plaza',
      fullAddress: 'Kartavya Path East Plaza, New Delhi 110001',
      neighborhood: 'Central Delhi',
      latitude: 28.6129,
      longitude: 77.2295,
      capacity: 25,
      imageUrl: IMAGES.photowalk,
      tintColor: 'light-sage',
      hostName: 'Ananya Gupta',
      refundPolicy: 'Free community heritage event.',
      status: 'ACTIVE',
      organiserEmail: 'ananya@common.in',
      categorySlug: 'travel-exploration',
      communitySlug: null,
      participantEmails: ['ananya@common.in', 'aarav@common.in', 'kabir@common.in'],
      agenda: [
        { time: '06:45', title: 'East Plaza meet-up', description: 'Maps and morning orientation.' },
        { time: '07:05', title: 'Canopy & sandstone arch walk', description: 'Stories from 1921–1931.' },
      ],
      tiers: [
        { name: 'Free Walk Ticket', description: 'Open to all curious walkers.', priceInr: 0, quantity: 25 },
      ],
    },
  ];

  const createdEvents: Array<{
    id: string;
    title: string;
    tiers: Array<{ id: string; name: string; priceInr: number }>;
  }> = [];

  for (const ev of eventSeeds) {
    const [hh, mm] = ev.startTime.split(':').map(Number);
    const eventDate = addDays(now, ev.daysOffset, hh, mm);
    const [eh, em] = ev.endTime.split(':').map(Number);
    const eventEndDate = addDays(now, ev.daysOffset, eh, em);
    const organiserId = users[ev.organiserEmail];
    const uniqueParticipants = Array.from(new Set(ev.participantEmails));

    const created = await prisma.activity.create({
      data: {
        kind: 'EVENT',
        title: ev.title,
        tagline: ev.tagline,
        description: ev.description,
        activityType: ev.activityType,
        date: eventDate,
        startTime: ev.startTime,
        endDate: eventEndDate,
        endTime: ev.endTime,
        durationMins: ev.durationMins,
        location: ev.location,
        venueName: ev.venueName,
        fullAddress: ev.fullAddress,
        neighborhood: ev.neighborhood,
        latitude: ev.latitude,
        longitude: ev.longitude,
        capacity: ev.capacity,
        imageUrl: ev.imageUrl,
        tintColor: ev.tintColor,
        hostName: ev.hostName,
        refundPolicy: ev.refundPolicy,
        status: ev.status,
        organiserId,
        categoryId: categories[ev.categorySlug],
        communityId: ev.communitySlug ? communities[ev.communitySlug] : null,
        participations: {
          create: uniqueParticipants.map((email) => ({ userId: users[email] })),
        },
        agendaItems: {
          create: ev.agenda.map((item, idx) => ({
            time: item.time,
            title: item.title,
            description: item.description,
            sortOrder: idx,
          })),
        },
        ticketTiers: {
          create: ev.tiers.map((tier, idx) => ({
            name: tier.name,
            description: tier.description,
            priceInr: tier.priceInr,
            quantity: tier.quantity,
            sortOrder: idx,
          })),
        },
      },
      include: { ticketTiers: { orderBy: { sortOrder: 'asc' } } },
    });

    createdEvents.push({
      id: created.id,
      title: created.title,
      tiers: created.ticketTiers.map((t) => ({ id: t.id, name: t.name, priceInr: t.priceInr })),
    });
  }

  // Create sample Orders & Tickets for demo accounts (aarav, meera, kabir)
  const openMic = createdEvents[0];
  const foodMarket = createdEvents[1];
  const sunriseTrek = createdEvents[2];
  const vinylSession = createdEvents[3];
  const cancelledTerracotta = createdEvents[6];
  const pastHeritageWalk = createdEvents[7];

  const sampleTicketSpecs = [
    {
      userEmail: 'aarav@common.in',
      event: openMic,
      tierIndex: 0,
      qty: 2,
      paymentMethod: 'UPI',
      orderStatus: 'PAID',
      ticketStatus: 'VALID',
      orderNumber: 'ORD-2604-8101',
      codes: ['CMN-OPEN-401A', 'CMN-OPEN-401B'],
    },
    {
      userEmail: 'meera@common.in',
      event: foodMarket,
      tierIndex: 1,
      qty: 1,
      paymentMethod: 'CARD',
      orderStatus: 'PAID',
      ticketStatus: 'VALID',
      orderNumber: 'ORD-2604-8102',
      codes: ['CMN-FOOD-502A'],
    },
    {
      userEmail: 'kabir@common.in',
      event: sunriseTrek,
      tierIndex: 0,
      qty: 1,
      paymentMethod: 'UPI',
      orderStatus: 'PAID',
      ticketStatus: 'VALID',
      orderNumber: 'ORD-2604-8103',
      codes: ['CMN-TREK-603A'],
    },
    {
      userEmail: 'aarav@common.in',
      event: vinylSession,
      tierIndex: 0,
      qty: 1,
      paymentMethod: 'FREE',
      orderStatus: 'PAID',
      ticketStatus: 'VALID',
      orderNumber: 'ORD-2604-8104',
      codes: ['CMN-VINL-704A'],
    },
    {
      userEmail: 'aarav@common.in',
      event: cancelledTerracotta,
      tierIndex: 0,
      qty: 1,
      paymentMethod: 'NETBANKING',
      orderStatus: 'REFUNDED',
      ticketStatus: 'REFUNDED',
      orderNumber: 'ORD-2604-8105',
      codes: ['CMN-CLAY-805A'],
    },
    {
      userEmail: 'meera@common.in',
      event: cancelledTerracotta,
      tierIndex: 0,
      qty: 1,
      paymentMethod: 'UPI',
      orderStatus: 'REFUNDED',
      ticketStatus: 'REFUNDED',
      orderNumber: 'ORD-2604-8106',
      codes: ['CMN-CLAY-806A'],
    },
    {
      userEmail: 'aarav@common.in',
      event: pastHeritageWalk,
      tierIndex: 0,
      qty: 1,
      paymentMethod: 'FREE',
      orderStatus: 'PAID',
      ticketStatus: 'USED',
      orderNumber: 'ORD-2604-8107',
      codes: ['CMN-HERI-907A'],
    },
  ];

  for (let i = 0; i < sampleTicketSpecs.length; i++) {
    const spec = sampleTicketSpecs[i];
    const tier = spec.event.tiers[spec.tierIndex] || spec.event.tiers[0];
    if (!tier) continue;

    const order = await prisma.order.create({
      data: {
        orderNumber: spec.orderNumber,
        idempotencyKey: `seed-${spec.orderNumber}`,
        userId: users[spec.userEmail],
        activityId: spec.event.id,
        tierId: tier.id,
        quantity: spec.qty,
        unitPriceInr: tier.priceInr,
        totalAmountInr: tier.priceInr * spec.qty,
        paymentMethod: spec.paymentMethod,
        status: spec.orderStatus,
      },
    });

    for (const code of spec.codes) {
      await prisma.ticket.create({
        data: {
          code,
          activityId: spec.event.id,
          ownerId: users[spec.userEmail],
          tierId: tier.id,
          orderId: order.id,
          pricePaidInr: tier.priceInr,
          status: spec.ticketStatus,
          usedAt: spec.ticketStatus === 'USED' ? new Date() : null,
        },
      });
    }
  }
}

// Allow running directly via `npx tsx prisma/seed.ts`
const isMain = process.argv[1] && process.argv[1].endsWith('seed.ts');
if (isMain) {
  seedDatabase(true)
    .then(async () => {
      console.log('Seeded COMMON database with 15 users, 12 categories, 6 communities, 20 activities, 8 Delhi-NCR events, and sample tickets.');
      await prisma.$disconnect();
    })
    .catch(async (err) => {
      console.error('Seed error:', err);
      await prisma.$disconnect();
      process.exit(1);
    });
}


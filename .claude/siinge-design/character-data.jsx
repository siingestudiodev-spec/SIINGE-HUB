// character-data.jsx
// The roster: 4 elemental love interests for the visual novel.
// Each one is an ORIGINAL design — shared anime aesthetic, distinct vibe.

const ROSTER = [
  // ── FIRE ──────────────────────────────────────────────────────
  {
    id: 'ch_01_ember',
    name: 'Seraphine',
    kanji: '焔姫 · HONOO-HIME',
    epithet: 'The Ember Princess',
    element: 'Fire · 炎',
    pose: 'weapon',
    accent: '#ff6b3d',
    deep: '#2a0e0a',
    palette: ['#0f0604', '#4a1208', '#b8321a', '#ff6b3d', '#ffd49a'],
    tagline: 'You smell nice. Let me ruin that.',
    lore:
      'Former heiress of a crumbling volcano shrine, Seraphine skipped her coronation to run a late-night noodle stall instead. She claims the shrine politics bored her, but anyone who compliments her cooking gets a blush she tries to burn away by lighting something on fire. Intensely loyal. Aggressively flirty. Absolutely cannot whisper.',
    vitals: [
      { label: 'Age', value: 'Appears 19' },
      { label: 'Height', value: '168 cm' },
      { label: 'Origin', value: 'Kazan Shrine' },
      { label: 'Likes', value: 'Spicy food, thunder' },
      { label: 'Dislikes', value: 'Being ignored' },
      { label: 'Route', value: 'Tsundere · Hot' },
    ],
    traits: ['loud', 'protective', 'prideful', 'secretly soft', 'competitive', 'bad at lying'],
    outfits: [
      {
        name: 'Shrine Formal',
        tint: '#5a1a10',
        desc: 'Red hakama with asymmetric sleeves, gold sash, ceremonial ember-blade on her hip.',
      },
      {
        name: 'Off-Duty',
        tint: '#7a2818',
        desc: 'Oversized black hoodie (stolen from MC), cutoff shorts, thermal-patterned stockings.',
      },
      {
        name: 'Battle Regalia',
        tint: '#3a0e08',
        desc: 'Armored crimson kimono with cracked-lava inlay, floating ember motes, twin-tailed flame whip.',
      },
    ],
    quote: 'Don\'t stare. I\'ll melt something important and I\'m bad at aiming.',
    prompt: `anime visual novel character sprite, original character "Seraphine the Ember Princess",
young woman, long wavy crimson-orange hair with molten highlights,
amber eyes with vertical slit pupils, delicate curved horns of
cooling obsidian, pointed fox-like ears, sun-kissed skin,
confident mischievous smirk, wearing a layered red and black
kimono-inspired outfit with gold trim and asymmetric sleeves,
ember motes floating around her, holding a long flame-forged
whip that coils in the air, standing in a dim shrine courtyard
at dusk with cracked lava veins under the stones,
full body vertical composition 2:3, cel-shaded anime illustration,
dramatic rim lighting from warm fire below, crimson-orange and
deep black palette with gold accents, ultra detailed character
design, clean line art, painterly soft shadows, no borders`,
  },

  // ── ICE ───────────────────────────────────────────────────────
  {
    id: 'ch_02_glacia',
    name: 'Yuki-ra',
    kanji: '雪羅 · YUKI-RA',
    epithet: 'The Still Librarian',
    element: 'Ice · 氷',
    pose: 'standing',
    accent: '#7ec8e3',
    deep: '#0a1420',
    palette: ['#050a12', '#132a3e', '#3a7aa5', '#7ec8e3', '#d8eef8'],
    tagline: 'Page 42. You were going to ask about page 42.',
    lore:
      'Curator of a drifting library that surfaces above a frozen sea on nights with no moon. Yuki-ra speaks in complete sentences, never more. Her stillness is not shyness — it\'s calculation, because she already read the last three things you were going to say. She keeps a single flower pressed in chapter seven of a book nobody has ever returned.',
    vitals: [
      { label: 'Age', value: '"Older than the book"' },
      { label: 'Height', value: '172 cm' },
      { label: 'Origin', value: 'Drift Library' },
      { label: 'Likes', value: 'Hot cocoa, silence' },
      { label: 'Dislikes', value: 'Interruptions' },
      { label: 'Route', value: 'Kuudere · Cold' },
    ],
    traits: ['deadpan', 'observant', 'precise', 'softly flirty', 'touch-starved', 'bone-dry humor'],
    outfits: [
      {
        name: 'Library Standard',
        tint: '#1a3a55',
        desc: 'High-collared navy coat-dress, silver clasps, reading glasses on a long chain.',
      },
      {
        name: 'Tea Night',
        tint: '#2a4a65',
        desc: 'Oversized turtleneck sweater-dress, thigh-highs with subtle snowflake pattern, bare feet.',
      },
      {
        name: 'Deep Archive',
        tint: '#0a2035',
        desc: 'Ceremonial ice-priestess robes, crystalline antler circlet, a staff of frozen pages.',
      },
    ],
    quote: 'I have already calculated the ways this ends. You are in seven of them.',
    prompt: `anime visual novel character sprite, original character "Yuki-ra the Still Librarian",
young woman, long straight silver-white hair falling past waist,
pale ice-blue eyes with a calm half-lidded expression, faint
snowflake-shaped pupils, translucent crystalline antler ornaments
woven into her hair, porcelain skin with subtle cool undertones,
subtle knowing half-smile, wearing a high-collared navy blue
coat-dress with silver clasps and long sleeves that cover her
hands, reading glasses hanging from a silver chain, holding a
thick leather book with frost crystals growing off the pages,
standing in a moonlit library of tall shelves with floating ice
motes and books drifting weightlessly, full body vertical
composition 2:3, cel-shaded anime illustration, cool moonlight
key light, icy blue and deep navy palette with silver highlights,
ultra detailed character design, soft painterly shading, no borders`,
  },

  // ── LIGHT ─────────────────────────────────────────────────────
  {
    id: 'ch_03_solis',
    name: 'Aurienne',
    kanji: '陽鈴 · HIRIN',
    epithet: 'The Pocketful of Suns',
    element: 'Light · 光',
    pose: 'floating',
    accent: '#ffd86b',
    deep: '#2a1e05',
    palette: ['#1a1405', '#4a3a15', '#c99a2a', '#ffd86b', '#fff4cc'],
    tagline: 'Oh hi. You look like you haven\'t been hugged in a week.',
    lore:
      'Raised in a hilltop chapel that rings its bells at sunrise and sunset, Aurienne ran away at seventeen with a backpack full of stolen candles and a conviction that everyone she meets is quietly going through something. She\'s warm without being naive — she notices every micro-expression and she will call you out, gently, over tea. Carries an absurd number of snacks at all times.',
    vitals: [
      { label: 'Age', value: '20' },
      { label: 'Height', value: '162 cm' },
      { label: 'Origin', value: 'Dawnbell Chapel' },
      { label: 'Likes', value: 'Sunrises, soft bread' },
      { label: 'Dislikes', value: 'Cruelty, cold tea' },
      { label: 'Route', value: 'Deredere · Warm' },
    ],
    traits: ['warm', 'perceptive', 'playful', 'gently teasing', 'stubborn', 'kindness = armor'],
    outfits: [
      {
        name: 'Chapel Casual',
        tint: '#6a5020',
        desc: 'Cream blouse with puffed sleeves, long tiered skirt, a brass pendant that hums faintly.',
      },
      {
        name: 'Summer Break',
        tint: '#8a6a25',
        desc: 'Yellow sundress with daisy embroidery, straw hat, sandals — carries sunscreen for you.',
      },
      {
        name: 'Dawnbringer',
        tint: '#4a3810',
        desc: 'White and gold priestess regalia, halo-ring above her head, a chime-staff that rings on strike.',
      },
    ],
    quote: 'You don\'t have to perform for me. I brought enough snacks for the sad version too.',
    prompt: `anime visual novel character sprite, original character "Aurienne the Dawnbringer",
young woman, shoulder-length soft golden-blonde hair with loose
waves and small braided strands, warm amber eyes with a gentle
smile, a soft glowing halo ring floating just above her head,
peach-toned skin with a light freckling across the nose, inviting
teasing smile, wearing a cream and soft gold blouse with puffed
sleeves and a long tiered skirt with subtle sunburst embroidery,
a small brass pendant at her throat, holding a paper lantern
that glows warm yellow, standing on a grassy hillside at
sunrise with wildflowers and a distant chapel silhouette,
full body vertical composition 2:3, cel-shaded anime illustration,
warm golden-hour key light, honey-gold and cream palette with
soft white highlights, ultra detailed character design, painterly
soft shading, no borders`,
  },

  // ── SHADOW ────────────────────────────────────────────────────
  {
    id: 'ch_04_noctis',
    name: 'Vespera',
    kanji: '黒薔 · KOKU-BARA',
    epithet: 'The Quiet Hour',
    element: 'Shadow · 影',
    pose: 'contrapposto',
    accent: '#b28dff',
    deep: '#18102a',
    palette: ['#07050f', '#1c1330', '#5a3c8c', '#b28dff', '#e6dcff'],
    tagline: 'I don\'t steal hearts. They just follow me home.',
    lore:
      'Nightshade florist by day, something much harder to name after midnight. Vespera runs a shop on a crooked street where the streetlights flicker politely around her. She teases everyone with the same soft, tired smile, but if she ever stops teasing you, that\'s how you know. She keeps a black cat that nobody else can see, and a list of names she\'s been meaning to forgive.',
    vitals: [
      { label: 'Age', value: '"Late 20s"' },
      { label: 'Height', value: '175 cm' },
      { label: 'Origin', value: 'Crooked Street' },
      { label: 'Likes', value: 'Insomnia, jazz' },
      { label: 'Dislikes', value: 'Sincere compliments' },
      { label: 'Route', value: 'Onee-san · Sly' },
    ],
    traits: ['sultry', 'guarded', 'dryly funny', 'emotionally precise', 'stays up too late', 'means it'],
    outfits: [
      {
        name: 'Florist Day',
        tint: '#352255',
        desc: 'Black button-up tucked into a plum pencil skirt, linen apron, sleeves rolled, stem shears.',
      },
      {
        name: 'Midnight Off',
        tint: '#4a3070',
        desc: 'Silk slip, oversized cardigan slipping off one shoulder, cigarette that she never actually lights.',
      },
      {
        name: 'Quiet Hour',
        tint: '#1f1538',
        desc: 'Sheer black layered robe with star-pattern veil, violet crescent mark on her brow, shadow-cat at heel.',
      },
    ],
    quote: 'Most people want me to be their mystery. You just keep asking if I\'ve eaten.',
    prompt: `anime visual novel character sprite, original character "Vespera the Quiet Hour",
young woman, long straight dark violet hair with a single pale
streak, sharp half-lidded eyes in deep purple, sly tired smile,
small crescent-moon mark on her forehead, cool pale skin with
faint violet undertones, wearing a sheer black layered evening
robe with subtle star-pattern embroidery over a dark plum
slip, dark stockings, long slim black ribbon choker, a translucent
shadow-cat coiling around her legs, holding a single black rose
with petals dissolving into wisps of purple smoke,
standing on a quiet cobblestone street at night with warm
yellow streetlamps flickering and neon shop signs reflected in
puddles, full body vertical composition 2:3, cel-shaded anime
illustration, cool violet rim light with warm amber fill,
deep indigo and soft violet palette with pale lavender highlights,
ultra detailed character design, painterly moody shading, no borders`,
  },
];

window.ROSTER = ROSTER;

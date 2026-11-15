import type { Category, Product, StoreSettings } from '../types/store';

export const STARTER_CATEGORIES: Omit<Category, 'createdAt' | 'updatedAt'>[] = [
  {
    id: 'cat_ceramics',
    name: 'Ceramics',
    slug: 'ceramics',
    description: 'Wheel-thrown stoneware amphoras, vessels, and raw mineral glazes.',
    imageUrl: '/src/assets/images/prod_vase_charcoal_1794762917830.jpg',
    displayOrder: 1,
  },
  {
    id: 'cat_lighting',
    name: 'Lighting',
    slug: 'lighting',
    description: 'Alabaster, honed travertine, and hand-patinated brass table lamps.',
    imageUrl: '/src/assets/images/prod_lamp_brass_1794762919080.jpg',
    displayOrder: 2,
  },
  {
    id: 'cat_textiles',
    name: 'Textiles',
    slug: 'textiles',
    description: 'Small-batch hand-loomed Belgian linen and raw wool throws.',
    imageUrl: '/src/assets/images/prod_throw_oatmeal_1794762919383.jpg',
    displayOrder: 3,
  },
  {
    id: 'cat_wood_brass',
    name: 'Wood & Brass',
    slug: 'wood-brass',
    description: 'Hand-carved Indian walnut pedestals and architectural brass objects.',
    imageUrl: '/src/assets/images/prod_bowl_walnut_1794762920427.jpg',
    displayOrder: 4,
  },
];

export const STARTER_PRODUCTS: Omit<Product, 'createdAt' | 'updatedAt'>[] = [
  {
    id: 'prod_amphora_vessel',
    name: 'Kora Hand-Thrown Stoneware Amphora',
    slug: 'kora-hand-thrown-stoneware-amphora',
    description:
      'Individually thrown on a slow wheel by master potters using mineral-rich stoneware clay, kiln-fired twice to achieve a tactile matte finish that anchors entry consoles and dining tables.',
    category: 'Ceramics',
    price: 6800,
    discountPrice: 5900,
    images: [
      '/src/assets/images/prod_vase_charcoal_1794762917830.jpg',
      '/src/assets/images/prod_vase_sand_1794762918505.jpg',
    ],
    colorVariations: [
      {
        name: 'Matte Charcoal',
        hex: '#22201E',
        images: [
          '/src/assets/images/prod_vase_charcoal_1794762917830.jpg',
          '/src/assets/images/hero_atelier_living_1794762917368.jpg',
        ],
        stock: 9,
      },
      {
        name: 'Raw Desert Sand',
        hex: '#D8CBB8',
        images: [
          '/src/assets/images/prod_vase_sand_1794762918505.jpg',
          '/src/assets/images/story_artisan_pottery_1794762917641.jpg',
        ],
        stock: 7,
      },
    ],
    stockQuantity: 16,
    sku: 'KL-CER-014',
    featured: true,
    bestSeller: true,
    newArrival: false,
    materials: 'High-fired mineral stoneware clay, raw unglazed base',
    dimensions: '34 cm H x 22 cm Dia',
  },
  {
    id: 'prod_dome_table_lamp',
    name: 'Vespera Alabaster & Metal Dome Lamp',
    slug: 'vespera-alabaster-metal-dome-lamp',
    description:
      'Sculpted from solid natural stone and hand-spun metalwork, casting a warm, diffused amber glow ideal for bedside reading or evening living spaces.',
    category: 'Lighting',
    price: 16500,
    discountPrice: 14800,
    images: [
      '/src/assets/images/prod_lamp_brass_1794762919080.jpg',
      '/src/assets/images/prod_lamp_bronze_1794762918901.jpg',
    ],
    colorVariations: [
      {
        name: 'Antique Brass & Alabaster',
        hex: '#C8A96A',
        images: [
          '/src/assets/images/prod_lamp_brass_1794762919080.jpg',
        ],
        stock: 5,
      },
      {
        name: 'Patinated Bronze & Travertine',
        hex: '#3A3128',
        images: [
          '/src/assets/images/prod_lamp_bronze_1794762918901.jpg',
        ],
        stock: 4,
      },
    ],
    stockQuantity: 9,
    sku: 'KL-LGT-028',
    featured: true,
    bestSeller: true,
    newArrival: true,
    materials: 'Solid brushed brass or patinated bronze, natural Spanish alabaster / smoked travertine',
    dimensions: '46 cm H x 30 cm Shade Dia · 2m braided linen cord',
  },
  {
    id: 'prod_loomed_linen_throw',
    name: 'Sutra Hand-Loomed Linen & Wool Throw',
    slug: 'sutra-hand-loomed-linen-wool-throw',
    description:
      'Woven slowly on wooden pit looms over four days using undyed Belgian flax linen and fine Himalayan wool, finished with hand-knotted tassels.',
    category: 'Textiles',
    price: 5400,
    discountPrice: null,
    images: [
      '/src/assets/images/prod_throw_oatmeal_1794762919383.jpg',
      '/src/assets/images/prod_throw_espresso_1794762919438.jpg',
    ],
    colorVariations: [
      {
        name: 'Warm Oatmeal',
        hex: '#CFC3B0',
        images: [
          '/src/assets/images/prod_throw_oatmeal_1794762919383.jpg',
          '/src/assets/images/hero_atelier_living_1794762917368.jpg',
        ],
        stock: 12,
      },
      {
        name: 'Roasted Espresso',
        hex: '#46372C',
        images: [
          '/src/assets/images/prod_throw_espresso_1794762919438.jpg',
        ],
        stock: 8,
      },
    ],
    stockQuantity: 20,
    sku: 'KL-TEX-009',
    featured: true,
    bestSeller: false,
    newArrival: true,
    materials: '65% Organic Belgian Linen, 35% Unbleached Merino Wool',
    dimensions: '140 cm x 210 cm (excluding 10 cm fringe)',
  },
  {
    id: 'prod_walnut_pedestal_bowl',
    name: 'Aravalli Carved Walnut Pedestal Bowl',
    slug: 'aravalli-carved-walnut-pedestal-bowl',
    description:
      'Turned from a single block of sustainably felled Kashmir walnut, showcasing deep organic burl grain sealed with food-safe cold-pressed linseed oil and beeswax.',
    category: 'Wood & Brass',
    price: 8900,
    discountPrice: 7800,
    images: [
      '/src/assets/images/prod_bowl_walnut_1794762920427.jpg',
    ],
    colorVariations: [
      {
        name: 'Natural Smoked Walnut',
        hex: '#5D4029',
        images: [
          '/src/assets/images/prod_bowl_walnut_1794762920427.jpg',
        ],
        stock: 6,
      },
    ],
    stockQuantity: 6,
    sku: 'KL-WOD-019',
    featured: false,
    bestSeller: true,
    newArrival: false,
    materials: 'Solid seasoned Kashmir walnut, natural beeswax finish',
    dimensions: '28 cm Dia x 19 cm H',
  },
  {
    id: 'prod_terracotta_incense_set',
    name: 'Mitti Terracotta & Brass Ritual Vessel Set',
    slug: 'mitti-terracotta-brass-ritual-vessel-set',
    description:
      'A tactile pairing of raw river-clay terracotta and hand-fitted brushed brass inserts, designed as a contemplative centerpiece for incense sticks, cones, and botanical keepsakes.',
    category: 'Wood & Brass',
    price: 4200,
    discountPrice: 3650,
    images: [
      '/src/assets/images/prod_sconce_terracotta_1794762919881.jpg',
    ],
    colorVariations: [
      {
        name: 'Raw Terracotta & Brass',
        hex: '#A96344',
        images: [
          '/src/assets/images/prod_sconce_terracotta_1794762919881.jpg',
        ],
        stock: 14,
      },
    ],
    stockQuantity: 14,
    sku: 'KL-BRS-031',
    featured: true,
    bestSeller: false,
    newArrival: true,
    materials: 'Unglazed red terracotta clay, solid brushed brass tray & cup',
    dimensions: 'Tray 26 cm x 14 cm · Vessel 9 cm H',
  },
];

export const DEFAULT_STORE_SETTINGS: Omit<StoreSettings, 'updatedAt'> = {
  id: 'main',
  storeName: 'Kora & Loom',
  tagline: 'Quiet objects shaped by hand, earth, and fire.',
  contactEmail: 'atelier@koraandloom.in',
  contactPhone: '+91 98204 11842',
  studioAddress: '14 Kala Ghoda Courtyard, Fort, Mumbai 400001, India',
  shippingFee: 250,
  freeShippingThreshold: 8000,
  currencySymbol: '₹',
};

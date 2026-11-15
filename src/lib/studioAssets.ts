import heroAtelierLiving from '../assets/images/hero_atelier_living_1794762917368.jpg';
import storyArtisanPottery from '../assets/images/story_artisan_pottery_1794762917641.jpg';
import prodVaseCharcoal from '../assets/images/prod_vase_charcoal_1794762917830.jpg';
import prodVaseSand from '../assets/images/prod_vase_sand_1794762918505.jpg';
import prodLampBrass from '../assets/images/prod_lamp_brass_1794762919080.jpg';
import prodLampBronze from '../assets/images/prod_lamp_bronze_1794762918901.jpg';
import prodThrowOatmeal from '../assets/images/prod_throw_oatmeal_1794762919383.jpg';
import prodThrowEspresso from '../assets/images/prod_throw_espresso_1794762919438.jpg';
import prodBowlWalnut from '../assets/images/prod_bowl_walnut_1794762920427.jpg';
import prodSconceTerracotta from '../assets/images/prod_sconce_terracotta_1794762919881.jpg';

export const STUDIO_IMAGES = {
  heroAtelierLiving,
  storyArtisanPottery,
  prodVaseCharcoal,
  prodVaseSand,
  prodLampBrass,
  prodLampBronze,
  prodThrowOatmeal,
  prodThrowEspresso,
  prodBowlWalnut,
  prodSconceTerracotta,
} as const;

const STUDIO_PATH_MAP: Record<string, string> = {
  '/src/assets/images/hero_atelier_living_1794762917368.jpg': heroAtelierLiving,
  '/src/assets/images/story_artisan_pottery_1794762917641.jpg': storyArtisanPottery,
  '/src/assets/images/prod_vase_charcoal_1794762917830.jpg': prodVaseCharcoal,
  '/src/assets/images/prod_vase_sand_1794762918505.jpg': prodVaseSand,
  '/src/assets/images/prod_lamp_brass_1794762919080.jpg': prodLampBrass,
  '/src/assets/images/prod_lamp_bronze_1794762918901.jpg': prodLampBronze,
  '/src/assets/images/prod_throw_oatmeal_1794762919383.jpg': prodThrowOatmeal,
  '/src/assets/images/prod_throw_espresso_1794762919438.jpg': prodThrowEspresso,
  '/src/assets/images/prod_bowl_walnut_1794762920427.jpg': prodBowlWalnut,
  '/src/assets/images/prod_sconce_terracotta_1794762919881.jpg': prodSconceTerracotta,
};

export const STUDIO_ASSET_OPTIONS = [
  { label: 'Charcoal Stoneware Amphora', path: '/src/assets/images/prod_vase_charcoal_1794762917830.jpg', src: prodVaseCharcoal },
  { label: 'Desert Sand Amphora', path: '/src/assets/images/prod_vase_sand_1794762918505.jpg', src: prodVaseSand },
  { label: 'Brushed Brass Dome Lamp', path: '/src/assets/images/prod_lamp_brass_1794762919080.jpg', src: prodLampBrass },
  { label: 'Patinated Bronze Lamp', path: '/src/assets/images/prod_lamp_bronze_1794762918901.jpg', src: prodLampBronze },
  { label: 'Oatmeal Linen Throw', path: '/src/assets/images/prod_throw_oatmeal_1794762919383.jpg', src: prodThrowOatmeal },
  { label: 'Espresso Wool Throw', path: '/src/assets/images/prod_throw_espresso_1794762919438.jpg', src: prodThrowEspresso },
  { label: 'Carved Walnut Pedestal Bowl', path: '/src/assets/images/prod_bowl_walnut_1794762920427.jpg', src: prodBowlWalnut },
  { label: 'Terracotta & Brass Incense Set', path: '/src/assets/images/prod_sconce_terracotta_1794762919881.jpg', src: prodSconceTerracotta },
];

export function resolveProductImage(url: string | undefined | null): string {
  if (!url) return prodVaseCharcoal;
  return STUDIO_PATH_MAP[url] || url;
}

/**
 * Predefined thumbnail data for quick insertion
 * Stored separately to prevent accidental resets
 */

export interface QuickInsertThumbnail {
  id: string;
  name: string;
  category: "lodestone" | "prayer" | "map-icon" | "misc";
  wikiUrl: string;
  /** Direct image URL (resolved from wiki) */
  imageUrl: string;
  /** Default size for insertion */
  defaultSize: number;
}

export const QUICK_INSERT_THUMBNAILS: QuickInsertThumbnail[] = [
  // ============ LODESTONES ============
  {
    id: "lodestone-lumbridge",
    name: "Lumbridge",
    category: "lodestone",
    wikiUrl: "https://runescape.wiki/w/File:Lumbridge_lodestone_icon.png",
    imageUrl: "https://runescape.wiki/images/Lumbridge_lodestone_icon.png",
    defaultSize: 24,
  },
  {
    id: "lodestone-burthorpe",
    name: "Burthorpe",
    category: "lodestone",
    wikiUrl: "https://runescape.wiki/w/File:Burthorpe_lodestone_icon.png",
    imageUrl: "https://runescape.wiki/images/Burthorpe_lodestone_icon.png",
    defaultSize: 24,
  },
  {
    id: "lodestone-lunar-isle",
    name: "Lunar Isle",
    category: "lodestone",
    wikiUrl: "https://runescape.wiki/w/File:Lunar_Isle_lodestone_icon.png",
    imageUrl: "https://runescape.wiki/images/Lunar_Isle_lodestone_icon.png",
    defaultSize: 24,
  },
  {
    id: "lodestone-bandit-camp",
    name: "Bandit Camp",
    category: "lodestone",
    wikiUrl: "https://runescape.wiki/w/File:Bandit_Camp_lodestone_icon.png",
    imageUrl: "https://runescape.wiki/images/Bandit_Camp_lodestone_icon.png",
    defaultSize: 24,
  },
  {
    id: "lodestone-taverley",
    name: "Taverley",
    category: "lodestone",
    wikiUrl: "https://runescape.wiki/w/File:Taverley_lodestone_icon.png",
    imageUrl: "https://runescape.wiki/images/Taverley_lodestone_icon.png",
    defaultSize: 24,
  },
  {
    id: "lodestone-al-kharid",
    name: "Al Kharid",
    category: "lodestone",
    wikiUrl: "https://runescape.wiki/w/File:Al_Kharid_lodestone_icon.png",
    imageUrl: "https://runescape.wiki/images/Al_Kharid_lodestone_icon.png",
    defaultSize: 24,
  },
  {
    id: "lodestone-varrock",
    name: "Varrock",
    category: "lodestone",
    wikiUrl: "https://runescape.wiki/w/File:Varrock_lodestone_icon.png",
    imageUrl: "https://runescape.wiki/images/Varrock_lodestone_icon.png",
    defaultSize: 24,
  },
  {
    id: "lodestone-fort-forinthry",
    name: "Fort Forinthry",
    category: "lodestone",
    wikiUrl: "https://runescape.wiki/w/File:Fort_Forinthry_lodestone_icon.png",
    imageUrl: "https://runescape.wiki/images/Fort_Forinthry_lodestone_icon.png",
    defaultSize: 24,
  },
  {
    id: "lodestone-edgeville",
    name: "Edgeville",
    category: "lodestone",
    wikiUrl: "https://runescape.wiki/w/File:Edgeville_lodestone_icon.png",
    imageUrl: "https://runescape.wiki/images/Edgeville_lodestone_icon.png",
    defaultSize: 24,
  },
  {
    id: "lodestone-falador",
    name: "Falador",
    category: "lodestone",
    wikiUrl: "https://runescape.wiki/w/File:Falador_lodestone_icon.png",
    imageUrl: "https://runescape.wiki/images/Falador_lodestone_icon.png",
    defaultSize: 24,
  },
  {
    id: "lodestone-port-sarim",
    name: "Port Sarim",
    category: "lodestone",
    wikiUrl: "https://runescape.wiki/w/File:Port_Sarim_lodestone_icon.png",
    imageUrl: "https://runescape.wiki/images/Port_Sarim_lodestone_icon.png",
    defaultSize: 24,
  },
  {
    id: "lodestone-draynor",
    name: "Draynor",
    category: "lodestone",
    wikiUrl: "https://runescape.wiki/w/File:Draynor_lodestone_icon.png",
    imageUrl: "https://runescape.wiki/images/Draynor_lodestone_icon.png",
    defaultSize: 24,
  },
  {
    id: "lodestone-ardougne",
    name: "Ardougne",
    category: "lodestone",
    wikiUrl: "https://runescape.wiki/w/File:Ardougne_lodestone_icon.png",
    imageUrl: "https://runescape.wiki/images/Ardougne_lodestone_icon.png",
    defaultSize: 24,
  },
  {
    id: "lodestone-catherby",
    name: "Catherby",
    category: "lodestone",
    wikiUrl: "https://runescape.wiki/w/File:Catherby_lodestone_icon.png",
    imageUrl: "https://runescape.wiki/images/Catherby_lodestone_icon.png",
    defaultSize: 24,
  },
  {
    id: "lodestone-yanille",
    name: "Yanille",
    category: "lodestone",
    wikiUrl: "https://runescape.wiki/w/File:Yanille_lodestone_icon.png",
    imageUrl: "https://runescape.wiki/images/Yanille_lodestone_icon.png",
    defaultSize: 24,
  },
  {
    id: "lodestone-seers-village",
    name: "Seers' Village",
    category: "lodestone",
    wikiUrl: "https://runescape.wiki/w/File:Seers%27_Village_lodestone_icon.png",
    imageUrl: "https://runescape.wiki/images/Seers%27_Village_lodestone_icon.png",
    defaultSize: 24,
  },
  {
    id: "lodestone-eagles-peak",
    name: "Eagles' Peak",
    category: "lodestone",
    wikiUrl: "https://runescape.wiki/w/File:Eagles%27_Peak_lodestone_icon.png",
    imageUrl: "https://runescape.wiki/images/Eagles%27_Peak_lodestone_icon.png",
    defaultSize: 24,
  },
  {
    id: "lodestone-tirannwn",
    name: "Tirannwn",
    category: "lodestone",
    wikiUrl: "https://runescape.wiki/w/File:Tirannwn_lodestone_icon.png",
    imageUrl: "https://runescape.wiki/images/Tirannwn_lodestone_icon.png",
    defaultSize: 24,
  },
  {
    id: "lodestone-ooglog",
    name: "Oo'glog",
    category: "lodestone",
    wikiUrl: "https://runescape.wiki/w/File:Oo%27glog_lodestone_icon.png",
    imageUrl: "https://runescape.wiki/images/Oo%27glog_lodestone_icon.png",
    defaultSize: 24,
  },
  {
    id: "lodestone-karamja",
    name: "Karamja",
    category: "lodestone",
    wikiUrl: "https://runescape.wiki/w/File:Karamja_lodestone_icon.png",
    imageUrl: "https://runescape.wiki/images/Karamja_lodestone_icon.png",
    defaultSize: 24,
  },
  {
    id: "lodestone-canifis",
    name: "Canifis",
    category: "lodestone",
    wikiUrl: "https://runescape.wiki/w/File:Canifis_lodestone_icon.png",
    imageUrl: "https://runescape.wiki/images/Canifis_lodestone_icon.png",
    defaultSize: 24,
  },
  {
    id: "lodestone-wilderness-crater",
    name: "Wilderness Crater",
    category: "lodestone",
    wikiUrl: "https://runescape.wiki/w/File:Wilderness_Crater_lodestone_icon.png",
    imageUrl: "https://runescape.wiki/images/Wilderness_Crater_lodestone_icon.png",
    defaultSize: 24,
  },
  {
    id: "lodestone-fremennik",
    name: "Fremennik Province",
    category: "lodestone",
    wikiUrl: "https://runescape.wiki/w/File:Fremennik_Province_lodestone_icon.png",
    imageUrl: "https://runescape.wiki/images/Fremennik_Province_lodestone_icon.png",
    defaultSize: 24,
  },
  {
    id: "lodestone-prifddinas",
    name: "Prifddinas",
    category: "lodestone",
    wikiUrl: "https://runescape.wiki/w/File:Prifddinas_lodestone_icon.png",
    imageUrl: "https://runescape.wiki/images/Prifddinas_lodestone_icon.png",
    defaultSize: 24,
  },
  {
    id: "lodestone-menaphos",
    name: "Menaphos",
    category: "lodestone",
    wikiUrl: "https://runescape.wiki/w/File:Menaphos_lodestone_icon.png",
    imageUrl: "https://runescape.wiki/images/Menaphos_lodestone_icon.png",
    defaultSize: 24,
  },
  {
    id: "lodestone-anachronia",
    name: "Anachronia",
    category: "lodestone",
    wikiUrl: "https://runescape.wiki/w/File:Anachronia_lodestone_icon.png",
    imageUrl: "https://runescape.wiki/images/Anachronia_lodestone_icon.png",
    defaultSize: 24,
  },
  {
    id: "lodestone-city-of-um",
    name: "City of Um",
    category: "lodestone",
    wikiUrl: "https://runescape.wiki/w/File:City_of_Um_lodestone_icon.png",
    imageUrl: "https://runescape.wiki/images/City_of_Um_lodestone_icon.png",
    defaultSize: 24,
  },

  // ============ PRAYERS ============
  {
    id: "prayer-protect-magic",
    name: "Protect from Magic",
    category: "prayer",
    wikiUrl: "https://runescape.wiki/w/File:Protect_from_Magic.png",
    imageUrl: "https://runescape.wiki/images/Protect_from_Magic.png",
    defaultSize: 24,
  },
  {
    id: "prayer-protect-ranged",
    name: "Protect from Ranged",
    category: "prayer",
    wikiUrl: "https://runescape.wiki/w/File:Protect_from_Ranged.png",
    imageUrl: "https://runescape.wiki/images/Protect_from_Ranged.png",
    defaultSize: 24,
  },
  {
    id: "prayer-protect-melee",
    name: "Protect from Melee",
    category: "prayer",
    wikiUrl: "https://runescape.wiki/w/File:Protect_from_Melee.png",
    imageUrl: "https://runescape.wiki/images/Protect_from_Melee.png",
    defaultSize: 24,
  },
  {
    id: "prayer-protect-necromancy",
    name: "Protect from Necromancy",
    category: "prayer",
    wikiUrl: "https://runescape.wiki/w/File:Protect_from_Necromancy.png",
    imageUrl: "https://runescape.wiki/images/Protect_from_Necromancy.png",
    defaultSize: 24,
  },
  {
    id: "prayer-soul-split",
    name: "Soul Split",
    category: "prayer",
    wikiUrl: "https://runescape.wiki/w/File:Soul_Split.png",
    imageUrl: "https://runescape.wiki/images/Soul_Split.png",
    defaultSize: 24,
  },

  // ============ DEFLECT CURSES (Ancient Curses) ============
  {
    id: "curse-deflect-magic",
    name: "Deflect Magic",
    category: "prayer",
    wikiUrl: "https://runescape.wiki/w/File:Deflect_Magic.png",
    imageUrl: "https://runescape.wiki/images/Deflect_Magic.png",
    defaultSize: 24,
  },
  {
    id: "curse-deflect-ranged",
    name: "Deflect Ranged",
    category: "prayer",
    wikiUrl: "https://runescape.wiki/w/File:Deflect_Ranged.png",
    imageUrl: "https://runescape.wiki/images/Deflect_Ranged.png",
    defaultSize: 24,
  },
  {
    id: "curse-deflect-melee",
    name: "Deflect Melee",
    category: "prayer",
    wikiUrl: "https://runescape.wiki/w/File:Deflect_Melee.png",
    imageUrl: "https://runescape.wiki/images/Deflect_Melee.png",
    defaultSize: 24,
  },
  {
    id: "curse-deflect-necromancy",
    name: "Deflect Necromancy",
    category: "prayer",
    wikiUrl: "https://runescape.wiki/w/File:Deflect_Necromancy.png",
    imageUrl: "https://runescape.wiki/images/Deflect_Necromancy.png",
    defaultSize: 24,
  },

  // ============ MAP ICONS ============
  {
    id: "map-shortcut",
    name: "Agility Shortcut",
    category: "map-icon",
    wikiUrl: "https://runescape.wiki/w/File:Shortcut_map_icon.png",
    imageUrl: "https://runescape.wiki/images/Shortcut_map_icon.png",
    defaultSize: 24,
  },
  {
    id: "map-bank",
    name: "Bank",
    category: "map-icon",
    wikiUrl: "https://runescape.wiki/w/File:Bank_map_icon.png",
    imageUrl: "https://runescape.wiki/images/Bank_map_icon.png",
    defaultSize: 24,
  },
  {
    id: "map-altar",
    name: "Altar",
    category: "map-icon",
    wikiUrl: "https://runescape.wiki/w/File:Altar_map_icon.png",
    imageUrl: "https://runescape.wiki/images/Altar_map_icon.png",
    defaultSize: 24,
  },
];

// Group thumbnails by category for UI display
export const THUMBNAIL_CATEGORIES = {
  lodestone: {
    label: "Lodestones",
    icon: "https://runescape.wiki/images/Lodestone_map_icon.png",
  },
  prayer: {
    label: "Prayers",
    icon: "https://runescape.wiki/images/Prayer_detail.png",
  },
  "map-icon": {
    label: "Map Icons",
    icon: "📍",
  },
  misc: {
    label: "Miscellaneous",
    icon: "📦",
  },
} as const;

export function getThumbnailsByCategory(category: QuickInsertThumbnail["category"]) {
  return QUICK_INSERT_THUMBNAILS.filter((t) => t.category === category);
}

export function getAllCategories() {
  const categories = new Set(QUICK_INSERT_THUMBNAILS.map((t) => t.category));
  return Array.from(categories);
}

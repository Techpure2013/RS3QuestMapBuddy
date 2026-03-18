/**
 * Predefined thumbnail data for quick insertion
 * Stored separately to prevent accidental resets
 */

export interface QuickInsertThumbnail {
  id: string;
  name: string;
  category: "lodestone" | "prayer" | "map-shop" | "map-skill" | "map-utility" | "map-nav" | "map-clan" | "map-event" | "misc";
  wikiUrl: string;
  /** Direct image URL (resolved from wiki) */
  imageUrl: string;
  /** Default size for insertion */
  defaultSize: number;
}

const WIKI = "https://runescape.wiki/images";

function mapIcon(id: string, name: string, file: string, category: QuickInsertThumbnail["category"] = "map-nav", size = 24): QuickInsertThumbnail {
  return {
    id,
    name,
    category,
    wikiUrl: `https://runescape.wiki/w/File:${file}`,
    imageUrl: `${WIKI}/${file}`,
    defaultSize: size,
  };
}

export const QUICK_INSERT_THUMBNAILS: QuickInsertThumbnail[] = [
  // ============ LODESTONES ============
  mapIcon("lodestone-lumbridge", "Lumbridge", "Lumbridge_lodestone_icon.png", "lodestone"),
  mapIcon("lodestone-burthorpe", "Burthorpe", "Burthorpe_lodestone_icon.png", "lodestone"),
  mapIcon("lodestone-lunar-isle", "Lunar Isle", "Lunar_Isle_lodestone_icon.png", "lodestone"),
  mapIcon("lodestone-bandit-camp", "Bandit Camp", "Bandit_Camp_lodestone_icon.png", "lodestone"),
  mapIcon("lodestone-taverley", "Taverley", "Taverley_lodestone_icon.png", "lodestone"),
  mapIcon("lodestone-al-kharid", "Al Kharid", "Al_Kharid_lodestone_icon.png", "lodestone"),
  mapIcon("lodestone-varrock", "Varrock", "Varrock_lodestone_icon.png", "lodestone"),
  mapIcon("lodestone-fort-forinthry", "Fort Forinthry", "Fort_Forinthry_lodestone_icon.png", "lodestone"),
  mapIcon("lodestone-edgeville", "Edgeville", "Edgeville_lodestone_icon.png", "lodestone"),
  mapIcon("lodestone-falador", "Falador", "Falador_lodestone_icon.png", "lodestone"),
  mapIcon("lodestone-port-sarim", "Port Sarim", "Port_Sarim_lodestone_icon.png", "lodestone"),
  mapIcon("lodestone-draynor", "Draynor", "Draynor_lodestone_icon.png", "lodestone"),
  mapIcon("lodestone-ardougne", "Ardougne", "Ardougne_lodestone_icon.png", "lodestone"),
  mapIcon("lodestone-catherby", "Catherby", "Catherby_lodestone_icon.png", "lodestone"),
  mapIcon("lodestone-yanille", "Yanille", "Yanille_lodestone_icon.png", "lodestone"),
  mapIcon("lodestone-seers-village", "Seers' Village", "Seers%27_Village_lodestone_icon.png", "lodestone"),
  mapIcon("lodestone-eagles-peak", "Eagles' Peak", "Eagles%27_Peak_lodestone_icon.png", "lodestone"),
  mapIcon("lodestone-tirannwn", "Tirannwn", "Tirannwn_lodestone_icon.png", "lodestone"),
  mapIcon("lodestone-ooglog", "Oo'glog", "Oo%27glog_lodestone_icon.png", "lodestone"),
  mapIcon("lodestone-karamja", "Karamja", "Karamja_lodestone_icon.png", "lodestone"),
  mapIcon("lodestone-canifis", "Canifis", "Canifis_lodestone_icon.png", "lodestone"),
  mapIcon("lodestone-wilderness-crater", "Wilderness Crater", "Wilderness_Crater_lodestone_icon.png", "lodestone"),
  mapIcon("lodestone-fremennik", "Fremennik Province", "Fremennik_Province_lodestone_icon.png", "lodestone"),
  mapIcon("lodestone-prifddinas", "Prifddinas", "Prifddinas_lodestone_icon.png", "lodestone"),
  mapIcon("lodestone-menaphos", "Menaphos", "Menaphos_lodestone_icon.png", "lodestone"),
  mapIcon("lodestone-anachronia", "Anachronia", "Anachronia_lodestone_icon.png", "lodestone"),
  mapIcon("lodestone-city-of-um", "City of Um", "City_of_Um_lodestone_icon.png", "lodestone"),

  // ============ PRAYERS ============
  mapIcon("prayer-protect-magic", "Protect from Magic", "Protect_from_Magic.png", "prayer"),
  mapIcon("prayer-protect-ranged", "Protect from Ranged", "Protect_from_Ranged.png", "prayer"),
  mapIcon("prayer-protect-melee", "Protect from Melee", "Protect_from_Melee.png", "prayer"),
  mapIcon("prayer-protect-necromancy", "Protect from Necromancy", "Protect_from_Necromancy.png", "prayer"),
  mapIcon("prayer-soul-split", "Soul Split", "Soul_Split.png", "prayer"),
  mapIcon("curse-deflect-magic", "Deflect Magic", "Deflect_Magic.png", "prayer"),
  mapIcon("curse-deflect-ranged", "Deflect Ranged", "Deflect_Ranged.png", "prayer"),
  mapIcon("curse-deflect-melee", "Deflect Melee", "Deflect_Melee.png", "prayer"),
  mapIcon("curse-deflect-necromancy", "Deflect Necromancy", "Deflect_Necromancy.png", "prayer"),

  // ============ SHOPS ============
  mapIcon("shop-amulet", "Amulet Shop", "Amulet_shop_map_icon.png", "map-shop"),
  mapIcon("shop-archery", "Archery Shop", "Archery_shop_map_icon.png", "map-shop"),
  mapIcon("shop-axe", "Axe Shop", "Axe_shop_map_icon.png", "map-shop"),
  mapIcon("shop-candle", "Candle Shop", "Candle_shop_map_icon.png", "map-shop"),
  mapIcon("shop-chainmail", "Chainmail Shop", "Chainmail_shop_map_icon.png", "map-shop"),
  mapIcon("shop-clothes", "Clothes Shop", "Clothes_shop_map_icon.png", "map-shop"),
  mapIcon("shop-cookery", "Cookery Shop", "Cookery_shop_map_icon.png", "map-shop"),
  mapIcon("shop-crafting", "Crafting Shop", "Crafting_shop_map_icon.png", "map-shop"),
  mapIcon("shop-divination", "Divination Shop", "Divination_shop_map_icon.png", "map-shop"),
  mapIcon("shop-farming", "Farming Shop", "Farming_shop_map_icon.png", "map-shop"),
  mapIcon("shop-fishing", "Fishing Shop", "Fishing_shop_map_icon.png", "map-shop"),
  mapIcon("shop-food", "Food Shop", "Food_shop_map_icon.png", "map-shop"),
  mapIcon("shop-fur", "Fur Trader", "Fur_trader_map_icon.png", "map-shop"),
  mapIcon("shop-gem", "Gem Shop", "Gem_shop_map_icon.png", "map-shop"),
  mapIcon("shop-general", "General Store", "General_store_map_icon.png", "map-shop"),
  mapIcon("shop-gravestone", "Gravestone Exchange", "Gravestone_shop_map_icon.png", "map-shop"),
  mapIcon("shop-helmet", "Helmet Shop", "Helmet_shop_map_icon.png", "map-shop"),
  mapIcon("shop-hunter", "Hunter Store", "Hunter_shop_map_icon.png", "map-shop"),
  mapIcon("shop-jewellery", "Jewellery Shop", "Jewellery_shop_map_icon.png", "map-shop"),
  mapIcon("shop-kebab", "Kebab Seller", "Kebab_seller_map_icon.png", "map-shop"),
  mapIcon("shop-magic", "Magic Shop", "Magic_shop_map_icon.png", "map-shop"),
  mapIcon("shop-mace", "Mace Shop", "Mace_shop_map_icon.png", "map-shop"),
  mapIcon("shop-mining", "Mining Shop", "Mining_shop_map_icon.png", "map-shop"),
  mapIcon("shop-pet", "Pet Shop", "Pet_shop_map_icon.png", "map-shop"),
  mapIcon("shop-platebody", "Platebody Shop", "Platebody_shop_map_icon.png", "map-shop"),
  mapIcon("shop-platelegs", "Platelegs Shop", "Platelegs_shop_map_icon.png", "map-shop"),
  mapIcon("shop-plateskirt", "Plateskirt Shop", "Plateskirt_shop_map_icon.png", "map-shop"),
  mapIcon("shop-scimitar", "Scimitar Shop", "Scimitar_shop_map_icon.png", "map-shop"),
  mapIcon("shop-shield", "Shield Shop", "Shield_shop_map_icon.png", "map-shop"),
  mapIcon("shop-silk", "Silk Trader", "Silk_trader_map_icon.png", "map-shop"),
  mapIcon("shop-silver", "Silver Shop", "Silver_shop_map_icon.png", "map-shop"),
  mapIcon("shop-spice", "Spice Shop", "Spice_shop_map_icon.png", "map-shop"),
  mapIcon("shop-staff", "Staff Shop", "Staff_shop_map_icon.png", "map-shop"),
  mapIcon("shop-stonemason", "Stonemason", "Stonemason_map_icon.png", "map-shop"),
  mapIcon("shop-summoning", "Summoning Store", "Summoning_shop_map_icon.png", "map-shop"),
  mapIcon("shop-sword", "Sword Shop", "Sword_shop_map_icon.png", "map-shop"),
  mapIcon("shop-tanner", "Tanner", "Tannery_map_icon.png", "map-shop"),
  mapIcon("shop-vambrace", "Vambrace Exchange", "Vambrace_exchange_map_icon.png", "map-shop"),
  mapIcon("shop-vegetable", "Vegetable Store", "Vegetable_store_map_icon.png", "map-shop"),
  mapIcon("shop-loyalty", "Loyalty Rewards", "Loyalty_Rewards_Shop_map_icon.png", "map-shop"),
  mapIcon("shop-lamp-trader", "Lamp Trader", "Lamp_Trader_map_icon.png", "map-shop"),
  mapIcon("shop-tools-games", "Tools for Games", "Tools_for_Games_shop_map_icon.png", "map-shop"),

  // ============ SKILL TRAINING & TUTORS ============
  mapIcon("skill-agility-training", "Agility Training", "Agility_training_map_icon.png", "map-skill"),
  mapIcon("skill-agility-tutor", "Agility Tutor", "Agility_Tutor_map_icon.png", "map-skill"),
  mapIcon("skill-archaeology-tutor", "Archaeology Tutor", "Archaeology_Tutor_map_icon.png", "map-skill"),
  mapIcon("skill-combat-training", "Combat Training", "Combat_training_map_icon.png", "map-skill"),
  mapIcon("skill-combat-tutor", "Combat Tutor", "Combat_Tutor_map_icon.png", "map-skill"),
  mapIcon("skill-construction-training", "Construction Training", "Construction_training_map_icon.png", "map-skill"),
  mapIcon("skill-construction-tutor", "Construction Tutor", "Construction_Tutor_map_icon.png", "map-skill"),
  mapIcon("skill-cooking-training", "Cooking Training", "Cooking_training_map_icon.png", "map-skill"),
  mapIcon("skill-cooking-tutor", "Cooking Tutor", "Cooking_Tutor_map_icon.png", "map-skill"),
  mapIcon("skill-crafting-training", "Crafting Training", "Crafting_training_map_icon.png", "map-skill"),
  mapIcon("skill-crafting-tutor", "Crafting Tutor", "Crafting_Tutor_map_icon.png", "map-skill"),
  mapIcon("skill-divination-training", "Divination Training", "Divination_training_map_icon.png", "map-skill"),
  mapIcon("skill-divination-tutor", "Divination Tutor", "Divination_Tutor_map_icon.png", "map-skill"),
  mapIcon("skill-dungeoneering-training", "Dungeoneering Training", "Dungeoneering_training_map_icon.png", "map-skill"),
  mapIcon("skill-dungeoneering-tutor", "Dungeoneering Tutor", "Dungeoneering_Tutor_map_icon.png", "map-skill"),
  mapIcon("skill-farming-training", "Farming Training", "Farming_training_map_icon.png", "map-skill"),
  mapIcon("skill-farming-tutor", "Farming Tutor", "Farming_Tutor_map_icon.png", "map-skill"),
  mapIcon("skill-firemaking-training", "Firemaking Training", "Firemaking_training_map_icon.png", "map-skill"),
  mapIcon("skill-firemaking-tutor", "Firemaking Tutor", "Firemaking_Tutor_map_icon.png", "map-skill"),
  mapIcon("skill-fishing-training", "Fishing Training", "Fishing_training_map_icon.png", "map-skill"),
  mapIcon("skill-fishing-tutor", "Fishing Tutor", "Fishing_Tutor_map_icon.png", "map-skill"),
  mapIcon("skill-fletching-training", "Fletching Training", "Fletching_training_map_icon.png", "map-skill"),
  mapIcon("skill-fletching-tutor", "Fletching Tutor", "Fletching_Tutor_map_icon.png", "map-skill"),
  mapIcon("skill-herblore-training", "Herblore Training", "Herblore_training_map_icon.png", "map-skill"),
  mapIcon("skill-herblore-tutor", "Herblore Tutor", "Herblore_Tutor_map_icon.png", "map-skill"),
  mapIcon("skill-hunter-training", "Hunter Training", "Hunter_training_map_icon.png", "map-skill"),
  mapIcon("skill-hunter-tutor", "Hunter Tutor", "Hunter_Tutor_map_icon.png", "map-skill"),
  mapIcon("skill-mining-training", "Mining Training", "Mining_training_map_icon.png", "map-skill"),
  mapIcon("skill-mining-tutor", "Mining Tutor", "Mining_Tutor_map_icon.png", "map-skill"),
  mapIcon("skill-prayer-training", "Prayer Training", "Prayer_training_map_icon.png", "map-skill"),
  mapIcon("skill-prayer-tutor", "Prayer Tutor", "Prayer_Tutor_map_icon.png", "map-skill"),
  mapIcon("skill-runecrafting-training", "Runecrafting Training", "Runecrafting_training_map_icon.png", "map-skill"),
  mapIcon("skill-runecrafting-tutor", "Runecrafting Tutor", "Runecrafting_Tutor_map_icon.png", "map-skill"),
  mapIcon("skill-slayer-training", "Slayer Training", "Slayer_training_map_icon.png", "map-skill"),
  mapIcon("skill-slayer-tutor", "Slayer Tutor", "Slayer_Tutor_map_icon.png", "map-skill"),
  mapIcon("skill-slayer-master", "Slayer Master", "Slayer_master_map_icon.png", "map-skill"),
  mapIcon("skill-slayer-contracts", "Slayer Contracts", "Slayer_Contracts_map_icon.png", "map-skill"),
  mapIcon("skill-smithing-training", "Smithing Training", "Smithing_training_map_icon.png", "map-skill"),
  mapIcon("skill-smithing-tutor", "Smithing Tutor", "Smithing_Tutor_map_icon.png", "map-skill"),
  mapIcon("skill-summoning-training", "Summoning Training", "Summoning_training_map_icon.png", "map-skill"),
  mapIcon("skill-summoning-tutor", "Summoning Tutor", "Summoning_Tutor_map_icon.png", "map-skill"),
  mapIcon("skill-thieving-training", "Thieving Training", "Thieving_training_map_icon.png", "map-skill"),
  mapIcon("skill-thieving-tutor", "Thieving Tutor", "Thieving_Tutor_map_icon.png", "map-skill"),
  mapIcon("skill-woodcutting-training", "Woodcutting Training", "Woodcutting_training_map_icon.png", "map-skill"),
  mapIcon("skill-woodcutting-tutor", "Woodcutting Tutor", "Woodcutting_Tutor_map_icon.png", "map-skill"),

  // ============ UTILITIES & FACILITIES ============
  mapIcon("util-altar", "Altar", "Altar_map_icon.png", "map-utility"),
  mapIcon("util-corrupt-altar", "Corrupt Altar", "Corrupt_Altar_map_icon.png", "map-utility"),
  mapIcon("util-anvil", "Anvil", "Anvil_map_icon.png", "map-utility"),
  mapIcon("util-apothecary", "Apothecary", "Apothecary_map_icon.png", "map-utility"),
  mapIcon("util-bank", "Bank", "Bank_map_icon.png", "map-utility"),
  mapIcon("util-bank-deposit", "Bank Deposit Box", "Bank_Deposit_map_icon.png", "map-utility"),
  mapIcon("util-bonfire", "Bonfire", "Bonfire_map_icon.png", "map-utility"),
  mapIcon("util-brewery", "Brewery", "Brewery_map_icon.png", "map-utility"),
  mapIcon("util-cooking-range", "Cooking Range", "Range_map_icon.png", "map-utility"),
  mapIcon("util-dairy-churn", "Dairy Churn", "Dairy_churn_map_icon.png", "map-utility"),
  mapIcon("util-estate-agent", "Estate Agent", "Estate_agent_map_icon.png", "map-utility"),
  mapIcon("util-furnace", "Furnace", "Furnace_map_icon.png", "map-utility"),
  mapIcon("util-grand-exchange", "Grand Exchange", "Grand_Exchange_map_icon.png", "map-utility"),
  mapIcon("util-hairdresser", "Hairdresser", "Hairdresser_map_icon.png", "map-utility"),
  mapIcon("util-herbalist", "Herbalist", "Herbalist_map_icon.png", "map-utility"),
  mapIcon("util-loom", "Loom", "Loom_map_icon.png", "map-utility"),
  mapIcon("util-makeover-mage", "Makeover Mage", "Makeover_Mage_map_icon.png", "map-utility"),
  mapIcon("util-pottery-wheel", "Pottery Wheel", "Potter%27s_wheel_map_icon.png", "map-utility"),
  mapIcon("util-pub", "Pub / Bar", "Pub_map_icon.png", "map-utility"),
  mapIcon("util-sandpit", "Sandpit", "Sandpit_map_icon.png", "map-utility"),
  mapIcon("util-sawmill", "Sawmill", "Sawmill_map_icon.png", "map-utility"),
  mapIcon("util-spinning-wheel", "Spinning Wheel", "Spinning_wheel_map_icon.png", "map-utility"),
  mapIcon("util-water-source", "Water Source", "Water_source_map_icon.png", "map-utility"),
  mapIcon("util-stagnant-water", "Stagnant Water", "Stagnant_water_source_map_icon.png", "map-utility"),
  mapIcon("util-watermill", "Watermill", "Watermill_map_icon.png", "map-utility"),
  mapIcon("util-windmill", "Windmill", "Windmill_map_icon.png", "map-utility"),
  mapIcon("util-poh-portal", "POH Portal", "House_portal_map_icon.png", "map-utility"),
  mapIcon("util-safe", "Safe", "Safe_map_icon.png", "map-utility"),
  mapIcon("util-photo-booth", "Photo Booth", "Photo_booth_map_icon.png", "map-utility"),
  mapIcon("util-guide", "Guide", "Guide_map_icon.png", "map-utility"),
  mapIcon("util-daily-challenges", "Daily Challenges", "Daily_Challenge_map_icon.png", "map-utility"),
  mapIcon("util-collector", "Collector", "Collector_map_icon.png", "map-utility"),
  mapIcon("util-taskmaster", "Taskmaster", "Task_map_icon.png", "map-utility"),
  mapIcon("util-nexus", "Nexus", "Nexus_map_icon.png", "map-utility"),
  mapIcon("util-summoning-obelisk", "Summoning Obelisk", "Summoning_obelisk_map_icon.png", "map-utility"),
  mapIcon("util-mini-obelisk", "Mini Obelisk", "Small_Summoning_obelisk_map_icon.png", "map-utility"),
  mapIcon("util-runecrafting-altar", "Runecrafting Altar", "Runecrafting_altar_map_icon.png", "map-utility"),
  mapIcon("util-inventors-workbench", "Inventor's Workbench", "Inventor%27s_workbench_map_icon.png", "map-utility"),
  mapIcon("util-archaeologists-workbench", "Archaeologist's Workbench", "Archaeologist%27s_workbench_map_icon.png", "map-utility"),
  mapIcon("util-screening-station", "Screening Station", "Screening_Station_map_icon.png", "map-utility"),
  mapIcon("util-ge-info-combat", "GE Info: Combat", "Info-combat_map_icon.png", "map-utility"),
  mapIcon("util-ge-info-herbs", "GE Info: Herbs", "Info-herbs_map_icon.png", "map-utility"),
  mapIcon("util-ge-info-logs", "GE Info: Logs", "Info-logs_map_icon.png", "map-utility"),
  mapIcon("util-ge-info-ores", "GE Info: Ores", "Info-ores_map_icon.png", "map-utility"),
  mapIcon("util-ge-info-runes", "GE Info: Runes", "Info-runes_map_icon.png", "map-utility"),

  // ============ NAVIGATION & POINTS OF INTEREST ============
  mapIcon("nav-shortcut", "Agility Shortcut", "Shortcut_map_icon.png", "map-nav"),
  mapIcon("nav-dungeon-entrance", "Dungeon Entrance", "Dungeon_entrance_map_icon.png", "map-nav"),
  mapIcon("nav-dungeon-exit", "Dungeon Exit", "Dungeon_exit_map_icon.png", "map-nav"),
  mapIcon("nav-fairy-ring", "Fairy Ring", "Fairy_Ring_map_icon.png", "map-nav"),
  mapIcon("nav-transport", "Transportation", "Transportation_map_icon.png", "map-nav"),
  mapIcon("nav-boat-hire", "Boat Hire", "Boat_Hire_map_icon.png", "map-nav"),
  mapIcon("nav-world-gate", "World Gate", "World_Gate_map_icon.png", "map-nav"),
  mapIcon("nav-lodestone-inactive", "Lodestone (Inactive)", "Lodestone_map_icon.png", "map-nav"),
  mapIcon("nav-lodestone-active", "Lodestone (Active)", "Lodestone_%28Activated%29_map_icon.png", "map-nav"),
  mapIcon("nav-quest-start", "Quest Start", "Quest_map_icon.png", "map-nav"),
  mapIcon("nav-quest-progress", "Quest In-Progress", "Quest_%28In-Progress%29_map_icon.png", "map-nav"),
  mapIcon("nav-menaphos-quest", "Menaphos Quest", "Menaphos_Quest_map_icon.png", "map-nav"),
  mapIcon("nav-mining-site", "Mining Site", "Mining_spot_map_icon.png", "map-nav"),
  mapIcon("nav-mining-underground", "Mining Site (Underground)", "Underground_Mining_spot_map_icon.png", "map-nav"),
  mapIcon("nav-fishing-spot", "Fishing Spot", "Fishing_spot_map_icon.png", "map-nav"),
  mapIcon("nav-farming-patch", "Farming Patch", "Farming_patch_map_icon.png", "map-nav"),
  mapIcon("nav-wisp-colony", "Wisp Colony", "Wisp_colony_map_icon.png", "map-nav"),
  mapIcon("nav-woodcutting-stump", "Woodcutting Stump", "Woodcutting_stump_map_icon.png", "map-nav"),
  mapIcon("nav-rare-tree", "Rare Tree", "Rare_tree_map_icon.png", "map-nav"),
  mapIcon("nav-excavation-site", "Excavation Site", "Excavation_Site_map_icon.png", "map-nav"),
  mapIcon("nav-archaeological-dig", "Archaeological Dig Site", "Archaeological_Dig_Site_map_icon.png", "map-nav"),
  mapIcon("nav-archaeological-research", "Archaeological Research", "Archaeological_Research_map_icon.png", "map-nav"),
  mapIcon("nav-resting-spot", "Resting Spot", "Resting_spot_map_icon.png", "map-nav"),
  mapIcon("nav-beacon", "Fired Up Beacon", "Beacon_map_icon.png", "map-nav"),
  mapIcon("nav-chest", "Reward Chest", "Chest_map_icon.png", "map-nav"),
  mapIcon("nav-shifting-tombs", "Shifting Tombs", "Shifting_Tombs_sarcophagus_map_icon.png", "map-nav"),
  mapIcon("nav-god-emissary", "God Emissary", "God_Emissary_map_icon.png", "map-nav"),
  mapIcon("nav-commander-yodri", "Commander Yodri", "Commander_Yodri_map_icon.png", "map-nav"),

  // ============ CLAN ICONS ============
  mapIcon("clan-portal", "Clan Portal", "Clans_-_Portal_map_icon.png", "map-clan"),
  mapIcon("clan-scribe", "Clan Scribe", "Clans_-_Scribe_map_icon.png", "map-clan"),
  mapIcon("clan-guard", "Clan Captain", "Clans_-_Guard_map_icon.png", "map-clan"),
  mapIcon("clan-sergeant", "Sergeant-at-Arms", "Sergeant-at-Arms_map_icon.png", "map-clan"),
  mapIcon("clan-vexillum", "Vexillum Stand", "Vexillum_stand_map_icon.png", "map-clan"),
  mapIcon("clan-citadel-portal", "Citadel Portal", "Citadel_Portal_map_icon.png", "map-clan"),
  mapIcon("clan-citadel-pedestal", "Citadel Pedestal", "Clan_Citadel_pedestal_map_icon.png", "map-clan"),

  // ============ EVENTS & MINIGAMES ============
  mapIcon("event-minigame", "Minigame", "Minigame_map_icon.png", "map-event"),
  mapIcon("event-dd", "Distractions & Diversions", "D%26D_map_icon.png", "map-event"),
  mapIcon("event-holiday", "Holiday Event", "Holiday_event_map_icon.png", "map-event"),
  mapIcon("event-holiday-easter", "Holiday Event (Easter)", "Holiday_event_%28Easter%29_map_icon.png", "map-event"),
  mapIcon("event-seasonal", "Seasonal Activity", "Seasonal_activity_map_icon.png", "map-event"),
  mapIcon("event-charity", "Charity Event", "Charity_event_map_icon.png", "map-event"),
  mapIcon("event-goblin-raid", "Goblin Raid", "Goblin_raid_map_icon.png", "map-event"),
  mapIcon("event-demon-flash-mob", "Demon Flash Mob", "Demon_flash_mobs_map_icon.png", "map-event"),
  mapIcon("event-terrorbird-racing", "Terrorbird Racing", "Terrorbird_racing_map_icon.png", "map-event"),
  mapIcon("event-wildywyrm", "WildyWyrm", "WildyWyrm_map_icon.png", "map-event"),
  mapIcon("event-jmod-lodestone", "J-Mod Lodestone", "J-Mod_lodestone_map_icon.png", "map-event"),
  mapIcon("event-mobilising-red", "Mobilising Armies (Red)", "Mobilising_Armies_red_team_map_icon.png", "map-event"),
  mapIcon("event-mobilising-blue", "Mobilising Armies (Blue)", "Mobilising_Armies_blue_team_map_icon.png", "map-event"),
  mapIcon("event-mobilising-green", "Mobilising Armies (Green)", "Mobilising_Armies_green_team_map_icon.png", "map-event"),
  mapIcon("event-mobilising-yellow", "Mobilising Armies (Yellow)", "Mobilising_Armies_yellow_team_map_icon.png", "map-event"),
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
  "map-shop": {
    label: "Shops",
    icon: "https://runescape.wiki/images/General_store_map_icon.png",
  },
  "map-skill": {
    label: "Skills",
    icon: "https://runescape.wiki/images/Combat_training_map_icon.png",
  },
  "map-utility": {
    label: "Utilities",
    icon: "https://runescape.wiki/images/Bank_map_icon.png",
  },
  "map-nav": {
    label: "Navigation",
    icon: "https://runescape.wiki/images/Quest_map_icon.png",
  },
  "map-clan": {
    label: "Clans",
    icon: "https://runescape.wiki/images/Clans_-_Portal_map_icon.png",
  },
  "map-event": {
    label: "Events",
    icon: "https://runescape.wiki/images/Minigame_map_icon.png",
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

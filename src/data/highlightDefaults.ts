// src/data/highlightDefaults.ts
// Default word lists for the auto-highlight system.
// These are the factory defaults; user customizations are stored in highlightSettingsStore.

export const DEFAULT_ACTION_VERBS: readonly string[] = Object.freeze([
  "Go upstairs", "Go downstairs", "Talk to", "Speak to", "Interact",
  "Use", "Climb", "Cook", "Mine", "Fish", "Chop",
  "Search", "Open", "Enter", "Exit", "Cross",
  "Inspect", "Investigate", "Read", "Pick", "Picklock",
  "Dig", "Craft", "Smith", "Fletch", "Light", "Pray",
  "Activate", "Operate", "Pull", "Push", "Squeeze",
  "Jump", "Swing", "Buy", "Sell", "Trade", "Wear", "Equip", "Unequip", "Take", "Pick up", "Pick-up", "Drop",
]);

export const DEFAULT_KILL_VERBS: readonly string[] = Object.freeze([
  "Kill", "Defeat", "Slay", "Fight", "Attack", "Destroy",
]);

export const DEFAULT_RS3_LOCATION_NAMES: readonly string[] = Object.freeze([
  // Directional city variants (matched as whole locations to prevent direction-word false positives)
  "East Ardougne", "West Ardougne",
  "North Ardougne", "South Ardougne",
  "North Falador", "South Falador",
  "East Varrock", "West Varrock",
  "North Varrock", "South Varrock",
  "East Karamja", "West Karamja",
  "North Yanille", "South Yanille",
  // Major cities
  "Varrock", "Lumbridge", "Falador", "Ardougne", "Yanille", "Rellekka",
  "Taverley", "Taverly", "Burthorpe", "Edgeville", "Draynor", "Canifis",
  "Prifddinas", "Menaphos", "Keldagrim", "Zanaris",
  // Towns and villages
  "Catherby", "Seers", "Camelot", "Rimmington", "Ooglog", "Nardah",
  "Shilo", "Witchaven", "Hemenster", "Barbarian", "Seer's",
  "Brimhaven", "Darkmeyer", "Slepe", "Ashdale",
  "Burgh de Rott", "Mort'ton", "Phasmatys", "Port Phasmatys",
  "Sorcerer's Tower", "Goblin Village", "Sinclair", "Khazard",
  "McGrubor's Wood", "Jiggig", "Oo'glog",
  "Burntmeat", "Troll Stronghold", "Trollheim",
  // Regions
  "Misthalin", "Asgarnia", "Kandarin", "Morytania", "Tirannwn",
  "Karamja", "Kharidian", "Fremennik", "Wilderness", "Feldip",
  "Anachronia", "Forinthry",
  // Fremennik locations
  "Jatizso", "Neitiznot", "Miscellania", "Etceteria",
  "Waterbirth", "Waterbirth Island", "Ungael", "Lunar Isle",
  // Desert locations
  "Pollnivneach", "Sophanem", "Uzer", "Al Kharid",
  "Bedabin", "Bandit Camp", "Duel Arena", "Dominion Tower",
  "Ullek", "Het's Oasis",
  // Elven locations
  "Lletya", "Isafdar", "Arandar", "Tyras",
  // Eastern Lands / Arc
  "Waiko", "Aminishi", "Cyclosis", "Goshima",
  "Tuai Leit", "The Arc",
  // Islands
  "Entrana", "Crandor", "Ape Atoll", "Marim",
  "Mos Le'Harmless", "Harmony Island", "Braindeath Island",
  "Crash Island", "Tutorial Island",
  // Landmarks and specific areas
  "Lumbridge Swamp", "Port Sarim", "Eagles' Peak", "Fort Forinthry",
  "White Wolf", "White Wolf Mountain", "Grand Exchange",
  "Barbarian Village", "Champions' Guild", "Warriors' Guild",
  "Heroes' Guild", "Legends' Guild", "Cooks' Guild",
  "Crafting Guild", "Mining Guild", "Fishing Guild",
  "Ranging Guild", "Slayer Tower", "Wizards' Tower",
  "Dark Wizards' Tower", "Duel Arena",
  "Mage Training Arena", "Fight Caves", "Fight Kiln",
  "Barrows", "God Wars Dungeon", "Stronghold of Security",
  "Stronghold", "Daemonheim",
  // Underground cities
  "Dorgesh-Kaan", "Dorgeshuun",
  // Dungeons
  "Taverley Dungeon", "Brimhaven Dungeon",
  "Asgarnian Ice Dungeon", "Edgeville Dungeon",
  "Varrock Sewers", "Kalphite Hive", "Kalphite",
  // Other planes
  "Freneskae", "Tarddiad", "Abbinah", "Vampyrium",
  "Erebus", "Senntisten",
  // God-related names (locations, not NPCs)
  "Bandos", "Armadyl", "Saradomin", "Zamorak",
  "Seren", "Zaros", "Guthix",
  // Commonly confused with NPCs
  "Reldo", "Khazard", "Dorgesh",
]);

export const DEFAULT_COMMON_WORD_EXCLUSIONS: readonly string[] = Object.freeze([
  "area", "shed", "door", "wall", "gate", "key", "bar", "ring", "bag", "box",
  "pot", "cup", "hat", "log", "rock", "rope", "bone", "ore", "map", "net",
  "rod", "saw", "bow", "jug", "pie", "tin", "egg", "oil", "ash", "hay",
  "bed", "can", "jar", "pan", "wire", "pipe", "lamp", "sign", "tree", "bush",
  "seed", "leaf", "cage", "trap", "cart", "boot", "belt", "hide", "note",
  "book", "page", "tab", "rack", "bench", "chair", "table", "chest", "stool",
  "well", "pool", "mill", "wheel", "sink", "tap", "plank", "board", "step",
  "pile", "path", "road", "bridge", "tower", "post", "pole", "block", "slab",
  "stone", "brick", "sand", "dust", "dirt", "mud", "snow", "ice", "fire",
  "light", "edge", "bank", "hill", "cave", "hole", "pit", "gap", "bay",
  "dock", "den", "nest", "yard", "camp", "site", "base", "fort", "lid",
  "top", "end", "tip", "point", "blade", "bolt", "pin", "hook", "knob",
  "handle", "bit", "chip", "drop", "rag", "strip", "band", "knot", "link",
  "chain", "cord", "line", "gear", "ramp", "ledge", "nook", "face", "side",
  "part", "room", "hall", "floor", "ground", "place", "spot", "way", "set",
  "use", "run", "cut", "dig", "mix", "pull", "push", "turn", "move",
]);

export const DEFAULT_COMMON_WORDS: readonly string[] = Object.freeze([
  "The", "A", "An", "To", "From", "With", "In", "On", "At", "By",
  "For", "And", "Or", "But", "Of", "As", "If", "So", "Up", "Down",
  "Into", "Out", "Through", "Over", "Under", "Between", "About",
  "After", "Before", "During", "Until", "While", "Near", "Around",
  "Go", "Head", "Walk", "Run", "Travel", "Return", "Continue",
  "Take", "Give", "Get", "Make", "Find", "Look", "See", "Need",
  "Follow", "Leave", "Move", "Turn", "Bring", "Put", "Set",
  "Start", "Begin", "End", "Finish", "Complete", "Choose",
  "Select", "Click", "Right", "Left", "North", "South", "East", "West",
  "Northeast", "Northwest", "Southeast", "Southwest",
  "Talk", "Speak", "Interact", "Use", "Climb", "Cook", "Mine",
  "Fish", "Chop", "Search", "Open", "Enter", "Exit", "Cross",
  "Inspect", "Investigate", "Read", "Pick", "Picklock", "Dig",
  "Craft", "Smith", "Fletch", "Light", "Pray", "Activate",
  "Operate", "Pull", "Push", "Squeeze", "Jump", "Swing",
  "Kill", "Defeat", "Slay", "Fight", "Attack", "Destroy",
  "Teleport", "Bank", "Equip", "Wear", "Wield", "Drop", "Eat", "Drink",
  "Buy", "Sell", "Trade", "Pay", "Receive", "Obtain", "Collect",
  "Go", "Inside", "Outside", "Nearby", "Next", "Then", "Now",
  "This", "That", "These", "Those", "There", "Here", "Where",
  "You", "Your", "He", "She", "They", "His", "Her", "Their", "Its",
  "Will", "Can", "Should", "Must", "May", "Would", "Could",
  "Have", "Has", "Had", "Do", "Does", "Did", "Is", "Are", "Was", "Were",
  "Be", "Been", "Being", "Not", "No", "Yes", "All", "Some", "Any",
  "Each", "Every", "Both", "Few", "Many", "Much", "More", "Most",
  "Other", "Another", "New", "Old", "First", "Last", "Second", "Third",
  "Same", "Different", "Item", "Items", "Quest", "Step", "Level",
  "Note", "Warning", "Tip", "Optional", "Required", "Recommended",
  "Once", "Again", "Also", "Just", "Only", "Back", "Off",
  "Cut", "Chop", "Pick", "Grab", "Check", "Try", "Ask", "Tell",
  "Wait", "Stop", "Keep", "Watch", "Pass", "Reach", "Cross",
  "Examine", "Loot", "Claim", "Agree", "Accept", "Decline", "Refuse",
  "Ring", "Fairy", "Lodestone",
  "Village", "City", "Town", "Castle", "Palace", "Temple", "Cave",
  "Dungeon", "Tower", "Mine", "Forest", "Swamp", "Island", "Mountain",
  "Port", "Monastery", "Abbey", "Church", "Chapel", "Hall", "House",
  "Manor", "Keep", "Fort", "Fortress", "Ruins", "Garden", "Gardens",
  "Square", "Market", "Bridge", "Gate", "Gates", "Wall", "Walls",
  "Road", "Path", "Trail", "River", "Lake", "Sea", "Bay", "Harbour",
  "Dock", "Docks", "Shore", "Beach", "Desert", "Jungle", "Marsh",
  "Plateau", "Valley", "Hills", "Hill", "Woods", "Camp", "Outpost",
  "Quarter", "District", "Arena", "Pit", "Lair", "Den", "Nest",
  "Passage", "Tunnel", "Basement", "Cellar", "Attic", "Floor",
  "Room", "Chamber", "Cavern", "Sanctum", "Altar", "Shrine",
  "Store", "Shop", "Stall",
]);

export const DEFAULT_GAME_TERMS: readonly string[] = Object.freeze([
  // Skills
  "Attack", "Strength", "Defence", "Constitution", "Ranged", "Prayer",
  "Magic", "Runecrafting", "Construction", "Dungeoneering", "Agility",
  "Herblore", "Thieving", "Crafting", "Fletching", "Slayer", "Hunter",
  "Mining", "Smithing", "Fishing", "Cooking", "Firemaking", "Woodcutting",
  "Farming", "Summoning", "Divination", "Invention", "Archaeology", "Necromancy",
  // Runes
  "Air", "Water", "Earth", "Fire", "Mind", "Body", "Cosmic", "Chaos",
  "Nature", "Law", "Death", "Blood", "Soul", "Astral", "Mud", "Lava",
  "Steam", "Mist", "Dust", "Smoke", "Wrath", "Armadyl",
  "Air Rune", "Water Rune", "Earth Rune", "Fire Rune", "Mind Rune",
  "Body Rune", "Cosmic Rune", "Chaos Rune", "Nature Rune", "Law Rune",
  "Death Rune", "Blood Rune", "Soul Rune", "Astral Rune", "Mud Rune",
  "Lava Rune", "Steam Rune", "Mist Rune", "Dust Rune", "Smoke Rune",
  "Wrath Rune", "Armadyl Rune", "Bone Rune", "Spirit Rune", "Flesh Rune",
  "Miasma Rune", "Rune Essence", "Pure Essence",
  // Transportation
  "Fairy Ring", "Fairy Rings", "Spirit Tree", "Spirit Trees",
  "Magic Carpet", "Gnome Glider", "Charter Ship", "Canoe",
  "Eagle Transport", "Mine Cart", "Agility Shortcut",
  "Lodestone Network", "Wilderness Obelisk",
  // Combat terms
  "Special Attack", "Life Points", "Prayer Points", "Summoning Points",
  "Combat Level", "Run Energy", "Combat Triangle", "Adrenaline",
  "Full Manual", "Revolution", "Legacy Combat Mode",
  "Basic Abilities", "Threshold Abilities", "Ultimate Abilities",
  // Equipment / Items
  "Dramen Staff", "Lunar Staff", "Ring of Charos", "Ghostspeak Amulet",
  "Iban's Staff", "Amulet of Glory", "Ring of Dueling", "Games Necklace",
  "Combat Bracelet", "Ring of Wealth", "Amulet of Fury", "Ring of Life",
  "Amulet of Power", "Bracelet of Clay", "Crystal Bow", "Silver Sickle",
  "Holy Symbol", "Unholy Symbol", "Reaper Necklace",
  "Gold Bar", "Silver Bar", "Bronze Bar", "Iron Bar", "Steel Bar",
  "Mithril Bar", "Adamant Bar", "Rune Bar", "Orikalkum Bar", "Elder Rune Bar",
  "Tinderbox", "Hammer", "Chisel", "Knife", "Spade", "Rope",
  "Bucket", "Jug", "Vial", "Pestle", "Mortar",
  // Metal / Material tiers
  "Bronze", "Iron", "Steel", "Mithril", "Adamant", "Adamantite",
  "Rune", "Runite", "Dragon", "Orikalkum", "Necronium", "Bane",
  "Barrows", "Crystal", "Elder Rune", "Obsidian",
  // Potions
  "Attack Potion", "Strength Potion", "Defence Potion", "Magic Potion",
  "Ranging Potion", "Prayer Potion", "Super Attack", "Super Strength",
  "Super Defence", "Super Magic", "Super Ranging", "Restore Potion",
  "Super Restore", "Saradomin Brew", "Zamorak Brew", "Antifire Potion",
  "Super Antifire", "Antipoison", "Super Antipoison", "Energy Potion",
  "Super Energy", "Overload", "Adrenaline Potion", "Aggression Potion",
  // Food
  "Shark", "Lobster", "Swordfish", "Salmon", "Tuna", "Trout",
  "Bass", "Monkfish", "Manta Ray", "Rocktail", "Sailfish",
  "Sea Turtle", "Cooked Chicken", "Cooked Meat",
  "Great Gunkan", "Rocktail Soup",
  // Spells
  "High Level Alchemy", "Low Level Alchemy", "Superheat Item",
  "Telekinetic Grab", "Bones to Bananas", "Bones to Peaches",
  "Air Strike", "Water Strike", "Earth Strike", "Fire Strike",
  "Air Bolt", "Water Bolt", "Earth Bolt", "Fire Bolt",
  "Air Blast", "Water Blast", "Earth Blast", "Fire Blast",
  "Air Wave", "Water Wave", "Earth Wave", "Fire Wave",
  "Air Surge", "Water Surge", "Earth Surge", "Fire Surge",
  "Ice Barrage", "Blood Barrage", "Smoke Barrage", "Shadow Barrage",
  "Ice Blitz", "Blood Blitz", "Smoke Blitz", "Shadow Blitz",
  "Ice Burst", "Blood Burst", "Smoke Burst", "Shadow Burst",
  "Crumble Undead", "Slayer Dart", "Vengeance",
  "Animate Dead", "Incite Fear", "Exsanguinate", "Smoke Cloud",
  // Prayers / Curses
  "Protect from Magic", "Protect from Ranged", "Protect from Melee",
  "Protect from Necromancy", "Protect Item", "Soul Split",
  "Deflect Magic", "Deflect Ranged", "Deflect Melee", "Deflect Necromancy",
  "Piety", "Rigour", "Augury", "Turmoil", "Anguish", "Torment",
  // Logs / Wood
  "Oak Logs", "Willow Logs", "Teak Logs", "Maple Logs",
  "Yew Logs", "Magic Logs", "Elder Logs",
  // Bones
  "Big Bones", "Dragon Bones", "Wyvern Bones", "Dagannoth Bones",
  // Gems
  "Sapphire", "Emerald", "Ruby", "Diamond", "Dragonstone", "Onyx",
  // Ores
  "Copper Ore", "Tin Ore", "Iron Ore", "Coal", "Gold Ore",
  "Mithril Ore", "Adamantite Ore", "Runite Ore",
  // Summoning familiars
  "War Tortoise", "Pack Yak", "Pack Mammoth", "Spirit Wolf",
  "Spirit Terrorbird", "Bunyip", "Unicorn Stallion", "Steel Titan",
  "Iron Titan", "Abyssal Titan",
  // Weapon / Armour types
  "Scimitar", "Longsword", "Battleaxe", "Warhammer", "Halberd",
  "Crossbow", "Shortbow", "Longbow", "Platebody", "Chainbody",
  "Platelegs", "Plateskirt", "Full Helm", "Kiteshield",
  // Game locations / Concepts
  "Grand Exchange", "Slayer Tower", "Invention Guild",
  "Champions' Guild", "Warriors' Guild", "Heroes' Guild", "Legends' Guild",
  "Quest Point", "Quest Points", "Quest Cape", "Skill Cape",
  "Clue Scroll", "Treasure Trail", "Slayer Master", "Slayer Task",
  "Player-owned Port", "Player-owned House",
  // Minigames
  "Castle Wars", "Pest Control", "Soul Wars", "Barbarian Assault",
  "Fight Kiln", "Fight Cauldron", "Dominion Tower", "Shattered Worlds",
]);

export const DEFAULT_LOCATION_NAMES: readonly string[] = [...DEFAULT_RS3_LOCATION_NAMES];

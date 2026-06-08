// DEVELOPER DATA SHEET: Add new sprites, change rarities, or toggle unreleased states here.
const baseSprites = [
    { id: "water_basic", name: "Water Sprite", theme: "Basic", rarity: "Rare", unreleased: false },
    { id: "water_gold", name: "Gold Water Sprite", theme: "Gold", rarity: "Special", unreleased: false },
    { id: "water_candy", name: "Candy Water Sprite", theme: "Candy", rarity: "Special", unreleased: true },
    { id: "water_galaxy", name: "Galaxy Water Sprite", theme: "Galaxy", rarity: "Special", unreleased: true },
    { id: "water_gem", name: "Gem Water Sprite", theme: "Gem", rarity: "Special", unreleased: true },
    { id: "water_holofoil", name: "Holofoil Water Sprite", theme: "Holofoil", rarity: "Special", unreleased: true },
    
    { id: "earth_basic", name: "Earth Sprite", theme: "Basic", rarity: "Rare", unreleased: false },
    { id: "earth_gold", name: "Gold Earth Sprite", theme: "Gold", rarity: "Special", unreleased: false },
    { id: "earth_candy", name: "Candy Earth Sprite", theme: "Candy", rarity: "Special", unreleased: true },
    { id: "earth_galaxy", name: "Galaxy Earth Sprite", theme: "Galaxy", rarity: "Special", unreleased: true },
    { id: "earth_gem", name: "Gem Earth Sprite", theme: "Gem", rarity: "Special", unreleased: true },
    
    { id: "fire_basic", name: "Fire Sprite", theme: "Basic", rarity: "Rare", unreleased: false },
    { id: "fire_gold", name: "Gold Fire Sprite", theme: "Gold", rarity: "Special", unreleased: false },
    { id: "fire_candy", name: "Candy Fire Sprite", theme: "Candy", rarity: "Special", unreleased: true },
    { id: "fire_galaxy", name: "Galaxy Fire Sprite", theme: "Galaxy", rarity: "Special", unreleased: true },
    { id: "fire_holofoil", name: "Holofoil Fire Sprite", theme: "Holofoil", rarity: "Special", unreleased: true },

    { id: "duck_basic", name: "Duck Sprite", theme: "Basic", rarity: "Epic", unreleased: false },
    { id: "duck_gold", name: "Gold Duck Sprite", theme: "Gold", rarity: "Special", unreleased: false },
    { id: "duck_candy", name: "Candy Duck Sprite", theme: "Candy", rarity: "Special", unreleased: true },
    { id: "duck_galaxy", name: "Galaxy Duck Sprite", theme: "Galaxy", rarity: "Special", unreleased: true },
    { id: "duck_gem", name: "Gem Duck Sprite", theme: "Gem", rarity: "Special", unreleased: true },
	
    { id: "ghost_basic", name: "Ghost Sprite", theme: "Basic", rarity: "Epic", unreleased: false },
    { id: "ghost_gold", name: "Gold Ghost Sprite", theme: "Gold", rarity: "Special", unreleased: false },
    { id: "ghost_candy", name: "Candy Ghost Sprite", theme: "Candy", rarity: "Special", unreleased: true },
    { id: "ghost_galaxy", name: "Galaxy Ghost Sprite", theme: "Galaxy", rarity: "Special", unreleased: true },
    { id: "ghost_holofoil", name: "Holofoil Ghost Sprite", theme: "Holofoil", rarity: "Special", unreleased: true },
	
    { id: "dream_basic", name: "Dream Sprite", theme: "Basic", rarity: "Legendary", unreleased: false },
    { id: "dream_gold", name: "Gold Dream Sprite", theme: "Gold", rarity: "Special", unreleased: false },
    { id: "dream_candy", name: "Candy Dream Sprite", theme: "Candy", rarity: "Special", unreleased: true },
    { id: "dream_galaxy", name: "Galaxy Dream Sprite", theme: "Galaxy", rarity: "Special", unreleased: true },
    { id: "dream_rift", name: "Rift Dream Sprite", theme: "Rift", rarity: "Special", unreleased: true },
	
    { id: "demon_basic", name: "Demon Sprite", theme: "Basic", rarity: "Epic", unreleased: false },
    { id: "demon_gold", name: "Gold Demon Sprite", theme: "Gold", rarity: "Special", unreleased: false },
    { id: "demon_candy", name: "Candy Demon Sprite", theme: "Candy", rarity: "Special", unreleased: true },
    { id: "demon_gem", name: "Gem Demon Sprite", theme: "Gem", rarity: "Special", unreleased: true },

	{ id: "punk_basic", name: "Punk Sprite", theme: "Basic", rarity: "XXXXXXX", unreleased: false },
    { id: "punk_gold", name: "Gold Punk Sprite", theme: "Gold", rarity: "Special", unreleased: false },
    { id: "punk_candy", name: "Candy Punk Sprite", theme: "Candy", rarity: "Special", unreleased: true },
    { id: "punk_galaxy", name: "Galaxy Punk Sprite", theme: "Galaxy", rarity: "Special", unreleased: true },
    { id: "punk_gem", name: "Gem Punk Sprite", theme: "Gem", rarity: "Special", unreleased: true },
    { id: "punk_rift", name: "Rift Punk Sprite", theme: "Rift", rarity: "Special", unreleased: true },

	{ id: "king_basic", name: "King Sprite", theme: "Basic", rarity: "XXXXXXX", unreleased: false },
    { id: "king_gold", name: "Gold King Sprite", theme: "Gold", rarity: "Special", unreleased: false },
    { id: "king_candy", name: "Candy King Sprite", theme: "Candy", rarity: "Special", unreleased: true },
    { id: "king_galaxy", name: "Galaxy King Sprite", theme: "Galaxy", rarity: "Special", unreleased: true },
    { id: "king_holofoil", name: "Holofoil King Sprite", theme: "Holofoil", rarity: "Special", unreleased: true },

    { id: "zeropoint_basic", name: "Zero Point Sprite", theme: "Basic", rarity: "Mythic", unreleased: false },
    { id: "zeropoint_gold", name: "Gold Zero Point Sprite", theme: "Gold", rarity: "Special", unreleased: false },
    { id: "zeropoint_candy", name: "Candy Zero Point Sprite", theme: "Candy", rarity: "Special", unreleased: true },
    { id: "zeropoint_galaxy", name: "Galaxy Zero Point Sprite", theme: "Galaxy", rarity: "Special", unreleased: true },
    { id: "zeropoint_gem", name: "Gem Zero Point Sprite", theme: "Gem", rarity: "Special", unreleased: true },
    { id: "zeropoint_holofoil", name: "Holofoil Zero Point Sprite", theme: "Holofoil", rarity: "Special", unreleased: true },
	
    { id: "theburntpeanut_basic", name: "TheBurntPeanut Sprite", theme: "Basic", rarity: "Mythic", unreleased: true },
];

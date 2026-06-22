// DEVELOPER DATA SHEET: Add new sprites, change rarities, or toggle unreleased states here.
const baseSprites = [
    { id: "water_basic", name: "Water", theme: "Basic", rarity: "Rare", unreleased: false },
    { id: "water_gold", name: "Gold Water", theme: "Gold", rarity: "Special", unreleased: false },
    { id: "water_candy", name: "Gummy Water", theme: "Candy", rarity: "Special", unreleased: false },
    { id: "water_galaxy", name: "Galaxy Water", theme: "Galaxy", rarity: "Special", unreleased: false },
    { id: "water_gem", name: "Gem Water", theme: "Gem", rarity: "Special", unreleased: true },
    { id: "water_holofoil", name: "Holofoil Water", theme: "Holofoil", rarity: "Special", unreleased: true },
    
    { id: "earth_basic", name: "Earth", theme: "Basic", rarity: "Rare", unreleased: false },
    { id: "earth_gold", name: "Gold Earth", theme: "Gold", rarity: "Special", unreleased: false },
    { id: "earth_candy", name: "Gummy Earth", theme: "Candy", rarity: "Special", unreleased: false },
    { id: "earth_galaxy", name: "Galaxy Earth", theme: "Galaxy", rarity: "Special", unreleased: false },
    { id: "earth_gem", name: "Gem Earth", theme: "Gem", rarity: "Special", unreleased: true },
    
    { id: "fire_basic", name: "Fire", theme: "Basic", rarity: "Rare", unreleased: false },
    { id: "fire_gold", name: "Gold Fire", theme: "Gold", rarity: "Special", unreleased: false },
    { id: "fire_candy", name: "Gummy Fire", theme: "Candy", rarity: "Special", unreleased: false },
    { id: "fire_galaxy", name: "Galaxy Fire", theme: "Galaxy", rarity: "Special", unreleased: false },
    { id: "fire_holofoil", name: "Holofoil Fire", theme: "Holofoil", rarity: "Special", unreleased: true },

    { id: "duck_basic", name: "Duck", theme: "Basic", rarity: "Epic", unreleased: false },
    { id: "duck_gold", name: "Gold Duck", theme: "Gold", rarity: "Special", unreleased: false },
    { id: "duck_candy", name: "Gummy Duck", theme: "Candy", rarity: "Special", unreleased: false },
    { id: "duck_galaxy", name: "Galaxy Duck", theme: "Galaxy", rarity: "Special", unreleased: false },
    { id: "duck_gem", name: "Gem Duck", theme: "Gem", rarity: "Special", unreleased: true },
	
    { id: "ghost_basic", name: "Ghost", theme: "Basic", rarity: "Epic", unreleased: false },
    { id: "ghost_gold", name: "Gold Ghost", theme: "Gold", rarity: "Special", unreleased: false },
    { id: "ghost_candy", name: "Gummy Ghost", theme: "Candy", rarity: "Special", unreleased: false },
    { id: "ghost_galaxy", name: "Galaxy Ghost", theme: "Galaxy", rarity: "Special", unreleased: false },
    { id: "ghost_holofoil", name: "Holofoil Ghost", theme: "Holofoil", rarity: "Special", unreleased: true },
	
    { id: "dream_basic", name: "Dream", theme: "Basic", rarity: "Legendary", unreleased: false },
    { id: "dream_gold", name: "Gold Dream", theme: "Gold", rarity: "Special", unreleased: false },
    { id: "dream_candy", name: "Gummy Dream", theme: "Candy", rarity: "Special", unreleased: false },
    { id: "dream_galaxy", name: "Galaxy Dream", theme: "Galaxy", rarity: "Special", unreleased: false },
    { id: "dream_rift", name: "Rift Dream", theme: "Rift", rarity: "Special", unreleased: true },
	
    { id: "demon_basic", name: "Demon", theme: "Basic", rarity: "Epic", unreleased: false },
    { id: "demon_gold", name: "Gold Demon", theme: "Gold", rarity: "Special", unreleased: false },
    { id: "demon_candy", name: "Gummy Demon", theme: "Candy", rarity: "Special", unreleased: false },
	{ id: "demon_galaxy", name: "Galaxy Demon", theme: "Galaxy", rarity: "Special", unreleased: false },
    { id: "demon_gem", name: "Gem Demon", theme: "Gem", rarity: "Special", unreleased: true },

	{ id: "punk_basic", name: "Punk", theme: "Basic", rarity: "Legendary", unreleased: false },
    { id: "punk_gold", name: "Gold Punk", theme: "Gold", rarity: "Special", unreleased: false },
    { id: "punk_candy", name: "Gummy Punk", theme: "Candy", rarity: "Special", unreleased: false },
    { id: "punk_galaxy", name: "Galaxy Punk", theme: "Galaxy", rarity: "Special", unreleased: false },
    { id: "punk_gem", name: "Gem Punk", theme: "Gem", rarity: "Special", unreleased: true },
    { id: "punk_rift", name: "Rift Punk", theme: "Rift", rarity: "Special", unreleased: true },

	{ id: "king_basic", name: "King", theme: "Basic", rarity: "Epic", unreleased: false },
    { id: "king_gold", name: "Gold King", theme: "Gold", rarity: "Special", unreleased: false },
    { id: "king_candy", name: "Gummy King", theme: "Candy", rarity: "Special", unreleased: false },
    { id: "king_galaxy", name: "Galaxy King", theme: "Galaxy", rarity: "Special", unreleased: false },
    { id: "king_holofoil", name: "Holofoil King", theme: "Holofoil", rarity: "Special", unreleased: true },

    { id: "zeropoint_basic", name: "Zero Point", theme: "Basic", rarity: "Mythic", unreleased: false },
    { id: "zeropoint_gold", name: "Gold Zero Point", theme: "Gold", rarity: "Special", unreleased: false },
    { id: "zeropoint_candy", name: "Gummy Zero Point", theme: "Candy", rarity: "Special", unreleased: false },
    { id: "zeropoint_galaxy", name: "Galaxy Zero Point", theme: "Galaxy", rarity: "Special", unreleased: false },
    { id: "zeropoint_gem", name: "Gem Zero Point", theme: "Gem", rarity: "Special", unreleased: true },
    { id: "zeropoint_holofoil", name: "Holofoil Zero Point", theme: "Holofoil", rarity: "Special", unreleased: true },
	
    { id: "theburntpeanut_basic", name: "Burnt Peanut", theme: "Basic", rarity: "Mythic", unreleased: false },
	
	{ id: "aura_basic", name: "Aura", theme: "Basic", rarity: "Rare", unreleased: true },
	{ id: "boss_basic", name: "Boss", theme: "Basic", rarity: "Rare", unreleased: true },
	{ id: "fishy_basic", name: "Fishy", theme: "Basic", rarity: "Rare", unreleased: true },
	{ id: "striker_basic", name: "Striker", theme: "Basic", rarity: "Rare", unreleased: true },
	{ id: "reaper_basic", name: "Grim Reaper", theme: "Basic", rarity: "Rare", unreleased: true },
	{ id: "reaper_galaxy", name: "Galaxy Grim Reaper", theme: "Galaxy", rarity: "Special", unreleased: true },

	{ id: "wick_basic", name: "John Wick", theme: "Basic", rarity: "Rare", unreleased: true },
	
	{ id: "drifter_basic", name: "Drifter", theme: "Basic", rarity: "Rare", unreleased: true },
	{ id: "ice_basic", name: "Ice", theme: "Basic", rarity: "Rare", unreleased: true },
	{ id: "seven_basic", name: "Seven", theme: "Basic", rarity: "Rare", unreleased: true },

];

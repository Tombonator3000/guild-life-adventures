// Guild Life - Items and Shopping Data

export interface Item {
  id: string;
  name: string;
  category: 'food' | 'clothing' | 'appliance' | 'luxury' | 'weapon' | 'magic';
  basePrice: number;
  effect?: {
    type: 'happiness' | 'health' | 'clothing' | 'food';
    value: number;
  };
  description: string;
}

// General Store items (Z-Mart equivalent)
export const GENERAL_STORE_ITEMS: Item[] = [
  // Food items
  {
    id: 'bread',
    name: 'Loaf of Bread',
    category: 'food',
    basePrice: 5,
    effect: { type: 'food', value: 10 },
    description: 'Basic sustenance. Keeps hunger at bay.',
  },
  {
    id: 'cheese',
    name: 'Wheel of Cheese',
    category: 'food',
    basePrice: 8,
    effect: { type: 'food', value: 15 },
    description: 'Aged cheese from local dairies.',
  },
  {
    id: 'meat',
    name: 'Salted Meat',
    category: 'food',
    basePrice: 15,
    effect: { type: 'food', value: 25 },
    description: 'Preserved meat that lasts for weeks.',
  },
  {
    id: 'provisions',
    name: 'Week of Provisions',
    category: 'food',
    basePrice: 30,
    effect: { type: 'food', value: 50 },
    description: 'Enough food for a full week.',
  },
  {
    id: 'feast',
    name: 'Feast Supplies',
    category: 'food',
    basePrice: 50,
    effect: { type: 'food', value: 100 },
    description: 'Enough to throw a small party!',
  },
  // Consumables/Supplies
  {
    id: 'candles',
    name: 'Bundle of Candles',
    category: 'appliance',
    basePrice: 10,
    effect: { type: 'happiness', value: 2 },
    description: 'Light up your dwelling.',
  },
  {
    id: 'blanket',
    name: 'Wool Blanket',
    category: 'appliance',
    basePrice: 25,
    effect: { type: 'happiness', value: 5 },
    description: 'Stay warm on cold nights.',
  },
];

// Shadow Market items (Black's Market equivalent)
export const SHADOW_MARKET_ITEMS: Item[] = [
  {
    id: 'mystery-meat',
    name: 'Mystery Meat',
    category: 'food',
    basePrice: 3,
    effect: { type: 'food', value: 15 },
    description: 'Do not ask where this came from.',
  },
  {
    id: 'stolen-goods',
    name: 'Stolen Goods',
    category: 'luxury',
    basePrice: 20,
    effect: { type: 'happiness', value: 10 },
    description: 'Fell off a merchant cart, surely.',
  },
  {
    id: 'lottery-ticket',
    name: 'Lottery Ticket',
    category: 'luxury',
    basePrice: 10,
    description: 'Try your luck! Win big or lose it all.',
  },
  {
    id: 'black-market-intel',
    name: 'Market Intel',
    category: 'luxury',
    basePrice: 50,
    description: 'Information about upcoming price changes.',
  },
];

// Armory items (QT Clothing equivalent)
export const ARMORY_ITEMS: Item[] = [
  // Clothing
  {
    id: 'peasant-garb',
    name: 'Peasant Garb',
    category: 'clothing',
    basePrice: 25,
    effect: { type: 'clothing', value: 50 },
    description: 'Simple clothes for simple folk.',
  },
  {
    id: 'common-clothes',
    name: 'Common Clothes',
    category: 'clothing',
    basePrice: 50,
    effect: { type: 'clothing', value: 75 },
    description: 'Respectable attire for everyday work.',
  },
  {
    id: 'fine-clothes',
    name: 'Fine Clothes',
    category: 'clothing',
    basePrice: 100,
    effect: { type: 'clothing', value: 100 },
    description: 'Quality garments for professionals.',
  },
  {
    id: 'noble-attire',
    name: 'Noble Attire',
    category: 'clothing',
    basePrice: 250,
    effect: { type: 'clothing', value: 100 },
    description: 'Luxurious clothing fit for nobility.',
  },
  {
    id: 'guild-uniform',
    name: 'Guild Uniform',
    category: 'clothing',
    basePrice: 150,
    effect: { type: 'clothing', value: 100 },
    description: 'Official uniform for guild work.',
  },
  // Weapons (for show, affect happiness)
  {
    id: 'dagger',
    name: 'Simple Dagger',
    category: 'weapon',
    basePrice: 30,
    effect: { type: 'happiness', value: 3 },
    description: 'A basic self-defense weapon.',
  },
  {
    id: 'sword',
    name: 'Iron Sword',
    category: 'weapon',
    basePrice: 80,
    effect: { type: 'happiness', value: 8 },
    description: 'A reliable blade for adventurers.',
  },
  {
    id: 'shield',
    name: 'Wooden Shield',
    category: 'weapon',
    basePrice: 40,
    effect: { type: 'happiness', value: 4 },
    description: 'Protection against blows.',
  },
];

// Enchanter items (Socket City equivalent)
export const ENCHANTER_ITEMS: Item[] = [
  {
    id: 'glow-orb',
    name: 'Glow Orb',
    category: 'magic',
    basePrice: 50,
    effect: { type: 'happiness', value: 5 },
    description: 'Magical light source that never dims.',
  },
  {
    id: 'warmth-stone',
    name: 'Stone of Warmth',
    category: 'magic',
    basePrice: 100,
    effect: { type: 'happiness', value: 10 },
    description: 'Keeps your home warm without fire.',
  },
  {
    id: 'preservation-box',
    name: 'Preservation Box',
    category: 'magic',
    basePrice: 150,
    effect: { type: 'happiness', value: 8 },
    description: 'Keeps food fresh indefinitely.',
  },
  {
    id: 'scrying-mirror',
    name: 'Scrying Mirror',
    category: 'magic',
    basePrice: 300,
    effect: { type: 'happiness', value: 15 },
    description: 'See distant places and people.',
  },
  {
    id: 'healing-potion',
    name: 'Healing Potion',
    category: 'magic',
    basePrice: 75,
    effect: { type: 'health', value: 50 },
    description: 'Restores health instantly.',
  },
];

// Tavern food items (Monolith Burger equivalent)
export const TAVERN_ITEMS: Item[] = [
  {
    id: 'ale',
    name: 'Mug of Ale',
    category: 'food',
    basePrice: 3,
    effect: { type: 'happiness', value: 3 },
    description: 'A refreshing drink after hard work.',
  },
  {
    id: 'stew',
    name: 'Hearty Stew',
    category: 'food',
    basePrice: 8,
    effect: { type: 'food', value: 20 },
    description: 'Hot, filling, and delicious.',
  },
  {
    id: 'roast',
    name: 'Roast Dinner',
    category: 'food',
    basePrice: 15,
    effect: { type: 'food', value: 35 },
    description: 'A proper meal with all the trimmings.',
  },
  {
    id: 'feast',
    name: 'Tavern Feast',
    category: 'food',
    basePrice: 30,
    effect: { type: 'food', value: 50 },
    description: 'The best the Rusty Tankard has to offer!',
  },
];

export const getItem = (id: string): Item | undefined => {
  const allItems = [
    ...GENERAL_STORE_ITEMS,
    ...SHADOW_MARKET_ITEMS,
    ...ARMORY_ITEMS,
    ...ENCHANTER_ITEMS,
    ...TAVERN_ITEMS,
  ];
  return allItems.find(item => item.id === id);
};

export const getItemPrice = (item: Item, priceModifier: number): number => {
  return Math.round(item.basePrice * priceModifier);
};

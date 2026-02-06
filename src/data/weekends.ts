// Guild Life - Weekend System (Jones-style)
// Between-turn activities that cost gold and give happiness

export interface WeekendActivity {
  id: string;
  name: string;
  cost: number;          // Gold cost
  happiness: number;     // Happiness gained
  description: string;
  minWeek?: number;      // Earliest week this can occur
  tier: 'cheap' | 'medium' | 'expensive';
}

// Ticket types (fantasy equivalents of Baseball/Theatre/Concert)
export interface TicketType {
  id: string;
  name: string;
  price: number;
  happiness: number;
  activity: string; // Description of the weekend when ticket is used
}

export const TICKET_TYPES: TicketType[] = [
  {
    id: 'jousting',
    name: 'Jousting Tournament Ticket',
    price: 25,
    happiness: 8,
    activity: 'Watched the jousting tournament! Knights clashed in epic combat.',
  },
  {
    id: 'theatre',
    name: 'Theatre Performance Ticket',
    price: 40,
    happiness: 10,
    activity: 'Enjoyed a theatrical performance at the Grand Stage.',
  },
  {
    id: 'bard-concert',
    name: 'Bard Concert Ticket',
    price: 50,
    happiness: 12,
    activity: 'Attended a grand bard concert! The music was enchanting.',
  },
];

// Durable-triggered weekend activities (20% chance per durable)
export const DURABLE_WEEKENDS: Record<string, WeekendActivity> = {
  'scrying-mirror': {
    id: 'scrying-weekend',
    name: 'Scrying Session',
    cost: 0,
    happiness: 3,
    description: 'Spent the weekend watching distant lands through your Scrying Mirror.',
    tier: 'cheap',
  },
  'memory-crystal': {
    id: 'memory-weekend',
    name: 'Memory Crystal Replay',
    cost: 0,
    happiness: 3,
    description: 'Relived favorite memories through your Memory Crystal.',
    tier: 'cheap',
  },
  'music-box': {
    id: 'music-weekend',
    name: 'Music Box Concert',
    cost: 0,
    happiness: 4,
    description: 'Your Enchanted Music Box played beautiful melodies all weekend.',
    tier: 'cheap',
  },
  'cooking-fire': {
    id: 'cooking-weekend',
    name: 'Cooking Weekend',
    cost: 5,
    happiness: 3,
    description: 'Spent the weekend cooking exotic dishes on your Eternal Cooking Fire.',
    tier: 'cheap',
  },
  'arcane-tome': {
    id: 'study-weekend',
    name: 'Arcane Study',
    cost: 0,
    happiness: 2,
    description: 'Spent the weekend absorbed in your Arcane Tome.',
    tier: 'cheap',
  },
};

// Random weekend activities (when no tickets or durable weekends trigger)
export const RANDOM_WEEKENDS: WeekendActivity[] = [
  // Cheap ($5-20) - always available
  { id: 'rw-walk', name: 'Walk in the Park', cost: 5, happiness: 2, description: 'Took a peaceful walk through the city gardens.', tier: 'cheap' },
  { id: 'rw-fishing', name: 'Fishing at the River', cost: 5, happiness: 2, description: 'Spent the day fishing at the river.', tier: 'cheap' },
  { id: 'rw-market-browse', name: 'Market Browsing', cost: 8, happiness: 2, description: 'Browsed the weekend market stalls.', tier: 'cheap' },
  { id: 'rw-street-food', name: 'Street Food Tour', cost: 10, happiness: 3, description: 'Sampled street food from various vendors.', tier: 'cheap' },
  { id: 'rw-nap', name: 'Long Nap', cost: 0, happiness: 2, description: 'Slept in all weekend. Very relaxing.', tier: 'cheap' },
  { id: 'rw-people-watch', name: 'People Watching', cost: 3, happiness: 1, description: 'Watched the townsfolk go about their business.', tier: 'cheap' },
  { id: 'rw-card-game', name: 'Card Game', cost: 10, happiness: 3, description: 'Played cards with some locals at the tavern.', tier: 'cheap' },
  { id: 'rw-gardening', name: 'Tended a Garden', cost: 5, happiness: 2, description: 'Helped tend a community garden plot.', tier: 'cheap' },
  { id: 'rw-tavern-ale', name: 'Ales at the Tavern', cost: 15, happiness: 3, description: 'Enjoyed several ales at the Rusty Tankard.', tier: 'cheap' },
  { id: 'rw-campfire', name: 'Campfire Stories', cost: 5, happiness: 2, description: 'Shared stories around a campfire.', tier: 'cheap' },
  // Medium ($15-55) - available weeks 1-7 too
  { id: 'rw-feast', name: 'Weekend Feast', cost: 25, happiness: 5, description: 'Enjoyed a lavish weekend feast.', tier: 'medium' },
  { id: 'rw-horse-ride', name: 'Horse Riding', cost: 20, happiness: 4, description: 'Went horse riding through the countryside.', tier: 'medium' },
  { id: 'rw-archery', name: 'Archery Contest', cost: 15, happiness: 4, description: 'Entered an archery contest at the fairgrounds.', tier: 'medium' },
  { id: 'rw-fortune-teller', name: 'Fortune Teller', cost: 30, happiness: 4, description: 'Visited a fortune teller in the market.', tier: 'medium' },
  { id: 'rw-bathhouse', name: 'Bathhouse Visit', cost: 20, happiness: 5, description: 'Relaxed at the city bathhouse all day.', tier: 'medium' },
  { id: 'rw-arena', name: 'Arena Spectacle', cost: 35, happiness: 6, description: 'Watched gladiatorial combat at the arena.', tier: 'medium' },
  { id: 'rw-river-cruise', name: 'River Cruise', cost: 30, happiness: 5, description: 'Took a scenic cruise down the river.', tier: 'medium' },
  { id: 'rw-dance', name: 'Town Dance', cost: 15, happiness: 4, description: 'Danced the night away at the town square.', tier: 'medium' },
  { id: 'rw-museum', name: 'Museum Visit', cost: 20, happiness: 3, description: 'Visited the museum of ancient artifacts.', tier: 'medium' },
  { id: 'rw-picnic', name: 'Countryside Picnic', cost: 25, happiness: 5, description: 'Had a lovely picnic in the meadows.', tier: 'medium' },
  // Expensive ($50-100) - only after week 8
  { id: 'rw-ball', name: 'Grand Ball', cost: 80, happiness: 10, description: 'Attended a magnificent ball at the castle.', tier: 'expensive' },
  { id: 'rw-spa', name: 'Royal Spa Day', cost: 60, happiness: 8, description: 'Spent the day at the exclusive royal spa.', tier: 'expensive' },
  { id: 'rw-hunting', name: 'Noble Hunt', cost: 70, happiness: 8, description: 'Joined a noble hunting party in the royal forest.', tier: 'expensive' },
  { id: 'rw-yacht', name: 'Boat Cruise', cost: 50, happiness: 7, description: 'Hired a boat for a luxurious lake cruise.', tier: 'expensive' },
  { id: 'rw-banquet', name: 'Royal Banquet', cost: 100, happiness: 12, description: 'Attended a royal banquet at the palace.', tier: 'expensive' },
  { id: 'rw-magic-show', name: 'Grand Magic Show', cost: 55, happiness: 8, description: 'Witnessed an incredible display of magical arts.', tier: 'expensive' },
];

// Select a weekend activity for a player
export function selectWeekendActivity(
  tickets: string[],
  appliances: Record<string, { isBroken: boolean }>,
  week: number,
  gold: number,
): { activity: WeekendActivity; ticketUsed?: string; durableUsed?: string } | null {
  // Priority 1: Ticket weekends
  // Priority order: jousting > theatre > bard-concert
  for (const ticketType of TICKET_TYPES) {
    if (tickets.includes(ticketType.id)) {
      return {
        activity: {
          id: `ticket-${ticketType.id}`,
          name: ticketType.name,
          cost: 0, // Already paid when buying ticket
          happiness: ticketType.happiness,
          description: ticketType.activity,
          tier: 'medium',
        },
        ticketUsed: ticketType.id,
      };
    }
  }

  // Priority 2: Durable weekends (20% chance each)
  for (const [applianceId, weekendDef] of Object.entries(DURABLE_WEEKENDS)) {
    const owned = appliances[applianceId];
    if (owned && !owned.isBroken && Math.random() < 0.20) {
      return {
        activity: weekendDef,
        durableUsed: applianceId,
      };
    }
  }

  // Priority 3: Random weekends — prefer better tiers when affordable
  const availableWeekends = RANDOM_WEEKENDS.filter(w => {
    // Filter by tier availability
    if (w.tier === 'expensive' && week < 8) return false;
    // Must be able to afford it
    if (w.cost > gold) return false;
    return true;
  });

  if (availableWeekends.length === 0) {
    // Fallback: free weekend
    return {
      activity: {
        id: 'rw-stayed-home',
        name: 'Stayed Home',
        cost: 0,
        happiness: 1,
        description: 'Spent a quiet weekend at home.',
        tier: 'cheap',
      },
    };
  }

  // Weighted selection: expensive 3x, medium 2x, cheap 1x weight
  const TIER_WEIGHTS: Record<string, number> = { expensive: 3, medium: 2, cheap: 1 };
  const weighted = availableWeekends.flatMap(w => {
    const weight = TIER_WEIGHTS[w.tier] ?? 1;
    return Array(weight).fill(w);
  });
  const selected = weighted[Math.floor(Math.random() * weighted.length)];
  return { activity: selected };
}

export function getTicketType(id: string): TicketType | undefined {
  return TICKET_TYPES.find(t => t.id === id);
}

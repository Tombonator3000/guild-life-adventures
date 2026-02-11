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
    activity: 'Watched the jousting tournament! Two grown men on horses tried to poke each other with sticks. Magnificent.',
  },
  {
    id: 'theatre',
    name: 'Theatre Performance Ticket',
    price: 40,
    happiness: 10,
    activity: 'Enjoyed a theatrical performance at the Grand Stage. The acting was wooden. The stage was also wooden. Thematic.',
  },
  {
    id: 'bard-concert',
    name: 'Bard Concert Ticket',
    price: 50,
    happiness: 12,
    activity: 'Attended a grand bard concert! Three encores, two standing ovations, and one lute string casualty.',
  },
];

// Durable-triggered weekend activities (20% chance per durable)
export const DURABLE_WEEKENDS: Record<string, WeekendActivity> = {
  'scrying-mirror': {
    id: 'scrying-weekend',
    name: 'Scrying Session',
    cost: 0,
    happiness: 3,
    description: 'Spent the weekend watching distant lands through your Scrying Mirror. You\'re basically a medieval couch potato now.',
    tier: 'cheap',
  },
  'memory-crystal': {
    id: 'memory-weekend',
    name: 'Memory Crystal Replay',
    cost: 0,
    happiness: 3,
    description: 'Relived favorite memories through your Memory Crystal. Cried a little. Denied it to everyone.',
    tier: 'cheap',
  },
  'music-box': {
    id: 'music-weekend',
    name: 'Music Box Concert',
    cost: 0,
    happiness: 4,
    description: 'Your Enchanted Music Box played the same three melodies all weekend. You love them. You hate them. You love them again.',
    tier: 'cheap',
  },
  'cooking-fire': {
    id: 'cooking-weekend',
    name: 'Cooking Weekend',
    cost: 5,
    happiness: 3,
    description: 'Spent the weekend cooking exotic dishes on your Eternal Cooking Fire. Everything was slightly burnt. Still delicious.',
    tier: 'cheap',
  },
  'arcane-tome': {
    id: 'study-weekend',
    name: 'Arcane Study',
    cost: 0,
    happiness: 2,
    description: 'Spent the weekend absorbed in your Arcane Tome. The Tome absorbed you right back. Mutual reading.',
    tier: 'cheap',
  },
};

// Random weekend activities (when no tickets or durable weekends trigger)
export const RANDOM_WEEKENDS: WeekendActivity[] = [
  // Cheap ($5-20) - always available
  { id: 'rw-walk', name: 'Walk in the Park', cost: 5, happiness: 2, description: 'Took a peaceful walk through the city gardens. Saw a squirrel. It judged you.', tier: 'cheap' },
  { id: 'rw-fishing', name: 'Fishing at the River', cost: 5, happiness: 2, description: 'Spent the day fishing at the river. Caught nothing. Achieved inner peace. Mostly boredom.', tier: 'cheap' },
  { id: 'rw-market-browse', name: 'Market Browsing', cost: 8, happiness: 2, description: 'Browsed the weekend market stalls. Bought nothing. Touched everything. The vendors loved that.', tier: 'cheap' },
  { id: 'rw-street-food', name: 'Street Food Tour', cost: 10, happiness: 3, description: 'Sampled street food from various vendors. Your stomach is either grateful or plotting revenge.', tier: 'cheap' },
  { id: 'rw-nap', name: 'Long Nap', cost: 0, happiness: 2, description: 'Slept in all weekend. Accomplished absolutely nothing. Glorious.', tier: 'cheap' },
  { id: 'rw-people-watch', name: 'People Watching', cost: 3, happiness: 1, description: 'Watched the townsfolk go about their business. You\'re not being creepy. You\'re "observing society."', tier: 'cheap' },
  { id: 'rw-card-game', name: 'Card Game', cost: 10, happiness: 3, description: 'Played cards with some locals at the tavern. Lost horribly. Claimed you were "letting them win."', tier: 'cheap' },
  { id: 'rw-gardening', name: 'Tended a Garden', cost: 5, happiness: 2, description: 'Helped tend a community garden plot. Pulled up three weeds and one vegetable. Oops.', tier: 'cheap' },
  { id: 'rw-tavern-ale', name: 'Ales at the Tavern', cost: 15, happiness: 3, description: 'Enjoyed several ales at the Rusty Tankard. Lost count. Found meaning. Lost meaning. Found more ale.', tier: 'cheap' },
  { id: 'rw-campfire', name: 'Campfire Stories', cost: 5, happiness: 2, description: 'Shared stories around a campfire. Your story was the best. Everyone else\'s opinion is wrong.', tier: 'cheap' },
  // Medium ($15-55) - available weeks 1-7 too
  { id: 'rw-feast', name: 'Weekend Feast', cost: 25, happiness: 5, description: 'Enjoyed a lavish weekend feast. Ate until you hated yourself. Worth it.', tier: 'medium' },
  { id: 'rw-horse-ride', name: 'Horse Riding', cost: 20, happiness: 4, description: 'Went horse riding through the countryside. The horse tolerated you. High praise from a horse.', tier: 'medium' },
  { id: 'rw-archery', name: 'Archery Contest', cost: 15, happiness: 4, description: 'Entered an archery contest at the fairgrounds. Hit the target once. Hit a bystander never. Victory.', tier: 'medium' },
  { id: 'rw-fortune-teller', name: 'Fortune Teller', cost: 30, happiness: 4, description: 'Visited a fortune teller in the market. She predicted you\'d spend 30 gold. She was right.', tier: 'medium' },
  { id: 'rw-bathhouse', name: 'Bathhouse Visit', cost: 20, happiness: 5, description: 'Relaxed at the city bathhouse all day. Emerged looking like a prune. A happy, relaxed prune.', tier: 'medium' },
  { id: 'rw-arena', name: 'Arena Spectacle', cost: 35, happiness: 6, description: 'Watched gladiatorial combat at the arena. Thrilling, violent, and the popcorn was overpriced.', tier: 'medium' },
  { id: 'rw-river-cruise', name: 'River Cruise', cost: 30, happiness: 5, description: 'Took a scenic cruise down the river. Saw two ducks and a suspicious log. Peak tourism.', tier: 'medium' },
  { id: 'rw-dance', name: 'Town Dance', cost: 15, happiness: 4, description: 'Danced the night away at the town square. Your moves were... unique. The crowd was... polite.', tier: 'medium' },
  { id: 'rw-museum', name: 'Museum Visit', cost: 20, happiness: 3, description: 'Visited the museum of ancient artifacts. Everything was behind glass. Touched it anyway when no one looked.', tier: 'medium' },
  { id: 'rw-picnic', name: 'Countryside Picnic', cost: 25, happiness: 5, description: 'Had a lovely picnic in the meadows. Ants attended uninvited. Ate more than you did.', tier: 'medium' },
  // Expensive ($50-100) - only after week 8
  { id: 'rw-ball', name: 'Grand Ball', cost: 80, happiness: 10, description: 'Attended a magnificent ball at the castle. Pretended to belong. Fooled approximately nobody.', tier: 'expensive' },
  { id: 'rw-spa', name: 'Royal Spa Day', cost: 60, happiness: 8, description: 'Spent the day at the exclusive royal spa. Hot stones, cold drinks, and an alarming amount of cucumber.', tier: 'expensive' },
  { id: 'rw-hunting', name: 'Noble Hunt', cost: 70, happiness: 8, description: 'Joined a noble hunting party in the royal forest. The fox escaped. The nobles blamed each other. Excellent day.', tier: 'expensive' },
  { id: 'rw-yacht', name: 'Boat Cruise', cost: 50, happiness: 7, description: 'Hired a boat for a luxurious lake cruise. Only got slightly seasick. On a lake. Embarrassing.', tier: 'expensive' },
  { id: 'rw-banquet', name: 'Royal Banquet', cost: 100, happiness: 12, description: 'Attended a royal banquet at the palace. Used the wrong fork three times. Nobody noticed. Probably.', tier: 'expensive' },
  { id: 'rw-magic-show', name: 'Grand Magic Show', cost: 55, happiness: 8, description: 'Witnessed an incredible display of magical arts. Only two things caught fire. A new record for the performer.', tier: 'expensive' },
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
        description: 'Spent a quiet weekend at home. Did nothing. Felt guilty about doing nothing. Classic.',
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

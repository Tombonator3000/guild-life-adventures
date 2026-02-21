/**
 * UserManual — Full-screen scrollable game manual with chapter navigation.
 * Accessible from OptionsMenu, SaveLoadMenu, and TitleScreen.
 */

import { useState, useRef, useEffect } from 'react';
import {
  X, BookOpen, Map, Clock, Briefcase, GraduationCap, Home,
  ShoppingBag, Heart, Sword, Coins, Skull, Calendar, Trophy,
  Lightbulb, ChevronLeft, ChevronRight, ScrollText, Sparkles,
} from 'lucide-react';

interface UserManualProps {
  onClose: () => void;
}

type ChapterId =
  | 'welcome'
  | 'getting-started'
  | 'board'
  | 'turns'
  | 'jobs'
  | 'education'
  | 'housing'
  | 'items'
  | 'health'
  | 'combat'
  | 'economy'
  | 'crime'
  | 'dark-magic'
  | 'weekends'
  | 'victory'
  | 'tips';

interface Chapter {
  id: ChapterId;
  title: string;
  icon: React.ReactNode;
}

const CHAPTERS: Chapter[] = [
  { id: 'welcome', title: 'Welcome', icon: <BookOpen className="w-4 h-4" /> },
  { id: 'getting-started', title: 'Getting Started', icon: <ScrollText className="w-4 h-4" /> },
  { id: 'board', title: 'The Board', icon: <Map className="w-4 h-4" /> },
  { id: 'turns', title: 'Turns & Time', icon: <Clock className="w-4 h-4" /> },
  { id: 'jobs', title: 'Jobs & Career', icon: <Briefcase className="w-4 h-4" /> },
  { id: 'education', title: 'Education', icon: <GraduationCap className="w-4 h-4" /> },
  { id: 'housing', title: 'Housing', icon: <Home className="w-4 h-4" /> },
  { id: 'items', title: 'Items & Shops', icon: <ShoppingBag className="w-4 h-4" /> },
  { id: 'health', title: 'Health & Food', icon: <Heart className="w-4 h-4" /> },
  { id: 'combat', title: 'Combat & Dungeon', icon: <Sword className="w-4 h-4" /> },
  { id: 'economy', title: 'Economy', icon: <Coins className="w-4 h-4" /> },
  { id: 'crime', title: 'Crime & Theft', icon: <Skull className="w-4 h-4" /> },
  { id: 'dark-magic', title: 'Dark Magic', icon: <Sparkles className="w-4 h-4" /> },
  { id: 'weekends', title: 'Weekends', icon: <Calendar className="w-4 h-4" /> },
  { id: 'victory', title: 'Victory', icon: <Trophy className="w-4 h-4" /> },
  { id: 'tips', title: 'Tips & Strategy', icon: <Lightbulb className="w-4 h-4" /> },
];

export function UserManual({ onClose }: UserManualProps) {
  const [activeChapter, setActiveChapter] = useState<ChapterId>('welcome');
  const contentRef = useRef<HTMLDivElement>(null);

  // Scroll to top when changing chapters
  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeChapter]);

  const currentIndex = CHAPTERS.findIndex((c) => c.id === activeChapter);
  const prevChapter = currentIndex > 0 ? CHAPTERS[currentIndex - 1] : null;
  const nextChapter = currentIndex < CHAPTERS.length - 1 ? CHAPTERS[currentIndex + 1] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative parchment-panel p-0 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            <h2 className="font-display text-2xl text-card-foreground">Adventurer's Manual</h2>
          </div>
          <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Chapter navigation (horizontal scroll) */}
        <div className="flex-shrink-0 overflow-x-auto border-b border-border bg-background/30">
          <div className="flex gap-0.5 px-4 py-2 min-w-max">
            {CHAPTERS.map((ch) => (
              <button
                key={ch.id}
                onClick={() => setActiveChapter(ch.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-display text-xs whitespace-nowrap transition-colors ${
                  activeChapter === ch.id
                    ? 'bg-primary/20 text-primary border border-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/50 border border-transparent'
                }`}
              >
                {ch.icon}
                {ch.title}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div ref={contentRef} className="flex-1 overflow-y-auto px-6 py-5">
          <ChapterContent chapter={activeChapter} />
        </div>

        {/* Footer with prev/next navigation */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-border flex-shrink-0">
          {prevChapter ? (
            <button
              onClick={() => setActiveChapter(prevChapter.id)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground font-display transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              {prevChapter.title}
            </button>
          ) : <div />}
          <span className="text-[10px] text-muted-foreground font-display">
            {currentIndex + 1} / {CHAPTERS.length}
          </span>
          {nextChapter ? (
            <button
              onClick={() => setActiveChapter(nextChapter.id)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground font-display transition-colors"
            >
              {nextChapter.title}
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={onClose}
              className="px-4 py-1.5 wood-frame text-parchment font-display text-xs hover:brightness-110"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Chapter content renderer ────────────────────────────────────

function ChapterContent({ chapter }: { chapter: ChapterId }) {
  switch (chapter) {
    case 'welcome': return <WelcomeChapter />;
    case 'getting-started': return <GettingStartedChapter />;
    case 'board': return <BoardChapter />;
    case 'turns': return <TurnsChapter />;
    case 'jobs': return <JobsChapter />;
    case 'education': return <EducationChapter />;
    case 'housing': return <HousingChapter />;
    case 'items': return <ItemsChapter />;
    case 'health': return <HealthChapter />;
    case 'combat': return <CombatChapter />;
    case 'economy': return <EconomyChapter />;
    case 'crime': return <CrimeChapter />;
    case 'dark-magic': return <DarkMagicChapter />;
    case 'weekends': return <WeekendsChapter />;
    case 'victory': return <VictoryChapter />;
    case 'tips': return <TipsChapter />;
    default: return null;
  }
}

// ─── Shared styling components ───────────────────────────────────

function H1({ children }: { children: React.ReactNode }) {
  return <h2 className="font-display text-xl font-bold text-card-foreground mb-3">{children}</h2>;
}
function H2({ children }: { children: React.ReactNode }) {
  return <h3 className="font-display text-base font-bold text-card-foreground mt-5 mb-2">{children}</h3>;
}
function P({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground leading-relaxed mb-3">{children}</p>;
}
function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 p-3 rounded-lg bg-primary/10 border border-primary/30 mb-3">
      <Lightbulb className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
      <p className="text-xs text-card-foreground leading-relaxed">{children}</p>
    </div>
  );
}
function Table({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto mb-3">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i} className="text-left font-display font-bold text-card-foreground px-2 py-1.5 border-b-2 border-border bg-background/30">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className={ri % 2 === 0 ? '' : 'bg-background/20'}>
              {row.map((cell, ci) => (
                <td key={ci} className="px-2 py-1.5 text-muted-foreground border-b border-border/50">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Chapter Components ──────────────────────────────────────────

function WelcomeChapter() {
  return (
    <div>
      <H1>Welcome to Guild Life Adventures</H1>
      <P>
        Guild Life Adventures is a fantasy life simulation game inspired by the classic
        "Jones in the Fast Lane" (Sierra On-Line, 1991). Set in the medieval town of
        Guildholm, you'll compete against other players (human or AI) to achieve victory
        in Wealth, Happiness, Education, and Career — all while managing your time,
        gold, health, and life choices.
      </P>
      <P>
        Each week (turn) gives you 60 hours to spend however you wish: work a job to
        earn gold, study at the Academy to earn degrees, explore the dungeon for
        treasure, shop for items and food, or simply relax at the tavern. The first
        player to meet all victory goals wins the game.
      </P>

      <H2>Key Concepts</H2>
      <P>
        <strong>Time is everything.</strong> Every action costs hours — moving between
        locations, entering buildings, working, studying, and exploring. Spend wisely
        or your week will slip away.
      </P>
      <P>
        <strong>Balance your goals.</strong> You need to meet all four (or five) victory
        conditions simultaneously at the start of a turn. Focusing too much on one goal
        means falling behind on others.
      </P>
      <P>
        <strong>Plan ahead.</strong> Buy food to avoid starvation penalties, pay rent to
        keep your home, invest in education for better jobs, and gear up before
        exploring the dungeon.
      </P>

      <H2>Controls</H2>
      <Table
        headers={['Key', 'Action']}
        rows={[
          ['Click location', 'Travel to a location on the board'],
          ['ESC', 'Open the Game Menu (save/load/options)'],
          ['E', 'End your turn'],
          ['T', 'Toggle tutorial hints'],
          ['Space', 'Skip AI turn (when AI is thinking)'],
          ['M', 'Mute/unmute music'],
        ]}
      />
    </div>
  );
}

function GettingStartedChapter() {
  return (
    <div>
      <H1>Getting Started</H1>

      <H2>Game Setup</H2>
      <P>
        From the title screen, click <strong>New Game</strong>. You can configure:
      </P>
      <P>
        <strong>Players:</strong> Add up to 4 players (human or AI). Each player picks a name,
        portrait, and color. AI opponents have distinct personalities — Grimwald is aggressive,
        Seraphina is balanced, Thornwick is cautious, and Morgath is chaotic.
      </P>
      <P>
        <strong>Victory Goals:</strong> Set the target for each goal category (Wealth, Happiness,
        Education, Career, and optionally Adventure). Lower values make for shorter games.
      </P>
      <P>
        <strong>Options:</strong> Toggle features like player aging, weather events, seasonal
        festivals, and permadeath before starting.
      </P>

      <H2>Your First Turn</H2>
      <P>
        You start with 100 gold, basic clothing, some food, and a room in
        The Slums. Your immediate priorities should be:
      </P>
      <P>
        <strong>1. Get a job.</strong> Head to the <strong>Guild Hall</strong> and apply for an
        entry-level position like Floor Sweeper (4g/hr) or Porter — no requirements needed.
        The Guild Hall is also your workplace, so you can start working immediately.
      </P>
      <P>
        <strong>2. Buy food.</strong> Visit the <strong>Rusty Tankard</strong> for safe food, or
        the <strong>General Store</strong> (but food spoils without a Preservation Box!). Running
        out of food costs you 20 hours and can trigger a doctor visit.
      </P>
      <P>
        <strong>3. Work.</strong> Go to your workplace and put in hours. Each 6-hour shift
        earns wages and builds experience and dependability.
      </P>

      <Tip>
        Don't spend too many hours moving around on your first turn. Pick 2-3 key actions
        and focus. You have 60 hours, but movement eats into that fast. Rent isn't due
        until week 4, so focus on earning gold first.
      </Tip>

      <H2>Starting Stats</H2>
      <Table
        headers={['Stat', 'Starting Value']}
        rows={[
          ['Gold', '100g'],
          ['Health', '100 HP'],
          ['Happiness', '50'],
          ['Food Supply', '50 units (~1 week)'],
          ['Clothing', '35 condition (Casual tier)'],
          ['Relaxation', '30'],
          ['Experience', '0'],
          ['Dependability', '50'],
          ['Housing', 'The Slums (rent due week 4)'],
        ]}
      />
    </div>
  );
}

function BoardChapter() {
  return (
    <div>
      <H1>The Board</H1>
      <P>
        Guildholm is arranged as a ring of 15 locations. You move clockwise or
        counter-clockwise — the game automatically picks the shortest route when you
        click a destination.
      </P>

      <H2>All Locations</H2>
      <Table
        headers={['Location', 'What You Can Do']}
        rows={[
          ['Noble Heights', 'Luxury housing. Safe from theft. Your home if you upgrade.'],
          ['Graveyard', 'Pray, mourn fallen players. Resurrection site if permadeath is off.'],
          ['General Store', 'Buy food, basic supplies, and everyday necessities.'],
          ['Bank', 'Deposit savings (earns interest), take loans, manage investments.'],
          ['The Forge', 'Workplace for industrial jobs (Forgehand, Blacksmith, etc.).'],
          ['Guild Hall', 'Browse and apply for jobs. View available positions.'],
          ['The Cave', 'Dungeon entrance. Explore floors for treasure and glory.'],
          ['Academy', 'Enroll in courses and study for degrees.'],
          ["Enchanter's Workshop", 'Buy high-quality magical appliances (expensive, durable).'],
          ['Armory', 'Buy clothing, weapons, armor, and shields for combat.'],
          ['Rusty Tankard', 'Tavern. Buy fast food, relax, find entry-level work.'],
          ['Shadow Market', 'Cheap goods, fresh food, lottery tickets, newspapers.'],
          ['The Fence', 'Pawn items for quick gold or buy second-hand goods. Gambling.'],
          ['The Slums', 'Cheap housing. Beware of Shadowfingers the thief.'],
          ["Landlord's Office", 'Pay rent, change housing tier, manage contracts.'],
        ]}
      />

      <H2>Movement</H2>
      <P>
        Moving between adjacent locations costs <strong>1 hour per step</strong>. So traveling
        3 steps costs 3 hours. Click any location on the board to travel there — the game
        automatically picks the shortest path (clockwise or counter-clockwise).
      </P>

      <Tip>
        Plan your route to minimize travel time. If the Guild Hall and Forge are nearby,
        visit them in the same turn. A full lap around the board is about 8 steps.
      </Tip>
    </div>
  );
}

function TurnsChapter() {
  return (
    <div>
      <H1>Turns & Time</H1>

      <H2>Weekly Turns</H2>
      <P>
        Each turn represents one week. Every player gets <strong>60 hours</strong> per turn
        to spend on actions. Players take turns in order. When all players have used their
        hours (or ended their turn), the week advances.
      </P>

      <H2>How Time Is Spent</H2>
      <Table
        headers={['Action', 'Time Cost']}
        rows={[
          ['Movement per step', '1 hour'],
          ['Working (per session)', '6 hours'],
          ['Studying (per lesson)', '6 hours'],
          ['Dungeon floor (varies)', '6–28 hours'],
          ['Relaxing at tavern', '4 hours'],
          ['Shopping / banking', 'Free (while inside)'],
        ]}
      />

      <H2>Turn End</H2>
      <P>
        Your turn ends when you've spent all 60 hours and leave a location, or when you
        manually press <strong>E</strong> to end your turn. If your time runs out while
        inside a location, you can still do free actions (buy items, deposit money) but
        cannot work, study, or do anything that costs time.
      </P>

      <H2>Start-of-Turn Events</H2>
      <P>At the start of each turn, several things happen automatically:</P>
      <P>
        <strong>Food check:</strong> If you have no food, you lose 20 hours searching for
        food, plus suffer -10 health and -8 happiness. There's also a 25% chance of
        collapsing and needing a doctor visit.
      </P>
      <P>
        <strong>Rent check:</strong> Every 4 weeks, rent is due. Unpaid rent leads to
        wage garnishment (50% of earnings).
      </P>
      <P>
        <strong>Clothing check:</strong> Clothes degrade over time. Running out means you
        can't work.
      </P>
      <P>
        <strong>Robbery check:</strong> If you live in The Slums, there's a chance
        Shadowfingers will steal your belongings.
      </P>
    </div>
  );
}

function JobsChapter() {
  return (
    <div>
      <H1>Jobs & Career</H1>
      <P>
        Employment is essential for earning gold. Visit the <strong>Guild Hall</strong> to
        browse available jobs. Each job has requirements for experience, dependability,
        education, and clothing.
      </P>

      <H2>Job Tiers</H2>
      <Table
        headers={['Tier', 'Examples', 'Wage Range', 'Requirements']}
        rows={[
          ['Entry', 'Floor Sweeper, Porter, Tavern Chef', '4–6g/hr', 'None or minimal'],
          ['Mid', 'Market Vendor, Teacher, Scribe', '8–14g/hr', 'Some degrees, 20+ Exp/Dep'],
          ['High', 'Sage, Guild Treasurer, Master Artificer', '18–25g/hr', 'Multiple degrees, 50+ Exp/Dep'],
        ]}
      />

      <H2>How Work Functions</H2>
      <P>
        Once hired, go to your workplace and choose to work. Each work session costs
        <strong> 6 hours</strong> and earns your hourly wage times 6. Working also increases
        your <strong>Experience</strong> and <strong>Dependability</strong> stats, which
        unlock better jobs.
      </P>

      <H2>Clothing Requirements</H2>
      <P>
        Jobs require appropriate attire in three tiers. <strong>Casual</strong> clothes
        (Peasant Garb 12g, Common Tunic 25g) for entry jobs. <strong>Dress</strong> clothes
        (Fine Clothes 60g, Merchant's Attire 100g) for professional positions.
        <strong> Business</strong> attire (Noble Attire 175g, Guild Vestments 250g) for
        leadership roles. Clothes degrade by 3% per week — more expensive clothes start
        at higher condition and last longer. Buy at the <strong>Armory</strong>.
      </P>

      <H2>Wage Variation</H2>
      <P>
        Job wages fluctuate between 50–250% of the base rate depending on the economy.
        Your current wage stays fixed unless you change jobs, ask for a raise, or a
        market crash forces a pay cut.
      </P>

      <H2>Getting Fired</H2>
      <P>
        During a major market crash, you may be fired. Your dependability drops when
        you skip work to study. If dependability falls below your job's requirement,
        you risk losing your position.
      </P>

      <Tip>
        Build dependability early by working consistently. It's the key to the Career
        victory goal — your career score equals your dependability stat (only while employed).
      </Tip>
    </div>
  );
}

function EducationChapter() {
  return (
    <div>
      <H1>Education</H1>
      <P>
        The <strong>Academy</strong> offers 11 degrees across trade, academic, and
        specialized paths. Each degree requires <strong>10 study sessions</strong> at
        6 hours each, grants <strong>9 education points</strong>, and unlocks new job
        opportunities.
      </P>

      <H2>Degree Paths</H2>
      <Table
        headers={['Degree', 'Cost/Session', 'Prerequisites', 'Unlocks']}
        rows={[
          ['Trade Guild Certificate', '5g', 'None', 'Shop clerk, vendor, smith, chef jobs'],
          ['Junior Academy Diploma', '5g', 'None', 'Scribe, library, bank teller jobs'],
          ['Arcane Studies', '8g', 'Trade Guild', 'Magical profession path'],
          ['Combat Training', '8g', 'Trade Guild', 'Combat-focused career path'],
          ['Master Combat', '12g', 'Combat Training', 'Elite warrior positions'],
          ['Scholar Degree', '10g', 'Junior Academy', 'Teacher position'],
          ['Advanced Scholar', '15g', 'Scholar', 'Advanced academic path'],
          ['Sage Studies', '20g', 'Advanced Scholar', 'Sage career path'],
          ['Loremaster', '25g', 'Sage Studies', 'Sage, Court Advisor; Floor 6 access'],
          ['Commerce Degree', '10g', 'Junior Academy', 'Business and trade positions'],
          ['Alchemy', '15g', 'Arcane Studies + Junior Academy', 'Specialized crafting'],
        ]}
      />

      <H2>Graduation Bonuses</H2>
      <P>When you complete a degree, you receive:</P>
      <Table
        headers={['Bonus', 'Amount']}
        rows={[
          ['Education Points', '+9'],
          ['Happiness', '+5'],
          ['Dependability', '+5'],
          ['Max Dependability', '+5 (permanent)'],
          ['Max Experience', '+5 (permanent)'],
        ]}
      />

      <H2>Extra Credit</H2>
      <P>
        Owning certain items reduces the number of study sessions needed:
      </P>
      <Table
        headers={['Items Owned', 'Sessions Required']}
        rows={[
          ['None', '10'],
          ['Arcane Tome (appliance)', '9'],
          ['Tome of All Knowledge + Lexicon of the Ancients + Cartographer\'s Codex (all 3)', '9'],
          ['All 4 items above', '8 (20% savings!)'],
        ]}
      />

      <Tip>
        Scholar texts (Tome, Lexicon, Codex) are sold at the Shadow Market's Scholar Texts tab.
        Start with Trade Guild Certificate or Junior Academy Diploma — they're cheap
        and unlock important early jobs. The two starting degrees open different
        career paths, so pick based on your strategy.
      </Tip>
    </div>
  );
}

function HousingChapter() {
  return (
    <div>
      <H1>Housing</H1>
      <P>
        Every adventurer needs a roof over their head. Visit the <strong>Landlord's
        Office</strong> to pay rent or upgrade your living situation.
      </P>

      <P>
        You start the game with a room in <strong>The Slums</strong>. Rent is due every 4 weeks,
        with your first payment due on week 4.
      </P>

      <H2>Housing Tiers</H2>
      <Table
        headers={['Tier', 'Rent/Week', 'Happiness', 'Theft Risk', 'Notes']}
        rows={[
          ['Homeless', '0g', '-3/turn', '50%', 'Sleeping on streets. Very dangerous.'],
          ['The Slums', '75g', '0', '25%', 'Starting home. Cheap but Shadowfingers lurks.'],
          ['Noble Heights', '120g', '+3/turn', '0%', 'Luxury and completely safe.'],
        ]}
      />

      <H2>Rent Mechanics</H2>
      <P>
        Rent is due every <strong>4 weeks</strong>. If you can't pay, your wages
        will be garnished — <strong>50% of all earnings</strong> go straight to rent
        until you're caught up. Your current rent price doesn't change with the economy,
        but if you move to a new place, the new rent is affected by current market rates.
      </P>

      <Tip>
        Upgrading to Noble Heights early is expensive but eliminates theft risk entirely,
        which protects your valuable appliances and items. If you can afford it, the
        safety is worth the cost.
      </Tip>
    </div>
  );
}

function ItemsChapter() {
  return (
    <div>
      <H1>Items & Shops</H1>

      <H2>Food (General Store & Shadow Market)</H2>
      <Table
        headers={['Item', 'Price', 'Food Units']}
        rows={[
          ['Bread', '8g', '10'],
          ['Cheese', '15g', '15'],
        ]}
      />
      <P>
        <strong>Important:</strong> Without a Preservation Box, General Store food has
        an <strong>80% chance of spoiling</strong> on purchase (gold spent, no food gained).
        Tavern food is always safe but more expensive. Invest in a Preservation Box early!
      </P>
      <P>
        Food depletes by <strong>35 units per week</strong>. If you reach 0 food at the start
        of a turn, you lose 20 hours and suffer health/happiness penalties. Keep at least
        one week's supply on hand.
      </P>

      <H2>Appliances (Enchanter's Workshop & Shadow Market)</H2>
      <Table
        headers={['Appliance', 'Enchanter', 'Market', 'Effect']}
        rows={[
          ['Scrying Mirror', '525g', '450g', 'Entertainment, +2/+1 happiness'],
          ['Memory Crystal', '333g', '250g', 'Entertainment, works with mirror'],
          ['Enchanted Music Box', '325g', '350g', 'Entertainment, +2/+1 happiness'],
          ['Eternal Cooking Fire', '276g', '200g', '+1 food/turn bonus'],
          ['Preservation Box', '876g', '650g', 'Stores fresh food (6 units)'],
          ['Frost Chest', '1200g', '900g', 'Stores 12 food units'],
          ['Arcane Tome', '1599g', '—', 'Extra credit, random income'],
        ]}
      />
      <P>
        <strong>Quality matters.</strong> Enchanter items break with only a 1/51 chance vs.
        1/36 from the Shadow Market. Breakage only triggers if you have over 500g in cash.
        Repairs cost 5–25% of the original price.
      </P>

      <H2>Weapons & Armor (Armory)</H2>
      <Table
        headers={['Weapon', 'Price', 'Attack Bonus']}
        rows={[
          ['Dagger', '35g', '+5'],
          ['Iron Sword', '90g', '+15'],
          ['Steel Sword', '250g', '+25 (needs Floor 2)'],
          ['Enchanted Blade', '500g', '+40 (needs Floor 3)'],
        ]}
      />
      <Table
        headers={['Armor', 'Price', 'Defense Bonus']}
        rows={[
          ['Leather Armor', '75g', '+10'],
          ['Chainmail', '200g', '+20 (needs Floor 2)'],
          ['Plate Armor', '450g', '+35 (needs Floor 3)'],
          ['Enchanted Plate', '900g', '+50 (needs Floor 4)'],
        ]}
      />

      <H2>Shields (Armory)</H2>
      <Table
        headers={['Shield', 'Price', 'Defense', 'Block Chance']}
        rows={[
          ['Wooden Shield', '45g', '+5', '10%'],
          ['Iron Shield', '120g', '+10', '15%'],
          ['Tower Shield', '300g', '+15', '25% (needs Floor 2)'],
          ['Dragon Scale Shield', 'Rare drop', '+20', '20% (Floor 4 drop)'],
        ]}
      />

      <H2>The Fence (Pawn Shop)</H2>
      <P>
        Strapped for cash? The Fence buys items at <strong>40%</strong> of their original
        price and holds them as collateral. You can redeem them later for <strong>50%</strong> of
        the original price. Unredeemed items become available for other players to buy.
      </P>

      <H2>Tickets & Entertainment (Shadow Market)</H2>
      <Table
        headers={['Ticket', 'Price', 'Happiness']}
        rows={[
          ['Lottery Ticket', '10g', 'Chance to win big (up to 5,000g)'],
          ['Jousting Tournament', '25g', '+8 happiness'],
          ['Theatre Performance', '40g', '+10 happiness'],
          ['Bard Concert', '50g', '+12 happiness'],
        ]}
      />

      <Tip>
        The Preservation Box is one of the best early investments. It stores food and
        prevents spoilage, saving you gold in the long run. If you can afford the Enchanter
        version (876g), its lower break chance makes it worth the extra cost.
      </Tip>
    </div>
  );
}

function HealthChapter() {
  return (
    <div>
      <H1>Health & Food</H1>

      <H2>Health Points</H2>
      <P>
        You start with <strong>100 HP</strong>. Health is lost through dungeon combat,
        starvation, sickness, and random events. If your health reaches 0, you die.
        With permadeath off, you respawn at the Graveyard with 20 HP. With permadeath
        on, you're eliminated from the game.
      </P>

      <H2>Food & Starvation</H2>
      <P>
        Food depletes by <strong>35 units per week</strong> automatically. If you start a turn
        with 0 food, you lose <strong>20 hours</strong> searching for food, suffer
        <strong> -10 health</strong> and <strong>-8 happiness</strong>, and have a 25% chance of
        needing a doctor visit. Always keep food stocked!
      </P>

      <H2>Food Sources</H2>
      <P>
        <strong>General Store:</strong> Buy food (bread, cheese, fresh food). Requires Preservation Box for safe storage — 80% spoilage without one!
      </P>
      <P>
        <strong>Rusty Tankard:</strong> Fast food that provides immediate sustenance.
      </P>
      <P>
        <strong>Shadow Market:</strong> Fresh food available at market prices.
      </P>

      <H2>Food Storage Appliances</H2>
      <P>
        The <strong>Preservation Box</strong> stores up to 6 fresh food units. The
        <strong> Frost Chest</strong> upgrade increases storage to 12 units. The
        <strong> Eternal Cooking Fire</strong> provides a small food bonus each turn.
        Without storage, excess fresh food spoils.
      </P>

      <H2>Relaxation</H2>
      <P>
        Relaxation ranges from <strong>10 to 50</strong> and decreases by 1 each turn.
        Low relaxation increases your chance of apartment robbery and can trigger
        doctor visits. Visit the <strong>Rusty Tankard</strong> to relax and unwind.
      </P>

      <H2>Sickness & Aging</H2>
      <P>
        If aging is enabled, your character ages 1 year every 4 weeks (starting at age 18).
        Elder characters may experience health decay. Starvation and low relaxation can
        trigger doctor visits that cost gold, time, and happiness.
      </P>

      <Tip>
        A Week of Provisions (50g, 50 food units) is the most cost-effective food purchase.
        Buy two per rent cycle and you'll never starve.
      </Tip>
    </div>
  );
}

function CombatChapter() {
  return (
    <div>
      <H1>Combat & The Dungeon</H1>
      <P>
        The <strong>Cave</strong> is the entrance to a 6-floor dungeon. Each floor offers
        increasing rewards but greater danger. Clearing floors earns gold, happiness,
        dependability, and sometimes rare items.
      </P>

      <H2>Dungeon Floors</H2>
      <Table
        headers={['Floor', 'Name', 'Time', 'Gold Range', 'Damage Risk']}
        rows={[
          ['1', 'Entrance Cavern', '6 hrs', '15–50g', '10–25 HP'],
          ['2', 'Goblin Tunnels', '10 hrs', '30–100g', '20–40 HP'],
          ['3', 'Undead Crypt', '14 hrs', '60–200g', '35–60 HP'],
          ['4', "Dragon's Lair", '18 hrs', '120–400g', '55–85 HP'],
          ['5', 'The Abyss', '22 hrs', '250–600g', '70–120 HP'],
          ['6', 'Forgotten Temple', '28 hrs', '400–1000g', '90–150 HP'],
        ]}
      />

      <H2>Floor Requirements</H2>
      <Table
        headers={['Floor', 'Prerequisite', 'Gear Required']}
        rows={[
          ['1', 'None', 'None'],
          ['2', 'Floor 1 cleared', 'Dagger minimum'],
          ['3', 'Floor 2 cleared', 'Iron Sword + Leather Armor'],
          ['4', 'Floor 3 cleared', 'Steel Sword + Chainmail'],
          ['5', 'Floor 4 cleared', 'Enchanted Blade + Plate Armor'],
          ['6', 'Floor 5 cleared + Loremaster degree', 'Enchanted Blade + Enchanted Plate'],
        ]}
      />

      <H2>Clear Rewards</H2>
      <P>
        Each floor cleared also grants permanent stat bonuses: happiness, dependability,
        and max experience increases. There's also a <strong>5% chance</strong> for rare item
        drops on each clear.
      </P>

      <H2>Guild Pass</H2>
      <P>
        To take on guild quests (part of the Adventure victory goal), you need a
        <strong> Guild Pass</strong> costing <strong>500g</strong>. Quests and dungeon floors
        cleared both count toward the Adventure score.
      </P>

      <Tip>
        Don't rush the dungeon. Floor 3+ can easily kill an unprepared adventurer. Make sure
        you have enough HP (ideally 80+) and proper gear before attempting deeper floors.
        The gold reward is great, but dying costs much more.
      </Tip>
    </div>
  );
}

function EconomyChapter() {
  return (
    <div>
      <H1>Economy</H1>

      <H2>How the Economy Works</H2>
      <P>
        The economy fluctuates every turn, affecting item prices, wages offered for new
        jobs, and rent for new apartments. Your <strong>current</strong> wage and rent are
        locked in and don't change with the economy — only new purchases and new contracts
        are affected.
      </P>

      <H2>Economy Events</H2>
      <Table
        headers={['Event', 'Effect']}
        rows={[
          ['Economic Boom', 'Prices rise. Good for sellers, bad for buyers.'],
          ['Minor Downturn', 'Prices drop slightly. Bargain time.'],
          ['Moderate Crash', 'Prices drop. Current wages cut to 80%.'],
          ['Major Crash', 'Prices plummet. Risk of being fired.'],
        ]}
      />

      <H2>Banking</H2>
      <P>
        Visit the <strong>Bank</strong> to deposit gold into a savings account that
        earns interest over time. Deposits count toward your Wealth goal. You can also
        take out loans, but be careful — interest accumulates and refused loans hurt
        your happiness.
      </P>

      <H2>Investments</H2>
      <P>
        The Bank offers investment opportunities. Stock prices fluctuate with the economy
        and can multiply your wealth — or wipe it out during crashes. For safe
        wealth storage, consider T-Bill style investments that don't fluctuate but
        charge a small sell fee.
      </P>

      <H2>Wealth Calculation</H2>
      <P>
        Your wealth score = <strong>Gold + Bank Deposits + Investments</strong>.
        Items and appliances do NOT count toward wealth (buying items actually
        reduces your wealth score). Every 100g counts as 1 point toward the Wealth goal.
      </P>

      <Tip>
        During economic downturns, lock in cheaper rent by moving to a new apartment
        and buy items at discount. When the economy booms, focus on working for higher
        wages at your locked-in rate.
      </Tip>
    </div>
  );
}

function CrimeChapter() {
  return (
    <div>
      <H1>Crime & Theft</H1>

      <H2>Shadowfingers the Thief</H2>
      <P>
        Shadowfingers is Guildholm's most notorious pickpocket and burglar. There are
        two ways he can strike:
      </P>

      <H2>Street Robbery</H2>
      <P>
        Starting from week 4, leaving the <strong>Bank</strong> or <strong>General Store</strong> with
        cash may trigger a street robbery. Shadowfingers takes <strong>all your cash</strong> and
        you lose <strong>3 happiness</strong>.
      </P>
      <Table
        headers={['Location', 'Chance']}
        rows={[
          ['Leaving the Bank', '~3.2% (1 in 31)'],
          ['Leaving the General Store', '~2.0% (1 in 51)'],
        ]}
      />

      <H2>Apartment Robbery</H2>
      <P>
        If you live in <strong>The Slums</strong>, there's a chance at the start of each
        turn that Shadowfingers breaks in and steals your belongings. Each item type has
        a <strong>25% chance</strong> of being stolen. You lose <strong>4 happiness</strong> regardless
        of what's taken.
      </P>
      <P>
        The robbery chance depends on your relaxation: higher relaxation = lower risk.
        At relaxation 10, you face a ~9% robbery chance. At relaxation 50, only ~2%.
      </P>

      <H2>Items That Cannot Be Stolen</H2>
      <P>
        Some large items are too heavy for Shadowfingers: Arcane Tome,
        Preservation Box, Frost Chest, cooking appliances, Tome of All Knowledge,
        Lexicon of the Ancients, and Cartographer's Codex.
      </P>

      <Tip>
        The #1 defense against theft is upgrading from The Slums. Noble Heights has zero
        theft risk. If you can't afford to move yet, keep your relaxation high and deposit
        gold in the bank before heading home.
      </Tip>
    </div>
  );
}

function DarkMagicChapter() {
  return (
    <div>
      <H1>Dark Magic — Hexes, Curses & Scrolls</H1>
      <P>
        Dark magic is an <strong>optional feature</strong> — enable it in game setup under
        "Hexes & Curses". When active, players can buy hex scrolls from the
        <strong> Enchanter's Workshop</strong>, <strong>Shadow Market</strong>, or earn them as
        dungeon drops. Three categories of dark magic are available.
      </P>

      <H2>Location Hexes</H2>
      <P>
        Location hexes block opponents from using a specific location for 1–2 weeks.
        You are <em>not</em> blocked from your own hexed location. Cast them while standing
        at any location — the hex travels to the target.
      </P>
      <Table
        headers={['Hex', 'Target', 'Cost', 'Duration', 'Effect']}
        rows={[
          ['Seal of Ignorance', 'Academy', '500g', '2 weeks', 'Opponents cannot study'],
          ['Embargo Decree', 'Guild Hall', '600g', '2 weeks', 'Opponents cannot get jobs or quests'],
          ['Market Blight', 'General Store', '400g', '1 week', 'Opponents cannot buy food/items'],
          ['Forge Curse', 'Forge', '350g', '2 weeks', 'Opponents cannot temper or repair'],
          ['Vault Seal', 'Bank', 'Drop only', '1 week', 'Opponents cannot bank/invest'],
          ['Dungeon Ward', 'Cave', '450g', '2 weeks', 'Opponents cannot enter the dungeon'],
        ]}
      />
      <Tip>
        Vault Seal and several other powerful hexes are dungeon-drop-only — they cannot be
        purchased in any shop. Keep an eye on your scroll inventory after boss fights.
      </Tip>

      <H2>Personal Curses</H2>
      <P>
        Personal curses apply a debuff to a specific player for several weeks. You must target
        a rival and spend cast time (2 hours). Curses are listed in your inventory under
        "Your Scrolls."
      </P>
      <Table
        headers={['Curse', 'Cost', 'Duration', 'Effect']}
        rows={[
          ['Curse of Poverty', '500g', '3 weeks', 'Target wages −40%'],
          ['Hex of Clumsiness', '400g', '3 weeks', 'Equipment degrades 3× faster'],
          ['Curse of Lethargy', 'Drop only', '2 weeks', 'Target loses 10 extra hours/turn'],
          ['Hex of Misfortune', '350g', '4 weeks', 'Double robbery chance + 25% random bad events/week'],
          ['Curse of Decay', '300g', '3 weeks', 'Food spoils 2× faster, clothing degrades 2× faster'],
          ['Hex of Confusion', '450g', '2 weeks', 'Target needs +2 extra study sessions per degree'],
          ['Curse of the Toad', '450g', '1 week', 'Target turns into a frog — loses 40 hours'],
          ['Hex of Ruin', 'Floor 5 drop', '1 week', 'ALL shops closed + 25% gold loss. Cannot be warded.'],
        ]}
      />

      <H2>Sabotage Scrolls</H2>
      <P>
        Sabotage hexes take instant effect — no duration, damage is permanent.
        Cast time is 2 hours. Most are dungeon-drop-only.
      </P>
      <Table
        headers={['Scroll', 'Cost', 'Effect']}
        rows={[
          ['Shatter Hex', 'Drop only (Floor 4)', "Permanently destroys target's weapon"],
          ['Corrode Hex', 'Drop only (Floor 4)', "Permanently destroys target's armor"],
          ['Spoilage Curse', '300g', "Destroys ALL of target's stored food"],
          ['Appliance Jinx', '250g', 'Breaks one random appliance the target owns'],
          ['Wardrobe Hex', '200g', "Reduces target's clothing condition to 0"],
        ]}
      />

      <H2>Where to Get Scrolls</H2>
      <Table
        headers={['Source', 'What It Offers']}
        rows={[
          ["Enchanter's Workshop", 'Seal of Ignorance, Dungeon Ward, Hex of Confusion, Appliance Jinx (needs dungeon progress)'],
          ['Shadow Market', 'Rotating stock of 3–4 scrolls per week (changes weekly)'],
          ['Graveyard — Dark Ritual', 'Random scroll for 200g + 4h. 15% chance the ritual backfires on you!'],
          ['Dungeon Boss Drops', 'Floors 3–5 drop powerful scrolls including Vault Seal, Lethargy, Shatter, Corrode, Hex of Ruin'],
        ]}
      />

      <H2>Defense — Protecting Yourself</H2>
      <P>
        Two items defend against dark magic. Both are available at the
        <strong> Enchanter's Workshop</strong>.
      </P>
      <Table
        headers={['Item', 'Cost', 'Effect']}
        rows={[
          ['Protective Amulet', '400g', 'Automatically blocks the next hex/curse cast on you. Consumed on use.'],
          ['Dispel Scroll', '250g', 'Remove a location hex — must be used AT the hexed location. Costs 1 hour.'],
        ]}
      />
      <P>
        The <strong>Graveyard</strong> also offers two paid services for cursed players:
      </P>
      <Table
        headers={['Service', 'Cost', 'Time', 'Outcome']}
        rows={[
          ['Curse Reflection', '150g', '3h', '35% reflect to caster / 25% remove / 40% fail'],
          ['Purification', '300g', '3h', 'Guaranteed removal of one active curse'],
        ]}
      />

      <H2>Active Curses</H2>
      <P>
        If you have active curses, they appear in the <strong>Graveyard panel</strong> under
        "Active Afflictions." Each shows the curse name, who cast it, and weeks remaining.
        A purple glow effect also appears on your location panel when cursed.
      </P>

      <Tip>
        Hexes & Curses add a rivalry layer — but watch out for backfires and reflections.
        The Protective Amulet is the safest defense when you're winning and expect retaliation.
        The Hex of Ruin (Floor 5 drop) is the most devastating attack in the game — and the
        only one that cannot be blocked by a Protective Amulet.
      </Tip>
    </div>
  );
}

function WeekendsChapter() {
  return (
    <div>
      <H1>Weekends</H1>

      <H2>How Weekends Work</H2>
      <P>
        At the end of each turn (week), your character automatically spends the weekend.
        A weekend activity is selected based on what tickets and items you own. Weekend
        events are reported at the start of your next turn.
      </P>

      <H2>Weekend Priority</H2>
      <P>
        <strong>1. Ticket Events:</strong> If you own entertainment tickets (jousting,
        theatre, concert), those are used first. Only one ticket is consumed per weekend.
      </P>
      <P>
        <strong>2. Appliance Events:</strong> Owning appliances (Scrying Mirror, Music Box,
        etc.) gives a 20% chance per item to trigger a home entertainment weekend.
      </P>
      <P>
        <strong>3. Random Events:</strong> If no tickets or appliance events trigger,
        a random weekend activity is selected. These range from cheap outings to expensive
        adventures depending on the current week.
      </P>

      <H2>Weekend Costs</H2>
      <Table
        headers={['Type', 'Cost Range', 'When Available']}
        rows={[
          ['Cheap', '5–20g', 'Always'],
          ['Medium', '15–55g', 'Weeks 1–7'],
          ['Expensive', '50–100g', 'Week 8+'],
        ]}
      />

      <H2>Lottery</H2>
      <P>
        Buy lottery tickets at the Shadow Market (10g each). Drawings happen each weekend.
        More tickets = higher chance. The grand prize is <strong>5,000g</strong>!
      </P>

      <Tip>
        Entertainment tickets from the Shadow Market are a reliable way to boost happiness.
        A Bard Concert ticket (50g) gives +12 happiness — much more cost-effective than
        random weekend spending.
      </Tip>
    </div>
  );
}

function VictoryChapter() {
  return (
    <div>
      <H1>Victory Conditions</H1>
      <P>
        To win, you must meet <strong>all victory goals simultaneously</strong> at the
        <strong> start of a turn</strong>. Progress is tracked in the sidebar. Goals are
        set during game setup and can range from easy (short game) to maximum (epic).
      </P>

      <H2>The Four Goals</H2>
      <Table
        headers={['Goal', 'How It Is Measured', 'How to Achieve']}
        rows={[
          ['Wealth', 'Gold + Savings + Investments', 'Work, invest, explore dungeon, sell items'],
          ['Happiness', 'Accumulated happiness points', 'Graduate, buy items, tickets, weekends, housing'],
          ['Education', 'Degrees earned (9 pts each)', 'Study at the Academy'],
          ['Career', 'Dependability stat (while employed)', 'Work consistently, graduate for bonuses'],
        ]}
      />

      <H2>Optional: Adventure Goal</H2>
      <P>
        If enabled during setup, Adventure is a fifth goal tracked by
        <strong> completed quests + dungeon floors cleared</strong>. This adds a combat
        dimension to the game and encourages dungeon exploration.
      </P>

      <H2>Important Notes</H2>
      <P>
        <strong>Wealth:</strong> Only liquid assets count. Buying items reduces your
        wealth score. Each 100g = 1 point toward the goal.
      </P>
      <P>
        <strong>Career:</strong> Equals 0 if you don't have a job! Losing your job
        means your career score drops to zero until you find new employment.
      </P>
      <P>
        <strong>Simultaneous:</strong> You must meet ALL goals at once. If your wealth
        is high but happiness is low, you haven't won. Balance is key.
      </P>

      <Tip>
        Check your progress in the right sidebar. The circular progress indicators show
        how close each player is to winning. When you see someone approaching 80%+ across
        all goals, the race is on!
      </Tip>
    </div>
  );
}

function TipsChapter() {
  return (
    <div>
      <H1>Tips & Strategy</H1>

      <H2>Early Game (Weeks 1–8)</H2>
      <P>
        <strong>Get a job immediately.</strong> Even a Floor Sweeper at 4g/hour is better
        than nothing. Head to the Guild Hall on turn 1.
      </P>
      <P>
        <strong>Eat at the Tavern early on.</strong> General Store food spoils without a
        Preservation Box. Save up for one to unlock cheap, safe food.
      </P>
      <P>
        <strong>Start a degree.</strong> Trade Guild Certificate or Junior Academy — both
        are cheap (5g/session) and open up better jobs.
      </P>

      <H2>Mid Game (Weeks 8–20)</H2>
      <P>
        <strong>Upgrade housing.</strong> Moving to Noble Heights protects your
        growing collection of items from Shadowfingers.
      </P>
      <P>
        <strong>Invest in appliances.</strong> A Preservation Box saves food costs.
        An Arcane Tome speeds up education and generates income.
      </P>
      <P>
        <strong>Start dungeon crawling.</strong> Floor 1 is free to attempt and the
        gold + stat bonuses are valuable. Gear up at the Armory first.
      </P>
      <P>
        <strong>Bank your gold.</strong> Savings earn interest and count toward Wealth.
        Plus, banked gold can't be stolen by Shadowfingers on the street.
      </P>

      <H2>Late Game (Weeks 20+)</H2>
      <P>
        <strong>Focus on your weakest goal.</strong> Check which victory condition is
        furthest from completion and prioritize it.
      </P>
      <P>
        <strong>Buy entertainment tickets.</strong> They're the most efficient happiness
        source in the late game.
      </P>
      <P>
        <strong>Keep working.</strong> Even when rich, you need employment for Career.
        Dependability is your career score.
      </P>
      <P>
        <strong>Protect your assets.</strong> Deposit gold before traveling past risky
        areas. Make sure your housing is secure.
      </P>

      <H2>Common Mistakes</H2>
      <Table
        headers={['Mistake', 'Why It Hurts']}
        rows={[
          ['Forgetting to buy food', 'Starvation: -10 HP, -8 happiness every turn'],
          ['Staying in The Slums too long', 'Shadowfingers steals your expensive gear'],
          ['Spending all gold on items', 'Items don\'t count as wealth; you need liquid assets'],
          ['Ignoring education', 'Better jobs need degrees; graduation boosts ALL stats'],
          ['Rushing deep dungeon floors', 'Death means losing everything (or heavy respawn penalty)'],
          ['Skipping work to study', 'Dependability drops; you may lose your job'],
          ['Not banking gold', 'Cash on hand can be stolen; bank deposits earn interest'],
        ]}
      />

      <H2>AI Opponents</H2>
      <P>
        The four AI personalities have different strategies:
      </P>
      <Table
        headers={['AI', 'Personality', 'Strategy']}
        rows={[
          ['Grimwald', 'Aggressive', 'Prioritizes wealth and career early'],
          ['Seraphina', 'Balanced', 'Spreads effort across all goals evenly'],
          ['Thornwick', 'Cautious', 'Focuses on education and safety first'],
          ['Morgath', 'Chaotic', 'Unpredictable — dungeon-heavy, big risks'],
        ]}
      />

      <Tip>
        The most reliable strategy is: secure food → get a job → start education → upgrade
        housing → diversify. Don't try to do everything at once. Efficient time management
        wins the game.
      </Tip>
    </div>
  );
}

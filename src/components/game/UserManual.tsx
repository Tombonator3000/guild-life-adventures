/**
 * UserManual — Full-screen scrollable game manual with chapter navigation.
 * Numerical rule claims are derived from executable game data where possible.
 */

import { useEffect, useRef, useState } from 'react';
import {
  X, BookOpen, Map, Clock, Briefcase, GraduationCap, Home,
  ShoppingBag, Heart, Sword, Coins, Skull, Calendar, Trophy,
  Lightbulb, ChevronLeft, ChevronRight, ScrollText, Sparkles,
} from 'lucide-react';
import { PLAYER_RULE_TEXT, PLAYER_RULE_VALUES } from '@/data/playerFacingRules';
import { ALL_DEGREES, GRADUATION_BONUSES } from '@/data/education';
import { DUNGEON_FLOORS } from '@/data/dungeon/floors';
import { HOUSING_DATA } from '@/data/housing';
import { STOCKS } from '@/data/stocks';

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

  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeChapter]);

  const currentIndex = CHAPTERS.findIndex(chapter => chapter.id === activeChapter);
  const previous = currentIndex > 0 ? CHAPTERS[currentIndex - 1] : null;
  const next = currentIndex < CHAPTERS.length - 1 ? CHAPTERS[currentIndex + 1] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative parchment-panel p-0 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            <h2 className="font-display text-2xl text-card-foreground">Adventurer's Manual</h2>
          </div>
          <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground" aria-label="Close manual">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-shrink-0 overflow-x-auto border-b border-border bg-background/30">
          <div className="flex gap-0.5 px-4 py-2 min-w-max">
            {CHAPTERS.map(chapter => (
              <button
                key={chapter.id}
                onClick={() => setActiveChapter(chapter.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-display text-xs whitespace-nowrap transition-colors ${
                  activeChapter === chapter.id
                    ? 'bg-primary/20 text-primary border border-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/50 border border-transparent'
                }`}
              >
                {chapter.icon}
                {chapter.title}
              </button>
            ))}
          </div>
        </div>

        <div ref={contentRef} className="flex-1 overflow-y-auto px-6 py-5">
          <ChapterContent chapter={activeChapter} />
        </div>

        <div className="flex items-center justify-between px-6 py-3 border-t border-border flex-shrink-0">
          {previous ? (
            <button onClick={() => setActiveChapter(previous.id)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground font-display">
              <ChevronLeft className="w-4 h-4" />
              {previous.title}
            </button>
          ) : <div />}
          <span className="text-[10px] text-muted-foreground font-display">{currentIndex + 1} / {CHAPTERS.length}</span>
          {next ? (
            <button onClick={() => setActiveChapter(next.id)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground font-display">
              {next.title}
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={onClose} className="px-4 py-1.5 wood-frame text-parchment font-display text-xs hover:brightness-110">Done</button>
          )}
        </div>
      </div>
    </div>
  );
}

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
            {headers.map(header => (
              <th key={header} className="text-left font-display font-bold text-card-foreground px-2 py-1.5 border-b-2 border-border bg-background/30">{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={`${row[0]}-${rowIndex}`} className={rowIndex % 2 === 0 ? '' : 'bg-background/20'}>
              {row.map((cell, cellIndex) => (
                <td key={`${rowIndex}-${cellIndex}`} className="px-2 py-1.5 text-muted-foreground border-b border-border/50">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function WelcomeChapter() {
  return (
    <div>
      <H1>Welcome to Guild Life Adventures</H1>
      <P>Guild Life is a competitive fantasy life simulator. Each turn gives you {PLAYER_RULE_VALUES.turnHours} hours to work, study, travel, shop, recover and take risks while pursuing every enabled victory goal.</P>
      <P>Most systems are connected. Better education unlocks jobs and dungeon bonuses. Work builds Dependability for Career. Housing protects possessions. Savings and The Broker build Wealth. Food, health and clothing keep the whole plan from falling apart.</P>
      <H2>Controls</H2>
      <Table headers={['Control', 'Action']} rows={[
        ['Click a location', 'Travel there or open its panel when already present'],
        ['Esc', 'Open or close the game menu'],
        ['E', 'End the current human turn'],
        ['M', 'Mute or unmute music'],
        ['F', 'Toggle fullscreen'],
      ]} />
      <Tip>The game checks actual goal values, not how impressive your inventory looks. Open the Goals panel often.</Tip>
    </div>
  );
}

function GettingStartedChapter() {
  return (
    <div>
      <H1>Getting Started</H1>
      <H2>A sensible first turn</H2>
      <P><strong>1. Visit the Guild Hall.</strong> Apply for a job you qualify for. Hiring happens at the Guild Hall; working happens at the employer's location.</P>
      <P><strong>2. Work and protect the income.</strong> Complete one or more shifts, then deposit money you do not need immediately.</P>
      <P><strong>3. Secure food.</strong> Regular food falls by {PLAYER_RULE_VALUES.foodDepletionPerWeek} each week. Tavern meals are immediate; stored General Store food is risky without preservation.</P>
      <P><strong>4. Start education when cash flow is stable.</strong> A starting degree opens better jobs and gives permanent graduation bonuses.</P>
      <H2>Starting position</H2>
      <Table headers={['Resource', 'Typical start']} rows={[
        ['Cash', '100g'],
        ['Health', '100'],
        ['Happiness', '50'],
        ['Food', '50'],
        ['Clothing', '35 condition'],
        ['Relaxation', '30'],
        ['Housing', 'The Slums'],
      ]} />
      <Tip>Rent is not the first emergency. Food and income are. But do not forget the four-week rent cycle.</Tip>
    </div>
  );
}

function BoardChapter() {
  return (
    <div>
      <H1>The Board</H1>
      <P>{PLAYER_RULE_TEXT.movement}</P>
      <Table headers={['Location', 'Main purpose']} rows={[
        ['Guild Hall', 'Job applications, Guild Pass, bounties and quests'],
        ['Academy', 'Degrees, study and educational activities'],
        ['Bank', 'Savings, The Broker and loans'],
        ['General Store', 'Food, fresh provisions, lottery tickets and The Guildholm Herald'],
        ['Rusty Tankard', 'Immediate food, drink, relaxation and tavern work'],
        ['Armory', 'Clothing, weapons, armor and shields'],
        ["Enchanter's Workshop", 'Healing, reliable appliances and magical services'],
        ['Shadow Market', 'Discount goods, used appliances, tickets, scrolls and sabotage'],
        ['The Fence', 'Pawn, redeem, buy used goods, gamble and buy protection'],
        ['Forge', 'Forge jobs, repairs, tempering and salvage'],
        ['The Cave', 'Six-floor dungeon'],
        ["Landlord's Office", 'Rent, prepayment, extensions and moving'],
        ['The Slums / Noble Heights', 'Your home, rest and stored possessions'],
        ['Graveyard', 'Recovery, curse services and resurrection location'],
      ]} />
      <H2>The newspaper</H2>
      <P>{PLAYER_RULE_TEXT.newspaper}</P>
    </div>
  );
}

function TurnsChapter() {
  return (
    <div>
      <H1>Turns & Time</H1>
      <P>A turn represents one week and begins with up to {PLAYER_RULE_VALUES.turnHours} hours before penalties. Travel, work, study, healing, gambling and dungeon encounters can consume time.</P>
      <P>Many shopping and bank transactions are free once you are at the correct location. The button itself shows when an action has a time cost.</P>
      <H2>When time runs short</H2>
      <P>If you cannot complete a journey, the token moves as far as the remaining time allows. Work and study may offer a partial action when the current system supports it. At 0 hours, only actions with no time cost remain available.</P>
      <H2>Week-end processing</H2>
      <P>After all players finish, the game advances food, clothing, rent tracking, finances, stock prices, loan interest, weekend activities, weather, festivals, sickness and other enabled systems.</P>
    </div>
  );
}

function JobsChapter() {
  return (
    <div>
      <H1>Jobs & Career</H1>
      <P>Apply at the Guild Hall. Each listing shows its workplace, shift length, offered wage and requirements. Wages for a new offer react to the economy; an accepted wage stays with the job unless a raise, pay cut or job change alters it.</P>
      <P>Working increases Experience and Dependability. Better jobs can require completed degrees, experience, dependability and a clothing tier. Clothing loses {PLAYER_RULE_VALUES.clothingDegradationPerWeek} condition every week and can block work before reaching 0.</P>
      <H2>Dependability</H2>
      <P>Skipping all work in a week while employed normally reduces Dependability. Being unemployed also causes decay. Very low Dependability can cost the job.</P>
      <P>{PLAYER_RULE_TEXT.career}</P>
      <Tip>Career is not job title or wage. A low-level employed character with strong Dependability can be closer to the Career target than a recently fired executive.</Tip>
    </div>
  );
}

function EducationChapter() {
  return (
    <div>
      <H1>Education</H1>
      <P>{PLAYER_RULE_TEXT.education}</P>
      <Table headers={['Degree', 'Prerequisites', 'Base cost', 'Base sessions']} rows={ALL_DEGREES.map(degree => [
        degree.name,
        degree.prerequisites.length ? degree.prerequisites.map(id => ALL_DEGREES.find(item => item.id === id)?.name ?? id).join(', ') : 'None',
        `${degree.costPerSession}g/session before market adjustment`,
        `${degree.sessionsRequired} × ${degree.hoursPerSession}h`,
      ])} />
      <H2>Graduation</H2>
      <P>Graduation gives +{GRADUATION_BONUSES.happiness} Happiness, +{GRADUATION_BONUSES.dependability} Dependability, +{GRADUATION_BONUSES.maxDependability} max Dependability and +{GRADUATION_BONUSES.maxExperience} max Experience, in addition to the degree's Education points and job unlocks.</P>
      <H2>Extra credit</H2>
      <P>A working Arcane Tome removes one required session. Owning all three scholar texts removes another. Together they reduce a normal ten-session degree to eight.</P>
    </div>
  );
}

function HousingChapter() {
  return (
    <div>
      <H1>Housing</H1>
      <Table headers={['Home', 'Base weekly rent', 'Weekly Happiness', 'Theft risk']} rows={Object.values(HOUSING_DATA).map(home => [
        home.name,
        `${home.weeklyRent}g`,
        `${home.happinessBonus >= 0 ? '+' : ''}${home.happinessBonus}`,
        `${home.theftRisk}%`,
      ])} />
      <P>{PLAYER_RULE_TEXT.rent}</P>
      <P>Prepaid weeks are consumed before the overdue counter rises. Moving locks the offered rent for that home. A successful plea can reduce the overdue count once per rent cycle, but it costs dignity and is not guaranteed.</P>
      <Tip>Noble Heights is not just Happiness. Its 0% housing theft risk protects valuable equipment and appliances.</Tip>
    </div>
  );
}

function ItemsChapter() {
  return (
    <div>
      <H1>Items & Shops</H1>
      <H2>Food and preservation</H2>
      <P>{PLAYER_RULE_TEXT.food}</P>
      <P>A working Eternal Cooking Fire adds {PLAYER_RULE_VALUES.cookingFireFoodBonus} regular food at the start of each turn. It does not replace the weekly {PLAYER_RULE_VALUES.foodDepletionPerWeek}-point drain.</P>
      <H2>Appliances</H2>
      <P>{PLAYER_RULE_TEXT.appliances}</P>
      <P>Broken appliances stop providing their effects. The Preservation Box and Frost Chest matter immediately because breakage can make stored food spoil at the next turn start.</P>
      <H2>Equipment</H2>
      <P>Weapons add Attack, armor and shields add Defense, and shields can block. Deeper floors require specific minimum gear. Dungeon combat also wears equipment, which can be repaired at the Forge.</P>
      <H2>The Fence</H2>
      <P>Pawned appliances can be redeemed during a six-week window. Unclaimed collateral is sold after the expiry week.</P>
    </div>
  );
}

function HealthChapter() {
  return (
    <div>
      <H1>Health & Food</H1>
      <P>{PLAYER_RULE_TEXT.starvation}</P>
      <P>Eating spoiled store-bought food without working preservation has a {Math.round(PLAYER_RULE_VALUES.spoiledFoodSicknessChance * 100)}% sickness check. A healer visit caused by food or exhaustion removes time, Happiness and cash, but never creates debt: the charge cannot take cash below 0.</P>
      <H2>Sickness</H2>
      <P>Ongoing sickness drains Health and Happiness each week until cured. Healing and curing are separate services at the Enchanter.</P>
      <H2>Death and resurrection</H2>
      <P>At 0 Health, resurrection may use Savings when enough is available. The price scales from a base cost with liquid wealth and has a cap. Without permadeath, an unpaid resurrection can still return the player at low Health; with permadeath, the player may be eliminated.</P>
      <H2>Aging</H2>
      <P>{PLAYER_RULE_TEXT.aging} Milestones can change Happiness, Health or Dependability, while older adventurers face health decline and rare crises.</P>
    </div>
  );
}

function CombatChapter() {
  const rows = DUNGEON_FLOORS.map(floor => {
    const requirements: string[] = [];
    if (floor.requirements.previousFloorCleared > 0) requirements.push(`Floor ${floor.requirements.previousFloorCleared}`);
    if (floor.requirements.minimumWeapon) requirements.push(floor.requirements.minimumWeapon.replace(/-/g, ' '));
    if (floor.requirements.minimumArmor) requirements.push(floor.requirements.minimumArmor.replace(/-/g, ' '));
    if (floor.requirements.requiredDegrees?.length) requirements.push(floor.requirements.requiredDegrees.join(', '));
    return [
      `${floor.id}. ${floor.name}`,
      `${floor.timeCost}h`,
      `${floor.goldRange[0]}-${floor.goldRange[1]}g`,
      requirements.length ? requirements.join(' + ') : 'None',
    ];
  });

  return (
    <div>
      <H1>Combat & The Dungeon</H1>
      <Table headers={['Floor', 'Base time', 'Base gold range', 'Minimum unlocks']} rows={rows} />
      <P>Each run is resolved encounter by encounter. Education, equipped stats, durability, guild rank, the active festival and a random dungeon modifier can all change the outcome.</P>
      <P>Retreat is available between normal encounters and keeps part of the accumulated gold. Once committed to the boss, retreat is no longer available. Defeat keeps less gold than a voluntary retreat.</P>
      <P>Each clear has a 5% base rare-drop chance. Repeat clears can still produce rare rewards. Floor 6 also requires the Loremaster degree.</P>
      <Tip>Displayed gold and damage ranges are base values. A modifier such as Blood Moon can make the real run much harsher and more profitable.</Tip>
    </div>
  );
}

function EconomyChapter() {
  return (
    <div>
      <H1>Economy</H1>
      <P>{PLAYER_RULE_TEXT.wealthFormula}</P>
      <P>{PLAYER_RULE_TEXT.wealthProgress}</P>
      <H2>Savings</H2>
      <P>{PLAYER_RULE_TEXT.savings}</P>
      <H2>The Broker</H2>
      <P>{PLAYER_RULE_TEXT.broker}</P>
      <Table headers={['Security', 'Base price', 'Risk', 'Weekly dividend']} rows={STOCKS.map(stock => [
        stock.name,
        `${stock.basePrice}g`,
        stock.isTBill ? 'Fixed price' : `${Math.round(stock.volatility * 100)}% volatility`,
        `${(stock.dividendRate * 100).toFixed(1)}% of current position value`,
      ])} />
      <H2>Loans</H2>
      <P>{PLAYER_RULE_TEXT.loans}</P>
      <H2>Fortune's Wheel</H2>
      <P>{PLAYER_RULE_TEXT.lottery}</P>
    </div>
  );
}

function CrimeChapter() {
  return (
    <div>
      <H1>Crime & Theft</H1>
      <P>Cash carried through risky parts of Guildholm can be stolen. Savings and securities remain at the Bank and are not removed by a street robbery.</P>
      <P>Apartment burglary depends on housing, Relaxation and possessions. The Slums are vulnerable; Noble Heights has no housing-theft risk. Some large or protected items cannot be stolen.</P>
      <P>Protection bought at the Fence can block Shadowfingers for a limited number of weeks. Protective Amulets defend against most incoming hexes or curses and are consumed when triggered.</P>
      <Tip>Deposit cash before leaving the Bank. Carry only what the next purchase requires.</Tip>
    </div>
  );
}

function DarkMagicChapter() {
  return (
    <div>
      <H1>Dark Magic</H1>
      <P>Hexes & Curses are optional. When enabled, scrolls can block locations, afflict a player for several weeks or cause an immediate sabotage effect.</P>
      <H2>Using dark magic</H2>
      <P>Scrolls come from shops, dark rituals and dungeon drops. Casting can require time, gold, a target and a cooldown. The host validates the current location, cost, target and effect in online games.</P>
      <H2>Defense</H2>
      <P>Protective Amulets block the next eligible incoming effect. Dispel services remove location hexes. The Graveyard can attempt reflection or guarantee purification for a price.</P>
      <H2>Reputation</H2>
      <P>Heroic play builds Fame. Sabotage, curses and dark rituals build Infamy. Some goods and services require a reputation threshold.</P>
    </div>
  );
}

function WeekendsChapter() {
  return (
    <div>
      <H1>Weekends</H1>
      <P>At week end, the game selects leisure from owned tickets, working appliances and the random activity pool. A used ticket is consumed. Activities can cost gold and change Happiness.</P>
      <P>Fortune's Wheel tickets are also resolved at week end, then reset to 0. {PLAYER_RULE_TEXT.lottery}</P>
      <P>Weekend messages share the event screen with serious news. Critical events such as eviction, death, default or robbery are prioritized and can suppress ordinary leisure reports.</P>
    </div>
  );
}

function VictoryChapter() {
  return (
    <div>
      <H1>Victory Conditions</H1>
      <P>All enabled goals must be met together. Goal sliders set the required final values; progress bars show movement from the starting position rather than simply dividing the current value by the target.</P>
      <Table headers={['Goal', 'Current rule']} rows={[
        ['Wealth', PLAYER_RULE_TEXT.wealthFormula],
        ['Happiness', 'Current Happiness, with progress measured beyond the starting 50'],
        ['Education', `Completed degrees × ${PLAYER_RULE_VALUES.educationPointsPerDegree}`],
        ['Career', PLAYER_RULE_TEXT.career],
        ['Adventure', PLAYER_RULE_TEXT.adventure],
      ]} />
      <P>A multiplayer game can also end when only one player remains alive. A solo player must reach the enabled goals unless the only adventurer dies.</P>
      <Tip>Do not assume a high average wins. Victory belongs to the first player who actually satisfies every enabled target.</Tip>
    </div>
  );
}

function TipsChapter() {
  return (
    <div>
      <H1>Tips & Strategy</H1>
      <H2>Early game</H2>
      <P>Get hired, work, buy dependable food and bank spare cash. Start one affordable degree rather than spreading tuition across several paths.</P>
      <H2>Mid game</H2>
      <P>Upgrade clothing before it blocks your job. Decide whether Noble Heights is worth the theft protection. Enter the first dungeon floors only when their requirements and Health risk are comfortable.</P>
      <H2>Late game</H2>
      <P>Check the weakest goal, loan deadline and upcoming rent before spending. Broker value can move with the market, Happiness can fall, and Career becomes 0 immediately when unemployed.</P>
      <H2>Common mistakes</H2>
      <Table headers={['Mistake', 'Consequence']} rows={[
        ['Treating carried cash as safe', 'Street theft can remove it'],
        ['Believing items count toward Wealth', 'Equipment and appliances are not part of the Wealth formula'],
        ['Ignoring work after getting hired', 'Dependability can decay and Career can stall'],
        ['Buying store food without preservation', 'Spoilage can trigger an expensive healer visit'],
        ['Taking a loan as free money', 'Interest compounds and default seizes assets'],
        ['Rushing a deep floor', 'Defeat, broken equipment or death can erase the gain'],
      ]} />
    </div>
  );
}

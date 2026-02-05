# Jones in the Fast Lane - Complete Reference Guide

This document contains comprehensive information scraped from the [Jones in the Fast Lane Wiki](https://jonesinthefastlane.fandom.com/wiki/) for use as a reference when implementing Guild Life Adventures.

---

## Table of Contents

1. [Game Overview](#game-overview)
2. [Goals System](#goals-system)
3. [Time and Turns](#time-and-turns)
4. [Stats System](#stats-system)
5. [Locations](#locations)
6. [Housing System](#housing-system)
7. [Jobs and Employment](#jobs-and-employment)
8. [Education System](#education-system)
9. [Economy System](#economy-system)
10. [Items and Appliances](#items-and-appliances)
11. [Food System](#food-system)
12. [Clothing System](#clothing-system)
13. [Wild Willy (Robbery)](#wild-willy-robbery-system)
14. [Weekend System](#weekend-system)
15. [Stock Market](#stock-market)
16. [Pawn Shop](#pawn-shop)
17. [Implementation Mapping](#implementation-mapping-jones--guild-life)

---

## Game Overview

Jones in the Fast Lane is a social simulation/strategy game by Sierra On-Line (1991). Players compete to achieve four goals:
- **Wealth** - Accumulate liquid assets
- **Happiness** - Gain happiness points
- **Education** - Earn degrees
- **Career** - Climb the career ladder

The game world is a board game-like ring of buildings. Each turn represents a single week.

---

## Goals System

### How Goals Work
- Each goal is set between 10-100 at game start
- Different players can have different goal levels
- Win condition: Achieve all four goals at the START of a turn
- A 10-point goal is trivially easy (can be done turn 1)

### Wealth Goal
- Measured by "Liquid Assets" stat
- **Formula**: Cash + Bank Deposits + Stock Value
- Each $100 = 1 point toward Wealth Goal
- **$10,000 = 100 points** (full goal)
- Durables do NOT count toward wealth (buying items reduces wealth!)

### Happiness Goal
- Accumulate happiness points equal to or greater than goal
- **Ways to gain happiness:**
  - Graduating from university: **+5 Happiness**
  - Buying Computer at Socket City: **+3 Happiness** (first time only)
  - Buying VCR at Socket City: **+2 Happiness** (first time), **+1** at Z-Mart
  - Buying Refrigerator: **+1 Happiness** (first time)
  - Buying Dress Clothes or Business Suit at QT Clothing: **small bonus each purchase**
  - Some Fast Food items give happiness bonus (one per turn max)
  - Relaxation activities
- **Ways to lose happiness:**
  - Robbed by Wild Willy: **-3 (street)** or **-4 (apartment)**
  - Refused for a Loan
  - Fired from job
  - Appliance breaks: **-1 Happiness**

### Education Goal
- Each Degree = **+9 Education points**
- Starting Education = 1
- 11 Degrees available: Max = 1 + (11 × 9) = **100 points**

### Career Goal
- Directly correlates to **Dependability stat**
- Equals 0 if player has no job

---

## Time and Turns

### Turn Structure
- Each turn = 1 Week
- Each player gets **60 Hours** per turn
- Hours are spent on actions and movement
- Players take turns in order (player 1, 2, 3, 4)
- Against Jones AI: Human always goes first

### Movement
- Full lap around board = **~10 Hours**
- Entering any location = **+2 Hours**
- Players can move in either direction (shortest route)

### Turn End Conditions
- Turn ends when 60 Hours spent AND player leaves a location
- If time runs out inside a location: Can still do FREE actions (buy items, deposit money)
- Cannot: Work, Relax, or any action requiring time
- Leaving location with 0 Hours = Immediate turn end

### Starvation Penalty
- At turn start: If no food (Fast Food or Refrigerator with Fresh Food)
- Penalty: **-20 Hours** (1/3 of turn!)
- Having Refrigerator with food prevents this

### Doctor Visit Penalty
- Triggers: Starvation, Food Spoilage, or Low Relaxation
- Penalty: **-10 Hours, -4 Happiness, -$30 to -$200**

---

## Stats System

### Experience
- Gained by working
- Required for better jobs
- Capped at **maxExperience** (starts at 100)
- Each graduation: **+5 max Experience** permanently

### Dependability
- Gained by working consistently
- Required for better jobs
- Capped at **maxDependability** (starts at 100)
- Each graduation: **+5 Dependability** and **+5 max Dependability** permanently
- Can decrease if you skip work to study

### Relaxation
- Range: **10 to 50**
- Decreases by **-1 each turn**
- Never goes below 10
- Effects:
  - Low relaxation can trigger Doctor Visit
  - Affects apartment robbery chance (higher = safer)
  - Robbery chance = 1/(relaxation+1): 9% at 10, 1.95% at 50

---

## Locations

### Location List (Board Order)
The board is a ring of locations. Players start at their apartment.

| Jones Location | Description | Guild Life Equivalent |
|----------------|-------------|----------------------|
| Low-Cost Housing | Cheap apartment, robbery risk | The Slums |
| Le Security Apartments | Expensive, safe from robbery | Noble Heights |
| Rent Office | Pay rent, change apartments | Landlord |
| Monolith Burgers | Fast food, jobs | Rusty Tankard |
| Z-Mart | Cheap groceries, appliances, clothes | Shadow Market |
| QT Clothing | Quality clothes | General Store |
| Socket City | Quality appliances | Enchanter's Workshop |
| Black's Market | Grocery store, jobs | General Store |
| Employment Office | Find jobs | Guild Hall |
| Factory | Jobs only | Forge |
| Hi-Tech U | Education | Academy |
| Bank | Deposits, stocks, loans | Bank |
| Pawn Shop | Pawn/buy items | The Fence |

### Location Mechanics
- Each location has specific functions
- Some are Workplaces
- Entering costs 2 Hours
- Exiting Bank or Black's Market: Robbery risk (Week 4+)

---

## Housing System

### Housing Tiers
| Type | Jones Name | Rent | Features |
|------|------------|------|----------|
| Low-Cost | Low-Cost Housing | Cheap | Robbery risk |
| High-End | Le Security Apartments | Expensive | Safe from robbery |

### Rent Mechanics
- Rent is paid weekly
- Current rent does NOT change with economy
- New apartment rent IS affected by economy
- Can lock in lower rent when economy drops

### Rent Office
- Pay rent
- Switch apartments
- View rent prices (affected by economy)

### Salary Garnishment
- If rent is overdue: **50% of wages garnished**

---

## Jobs and Employment

### Job Requirements
Each job requires:
- Minimum **Experience**
- Minimum **Dependability**
- Specific **Degrees** (for high-end jobs)
- Minimum **Clothing** (Uniform requirement)

### Uniform Levels
| Level | Type | Jobs |
|-------|------|------|
| 1 | Casual Clothes | Entry-level (Janitor, Cook) |
| 2 | Dress Clothes | Mid-level (Checker, Teacher) |
| 3 | Business Suit | High-level (Manager, Broker) |

### Known Jobs and Wages

| Job | Location | Base Wage | Requirements |
|-----|----------|-----------|--------------|
| Janitor | Various | $4-6/hr | None |
| Cook | Monolith Burgers | ~$4/hr | None |
| Clerk | Various | ~$6/hr | None |
| Checker | Black's Market | $8/hr ($64/6hr) | 20 Exp, 20 Dep |
| Butcher | Black's Market | ~$10/hr | Trade School |
| Teacher | Hi-Tech U | $14/hr | Academic Degree |
| Assistant Manager | Z-Mart | ~$12/hr | Junior College |
| Manager (Z-Mart) | Z-Mart | $8/hr ($64/6hr) | Business Uniform |
| Manager (Monolith) | Monolith Burgers | ~$14/hr | Various |
| Manager (Black's) | Black's Market | $18/hr ($144/6hr) | 50 Exp, 50 Dep, Business Admin |
| Broker | Bank | $22/hr | Academic + Business Admin |
| Professor | Hi-Tech U | $20/hr | 50 Exp, 60 Dep, Research Degree |
| Department Manager | Factory | $22/hr ($176/6hr) | 60 Exp, 60 Dep, Junior + Engineering |
| Engineer | Factory | $23/hr | 60 Exp, 60 Dep, Junior + Engineering |
| General Manager | Factory | $25/hr | Top requirements, 3+ degrees |

### Wage Variation
- Jobs offered at **50-250%** of base wage
- Affected by economy
- Current wage stays static unless:
  - You change jobs
  - You ask for a raise
  - Market crash causes pay cut

### Asking for Raises
- If market rate > current wage, can request raise
- Select same job at Employment Office to ask

### Market Crash Effects on Jobs
- **Moderate crash**: Pay cut to **80%** of current wage
- **Major crash**: Risk of being **fired**

---

## Education System

### Degree Tree
```
START
├── Trade School (starting)
│   ├── Electronics → (Socket City jobs)
│   └── Pre-Engineering
│       └── Engineering → (Factory top jobs)
│
└── Junior College (starting)
    ├── Academic
    │   └── Graduate School
    │       └── Post Doctoral
    │           └── Research → (Professor job)
    ├── Business Administration → (Manager jobs)
    ├── Electronics (also needs Trade School)
    └── Pre-Engineering (also needs Trade School)
```

### All 11 Degrees
1. **Trade School** - Starting, unlocks trade jobs
2. **Junior College** - Starting, gateway to advanced degrees
3. **Electronics** - Requires Trade School OR Junior College
4. **Pre-Engineering** - Requires Trade School
5. **Engineering** - Requires Pre-Engineering
6. **Academic** - Requires Junior College
7. **Graduate School** - Requires Academic
8. **Post Doctoral** - Requires Graduate School
9. **Research** - Requires Post Doctoral (Professor job)
10. **Business Administration** - Requires Junior College
11. (Possibly another degree not clearly documented)

### Study Mechanics
- **10 lessons** to complete a degree (default)
- **$50** base enrollment fee
- Up to **4 courses** simultaneously
- Each lesson costs time (Hours)

### Extra Credit (Lesson Reduction)
| Items Owned | Lessons Required |
|-------------|------------------|
| None | 10 |
| Computer | 9 |
| Encyclopedia + Dictionary + Atlas | 9 |
| All 4 items | **8** (20% savings!) |

### Graduation Bonuses
- **+5 Happiness**
- **+5 Dependability** (can exceed cap!)
- **+5 max Dependability** (permanent)
- **+5 max Experience** (permanent)
- **+9 Education stat** points

---

## Economy System

### Economy Fluctuation
- Economy changes every turn
- Affects: Item prices, Wages offered, Rent offered
- Does NOT affect: Current wage, Current rent

### Economy Events
- **Market Crash**: Sudden price drop, job losses, pay cuts
- **Economic Boom**: Sudden price increase

### Crash Severity
| Type | Effects |
|------|---------|
| Minor | Prices drop |
| Moderate | Pay cuts (80% wage) |
| Major | Layoffs (fired) |

### When Economy Affects You
- Buying items: Prices fluctuate 50-250% of base
- Getting new job: Wage offered varies
- Renting new apartment: Price varies
- NOT affected: Current job wage, current rent

---

## Items and Appliances

### Appliance Prices and Bonuses

| Appliance | Socket City | Z-Mart | Happiness | Notes |
|-----------|-------------|--------|-----------|-------|
| Color TV | ~$525 | ~$450 | +2/+1 | Entertainment |
| B&W TV | N/A | ~$220 | +1 | Budget option |
| VCR | $333 | $250 | +2/+1 | Works with TV |
| Stereo | $325 | $350 | +2/+1 | Socket City cheaper! |
| Microwave | ~$276 | ~$200 | +1 | Weekend events |
| Refrigerator | $876 | $650 | +1 | Stores 6 Fresh Food |
| Freezer | Higher | Lower | +1 | Stores 12 Fresh Food |
| Computer | $1599 | N/A | +3 | Extra credit, random income |
| Encyclopedia | - | - | - | Extra credit (need all 3) |
| Dictionary | - | - | - | Extra credit (need all 3) |
| Atlas | - | - | - | Extra credit (need all 3) |

### Appliance Quality
| Source | Break Chance | Happiness Bonus |
|--------|--------------|-----------------|
| Socket City | **1/51** (~2%) | Higher |
| Z-Mart | **1/36** (~2.8%) | Lower |
| Pawn Shop (bought) | **1/36** | - |
| Pawn Shop (redeemed) | Original | - |

### Appliance Breakage
- Only triggers if player has **>$500 cash**
- Repair cost: **1/20 to 1/4** of original price
- Each break: **-1 Happiness**

### Special Appliance Effects

**Computer:**
- Random chance to earn small income each turn
- -1 lesson to graduate (Extra Credit)
- Cannot be stolen by Wild Willy

**Refrigerator:**
- Stores up to 6 Fresh Food (12 with Freezer)
- Prevents food spoilage
- Prevents starvation if has Fresh Food
- Cannot be stolen

**Freezer:**
- Increases food storage to 12 units
- Cannot be stolen

**Encyclopedia + Dictionary + Atlas:**
- ALL THREE required for -1 lesson bonus
- Cannot be stolen

### Items That Cannot Be Stolen
- Computer
- Refrigerator
- Freezer
- Stove
- Encyclopedia
- Dictionary
- Atlas

---

## Food System

### Food Types

**Fast Food (Monolith Burgers):**
- Purchased at Monolith Burgers
- Prevents starvation for ONE turn
- Consumed immediately at turn end
- Some items give happiness bonus (1 per turn max)
- Does NOT prevent Fresh Food from spoiling

**Fresh Food:**
- Purchased at grocery stores (Z-Mart, Black's Market)
- Requires Refrigerator to store
- Max 6 units (12 with Freezer)
- Excess spoils immediately
- All spoils if no Refrigerator

### Starvation
**Trigger:** Turn start with no Fast Food and no Fresh Food + Refrigerator

**Penalty:** -20 Hours (1/3 of turn)

**Prevention:**
- Buy Fast Food every turn, OR
- Own Refrigerator with Fresh Food

### Food Spoilage
- No Refrigerator: ALL Fresh Food spoils
- Refrigerator: Excess over 6 units spoils
- Refrigerator + Freezer: Excess over 12 units spoils
- Spoilage can trigger Doctor Visit

---

## Clothing System

### Clothing Categories
| Level | Type | Starting Amount |
|-------|------|-----------------|
| 1 | Casual Clothes | 6 weeks worth |
| 2 | Dress Clothes | 0 |
| 3 | Business Suit | 0 |

### Clothing Mechanics
- Clothes **wear out over time**
- Must be replaced periodically
- Required to work (can't work without proper uniform)
- Higher level includes lower (Business Suit covers all)

### Purchasing
| Store | Prices | Durability | Happiness |
|-------|--------|------------|-----------|
| QT Clothing | Higher | Longer lasting | Yes (Dress/Business) |
| Z-Mart | Lower | Wears out faster | No |

### Uniform Requirements
- **Casual**: Entry jobs (Janitor, Cook)
- **Dress**: Mid jobs (Checker, Teacher)
- **Business**: High jobs (Manager, Broker, GM)

### Bankruptcy Barrel
- If you completely run out of clothes
- Cannot work
- Humorous state

---

## Wild Willy (Robbery System)

### Street Robbery
**Trigger conditions (ALL must be true):**
- Week 4 or later
- Leaving Bank OR Black's Market
- Player has cash

**Probabilities:**
- Bank: **1/31 chance** (~3.2%)
- Black's Market: **1/51 chance** (~1.95%)

**Effects:**
- Takes **ALL cash** ($0 remaining)
- **-3 Happiness**
- Newspaper headline displayed

### Apartment Robbery
**Trigger conditions (ALL must be true):**
- Player lives in Low-Cost Housing
- Player owns Durables
- Turn start check

**Probability:**
- Formula: **1/(relaxation + 1)**
- At Relaxation 10: ~9% per turn
- At Relaxation 50: ~1.95% per turn

**Theft Roll:**
- Each Durable TYPE has **25% (1/4) chance** to be stolen
- ALL items of that type are stolen together
- Multiple types can be stolen in one robbery

**Effects:**
- **-4 Happiness** (regardless of items stolen)
- Newspaper headline displayed

**Prevention:**
- Move to Le Security Apartments (no robbery risk)
- Increase Relaxation stat
- Items that can't be stolen are safe

---

## Weekend System

### How Weekends Work
- Occurs between turns
- Automatic activity is selected
- Player pays for weekend activity
- Reported at start of next turn

### Weekend Priority
1. **Ticket Weekends** (if tickets owned)
   - Baseball Tickets (highest priority)
   - Theatre Tickets
   - Concert Tickets
2. **Durable Weekends** (20% chance each durable)
3. **Random Weekends** (42 available)

### Weekend Costs
| Type | Cost Range | When Available |
|------|------------|----------------|
| Cheap | $5-20 | Always |
| Medium | $15-55 | Weeks 1-7 |
| Expensive | $50-100 | Week 8+ |

### Tickets
- Baseball, Theatre, Concert
- Purchased during turn
- Consumed on weekend
- Give specific weekend activities
- Only one ticket type used per weekend

### Lottery Tickets
- Fixed price
- Chance to win prizes
- More tickets = higher chance
- Big prize: **$5,000**

---

## Stock Market

### Accessing Stocks
- Visit Bank → "See the Broker"
- Requires 1+ Hour
- Advances time by 2 Hours

### Stock Types
| Type | Risk | Notes |
|------|------|-------|
| Regular Stocks | High | Price fluctuates with economy |
| T-Bill Stocks | **None** | Fixed price, 3% sell fee |

### T-Bill Advantages
- Cannot be robbed (unlike cash)
- Cannot be wiped by Market Crash (unlike bank deposits)
- Count toward Liquid Assets (unlike durables)
- Price never fluctuates

### Trading
- Stock prices change every turn
- Not clamped to each other
- Can double/triple wealth with luck
- Or lose everything in crash

---

## Pawn Shop

### Pawning Items
- Get **40%** of original purchase price
- Item held as collateral
- Few weeks to redeem

### Redeeming Items
- Pay **50%** of original price
- Get item back
- Socket City items keep 1/51 break chance

### Buying Pawned Items
- Price: **50%** of original
- Break chance: **1/36** (even if originally Socket City)
- Other players' unredeemed items available

### Happiness and Pawning
- If item was pawned and repurchased: Happiness bonus applies again
- Each "first purchase" counts fresh after losing item

---

## Implementation Mapping (Jones → Guild Life)

### Locations
| Jones | Guild Life | Notes |
|-------|------------|-------|
| Low-Cost Housing | The Slums | Robbery risk |
| Le Security Apartments | Noble Heights | Safe |
| Rent Office | Landlord | Pay/change rent |
| Monolith Burgers | Rusty Tankard | Fast food, jobs |
| Z-Mart | Shadow Market | Cheap items |
| QT Clothing | General Store | Quality clothes |
| Socket City | Enchanter's Workshop | Quality appliances |
| Black's Market | General Store | Groceries |
| Employment Office | Guild Hall | Find jobs |
| Factory | Forge | Manufacturing jobs |
| Hi-Tech U | Academy | Education |
| Bank | Bank | Finance |
| Pawn Shop | The Fence | Pawn items |

### Appliances
| Jones | Guild Life |
|-------|------------|
| Color TV | Scrying Mirror |
| B&W TV | Simple Scrying Glass |
| VCR | Memory Crystal |
| Stereo | Enchanted Music Box |
| Microwave | Eternal Cooking Fire |
| Refrigerator | Preservation Box |
| Computer | Arcane Tome |

### Degrees
| Jones | Guild Life |
|-------|------------|
| Trade School | Trade Guild Certificate |
| Junior College | Junior Academy Diploma |
| Electronics | Arcane Studies Certificate |
| Pre-Engineering | Combat Training Certificate |
| Engineering | Master Combat Degree |
| Academic | Scholar Degree |
| Graduate School | Advanced Scholar Degree |
| Post Doctoral | Sage Studies Certificate |
| Research | Loremaster Degree |
| Business Administration | Commerce Degree |

### Characters
| Jones | Guild Life |
|-------|------------|
| Wild Willy | Shadowfingers |
| Jones (AI) | Grimwald |

---

## Source References

All information compiled from:
- [Goals](https://jonesinthefastlane.fandom.com/wiki/Goals)
- [Happiness Goal](https://jonesinthefastlane.fandom.com/wiki/Happiness_Goal)
- [Wealth Goal](https://jonesinthefastlane.fandom.com/wiki/Wealth_Goal)
- [Education Goal](https://jonesinthefastlane.fandom.com/wiki/Education_Goal)
- [Turn](https://jonesinthefastlane.fandom.com/wiki/Turn)
- [Time](https://jonesinthefastlane.fandom.com/wiki/Time)
- [Locations](https://jonesinthefastlane.fandom.com/wiki/Locations)
- [Socket City](https://jonesinthefastlane.fandom.com/wiki/Socket_City)
- [Z-Mart](https://jonesinthefastlane.fandom.com/wiki/Z-Mart)
- [Hi-Tech U](https://jonesinthefastlane.fandom.com/wiki/Hi-Tech_U)
- [Degrees](https://jonesinthefastlane.fandom.com/wiki/Degrees)
- [Trade School](https://jonesinthefastlane.fandom.com/wiki/Trade_School)
- [Employment Office](https://jonesinthefastlane.fandom.com/wiki/Employment_Office)
- [Jobs](https://jonesinthefastlane.fandom.com/wiki/Jobs)
- [List of Jobs](https://jonesinthefastlane.fandom.com/wiki/List_of_Jobs)
- [Economy](https://jonesinthefastlane.fandom.com/wiki/Economy)
- [Wild Willy](https://jonesinthefastlane.fandom.com/wiki/Wild_Willy)
- [Clothes](https://jonesinthefastlane.fandom.com/wiki/Clothes)
- [QT Clothing](https://jonesinthefastlane.fandom.com/wiki/QT_Clothing)
- [Uniform](https://jonesinthefastlane.fandom.com/wiki/Uniform)
- [Fast Food](https://jonesinthefastlane.fandom.com/wiki/Fast_Food)
- [Refrigerator](https://jonesinthefastlane.fandom.com/wiki/Refrigerator)
- [Computer](https://jonesinthefastlane.fandom.com/wiki/Computer)
- [Weekend](https://jonesinthefastlane.fandom.com/wiki/Weekend)
- [Stock Market](https://jonesinthefastlane.fandom.com/wiki/Stock_Market)
- [Pawn Shop](https://jonesinthefastlane.fandom.com/wiki/Pawn_Shop)
- [Rent](https://jonesinthefastlane.fandom.com/wiki/Rent)
- [Rent Office](https://jonesinthefastlane.fandom.com/wiki/Rent_Office)
- [Doctor Visit](https://jonesinthefastlane.fandom.com/wiki/Doctor_Visit)
- [Stat](https://jonesinthefastlane.fandom.com/wiki/Stat)
- [Experience](https://jonesinthefastlane.fandom.com/wiki/Experience)
- [Appliances](https://jonesinthefastlane.fandom.com/wiki/Appliances)

---

*Last updated: 2026-02-05*

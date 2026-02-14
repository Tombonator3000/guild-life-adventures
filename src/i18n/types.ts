/**
 * i18n type definitions.
 * All translation keys are typed for compile-time safety.
 */

export type Language = 'en' | 'de' | 'es';

/** Reusable shape for game data with name + description */
type NameDesc = { name: string; description: string };

export interface TranslationStrings {
  // === Common ===
  common: {
    cancel: string;
    done: string;
    back: string;
    save: string;
    load: string;
    delete: string;
    empty: string;
    options: string;
    manual: string;
    about: string;
    close: string;
    continue: string;
    yes: string;
    no: string;
    enabled: string;
    disabled: string;
    or: string;
    buy: string;
    sell: string;
    hours: string;
    gold: string;
    perHour: string;
    level: string;
    rank: string;
    requires: string;
    owned: string;
    cost: string;
    reward: string;
    time: string;
    risk: string;
    attack: string;
    defense: string;
    block: string;
    repair: string;
    work: string;
    rest: string;
    study: string;
    apply: string;
    deposit: string;
    withdraw: string;
    hire: string;
  };

  // === Title Screen ===
  title: {
    gameTitle: string;
    subtitle: string;
    newAdventure: string;
    onlineMultiplayer: string;
    continueGame: string;
    loadSavedGame: string;
    riseInRank: string;
    completeQuests: string;
    masterSkills: string;
    buildWealth: string;
    inspiredBy: string;
    loadGame: string;
    installTitle: string;
    installShare: string;
    installAdd: string;
    installConfirm: string;
    gotIt: string;
  };

  // === Game Setup ===
  setup: {
    prepareAdventure: string;
    adventurers: string;
    aiOpponents: string;
    noAi: string;
    automatic: string;
    totalPlayers: string;
    showTutorial: string;
    victoryGoals: string;
    victoryDescription: string;
    quickGame: string;
    standard: string;
    epicQuest: string;
    wealthTarget: string;
    wealthDescription: string;
    happinessTarget: string;
    educationTarget: string;
    degreeRequired: string;
    career: string;
    careerDescription: string;
    adventureGoal: string;
    optional: string;
    adventureTarget: string;
    adventureDescription: string;
    beginAdventure: string;
    enterName: string;
    choosePortrait: string;
    removeAi: string;
    addHuman: string;
    addAi: string;
    easy: string;
    medium: string;
    hard: string;
  };

  // === Game Board ===
  board: {
    week: string;
    market: string;
    economyRising: string;
    economyDeclining: string;
    economyStable: string;
    clickToTravel: string;
    endTurnHint: string;
    escMenuHint: string;
    statsInventory: string;
    playersOptions: string;
    notEnoughTime: string;
  };

  // === Sidebar ===
  sidebar: {
    players: string;
    achieve: string;
    options: string;
    dev: string;
    stats: string;
    inventory: string;
    goals: string;
    turn: string;
    gameMenu: string;
    fullscreen: string;
    exitFullscreen: string;
  };

  // === Stats ===
  stats: {
    gold: string;
    hours: string;
    health: string;
    happiness: string;
    food: string;
    clothing: string;
    dependability: string;
    dependabilityShort: string;
    wage: string;
    armor: string;
    weapon: string;
    shield: string;
    age: string;
    guildRank: string;
    housing: string;
    currentJob: string;
    unemployed: string;
    shiftsWorked: string;
    experience: string;
    goldOnHand: string;
    bankSavings: string;
    investments: string;
    loanDebt: string;
    goldBonus: string;
    degreesCompleted: string;
    relaxation: string;
    maxHealth: string;
    status: string;
    sick: string;
    dead: string;
    sickAlert: string;
    none: string;
  };

  // === Goals ===
  goals: {
    wealth: string;
    happiness: string;
    education: string;
    career: string;
    adventure: string;
    victoryGoals: string;
    allGoalsMet: string;
    endTurn: string;
    endTurnHint: string;
    goal: string;
  };

  // === Save/Load ===
  saveLoad: {
    gameMenu: string;
    saveGame: string;
    loadGame: string;
    save: string;
    load: string;
    empty: string;
    week: string;
    deleteSave: string;
    saveReturn: string;
    gameSaved: string;
    saveFailed: string;
    gameLoaded: string;
    loadFailed: string;
    saveDeleted: string;
  };

  // === Events ===
  events: {
    continue: string;
    gameOver: string;
    gold: string;
    health: string;
    happiness: string;
    food: string;
  };

  // === Victory ===
  victory: {
    victory: string;
    lastStanding: string;
    achievedGoals: string;
    winsGame: string;
    ageAtVictory: string;
    finalStats: string;
    gameOver: string;
    allPerished: string;
    returnToTitle: string;
  };

  // === Death ===
  death: {
    youAreDead: string;
    hasFallen: string;
    respawning: string;
    spiritsRestored: string;
    permadeathEnabled: string;
    acceptFate: string;
    riseAgain: string;
  };

  // === Options Menu ===
  optionsMenu: {
    options: string;
    gameplay: string;
    audio: string;
    display: string;
    speed: string;
    language: string;
    languageDesc: string;
    gameplayOptions: string;
    playerAging: string;
    playerAgingDesc: string;
    weatherEvents: string;
    weatherEventsDesc: string;
    seasonalFestivals: string;
    seasonalFestivalsDesc: string;
    permadeath: string;
    permadeathDesc: string;
    music: string;
    musicDesc: string;
    ambientSounds: string;
    ambientSoundsDesc: string;
    soundEffects: string;
    soundEffectsDesc: string;
    voiceNarration: string;
    voiceNarrationDesc: string;
    voice: string;
    voiceAuto: string;
    volume: string;
    narrationSpeed: string;
    narrationNotSupported: string;
    interface: string;
    fullscreen: string;
    fullscreenDesc: string;
    eventAnimations: string;
    eventAnimationsDesc: string;
    compactUI: string;
    compactUIDesc: string;
    turnNotifications: string;
    turnNotificationsDesc: string;
    gameSpeed: string;
    autoEndTurn: string;
    autoEndTurnDesc: string;
    aiSpeedNote: string;
    adventurersManual: string;
    build: string;
    updateAvailable: string;
    checkForUpdates: string;
    checking: string;
    forceRefresh: string;
    resetDefaults: string;
    resetAllOptions: string;
    yesReset: string;
  };

  // === Tutorial ===
  tutorial: {
    welcome: string;
    housing: string;
    getJob: string;
    buyFood: string;
    movement: string;
    educationCareer: string;
    banking: string;
    cave: string;
    victoryTitle: string;
  };

  // === Online ===
  online: {
    createRoom: string;
    joinRoom: string;
    adventurer: string;
    waitingForHost: string;
    roomCode: string;
    copyCode: string;
    startGame: string;
    leaveRoom: string;
  };

  // === Locations ===
  locations: {
    nobleHeights: string;
    generalStore: string;
    bank: string;
    forge: string;
    guildHall: string;
    cave: string;
    academy: string;
    enchanter: string;
    armory: string;
    rustyTankard: string;
    shadowMarket: string;
    fence: string;
    slums: string;
    landlord: string;
    graveyard: string;
  };

  // === AI ===
  ai: {
    isScheming: string;
  };

  // ============================================================
  // GAME DATA TRANSLATIONS (keyed by game ID)
  // ============================================================

  /** NPC titles, greetings, and location subtitles */
  npcs: Record<string, { title: string; greeting: string; subtitle: string }>;

  /** Degree names and descriptions */
  degrees: Record<string, NameDesc>;

  /** Housing tier names and descriptions */
  housing: Record<string, NameDesc>;

  /** Stock names and descriptions */
  stocks: Record<string, NameDesc>;

  /** Weather type names and descriptions */
  weather: Record<string, NameDesc>;

  /** Festival names, descriptions, and event messages */
  festivals: Record<string, NameDesc & { eventMessage: string }>;

  /** Achievement names and descriptions */
  achievements: Record<string, NameDesc>;

  /** Appliance names and descriptions */
  appliances: Record<string, NameDesc>;

  /** Item names and descriptions (general store, shadow market, armory, enchanter, tavern, academy, rare) */
  items: Record<string, NameDesc>;

  /** Quest names and descriptions */
  quests: Record<string, NameDesc>;

  /** Quest chain names, descriptions, and step names/descriptions */
  questChains: Record<string, NameDesc & { steps: Record<string, NameDesc> }>;

  /** Bounty names and descriptions */
  bounties: Record<string, NameDesc>;

  /** Job names and descriptions */
  jobs: Record<string, NameDesc>;

  /** Weekend ticket names and activity descriptions */
  tickets: Record<string, { name: string; activity: string }>;

  /** Weekend activity names and descriptions */
  weekendActivities: Record<string, NameDesc>;

  /** Reputation milestone titles and descriptions */
  reputation: Record<string, { title: string; description: string }>;

  // ============================================================
  // PANEL UI TRANSLATIONS
  // ============================================================

  /** Bank panel UI strings */
  panelBank: {
    theBroker: string;
    realmInvestments: string;
    portfolioValue: string;
    cash: string;
    availableStocks: string;
    safe: string;
    riskHigh: string;
    riskMed: string;
    riskLow: string;
    own: string;
    boughtShare: string;
    soldShare: string;
    banking: string;
    savings: string;
    totalWealth: string;
    depositAll: string;
    withdrawAll: string;
    loans: string;
    loanSystem: string;
    currentDebt: string;
    weeklyInterest: string;
    weeksRemaining: string;
    takeLoan: string;
    repayLoan: string;
    repayAll: string;
    noLoan: string;
    maxLoan: string;
    deposited: string;
    withdrawn: string;
    loanTaken: string;
    loanRepaid: string;
    loanNoHistory: string;
    sellFee: string;
  };

  /** Academy panel UI strings */
  panelAcademy: {
    degreesEarned: string;
    extraCredit: string;
    sessionsPerDegree: string;
    availableCourses: string;
    allDegreesComplete: string;
    attend: string;
    graduate: string;
    graduated: string;
    attendedClass: string;
    prerequisite: string;
    sessions: string;
    costPerSession: string;
    hoursPerSession: string;
  };

  /** Home panel UI strings */
  panelHome: {
    forRent: string;
    visitLandlord: string;
    homeless: string;
    homelessMessage: string;
    sleep: string;
    relax: string;
    relaxing: string;
    sleeping: string;
    restoreHealth: string;
    restoreHappiness: string;
  };

  /** General Store panel UI strings */
  panelStore: {
    food: string;
    durables: string;
    freshFood: string;
    preservationRequired: string;
    purchased: string;
    storedFreshFood: string;
    freshFoodStored: string;
    freshFoodCapacity: string;
    newspaper: string;
  };

  /** Guild Hall panel UI strings */
  panelGuild: {
    questBoard: string;
    employment: string;
    guildRank: string;
    reputation: string;
    activeQuest: string;
    noActiveQuest: string;
    takeQuest: string;
    completeQuest: string;
    questComplete: string;
    requiresGuildPass: string;
    buyGuildPass: string;
    guildPassBought: string;
    chainQuests: string;
    startChain: string;
    continueChain: string;
    chainComplete: string;
    chainBonus: string;
    availableJobs: string;
    applyForJob: string;
    currentJob: string;
    noJobsAvailable: string;
    hired: string;
    requiresDegree: string;
    requiresExperience: string;
    requiresDependability: string;
    requiresClothing: string;
    employers: string;
    backToEmployers: string;
    availablePositions: string;
    salaryIncrease: string;
    hiredTitle: string;
    applicationDenied: string;
    currentWageLabel: string;
    newWage: string;
    offeredWage: string;
    marketRateNote: string;
    raiseAmount: string;
    acceptRaise: string;
    acceptJob: string;
    decline: string;
    missingEducation: string;
    needMoreExperience: string;
    needMoreDependability: string;
    clothingNotSuitable: string;
    ok: string;
    currentTag: string;
    takenTag: string;
    yourWageMarketHigher: string;
    positionHeldBy: string;
    expLabel: string;
    depLabel: string;
    hourShifts: string;
    requestRaise: string;
    currentButton: string;
    takenButton: string;
    currentEmployment: string;
    wageLabel: string;
    experienceLabel: string;
    dependabilityLabel: string;
  };

  /** Armory panel UI strings */
  panelArmory: {
    clothing: string;
    weapons: string;
    armor: string;
    shields: string;
    equipped: string;
    equip: string;
    requiresFloor: string;
    combatStats: string;
    clickToEquip: string;
    purchased: string;
    equippedItem: string;
    unequippedItem: string;
  };

  /** Enchanter panel UI strings */
  panelEnchanter: {
    magicItems: string;
    appliances: string;
    cureAilments: string;
    cured: string;
    cureCost: string;
    applianceBroke: string;
    repairCost: string;
    repaired: string;
  };

  /** Shadow Market panel UI strings */
  panelShadowMarket: {
    blackMarketGoods: string;
    scholarlyTexts: string;
    lotteryTickets: string;
    weekendTickets: string;
  };

  /** Tavern panel UI strings */
  panelTavern: {
    foodAndDrink: string;
    workHere: string;
  };

  /** Cave panel UI strings */
  panelCave: {
    dungeonFloors: string;
    enterDungeon: string;
    floorCleared: string;
    floorLocked: string;
    requiresEquipment: string;
    bossFloor: string;
    explore: string;
  };

  /** Forge panel UI strings */
  panelForge: {
    temper: string;
    temperEquipment: string;
    salvage: string;
    salvageEquipment: string;
    repairAppliances: string;
    tempered: string;
    salvaged: string;
    alreadyTempered: string;
    temperBonus: string;
    salvageValue: string;
  };

  /** Landlord panel UI strings */
  panelLandlord: {
    housingOffice: string;
    currentHousing: string;
    weeklyRent: string;
    payRent: string;
    rentPaid: string;
    changeHousing: string;
    moveIn: string;
    rentDue: string;
    weeksOverdue: string;
    evictionWarning: string;
  };

  /** Fence / Pawn Shop panel UI strings */
  panelFence: {
    pawnShop: string;
    pawnItems: string;
    redeemItems: string;
    pawnValue: string;
    redeemCost: string;
    pawned: string;
    redeemed: string;
    nothingToPawn: string;
    nothingToRedeem: string;
    itemsForSale: string;
  };

  /** Graveyard panel UI strings */
  panelGraveyard: {
    restingPlace: string;
    noBusinessHere: string;
  };

  /** Bounty Board panel UI strings */
  panelBounty: {
    weeklyBounties: string;
    bountyBoard: string;
    takeBounty: string;
    completeBounty: string;
    bountyComplete: string;
    noBounties: string;
    goldReward: string;
    timeRequired: string;
    healthRisk: string;
  };

  /** Work section UI strings */
  panelWork: {
    workShift: string;
    hoursPerShift: string;
    earnPerShift: string;
    workBonus: string;
    shiftsWorked: string;
    noJob: string;
    needClothing: string;
    worked: string;
  };
}

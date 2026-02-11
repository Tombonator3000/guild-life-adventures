/**
 * i18n type definitions.
 * All translation keys are typed for compile-time safety.
 */

export type Language = 'en' | 'de' | 'es';

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
    // Gameplay
    gameplayOptions: string;
    playerAging: string;
    playerAgingDesc: string;
    weatherEvents: string;
    weatherEventsDesc: string;
    seasonalFestivals: string;
    seasonalFestivalsDesc: string;
    permadeath: string;
    permadeathDesc: string;
    // Audio
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
    // Display
    interface: string;
    fullscreen: string;
    fullscreenDesc: string;
    eventAnimations: string;
    eventAnimationsDesc: string;
    compactUI: string;
    compactUIDesc: string;
    turnNotifications: string;
    turnNotificationsDesc: string;
    // Speed
    gameSpeed: string;
    autoEndTurn: string;
    autoEndTurnDesc: string;
    aiSpeedNote: string;
    // Footer
    adventurersManual: string;
    build: string;
    updateAvailable: string;
    checkForUpdates: string;
    checking: string;
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
}

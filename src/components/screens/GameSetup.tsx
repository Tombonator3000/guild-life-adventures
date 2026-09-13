import { useShallow } from 'zustand/react/shallow';
import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import {
  PLAYER_COLORS,
  AI_DIFFICULTY_NAMES,
  AI_OPPONENTS,
  type AIConfig,
  type AIDifficulty,
  type GoalSettings,
} from '@/types/game.types';
import { PLAYER_RULE_TEXT } from '@/data/playerFacingRules';
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Compass,
  Dice6,
  Play,
  Trash2,
  Users,
} from 'lucide-react';
import { CharacterPortrait } from '@/components/game/CharacterPortrait';
import { PortraitPicker } from '@/components/game/PortraitPicker';
import { getDefaultAIPortrait, PLAYER_PORTRAITS } from '@/data/portraits';
import titleDay from '@/assets/title-day.jpg';
import { getSetupPreset, SETUP_PRESETS } from './setupGoals';
import './entry-menu.css';

const MAX_TOTAL_PLAYERS = 6;
const PLAYERS_PER_PAGE = 2;
const MALE_NAMES = [
  'Aldric',
  'Fenwick',
  'Oswin',
  'Tavish',
  'Cormac',
  'Gareth',
  'Dorian',
  'Theron',
  'Rowan',
  'Edwyn',
  'Calder',
  'Bram',
  'Orin',
  'Silvain',
  'Varric',
];
const FEMALE_NAMES = [
  'Brynn',
  'Mira',
  'Isolde',
  'Lyra',
  'Wren',
  'Selja',
  'Elara',
  'Vesper',
  'Sigrid',
  'Maren',
  'Nessa',
  'Faye',
  'Petra',
  'Tilda',
  'Hadley',
];
const NEUTRAL_NAMES = ['Ash', 'Sage', 'Quinn', 'Robin', 'River', 'Scout'];
interface HumanPlayer {
  name: string;
  portraitId: string | null;
}
type SetupStep = 'players' | 'goals';
type PortraitSelection = { index: number; type: 'human' | 'ai' };

function randomPlayer(usedNames: string[] = [], usedPortraits: (string | null)[] = []): HumanPlayer {
  const available = PLAYER_PORTRAITS.filter((portrait) => !usedPortraits.includes(portrait.id));
  const portraits = available.length ? available : PLAYER_PORTRAITS;
  const portrait = portraits[Math.floor(Math.random() * portraits.length)];
  const names =
    portrait.gender === 'male'
      ? MALE_NAMES
      : portrait.gender === 'female'
        ? FEMALE_NAMES
        : [...MALE_NAMES, ...FEMALE_NAMES, ...NEUTRAL_NAMES];
  const unused = names.filter(
    (name) => !usedNames.some((used) => used.trim().toLowerCase() === name.toLowerCase()),
  );
  const pool = unused.length ? unused : names;
  return { name: pool[Math.floor(Math.random() * pool.length)], portraitId: portrait.id };
}

export function GameSetup() {
  const { startNewGame, setPhase, setShowTutorial, setTutorialStep } = useGameStore(
    useShallow((state) => ({
      startNewGame: state.startNewGame,
      setPhase: state.setPhase,
      setShowTutorial: state.setShowTutorial,
      setTutorialStep: state.setTutorialStep,
    })),
  );
  const [players, setPlayers] = useState<HumanPlayer[]>(() => [randomPlayer()]);
  const [aiOpponents, setAiOpponents] = useState<AIConfig[]>([]);
  const [enableTutorial, setEnableTutorial] = useState(true);
  const [nameError, setNameError] = useState<string | null>(null);
  const [portraitSelection, setPortraitSelection] = useState<PortraitSelection | null>(null);
  const [goals, setGoals] = useState<GoalSettings>({ ...SETUP_PRESETS[1].goals });
  const [step, setStep] = useState<SetupStep>('players');
  const [rosterPage, setRosterPage] = useState(0);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const previousStep = useRef(step);
  const totalPlayers = players.length + aiOpponents.length;
  const canAddMore = totalPlayers < MAX_TOTAL_PLAYERS;
  const pageCount = Math.ceil(totalPlayers / PLAYERS_PER_PAGE);
  const currentPage = Math.min(rosterPage, pageCount - 1);
  const selectedPreset = getSetupPreset(goals);

  useEffect(() => {
    if (previousStep.current !== step) {
      headingRef.current?.focus();
      headingRef.current?.scrollIntoView({ block: 'start' });
      previousStep.current = step;
    }
  }, [step]);

  const allNames = () => [...players.map((player) => player.name), ...aiOpponents.map((ai) => ai.name)];
  const updatePlayer = (index: number, changes: Partial<HumanPlayer>) => {
    setPlayers((current) => current.map((player, i) => (i === index ? { ...player, ...changes } : player)));
    setNameError(null);
  };
  const updateAI = (index: number, changes: Partial<AIConfig>) => {
    setAiOpponents((current) => current.map((ai, i) => (i === index ? { ...ai, ...changes } : ai)));
    setNameError(null);
  };
  const addPlayer = () => {
    if (!canAddMore) return;
    setPlayers((current) => [
      ...current,
      randomPlayer(
        allNames(),
        current.map((player) => player.portraitId),
      ),
    ]);
    setRosterPage(Math.floor(players.length / PLAYERS_PER_PAGE));
    setNameError(null);
  };
  const addAIOpponent = () => {
    if (!canAddMore || aiOpponents.length >= AI_OPPONENTS.length) return;
    const used = allNames().map((name) => name.trim().toLowerCase());
    const unusedIndex = AI_OPPONENTS.findIndex((ai) => !used.includes(ai.name.toLowerCase()));
    const index = unusedIndex === -1 ? aiOpponents.length : unusedIndex;
    setAiOpponents((current) => [
      ...current,
      {
        name: unusedIndex === -1 ? `Rival ${totalPlayers + 1}` : AI_OPPONENTS[index].name,
        difficulty: 'medium',
        portraitId: getDefaultAIPortrait(index),
      },
    ]);
    setRosterPage(Math.floor(totalPlayers / PLAYERS_PER_PAGE));
    setNameError(null);
  };
  const validateNames = () => {
    const names = allNames().map((name) => name.trim());
    let badIndex = names.findIndex((name) => name.length === 0 || name.length > 20);
    let message =
      badIndex < 0
        ? ''
        : names[badIndex].length === 0
          ? 'Give every adventurer and AI rival a name.'
          : 'Names must be 20 characters or fewer.';
    if (badIndex < 0) {
      badIndex = names.findIndex((name, index) =>
        names.slice(0, index).some((other) => other.toLowerCase() === name.toLowerCase()),
      );
      if (badIndex >= 0) message = 'All adventurers and AI rivals must have unique names.';
    }
    if (badIndex >= 0) {
      setNameError(message);
      setRosterPage(Math.floor(badIndex / PLAYERS_PER_PAGE));
      setStep('players');
      return false;
    }
    setNameError(null);
    return true;
  };
  const handleStart = () => {
    if (!validateNames()) return;
    try {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen)
        document.documentElement.requestFullscreen().catch(() => {});
    } catch {
      /* Browsers may not support fullscreen. */
    }
    startNewGame(
      players.map((player) => player.name.trim()),
      false,
      goals,
      'medium',
      aiOpponents.length ? aiOpponents.map((ai) => ({ ...ai, name: ai.name.trim() })) : undefined,
      players.map((player) => player.portraitId),
    );
    setTutorialStep(0);
    setShowTutorial(enableTutorial);
  };
  const roster = [
    ...players.map((player, index) => ({ ...player, index, type: 'human' as const })),
    ...aiOpponents.map((ai, index) => ({ ...ai, index, type: 'ai' as const })),
  ];
  const portraitOwner =
    portraitSelection?.type === 'human'
      ? players[portraitSelection.index]
      : portraitSelection
        ? aiOpponents[portraitSelection.index]
        : null;

  return (
    <div className="entry-screen entry-screen--setup">
      <div className="entry-backdrop" aria-hidden="true">
        <img src={titleDay} alt="" />
      </div>
      <header className="entry-topbar">
        <span className="entry-brand">Guild Life</span>
        <span className="entry-small">New Adventure</span>
      </header>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (step === 'players') {
            if (validateNames()) setStep('goals');
          } else handleStart();
        }}
      >
        <main className="entry-setup">
          <div className="entry-heading">
            <h1>Prepare Your Adventure</h1>
            <p>Your name. Your rivals. Your life in Guildholm.</p>
          </div>
          <nav className="entry-steps" aria-label="Adventure setup">
            <button
              type="button"
              className="entry-button"
              aria-current={step === 'players' ? 'step' : undefined}
              onClick={() => setStep('players')}
            >
              <span className="entry-step-number">1</span>Players
            </button>
            <button
              type="button"
              className="entry-button"
              aria-current={step === 'goals' ? 'step' : undefined}
              onClick={() => {
                if (validateNames()) setStep('goals');
              }}
            >
              <span className="entry-step-number">2</span>Game Goals
            </button>
          </nav>
          {step === 'players' ? (
            <section aria-labelledby="setup-step-heading">
              <div className="entry-step-header">
                <h2 id="setup-step-heading" ref={headingRef} tabIndex={-1}>
                  Adventurers
                </h2>
                <span className="entry-small" aria-live="polite">
                  {totalPlayers}/{MAX_TOTAL_PLAYERS} players
                </span>
              </div>
              {nameError && (
                <p className="entry-error" role="alert">
                  {nameError}
                </p>
              )}
              <div className="entry-roster">
                {roster
                  .slice(currentPage * PLAYERS_PER_PAGE, (currentPage + 1) * PLAYERS_PER_PAGE)
                  .map((player) => {
                    const isAI = player.type === 'ai';
                    const key = `${player.type}-${player.index}`;
                    const aiDefinition = AI_OPPONENTS[player.index] || AI_OPPONENTS[0];
                    return (
                      <article
                        className="entry-player"
                        key={key}
                        aria-label={`${isAI ? 'AI rival' : 'Local player'} ${player.index + 1}`}
                      >
                        <div className="entry-player-main">
                          <button
                            type="button"
                            className="entry-portrait"
                            onClick={() => setPortraitSelection({ index: player.index, type: player.type })}
                            aria-label={`Choose portrait for ${player.name || 'adventurer'}`}
                          >
                            <CharacterPortrait
                              portraitId={player.portraitId ?? null}
                              playerColor={isAI ? aiDefinition.color : PLAYER_COLORS[player.index].value}
                              playerName={player.name}
                              size={72}
                              isAI={isAI}
                            />
                          </button>
                          <div className="entry-player-fields">
                            <label className="entry-field-label" htmlFor={`name-${key}`}>
                              {isAI ? 'AI rival' : 'Local player'} · Name
                            </label>
                            <input
                              id={`name-${key}`}
                              type="text"
                              value={player.name}
                              maxLength={20}
                              autoComplete="off"
                              spellCheck={false}
                              onChange={(event) =>
                                isAI
                                  ? updateAI(player.index, { name: event.target.value })
                                  : updatePlayer(player.index, { name: event.target.value })
                              }
                              className="entry-name-input"
                              placeholder={isAI ? 'AI name...' : 'Enter name...'}
                            />
                          </div>
                        </div>
                        <div className="entry-player-actions">
                          {isAI ? (
                            <label>
                              <span className="entry-field-label">Difficulty</span>
                              <select
                                className="entry-difficulty"
                                aria-label={`Difficulty for ${player.name}`}
                                value={player.difficulty}
                                onChange={(event) =>
                                  updateAI(player.index, { difficulty: event.target.value as AIDifficulty })
                                }
                              >
                                {(['easy', 'medium', 'hard'] as AIDifficulty[]).map((difficulty) => (
                                  <option key={difficulty} value={difficulty}>
                                    {AI_DIFFICULTY_NAMES[difficulty]}
                                  </option>
                                ))}
                              </select>
                            </label>
                          ) : (
                            <button
                              type="button"
                              className="entry-button entry-button--gold"
                              onClick={() =>
                                updatePlayer(
                                  player.index,
                                  randomPlayer(
                                    allNames().filter((_, index) => index !== player.index),
                                    players
                                      .filter((_, index) => index !== player.index)
                                      .map((other) => other.portraitId),
                                  ),
                                )
                              }
                            >
                              <Dice6 aria-hidden="true" />
                              Randomize
                            </button>
                          )}
                          <button
                            type="button"
                            className="entry-button entry-button--danger entry-button--icon"
                            disabled={!isAI && players.length === 1}
                            aria-label={`Remove ${player.name || 'adventurer'}`}
                            onClick={() => {
                              if (isAI)
                                setAiOpponents((current) =>
                                  current.filter((_, index) => index !== player.index),
                                );
                              else if (players.length > 1)
                                setPlayers((current) => current.filter((_, index) => index !== player.index));
                              setNameError(null);
                            }}
                          >
                            <Trash2 aria-hidden="true" />
                          </button>
                        </div>
                      </article>
                    );
                  })}
              </div>
              {pageCount > 1 && (
                <nav className="entry-roster-pages" aria-label="Player pages">
                  <button
                    type="button"
                    className="entry-button entry-button--icon"
                    aria-label="Previous players"
                    disabled={currentPage === 0}
                    onClick={() => setRosterPage(currentPage - 1)}
                  >
                    <ChevronLeft aria-hidden="true" />
                  </button>
                  <span className="entry-small" aria-live="polite">
                    Players {currentPage * PLAYERS_PER_PAGE + 1}–
                    {Math.min((currentPage + 1) * PLAYERS_PER_PAGE, totalPlayers)} of {totalPlayers}
                  </span>
                  <button
                    type="button"
                    className="entry-button entry-button--icon"
                    aria-label="Next players"
                    disabled={currentPage === pageCount - 1}
                    onClick={() => setRosterPage(currentPage + 1)}
                  >
                    <ChevronRight aria-hidden="true" />
                  </button>
                </nav>
              )}
              <div className="entry-add-players">
                <button
                  type="button"
                  onClick={addPlayer}
                  disabled={!canAddMore}
                  className="entry-button"
                  aria-label="Add human player"
                >
                  <Users aria-hidden="true" />
                  Local player
                </button>
                <button
                  type="button"
                  onClick={addAIOpponent}
                  disabled={!canAddMore || aiOpponents.length >= AI_OPPONENTS.length}
                  className="entry-button"
                  aria-label="Add AI opponent"
                >
                  <Bot aria-hidden="true" />
                  AI rival
                </button>
              </div>
              <p className="entry-roster-help">
                {aiOpponents.length
                  ? `${aiOpponents.length} AI rival${aiOpponents.length > 1 ? 's' : ''}. Each AI plays independently.`
                  : players.length === 1
                    ? 'A solo game. Add rivals or share this device with friends.'
                    : 'Local players take turns on this device.'}
              </p>
              <label className="entry-tutorial">
                <input
                  type="checkbox"
                  checked={enableTutorial}
                  onChange={(event) => setEnableTutorial(event.target.checked)}
                />
                <span>
                  <strong>Show Tutorial</strong>
                  <small>Guide my first turn · Recommended for new players</small>
                </span>
              </label>
            </section>
          ) : (
            <section aria-labelledby="setup-step-heading">
              <div className="entry-step-header">
                <h2 id="setup-step-heading" ref={headingRef} tabIndex={-1}>
                  Victory Goals
                </h2>
                <span className="entry-small">{selectedPreset?.name ?? 'Custom'}</span>
              </div>
              <div className="entry-goal-presets" role="group" aria-label="Victory goal presets">
                {SETUP_PRESETS.map((preset) => (
                  <button
                    type="button"
                    key={preset.id}
                    className="entry-button entry-preset"
                    aria-label={preset.name}
                    aria-pressed={selectedPreset?.id === preset.id}
                    onClick={() => setGoals({ ...preset.goals })}
                  >
                    <span className="entry-preset-heading">
                      <strong>{preset.name}</strong>
                      {selectedPreset?.id === preset.id && <Check aria-hidden="true" />}
                    </span>
                    <small>{preset.description}</small>
                  </button>
                ))}
              </div>
              <div className="entry-goal-summary" aria-live="polite">
                <h3>Your {selectedPreset?.name ?? 'Custom'} game</h3>
                <dl className="entry-goal-values">
                  <div className="entry-goal-value">
                    <dt>Net wealth</dt>
                    <dd>{goals.wealth.toLocaleString('en-US')} gold</dd>
                  </div>
                  <div className="entry-goal-value">
                    <dt>Happiness</dt>
                    <dd>{goals.happiness}%</dd>
                  </div>
                  <div className="entry-goal-value">
                    <dt>Education</dt>
                    <dd>
                      {goals.education / 9} degrees · {goals.education} pts
                    </dd>
                  </div>
                  <div className="entry-goal-value">
                    <dt>Career</dt>
                    <dd>{goals.career} dependability</dd>
                  </div>
                  {goals.adventure > 0 && (
                    <div className="entry-goal-value">
                      <dt>Adventure</dt>
                      <dd>{goals.adventure} pts</dd>
                    </div>
                  )}
                </dl>
                <p>
                  First to reach all {goals.adventure > 0 ? 'five' : 'four'} goals wins. Career counts while
                  employed.
                </p>
              </div>
              <details className="entry-customize">
                <summary className="entry-button">
                  Customize targets <ChevronDown aria-hidden="true" />
                </summary>
                <div className="entry-custom-grid">
                  <GoalSlider
                    id="wealth"
                    label="Wealth Target"
                    value={goals.wealth}
                    onChange={(wealth) => setGoals((current) => ({ ...current, wealth }))}
                    min={1000}
                    max={20000}
                    step={500}
                    unit="g"
                    description={PLAYER_RULE_TEXT.wealthFormula}
                  />
                  <GoalSlider
                    id="happiness"
                    label="Happiness Target"
                    value={goals.happiness}
                    onChange={(happiness) => setGoals((current) => ({ ...current, happiness }))}
                    min={25}
                    max={100}
                    step={5}
                    unit="%"
                    description="Current Happiness, with progress measured beyond the starting 50."
                  />
                  <GoalSlider
                    id="education"
                    label="Education"
                    value={goals.education}
                    onChange={(education) => setGoals((current) => ({ ...current, education }))}
                    min={9}
                    max={99}
                    step={9}
                    unit=" pts"
                    description={`${goals.education / 9} degrees required`}
                  />
                  <GoalSlider
                    id="career"
                    label="Career"
                    value={goals.career}
                    onChange={(career) => setGoals((current) => ({ ...current, career }))}
                    min={10}
                    max={100}
                    step={5}
                    unit=" dependability"
                    description={PLAYER_RULE_TEXT.career}
                  />
                </div>
                <label className="entry-adventure-toggle">
                  <input
                    type="checkbox"
                    checked={goals.adventure > 0}
                    onChange={(event) =>
                      setGoals((current) => ({ ...current, adventure: event.target.checked ? 10 : 0 }))
                    }
                  />
                  <Compass aria-hidden="true" />
                  Include Adventure Goal
                </label>
                {goals.adventure > 0 && (
                  <GoalSlider
                    id="adventure"
                    label="Adventure Target"
                    value={goals.adventure}
                    onChange={(adventure) => setGoals((current) => ({ ...current, adventure }))}
                    min={3}
                    max={25}
                    step={1}
                    unit=" pts"
                    description={PLAYER_RULE_TEXT.adventure}
                  />
                )}
              </details>
            </section>
          )}
        </main>
        <footer className="entry-dock">
          <p className="entry-dock-summary">
            {players.length} local player{players.length > 1 ? 's' : ''} · {aiOpponents.length} AI ·{' '}
            {selectedPreset?.name ?? 'Custom'} · Tutorial {enableTutorial ? 'on' : 'off'}
          </p>
          <button
            type="button"
            className="entry-button"
            onClick={() => (step === 'players' ? setPhase('title') : setStep('players'))}
          >
            <ArrowLeft aria-hidden="true" />
            Back
          </button>
          <button
            type="submit"
            className="entry-button entry-button--gold"
            aria-label={step === 'players' ? 'Choose Game Goals' : 'Begin Adventure'}
          >
            {step === 'players' ? (
              <>
                Choose Game Goals
                <ArrowRight aria-hidden="true" />
              </>
            ) : (
              <>
                <Play aria-hidden="true" />
                Begin Adventure
              </>
            )}
          </button>
        </footer>
      </form>
      {portraitSelection && portraitOwner && (
        <PortraitPicker
          selectedPortraitId={portraitOwner.portraitId ?? null}
          playerColor={
            portraitSelection.type === 'human'
              ? PLAYER_COLORS[portraitSelection.index].value
              : AI_OPPONENTS[portraitSelection.index].color
          }
          playerName={portraitOwner.name}
          onSelect={(portraitId) => {
            if (portraitSelection.type === 'human') updatePlayer(portraitSelection.index, { portraitId });
            else updateAI(portraitSelection.index, { portraitId: portraitId ?? undefined });
            setPortraitSelection(null);
          }}
          onClose={() => setPortraitSelection(null)}
        />
      )}
    </div>
  );
}

interface GoalSliderProps {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  unit: string;
  description: string;
}
function GoalSlider({ id, label, value, onChange, min, max, step, unit, description }: GoalSliderProps) {
  return (
    <div className="entry-goal-slider">
      <label htmlFor={`goal-${id}`}>
        <span>{label}</span>
        <output htmlFor={`goal-${id}`}>
          {value}
          {unit}
        </output>
      </label>
      <p id={`goal-${id}-description`}>{description}</p>
      <input
        id={`goal-${id}`}
        aria-describedby={`goal-${id}-description`}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  );
}

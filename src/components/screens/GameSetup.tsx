import { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { PLAYER_COLORS, AI_DIFFICULTY_NAMES, AI_OPPONENTS, type AIDifficulty, type AIConfig } from '@/types/game.types';
import { Plus, Minus, Bot, Play, Brain, Zap, Crown, Lightbulb, Trash2, Compass } from 'lucide-react';
import { CharacterPortrait } from '@/components/game/CharacterPortrait';
import { PortraitPicker } from '@/components/game/PortraitPicker';
import { getDefaultAIPortrait } from '@/data/portraits';
import gameBoard from '@/assets/game-board.jpeg';

const MAX_TOTAL_PLAYERS = 4;

export function GameSetup() {
  const { startNewGame, setPhase, setShowTutorial, setTutorialStep } = useGameStore();
  const [playerNames, setPlayerNames] = useState<string[]>(['Adventurer 1']);
  const [playerPortraits, setPlayerPortraits] = useState<(string | null)[]>([null]);
  const [aiOpponents, setAiOpponents] = useState<AIConfig[]>([]);
  const [enableTutorial, setEnableTutorial] = useState(true);
  const [portraitPickerIndex, setPortraitPickerIndex] = useState<number | null>(null);
  const [portraitPickerType, setPortraitPickerType] = useState<'human' | 'ai'>('human');
  const [goals, setGoals] = useState({
    wealth: 5000,
    happiness: 100,
    education: 45,   // 45 points = 5 degrees (each degree = 9 pts)
    career: 75,      // Dependability target (Jones-style)
    adventure: 0,    // Adventure points (quests + dungeon floors), 0 = disabled
  });

  const totalPlayers = playerNames.length + aiOpponents.length;
  const canAddMore = totalPlayers < MAX_TOTAL_PLAYERS;

  const addPlayer = () => {
    if (canAddMore) {
      setPlayerNames([...playerNames, `Adventurer ${playerNames.length + 1}`]);
      setPlayerPortraits([...playerPortraits, null]);
    }
  };

  const removePlayer = (index: number) => {
    if (playerNames.length > 1) {
      setPlayerNames(playerNames.filter((_, i) => i !== index));
      setPlayerPortraits(playerPortraits.filter((_, i) => i !== index));
    }
  };

  const updateName = (index: number, name: string) => {
    const newNames = [...playerNames];
    newNames[index] = name;
    setPlayerNames(newNames);
  };

  const updatePlayerPortrait = (index: number, portraitId: string | null) => {
    const newPortraits = [...playerPortraits];
    newPortraits[index] = portraitId;
    setPlayerPortraits(newPortraits);
  };

  const addAIOpponent = () => {
    if (canAddMore) {
      const aiIndex = aiOpponents.length;
      const defaultName = AI_OPPONENTS[aiIndex]?.name || `AI ${aiIndex + 1}`;
      setAiOpponents([...aiOpponents, { name: defaultName, difficulty: 'medium', portraitId: getDefaultAIPortrait(aiIndex) }]);
    }
  };

  const removeAIOpponent = (index: number) => {
    setAiOpponents(aiOpponents.filter((_, i) => i !== index));
  };

  const updateAIName = (index: number, name: string) => {
    const updated = [...aiOpponents];
    updated[index] = { ...updated[index], name };
    setAiOpponents(updated);
  };

  const updateAIDifficulty = (index: number, difficulty: AIDifficulty) => {
    const updated = [...aiOpponents];
    updated[index] = { ...updated[index], difficulty };
    setAiOpponents(updated);
  };

  const updateAIPortrait = (index: number, portraitId: string | null) => {
    const updated = [...aiOpponents];
    updated[index] = { ...updated[index], portraitId: portraitId ?? undefined };
    setAiOpponents(updated);
  };

  const openPortraitPicker = (index: number, type: 'human' | 'ai') => {
    setPortraitPickerIndex(index);
    setPortraitPickerType(type);
  };

  const handlePortraitSelect = (portraitId: string | null) => {
    if (portraitPickerIndex === null) return;
    if (portraitPickerType === 'human') {
      updatePlayerPortrait(portraitPickerIndex, portraitId);
    } else {
      updateAIPortrait(portraitPickerIndex, portraitId);
    }
    setPortraitPickerIndex(null);
  };

  const handleStart = () => {
    // Enter fullscreen when game begins
    try {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    } catch { /* ignore */ }

    startNewGame(
      playerNames,
      false, // legacy includeAI flag - not used when aiConfigs provided
      goals,
      'medium', // legacy aiDifficulty
      aiOpponents.length > 0 ? aiOpponents : undefined,
      playerPortraits
    );
    setTutorialStep(0);
    setShowTutorial(enableTutorial);
  };

  // Preset game lengths (education in points: each degree = 9 pts)
  const presets = {
    quick: { wealth: 2000, happiness: 75, education: 18, career: 50, adventure: 0 },     // 2 degrees
    standard: { wealth: 5000, happiness: 100, education: 45, career: 75, adventure: 0 }, // 5 degrees
    epic: { wealth: 10000, happiness: 100, education: 90, career: 100, adventure: 0 },   // 10 degrees
  };

  // Estimate game duration based on goals
  const estimatedDuration = (() => {
    const degrees = Math.floor(goals.education / 9);
    const wealthK = goals.wealth / 1000;
    const careerPct = goals.career / 100;
    const adventureBonus = goals.adventure > 0 ? goals.adventure * 0.5 : 0;
    // Each degree ≈ 10-15 min, wealth ≈ 5 min per 1000g, career ≈ 20 min at max
    const baseMinutes = degrees * 12 + wealthK * 5 + careerPct * 20 + adventureBonus;
    const numHumans = playerNames.length;
    const numAI = aiOpponents.length;
    const totalPlrs = Math.max(numHumans + numAI, 1);
    // More players = longer game
    const scaled = baseMinutes * (0.7 + totalPlrs * 0.15);
    const lo = Math.round(scaled * 0.8 / 5) * 5;
    const hi = Math.round(scaled * 1.3 / 5) * 5;
    if (hi >= 180) return `${Math.round(lo / 60 * 2) / 2}–${Math.round(hi / 60 * 2) / 2} hours`;
    return `${lo}–${hi} minutes`;
  })();

  return (
    <div className="relative min-h-screen-safe overflow-x-hidden overflow-y-auto">
      {/* Background */}
      <div
        className="fixed inset-0 bg-cover bg-center opacity-30"
        style={{ backgroundImage: `url(${gameBoard})` }}
      />
      <div className="fixed inset-0 bg-background/80" />

      {/* Content — scrollable on mobile; centered only when content fits viewport */}
      <div className="relative z-10 min-h-screen-safe flex flex-col items-center justify-center px-4 py-8">
        <h1 className="font-display text-4xl font-bold text-amber-900 mb-8">
          Prepare Your Adventure
        </h1>

        <div className="w-full max-w-2xl space-y-6">
          {/* Players Section */}
          <div className="parchment-panel p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl font-semibold text-amber-900">
                Adventurers
              </h2>
              <button
                onClick={addPlayer}
                disabled={!canAddMore}
                className="p-2 wood-frame text-parchment hover:brightness-110 disabled:opacity-50"
                title="Add human player"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              {playerNames.map((name, index) => (
                <div key={index} className="flex items-center gap-3">
                  <button
                    onClick={() => openPortraitPicker(index, 'human')}
                    className="flex-shrink-0 rounded-full hover:ring-2 hover:ring-primary transition-all cursor-pointer"
                    title="Choose portrait"
                  >
                    <CharacterPortrait
                      portraitId={playerPortraits[index]}
                      playerColor={PLAYER_COLORS[index].value}
                      playerName={name}
                      size={40}
                      isAI={false}
                    />
                  </button>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => updateName(index, e.target.value)}
                    className="flex-1 px-4 py-2 bg-input border border-border rounded font-body text-amber-900 placeholder:text-amber-600/50 focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Enter name..."
                  />
                  <button
                    onClick={() => removePlayer(index)}
                    disabled={playerNames.length <= 1}
                    className="p-2 text-destructive hover:bg-destructive/10 rounded disabled:opacity-30"
                  >
                    <Minus className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>

            {/* AI Opponents Section */}
            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Bot className="w-5 h-5 text-amber-700" />
                  <span className="font-display text-amber-900">
                    AI Opponents ({aiOpponents.length})
                  </span>
                </div>
                <button
                  onClick={addAIOpponent}
                  disabled={!canAddMore}
                  className="p-2 wood-frame text-parchment hover:brightness-110 disabled:opacity-50 flex items-center gap-1"
                  title="Add AI opponent"
                >
                  <Bot className="w-4 h-4" />
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {aiOpponents.length === 0 && (
                <p className="text-sm text-amber-700/60 italic ml-7">
                  No AI opponents. Click + to add one.
                </p>
              )}

              <div className="space-y-3">
                {aiOpponents.map((ai, index) => {
                  const aiDef = AI_OPPONENTS[index] || AI_OPPONENTS[0];
                  return (
                    <div key={index} className="bg-background/30 rounded p-3 border border-border/50">
                      <div className="flex items-center gap-3 mb-2">
                        <button
                          onClick={() => openPortraitPicker(index, 'ai')}
                          className="flex-shrink-0 rounded-full hover:ring-2 hover:ring-primary transition-all cursor-pointer"
                          title="Choose portrait"
                        >
                          <CharacterPortrait
                            portraitId={ai.portraitId || getDefaultAIPortrait(index)}
                            playerColor={aiDef.color}
                            playerName={ai.name}
                            size={40}
                            isAI={true}
                          />
                        </button>
                        <input
                          type="text"
                          value={ai.name}
                          onChange={(e) => updateAIName(index, e.target.value)}
                          className="flex-1 px-3 py-1.5 bg-input border border-border rounded font-body text-amber-900 text-sm placeholder:text-amber-600/50 focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="AI name..."
                        />
                        <button
                          onClick={() => removeAIOpponent(index)}
                          className="p-1.5 text-destructive hover:bg-destructive/10 rounded"
                          title="Remove AI"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      {/* Per-AI Difficulty */}
                      <div className="flex gap-1.5 ml-[52px]">
                        {(['easy', 'medium', 'hard'] as AIDifficulty[]).map((diff) => (
                          <button
                            key={diff}
                            onClick={() => updateAIDifficulty(index, diff)}
                            className={`flex-1 px-2 py-1 rounded border text-xs transition-all ${
                              ai.difficulty === diff
                                ? 'border-primary bg-primary/20 text-primary font-semibold'
                                : 'border-border bg-background/50 text-muted-foreground hover:border-primary/50'
                            }`}
                          >
                            <div className="flex items-center justify-center gap-1">
                              {diff === 'easy' && <Brain className="w-3 h-3" />}
                              {diff === 'medium' && <Zap className="w-3 h-3" />}
                              {diff === 'hard' && <Crown className="w-3 h-3" />}
                              <span>{AI_DIFFICULTY_NAMES[diff]}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {aiOpponents.length > 0 && (
                <p className="text-xs text-amber-700/60 mt-2 ml-7">
                  {totalPlayers}/4 total players. Each AI plays independently.
                </p>
              )}
            </div>

            {/* Tutorial Toggle */}
            <div className="mt-4 pt-4 border-t border-border">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableTutorial}
                  onChange={(e) => setEnableTutorial(e.target.checked)}
                  className="w-5 h-5 accent-primary"
                />
                <Lightbulb className="w-5 h-5 text-amber-700" />
                <span className="font-display text-amber-900">
                  Show Tutorial (recommended for new players)
                </span>
              </label>
            </div>
          </div>

          {/* Victory Goals */}
          <div className="parchment-panel p-6">
            <h2 className="font-display text-xl font-semibold text-amber-900 mb-2">
              Victory Goals
            </h2>
            <p className="text-amber-700 text-sm mb-4">
              Set the targets required to win. First to reach all {goals.adventure > 0 ? 'five' : 'four'} goals wins!
            </p>

            {/* Preset buttons */}
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setGoals({ ...presets.quick, adventure: goals.adventure })}
                className="flex-1 p-2 wood-frame text-parchment text-sm font-display hover:brightness-110"
              >
                Quick Game
              </button>
              <button
                onClick={() => setGoals({ ...presets.standard, adventure: goals.adventure })}
                className="flex-1 p-2 wood-frame text-parchment text-sm font-display hover:brightness-110"
              >
                Standard
              </button>
              <button
                onClick={() => setGoals({ ...presets.epic, adventure: goals.adventure })}
                className="flex-1 p-2 wood-frame text-parchment text-sm font-display hover:brightness-110"
              >
                Epic Quest
              </button>
            </div>
            {/* Estimated duration */}
            <p className="text-xs text-amber-700/80 italic mb-4 text-center">
              ⏱ Estimated game length: <span className="font-semibold text-amber-800">{estimatedDuration}</span> per player
            </p>

            <div className="grid grid-cols-2 gap-4">
              <GoalSlider
                label="Wealth Target"
                value={goals.wealth}
                onChange={(v) => setGoals({ ...goals, wealth: v })}
                min={1000}
                max={20000}
                step={500}
                unit="g"
                description="Gold + Savings + Investments"
              />
              <GoalSlider
                label="Happiness Target"
                value={goals.happiness}
                onChange={(v) => setGoals({ ...goals, happiness: v })}
                min={25}
                max={100}
                step={5}
                unit="%"
              />
              <GoalSlider
                label="Education (Degrees)"
                value={goals.education}
                onChange={(v) => setGoals({ ...goals, education: v })}
                min={9}
                max={99}
                step={9}
                unit=" pts"
                description={`${Math.floor(goals.education / 9)} degree${Math.floor(goals.education / 9) !== 1 ? 's' : ''} required`}
              />
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-display text-amber-900">Career</span>
                  <span className="text-amber-700 font-semibold">
                    {goals.career} Dependability
                  </span>
                </div>
                <p className="text-xs text-amber-700 mb-2">Build career through work and adventure</p>
                <input
                  type="range"
                  min={10}
                  max={100}
                  step={5}
                  value={goals.career}
                  onChange={(e) => setGoals({ ...goals, career: Number(e.target.value) })}
                  className="w-full accent-primary"
                />
              </div>
            </div>

            {/* Optional Adventure Goal */}
            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Compass className="w-5 h-5 text-amber-700" />
                  <span className="font-display text-amber-900">Adventure Goal</span>
                  <span className="text-xs text-amber-600">(Optional)</span>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-xs text-amber-700">{goals.adventure > 0 ? 'Enabled' : 'Disabled'}</span>
                  <input
                    type="checkbox"
                    checked={goals.adventure > 0}
                    onChange={(e) => setGoals({ ...goals, adventure: e.target.checked ? 10 : 0 })}
                    className="w-4 h-4 accent-primary"
                  />
                </label>
              </div>
              {goals.adventure > 0 && (
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-display text-amber-900">Adventure Target</span>
                    <span className="text-amber-700 font-semibold">
                      {goals.adventure} pts
                    </span>
                  </div>
                  <p className="text-xs text-amber-700 mb-2">
                    Quests completed + dungeon floors cleared (current max: ~24)
                  </p>
                  <input
                    type="range"
                    min={3}
                    max={25}
                    step={1}
                    value={goals.adventure}
                    onChange={(e) => setGoals({ ...goals, adventure: Number(e.target.value) })}
                    className="w-full accent-primary"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center gap-4">
            <button
              onClick={() => setPhase('title')}
              className="px-6 py-3 wood-frame text-parchment font-display hover:brightness-110"
            >
              Back
            </button>
            <button
              onClick={handleStart}
              className="gold-button flex items-center gap-2"
            >
              <Play className="w-5 h-5" />
              Begin Adventure
            </button>
          </div>
        </div>
      </div>

      {/* Portrait Picker Modal */}
      {portraitPickerIndex !== null && (
        <PortraitPicker
          selectedPortraitId={
            portraitPickerType === 'human'
              ? playerPortraits[portraitPickerIndex]
              : aiOpponents[portraitPickerIndex]?.portraitId || null
          }
          playerColor={
            portraitPickerType === 'human'
              ? PLAYER_COLORS[portraitPickerIndex].value
              : (AI_OPPONENTS[portraitPickerIndex] || AI_OPPONENTS[0]).color
          }
          playerName={
            portraitPickerType === 'human'
              ? playerNames[portraitPickerIndex]
              : aiOpponents[portraitPickerIndex]?.name || 'AI'
          }
          onSelect={handlePortraitSelect}
          onClose={() => setPortraitPickerIndex(null)}
        />
      )}
    </div>
  );
}

interface GoalSliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  unit: string;
  description?: string;
}

function GoalSlider({ label, value, onChange, min, max, step = 1, unit, description }: GoalSliderProps) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="font-display text-amber-900">{label}</span>
        <span className="text-amber-700 font-semibold">{value}{unit}</span>
      </div>
      {description && (
        <p className="text-xs text-amber-700 mb-2">{description}</p>
      )}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-primary"
      />
    </div>
  );
}

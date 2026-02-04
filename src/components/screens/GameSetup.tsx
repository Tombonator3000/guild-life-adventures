import { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { PLAYER_COLORS, GUILD_RANK_NAMES, GUILD_RANK_ORDER } from '@/types/game.types';
import { Plus, Minus, Bot, Play } from 'lucide-react';
import gameBoard from '@/assets/game-board.jpeg';

export function GameSetup() {
  const { startNewGame, setPhase } = useGameStore();
  const [playerNames, setPlayerNames] = useState<string[]>(['Adventurer 1']);
  const [includeAI, setIncludeAI] = useState(false);
  const [goals, setGoals] = useState({
    wealth: 5000,
    happiness: 100,
    education: 5,
    career: 4,
  });

  const addPlayer = () => {
    if (playerNames.length < 4) {
      setPlayerNames([...playerNames, `Adventurer ${playerNames.length + 1}`]);
    }
  };

  const removePlayer = (index: number) => {
    if (playerNames.length > 1) {
      setPlayerNames(playerNames.filter((_, i) => i !== index));
    }
  };

  const updateName = (index: number, name: string) => {
    const newNames = [...playerNames];
    newNames[index] = name;
    setPlayerNames(newNames);
  };

  const handleStart = () => {
    startNewGame(playerNames, includeAI, goals);
  };

  // Preset game lengths
  const presets = {
    quick: { wealth: 2000, happiness: 75, education: 2, career: 2 },
    standard: { wealth: 5000, happiness: 100, education: 5, career: 4 },
    epic: { wealth: 10000, happiness: 100, education: 10, career: 7 },
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-30"
        style={{ backgroundImage: `url(${gameBoard})` }}
      />
      <div className="absolute inset-0 bg-background/80" />

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-8">
        <h1 className="font-display text-4xl font-bold text-foreground mb-8">
          Prepare Your Adventure
        </h1>

        <div className="w-full max-w-2xl space-y-6">
          {/* Players Section */}
          <div className="parchment-panel p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl font-semibold text-card-foreground">
                Adventurers
              </h2>
              <button
                onClick={addPlayer}
                disabled={playerNames.length >= 4}
                className="p-2 wood-frame text-card hover:brightness-110 disabled:opacity-50"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              {playerNames.map((name, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-full border-2 border-wood-light flex-shrink-0"
                    style={{ backgroundColor: PLAYER_COLORS[index].value }}
                  />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => updateName(index, e.target.value)}
                    className="flex-1 px-4 py-2 bg-input border border-border rounded font-body text-card-foreground focus:outline-none focus:ring-2 focus:ring-primary"
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

            {/* AI Opponent */}
            <div className="mt-4 pt-4 border-t border-border">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeAI}
                  onChange={(e) => setIncludeAI(e.target.checked)}
                  className="w-5 h-5 accent-primary"
                />
                <Bot className="w-5 h-5 text-muted-foreground" />
                <span className="font-display text-card-foreground">
                  Include Grimwald (AI Opponent)
                </span>
              </label>
            </div>
          </div>

          {/* Victory Goals */}
          <div className="parchment-panel p-6">
            <h2 className="font-display text-xl font-semibold text-card-foreground mb-2">
              Victory Goals
            </h2>
            <p className="text-muted-foreground text-sm mb-4">
              Set the targets required to win. First to reach all four goals wins!
            </p>

            {/* Preset buttons */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setGoals(presets.quick)}
                className="flex-1 p-2 wood-frame text-card text-sm font-display hover:brightness-110"
              >
                Quick Game
              </button>
              <button
                onClick={() => setGoals(presets.standard)}
                className="flex-1 p-2 wood-frame text-card text-sm font-display hover:brightness-110"
              >
                Standard
              </button>
              <button
                onClick={() => setGoals(presets.epic)}
                className="flex-1 p-2 wood-frame text-card text-sm font-display hover:brightness-110"
              >
                Epic Quest
              </button>
            </div>

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
                label="Education Courses"
                value={goals.education}
                onChange={(v) => setGoals({ ...goals, education: v })}
                min={1}
                max={16}
                step={1}
                unit=""
                description="Total course levels completed"
              />
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-display text-card-foreground">Career Rank</span>
                  <span className="text-primary font-semibold">
                    {GUILD_RANK_NAMES[GUILD_RANK_ORDER[goals.career - 1] || 'novice']}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mb-2">Reach this guild rank</p>
                <input
                  type="range"
                  min={1}
                  max={7}
                  value={goals.career}
                  onChange={(e) => setGoals({ ...goals, career: Number(e.target.value) })}
                  className="w-full accent-primary"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center gap-4">
            <button
              onClick={() => setPhase('title')}
              className="px-6 py-3 wood-frame text-card font-display hover:brightness-110"
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
        <span className="font-display text-card-foreground">{label}</span>
        <span className="text-primary font-semibold">{value}{unit}</span>
      </div>
      {description && (
        <p className="text-xs text-muted-foreground mb-2">{description}</p>
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

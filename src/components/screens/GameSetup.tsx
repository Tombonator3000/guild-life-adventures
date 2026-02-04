import { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { PLAYER_COLORS } from '@/types/game.types';
import { Plus, Minus, Bot, User, Play } from 'lucide-react';
import gameBoard from '@/assets/game-board.jpeg';

export function GameSetup() {
  const { startNewGame, setPhase } = useGameStore();
  const [playerNames, setPlayerNames] = useState<string[]>(['Adventurer 1']);
  const [includeAI, setIncludeAI] = useState(false);
  const [goals, setGoals] = useState({
    wealth: 50,
    happiness: 50,
    education: 5,
    career: 50,
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

        <div className="w-full max-w-2xl space-y-8">
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
            <h2 className="font-display text-xl font-semibold text-card-foreground mb-4">
              Victory Goals
            </h2>
            <p className="text-muted-foreground text-sm mb-4">
              Set the targets required to win. Higher values = longer game.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <GoalSlider
                label="Wealth Target"
                value={goals.wealth}
                onChange={(v) => setGoals({ ...goals, wealth: v })}
                min={10}
                max={100}
                unit="%"
                description={`${goals.wealth * 100} gold`}
              />
              <GoalSlider
                label="Happiness Target"
                value={goals.happiness}
                onChange={(v) => setGoals({ ...goals, happiness: v })}
                min={10}
                max={100}
                unit="%"
              />
              <GoalSlider
                label="Education Courses"
                value={goals.education}
                onChange={(v) => setGoals({ ...goals, education: v })}
                min={1}
                max={20}
                unit=""
              />
              <GoalSlider
                label="Career Progress"
                value={goals.career}
                onChange={(v) => setGoals({ ...goals, career: v })}
                min={10}
                max={100}
                unit="%"
              />
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
              Start Game
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
  unit: string;
  description?: string;
}

function GoalSlider({ label, value, onChange, min, max, unit, description }: GoalSliderProps) {
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
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-primary"
      />
    </div>
  );
}

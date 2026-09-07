import { Swords, Heart, Coins, ShieldAlert } from 'lucide-react';
import type { DungeonRunState } from '@/data/combatResolver';
import { getEncounterIcon, getEncounterAction } from '@/data/combatResolver';
import { getEncounterImage } from '@/assets/encounters';
import { LocationActions } from '../LocationPages';
import { HealthBar } from './HealthBar';

interface EncounterIntroProps {
  encounter: DungeonRunState['encounters'][0]; encounterIndex: number; totalEncounters: number;
  currentHealth: number; maxHealth: number; canDisarm: boolean;
  modifier?: DungeonRunState['modifier'];
  onFight: () => void; onSkip?: () => void;
}

export function EncounterIntro({ encounter, encounterIndex, totalEncounters, currentHealth, maxHealth, canDisarm, modifier, onFight, onSkip }: EncounterIntroProps) {
  const combat = encounter.type === 'combat' || encounter.type === 'boss';
  const healingBlocked = encounter.type === 'healing' && modifier?.disableHealing;
  const healing = Math.min(maxHealth - currentHealth, Math.floor(Math.abs(encounter.baseDamage) * (modifier?.healingMult ?? 1)));
  const [opening, ...rest] = encounter.flavorText.split(/(?<=[.!?])\s+/);
  const image = getEncounterImage(encounter.id);
  return <section className="cave-encounter" data-encounter-type={encounter.type} aria-label="Current encounter">
    <div className="cave-compact-status">{image && <img src={image} alt="" />}<div><strong>{encounter.name}</strong><span>Encounter {encounterIndex + 1}/{totalEncounters} · {currentHealth}/{maxHealth} HP</span></div></div>
    <div className="cave-progress"><strong>Encounter {encounterIndex + 1} of {totalEncounters}</strong><span><Heart size={13} /> {currentHealth}/{maxHealth} HP</span></div>
    <div className="cave-intro-health"><HealthBar currentHealth={currentHealth} maxHealth={maxHealth} /></div>
    <article className="cave-encounter-card" key={encounter.id}>
      <div className="cave-encounter-art" aria-hidden="true">{image ? <img src={image} alt="" /> : <span>{getEncounterIcon(encounter.type)}</span>}<i /></div>
      <div className="cave-encounter-copy"><p className="cave-eyebrow">{encounter.type === 'boss' ? 'Floor boss · no retreat' : encounter.type === 'combat' ? 'Enemy ahead' : encounter.type === 'healing' ? 'A moment of respite' : encounter.type === 'trap' ? 'Watch your step' : 'A discovery'}</p>
        <h3>{encounter.name}</h3><details className="cave-flavor"><summary>{opening}</summary>{rest.length > 0 && <p>{rest.join(' ')}</p>}</details>
        <div className="cave-stats">
          {combat && <><span><Swords /> Power <b>{encounter.basePower * (modifier?.enemyPowerMult ?? 1)}</b></span><span><ShieldAlert /> Base damage <b>{encounter.baseDamage}</b></span><span><Coins /> Base gold <b>{encounter.baseGold}g</b></span></>}
          {encounter.type === 'healing' && <span><Heart /> {healingBlocked ? 'Spring sealed by Blood Moon · 0 HP' : `Restores up to ${healing} HP`}</span>}
          {encounter.type === 'treasure' && <span><Coins /> Base treasure: {encounter.baseGold}g</span>}
          {encounter.type === 'trap' && <span>{canDisarm ? 'Trap Sense: you can disarm this.' : `Base damage: ${encounter.baseDamage} HP`}</span>}
        </div>
        {encounter.requiresArcane && <p className="cave-hint">Ethereal: Arcane knowledge needed.</p>}
      </div>
    </article>
    <LocationActions><div className="cave-actions" role="group" aria-label="Encounter choices">
      {!healingBlocked && <button className="gold-button" data-ui-sound={combat ? 'sword-hit' : encounter.type === 'healing' ? 'heal' : encounter.type === 'treasure' ? 'coin-gain' : 'button-click'} onClick={onFight}>{combat ? `Fight ${encounter.name}` : getEncounterAction(encounter, canDisarm)}</button>}
      {encounter.type === 'healing' && onSkip && <button className="cave-secondary" onClick={onSkip}>Leave Spring</button>}
    </div></LocationActions>
  </section>;
}

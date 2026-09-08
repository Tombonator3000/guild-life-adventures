// Guild Life - The Guildholm Herald (Newspaper Modal with Scroll Design)

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { LocationPages } from './LocationPages';
import './location-shell.css';
import './herald.css';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import type { Newspaper as NewspaperType, NewsArticle } from '@/data/newspaper';


// Woodcut illustrations per category
import woodcutEconomy from '@/assets/newspaper/woodcut-economy.jpg';
import woodcutJobs from '@/assets/newspaper/woodcut-jobs.jpg';
import woodcutQuests from '@/assets/newspaper/woodcut-quests.jpg';
import woodcutGossip from '@/assets/newspaper/woodcut-gossip.jpg';
import woodcutEvents from '@/assets/newspaper/woodcut-events.jpg';
import woodcutRent from '@/assets/newspaper/woodcut-rent.jpg';
import woodcutClothing from '@/assets/newspaper/woodcut-clothing.jpg';
import woodcutDungeon from '@/assets/newspaper/woodcut-dungeon.jpg';

// Personalized article woodcuts
import woodcutRobbery from '@/assets/newspaper/woodcut-robbery.jpg';
import woodcutBurglary from '@/assets/newspaper/woodcut-burglary.jpg';
import woodcutDeath from '@/assets/newspaper/woodcut-death.jpg';
import woodcutDegree from '@/assets/newspaper/woodcut-degree.jpg';
import woodcutQuestComplete from '@/assets/newspaper/woodcut-quest-complete.jpg';
import woodcutFired from '@/assets/newspaper/woodcut-fired.jpg';
import woodcutCrash from '@/assets/newspaper/woodcut-crash.jpg';
import woodcutStarvation from '@/assets/newspaper/woodcut-starvation.jpg';
import woodcutLoan from '@/assets/newspaper/woodcut-loan.jpg';
import woodcutSickness from '@/assets/newspaper/woodcut-sickness.jpg';
import woodcutEviction from '@/assets/newspaper/woodcut-eviction.jpg';
import woodcutLoanRepaid from '@/assets/newspaper/woodcut-loan-repaid.jpg';

interface NewspaperModalProps {
  newspaper: NewspaperType | null;
  onClose: () => void;
}

const CATEGORY_IMAGES: Record<string, string> = {
  economy: woodcutEconomy,
  jobs: woodcutJobs,
  quests: woodcutQuests,
  gossip: woodcutGossip,
  events: woodcutEvents,
};

/** Pick the best illustration for an article based on headline keywords */
function getArticleImage(article: NewsArticle): string {
  const h = article.headline.toLowerCase();

  // Personalized article types (robbery, death, degree, quest, etc.)
  if (h.includes('robbed') || h.includes('robbery') || h.includes('theft') || h.includes('mugged') || h.includes('pickpocket') || h.includes('shadowfingers strike')) return woodcutRobbery;
  if (h.includes('break-in') || h.includes('burgl') || h.includes('home invasion') || h.includes('ransack')) return woodcutBurglary;
  if (h.includes('death') || h.includes('died') || h.includes('obituary') || h.includes('resurrection') || h.includes('passes away')) return woodcutDeath;
  if (h.includes('degree') || h.includes('graduat') || h.includes('scholar') || h.includes('academic') || h.includes('diploma')) return woodcutDegree;
  if (h.includes('quest complete') || h.includes('quest triumph') || h.includes('hero returns') || h.includes('adventure complete') || h.includes('bounty claimed')) return woodcutQuestComplete;
  if (h.includes('fired') || h.includes('terminated') || h.includes('dismissed') || h.includes('lost their job') || h.includes('sacked')) return woodcutFired;
  if (h.includes('crash') || h.includes('collapse') || h.includes('catastrophe') || h.includes('crisis') || h.includes('layoff') || h.includes('mass')) return woodcutCrash;
  if (h.includes('starv') || h.includes('hunger') || h.includes('famine')) return woodcutStarvation;
  if (h.includes('loan repaid') || h.includes('debt-free') || h.includes('settles debt')) return woodcutLoanRepaid;
  if (h.includes('loan default') || h.includes('seize') || h.includes('asset seizure') || h.includes('debt')) return woodcutLoan;
  if (h.includes('loan repaid') || h.includes('debt free') || h.includes('paid off')) return woodcutLoanRepaid;
  if (h.includes('sick') || h.includes('illness') || h.includes('plague') || h.includes('fever') || h.includes('disease')) return woodcutSickness;
  if (h.includes('evict') || h.includes('thrown out') || h.includes('homeless')) return woodcutEviction;
  if (h.includes('pay cut') || h.includes('wage') || h.includes('paycut')) return woodcutFired;

  // Generic event subtypes
  if (h.includes('rent') || h.includes('landlord')) return woodcutRent;
  if (h.includes('clothing') || h.includes('fashion') || h.includes('attire') || h.includes('dress code')) return woodcutClothing;
  if (h.includes('dungeon') || h.includes('cave') || h.includes('monster')) return woodcutDungeon;
  return CATEGORY_IMAGES[article.category] || woodcutGossip;
}

function PriceTrend({ priceModifier }: { priceModifier: number }) {
  if (priceModifier > 1.05) {
    return (
      <span className="flex items-center gap-1 text-red-800">
        <TrendingUp className="w-3.5 h-3.5" />
        <span className="text-xs font-bold">Prices High (+{Math.round((priceModifier - 1) * 100)}%)</span>
      </span>
    );
  } else if (priceModifier < 0.95) {
    return (
      <span className="flex items-center gap-1 text-green-800">
        <TrendingDown className="w-3.5 h-3.5" />
        <span className="text-xs font-bold">Prices Low (-{Math.round((1 - priceModifier) * 100)}%)</span>
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-amber-800">
      <Minus className="w-3.5 h-3.5" />
      <span className="text-xs font-bold">Prices Stable</span>
    </span>
  );
}

export function NewspaperModal({ newspaper, onClose }: NewspaperModalProps) {
  if (!newspaper) return null;
  return <Dialog open onOpenChange={open=>{if(!open)onClose();}}>
    <DialogContent className="herald-modal [&>button]:hidden">
      <header className="herald-masthead">
        <div className="herald-kicker"><span>Guildholm · Independent since 1142</span><button aria-label="Close newspaper" onClick={onClose}>Close ×</button></div>
        <DialogTitle className="herald-title">The Guildholm Herald</DialogTitle>
        <DialogDescription className="herald-tagline">The city, its citizens, and their questionable decisions.</DialogDescription>
        <div className="herald-issue"><span>WEEK {newspaper.week} · CITY EDITION</span><PriceTrend priceModifier={newspaper.priceModifier} /></div>
      </header>
      <LocationPages pageKey={`herald-${newspaper.week}`}>
        {newspaper.articles.map((article,index)=><article className="herald-story" data-lead={index===0} key={`${index}-${article.headline}`}>
          <div className="herald-section">{article.category} · {article.evidence==='satire'?'Tavern satire':article.evidence==='notice'?'Public notice':'City record'}</div>
          <h3>{article.headline}</h3>
          <div className="herald-story-body">
            <img src={getArticleImage(article)} alt="" draggable={false} />
            <p>{article.content}</p>
          </div>
        </article>)}
      </LocationPages>
      <footer className="herald-footer">City records follow your game. The tavern column follows its imagination.</footer>
    </DialogContent>
  </Dialog>;
}

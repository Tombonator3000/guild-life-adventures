// Guild Life - The Guildholm Herald (Newspaper Modal with Scroll Design)

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import type { Newspaper as NewspaperType, NewsArticle } from '@/data/newspaper';

// Scroll background
import scrollBg from '@/assets/newspaper/scroll-background.png';

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

  return (
    <Dialog open={!!newspaper} onOpenChange={() => onClose()}>
      <DialogContent
        className="border-0 bg-transparent shadow-none p-0 max-w-lg max-h-[90vh] overflow-hidden [&>button]:hidden"
        style={{ background: 'transparent' }}
      >
        {/* Scroll background container with unrolling animation */}
        <AnimatePresence>
          {newspaper && (
            <motion.div
              className="relative w-full"
              style={{ minHeight: '500px', transformOrigin: 'top center' }}
              initial={{ scaleY: 0.05, scaleX: 0.92, opacity: 0.7 }}
              animate={{ scaleY: 1, scaleX: 1, opacity: 1 }}
              exit={{ scaleY: 0.05, scaleX: 0.92, opacity: 0 }}
              transition={{
                scaleY: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
                scaleX: { duration: 0.3, delay: 0.15, ease: 'easeOut' },
                opacity: { duration: 0.25 },
              }}
            >
              {/* Scroll image as background */}
              <img
                src={scrollBg}
                alt=""
                className="absolute inset-0 w-full h-full object-fill pointer-events-none select-none"
                draggable={false}
              />

              {/* Content fades in after scroll unrolls */}
              <motion.div
                className="relative z-10 flex flex-col"
                style={{ padding: '12% 12% 14% 12%' }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: 0.35 }}
              >
                {/* Header */}
                <div className="text-center mb-3">
                  <h2
                    className="font-display text-2xl tracking-wide"
                    style={{ color: '#3d2b1a', textShadow: '0 1px 0 rgba(255,255,255,0.3)' }}
                  >
                    The Guildholm Herald
                  </h2>
                  <div className="flex items-center justify-between text-xs mt-1 px-2" style={{ color: '#5a4230' }}>
                    <span className="font-display">Week {newspaper.week} Edition</span>
                    <PriceTrend priceModifier={newspaper.priceModifier} />
                  </div>
                  {/* Decorative divider */}
                  <div className="mx-4 mt-2 border-t border-dashed" style={{ borderColor: '#a08060' }} />
                </div>

                {/* Close button */}
                <button
                  onClick={onClose}
                  className="absolute top-[10%] right-[10%] z-20 w-7 h-7 flex items-center justify-center rounded-full text-lg font-bold hover:scale-110 transition-transform"
                  style={{ color: '#5a4230', background: 'rgba(200,180,150,0.5)' }}
                  aria-label="Close"
                >
                  ×
                </button>

                {/* Articles — scrollable area */}
                <div
                  className="flex-1 overflow-y-auto space-y-3 pr-1"
                  style={{ maxHeight: 'calc(70vh - 120px)' }}
                >
                  {newspaper.articles.map((article, index) => (
                    <motion.article
                      key={index}
                      className="rounded-sm overflow-hidden"
                      style={{
                        background: 'rgba(240, 228, 205, 0.65)',
                        border: '1px solid rgba(160, 128, 96, 0.4)',
                      }}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, delay: 0.4 + index * 0.08 }}
                    >
                      {/* Woodcut illustration banner */}
                      <div className="relative w-full h-20 overflow-hidden">
                        <img
                          src={getArticleImage(article)}
                          alt=""
                          className="w-full h-full object-cover"
                          style={{ filter: 'sepia(0.35) contrast(1.1)' }}
                          draggable={false}
                        />
                        <div
                          className="absolute inset-0"
                          style={{
                            background: 'linear-gradient(to bottom, rgba(240,228,205,0) 20%, rgba(240,228,205,0.85) 90%)',
                          }}
                        />
                        <h3
                          className="absolute bottom-1 left-2 right-2 font-display font-bold text-sm leading-tight"
                          style={{ color: '#2a1f10' }}
                        >
                          {article.headline}
                        </h3>
                      </div>
                      <div className="px-3 py-2">
                        <p className="text-xs leading-relaxed" style={{ color: '#4a3520', fontFamily: 'Crimson Text, serif' }}>
                          {article.content}
                        </p>
                      </div>
                    </motion.article>
                  ))}
                </div>

                {/* Footer tagline */}
                <div className="text-center mt-2">
                  <p className="text-[10px] italic" style={{ color: '#7a6a55' }}>
                    "All the News That's Fit to Print in Guildholm"
                  </p>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}

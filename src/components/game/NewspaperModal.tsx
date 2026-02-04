// Guild Life - The Guildholm Herald (Newspaper Modal)

import { Newspaper, X, TrendingUp, TrendingDown, Minus, Briefcase, Scroll, MessageSquare, Calendar } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Newspaper as NewspaperType, NewsArticle } from '@/data/newspaper';

interface NewspaperModalProps {
  newspaper: NewspaperType | null;
  onClose: () => void;
}

function ArticleIcon({ category }: { category: NewsArticle['category'] }) {
  switch (category) {
    case 'economy':
      return <TrendingUp className="w-4 h-4" />;
    case 'jobs':
      return <Briefcase className="w-4 h-4" />;
    case 'quests':
      return <Scroll className="w-4 h-4" />;
    case 'events':
      return <Calendar className="w-4 h-4" />;
    default:
      return <MessageSquare className="w-4 h-4" />;
  }
}

function PriceTrend({ priceModifier }: { priceModifier: number }) {
  if (priceModifier > 1.05) {
    return (
      <div className="flex items-center gap-1 text-destructive">
        <TrendingUp className="w-4 h-4" />
        <span>Prices High (+{Math.round((priceModifier - 1) * 100)}%)</span>
      </div>
    );
  } else if (priceModifier < 0.95) {
    return (
      <div className="flex items-center gap-1 text-secondary">
        <TrendingDown className="w-4 h-4" />
        <span>Prices Low (-{Math.round((1 - priceModifier) * 100)}%)</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1 text-muted-foreground">
      <Minus className="w-4 h-4" />
      <span>Prices Stable</span>
    </div>
  );
}

export function NewspaperModal({ newspaper, onClose }: NewspaperModalProps) {
  if (!newspaper) return null;

  return (
    <Dialog open={!!newspaper} onOpenChange={() => onClose()}>
      <DialogContent className="parchment-panel border-0 max-w-lg max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Newspaper className="w-6 h-6 text-primary" />
              <DialogTitle className="font-display text-2xl text-card-foreground">
                The Guildholm Herald
              </DialogTitle>
            </div>
            <button 
              onClick={onClose}
              className="p-1 hover:bg-muted rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
          <div className="flex items-center justify-between text-sm text-muted-foreground border-b border-border pb-2">
            <span>Week {newspaper.week} Edition</span>
            <PriceTrend priceModifier={newspaper.priceModifier} />
          </div>
        </DialogHeader>
        
        <div className="space-y-4 overflow-y-auto max-h-[50vh] pr-2">
          {newspaper.articles.map((article, index) => (
            <article key={index} className="wood-frame p-3 text-card">
              <div className="flex items-center gap-2 mb-2">
                <ArticleIcon category={article.category} />
                <h3 className="font-display font-bold text-sm">{article.headline}</h3>
              </div>
              <p className="text-sm text-muted-foreground">{article.content}</p>
            </article>
          ))}
        </div>

        <div className="text-center text-xs text-muted-foreground pt-2 border-t border-border">
          "All the News That's Fit to Print in Guildholm"
        </div>
      </DialogContent>
    </Dialog>
  );
}

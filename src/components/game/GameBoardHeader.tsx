import type { WeatherState } from '@/data/weather';
import { t } from '@/i18n';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

function getWeatherIcon(type: string): string {
  switch (type) {
    case 'snowstorm': return '\u2744\uFE0F'; // snowflake
    case 'thunderstorm': return '\u26C8\uFE0F'; // cloud with lightning and rain
    case 'drought': return '\u2600\uFE0F'; // sun
    case 'enchanted-fog': return '\uD83C\uDF2B\uFE0F'; // fog
    case 'harvest-rain': return '\uD83C\uDF27\uFE0F'; // cloud with rain
    default: return '';
  }
}

export function GameBoardHeader({
  week,
  priceModifier,
  economyTrend,
  weather,
}: {
  week: number;
  priceModifier: number;
  economyTrend: number;
  weather: WeatherState | null;
}) {
  return (
    <div className="absolute top-1 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
      <div className="parchment-panel px-6 py-2 flex items-center gap-6">
        <span className="font-display text-lg">
          {t('board.week')} <span className="text-primary font-bold">{week}</span>
        </span>
        <span className="text-muted-foreground">|</span>
        <span className="font-display text-lg">
          {t('board.market')}: <span className={priceModifier > 1 ? 'text-destructive' : 'text-secondary'}>
            {(priceModifier * 100).toFixed(0)}%
          </span>
          <span className="text-sm ml-1" title={economyTrend === 1 ? t('board.economyRising') : economyTrend === -1 ? t('board.economyDeclining') : t('board.economyStable')}>
            {economyTrend === 1 ? '\u2191' : economyTrend === -1 ? '\u2193' : '\u2194'}
          </span>
        </span>
        {weather && weather.type !== 'clear' && (
          <>
            <span className="text-muted-foreground">|</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="font-display text-sm cursor-help select-none">
                  {getWeatherIcon(weather.type)} {weather.name}
                  <span className="text-xs text-muted-foreground ml-1">({weather.weeksRemaining}w)</span>
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs text-left">
                <p className="font-semibold mb-1">{weather.name}</p>
                <p className="text-xs">{weather.description}</p>
                <p className="text-xs text-muted-foreground mt-1">{weather.weeksRemaining} week{weather.weeksRemaining !== 1 ? 's' : ''} remaining</p>
              </TooltipContent>
            </Tooltip>
          </>
        )}
      </div>
    </div>
  );
}

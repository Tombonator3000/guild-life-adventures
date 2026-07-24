import { useEffect, useState } from 'react';
import type { GameEvent } from '@/components/game/EventModal';

interface UseGameBoardEventQueueOptions {
  currentEvent: GameEvent | null;
  eventSource: string | null | undefined;
  dismissEvent: () => void;
}

export function useGameBoardEventQueue({
  currentEvent,
  eventSource,
  dismissEvent,
}: UseGameBoardEventQueueOptions) {
  const [eventQueueIdx, setEventQueueIdx] = useState(0);

  useEffect(() => {
    setEventQueueIdx(0);
  }, [currentEvent?.id]);

  const isWeekendEvent = eventSource === 'weekend';
  const eventLines = (!isWeekendEvent && currentEvent?.description.split('\n').filter(Boolean)) || [];
  const totalEventCount = isWeekendEvent ? 1 : eventLines.length;
  const currentEventLine = isWeekendEvent
    ? (currentEvent?.description ?? '')
    : (eventLines[eventQueueIdx] ?? eventLines[0] ?? '');
  const queuedEvent: GameEvent | null = currentEvent
    ? {
        ...currentEvent,
        title: totalEventCount > 1
          ? `${currentEvent.title} (${eventQueueIdx + 1}/${totalEventCount})`
          : currentEvent.title,
        description: currentEventLine,
      }
    : null;

  const handleEventDismiss = () => {
    if (!isWeekendEvent && eventQueueIdx < totalEventCount - 1) {
      setEventQueueIdx(index => index + 1);
      return;
    }

    setEventQueueIdx(0);
    dismissEvent();
  };

  return { queuedEvent, handleEventDismiss };
}

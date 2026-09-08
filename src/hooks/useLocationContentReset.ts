import { createContext, useContext, useLayoutEffect } from 'react';

export const LocationScrollResetContext = createContext<(() => void) | undefined>(undefined);

/** Inner navigation starts at the top; live values retain reading position. */
export function useLocationContentReset(viewKey: string) {
  const reset = useContext(LocationScrollResetContext);
  useLayoutEffect(() => { reset?.(); }, [viewKey, reset]);
}

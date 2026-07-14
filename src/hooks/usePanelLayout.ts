import { useCallback, useState } from 'react';

/**
 * A custom hook to manually handle react-resizable-panels layout persistence
 * because `autoSaveId` was removed in v4.
 */
export function usePanelLayout(id: string, defaultSizes: number[]) {
  const localStorageKey = `react-resizable-panels:${id}`;

  const getSavedLayout = (): number[] | undefined => {
    try {
      const saved = localStorage.getItem(localStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        } else {
          console.warn('Saved layout is not an array, discarding');
          localStorage.removeItem(localStorageKey);
        }
      }
    } catch (e) {
      console.warn('Failed to parse saved layout from localStorage', e);
    }
    return undefined;
  };

  const [layout] = useState<number[]>(() => getSavedLayout() ?? defaultSizes);

  const onLayoutChange = useCallback(
    (sizes: number[]) => {
      try {
        localStorage.setItem(localStorageKey, JSON.stringify(sizes));
      } catch (e) {
        console.warn('Failed to save layout to localStorage', e);
      }
    },
    [localStorageKey]
  );

  return { layout, onLayoutChange };
}

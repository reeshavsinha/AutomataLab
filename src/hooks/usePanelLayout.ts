import { useCallback, useState } from 'react';

/**
 * A custom hook to manually handle react-resizable-panels layout persistence
 * because `autoSaveId` was removed in v4.
 */
export function usePanelLayout(id: string, defaultSizes: { [key: string]: number }) {
  const localStorageKey = `react-resizable-panels:${id}`;

  const getSavedLayout = (): { [key: string]: number } | undefined => {
    try {
      const saved = localStorage.getItem(localStorageKey);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to parse saved layout from localStorage', e);
    }
    return undefined;
  };

  const [layout] = useState<{ [key: string]: number }>(() => getSavedLayout() ?? defaultSizes);

  const onLayoutChange = useCallback(
    (sizes: { [key: string]: number }) => {
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

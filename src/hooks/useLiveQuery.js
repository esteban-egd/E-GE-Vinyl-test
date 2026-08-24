import { useState, useEffect } from 'react';
import { liveQuery } from 'dexie';

export function useLiveQuery(querier, deps = [], defaultResult = undefined) {
  const [value, setValue] = useState(defaultResult);

  useEffect(() => {
    let isMounted = true;
    let subscription = null;

    try {
      const observable = liveQuery(querier);
      subscription = observable.subscribe({
        next: (val) => {
          if (isMounted) {
            setValue(val);
          }
        },
        error: (err) => {
          console.error('[useLiveQuery] Erreur de requête réactive:', err);
        },
      });
    } catch (err) {
      console.error('[useLiveQuery] Erreur initialisation:', err);
    }

    return () => {
      isMounted = false;
      if (subscription && typeof subscription.unsubscribe === 'function') {
        subscription.unsubscribe();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return value;
}

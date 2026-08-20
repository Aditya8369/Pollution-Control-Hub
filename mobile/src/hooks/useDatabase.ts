// mobile/src/hooks/useDatabase.ts
//
// React hook that initializes the SQLite database on app startup.

import { useEffect, useState } from 'react';
import { getDatabase, clearExpiredCache } from '../db/database';

export function useDatabase() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        await getDatabase();
        await clearExpiredCache();
      } catch (err) {
        console.error('[useDatabase] Failed to initialize database:', err);
      } finally {
        setIsReady(true);
      }
    })();
  }, []);

  return { isReady };
}

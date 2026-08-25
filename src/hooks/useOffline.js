import { useOfflineContext } from '../context/OfflineContext';

export function useOffline() {
  return useOfflineContext();
}

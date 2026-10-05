import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useRef, useState } from "react";
import { DEFAULT_PREFERENCES, readPreferences, type GamePreferences } from "./preferences";
const KEY = "sunmedia:safi:preferences:v1";
export function useGamePreferences() {
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [loaded, setLoaded] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const current = useRef(preferences);
  const write = useRef(Promise.resolve());
  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(KEY).then((raw) => {
      if (!active) return;
      try { current.current = readPreferences(raw ? JSON.parse(raw) : null); }
      catch { current.current = readPreferences(null); }
      setPreferences(current.current);
    }).catch(() => { if (active) setStorageError(true); }).finally(() => { if (active) setLoaded(true); });
    return () => { active = false; };
  }, []);
  const update = useCallback((fn: (p: GamePreferences) => GamePreferences) => {
    const next = readPreferences(fn(current.current));
    current.current = next;
    setPreferences(next);
    // Serial writes: a slow earlier write cannot overwrite the latest slider value.
    write.current = write.current.then(() => AsyncStorage.setItem(KEY, JSON.stringify(next)))
      .then(() => setStorageError(false)).catch(() => setStorageError(true));
  }, []);
  return { preferences, update, loaded, storageError };
}

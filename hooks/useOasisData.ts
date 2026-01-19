import { useState, useEffect } from 'react';
import { collection, query, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Game, Group } from '../types';

export const useOasisData = () => {
  const [games, setGames] = useState<Game[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [tagHierarchy, setTagHierarchy] = useState<Record<string, string[]>>({});
  const [badges, setBadges] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("Syncing Oasis...");

  useEffect(() => {
    // Track individual load states to prevent premature or stuck loading
    const loadState = {
        games: false,
        groups: false,
        meta: false
    };

    const checkInit = () => {
      if (loadState.games && loadState.groups && loadState.meta) {
        setLoading(false);
        setStatus("Ready");
      }
    };

    // Safety Timeout: If Firebase hangs or is offline/restricted, force ready after 8 seconds
    const safetyTimeout = setTimeout(() => {
        if (loading) {
            console.warn("Oasis Sync timed out. Forcing Ready state.");
            setLoading(false);
            // CHANGED: Simply show "Ready" even if timed out, per request
            setStatus("Ready");
        }
    }, 8000);

    // 1. Games Listener
    const unsubGames = onSnapshot(query(collection(db, "games")), (snap) => {
        const loadedGames: Game[] = [];
        snap.forEach(d => loadedGames.push({ id: d.id, ...d.data() } as Game));
        setGames(loadedGames);
        loadState.games = true;
        checkInit();
    }, (error) => {
        console.warn("Games sync issue:", error);
        loadState.games = true; // Mark as "handled" even on error
        checkInit();
    });

    // 2. Groups Listener
    const unsubGroups = onSnapshot(query(collection(db, "groups")), (snap) => {
        const loadedGroups: Group[] = [];
        snap.forEach(d => loadedGroups.push({ id: d.id, ...d.data() } as Group));
        setGroups(loadedGroups);
        loadState.groups = true;
        checkInit();
    }, (error) => {
        console.warn("Groups sync issue:", error);
        loadState.groups = true;
        checkInit();
    });

    // 3. Metadata Listener
    const unsubMeta = onSnapshot(doc(db, "system", "metadata"), (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data.categories) setCategories(data.categories);
          if (data.hierarchy) setTagHierarchy(data.hierarchy);
          if (data.badges) setBadges(data.badges);
        }
        loadState.meta = true;
        checkInit();
    }, (error) => {
        console.warn("Metadata sync issue:", error);
        loadState.meta = true;
        checkInit();
    });

    return () => {
        clearTimeout(safetyTimeout);
        unsubGames();
        unsubGroups();
        unsubMeta();
    };
  }, []);

  return { games, groups, categories, tagHierarchy, badges, loading, status };
};
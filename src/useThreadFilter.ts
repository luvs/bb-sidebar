import { useCallback, useMemo, useState } from "react";
import { useSidebarThreads } from "./bb-sdk";
import { STORAGE_KEYS } from "./lib/storage-keys";
import { usePersistedPreference } from "./lib/use-persisted-preference";
import { environmentGroupingCodec, shelfExpansionCodec } from "./lib/inbox-preference-codecs";
import { archivedThreads, type AttentionState } from "./thread-filter";
import type { ShelfExpansionState } from "./ThreadInboxView";

const WITH_ARCHIVED = { experimental_lifecycles: ["active", "archived"] } as const;

const ALL_SHELVES_EXPANDED: ShelfExpansionState = {
  active: true,
  pinned: true,
  working: true,
  inactive: true,
  parked: true,
  snoozed: true,
  settled: true,
};

/**
 * bb's thread list, asking for archived threads only while the Archived shelf
 * is shown. `threads` stays active-only either way, so nothing else in the
 * sidebar has to tell the two apart; `archived` carries the rest.
 */
export function useInboxThreads() {
  const [showArchived, setShowArchived] = usePersistedPreference(
    STORAGE_KEYS.showArchived.key,
    environmentGroupingCodec,
  );
  const snapshot = useSidebarThreads(showArchived ? WITH_ARCHIVED : undefined);
  // Without the archive bb lists only active threads, so pass its list through.
  const activeOnly = useMemo(
    () => (showArchived ? snapshot.threads.filter((thread) => !thread.isArchived) : null),
    [showArchived, snapshot.threads],
  );
  const threads = activeOnly ?? snapshot.threads;
  const archived = useMemo(
    () => (showArchived ? archivedThreads(snapshot.threads) : []),
    [showArchived, snapshot.threads],
  );
  return { ...snapshot, threads, archived, showArchived, setShowArchived };
}

export type InboxThreads = ReturnType<typeof useInboxThreads>;

/**
 * The attention chips, which last only as long as this window. While a chip
 * narrows the list every shelf opens, so a match is never hidden in a folded
 * shelf; clearing the chips brings the saved disclosure back untouched.
 */
export function useThreadFilter({ showArchived, setShowArchived, experimental_archived: archivedPage }: InboxThreads) {
  const [states, setStates] = useState<ReadonlySet<AttentionState>>(() => new Set());
  const [storedExpansion, setExpandedShelves] = usePersistedPreference(
    STORAGE_KEYS.shelfExpansion.key,
    shelfExpansionCodec,
  );
  const toggleState = useCallback((state: AttentionState) => {
    setStates((current) => {
      const next = new Set(current);
      if (next.has(state)) next.delete(state);
      else next.add(state);
      return next;
    });
  }, []);
  const filtering = states.size > 0;
  return {
    states,
    filtering,
    expandedShelves: filtering ? ALL_SHELVES_EXPANDED : storedExpansion,
    setExpandedShelves,
    toggleState,
    showArchived,
    setShowArchived,
    archivedPage,
  };
}

export type ThreadFilterControls = Omit<ReturnType<typeof useThreadFilter>, "expandedShelves" | "setExpandedShelves">;

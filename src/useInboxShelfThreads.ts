import { useMemo } from "react";
import type { PluginSidebarThread } from "@get-bb/plugin-sdk/app";
import type { LifecycleApi } from "./useLifecycle";
import {
  filterByProjects,
  hideChildrenOfVisibleParents,
  partitionPinned,
  sortByCreatedAtDescending,
  sortSettledThreads,
  visibleInboxThreads,
} from "./inbox";
import { activeRepresentativeThreadId } from "./inbox-layout";
import { isInactiveThread } from "./inactive";
import { isWorkingTree } from "./working-tree";
import { threadNeedsAttention } from "./useRenamingShelfLocks";
import { threadsWithAskingDescendants } from "./child-status";
import { attentionCounts, threadIsUnread, threadMatchesStates, type AttentionState } from "./thread-filter";
import { useWorkingForDisplay } from "./StatusSlot";

interface InboxShelfThreadsOptions {
  activeThreadId: string | null;
  archived: readonly PluginSidebarThread[];
  childrenByParentId: ReadonlyMap<string, readonly PluginSidebarThread[]>;
  states: ReadonlySet<AttentionState>;
  inactiveAfterHours: number | null;
  lifecycle: LifecycleApi;
  now: number;
  renamingShelfLocks: ReadonlyMap<string, "active" | "working" | "inactive">;
  scope: readonly string[];
  threads: readonly PluginSidebarThread[];
  workingShelfEnabled: boolean;
}

export function useInboxShelfThreads({
  activeThreadId,
  archived,
  childrenByParentId,
  inactiveAfterHours,
  lifecycle,
  now,
  renamingShelfLocks,
  scope,
  states,
  threads,
  workingShelfEnabled,
}: InboxShelfThreadsOptions) {
  const isWorking = useWorkingForDisplay();
  return useMemo(() => {
    const allVisible = visibleInboxThreads(threads);
    const inScope = filterByProjects(allVisible, scope);
    // The attention chips narrow every shelf. A matching child whose parent
    // does not match stands on its own, like any orphan.
    const matches = (thread: PluginSidebarThread) => threadMatchesStates(thread, states);
    const scoped = states.size > 0 ? inScope.filter(matches) : inScope;
    // Children are listed inside their parent's row instead of the flat list;
    // an orphan whose parent is not on screen stays here.
    const visible = hideChildrenOfVisibleParents(scoped);
    const active: typeof visible = [];
    const onParkedShelf: typeof visible = [];
    const onSnoozeShelf: typeof visible = [];
    const onSettledShelf: typeof visible = [];
    for (const thread of visible) {
      const shelf = lifecycle.shelfFor(thread);
      if (shelf === "parked") onParkedShelf.push(thread);
      else if (shelf === "snoozed") onSnoozeShelf.push(thread);
      else if (shelf === "settled") onSettledShelf.push(thread);
      else active.push(thread);
    }
    const split = partitionPinned(active);
    // A child's question shows only inside its parent's tree, so the tree
    // answers for it in Active, as it would for the parent's own question.
    const askingParentIds = threadsWithAskingDescendants(threads);
    const activeUnpinned: typeof split.inbox = [];
    const working: typeof split.inbox = [];
    const inactive: typeof split.inbox = [];
    for (const thread of split.inbox) {
      const lockedShelf = renamingShelfLocks.get(thread.id);
      const needsAttention = threadNeedsAttention(thread) || askingParentIds.has(thread.id);
      if (lockedShelf === "active") {
        activeUnpinned.push(thread);
        continue;
      }
      if (lockedShelf === "working" && workingShelfEnabled && !lifecycle.wokeFor(thread)) {
        working.push(thread);
        continue;
      }
      if (lockedShelf === "inactive" && !needsAttention) {
        inactive.push(thread);
        continue;
      }
      // The shelf sits above Active and answers one question: what is live.
      // Work running anywhere under the thread counts, and so does anything
      // waiting on the user — its own question or failure, or a descendant's,
      // which `isWorkingTree` deliberately refuses because that rule also
      // decides the compact row. A reply the user has not read keeps the
      // thread there too, however long ago it came, so finished work stays
      // where it ran until it is read. A thread that just woke from a snooze
      // is news for Active, unless it is one of the ones waiting on the user.
      if (
        workingShelfEnabled &&
        (needsAttention ||
          (!lifecycle.wokeFor(thread) &&
            (threadIsUnread(thread) ||
              isWorkingTree(thread, childrenByParentId.get(thread.id) ?? [], childrenByParentId, isWorking))))
      ) {
        working.push(thread);
      } else if (!askingParentIds.has(thread.id) && isInactiveThread(thread, now, inactiveAfterHours)) {
        inactive.push(thread);
      } else {
        activeUnpinned.push(thread);
      }
    }
    const allSplit = partitionPinned(allVisible);
    return {
      activeListThreadId: activeRepresentativeThreadId(threads, activeThreadId, visible),
      // BB supplies pinned rows in the user's persisted pin order.
      pinnedBase: split.pinned,
      inboxBase: sortByCreatedAtDescending(activeUnpinned),
      workingBase: sortByCreatedAtDescending(working),
      // Active's "nothing needs you" line must not appear over a shelf that
      // holds a question or a reply the user has not read.
      workingNeedsYou: working.some(
        (candidate) =>
          threadNeedsAttention(candidate) || askingParentIds.has(candidate.id) || threadIsUnread(candidate),
      ),
      inactiveBase: sortByCreatedAtDescending(inactive),
      // Keep a global order behind project-scoped and parked views. Child and
      // parked rows are included because they can become visible later; a
      // reorder elsewhere must not silently discard their old slot.
      allPinnedBase: allSplit.pinned,
      allInboxBase: sortByCreatedAtDescending(allSplit.inbox),
      parked: sortSettledThreads(onParkedShelf, lifecycle.parkedAtFor),
      // Soonest wake first: "what comes back next" is the shelf's question.
      snoozed: [...onSnoozeShelf].sort(
        (left, right) => (lifecycle.wakeAtFor(left) ?? 0) - (lifecycle.wakeAtFor(right) ?? 0),
      ),
      settled: sortSettledThreads(onSettledShelf, lifecycle.settledAtFor),
      archived: hideChildrenOfVisibleParents(filterByProjects(archived, scope).filter(matches)),
      attentionCounts: attentionCounts(inScope),
    };
  }, [
    activeThreadId,
    archived,
    childrenByParentId,
    inactiveAfterHours,
    isWorking,
    lifecycle,
    now,
    renamingShelfLocks,
    scope,
    states,
    threads,
    workingShelfEnabled,
  ]);
}

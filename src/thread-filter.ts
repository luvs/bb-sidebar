import type { PluginSidebarThread } from "@get-bb/plugin-sdk";

/** The states the attention chips count, most urgent first. */
export const ATTENTION_STATES = ["failed", "needs", "running", "unread"] as const;
export type AttentionState = (typeof ATTENTION_STATES)[number];
export type AttentionCounts = Readonly<Record<AttentionState, number>>;

const RUNNING_INDICATORS: ReadonlySet<string> = new Set([
  "runtime",
  "workflow",
  "goal",
  "plan-mode",
  "background-agent",
  "background-command",
]);

/**
 * The one state a thread counts toward, in bb's own precedence: a failure
 * outranks a raised hand, which outranks live work, which outranks an unread
 * reply. An idle, read thread counts toward none.
 */
export function threadAttentionState(thread: PluginSidebarThread): AttentionState | null {
  if (thread.status === "error" || thread.queuedWork === "failed" || thread.indicator === "unread-error") {
    return "failed";
  }
  if (thread.hasPendingInteraction || thread.indicator === "waiting-for-input") return "needs";
  if (
    thread.status === "starting" ||
    thread.status === "active" ||
    thread.status === "stopping" ||
    RUNNING_INDICATORS.has(thread.indicator)
  ) {
    return "running";
  }
  return thread.isUnread || thread.indicator === "unread-success" ? "unread" : null;
}

export function attentionCounts(threads: readonly PluginSidebarThread[]): AttentionCounts {
  const counts: Record<AttentionState, number> = { failed: 0, needs: 0, running: 0, unread: 0 };
  for (const thread of threads) {
    const state = threadAttentionState(thread);
    if (state) counts[state]++;
  }
  return counts;
}

/** With no chip chosen every thread matches; otherwise its state must be one of them. */
export function threadMatchesStates(thread: PluginSidebarThread, states: ReadonlySet<AttentionState>): boolean {
  if (states.size === 0) return true;
  const state = threadAttentionState(thread);
  return state !== null && states.has(state);
}

/** Archived threads bb still lists, most recently archived first. */
export function archivedThreads(threads: readonly PluginSidebarThread[]): PluginSidebarThread[] {
  return threads
    .filter((thread) => thread.isArchived && !thread.isHidden)
    .sort((left, right) => (right.archivedAt ?? 0) - (left.archivedAt ?? 0) || left.id.localeCompare(right.id));
}

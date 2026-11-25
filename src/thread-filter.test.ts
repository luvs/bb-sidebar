import { describe, expect, it } from "vitest";
import type { PluginSidebarThread } from "@get-bb/plugin-sdk";
import { idleSidebarThreadFields } from "./test-fixtures";
import { archivedThreads, attentionCounts, threadAttentionState, threadMatchesStates } from "./thread-filter";

function thread(overrides: Partial<PluginSidebarThread> = {}): PluginSidebarThread {
  return {
    ...idleSidebarThreadFields,
    id: "thr_1",
    projectId: "proj_1",
    title: "Fix login",
    titleFallback: null,
    hasPendingInteraction: false,
    indicator: "none",
    isUnread: false,
    isArchived: false,
    isHidden: false,
    archivedAt: null,
    environment: null,
    ...overrides,
  } as PluginSidebarThread;
}

describe("threadAttentionState", () => {
  it("ranks a failure over a question over live work over an unread reply", () => {
    expect(threadAttentionState(thread({ indicator: "unread-error", hasPendingInteraction: true }))).toBe("failed");
    expect(threadAttentionState(thread({ queuedWork: "failed" }))).toBe("failed");
    expect(threadAttentionState(thread({ hasPendingInteraction: true, isUnread: true }))).toBe("needs");
    expect(threadAttentionState(thread({ indicator: "waiting-for-input" }))).toBe("needs");
    expect(threadAttentionState(thread({ indicator: "runtime", isUnread: true }))).toBe("running");
    expect(threadAttentionState(thread({ indicator: "background-agent" }))).toBe("running");
    expect(threadAttentionState(thread({ isUnread: true }))).toBe("unread");
    expect(threadAttentionState(thread())).toBeNull();
  });

  it("counts each thread once, under its most urgent state", () => {
    expect(
      attentionCounts([
        thread({ indicator: "unread-error" }),
        thread({ hasPendingInteraction: true }),
        thread({ hasPendingInteraction: true }),
        thread({ indicator: "runtime" }),
        thread(),
      ]),
    ).toEqual({ failed: 1, needs: 2, running: 1, unread: 0 });
  });
});

it("matches every thread with no chip chosen, otherwise only the chosen states", () => {
  const asking = thread({ hasPendingInteraction: true });
  expect(threadMatchesStates(thread(), new Set())).toBe(true);
  expect(threadMatchesStates(asking, new Set(["needs"]))).toBe(true);
  expect(threadMatchesStates(asking, new Set(["failed", "needs"]))).toBe(true);
  expect(threadMatchesStates(asking, new Set(["unread"]))).toBe(false);
  expect(threadMatchesStates(thread(), new Set(["needs"]))).toBe(false);
});

it("lists visible archived threads, most recently archived first", () => {
  expect(
    archivedThreads([
      thread({ id: "old", isArchived: true, archivedAt: 1 }),
      thread({ id: "live" }),
      thread({ id: "hidden", isArchived: true, archivedAt: 5, isHidden: true }),
      thread({ id: "new", isArchived: true, archivedAt: 3 }),
    ]).map(({ id }) => id),
  ).toEqual(["new", "old"]);
});

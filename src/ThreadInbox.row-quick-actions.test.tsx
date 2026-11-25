// @vitest-environment jsdom
import { expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { renderSlot } from "./test-slot";
import {
  inbox,
  thread,
  defaultProviders,
  defaultSidebarSettings,
  listProps,
  render,
  loadInboxApp,
  SETTLED_NOTHING,
} from "./test-inbox";

vi.mock("sonner", async () => (await import("./test-inbox")).sonnerMock());

await loadInboxApp();

const project = { id: "proj_1", name: "bb", isPersonal: false, href: "", settingsHref: "" };

function rowOf(title: string) {
  return screen.getByRole("link", { name: title }).closest("li")!;
}

it("parks an idle thread from its row", async () => {
  const park = vi.fn(() => ({ ok: true, reclaim: SETTLED_NOTHING }));
  const rendered = renderSlot(inbox, listProps, {
    sidebarThreads: { status: "ready", threads: [thread({ id: "a", title: "Quiet" })], projects: [project] },
    providers: { status: "ready", providers: defaultProviders },
    rpc: { listLifecycle: () => ({ rows: [] }), park },
  });
  await screen.findByText("Quiet");
  fireEvent.click(within(rowOf("Quiet")).getByRole("button", { name: "Park thread" }));
  await waitFor(() => expect(park).toHaveBeenCalledTimes(1));
  expect(rendered.rpcCalls).toContainEqual({ method: "park", input: { threadId: "a" } });
  expect(rendered.navigateCalls).toEqual([]);
  expect(rendered.linkCalls).toEqual([]);
});

it("archives a thread from its row and releases its idle children", async () => {
  const rendered = render([
    thread({ id: "parent", title: "Parent" }),
    thread({ id: "idle-child", title: "Idle child", parentThreadId: "parent" }),
    thread({ id: "busy-child", title: "Busy child", parentThreadId: "parent", indicator: "runtime" }),
  ]);
  fireEvent.click(within(rowOf("Parent")).getByRole("button", { name: "Archive thread" }));
  expect(rendered.threadActionCalls).toEqual([{ key: "bb--core/archive", threadId: "parent" }]);
  await waitFor(() =>
    expect(rendered.rpcCalls).toContainEqual({
      method: "releaseRuntimes",
      input: { threadIds: ["parent", "idle-child"] },
    }),
  );
  expect(rendered.linkCalls).toEqual([]);
});

it("offers neither action while the thread is working", async () => {
  render([thread({ id: "a", title: "Busy", indicator: "runtime", indicatorLabel: "Working" })]);
  const row = rowOf("Busy");
  expect(within(row).queryByRole("button", { name: "Park thread" })).toBeNull();
  expect(within(row).queryByRole("button", { name: "Archive thread" })).toBeNull();
});

it("offers Archive but not Park on a parked row, and both on a settled row", async () => {
  const rendered = renderSlot(inbox, listProps, {
    sidebarThreads: {
      status: "ready",
      threads: [thread({ id: "p", title: "Parked work" }), thread({ id: "s", title: "Settled work" })],
      projects: [project],
    },
    providers: { status: "ready", providers: defaultProviders },
    rpc: {
      listLifecycle: () => ({
        rows: [
          { threadId: "p", parkedAt: 100, settledAt: null, snoozedUntil: null, snoozedAt: null },
          { threadId: "s", settledAt: 200, snoozedUntil: null, snoozedAt: null },
        ],
      }),
    },
  });
  const parked = await screen.findByRole("region", { name: "Parked" });
  const settled = await screen.findByRole("region", { name: "Settled" });
  for (const region of [parked, settled]) {
    const collapsed = within(region).queryByRole("button", { expanded: false });
    if (collapsed) fireEvent.click(collapsed);
  }
  await within(parked).findByText("Parked work");
  await within(settled).findByText("Settled work");
  expect(within(parked).queryByRole("button", { name: "Park thread" })).toBeNull();
  expect(within(parked).getByRole("button", { name: "Resume thread" })).toBeDefined();
  expect(within(settled).getByRole("button", { name: "Park thread" })).toBeDefined();
  fireEvent.click(within(parked).getByRole("button", { name: "Archive thread" }));
  expect(rendered.threadActionCalls).toEqual([{ key: "bb--core/archive", threadId: "p" }]);
});

it("offers Park and Archive on compact cards too", async () => {
  const park = vi.fn(() => ({ ok: true, reclaim: SETTLED_NOTHING }));
  const rendered = renderSlot(inbox, listProps, {
    sidebarThreads: {
      status: "ready",
      threads: [
        thread({ id: "a", title: "Quiet", updatedAt: Date.now() }),
        thread({ id: "w", title: "Busy", indicator: "runtime", indicatorLabel: "Working", updatedAt: Date.now() }),
      ],
      projects: [project],
    },
    providers: { status: "ready", providers: defaultProviders },
    rpc: {
      getSidebarSettings: () => ({ ...defaultSidebarSettings, threadDisplay: "compact-all" }),
      listLifecycle: () => ({ rows: [] }),
      park,
    },
  });
  await waitFor(() => expect(rowOf("Quiet").querySelector(".h-8")).not.toBeNull());
  expect(within(rowOf("Busy")).queryByRole("button", { name: "Archive thread" })).toBeNull();
  fireEvent.click(within(rowOf("Quiet")).getByRole("button", { name: "Archive thread" }));
  expect(rendered.threadActionCalls).toEqual([{ key: "bb--core/archive", threadId: "a" }]);
  fireEvent.click(within(rowOf("Quiet")).getByRole("button", { name: "Park thread" }));
  await waitFor(() => expect(park).toHaveBeenCalledTimes(1));
});

it("deletes a thread from its row only after the named confirmation", async () => {
  const rendered = renderSlot(inbox, listProps, {
    sidebarThreads: { status: "ready", threads: [thread({ id: "a", title: "Delete me" })], projects: [project] },
    providers: { status: "ready", providers: defaultProviders },
    rpc: { listLifecycle: () => ({ rows: [] }), deleteThread: () => ({ ok: true }) },
  });
  await screen.findByText("Delete me");
  const button = within(rowOf("Delete me")).getByRole("button", { name: "Delete thread" });
  expect(button.querySelector('[data-icon="Delete"]')).not.toBeNull();
  fireEvent.click(button);
  const dialog = await screen.findByRole("dialog", { name: "Delete thread?" });
  expect(within(dialog).getByText("Delete me")).toBeTruthy();
  expect(rendered.rpcCalls.filter((call) => call.method === "deleteThread")).toEqual([]);
  expect(rendered.linkCalls).toEqual([]);
  fireEvent.click(within(dialog).getByRole("button", { name: "Delete thread" }));
  await waitFor(() =>
    expect(rendered.rpcCalls).toContainEqual({
      method: "deleteThread",
      input: { threadId: "a", childThreadsConfirmed: true },
    }),
  );
  await waitFor(() => expect(screen.queryByRole("dialog", { name: "Delete thread?" })).toBeNull());
});

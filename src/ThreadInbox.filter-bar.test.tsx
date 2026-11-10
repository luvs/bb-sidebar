// @vitest-environment jsdom
import { expect, it } from "vitest";
import { fireEvent, screen, within } from "@testing-library/react";
import { loadInboxApp, render, rowLinks, thread } from "./test-inbox";
import { STORAGE_KEYS } from "./lib/storage-keys";

await loadInboxApp();

const threads = [
  thread({ id: "thr_login", title: "Fix login" }),
  thread({ id: "thr_deploy", title: "Deploy notes", hasPendingInteraction: true }),
  thread({ id: "thr_error", title: "Broken build", indicator: "unread-error" }),
  thread({ id: "thr_old", title: "Old login spike", isArchived: true, archivedAt: 50 }),
];

const titles = () => rowLinks().map((link) => link.getAttribute("aria-label"));

it("always shows one chip per attention state, and filters by the chosen ones", () => {
  render(threads);
  const chips = within(screen.getByRole("group", { name: "Threads that need attention" })).getAllByRole("button");
  expect(chips.map((chip) => chip.getAttribute("aria-label"))).toEqual([
    "Failed: 1",
    "Needs you: 1",
    "Running: 0",
    "Unread: 0",
  ]);
  expect(chips[2]!.getAttribute("aria-disabled")).toBe("true");
  fireEvent.click(chips[2]!);
  expect(titles()).toHaveLength(3);

  fireEvent.click(screen.getByRole("button", { name: "Needs you: 1" }));
  expect(titles()).toEqual([expect.stringContaining("Deploy notes")]);
  fireEvent.click(screen.getByRole("button", { name: "Failed: 1" }));
  expect(titles()).toHaveLength(2);
  fireEvent.click(screen.getByRole("button", { name: "Failed: 1" }));
  fireEvent.click(screen.getByRole("button", { name: "Needs you: 1" }));
  expect(titles()).toHaveLength(3);
});

it("keeps archived threads out of the list until the toggle shows them, and remembers the toggle", () => {
  const rendered = render(threads);
  expect(screen.queryByRole("region", { name: "Archived" })).toBeNull();
  expect(screen.queryByText("Old login spike")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Show archived threads" }));
  const shelf = screen.getByRole("region", { name: "Archived" });
  expect(within(shelf).getByText("Old login spike")).toBeDefined();
  expect(localStorage.getItem(STORAGE_KEYS.showArchived.key)).toBe("true");

  rendered.lifecycle.unmount();
  render(threads);
  expect(screen.getByRole("button", { name: "Hide archived threads" }).getAttribute("aria-pressed")).toBe("true");
  fireEvent.click(screen.getByRole("button", { name: "Hide archived threads" }));
  expect(screen.queryByRole("region", { name: "Archived" })).toBeNull();
});

it("says so when the archive is empty", () => {
  render(threads.filter((candidate) => !candidate.isArchived));
  fireEvent.click(screen.getByRole("button", { name: "Show archived threads" }));
  expect(within(screen.getByRole("region", { name: "Archived" })).getByText("No archived threads.")).toBeDefined();
});

it("opens a new thread with the translate prompt typed in", () => {
  const rendered = render(threads);
  fireEvent.click(screen.getByRole("button", { name: "Translate in a new thread" }));
  expect(rendered.navigateCalls).toContainEqual({
    method: "toCompose",
    options: { initialPrompt: "переведи\n\n", focusPrompt: true },
  });
});

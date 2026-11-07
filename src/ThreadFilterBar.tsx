import type { PluginSidebarThreadIndicator } from "@get-bb/plugin-sdk";
import { Icon } from "./components/Icon";
import { Tooltip } from "./components/Tooltip";
import { cn } from "./lib/utils";
import { StatusGlyph } from "./StatusGlyph";
import { statusToneClass } from "./StatusSlot";
import { ATTENTION_STATES, type AttentionCounts, type AttentionState } from "./thread-filter";
import type { ThreadFilterControls } from "./useThreadFilter";

// Each chip borrows the row glyph for its state, so the chips and the rows
// they filter speak the same vocabulary.
const CHIP_GLYPH: Readonly<Record<AttentionState, PluginSidebarThreadIndicator>> = {
  failed: "unread-error",
  needs: "waiting-for-input",
  running: "runtime",
  unread: "unread-success",
};
const CHIP_LABEL: Readonly<Record<AttentionState, string>> = {
  failed: "Failed",
  needs: "Needs you",
  running: "Running",
  unread: "Unread",
};
const CHIP_NOUN: Readonly<Record<AttentionState, string>> = {
  failed: "failed threads",
  needs: "threads that need you",
  running: "running threads",
  unread: "unread threads",
};

/**
 * One chip per attention state, always in the same place so the counts can be
 * read at a glance. Clicking a chip shows only those threads; chips combine.
 */
export function AttentionChips({ controls, counts }: { controls: ThreadFilterControls; counts: AttentionCounts }) {
  const { states, toggleState } = controls;
  return (
    <div role="group" aria-label="Threads that need attention" className="flex flex-wrap gap-1 pt-1">
      {ATTENTION_STATES.map((state) => {
        const active = states.has(state);
        const empty = counts[state] === 0 && !active;
        const hint = active
          ? `Stop filtering by ${CHIP_NOUN[state]}`
          : empty
            ? `No ${CHIP_NOUN[state]}`
            : `${states.size > 0 ? "Also show" : "Show only"} ${CHIP_NOUN[state]} (${counts[state]})`;
        return (
          <Tooltip key={state} label={hint}>
            <button
              type="button"
              aria-label={`${CHIP_LABEL[state]}: ${counts[state]}`}
              aria-pressed={active}
              aria-disabled={empty || undefined}
              onClick={() => {
                if (!empty) toggleState(state);
              }}
              className={cn(
                "flex h-6 items-center gap-1 rounded-full border px-2 text-2xs font-medium outline-none focus-visible:ring-1 focus-visible:ring-ring",
                active ? "border-ring/60 bg-sidebar-accent text-foreground" : "border-border text-foreground/80",
                empty ? "cursor-default text-muted-foreground" : "hover:bg-sidebar-accent",
              )}
            >
              {state === "running" ? (
                // The row glyph spins; a count beside it should hold still.
                <Icon
                  name="Loading"
                  aria-hidden
                  className={cn("size-3 shrink-0", statusToneClass("runtime"), empty && "opacity-60")}
                />
              ) : (
                <StatusGlyph
                  indicator={CHIP_GLYPH[state]}
                  label={null}
                  className={cn("size-3", empty && "opacity-60")}
                />
              )}
              {counts[state]}
            </button>
          </Tooltip>
        );
      })}
    </div>
  );
}

/** Shows or hides the Archived shelf; sits beside the project picker. */
export function ArchiveToggle({ controls }: { controls: ThreadFilterControls }) {
  const { showArchived, setShowArchived } = controls;
  const label = showArchived ? "Hide archived threads" : "Show archived threads";
  return (
    <Tooltip label={label}>
      <button
        type="button"
        aria-label={label}
        aria-pressed={showArchived}
        onClick={() => setShowArchived(!showArchived)}
        className={cn(
          "grid size-7 shrink-0 place-items-center rounded-md outline-none hover:bg-sidebar-accent focus-visible:ring-1 focus-visible:ring-ring",
          showArchived ? "bg-sidebar-accent text-foreground" : "text-muted-foreground",
        )}
      >
        <Icon name="Archive" aria-hidden className="size-4" />
      </button>
    </Tooltip>
  );
}

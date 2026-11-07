import { useState, type ReactNode } from "react";
import type { PluginSidebarThread } from "@get-bb/plugin-sdk/app";
import { Icon, type IconName } from "./components/Icon";
import { Tooltip } from "./components/Tooltip";
import { cn } from "./lib/utils";
import { useRowQuickActions } from "./RowContextMenu";
import { useArchiveThread } from "./useArchiveThread";
import { DeleteThreadDialog } from "./DeleteThreadDialog";

/**
 * The row menu's Park, Archive, and Delete as hover buttons. They read the
 * enclosing row menu, so a row never offers what its menu would not. Delete
 * opens the same named confirmation as the menu.
 */
export function RowQuickActionButtons({ thread }: { thread: PluginSidebarThread }) {
  const actions = useRowQuickActions();
  const archive = useArchiveThread(thread);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  if (!actions) return null;
  return (
    <>
      {actions.onPark ? <QuickActionButton icon="Car" label="Park thread" onActivate={actions.onPark} /> : null}
      {actions.canArchive ? <QuickActionButton icon="Archive" label="Archive thread" onActivate={archive} /> : null}
      <QuickActionButton icon="Delete" label="Delete thread" destructive onActivate={() => setConfirmingDelete(true)} />
      {confirmingDelete ? <DeleteThreadDialog thread={thread} open onOpenChange={setConfirmingDelete} /> : null}
    </>
  );
}

/** A compact card trades its status for the quick actions while hovered or focused. */
export function CompactQuickActions({ thread, children }: { thread: PluginSidebarThread; children: ReactNode }) {
  const actions = useRowQuickActions();
  if (!actions?.onPark && !actions?.canArchive) return children;
  return (
    <span className="group/quick relative flex items-center justify-end has-[:focus-visible]:min-w-16 [@media(hover:hover)]:group-hover/card:min-w-16">
      <span className="flex items-center transition-opacity duration-150 ease-out group-has-[:focus-visible]/quick:opacity-0 [@media(hover:hover)]:group-hover/card:opacity-0 motion-reduce:transition-none">
        {children}
      </span>
      <span className="absolute inset-y-0 right-0 flex items-center gap-0.5 opacity-0 transition-opacity duration-150 ease-out has-[:focus-visible]:opacity-100 group-hover/card:opacity-100 [@media(hover:none)]:hidden motion-reduce:transition-none">
        <RowQuickActionButtons thread={thread} />
      </span>
    </span>
  );
}

function QuickActionButton({
  icon,
  label,
  destructive = false,
  onActivate,
}: {
  icon: IconName;
  label: string;
  destructive?: boolean;
  onActivate: () => void;
}) {
  return (
    <Tooltip label={label}>
      <button
        type="button"
        aria-label={label}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onActivate();
        }}
        className={cn(
          "pointer-events-auto flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring motion-reduce:transition-none",
          destructive
            ? "hover:text-destructive-text focus-visible:text-destructive-text"
            : "hover:text-foreground focus-visible:text-foreground",
        )}
      >
        <Icon name={icon} aria-hidden className="size-3.5" />
      </button>
    </Tooltip>
  );
}

/** Settles the thread; the sweep and stars live in `settle-button.css`. */
export function ParkButton({
  label,
  settling,
  onActivate,
}: {
  label: string;
  settling: boolean;
  onActivate: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      data-settling={settling ? "" : undefined}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onActivate();
      }}
      className={cn(
        "bb-sidebar-settle relative flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground",
        "transition-colors duration-200 ease-out hover:text-[color:var(--bb-sidebar-settle-active)]",
        "focus-visible:text-[color:var(--bb-sidebar-settle-active)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50",
        "motion-reduce:transition-none",
        settling && "text-[color:var(--bb-sidebar-settle-active)]",
      )}
    >
      {/* Move only the artwork so hovering an edge cannot move the hit area. */}
      <span
        aria-hidden="true"
        className="bb-sidebar-settle-art pointer-events-none relative flex size-full items-center justify-center rounded-[inherit]"
      >
        <Icon name="Check" aria-hidden className="bb-sidebar-settle-check size-3.5" />
        <span className="bb-sidebar-settle-stars">
          {[0, 1, 2].map((star) => (
            <span key={star} className="bb-sidebar-settle-star" />
          ))}
        </span>
      </span>
    </button>
  );
}

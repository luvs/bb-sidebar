import { useState } from "react";
import type { PluginSidebarThread } from "@get-bb/plugin-sdk/app";
import { CompactRow } from "./CompactRow";
import { CollapsibleShelf, SETTLED_PAGE_SIZE } from "./ThreadInboxShelves";
import type { InboxThreads } from "./useThreadFilter";
import { useInboxActions, useInboxActivity, useInboxEnvironment } from "./InboxContext";
import { useProjectColor } from "./ProjectColors";
import { projectIconUrl } from "./project-icons";
import { threadDisplayTitle } from "./inbox";
import { relativeTimeLabel } from "./relative-time";

/**
 * Archived threads, shown only while the filter bar's toggle is on. Rows open
 * the thread and nothing else: archiving and restoring stay bb's own actions.
 * bb pages its archive, so "Load more" first shows what is loaded, then asks
 * bb for the next page.
 */
export function ArchivedShelf({
  threads,
  page,
  forceExpanded,
}: {
  threads: readonly PluginSidebarThread[];
  page: InboxThreads["experimental_archived"] | undefined;
  forceExpanded: boolean;
}) {
  const [expanded, setExpanded] = useState(true);
  const [limit, setLimit] = useState(SETTLED_PAGE_SIZE);
  const open = expanded || forceExpanded;
  const visible = open ? threads.slice(0, limit) : [];
  const canLoadMore = threads.length > limit || (page?.hasNextPage ?? false);
  const emptyText =
    page?.status === "loading"
      ? "Loading archived threads…"
      : page?.status === "error"
        ? "Could not load archived threads."
        : "No archived threads.";
  return (
    <CollapsibleShelf
      label="Archived"
      icon="Archive"
      count={threads.length}
      expanded={open}
      onToggle={() => setExpanded((current) => !current)}
    >
      <ul className="flex flex-col gap-px">
        {visible.map((thread) => (
          <ArchivedRow key={thread.id} thread={thread} />
        ))}
      </ul>
      {open && threads.length === 0 ? <p className="px-2.5 py-1 text-2xs text-muted-foreground">{emptyText}</p> : null}
      {open && canLoadMore ? (
        <button
          type="button"
          disabled={page?.isFetchingNextPage}
          onClick={() => {
            if (threads.length <= limit) void page?.fetchNextPage();
            setLimit((current) => current + SETTLED_PAGE_SIZE);
          }}
          className="ml-2.5 mt-1 rounded px-1.5 py-1 text-2xs font-medium text-muted-foreground hover:bg-sidebar-accent hover:text-foreground disabled:opacity-50"
        >
          {page?.isFetchingNextPage ? "Loading…" : "Load more"}
        </button>
      ) : null}
    </CollapsibleShelf>
  );
}

function ArchivedRow({ thread }: { thread: PluginSidebarThread }) {
  const { projectNameById, projectIconRevision } = useInboxEnvironment();
  const { activeThreadId, now } = useInboxActivity();
  const { onNavigate } = useInboxActions();
  const projectColor = useProjectColor(thread.projectId);
  const projectName = projectNameById.get(thread.projectId) ?? null;
  const title = threadDisplayTitle(thread);
  return (
    <li className="list-none">
      <CompactRow
        thread={thread}
        tone="muted"
        projectName={projectName}
        projectIconUrl={projectIconUrl(thread.projectId, projectIconRevision)}
        projectColor={projectColor}
        label={projectName ? `${projectName} · ${title} (archived)` : `${title} (archived)`}
        isActive={thread.id === activeThreadId}
        isRenaming={false}
        onRenamingChange={() => {}}
        onOpen={onNavigate}
        trailing={
          thread.archivedAt ? (
            <span className="pointer-events-none shrink-0 tabular-nums text-2xs text-muted-foreground/60">
              {relativeTimeLabel(thread.archivedAt, now)}
            </span>
          ) : null
        }
      />
    </li>
  );
}

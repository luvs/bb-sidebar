import { useBbNavigate } from "@get-bb/plugin-sdk/app";
import { Icon } from "./components/Icon";
import { Tooltip } from "./components/Tooltip";

const TRANSLATE_PROMPT = "переведи\n\n";

/** Opens bb's new-thread screen with the translate prompt already typed. */
export function TranslateButton() {
  const navigate = useBbNavigate();
  const label = "Translate in a new thread";
  return (
    <Tooltip label={label}>
      <button
        type="button"
        aria-label={label}
        onClick={() => navigate.toCompose({ initialPrompt: TRANSLATE_PROMPT, focusPrompt: true })}
        className="grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground outline-none hover:bg-sidebar-accent focus-visible:ring-1 focus-visible:ring-ring"
      >
        <Icon name="Translate" aria-hidden className="size-4" />
      </button>
    </Tooltip>
  );
}

export type BlockState = "idle" | "selected" | "success" | "failure";

const STATE_CLASSES: Record<BlockState, string> = {
  idle: "border-black/15 dark:border-white/20",
  selected: "border-blue-500 bg-blue-50 dark:bg-blue-950",
  success:
    "border-green-600 bg-green-50 text-green-900 dark:bg-green-950 dark:text-green-100",
  failure:
    "border-red-600 bg-red-50 text-red-900 dark:bg-red-950 dark:text-red-100",
};

export function Block({
  text,
  state,
  onClick,
}: {
  text: string;
  state: BlockState;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={state === "success"}
      className={`rounded border p-3 text-left text-sm transition-colors disabled:cursor-default ${STATE_CLASSES[state]}`}
    >
      {text}
    </button>
  );
}

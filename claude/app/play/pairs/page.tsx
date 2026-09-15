import { startPairsGame } from "@/app/actions/games";
import { PairsGame } from "@/components/games/pairs/PairsGame";
import { QuitButton } from "@/components/games/common/QuitButton";
import { PAIRS_ROUND_SIZE } from "@/lib/games/constants";

export default async function PlayPairsPage() {
  const { gameSessionId, pairs } = await startPairsGame();

  if (!gameSessionId || pairs.length < PAIRS_ROUND_SIZE) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
        <p className="max-w-sm text-sm text-zinc-600 dark:text-zinc-400">
          You need at least {PAIRS_ROUND_SIZE} extracted pairs across your
          resources to play. Add more resources or content, then try again.
        </p>
        <QuitButton />
      </div>
    );
  }

  return <PairsGame initialPairs={pairs} gameSessionId={gameSessionId} />;
}

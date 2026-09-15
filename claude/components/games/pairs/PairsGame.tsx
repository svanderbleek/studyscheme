"use client";

import { useEffect, useReducer } from "react";
import { MatchingBoard, type RoundBlock } from "@/components/games/pairs/MatchingBoard";
import { QuitButton } from "@/components/games/common/QuitButton";
import type { BlockState } from "@/components/games/common/Block";
import { PAIRS_ROUND_SIZE } from "@/lib/games/constants";
import { shuffle } from "@/lib/games/shuffle";
import { recordPairResult } from "@/app/actions/games";

export interface PairData {
  id: string;
  sentenceA: string;
  sentenceB: string;
}

interface LastResult {
  pairId: string;
  correct: boolean;
}

interface State {
  pool: PairData[];
  roundBlocks: RoundBlock[];
  blockStates: Record<string, BlockState>;
  selectedBlockId: string | null;
  matchedCount: number;
  correctCount: number;
  incorrectCount: number;
  lastResult: LastResult | null;
  status: "playing" | "gameover";
}

type Action =
  | { type: "CLICK"; blockId: string }
  | { type: "SHUFFLE_INITIAL_ROUND"; pairs: PairData[] };

function buildRound(
  pool: PairData[],
): { round: RoundBlock[]; remainingPool: PairData[] } | null {
  if (pool.length < PAIRS_ROUND_SIZE) return null;
  const shuffledPool = shuffle(pool);
  const roundPairs = shuffledPool.slice(0, PAIRS_ROUND_SIZE);
  const remainingPool = shuffledPool.slice(PAIRS_ROUND_SIZE);
  const round = shuffle(
    roundPairs.flatMap((pair) => [
      { id: `${pair.id}:A`, pairId: pair.id, text: pair.sentenceA },
      { id: `${pair.id}:B`, pairId: pair.id, text: pair.sentenceB },
    ]),
  );
  return { round, remainingPool };
}

function roundState(
  round: RoundBlock[],
  remainingPool: PairData[],
  carry: { correctCount: number; incorrectCount: number },
): State {
  return {
    pool: remainingPool,
    roundBlocks: round,
    blockStates: Object.fromEntries(round.map((b) => [b.id, "idle"])),
    selectedBlockId: null,
    matchedCount: 0,
    correctCount: carry.correctCount,
    incorrectCount: carry.incorrectCount,
    lastResult: null,
    status: "playing",
  };
}

function initState(initialPairs: PairData[]): State {
  // Deterministic (unshuffled) first round so server and client render the
  // same markup — the real shuffle happens once on mount (SHUFFLE_INITIAL_ROUND).
  if (initialPairs.length < PAIRS_ROUND_SIZE) {
    return {
      pool: initialPairs,
      roundBlocks: [],
      blockStates: {},
      selectedBlockId: null,
      matchedCount: 0,
      correctCount: 0,
      incorrectCount: 0,
      lastResult: null,
      status: "gameover",
    };
  }
  const roundPairs = initialPairs.slice(0, PAIRS_ROUND_SIZE);
  const remainingPool = initialPairs.slice(PAIRS_ROUND_SIZE);
  const round = roundPairs.flatMap((pair) => [
    { id: `${pair.id}:A`, pairId: pair.id, text: pair.sentenceA },
    { id: `${pair.id}:B`, pairId: pair.id, text: pair.sentenceB },
  ]);
  return roundState(round, remainingPool, { correctCount: 0, incorrectCount: 0 });
}

function reducer(state: State, action: Action): State {
  if (action.type === "SHUFFLE_INITIAL_ROUND") {
    if (state.selectedBlockId !== null || state.matchedCount > 0) return state;
    const built = buildRound(action.pairs);
    return built ? roundState(built.round, built.remainingPool, state) : state;
  }

  if (state.status !== "playing") return state;

  const { blockId } = action;

  // Any click first clears lingering failure highlights.
  let blockStates = state.blockStates;
  if (Object.values(blockStates).some((s) => s === "failure")) {
    blockStates = Object.fromEntries(
      Object.entries(blockStates).map(([id, s]) => [
        id,
        s === "failure" ? "idle" : s,
      ]),
    );
  }

  if (blockStates[blockId] === "success") {
    return { ...state, blockStates };
  }

  if (state.selectedBlockId === null) {
    return {
      ...state,
      blockStates: { ...blockStates, [blockId]: "selected" },
      selectedBlockId: blockId,
      lastResult: null,
    };
  }

  if (state.selectedBlockId === blockId) {
    return {
      ...state,
      blockStates: { ...blockStates, [blockId]: "idle" },
      selectedBlockId: null,
      lastResult: null,
    };
  }

  const selectedBlock = state.roundBlocks.find(
    (b) => b.id === state.selectedBlockId,
  )!;
  const clickedBlock = state.roundBlocks.find((b) => b.id === blockId)!;

  if (selectedBlock.pairId === clickedBlock.pairId) {
    const matchedCount = state.matchedCount + 1;
    const correctCount = state.correctCount + 1;
    const lastResult: LastResult = { pairId: selectedBlock.pairId, correct: true };
    const nextBlockStates: Record<string, BlockState> = {
      ...blockStates,
      [selectedBlock.id]: "success",
      [clickedBlock.id]: "success",
    };

    if (matchedCount === PAIRS_ROUND_SIZE) {
      const built = buildRound(state.pool);
      if (!built) {
        return {
          ...state,
          blockStates: nextBlockStates,
          selectedBlockId: null,
          matchedCount,
          correctCount,
          lastResult,
          status: "gameover",
        };
      }
      return {
        ...roundState(built.round, built.remainingPool, { correctCount, incorrectCount: state.incorrectCount }),
        lastResult,
      };
    }

    return {
      ...state,
      blockStates: nextBlockStates,
      selectedBlockId: null,
      matchedCount,
      correctCount,
      lastResult,
    };
  }

  return {
    ...state,
    blockStates: {
      ...blockStates,
      [selectedBlock.id]: "failure",
      [clickedBlock.id]: "failure",
    },
    selectedBlockId: null,
    incorrectCount: state.incorrectCount + 1,
    lastResult: { pairId: selectedBlock.pairId, correct: false },
  };
}

export function PairsGame({
  initialPairs,
  gameSessionId,
}: {
  initialPairs: PairData[];
  gameSessionId: string;
}) {
  const [state, dispatch] = useReducer(reducer, initialPairs, initState);

  useEffect(() => {
    dispatch({ type: "SHUFFLE_INITIAL_ROUND", pairs: initialPairs });
    // Only ever shuffle the round we mounted with.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!state.lastResult) return;
    void recordPairResult(
      gameSessionId,
      state.lastResult.pairId,
      state.lastResult.correct,
    );
  }, [state.lastResult, gameSessionId]);

  if (state.status === "gameover") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
        <p className="text-lg font-semibold">
          Game over — no more pairs left for another round.
        </p>
        <QuitButton />
      </div>
    );
  }

  const totalAnswered = state.correctCount + state.incorrectCount;
  const percentCorrect =
    totalAnswered > 0
      ? Math.round((state.correctCount / totalAnswered) * 100)
      : null;

  return (
    <div className="flex flex-1 flex-col items-center px-6 py-12">
      <div className="mb-4 flex w-full max-w-2xl items-center justify-between">
        <h1 className="text-xl font-semibold">Pairs</h1>
        <div className="flex items-center gap-4">
          {percentCorrect !== null && (
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              {percentCorrect}% correct ({state.correctCount}/{totalAnswered})
            </span>
          )}
          <QuitButton />
        </div>
      </div>
      <MatchingBoard
        blocks={state.roundBlocks}
        blockStates={state.blockStates}
        onBlockClick={(blockId) => dispatch({ type: "CLICK", blockId })}
      />
    </div>
  );
}

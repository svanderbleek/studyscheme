import { Block, type BlockState } from "@/components/games/common/Block";

export interface RoundBlock {
  id: string;
  pairId: string;
  text: string;
}

export function MatchingBoard({
  blocks,
  blockStates,
  onBlockClick,
}: {
  blocks: RoundBlock[];
  blockStates: Record<string, BlockState>;
  onBlockClick: (blockId: string) => void;
}) {
  return (
    <div className="grid w-full max-w-2xl grid-cols-2 gap-3">
      {blocks.map((block) => (
        <Block
          key={block.id}
          text={block.text}
          state={blockStates[block.id]}
          onClick={() => onBlockClick(block.id)}
        />
      ))}
    </div>
  );
}

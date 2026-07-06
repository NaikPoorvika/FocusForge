import { motion } from "framer-motion";
import { Coins, Pencil, Trash2, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Reward } from "@/lib/store";

export function RewardCard({
  reward,
  availableXp,
  onRedeem,
  onEdit,
  onArchive,
  onDelete,
}: {
  reward: Reward;
  availableXp: number;
  onRedeem: () => void;
  onEdit: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  const affordable = availableXp >= reward.cost;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      className="card-hover flex flex-col rounded-2xl border border-border bg-card p-5 shadow-sm"
    >
      <div className="flex items-start justify-between gap-2">
        <div className={`grid h-11 w-11 place-items-center rounded-xl text-xl ${reward.color}`}>
          {reward.icon}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="rounded-lg p-1 text-muted-foreground hover:bg-muted" aria-label="More">
              <Pencil className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>
              <Pencil className="mr-2 h-4 w-4" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onArchive}>
              <Archive className="mr-2 h-4 w-4" /> Archive
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <h4 className="mt-3 text-base font-semibold leading-snug">{reward.title}</h4>
      {reward.description && (
        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{reward.description}</p>
      )}
      {reward.category && (
        <span className="mt-2 inline-flex w-fit rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {reward.category}
        </span>
      )}
      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 text-sm font-bold text-primary">
          <Coins className="h-4 w-4" />
          {reward.cost} XP
        </div>
        <Button
          size="sm"
          disabled={!affordable}
          onClick={onRedeem}
          title={affordable ? "Redeem" : `Need ${reward.cost - availableXp} more XP`}
        >
          {affordable ? "Redeem" : "Locked"}
        </Button>
      </div>
    </motion.div>
  );
}

import { motion } from "framer-motion";
import { Plus } from "lucide-react";

export function QuickAddFab({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      aria-label="Add task"
      className="fixed bottom-24 right-5 z-40 grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-xl shadow-primary/30 transition-shadow hover:shadow-2xl md:bottom-8 md:right-8 md:h-16 md:w-16"
    >
      <Plus className="h-6 w-6 md:h-7 md:w-7" strokeWidth={2.5} />
    </motion.button>
  );
}

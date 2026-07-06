import { useState } from "react";
import { motion } from "framer-motion";
import {
  Check,
  Clock,
  Copy,
  Archive,
  ArchiveRestore,
  MoreHorizontal,
  Pencil,
  Trash2,
  GripVertical,
  Repeat,
  CalendarClock,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  categoryStyle,
  formatEstimated,
  priorityMeta,
} from "@/lib/task-constants";
import {
  deleteTask,
  duplicateTask,
  toggleTaskComplete,
  updateTask,
  type Task,
} from "@/lib/store";
import { toast } from "sonner";

interface Props {
  task: Task;
  onEdit: (t: Task) => void;
  onCompleted?: (result: ReturnType<typeof toggleTaskComplete>) => void;
  dragHandlers?: {
    draggable: boolean;
    onDragStart: (e: React.DragEvent) => void;
    onDragOver: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
    onDragEnd: (e: React.DragEvent) => void;
  };
  isDragging?: boolean;
}

export function TaskCard({ task, onEdit, onCompleted, dragHandlers, isDragging }: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const prio = priorityMeta(task.priority);

  const handleToggle = () => {
    const r = toggleTaskComplete(task.id);
    onCompleted?.(r);
    if (r.justCompleted && !r.allDone) {
      toast.success(`🎉 Great job! Task completed! +${r.xp} XP`);
    }
  };

  const doDelete = () => {
    deleteTask(task.id);
    toast.success("Task deleted");
    setConfirmDelete(false);
  };

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: isDragging ? 0.4 : 1, y: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ layout: { duration: 0.2 } }}
      >
      <div
        className="group relative flex items-start gap-3 rounded-3xl border border-border/60 bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10"
        {...(dragHandlers ?? {})}
      >
        {dragHandlers && (
          <div className="mt-1 cursor-grab text-muted-foreground/40 opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing">
            <GripVertical className="h-4 w-4" />
          </div>
        )}

        <motion.button
          onClick={handleToggle}
          whileTap={{ scale: 0.88 }}
          aria-label={task.completed ? "Mark incomplete" : "Mark complete"}
          className={`relative mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 transition-all ${
            task.completed
              ? "border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/30"
              : "border-primary/30 bg-background hover:border-primary hover:bg-primary/5"
          }`}
        >
          {task.completed && (
            <motion.span
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 20 }}
            >
              <Check className="h-3.5 w-3.5" strokeWidth={3} />
            </motion.span>
          )}
        </motion.button>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p
              className={`text-sm font-semibold leading-snug transition-all ${
                task.completed ? "text-muted-foreground line-through" : "text-foreground"
              }`}
            >
              {task.title}
            </p>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="rounded-md p-1 text-muted-foreground hover:bg-muted"
                  aria-label="More actions"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(task)}>
                  <Pencil className="mr-2 h-4 w-4" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    duplicateTask(task.id);
                    toast.success("Duplicated");
                  }}
                >
                  <Copy className="mr-2 h-4 w-4" /> Duplicate
                </DropdownMenuItem>
                {task.archived ? (
                  <DropdownMenuItem
                    onClick={() => {
                      updateTask(task.id, { archived: false });
                      toast.success("Restored");
                    }}
                  >
                    <ArchiveRestore className="mr-2 h-4 w-4" /> Restore
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    onClick={() => {
                      updateTask(task.id, { archived: true });
                      toast.success("Archived");
                    }}
                  >
                    <Archive className="mr-2 h-4 w-4" /> Archive
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {task.description && (
            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
              {task.description}
            </p>
          )}

          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <span
              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${categoryStyle(task.category)}`}
            >
              {task.category}
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${prio.badge}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${prio.dot}`} />
              {prio.label}
            </span>
            {task.estimatedMinutes ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                <Clock className="h-3 w-3" />
                {formatEstimated(task.estimatedMinutes)}
              </span>
            ) : null}
            {task.dueTime && (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                <CalendarClock className="h-3 w-3" />
                {task.dueTime}
              </span>
            )}
            {(task.recurrence || task.recurrenceParentId) && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                <Repeat className="h-3 w-3" />
                Recurring
              </span>
            )}
            {task.tags.map((t) => (
              <span
                key={t}
                className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
              >
                #{t}
              </span>
            ))}
          </div>

          {task.notes && (
            <p className="mt-2 line-clamp-2 rounded-lg bg-muted/50 px-2.5 py-1.5 text-xs text-muted-foreground">
              📝 {task.notes}
            </p>
          )}
        </div>
      </div>
      </motion.div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this task?</AlertDialogTitle>
            <AlertDialogDescription>
              This can't be undone. The task "{task.title}" will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={doDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

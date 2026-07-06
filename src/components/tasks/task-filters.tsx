import { Search, SlidersHorizontal, ArrowDownUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DEFAULT_CATEGORIES } from "@/lib/task-constants";
import { useAppState } from "@/lib/store";

export type StatusFilter =
  | "all"
  | "pending"
  | "completed"
  | "today"
  | "week"
  | "archived";

export type SortKey =
  | "manual"
  | "dueTime"
  | "priority"
  | "category"
  | "recent"
  | "alpha";

export interface FilterState {
  search: string;
  category: string; // "all" or category name
  priority: "all" | "low" | "medium" | "high";
  status: StatusFilter;
  sort: SortKey;
}

export function TaskFilters({
  value,
  onChange,
}: {
  value: FilterState;
  onChange: (v: FilterState) => void;
}) {
  const customCategories = useAppState((s) => s.customCategories);
  const set = <K extends keyof FilterState>(k: K, v: FilterState[K]) =>
    onChange({ ...value, [k]: v });

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={value.search}
          onChange={(e) => set("search", e.target.value)}
          placeholder="Search tasks, tags, notes…"
          className="pl-9"
        />
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="col-span-2 sm:col-span-1">
          <Select value={value.status} onValueChange={(v) => set("status", v as StatusFilter)}>
            <SelectTrigger>
              <SlidersHorizontal className="mr-2 h-3.5 w-3.5" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This week</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Select value={value.category} onValueChange={(v) => set("category", v)}>
          <SelectTrigger>
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {[...DEFAULT_CATEGORIES, ...customCategories].map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={value.priority}
          onValueChange={(v) => set("priority", v as FilterState["priority"])}
        >
          <SelectTrigger>
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>

        <Select value={value.sort} onValueChange={(v) => set("sort", v as SortKey)}>
          <SelectTrigger>
            <ArrowDownUp className="mr-2 h-3.5 w-3.5" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="manual">Manual order</SelectItem>
            <SelectItem value="dueTime">Due time</SelectItem>
            <SelectItem value="priority">Priority</SelectItem>
            <SelectItem value="category">Category</SelectItem>
            <SelectItem value="recent">Recently added</SelectItem>
            <SelectItem value="alpha">Alphabetically</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

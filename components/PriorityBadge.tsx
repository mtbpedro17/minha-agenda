import type { Priority } from "@/types/task";
import { PRIORITY_DOT_CLASS, PRIORITY_LABEL } from "@/types/task";


const TEXT_COLOR: Record<Priority, string> = {
  HIGH: "text-priority-high",
  MEDIUM: "text-priority-medium",
  LOW: "text-priority-low",
};

export default function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium ${TEXT_COLOR[priority]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${PRIORITY_DOT_CLASS[priority]}`} />
      {PRIORITY_LABEL[priority]}
    </span>
  );
}

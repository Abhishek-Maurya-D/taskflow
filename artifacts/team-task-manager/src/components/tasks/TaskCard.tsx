import { useUpdateTask, getListTasksQueryKey, getGetProjectStatsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { CalendarIcon, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const PRIORITY_CONFIG = {
  low: { label: "Low", className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" },
  medium: { label: "Medium", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300" },
  high: { label: "High", className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300" },
};

const STATUS_CONFIG = {
  todo: { label: "To Do" },
  in_progress: { label: "In Progress" },
  completed: { label: "Done" },
};

interface Task {
  id: number;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  dueDate?: string | null;
  projectId: number;
  assignedToId?: string | null;
  assignedTo?: { id: string; firstName?: string | null; lastName?: string | null; profileImageUrl?: string | null; email?: string | null } | null;
  project?: { id: number; title: string } | null;
  comments?: unknown[];
}

interface TaskCardProps {
  task: Task;
  onClick?: () => void;
  showProject?: boolean;
  projectId?: number;
}

export default function TaskCard({ task, onClick, showProject, projectId }: TaskCardProps) {
  const updateTask = useUpdateTask();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const isOverdue =
    task.dueDate &&
    task.status !== "completed" &&
    new Date(task.dueDate) < new Date();

  const priorityCfg = PRIORITY_CONFIG[task.priority as keyof typeof PRIORITY_CONFIG] ?? PRIORITY_CONFIG.medium;

  const toggleComplete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = task.status === "completed" ? "todo" : "completed";
    try {
      await updateTask.mutateAsync({
        id: task.id,
        data: { status: newStatus },
      });
      const pid = projectId ?? task.projectId;
      queryClient.invalidateQueries({ queryKey: getListTasksQueryKey({ projectId: pid }) });
      queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
      if (pid) queryClient.invalidateQueries({ queryKey: getGetProjectStatsQueryKey(pid) });
    } catch {
      toast({ title: "Failed to update task", variant: "destructive" });
    }
  };

  return (
    <Card
      className={cn(
        "cursor-pointer hover:shadow-sm transition-all border",
        task.status === "completed" && "opacity-60",
        onClick && "hover:border-primary/30",
      )}
      onClick={onClick}
    >
      <CardContent className="flex items-start gap-3 py-3 px-4">
        <div onClick={toggleComplete} className="mt-0.5">
          <Checkbox
            checked={task.status === "completed"}
            className="pointer-events-none"
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 justify-between">
            <p className={cn("text-sm font-medium leading-tight", task.status === "completed" && "line-through text-muted-foreground")}>
              {task.title}
            </p>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${priorityCfg.className}`}>
              {priorityCfg.label}
            </span>
          </div>
          {showProject && task.project && (
            <p className="text-xs text-muted-foreground mt-0.5">{task.project.title}</p>
          )}
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            {task.dueDate && (
              <span className={cn("flex items-center gap-1 text-xs", isOverdue ? "text-red-500 font-medium" : "text-muted-foreground")}>
                <CalendarIcon className="w-3 h-3" />
                {new Date(task.dueDate).toLocaleDateString()}
              </span>
            )}
            {(task.comments?.length ?? 0) > 0 && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <MessageSquare className="w-3 h-3" />
                {task.comments!.length}
              </span>
            )}
            {task.status === "in_progress" && (
              <Badge variant="secondary" className="text-xs h-5 py-0">In Progress</Badge>
            )}
          </div>
        </div>
        {task.assignedTo && (
          <Avatar className="w-7 h-7 shrink-0">
            <AvatarImage src={task.assignedTo.profileImageUrl ?? undefined} />
            <AvatarFallback className="text-xs">
              {(task.assignedTo.firstName?.[0] || task.assignedTo.email?.[0] || "?").toUpperCase()}
            </AvatarFallback>
          </Avatar>
        )}
      </CardContent>
    </Card>
  );
}

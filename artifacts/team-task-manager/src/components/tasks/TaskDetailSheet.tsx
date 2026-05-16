import { useState } from "react";
import {
  useGetTask,
  useUpdateTask,
  useDeleteTask,
  useAddTaskComment,
  useListUsers,
  getListTasksQueryKey,
  getGetProjectStatsQueryKey,
  getGetTaskQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Trash2, Send, CalendarIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

const PRIORITY_OPTIONS = ["low", "medium", "high"] as const;
const STATUS_OPTIONS = [
  { value: "todo", label: "To Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
] as const;

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-green-100 text-green-800",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-red-100 text-red-800",
};

interface TaskDetailSheetProps {
  taskId: number;
  open: boolean;
  onClose: () => void;
  projectId?: number;
}

export default function TaskDetailSheet({ taskId, open, onClose, projectId }: TaskDetailSheetProps) {
  const [newComment, setNewComment] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { data: task, isLoading } = useGetTask(taskId);
  const { data: users } = useListUsers();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const addComment = useAddTaskComment();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const pid = projectId ?? task?.projectId;

  const handleUpdate = async (field: string, value: string | null) => {
    try {
      await updateTask.mutateAsync({ id: taskId, data: { [field]: value } });
      queryClient.invalidateQueries({ queryKey: getGetTaskQueryKey(taskId) });
      if (pid) {
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey({ projectId: pid }) });
        queryClient.invalidateQueries({ queryKey: getGetProjectStatsQueryKey(pid) });
      }
      queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
    } catch {
      toast({ title: "Failed to update task", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    try {
      await deleteTask.mutateAsync({ id: taskId });
      if (pid) {
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey({ projectId: pid }) });
        queryClient.invalidateQueries({ queryKey: getGetProjectStatsQueryKey(pid) });
      }
      queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
      toast({ title: "Task deleted" });
      onClose();
    } catch {
      toast({ title: "Failed to delete task", variant: "destructive" });
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    try {
      await addComment.mutateAsync({ id: taskId, data: { content: newComment.trim() } });
      queryClient.invalidateQueries({ queryKey: getGetTaskQueryKey(taskId) });
      setNewComment("");
    } catch {
      toast({ title: "Failed to add comment", variant: "destructive" });
    }
  };

  const projectMembers = users ?? [];

  return (
    <>
      <Sheet open={open} onOpenChange={onClose}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {isLoading || !task ? (
            <div className="space-y-4 mt-6">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ) : (
            <>
              <SheetHeader className="mb-4">
                <SheetTitle className="text-left leading-tight pr-8">{task.title}</SheetTitle>
                {task.project && (
                  <p className="text-sm text-muted-foreground text-left">{task.project.title}</p>
                )}
              </SheetHeader>

              <div className="space-y-5">
                {task.description && (
                  <p className="text-sm text-muted-foreground">{task.description}</p>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Status</Label>
                    <Select value={task.status} onValueChange={v => handleUpdate("status", v)}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Priority</Label>
                    <Select value={task.priority} onValueChange={v => handleUpdate("priority", v)}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PRIORITY_OPTIONS.map(p => (
                          <SelectItem key={p} value={p} className="capitalize">{p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Assigned To</Label>
                  <Select
                    value={task.assignedToId ?? "none"}
                    onValueChange={v => handleUpdate("assignedToId", v === "none" ? null : v)}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Unassigned" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Unassigned</SelectItem>
                      {projectMembers.map(u => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : u.email ?? u.id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {task.dueDate && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CalendarIcon className="w-4 h-4" />
                    <span>Due {new Date(task.dueDate).toLocaleDateString()}</span>
                  </div>
                )}

                <Separator />

                <div>
                  <p className="text-sm font-medium mb-3">
                    Comments ({task.comments?.length ?? 0})
                  </p>
                  <div className="space-y-3 mb-4">
                    {!task.comments?.length ? (
                      <p className="text-sm text-muted-foreground">No comments yet</p>
                    ) : (
                      task.comments.map((comment: any) => (
                        <div key={comment.id} className="flex gap-2.5">
                          <Avatar className="w-7 h-7 shrink-0 mt-0.5">
                            <AvatarImage src={comment.author?.profileImageUrl ?? undefined} />
                            <AvatarFallback className="text-xs">
                              {(comment.author?.firstName?.[0] || comment.author?.email?.[0] || "?").toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium">
                                {comment.author?.firstName && comment.author?.lastName
                                  ? `${comment.author.firstName} ${comment.author.lastName}`
                                  : comment.author?.email ?? "Unknown"}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                              </span>
                            </div>
                            <p className="text-sm mt-0.5">{comment.content}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Add a comment..."
                      value={newComment}
                      onChange={e => setNewComment(e.target.value)}
                      rows={2}
                      className="resize-none text-sm"
                      onKeyDown={e => {
                        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleAddComment();
                      }}
                    />
                    <Button
                      size="icon"
                      onClick={handleAddComment}
                      disabled={!newComment.trim() || addComment.isPending}
                      className="shrink-0"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <Separator />

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2 text-destructive hover:text-destructive"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete Task
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this task and its comments.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
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

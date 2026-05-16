import { useState } from "react";
import { useParams, useLocation } from "wouter";
import {
  useGetProject,
  useGetProjectStats,
  useListTasks,
  useCreateTask,
  useDeleteProject,
  useUpdateProject,
  useListUsers,
  useAddProjectMember,
  useRemoveProjectMember,
  getListTasksQueryKey,
  getGetProjectQueryKey,
  getGetProjectStatsQueryKey,
  getListProjectsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Trash2, UserPlus, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@workspace/replit-auth-web";
import TaskCard from "@/components/tasks/TaskCard";
import TaskDetailSheet from "@/components/tasks/TaskDetailSheet";

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-green-100 text-green-800",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-red-100 text-red-800",
};
const STATUS_COLORS: Record<string, string> = {
  todo: "bg-slate-100 text-slate-800",
  in_progress: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
};

function CreateTaskDialog({
  open,
  onClose,
  projectId,
}: {
  open: boolean;
  onClose: () => void;
  projectId: number;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [dueDate, setDueDate] = useState("");
  const [assignedToId, setAssignedToId] = useState<string>("none");
  const createTask = useCreateTask();
  const { data: users } = useListUsers();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: project } = useGetProject(projectId);

  const members = project?.members ?? [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      await createTask.mutateAsync({
        data: {
          title: title.trim(),
          ...(description.trim() ? { description: description.trim() } : {}),
          priority: priority as "low" | "medium" | "high",
          status: "todo" as const,
          projectId,
          ...(assignedToId !== "none" ? { assignedToId: assignedToId as unknown as number } : {}),
          ...(dueDate ? { dueDate: new Date(dueDate).toISOString() } : {}),
        },
      });
      queryClient.invalidateQueries({ queryKey: getListTasksQueryKey({ projectId }) });
      queryClient.invalidateQueries({ queryKey: getGetProjectStatsQueryKey(projectId) });
      toast({ title: "Task created" });
      setTitle(""); setDescription(""); setPriority("medium"); setDueDate(""); setAssignedToId("none");
      onClose();
    } catch {
      toast({ title: "Failed to create task", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Title *</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Task title" required />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Task details..." rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Due Date</Label>
              <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
            </div>
          </div>
          {members.length > 0 && (
            <div className="space-y-1.5">
              <Label>Assign To</Label>
              <Select value={assignedToId} onValueChange={setAssignedToId}>
                <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {members.map(m => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.firstName && m.lastName ? `${m.firstName} ${m.lastName}` : m.email ?? m.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={createTask.isPending}>
              {createTask.isPending ? "Creating..." : "Create Task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AddMemberDialog({
  open,
  onClose,
  projectId,
  existingMemberIds,
}: {
  open: boolean;
  onClose: () => void;
  projectId: number;
  existingMemberIds: string[];
}) {
  const [selectedUserId, setSelectedUserId] = useState("none");
  const { data: users } = useListUsers();
  const addMember = useAddProjectMember();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const availableUsers = users?.filter(u => !existingMemberIds.includes(u.id)) ?? [];

  const handleAdd = async () => {
    if (!selectedUserId || selectedUserId === "none") return;
    try {
      await addMember.mutateAsync({ id: projectId, data: { userId: selectedUserId } });
      queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
      toast({ title: "Member added" });
      setSelectedUserId("none");
      onClose();
    } catch {
      toast({ title: "Failed to add member", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Member</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a team member" />
            </SelectTrigger>
            <SelectContent>
              {availableUsers.length === 0 ? (
                <SelectItem value="none" disabled>No available members</SelectItem>
              ) : (
                availableUsers.map(u => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : u.email ?? u.id}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleAdd} disabled={addMember.isPending || !selectedUserId || selectedUserId === "none"}>
            Add Member
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const projectId = Number(params.id);
  const [, navigate] = useLocation();
  const { user } = useAuth();

  const [showCreateTask, setShowCreateTask] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: project, isLoading: projectLoading } = useGetProject(projectId);
  const { data: stats } = useGetProjectStats(projectId);
  const { data: tasks, isLoading: tasksLoading } = useListTasks({ projectId });
  const deleteProject = useDeleteProject();
  const removeMember = useRemoveProjectMember();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleDelete = async () => {
    try {
      await deleteProject.mutateAsync({ id: projectId });
      queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
      toast({ title: "Project deleted" });
      navigate("/projects");
    } catch {
      toast({ title: "Failed to delete project", variant: "destructive" });
    }
  };

  const handleRemoveMember = async (userId: string) => {
    try {
      await removeMember.mutateAsync({ id: projectId, userId: userId as unknown as number });
      queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
      toast({ title: "Member removed" });
    } catch {
      toast({ title: "Failed to remove member", variant: "destructive" });
    }
  };

  const filteredTasks = tasks?.filter(t =>
    statusFilter === "all" ? true : t.status === statusFilter
  ) ?? [];

  if (projectLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-24 text-muted-foreground">
        <p className="font-medium">Project not found</p>
        <Button variant="ghost" className="mt-4" onClick={() => navigate("/projects")}>
          Back to Projects
        </Button>
      </div>
    );
  }

  const memberIds = project.members?.map(m => m.id) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/projects")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold">{project.title}</h2>
            {project.description && (
              <p className="text-muted-foreground text-sm mt-0.5">{project.description}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-destructive hover:text-destructive"
            onClick={() => setShowDeleteConfirm(true)}
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Tasks", value: stats?.totalTasks ?? 0 },
          { label: "Completed", value: stats?.completedTasks ?? 0 },
          { label: "In Progress", value: stats?.inProgressTasks ?? 0 },
          { label: "Overdue", value: stats?.overdueTasks ?? 0 },
        ].map(({ label, value }) => (
          <Card key={label}>
            <CardContent className="p-5 text-center">
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-sm text-muted-foreground">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="tasks">
        <TabsList>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="members">Members ({project.members?.length ?? 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="space-y-4 mt-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex gap-2">
              {["all", "todo", "in_progress", "completed"].map(s => (
                <Button
                  key={s}
                  variant={statusFilter === s ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter(s)}
                >
                  {s === "all" ? "All" : s === "in_progress" ? "In Progress" : s.charAt(0).toUpperCase() + s.slice(1)}
                </Button>
              ))}
            </div>
            <Button size="sm" className="gap-1.5" onClick={() => setShowCreateTask(true)}>
              <Plus className="w-4 h-4" /> Add Task
            </Button>
          </div>

          {tasksLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
            </div>
          ) : !filteredTasks.length ? (
            <div className="text-center py-16 text-muted-foreground">
              <p>No tasks{statusFilter !== "all" ? ` with status "${statusFilter}"` : ""}</p>
              <Button size="sm" className="mt-3" onClick={() => setShowCreateTask(true)}>
                Add First Task
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onClick={() => setSelectedTaskId(task.id)}
                  projectId={projectId}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="members" className="mt-4">
          <div className="flex justify-end mb-4">
            <Button size="sm" className="gap-1.5" onClick={() => setShowAddMember(true)}>
              <UserPlus className="w-4 h-4" /> Add Member
            </Button>
          </div>
          {!project.members?.length ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No members yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {project.members.map(member => (
                <Card key={member.id}>
                  <CardContent className="flex items-center justify-between py-3 px-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-9 h-9">
                        <AvatarImage src={member.profileImageUrl ?? undefined} />
                        <AvatarFallback>
                          {(member.firstName?.[0] || member.email?.[0] || "U").toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">
                          {member.firstName && member.lastName
                            ? `${member.firstName} ${member.lastName}`
                            : member.email ?? "Unknown"}
                        </p>
                        {member.email && <p className="text-xs text-muted-foreground">{member.email}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">{member.role}</Badge>
                      {member.id !== user?.id && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemoveMember(member.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <CreateTaskDialog open={showCreateTask} onClose={() => setShowCreateTask(false)} projectId={projectId} />
      <AddMemberDialog
        open={showAddMember}
        onClose={() => setShowAddMember(false)}
        projectId={projectId}
        existingMemberIds={memberIds}
      />

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{project.title}" and all its tasks. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {selectedTaskId && (
        <TaskDetailSheet
          taskId={selectedTaskId}
          open={!!selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
          projectId={projectId}
        />
      )}
    </div>
  );
}

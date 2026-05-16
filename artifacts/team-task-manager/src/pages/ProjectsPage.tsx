import { useState } from "react";
import { useLocation } from "wouter";
import { useListProjects, useCreateProject } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getListProjectsQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, FolderKanban, ChevronRight, Users, CheckSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const STATUS_CONFIG = {
  active: { label: "Active", className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" },
  on_hold: { label: "On Hold", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300" },
  completed: { label: "Completed", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
  archived: { label: "Archived", className: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300" },
};

function CreateProjectDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("active");
  const [deadline, setDeadline] = useState("");
  const createProject = useCreateProject();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      await createProject.mutateAsync({
        data: {
          title: title.trim(),
          ...(description.trim() ? { description: description.trim() } : {}),
          status: status as "active" | "on_hold" | "completed" | "archived",
          ...(deadline ? { deadline: new Date(deadline).toISOString() } : {}),
        },
      });
      queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
      toast({ title: "Project created" });
      setTitle(""); setDescription(""); setStatus("active"); setDeadline("");
      onClose();
    } catch {
      toast({ title: "Failed to create project", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Project</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="title">Title *</Label>
            <Input id="title" value={title} onChange={e => setTitle(e.target.value)} placeholder="Project name" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="desc">Description</Label>
            <Textarea id="desc" value={description} onChange={e => setDescription(e.target.value)} placeholder="What's this project about?" rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="deadline">Deadline</Label>
              <Input id="deadline" type="date" value={deadline} onChange={e => setDeadline(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={createProject.isPending}>
              {createProject.isPending ? "Creating..." : "Create Project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function ProjectsPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [, navigate] = useLocation();
  const { data: projects, isLoading } = useListProjects();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Projects</h2>
          <p className="text-muted-foreground text-sm">{projects?.length ?? 0} total projects</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <Plus className="w-4 h-4" /> New Project
        </Button>
      </div>

      {isLoading ? (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-xl" />)}
        </div>
      ) : !projects?.length ? (
        <div className="text-center py-24 text-muted-foreground">
          <FolderKanban className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="font-medium">No projects yet</p>
          <p className="text-sm mt-1">Create your first project to get started</p>
          <Button className="mt-4" onClick={() => setShowCreate(true)}>Create Project</Button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map((project) => {
            const cfg = STATUS_CONFIG[project.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.active;
            const completionPct = project.taskCount
              ? Math.round(((project.completedTaskCount ?? 0) / project.taskCount) * 100)
              : 0;
            return (
              <div
                key={project.id}
                className="cursor-pointer"
                onClick={() => navigate(`/projects/${project.id}`)}
              >
                <Card className="h-full hover:shadow-md transition-shadow border-2 hover:border-primary/20">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base leading-tight">{project.title}</CardTitle>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${cfg.className}`}>
                        {cfg.label}
                      </span>
                    </div>
                    {project.description && (
                      <CardDescription className="text-sm line-clamp-2">{project.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <CheckSquare className="w-3.5 h-3.5" />
                        {project.completedTaskCount ?? 0}/{project.taskCount ?? 0} tasks
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" />
                        {project.members?.length ?? 0} members
                      </span>
                    </div>
                    {(project.taskCount ?? 0) > 0 && (
                      <div>
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span>Progress</span>
                          <span>{completionPct}%</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${completionPct}%` }}
                          />
                        </div>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      {project.deadline ? (
                        <span className="text-xs text-muted-foreground">
                          Due {new Date(project.deadline).toLocaleDateString()}
                        </span>
                      ) : <span />}
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      )}

      <CreateProjectDialog open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  );
}

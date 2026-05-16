import { useState } from "react";
import { useListTasks, useListProjects } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckSquare, Search } from "lucide-react";
import TaskCard from "@/components/tasks/TaskCard";
import TaskDetailSheet from "@/components/tasks/TaskDetailSheet";

export default function TasksPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);

  const { data: tasks, isLoading } = useListTasks({
    ...(statusFilter !== "all" ? { status: statusFilter as "todo" | "in_progress" | "completed" } : {}),
    ...(priorityFilter !== "all" ? { priority: priorityFilter as "low" | "medium" | "high" } : {}),
    ...(projectFilter !== "all" ? { projectId: Number(projectFilter) } : {}),
  });
  const { data: projects } = useListProjects();

  const filteredTasks = tasks?.filter(t =>
    search ? t.title.toLowerCase().includes(search.toLowerCase()) : true
  ) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">All Tasks</h2>
        <p className="text-muted-foreground text-sm">{filteredTasks.length} tasks</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="todo">To Do</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
          </SelectContent>
        </Select>
        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Project" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projects?.map(p => (
              <SelectItem key={p.id} value={String(p.id)}>{p.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
      ) : !filteredTasks.length ? (
        <div className="text-center py-20 text-muted-foreground">
          <CheckSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No tasks found</p>
          {search || statusFilter !== "all" || priorityFilter !== "all" || projectFilter !== "all" ? (
            <Button
              variant="ghost"
              size="sm"
              className="mt-2"
              onClick={() => { setSearch(""); setStatusFilter("all"); setPriorityFilter("all"); setProjectFilter("all"); }}
            >
              Clear filters
            </Button>
          ) : (
            <p className="text-sm mt-1">Create tasks from inside a project</p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredTasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              onClick={() => setSelectedTaskId(task.id)}
              showProject
            />
          ))}
        </div>
      )}

      {selectedTaskId && (
        <TaskDetailSheet
          taskId={selectedTaskId}
          open={!!selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
        />
      )}
    </div>
  );
}

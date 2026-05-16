import { useGetDashboardSummary, useGetRecentActivity, useGetTaskBreakdown } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import { CheckSquare, Clock, AlertCircle, FolderKanban, Users, TrendingUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const STATUS_COLORS: Record<string, string> = {
  todo: "#94a3b8",
  in_progress: "#3b82f6",
  completed: "#22c55e",
};
const STATUS_LABELS: Record<string, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  completed: "Completed",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "#22c55e",
  medium: "#f59e0b",
  high: "#ef4444",
};

function StatCard({
  title,
  value,
  icon: Icon,
  color,
  loading,
}: {
  title: string;
  value?: number;
  icon: React.ElementType;
  color: string;
  loading: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-6">
        <div className={`p-3 rounded-xl ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          {loading ? (
            <Skeleton className="h-7 w-12 mt-1" />
          ) : (
            <p className="text-2xl font-bold">{value ?? 0}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ActivityBadge({ type }: { type: string }) {
  const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    task_created: { label: "Created", variant: "secondary" },
    task_completed: { label: "Completed", variant: "default" },
    task_updated: { label: "Updated", variant: "outline" },
    comment_added: { label: "Comment", variant: "secondary" },
    project_created: { label: "Project", variant: "default" },
    member_added: { label: "Joined", variant: "outline" },
  };
  const { label, variant } = map[type] ?? { label: type, variant: "secondary" as const };
  return <Badge variant={variant} className="text-xs">{label}</Badge>;
}

export default function DashboardPage() {
  const { data: summary, isLoading: summaryLoading } = useGetDashboardSummary();
  const { data: activity, isLoading: activityLoading } = useGetRecentActivity();
  const { data: breakdown } = useGetTaskBreakdown();

  const statusData = breakdown?.byStatus?.map(s => ({
    name: STATUS_LABELS[s.status] ?? s.status,
    value: s.count,
    color: STATUS_COLORS[s.status] ?? "#94a3b8",
  })) ?? [];

  const priorityData = breakdown?.byPriority?.map(p => ({
    name: p.priority.charAt(0).toUpperCase() + p.priority.slice(1),
    count: p.count,
    fill: PRIORITY_COLORS[p.priority] ?? "#94a3b8",
  })) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Overview</h2>
        <p className="text-muted-foreground text-sm">Your team's task summary</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard title="Total Tasks" value={summary?.totalTasks} icon={CheckSquare} color="bg-blue-500" loading={summaryLoading} />
        <StatCard title="Completed" value={summary?.completedTasks} icon={TrendingUp} color="bg-green-500" loading={summaryLoading} />
        <StatCard title="In Progress" value={summary?.inProgressTasks} icon={Clock} color="bg-orange-500" loading={summaryLoading} />
        <StatCard title="Overdue" value={summary?.overdueTasks} icon={AlertCircle} color="bg-red-500" loading={summaryLoading} />
        <StatCard title="Projects" value={summary?.totalProjects} icon={FolderKanban} color="bg-purple-500" loading={summaryLoading} />
        <StatCard title="Members" value={summary?.totalUsers} icon={Users} color="bg-slate-500" loading={summaryLoading} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Task Status</CardTitle>
          </CardHeader>
          <CardContent>
            {statusData.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-8">No tasks yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {statusData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tasks by Priority</CardTitle>
          </CardHeader>
          <CardContent>
            {priorityData.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-8">No tasks yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={priorityData} margin={{ top: 8, right: 8, bottom: 8, left: -10 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]} fill="#3b82f6">
                    {priorityData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {activityLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : !activity?.length ? (
            <p className="text-center text-muted-foreground text-sm py-6">No recent activity</p>
          ) : (
            <div className="space-y-3">
              {activity.map((item) => (
                <div key={item.id} className="flex items-start gap-3 py-2 border-b last:border-0">
                  <ActivityBadge type={item.type} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{item.description}</p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

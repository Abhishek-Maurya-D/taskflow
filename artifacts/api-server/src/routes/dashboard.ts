import { Router } from "express";
import { db } from "@workspace/db";
import { tasksTable, projectsTable, usersTable, activityTable } from "@workspace/db";
import { eq, count, sql, desc } from "drizzle-orm";

const router = Router();

router.get("/dashboard/summary", async (req, res) => {
  const [taskStats] = await db
    .select({
      total: count(),
      completed: sql<number>`count(*) filter (where status = 'completed')`,
      inProgress: sql<number>`count(*) filter (where status = 'in_progress')`,
      todo: sql<number>`count(*) filter (where status = 'todo')`,
      overdue: sql<number>`count(*) filter (where due_date < now() and status != 'completed')`,
    })
    .from(tasksTable);

  const [projectStats] = await db
    .select({
      total: count(),
      active: sql<number>`count(*) filter (where status = 'active')`,
    })
    .from(projectsTable);

  const [userStats] = await db.select({ total: count() }).from(usersTable);

  const totalTasks = Number(taskStats?.total ?? 0);
  const completedTasks = Number(taskStats?.completed ?? 0);

  res.json({
    totalTasks,
    completedTasks,
    inProgressTasks: Number(taskStats?.inProgress ?? 0),
    todoTasks: Number(taskStats?.todo ?? 0),
    overdueTasks: Number(taskStats?.overdue ?? 0),
    totalProjects: Number(projectStats?.total ?? 0),
    activeProjects: Number(projectStats?.active ?? 0),
    totalUsers: Number(userStats?.total ?? 0),
    completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
  });
});

router.get("/dashboard/activity", async (req, res) => {
  const activity = await db
    .select({ activity: activityTable, user: usersTable })
    .from(activityTable)
    .leftJoin(usersTable, eq(activityTable.userId, usersTable.id))
    .orderBy(desc(activityTable.createdAt))
    .limit(20);

  res.json(activity.map((a) => ({ ...a.activity, user: a.user ?? null })));
});

router.get("/dashboard/task-breakdown", async (req, res) => {
  const byStatus = await db
    .select({ status: tasksTable.status, count: count() })
    .from(tasksTable)
    .groupBy(tasksTable.status);

  const byPriority = await db
    .select({ priority: tasksTable.priority, count: count() })
    .from(tasksTable)
    .groupBy(tasksTable.priority);

  res.json({
    byStatus: byStatus.map((s) => ({ status: s.status, count: Number(s.count) })),
    byPriority: byPriority.map((p) => ({ priority: p.priority, count: Number(p.count) })),
  });
});

export default router;

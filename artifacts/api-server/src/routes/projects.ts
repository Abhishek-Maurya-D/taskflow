import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { projectsTable, projectMembersTable, usersTable, tasksTable, activityTable } from "@workspace/db";
import { eq, and, count, sql } from "drizzle-orm";
import {
  CreateProjectBody,
  UpdateProjectBody,
  AddProjectMemberBody,
} from "@workspace/api-zod";

const router = Router();

async function getProjectWithMembers(projectId: number) {
  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, projectId));
  if (!project) return null;

  const members = await db
    .select({ user: usersTable })
    .from(projectMembersTable)
    .innerJoin(usersTable, eq(projectMembersTable.userId, usersTable.id))
    .where(eq(projectMembersTable.projectId, projectId));

  const [taskCounts] = await db
    .select({
      total: count(),
      completed: sql<number>`count(*) filter (where status = 'completed')`,
    })
    .from(tasksTable)
    .where(eq(tasksTable.projectId, projectId));

  return {
    ...project,
    members: members.map((m) => m.user),
    taskCount: Number(taskCounts?.total ?? 0),
    completedTaskCount: Number(taskCounts?.completed ?? 0),
  };
}

router.get("/projects", async (_req: Request, res: Response) => {
  const projects = await db.select().from(projectsTable).orderBy(projectsTable.createdAt);
  const enriched = await Promise.all(projects.map((p) => getProjectWithMembers(p.id)));
  res.json(enriched.filter(Boolean));
});

router.post("/projects", async (req: Request, res: Response) => {
  if (!req.isAuthenticated() || !req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parsed = CreateProjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }

  const userId = (req.user as { id: string }).id;
  const [project] = await db
    .insert(projectsTable)
    .values({
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      status: parsed.data.status ?? "active",
      deadline: parsed.data.deadline ? new Date(parsed.data.deadline) : null,
      createdById: userId,
    })
    .returning();

  await db.insert(projectMembersTable).values({ projectId: project.id, userId });

  await db.insert(activityTable).values({
    type: "project_created",
    description: `Project "${project.title}" was created`,
    entityId: project.id,
    entityType: "project",
    userId,
  });

  const enriched = await getProjectWithMembers(project.id);
  res.status(201).json(enriched);
});

router.get("/projects/:id", async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const project = await getProjectWithMembers(id);
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  res.json(project);
});

router.put("/projects/:id", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const parsed = UpdateProjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }

  const updateData: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.deadline !== undefined) {
    updateData.deadline = parsed.data.deadline ? new Date(String(parsed.data.deadline)) : null;
  }

  const [updated] = await db
    .update(projectsTable)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .set(updateData as any)
    .where(eq(projectsTable.id, id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  const enriched = await getProjectWithMembers(updated.id);
  res.json(enriched);
});

router.delete("/projects/:id", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  await db.delete(projectsTable).where(eq(projectsTable.id, id));
  res.status(204).send();
});

router.post("/projects/:id/members", async (req: Request, res: Response) => {
  if (!req.isAuthenticated() || !req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const parsed = AddProjectMemberBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }

  const userId = String(parsed.data.userId);

  const existing = await db
    .select()
    .from(projectMembersTable)
    .where(and(eq(projectMembersTable.projectId, id), eq(projectMembersTable.userId, userId)));

  if (existing.length === 0) {
    await db.insert(projectMembersTable).values({ projectId: id, userId });
    await db.insert(activityTable).values({
      type: "member_added",
      description: `A member was added to the project`,
      entityId: id,
      entityType: "project",
      userId: (req.user as { id: string }).id,
    });
  }

  const enriched = await getProjectWithMembers(id);
  res.json(enriched);
});

router.delete("/projects/:id/members/:userId", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  await db
    .delete(projectMembersTable)
    .where(and(eq(projectMembersTable.projectId, id), eq(projectMembersTable.userId, String(req.params.userId))));

  const enriched = await getProjectWithMembers(id);
  res.json(enriched);
});

router.get("/projects/:id/stats", async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const tasks = await db.select().from(tasksTable).where(eq(tasksTable.projectId, id));

  const now = new Date();
  const taskCount = tasks.length;
  const completedTaskCount = tasks.filter((t) => t.status === "completed").length;
  const inProgressTaskCount = tasks.filter((t) => t.status === "in_progress").length;
  const todoTaskCount = tasks.filter((t) => t.status === "todo").length;
  const overdueTaskCount = tasks.filter(
    (t) => t.dueDate && new Date(t.dueDate) < now && t.status !== "completed",
  ).length;
  const progressPercent = taskCount > 0 ? Math.round((completedTaskCount / taskCount) * 100) : 0;

  res.json({
    totalTasks: taskCount,
    completedTasks: completedTaskCount,
    inProgressTasks: inProgressTaskCount,
    todoTasks: todoTaskCount,
    overdueTasks: overdueTaskCount,
    progressPercent,
  });
});

export default router;

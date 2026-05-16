import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { tasksTable, commentsTable, usersTable, projectsTable, activityTable } from "@workspace/db";
import { eq, and, ilike } from "drizzle-orm";
import { CreateTaskBody, UpdateTaskBody, AddTaskCommentBody } from "@workspace/api-zod";

const router = Router();

async function getTaskWithDetails(taskId: number) {
  const [task] = await db.select().from(tasksTable).where(eq(tasksTable.id, taskId));
  if (!task) return null;

  const [assignedTo] = task.assignedToId
    ? await db.select().from(usersTable).where(eq(usersTable.id, task.assignedToId))
    : [null];

  const [project] = await db
    .select({ id: projectsTable.id, title: projectsTable.title })
    .from(projectsTable)
    .where(eq(projectsTable.id, task.projectId));

  const comments = await db
    .select({ comment: commentsTable, author: usersTable })
    .from(commentsTable)
    .leftJoin(usersTable, eq(commentsTable.authorId, usersTable.id))
    .where(eq(commentsTable.taskId, taskId))
    .orderBy(commentsTable.createdAt);

  return {
    ...task,
    assignedTo: assignedTo ?? null,
    project: project ?? null,
    comments: comments.map((c) => ({ ...c.comment, author: c.author ?? null })),
  };
}

router.get("/tasks", async (req: Request, res: Response) => {
  const conditions: ReturnType<typeof eq>[] = [];
  const { projectId, status, priority, assignedTo, search } = req.query;

  if (projectId) conditions.push(eq(tasksTable.projectId, Number(projectId)));
  if (status) conditions.push(eq(tasksTable.status, String(status)));
  if (priority) conditions.push(eq(tasksTable.priority, String(priority)));
  if (assignedTo) conditions.push(eq(tasksTable.assignedToId, String(assignedTo)));
  if (search) conditions.push(ilike(tasksTable.title, `%${search}%`));

  const tasks = conditions.length > 0
    ? await db.select().from(tasksTable).where(and(...conditions)).orderBy(tasksTable.createdAt)
    : await db.select().from(tasksTable).orderBy(tasksTable.createdAt);

  const enriched = await Promise.all(tasks.map((t) => getTaskWithDetails(t.id)));
  res.json(enriched.filter(Boolean));
});

router.post("/tasks", async (req: Request, res: Response) => {
  if (!req.isAuthenticated() || !req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parsed = CreateTaskBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }

  const userId = (req.user as { id: string }).id;
  const [task] = await db
    .insert(tasksTable)
    .values({
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      status: parsed.data.status ?? "todo",
      priority: parsed.data.priority ?? "medium",
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
      projectId: parsed.data.projectId,
      assignedToId: parsed.data.assignedToId ? String(parsed.data.assignedToId) : null,
      createdById: userId,
    })
    .returning();

  await db.insert(activityTable).values({
    type: "task_created",
    description: `Task "${task.title}" was created`,
    entityId: task.id,
    entityType: "task",
    userId,
  });

  const enriched = await getTaskWithDetails(task.id);
  res.status(201).json(enriched);
});

router.get("/tasks/:id", async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const task = await getTaskWithDetails(id);
  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  res.json(task);
});

router.put("/tasks/:id", async (req: Request, res: Response) => {
  if (!req.isAuthenticated() || !req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const parsed = UpdateTaskBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }

  const [existing] = await db.select().from(tasksTable).where(eq(tasksTable.id, id));

  const updateData: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.dueDate !== undefined) {
    updateData.dueDate = parsed.data.dueDate ? new Date(String(parsed.data.dueDate)) : null;
  }
  if (parsed.data.assignedToId !== undefined) {
    updateData.assignedToId = parsed.data.assignedToId ? String(parsed.data.assignedToId) : null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [updated] = await db.update(tasksTable).set(updateData as any).where(eq(tasksTable.id, id)).returning();
  if (!updated) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  const activityType =
    parsed.data.status === "completed" && existing?.status !== "completed"
      ? "task_completed"
      : "task_updated";

  await db.insert(activityTable).values({
    type: activityType,
    description: `Task "${updated.title}" was ${activityType === "task_completed" ? "completed" : "updated"}`,
    entityId: updated.id,
    entityType: "task",
    userId: (req.user as { id: string }).id,
  });

  const enriched = await getTaskWithDetails(updated.id);
  res.json(enriched);
});

router.delete("/tasks/:id", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  await db.delete(tasksTable).where(eq(tasksTable.id, id));
  res.status(204).send();
});

router.post("/tasks/:id/comments", async (req: Request, res: Response) => {
  if (!req.isAuthenticated() || !req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const parsed = AddTaskCommentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }

  const userId = (req.user as { id: string }).id;
  const [comment] = await db
    .insert(commentsTable)
    .values({ content: parsed.data.content, taskId: id, authorId: userId })
    .returning();

  const [taskRow] = await db.select().from(tasksTable).where(eq(tasksTable.id, id));
  if (taskRow) {
    await db.insert(activityTable).values({
      type: "comment_added",
      description: `A comment was added to task "${taskRow.title}"`,
      entityId: id,
      entityType: "task",
      userId,
    });
  }

  const [author] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  res.status(201).json({ ...comment, author: author ?? null });
});

export default router;

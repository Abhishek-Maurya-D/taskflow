import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/users", async (_req: Request, res: Response) => {
  const users = await db.select().from(usersTable).orderBy(usersTable.createdAt);
  res.json(users);
});

router.get("/users/:id", async (req: Request, res: Response) => {
  const id = String(req.params.id);
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(user);
});

router.put("/users/:id/role", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const { role } = req.body as { role: unknown };
  if (!role || !["admin", "member"].includes(String(role))) {
    res.status(400).json({ error: "Invalid role" });
    return;
  }
  const id = String(req.params.id);
  const [updated] = await db
    .update(usersTable)
    .set({ role: String(role) as "admin" | "member" })
    .where(eq(usersTable.id, id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(updated);
});

export default router;

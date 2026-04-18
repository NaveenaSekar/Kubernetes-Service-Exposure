const path = require("path");
const os = require("os");
const express = require("express");

const app = express();
const port = process.env.PORT || 8080;

app.use(express.json({ limit: "50kb" }));

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.get("/api/info", (_req, res) => {
  res.json({
    status: "ok",
    hostname: process.env.HOSTNAME || os.hostname(),
    uptimeSeconds: Math.floor(process.uptime()),
    node: process.version,
  });
});

// Simple in-memory task store (resets when the container/pod restarts).
let nextTaskId = 1;
/** @type {{id:number,title:string,type:"assignment"|"exam"|"project",completed:boolean,createdAt:string}[]} */
const tasks = [];

app.get("/api/tasks", (_req, res) => {
  res.json({ tasks });
});

app.post("/api/tasks", (req, res) => {
  const title = typeof req.body?.title === "string" ? req.body.title.trim() : "";
  const type = req.body?.type;

  /** @type {Set<string>} */
  const allowed = new Set(["assignment", "exam", "project"]);
  if (!title) return res.status(400).json({ error: "title is required" });
  if (!allowed.has(type)) return res.status(400).json({ error: "invalid type" });

  const task = {
    id: nextTaskId++,
    title,
    type,
    completed: false,
    createdAt: new Date().toISOString(),
  };
  tasks.unshift(task);
  res.status(201).json({ task });
});

app.patch("/api/tasks/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "invalid id" });

  const task = tasks.find((t) => t.id === id);
  if (!task) return res.status(404).json({ error: "not found" });

  if (typeof req.body?.completed === "boolean") {
    task.completed = req.body.completed;
  }

  res.json({ task });
});

app.delete("/api/tasks/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "invalid id" });

  const idx = tasks.findIndex((t) => t.id === id);
  if (idx === -1) return res.status(404).json({ error: "not found" });

  const [deleted] = tasks.splice(idx, 1);
  res.json({ task: deleted });
});

app.use(
  express.static(path.join(__dirname, "public"), { index: "index.html" })
);

app.listen(port, "0.0.0.0", () => {
  console.log(`Server listening on http://0.0.0.0:${port}`);
});

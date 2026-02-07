import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { v4 as uuidv4 } from "uuid";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();
const DATA_DIR = path.join(__dirname, "../data/posts");
const META_FILE = path.join(DATA_DIR, "posts.json");

interface PostMeta {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  comments?: Comment[];
}

interface Comment {
  id: string;
  personaId: string;
  content: string;
  createdAt: string;
}

interface Post extends PostMeta {
  content: string;
}

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readMeta(): PostMeta[] {
  try {
    const data = fs.readFileSync(META_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function writeMeta(posts: PostMeta[]): void {
  fs.writeFileSync(META_FILE, JSON.stringify(posts, null, 2));
}

function readContent(id: string): string {
  try {
    return fs.readFileSync(path.join(DATA_DIR, `${id}.md`), "utf-8");
  } catch {
    return "";
  }
}

function writeContent(id: string, content: string): void {
  fs.writeFileSync(path.join(DATA_DIR, `${id}.md`), content, "utf-8");
}

function deleteContent(id: string): void {
  const filePath = path.join(DATA_DIR, `${id}.md`);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

// GET /api/posts - 전체 글 목록 (content 포함)
router.get("/", (_req, res) => {
  const metas = readMeta();
  const posts: Post[] = metas.map((meta) => ({
    ...meta,
    content: readContent(meta.id),
  }));
  res.json(posts);
});

// GET /api/posts/:id - 개별 글
router.get("/:id", (req, res) => {
  const metas = readMeta();
  const meta = metas.find((p) => p.id === req.params.id);
  if (!meta) {
    res.status(404).json({ error: "Post not found" });
    return;
  }
  const post: Post = {
    ...meta,
    content: readContent(meta.id),
  };
  res.json(post);
});

// POST /api/posts - 새 글 작성
router.post("/", (req, res) => {
  const { title, content } = req.body;
  if (!title || !content) {
    res.status(400).json({ error: "Title and content are required" });
    return;
  }

  const metas = readMeta();
  const now = new Date().toISOString();
  const id = uuidv4();

  const newMeta: PostMeta = {
    id,
    title,
    createdAt: now,
    updatedAt: now,
    comments: [],
  };

  metas.unshift(newMeta);
  writeMeta(metas);
  writeContent(id, content);

  res.status(201).json({ ...newMeta, content });
});

// PUT /api/posts/:id - 글 수정
router.put("/:id", (req, res) => {
  const { title, content } = req.body;
  if (!title || !content) {
    res.status(400).json({ error: "Title and content are required" });
    return;
  }

  const metas = readMeta();
  const index = metas.findIndex((p) => p.id === req.params.id);
  if (index === -1) {
    res.status(404).json({ error: "Post not found" });
    return;
  }

  metas[index] = {
    ...metas[index],
    title,
    updatedAt: new Date().toISOString(),
  };

  writeMeta(metas);
  writeContent(req.params.id, content);

  res.json({ ...metas[index], content });
});

// DELETE /api/posts/:id - 글 삭제
router.delete("/:id", (req, res) => {
  const metas = readMeta();
  const index = metas.findIndex((p) => p.id === req.params.id);
  if (index === -1) {
    res.status(404).json({ error: "Post not found" });
    return;
  }

  const id = metas[index].id;
  metas.splice(index, 1);
  writeMeta(metas);
  deleteContent(id);

  res.json({ success: true });
});

// POST /api/posts/:id/comments - 댓글 추가
router.post("/:id/comments", (req, res) => {
  const { personaId, content } = req.body;
  if (!personaId || !content) {
    res.status(400).json({ error: "personaId and content are required" });
    return;
  }

  const metas = readMeta();
  const index = metas.findIndex((p) => p.id === req.params.id);
  if (index === -1) {
    res.status(404).json({ error: "Post not found" });
    return;
  }

  const comment: Comment = {
    id: uuidv4(),
    personaId,
    content,
    createdAt: new Date().toISOString(),
  };

  if (!metas[index].comments) {
    metas[index].comments = [];
  }
  metas[index].comments!.push(comment);
  writeMeta(metas);

  res.status(201).json(comment);
});

export default router;

import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { v4 as uuidv4 } from "uuid";
import { readComments, writeComments, getCommentsFilePath } from "../lib/commentsData.js";
import type { Comment } from "../lib/commentsData.js";
import { generateInitialComments, generateReply } from "../lib/comments.js";

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
  commentsFile: string;
}

interface Post extends PostMeta {
  content: string;
  comments: Comment[];
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

function deleteComments(id: string): void {
  const filePath = getCommentsFilePath(id);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

// GET /api/posts - 전체 글 목록 (content, comments 포함)
router.get("/", (_req, res) => {
  const metas = readMeta();
  const posts: Post[] = metas.map((meta) => ({
    ...meta,
    content: readContent(meta.id),
    comments: readComments(meta.id),
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
    comments: readComments(meta.id),
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
    commentsFile: `${id}-comments.json`,
  };

  metas.unshift(newMeta);
  writeMeta(metas);
  writeContent(id, content);
  writeComments(id, []); // 빈 댓글 파일 생성

  res.status(201).json({ ...newMeta, content, comments: [] });

  // Fire-and-forget: generate AI comments in background
  generateInitialComments(id, { title, content }).catch((err) => {
    console.error(`[AI] Background comment generation failed for post ${id}:`, err);
  });
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

  res.json({ ...metas[index], content, comments: readComments(req.params.id) });
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
  deleteComments(id); // 댓글 파일도 삭제

  res.json({ success: true });
});

// POST /api/posts/:id/comments - Add comment or reply (returns array: [userComment, ...aiReplies])
router.post("/:id/comments", async (req, res) => {
  const { personaId, content, parentId } = req.body;
  if (!personaId || !content) {
    res.status(400).json({ error: "personaId and content are required" });
    return;
  }

  const metas = readMeta();
  const meta = metas.find((p) => p.id === req.params.id);
  if (!meta) {
    res.status(404).json({ error: "Post not found" });
    return;
  }

  const comment: Comment = {
    id: uuidv4(),
    personaId,
    content,
    createdAt: new Date().toISOString(),
    ...(parentId && { parentId }),
  };

  const comments = readComments(req.params.id);
  comments.push(comment);
  writeComments(req.params.id, comments);

  // If this is a user comment, generate AI reply
  if (personaId === "user") {
    try {
      const postContent = readContent(meta.id);
      const aiReplies = await generateReply(
        req.params.id,
        { title: meta.title, content: postContent },
        comment
      );
      res.status(201).json([comment, ...aiReplies]);
    } catch (err) {
      console.error("[AI] Failed to generate reply:", err);
      res.status(201).json([comment]);
    }
  } else {
    res.status(201).json([comment]);
  }
});

// POST /api/posts/:id/comments/generate - Manual trigger for AI comments
router.post("/:id/comments/generate", async (req, res) => {
  const metas = readMeta();
  const meta = metas.find((p) => p.id === req.params.id);
  if (!meta) {
    res.status(404).json({ error: "Post not found" });
    return;
  }

  const existing = readComments(req.params.id);
  if (existing.length > 0) {
    res.status(409).json({ error: "Comments already exist for this post" });
    return;
  }

  const postContent = readContent(meta.id);
  await generateInitialComments(req.params.id, { title: meta.title, content: postContent });

  const comments = readComments(req.params.id);
  res.json({ comments });
});

export default router;

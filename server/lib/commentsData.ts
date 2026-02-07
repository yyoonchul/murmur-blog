import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "data", "posts");

export interface Comment {
  id: string;
  personaId: string;
  content: string;
  createdAt: string;
  parentId?: string;
}

export interface CommentsData {
  comments: Comment[];
}

export function getCommentsFilePath(id: string): string {
  return path.join(DATA_DIR, `${id}-comments.json`);
}

export function readComments(id: string): Comment[] {
  try {
    const data = fs.readFileSync(getCommentsFilePath(id), "utf-8");
    const parsed: CommentsData = JSON.parse(data);
    return parsed.comments || [];
  } catch {
    return [];
  }
}

export function writeComments(id: string, comments: Comment[]): void {
  const data: CommentsData = { comments };
  fs.writeFileSync(getCommentsFilePath(id), JSON.stringify(data, null, 2), "utf-8");
}

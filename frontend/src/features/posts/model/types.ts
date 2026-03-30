/** `GET /posts` list item (no body or comments). */
export interface PostListItem {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  commentCount: number;
}

/** Full post from `GET /posts/:id`, create, or update. */
export interface Post {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  comments?: ServerComment[];
}

export interface Comment {
  id: string;
  postId: string;
  persona: string;
  content: string;
  createdAt: string;
  parentId?: string;
  replies?: Comment[];
  isAI?: boolean;
  personaEmoji?: string;
  personaColor?: string;
  personaBgColor?: string;
  personaBorderColor?: string;
}

export interface ServerComment {
  id: string;
  personaId: string;
  content: string;
  createdAt: string;
  parentId?: string;
}

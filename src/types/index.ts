export interface Post {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
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
}

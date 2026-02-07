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
  personaEmoji?: string;
  personaColor?: string;
  personaBgColor?: string;
  personaBorderColor?: string;
}

export interface PersonaInfo {
  id: string;
  name: string;
  role: string;
  emoji: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

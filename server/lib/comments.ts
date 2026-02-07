import { v4 as uuidv4 } from "uuid";
import { sendMessage } from "./llm/index.js";
import { readPersonas } from "./personas.js";
import { readComments, writeComments } from "./commentsData.js";
import type { Comment } from "./commentsData.js";

// --- System prompt builders ---

const SITUATION_INITIAL = `당신은 블로그 글을 읽고 첫 댓글을 남기는 독자입니다.
글을 읽고 느낀 점, 공감한 부분, 또는 궁금한 점을 1~3문장으로 댓글을 남겨주세요.
댓글 텍스트만 출력하세요. 다른 설명이나 메타 텍스트 없이 댓글 내용만 작성하세요.`;

const SITUATION_REPLY = `당신은 블로그 글에 이미 달린 댓글에 답하는 독자입니다.
이전 댓글의 맥락을 고려하여 자연스럽게 1~3문장으로 대댓글을 남겨주세요.
댓글 텍스트만 출력하세요. 다른 설명이나 메타 텍스트 없이 댓글 내용만 작성하세요.`;

export function buildSystemPrompt(situation: "initial" | "reply", promptContent: string): string {
  const situationText = situation === "initial" ? SITUATION_INITIAL : SITUATION_REPLY;
  return situationText + "\n\n---\n\n" + promptContent;
}

export function buildUserMessage(post: { title: string; content: string }, threadContext?: string): string {
  let msg = `# ${post.title}\n\n${post.content}`;
  if (threadContext) {
    msg += `\n\n---\n\n## 댓글 맥락\n\n${threadContext}`;
  }
  return msg;
}

export function buildThreadContext(
  comments: Comment[],
  targetCommentId: string,
  personaMap: Map<string, string>
): string {
  // Build chain from target comment up to root
  const chain: Comment[] = [];
  let current = comments.find((c) => c.id === targetCommentId);
  while (current) {
    chain.unshift(current);
    current = current.parentId ? comments.find((c) => c.id === current!.parentId) : undefined;
  }

  return chain
    .map((c) => {
      const name = personaMap.get(c.personaId) || c.personaId;
      return `${name}: ${c.content}`;
    })
    .join("\n\n");
}

// --- Inter-persona reply rules ---

const INTER_PERSONA_REPLIES = [
  { replier: "doyun", target: "mina" },
  { replier: "jihoon", target: "doyun" },
  { replier: "eunseo", target: "suhyun" },
];

function pickInterPersonaReplies(count: number): typeof INTER_PERSONA_REPLIES {
  const shuffled = [...INTER_PERSONA_REPLIES].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// --- Main generation functions ---

export async function generateInitialComments(
  postId: string,
  post: { title: string; content: string }
): Promise<void> {
  console.log(`[AI] generateInitialComments START for post ${postId}`);
  console.log(`[AI] Post title: "${post.title}", content length: ${post.content.length}`);

  const { personas, feedbackOrder } = readPersonas();
  console.log(`[AI] Loaded ${personas.length} personas, feedbackOrder: [${feedbackOrder.join(", ")}]`);

  if (personas.length === 0) {
    console.error("[AI] ERROR: No personas loaded! Check personas.json and .md files");
    return;
  }

  const personaMap = new Map(personas.map((p) => [p.id, p.name]));

  // Generate initial comments in feedbackOrder
  for (const personaId of feedbackOrder) {
    const persona = personas.find((p) => p.id === personaId);
    if (!persona) {
      console.warn(`[AI] Persona not found for id: ${personaId}, skipping`);
      continue;
    }

    console.log(`[AI] Generating initial comment for ${personaId} (${persona.name})...`);
    console.log(`[AI]   promptContent length: ${persona.promptContent.length}`);

    try {
      const system = buildSystemPrompt("initial", persona.promptContent);
      const userMessage = buildUserMessage(post);
      console.log(`[AI]   System prompt length: ${system.length}, user message length: ${userMessage.length}`);
      console.log(`[AI]   Calling sendMessage...`);

      const content = await sendMessage(userMessage, { system, maxTokens: 1024 });
      console.log(`[AI]   sendMessage returned: "${content.substring(0, 100)}..." (length: ${content.length})`);

      if (content.trim()) {
        const comment: Comment = {
          id: uuidv4(),
          personaId,
          content: content.trim(),
          createdAt: new Date().toISOString(),
        };
        const comments = readComments(postId);
        comments.push(comment);
        writeComments(postId, comments);
        console.log(`[AI]   Comment saved. Total comments now: ${comments.length}`);
      } else {
        console.warn(`[AI]   Empty response from LLM for ${personaId}`);
      }
    } catch (err) {
      console.error(`[AI] FAILED to generate initial comment for ${personaId}:`, err);
    }
  }

  // Generate inter-persona replies (2 out of 3 rules)
  const replyRules = pickInterPersonaReplies(2);
  console.log(`[AI] Inter-persona reply rules selected:`, replyRules.map(r => `${r.replier}→${r.target}`));

  for (const rule of replyRules) {
    const replier = personas.find((p) => p.id === rule.replier);
    if (!replier) {
      console.warn(`[AI] Replier persona not found: ${rule.replier}`);
      continue;
    }

    const comments = readComments(postId);
    const targetComment = comments.find((c) => c.personaId === rule.target && !c.parentId);
    if (!targetComment) {
      console.warn(`[AI] Target comment not found for ${rule.target} (no top-level comment)`);
      continue;
    }

    console.log(`[AI] Generating inter-persona reply: ${rule.replier} → ${rule.target}...`);

    try {
      const system = buildSystemPrompt("reply", replier.promptContent);
      const threadContext = buildThreadContext(comments, targetComment.id, personaMap);
      const userMessage = buildUserMessage(post, threadContext);
      console.log(`[AI]   Calling sendMessage for reply...`);

      const content = await sendMessage(userMessage, { system, maxTokens: 1024 });
      console.log(`[AI]   Reply response: "${content.substring(0, 100)}..." (length: ${content.length})`);

      if (content.trim()) {
        const reply: Comment = {
          id: uuidv4(),
          personaId: rule.replier,
          content: content.trim(),
          createdAt: new Date().toISOString(),
          parentId: targetComment.id,
        };
        const updatedComments = readComments(postId);
        updatedComments.push(reply);
        writeComments(postId, updatedComments);
        console.log(`[AI]   Reply saved. Total comments now: ${updatedComments.length}`);
      } else {
        console.warn(`[AI]   Empty reply response for ${rule.replier}→${rule.target}`);
      }
    } catch (err) {
      console.error(`[AI] FAILED inter-persona reply (${rule.replier} → ${rule.target}):`, err);
    }
  }

  const finalComments = readComments(postId);
  console.log(`[AI] generateInitialComments DONE for post ${postId}. Total comments: ${finalComments.length}`);
}

export async function generateReply(
  postId: string,
  post: { title: string; content: string },
  userComment: Comment
): Promise<Comment[]> {
  console.log(`[AI] generateReply START for post ${postId}, userComment: ${userComment.id}`);
  console.log(`[AI]   userComment.parentId: ${userComment.parentId || "(none, top-level)"}`);

  const aiReplies: Comment[] = [];
  const { personas } = readPersonas();
  const personaMap = new Map(personas.map((p) => [p.id, p.name]));

  // If user replied to an AI comment, that persona responds
  // If user left a top-level comment, pick a random persona to respond
  let responderId: string;
  if (userComment.parentId) {
    const comments = readComments(postId);
    const parentComment = comments.find((c) => c.id === userComment.parentId);
    if (parentComment && parentComment.personaId !== "user") {
      responderId = parentComment.personaId;
      console.log(`[AI]   Responding as parent's persona: ${responderId}`);
    } else {
      // Parent is user or not found — pick random persona
      const randomIndex = Math.floor(Math.random() * personas.length);
      responderId = personas[randomIndex].id;
      console.log(`[AI]   Parent is user/not-found, random persona: ${responderId}`);
    }
  } else {
    // Top-level user comment — pick random persona
    const randomIndex = Math.floor(Math.random() * personas.length);
    responderId = personas[randomIndex].id;
    console.log(`[AI]   Top-level comment, random persona: ${responderId}`);
  }

  const responder = personas.find((p) => p.id === responderId);
  if (!responder) {
    console.error(`[AI]   Responder persona not found: ${responderId}`);
    return aiReplies;
  }

  try {
    const comments = readComments(postId);
    const system = buildSystemPrompt("reply", responder.promptContent);
    const threadContext = buildThreadContext(comments, userComment.id, personaMap);
    const userMessage = buildUserMessage(post, threadContext);
    console.log(`[AI]   Calling sendMessage for reply from ${responderId}...`);

    const content = await sendMessage(userMessage, { system, maxTokens: 1024 });
    console.log(`[AI]   Reply response: "${content.substring(0, 100)}..." (length: ${content.length})`);

    if (content.trim()) {
      const reply: Comment = {
        id: uuidv4(),
        personaId: responderId,
        content: content.trim(),
        createdAt: new Date().toISOString(),
        parentId: userComment.parentId || userComment.id,
      };
      const updatedComments = readComments(postId);
      updatedComments.push(reply);
      writeComments(postId, updatedComments);
      aiReplies.push(reply);
      console.log(`[AI]   Reply saved from ${responderId}. Total comments: ${updatedComments.length}`);
    } else {
      console.warn(`[AI]   Empty reply from ${responderId}`);
    }
  } catch (err) {
    console.error(`[AI] FAILED to generate reply from ${responderId}:`, err);
  }

  console.log(`[AI] generateReply DONE. AI replies count: ${aiReplies.length}`);
  return aiReplies;
}

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  buildSystemPrompt,
  buildUserMessage,
  buildThreadContext,
  generateInitialComments,
  generateReply,
} from "./comments.js";
import type { Comment } from "./commentsData.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "data", "posts");

// ---- Mock personas ----
const MOCK_PERSONAS = {
  personas: [
    { id: "mina", name: "Mina", role: "First Reader", emoji: "💛", color: "#CA8A04", bgColor: "#FEFCE8", borderColor: "#FEF08A", promptFile: "mina-reader.md", promptContent: "Mina prompt" },
    { id: "eunseo", name: "Eunseo", role: "Writing Peer", emoji: "✒️", color: "#7C3AED", bgColor: "#FAF5FF", borderColor: "#DDD6FE", promptFile: "eunseo-writer.md", promptContent: "Eunseo prompt" },
    { id: "jihoon", name: "Jihoon", role: "Practical Mentor", emoji: "⚖️", color: "#6B7280", bgColor: "#F9FAFB", borderColor: "#E5E7EB", promptFile: "jihoon-mentor.md", promptContent: "Jihoon prompt" },
    { id: "suhyun", name: "Suhyun", role: "Argument Critic", emoji: "🔬", color: "#2563EB", bgColor: "#EFF6FF", borderColor: "#BFDBFE", promptFile: "suhyun-critic.md", promptContent: "Suhyun prompt" },
    { id: "doyun", name: "Doyun", role: "Contrarian", emoji: "⚡", color: "#DC2626", bgColor: "#FEF2F2", borderColor: "#FECACA", promptFile: "doyun-contrarian.md", promptContent: "Doyun prompt" },
  ],
  feedbackOrder: ["mina", "eunseo", "jihoon", "suhyun", "doyun"],
  feedbackOrderReason: "test",
};

// ---- Mock setup ----
vi.mock("./llm/index.js", () => ({
  sendMessage: vi.fn(),
}));

vi.mock("./personas.js", () => ({
  readPersonas: vi.fn(),
}));

import { sendMessage } from "./llm/index.js";
import { readPersonas } from "./personas.js";

const mockSendMessage = vi.mocked(sendMessage);
const mockReadPersonas = vi.mocked(readPersonas);

// ---- Test helpers ----
const TEST_POST_ID = "test-post-id";
const TEST_POST = { title: "Test Post", content: "This is test content." };

function getCommentsFilePath(id: string): string {
  return path.join(DATA_DIR, `${id}-comments.json`);
}

function readTestComments(postId: string): Comment[] {
  try {
    const data = fs.readFileSync(getCommentsFilePath(postId), "utf-8");
    return JSON.parse(data).comments || [];
  } catch {
    return [];
  }
}

function writeTestComments(postId: string, comments: Comment[]): void {
  fs.writeFileSync(getCommentsFilePath(postId), JSON.stringify({ comments }, null, 2), "utf-8");
}

function cleanupTestFile(postId: string): void {
  const fp = getCommentsFilePath(postId);
  if (fs.existsSync(fp)) fs.unlinkSync(fp);
}

// ===================================================================
// 1. Pure Function Tests
// ===================================================================
describe("buildSystemPrompt", () => {
  it("correctly builds initial situation prompt", () => {
    const result = buildSystemPrompt("initial", "persona content");
    expect(result).toContain("leaving the first comment");
    expect(result).toContain("1-3 sentences");
    expect(result).toContain("only the comment text");
    expect(result).toContain("---");
    expect(result).toContain("persona content");
  });

  it("correctly builds reply situation prompt", () => {
    const result = buildSystemPrompt("reply", "persona content");
    expect(result).toContain("replying to an existing comment");
    expect(result).toContain("reply in 1-3 sentences");
    expect(result).toContain("---");
    expect(result).toContain("persona content");
  });

  it("handles empty promptContent correctly", () => {
    const result = buildSystemPrompt("initial", "");
    expect(result).toContain("---");
    expect(result.endsWith("\n\n---\n\n")).toBe(true);
  });
});

describe("buildUserMessage", () => {
  it("includes only post content without threadContext", () => {
    const result = buildUserMessage({ title: "Title", content: "Body" });
    expect(result).toBe("# Title\n\nBody");
  });

  it("adds comment context section when threadContext is provided", () => {
    const result = buildUserMessage({ title: "Title", content: "Body" }, "Mina: Great post");
    expect(result).toContain("# Title\n\nBody");
    expect(result).toContain("---");
    expect(result).toContain("## Comment Context");
    expect(result).toContain("Mina: Great post");
  });

  it("does not add context section for empty threadContext", () => {
    const result = buildUserMessage({ title: "Title", content: "Body" }, "");
    // Empty string is falsy so context should not be added
    expect(result).toBe("# Title\n\nBody");
  });
});

describe("buildThreadContext", () => {
  const personaMap = new Map([
    ["mina", "Mina"],
    ["doyun", "Doyun"],
    ["user", "User"],
  ]);

  it("correctly generates context for a single comment", () => {
    const comments: Comment[] = [
      { id: "c1", personaId: "mina", content: "Great post!", createdAt: "2024-01-01" },
    ];
    const result = buildThreadContext(comments, "c1", personaMap);
    expect(result).toBe("Mina: Great post!");
  });

  it("extracts parent-child chain in correct order", () => {
    const comments: Comment[] = [
      { id: "c1", personaId: "mina", content: "Great post!", createdAt: "2024-01-01" },
      { id: "c2", personaId: "doyun", content: "Really?", createdAt: "2024-01-02", parentId: "c1" },
      { id: "c3", personaId: "user", content: "Thank you", createdAt: "2024-01-03", parentId: "c2" },
    ];
    const result = buildThreadContext(comments, "c3", personaMap);
    expect(result).toBe("Mina: Great post!\n\nDoyun: Really?\n\nUser: Thank you");
  });

  it("shows personaId as-is when not in personaMap", () => {
    const comments: Comment[] = [
      { id: "c1", personaId: "unknown", content: "Hello", createdAt: "2024-01-01" },
    ];
    const result = buildThreadContext(comments, "c1", personaMap);
    expect(result).toBe("unknown: Hello");
  });

  it("returns empty string for non-existent targetCommentId", () => {
    const comments: Comment[] = [
      { id: "c1", personaId: "mina", content: "Great!", createdAt: "2024-01-01" },
    ];
    const result = buildThreadContext(comments, "nonexistent", personaMap);
    expect(result).toBe("");
  });

  it("does not include unrelated comments in chain", () => {
    const comments: Comment[] = [
      { id: "c1", personaId: "mina", content: "First comment", createdAt: "2024-01-01" },
      { id: "c2", personaId: "doyun", content: "Second comment", createdAt: "2024-01-02" },
      { id: "c3", personaId: "user", content: "Reply to c1", createdAt: "2024-01-03", parentId: "c1" },
    ];
    const result = buildThreadContext(comments, "c3", personaMap);
    // c2 should not be included in the chain
    expect(result).not.toContain("Second comment");
    expect(result).toBe("Mina: First comment\n\nUser: Reply to c1");
  });
});

// ===================================================================
// 2. generateInitialComments Scenario Tests
// ===================================================================
describe("generateInitialComments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReadPersonas.mockReturnValue(MOCK_PERSONAS as ReturnType<typeof readPersonas>);
    // Initialize comments file
    writeTestComments(TEST_POST_ID, []);
  });

  afterEach(() => {
    cleanupTestFile(TEST_POST_ID);
  });

  it("generates 5 initial comments in feedbackOrder sequence", async () => {
    let callCount = 0;
    mockSendMessage.mockImplementation(async () => {
      callCount++;
      return `Comment ${callCount}`;
    });

    await generateInitialComments(TEST_POST_ID, TEST_POST);

    const comments = readTestComments(TEST_POST_ID);
    // 5 initial + 2 inter-persona
    expect(comments.length).toBe(7);

    // Verify first 5 are in feedbackOrder sequence
    const initialComments = comments.filter((c) => !c.parentId);
    expect(initialComments).toHaveLength(5);
    expect(initialComments[0].personaId).toBe("mina");
    expect(initialComments[1].personaId).toBe("eunseo");
    expect(initialComments[2].personaId).toBe("jihoon");
    expect(initialComments[3].personaId).toBe("suhyun");
    expect(initialComments[4].personaId).toBe("doyun");
  });

  it("uses correct system prompt (initial + persona) for each initial comment", async () => {
    mockSendMessage.mockResolvedValue("Test comment");

    await generateInitialComments(TEST_POST_ID, TEST_POST);

    // First 5 calls use initial prompt
    for (let i = 0; i < 5; i++) {
      const call = mockSendMessage.mock.calls[i];
      const systemPrompt = call[1]?.system as string;
      expect(systemPrompt).toContain("leaving the first comment");
    }

    // First call includes Mina's prompt
    expect(mockSendMessage.mock.calls[0][1]?.system).toContain("Mina prompt");
  });

  it("generates 2 inter-persona replies", async () => {
    mockSendMessage.mockResolvedValue("Test comment");

    await generateInitialComments(TEST_POST_ID, TEST_POST);

    const comments = readTestComments(TEST_POST_ID);
    const replies = comments.filter((c) => c.parentId);
    expect(replies).toHaveLength(2);

    // Verify reply's parentId points to an existing comment
    for (const reply of replies) {
      const parent = comments.find((c) => c.id === reply.parentId);
      expect(parent).toBeDefined();
      expect(parent!.parentId).toBeUndefined(); // Parent should be top-level
    }
  });

  it("inter-persona replies use reply prompt", async () => {
    mockSendMessage.mockResolvedValue("Test comment");

    await generateInitialComments(TEST_POST_ID, TEST_POST);

    // 6th and 7th calls are reply prompts
    for (let i = 5; i < 7; i++) {
      const call = mockSendMessage.mock.calls[i];
      const systemPrompt = call[1]?.system as string;
      expect(systemPrompt).toContain("replying to an existing comment");
    }
  });

  it("does not save comment when LLM returns empty string", async () => {
    mockSendMessage
      .mockResolvedValueOnce("Mina comment")      // mina OK
      .mockResolvedValueOnce("   ")               // eunseo empty (whitespace only)
      .mockResolvedValueOnce("Jihoon comment")    // jihoon OK
      .mockResolvedValueOnce("")                  // suhyun empty
      .mockResolvedValueOnce("Doyun comment")     // doyun OK
      .mockResolvedValue("Reply");                // inter-persona

    await generateInitialComments(TEST_POST_ID, TEST_POST);

    const comments = readTestComments(TEST_POST_ID);
    const initialComments = comments.filter((c) => !c.parentId);
    // eunseo (whitespace), suhyun (empty) should not be saved
    expect(initialComments).toHaveLength(3);
    expect(initialComments.map((c) => c.personaId)).toEqual(["mina", "jihoon", "doyun"]);
  });

  it("saves remaining comments even when some LLM calls fail", async () => {
    mockSendMessage
      .mockResolvedValueOnce("Mina comment")
      .mockRejectedValueOnce(new Error("API error"))  // eunseo failed
      .mockResolvedValueOnce("Jihoon comment")
      .mockResolvedValueOnce("Suhyun comment")
      .mockRejectedValueOnce(new Error("API error"))  // doyun failed
      .mockResolvedValue("Reply");

    await generateInitialComments(TEST_POST_ID, TEST_POST);

    const comments = readTestComments(TEST_POST_ID);
    const initialComments = comments.filter((c) => !c.parentId);
    expect(initialComments).toHaveLength(3);
    expect(initialComments.map((c) => c.personaId)).toEqual(["mina", "jihoon", "suhyun"]);
  });

  it("does not throw error even when all LLM calls fail", async () => {
    mockSendMessage.mockRejectedValue(new Error("Total failure"));

    await expect(generateInitialComments(TEST_POST_ID, TEST_POST)).resolves.toBeUndefined();

    const comments = readTestComments(TEST_POST_ID);
    expect(comments).toHaveLength(0);
  });

  it("each comment has unique id and createdAt", async () => {
    mockSendMessage.mockResolvedValue("Test comment");

    await generateInitialComments(TEST_POST_ID, TEST_POST);

    const comments = readTestComments(TEST_POST_ID);
    const ids = comments.map((c) => c.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(comments.length); // All unique

    for (const c of comments) {
      expect(c.createdAt).toBeTruthy();
      expect(new Date(c.createdAt).toISOString()).toBe(c.createdAt);
    }
  });

  it("calls LLM with maxTokens: 1024", async () => {
    mockSendMessage.mockResolvedValue("Test");

    await generateInitialComments(TEST_POST_ID, TEST_POST);

    for (const call of mockSendMessage.mock.calls) {
      expect(call[1]?.maxTokens).toBe(1024);
    }
  });
});

// ===================================================================
// 3. generateReply Scenario Tests
// ===================================================================
describe("generateReply", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReadPersonas.mockReturnValue(MOCK_PERSONAS as ReturnType<typeof readPersonas>);
    writeTestComments(TEST_POST_ID, []);
  });

  afterEach(() => {
    cleanupTestFile(TEST_POST_ID);
  });

  it("when user replies to AI comment, that persona responds", async () => {
    // Existing comments: Mina's top-level + user's reply
    const minaComment: Comment = {
      id: "mina-c1",
      personaId: "mina",
      content: "Great post!",
      createdAt: "2024-01-01T00:00:00.000Z",
    };
    const userReply: Comment = {
      id: "user-r1",
      personaId: "user",
      content: "Thank you!",
      createdAt: "2024-01-01T01:00:00.000Z",
      parentId: "mina-c1",
    };
    writeTestComments(TEST_POST_ID, [minaComment, userReply]);

    mockSendMessage.mockResolvedValue("Mina responds");

    const replies = await generateReply(TEST_POST_ID, TEST_POST, userReply);

    expect(replies).toHaveLength(1);
    expect(replies[0].personaId).toBe("mina"); // Mina responds
    expect(replies[0].content).toBe("Mina responds");
    expect(replies[0].parentId).toBe("mina-c1"); // Reply to original Mina comment
  });

  it("when user leaves top-level comment, random persona responds", async () => {
    const userComment: Comment = {
      id: "user-c1",
      personaId: "user",
      content: "Great post",
      createdAt: "2024-01-01T00:00:00.000Z",
    };
    writeTestComments(TEST_POST_ID, [userComment]);

    mockSendMessage.mockResolvedValue("AI response");

    const replies = await generateReply(TEST_POST_ID, TEST_POST, userComment);

    expect(replies).toHaveLength(1);
    // Should be one of 5 personas
    const personaIds = MOCK_PERSONAS.personas.map((p) => p.id);
    expect(personaIds).toContain(replies[0].personaId);
    expect(replies[0].parentId).toBe("user-c1"); // User comment as parent
  });

  it("AI response uses reply system prompt", async () => {
    const userComment: Comment = {
      id: "user-c1",
      personaId: "user",
      content: "I have a question",
      createdAt: "2024-01-01T00:00:00.000Z",
    };
    writeTestComments(TEST_POST_ID, [userComment]);
    mockSendMessage.mockResolvedValue("AI response");

    await generateReply(TEST_POST_ID, TEST_POST, userComment);

    const systemPrompt = mockSendMessage.mock.calls[0][1]?.system as string;
    expect(systemPrompt).toContain("replying to an existing comment");
  });

  it("returns empty array when LLM returns empty string", async () => {
    const userComment: Comment = {
      id: "user-c1",
      personaId: "user",
      content: "Question",
      createdAt: "2024-01-01T00:00:00.000Z",
    };
    writeTestComments(TEST_POST_ID, [userComment]);
    mockSendMessage.mockResolvedValue("   ");

    const replies = await generateReply(TEST_POST_ID, TEST_POST, userComment);

    expect(replies).toHaveLength(0);
  });

  it("returns empty array and does not throw when LLM call fails", async () => {
    const userComment: Comment = {
      id: "user-c1",
      personaId: "user",
      content: "Question",
      createdAt: "2024-01-01T00:00:00.000Z",
    };
    writeTestComments(TEST_POST_ID, [userComment]);
    mockSendMessage.mockRejectedValue(new Error("API down"));

    const replies = await generateReply(TEST_POST_ID, TEST_POST, userComment);

    expect(replies).toHaveLength(0);
  });

  it("random persona responds when user replies to another user comment", async () => {
    const userComment1: Comment = {
      id: "user-c1",
      personaId: "user",
      content: "First comment",
      createdAt: "2024-01-01T00:00:00.000Z",
    };
    const userReply: Comment = {
      id: "user-c2",
      personaId: "user",
      content: "Self reply",
      createdAt: "2024-01-01T01:00:00.000Z",
      parentId: "user-c1",
    };
    writeTestComments(TEST_POST_ID, [userComment1, userReply]);
    mockSendMessage.mockResolvedValue("AI response");

    const replies = await generateReply(TEST_POST_ID, TEST_POST, userReply);

    expect(replies).toHaveLength(1);
    const personaIds = MOCK_PERSONAS.personas.map((p) => p.id);
    expect(personaIds).toContain(replies[0].personaId);
  });

  it("generated AI reply is also saved to file", async () => {
    const userComment: Comment = {
      id: "user-c1",
      personaId: "user",
      content: "Good post",
      createdAt: "2024-01-01T00:00:00.000Z",
    };
    writeTestComments(TEST_POST_ID, [userComment]);
    mockSendMessage.mockResolvedValue("Reply saved to file");

    await generateReply(TEST_POST_ID, TEST_POST, userComment);

    const allComments = readTestComments(TEST_POST_ID);
    const aiComment = allComments.find((c) => c.personaId !== "user");
    expect(aiComment).toBeDefined();
    expect(aiComment!.content).toBe("Reply saved to file");
  });

  it("threadContext correctly includes comment chain", async () => {
    const minaComment: Comment = {
      id: "mina-c1",
      personaId: "mina",
      content: "Great post!",
      createdAt: "2024-01-01T00:00:00.000Z",
    };
    const userReply: Comment = {
      id: "user-r1",
      personaId: "user",
      content: "What part did you like?",
      createdAt: "2024-01-01T01:00:00.000Z",
      parentId: "mina-c1",
    };
    writeTestComments(TEST_POST_ID, [minaComment, userReply]);
    mockSendMessage.mockResolvedValue("Here is my answer");

    await generateReply(TEST_POST_ID, TEST_POST, userReply);

    const userMessage = mockSendMessage.mock.calls[0][0];
    expect(userMessage).toContain("Comment Context");
    expect(userMessage).toContain("Mina: Great post!");
    expect(userMessage).toContain("user: What part did you like?");
  });
});

// ===================================================================
// 4. Edge Cases & Integration Scenarios
// ===================================================================
describe("Edge cases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReadPersonas.mockReturnValue(MOCK_PERSONAS as ReturnType<typeof readPersonas>);
    writeTestComments(TEST_POST_ID, []);
  });

  afterEach(() => {
    cleanupTestFile(TEST_POST_ID);
  });

  it("skips non-existent personaId in feedbackOrder", async () => {
    mockReadPersonas.mockReturnValue({
      ...MOCK_PERSONAS,
      feedbackOrder: ["mina", "ghost", "jihoon"],
    } as ReturnType<typeof readPersonas>);
    mockSendMessage.mockResolvedValue("Comment");

    await generateInitialComments(TEST_POST_ID, TEST_POST);

    const comments = readTestComments(TEST_POST_ID);
    const initialComments = comments.filter((c) => !c.parentId);
    // "ghost" is skipped, only mina and jihoon are created
    expect(initialComments.map((c) => c.personaId)).toEqual(
      expect.arrayContaining(["mina", "jihoon"])
    );
    expect(initialComments.find((c) => c.personaId === "ghost")).toBeUndefined();
  });

  it("no comments generated when personas is empty", async () => {
    mockReadPersonas.mockReturnValue({
      personas: [],
      feedbackOrder: [],
      feedbackOrderReason: "",
    });
    mockSendMessage.mockResolvedValue("Comment");

    await generateInitialComments(TEST_POST_ID, TEST_POST);

    const comments = readTestComments(TEST_POST_ID);
    expect(comments).toHaveLength(0);
    expect(mockSendMessage).not.toHaveBeenCalled();
  });

  it("LLM response whitespace is trimmed", async () => {
    mockSendMessage.mockResolvedValue("  Comment with whitespace  \n ");

    const userComment: Comment = {
      id: "user-c1",
      personaId: "user",
      content: "Question",
      createdAt: "2024-01-01T00:00:00.000Z",
    };
    writeTestComments(TEST_POST_ID, [userComment]);

    const replies = await generateReply(TEST_POST_ID, TEST_POST, userComment);

    expect(replies[0].content).toBe("Comment with whitespace");
  });

  it("can run generateReply after generateInitialComments", async () => {
    let callIdx = 0;
    mockSendMessage.mockImplementation(async () => {
      callIdx++;
      return `Response ${callIdx}`;
    });

    // Step 1: Generate initial comments
    await generateInitialComments(TEST_POST_ID, TEST_POST);
    const afterInitial = readTestComments(TEST_POST_ID);
    expect(afterInitial.length).toBe(7); // 5 + 2

    // Step 2: Add user comment
    const userComment: Comment = {
      id: "user-c1",
      personaId: "user",
      content: "Thanks for the great feedback",
      createdAt: "2024-01-02T00:00:00.000Z",
    };
    afterInitial.push(userComment);
    writeTestComments(TEST_POST_ID, afterInitial);

    // Step 3: Generate AI reply
    const replies = await generateReply(TEST_POST_ID, TEST_POST, userComment);
    expect(replies).toHaveLength(1);

    // Final: Total 9 (7 + user + AI reply)
    const finalComments = readTestComments(TEST_POST_ID);
    expect(finalComments).toHaveLength(9);
  });
});

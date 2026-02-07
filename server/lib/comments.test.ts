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
    { id: "mina", name: "민아", role: "첫 번째 독자", emoji: "💛", color: "#CA8A04", bgColor: "#FEFCE8", borderColor: "#FEF08A", promptFile: "mina-reader.md", promptContent: "민아 프롬프트" },
    { id: "eunseo", name: "은서", role: "글쓰기 동료", emoji: "✒️", color: "#7C3AED", bgColor: "#FAF5FF", borderColor: "#DDD6FE", promptFile: "eunseo-writer.md", promptContent: "은서 프롬프트" },
    { id: "jihoon", name: "지훈", role: "실무 멘토", emoji: "⚖️", color: "#6B7280", bgColor: "#F9FAFB", borderColor: "#E5E7EB", promptFile: "jihoon-mentor.md", promptContent: "지훈 프롬프트" },
    { id: "suhyun", name: "수현", role: "논증 비평가", emoji: "🔬", color: "#2563EB", bgColor: "#EFF6FF", borderColor: "#BFDBFE", promptFile: "suhyun-critic.md", promptContent: "수현 프롬프트" },
    { id: "doyun", name: "도윤", role: "반대론자", emoji: "⚡", color: "#DC2626", bgColor: "#FEF2F2", borderColor: "#FECACA", promptFile: "doyun-contrarian.md", promptContent: "도윤 프롬프트" },
  ],
  feedbackOrder: ["mina", "eunseo", "jihoon", "suhyun", "doyun"],
  feedbackOrderReason: "테스트",
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
const TEST_POST = { title: "테스트 글", content: "이것은 테스트 내용입니다." };

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
// 1. 순수 함수 테스트
// ===================================================================
describe("buildSystemPrompt", () => {
  it("initial 상황 프롬프트를 올바르게 조합한다", () => {
    const result = buildSystemPrompt("initial", "페르소나 내용");
    expect(result).toContain("첫 댓글을 남기는 독자");
    expect(result).toContain("1~3문장");
    expect(result).toContain("댓글 텍스트만 출력");
    expect(result).toContain("---");
    expect(result).toContain("페르소나 내용");
  });

  it("reply 상황 프롬프트를 올바르게 조합한다", () => {
    const result = buildSystemPrompt("reply", "페르소나 내용");
    expect(result).toContain("댓글에 답하는");
    expect(result).toContain("대댓글");
    expect(result).toContain("---");
    expect(result).toContain("페르소나 내용");
  });

  it("빈 promptContent도 정상 처리한다", () => {
    const result = buildSystemPrompt("initial", "");
    expect(result).toContain("---");
    expect(result.endsWith("\n\n---\n\n")).toBe(true);
  });
});

describe("buildUserMessage", () => {
  it("threadContext 없이 포스트 내용만 포함한다", () => {
    const result = buildUserMessage({ title: "제목", content: "본문" });
    expect(result).toBe("# 제목\n\n본문");
  });

  it("threadContext가 있으면 댓글 맥락 섹션을 추가한다", () => {
    const result = buildUserMessage({ title: "제목", content: "본문" }, "민아: 좋은 글이네요");
    expect(result).toContain("# 제목\n\n본문");
    expect(result).toContain("---");
    expect(result).toContain("## 댓글 맥락");
    expect(result).toContain("민아: 좋은 글이네요");
  });

  it("빈 threadContext는 맥락 섹션을 추가하지 않는다", () => {
    const result = buildUserMessage({ title: "제목", content: "본문" }, "");
    // 빈 문자열은 falsy이므로 맥락이 추가되지 않아야 함
    expect(result).toBe("# 제목\n\n본문");
  });
});

describe("buildThreadContext", () => {
  const personaMap = new Map([
    ["mina", "민아"],
    ["doyun", "도윤"],
    ["user", "사용자"],
  ]);

  it("단일 댓글의 컨텍스트를 올바르게 생성한다", () => {
    const comments: Comment[] = [
      { id: "c1", personaId: "mina", content: "좋은 글이에요!", createdAt: "2024-01-01" },
    ];
    const result = buildThreadContext(comments, "c1", personaMap);
    expect(result).toBe("민아: 좋은 글이에요!");
  });

  it("부모-자식 체인을 올바른 순서로 추출한다", () => {
    const comments: Comment[] = [
      { id: "c1", personaId: "mina", content: "좋은 글이에요!", createdAt: "2024-01-01" },
      { id: "c2", personaId: "doyun", content: "정말요?", createdAt: "2024-01-02", parentId: "c1" },
      { id: "c3", personaId: "user", content: "감사합니다", createdAt: "2024-01-03", parentId: "c2" },
    ];
    const result = buildThreadContext(comments, "c3", personaMap);
    expect(result).toBe("민아: 좋은 글이에요!\n\n도윤: 정말요?\n\n사용자: 감사합니다");
  });

  it("personaMap에 없는 personaId는 그대로 표시한다", () => {
    const comments: Comment[] = [
      { id: "c1", personaId: "unknown", content: "안녕", createdAt: "2024-01-01" },
    ];
    const result = buildThreadContext(comments, "c1", personaMap);
    expect(result).toBe("unknown: 안녕");
  });

  it("존재하지 않는 targetCommentId는 빈 문자열을 반환한다", () => {
    const comments: Comment[] = [
      { id: "c1", personaId: "mina", content: "좋은 글!", createdAt: "2024-01-01" },
    ];
    const result = buildThreadContext(comments, "nonexistent", personaMap);
    expect(result).toBe("");
  });

  it("관련 없는 댓글은 체인에 포함하지 않는다", () => {
    const comments: Comment[] = [
      { id: "c1", personaId: "mina", content: "첫 댓글", createdAt: "2024-01-01" },
      { id: "c2", personaId: "doyun", content: "두 번째 댓글", createdAt: "2024-01-02" },
      { id: "c3", personaId: "user", content: "c1에 대한 답글", createdAt: "2024-01-03", parentId: "c1" },
    ];
    const result = buildThreadContext(comments, "c3", personaMap);
    // c2는 체인에 포함되지 않아야 함
    expect(result).not.toContain("두 번째 댓글");
    expect(result).toBe("민아: 첫 댓글\n\n사용자: c1에 대한 답글");
  });
});

// ===================================================================
// 2. generateInitialComments 시나리오 테스트
// ===================================================================
describe("generateInitialComments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReadPersonas.mockReturnValue(MOCK_PERSONAS as ReturnType<typeof readPersonas>);
    // 댓글 파일 초기화
    writeTestComments(TEST_POST_ID, []);
  });

  afterEach(() => {
    cleanupTestFile(TEST_POST_ID);
  });

  it("feedbackOrder 순서대로 5개의 초기 댓글을 생성한다", async () => {
    let callCount = 0;
    mockSendMessage.mockImplementation(async () => {
      callCount++;
      return `댓글 ${callCount}번`;
    });

    await generateInitialComments(TEST_POST_ID, TEST_POST);

    const comments = readTestComments(TEST_POST_ID);
    // 5개 초기 + 2개 inter-persona
    expect(comments.length).toBe(7);

    // 처음 5개가 feedbackOrder 순서인지 확인
    const initialComments = comments.filter((c) => !c.parentId);
    expect(initialComments).toHaveLength(5);
    expect(initialComments[0].personaId).toBe("mina");
    expect(initialComments[1].personaId).toBe("eunseo");
    expect(initialComments[2].personaId).toBe("jihoon");
    expect(initialComments[3].personaId).toBe("suhyun");
    expect(initialComments[4].personaId).toBe("doyun");
  });

  it("각 초기 댓글에 올바른 시스템 프롬프트(initial + 페르소나)를 사용한다", async () => {
    mockSendMessage.mockResolvedValue("테스트 댓글");

    await generateInitialComments(TEST_POST_ID, TEST_POST);

    // 처음 5번 호출은 initial 프롬프트
    for (let i = 0; i < 5; i++) {
      const call = mockSendMessage.mock.calls[i];
      const systemPrompt = call[1]?.system as string;
      expect(systemPrompt).toContain("첫 댓글을 남기는 독자");
    }

    // 첫 번째 호출은 민아 프롬프트를 포함
    expect(mockSendMessage.mock.calls[0][1]?.system).toContain("민아 프롬프트");
  });

  it("inter-persona 대댓글 2개를 생성한다", async () => {
    mockSendMessage.mockResolvedValue("테스트 댓글");

    await generateInitialComments(TEST_POST_ID, TEST_POST);

    const comments = readTestComments(TEST_POST_ID);
    const replies = comments.filter((c) => c.parentId);
    expect(replies).toHaveLength(2);

    // 대댓글의 parentId가 실제 존재하는 댓글을 가리키는지 확인
    for (const reply of replies) {
      const parent = comments.find((c) => c.id === reply.parentId);
      expect(parent).toBeDefined();
      expect(parent!.parentId).toBeUndefined(); // 부모는 top-level이어야 함
    }
  });

  it("inter-persona 대댓글은 reply 프롬프트를 사용한다", async () => {
    mockSendMessage.mockResolvedValue("테스트 댓글");

    await generateInitialComments(TEST_POST_ID, TEST_POST);

    // 6번째, 7번째 호출이 reply 프롬프트
    for (let i = 5; i < 7; i++) {
      const call = mockSendMessage.mock.calls[i];
      const systemPrompt = call[1]?.system as string;
      expect(systemPrompt).toContain("댓글에 답하는");
    }
  });

  it("LLM이 빈 문자열을 반환하면 댓글을 저장하지 않는다", async () => {
    mockSendMessage
      .mockResolvedValueOnce("민아 댓글")        // mina OK
      .mockResolvedValueOnce("   ")              // eunseo 빈 문자열(공백만)
      .mockResolvedValueOnce("지훈 댓글")        // jihoon OK
      .mockResolvedValueOnce("")                 // suhyun 빈
      .mockResolvedValueOnce("도윤 댓글")        // doyun OK
      .mockResolvedValue("대댓글");              // inter-persona

    await generateInitialComments(TEST_POST_ID, TEST_POST);

    const comments = readTestComments(TEST_POST_ID);
    const initialComments = comments.filter((c) => !c.parentId);
    // eunseo(공백), suhyun(빈)은 저장되지 않아야 함
    expect(initialComments).toHaveLength(3);
    expect(initialComments.map((c) => c.personaId)).toEqual(["mina", "jihoon", "doyun"]);
  });

  it("일부 LLM 호출이 실패해도 나머지 댓글은 정상 저장된다", async () => {
    mockSendMessage
      .mockResolvedValueOnce("민아 댓글")
      .mockRejectedValueOnce(new Error("API 오류"))  // eunseo 실패
      .mockResolvedValueOnce("지훈 댓글")
      .mockResolvedValueOnce("수현 댓글")
      .mockRejectedValueOnce(new Error("API 오류"))  // doyun 실패
      .mockResolvedValue("대댓글");

    await generateInitialComments(TEST_POST_ID, TEST_POST);

    const comments = readTestComments(TEST_POST_ID);
    const initialComments = comments.filter((c) => !c.parentId);
    expect(initialComments).toHaveLength(3);
    expect(initialComments.map((c) => c.personaId)).toEqual(["mina", "jihoon", "suhyun"]);
  });

  it("모든 LLM 호출이 실패해도 에러를 throw하지 않는다", async () => {
    mockSendMessage.mockRejectedValue(new Error("전체 실패"));

    await expect(generateInitialComments(TEST_POST_ID, TEST_POST)).resolves.toBeUndefined();

    const comments = readTestComments(TEST_POST_ID);
    expect(comments).toHaveLength(0);
  });

  it("각 댓글에 고유 id와 createdAt이 있다", async () => {
    mockSendMessage.mockResolvedValue("테스트 댓글");

    await generateInitialComments(TEST_POST_ID, TEST_POST);

    const comments = readTestComments(TEST_POST_ID);
    const ids = comments.map((c) => c.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(comments.length); // 모두 고유

    for (const c of comments) {
      expect(c.createdAt).toBeTruthy();
      expect(new Date(c.createdAt).toISOString()).toBe(c.createdAt);
    }
  });

  it("maxTokens: 300으로 LLM을 호출한다", async () => {
    mockSendMessage.mockResolvedValue("테스트");

    await generateInitialComments(TEST_POST_ID, TEST_POST);

    for (const call of mockSendMessage.mock.calls) {
      expect(call[1]?.maxTokens).toBe(300);
    }
  });
});

// ===================================================================
// 3. generateReply 시나리오 테스트
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

  it("사용자가 AI 댓글에 답글을 달면 해당 페르소나가 응답한다", async () => {
    // 기존 댓글: 민아의 top-level + 사용자의 답글
    const minaComment: Comment = {
      id: "mina-c1",
      personaId: "mina",
      content: "좋은 글이에요!",
      createdAt: "2024-01-01T00:00:00.000Z",
    };
    const userReply: Comment = {
      id: "user-r1",
      personaId: "user",
      content: "감사합니다!",
      createdAt: "2024-01-01T01:00:00.000Z",
      parentId: "mina-c1",
    };
    writeTestComments(TEST_POST_ID, [minaComment, userReply]);

    mockSendMessage.mockResolvedValue("민아가 답합니다");

    const replies = await generateReply(TEST_POST_ID, TEST_POST, userReply);

    expect(replies).toHaveLength(1);
    expect(replies[0].personaId).toBe("mina"); // 민아가 응답
    expect(replies[0].content).toBe("민아가 답합니다");
    expect(replies[0].parentId).toBe("mina-c1"); // 원래 민아 댓글에 대한 답글
  });

  it("사용자가 top-level 댓글을 달면 랜덤 페르소나가 응답한다", async () => {
    const userComment: Comment = {
      id: "user-c1",
      personaId: "user",
      content: "좋은 글이네요",
      createdAt: "2024-01-01T00:00:00.000Z",
    };
    writeTestComments(TEST_POST_ID, [userComment]);

    mockSendMessage.mockResolvedValue("AI 응답");

    const replies = await generateReply(TEST_POST_ID, TEST_POST, userComment);

    expect(replies).toHaveLength(1);
    // 페르소나 5명 중 하나여야 함
    const personaIds = MOCK_PERSONAS.personas.map((p) => p.id);
    expect(personaIds).toContain(replies[0].personaId);
    expect(replies[0].parentId).toBe("user-c1"); // 사용자 댓글을 부모로
  });

  it("AI 응답에 reply 시스템 프롬프트를 사용한다", async () => {
    const userComment: Comment = {
      id: "user-c1",
      personaId: "user",
      content: "질문입니다",
      createdAt: "2024-01-01T00:00:00.000Z",
    };
    writeTestComments(TEST_POST_ID, [userComment]);
    mockSendMessage.mockResolvedValue("AI 응답");

    await generateReply(TEST_POST_ID, TEST_POST, userComment);

    const systemPrompt = mockSendMessage.mock.calls[0][1]?.system as string;
    expect(systemPrompt).toContain("댓글에 답하는");
  });

  it("LLM이 빈 문자열을 반환하면 빈 배열을 반환한다", async () => {
    const userComment: Comment = {
      id: "user-c1",
      personaId: "user",
      content: "질문",
      createdAt: "2024-01-01T00:00:00.000Z",
    };
    writeTestComments(TEST_POST_ID, [userComment]);
    mockSendMessage.mockResolvedValue("   ");

    const replies = await generateReply(TEST_POST_ID, TEST_POST, userComment);

    expect(replies).toHaveLength(0);
  });

  it("LLM 호출 실패 시 빈 배열을 반환하고 에러를 throw하지 않는다", async () => {
    const userComment: Comment = {
      id: "user-c1",
      personaId: "user",
      content: "질문",
      createdAt: "2024-01-01T00:00:00.000Z",
    };
    writeTestComments(TEST_POST_ID, [userComment]);
    mockSendMessage.mockRejectedValue(new Error("API 다운"));

    const replies = await generateReply(TEST_POST_ID, TEST_POST, userComment);

    expect(replies).toHaveLength(0);
  });

  it("사용자가 다른 사용자 댓글에 답글을 달면 랜덤 페르소나가 응답한다", async () => {
    const userComment1: Comment = {
      id: "user-c1",
      personaId: "user",
      content: "첫 댓글",
      createdAt: "2024-01-01T00:00:00.000Z",
    };
    const userReply: Comment = {
      id: "user-c2",
      personaId: "user",
      content: "자기 답글",
      createdAt: "2024-01-01T01:00:00.000Z",
      parentId: "user-c1",
    };
    writeTestComments(TEST_POST_ID, [userComment1, userReply]);
    mockSendMessage.mockResolvedValue("AI 응답");

    const replies = await generateReply(TEST_POST_ID, TEST_POST, userReply);

    expect(replies).toHaveLength(1);
    const personaIds = MOCK_PERSONAS.personas.map((p) => p.id);
    expect(personaIds).toContain(replies[0].personaId);
  });

  it("생성된 AI 답글이 파일에도 저장된다", async () => {
    const userComment: Comment = {
      id: "user-c1",
      personaId: "user",
      content: "좋은 글",
      createdAt: "2024-01-01T00:00:00.000Z",
    };
    writeTestComments(TEST_POST_ID, [userComment]);
    mockSendMessage.mockResolvedValue("파일에 저장되는 답글");

    await generateReply(TEST_POST_ID, TEST_POST, userComment);

    const allComments = readTestComments(TEST_POST_ID);
    const aiComment = allComments.find((c) => c.personaId !== "user");
    expect(aiComment).toBeDefined();
    expect(aiComment!.content).toBe("파일에 저장되는 답글");
  });

  it("threadContext에 댓글 체인이 올바르게 포함된다", async () => {
    const minaComment: Comment = {
      id: "mina-c1",
      personaId: "mina",
      content: "좋은 글이에요!",
      createdAt: "2024-01-01T00:00:00.000Z",
    };
    const userReply: Comment = {
      id: "user-r1",
      personaId: "user",
      content: "어떤 부분이 좋았나요?",
      createdAt: "2024-01-01T01:00:00.000Z",
      parentId: "mina-c1",
    };
    writeTestComments(TEST_POST_ID, [minaComment, userReply]);
    mockSendMessage.mockResolvedValue("답변입니다");

    await generateReply(TEST_POST_ID, TEST_POST, userReply);

    const userMessage = mockSendMessage.mock.calls[0][0];
    expect(userMessage).toContain("댓글 맥락");
    expect(userMessage).toContain("민아: 좋은 글이에요!");
    expect(userMessage).toContain("user: 어떤 부분이 좋았나요?");
  });
});

// ===================================================================
// 4. 엣지 케이스 & 통합 시나리오
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

  it("feedbackOrder에 존재하지 않는 personaId가 있으면 건너뛴다", async () => {
    mockReadPersonas.mockReturnValue({
      ...MOCK_PERSONAS,
      feedbackOrder: ["mina", "ghost", "jihoon"],
    } as ReturnType<typeof readPersonas>);
    mockSendMessage.mockResolvedValue("댓글");

    await generateInitialComments(TEST_POST_ID, TEST_POST);

    const comments = readTestComments(TEST_POST_ID);
    const initialComments = comments.filter((c) => !c.parentId);
    // "ghost"는 건너뛰고 mina, jihoon만 생성
    expect(initialComments.map((c) => c.personaId)).toEqual(
      expect.arrayContaining(["mina", "jihoon"])
    );
    expect(initialComments.find((c) => c.personaId === "ghost")).toBeUndefined();
  });

  it("personas가 비어있으면 댓글이 생성되지 않는다", async () => {
    mockReadPersonas.mockReturnValue({
      personas: [],
      feedbackOrder: [],
      feedbackOrderReason: "",
    });
    mockSendMessage.mockResolvedValue("댓글");

    await generateInitialComments(TEST_POST_ID, TEST_POST);

    const comments = readTestComments(TEST_POST_ID);
    expect(comments).toHaveLength(0);
    expect(mockSendMessage).not.toHaveBeenCalled();
  });

  it("LLM 응답의 앞뒤 공백이 trim된다", async () => {
    mockSendMessage.mockResolvedValue("  공백이 있는 댓글  \n ");

    const userComment: Comment = {
      id: "user-c1",
      personaId: "user",
      content: "질문",
      createdAt: "2024-01-01T00:00:00.000Z",
    };
    writeTestComments(TEST_POST_ID, [userComment]);

    const replies = await generateReply(TEST_POST_ID, TEST_POST, userComment);

    expect(replies[0].content).toBe("공백이 있는 댓글");
  });

  it("generateInitialComments 후 generateReply를 연속 실행할 수 있다", async () => {
    let callIdx = 0;
    mockSendMessage.mockImplementation(async () => {
      callIdx++;
      return `응답 ${callIdx}`;
    });

    // 1단계: 초기 댓글 생성
    await generateInitialComments(TEST_POST_ID, TEST_POST);
    const afterInitial = readTestComments(TEST_POST_ID);
    expect(afterInitial.length).toBe(7); // 5 + 2

    // 2단계: 사용자 댓글 추가
    const userComment: Comment = {
      id: "user-c1",
      personaId: "user",
      content: "좋은 피드백 감사합니다",
      createdAt: "2024-01-02T00:00:00.000Z",
    };
    afterInitial.push(userComment);
    writeTestComments(TEST_POST_ID, afterInitial);

    // 3단계: AI 답글 생성
    const replies = await generateReply(TEST_POST_ID, TEST_POST, userComment);
    expect(replies).toHaveLength(1);

    // 최종: 총 9개 (7 + user + AI reply)
    const finalComments = readTestComments(TEST_POST_ID);
    expect(finalComments).toHaveLength(9);
  });
});

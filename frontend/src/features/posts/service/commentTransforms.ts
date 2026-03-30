import type { PersonaInfo } from "../../personas/model/types";
import type { Comment } from "../model/types";
import type { ServerComment } from "../model/types";

type PersonaMap = Map<string, PersonaInfo>;

export function transformComments(
  serverComments: ServerComment[],
  postId: string,
  personaMap: PersonaMap
): Comment[] {
  return serverComments.map((c) => {
    const persona = personaMap.get(c.personaId);
    return {
      id: c.id,
      postId,
      persona: c.personaId === "user" ? "Me" : persona?.name || c.personaId,
      content: c.content,
      createdAt: c.createdAt,
      isAI: c.personaId !== "user",
      parentId: c.parentId,
      personaEmoji: persona?.emoji,
      personaColor: persona?.color,
      personaBgColor: persona?.bgColor,
      personaBorderColor: persona?.borderColor,
    };
  });
}

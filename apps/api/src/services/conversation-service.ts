import { db } from "../db";
import { conversationHistory, interviewSessions } from "../db/schema";
import { eq, desc } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface ConversationEntry {
  question: string;
  answer: string;
}

export class ConversationService {
  /**
   * Создать новую сессию интервью
   */
  async createSession(): Promise<string> {
    const sessionId = randomUUID();

    await db.insert(interviewSessions).values({
      sessionId,
    });

    return sessionId;
  }

  /**
   * Сохранить вопрос в базу данных
   */
  async saveQuestion(
    sessionId: string,
    question: string,
    mode: "general" | "interview" | "algorithm" | "cheatsheet" = "interview"
  ): Promise<number> {
    const result = await db
      .insert(conversationHistory)
      .values({
        sessionId,
        question,
        mode,
      })
      .returning({ id: conversationHistory.id });

    return result[0].id;
  }

  /**
   * Обновить ответ на вопрос
   */
  async updateAnswer(id: number, answer: string): Promise<void> {
    await db
      .update(conversationHistory)
      .set({ answer })
      .where(eq(conversationHistory.id, id));
  }

  /**
   * Получить контекст беседы (последние N вопросов и ответов)
   */
  async getContext(
    sessionId: string,
    limit: number = 5
  ): Promise<ConversationEntry[]> {
    const history = await db
      .select({
        question: conversationHistory.question,
        answer: conversationHistory.answer,
      })
      .from(conversationHistory)
      .where(eq(conversationHistory.sessionId, sessionId))
      .orderBy(desc(conversationHistory.createdAt))
      .limit(limit);

    // Возвращаем в хронологическом порядке (старые -> новые)
    return history
      .reverse()
      .filter((entry): entry is ConversationEntry => entry.answer !== null);
  }

  /**
   * Получить всю историю сессии
   */
  async getSessionHistory(sessionId: string) {
    return await db
      .select()
      .from(conversationHistory)
      .where(eq(conversationHistory.sessionId, sessionId))
      .orderBy(conversationHistory.createdAt);
  }

  /**
   * Очистить историю сессии
   */
  async clearSession(sessionId: string): Promise<void> {
    await db
      .delete(conversationHistory)
      .where(eq(conversationHistory.sessionId, sessionId));
  }
}

import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// Таблица для хранения сессий интервью
export const interviewSessions = sqliteTable('interview_sessions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sessionId: text('session_id').notNull().unique(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

// Таблица для хранения вопросов и ответов
export const conversationHistory = sqliteTable('conversation_history', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sessionId: text('session_id').notNull(),
  question: text('question').notNull(),
  answer: text('answer'),
  mode: text('mode').notNull().default('interview'), // 'general' | 'interview' | 'algorithm' | 'cheatsheet'
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

import Dexie, { Table } from 'dexie';

export interface DBSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  pinned?: boolean;
}

export interface DBCitation {
  id: string;
  doc: string;
  page: string | number;
  section: string;
  snippet: string;
  score: number;
}

export interface DBMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: DBCitation[];
  suggestions?: string[];
  createdAt: number;
  dictated?: boolean;
  language?: string;
  translatedContent?: string;
  translatedLanguage?: string;
  feedback?: number;
}

export class ChatDatabase extends Dexie {
  sessions!: Table<DBSession, string>;
  messages!: Table<DBMessage, string>;

  constructor() {
    super('KSRCE_Handbook_DB');
    this.version(1).stores({
      sessions: 'id, title, createdAt, updatedAt, pinned',
      messages: 'id, sessionId, role, createdAt',
    });
  }
}

export const db = new ChatDatabase();

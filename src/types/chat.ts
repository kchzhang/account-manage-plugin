export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  reasoning_content?: string;
}

export interface ChatChunkData {
  content?: string;
  reasoning_content?: string;
  /** 流结束标记，最后一次 yield 时为 true */
  done?: boolean;
  /** 流结束时的完整文本 */
  fullText?: string;
  /** 流被主动取消 */
  cancelled?: boolean;
}

export interface ChatOptions {
  temperature?: number;
  max_tokens?: number;
  signal?: AbortSignal;
}

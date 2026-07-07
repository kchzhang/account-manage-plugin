import type { ModelConfig } from '@/types/model';
import { getActiveModel } from '@/utils/modelStorage';
import type { ChatMessage, ChatOptions, ChatChunkData } from '@/types/chat';

export class ChatClient {
  private config: ModelConfig;
  private abortController: AbortController | null = null;

  constructor(config: ModelConfig) {
    this.config = config;
  }

  /** 从当前激活的模型创建实例 */
  static async fromActiveModel(): Promise<ChatClient> {
    const model = await getActiveModel();
    if (!model) throw new Error('未找到激活的模型配置');
    return new ChatClient(model);
  }

  /** 流式对话（async generator，可用 for await...of 消费） */
  async *chatStream(
    messages: ChatMessage[],
    options?: ChatOptions,
  ): AsyncGenerator<ChatChunkData, void, undefined> {
    this.abortController = new AbortController();
    const signal = options?.signal ?? this.abortController.signal;
    let fullText = '';

    try {
      const response = await fetch(this.buildUrl(), {
        method: 'POST',
        headers: this.buildHeaders(),
        body: JSON.stringify(this.buildBody(messages, options, true)),
        signal,
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`请求失败: ${response.status} ${text}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('无法获取响应流');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        // 保留最后一行（可能不完整）
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const parsed = this.parseSSELine(line);
          if (!parsed) continue;

          // 跳过初始化帧（role:"assistant" 且 content 和 reasoning_content 均为空）
          const { content, reasoning_content, finish_reason } = parsed;
          if (finish_reason === '' && !content && !reasoning_content) continue;

          if (content || reasoning_content) {
            const chunk: ChatChunkData = {};
            if (content) chunk.content = content;
            if (reasoning_content) chunk.reasoning_content = reasoning_content;
            fullText += content ?? '';
            yield chunk;
          }

          if (finish_reason && finish_reason !== '') {
            yield { done: true, fullText };
            return;
          }
        }
      }

      // 处理 buffer 中剩余内容
      if (buffer.trim()) {
        const parsed = this.parseSSELine(buffer);
        if (parsed && (parsed.content || parsed.reasoning_content)) {
          const chunk: ChatChunkData = {};
          if (parsed.content) chunk.content = parsed.content;
          if (parsed.reasoning_content) chunk.reasoning_content = parsed.reasoning_content;
          fullText += parsed.content ?? '';
          yield chunk;
        }
      }

      yield { done: true, fullText };
    } catch (err) {
      // 主动取消：yield 取消标记后优雅退出
      if (signal.aborted) {
        yield { done: true, cancelled: true, fullText };
        return;
      }
      throw err;
    } finally {
      this.abortController = null;
    }
  }

  /** 非流式对话 */
  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<string> {
    this.abortController = new AbortController();
    const signal = options?.signal ?? this.abortController.signal;

    try {
      const response = await fetch(this.buildUrl(), {
        method: 'POST',
        headers: this.buildHeaders(),
        body: JSON.stringify(this.buildBody(messages, options, false)),
        signal,
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`请求失败: ${response.status} ${text}`);
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content ?? '';
    } finally {
      this.abortController = null;
    }
  }

  /** 中止当前请求 */
  abort(): void {
    this.abortController?.abort();
    this.abortController = null;
  }

  private buildUrl(): string {
    const base = this.config.baseUrl.replace(/\/+$/, '');
    return `${base}/chat/completions`;
  }

  private buildHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.config.apiKey}`,
    };
  }

  private buildBody(
    messages: ChatMessage[],
    options?: ChatOptions,
    stream?: boolean,
  ): Record<string, unknown> {
    const body: Record<string, unknown> = {
      model: this.config.modelName,
      messages: messages.map(({ role, content }) => ({ role, content })),
      stream: stream ?? false,
    };
    if (options?.temperature !== undefined) body.temperature = options.temperature;
    if (options?.max_tokens !== undefined) body.max_tokens = options.max_tokens;
    return body;
  }

  /** 解析单行 SSE 数据，返回 delta 中的 content/reasoning_content/finish_reason */
  private parseSSELine(
    line: string,
  ): { content?: string; reasoning_content?: string; finish_reason?: string } | null {
    const trimmed = line.trim();
    if (!trimmed.startsWith('data:')) return null;

    const data = trimmed.slice(5).trim();
    if (data === '[DONE]') return { finish_reason: 'stop' };

    try {
      const json = JSON.parse(data);
      const delta = json.choices?.[0]?.delta;
      const finish_reason = json.choices?.[0]?.finish_reason ?? '';
      if (!delta) return null;
      return {
        content: delta.content ?? undefined,
        reasoning_content: delta.reasoning_content ?? undefined,
        finish_reason,
      };
    } catch {
      return null;
    }
  }
}

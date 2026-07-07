/**
 * 模块之间通信（content script ↔ insert script）
 */
interface MessageEventData {
  type: string;
  data: any;
}

export function sendMessage(typeName: string, params = {}) {
  window.postMessage({
    type: typeName,
    data: params,
  });
}

export function receiveMessage(callback: (event: MessageEvent<MessageEventData>) => void) {
  window.addEventListener("message", callback);
}

// Chrome 插件 background service worker — 仅做消息转发
import { MSG_TYPE_PING, MSG_TYPE_LOGIN_REQUEST } from '@/constants/protocol';

console.log('Background service worker loaded');

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === MSG_TYPE_PING) {
    // 探针转发：向目标 tab 发送 PING，确认 content script 就绪
    const { tabId } = message.data;
    console.log('[Background] 收到 PING, tabId=%d', tabId);

    chrome.tabs.sendMessage(tabId, { type: MSG_TYPE_PING }, { frameId: 0 }, (response: any) => {
      if (chrome.runtime.lastError) {
        console.log('[Background] PING 失败, lastError=%s', chrome.runtime.lastError.message);
        sendResponse({ ready: false, error: chrome.runtime.lastError.message });
      } else {
        console.log('[Background] PONG 收到, response=%s', JSON.stringify(response));
        sendResponse({ ready: response?.ready ?? false, insertInjected: response?.insertInjected ?? false });
      }
    });

    return true; // 异步 sendResponse
  }

  if (message.type === MSG_TYPE_LOGIN_REQUEST) {
    const { tabId, username, password } = message.data;
    console.log('[Background] 收到 LOGIN_REQUEST, tabId=%d, username=%s, 来自 popup(senderId=%s)', tabId, username, sender.id);

    chrome.tabs.sendMessage(tabId, {
      type: MSG_TYPE_LOGIN_REQUEST,
      data: { username, password, autoSubmit: true },
    }, { frameId: 0 }, (response: any) => {
      if (chrome.runtime.lastError) {
        console.log('[Background] tabs.sendMessage 失败, lastError=%s', chrome.runtime.lastError.message);
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        console.log('[Background] tabs.sendMessage 成功, response=%s', JSON.stringify(response));
        sendResponse({ success: true, data: response });
      }
    });

    return true; // 异步 sendResponse
  }
});

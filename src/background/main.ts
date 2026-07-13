// Chrome 插件 background service worker — 消息转发 + 凭据数据服务
import { MSG_TYPE_PING, MSG_TYPE_LOGIN_REQUEST, MSG_TYPE_CREDENTIAL_REQUEST, AUTO_LOGIN_PARAM, AUTO_LOGIN_ACCOUNT_ID_PARAM } from '@/constants/protocol';
import { isSamePage } from '@/utils/urlMatch';

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

  if (message.type === MSG_TYPE_CREDENTIAL_REQUEST) {
    // 凭据数据服务：Insert 主动 Pull，Background 从 Storage 匹配账号
    const { url, accountId } = message.data;
    console.log('[Background] 收到 CREDENTIAL_REQUEST, url=%s, accountId=%s', url, accountId);

    chrome.storage.local.get(['account_data'], (result) => {
      const store = result['account_data'] as { accounts: Array<{ id: string; name: string; username: string; password: string; url: string }> } | undefined;
      const accounts = store?.accounts || [];

      let matched: { id: string; name: string; username: string; password: string; url: string } | undefined;

      // 优先用 accountId 精确匹配
      if (accountId) {
        matched = accounts.find(a => a.id === accountId);
        console.log('[Background] accountId 精确匹配: found=%s', matched ? matched.name : '无');
      }

      // accountId 未匹配时，用 URL 匹配
      if (!matched && url) {
        // 用 URL API 清理临时标识参数（比正则更可靠，无边界缺陷）
        let cleanUrl = url;
        try {
          const urlObj = new URL(url);
          urlObj.searchParams.delete(AUTO_LOGIN_PARAM);
          urlObj.searchParams.delete(AUTO_LOGIN_ACCOUNT_ID_PARAM);
          cleanUrl = urlObj.toString();
        } catch {
          // URL 解析失败时用原始 URL 直接匹配
        }
        matched = accounts.find(a => a.url && isSamePage(cleanUrl, a.url));
        console.log('[Background] URL 匹配: cleanUrl=%s, found=%s', cleanUrl, matched ? matched.name : '无');
      }

      if (matched) {
        console.log('[Background] CREDENTIAL_RESPONSE — 匹配账号: name=%s username=%s', matched.name, matched.username);
        sendResponse({
          matched: true,
          data: { username: matched.username, password: matched.password, autoSubmit: true },
        });
      } else {
        console.log('[Background] CREDENTIAL_RESPONSE — 无匹配账号');
        sendResponse({ matched: false });
      }
    });

    return true; // 异步 sendResponse
  }
});

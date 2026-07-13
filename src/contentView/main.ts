// ── Auto-login 桥接 ──
import { MSG_TYPE_PING, MSG_TYPE_LOGIN_REQUEST, MSG_TYPE_LOGIN_RESULT, MSG_TYPE_CREDENTIAL_REQUEST, MSG_TYPE_CREDENTIAL_RESPONSE, MSG_SOURCE_CONTENT, MSG_SOURCE_INSERT } from '@/constants/protocol';
import { LOGIN_REQUEST_TIMEOUT_MS } from '@/constants/config';

console.log('[AccountManage] Content script loaded');

let _insertScriptInjected = false;
let _insertScriptPromise: Promise<void> | null = null;
let _autoFilled = false; // 标记是否已主动自动填充

function injectInsertScript(): Promise<void> {
  if (_insertScriptInjected) {
    console.log('[AccountManage] insert script 已注入过，跳过');
    return Promise.resolve();
  }
  if (_insertScriptPromise) {
    console.log('[AccountManage] insert script 正在注入中，等待同一个 Promise');
    return _insertScriptPromise;
  }

  _insertScriptPromise = new Promise<void>((resolve) => {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('insert.js');
    script.onload = () => {
      script.remove();
      _insertScriptInjected = true;
      _insertScriptPromise = null;
      console.log('[AccountManage] insert script 加载完成，listener 已就绪');
      resolve();
    };
    script.onerror = () => {
      script.remove();
      _insertScriptPromise = null;
      console.log('[AccountManage] insert script 加载失败');
      resolve();
    };
    (document.head || document.documentElement).appendChild(script);
  });

  return _insertScriptPromise;
}

// ── chrome.runtime.onMessage 监听（接收来自 Popup/Background 的消息） ──

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  console.log('[AccountManage] onMessage 触发, message.type=%s', message.type);
  if (message.type === MSG_TYPE_PING) {
    console.log('[AccountManage] PONG, ready=true, insertInjected=%s, autoFilled=%s', _insertScriptInjected, _autoFilled);
    sendResponse({ ready: true, insertInjected: _insertScriptInjected, autoFilled: _autoFilled });
    return;
  }
  if (message.type === MSG_TYPE_LOGIN_REQUEST) {
    const { username, password, autoSubmit } = message.data;
    console.log('[AccountManage] 收到 LOGIN_REQUEST, username=%s, autoSubmit=%s', username, autoSubmit);

    injectInsertScript().then(() => {
      const resultListener = (event: MessageEvent) => {
        if (event.data?.type === MSG_TYPE_LOGIN_RESULT && event.data?.source === MSG_SOURCE_INSERT) {
          window.removeEventListener('message', resultListener);
          sendResponse(event.data.result);
        }
      };
      window.addEventListener('message', resultListener);

      setTimeout(() => {
        window.removeEventListener('message', resultListener);
        sendResponse({ success: false, message: '自动登录超时', filled: false, submitted: false });
      }, LOGIN_REQUEST_TIMEOUT_MS);

      window.postMessage({
        type: MSG_TYPE_LOGIN_REQUEST,
        source: MSG_SOURCE_CONTENT,
        data: { username, password, autoSubmit: autoSubmit ?? true },
      }, '*');
    });

    return true; // 异步 sendResponse
  }
});

// ── postMessage 监听（接收来自 Insert 的消息，中转到 Background） ──

window.addEventListener('message', (event) => {
  const data = event.data;

  // Pull 路径：Insert 主动请求凭据 → Content 转发给 Background → 回传 CREDENTIAL_RESPONSE
  if (data?.type === MSG_TYPE_CREDENTIAL_REQUEST && data?.source === MSG_SOURCE_INSERT) {
    const { url, accountId } = data.data;
    console.log('[AccountManage] 收到 Insert CREDENTIAL_REQUEST, url=%s, accountId=%s', url, accountId);

    _autoFilled = true; // 标记正在处理 Pull 请求

    chrome.runtime.sendMessage({
      type: MSG_TYPE_CREDENTIAL_REQUEST,
      data: { url, accountId },
    }).then((response: any) => {
      if (response?.matched) {
        console.log('[AccountManage] Background 匹配成功，转发 CREDENTIAL_RESPONSE 到 Insert');
        window.postMessage({
          type: MSG_TYPE_CREDENTIAL_RESPONSE,
          source: MSG_SOURCE_CONTENT,
          data: response.data,
        }, '*');
      } else {
        console.log('[AccountManage] Background 无匹配账号，不转发');
      }
    }).catch((err) => {
      console.log('[AccountManage] CREDENTIAL_REQUEST 发送失败: %s', err);
    });
  }

  // Pull 路径：Insert 回传登录结果
  if (data?.type === MSG_TYPE_LOGIN_RESULT && data?.source === MSG_SOURCE_INSERT) {
    // 如果是 Pull 路径触发的，不需要 sendResponse（没有等待的 chrome.runtime.onMessage）
    console.log('[AccountManage] 收到 Insert LOGIN_RESULT (Pull 路径): success=%s', data.result?.success);
  }
});

// 页面加载时即注入 insert script
injectInsertScript();
// const crxApp = document.createElement("div");
// crxApp.id = "chrome-plugin-container";
// document.body.appendChild(crxApp);
// const app = createApp(APP);
// app.mount("#chrome-plugin-container");

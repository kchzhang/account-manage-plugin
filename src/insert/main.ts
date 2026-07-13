// Insert script - 注入到页面真实 JS world，能正确触发 React/Vue 等框架的内部事件
// 双轨架构：
//   Push 路径：Popup → Background → Content → Insert（用户点击登录触发）
//   Pull 路径：Insert 检测 URL 参数 → 请求凭据 → Background 匹配 → Content 回传 → Insert 填充
import { autoLogin } from '@/utils/autoLogin';
import {
  MSG_TYPE_LOGIN_REQUEST, MSG_TYPE_LOGIN_RESULT,
  MSG_TYPE_CREDENTIAL_REQUEST, MSG_TYPE_CREDENTIAL_RESPONSE,
  MSG_SOURCE_CONTENT, MSG_SOURCE_INSERT,
  AUTO_LOGIN_PARAM, AUTO_LOGIN_ACCOUNT_ID_PARAM,
} from '@/constants/protocol';
import { CREDENTIAL_REQUEST_TIMEOUT_MS } from '@/constants/config';
import { removeCacheBustParam } from '@/utils/urlCacheBust';

console.log('[AccountManage] Insert script loaded');
(window as any).__accountManageInsertLoaded = true;

// ── Pull 路径：主动请求凭据 ──

/**
 * 检测 URL 中的 auto_login 参数，提取 accountId，清理 URL，发起凭据请求
 */
async function requestCredentialsIfNeeded(): Promise<void> {
  const url = new URL(window.location.href);
  if (!url.searchParams.has(AUTO_LOGIN_PARAM)) {
    console.log('[Insert] URL 无 auto_login 参数，跳过 Pull');
    return;
  }

  // 提取 accountId（精确匹配标识）
  const accountId = url.searchParams.get(AUTO_LOGIN_ACCOUNT_ID_PARAM) || undefined;

  // 清理 URL 参数（在请求之前清理，避免凭据请求中携带临时参数影响匹配）
  url.searchParams.delete(AUTO_LOGIN_PARAM);
  url.searchParams.delete(AUTO_LOGIN_ACCOUNT_ID_PARAM);
  removeCacheBustParam(url);
  window.history.replaceState({}, '', url.toString());

  console.log('[Insert] Pull 模式触发, accountId=%s, cleanedUrl=%s', accountId, window.location.href);

  // 等待页面完全加载后再请求凭据（减少凭据暴露窗口）
  await waitForPageLoad();

  // 发送凭据请求 → Content → Background(Storage 匹配)
  window.postMessage({
    type: MSG_TYPE_CREDENTIAL_REQUEST,
    source: MSG_SOURCE_INSERT,
    data: { url: window.location.href, accountId },
  }, '*');

  console.log('[Insert] CREDENTIAL_REQUEST 已发送');
}

/**
 * 等待页面加载完成（与 autoLogin.ts 中相同的逻辑，但 Pull 路径需要在请求前等待）
 */
function waitForPageLoad(): Promise<void> {
  if (document.readyState === 'complete') {
    return Promise.resolve();
  }
  return new Promise<void>(resolve => {
    const onLoad = () => {
      window.removeEventListener('load', onLoad);
      resolve();
    };
    window.addEventListener('load', onLoad);
    // 超时兜底
    setTimeout(() => {
      window.removeEventListener('load', onLoad);
      resolve();
    }, 3000);
  });
}

// ── 消息监听 ──

window.addEventListener('message', (event) => {
  const data = event.data;

  // Push 路径：接收 Content 推送的 LOGIN_REQUEST（Popup 点击登录触发）
  if (data?.type === MSG_TYPE_LOGIN_REQUEST && data?.source === MSG_SOURCE_CONTENT) {
    const { username, password, autoSubmit } = data.data;
    console.log('[Insert] Push 路径 — 开始 autoLogin, username=%s, autoSubmit=%s', username, autoSubmit);

    autoLogin(username, password, autoSubmit ?? true)
      .then((result) => {
        window.postMessage({ type: MSG_TYPE_LOGIN_RESULT, source: MSG_SOURCE_INSERT, result }, '*');
      })
      .catch((err) => {
        window.postMessage({
          type: MSG_TYPE_LOGIN_RESULT,
          source: MSG_SOURCE_INSERT,
          result: { success: false, message: err.message, filled: false, submitted: false },
        }, '*');
      });
  }

  // Pull 路径：接收 Background 匹配后的 CREDENTIAL_RESPONSE
  if (data?.type === MSG_TYPE_CREDENTIAL_RESPONSE && data?.source === MSG_SOURCE_CONTENT) {
    const { username, password, autoSubmit } = data.data;
    console.log('[Insert] Pull 路径 — 收到凭据, username=%s, autoSubmit=%s', username, autoSubmit);

    autoLogin(username, password, autoSubmit ?? true)
      .then((result) => {
        window.postMessage({ type: MSG_TYPE_LOGIN_RESULT, source: MSG_SOURCE_INSERT, result }, '*');
      })
      .catch((err) => {
        window.postMessage({
          type: MSG_TYPE_LOGIN_RESULT,
          source: MSG_SOURCE_INSERT,
          result: { success: false, message: err.message, filled: false, submitted: false },
        }, '*');
      });
  }
});

// ── Pull 路径超时兜底 ──
// 如果发送了 CREDENTIAL_REQUEST 但长时间未收到 CREDENTIAL_RESPONSE，记录日志
let _credentialRequestSent = false;

const originalPostMessage = window.postMessage.bind(window);
window.postMessage = function (message: any, targetOrigin: any, transfer?: any) {
  if (message?.type === MSG_TYPE_CREDENTIAL_REQUEST && message?.source === MSG_SOURCE_INSERT) {
    _credentialRequestSent = true;
    // 超时兜底：如果 CREDENTIAL_REQUEST_TIMEOUT_MS 后仍未收到响应，放弃
    setTimeout(() => {
      if (_credentialRequestSent) {
        console.log('[Insert] Pull 路径超时 — %dms 后未收到 CREDENTIAL_RESPONSE，放弃自动登录', CREDENTIAL_REQUEST_TIMEOUT_MS);
        _credentialRequestSent = false;
      }
    }, CREDENTIAL_REQUEST_TIMEOUT_MS);
  }
  return originalPostMessage(message, targetOrigin, transfer);
};

// 监听 CREDENTIAL_RESPONSE 清除超时标记
window.addEventListener('message', (event) => {
  if (event.data?.type === MSG_TYPE_CREDENTIAL_RESPONSE && event.data?.source === MSG_SOURCE_CONTENT) {
    _credentialRequestSent = false;
  }
});

// ── 入口：检测 URL 参数并主动 Pull ──
requestCredentialsIfNeeded();

// Insert script - 注入到页面真实 JS world，能正确触发 React/Vue 等框架的内部事件
import { autoLogin } from '@/utils/autoLogin';
import { MSG_TYPE_LOGIN_REQUEST, MSG_TYPE_LOGIN_RESULT, MSG_SOURCE_CONTENT, MSG_SOURCE_INSERT } from '@/constants/protocol';

console.log('[AccountManage] Insert script loaded');
(window as any).__accountManageInsertLoaded = true;

// 监听来自 content script 的 postMessage 请求
window.addEventListener('message', (event) => {
  const data = event.data;
  // 只接收来自 contentAutoLogin 的消息（通过 source 标记识别，不再依赖 event.source）
  if (data?.type === MSG_TYPE_LOGIN_REQUEST && data?.source === MSG_SOURCE_CONTENT) {
    const { username, password, autoSubmit } = data.data;
    console.log('[Insert] 开始执行 autoLogin, username=%s, autoSubmit=%s', username, autoSubmit);

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

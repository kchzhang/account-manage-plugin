// Insert script - 注入到页面真实 JS world，能正确触发 React/Vue 等框架的内部事件
import { autoLogin } from '@/utils/autoLogin';

console.log('[AccountManage] Insert script loaded');
(window as any).__accountManageInsertLoaded = true;

// 监听来自 content script 的 postMessage 请求
window.addEventListener('message', (event) => {
  const data = event.data;
  // 只接收来自 contentAutoLogin 的消息（通过 source 标记识别，不再依赖 event.source）
  if (data?.type === 'LOGIN_REQUEST' && data?.source === 'accountManage-content') {
    const { username, password, autoSubmit } = data.data;
    console.log('[Insert] 开始执行 autoLogin, username=%s, autoSubmit=%s', username, autoSubmit);

    autoLogin(username, password, autoSubmit ?? true)
      .then((result) => {
        window.postMessage({ type: 'LOGIN_RESULT', source: 'accountManage-insert', result }, '*');
      })
      .catch((err) => {
        window.postMessage({
          type: 'LOGIN_RESULT',
          source: 'accountManage-insert',
          result: { success: false, message: err.message, filled: false, submitted: false },
        }, '*');
      });
  }
});

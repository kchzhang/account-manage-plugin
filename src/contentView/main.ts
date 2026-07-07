// ── Auto-login 桥接 ──
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

// ── URL 匹配 ──
function isSamePage(currentUrl: string, targetUrl: string): boolean {
  try {
    const normalizedTarget = targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`;
    const u1 = new URL(currentUrl);
    const u2 = new URL(normalizedTarget);
    const p1 = u1.pathname.replace(/\/+$/, '');
    const p2 = u2.pathname.replace(/\/+$/, '');
    return u1.origin.toLowerCase() === u2.origin.toLowerCase() && p1.toLowerCase() === p2.toLowerCase();
  } catch {
    return currentUrl.includes(targetUrl.replace(/^https?:\/\//, '').toLowerCase());
  }
}

// ── 主动自动填充 ──
const MAX_AUTO_FILL_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

function sendAutoFillRequest(username: string, password: string): Promise<{ success: boolean; filled: boolean; submitted: boolean; message: string }> {
  return new Promise((resolve) => {
    const resultListener = (event: MessageEvent) => {
      if (event.data?.type === 'LOGIN_RESULT' && event.data?.source === 'accountManage-insert') {
        window.removeEventListener('message', resultListener);
        resolve(event.data.result);
      }
    };
    window.addEventListener('message', resultListener);

    // 超时兜底
    setTimeout(() => {
      window.removeEventListener('message', resultListener);
      resolve({ success: false, message: '自动填充超时', filled: false, submitted: false });
    }, 5000);

    window.postMessage({
      type: 'LOGIN_REQUEST',
      source: 'accountManage-content',
      data: { username, password, autoSubmit: true },
    }, '*');
  });
}

async function tryAutoFill() {
  console.log('[AccountManage] tryAutoFill — 开始检测');

  // 等待页面完全加载
  if (document.readyState !== 'complete') {
    console.log('[AccountManage] tryAutoFill — 等待页面加载, readyState=%s', document.readyState);
    await new Promise<void>((resolve) => {
      const onLoad = () => {
        window.removeEventListener('load', onLoad);
        console.log('[AccountManage] tryAutoFill — 页面 load 事件触发');
        resolve();
      };
      window.addEventListener('load', onLoad);
      setTimeout(() => {
        window.removeEventListener('load', onLoad);
        console.log('[AccountManage] tryAutoFill — 等待页面加载超时，继续执行');
        resolve();
      }, 3000);
    });
  } else {
    console.log('[AccountManage] tryAutoFill — 页面已加载完成');
  }

  // 确保 insert script 已注入
  await injectInsertScript();

  // 从 storage 读取账号数据
  const result = await chrome.storage.local.get(['account_data']);
  const store = result['account_data'] as { accounts: Array<{ id: string; name: string; username: string; password: string; url: string }> } | undefined;
  if (!store?.accounts?.length) {
    console.log('[AccountManage] tryAutoFill — 无账号数据，跳过自动填充');
    return;
  }

  // 匹配当前 URL
  const currentUrl = window.location.href;
  const matched = store.accounts.find(account => account.url && isSamePage(currentUrl, account.url));

  if (!matched) {
    console.log('[AccountManage] tryAutoFill — 当前页面无匹配账号，跳过 (url=%s)', currentUrl);
    return;
  }

  console.log('[AccountManage] tryAutoFill — 匹配账号: name=%s username=%s', matched.name, matched.username);

  // 重试机制：最多 MAX_AUTO_FILL_RETRIES 次
  for (let i = 1; i <= MAX_AUTO_FILL_RETRIES; i++) {
    const fillResult = await sendAutoFillRequest(matched.username, matched.password);
    console.log('[AccountManage] tryAutoFill — 第%d次尝试: success=%s filled=%s submitted=%s msg="%s"',
      i, fillResult.success, fillResult.filled, fillResult.submitted, fillResult.message);

    if (fillResult.filled) {
      _autoFilled = true;
      console.log('[AccountManage] tryAutoFill — 填充成功，不再重试');
      return;
    }

    if (i < MAX_AUTO_FILL_RETRIES) {
      console.log('[AccountManage] tryAutoFill — 填充失败，%d秒后重试 (剩余%d次)', RETRY_DELAY_MS / 1000, MAX_AUTO_FILL_RETRIES - i);
      await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
    } else {
      console.log('[AccountManage] tryAutoFill — 已达最大重试次数(%d)，放弃自动填充', MAX_AUTO_FILL_RETRIES);
    }
  }
}

// 页面加载时即注入 insert script
injectInsertScript();

// 主动尝试自动填充
tryAutoFill();

// 监听来自 background 的消息，转发给 insert script
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  console.log('[AccountManage] onMessage 触发, message.type=%s', message.type);
  if (message.type === 'PING') {
    console.log('[AccountManage] PONG, ready=true, insertInjected=%s, autoFilled=%s', _insertScriptInjected, _autoFilled);
    sendResponse({ ready: true, insertInjected: _insertScriptInjected, autoFilled: _autoFilled });
    return;
  }
  if (message.type === 'LOGIN_REQUEST') {
    const { username, password, autoSubmit } = message.data;
    console.log('[AccountManage] 收到 LOGIN_REQUEST, username=%s, autoSubmit=%s', username, autoSubmit);

    injectInsertScript().then(() => {
      const resultListener = (event: MessageEvent) => {
        if (event.data?.type === 'LOGIN_RESULT' && event.data?.source === 'accountManage-insert') {
          window.removeEventListener('message', resultListener);
          sendResponse(event.data.result);
        }
      };
      window.addEventListener('message', resultListener);

      setTimeout(() => {
        window.removeEventListener('message', resultListener);
        sendResponse({ success: false, message: '自动登录超时', filled: false, submitted: false });
      }, 8000);

      window.postMessage({
        type: 'LOGIN_REQUEST',
        source: 'accountManage-content',
        data: { username, password, autoSubmit: autoSubmit ?? true },
      }, '*');
    });

    return true; // 异步 sendResponse
  }
});

// ── Vue UI 挂载（暂不使用） ──
// const crxApp = document.createElement("div");
// crxApp.id = "chrome-plugin-container";
// document.body.appendChild(crxApp);
// const app = createApp(APP);
// app.mount("#chrome-plugin-container");

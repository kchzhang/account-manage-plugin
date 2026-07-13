<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useViewRouter } from './composables/useViewRouter';
import { useAccounts } from './composables/useAccounts';
import type { AccountItem, ExportData } from '@/types/account';
import { MSG_TYPE_PING, MSG_TYPE_LOGIN_REQUEST, AUTO_LOGIN_PARAM, AUTO_LOGIN_VALUE, AUTO_LOGIN_ACCOUNT_ID_PARAM } from '@/constants/protocol';
import { AUTO_LOGIN_ENABLED, PING_MAX_RETRIES, PING_INTERVAL_MS } from '@/constants/config';
import { addCacheBustParam } from '@/utils/urlCacheBust';
import AccountList from './components/AccountList.vue';
import AccountForm from './components/AccountForm.vue';
import ImportExport from './components/ImportExport.vue';

const { currentView, viewParams, navigate, goBack } = useViewRouter();
const { accounts, loading, refresh, add, update, remove, exportData, importData } = useAccounts();

const editingAccount = ref<AccountItem | undefined>();

onMounted(() => {
  refresh();
});

function handleAdd() {
  editingAccount.value = undefined;
  navigate('add');
}

function handleEdit(id: string) {
  editingAccount.value = accounts.value.find(a => a.id === id);
  navigate('edit', { accountId: id });
}

async function handleSave(data: { name: string; username: string; password: string; url: string; icon?: string }) {
  if (currentView.value === 'add') {
    await add(data);
  } else if (currentView.value === 'edit' && viewParams.value.accountId) {
    await update(viewParams.value.accountId, data);
  }
  await refresh();
  goBack();
}

async function handleDelete(id: string) {
  await remove(id);
}

function handleImportExport() {
  navigate('import-export');
}

async function handleLogin(id: string) {
  const account = accounts.value.find(a => a.id === id);
  if (!account) return;

  // 获取当前活动标签页
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  const tabId = tab.id;

  // 判断是否需要导航到目标 URL
  const needNavigate = account.url && tab.url && !isSamePage(tab.url, account.url);

  if (needNavigate) {
    const rawTarget = account.url!.startsWith('http') ? account.url! : `https://${account.url!}`;
    const targetUrlObj = new URL(rawTarget);
    addCacheBustParam(targetUrlObj);
    if (AUTO_LOGIN_ENABLED) {
      targetUrlObj.searchParams.set(AUTO_LOGIN_PARAM, AUTO_LOGIN_VALUE);
      targetUrlObj.searchParams.set(AUTO_LOGIN_ACCOUNT_ID_PARAM, account.id);
    }
    const targetUrl = targetUrlObj.toString();
    console.log('[Popup] 需要导航, 从 %s 到 %s', tab.url, targetUrl);
    await chrome.tabs.update(tabId, { url: targetUrl });
  } else {
    // 同页面：在当前 URL 加上 auto_login 标识后刷新（仅当开关开启）
    const currentUrlObj = new URL(tab.url!);
    addCacheBustParam(currentUrlObj);
    if (AUTO_LOGIN_ENABLED) {
      currentUrlObj.searchParams.set(AUTO_LOGIN_PARAM, AUTO_LOGIN_VALUE);
      currentUrlObj.searchParams.set(AUTO_LOGIN_ACCOUNT_ID_PARAM, account.id);
    }
    await chrome.tabs.update(tabId, { url: currentUrlObj.toString() });
  }

  // 用探针检测 content script + insert script 是否完全就绪（不再依赖 onUpdated.complete）
  await waitForScriptReady(tabId);

  // 发送登录请求
  await chrome.runtime.sendMessage({
    type: MSG_TYPE_LOGIN_REQUEST,
    data: {
      tabId,
      username: account.username,
      password: account.password,
    },
  });

  // 延迟关闭 popup，确保消息通道完整传递（避免 sendResponse 丢失）
  setTimeout(() => window.close(), 300);
}

/**
 * 判断两个 URL 是否指向同一页面
 * 使用 URL 对象规范化后比较 origin + pathname
 */
function isSamePage(currentUrl: string, targetUrl: string): boolean {
  try {
    const normalizedTarget = targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`;
    const u1 = new URL(currentUrl);
    const u2 = new URL(normalizedTarget);
    // 比较 origin + pathname，忽略尾部斜杠差异
    const p1 = u1.pathname.replace(/\/+$/, '');
    const p2 = u2.pathname.replace(/\/+$/, '');
    return u1.origin.toLowerCase() === u2.origin.toLowerCase() && p1.toLowerCase() === p2.toLowerCase();
  } catch {
    // URL 解析失败，回退到 includes 子串匹配
    return currentUrl.includes(targetUrl.replace(/^https?:\/\//, '').toLowerCase());
  }
}

/**
 * 探针检测 content script 是否就绪
 * 发送 PING 消息，收到 PONG 则说明 onMessage 监听器已注册，可以发送 LOGIN_REQUEST
 * insert script 注入由 contentAutoLogin 在收到 LOGIN_REQUEST 时保证（等 onload 后再发 postMessage）
 * 最多重试 20 次（约 10 秒），每次间隔 500ms
 */
async function waitForScriptReady(tabId: number, maxRetries = PING_MAX_RETRIES, interval = PING_INTERVAL_MS): Promise<void> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response: any = await chrome.runtime.sendMessage({
        type: MSG_TYPE_PING,
        data: { tabId },
      });
      // P0: 同时检查 ready 和 insertInjected，确保 insert script 已注入并就绪
      if (response?.ready && response?.insertInjected) {
        console.log('[Popup] content script + insert script 就绪 (第 %d 次探针)', i + 1);
        return;
      } else {
        console.log('[Popup] PING 返回未完全就绪 (第 %d 次), ready=%s, insertInjected=%s', i + 1, response?.ready, response?.insertInjected);
      }
    } catch (e) {
      console.log('[Popup] PING 异常 (第 %d 次), error=%s', i + 1, e);
    }
    await new Promise<void>(resolve => setTimeout(resolve, interval));
  }
  console.log('[Popup] 探针超时，强制继续发送登录请求');
}

function handleExportFile() {
  const data = exportData();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `accounts_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

async function handleImport(data: ExportData, mode: 'overwrite' | 'merge') {
  await importData(data, mode);
  goBack();
}
</script>

<template>
  <div class="w-[360px] h-[500px] flex flex-col bg-white overflow-hidden">
    <AccountList
      v-if="currentView === 'list'"
      :accounts="accounts"
      :loading="loading"
      @add="handleAdd"
      @edit="handleEdit"
      @delete="handleDelete"
      @import-export="handleImportExport"
      @login="handleLogin"
    />
    <AccountForm
      v-if="currentView === 'add' || currentView === 'edit'"
      :mode="currentView === 'add' ? 'add' : 'edit'"
      :account="editingAccount"
      @save="handleSave"
      @back="goBack"
    />
    <ImportExport
      v-if="currentView === 'import-export'"
      @back="goBack"
      @export="handleExportFile"
      @import="handleImport"
    />
  </div>
</template>

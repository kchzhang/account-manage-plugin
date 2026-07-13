<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useViewRouter } from './composables/useViewRouter';
import { useAccounts } from './composables/useAccounts';
import type { AccountItem, ExportData } from '@/types/account';
import { MSG_TYPE_PING, MSG_TYPE_LOGIN_REQUEST, AUTO_LOGIN_PARAM, AUTO_LOGIN_VALUE } from '@/constants/protocol';
import { AUTO_LOGIN_ENABLED, PING_MAX_RETRIES, PING_INTERVAL_MS, TAB_NAVIGATION_TIMEOUT_MS } from '@/constants/config';
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

async function handleSave(data: { name: string; username: string; password: string; url: string }) {
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

  // 判断是否需要导航到目标 URL
  const needNavigate = account.url && tab.url && !isSamePage(tab.url, account.url);

  if (needNavigate) {
    const rawTarget = account.url!.startsWith('http') ? account.url! : `https://${account.url!}`;
    const targetUrlObj = new URL(rawTarget);
    if (AUTO_LOGIN_ENABLED) {
      targetUrlObj.searchParams.set(AUTO_LOGIN_PARAM, AUTO_LOGIN_VALUE);
    }
    const targetUrl = targetUrlObj.toString();
    console.log('[Popup] 需要导航, 从 %s 到 %s', tab.url, targetUrl);
    await chrome.tabs.update(tab.id, { url: targetUrl });

    // 等待页面加载完成，带超时保护
    await new Promise<void>((resolve) => {
      let resolved = false;
      const listener = (updatedTabId: number, info: { status?: string }) => {
        if (updatedTabId === tab.id && info.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(listener);
          resolved = true;
          resolve();
        }
      };
      chrome.tabs.onUpdated.addListener(listener);
      // 10秒超时：如果 Chrome 没触发 reload（同 URL 等），继续执行
      setTimeout(() => {
        if (!resolved) {
          chrome.tabs.onUpdated.removeListener(listener);
          console.log('[Popup] onUpdated 超时，继续执行');
          resolve();
        }
      }, TAB_NAVIGATION_TIMEOUT_MS);
    });
  } else {
    // 同页面：在当前 URL 加上 auto_login 标识后刷新（仅当开关开启）
    const currentUrlObj = new URL(tab.url!);
    if (AUTO_LOGIN_ENABLED) {
      currentUrlObj.searchParams.set(AUTO_LOGIN_PARAM, AUTO_LOGIN_VALUE);
    }
    await chrome.tabs.update(tab.id, { url: currentUrlObj.toString() });

    // 等待页面加载完成，带超时保护
    await new Promise<void>((resolve) => {
      let resolved = false;
      const listener = (updatedTabId: number, info: { status?: string }) => {
        if (updatedTabId === tab.id && info.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(listener);
          resolved = true;
          resolve();
        }
      };
      chrome.tabs.onUpdated.addListener(listener);
      setTimeout(() => {
        if (!resolved) {
          chrome.tabs.onUpdated.removeListener(listener);
          console.log('[Popup] onUpdated 超时，继续执行');
          resolve();
        }
      }, TAB_NAVIGATION_TIMEOUT_MS);
    });
  }

  // 无论是否导航，用探针检测 content script 是否就绪
  // insert script 注入由 contentAutoLogin 的 LOGIN_REQUEST handler 在消息到达时保证
  await waitForScriptReady(tab.id!);

  // 发送登录请求 — content+insert 桥接会处理等待和填充
  // await 确保 message 已发送到 background 后再关闭 popup
  await chrome.runtime.sendMessage({
    type: MSG_TYPE_LOGIN_REQUEST,
    data: {
      tabId: tab.id!,
      username: account.username,
      password: account.password,
    },
  });

  // 关闭 popup
  window.close();
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
      if (response?.ready) {
        console.log('[Popup] content script 就绪 (第 %d 次探针), insertInjected=%s', i + 1, response.insertInjected);
        return;
      } else {
        console.log('[Popup] PING 返回未就绪 (第 %d 次), response=%s', i + 1, JSON.stringify(response));
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

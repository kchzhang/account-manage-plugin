<script setup lang="ts">
import { ref, computed } from 'vue';
import { IconPlus, IconEdit, IconTrash, IconEye, IconEyeOff, IconLogin } from '@/icons';
import type { AccountItem } from '@/types/account';
import ConfirmDialog from './ConfirmDialog.vue';

type SortField = 'name' | 'createdAt' | 'updatedAt';
type GroupMode = 'none' | 'domain';

const props = defineProps<{
  accounts: AccountItem[];
  loading: boolean;
}>();

const emit = defineEmits<{
  add: [];
  edit: [id: string];
  delete: [id: string];
  importExport: [];
  login: [id: string];
}>();

const searchQuery = ref('');
const sortField = ref<SortField>('createdAt');
const sortDesc = ref(true);
const groupMode = ref<GroupMode>('none');
const showPasswords = ref<Set<string>>(new Set());
const deleteTarget = ref<AccountItem | null>(null);
const showConfirm = ref(false);

function togglePassword(id: string) {
  const set = new Set(showPasswords.value);
  if (set.has(id)) set.delete(id);
  else set.add(id);
  showPasswords.value = set;
}

function getDomain(url: string): string {
  try {
    const hostname = new URL(url.startsWith('http') ? url : `https://${url}`).hostname;
    return hostname;
  } catch {
    return url || '未知';
  }
}

const filteredAndSorted = computed(() => {
  let list = [...props.accounts];

  // search
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase();
    list = list.filter(a =>
      a.name.toLowerCase().includes(q) ||
      a.username.toLowerCase().includes(q) ||
      a.url.toLowerCase().includes(q)
    );
  }

  // sort
  list.sort((a, b) => {
    let cmp = 0;
    const field = sortField.value;
    if (field === 'name') cmp = a.name.localeCompare(b.name);
    else cmp = a[field] - b[field];
    return sortDesc.value ? -cmp : cmp;
  });

  return list;
});

const grouped = computed(() => {
  const list = filteredAndSorted.value;
  if (groupMode.value === 'none') {
    return [{ label: '', items: list }];
  }
  // group by domain
  const groups = new Map<string, AccountItem[]>();
  for (const item of list) {
    const domain = getDomain(item.url);
    if (!groups.has(domain)) groups.set(domain, []);
    groups.get(domain)!.push(item);
  }
  return Array.from(groups.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([label, items]) => ({ label, items }));
});

function handleDelete(item: AccountItem) {
  deleteTarget.value = item;
  showConfirm.value = true;
}

function confirmDelete() {
  if (deleteTarget.value) {
    emit('delete', deleteTarget.value.id);
  }
  showConfirm.value = false;
  deleteTarget.value = null;
}
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Header -->
    <div class="flex items-center justify-between px-4 py-3 border-b border-gray-200">
      <h1 class="text-lg font-semibold text-gray-900">账号管理</h1>
      <div class="flex items-center gap-2">
        <button
          class="p-1.5 rounded-md text-gray-500 hover:text-blue-600 hover:bg-gray-100 transition-colors"
          title="导入导出"
          @click="emit('importExport')"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
        </button>
        <button
          class="p-1.5 rounded-md text-blue-600 hover:bg-blue-50 transition-colors"
          title="添加账号"
          @click="emit('add')"
        >
          <IconPlus class="w-5 h-5" />
        </button>
      </div>
    </div>

    <!-- Search & Controls -->
    <div class="px-4 py-2 space-y-2">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="搜索名称、用户名、链接..."
        class="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
      />
      <div class="flex items-center gap-3">
        <select
          v-model="sortField"
          class="px-2 py-1 text-xs border border-gray-300 rounded-md bg-white focus:outline-none"
        >
          <option value="createdAt">按创建时间</option>
          <option value="updatedAt">按更新时间</option>
          <option value="name">按名称</option>
        </select>
        <button
          class="px-2 py-1 text-xs border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          @click="sortDesc = !sortDesc"
        >
          {{ sortDesc ? '降序 ↓' : '升序 ↑' }}
        </button>
        <select
          v-model="groupMode"
          class="px-2 py-1 text-xs border border-gray-300 rounded-md bg-white focus:outline-none"
        >
          <option value="none">不分组</option>
          <option value="domain">按域名分组</option>
        </select>
      </div>
    </div>

    <!-- List -->
    <div class="flex-1 overflow-y-auto px-4 pb-4">
      <div v-if="loading" class="flex items-center justify-center py-10 text-sm text-gray-400">
        加载中...
      </div>
      <div v-else-if="accounts.length === 0" class="flex flex-col items-center justify-center py-10 text-sm text-gray-400">
        <p>暂无账号数据</p>
        <button
          class="mt-2 text-blue-600 hover:text-blue-700 transition-colors"
          @click="emit('add')"
        >
          点击添加第一个账号
        </button>
      </div>
      <template v-else>
        <div v-for="group in grouped" :key="group.label" class="mt-3 first:mt-0">
          <div v-if="group.label" class="text-xs font-medium text-gray-500 mb-1.5 px-1">
            {{ group.label }}
          </div>
          <div
            v-for="item in group.items"
            :key="item.id"
            class="flex items-center gap-3 p-3 mb-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group"
          >
            <!-- Info -->
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium text-gray-900 truncate">{{ item.name }}</div>
              <div class="text-xs text-gray-500 truncate mt-0.5">{{ item.username }}</div>
              <div class="flex items-center gap-1 mt-1">
                <span class="text-xs text-gray-400 truncate max-w-[180px]">{{ item.url }}</span>
              </div>
            </div>
            <!-- Password peek -->
            <div class="flex items-center gap-1 shrink-0">
              <span class="text-xs text-gray-400 max-w-[80px] truncate">
                {{ showPasswords.has(item.id) ? item.password : '••••••' }}
              </span>
              <button
                class="p-0.5 text-gray-400 hover:text-gray-600 transition-colors"
                @click="togglePassword(item.id)"
              >
                <IconEye v-if="!showPasswords.has(item.id)" class="w-3.5 h-3.5" />
                <IconEyeOff v-else class="w-3.5 h-3.5" />
              </button>
            </div>
            <!-- Actions -->
            <div class="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                class="p-1 rounded text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors"
                title="一键登录"
                @click="emit('login', item.id)"
              >
                <IconLogin class="w-4 h-4" />
              </button>
              <button
                class="p-1 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                title="编辑"
                @click="emit('edit', item.id)"
              >
                <IconEdit class="w-4 h-4" />
              </button>
              <button
                class="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                title="删除"
                @click="handleDelete(item)"
              >
                <IconTrash class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </template>
    </div>

    <ConfirmDialog
      :visible="showConfirm"
      :message="`确定要删除「${deleteTarget?.name ?? ''}」吗？删除后无法恢复。`"
      @confirm="confirmDelete"
      @cancel="showConfirm = false"
    />
  </div>
</template>

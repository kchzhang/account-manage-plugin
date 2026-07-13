<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { IconChevronLeft, IconCheck, IconEye, IconEyeOff, ACCOUNT_ICON_OPTIONS } from '@/icons';
import type { AccountItem } from '@/types/account';

const props = defineProps<{
  mode: 'add' | 'edit';
  account?: AccountItem;
}>();

const emit = defineEmits<{
  save: [data: { name: string; username: string; password: string; url: string; icon?: string }];
  back: [];
}>();

const name = ref('');
const username = ref('');
const password = ref('');
const url = ref('');
const icon = ref('default');
const showPassword = ref(false);

onMounted(() => {
  if (props.mode === 'edit' && props.account) {
    name.value = props.account.name;
    username.value = props.account.username;
    password.value = props.account.password;
    url.value = props.account.url;
    icon.value = props.account.icon || '';
  }
});

const canSave = computed(() => {
  return name.value.trim() && username.value.trim();
});

function handleSave() {
  if (!canSave) return;
  emit('save', {
    name: name.value.trim(),
    username: username.value.trim(),
    password: password.value,
    url: url.value.trim(),
    icon: icon.value || undefined,
  });
}
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Header -->
    <div class="flex items-center gap-2 px-4 py-3 border-b border-gray-200">
      <button
        class="p-1.5 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        @click="emit('back')"
      >
        <IconChevronLeft class="w-5 h-5" />
      </button>
      <h2 class="text-base font-semibold text-gray-900">
        {{ mode === 'add' ? '添加账号' : '编辑账号' }}
      </h2>
    </div>

    <!-- Form -->
    <div class="flex-1 overflow-y-auto px-4 py-4 space-y-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">名称 <span class="text-red-400">*</span></label>
        <input
          v-model="name"
          type="text"
          placeholder="如：GitHub、邮箱"
          class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">图标</label>
        <select
          v-model="icon"
          class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
        >
          <option v-for="opt in ACCOUNT_ICON_OPTIONS" :key="opt.key" :value="opt.key">
            {{ opt.label }}
          </option>
        </select>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">用户名 <span class="text-red-400">*</span></label>
        <input
          v-model="username"
          type="text"
          placeholder="账号/邮箱"
          class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">密码</label>
        <div class="flex items-center gap-2">
          <input
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            placeholder="密码"
            class="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            class="p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors shrink-0"
            @click="showPassword = !showPassword"
          >
            <IconEye v-if="!showPassword" class="w-4 h-4" />
            <IconEyeOff v-else class="w-4 h-4" />
          </button>
        </div>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">访问链接</label>
        <input
          v-model="url"
          type="text"
          placeholder="https://..."
          class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
    </div>

    <!-- Footer -->
    <div class="px-4 py-3 border-t border-gray-200">
      <button
        class="w-full py-2 text-sm font-medium rounded-md transition-colors"
        :class="canSave
          ? 'bg-blue-600 text-white hover:bg-blue-700'
          : 'bg-gray-200 text-gray-400 cursor-not-allowed'"
        :disabled="!canSave"
        @click="handleSave"
      >
        <IconCheck v-if="canSave" class="w-4 h-4 inline mr-1" />
        保存
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { IconChevronLeft } from '@/icons';
import type { ExportData } from '@/types/account';

const emit = defineEmits<{
  back: [];
  export: [];
  import: [data: ExportData, mode: 'overwrite' | 'merge'];
}>();

const importMode = ref<'overwrite' | 'merge'>('merge');
const importError = ref('');
const importSuccess = ref('');

function handleExport() {
  emit('export');
}

function handleImportFile(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  importError.value = '';
  importSuccess.value = '';

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target?.result as string) as ExportData;
      if (!data.version || !Array.isArray(data.accounts)) {
        importError.value = '文件格式不正确，请使用导出的 JSON 文件';
        return;
      }
      emit('import', data, importMode.value);
      importSuccess.value = `成功导入 ${data.accounts.length} 条账号`;
    } catch {
      importError.value = '文件解析失败，请确保是有效的 JSON 文件';
    }
  };
  reader.readAsText(file);
  // reset input so same file can be re-selected
  input.value = '';
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
      <h2 class="text-base font-semibold text-gray-900">导入 / 导出</h2>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto px-4 py-4 space-y-6">
      <!-- Export Section -->
      <div>
        <h3 class="text-sm font-medium text-gray-700 mb-2">导出数据</h3>
        <p class="text-xs text-gray-500 mb-3">将所有账号数据导出为 JSON 文件，可用于备份或迁移。</p>
        <button
          class="w-full py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          @click="handleExport"
        >
          导出 JSON 文件
        </button>
      </div>

      <hr class="border-gray-200" />

      <!-- Import Section -->
      <div>
        <h3 class="text-sm font-medium text-gray-700 mb-2">导入数据</h3>
        <p class="text-xs text-gray-500 mb-3">从 JSON 文件导入账号数据。</p>

        <div class="mb-3">
          <label class="block text-xs font-medium text-gray-600 mb-1">导入模式</label>
          <div class="flex gap-3">
            <label class="flex items-center gap-1.5 cursor-pointer">
              <input
                v-model="importMode"
                type="radio"
                value="merge"
                class="accent-blue-600"
              />
              <span class="text-xs text-gray-700">合并（保留现有，添加新的）</span>
            </label>
            <label class="flex items-center gap-1.5 cursor-pointer">
              <input
                v-model="importMode"
                type="radio"
                value="overwrite"
                class="accent-red-600"
              />
              <span class="text-xs text-gray-700">覆盖（替换所有数据）</span>
            </label>
          </div>
        </div>

        <label
          class="block w-full py-2 text-sm font-medium text-center border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50 transition-colors"
        >
          选择 JSON 文件
          <input
            type="file"
            accept=".json"
            class="hidden"
            @change="handleImportFile"
          />
        </label>

        <p v-if="importError" class="text-xs text-red-500 mt-2">{{ importError }}</p>
        <p v-if="importSuccess" class="text-xs text-green-600 mt-2">{{ importSuccess }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { getModelStore, deleteModel, setActiveModel } from '@/utils/modelStorage';
import { PROVIDER_PRESETS, maskApiKey, type ModelConfigStore } from '@/types/model';
import { IconMonitor, IconPlus, IconCheck, IconEdit, IconTrash } from '@/icons';

const emit = defineEmits<{
  add: [];
  edit: [id: string];
}>();

const store = ref<ModelConfigStore>({ models: [], activeModelId: '' });
const confirmDeleteId = ref<string | null>(null);

onMounted(async () => {
  store.value = await getModelStore();
});

async function refresh() {
  store.value = await getModelStore();
}

function getProviderLabel(key: string): string {
  return PROVIDER_PRESETS.find(p => p.key === key)?.label ?? key;
}

async function handleSetActive(id: string) {
  await setActiveModel(id);
  await refresh();
}

async function handleDelete(id: string) {
  await deleteModel(id);
  confirmDeleteId.value = null;
  await refresh();
}

function confirmDelete(id: string) {
  confirmDeleteId.value = id;
}

function cancelDelete() {
  confirmDeleteId.value = null;
}
</script>

<template>
  <div class="block font-[inherit]">
    <!-- 空状态 -->
    <div v-if="store.models.length === 0" class="flex flex-col items-center justify-center py-10 text-center">
      <IconMonitor class="w-12 h-12 text-slate-300" />
      <p class="mt-3 text-sm text-gray-400">暂无模型配置</p>
      <button
        @click="emit('add')"
        class="mt-3 inline-flex items-center gap-1 px-4 h-8 text-sm font-medium text-white bg-sky-500 rounded-lg transition-all duration-150 hover:bg-sky-600 active:scale-[0.98]"
      >
        <IconPlus class="w-3.5 h-3.5" />
        添加模型
      </button>
    </div>

    <!-- 模型列表 -->
    <div v-else class="space-y-2">
      <div
        v-for="model in store.models"
        :key="model.id"
        class="relative block p-3 rounded-lg border transition-all duration-150"
        :class="model.id === store.activeModelId
          ? 'border-sky-200 bg-sky-50/50'
          : 'border-slate-200 bg-white hover:border-slate-300'"
      >
        <!-- 激活标记 -->
        <div
          v-if="model.id === store.activeModelId"
          class="absolute top-2 right-2 inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600 bg-emerald-50 rounded"
        >
          <IconCheck class="w-2.5 h-2.5" />
          当前
        </div>

        <!-- 模型信息 -->
        <div class="block pr-14">
          <div class="flex items-center gap-2 mb-1">
            <span class="text-sm font-medium text-gray-800 truncate">{{ model.name }}</span>
            <span class="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium text-sky-600 bg-sky-50 rounded shrink-0">
              {{ getProviderLabel(model.provider) }}
            </span>
          </div>
          <div class="text-xs text-gray-400 truncate">{{ model.modelName }}</div>
          <div class="text-xs text-gray-300 truncate mt-0.5">{{ maskApiKey(model.apiKey) }}</div>
        </div>

        <!-- 操作按钮 -->
        <div class="absolute bottom-3 right-3 flex items-center gap-1">
          <!-- 删除确认态 -->
          <template v-if="confirmDeleteId === model.id">
            <span class="text-[10px] text-red-500 mr-1">确认删除?</span>
            <button
              @click="handleDelete(model.id)"
              class="inline-flex items-center justify-center w-6 h-6 rounded text-red-500 text-xs hover:bg-red-50 transition-colors"
              title="确认"
            >✓</button>
            <button
              @click="cancelDelete"
              class="inline-flex items-center justify-center w-6 h-6 rounded text-gray-400 text-xs hover:bg-slate-100 transition-colors"
              title="取消"
            >✕</button>
          </template>
          <!-- 正常态 -->
          <template v-else>
            <button
              v-if="model.id !== store.activeModelId"
              @click="handleSetActive(model.id)"
              class="inline-flex items-center justify-center w-7 h-7 rounded-lg text-gray-400 transition-colors duration-150 hover:bg-sky-50 hover:text-sky-500"
              title="设为当前"
            >
              <IconCheck class="w-3.5 h-3.5" />
            </button>
            <button
              @click="emit('edit', model.id)"
              class="inline-flex items-center justify-center w-7 h-7 rounded-lg text-gray-400 transition-colors duration-150 hover:bg-slate-100 hover:text-gray-600"
              title="编辑"
            >
              <IconEdit class="w-3.5 h-3.5" />
            </button>
            <button
              @click="confirmDelete(model.id)"
              class="inline-flex items-center justify-center w-7 h-7 rounded-lg text-gray-400 transition-colors duration-150 hover:bg-red-50 hover:text-red-400"
              title="删除"
            >
              <IconTrash class="w-3.5 h-3.5" />
            </button>
          </template>
        </div>
      </div>

      <!-- 添加按钮 -->
      <button
        @click="emit('add')"
        class="flex items-center justify-center gap-1.5 w-full h-9 text-sm font-medium text-sky-500 bg-sky-50 rounded-lg border border-dashed border-sky-200 transition-all duration-150 hover:bg-sky-100 hover:border-sky-300 active:scale-[0.98]"
      >
        <IconPlus class="w-3.5 h-3.5" />
        添加模型
      </button>
    </div>
  </div>
</template>

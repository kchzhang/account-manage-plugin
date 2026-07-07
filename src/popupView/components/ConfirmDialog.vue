<script setup lang="ts">
import { IconTrash } from '@/icons';

const props = defineProps<{
  visible: boolean;
  title?: string;
  message?: string;
}>();

const emit = defineEmits<{
  confirm: [];
  cancel: [];
}>();
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="absolute inset-0 bg-black/40" @click="emit('cancel')"></div>
      <div class="relative bg-white rounded-lg shadow-xl p-5 w-[280px]">
        <div class="flex items-center gap-2 mb-3">
          <IconTrash class="w-5 h-5 text-red-500 shrink-0" />
          <h3 class="text-base font-semibold text-gray-900">{{ title ?? '确认删除' }}</h3>
        </div>
        <p class="text-sm text-gray-500 mb-5">{{ message ?? '删除后数据无法恢复，确定要继续吗？' }}</p>
        <div class="flex gap-3 justify-end">
          <button
            class="px-3 py-1.5 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
            @click="emit('cancel')"
          >
            取消
          </button>
          <button
            class="px-3 py-1.5 text-sm rounded-md bg-red-500 text-white hover:bg-red-600 transition-colors"
            @click="emit('confirm')"
          >
            删除
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

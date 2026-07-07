<script setup lang="ts">
import { ref, onMounted } from "vue";
import FloatingWindow from "./components/FloatingWindow.vue";
import ModelList from "./components/ModelList.vue";
import ModelConfigForm from "./components/ModelConfigForm.vue";
import { IconSettings, IconChevronLeft } from "@/icons";

type ViewType = 'chat' | 'settings';
type SettingsSubView = 'list' | 'add' | 'edit';

const currentView = ref<ViewType>('chat');
const settingsView = ref<SettingsSubView>('list');
const editingModelId = ref<string>('');

onMounted(() => {
  console.log("Content script app mounted");
});

function switchToSettings() {
  currentView.value = 'settings';
  settingsView.value = 'list';
}

function switchToChat() {
  currentView.value = 'chat';
}

function showAddForm() {
  settingsView.value = 'add';
}

function showEditForm(id: string) {
  editingModelId.value = id;
  settingsView.value = 'edit';
}

function backToList() {
  settingsView.value = 'list';
  editingModelId.value = '';
}

const settingsTitle = () => {
  switch (settingsView.value) {
    case 'add': return '添加模型';
    case 'edit': return '编辑模型';
    default: return '模型管理';
  }
};
</script>

<template>
  <FloatingWindow :title="currentView === 'chat' ? 'AI 助手' : settingsTitle()" :width="420" :height="520">
    <!-- 头部操作按钮 -->
    <template #header-actions>
      <!-- 聊天视图：显示设置图标 -->
      <button
        v-if="currentView === 'chat'"
        @click.stop="switchToSettings"
        class="inline-flex items-center justify-center w-7 h-7 rounded-md cursor-pointer text-gray-400 transition-colors duration-150 hover:bg-slate-100 hover:text-gray-600"
        title="模型配置"
      >
        <IconSettings class="w-3.5 h-3.5" />
      </button>
      <!-- 设置视图：显示返回图标 -->
      <button
        v-else
        @click.stop="currentView === 'settings' && settingsView !== 'list' ? backToList() : switchToChat()"
        class="inline-flex items-center justify-center w-7 h-7 rounded-md cursor-pointer text-gray-400 transition-colors duration-150 hover:bg-slate-100 hover:text-gray-600"
        :title="currentView === 'settings' && settingsView !== 'list' ? '返回列表' : '返回'"
      >
        <IconChevronLeft class="w-3.5 h-3.5" />
      </button>
    </template>

    <!-- 聊天视图 -->
    <div v-if="currentView === 'chat'" class="block font-[inherit]">
      <p class="block text-base font-medium text-gray-800 mb-2">👋 你好！我是 AI 助手</p>
      <p class="block text-sm text-gray-400 leading-relaxed">在这里放置你的插件内容</p>
    </div>

    <!-- 设置视图 -->
    <div v-else class="block font-[inherit]">
      <!-- 子视图 -->
      <ModelList
        v-if="settingsView === 'list'"
        @add="showAddForm"
        @edit="showEditForm"
      />
      <ModelConfigForm
        v-else-if="settingsView === 'add'"
        @saved="backToList"
        @cancel="backToList"
      />
      <ModelConfigForm
        v-else-if="settingsView === 'edit'"
        :edit-model-id="editingModelId"
        @saved="backToList"
        @cancel="backToList"
      />
    </div>
  </FloatingWindow>
</template>

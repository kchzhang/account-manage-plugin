<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { PROVIDER_PRESETS, type ModelConfig } from '@/types/model';
import { addModel, updateModel, getModelList } from '@/utils/modelStorage';
import { IconEye, IconEyeOff, IconCheck } from '@/icons';

const props = defineProps<{
  editModelId?: string;
}>();

const emit = defineEmits<{
  saved: [];
  cancel: [];
}>();

interface FormState {
  name: string;
  provider: ModelConfig['provider'];
  baseUrl: string;
  modelName: string;
  apiKey: string;
}

const isEdit = computed(() => !!props.editModelId);

const form = ref<FormState>({
  name: '',
  provider: 'openai',
  baseUrl: 'https://api.openai.com/v1',
  modelName: 'gpt-4o',
  apiKey: '',
});

const showApiKey = ref(false);
const saving = ref(false);
const saveSuccess = ref(false);

onMounted(async () => {
  if (props.editModelId) {
    const models = await getModelList();
    const model = models.find(m => m.id === props.editModelId);
    if (model) {
      form.value = {
        name: model.name,
        provider: model.provider,
        baseUrl: model.baseUrl,
        modelName: model.modelName,
        apiKey: model.apiKey,
      };
    }
  } else {
    // 新增模式：自动生成默认名称
    const models = await getModelList();
    form.value.name = `模型 ${models.length + 1}`;
  }
});

function onProviderChange() {
  const preset = PROVIDER_PRESETS.find(p => p.key === form.value.provider);
  if (preset && preset.key !== 'custom') {
    form.value.baseUrl = preset.defaultBaseUrl;
    form.value.modelName = preset.defaultModel;
  }
}

async function handleSave() {
  if (!isFormValid()) return;
  saving.value = true;
  saveSuccess.value = false;
  try {
    const config = {
      name: form.value.name.trim(),
      provider: form.value.provider,
      baseUrl: form.value.baseUrl.trim(),
      modelName: form.value.modelName.trim(),
      apiKey: form.value.apiKey.trim(),
    };
    if (isEdit.value && props.editModelId) {
      await updateModel(props.editModelId, config);
    } else {
      await addModel(config);
    }
    saveSuccess.value = true;
    emit('saved');
  } finally {
    saving.value = false;
  }
}

const isFormValid = () =>
  form.value.name.trim() !== '' &&
  form.value.baseUrl.trim() !== '' &&
  form.value.modelName.trim() !== '' &&
  form.value.apiKey.trim() !== '';
</script>

<template>
  <div class="block font-[inherit] space-y-4">
    <!-- 模型别名 -->
    <div class="block">
      <label class="block text-xs font-medium text-gray-500 mb-1.5">模型别名</label>
      <input
        v-model="form.name"
        type="text"
        placeholder="如：我的 GPT-4o"
        class="block w-full h-9 px-3 text-sm bg-white border border-slate-200 rounded-lg text-gray-700 outline-none transition-colors duration-150 focus:border-sky-400 focus:ring-1 focus:ring-sky-100 placeholder:text-gray-300"
      />
    </div>

    <!-- 模型提供商 -->
    <div class="block">
      <label class="block text-xs font-medium text-gray-500 mb-1.5">模型提供商</label>
      <select
        v-model="form.provider"
        @change="onProviderChange"
        class="block w-full h-9 px-3 text-sm bg-white border border-slate-200 rounded-lg text-gray-700 outline-none transition-colors duration-150 focus:border-sky-400 focus:ring-1 focus:ring-sky-100 appearance-none cursor-pointer"
        style="background-image: url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%2394a3b8%22 stroke-width=%222%22><polyline points=%226 9 12 15 18 9%22/></svg>'); background-repeat: no-repeat; background-position: right 10px center;"
      >
        <option v-for="preset in PROVIDER_PRESETS" :key="preset.key" :value="preset.key">
          {{ preset.label }}
        </option>
      </select>
    </div>

    <!-- 接口地址 -->
    <div class="block">
      <label class="block text-xs font-medium text-gray-500 mb-1.5">接口地址</label>
      <input
        v-model="form.baseUrl"
        type="url"
        placeholder="https://api.example.com/v1"
        class="block w-full h-9 px-3 text-sm bg-white border border-slate-200 rounded-lg text-gray-700 outline-none transition-colors duration-150 focus:border-sky-400 focus:ring-1 focus:ring-sky-100 placeholder:text-gray-300"
      />
    </div>

    <!-- 模型名称 -->
    <div class="block">
      <label class="block text-xs font-medium text-gray-500 mb-1.5">模型名称</label>
      <input
        v-model="form.modelName"
        type="text"
        placeholder="gpt-4o"
        class="block w-full h-9 px-3 text-sm bg-white border border-slate-200 rounded-lg text-gray-700 outline-none transition-colors duration-150 focus:border-sky-400 focus:ring-1 focus:ring-sky-100 placeholder:text-gray-300"
      />
    </div>

    <!-- API Key -->
    <div class="block">
      <label class="block text-xs font-medium text-gray-500 mb-1.5">模型 Key</label>
      <div class="flex items-center gap-2">
        <input
          v-model="form.apiKey"
          :type="showApiKey ? 'text' : 'password'"
          placeholder="sk-..."
          class="block flex-1 h-9 px-3 text-sm bg-white border border-slate-200 rounded-lg text-gray-700 outline-none transition-colors duration-150 focus:border-sky-400 focus:ring-1 focus:ring-sky-100 placeholder:text-gray-300"
        />
        <button
          @click="showApiKey = !showApiKey"
          class="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 text-gray-400 transition-colors duration-150 hover:bg-slate-50 hover:text-gray-600 shrink-0"
          :title="showApiKey ? '隐藏' : '显示'"
        >
          <IconEye v-if="!showApiKey" class="w-4 h-4" />
          <IconEyeOff v-else class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="flex items-center gap-2 pt-2">
      <button
        @click="emit('cancel')"
        class="flex-1 h-9 text-sm font-medium text-gray-500 bg-white border border-slate-200 rounded-lg transition-all duration-150 hover:bg-slate-50 active:scale-[0.98]"
      >
        取消
      </button>
      <button
        @click="handleSave"
        :disabled="saving || !isFormValid()"
        class="flex-1 h-9 text-sm font-medium text-white bg-sky-500 rounded-lg transition-all duration-150 hover:bg-sky-600 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-sky-500"
      >
        <span v-if="saving">保存中...</span>
        <span v-else-if="saveSuccess" class="inline-flex items-center justify-center gap-1">
          <IconCheck class="w-3.5 h-3.5" />
          已保存
        </span>
        <span v-else>{{ isEdit ? '保存修改' : '添加模型' }}</span>
      </button>
    </div>
  </div>
</template>

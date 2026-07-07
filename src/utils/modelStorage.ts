import { getStorageData, setStorageData } from '@/utils/storage';
import { generateId, type ModelConfig, type ModelConfigStore } from '@/types/model';

const STORAGE_KEY = 'ai_model_list';

function getEmptyStore(): ModelConfigStore {
  return { models: [], activeModelId: '' };
}

async function getStore(): Promise<ModelConfigStore> {
  const result = await getStorageData(STORAGE_KEY) as Record<string, any> | null;
  if (!result) return getEmptyStore();
  // chrome.storage.local 返回 { key: data }
  const data = result[STORAGE_KEY];
  if (data && typeof data === 'object' && 'models' in data) {
    return { ...getEmptyStore(), ...data };
  }
  return getEmptyStore();
}

async function saveStore(store: ModelConfigStore): Promise<void> {
  await setStorageData(STORAGE_KEY, store);
}

/** 获取所有模型列表 */
export async function getModelList(): Promise<ModelConfig[]> {
  const store = await getStore();
  return store.models;
}

/** 新增模型 */
export async function addModel(config: Omit<ModelConfig, 'id'>): Promise<ModelConfig> {
  const store = await getStore();
  const newModel: ModelConfig = { ...config, id: generateId() };
  store.models.push(newModel);
  // 如果是第一个模型，自动设为激活
  if (store.models.length === 1) {
    store.activeModelId = newModel.id;
  }
  await saveStore(store);
  return newModel;
}

/** 更新模型 */
export async function updateModel(id: string, config: Omit<ModelConfig, 'id'>): Promise<void> {
  const store = await getStore();
  const index = store.models.findIndex(m => m.id === id);
  if (index === -1) throw new Error('模型不存在');
  store.models[index] = { ...config, id };
  await saveStore(store);
}

/** 删除模型 */
export async function deleteModel(id: string): Promise<void> {
  const store = await getStore();
  store.models = store.models.filter(m => m.id !== id);
  // 如果删除的是当前激活模型，切换到第一个
  if (store.activeModelId === id) {
    store.activeModelId = store.models.length > 0 ? store.models[0].id : '';
  }
  await saveStore(store);
}

/** 获取当前激活的模型配置 */
export async function getActiveModel(): Promise<ModelConfig | null> {
  const store = await getStore();
  return store.models.find(m => m.id === store.activeModelId) ?? null;
}

/** 设置当前激活模型 */
export async function setActiveModel(id: string): Promise<void> {
  const store = await getStore();
  if (!store.models.find(m => m.id === id)) throw new Error('模型不存在');
  store.activeModelId = id;
  await saveStore(store);
}

/** 获取激活模型 ID */
export async function getActiveModelId(): Promise<string> {
  const store = await getStore();
  return store.activeModelId;
}

/** 获取完整 Store（供列表页使用） */
export async function getModelStore(): Promise<ModelConfigStore> {
  return getStore();
}

import { ref } from 'vue';
import type { AccountItem, ExportData } from '@/types/account';
import {
  loadAccounts,
  addAccount,
  updateAccount,
  removeAccount,
  createExportData,
  importAccounts,
} from '@/utils/accountStorage';

const accounts = ref<AccountItem[]>([]);
const loading = ref(false);

export function useAccounts() {
  async function refresh() {
    loading.value = true;
    try {
      accounts.value = await loadAccounts();
    } finally {
      loading.value = false;
    }
  }

  async function add(item: Omit<AccountItem, 'id' | 'createdAt' | 'updatedAt'>) {
    const newAccount = await addAccount(item);
    accounts.value.push(newAccount);
    return newAccount;
  }

  async function update(id: string, updates: Partial<Omit<AccountItem, 'id' | 'createdAt'>>) {
    const updated = await updateAccount(id, updates);
    if (updated) {
      const index = accounts.value.findIndex(a => a.id === id);
      if (index !== -1) accounts.value[index] = updated;
    }
    return updated;
  }

  async function remove(id: string) {
    const success = await removeAccount(id);
    if (success) {
      accounts.value = accounts.value.filter(a => a.id !== id);
    }
    return success;
  }

  function exportData(): ExportData {
    return createExportData(accounts.value);
  }

  async function importData(data: ExportData, mode: 'overwrite' | 'merge') {
    const result = await importAccounts(data, mode);
    accounts.value = result;
    return result;
  }

  return {
    accounts,
    loading,
    refresh,
    add,
    update,
    remove,
    exportData,
    importData,
  };
}

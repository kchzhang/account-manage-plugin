import { getStorageData, setStorageData } from '@/utils/storage';
import { generateId } from '@/types/model';
import type {
  AccountItem,
  ExportData,
} from '@/types/account';
import {
  ACCOUNT_STORAGE_KEY,
  EXPORT_VERSION,
} from '@/types/account';

export async function loadAccounts(): Promise<AccountItem[]> {
  const result = await getStorageData(ACCOUNT_STORAGE_KEY) as Record<string, any> | null;
  if (!result) return [];
  // chrome.storage.local 返回 { key: data }
  const data = result[ACCOUNT_STORAGE_KEY];
  if (data && typeof data === 'object' && 'accounts' in data) {
    return data.accounts;
  }
  return [];
}

export async function saveAccounts(accounts: AccountItem[]): Promise<void> {
  await setStorageData(ACCOUNT_STORAGE_KEY, { accounts });
}

export async function addAccount(item: Omit<AccountItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<AccountItem> {
  const accounts = await loadAccounts();
  const now = Date.now();
  const newAccount: AccountItem = {
    ...item,
    id: generateId(),
    createdAt: now,
    updatedAt: now,
  };
  accounts.push(newAccount);
  await saveAccounts(accounts);
  return newAccount;
}

export async function updateAccount(id: string, updates: Partial<Omit<AccountItem, 'id' | 'createdAt'>>): Promise<AccountItem | null> {
  const accounts = await loadAccounts();
  const index = accounts.findIndex(a => a.id === id);
  if (index === -1) return null;
  accounts[index] = { ...accounts[index], ...updates, updatedAt: Date.now() };
  await saveAccounts(accounts);
  return accounts[index];
}

export async function removeAccount(id: string): Promise<boolean> {
  const accounts = await loadAccounts();
  const filtered = accounts.filter(a => a.id !== id);
  if (filtered.length === accounts.length) return false;
  await saveAccounts(filtered);
  return true;
}

export function createExportData(accounts: AccountItem[]): ExportData {
  return {
    version: EXPORT_VERSION,
    exportDate: Date.now(),
    accounts,
  };
}

export async function importAccounts(data: ExportData, mode: 'overwrite' | 'merge'): Promise<AccountItem[]> {
  if (mode === 'overwrite') {
    await saveAccounts(data.accounts);
    return data.accounts;
  }
  // merge: keep existing, add new (skip duplicate ids)
  const existing = await loadAccounts();
  const existingIds = new Set(existing.map(a => a.id));
  const newItems = data.accounts.filter(a => !existingIds.has(a.id));
  const merged = [...existing, ...newItems];
  await saveAccounts(merged);
  return merged;
}

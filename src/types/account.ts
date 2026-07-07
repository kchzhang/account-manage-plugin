export interface AccountItem {
  id: string;
  name: string;
  username: string;
  password: string;
  url: string;
  createdAt: number;
  updatedAt: number;
}

export interface AccountStore {
  accounts: AccountItem[];
}

export interface ExportData {
  version: string;
  exportDate: number;
  accounts: AccountItem[];
}

export const ACCOUNT_STORAGE_KEY = 'account_data';
export const EXPORT_VERSION = '1.0';

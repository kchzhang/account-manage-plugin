// 存储数据 - 统一使用 chrome.storage.local，开发环境 fallback 到 localStorage

const hasChromeStorage = typeof window !== 'undefined' && window.chrome?.storage?.local;

export function setStorageData(keyName: string, data: object) {
  if (hasChromeStorage) {
    return new Promise((resolve) => {
      window.chrome.storage.local.set({ [keyName]: data }, function () {
        resolve(true);
      });
    });
  }
  // 开发环境 fallback: 使用 localStorage
  localStorage.setItem(keyName, JSON.stringify(data));
  return Promise.resolve(true);
}

export function getStorageData(key: string) {
  if (hasChromeStorage) {
    return new Promise((resolve) => {
      window.chrome.storage.local.get([key], function (result: object | null) {
        resolve(result);
      });
    });
  }
  // 开发环境 fallback: 使用 localStorage
  const raw = localStorage.getItem(key);
  if (!raw) return Promise.resolve(null);
  try {
    const data = JSON.parse(raw);
    // 兼容 chrome.storage.local 的返回格式 { key: data }
    return Promise.resolve({ [key]: data });
  } catch {
    return Promise.resolve(null);
  }
}

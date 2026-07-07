// 存储数据 - 统一使用 chrome.storage.local

export function setStorageData(keyName: string, data: object) {
  return new Promise((resolve) => {
    window.chrome.storage.local.set({ [keyName]: data }, function () {
      resolve(true);
    });
  });
}

export function getStorageData(key: string) {
  return new Promise((resolve) => {
    window.chrome.storage.local.get([key], function (result: object | null) {
      resolve(result);
    });
  });
}

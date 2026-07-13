import { CACHE_BUST_PARAM } from '@/constants/protocol';

/**
 * 添加缓存破坏参数：URL 含 hash 时嵌入 hash 内部，无 hash 时用普通 query 参数
 * 例：http://example.com#/login → http://example.com#/login?__am_t=xxx
 * 例：http://example.com/path → http://example.com/path?__am_t=xxx
 */
export function addCacheBustParam(urlObj: URL, value: string = Date.now().toString()): void {
  if (urlObj.hash) {
    // URL 有 hash：参数嵌入 hash fragment 内部
    const hashContent = urlObj.hash.slice(1); // 移除 '#'
    const [hashPath, hashQuery] = hashContent.split('?');
    const hashParams = new URLSearchParams(hashQuery || '');
    hashParams.set(CACHE_BUST_PARAM, value);
    urlObj.hash = `#${hashPath}?${hashParams.toString()}`;
  } else {
    // URL 无 hash：用普通 query 参数
    urlObj.searchParams.set(CACHE_BUST_PARAM, value);
  }
}

/**
 * 清理 URL 中的缓存破坏参数（同时清理 query 和 hash fragment）
 */
export function removeCacheBustParam(urlObj: URL): void {
  // 清理普通 query 参数
  urlObj.searchParams.delete(CACHE_BUST_PARAM);
  // 清理 hash fragment 内部的参数
  if (urlObj.hash) {
    const hashContent = urlObj.hash.slice(1);
    const [hashPath, hashQuery] = hashContent.split('?');
    if (hashQuery) {
      const hashParams = new URLSearchParams(hashQuery);
      hashParams.delete(CACHE_BUST_PARAM);
      const newQuery = hashParams.toString();
      urlObj.hash = newQuery ? `#${hashPath}?${newQuery}` : `#${hashPath}`;
    }
  }
}

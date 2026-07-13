/**
 * URL 匹配工具 — 共享于 Content script 和 Background
 * 判断两个 URL 是否指向同一页面（origin + pathname 匹配，忽略尾部斜杠和 query/hash）
 */
export function isSamePage(currentUrl: string, targetUrl: string): boolean {
  try {
    const normalizedTarget = targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`;
    const u1 = new URL(currentUrl);
    const u2 = new URL(normalizedTarget);
    const p1 = u1.pathname.replace(/\/+$/, '');
    const p2 = u2.pathname.replace(/\/+$/, '');
    return u1.origin.toLowerCase() === u2.origin.toLowerCase() && p1.toLowerCase() === p2.toLowerCase();
  } catch {
    return currentUrl.includes(targetUrl.replace(/^https?:\/\//, '').toLowerCase());
  }
}

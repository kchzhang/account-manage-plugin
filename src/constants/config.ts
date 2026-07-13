// ── 功能开关 ──

/** 是否启用 URL 参数触发的自动登录（auto_login=1） */
export const AUTO_LOGIN_ENABLED = false;

// ── 超时（毫秒） ──

/** 自动填充请求超时（content → insert postMessage 等待结果） */
export const AUTO_FILL_REQUEST_TIMEOUT_MS = 5000;

/** LOGIN_REQUEST 消息超时（content onMessage 等待 insert 回传） */
export const LOGIN_REQUEST_TIMEOUT_MS = 8000;

/** 页面 load 事件等待超时 */
export const PAGE_LOAD_WAIT_TIMEOUT_MS = 3000;

/** Tab 导航后等待 onUpdated.complete 超时 */
export const TAB_NAVIGATION_TIMEOUT_MS = 10000;

/** 密码框轮询最大等待时间 */
export const PASSWORD_INPUT_MAX_WAIT_MS = 5000;

// ── 重试 / 轮询 ──

/** 自动填充最大重试次数 */
export const MAX_AUTO_FILL_RETRIES = 3;

/** 自动填充重试间隔（毫秒） */
export const AUTO_FILL_RETRY_DELAY_MS = 1000;

/** PING 探针最大重试次数 */
export const PING_MAX_RETRIES = 20;

/** PING 探针间隔（毫秒） */
export const PING_INTERVAL_MS = 500;

/** 密码框轮询间隔（毫秒） */
export const PASSWORD_POLL_INTERVAL_MS = 500;

/** waitForFrames 超时兜底（毫秒） */
export const WAIT_FRAMES_TIMEOUT_MS = 200;

// ── UI 布局 ──

/** 浮动窗口 z-index（32-bit int 最大值，确保始终置顶） */
export const FLOATING_WINDOW_Z_INDEX = 2147483647;

/** 浮动窗口 header 高度（px），用于拖拽 Y 边界约束 */
export const HEADER_HEIGHT = 48;

/** 浮动窗口默认边距（px），初始定位距屏幕右下角的距离 */
export const WINDOW_MARGIN = 20;

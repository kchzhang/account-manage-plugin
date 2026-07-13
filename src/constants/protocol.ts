/** 消息类型标识（跨 context/postMessage/chrome.runtime.onMessage 通信协议） */
export const MSG_TYPE_PING = 'PING';
export const MSG_TYPE_LOGIN_REQUEST = 'LOGIN_REQUEST';
export const MSG_TYPE_LOGIN_RESULT = 'LOGIN_RESULT';

/** 消息来源标识（postMessage 跨 world 通信，用于 content ↔ insert 鉴权） */
export const MSG_SOURCE_CONTENT = 'accountManage-content';
export const MSG_SOURCE_INSERT = 'accountManage-insert';

/** URL 自动登录参数名与值 */
export const AUTO_LOGIN_PARAM = '333333cc_atttttuto11111_login11111111111';
export const AUTO_LOGIN_VALUE = '1';

/** 消息类型标识（跨 context/postMessage/chrome.runtime.onMessage 通信协议） */
export const MSG_TYPE_PING = 'PING';
export const MSG_TYPE_LOGIN_REQUEST = 'LOGIN_REQUEST';
export const MSG_TYPE_LOGIN_RESULT = 'LOGIN_RESULT';

/** 凭据请求/响应（Pull 模型：Insert 主动发起，Background 数据服务） */
export const MSG_TYPE_CREDENTIAL_REQUEST = 'CREDENTIAL_REQUEST';
export const MSG_TYPE_CREDENTIAL_RESPONSE = 'CREDENTIAL_RESPONSE';

/** 消息来源标识（postMessage 跨 world 通信，用于 content ↔ insert 鉴权） */
export const MSG_SOURCE_CONTENT = 'accountManage-content';
export const MSG_SOURCE_INSERT = 'accountManage-insert';

/** URL 自动登录参数名与值（`__am_` 前缀 = account-manage 内部标识，双下划线约定表私有） */
export const AUTO_LOGIN_PARAM = '__am_login';
export const AUTO_LOGIN_VALUE = '1';

/** URL 精确账号标识参数名（可选，用于 Pull 模型精确匹配） */
export const AUTO_LOGIN_ACCOUNT_ID_PARAM = '__am_aid';

/** 缓存破坏参数名（时间戳，防止浏览器缓存旧页面） */
export const CACHE_BUST_PARAM = '__am_t';

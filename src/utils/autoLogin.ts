/**
 * 自动登录 — 自包含函数，供 chrome.scripting.executeScript 注入到目标页面
 * 由于 executeScript 会序列化 func 参数，该函数不能引用任何外部导入
 *
 * 设计思路：以 input[type=password] 为锚点，向上查找容器/form，
 * 在容器上下文中向上/向下查找用户名输入框和提交按钮
 */

// ── 工具函数 ──

/**
 * 带超时兜底的 requestAnimationFrame 等待
 * 防止页面处于后台/未渲染状态时 rAF 不触发导致 Promise 永远挂起
 */
function waitForFrames(count: number, timeoutMs = 200): Promise<void> {
  return new Promise<void>((resolve) => {
    let resolved = false;
    let frameCount = 0;

    const onFrame = () => {
      frameCount++;
      if (frameCount >= count && !resolved) {
        resolved = true;
        resolve();
      } else if (!resolved) {
        requestAnimationFrame(onFrame);
      }
    };

    requestAnimationFrame(onFrame);

    // 超时兜底：防止 rAF 不触发时永远挂起
    setTimeout(() => {
      if (!resolved) {
        console.log('[autoLogin] waitForFrames 超时兜底触发, 已等待 %d 帧 (目标=%d)', frameCount, count);
        resolved = true;
        resolve();
      }
    }, timeoutMs);
  });
}

function isVisible(el: HTMLElement): boolean {
  if (!el.offsetParent && el.tagName !== 'BODY') {
    console.log('[autoLogin] isVisible ❌ — offsetParent=null, tag=%s', el.tagName);
    return false;
  }
  const style = getComputedStyle(el);
  const result = style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
  if (!result) {
    console.log('[autoLogin] isVisible ❌ — display=%s visibility=%s opacity=%s', style.display, style.visibility, style.opacity);
  }
  return result;
}

/**
 * 填充输入框 — 简化版
 * 只做：原生 setter 写值 + input/change 事件
 */
function fillInput(el: HTMLInputElement, value: string): boolean {
  console.log('[autoLogin] fillInput — 目标=%s type=%s name=%s 值="%s"', el.tagName, el.type, el.name || el.id || '(无名)', value);
  el.focus();

  // 清除 React _valueTracker，防止 React 跳过 onChange
  const tracker = (el as any)._valueTracker;
  if (tracker) {
    tracker.setValue('');
    console.log('[autoLogin] fillInput — React _valueTracker 已清除');
  } else {
    console.log('[autoLogin] fillInput — 无 React _valueTracker');
  }

  // 使用原生 setter 绕过框架拦截
  const nativeSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  if (nativeSetter) {
    nativeSetter.call(el, value);
    console.log('[autoLogin] fillInput — 使用原生 setter 写值');
  } else {
    el.value = value;
    console.log('[autoLogin] fillInput — 原生 setter 不可用，直接赋值');
  }

  // 触发标准事件
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));

  const filledOk = el.value === value;
  console.log('[autoLogin] fillInput — 填充后 el.value="%s" 期望="%s" 匹配=%s', el.value, value, filledOk ? '✓' : '❌');
  return filledOk;
}

// ── 协议勾选 ──

/**
 * 在容器内勾选所有可见的 checkbox（协议/条款勾选框）
 * 策略：找到容器内所有可见的 input[type=checkbox]，如果未选中则自动勾选
 */
function checkAgreementCheckbox(container: HTMLElement): number {
  const checkboxes = Array.from(container.querySelectorAll<HTMLInputElement>(
    'input[type="checkbox"]',
  ))
    .filter(isVisible);

  console.log('[autoLogin] checkAgreementCheckbox — 可见 checkbox 数=%d', checkboxes.length);

  let checkedCount = 0;
  for (const cb of checkboxes) {
    if (cb.checked) {
      console.log('[autoLogin] checkAgreementCheckbox — 已选中, 跳过: name=%s id=%s', cb.name || '(无名)', cb.id || '(无名)');
      continue;
    }

    // 清除 React _valueTracker，防止 React 跳过 onChange
    const tracker = (cb as any)._valueTracker;
    if (tracker) {
      tracker.setValue('false');
      console.log('[autoLogin] checkAgreementCheckbox — React _valueTracker 已清除');
    }

    // 使用原生 setter 设置 checked
    const nativeCheckedSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'checked')?.set;
    if (nativeCheckedSetter) {
      nativeCheckedSetter.call(cb, true);
      console.log('[autoLogin] checkAgreementCheckbox — 使用原生 setter 选中');
    } else {
      cb.checked = true;
      console.log('[autoLogin] checkAgreementCheckbox — 直接赋值选中');
    }

    // 触发事件
    cb.dispatchEvent(new Event('change', { bubbles: true }));
    cb.dispatchEvent(new Event('input', { bubbles: true }));

    checkedCount++;
    console.log('[autoLogin] checkAgreementCheckbox ✓ — 已勾选: name=%s id=%s', cb.name || '(无名)', cb.id || '(无名)');
  }

  return checkedCount;
}

// ── DOM 上下文查找 ──

/**
 * 从密码框向上查找最近的逻辑容器
 * 优先级：form > 有 role=form 的元素 > 直接父级 div/section
 */
function findContainer(pwdEl: HTMLInputElement): HTMLElement | null {
  // 1. form 元素
  if (pwdEl.form) {
    console.log('[autoLogin] findContainer ✓ — form 元素: %s', pwdEl.form.tagName);
    return pwdEl.form;
  }

  // 2. 向上找 role=form
  const roleForm = pwdEl.closest('[role="form"]');
  if (roleForm) {
    console.log('[autoLogin] findContainer ✓ — role=form: %s', roleForm.tagName);
    return roleForm as HTMLElement;
  }

  // 3. 向上找合理的容器（div/section/main/article）
  const container = pwdEl.closest('div, section, main, article, fieldset');
  if (container) {
    console.log('[autoLogin] findContainer ✓ — 通用容器: %s', container.tagName);
  } else {
    console.log('[autoLogin] findContainer ❌ — 未找到任何容器');
  }
  return container as HTMLElement | null;
}

/**
 * 在容器内，在密码框之前查找用户名输入框
 * 策略：优先找 type=email/type=text 的可见 input，且位于密码框之前
 */
function findUsernameInContext(pwdEl: HTMLInputElement, container: HTMLElement): HTMLInputElement | null {
  const allInputs = Array.from(container.querySelectorAll<HTMLInputElement>(
    'input[type="text"], input[type="email"], input[type="tel"], input:not([type])',
  ))
    .filter(isVisible);

  console.log('[autoLogin] findUsernameInContext — 可见 text-like 输入框数=%d 清单=%s',
    allInputs.length,
    allInputs.map(el => `type=${el.type} name=${el.name||el.id||'(无名)'}`).join(', '),
  );

  if (allInputs.length === 0) {
    console.log('[autoLogin] findUsernameInContext ❌ — 无可见 text-like 输入框');
    return null;
  }

  // 在密码框之前的所有 text-like 输入框
  const beforePwd = allInputs.filter(el => {
    // DOM 顺序比较
    const position = el.compareDocumentPosition(pwdEl);
    // el 在 pwdEl 之前 = Node.DOCUMENT_POSITION_FOLLOWING (4)
    return (position & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
  });

  console.log('[autoLogin] findUsernameInContext — 在密码框之前的输入框数=%d', beforePwd.length);

  // 取紧挨密码框之前的那个（最后一个 beforePwd）
  if (beforePwd.length > 0) {
    const chosen = beforePwd[beforePwd.length - 1];
    console.log('[autoLogin] findUsernameInContext ✓ — 选定: type=%s name=%s', chosen.type, chosen.name || chosen.id || '(无名)');
    return chosen;
  }

  // 如果没有在密码框之前的，取第一个 text-like 输入框
  console.log('[autoLogin] findUsernameInContext ⚠ — 无在密码框之前的输入框，取第一个: type=%s name=%s', allInputs[0].type, allInputs[0].name || allInputs[0].id || '(无名)');
  return allInputs[0];
}

/**
 * 在容器内查找提交按钮
 * 策略：
 * 1. form 内的 type=submit 按钮
 * 2. 关键词匹配的 button（登录/提交等）
 * 3. 容器内第一个可见 button
 */
function findSubmitInContext(container: HTMLElement): HTMLElement | null {
  const allBtns = Array.from(container.querySelectorAll<HTMLElement>(
    'button, input[type="submit"], input[type="button"], a[role="button"]',
  ))
    .filter(isVisible);

  console.log('[autoLogin] findSubmitInContext — 可见按钮数=%d 文案=%s',
    allBtns.length,
    allBtns.map(el => (el.textContent || el.getAttribute('value') || el.getAttribute('title') || '').trim().slice(0, 30)).join(' | '),
  );

  if (allBtns.length === 0) {
    console.log('[autoLogin] findSubmitInContext ❌ — 无可见按钮');
    return null;
  }

  // 提交关键词
  const submitPatterns = ['login', 'sign-in', 'signin', 'submit', 'enter', 'log-in', '登录', '登陆', '提交', '确认'];

  // 1. type=submit
  const submitInput = allBtns.find(
    el => el.tagName === 'INPUT' && (el as HTMLInputElement).type === 'submit',
  );
  if (submitInput) {
    console.log('[autoLogin] findSubmitInContext ✓ — type=submit 按钮');
    return submitInput;
  }

  // 2. 关键词匹配
  const matched = allBtns.find(el => {
    const text = (el.textContent || el.getAttribute('value') || el.getAttribute('title') || '').toLowerCase();
    return submitPatterns.some(p => text.includes(p));
  });
  if (matched) {
    console.log('[autoLogin] findSubmitInContext ✓ — 关键词匹配: "%s"', (matched.textContent || matched.getAttribute('value') || '').trim());
    return matched;
  }

  // 3. 第一个可见 button
  console.log('[autoLogin] findSubmitInContext ⚠ — 无关键词匹配，取第一个可见按钮: "%s"', (allBtns[0].textContent || allBtns[0].getAttribute('value') || '').trim());
  return allBtns[0];
}

// ── 主流程 ──

/**
 * 等待页面加载
 */
function waitForPageLoad(): Promise<void> {
  console.log('[autoLogin] waitForPageLoad — readyState=%s', document.readyState);
  if (document.readyState === 'complete') {
    console.log('[autoLogin] waitForPageLoad ✓ — 页面已加载完成');
    return Promise.resolve();
  }
  return new Promise<void>(resolve => {
    const onLoad = () => {
      window.removeEventListener('load', onLoad);
      console.log('[autoLogin] waitForPageLoad ✓ — load 事件触发');
      resolve();
    };
    window.addEventListener('load', onLoad);
    setTimeout(() => {
      window.removeEventListener('load', onLoad);
      console.log('[autoLogin] waitForPageLoad ⚠ — 3秒超时，继续执行');
      resolve();
    }, 3000);
  });
}

/**
 * 查找密码输入框（轮询等待）
 */
function waitForPasswordInput(maxWait = 5000): Promise<HTMLInputElement | null> {
  const checkInterval = 500;
  const startTime = Date.now();
  let pollCount = 0;

  return new Promise(resolve => {
    const check = () => {
      pollCount++;
      const allPwdInputs = document.querySelectorAll<HTMLInputElement>('input[type="password"]');
      const visibleInputs = Array.from(allPwdInputs).filter(isVisible);
      const elapsed = Date.now() - startTime;
      console.log('[autoLogin] waitForPasswordInput — 第%d次轮询 已等待%dms 总密码框=%d 可见=%d',
        pollCount, elapsed, allPwdInputs.length, visibleInputs.length,
      );
      if (visibleInputs.length > 0) {
        console.log('[autoLogin] waitForPasswordInput ✓ — 找到可见密码框: name=%s id=%s', visibleInputs[0].name, visibleInputs[0].id);
        resolve(visibleInputs[0]);
        return;
      }
      if (elapsed >= maxWait) {
        console.log('[autoLogin] waitForPasswordInput ❌ — 等待%dms后仍未找到可见密码框', maxWait);
        resolve(null);
        return;
      }
      setTimeout(check, checkInterval);
    };
    check();
  });
}

/**
 * 主入口 — 注入到目标页面执行
 * 以 password 为锚点 → 查容器 → 查用户名 → 查提交按钮
 */
export async function autoLogin(
  username: string,
  password: string,
  autoSubmit = true,
): Promise<{ success: boolean; message: string; filled: boolean; submitted: boolean }> {
  console.log('[autoLogin] ========== 自动登录开始 ========== 用户=%s 密码长度=%d 自动提交=%s', username, password.length, autoSubmit);

  await waitForPageLoad();

  // 插入隐藏 input 并 focus，将焦点从浏览器地址栏拉回页面
  // 关键：元素必须在视口内、opacity 非 0、无 pointer-events:none，否则浏览器可能拒绝 focus
  const stealthInput = document.createElement('input');
  stealthInput.type = 'text';
  stealthInput.tabIndex = -1;           // 不加入 Tab 序列
  stealthInput.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0.01;z-index:-1;border:none;margin:0;padding:0;';
  document.body.appendChild(stealthInput);
  // 先尝试 window.focus()，再 focus 隐藏 input
  window.focus();
  // 等待下一帧确保 DOM 渲染完成，focus 生效
  await waitForFrames(2);
  stealthInput.focus();
  console.log('[autoLogin] 焦点归位 — window.focus() + 隐藏 input focus, activeElement=%s', document.activeElement?.tagName);
  // 延迟移除，避免焦点瞬间丢失 — 等两帧后移除
  waitForFrames(2).then(() => stealthInput.remove());

  const pwdEl = await waitForPasswordInput();
  if (!pwdEl) {
    console.log('[autoLogin] ========== 自动登录失败 ========== ❌ 未找到密码输入框');
    return { success: false, message: '未找到密码输入框（等待5秒后仍无 password input）', filled: false, submitted: false };
  }

  // 从密码框找容器
  const container = findContainer(pwdEl) || pwdEl.parentElement as HTMLElement;
  console.log('[autoLogin] 容器: tag=%s class=%s', container.tagName, container.className?.slice(0, 50));

  // 在容器内找用户名输入框
  const usernameEl = findUsernameInContext(pwdEl, container);

  // 填充
  let filled = false;

  if (usernameEl) {
    const usernameOk = fillInput(usernameEl, username);
    filled = usernameOk;
    console.log('[autoLogin] 用户名填充 %s', usernameOk ? '✓' : '❌');
  } else {
    console.log('[autoLogin] ⚠ — 未找到用户名输入框，跳过');
  }

  const pwdOk = fillInput(pwdEl, password);
  if (pwdOk) filled = true;
  console.log('[autoLogin] 密码填充 %s', pwdOk ? '✓' : '❌');

  // 勾选协议 checkbox
  const checkedCount = checkAgreementCheckbox(container);
  console.log('[autoLogin] 协议 checkbox 勾选数=%d', checkedCount);

  // 提交
  let submitted = false;

  if (autoSubmit && filled) {
    // 等待两帧，确保框架（React/Vue）已处理 input/change 事件并更新内部状态
    await waitForFrames(2);

    const submitBtn = findSubmitInContext(container);
    if (submitBtn) {
      submitBtn.click();
      submitted = true;
      console.log('[autoLogin] 提交按钮点击 ✓');
    } else if (pwdEl.form) {
      pwdEl.form.submit();
      submitted = true;
      console.log('[autoLogin] form.submit() ✓');
    } else {
      console.log('[autoLogin] 提交 ❌ — 未找到提交按钮也无 form');
    }
  } else if (!filled) {
    console.log('[autoLogin] 跳过提交 — 填充未成功');
  } else if (!autoSubmit) {
    console.log('[autoLogin] 跳过提交 — autoSubmit=false');
  }

  const msg = submitted
    ? '已填写并提交登录'
    : filled
      ? '已填写登录信息，但未找到提交按钮'
      : '未找到可填写的输入框';

  console.log('[autoLogin] ========== 自动登录结束 ========== 结果=%s 填充=%s 提交=%s 消息="%s"',
    filled && submitted ? '✓ 成功' : '❌/⚠ 未完全成功',
    filled ? '✓' : '❌',
    submitted ? '✓' : '❌',
    msg,
  );

  return { success: filled, message: msg, filled, submitted };
}

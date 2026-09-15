(function () {
  const api = (path, options = {}) => fetch(`/api${path}`, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  }).then(async (response) => {
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(body.error?.message || body.error || `请求失败（${response.status}）`);
      error.status = response.status;
      error.body = body;
      throw error;
    }
    return body;
  });

  let currentUser = null;
  let loginPromise = null;

  function ensureStyles() {
    if (document.getElementById('serverAuthStyles')) return;
    const style = document.createElement('style');
    style.id = 'serverAuthStyles';
    style.textContent = `
      #serverAuthOverlay { position: fixed; inset: 0; z-index: 99999; display: grid; place-items: center; padding: 1rem; background: rgba(42,43,42,.72); }
      #serverAuthCard { width: min(100%, 28rem); border-radius: 1.5rem; padding: 2rem; background: #fff; box-shadow: 0 2rem 5rem rgba(0,0,0,.25); color: #2a2b2a; }
      #serverAuthCard input { width: 100%; box-sizing: border-box; border: 1px solid #d8d5ca; border-radius: .75rem; padding: .75rem; margin-top: .35rem; }
      #serverAuthCard button { width: 100%; border: 0; border-radius: .75rem; padding: .8rem; margin-top: 1rem; background: #3d3929; color: #fff; font-weight: 700; cursor: pointer; }
      #serverAuthError { min-height: 1.4rem; color: #9b241a; margin-top: .8rem; font-size: .9rem; }
      #serverUserControls { position: fixed; top: 1rem; right: 1rem; z-index: 9998; display: flex; align-items: center; gap: .65rem; padding: .55rem .65rem .55rem .9rem; border: 1px solid rgba(61,57,41,.16); border-radius: 999px; background: rgba(248,247,242,.94); color: #3d3929; box-shadow: 0 .5rem 1.5rem rgba(0,0,0,.12); font: 700 14px sans-serif; }
      #serverUserControls button, #serverUserControls a { border: 0; border-radius: 999px; padding: .45rem .8rem; background: #3d3929; color: #fff; font: inherit; text-decoration: none; cursor: pointer; }
      #serverUserControls button:disabled { opacity: .6; cursor: wait; }
      @media (max-width: 640px) { #serverUserControls { top: .6rem; right: .6rem; max-width: calc(100vw - 1.2rem); font-size: 12px; } #serverUserControls span { max-width: 9rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; } }
    `;
    document.head.appendChild(style);
  }

  function showLogin() {
    if (loginPromise) return loginPromise;
    loginPromise = new Promise((resolve) => {
      ensureStyles();
      const overlay = document.createElement('div');
      overlay.id = 'serverAuthOverlay';
      overlay.innerHTML = `
        <form id="serverAuthCard">
          <h1 style="margin:0 0 .5rem">博士工作台</h1>
          <p style="margin:0 0 1.5rem;color:#6b695f">请登录后继续使用你的工作记录</p>
          <label>用户名<input name="username" autocomplete="username" required></label>
          <label style="display:block;margin-top:1rem">密码<input name="password" type="password" autocomplete="current-password" required></label>
          <div id="serverAuthError"></div>
          <button type="submit">登录</button>
        </form>
      `;
      document.body.appendChild(overlay);
      const form = overlay.querySelector('form');
      const error = overlay.querySelector('#serverAuthError');
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const button = form.querySelector('button');
        button.disabled = true;
        error.textContent = '';
        try {
          const result = await api('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username: form.username.value, password: form.password.value }),
          });
          currentUser = result.user;
          overlay.remove();
          renderUserControls();
          resolve(currentUser);
        } catch (err) {
          error.textContent = err.message;
          button.disabled = false;
        }
      });
      form.username.focus();
    });
    return loginPromise;
  }

  async function authenticate() {
    if (currentUser) return currentUser;
    try {
      currentUser = (await api('/auth/me')).user;
      renderUserControls();
      return currentUser;
    } catch (err) {
      if (err.status !== 401) throw err;
      return await showLogin();
    }

  }

  function renderUserControls() {
    if (!currentUser || document.getElementById('serverUserControls')) return;
    ensureStyles();
    const controls = document.createElement('div');
    controls.id = 'serverUserControls';
    const roleLabel = currentUser.role === 'admin' ? '管理员' : '普通用户';
    controls.innerHTML = `
      <span title="${escapeHtml(currentUser.username)}">当前账号：${escapeHtml(currentUser.username)}（${roleLabel}）</span>
      ${currentUser.role === 'admin' ? '<a href="/admin.html">管理后台</a>' : ''}
      <button type="button" id="serverLogoutButton">退出登录</button>
    `;
    document.body.appendChild(controls);
    controls.querySelector('#serverLogoutButton').addEventListener('click', async (event) => {
      const button = event.currentTarget;
      button.disabled = true;
      try {
        await api('/auth/logout', { method: 'POST' });
        currentUser = null;
        loginPromise = null;
        controls.remove();
        window.location.reload();
      } catch (error) {
        button.disabled = false;
        window.alert(`退出登录失败：${error.message}`);
      }
    });
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }[character]));
  }

  async function requestWorkspace() {
    await authenticate();
    return await api('/workspace');
  }

  async function saveWorkspace(state, version) {
    await authenticate();
    return await api('/workspace', {
      method: 'PUT',
      body: JSON.stringify({ state, version }),
    });
  }

  window.PhdWorkbenchServer = {
    enabled: true,
    authenticate,
    currentUser: () => currentUser,
    loadWorkspace: requestWorkspace,
    saveWorkspace,
    clearWorkspace: async () => {
      await authenticate();
      return await api('/workspace', { method: 'DELETE' });
    },
  };

  // Start the production login gate before the workbench initializes.
  authenticate().catch((error) => {
    console.error(error);
    document.body.dataset.serverAuthError = 'true';
  });
})();

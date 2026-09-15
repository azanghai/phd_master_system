(function () {
  const $ = (id) => document.getElementById(id);
  const message = (text, type = 'muted') => { $('adminMessage').className = type; $('adminMessage').textContent = text; };
  const api = async (path, options = {}) => {
    const response = await fetch(`/api${path}`, { credentials: 'same-origin', ...options });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error?.message || body.error || `请求失败（${response.status}）`);
    return body;
  };
  const format = (value) => value ? new Date(value).toLocaleString() : '-';
  function statCard(label, value) { return `<div style="background:#f7f6f1;border-radius:.9rem;padding:.8rem"><div class="muted">${label}</div><strong style="font-size:1.5rem">${value ?? 0}</strong></div>`; }
  async function load() {
    try {
      const me = await api('/auth/me');
      if (me.user?.role !== 'admin') { location.href = '/'; return; }
      $('adminIdentity').textContent = `当前管理员：${me.user.username}`;
      const [users, stats] = await Promise.all([api('/admin/users'), api('/admin/stats')]);
      const list = users.users || [];
      const data = stats.stats || stats;
      $('statsGrid').innerHTML = [
        statCard('用户总数', data.userCount ?? data.users),
        statCard('活跃用户', data.activeUsers ?? data.active),
        statCard('停用用户', data.disabledUsers ?? data.disabled),
        statCard('工作区数量', data.workspaceCount ?? data.workspaces),
        statCard('附件数量', data.attachmentCount ?? data.attachments),
        statCard('附件容量', `${Math.round((Number(data.attachmentBytes ?? data.attachmentSize ?? 0) / 1024 / 1024) * 10) / 10} MB`)
      ].join('');
      $('usersBody').innerHTML = list.map((user) => `
        <tr>
          <td><strong>${escapeHtml(user.username)}</strong></td>
          <td><select data-role="${user.id}" ${user.id === me.user.id ? 'disabled' : ''}><option value="user" ${user.role === 'user' ? 'selected' : ''}>普通用户</option><option value="admin" ${user.role === 'admin' ? 'selected' : ''}>管理员</option></select></td>
          <td>${user.disabledAt ? '<span class="error">已停用</span>' : '<span class="success">正常</span>'}</td>
          <td>${format(user.createdAt)}</td>
          <td style="white-space:nowrap"><button class="secondary" data-toggle="${user.id}" ${user.id === me.user.id ? 'disabled' : ''}>${user.disabledAt ? '启用' : '停用'}</button> <button class="secondary" data-reset="${user.id}">重置密码</button></td>
        </tr>`).join('');
      bindUserActions();
    } catch (error) { message(error.message, 'error'); }
  }
  function escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char])); }
  function bindUserActions() {
    document.querySelectorAll('[data-role]').forEach((select) => select.onchange = async () => {
      try { await api(`/admin/users/${select.dataset.role}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role: select.value }) }); message('用户角色已更新', 'success'); await load(); }
      catch (error) { message(error.message, 'error'); await load(); }
    });
    document.querySelectorAll('[data-toggle]').forEach((button) => button.onclick = async () => {
      if (!confirm('确定修改该账号的启用状态吗？')) return;
      try { await api(`/admin/users/${button.dataset.toggle}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ disabled: button.textContent.trim() === '停用' }) }); await load(); }
      catch (error) { message(error.message, 'error'); }
    });
    document.querySelectorAll('[data-reset]').forEach((button) => button.onclick = async () => {
      const password = prompt('请输入新的初始密码（至少12位）：');
      if (!password) return;
      try { await api(`/admin/users/${button.dataset.reset}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) }); message('密码已重置', 'success'); }
      catch (error) { message(error.message, 'error'); }
    });
  }
  $('createUserForm').onsubmit = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try { await api('/admin/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.fromEntries(form)) }); event.currentTarget.reset(); message('用户已创建', 'success'); await load(); }
    catch (error) { message(error.message, 'error'); }
  };
  $('logoutButton').onclick = async () => { await api('/auth/logout', { method: 'POST' }); location.href = '/'; };
  $('downloadBackup').onclick = async () => {
    try { const response = await fetch('/api/admin/backup', { credentials: 'same-origin' }); if (!response.ok) throw new Error('备份下载失败'); const blob = await response.blob(); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `phd-workbench-backup-${new Date().toISOString().slice(0, 10)}.zip`; link.click(); URL.revokeObjectURL(link.href); }
    catch (error) { $('backupMessage').textContent = error.message; $('backupMessage').className = 'error'; }
  };
  $('restoreBackup').onclick = async () => {
    const file = $('backupFile').files[0];
    if (!file) { $('backupMessage').textContent = '请选择 ZIP 备份文件'; return; }
    if (!confirm('恢复会覆盖所有账号和数据，系统会先自动保存当前备份。确定继续吗？')) return;
    const form = new FormData(); form.append('backup', file);
    try { $('backupMessage').textContent = '正在恢复，请勿关闭页面…'; const result = await api('/admin/restore', { method: 'POST', body: form }); $('backupMessage').textContent = result.message || '恢复完成，请重新登录'; setTimeout(() => { location.href = '/'; }, 1500); }
    catch (error) { $('backupMessage').textContent = error.message; $('backupMessage').className = 'error'; }
  };
  load();
})();

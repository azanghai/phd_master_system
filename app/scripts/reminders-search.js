    let reminderRangeDays = 7;

    function textIncludes(text, query) {
      return String(text || '').toLowerCase().includes(String(query || '').toLowerCase());
    }
    function sourceId(type, id, field='due') { return `${type}:${id}:${field}`; }
    function reminderIsHidden(id, dueDate) {
      const dismissed = state.reminders?.dismissedBySourceId || {};
      const snoozed = state.reminders?.snoozedBySourceId || {};
      if (dismissed[id]) return true;
      if (snoozed[id] && snoozed[id] > todayStr()) return true;
      return !dueDate;
    }
    function reminderRow({ id, type, title, dueDate, route, icon='fa-bell', detail='', refId='' }) {
      return { id, type, title, dueDate, route, icon, detail, refId, days: diffDays(todayStr(), dueDate) };
    }
    function collectReminderRows({ days = 30, includeHidden = false } = {}) {
      const rows = [];
      const push = (row) => {
        if (!row?.id || !row.dueDate) return;
        const distance = diffDays(todayStr(), row.dueDate);
        if (distance < 0 || distance > days) return;
        if (!includeHidden && reminderIsHidden(row.id, row.dueDate)) return;
        rows.push({ ...row, days: distance });
      };
      state.tasks.filter(taskOpen).forEach(task => push(reminderRow({
        id: sourceId('task', task.id, 'dueDate'), type:'任务', title: task.title, dueDate: task.dueDate,
        route:'workflow-section', icon:'fa-list-check', refId: task.id, detail: task.projectId ? projectById(task.projectId)?.title || '' : ''
      })));
      state.projects.filter(item => item.status !== 'done').forEach(project => push(reminderRow({
        id: sourceId('project', project.id, 'deadline'), type:'项目', title: project.title, dueDate: project.deadline,
        route:'workflow-section', icon:'fa-folder-tree', refId: project.id, detail: project.outcome || ''
      })));
      (state.thesis?.milestones || []).filter(item => !item.done).forEach(item => push(reminderRow({
        id: sourceId('thesis', item.id, 'due'), type:'论文里程碑', title: item.name, dueDate: item.due,
        route:'thesis-section', icon:'fa-book-open', refId: item.id, detail: workspaceCopy().thesisLabel
      })));
      state.submissions.filter(item => !['已接收','已见刊/已收录','搁置/拒稿'].includes(item.stage)).forEach(item => push(reminderRow({
        id: sourceId('submission', item.id, 'deadline'), type:'投稿', title: item.title, dueDate: item.deadline,
        route:'submission-section', icon:'fa-paper-plane', refId: item.id, detail: item.venue || item.stage
      })));
      mentorPendingItems().forEach(({ date, entry }) => push(reminderRow({
        id: sourceId('mentor', date, 'followupDate'), type:'导师跟进', title: entry.nextAction || entry.commitment || '导师沟通跟进',
        dueDate: entry.followupDate, route:'mentor-section', icon:'fa-user-tie', refId: date, detail: entry.promiseStatus
      })));
      (state.reminders?.manual || []).filter(item => !item.done).forEach(item => push(reminderRow({
        id: sourceId('manual', item.id, 'dueDate'), type:'手动提醒', title: item.title, dueDate: item.dueDate,
        route:'home-section', icon:'fa-bell', refId: item.id, detail: item.note || ''
      })));
      return rows.sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.type.localeCompare(b.type));
    }

    function dueLabel(row) {
      if (row.days === 0) return '今天';
      if (row.days === 1) return '明天';
      return `${row.days} 天后`;
    }
    function renderReminderMiniList(hostId, limit = 5) {
      const host = $(hostId);
      if (!host) return;
      const rows = collectReminderRows({ days: 14 }).slice(0, limit);
      if ($('homeReminderBadge')) $('homeReminderBadge').textContent = `${rows.length} 条`;
      host.innerHTML = rows.map(row => `
        <button class="w-full text-left rounded-xl border border-calm-line bg-white px-3 py-3 hover:bg-slate-50" data-reminder-open="${escapeHtml(row.id)}">
          <div class="flex items-center justify-between gap-3">
            <div class="font-black truncate">${faIcon(row.icon)} ${escapeHtml(row.title)}</div>
            <span class="pill bg-slate-100 text-slate-700">${escapeHtml(dueLabel(row))}</span>
          </div>
          <div class="text-xs text-calm-mute mt-1">${escapeHtml(row.type)} · ${escapeHtml(row.dueDate)}${row.detail ? ` · ${escapeHtml(row.detail)}` : ''}</div>
        </button>
      `).join('') || '<div class="text-sm text-calm-mute">未来两周没有站内提醒。</div>';
      host.querySelectorAll('[data-reminder-open]').forEach(btn => btn.onclick = () => openReminderSource(btn.dataset.reminderOpen));
    }
    function renderReminderCenter() {
      const host = $('reminderCenterList');
      if (!host) return;
      document.querySelectorAll('.reminder-range-btn').forEach(btn => {
        const active = Number(btn.dataset.reminderRange) === reminderRangeDays;
        btn.classList.toggle('bg-slate-900', active);
        btn.classList.toggle('text-white', active);
      });
      const rows = collectReminderRows({ days: reminderRangeDays });
      host.innerHTML = rows.map(row => `
        <div class="rounded-xl border border-calm-line bg-white px-3 py-3">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <div class="font-black truncate">${faIcon(row.icon)} ${escapeHtml(row.title)}</div>
              <div class="text-xs text-calm-mute mt-1">${escapeHtml(row.type)} · ${escapeHtml(row.dueDate)} · ${escapeHtml(dueLabel(row))}${row.detail ? ` · ${escapeHtml(row.detail)}` : ''}</div>
            </div>
            <div class="flex gap-1 shrink-0">
              <button class="px-2 py-1 rounded-lg bg-slate-100 text-xs font-bold" data-reminder-open="${escapeHtml(row.id)}">打开</button>
              <button class="px-2 py-1 rounded-lg bg-slate-100 text-xs font-bold" data-reminder-snooze="${escapeHtml(row.id)}">稍后</button>
              <button class="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold" data-reminder-dismiss="${escapeHtml(row.id)}">完成</button>
            </div>
          </div>
        </div>
      `).join('') || '<div class="text-sm text-calm-mute">当前范围没有提醒。</div>';
      host.querySelectorAll('[data-reminder-open]').forEach(btn => btn.onclick = () => openReminderSource(btn.dataset.reminderOpen));
      host.querySelectorAll('[data-reminder-snooze]').forEach(btn => btn.onclick = () => snoozeReminder(btn.dataset.reminderSnooze));
      host.querySelectorAll('[data-reminder-dismiss]').forEach(btn => btn.onclick = () => dismissReminder(btn.dataset.reminderDismiss));
    }
    function reminderById(id) { return collectReminderRows({ days: 365, includeHidden:true }).find(row => row.id === id) || null; }
    function dismissReminder(id) {
      state.reminders.dismissedBySourceId[id] = nowDateTime();
      saveState(); renderAll();
    }
    function snoozeReminder(id) {
      state.reminders.snoozedBySourceId[id] = shiftDate(todayStr(), 2);
      saveState(); renderAll();
    }
    function openReminderSource(id) {
      const row = reminderById(id);
      if (!row) return;
      navTo(row.route || 'home-section');
      setTimeout(() => {
        if (row.type === '任务') openTaskEditor(row.refId);
        else if (row.type === '项目') openProjectEditor(row.refId);
        else if (row.type === '投稿') openSubmissionEditor(row.refId);
        else if (row.type === '论文里程碑') openThesisMilestoneEditor(row.refId);
        else if (row.type === '导师跟进' && $('mentorDate')) { $('mentorDate').value = row.refId; renderAll(); }
      }, 80);
    }

    function buildSearchIndex() {
      const rows = [];
      const add = (group, title, detail, route, action, icon='fa-circle-dot') => rows.push({ group, title, detail, route, action, icon, text:[group,title,detail].join(' ') });
      state.tasks.forEach(item => add('任务', item.title, `${taskStatusMeta(item.status).label}${item.dueDate ? ` · ${item.dueDate}` : ''}`, 'workflow-section', () => openTaskEditor(item.id), 'fa-list-check'));
      state.projects.forEach(item => add('项目', item.title, `${projectAreaMeta(item.area).label}${item.deadline ? ` · ${item.deadline}` : ''}`, 'workflow-section', () => openProjectEditor(item.id), 'fa-folder-tree'));
      (state.thesis?.milestones || []).forEach(item => add('论文', item.name, item.due ? `里程碑 · ${item.due}` : '里程碑', 'thesis-section', () => openThesisMilestoneEditor(item.id), 'fa-book-open'));
      (state.thesis?.chapters || []).forEach(item => add('论文', item.name, `章节 · ${item.progress}%`, 'thesis-section', () => openThesisChapterEditor(item.id), 'fa-book-open'));
      (state.thesis?.logs || []).forEach(item => add('论文日志', item.note || item.type, `${item.date} · ${item.minutes || 0} 分钟`, 'thesis-section', () => openThesisLogEditor(item.id), 'fa-pen-to-square'));
      state.submissions.forEach(item => add('投稿', item.title, `${item.stage}${item.deadline ? ` · ${item.deadline}` : ''}${item.venue ? ` · ${item.venue}` : ''}`, 'submission-section', () => openSubmissionEditor(item.id), 'fa-paper-plane'));
      Object.entries(state.mentor?.entries || {}).forEach(([date, entry]) => add('导师记录', entry.topic || entry.nextAction || '导师沟通', `${date} · ${mentorStatusMeta(entry.status).label}`, 'mentor-section', () => { $('mentorDate').value = date; renderAll(); }, 'fa-user-tie'));
      Object.entries(state.reviewDaily?.entries || {}).forEach(([date, entry]) => add('复盘', entry.accomplishments || entry.insights || '学术复盘', date, 'review-section', () => { $('reviewDate').value = date; renderAll(); }, 'fa-clipboard-check'));
      collectReminderRows({ days: 30 }).forEach(row => add('提醒', row.title, `${row.type} · ${row.dueDate}`, row.route, () => openReminderSource(row.id), row.icon));
      return rows;
    }
    function renderGlobalSearch() {
      const host = $('globalSearchResults');
      if (!host) return;
      const q = $('globalSearchInput')?.value.trim() || '';
      const rows = buildSearchIndex()
        .filter(row => !q || textIncludes(row.text, q))
        .slice(0, 80);
      const grouped = rows.reduce((acc, row) => {
        (acc[row.group] ||= []).push(row);
        return acc;
      }, {});
      host.innerHTML = Object.entries(grouped).map(([group, items]) => `
        <div>
          <div class="text-xs font-black text-calm-mute uppercase tracking-wide mb-2">${escapeHtml(group)}</div>
          <div class="space-y-1">
            ${items.map((row, index) => `<button class="global-search-row w-full text-left rounded-xl px-3 py-3 hover:bg-slate-50 border border-transparent" data-search-group="${escapeHtml(group)}" data-search-index="${index}">
              <div class="font-black truncate">${faIcon(row.icon)} ${escapeHtml(row.title)}</div>
              <div class="text-xs text-calm-mute mt-1 truncate">${escapeHtml(row.detail || row.route)}</div>
            </button>`).join('')}
          </div>
        </div>
      `).join('') || '<div class="text-sm text-calm-mute p-3">没有找到匹配内容。</div>';
      host.querySelectorAll('.global-search-row').forEach(btn => btn.onclick = () => {
        const group = btn.dataset.searchGroup;
        const index = Number(btn.dataset.searchIndex);
        const row = grouped[group]?.[index];
        if (!row) return;
        closeGlobalSearch();
        navTo(row.route);
        setTimeout(() => row.action?.(), 80);
      });
    }
    function openGlobalSearch() {
      $('globalSearchDialog')?.showModal();
      setTimeout(() => {
        $('globalSearchInput')?.focus();
        renderGlobalSearch();
      }, 20);
    }
    function closeGlobalSearch() { if ($('globalSearchDialog')?.open) $('globalSearchDialog').close(); }

    function bindReminderSearchEvents() {
      if ($('btnOpenGlobalSearchHome')) $('btnOpenGlobalSearchHome').onclick = openGlobalSearch;
      if ($('btnCloseGlobalSearch')) $('btnCloseGlobalSearch').onclick = closeGlobalSearch;
      if ($('globalSearchInput')) $('globalSearchInput').oninput = renderGlobalSearch;
      document.querySelectorAll('.reminder-range-btn').forEach(btn => btn.onclick = () => {
        reminderRangeDays = Number(btn.dataset.reminderRange) || 0;
        renderReminderCenter();
      });
      window.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && String(e.key).toLowerCase() === 'k') {
          e.preventDefault();
          openGlobalSearch();
        }
      });
    }

    function renderExperienceUpgradePanels() {
      renderReminderMiniList('homeReminderList');
      renderReminderCenter();
    }

    bindReminderSearchEvents();


    function createTask(payload = {}) {
      const task = normalizeTaskItem({
        id: uid('task'),
        title: payload.title || '',
        status: payload.status || 'todo',
        projectId: payload.projectId || '',
        gtdBucket: payload.gtdBucket || 'next',
        quadrant: payload.quadrant || 'q2',
        todayBucket: payload.todayBucket || '',
        dueDate: payload.dueDate || '',
        estimate: payload.estimate ?? 25,
        context: payload.context || '',
        note: payload.note || '',
        origin: normalizeTaskOrigin(payload.origin, payload),
        createdAt: payload.createdAt || nowDateTime(),
        startedAt: payload.startedAt || '',
        doneAt: payload.doneAt || ''
      });
      if (!task) return;
      state.tasks.unshift(task);
      return task;
    }
    function addTask() {
      const title = $('taskInput').value.trim();
      if (!title) return;
      createTask({ title, gtdBucket:'next', quadrant:'q2', todayBucket:'should', estimate:25 });
      $('taskInput').value = '';
      saveState(); renderAll();
    }

    function recordFocusRun({ id, date, title, category='research', note='', start, end, minutes, taskId='' }) {
      const cleanStart = parseHM(start);
      const cleanEnd = parseHM(end);
      if (!cleanStart || !cleanEnd || !title) return;
      const mins = Math.max(1, Math.round(Number(minutes) || minutesBetween(cleanStart, cleanEnd)));
      const focusId = id || uid('focus');
      state.focus.sessions.unshift({ id: focusId, date, title, category, note, start: cleanStart, end: cleanEnd, minutes: mins, taskId });
      const task = state.tasks.find(item => item.id === taskId);
      if (task) {
        // 不再自动写入时间块，避免一件事在任务 / 专注 / 日程中重复落账。
      }
    }
    function taskFocusMinutesOnDate(taskId, date=todayStr()) {
      return state.focus.sessions
        .filter(item => item.taskId === taskId && item.date === date)
        .reduce((sum, item) => sum + (Number(item.minutes) || 0), 0);
    }
    function addUniqueProgressLog(list, sourceTaskId, payload) {
      if (!Array.isArray(list) || !sourceTaskId) return false;
      if (list.some(item => item.sourceTaskId === sourceTaskId)) return false;
      list.unshift({ id: uid('plog'), sourceTaskId, at: nowDateTime(), ...payload });
      return true;
    }
    function thesisLogTypeForTask(task) {
      const text = `${task.title || ''} ${task.context || ''} ${task.note || ''}`;
      if (/实验|数据|样本|分析/.test(text)) return 'experiment';
      if (/改|修|润色|revision|返修/i.test(text)) return 'revise';
      if (/组会|讨论|meeting|导师/i.test(text)) return 'meeting';
      if (/写|章|论文|draft|chapter/i.test(text)) return 'writing';
      return 'other';
    }
    function submissionForCompletedTask(task, project) {
      const projectOrigin = normalizeProjectOrigin(project?.origin, project);
      const note = String(project?.note || '');
      if (projectOrigin.type === 'submission' && projectOrigin.refId && projectOrigin.refId !== 'module') {
        return state.submissions.find(item => item.id === projectOrigin.refId) || null;
      }
      if (projectOrigin.type === 'submission' && projectOrigin.refId === 'module') {
        return state.submissions.find(item => task.title.includes(item.title)) || null;
      }
      if (note.startsWith('submission:')) return state.submissions.find(item => submissionProjectNote(item.id) === note) || null;
      if (note === 'module:submission') {
        return state.submissions.find(item => task.title.includes(item.title)) || null;
      }
      return null;
    }
    function recordProjectProgressFromTask(task) {
      const project = projectById(task.projectId);
      if (!project) return;
      project.logs = Array.isArray(project.logs) ? project.logs : [];
      const doneDate = dateFromDateTime(task.doneAt) || todayStr();
      const minutes = taskFocusMinutesOnDate(task.id, doneDate);
      const note = `任务完成：${task.title}`;
      addUniqueProgressLog(project.logs, task.id, {
        date: doneDate,
        type: '任务完成',
        minutes,
        note
      });
      project.updatedAt = nowDateTime();

      const projectOrigin = normalizeProjectOrigin(project.origin, project);
      if (projectOrigin.type === 'thesis' || task.note === 'module:thesis') {
        state.thesis.logs = Array.isArray(state.thesis.logs) ? state.thesis.logs : [];
        addUniqueProgressLog(state.thesis.logs, task.id, {
          date: doneDate,
          type: thesisLogTypeForTask(task),
          minutes,
          words: 0,
          note: `${note}${project.title ? `（${project.title}）` : ''}`
        });
      }

      const submission = submissionForCompletedTask(task, project);
      if (submission) {
        submission.logs = Array.isArray(submission.logs) ? submission.logs : [];
        addUniqueProgressLog(submission.logs, task.id, {
          date: doneDate,
          type: '任务完成',
          minutes,
          note,
          stage: submission.stage
        });
        submission.updatedAt = nowDateTime();
        syncSubmissionProject(submission);
      }
    }
    function finishActiveFocusRunForTask(task) {
      const active = state.focus.active;
      if (active?.taskId === task.id) {
        recordFocusRun({
          id: active.id,
          date: active.date || todayStr(),
          title: active.title || task.title,
          category: active.category || 'research',
          note: active.note || '任务自动记录',
          start: active.start,
          end: nowTime(),
          minutes: Math.max(1, Math.round((Date.now() - active.startedAtTs) / 60000)),
          taskId: task.id
        });
        state.focus.active = null;
        return;
      }
      const startAt = task.startedAt || nowDateTime();
      const date = dateFromDateTime(startAt) || todayStr();
      recordFocusRun({
        date,
        title: task.title,
        category: 'research',
        note: '任务自动记录',
        start: String(startAt).slice(11, 16),
        end: nowTime(),
        taskId: task.id
      });
    }
    function stopAllActiveTaskRuns(exceptId='') {
      state.tasks.forEach(task => {
        if (task.status === 'active' && task.id !== exceptId) {
          finishActiveFocusRunForTask(task);
          task.status = 'todo';
        }
      });
      if (state.focus.active && state.focus.active.taskId !== exceptId) {
        const linked = state.tasks.find(task => task.id === state.focus.active.taskId);
        if (linked) linked.status = 'todo';
        stopFocus(false);
      }
    }
    function toggleTaskStart(id) {
      const task = state.tasks.find(item => item.id === id);
      if (!task) return;
      if (task.status === 'active') {
        finishActiveFocusRunForTask(task);
        task.status = 'todo';
        saveState(); renderAll();
        stopFocusTicker();
        return;
      }
      stopAllActiveTaskRuns(id);
      const startDateTime = nowDateTime();
      task.status = 'active';
      task.gtdBucket = task.gtdBucket === 'inbox' || task.gtdBucket === 'done' ? 'next' : task.gtdBucket;
      task.todayBucket = task.todayBucket || 'should';
      task.doneAt = '';
      task.startedAt = startDateTime;
      state.focus.active = {
        id: uid('focus'),
        title: task.title,
        category: 'research',
        note: '任务自动记录',
        date: todayStr(),
        start: nowTime(),
        startedAtTs: Date.now(),
        taskId: task.id
      };
      saveState(); renderAll();
      startFocusTicker();
    }
    function finishTask(id) {
      const task = state.tasks.find(item => item.id === id);
      if (!task) return;
      if (task.status === 'done') return;
      if (task.status === 'active') finishActiveFocusRunForTask(task);
      task.status = 'done';
      task.gtdBucket = 'done';
      task.todayBucket = '';
      task.doneAt = nowDateTime();
      recordProjectProgressFromTask(task);
      saveState(); renderAll();
      stopFocusTicker();
    }
    function deleteTask(id) { state.tasks = state.tasks.filter(task => task.id !== id); saveState(); renderAll(); }
    function updateTaskField(id, patch = {}) {
      const task = state.tasks.find(item => item.id === id);
      if (!task) return;
      Object.assign(task, patch);
      if (task.status === 'done') {
        task.gtdBucket = 'done';
        task.todayBucket = '';
      } else if (task.gtdBucket === 'done') {
        task.gtdBucket = 'next';
      }
      saveState();
      renderAll();
    }
    function setTaskBucket(id, bucket) {
      if (bucket === 'done') return finishTask(id);
      const task = state.tasks.find(item => item.id === id);
      if (!task) return;
      task.gtdBucket = GTD_BUCKETS.some(opt => opt.value === bucket) ? bucket : task.gtdBucket;
      if (task.status === 'done') {
        task.status = 'todo';
        task.doneAt = '';
      }
      saveState();
      renderAll();
    }
    function setTaskQuadrant(id, quadrant) { updateTaskField(id, { quadrant: taskQuadrantMeta(quadrant).value }); }
    function setTaskTodayBucket(id, bucket) { updateTaskField(id, { todayBucket: todayBucketMeta(bucket).value }); }
    function setTaskProject(id, projectId) { updateTaskField(id, { projectId }); }
    function isReviewTomorrowTask(task) {
      const note = String(task?.note || '');
      if (!/^review:\d{4}-\d{2}-\d{2}:tomorrow:[1-3]$/.test(note)) return false;
      return String(task?.dueDate || '') === shiftDate(todayStr(), 1);
    }

    function todayExecutionTasks(date=todayStr()) {
      const rank = { active:0, todo:1, planned:2, done:3 };
      const todayRank = { must:0, should:1, could:2, '':3 };
      return state.tasks
        .filter(task => {
          const doneDate = dateFromDateTime(task.doneAt);
          if (task.status === 'done') return doneDate === date;
          return task.status === 'active'
            || !!task.todayBucket
            || task.dueDate === date
            || dateFromDateTime(task.createdAt) === date;
        })
        .sort((a, b) => {
          const statusDiff = (rank[a.status] ?? 9) - (rank[b.status] ?? 9);
          if (statusDiff) return statusDiff;
          const todayDiff = (todayRank[a.todayBucket || ''] ?? 9) - (todayRank[b.todayBucket || ''] ?? 9);
          if (todayDiff) return todayDiff;
          return (a.dueDate || '9999-99-99').localeCompare(b.dueDate || '9999-99-99')
            || (b.startedAt || b.createdAt || '').localeCompare(a.startedAt || a.createdAt || '');
        });
    }

    function renderTasks() {
      const activeCount = state.tasks.filter(t=>t.status==='active').length;
      $('activeTaskBadge').textContent = `进行中 ${activeCount}`;
      const todayTasks = todayExecutionTasks();
      const doneToday = todayTasks.filter(task => task.status === 'done').length;
      const openToday = todayTasks.length - doneToday;
      const taskLinkedFocus = state.focus.sessions.filter(item => item.date === todayStr() && item.taskId);
      const taskLinkedBlocks = (state.timeBlocks?.[todayStr()] || []).filter(item => item.taskId);
      const taskLinkedMinutes = taskLinkedFocus.reduce((sum, item) => sum + (Number(item.minutes) || 0), 0);
      $('taskNowPane').innerHTML = todayTasks.length
        ? `今日 ${todayTasks.length} 项 · 待完成 ${openToday} 项 · 已完成 ${doneToday} 项${activeCount ? ` · 进行中 ${activeCount} 项` : ''}`
        : '暂无今日任务。可以新增临时任务，或在项目看板把任务交给今天。';
      if ($('taskAutoLogPane')) {
        $('taskAutoLogPane').textContent = `自动记录：任务专注 ${taskLinkedFocus.length} 次 / ${formatMinutes(taskLinkedMinutes)}，已排入日程时间块 ${taskLinkedBlocks.length} 个。`;
      }
      const list = todayTasks.map(task => {
        const bucket = taskBucketMeta(task.gtdBucket);
        const project = projectById(task.projectId);
        const today = todayBucketMeta(task.todayBucket);
        const sessions = state.focus.sessions.filter(item => item.taskId === task.id && item.date === todayStr());
        const sessionMinutes = sessions.reduce((sum, item) => sum + (Number(item.minutes) || 0), 0);
        const isDone = task.status === 'done';
        const isActive = task.status === 'active';
        return `
          <div class="rounded-2xl border border-calm-line bg-white p-3 flex items-start justify-between gap-3">
            <div class="min-w-0">
              <div class="font-bold ${isDone ? 'line-through text-calm-mute' : ''}">${escapeHtml(task.title)}</div>
              <div class="text-xs text-calm-mute mt-1 flex flex-wrap gap-2">
                <span>${escapeHtml(isDone ? '已完成' : isActive ? '进行中' : task.status === 'planned' ? '计划中' : '待开始')}</span>
                <span>·</span>
                <span>${escapeHtml(today.value ? today.label : bucket.label)}</span>
                ${isReviewTomorrowTask(task) ? '<span>· 明日任务</span>' : ''}
                ${project ? `<span>· ${escapeHtml(project.title)}</span>` : ''}
                ${task.dueDate ? `<span>· 截止 ${escapeHtml(task.dueDate)}</span>` : ''}
                ${isActive ? `<span>· 开始于 ${escapeHtml(task.startedAt || '')}</span>` : ''}
                ${sessions.length ? `<span>· 今日专注 ${sessions.length} 次 / ${formatMinutes(sessionMinutes)}</span>` : ''}
              </div>
            </div>
            <div class="flex gap-2 shrink-0">
              ${isDone ? '' : `<button class="px-2 py-1 rounded-xl text-xs font-bold bg-pink-50 text-dopamine-pink" data-task-start="${task.id}">${isActive ? '结束' : '开始'}</button>`}
              ${isDone ? '' : `<button class="px-2 py-1 rounded-xl text-xs font-bold bg-green-50 text-green-600" data-task-done="${task.id}">完成</button>`}
              <button class="px-2 py-1 rounded-xl text-xs font-bold bg-gray-100 text-calm-mute" data-task-edit="${task.id}">修改</button>
            </div>
          </div>`;
      }).join('');
      $('taskList').innerHTML = list || '<div class="text-sm text-calm-mute">还没有今日任务，先新增一条吧。</div>';
      $('taskList').querySelectorAll('[data-task-start]').forEach(btn => btn.onclick = () => toggleTaskStart(btn.dataset.taskStart));
      $('taskList').querySelectorAll('[data-task-done]').forEach(btn => btn.onclick = () => finishTask(btn.dataset.taskDone));
      $('taskList').querySelectorAll('[data-task-edit]').forEach(btn => btn.onclick = () => openTaskEditor(btn.dataset.taskEdit));
    }

    function startFocusTicker() {
      stopFocusTicker();
      focusInterval = setInterval(renderFocusTimer, 1000);
      renderFocusTimer();
    }
    function stopFocusTicker() { if (focusInterval) { clearInterval(focusInterval); focusInterval = null; } }
    function renderFocusTimer() {
      const active = state.focus.active;
      if (!active) {
        $('focusClock').textContent = '00:00:00';
        $('focusStatusPill').textContent = '未开始';
        return;
      }
      const elapsed = Math.max(0, Math.floor((Date.now() - active.startedAtTs) / 1000));
      const h = Math.floor(elapsed/3600), m = Math.floor((elapsed%3600)/60), s = elapsed%60;
      $('focusClock').textContent = `${pad(h)}:${pad(m)}:${pad(s)}`;
      $('focusStatusPill').textContent = '进行中';
    }
    function startFocus() {
      if (state.focus.active) { alert('已经有进行中的专注了。'); return; }
      const linkedTask = activeTask();
      const title = $('focusTitle').value.trim() || linkedTask?.title || '未命名专注';
      state.focus.active = {
        id: uid('focus'),
        title,
        category: $('focusCategory').value,
        note: $('focusNote').value.trim(),
        date: todayStr(),
        start: nowTime(),
        startedAtTs: Date.now(),
        taskId: linkedTask?.id || null
      };
      saveState(); renderAll();
      startFocusTicker();
    }
    function stopFocus(shouldRender=true) {
      const active = state.focus.active;
      if (!active) return;
      const end = nowTime();
      const mins = Math.max(1, Math.round((Date.now() - active.startedAtTs) / 60000));
      recordFocusRun({ id: active.id, date: active.date, title: active.title, category: active.category, note: active.note, start: active.start, end, minutes: mins, taskId: active.taskId || '' });
      const linkedTask = state.tasks.find(task => task.id === active.taskId);
      if (linkedTask && linkedTask.status === 'active') linkedTask.status = 'todo';
      state.focus.active = null;
      saveState();
      if (shouldRender) renderAll();
      stopFocusTicker();
    }
    function discardFocus() {
      const active = state.focus.active;
      const linkedTask = state.tasks.find(task => task.id === active?.taskId);
      if (linkedTask && linkedTask.status === 'active') linkedTask.status = 'todo';
      state.focus.active = null;
      saveState(); renderAll();
      stopFocusTicker();
    }
    function addManualFocus() {
      const date = $('manualFocusDate').value || todayStr();
      const title = $('manualFocusTitle').value.trim();
      const start = parseHM($('manualFocusStart').value);
      const end = parseHM($('manualFocusEnd').value);
      if (!title || !start || !end) { alert('请至少填写日期、主题、开始和结束时间。'); return; }
      state.focus.sessions.unshift({ id:uid('focus'), date, title, category:'other', note:'手动补录', start, end, minutes:minutesBetween(start,end) });
      $('manualFocusTitle').value = '';
      saveState(); renderAll();
    }
    function renderFocusTimeline() {
      renderFocusTimer();
      const todaySessions = state.focus.sessions.filter(s => s.date === todayStr());
      $('focusTodaySummary').textContent = `今日 ${formatMinutes(focusMinutesOn())}`;
      $('focusTimeline').innerHTML = todaySessions.map(item => `
        <div class="rounded-2xl border border-calm-line bg-white p-3 flex items-start justify-between gap-3">
          <div>
            <div class="font-bold">${escapeHtml(item.title)}</div>
            <div class="text-xs text-calm-mute mt-1">${item.start} - ${item.end} · ${formatMinutes(item.minutes)}</div>
          </div>
          <button class="text-sm font-bold text-dopamine-orange" data-focus-edit="${item.id}">修改</button>
        </div>
      `).join('') || '<div class="text-sm text-calm-mute">今天还没有专注记录。</div>';
      $('focusTimeline').querySelectorAll('[data-focus-edit]').forEach(btn => btn.onclick = () => openFocusEditor(btn.dataset.focusEdit));
      if (state.focus.active) startFocusTicker(); else stopFocusTicker();
    }

    function schedulePlannerTasks(date=todayStr()) {
      const scheduledTaskIds = new Set((state.timeBlocks?.[date] || []).map(item => item.taskId).filter(Boolean));
      const todayRank = { must:0, should:1, could:2, '':3 };
      const statusRank = { active:0, todo:1, planned:2 };
      const bucketRank = { next:0, inbox:1, waiting:2, someday:3, done:9 };
      return state.tasks
        .filter(task => task.status !== 'done')
        .sort((a, b) => {
          const relevanceA = scheduledTaskIds.has(a.id) ? 0 : a.dueDate === date ? 1 : date === todayStr() && a.todayBucket ? 2 : 3;
          const relevanceB = scheduledTaskIds.has(b.id) ? 0 : b.dueDate === date ? 1 : date === todayStr() && b.todayBucket ? 2 : 3;
          if (relevanceA !== relevanceB) return relevanceA - relevanceB;
          if (date === todayStr()) {
            const todayDiff = (todayRank[a.todayBucket || ''] ?? 9) - (todayRank[b.todayBucket || ''] ?? 9);
            if (todayDiff) return todayDiff;
          }
          const statusDiff = (statusRank[a.status] ?? 9) - (statusRank[b.status] ?? 9);
          if (statusDiff) return statusDiff;
          const bucketDiff = (bucketRank[a.gtdBucket] ?? 9) - (bucketRank[b.gtdBucket] ?? 9);
          if (bucketDiff) return bucketDiff;
          return (a.dueDate || '9999-99-99').localeCompare(b.dueDate || '9999-99-99')
            || (b.startedAt || b.createdAt || '').localeCompare(a.startedAt || a.createdAt || '');
        });
    }
    function renderSchedulePlanner() {
      const select = $('scheduleTaskSelect');
      if (!select) return;
      const date = $('scheduleDate').value || todayStr();
      if ($('scheduleTitleText')) $('scheduleTitleText').textContent = date === todayStr() ? '今日日程' : `${dayLabel(date)}日程`;
      const blocks = sortByTime(getDayTimeBlocks(date));
      const tasks = schedulePlannerTasks(date);
      const scheduledTaskIds = new Set(blocks.map(item => item.taskId).filter(Boolean));
      const selected = select.value;
      select.innerHTML = '<option value="">选择任务（按所选日期排序）</option>' + tasks.map(task => {
        const project = projectById(task.projectId);
        const today = todayBucketMeta(task.todayBucket);
        const tags = [];
        if (scheduledTaskIds.has(task.id)) tags.push('已排');
        if (task.dueDate === date) tags.push('当日到期');
        if (date === todayStr() && today.value) tags.push(today.short);
        if (!tags.length) tags.push(taskBucketMeta(task.gtdBucket).short);
        const due = task.dueDate && task.dueDate !== date ? ` · 截止 ${task.dueDate}` : '';
        const label = `${tags.join('/')} · ${project ? `${project.title} / ` : ''}${task.title}${task.estimate ? ` · ${task.estimate}分钟` : ''}${due}`;
        return `<option value="${task.id}" ${task.id===selected?'selected':''}>${escapeHtml(label)}</option>`;
      }).join('');
      if (selected && !tasks.some(task => task.id === selected)) select.value = '';
      const scheduledMinutes = blocks.reduce((sum, item) => sum + minutesBetween(item.start, item.end), 0);
      $('schedulePlanSummary').textContent = `${blocks.length} 个时间块 · ${formatMinutes(scheduledMinutes)}`;
    }
    function addScheduledTaskBlock() {
      const date = $('scheduleDate').value || todayStr();
      const task = state.tasks.find(item => item.id === $('scheduleTaskSelect').value);
      const start = parseHM($('scheduleTaskStart').value);
      let end = parseHM($('scheduleTaskEnd').value);
      const title = $('scheduleTaskTitle').value.trim() || task?.title || '';
      if (start && !end && task?.estimate) end = addMinutesToHM(start, task.estimate);
      if (!start || !end || !title) { alert('请选择任务或填写标题，并设置开始 / 结束时间。'); return; }
      getDayTimeBlocks(date).push({
        id: uid('block'),
        taskId: task?.id || '',
        start,
        end,
        title,
        color: task ? blockColorForTask(task) : '#4D9DE0'
      });
      if (task) {
        if (date === todayStr() && !task.todayBucket) task.todayBucket = 'should';
        if (task.gtdBucket === 'inbox') task.gtdBucket = 'next';
      }
      $('scheduleTaskTitle').value = '';
      saveState();
      renderAll();
    }
    function previewEventEnd(start, end, date) {
      const cleanStart = parseHM(start);
      const cleanEnd = parseHM(end);
      if (!cleanStart) return '';
      if (cleanEnd && minutesBetween(cleanStart, cleanEnd) > 0) return cleanEnd;
      const liveEnd = date === todayStr() ? nowTime() : '';
      if (liveEnd && minutesBetween(cleanStart, liveEnd) > 0) return liveEnd;
      return addMinutesToHM(cleanStart, 30);
    }
    function buildTimelinePreviewEvents(date=todayStr()) {
      const slotState = getAttendanceSlotLogs(date);
      const attendanceEvents = [];
      const slotColors = { morning:'#FF8C42', midday:'#4D9DE0', evening:'#9B5DE5' };
      slotState.slots.forEach(slot => {
        const log = slot.log;
        if (!log?.start) return;
        const start = parseHM(log.start);
        if (!start) return;
        attendanceEvents.push({
          id: `attendance-${log.id}`,
          sourceId: log.id,
          lane: 'attendance',
          title: `${slot.label}${log.end ? '打卡' : '打卡进行中'}`,
          start,
          end: previewEventEnd(log.start, log.end, date),
          color: log.end ? slotColors[slot.key] : '#F59E0B',
          editable: true
        });
      });
      slotState.extras.forEach(log => {
        if (!log?.start) return;
        const start = parseHM(log.start);
        if (!start) return;
        attendanceEvents.push({
          id: `attendance-${log.id}`,
          sourceId: log.id,
          lane: 'attendance',
          title: log.note && !normalizeAttendanceSlotKey(log.note) ? log.note : '额外工作段',
          start,
          end: previewEventEnd(log.start, log.end, date),
          color: log.end ? '#43AA8B' : '#F59E0B',
          editable: true
        });
      });
      const scheduleEvents = sortByTime(getDayTimeBlocks(date)).map(block => ({
        id: `schedule-${block.id}`,
        sourceId: block.id,
        lane: 'schedule',
        title: block.title,
        start: parseHM(block.start),
        end: parseHM(block.end),
        color: block.color || '#4D9DE0',
        editable: true
      })).filter(item => item.start && item.end);
      return { attendance: attendanceEvents, schedule: scheduleEvents };
    }
    function renderTimeline() {
      const date = $('scheduleDate').value || todayStr();
      const preview = buildTimelinePreviewEvents(date);
      const timelineEvents = [...preview.attendance, ...preview.schedule];
      const defaultStartMinute = 6 * 60;
      const defaultEndMinute = 24 * 60;
      const earliestMinute = timelineEvents.length
        ? Math.max(defaultStartMinute, Math.min(...timelineEvents.map(item => hmToMinutes(item.start))) - 60)
        : 8 * 60;
      const latestMinute = timelineEvents.length
        ? Math.min(defaultEndMinute, Math.max(...timelineEvents.map(item => hmToMinutes(item.end))) + 60)
        : 20 * 60;
      const startMinute = Math.floor(earliestMinute / 60) * 60;
      const endMinute = Math.max(startMinute + 180, Math.ceil(latestMinute / 60) * 60);
      const visibleHours = Math.max(3, (endMinute - startMinute) / 60);
      const hourHeight = visibleHours <= 6 ? 64 : visibleHours <= 9 ? 58 : visibleHours <= 12 ? 52 : 46;
      const minEventHeight = visibleHours <= 6 ? 44 : 40;
      const hourLines = [];
      for (let minute = startMinute; minute < endMinute; minute += 60) {
        hourLines.push(`<div class="timeline-hour" style="height:${hourHeight}px"><div class="timeline-hour-label">${pad(Math.floor(minute / 60))}:00</div></div>`);
      }
      const leaves = state.attendance?.[date]?.leaves || [];
      const renderTimelineEvents = (items) => items.map(item => {
        let top = ((hmToMinutes(item.start) - startMinute) / 60) * hourHeight;
        let height = Math.max(minEventHeight, minutesBetween(item.start, item.end) / 60 * hourHeight);
        if (top < 0) top = 0;
        const maxHeight = (endMinute - startMinute) / 60 * hourHeight - top;
        height = Math.min(height, Math.max(minEventHeight, maxHeight));
        const bg = item.color || '#4D9DE0';
        const editAttr = item.lane === 'schedule' ? `data-block-edit="${item.sourceId}"` : `data-attendance-preview-edit="${item.sourceId}"`;
        return `<div class="timeline-event" data-lane="${item.lane}" style="top:${top}px;height:${height}px;background:${bg};" ${editAttr}><div class="timeline-event-title">${escapeHtml(item.title)}</div><div class="timeline-event-time">${item.start} - ${item.end}</div></div>`;
      }).join('');
      const desktopEvents = renderTimelineEvents([...preview.attendance, ...preview.schedule]);
      const attendanceEvents = renderTimelineEvents(preview.attendance);
      const scheduleEvents = renderTimelineEvents(preview.schedule);
      const leaveHtml = leaves.length ? `<div class="timeline-preview-note">${leaves.map(item => `<span class="pill">请假：${escapeHtml(item.type || '其他')}</span>`).join('')}</div>` : '';
      $('timelineContainer').innerHTML = `
        ${leaveHtml}
        <div class="timeline-desktop-view">
          <div class="timeline-lane-headers">
            <div></div>
            <div class="timeline-lane-title"><span><i class="fa-regular fa-clock mr-1"></i>打卡记录</span><span>${preview.attendance.length} 段</span></div>
            <div class="timeline-lane-title"><span><i class="fa-regular fa-calendar mr-1"></i>日程安排</span><span>${preview.schedule.length} 块</span></div>
          </div>
          <div class="timeline-body" style="height:${(endMinute - startMinute) / 60 * hourHeight}px;">
            ${hourLines.join('')}
            <div class="absolute inset-0">${desktopEvents}</div>
          </div>
        </div>
        <div class="timeline-mobile-stack">
          <div class="timeline-mobile-panel">
            <div class="timeline-mobile-panel-head"><span><i class="fa-regular fa-clock mr-1"></i>打卡记录</span><span>${preview.attendance.length} 段</span></div>
            <div class="timeline-body" style="height:${(endMinute - startMinute) / 60 * hourHeight}px;">
              ${hourLines.join('')}
              <div class="absolute inset-0">${attendanceEvents}</div>
            </div>
          </div>
          <div class="timeline-mobile-panel">
            <div class="timeline-mobile-panel-head"><span><i class="fa-regular fa-calendar mr-1"></i>日程安排</span><span>${preview.schedule.length} 块</span></div>
            <div class="timeline-body" style="height:${(endMinute - startMinute) / 60 * hourHeight}px;">
              ${hourLines.join('')}
              <div class="absolute inset-0">${scheduleEvents}</div>
            </div>
          </div>
        </div>`;
      $('timelineContainer').querySelectorAll('[data-block-edit]').forEach(el => el.onclick = () => openBlockEditor(el.dataset.blockEdit, date));
      $('timelineContainer').querySelectorAll('[data-attendance-preview-edit]').forEach(el => el.onclick = () => openWorkLogEditor(el.dataset.attendancePreviewEdit, date));
    }

    function addWorkflowProject() {
      const title = $('workflowProjectTitle').value.trim();
      if (!title) { alert('请填写项目名。'); return; }
      state.projects.unshift(normalizeProjectItem({
        id: uid('proj'),
        title,
        outcome: $('workflowProjectOutcome').value.trim(),
        area: $('workflowProjectArea').value,
        status: 'active',
        startDate: $('workflowProjectStartDate')?.value || todayStr(),
        deadline: $('workflowProjectDeadline').value || '',
        createdAt: nowDateTime(),
        updatedAt: nowDateTime()
      }));
      $('workflowProjectTitle').value = '';
      $('workflowProjectOutcome').value = '';
      if ($('workflowProjectStartDate')) $('workflowProjectStartDate').value = todayStr();
      $('workflowProjectDeadline').value = '';
      saveState();
      renderAll();
    }

    function addWorkflowCaptureTask() {
      const title = $('workflowCaptureText').value.trim();
      if (!title) { alert('请先填写任务名称。'); return; }
      const projectId = $('workflowCaptureProject')?.value || workflowSelectedProjectId || '';
      const estimate = Math.max(0, Number($('workflowCaptureEstimate')?.value) || 25);
      const status = taskStatusMeta($('workflowCaptureStatus')?.value).value;
      createTask({
        title,
        projectId,
        status,
        gtdBucket: status === 'done' ? 'done' : (projectId ? 'next' : 'inbox'),
        quadrant: $('workflowCaptureQuadrant')?.value || 'q2',
        todayBucket: '',
        dueDate: $('workflowCaptureDue')?.value || '',
        estimate,
        startedAt: status === 'active' ? nowDateTime() : '',
        doneAt: status === 'done' ? nowDateTime() : ''
      });
      $('workflowCaptureText').value = '';
      if ($('workflowCaptureDue')) $('workflowCaptureDue').value = '';
      if ($('workflowCaptureEstimate')) $('workflowCaptureEstimate').value = '25';
      if ($('workflowCaptureQuadrant')) $('workflowCaptureQuadrant').value = 'q2';
      if ($('workflowCaptureStatus')) $('workflowCaptureStatus').value = 'planned';
      if ($('workflowCaptureProject')) $('workflowCaptureProject').value = workflowSelectedProjectId || '';
      saveState();
      renderAll();
    }

    function nearestSubmissionDeadline() {
      return state.submissions
        .filter(item => !['已接收','已见刊/已收录','搁置/拒稿'].includes(item.stage) && item.deadline)
        .sort((a, b) => a.deadline.localeCompare(b.deadline))[0]?.deadline || '';
    }
    function workflowModuleProjectConfig(source) {
      const today = todayStr();
      const copy = workspaceCopy();
      if (source === 'thesis') {
        const openMilestone = (state.thesis?.milestones || []).filter(item => !item.done).sort((a, b) => (a.due || '9999-99-99').localeCompare(b.due || '9999-99-99'))[0];
        return {
          title: copy.thesisLabel,
          outcome: `把核心研究推进到下一阶段（当前总体进度 ${thesisOverallProgress()}%）`,
          area: 'writing',
          deadline: state.thesis?.meta?.targetDate || openMilestone?.due || '',
          note: 'module:thesis',
          origin: { type: 'thesis', refId: 'module' },
          taskTitle: openMilestone ? `推进研究里程碑：${openMilestone.name}` : '推进研究：更新章节或补一条推进日志',
          taskDue: openMilestone?.due || state.thesis?.meta?.targetDate || ''
        };
      }
      if (source === 'submission') {
        const active = state.submissions.filter(item => !['已接收','已见刊/已收录','搁置/拒稿'].includes(item.stage));
        const next = active.filter(item => item.deadline).sort((a, b) => a.deadline.localeCompare(b.deadline))[0] || active[0];
        return {
          title: '投稿与发表管线',
          outcome: `推进 ${active.length} 个进行中投稿，优先处理临近截止与返修`,
          area: 'submission',
          deadline: nearestSubmissionDeadline(),
          note: 'module:submission',
          origin: { type: 'submission', refId: 'module' },
          taskTitle: next ? `推进投稿：${next.title}` : '检查投稿管线：补充下一步动作',
          taskDue: next?.deadline || ''
        };
      }
      const pending = mentorPendingItems(today);
      const next = pending[0];
      return {
        title: `${copy.guidanceLabel}与承诺跟进`,
        outcome: `记录关键反馈、跟进 ${pending.length} 条未落实承诺，避免计划漂移`,
        area: 'admin',
        deadline: next?.entry?.followupDate || '',
        note: 'module:mentor',
        origin: { type: 'mentor', refId: 'module' },
        taskTitle: next ? `跟进${copy.guidanceLabel}承诺：${next.entry.commitment.slice(0, 32)}` : `整理${copy.guidanceLabel}记录并确认下一步`,
        taskDue: next?.entry?.followupDate || ''
      };
    }
    function ensureWorkflowModuleProject(source, shouldRender=true) {
      const config = workflowModuleProjectConfig(source);
      let project = state.projects.find(item => {
        const origin = normalizeProjectOrigin(item.origin, item);
        return (origin.type === config.origin.type && origin.refId === config.origin.refId) || item.note === config.note || item.title === config.title;
      });
      if (project) {
        project.outcome = config.outcome;
        project.area = config.area;
        project.deadline = config.deadline;
        project.note = config.note;
        project.origin = normalizeProjectOrigin(config.origin, config);
        if (project.status === 'done') project.status = 'active';
        project.updatedAt = nowDateTime();
      } else {
        project = normalizeProjectItem({
          id: uid('proj'),
          title: config.title,
          outcome: config.outcome,
          area: config.area,
          status: 'active',
          deadline: config.deadline,
          note: config.note,
          origin: config.origin,
          createdAt: nowDateTime(),
          updatedAt: nowDateTime()
        });
        state.projects.unshift(project);
      }
      if (shouldRender) { saveState(); renderAll(); }
      return project;
    }
    function createWorkflowModuleTask(source) {
      const config = workflowModuleProjectConfig(source);
      const project = ensureWorkflowModuleProject(source, false);
      createTask({
        title: config.taskTitle,
        projectId: project.id,
        gtdBucket: 'next',
        quadrant: 'q2',
        todayBucket: 'should',
        dueDate: config.taskDue,
        estimate: 30,
        context: source === 'mentor' ? '沟通' : source === 'submission' ? '投稿' : '论文',
        note: config.note,
        origin: { type: 'project', refId: project.id }
      });
      saveState();
      renderAll();
    }
    function renderWorkflowModuleLinks(date=todayStr()) {
      return;
    }

    function renderWorkflow() {
      const date = $('workflowDate').value || todayStr();
      syncAllSubmissionProjects();
      const allTasks = [...state.tasks];
      const allProjects = [...state.projects];
      if (workflowSelectedProjectId && !projectById(workflowSelectedProjectId)) workflowSelectedProjectId = '';

      const openTasks = allTasks.filter(taskOpen);
      const activeProjects = allProjects.filter(item => item.status === 'active').length;
      const unlinkedTasks = openTasks.filter(item => !item.projectId || item.gtdBucket === 'inbox');
      const nextTasks = openTasks.filter(item => item.gtdBucket === 'next');
      const waitingTasks = openTasks.filter(item => item.gtdBucket === 'waiting');
      const mustTasks = openTasks.filter(item => item.todayBucket === 'must');
      const shouldTasks = openTasks.filter(item => item.todayBucket === 'should');
      const couldTasks = openTasks.filter(item => item.todayBucket === 'could');
      const dueSoonTasks = openTasks.filter(item => item.dueDate && diffDays(date, item.dueDate) >= 0 && diffDays(date, item.dueDate) <= 7);
      const doneTasks = allTasks.filter(item => item.status === 'done');

      $('workflowStats').innerHTML = [
        { label:'项目总数', value: allProjects.length, color:'text-dopamine-purple', note:'长期目标池' },
        { label:'进行中项目', value: activeProjects, color:'text-dopamine-mint', note:'当前需要推进' },
        { label:'任务总数', value: allTasks.length, color:'text-dopamine-sky', note:'全部任务记录' },
        { label:'未完成任务', value: openTasks.length, color:'text-dopamine-pink', note:'计划中 / 没开始 / 进行中' },
        { label:'7 天内到期', value: dueSoonTasks.length, color:'text-dopamine-yellow', note:'需要提前安排' },
        { label:'未归项目', value: unlinkedTasks.length, color:'text-dopamine-orange', note:'需要归档清理' }
      ].map(item => `
        <div class="workflow-metric-card p-4">
          <div class="text-sm text-calm-mute">${item.label}</div>
          <div class="text-3xl font-black mt-1 ${item.color}">${escapeHtml(String(item.value))}</div>
          <div class="text-xs text-calm-mute mt-2">${escapeHtml(item.note)}</div>
        </div>
      `).join('');

      const projectDueSoon = [...allProjects]
        .filter(item => item.status !== 'done' && item.deadline)
        .sort((a, b) => a.deadline.localeCompare(b.deadline))
        .slice(0, 3);
      $('workflowInsightCards').innerHTML = [
        {
          tone:'from-purple-50 to-white border-purple-100',
          icon:'fa-folder-open',
          color:'text-dopamine-purple',
          title:'项目层',
          lines:[`进行中 ${activeProjects} 个`, `已完成 ${allProjects.filter(item => item.status === 'done').length} 个`, `暂停 ${allProjects.filter(item => item.status === 'paused').length} 个`]
        },
        {
          tone:'from-amber-50 to-white border-amber-100',
          icon:'fa-clock',
          color:'text-dopamine-orange',
          title:'近期截止',
          lines: projectDueSoon.length ? projectDueSoon.map(item => `${item.title} · ${item.deadline}`) : ['暂无设置截止日期的项目']
        },
        {
          tone:'from-sky-50 to-white border-sky-100',
          icon:'fa-list-check',
          color:'text-dopamine-sky',
          title:'任务层',
          lines:[`下一步 ${nextTasks.length} 项`, `等待反馈 ${waitingTasks.length} 项`, `已完成 ${doneTasks.length} 项`]
        }
      ].map(card => `
        <div class="rounded-2xl border bg-gradient-to-r ${card.tone} p-4">
          <div class="font-black flex items-center gap-2 ${card.color}"><i class="fa-solid ${card.icon}"></i> ${escapeHtml(card.title)}</div>
          <div class="text-sm text-calm-mute mt-3 leading-6">${card.lines.map(line => escapeHtml(line)).join('<br>')}</div>
        </div>
      `).join('');

      const quadrantStats = QUADRANT_OPTIONS.map(opt => ({
        label: opt.short,
        value: openTasks.filter(item => item.quadrant === opt.value).length,
        color: opt.color,
        note: opt.label
      }));
      const todayStats = [
        { label:'今日必做', value: mustTasks.length, color:'bg-rose-100 text-rose-700', note:'Must' },
        { label:'今日应该', value: shouldTasks.length + couldTasks.length, color:'bg-amber-100 text-amber-700', note:'Should / Could' }
      ];
      $('workflowQuadrantSummary').innerHTML = [...quadrantStats, ...todayStats].map(item => `
        <div class="workflow-kpi-strip p-3">
          <div class="flex items-center justify-between gap-2">
            <span class="workflow-tag ${item.color}">${escapeHtml(item.label)}</span>
            <span class="text-xl font-black">${escapeHtml(String(item.value))}</span>
          </div>
          <div class="text-xs text-calm-mute mt-2">${escapeHtml(item.note)}</div>
        </div>
      `).join('');

      $('workflowProjectBadge').textContent = `${allProjects.length} 个`;
      if ($('workflowCaptureProject')) {
        const current = $('workflowCaptureProject').value;
        $('workflowCaptureProject').innerHTML = '<option value="">选择所属项目</option>' + allProjects.map(project => `<option value="${project.id}">${escapeHtml(project.title)}</option>`).join('');
        $('workflowCaptureProject').value = allProjects.some(project => project.id === current) ? current : (workflowSelectedProjectId || '');
      }
      if ($('workflowProjectFilterSelect')) {
        $('workflowProjectFilterSelect').innerHTML = '<option value="">全部项目</option>' + allProjects.map(project => `<option value="${project.id}">${escapeHtml(project.title)}</option>`).join('');
        $('workflowProjectFilterSelect').value = workflowSelectedProjectId || '';
      }

      const sortedProjects = [...allProjects].sort((a, b) => {
        const order = { active:0, paused:1, done:2 };
        return (order[a.status] ?? 9) - (order[b.status] ?? 9) || (a.deadline || '9999-99-99').localeCompare(b.deadline || '9999-99-99');
      });
      function projectProgress(project) {
        const tasks = tasksForProject(project.id);
        const openCount = tasks.filter(taskOpen).length;
        const doneCount = tasks.filter(item => item.status === 'done').length;
        return Math.round(doneCount / Math.max(1, openCount + doneCount) * 100);
      }
      function projectRemainingLabel(project) {
        if (project.status === 'done') return { text:'已完成', tone:'text-emerald-600' };
        if (!project.deadline) return { text:'未设截止', tone:'text-calm-mute' };
        const days = diffDays(date, project.deadline);
        if (Number.isNaN(days)) return { text:'日期异常', tone:'text-calm-mute' };
        if (days < 0) return { text:`逾期 ${Math.abs(days)} 天`, tone:'text-rose-600 font-bold' };
        if (days === 0) return { text:'今日到期', tone:'text-dopamine-orange font-bold' };
        return { text:`剩 ${days} 天`, tone:days <= 7 ? 'text-dopamine-orange font-bold' : 'text-calm-mute' };
      }
      function renderProjectRows(projects) {
        if (!projects.length) return '<div class="px-4 py-5 text-sm text-calm-mute">暂无项目。</div>';
        return projects.map(project => {
          const area = projectAreaMeta(project.area);
          const status = projectStatusMeta(project.status);
          const tasks = tasksForProject(project.id);
          const openCount = tasks.filter(taskOpen).length;
          const doneCount = tasks.filter(item => item.status === 'done').length;
          const logCount = Array.isArray(project.logs) ? project.logs.length : 0;
          const progress = projectProgress(project);
          const startDate = project.startDate || dateFromDateTime(project.createdAt) || '—';
          const remaining = projectRemainingLabel(project);
          const statusTone = project.status === 'done' ? 'bg-emerald-100 text-emerald-700' : project.status === 'paused' ? 'bg-gray-100 text-gray-600' : 'bg-purple-100 text-purple-700';
          const activeClass = workflowSelectedProjectId === project.id ? 'bg-sky-50' : 'bg-white';
          return `
            <div class="grid grid-cols-[minmax(220px,1.4fr)_140px_minmax(200px,1.2fr)_110px_150px_120px_120px_120px_90px] gap-3 px-4 py-3 border-t border-calm-line items-center text-sm hover:bg-calm-bg/70 ${activeClass}" data-workflow-focus-project="${project.id}">
              <div class="min-w-0">
                <div class="font-bold truncate">${escapeHtml(project.title)}</div>
                <div class="text-xs text-calm-mute mt-1">任务 ${tasks.length} · 未完成 ${openCount} · 已完成 ${doneCount} · 日志 ${logCount}</div>
              </div>
              <div class="text-calm-mute">${escapeHtml(area.label)}</div>
              <div class="min-w-0 text-calm-mute truncate" title="${escapeHtml(project.outcome || '')}">${escapeHtml(project.outcome || '未填写完成结果')}</div>
              <span class="workflow-tag ${statusTone} justify-self-start">${escapeHtml(status.label)}</span>
              <div>
                <div class="flex items-center gap-2">
                  <div class="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden"><div class="h-full bg-dopamine-purple" style="width:${progress}%"></div></div>
                  <span class="text-xs font-black text-calm-mute">${progress}%</span>
                </div>
              </div>
              <div class="text-calm-mute">${project.deadline ? escapeHtml(project.deadline) : '—'}</div>
              <div class="text-calm-mute">${escapeHtml(startDate)}</div>
              <div class="${remaining.tone}">${escapeHtml(remaining.text)}</div>
              <div class="text-right"><button class="text-xs font-bold text-dopamine-orange" data-project-edit="${project.id}">修改</button></div>
            </div>`;
        }).join('');
      }
      const projectGroups = PROJECT_AREAS.map(area => ({ ...area, items: sortedProjects.filter(project => project.area === area.value) }))
        .filter(group => group.items.length);
      $('workflowProjectList').innerHTML = projectGroups.map(group => `
        <details class="rounded-2xl border border-calm-line bg-white overflow-hidden" open>
          <summary class="cursor-pointer select-none px-4 py-3 bg-calm-bg font-black flex items-center justify-between gap-3">
            <span>${escapeHtml(group.label)}</span>
            <span class="pill bg-white border border-calm-line text-calm-mute">${group.items.length} 个</span>
          </summary>
          <div class="overflow-auto scroll-thin">
            <div class="min-w-[1320px]">
              <div class="grid grid-cols-[minmax(220px,1.4fr)_140px_minmax(200px,1.2fr)_110px_150px_120px_120px_120px_90px] gap-3 px-4 py-3 text-xs font-black tracking-wide text-calm-mute bg-white">
                <div>项目名称</div>
                <div>项目分类</div>
                <div>完成结果</div>
                <div>状态</div>
                <div>进度</div>
                <div>截止日期</div>
                <div>开始日期</div>
                <div>剩余日期</div>
                <div class="text-right">操作</div>
              </div>
              ${renderProjectRows(group.items)}
            </div>
          </div>
        </details>`).join('') || '<div class="text-sm text-calm-mute">还没有项目。先创建一个需要多个动作才能完成的长期目标。</div>';

      const filter = $('workflowTaskFilter').value || 'all';
      const scopedTasks = workflowSelectedProjectId ? allTasks.filter(item => item.projectId === workflowSelectedProjectId) : allTasks;
      const filteredTasks = scopedTasks.filter(task => {
        if (filter === 'today') return !!task.todayBucket && task.status !== 'done';
        if (QUADRANT_OPTIONS.some(opt => opt.value === filter)) return task.quadrant === filter;
        return true;
      }).sort((a, b) => {
        const statusOrder = { planned:0, todo:1, active:2, done:3 };
        return (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9)
          || (a.dueDate || '9999-99-99').localeCompare(b.dueDate || '9999-99-99')
          || (b.createdAt || '').localeCompare(a.createdAt || '');
      });

      function taskCompletion(task) {
        return taskStatusMeta(task.status).progress;
      }
      function compactDateTime(ts) {
        return ts ? escapeHtml(String(ts).slice(0, 16)) : '—';
      }
      function renderTaskRows(items) {
        if (!items.length) return '<div class="px-4 py-6 text-sm text-calm-mute border-t border-calm-line">这一组暂无任务。</div>';
        return items.map(task => {
          const project = projectById(task.projectId);
          const quadrant = taskQuadrantMeta(task.quadrant);
          const today = todayBucketMeta(task.todayBucket);
          const completion = taskCompletion(task);
          return `
            <div class="grid grid-cols-[minmax(220px,1.3fr)_minmax(160px,1fr)_150px_120px_120px_140px_150px_150px_120px] gap-3 px-4 py-3 border-t border-calm-line items-center text-sm hover:bg-calm-bg/70">
              <div class="min-w-0">
                <div class="font-bold truncate ${task.status === 'done' ? 'line-through text-calm-mute' : ''}">${escapeHtml(task.title)}</div>
                <div class="text-xs text-calm-mute mt-1">${task.estimate ? `预计 ${task.estimate} 分钟` : '未设置预计时长'}</div>
              </div>
              <div class="truncate text-calm-mute">${escapeHtml(project?.title || '未关联项目')}</div>
              <span class="workflow-tag ${quadrant.color} justify-self-start">${escapeHtml(quadrant.label)}</span>
              <select class="px-3 py-2 rounded-xl border border-calm-line bg-white text-sm" data-workflow-status="${task.id}">
                ${TASK_STATUS_OPTIONS.map(opt => `<option value="${opt.value}" ${task.status === opt.value ? 'selected' : ''}>${escapeHtml(opt.label)}</option>`).join('')}
              </select>
              <div class="text-calm-mute">${task.dueDate ? escapeHtml(task.dueDate) : '—'}</div>
              <div class="text-calm-mute">${compactDateTime(task.startedAt)}</div>
              <div>
                <div class="flex items-center gap-2">
                  <div class="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden"><div class="h-full bg-dopamine-mint" style="width:${completion}%"></div></div>
                  <span class="text-xs font-black text-calm-mute">${completion}%</span>
                </div>
              </div>
              <div>
                <select class="w-full px-3 py-2 rounded-xl border border-calm-line bg-white text-sm" data-workflow-today-toggle="${task.id}" ${task.status === 'done' ? 'disabled' : ''}>
                  <option value="" ${task.todayBucket ? '' : 'selected'}>否</option>
                  <option value="should" ${task.todayBucket ? 'selected' : ''}>是</option>
                </select>
                <div class="text-[11px] text-calm-mute mt-1">${task.status === 'done' ? '已完成不加入' : today.value ? escapeHtml(today.label) : '不进入今日执行'}</div>
              </div>
              <div class="flex gap-2 justify-end">
                ${task.status === 'done' ? '' : `<button class="text-xs font-bold text-dopamine-pink" data-workflow-start="${task.id}">${task.status === 'active' ? '结束' : '开始'}</button>`}
                ${task.status === 'done' ? '' : `<button class="text-xs font-bold text-green-600" data-workflow-done="${task.id}">完成</button>`}
                <button class="text-xs font-bold text-dopamine-orange" data-workflow-edit="${task.id}">修改</button>
              </div>
            </div>`;
        }).join('');
      }
      const taskGroups = TASK_STATUS_OPTIONS.map(status => ({
        ...status,
        items: filteredTasks.filter(task => task.status === status.value)
      }));
      $('workflowTaskTable').innerHTML = taskGroups.map(group => `
        <details class="border-t border-calm-line first:border-t-0" open>
          <summary class="cursor-pointer select-none px-4 py-3 bg-calm-bg font-black flex items-center justify-between gap-3">
            <span class="flex items-center gap-2"><span class="workflow-tag ${group.color}">${escapeHtml(group.label)}</span><span>任务</span></span>
            <span class="pill bg-white border border-calm-line text-calm-mute">${group.items.length} 项</span>
          </summary>
          <div class="overflow-auto scroll-thin">
            <div class="min-w-[1440px]">
              <div class="grid grid-cols-[minmax(220px,1.3fr)_minmax(160px,1fr)_150px_120px_120px_140px_150px_150px_120px] gap-3 px-4 py-3 text-xs font-black tracking-wide text-calm-mute bg-white">
                <div>任务名称</div>
                <div>所属项目</div>
                <div>紧急程度（4 象限）</div>
                <div>状态</div>
                <div>到期时间</div>
                <div>开始时间</div>
                <div>完成度</div>
                <div>加入今日执行</div>
                <div class="text-right">操作</div>
              </div>
              ${renderTaskRows(group.items)}
            </div>
          </div>
        </details>`).join('');

      $('workflowProjectList').querySelectorAll('[data-workflow-focus-project]').forEach(card => card.onclick = (event) => {
        if (event.target.closest('button')) return;
        workflowSelectedProjectId = card.dataset.workflowFocusProject;
        if ($('workflowProjectFilterSelect')) $('workflowProjectFilterSelect').value = workflowSelectedProjectId;
        renderWorkflow();
      });
      $('workflowProjectList').querySelectorAll('[data-project-edit]').forEach(btn => btn.onclick = () => openProjectEditor(btn.dataset.projectEdit));
      if ($('workflowProjectFilterSelect')) {
        $('workflowProjectFilterSelect').onchange = () => {
          workflowSelectedProjectId = $('workflowProjectFilterSelect').value || '';
          renderWorkflow();
        };
      }
      $('workflowTaskTable').querySelectorAll('[data-workflow-start]').forEach(btn => btn.onclick = () => toggleTaskStart(btn.dataset.workflowStart));
      $('workflowTaskTable').querySelectorAll('[data-workflow-done]').forEach(btn => btn.onclick = () => finishTask(btn.dataset.workflowDone));
      $('workflowTaskTable').querySelectorAll('[data-workflow-edit]').forEach(btn => btn.onclick = () => openTaskEditor(btn.dataset.workflowEdit));
      $('workflowTaskTable').querySelectorAll('[data-workflow-today-toggle]').forEach(select => select.onchange = () => {
        setTaskTodayBucket(select.dataset.workflowTodayToggle, select.value ? 'should' : '');
      });
      $('workflowTaskTable').querySelectorAll('[data-workflow-status]').forEach(select => select.onchange = () => {
        const task = state.tasks.find(item => item.id === select.dataset.workflowStatus);
        if (!task) return;
        const nextStatus = taskStatusMeta(select.value).value;
        if (nextStatus === 'done') return finishTask(task.id);
        updateTaskField(task.id, {
          status: nextStatus,
          gtdBucket: task.gtdBucket === 'done' ? 'next' : task.gtdBucket,
          doneAt: '',
          startedAt: nextStatus === 'active' ? (task.startedAt || nowDateTime()) : task.startedAt
        });
      });
    }

    function habitModeLabel(mode) {
      return ({
        time: '时间',
        duration: '时长',
        checkbox: '打卡',
        count: '次数',
        text: '文字',
        food: '饮食'
      })[mode] || String(mode || '');
    }

    function normalizeCheckboxEntry(raw) {
      if (!raw || typeof raw !== 'object') return { done:false, note:'' };
      return { done: !!raw.done, note: String(raw.note || '') };
    }
    function normalizeTextEntry(raw) {
      if (!raw || typeof raw !== 'object') return { text:'' };
      return { text: String(raw.text || '') };
    }
    function normalizeCountEntry(raw) {
      if (!raw || typeof raw !== 'object') return { count:0, note:'' };
      return { count: Math.max(0, Number(raw.count) || 0), note: String(raw.note || '') };
    }
    function normalizeTimeEntry(raw) {
      if (!raw || typeof raw !== 'object') return { time:'', note:'' };
      return { time: parseHM(raw.time) || '', note: String(raw.note || '') };
    }
    function normalizeDurationEntry(raw) {
      if (!raw || typeof raw !== 'object') return { minutes:0, type:'', intensity:'', note:'', done:false };
      const minutes = Math.max(0, Number(raw.minutes ?? raw.mins ?? raw.min ?? 0) || 0);
      const type = String(raw.type || raw.sport || '');
      const intensity = String(raw.intensity || '');
      const note = String(raw.note || raw.notes || '');
      const done = raw.done === true || minutes > 0;
      return { minutes, type, intensity, note, done };
    }

    function getDurationEntry(date, habitId) {
      return normalizeDurationEntry(state.habits?.entries?.[date]?.[habitId]);
    }
    function setDurationEntry(date, habitId, patch) {
      const map = getHabitEntryMap(date);
      map[habitId] = { ...getDurationEntry(date, habitId), ...patch };
    }

    function getTimeHabitValue(date, habitId) {
      if (habitId === 'habit_early_wake') return parseHM(state.attendance?.[date]?.wake) || '';
      if (habitId === 'habit_early_sleep') return parseHM(state.attendance?.[date]?.sleep) || '';
      return normalizeTimeEntry(state.habits?.entries?.[date]?.[habitId]).time || '';
    }
    function setTimeHabitValue(date, habitId, time) {
      const t = parseHM(time);
      if (habitId === 'habit_early_wake') { getDayAttendance(date).wake = t; return; }
      if (habitId === 'habit_early_sleep') { getDayAttendance(date).sleep = t; return; }
      const map = getHabitEntryMap(date);
      map[habitId] = { ...normalizeTimeEntry(map[habitId]), time: t || '' };
    }
    function clearTimeHabitValue(date, habitId) {
      if (habitId === 'habit_early_wake') { getDayAttendance(date).wake = null; return; }
      if (habitId === 'habit_early_sleep') { getDayAttendance(date).sleep = null; return; }
      const map = getHabitEntryMap(date);
      delete map[habitId];
    }

    function habitDoneOnDate(habit, date) {
      if (!habit || habit.enabled === false) return false;
      const id = habit.id;
      const mode = habit.mode;
      if (id === 'habit_early_wake') return !!state.attendance?.[date]?.wake;
      if (id === 'habit_early_sleep') return !!state.attendance?.[date]?.sleep;
      if (id === 'habit_food_record' || mode === 'food') return state.foods.some(item => item.date === date);
      if (mode === 'time') return !!getTimeHabitValue(date, id);
      if (mode === 'duration') return getDurationEntry(date, id).done;
      if (mode === 'checkbox') return normalizeCheckboxEntry(state.habits?.entries?.[date]?.[id]).done;
      if (mode === 'count') return normalizeCountEntry(state.habits?.entries?.[date]?.[id]).count > 0;
      if (mode === 'text') return (normalizeTextEntry(state.habits?.entries?.[date]?.[id]).text || '').trim().length > 0;
      return false;
    }

    function exerciseDoneOn(date=todayStr()) { return getDurationEntry(date, 'habit_exercise').done; }
    function renderHabitSnapshot() {
      const date = $('habitDate').value || todayStr();
      const range = getStatsRange(date);
      if ($('habitStatsRangeLabel')) $('habitStatsRangeLabel').textContent = range.label;
      const enabledIds = new Set((state.habits?.list || []).filter(h => h && h.enabled !== false).map(h => h.id));
      const day = getDayAttendance(date);
      let cards = [];
      if (statsMode === 'day') {
        const ex = getDurationEntry(date, 'habit_exercise');
        const exMinutes = Math.round(ex.minutes) || 0;
        const exBase = exMinutes ? `${exMinutes} 分钟` : '已记录';
        const exText = ex.done
          ? `${exBase}${ex.type ? ` · ${escapeHtml(ex.type)}` : ''}${ex.intensity ? ` · ${escapeHtml(ex.intensity)}` : ''}`
          : '未记录';
        const weight = (state.weights || []).find(item => item.date === date);
        cards = [
          enabledIds.has('habit_early_sleep') ? { key:'sleep', name:'早睡', icon:'fa-moon', value: day.sleep ? `${day.sleep} ${qualifiesSleep(day.sleep) ? '达标' : '稍晚'}` : '未记录', accent:'text-dopamine-purple' } : null,
          enabledIds.has('habit_early_wake') ? { key:'wake', name:'早起', icon:'fa-sun', value: day.wake ? `${day.wake} ${qualifiesWake(day.wake) ? '达标' : '偏晚'}` : '未记录', accent:'text-dopamine-yellow' } : null,
          enabledIds.has('habit_exercise') ? { key:'exercise', name:'运动', icon:'fa-person-running', value: exText, accent:'text-dopamine-mint' } : null,
          enabledIds.has('habit_food_record') ? { key:'food', name:'饮食记录', icon:'fa-utensils', value: `${state.foods.filter(item => item.date===date).length} 条`, accent:'text-dopamine-orange' } : null,
          { key:'weight', name:'体重', icon:'fa-weight-scale', value: weight ? `${weight.value} ${weight.unit}` : '未记录', accent:'text-dopamine-sky' }
        ].filter(Boolean);
        $('habitCompletionText').textContent = `${todayHabitCompletion(date)}%`;
      } else {
        const totalDays = Math.max(1, range.dates.length);
        const sleepGood = range.dates.filter(d => qualifiesSleep(state.attendance[d]?.sleep)).length;
        const wakeGood = range.dates.filter(d => qualifiesWake(state.attendance[d]?.wake)).length;
        const exerciseDays = range.dates.filter(d => exerciseDoneOn(d)).length;
        const foodEntries = state.foods.filter(item => isDateInRange(item.date, range.start, range.end)).length;
        const weightEntries = (state.weights || []).filter(item => isDateInRange(item.date, range.start, range.end)).length;
        const avgCompletion = Math.round(range.dates.reduce((sum, d) => sum + todayHabitCompletion(d), 0) / totalDays);
        cards = [
          enabledIds.has('habit_early_sleep') ? { key:'sleep', name:'早睡', icon:'fa-moon', value: `达标 ${sleepGood}/${totalDays} 天`, accent:'text-dopamine-purple' } : null,
          enabledIds.has('habit_early_wake') ? { key:'wake', name:'早起', icon:'fa-sun', value: `达标 ${wakeGood}/${totalDays} 天`, accent:'text-dopamine-yellow' } : null,
          enabledIds.has('habit_exercise') ? { key:'exercise', name:'运动', icon:'fa-person-running', value: `完成 ${exerciseDays}/${totalDays} 天`, accent:'text-dopamine-mint' } : null,
          enabledIds.has('habit_food_record') ? { key:'food', name:'饮食记录', icon:'fa-utensils', value: `${foodEntries} 条`, accent:'text-dopamine-orange' } : null,
          { key:'weight', name:'体重记录', icon:'fa-weight-scale', value: `${weightEntries} 条`, accent:'text-dopamine-sky' }
        ].filter(Boolean);
        $('habitCompletionText').textContent = `平均 ${avgCompletion}%`;
      }
      $('habitSnapshot').innerHTML = cards.map(card => `
        <div class="small-stat p-4">
          <div class="text-sm font-black ${card.accent}">${iconLabel(card.icon, card.name)}</div>
          <div class="mt-2 text-lg font-black">${card.value}</div>
        </div>
      `).join('');
    }

    function addCustomHabit() {
      const name = $('customHabitName').value.trim(); if (!name) return;
      const mode = $('customHabitMode').value; const icon = normalizeFaIcon($('customHabitIcon').value, 'fa-check');
      const id = uid('habit');
      state.habits.list.push(normalizeHabitItem({ id, name, icon, mode, enabled:true, locked:false }) || { id, name, icon, mode, enabled:true, locked:false });
      $('customHabitName').value = ''; $('customHabitIcon').value = '';
      saveState(); renderAll();
    }

    function renderHabitList() {
      const date = $('habitDate').value || todayStr();
      const entryMap = getHabitEntryMap(date);
      const enabledHabits = (state.habits?.list || []).filter(h => h && h.enabled !== false);
      const recordHabits = enabledHabits.filter(h => ['time','duration','checkbox','count','text'].includes(h.mode));

      const timeHabits = recordHabits.filter(h => h.mode === 'time');
      const durationHabits = recordHabits.filter(h => h.mode === 'duration');
      const checkboxHabits = recordHabits.filter(h => h.mode === 'checkbox');
      const countHabits = recordHabits.filter(h => h.mode === 'count');
      const textHabits = recordHabits.filter(h => h.mode === 'text');

      function groupCard(title, desc, bodyHtml, count) {
        if (!count) return '';
        return `
          <div class="small-stat p-4">
            <div class="flex items-start justify-between gap-3 mb-3">
              <div>
                <div class="font-black">${escapeHtml(title)}</div>
                <div class="text-xs text-calm-mute mt-1">${escapeHtml(desc || '')}</div>
              </div>
              <span class="pill bg-white border border-calm-line text-calm-mute">${count} 项</span>
            </div>
            <div class="space-y-3">${bodyHtml}</div>
          </div>`;
      }

      const timeHtml = timeHabits.map(habit => {
        const timeVal = getTimeHabitValue(date, habit.id);
        const status = timeVal
          ? (habit.id === 'habit_early_wake' ? (qualifiesWake(timeVal) ? '达标早起' : '已记录') : habit.id === 'habit_early_sleep' ? (qualifiesSleep(timeVal) ? '达标早睡' : '已记录') : '已记录')
          : '未记录';
        const nowBtn = habit.id === 'habit_early_wake'
          ? `<button class="px-3 py-1.5 rounded-xl text-sm font-bold bg-yellow-100 text-yellow-800" data-habit-time-now="${habit.id}">现在</button>`
          : '';
        return `
          <div class="rounded-2xl border border-calm-line bg-white p-4">
            <div class="flex items-center justify-between gap-3 mb-2">
              <div class="font-black">${iconLabel(habit.icon, habit.name)}</div>
              <div class="flex gap-2 shrink-0">
                ${nowBtn}
                <button class="px-3 py-1.5 rounded-xl text-sm font-bold bg-gray-100 text-calm-mute" data-habit-time-clear="${habit.id}">清空</button>
                <button class="px-3 py-1.5 rounded-xl text-sm font-bold bg-white border border-calm-line" data-habit-def-edit="${habit.id}">管理</button>
              </div>
            </div>
            <div class="grid grid-cols-[minmax(0,1fr)_160px] gap-2 items-center">
              <div class="text-sm text-calm-mute">${escapeHtml(status)}</div>
              <input data-habit-time="${habit.id}" type="time" class="px-3 py-2 rounded-2xl border border-calm-line bg-calm-bg font-semibold" value="${escapeHtml(timeVal)}">
            </div>
          </div>`;
      }).join('');

      const durationHtml = durationHabits.map(habit => {
        const entry = getDurationEntry(date, habit.id);
        const minutes = entry.minutes ? String(Math.round(entry.minutes)) : '';
        const intensity = entry.intensity || '';
        return `
          <div class="rounded-2xl border border-calm-line bg-white p-4">
            <div class="flex items-center justify-between gap-3 mb-2">
              <div class="font-black">${iconLabel(habit.icon, habit.name)}</div>
              <div class="flex gap-2 shrink-0">
                <span class="pill ${entry.done ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-calm-mute'}">${entry.done ? '已记录' : '未记录'}</span>
                <button class="px-3 py-1.5 rounded-xl text-sm font-bold bg-gray-100 text-calm-mute" data-habit-duration-clear="${habit.id}">清空</button>
                <button class="px-3 py-1.5 rounded-xl text-sm font-bold bg-white border border-calm-line" data-habit-def-edit="${habit.id}">管理</button>
              </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
              <input data-habit-duration-minutes="${habit.id}" type="number" min="0" class="px-3 py-3 rounded-2xl border border-calm-line bg-calm-bg" placeholder="${habit.id==='habit_exercise' ? '运动时长（分钟）' : '时长（分钟）'}" value="${escapeHtml(minutes)}">
              <input data-habit-duration-type="${habit.id}" class="px-3 py-3 rounded-2xl border border-calm-line bg-calm-bg" placeholder="${habit.id==='habit_exercise' ? '运动类型，如：跑步 / 力量 / 瑜伽' : '类型（可选）'}" value="${escapeHtml(entry.type || '')}">
              <select data-habit-duration-intensity="${habit.id}" class="px-3 py-3 rounded-2xl border border-calm-line bg-calm-bg">
                <option value="">运动强度</option>
                <option value="低" ${intensity==='低'?'selected':''}>低</option>
                <option value="中" ${intensity==='中'?'selected':''}>中</option>
                <option value="高" ${intensity==='高'?'selected':''}>高</option>
              </select>
            </div>
            <textarea data-habit-duration-note="${habit.id}" rows="2" class="w-full mt-2 px-3 py-3 rounded-2xl border border-calm-line bg-calm-bg" placeholder="备注（可选）">${escapeHtml(entry.note || '')}</textarea>
          </div>`;
      }).join('');

      const checkboxHtml = checkboxHabits.map(habit => {
        const entry = normalizeCheckboxEntry(entryMap[habit.id]);
        return `
          <div class="rounded-2xl border border-calm-line bg-white p-4">
            <div class="flex items-center justify-between gap-3 mb-2">
              <div class="font-black">${iconLabel(habit.icon, habit.name)}</div>
              <div class="flex gap-2 shrink-0">
                <button class="px-3 py-1.5 rounded-xl text-sm font-bold ${entry.done ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-calm-mute'}" data-habit-toggle="${habit.id}">${entry.done ? '已完成' : '标记完成'}</button>
                <button class="px-3 py-1.5 rounded-xl text-sm font-bold bg-white border border-calm-line" data-habit-def-edit="${habit.id}">管理</button>
              </div>
            </div>
            <textarea data-habit-note="${habit.id}" rows="2" class="w-full px-3 py-3 rounded-2xl border border-calm-line bg-calm-bg" placeholder="备注（可选）">${escapeHtml(entry.note||'')}</textarea>
          </div>`;
      }).join('');

      const countHtml = countHabits.map(habit => {
        const entry = normalizeCountEntry(entryMap[habit.id]);
        return `
          <div class="rounded-2xl border border-calm-line bg-white p-4">
            <div class="flex items-center justify-between gap-3 mb-2">
              <div class="font-black">${iconLabel(habit.icon, habit.name)}</div>
              <div class="flex gap-2 shrink-0">
                <span class="pill ${entry.count>0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-calm-mute'}">${entry.count>0 ? '已记录' : '未记录'}</span>
                <button class="px-3 py-1.5 rounded-xl text-sm font-bold bg-white border border-calm-line" data-habit-def-edit="${habit.id}">管理</button>
              </div>
            </div>
            <div class="grid grid-cols-[140px_minmax(0,1fr)] gap-2">
              <input data-habit-count="${habit.id}" type="number" min="0" class="px-3 py-3 rounded-2xl border border-calm-line bg-calm-bg" value="${escapeHtml(String(entry.count||0))}">
              <input data-habit-count-note="${habit.id}" class="px-3 py-3 rounded-2xl border border-calm-line bg-calm-bg" placeholder="备注（可选）" value="${escapeHtml(entry.note||'')}">
            </div>
          </div>`;
      }).join('');

      const textHtml = textHabits.map(habit => {
        const entry = normalizeTextEntry(entryMap[habit.id]);
        return `
          <div class="rounded-2xl border border-calm-line bg-white p-4">
            <div class="flex items-center justify-between gap-3 mb-2">
              <div class="font-black">${iconLabel(habit.icon, habit.name)}</div>
              <div class="flex gap-2 shrink-0">
                <span class="pill ${(entry.text||'').trim() ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-calm-mute'}">${(entry.text||'').trim() ? '已记录' : '未记录'}</span>
                <button class="px-3 py-1.5 rounded-xl text-sm font-bold bg-white border border-calm-line" data-habit-def-edit="${habit.id}">管理</button>
              </div>
            </div>
            <textarea data-habit-text="${habit.id}" rows="3" class="w-full px-3 py-3 rounded-2xl border border-calm-line bg-calm-bg" placeholder="记录内容">${escapeHtml(entry.text||'')}</textarea>
          </div>`;
      }).join('');

      const html = [
        groupCard('时间记录', '如：早起 / 早睡（HH:MM）', timeHtml, timeHabits.length),
        groupCard('时长记录', '如：运动（分钟 + 类型 + 强度）', durationHtml, durationHabits.length),
        groupCard('打卡习惯', '勾选完成 + 备注', checkboxHtml, checkboxHabits.length),
        groupCard('次数记录', '次数 + 备注', countHtml, countHabits.length),
        groupCard('文字记录', '自由文本记录', textHtml, textHabits.length)
      ].filter(Boolean).join('');

      $('habitList').innerHTML = html || '<div class="text-sm text-calm-mute">还没有启用可记录的健康习惯。可以在页面底部添加或启用习惯。</div>';

      $('habitList').querySelectorAll('[data-habit-time]').forEach(input => input.onchange = () => { setTimeHabitValue(date, input.dataset.habitTime, input.value); saveState(); renderAll(); });
      $('habitList').querySelectorAll('[data-habit-time-now]').forEach(btn => btn.onclick = () => { setTimeHabitValue(date, btn.dataset.habitTimeNow, nowTime()); saveState(); renderAll(); });
      $('habitList').querySelectorAll('[data-habit-time-clear]').forEach(btn => btn.onclick = () => { clearTimeHabitValue(date, btn.dataset.habitTimeClear); saveState(); renderAll(); });

      $('habitList').querySelectorAll('[data-habit-duration-minutes]').forEach(input => input.onchange = () => {
        const id = input.dataset.habitDurationMinutes;
        const mins = Math.max(0, Number(input.value) || 0);
        setDurationEntry(date, id, { minutes: mins, done: mins > 0 });
        saveState(); renderAll();
      });
      $('habitList').querySelectorAll('[data-habit-duration-type]').forEach(input => input.onchange = () => { const id=input.dataset.habitDurationType; setDurationEntry(date, id, { type: input.value.trim() }); saveState(); renderAll(); });
      $('habitList').querySelectorAll('[data-habit-duration-intensity]').forEach(input => input.onchange = () => { const id=input.dataset.habitDurationIntensity; setDurationEntry(date, id, { intensity: input.value }); saveState(); renderAll(); });
      $('habitList').querySelectorAll('[data-habit-duration-note]').forEach(input => input.onchange = () => { const id=input.dataset.habitDurationNote; setDurationEntry(date, id, { note: input.value }); saveState(); renderAll(); });
      $('habitList').querySelectorAll('[data-habit-duration-clear]').forEach(btn => btn.onclick = () => { const id=btn.dataset.habitDurationClear; delete entryMap[id]; saveState(); renderAll(); });

      $('habitList').querySelectorAll('[data-habit-toggle]').forEach(btn => btn.onclick = () => { const id=btn.dataset.habitToggle; const entry=normalizeCheckboxEntry(entryMap[id]); entryMap[id] = { ...entry, done: !entry.done }; saveState(); renderAll(); });
      $('habitList').querySelectorAll('[data-habit-note]').forEach(input => input.onchange = () => { const id=input.dataset.habitNote; const entry=normalizeCheckboxEntry(entryMap[id]); entryMap[id] = { ...entry, note: input.value }; saveState(); renderAll(); });
      $('habitList').querySelectorAll('[data-habit-text]').forEach(input => input.onchange = () => { const id=input.dataset.habitText; entryMap[id] = { ...normalizeTextEntry(entryMap[id]), text: input.value }; saveState(); renderAll(); });
      $('habitList').querySelectorAll('[data-habit-count]').forEach(input => input.onchange = () => { const id=input.dataset.habitCount; const noteEl = $('habitList').querySelector(`[data-habit-count-note="${id}"]`); entryMap[id] = { ...normalizeCountEntry(entryMap[id]), count: Math.max(0, Number(input.value) || 0), note: noteEl?.value || '' }; saveState(); renderAll(); });
      $('habitList').querySelectorAll('[data-habit-count-note]').forEach(input => input.onchange = () => { const id=input.dataset.habitCountNote; const countEl = $('habitList').querySelector(`[data-habit-count="${id}"]`); entryMap[id] = { ...normalizeCountEntry(entryMap[id]), count: Math.max(0, Number(countEl?.value) || 0), note: input.value }; saveState(); renderAll(); });
      $('habitList').querySelectorAll('[data-habit-def-edit]').forEach(btn => btn.onclick = () => openHabitDefinitionEditor(btn.dataset.habitDefEdit));

      const enabledIds = new Set(enabledHabits.map(h => h.id));
      if ($('habitFoodCard')) $('habitFoodCard').style.display = enabledIds.has('habit_food_record') ? '' : 'none';
    }

    function isDefaultHabitId(id) { return DEFAULT_HABITS.some(h => h.id === id); }
    function toggleHabitEnabled(id) {
      const item = state.habits.list.find(h => h.id === id);
      if (!item) return;
      item.enabled = item.enabled === false;
      saveState(); renderAll();
    }
    function deleteHabitDefinition(id) {
      const item = state.habits.list.find(h => h.id === id);
      if (!item) return;
      if (isDefaultHabitId(id)) item.enabled = false;
      else state.habits.list = state.habits.list.filter(h => h.id !== id);
      for (const d of Object.keys(state.habits.entries || {})) delete state.habits.entries[d][id];
      saveState(); renderAll();
    }
    function openHabitDefinitionEditor(id) {
      const item = state.habits.list.find(h => h.id === id);
      if (!item) return;
      const modeOptions = [
        { value:'time', label:'时间记录（HH:MM）' },
        { value:'duration', label:'时长记录（分钟 + 类型 + 强度）' },
        { value:'checkbox', label:'勾选完成' },
        { value:'count', label:'次数记录' },
        { value:'text', label:'文字记录' },
        { value:'food', label:'饮食（外部）' }
      ];
      const enabledOptions = [
        { value:'1', label:'启用' },
        { value:'0', label:'停用' }
      ];
      openEditDialog({
        title:'习惯管理',
        desc:`记录方式：${habitModeLabel(item.mode)}`,
        fields:[
          { name:'name', label:'名称', value:item.name },
          { name:'icon', label:'Font Awesome 图标', value:normalizeFaIcon(item.icon, 'fa-check') },
          { name:'mode', label:'记录方式', type:'select', value:item.mode, options: modeOptions },
          { name:'enabled', label:'是否启用', type:'select', value: item.enabled === false ? '0' : '1', options: enabledOptions }
        ],
        onSave:(vals) => {
          item.name = vals.name.trim() || item.name;
          item.icon = normalizeFaIcon(vals.icon, item.icon);
          const requestedMode = String(vals.mode || item.mode);
          const requestedEnabled = String(vals.enabled || '1') === '1';
          // Protect system habits.
          if (id === 'habit_early_sleep' || id === 'habit_early_wake') item.mode = 'time';
          else if (id === 'habit_exercise') item.mode = 'duration';
          else if (id === 'habit_food_record') item.mode = 'food';
          else item.mode = ['time','duration','checkbox','count','text'].includes(requestedMode) ? requestedMode : item.mode;
          item.enabled = requestedEnabled;
          saveState(); renderAll();
        },
        onDelete:() => { deleteHabitDefinition(id); }
      });
    }
    function renderHabitManager() {
      const list = state.habits?.list || [];
      const ordered = [...list].sort((a,b) => (a.enabled===false)-(b.enabled===false));
      $('habitManagerList').innerHTML = ordered.map(item => `
        <div class="rounded-2xl border border-calm-line bg-white p-3 flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="font-black">${iconLabel(item.icon, item.name)}</div>
            <div class="text-xs text-calm-mute mt-1">方式：${escapeHtml(habitModeLabel(item.mode))} · 状态：${item.enabled===false ? '停用' : '启用'}</div>
          </div>
          <div class="flex gap-2 shrink-0 flex-wrap justify-end">
            <button class="px-3 py-1.5 rounded-xl text-sm font-bold bg-white border border-calm-line" data-habit-manage-edit="${item.id}">编辑</button>
            <button class="px-3 py-1.5 rounded-xl text-sm font-bold ${item.enabled===false ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-calm-mute'}" data-habit-manage-toggle="${item.id}">${item.enabled===false ? '启用' : '停用'}</button>
            <button class="px-3 py-1.5 rounded-xl text-sm font-bold bg-rose-100 text-rose-600" data-habit-manage-delete="${item.id}">删除</button>
          </div>
        </div>
      `).join('') || '<div class="text-sm text-calm-mute">暂无习惯。</div>';

      $('habitManagerList').querySelectorAll('[data-habit-manage-edit]').forEach(btn => btn.onclick = () => openHabitDefinitionEditor(btn.dataset.habitManageEdit));
      $('habitManagerList').querySelectorAll('[data-habit-manage-toggle]').forEach(btn => btn.onclick = () => toggleHabitEnabled(btn.dataset.habitManageToggle));
      $('habitManagerList').querySelectorAll('[data-habit-manage-delete]').forEach(btn => btn.onclick = () => { if (confirm('确定删除（或停用）这个习惯吗？')) deleteHabitDefinition(btn.dataset.habitManageDelete); });
    }

    function addFood() {
      const date = $('habitDate').value || todayStr();
      const meal = $('foodMeal').value; const text = $('foodText').value.trim();
      if (!text) return;
      state.foods.unshift({ id:uid('food'), date, meal, text, at:nowDateTime() });
      $('foodText').value = '';
      saveState(); renderAll();
    }
    function renderFoods() {
      const date = $('habitDate').value || todayStr();
      const foods = state.foods.filter(item => item.date === date);
      $('foodCountBadge').textContent = `${foods.length} 条`;
      $('foodList').innerHTML = foods.map(item => `
        <div class="rounded-2xl border border-calm-line bg-white p-3 flex items-start justify-between gap-3">
          <div><div class="font-bold">${escapeHtml(item.meal)}</div><div class="text-sm text-calm-mute mt-1">${escapeHtml(item.text)}</div></div>
          <button class="text-sm font-bold text-dopamine-orange" data-food-edit="${item.id}">修改</button>
        </div>
      `).join('') || '<div class="text-sm text-calm-mute">今天还没有饮食记录。</div>';
      $('foodList').querySelectorAll('[data-food-edit]').forEach(btn => btn.onclick = () => openFoodEditor(btn.dataset.foodEdit));
    }

    function addWeight() {
      const date = $('habitDate').value || todayStr();
      const value = Math.max(0, Number($('weightValue').value) || 0);
      if (!value) { alert('请填写体重数值。'); return; }
      state.weights.unshift({ id: uid('weight'), date, value, unit: $('weightUnit').value || 'kg', at: nowDateTime() });
      $('weightValue').value = '';
      saveState();
      renderAll();
    }
    function renderWeights() {
      const date = $('habitDate').value || todayStr();
      const records = (state.weights || []).filter(item => item.date === date);
      const latest = (state.weights || [])[0];
      $('weightLatestBadge').textContent = latest ? `${latest.value} ${latest.unit}` : '未记录';
      $('weightList').innerHTML = records.map(item => `
        <div class="rounded-2xl border border-calm-line bg-white p-3 flex items-start justify-between gap-3">
          <div>
            <div class="font-bold">${escapeHtml(String(item.value))} ${escapeHtml(item.unit)}</div>
            <div class="text-xs text-calm-mute mt-1">${escapeHtml(item.date)} · ${escapeHtml(String(item.at || '').slice(11, 16))}</div>
          </div>
          <button class="text-sm font-bold text-dopamine-orange" data-weight-edit="${item.id}">修改</button>
        </div>
      `).join('') || '<div class="text-sm text-calm-mute">今天还没有体重记录。</div>';
      $('weightList').querySelectorAll('[data-weight-edit]').forEach(btn => btn.onclick = () => openWeightEditor(btn.dataset.weightEdit));
    }

    function saveCareEntry() {
      const date = $('careDate').value || todayStr();
      state.care.entries[date] = normalizeCareEntry({
        mood: selectedCareMood,
        stress: $('careStress').value,
        energy: $('careEnergy').value,
        challenge: $('careChallenge').value.trim(),
        selfCare: $('careSelfCare').value.trim(),
        gratitude: $('careGratitude').value.trim(),
        support: $('careSupport').value.trim(),
        note: $('careNote').value.trim(),
        updatedAt: nowDateTime()
      });
      saveState();
      renderAll();
    }

    function deleteCareEntry(date = $('careDate').value || todayStr()) {
      delete state.care.entries[date];
      saveState();
      renderAll();
    }

    function renderCareThemeStats() {
      const baseDate = $('careDate').value || todayStr();
      const range = getStatsRange(baseDate);
      if ($('careStatsRangeLabel')) $('careStatsRangeLabel').textContent = range.label;
      const entries = range.dates.map(date => ({ date, entry: careEntryOn(date) })).filter(item => careCountOn(item.date));
      const count = entries.length;
      const avgStress = count ? (entries.reduce((sum, item) => sum + item.entry.stress, 0) / count).toFixed(1) : '0.0';
      const avgEnergy = count ? (entries.reduce((sum, item) => sum + item.entry.energy, 0) / count).toFixed(1) : '0.0';
      const gratitudeDays = entries.filter(item => item.entry.gratitude.trim()).length;
      const supportDays = entries.filter(item => item.entry.support.trim() || item.entry.stress >= 4).length;
      const cards = [
        { label:`${statsModeText(baseDate)}有记录天数`, value: `${count}/${Math.max(1, range.dates.length)}`, color:'text-dopamine-mint' },
        { label:`${statsModeText(baseDate)}平均压力`, value: `${avgStress}/5`, color:'text-dopamine-pink' },
        { label:`${statsModeText(baseDate)}平均能量`, value: `${avgEnergy}/5`, color:'text-dopamine-sky' },
        { label:`${statsModeText(baseDate)}写下感谢`, value: gratitudeDays, color:'text-dopamine-yellow' },
        { label:`${statsModeText(baseDate)}需要支持`, value: supportDays, color:'text-dopamine-purple' }
      ];
      $('careThemeStats').innerHTML = cards.map(item => `
        <div class="small-stat p-4">
          <div class="text-sm text-calm-mute">${item.label}</div>
          <div class="text-2xl font-black mt-1 ${item.color}">${escapeHtml(String(item.value))}</div>
        </div>
      `).join('');
    }

    function renderCare() {
      const date = $('careDate').value || todayStr();
      const entry = careEntryOn(date);
      selectedCareMood = entry.mood || 'steady';
      document.querySelectorAll('[data-care-mood]').forEach(btn => btn.classList.toggle('active', btn.dataset.careMood === selectedCareMood));
      setInputIfIdle('careStress', String(entry.stress || 3));
      setInputIfIdle('careEnergy', String(entry.energy || 3));
      setInputIfIdle('careChallenge', entry.challenge || '');
      setInputIfIdle('careSelfCare', entry.selfCare || '');
      setInputIfIdle('careGratitude', entry.gratitude || '');
      setInputIfIdle('careSupport', entry.support || '');
      setInputIfIdle('careNote', entry.note || '');

      const mood = careMoodMeta(entry.mood);
      const careHint = entry.stress >= 4
        ? '今天更适合先减压，再谈效率。'
        : entry.energy >= 4
          ? '你今天有一点回升，可以把能量留给最重要的一件事。'
          : '先把自己放回可持续状态，比硬撑更重要。';
      $('careSummary').innerHTML = careCountOn(date) ? `
        <div class="rounded-2xl bg-white border border-calm-line px-4 py-4">
          <div class="font-black">${iconLabel(mood.icon, mood.label)}</div>
          <div class="text-sm text-calm-mute mt-1">压力 ${entry.stress}/5 · 能量 ${entry.energy}/5</div>
        </div>
        <div class="rounded-2xl bg-white border border-calm-line px-4 py-4">
          <div class="font-black mb-1">给今天的提醒</div>
          <div class="text-sm leading-6">${escapeHtml(careHint)}</div>
        </div>
        <div class="rounded-2xl bg-white border border-calm-line px-4 py-4">
          <div class="text-sm text-calm-mute">自我关怀</div>
          <div class="font-bold mt-1">${escapeHtml(entry.selfCare || '今天还没有写下恢复动作。')}</div>
        </div>
        <div class="rounded-2xl bg-white border border-calm-line px-4 py-4">
          <div class="text-sm text-calm-mute">支持 / 边界</div>
          <div class="font-bold mt-1">${escapeHtml(entry.support || '今天还没有写下支持需求。')}</div>
        </div>
      ` : '<div class="text-sm text-calm-mute">今天还没有记录心灵关怀。先写下压力、能量和一个最小的恢复动作吧。</div>';

      $('careHistoryList').innerHTML = recentDates(7).map(d => {
        const item = careEntryOn(d);
        const hasRecord = careCountOn(d);
        const itemMood = careMoodMeta(item.mood);
        return `
          <div class="rounded-2xl border border-calm-line bg-white px-3 py-3 flex items-center justify-between gap-3">
            <div class="min-w-0">
              <div class="font-bold">${dayLabel(d)}</div>
              <div class="text-xs text-calm-mute mt-1">${hasRecord ? `${iconLabel(itemMood.icon, itemMood.label)} · 压力 ${item.stress}/5 · 能量 ${item.energy}/5` : '未记录'}</div>
            </div>
            <div class="flex gap-2 shrink-0">
              <button class="text-sm font-bold text-dopamine-orange" data-care-jump="${d}">查看</button>
              ${hasRecord ? `<button class="text-sm font-bold text-rose-600" data-care-delete="${d}">删除</button>` : ''}
            </div>
          </div>`;
      }).join('');
      $('careHistoryList').querySelectorAll('[data-care-jump]').forEach(btn => btn.onclick = () => { $('careDate').value = btn.dataset.careJump; navTo('care-section'); renderAll(); });
      $('careHistoryList').querySelectorAll('[data-care-delete]').forEach(btn => btn.onclick = () => { if (confirm('确定删除这天的心灵关怀记录吗？')) deleteCareEntry(btn.dataset.careDelete); });
    }

    function ensureMentorEntryTask(date, entry, kind='nextAction') {
      const text = kind === 'promise' ? entry.commitment : entry.nextAction;
      if (!String(text || '').trim()) return null;
      const project = ensureWorkflowModuleProject('mentor', false);
      const taskKey = kind === 'promise' ? 'promiseTaskId' : 'nextActionTaskId';
      const dueDate = entry.followupDate || shiftDate(date, 1);
      let task = state.tasks.find(item => item.id === entry[taskKey]);
      if (task?.status === 'done') return task;
      const titlePrefix = kind === 'promise' ? '跟进导师承诺' : '导师跟进';
      const title = `${titlePrefix}：${String(text).slice(0, 48)}`;
      const patch = {
        title,
        projectId: project.id,
        gtdBucket: 'next',
        quadrant: dueDate && dueDate <= todayStr() ? 'q1' : 'q2',
        todayBucket: dueDate === todayStr() ? 'should' : '',
        dueDate,
        estimate: 25,
        context: '沟通',
        note: `mentor:${date}:${kind}`,
        origin: { type: 'mentor', refId: `${date}:${kind}` }
      };
      if (task) {
        Object.assign(task, patch);
      } else {
        task = createTask({ ...patch, status:'planned' });
        entry[taskKey] = task?.id || '';
      }
      return task;
    }

    function ensureMentorPromiseTaskForDate(date) {
      const entry = mentorEntryOn(date);
      const task = ensureMentorEntryTask(date, entry, 'promise');
      state.mentor.entries[date] = normalizeMentorEntry(entry);
      saveState();
      renderAll();
      return task;
    }

    function updateMentorPromiseStatus(date, status) {
      const entry = mentorEntryOn(date);
      entry.promiseStatus = mentorPromiseStatusMeta(status).value;
      entry.updatedAt = nowDateTime();
      if (entry.promiseStatus === 'resolved' && entry.promiseTaskId) {
        const task = state.tasks.find(item => item.id === entry.promiseTaskId);
        if (task && task.status !== 'done') finishTask(task.id);
      }
      state.mentor.entries[date] = normalizeMentorEntry(entry);
      saveState();
      renderAll();
    }

    function saveMentorEntry() {
      const date = $('mentorDate').value || todayStr();
      const existing = mentorEntryOn(date);
      const nextEntry = normalizeMentorEntry({
        status: $('mentorStatus').value,
        channel: $('mentorChannel').value,
        pressure: Number($('mentorPressure').value || 3),
        clarity: Number($('mentorClarity').value || 3),
        topic: $('mentorTopic').value.trim(),
        evidence: $('mentorEvidence').value.trim(),
        ask: $('mentorAsk').value.trim(),
        risk: $('mentorRisk').value.trim(),
        feedback: $('mentorFeedback').value.trim(),
        commitment: $('mentorCommitment').value.trim(),
        confirmation: $('mentorConfirmation').value.trim(),
        followupDate: $('mentorFollowupDate').value || '',
        promiseStatus: $('mentorPromiseStatus').value || 'open',
        promiseTaskId: existing.promiseTaskId || '',
        boundary: $('mentorBoundary').value.trim(),
        nextAction: $('mentorNextAction').value.trim(),
        nextActionTaskId: existing.nextActionTaskId || '',
        updatedAt: nowDateTime()
      });
      state.mentor.entries[date] = nextEntry;
      saveState();
      renderAll();
    }

    function ensureMentorNextActionTaskForDate(date) {
      const entry = mentorEntryOn(date);
      const task = ensureMentorEntryTask(date, entry, 'nextAction');
      state.mentor.entries[date] = normalizeMentorEntry(entry);
      saveState();
      renderAll();
      return task;
    }

    function deleteMentorEntry(date = $('mentorDate').value || todayStr()) {
      delete state.mentor.entries[date];
      saveState();
      renderAll();
    }

    function renderMentorThemeStats() {
      const baseDate = $('mentorDate').value || todayStr();
      const range = getStatsRange(baseDate);
      if ($('mentorStatsRangeLabel')) $('mentorStatsRangeLabel').textContent = range.label;
      const entries = range.dates.map(date => ({ date, entry: mentorEntryOn(date) })).filter(item => mentorCountOn(item.date));
      const count = entries.length;
      const avgPressure = count ? (entries.reduce((sum, item) => sum + item.entry.pressure, 0) / count).toFixed(1) : '0.0';
      const avgClarity = count ? (entries.reduce((sum, item) => sum + item.entry.clarity, 0) / count).toFixed(1) : '0.0';
      const waitingCount = entries.filter(item => item.entry.status === 'waiting').length;
      const clearAskCount = entries.filter(item => item.entry.ask.trim()).length;
      const blockedCount = entries.filter(item => item.entry.status === 'blocked' || item.entry.pressure >= 4).length;
      const promiseCount = entries.filter(item => item.entry.commitment.trim()).length;
      const remindCount = entries.filter(item => item.entry.promiseStatus === 'remind').length;
      const overdueCount = entries.filter(item => item.entry.commitment.trim() && item.entry.promiseStatus !== 'resolved' && item.entry.followupDate && item.entry.followupDate < baseDate).length;
      const cards = [
        { label:`${statsModeText(baseDate)}有记录天数`, value: `${count}/${Math.max(1, range.dates.length)}`, color:'text-dopamine-purple' },
        { label:`${statsModeText(baseDate)}平均压力`, value: `${avgPressure}/5`, color:'text-dopamine-pink' },
        { label:`${statsModeText(baseDate)}预期清晰度`, value: `${avgClarity}/5`, color:'text-dopamine-sky' },
        { label:`${statsModeText(baseDate)}等待反馈`, value: waitingCount, color:'text-dopamine-yellow' },
        { label:`${statsModeText(baseDate)}明确请求`, value: clearAskCount, color:'text-dopamine-mint' },
        { label:`${statsModeText(baseDate)}高压 / 需推进`, value: blockedCount, color:'text-dopamine-orange' },
        { label:`${statsModeText(baseDate)}承诺留痕`, value: promiseCount, color:'text-dopamine-purple' },
        { label:`${statsModeText(baseDate)}待提醒 / 已超期`, value: `${remindCount} / ${overdueCount}`, color:'text-rose-600' }
      ];
      $('mentorThemeStats').innerHTML = cards.map(item => `
        <div class="small-stat p-4">
          <div class="text-sm text-calm-mute">${item.label}</div>
          <div class="text-2xl font-black mt-1 ${item.color}">${escapeHtml(String(item.value))}</div>
        </div>
      `).join('');
    }

    function renderMentor() {
      const date = $('mentorDate').value || todayStr();
      const entry = mentorEntryOn(date);
      setInputIfIdle('mentorStatus', entry.status || 'drafting');
      setInputIfIdle('mentorChannel', entry.channel || '');
      setInputIfIdle('mentorPressure', String(entry.pressure || 3));
      setInputIfIdle('mentorClarity', String(entry.clarity || 3));
      setInputIfIdle('mentorTopic', entry.topic || '');
      setInputIfIdle('mentorEvidence', entry.evidence || '');
      setInputIfIdle('mentorAsk', entry.ask || '');
      setInputIfIdle('mentorRisk', entry.risk || '');
      setInputIfIdle('mentorFeedback', entry.feedback || '');
      setInputIfIdle('mentorCommitment', entry.commitment || '');
      setInputIfIdle('mentorConfirmation', entry.confirmation || '');
      setInputIfIdle('mentorFollowupDate', entry.followupDate || '');
      setInputIfIdle('mentorPromiseStatus', entry.promiseStatus || 'open');
      setInputIfIdle('mentorBoundary', entry.boundary || '');
      setInputIfIdle('mentorNextAction', entry.nextAction || '');

      const status = mentorStatusMeta(entry.status);
      const promiseStatus = mentorPromiseStatusMeta(entry.promiseStatus);
      const pendingPromises = mentorPendingItems(date);
      const pressureHint = entry.pressure >= 4
        ? '先把问题收束成 1-2 个明确请求，再决定要不要立刻沟通。'
        : entry.clarity >= 4
          ? '今天适合把准备好的材料和问题一起发出去，减少来回试探。'
          : '先整理你的证据和问题，比反复猜导师在想什么更有帮助。';
      $('mentorSummary').innerHTML = mentorCountOn(date) ? `
        <div class="rounded-2xl bg-white border border-calm-line px-4 py-4">
          <div class="font-black">${iconLabel(status.icon, status.label)}</div>
          <div class="text-sm text-calm-mute mt-1">压力 ${entry.pressure}/5 · 清晰度 ${entry.clarity}/5${entry.channel ? ` · ${escapeHtml(entry.channel)}` : ''}</div>
        </div>
        <div class="rounded-2xl bg-white border border-calm-line px-4 py-4">
          <div class="font-black mb-1">今天最值得守住的一点</div>
          <div class="text-sm leading-6">${escapeHtml(pressureHint)}</div>
        </div>
        <div class="rounded-2xl bg-white border border-calm-line px-4 py-4">
          <div class="text-sm text-calm-mute">我要问导师什么</div>
          <div class="font-bold mt-1">${escapeHtml(entry.ask || '还没有写下明确请求。')}</div>
        </div>
        <div class="rounded-2xl bg-white border border-calm-line px-4 py-4">
          <div class="text-sm text-calm-mute">导师反馈 / 决策</div>
          <div class="font-bold mt-1">${escapeHtml(entry.feedback || '还没有记录导师这次的反馈。')}</div>
        </div>
        <div class="rounded-2xl bg-white border border-calm-line px-4 py-4">
          <div class="text-sm text-calm-mute">导师承诺 / 计划追踪</div>
          <div class="font-bold mt-1">${escapeHtml(entry.commitment || '今天还没有记录导师说过的话。')}</div>
          <div class="text-xs text-calm-mute mt-2">${escapeHtml(promiseStatus.label)}${entry.followupDate ? ` · 下次核对 ${entry.followupDate}` : ''}</div>
        </div>
        <div class="rounded-2xl bg-white border border-calm-line px-4 py-4">
          <div class="text-sm text-calm-mute">下一步动作</div>
          <div class="font-bold mt-1">${escapeHtml(entry.nextAction || '还没有写下下一步。')}</div>
          <div class="text-xs text-calm-mute mt-2">${entry.nextActionTaskId ? '已加入任务总表' : '仅保存记录，需手动加入任务'}</div>
        </div>
      ` : '<div class="text-sm text-calm-mute">今天还没有记录导师沟通。先写下你准备了什么、想问什么，以及下一步跟进动作吧。</div>';

      $('mentorPromiseList').innerHTML = pendingPromises.slice(0, 8).map(item => {
        const meta = mentorPromiseStatusMeta(item.entry.promiseStatus);
        const overdue = item.entry.followupDate && item.entry.followupDate < date;
        return `
          <div class="rounded-2xl border border-calm-line bg-white px-3 py-3 flex items-start justify-between gap-3">
            <div class="min-w-0">
              <div class="font-bold">${dayLabel(item.date)}</div>
              <div class="text-sm mt-1 leading-6">${escapeHtml(item.entry.commitment)}</div>
              <div class="text-xs text-calm-mute mt-2">${escapeHtml(meta.label)}${item.entry.followupDate ? ` · 核对 ${item.entry.followupDate}` : ''}${overdue ? ' · 已超期' : ''}${item.entry.promiseTaskId ? ' · 已加入任务' : ' · 可手动加入任务'}</div>
              <div class="flex flex-wrap gap-2 mt-3">
                <button class="px-2 py-1 rounded-xl bg-sky-50 text-dopamine-sky text-xs font-bold" data-mentor-promise-task="${item.date}">${item.entry.promiseTaskId ? '更新任务' : '加入任务'}</button>
                <button class="px-2 py-1 rounded-xl bg-rose-50 text-rose-600 text-xs font-bold" data-mentor-promise-status="${item.date}" data-status="remind">需提醒</button>
                <button class="px-2 py-1 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold" data-mentor-promise-status="${item.date}" data-status="resolved">已落实</button>
              </div>
            </div>
            <button class="text-sm font-bold text-dopamine-orange shrink-0" data-mentor-promise-jump="${item.date}">查看</button>
          </div>`;
      }).join('') || '<div class="text-sm text-calm-mute">目前没有待追踪承诺。把导师的口头计划和你的复述确认记下来，会轻松很多。</div>';

      $('mentorHistoryList').innerHTML = recentDates(7).map(d => {
        const item = mentorEntryOn(d);
        const hasRecord = mentorCountOn(d);
        const itemStatus = mentorStatusMeta(item.status);
        return `
          <div class="rounded-2xl border border-calm-line bg-white px-3 py-3 flex items-center justify-between gap-3">
            <div class="min-w-0">
              <div class="font-bold">${dayLabel(d)}</div>
              <div class="text-xs text-calm-mute mt-1">${hasRecord ? `${iconLabel(itemStatus.icon, itemStatus.label)} · 压力 ${item.pressure}/5 · 清晰度 ${item.clarity}/5${item.commitment ? ' · 有承诺留痕' : ''}` : '未记录'}</div>
            </div>
            <div class="flex gap-2 shrink-0">
              <button class="text-sm font-bold text-dopamine-orange" data-mentor-jump="${d}">查看</button>
              ${hasRecord ? `<button class="text-sm font-bold text-rose-600" data-mentor-delete="${d}">删除</button>` : ''}
            </div>
          </div>`;
      }).join('');
      $('mentorPromiseList').querySelectorAll('[data-mentor-promise-jump]').forEach(btn => btn.onclick = () => { $('mentorDate').value = btn.dataset.mentorPromiseJump; navTo('mentor-section'); renderAll(); });
      $('mentorPromiseList').querySelectorAll('[data-mentor-promise-task]').forEach(btn => btn.onclick = () => ensureMentorPromiseTaskForDate(btn.dataset.mentorPromiseTask));
      $('mentorPromiseList').querySelectorAll('[data-mentor-promise-status]').forEach(btn => btn.onclick = () => updateMentorPromiseStatus(btn.dataset.mentorPromiseStatus, btn.dataset.status));
      $('mentorHistoryList').querySelectorAll('[data-mentor-jump]').forEach(btn => btn.onclick = () => { $('mentorDate').value = btn.dataset.mentorJump; navTo('mentor-section'); renderAll(); });
      $('mentorHistoryList').querySelectorAll('[data-mentor-delete]').forEach(btn => btn.onclick = () => { if (confirm('确定删除这天的导师沟通记录吗？')) deleteMentorEntry(btn.dataset.mentorDelete); });
    }

    function syncReviewTomorrowTasks(date, entry) {
      const targetDate = shiftDate(date, 1);
      const joinToday = date === todayStr();
      entry.tomorrowTaskIds = Array.isArray(entry.tomorrowTaskIds) ? entry.tomorrowTaskIds.slice(0, 3) : ['', '', ''];
      while (entry.tomorrowTaskIds.length < 3) entry.tomorrowTaskIds.push('');
      entry.tomorrow.forEach((rawTitle, index) => {
        const title = String(rawTitle || '').trim();
        if (!title) return;
        let task = state.tasks.find(item => item.id === entry.tomorrowTaskIds[index]);
        const todayBucket = joinToday ? (index === 0 ? 'must' : 'should') : '';
      const patch = {
        title: `明日优先 ${index + 1}：${title}`,
        projectId: '',
        gtdBucket: 'next',
        quadrant: index === 0 ? 'q1' : 'q2',
        todayBucket,
        dueDate: targetDate,
        estimate: index === 0 ? 45 : 30,
        context: '复盘',
        note: `review:${date}:tomorrow:${index + 1}`,
        origin: { type: 'review', refId: `${date}:${index + 1}` }
      };
        if (task && task.status !== 'done') {
          Object.assign(task, patch);
        } else if (!task) {
          task = createTask({ ...patch, status:'planned' });
          entry.tomorrowTaskIds[index] = task?.id || '';
        }
      });
    }

    function buildDailyReviewEntryFromForm(date = $('reviewDate').value || todayStr(), { keepTaskIds=true } = {}) {
      const existing = dailyReviewEntryOn(date);
      return normalizeDailyReviewEntry({
        energy: $('reviewEnergy').value,
        energyNote: $('reviewEnergyNote').value.trim(),
        accomplishments: $('reviewAccomplishments').value.trim(),
        unfinished: $('reviewUnfinished').value.trim(),
        insights: $('reviewInsights').value.trim(),
        obstacles: $('reviewObstacles').value.trim(),
        tomorrow: [
          $('reviewTomorrow1').value.trim(),
          $('reviewTomorrow2').value.trim(),
          $('reviewTomorrow3').value.trim()
        ],
        tomorrowTaskIds: keepTaskIds ? (existing.tomorrowTaskIds || ['', '', '']) : ['', '', ''],
        updatedAt: nowDateTime()
      });
    }

    function createTomorrowTasksFromReview(date = $('reviewDate').value || todayStr()) {
      const entry = buildDailyReviewEntryFromForm(date, { keepTaskIds:true });
      if (!reviewPriorityCount(entry)) {
        alert('请先填写至少一条明日优先任务。');
        return;
      }
      state.reviewDaily.entries[date] = normalizeDailyReviewEntry(entry);
      syncReviewTomorrowTasks(date, state.reviewDaily.entries[date]);
      state.reviewDaily.entries[date] = normalizeDailyReviewEntry(state.reviewDaily.entries[date]);
      saveState();
      renderAll();
    }

    function saveDailyReview() {
      const date = $('reviewDate').value || todayStr();
      const nextEntry = buildDailyReviewEntryFromForm(date, { keepTaskIds:true });
      if (!reviewContentCount(nextEntry)) {
        alert('至少写下一条核心成果、未竟分析、学术洞见、障碍对策或明日优先任务，再保存复盘。');
        return;
      }
      state.reviewDaily.entries[date] = nextEntry;
      saveState();
      renderAll();
    }

    function deleteDailyReview(date = $('reviewDate').value || todayStr()) {
      delete state.reviewDaily.entries[date];
      saveState();
      renderAll();
    }

    function buildDailyDigest(date=todayStr()) {
      const copy = workspaceCopy();
      const workLogs = state.attendance?.[date]?.logs || [];
      const workMinutes = totalAttendanceMinutes(date);
      const leaveCount = (state.attendance?.[date]?.leaves || []).length;
      const focusSessions = state.focus.sessions.filter(item => item.date === date);
      const focusMinutes = focusMinutesOn(date);
      const taskCreated = state.tasks.filter(item => dateFromDateTime(item.createdAt) === date).length;
      const taskStarted = state.tasks.filter(item => dateFromDateTime(item.startedAt) === date).length;
      const taskDone = state.tasks.filter(item => dateFromDateTime(item.doneAt) === date).length;
      const scheduleBlocks = state.timeBlocks?.[date] || [];
      const scheduleCount = scheduleBlocks.length;
      const scheduleMinutes = scheduleBlocks.reduce((sum, item) => sum + minutesBetween(item.start, item.end), 0);

      const thesisLogs = (state.thesis?.logs || []).filter(item => item.date === date);
      const thesisMinutes = thesisLogs.reduce((sum, item) => sum + (Number(item.minutes) || 0), 0);
      const thesisWords = thesisLogs.reduce((sum, item) => sum + (Number(item.words) || 0), 0);
      const milestoneDone = (state.thesis?.milestones || []).filter(item => dateFromDateTime(item.doneAt) === date).length;
      const chapterUpdated = (state.thesis?.chapters || []).filter(item => dateFromDateTime(item.updatedAt) === date).length;

      const submissionCreated = state.submissions.filter(item => dateFromDateTime(item.createdAt) === date).length;
      const submissionUpdated = state.submissions.filter(item => dateFromDateTime(item.updatedAt) === date && dateFromDateTime(item.createdAt) !== date).length;
      const submissionDue = state.submissions.filter(item => item.deadline === date).length;
      const submissionMoves = submissionCreated + submissionUpdated;
      const submissionLogsToday = state.submissions.flatMap(item => (item.logs || []).filter(log => log.date === date).map(log => ({ item, log })));

      const enabledHabits = (state.habits?.list || []).filter(item => item && item.enabled !== false && !LEGACY_REMOVED_HABITS.has(item.id));
      const doneHabits = enabledHabits.filter(item => habitDoneOnDate(item, date)).length;
      const exercise = getDurationEntry(date, 'habit_exercise');
      const foods = state.foods.filter(item => item.date === date);
      const weights = (state.weights || []).filter(item => item.date === date);
      const care = careEntryOn(date);
      const mentor = mentorEntryOn(date);
      const review = dailyReviewEntryOn(date);
      const careMood = careMoodMeta(care.mood);
      const mentorStatus = mentorStatusMeta(mentor.status);
      const reviewEnergy = reviewEnergyMeta(review.energy);
      const exMinutes = Math.round(exercise.minutes) || 0;
      const exInfo = exercise.done ? `${exMinutes ? `${exMinutes} 分钟` : '已记录'}${exercise.type ? ` · ${exercise.type}` : ''}${exercise.intensity ? ` · ${exercise.intensity}` : ''}` : '未记录';

      const cards = [
        { label:'今日总览', value:`${workLogs.length} 段 / ${focusSessions.length} 次`, color:'text-dopamine-orange' },
        { label:'时间块', value:`${scheduleCount} 个 / ${formatMinutes(scheduleMinutes)}`, color:'text-dopamine-sky' },
        { label:'研究推进', value:`${thesisLogs.length} 条`, color:'text-dopamine-purple' },
        { label:'投稿管线', value:`${submissionMoves} 动`, color:'text-dopamine-sky' },
        { label:'健康管理', value:`${todayHabitCompletion(date)}%`, color:'text-dopamine-mint' },
        { label:'心灵关怀', value: careCountOn(date) ? `${careMood.label} · 压力${care.stress}` : '未记录', color:'text-dopamine-pink' },
        { label:copy.guidanceLabel, value: mentorCountOn(date) ? mentorStatus.label : '未记录', color:'text-dopamine-purple' },
        { label:'结构化复盘', value: reviewCountOn(date) ? `${reviewEnergy.short} · ${reviewTemplateCount(review)}/5` : '未写', color:'text-dopamine-yellow' }
      ];

      const sections = [
        {
          title: '今日总览',
          lines: [
            `工作打卡：${workLogs.length} 段，共 ${formatMinutes(workMinutes)}`,
            `请假记录：${leaveCount} 条`,
            `专注记录：${focusSessions.length} 次，共 ${formatMinutes(focusMinutes)}`,
            `任务推进：新增 ${taskCreated}，启动 ${taskStarted}，完成 ${taskDone}`,
            `日程时间块：${scheduleCount} 个，共 ${formatMinutes(scheduleMinutes)}`
          ]
        },
        {
          title: copy.thesisLabel,
          lines: [
            `推进日志：${thesisLogs.length} 条，共 ${formatMinutes(thesisMinutes)}${thesisWords ? `，${thesisWords} 字` : ''}`,
            `完成里程碑：${milestoneDone} 个`,
            `更新章节：${chapterUpdated} 个`
          ]
        },
        {
          title: '投稿管理',
          lines: [
            `新增项目：${submissionCreated} 个`,
            `今日更新：${submissionUpdated} 个`,
            `推进日志：${submissionLogsToday.length} 条`,
            `今日截止：${submissionDue} 个`,
            `进行中项目：${runningSubmissionCount()} 个`
          ]
        },
        {
          title: '健康管理',
          lines: [
            `习惯完成度：${todayHabitCompletion(date)}%（${doneHabits}/${enabledHabits.length || 0}）`,
            `早起：${state.attendance?.[date]?.wake ? `${state.attendance[date].wake}${qualifiesWake(state.attendance[date].wake) ? ' · 达标' : ''}` : '未记录'}`,
            `早睡：${state.attendance?.[date]?.sleep ? `${state.attendance[date].sleep}${qualifiesSleep(state.attendance[date].sleep) ? ' · 达标' : ''}` : '未记录'}`,
            `运动：${exInfo}`,
            `饮食记录：${foods.length} 条`,
            `体重记录：${weights.length ? weights.map(item => `${item.value} ${item.unit}`).join('；') : '未记录'}`
          ]
        },
        {
          title: '心灵关怀',
          lines: careCountOn(date)
            ? [
                `情绪状态：${careMood.label}`,
                `压力 / 能量：${care.stress}/5 · ${care.energy}/5`,
                `自我关怀：${care.selfCare ? '已记录' : '未记录'}`,
                `支持 / 边界：${care.support ? '已记录' : '未记录'}`
              ]
            : ['今天还没有心灵关怀记录。']
        },
        {
          title: copy.guidanceLabel,
          lines: mentorCountOn(date)
            ? [
                `沟通状态：${mentorStatus.label}`,
                `压力 / 清晰度：${mentor.pressure}/5 · ${mentor.clarity}/5`,
                `明确请求：${mentor.ask ? '已写' : '未写'}`,
                `${copy.guidanceLabel}反馈 / 决策：${mentor.feedback ? '已写' : '未写'}`,
                `${copy.guidanceLabel}承诺留痕：${mentor.commitment ? '已写' : '未写'}`,
                `下一步动作：${mentor.nextAction ? '已写' : '未写'}${mentor.nextActionTaskId ? ' · 已加入任务总表' : ' · 未自动派生任务'}`
              ]
            : [`今天还没有整理${copy.guidanceLabel}。`]
        },
        {
          title: '学术复盘',
          lines: reviewCountOn(date)
            ? [
                `状态 / 能量：${reviewEnergy.label}${review.energyNote ? `｜${review.energyNote}` : ''}`,
                `今日核心成果：${review.accomplishments || '未写'}`,
                `未完成与拖延分析：${review.unfinished || '未写'}`,
                `学术洞见与新发现：${review.insights || '未写'}`,
                `障碍与对策：${review.obstacles || '未写'}`,
                `明日优先任务：${review.tomorrow.filter(item => item.trim()).join('；') || '未写'}`,
                `任务联动：${(review.tomorrowTaskIds || []).filter(Boolean).length} 条已加入任务总表`
              ]
            : ['今天还没有保存结构化复盘。']
        }
      ];

      const markdown = [
        `# ${date} 学术工作台日报`,
        '',
        ...sections.flatMap(section => [`## ${section.title}`, ...section.lines.map(line => `- ${line}`), ''])
      ].join('\n').trim();

      return { cards, sections, markdown };
    }

    function downloadReviewMarkdown() {
      const date = $('reviewDate').value || todayStr();
      const digest = buildDailyDigest(date);
      const blob = new Blob([digest.markdown], { type:'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `academic_daily_review_${date}.md`;
      a.click();
      URL.revokeObjectURL(url);
    }

    function renderReview() {
      const date = $('reviewDate').value || todayStr();
      const review = dailyReviewEntryOn(date);
      setInputIfIdle('reviewEnergy', review.energy || 'medium');
      setInputIfIdle('reviewEnergyNote', review.energyNote || '');
      setInputIfIdle('reviewAccomplishments', review.accomplishments || '');
      setInputIfIdle('reviewUnfinished', review.unfinished || '');
      setInputIfIdle('reviewInsights', review.insights || '');
      setInputIfIdle('reviewObstacles', review.obstacles || '');
      setInputIfIdle('reviewTomorrow1', review.tomorrow[0] || '');
      setInputIfIdle('reviewTomorrow2', review.tomorrow[1] || '');
      setInputIfIdle('reviewTomorrow3', review.tomorrow[2] || '');

      const digest = buildDailyDigest(date);
      $('reviewGeneratedStats').innerHTML = digest.cards.map(item => `
        <div class="small-stat p-4">
          <div class="text-sm text-calm-mute">${item.label}</div>
          <div class="text-xl font-black mt-1 ${item.color}">${escapeHtml(String(item.value))}</div>
        </div>
      `).join('');
      $('reviewGeneratedSections').innerHTML = digest.sections.map(section => `
        <div class="small-stat p-4">
          <div class="font-black mb-2">${escapeHtml(section.title)}</div>
          <div class="space-y-1 text-sm">
            ${section.lines.map(line => `<div>${escapeHtml(line)}</div>`).join('')}
          </div>
        </div>
      `).join('');
      $('reviewGeneratedMd').textContent = digest.markdown;

      $('reviewHistory').innerHTML = recentDates(7).map(d => {
        const item = dailyReviewEntryOn(d);
        const energy = reviewEnergyMeta(item.energy);
        return `
          <div class="rounded-2xl border border-calm-line bg-white px-3 py-3 flex items-center justify-between gap-3">
            <div class="min-w-0">
              <div class="font-bold">${dayLabel(d)}</div>
              <div class="text-xs text-calm-mute mt-1">${reviewCountOn(d) ? `${iconLabel(energy.icon, `能量${energy.short}`)} · 学术项 ${reviewTemplateCount(item)}/5 · 明日 ${reviewPriorityCount(item)}/3` : '未写复盘'}</div>
            </div>
            <div class="flex gap-2 shrink-0">
              <button class="text-sm font-bold text-dopamine-orange" data-jump-review="${d}">查看</button>
              ${reviewCountOn(d) ? `<button class="text-sm font-bold text-rose-600" data-delete-review="${d}">删除</button>` : ''}
            </div>
          </div>`;
      }).join('');
      $('reviewHistory').querySelectorAll('[data-jump-review]').forEach(btn => btn.onclick = () => { $('reviewDate').value = btn.dataset.jumpReview; navTo('review-section'); renderAll(); });
      $('reviewHistory').querySelectorAll('[data-delete-review]').forEach(btn => btn.onclick = () => { if (confirm('确定删除这天的复盘吗？')) deleteDailyReview(btn.dataset.deleteReview); });
    }

    function renderReviewThemeStats() {
      const baseDate = $('reviewDate').value || todayStr();
      const range = getStatsRange(baseDate);
      if ($('reviewStatsRangeLabel')) $('reviewStatsRangeLabel').textContent = range.label;
      const entries = range.dates.map(date => ({ date, entry: dailyReviewEntryOn(date) })).filter(item => reviewCountOn(item.date));
      const count = entries.length;
      const accomplishmentDays = entries.filter(item => item.entry.accomplishments.trim()).length;
      const insightDays = entries.filter(item => item.entry.insights.trim()).length;
      const obstacleDays = entries.filter(item => item.entry.obstacles.trim()).length;
      const priorityTotal = entries.reduce((sum, item) => sum + reviewPriorityCount(item.entry), 0);
      const syncDays = entries.filter(item => careCountOn(item.date)).length;
      const cards = [
        { label:`${statsModeText(baseDate)}复盘完成`, value: `${count}/${Math.max(1, range.dates.length)}`, color:'text-dopamine-pink' },
        { label:`${statsModeText(baseDate)}记录成果`, value: accomplishmentDays, color:'text-dopamine-yellow' },
        { label:`${statsModeText(baseDate)}学术洞见`, value: insightDays, color:'text-dopamine-sky' },
        { label:`${statsModeText(baseDate)}障碍对策`, value: obstacleDays, color:'text-dopamine-mint' },
        { label:`${statsModeText(baseDate)}明日优先`, value: priorityTotal, color:'text-dopamine-orange' },
        { label:`${statsModeText(baseDate)}同步心灵关怀`, value: syncDays, color:'text-dopamine-purple' }
      ];
      $('reviewThemeStats').innerHTML = cards.map(item => `
        <div class="small-stat p-4">
          <div class="text-sm text-calm-mute">${item.label}</div>
          <div class="text-2xl font-black mt-1 ${item.color}">${escapeHtml(String(item.value))}</div>
        </div>
      `).join('');
    }

    function submissionProjectNote(id) { return `submission:${id}`; }
    function submissionProjectStatus(item) {
      if (['已接收','已见刊/已收录'].includes(item.stage)) return 'done';
      if (['搁置/拒稿'].includes(item.stage)) return 'paused';
      return 'active';
    }
    function syncSubmissionProject(item) {
      if (!item) return null;
      const note = submissionProjectNote(item.id);
      let project = state.projects.find(project => {
        const origin = normalizeProjectOrigin(project.origin, project);
        return (origin.type === 'submission' && origin.refId === item.id) || project.note === note;
      });
      const patch = {
        title: item.title,
        outcome: `${item.stage}${item.venue ? ` · ${item.venue}` : ''}${item.notes ? ` · ${item.notes}` : ''}`,
        area: 'submission',
        status: submissionProjectStatus(item),
        startDate: item.startDate || dateFromDateTime(item.createdAt) || todayStr(),
        deadline: item.deadline || '',
        note,
        origin: { type: 'submission', refId: item.id },
        updatedAt: item.updatedAt || nowDateTime()
      };
      if (project) {
        Object.assign(project, patch);
      } else {
        project = normalizeProjectItem({
          id: uid('proj'),
          ...patch,
          createdAt: item.createdAt || nowDateTime()
        });
        state.projects.unshift(project);
      }
      return project;
    }
    function syncAllSubmissionProjects() {
      state.submissions.forEach(item => syncSubmissionProject(item));
    }

    function recentDates(days=7) {
      const dates = [];
      for (let i = days - 1; i >= 0; i--) dates.push(todayStr(-i));
      return dates;
    }

    function achievementCategoryMeta(category) {
      return ({
        system: { label:'执行系统', icon:'fa-folder-tree', desc:'项目、任务和时间安排让执行变得更稳。' },
        research: { label:'科研推进', icon:'fa-microscope', desc:'论文、投稿和专注记录共同构成你的研究推进曲线。' },
        health: { label:'身心恢复', icon:'fa-seedling', desc:'早睡、早起、运动这些基础盘，直接决定能否长期稳定输出。' },
        support: { label:'支持体系', icon:'fa-hands-holding-heart', desc:'心灵关怀、导师沟通和复盘，帮助你不靠硬扛完成博士。' }
      })[category] || { label:category, icon:'fa-trophy', desc:'' };
    }

    function buildTierSeries({ category, seriesId, title, icon, color, value, goals, noun }) {
      const tierNames = ['初阶','进阶','高阶'];
      return goals.map((goal, index) => ({
        id:`${seriesId}_${index + 1}`,
        category,
        seriesId,
        title:`${title} · ${tierNames[index]}`,
        baseTitle:title,
        tier:index + 1,
        tierName:tierNames[index],
        desc:`累计 ${noun} ${goal}`,
        progress:Math.min(value, goal),
        rawValue:value,
        goal,
        unlocked:value >= goal,
        icon,
        color
      }));
    }

    function getAchievements() {
      const totalFocusSessions = state.focus.sessions.length;
      const totalFocusMinutes = state.focus.sessions.reduce((sum, s) => sum + (Number(s.minutes)||0), 0);
      const totalWorkLogs = Object.values(state.attendance).reduce((sum, day) => sum + (day.logs?.length||0), 0);
      const totalScheduleBlocks = Object.values(state.timeBlocks || {}).reduce((sum, blocks) => sum + (Array.isArray(blocks) ? blocks.length : 0), 0);
      const totalProjects = state.projects.length;
      const totalDoneTasks = state.tasks.filter(item => item.status === 'done').length;
      const earlyWakeCount = Object.values(state.attendance).filter(day => qualifiesWake(day.wake)).length;
      const earlySleepCount = Object.values(state.attendance).filter(day => qualifiesSleep(day.sleep)).length;
      const exerciseDays = Object.entries(state.habits.entries).filter(([_, map]) => normalizeDurationEntry(map?.['habit_exercise']).done).length;
      const habitStrongDays = Object.keys(state.habits.entries || {}).filter(date => todayHabitCompletion(date) >= 80).length;
      const careEntries = Object.keys(state.care?.entries || {}).filter(date => careCountOn(date)).length;
      const reviewEntries = Object.keys(state.reviewDaily?.entries || {}).filter(date => reviewCountOn(date)).length;
      const mentorEntries = Object.keys(state.mentor?.entries || {}).filter(date => mentorCountOn(date)).length;
      const supportEntries = careEntries + reviewEntries + mentorEntries;
      const thesisLogs = state.thesis?.logs?.length || 0;
      const submissionCount = state.submissions.length;
      const acceptedCount = state.submissions.filter(s => ['已接收','已见刊/已收录'].includes(s.stage)).length;

      return [
        ...buildTierSeries({ category:'system', seriesId:'projects', title:'项目系统搭建者', icon:'fa-folder-open', color:'from-purple-400 to-indigo-500', value:totalProjects, goals:[1, 3, 8], noun:'创建项目' }),
        ...buildTierSeries({ category:'system', seriesId:'tasks_done', title:'下一步执行者', icon:'fa-check', color:'from-pink-400 to-rose-500', value:totalDoneTasks, goals:[5, 25, 100], noun:'完成任务' }),
        ...buildTierSeries({ category:'system', seriesId:'schedule_blocks', title:'时间块设计师', icon:'fa-calendar-days', color:'from-sky-400 to-cyan-500', value:totalScheduleBlocks, goals:[10, 40, 120], noun:'安排时间块' }),

        ...buildTierSeries({ category:'research', seriesId:'focus_sessions', title:'深度专注者', icon:'fa-stopwatch', color:'from-orange-400 to-pink-400', value:totalFocusSessions, goals:[1, 10, 50], noun:'次专注记录' }),
        ...buildTierSeries({ category:'research', seriesId:'focus_minutes', title:'研究引擎点火', icon:'fa-fire', color:'from-yellow-400 to-orange-500', value:totalFocusMinutes, goals:[300, 1000, 3000], noun:'分钟专注' }),
        ...buildTierSeries({ category:'research', seriesId:'thesis_logs', title:'论文推进工匠', icon:'fa-pen-to-square', color:'from-violet-400 to-purple-600', value:thesisLogs, goals:[5, 20, 80], noun:'条论文日志' }),
        ...buildTierSeries({ category:'research', seriesId:'submission_created', title:'投稿管线启动者', icon:'fa-paper-plane', color:'from-sky-400 to-blue-500', value:submissionCount, goals:[1, 5, 12], noun:'个投稿项目' }),
        ...buildTierSeries({ category:'research', seriesId:'accepted', title:'成果归档者', icon:'fa-trophy', color:'from-emerald-400 to-green-500', value:acceptedCount, goals:[1, 3, 5], noun:'个已接收 / 见刊项目' }),

        ...buildTierSeries({ category:'health', seriesId:'wake', title:'清晨掌控者', icon:'fa-sun', color:'from-yellow-300 to-orange-400', value:earlyWakeCount, goals:[7, 21, 60], noun:'天达标早起' }),
        ...buildTierSeries({ category:'health', seriesId:'sleep', title:'作息守恒者', icon:'fa-moon', color:'from-indigo-400 to-purple-500', value:earlySleepCount, goals:[7, 21, 60], noun:'天达标早睡' }),
        ...buildTierSeries({ category:'health', seriesId:'exercise', title:'身体底盘建设者', icon:'fa-person-running', color:'from-green-400 to-emerald-500', value:exerciseDays, goals:[7, 21, 60], noun:'天运动记录' }),
        ...buildTierSeries({ category:'health', seriesId:'habit_strong', title:'可持续节奏维护者', icon:'fa-seedling', color:'from-lime-400 to-green-500', value:habitStrongDays, goals:[5, 20, 60], noun:'天习惯完成度达到 80%' }),

        ...buildTierSeries({ category:'support', seriesId:'care', title:'自我关怀练习者', icon:'fa-seedling', color:'from-teal-400 to-emerald-500', value:careEntries, goals:[5, 20, 60], noun:'天心灵关怀' }),
        ...buildTierSeries({ category:'support', seriesId:'review', title:'结构化复盘者', icon:'fa-heart', color:'from-pink-400 to-fuchsia-500', value:reviewEntries, goals:[5, 20, 60], noun:'天学术复盘' }),
        ...buildTierSeries({ category:'support', seriesId:'mentor', title:'导师沟通设计师', icon:'fa-handshake', color:'from-violet-400 to-fuchsia-500', value:mentorEntries, goals:[3, 15, 40], noun:'天导师沟通记录' }),
        ...buildTierSeries({ category:'support', seriesId:'support_all', title:'支持体系编织者', icon:'fa-hands-holding-heart', color:'from-rose-400 to-orange-500', value:supportEntries, goals:[10, 30, 90], noun:'条支持性记录' })
      ];
    }

    function renderAchievements() {
      const achievements = getAchievements();
      const unlocked = achievements.filter(a => a.unlocked).length;
      const total = achievements.length;
      const bySeries = {};
      achievements.forEach(item => {
        if (!bySeries[item.seriesId]) bySeries[item.seriesId] = [];
        bySeries[item.seriesId].push(item);
      });
      const completedSeries = Object.values(bySeries).filter(items => items.every(item => item.unlocked)).length;
      const highTierUnlocked = achievements.filter(item => item.tier === 3 && item.unlocked).length;
      $('achievementSummary').innerHTML = `
        <div class="small-stat p-3"><div class="text-xs text-calm-mute">已解锁徽章</div><div class="text-2xl font-black">${unlocked}</div></div>
        <div class="small-stat p-3"><div class="text-xs text-calm-mute">总徽章</div><div class="text-2xl font-black">${total}</div></div>
        <div class="small-stat p-3"><div class="text-xs text-calm-mute">完整系列</div><div class="text-2xl font-black text-dopamine-mint">${completedSeries}</div></div>
        <div class="small-stat p-3"><div class="text-xs text-calm-mute">高阶成就</div><div class="text-2xl font-black text-dopamine-orange">${highTierUnlocked}</div></div>`;

      const categoryEntries = Object.entries(achievements.reduce((acc, item) => {
        if (!acc[item.category]) acc[item.category] = [];
        acc[item.category].push(item);
        return acc;
      }, {}));
      $('achievementSeriesOverview').innerHTML = categoryEntries.map(([category, items]) => {
        const meta = achievementCategoryMeta(category);
        const unlockedCount = items.filter(item => item.unlocked).length;
        return `
          <div class="rounded-2xl bg-white border border-calm-line px-4 py-4">
            <div class="font-black">${iconLabel(meta.icon, meta.label)}</div>
            <div class="text-sm text-calm-mute mt-1">${escapeHtml(meta.desc)}</div>
            <div class="text-xl font-black mt-3">${unlockedCount} / ${items.length}</div>
          </div>`;
      }).join('');

      $('achievementGrid').innerHTML = categoryEntries.map(([category, items]) => {
        const meta = achievementCategoryMeta(category);
        const sectionItems = items.sort((a, b) => a.seriesId.localeCompare(b.seriesId) || a.tier - b.tier);
        return `
          <div class="space-y-4">
            <div class="flex items-start justify-between gap-3">
              <div>
                <div class="text-xl font-black">${iconLabel(meta.icon, meta.label)}</div>
                <div class="text-sm text-calm-mute mt-1">${escapeHtml(meta.desc)}</div>
              </div>
              <span class="pill bg-white border border-calm-line text-calm-mute">${sectionItems.filter(item => item.unlocked).length} / ${sectionItems.length}</span>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              ${sectionItems.map(item => `
                <div class="achievement-card ${item.unlocked ? '' : 'locked'} rounded-[1.4rem] border border-calm-line bg-white p-4 shadow-soft">
                  <div class="flex items-start justify-between gap-3">
                    <div>
                      <div class="text-3xl mb-2">${faIcon(item.icon)}</div>
                      <div class="font-black text-lg">${escapeHtml(item.title)}</div>
                      <div class="text-sm text-calm-mute mt-1">${escapeHtml(item.desc)}</div>
                    </div>
                    <span class="pill ${item.unlocked ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-calm-mute'}">${item.unlocked ? '已解锁' : item.tierName}</span>
                  </div>
                  <div class="mt-4 h-2 rounded-full bg-gray-100 overflow-hidden"><div class="h-full bg-gradient-to-r ${item.color}" style="width:${Math.min(100, item.progress / item.goal * 100)}%"></div></div>
                  <div class="flex items-center justify-between gap-3 text-xs text-calm-mute mt-2">
                    <span>进度：${escapeHtml(String(item.progress))} / ${escapeHtml(String(item.goal))}</span>
                    <span>系列 ${item.tier}/3</span>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>`;
      }).join('');
    }

    function renderAchievementRangeStats() {
      const range = getStatsRange(todayStr());
      if ($('achievementStatsRangeLabel')) $('achievementStatsRangeLabel').textContent = range.label;
      const days = Math.max(1, range.dates.length);
      const focusSessions = state.focus.sessions.filter(s => isDateInRange(s.date, range.start, range.end)).length;
      const focusMinutes = state.focus.sessions.filter(s => isDateInRange(s.date, range.start, range.end)).reduce((sum, s) => sum + (Number(s.minutes)||0), 0);
      const tasksDone = state.tasks.filter(item => item.doneAt && isDateInRange(dateFromDateTime(item.doneAt), range.start, range.end)).length;
      const thesisLogs = (state.thesis?.logs || []).filter(item => isDateInRange(item.date, range.start, range.end)).length;
      const mentorDays = range.dates.reduce((sum, date) => sum + mentorCountOn(date), 0);
      const avgHabit = Math.round(range.dates.reduce((sum, d) => sum + todayHabitCompletion(d), 0) / days);
      const cards = [
        { label:`${statsModeText()}专注次数`, value: focusSessions, color:'text-dopamine-orange' },
        { label:`${statsModeText()}专注时长`, value: formatMinutes(focusMinutes), color:'text-dopamine-orange' },
        { label:`${statsModeText()}完成任务`, value: tasksDone, color:'text-dopamine-pink' },
        { label:`${statsModeText()}论文日志`, value: thesisLogs, color:'text-dopamine-purple' },
        { label:`${statsModeText()}导师沟通`, value: mentorDays, color:'text-dopamine-sky' },
        { label:`${statsModeText()}习惯均值`, value: `${avgHabit}%`, color:'text-dopamine-mint' }
      ];
      $('achievementRangeStats').innerHTML = cards.map(item => `
        <div class="small-stat p-4">
          <div class="text-sm text-calm-mute">${item.label}</div>
          <div class="text-2xl font-black mt-1 ${item.color}">${escapeHtml(String(item.value))}</div>
        </div>
      `).join('');
    }

    function submissionStatsData() {
      const range = getStatsRange(todayStr());
      const dueSoon = state.submissions.filter(item => item.deadline && diffDays(todayStr(), item.deadline) <= 14 && diffDays(todayStr(), item.deadline) >= 0).length;
      const createdInRange = state.submissions.filter(item => isDateInRange(dateFromDateTime(item.createdAt), range.start, range.end)).length;
      const dueInRange = state.submissions.filter(item => item.deadline && isDateInRange(item.deadline, range.start, range.end)).length;
      const archived = state.submissions.filter(s => ['已接收','已见刊/已收录'].includes(s.stage)).length;
      return [
        { label:`${statsModeText()}新增项目`, value: createdInRange, color:'text-dopamine-sky' },
        { label:`${statsModeText()}截止项目`, value: dueInRange, color:'text-dopamine-pink' },
        { label:'进行中', value: runningSubmissionCount(), color:'text-dopamine-orange' },
        { label:'成果归档', value: archived, color:'text-dopamine-mint' },
        { label:'14 天内截止', value: dueSoon, color:'text-dopamine-purple' }
      ];
    }
    function renderSubmissionStats() {
      const range = getStatsRange(todayStr());
      if ($('submissionStatsRangeLabel')) $('submissionStatsRangeLabel').textContent = range.label;
      $('submissionStats').innerHTML = submissionStatsData().map(item => `
        <div class="small-stat p-4"><div class="text-sm text-calm-mute">${item.label}</div><div class="text-3xl font-black mt-1 ${item.color}">${item.value}</div></div>
      `).join('');
    }
    function addSubmission() {
      const title = $('subTitle').value.trim(); if (!title) { alert('请填写题目 / 项目名。'); return; }
      const timestamp = nowDateTime();
      const item = {
        id: uid('sub'),
        title,
        venue: $('subVenue').value.trim(),
        deadline: $('subDeadline').value || '',
        stage: $('subStage').value || '选题中',
        type: $('subType').value,
        notes: $('subNotes').value.trim(),
        logs: [],
        createdAt: timestamp,
        updatedAt: timestamp
      };
      state.submissions.unshift(item);
      syncSubmissionProject(item);
      ['subTitle','subVenue','subDeadline','subNotes'].forEach(id => $(id).value='');
      saveState(); renderAll();
    }
    function renderSubmissionBoard() {
      renderSubmissionStats();
      syncAllSubmissionProjects();
      const prevFilterStage = $('submissionFilterStage').value;
      const prevFormStage = $('subStage').value;
      const prevLogProject = $('submissionLogProject')?.value || '';
      $('submissionFilterStage').innerHTML = `<option value="">全部阶段</option>` + SUBMISSION_COLUMNS.map(s => `<option value="${s}">${s}</option>`).join('');
      $('submissionFilterStage').value = prevFilterStage;
      $('subStage').innerHTML = SUBMISSION_COLUMNS.map(s => `<option value="${s}">${s}</option>`).join('');
      $('subStage').value = prevFormStage || '选题中';
      if ($('submissionLogProject')) {
        $('submissionLogProject').innerHTML = state.submissions.map(item => `<option value="${item.id}">${escapeHtml(item.title)}</option>`).join('');
        $('submissionLogProject').value = state.submissions.some(item => item.id === prevLogProject) ? prevLogProject : (state.submissions[0]?.id || '');
      }
      const q = $('submissionFilterQuery').value.trim().toLowerCase();
      const month = $('submissionFilterMonth').value;
      const stageFilter = $('submissionFilterStage').value;
      const filtered = state.submissions.filter(item => {
        const matchesQ = !q || `${item.title} ${item.venue} ${item.notes}`.toLowerCase().includes(q);
        const matchesMonth = !month || (item.deadline || '').startsWith(month);
        const matchesStage = !stageFilter || item.stage === stageFilter;
        return matchesQ && matchesMonth && matchesStage;
      });
      const boardItems = SUBMISSION_COLUMNS.filter(stage => !['已接收','已见刊/已收录'].includes(stage)).map(stage => ({ stage, items: filtered.filter(item => item.stage === stage) }));
      $('submissionBoard').innerHTML = boardItems.map(col => `
        <div class="small-stat p-4 kanban-col">
          <div class="flex items-center justify-between mb-3"><div class="font-black">${col.stage}</div><span class="pill" style="background:${STAGE_COLORS[col.stage]}20;color:${STAGE_COLORS[col.stage]}">${col.items.length}</span></div>
          <div class="space-y-3">${col.items.map(item => `
            <div class="rounded-2xl bg-white border border-calm-line p-3">
              <div class="font-bold line-clamp-2">${escapeHtml(item.title)}</div>
              <div class="text-xs text-calm-mute mt-1">${escapeHtml(item.venue || '未填写 venue')}</div>
              <div class="text-xs text-calm-mute mt-1">${item.deadline ? `截止：${item.deadline}` : '无截止日期'}</div>
              <div class="flex gap-2 mt-3 flex-wrap">
                <button class="px-2 py-1 rounded-xl text-xs font-bold bg-gray-100 text-calm-mute" data-sub-edit="${item.id}">修改</button>
                <button class="px-2 py-1 rounded-xl text-xs font-bold bg-green-100 text-green-700" data-sub-next="${item.id}">推进</button>
              </div>
            </div>
          `).join('') || '<div class="text-sm text-calm-mute">暂无项目</div>'}</div>
        </div>
      `).join('');
      $('submissionBoard').querySelectorAll('[data-sub-edit]').forEach(btn => btn.onclick = () => openSubmissionEditor(btn.dataset.subEdit));
      $('submissionBoard').querySelectorAll('[data-sub-next]').forEach(btn => btn.onclick = () => advanceSubmission(btn.dataset.subNext));

      const archive = filtered.filter(item => ['已接收','已见刊/已收录'].includes(item.stage));
      $('submissionArchive').innerHTML = archive.map(item => `
        <div class="rounded-2xl border border-calm-line bg-white p-4 flex items-start justify-between gap-4">
          <div>
            <div class="font-black">${escapeHtml(item.title)}</div>
            <div class="text-sm text-calm-mute mt-1">${escapeHtml(item.venue || '')}</div>
            <div class="text-xs text-calm-mute mt-1">${item.stage}${item.deadline ? ` · 截止 ${item.deadline}` : ''}</div>
          </div>
          <button class="text-sm font-bold text-dopamine-orange" data-sub-edit="${item.id}">修改</button>
        </div>
      `).join('') || '<div class="text-sm text-calm-mute">还没有进入成果归档的项目。</div>';
      $('submissionArchive').querySelectorAll('[data-sub-edit]').forEach(btn => btn.onclick = () => openSubmissionEditor(btn.dataset.subEdit));
      renderSubmissionLogs();
    }
    function advanceSubmission(id) {
      const idx = state.submissions.findIndex(item => item.id === id); if (idx < 0) return;
      const item = state.submissions[idx];
      const current = SUBMISSION_COLUMNS.indexOf(item.stage);
      const nextStage = SUBMISSION_COLUMNS[Math.min(SUBMISSION_COLUMNS.length - 1, current + 1)] || item.stage;
      state.submissions[idx] = { ...item, stage: nextStage, updatedAt: nowDateTime() };
      syncSubmissionProject(state.submissions[idx]);
      saveState(); renderAll();
    }

    function addSubmissionLog() {
      const id = $('submissionLogProject').value;
      const item = state.submissions.find(sub => sub.id === id);
      if (!item) { alert('请先选择投稿项目。'); return; }
      const note = $('submissionLogNote').value.trim();
      if (!note) { alert('请填写推进日志内容。'); return; }
      item.logs = Array.isArray(item.logs) ? item.logs : [];
      item.logs.unshift({
        id: uid('sublog'),
        date: $('submissionLogDate').value || todayStr(),
        type: $('submissionLogType').value || '推进',
        minutes: Math.max(0, Number($('submissionLogMinutes').value) || 0),
        note,
        stage: item.stage,
        at: nowDateTime()
      });
      item.updatedAt = nowDateTime();
      $('submissionLogNote').value = '';
      $('submissionLogMinutes').value = '';
      syncSubmissionProject(item);
      saveState();
      renderAll();
    }
    function renderSubmissionLogs() {
      if (!$('submissionLogList')) return;
      const selectedId = $('submissionLogProject')?.value || '';
      const selected = state.submissions.find(item => item.id === selectedId);
      const logs = selected
        ? (selected.logs || []).map(log => ({ item:selected, log }))
        : state.submissions.flatMap(item => (item.logs || []).map(log => ({ item, log })));
      $('submissionLogList').innerHTML = logs.slice(0, 20).map(({ item, log }) => `
        <div class="rounded-2xl border border-calm-line bg-white px-4 py-3">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <div class="font-bold">${escapeHtml(item.title)}</div>
              <div class="text-xs text-calm-mute mt-1">${escapeHtml(log.date)} · ${escapeHtml(log.type)} · ${escapeHtml(log.stage || item.stage)}${log.minutes ? ` · ${formatMinutes(log.minutes)}` : ''}</div>
              <div class="text-sm leading-6 mt-2">${escapeHtml(log.note)}</div>
            </div>
          </div>
        </div>
      `).join('') || '<div class="text-sm text-calm-mute">还没有投稿推进日志。</div>';
    }
    function downloadSubmissionMarkdown() {
      const id = $('submissionLogProject').value;
      const item = state.submissions.find(sub => sub.id === id);
      if (!item) { alert('请先选择投稿项目。'); return; }
      const logs = [...(item.logs || [])].sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.at || '').localeCompare(a.at || ''));
      const md = [
        `# 投稿推进日志：${item.title}`,
        '',
        `- Venue：${item.venue || '未填写'}`,
        `- 类型：${item.type || 'Other'}`,
        `- 当前阶段：${item.stage}`,
        `- 截止日期：${item.deadline || '未设置'}`,
        `- 备注：${item.notes || '无'}`,
        '',
        '## 推进日志',
        '',
        ...(logs.length ? logs.flatMap(log => [
          `### ${log.date} · ${log.type}`,
          '',
          `- 阶段：${log.stage || item.stage}`,
          `- 投入：${log.minutes ? formatMinutes(log.minutes) : '未记录'}`,
          `- 记录：${log.note}`,
          ''
        ]) : ['暂无推进日志。'])
      ].join('\n');
      const blob = new Blob([md], { type:'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `submission_${item.title.replace(/[\\/:*?"<>|]/g, '_')}_logs.md`;
      a.click();
      URL.revokeObjectURL(url);
    }

    function renderDashboard() {
      const days = Number($('dashboardRange').value || 7);
      const dates = recentDates(days);
      const rangeLabel = days === 1 ? '今日' : days === 7 ? '本周' : days === 30 ? '本月' : `近 ${days} 天`;
      const start = dates[0];
      const end = dates[dates.length - 1];
      const focusTotal = dates.reduce((sum, d) => sum + focusMinutesOn(d), 0);
      const workTotal = dates.reduce((sum, d) => sum + totalAttendanceMinutes(d), 0);
      const avgHabit = Math.round(dates.reduce((sum, d) => sum + todayHabitCompletion(d), 0) / Math.max(1, days));
      const exerciseDays = dates.filter(d => exerciseDoneOn(d)).length;
      const careDays = dates.reduce((sum, d) => sum + careCountOn(d), 0);
      const mentorDays = dates.reduce((sum, d) => sum + mentorCountOn(d), 0);
      const reviewDays = dates.reduce((sum, d) => sum + reviewCountOn(d), 0);
      const focusSessions = state.focus.sessions.filter(item => isDateInRange(item.date, start, end));
      const workLogs = Object.entries(state.attendance)
        .filter(([date]) => isDateInRange(date, start, end))
        .flatMap(([, day]) => day.logs || []);
      const leaveCount = Object.entries(state.attendance)
        .filter(([date]) => isDateInRange(date, start, end))
        .reduce((sum, [, day]) => sum + (day.leaves?.length || 0), 0);
      const scheduleCount = Object.entries(state.timeBlocks || {})
        .filter(([date]) => isDateInRange(date, start, end))
        .reduce((sum, [, items]) => sum + (Array.isArray(items) ? items.length : 0), 0);
      const scheduleMinutes = Object.entries(state.timeBlocks || {})
        .filter(([date]) => isDateInRange(date, start, end))
        .reduce((sum, [, items]) => sum + (Array.isArray(items) ? items.reduce((inner, item) => inner + minutesBetween(item.start, item.end), 0) : 0), 0);
      const tasksDone = state.tasks.filter(item => item.doneAt && isDateInRange(dateFromDateTime(item.doneAt), start, end)).length;
      const tasksStarted = state.tasks.filter(item => item.startedAt && isDateInRange(dateFromDateTime(item.startedAt), start, end)).length;
      const thesisLogs = (state.thesis?.logs || []).filter(item => isDateInRange(item.date, start, end));
      const thesisMinutes = thesisLogs.reduce((sum, item) => sum + (Number(item.minutes) || 0), 0);
      const thesisWords = thesisLogs.reduce((sum, item) => sum + (Number(item.words) || 0), 0);
      const chapterUpdates = (state.thesis?.chapters || []).filter(item => item.updatedAt && isDateInRange(dateFromDateTime(item.updatedAt), start, end)).length;
      const milestoneDone = (state.thesis?.milestones || []).filter(item => item.doneAt && isDateInRange(dateFromDateTime(item.doneAt), start, end)).length;
      const submissionCreated = state.submissions.filter(item => item.createdAt && isDateInRange(dateFromDateTime(item.createdAt), start, end)).length;
      const submissionUpdated = state.submissions.filter(item => item.updatedAt && isDateInRange(dateFromDateTime(item.updatedAt), start, end) && dateFromDateTime(item.createdAt) !== dateFromDateTime(item.updatedAt)).length;
      const submissionDue = state.submissions.filter(item => isDateInRange(item.deadline, start, end)).length;
      const submissionMoves = submissionCreated + submissionUpdated;
      const foodLogs = state.foods.filter(item => isDateInRange(item.date, start, end)).length;
      const avgCareStress = careDays ? (dates.filter(d => careCountOn(d)).reduce((sum, d) => sum + careEntryOn(d).stress, 0) / careDays).toFixed(1) : '0.0';
      const avgMentorPressure = mentorDays ? (dates.filter(d => mentorCountOn(d)).reduce((sum, d) => sum + mentorEntryOn(d).pressure, 0) / mentorDays).toFixed(1) : '0.0';
      const reviewTemplateTotal = dates.reduce((sum, d) => sum + reviewTemplateCount(dailyReviewEntryOn(d)), 0);
      const reviewPriorityTotal = dates.reduce((sum, d) => sum + reviewPriorityCount(dailyReviewEntryOn(d)), 0);

      const statCards = [
        { label:`${rangeLabel}专注`, value: formatMinutes(focusTotal), color:'text-dopamine-orange' },
        { label:`${rangeLabel}时间块`, value: `${scheduleCount} 个 / ${formatMinutes(scheduleMinutes)}`, color:'text-dopamine-sky' },
        { label:`${rangeLabel}打卡`, value: formatMinutes(workTotal), color:'text-dopamine-sky' },
        { label:`${rangeLabel}论文投入`, value: formatMinutes(thesisMinutes), color:'text-dopamine-purple' },
        { label:`${rangeLabel}论文字数`, value: Math.round(thesisWords), color:'text-dopamine-pink' },
        { label:`${rangeLabel}投稿动作`, value: submissionMoves, color:'text-dopamine-sky' },
        { label:`${rangeLabel}习惯均值`, value: `${avgHabit}%`, color:'text-dopamine-mint' },
        { label:`${rangeLabel}心灵关怀`, value: careDays, color:'text-dopamine-yellow' },
        { label:`${rangeLabel}导师沟通`, value: mentorDays, color:'text-dopamine-purple' },
        { label:`${rangeLabel}学术复盘`, value: reviewDays, color:'text-dopamine-pink' },
        { label:'进行中投稿', value: runningSubmissionCount(), color:'text-dopamine-orange' }
      ];
      $('dashboardStats').innerHTML = statCards.map(item => `
        <div class="small-stat p-4">
          <div class="text-sm text-calm-mute">${item.label}</div>
          <div class="text-2xl font-black mt-1 ${item.color}">${escapeHtml(String(item.value))}</div>
        </div>
      `).join('');

      const highlightCards = [
        {
          title: '节奏推进',
          body: `${rangeLabel}累计 ${workLogs.length} 段工作、${focusSessions.length} 次专注，完成任务 ${tasksDone} 项。`,
          note: `请假 ${leaveCount} 条 · 时间块 ${scheduleCount} 个 / ${formatMinutes(scheduleMinutes)}`
        },
        {
          title: '论文与投稿',
          body: `论文日志 ${thesisLogs.length} 条，共 ${formatMinutes(thesisMinutes)}${thesisWords ? `，${Math.round(thesisWords)} 字` : ''}。`,
          note: `章节更新 ${chapterUpdates} 次 · 里程碑完成 ${milestoneDone} 个 · 投稿动作 ${submissionMoves} 次`
        },
        {
          title: '健康恢复',
          body: `习惯平均完成 ${avgHabit}% ，运动 ${exerciseDays} 天，饮食记录 ${foodLogs} 条。`,
          note: `更适合看“是否有恢复动作”，而不只是有没有硬撑。`
        },
        {
          title: '心理与沟通',
          body: `心灵关怀 ${careDays} 天、导师沟通 ${mentorDays} 天、学术复盘 ${reviewDays} 天。`,
          note: `平均关怀压力 ${avgCareStress}/5 · 导师沟通压力 ${avgMentorPressure}/5 · 学术复盘项 ${reviewTemplateTotal} 条`
        }
      ];
      $('dashboardHighlights').innerHTML = highlightCards.map(item => `
        <div class="rounded-2xl bg-white border border-calm-line px-4 py-4">
          <div class="font-black">${escapeHtml(item.title)}</div>
          <div class="text-sm leading-6 mt-2">${escapeHtml(item.body)}</div>
          <div class="text-xs text-calm-mute mt-2">${escapeHtml(item.note)}</div>
        </div>
      `).join('');

      const coverageRows = [
        {
          label: '今日总览',
          ratio: dates.filter(d => totalAttendanceMinutes(d) > 0 || focusMinutesOn(d) > 0 || (state.timeBlocks?.[d]?.length || 0) > 0 || state.tasks.some(item => [item.createdAt, item.startedAt, item.doneAt].some(ts => dateFromDateTime(ts) === d))).length / Math.max(1, days),
          detail: `工作 ${workLogs.length} 段 · 专注 ${focusSessions.length} 次 · 完成任务 ${tasksDone}`
        },
        {
          label: workspaceCopy().thesisLabel,
          ratio: dates.filter(d => thesisLogs.some(item => item.date === d) || (state.thesis?.chapters || []).some(item => dateFromDateTime(item.updatedAt) === d) || (state.thesis?.milestones || []).some(item => dateFromDateTime(item.doneAt) === d)).length / Math.max(1, days),
          detail: `日志 ${thesisLogs.length} 条 · 章节更新 ${chapterUpdates} 次 · 里程碑 ${milestoneDone} 个`
        },
        {
          label: '投稿管理',
          ratio: Math.min(1, (submissionMoves + submissionDue) / Math.max(1, days)),
          detail: `新增 ${submissionCreated} · 更新 ${submissionUpdated} · 截止 ${submissionDue}`
        },
        {
          label: '健康管理',
          ratio: dates.filter(d => todayHabitCompletion(d) > 0 || state.foods.some(item => item.date === d)).length / Math.max(1, days),
          detail: `习惯均值 ${avgHabit}% · 运动 ${exerciseDays} 天 · 饮食 ${foodLogs} 条`
        },
        {
          label: '心灵关怀',
          ratio: careDays / Math.max(1, days),
          detail: `记录 ${careDays} 天 · 平均压力 ${avgCareStress}/5`
        },
        {
          label: '导师沟通',
          ratio: mentorDays / Math.max(1, days),
          detail: `记录 ${mentorDays} 天 · 等反馈 ${dates.filter(d => mentorEntryOn(d).status === 'waiting').length} 天`
        },
        {
          label: '学术复盘',
          ratio: reviewDays / Math.max(1, days),
          detail: `记录 ${reviewDays} 天 · 学术复盘项 ${reviewTemplateTotal} 条 · 明日优先 ${reviewPriorityTotal} 条`
        }
      ];
      $('dashboardCoverage').innerHTML = coverageRows.map(item => {
        const percent = Math.round(clamp(item.ratio * 100, 0, 100));
        return `
          <div class="rounded-2xl bg-white border border-calm-line px-3 py-3">
            <div class="flex items-center justify-between gap-3">
              <div class="min-w-0">
                <div class="font-bold">${escapeHtml(item.label)}</div>
                <div class="text-xs text-calm-mute mt-1">${escapeHtml(item.detail)}</div>
              </div>
              <span class="pill bg-dopamine-sky/10 text-dopamine-sky shrink-0">${percent}%</span>
            </div>
            <div class="mt-3 h-2 rounded-full bg-calm-bg overflow-hidden">
              <div class="h-full rounded-full bg-gradient-to-r from-dopamine-orange via-dopamine-sky to-dopamine-mint" style="width:${percent}%"></div>
            </div>
          </div>`;
      }).join('');

      makeOrUpdateChart('focusChart','focus',{
        type:'line',
        data:{
          labels: dates.map(d => d.slice(5)),
          datasets:[{
            label:'专注分钟',
            data: dates.map(d => focusMinutesOn(d)),
            borderColor:'#FF8C42',
            backgroundColor:'rgba(255,140,66,0.18)',
            fill:true,
            tension:.35
          }]
        },
        options:{ responsive:true, maintainAspectRatio:false, scales:{ y:{ beginAtZero:true } } }
      });
      makeOrUpdateChart('attendanceChart','attendance',{
        type:'bar',
        data:{
          labels: dates.map(d => d.slice(5)),
          datasets:[{
            label:'工作分钟',
            data: dates.map(d => totalAttendanceMinutes(d)),
            backgroundColor:'#4D9DE0',
            borderRadius:12
          }]
        },
        options:{ responsive:true, maintainAspectRatio:false, scales:{ y:{ beginAtZero:true } } }
      });
      makeOrUpdateChart('habitChart','habit',{
        type:'line',
        data:{
          labels: dates.map(d => d.slice(5)),
          datasets:[{
            label:'完成度 %',
            data: dates.map(d => todayHabitCompletion(d)),
            borderColor:'#43AA8B',
            backgroundColor:'rgba(67,170,139,0.15)',
            fill:true,
            tension:.3
          }]
        },
        options:{ responsive:true, maintainAspectRatio:false, scales:{ y:{ beginAtZero:true, max:100 } } }
      });
      makeOrUpdateChart('thesisChart','thesis',{
        type:'bar',
        data:{
          labels: dates.map(d => d.slice(5)),
          datasets:[
            {
              type:'bar',
              label:'投入分钟',
              data: dates.map(d => (state.thesis?.logs || []).filter(item => item.date === d).reduce((sum, item) => sum + (Number(item.minutes) || 0), 0)),
              backgroundColor:'#9B5DE5',
              borderRadius:12,
              yAxisID:'y'
            },
            {
              type:'line',
              label:'写作字数',
              data: dates.map(d => (state.thesis?.logs || []).filter(item => item.date === d).reduce((sum, item) => sum + (Number(item.words) || 0), 0)),
              borderColor:'#FF5A5F',
              backgroundColor:'rgba(255,90,95,0.15)',
              tension:.3,
              yAxisID:'y1'
            }
          ]
        },
        options:{
          responsive:true,
          maintainAspectRatio:false,
          scales:{
            y:{ beginAtZero:true, title:{ display:true, text:'分钟' } },
            y1:{ beginAtZero:true, position:'right', grid:{ drawOnChartArea:false }, title:{ display:true, text:'字数' } }
          }
        }
      });
      makeOrUpdateChart('wellbeingChart','wellbeing',{
        type:'bar',
        data:{
          labels: dates.map(d => d.slice(5)),
          datasets:[
            { label:'心灵关怀', data: dates.map(d => careCountOn(d)), backgroundColor:'#F6BD60', borderRadius:10 },
            { label:'导师沟通', data: dates.map(d => mentorCountOn(d)), backgroundColor:'#9B5DE5', borderRadius:10 },
            { label:'学术复盘', data: dates.map(d => reviewCountOn(d)), backgroundColor:'#FF5A5F', borderRadius:10 }
          ]
        },
        options:{ responsive:true, maintainAspectRatio:false, scales:{ y:{ beginAtZero:true, max:1, ticks:{ stepSize:1 } } } }
      });
      const stageCounts = SUBMISSION_COLUMNS.map(stage => state.submissions.filter(item => item.stage===stage).length);
      makeOrUpdateChart('submissionChart','submission',{
        type:'doughnut',
        data:{ labels: SUBMISSION_COLUMNS, datasets:[{ data: stageCounts, backgroundColor: SUBMISSION_COLUMNS.map(stage => STAGE_COLORS[stage] || '#d1d5db') }] },
        options:{ responsive:true, maintainAspectRatio:false }
      });
    }

    function makeOrUpdateChart(canvasId, key, config) {
      const canvas = $(canvasId);
      if (!canvas) return;
      if (charts[key]) charts[key].destroy();
      charts[key] = new Chart(canvas, config);
    }

    function renderSettingsRangeStats() {
      const range = getStatsRange(todayStr());
      if ($('settingsStatsRangeLabel')) $('settingsStatsRangeLabel').textContent = range.label;
      const createdTasks = state.tasks.filter(t => t.createdAt && isDateInRange(dateFromDateTime(t.createdAt), range.start, range.end)).length;
      const doneTasks = state.tasks.filter(t => t.doneAt && isDateInRange(dateFromDateTime(t.doneAt), range.start, range.end)).length;
      const newSubs = state.submissions.filter(s => s.createdAt && isDateInRange(dateFromDateTime(s.createdAt), range.start, range.end)).length;
      const thesisLogs = (state.thesis?.logs || []).filter(l => isDateInRange(l.date, range.start, range.end)).length;
      const careLogs = range.dates.reduce((sum, date) => sum + careCountOn(date), 0);
      const mentorLogs = range.dates.reduce((sum, date) => sum + mentorCountOn(date), 0);
      const cards = [
        { label:`${statsModeText()}新增任务`, value: createdTasks, color:'text-dopamine-pink' },
        { label:`${statsModeText()}完成任务`, value: doneTasks, color:'text-dopamine-mint' },
        { label:`${statsModeText()}新增投稿`, value: newSubs, color:'text-dopamine-sky' },
        { label:`${statsModeText()}论文日志`, value: thesisLogs, color:'text-dopamine-purple' },
        { label:`${statsModeText()}心灵关怀`, value: careLogs, color:'text-dopamine-yellow' },
        { label:`${statsModeText()}导师沟通`, value: mentorLogs, color:'text-dopamine-orange' }
      ];
      $('settingsRangeStats').innerHTML = cards.map(item => `
        <div class="rounded-2xl bg-white border border-calm-line px-3 py-3">
          <div class="text-xs text-calm-mute">${item.label}</div>
          <div class="text-xl font-black mt-1 ${item.color}">${escapeHtml(String(item.value))}</div>
        </div>
      `).join('');
    }

    function renderWorkspaceControlCenter() {
      const copy = workspaceCopy();
      if ($('workspaceProfileName')) $('workspaceProfileName').textContent = copy.profileLabel;
      if ($('workspaceProfileDesc')) $('workspaceProfileDesc').textContent = profileMeta().description;
      if ($('moduleCenterSummary')) $('moduleCenterSummary').textContent = `当前开放 ${activeModuleCount()} / ${MODULE_IDS.length}`;
      if ($('workspacePresetButtons')) {
        $('workspacePresetButtons').innerHTML = Object.values(PROFILE_PRESETS).map(profile => `
          <button class="px-3 py-2 rounded-2xl text-sm font-black border ${state.ui.profile === profile.id ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-calm-line text-calm-ink'}" data-profile-preset="${profile.id}">
            ${profile.label}
          </button>
        `).join('');
        $('workspacePresetButtons').querySelectorAll('[data-profile-preset]').forEach(btn => {
          btn.onclick = () => applyProfilePreset(btn.dataset.profilePreset);
        });
      }
      if ($('moduleCenterList')) {
        const ordered = state.ui.moduleOrder.filter(id => MODULE_IDS.includes(id));
        $('moduleCenterList').innerHTML = ordered.map(id => {
          const module = moduleMeta(id);
          const enabled = isModuleEnabled(id);
          const routeLabel = module.route === 'execution-domain'
            ? '执行'
            : module.route === 'research-domain'
              ? '研究'
              : module.route === 'life-domain'
                ? '生活'
                : '洞察';
          return `
            <div class="rounded-2xl border border-calm-line bg-white px-4 py-4">
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <div class="flex items-center gap-2 font-black">
                    <i class="fa-solid ${module.icon} text-slate-500"></i>
                    <span>${escapeHtml(module.entryLabel || module.label)}</span>
                  </div>
                  <div class="text-sm text-calm-mute mt-1">${escapeHtml(module.description)}</div>
                  <div class="text-xs text-calm-mute mt-2">分组：${routeLabel} · 入口：${escapeHtml(module.primarySection || module.route)}</div>
                </div>
                <button class="px-3 py-2 rounded-2xl text-sm font-black ${enabled ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}" data-module-toggle="${id}">
                  ${enabled ? '已启用' : '已隐藏'}
                </button>
              </div>
            </div>
          `;
        }).join('');
        $('moduleCenterList').querySelectorAll('[data-module-toggle]').forEach(btn => {
          btn.onclick = () => {
            const moduleId = btn.dataset.moduleToggle;
            setModuleEnabled(moduleId, !isModuleEnabled(moduleId));
          };
        });
      }
      
    }

    function refreshSettings() {
      const raw = localStorage.getItem(STORAGE_KEY) || serializeState();
      $('jsonEditor').value = raw;
      $('storageSizeText').textContent = bytesToKB(new Blob([raw]).size);
      $('settingsRefreshTime').textContent = nowDateTime();
      if ($('storageBackendText')) $('storageBackendText').textContent = storageMeta.backend;
      if ($('storageSyncText')) $('storageSyncText').textContent = storageMeta.syncState;
      if ($('storagePathText')) $('storagePathText').textContent = storageMeta.filePath || `appData/${STORAGE_FILE_NAME}`;
      $('settingsSummary').innerHTML = [
        ['工作打卡', Object.values(state.attendance).reduce((sum,day)=>sum+(day.logs?.length||0),0)],
        ['请假记录', Object.values(state.attendance).reduce((sum,day)=>sum+(day.leaves?.length||0),0)],
        ['任务数', state.tasks.length],
        ['项目数', state.projects.length],
        ['专注记录', state.focus.sessions.length],
        ['饮食记录', state.foods.length],
        ['体重记录', state.weights.length],
        ['心灵关怀', Object.keys(state.care?.entries || {}).filter(date => careCountOn(date)).length],
        ['导师沟通', Object.keys(state.mentor?.entries || {}).filter(date => mentorCountOn(date)).length],
        ['学术复盘', Object.keys(state.reviewDaily?.entries || {}).filter(date => reviewCountOn(date)).length],
        ['投稿项目', state.submissions.length],
        ['待报销', state.reimb?.pending?.length || 0],
        ['已报销', state.reimb?.done?.length || 0],
        ['论文日志', state.thesis?.logs?.length || 0]
      ].map(([label,value]) => `<div class="rounded-2xl bg-white border border-calm-line px-3 py-3"><div class="text-xs text-calm-mute">${label}</div><div class="text-xl font-black">${value}</div></div>`).join('');
      renderWorkspaceControlCenter();
    }

    function exportJson() {
      const blob = new Blob([JSON.stringify(state, null, 2)], { type:'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `academic_workspace_backup_${todayStr()}.json`; a.click();
      URL.revokeObjectURL(url);
    }
    async function copyJson() {
      await navigator.clipboard.writeText(JSON.stringify(state, null, 2));
      alert('已复制到剪贴板。');
    }
    function importJsonText(raw) {
      try {
        const parsed = JSON.parse(raw);
        replaceState(buildStateFromParsed(parsed));
        saveState(); renderAll(); alert('导入完成。');
      } catch (err) { alert('JSON 导入失败，请检查格式。'); }
    }

    async function clearAllData() {
      if (!confirm('确定清空全部数据吗？此操作不可撤销。')) return;
      localStorage.removeItem(STORAGE_KEY);
      await clearJsonFileStorage();
      location.reload();
    }

    function openEditDialog(config) {
      editContext = config;
      $('editDialogTitle').textContent = config.title || '编辑记录';
      $('editDialogDesc').textContent = config.desc || '';
      $('editDialogBody').innerHTML = (config.fields || []).map(field => {
        if (field.type === 'textarea') {
          return `<label class="block"><div class="text-sm font-bold mb-1">${field.label}</div><textarea data-edit-field="${field.name}" rows="${field.rows||4}" class="w-full px-3 py-3 rounded-2xl border border-calm-line bg-white">${escapeHtml(field.value||'')}</textarea></label>`;
        }
        if (field.type === 'select') {
          const options = Array.isArray(field.options) ? field.options : [];
          const current = String(field.value ?? '');
          const html = options.map(opt => {
            const value = String(opt?.value ?? '');
            const label = String(opt?.label ?? value);
            return `<option value="${escapeHtml(value)}" ${value===current ? 'selected' : ''}>${escapeHtml(label)}</option>`;
          }).join('');
          return `<label class="block"><div class="text-sm font-bold mb-1">${field.label}</div><select data-edit-field="${field.name}" class="w-full px-3 py-3 rounded-2xl border border-calm-line bg-white font-semibold">${html}</select></label>`;
        }
        return `<label class="block"><div class="text-sm font-bold mb-1">${field.label}</div><input data-edit-field="${field.name}" type="${field.type||'text'}" value="${escapeHtml(field.value||'')}" class="w-full px-3 py-3 rounded-2xl border border-calm-line bg-white"></label>`;
      }).join('');
      $('btnDeleteRecord').style.display = config.onDelete ? 'inline-flex' : 'none';
      $('editDialog').showModal();
    }
    function closeEditDialog() { $('editDialog').close(); editContext = null; }
    function collectEditValues() {
      const vals = {};
      $('editDialogBody').querySelectorAll('[data-edit-field]').forEach(el => vals[el.dataset.editField] = el.value);
      return vals;
    }

    function openProjectEditor(id) {
      const project = state.projects.find(item => item.id===id); if (!project) return;
      openEditDialog({
        title:'修改项目',
        desc:project.title,
        fields:[
          { name:'title', label:'项目名', value:project.title },
          { name:'outcome', label:'完成结果', value:project.outcome },
          { name:'area', label:'项目类别', type:'select', value:project.area, options:PROJECT_AREAS.map(item => ({ value:item.value, label:item.label })) },
          { name:'status', label:'项目状态', type:'select', value:project.status, options:PROJECT_STATUS_OPTIONS.map(item => ({ value:item.value, label:item.label })) },
          { name:'startDate', label:'开始日期', type:'date', value:project.startDate || dateFromDateTime(project.createdAt) || '' },
          { name:'deadline', label:'截止日期', type:'date', value:project.deadline || '' },
          { name:'note', label:'备注', type:'textarea', value:project.note || '' }
        ],
        onSave:(vals)=>{
          project.title = vals.title.trim() || project.title;
          project.outcome = vals.outcome.trim();
          project.area = projectAreaMeta(vals.area).value;
          project.status = projectStatusMeta(vals.status).value;
          project.startDate = vals.startDate || '';
          project.deadline = vals.deadline || '';
          project.note = vals.note || '';
          project.updatedAt = nowDateTime();
          saveState(); renderAll();
        },
        onDelete:()=>{
          state.tasks = state.tasks.map(item => item.projectId === id ? { ...item, projectId:'' } : item);
          state.projects = state.projects.filter(item => item.id !== id);
          saveState(); renderAll();
        }
      });
    }

    function openTaskEditor(id) {
      const task = state.tasks.find(item => item.id===id); if (!task) return;
      openEditDialog({
        title:'修改任务', desc:task.status==='done'?'已完成任务':'任务信息',
        fields:[
          { name:'title', label:'任务名称', value:task.title },
          { name:'projectId', label:'所属项目', type:'select', value:task.projectId || '', options:[{ value:'', label:'未关联项目' }, ...state.projects.map(project => ({ value:project.id, label:project.title }))] },
          { name:'quadrant', label:'紧急程度（4 象限）', type:'select', value:task.quadrant || 'q2', options:QUADRANT_OPTIONS.map(item => ({ value:item.value, label:item.label })) },
          { name:'status', label:'状态', type:'select', value:task.status, options:TASK_STATUS_OPTIONS.map(item => ({ value:item.value, label:item.label })) },
          { name:'joinToday', label:'加入今日执行', type:'select', value:task.todayBucket ? 'yes' : 'no', options:[{ value:'no', label:'否' }, { value:'yes', label:'是' }] },
          { name:'dueDate', label:'截止日期', type:'date', value:task.dueDate || '' },
          { name:'estimate', label:'预计分钟', value:String(task.estimate || '') }
        ],
        onSave:(vals)=>{
          const wasDone = task.status === 'done';
          task.title = vals.title.trim() || task.title;
          task.projectId = vals.projectId || '';
          task.quadrant = taskQuadrantMeta(vals.quadrant).value;
          task.dueDate = vals.dueDate || '';
          task.estimate = Math.max(0, Number(vals.estimate) || 0);
          const nextStatus = taskStatusMeta(vals.status).value;
          if (nextStatus === 'done' && !wasDone) {
            finishTask(task.id);
            return;
          }
          task.status = nextStatus;
          if (nextStatus === 'done') {
            task.gtdBucket = 'done';
            task.todayBucket = '';
            task.doneAt = task.doneAt || nowDateTime();
          } else {
            task.gtdBucket = task.projectId ? 'next' : 'inbox';
            task.todayBucket = vals.joinToday === 'yes' ? (task.todayBucket || 'should') : '';
            task.doneAt = '';
            if (nextStatus === 'active') task.startedAt = task.startedAt || nowDateTime();
          }
          saveState(); renderAll();
        },
        onDelete:()=>{ deleteTask(id); }
      });
    }
    function openWorkLogEditor(id, date=todayStr()) {
      const day = getDayAttendance(date); const item = day.logs.find(log => log.id===id); if (!item) return;
      const slot = attendanceSlotMeta(normalizeAttendanceSlotKey(item.note));
      openEditDialog({ title:`修改${slot ? slot.label : '工作'}打卡`, desc: dayLabel(item.date), fields:[{name:'start',label:'开始时间',type:'time',value:item.start},{name:'end',label:'结束时间',type:'time',value:item.end||''},{name:'arriveMood',label:'到岗心情',type:'text',value:item.arriveMood||''},{name:'leaveMood',label:'离岗心情',type:'text',value:item.leaveMood||''}], onSave:(vals)=>{ item.start=parseHM(vals.start)||item.start; item.end=parseHM(vals.end)||null; item.arriveMood=String(vals.arriveMood||item.arriveMood||'').trim(); item.leaveMood=String(vals.leaveMood||item.leaveMood||'').trim(); if (slot) item.note = attendanceSlotNote(slot.key); saveState(); renderAll(); }, onDelete:()=>{ day.logs = day.logs.filter(log => log.id!==id); saveState(); renderAll(); } });
    }
    function openLeaveEditor(id) {
      const day = getDayAttendance(); const item = day.leaves.find(v => v.id===id); if (!item) return;
      openEditDialog({ title:'修改请假记录', desc: dayLabel(item.date), fields:[{name:'type',label:'请假类型',value:item.type}], onSave:(vals)=>{ item.type = vals.type.trim() || item.type; saveState(); renderAll(); }, onDelete:()=>{ day.leaves = day.leaves.filter(v => v.id!==id); saveState(); renderAll(); } });
    }
    function openFocusEditor(id) {
      const item = state.focus.sessions.find(v => v.id===id); if (!item) return;
      openEditDialog({ title:'修改专注记录', desc:item.date, fields:[{name:'date',label:'日期',type:'date',value:item.date},{name:'title',label:'主题',value:item.title},{name:'start',label:'开始时间',type:'time',value:item.start},{name:'end',label:'结束时间',type:'time',value:item.end}], onSave:(vals)=>{ item.date = vals.date || item.date; item.title = vals.title.trim() || item.title; item.start = parseHM(vals.start)||item.start; item.end = parseHM(vals.end)||item.end; item.minutes = minutesBetween(item.start,item.end); saveState(); renderAll(); }, onDelete:()=>{ state.focus.sessions = state.focus.sessions.filter(v => v.id!==id); saveState(); renderAll(); } });
    }
    function openBlockEditor(id,date) {
      const blocks = getDayTimeBlocks(date); const item = blocks.find(v => v.id===id); if (!item) return;
      openEditDialog({ title:'修改日程安排', desc:date, fields:[{name:'date',label:'日期',type:'date',value:date},{name:'title',label:'标题',value:item.title},{name:'start',label:'开始时间',type:'time',value:item.start},{name:'end',label:'结束时间',type:'time',value:item.end}], onSave:(vals)=>{ const targetDate = vals.date || date; item.title = vals.title.trim() || item.title; item.start = parseHM(vals.start)||item.start; item.end = parseHM(vals.end)||item.end; if (targetDate !== date) { state.timeBlocks[date] = blocks.filter(v => v.id!==id); getDayTimeBlocks(targetDate).push(item); } saveState(); $('scheduleDate').value = targetDate; renderAll(); }, onDelete:()=>{ state.timeBlocks[date] = blocks.filter(v => v.id!==id); saveState(); renderAll(); } });
    }
    function openFoodEditor(id) {
      const item = state.foods.find(v => v.id===id); if (!item) return;
      openEditDialog({ title:'修改饮食记录', desc:item.date, fields:[{name:'date',label:'日期',type:'date',value:item.date},{name:'meal',label:'类别',value:item.meal},{name:'text',label:'内容',type:'textarea',value:item.text}], onSave:(vals)=>{ item.date = vals.date || item.date; item.meal = vals.meal.trim() || item.meal; item.text = vals.text.trim() || item.text; saveState(); renderAll(); }, onDelete:()=>{ state.foods = state.foods.filter(v => v.id!==id); saveState(); renderAll(); } });
    }
    function openWeightEditor(id) {
      const item = state.weights.find(v => v.id===id); if (!item) return;
      openEditDialog({
        title:'修改体重记录',
        desc:item.date,
        fields:[
          { name:'date', label:'日期', type:'date', value:item.date },
          { name:'value', label:'数值', type:'number', value:String(item.value) },
          { name:'unit', label:'单位（kg / 斤 / lb）', value:item.unit || 'kg' }
        ],
        onSave:(vals)=>{
          item.date = vals.date || item.date;
          item.value = Math.max(0, Number(vals.value) || item.value);
          item.unit = ['kg','斤','lb'].includes(vals.unit) ? vals.unit : item.unit;
          saveState(); renderAll();
        },
        onDelete:()=>{ state.weights = state.weights.filter(v => v.id!==id); saveState(); renderAll(); }
      });
    }
    function openSubmissionEditor(id) {
      const item = state.submissions.find(v => v.id===id); if (!item) return;
      openEditDialog({ title:'修改投稿项目', desc:item.venue || '', fields:[{name:'title',label:'题目',value:item.title},{name:'venue',label:'Venue',value:item.venue||''},{name:'deadline',label:'截止日期',type:'date',value:item.deadline||''},{name:'stage',label:'阶段',value:item.stage||''},{name:'notes',label:'备注',type:'textarea',value:item.notes||''}], onSave:(vals)=>{ item.title = vals.title.trim() || item.title; item.venue = vals.venue.trim(); item.deadline = vals.deadline || ''; item.stage = SUBMISSION_COLUMNS.includes(vals.stage) ? vals.stage : item.stage; item.notes = vals.notes || ''; item.updatedAt = nowDateTime(); syncSubmissionProject(item); saveState(); renderAll(); }, onDelete:()=>{ state.submissions = state.submissions.filter(v => v.id!==id); state.projects = state.projects.filter(project => { const origin = normalizeProjectOrigin(project.origin, project); return !((origin.type === 'submission' && origin.refId === id) || project.note === submissionProjectNote(id)); }); saveState(); renderAll(); } });
    }

    function openThesisMilestoneEditor(id) {
      const item = state.thesis.milestones.find(v => v.id === id);
      if (!item) return;
      openEditDialog({
        title:'修改里程碑',
        desc:workspaceCopy().thesisLabel,
        fields:[
          { name:'name', label:'名称', value:item.name },
          { name:'due', label:'截止日期', type:'date', value:item.due || '' },
          { name:'done', label:'完成（true / false，可留空保持不变）', value:'' },
          { name:'note', label:'备注', type:'textarea', value:item.note || '' }
        ],
        onSave:(vals) => {
          item.name = vals.name.trim() || item.name;
          item.due = vals.due || '';
          item.note = vals.note || '';
          const doneRaw = String(vals.done || '').trim().toLowerCase();
          if (doneRaw) {
            const prev = !!item.done;
            item.done = ['true','1','yes','y'].includes(doneRaw);
            if (item.done && !prev) item.doneAt = nowDateTime();
            if (!item.done) item.doneAt = '';
          }
          saveState(); renderAll();
        },
        onDelete:() => {
          state.thesis.milestones = state.thesis.milestones.filter(v => v.id !== id);
          saveState(); renderAll();
        }
      });
    }
    function openThesisChapterEditor(id) {
      const item = state.thesis.chapters.find(v => v.id === id);
      if (!item) return;
      openEditDialog({
        title:'修改章节',
        desc:workspaceCopy().thesisLabel,
        fields:[
          { name:'name', label:'名称', value:item.name },
          { name:'progress', label:'进度（0-100）', value:String(item.progress ?? 0) },
          { name:'status', label:'状态（draft / revise / done）', value:item.status || 'draft' },
          { name:'note', label:'备注', type:'textarea', value:item.note || '' }
        ],
        onSave:(vals) => {
          item.name = vals.name.trim() || item.name;
          item.progress = Math.max(0, Math.min(100, Number(vals.progress) || 0));
          item.status = ['draft','revise','done'].includes(vals.status) ? vals.status : item.status;
          if (item.progress >= 100) item.status = 'done';
          item.note = vals.note || '';
          item.updatedAt = nowDateTime();
          saveState(); renderAll();
        },
        onDelete:() => {
          state.thesis.chapters = state.thesis.chapters.filter(v => v.id !== id);
          saveState(); renderAll();
        }
      });
    }
    function openThesisLogEditor(id) {
      const item = state.thesis.logs.find(v => v.id === id);
      if (!item) return;
      openEditDialog({
        title:'修改推进日志',
        desc:workspaceCopy().thesisLabel,
        fields:[
          { name:'date', label:'日期', type:'date', value:item.date || todayStr() },
          { name:'type', label:'类型（writing / revise / experiment / meeting / other）', value:item.type || 'other' },
          { name:'minutes', label:'分钟', value:String(item.minutes ?? 0) },
          { name:'words', label:'字数', value:String(item.words ?? 0) },
          { name:'note', label:'备注', type:'textarea', value:item.note || '' }
        ],
        onSave:(vals) => {
          item.date = vals.date || item.date;
          item.type = ['writing','revise','experiment','meeting','other'].includes(vals.type) ? vals.type : item.type;
          item.minutes = Math.max(0, Number(vals.minutes) || 0);
          item.words = Math.max(0, Number(vals.words) || 0);
          item.note = vals.note || '';
          saveState(); renderAll();
        },
        onDelete:() => {
          state.thesis.logs = state.thesis.logs.filter(v => v.id !== id);
          saveState(); renderAll();
        }
      });
    }


    let reimbPendingFiles = [];
    let reimbDoneFiles = [];
    let reimbCompleteId = null;

    function readFilesToArray(fileList, targetArr, previewId, labelId) {
      const files = Array.from(fileList || []);
      if (!files.length) return;
      let remaining = files.length;
      files.forEach(file => {
        const reader = new FileReader();
        reader.onload = e => {
          targetArr.push({ id: uid('rf'), name: file.name, dataUrl: e.target.result, type: file.type || '' });
          remaining -= 1;
          if (remaining === 0) {
            renderReimbFilePreview(targetArr, previewId);
            if (labelId && $(labelId)) {
              $(labelId).textContent = `${targetArr.length} 个文件已选`;
              $(labelId).classList.add('text-dopamine-orange');
            }
          }
        };
        reader.readAsDataURL(file);
      });
    }
    function renderReimbFilePreview(files, previewId) {
      const el = $(previewId);
      if (!el) return;
      el.innerHTML = (files || []).map(file => `<span class="pill bg-dopamine-sky/10 text-dopamine-sky">${iconLabel('fa-paperclip', file.name)}</span>`).join('');
    }
    function openReimbFileById(kind, id, fileId) {
      const source = state.reimb?.[kind] || [];
      const item = source.find(v => v.id === id);
      const file = [...(item?.invoices || []), ...(item?.receipts || [])].find(v => v.id === fileId);
      if (!file?.dataUrl) return;
      const a = document.createElement('a');
      a.href = file.dataUrl;
      a.download = file.name || 'file';
      a.click();
    }
    function addReimb() {
      const content = $('reimbContent')?.value.trim();
      const amount = Math.max(0, Number($('reimbAmount')?.value) || 0);
      if (!content) { $('reimbContent').focus(); return; }
      if (!amount) { $('reimbAmount').focus(); return; }
      state.reimb = state.reimb || { pending: [], done: [] };
      state.reimb.pending.unshift({
        id: uid('reimb'), content, amount, invoices: [...reimbPendingFiles], receipts: [], date: todayStr(), createdAt: nowDateTime(), doneDate: '', projectNum: '', completedAt: ''
      });
      $('reimbContent').value = '';
      $('reimbAmount').value = '';
      reimbPendingFiles = [];
      if ($('reimbFileInput')) $('reimbFileInput').value = '';
      if ($('reimbFileLabel')) { $('reimbFileLabel').textContent = '选择发票文件（可多选）'; $('reimbFileLabel').classList.remove('text-dopamine-orange'); }
      renderReimbFilePreview([], 'reimbFilePreview');
      saveState(); renderAll();
    }
    function startReimbComplete(id) {
      reimbCompleteId = id;
      reimbDoneFiles = [];
      renderReimbFilePreview([], 'reimbDoneFilePreview');
      if ($('reimbDoneFileInput')) $('reimbDoneFileInput').value = '';
      if ($('reimbDoneFileLabel')) $('reimbDoneFileLabel').textContent = '选择报销凭证（可多选）';
      $('reimbDoneDate').value = todayStr();
      $('reimbProjectNum').value = '';
      const item = (state.reimb?.pending || []).find(v => v.id === id);
      $('reimbModalSummary').textContent = item ? `${item.content} · ¥${Number(item.amount).toFixed(2)} · 发票 ${(item.invoices || []).length} 张` : '';
      $('reimbCompleteDialog').showModal();
    }
    function cancelReimbComplete() {
      reimbCompleteId = null;
      if ($('reimbCompleteDialog')?.open) $('reimbCompleteDialog').close();
    }
    function confirmReimbComplete() {
      if (!reimbCompleteId) return;
      const doneDate = $('reimbDoneDate').value || todayStr();
      const projectNum = $('reimbProjectNum').value.trim();
      const list = state.reimb?.pending || [];
      const idx = list.findIndex(v => v.id === reimbCompleteId);
      if (idx < 0) return;
      const item = list.splice(idx, 1)[0];
      state.reimb.done.unshift({ ...item, receipts: [...reimbDoneFiles], doneDate, projectNum, completedAt: nowDateTime() });
      reimbCompleteId = null;
      reimbDoneFiles = [];
      if ($('reimbCompleteDialog')?.open) $('reimbCompleteDialog').close();
      saveState(); renderAll();
    }
    function deleteReimb(id, kind='pending') {
      if (!state.reimb?.[kind]) return;
      state.reimb[kind] = state.reimb[kind].filter(v => v.id !== id);
      saveState(); renderAll();
    }
    function renderReimb() {
      state.reimb = normalizeReimbState(state.reimb);
      const reimb = state.reimb;
      const pendingTotal = (reimb.pending || []).reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
      const doneTotal = (reimb.done || []).reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
      if ($('reimbStats')) $('reimbStats').innerHTML = [
        ['待报销', `${reimb.pending.length} 项`, 'text-dopamine-orange'],
        ['待报销金额', `¥${pendingTotal.toFixed(2)}`, 'text-dopamine-orange'],
        ['已报销', `${reimb.done.length} 项`, 'text-dopamine-mint'],
        ['已报销金额', `¥${doneTotal.toFixed(2)}`, 'text-dopamine-mint']
      ].map(([label, value, color]) => `<div class="small-stat p-3"><div class="text-xs text-calm-mute">${label}</div><div class="text-lg font-black mt-1 ${color}">${value}</div></div>`).join('');
      if ($('reimbPendingBadge')) $('reimbPendingBadge').textContent = `${reimb.pending.length} 项`;
      if ($('reimbDoneBadge')) $('reimbDoneBadge').textContent = `${reimb.done.length} 项`;
      if ($('reimbPendingList')) $('reimbPendingList').innerHTML = reimb.pending.length ? reimb.pending.map(item => `
        <div class="rounded-2xl border border-amber-200 bg-amber-50/40 p-4">
          <div class="flex items-start justify-between gap-3 mb-3">
            <div><div class="font-black">${escapeHtml(item.content)}</div><div class="text-xs text-calm-mute mt-1">${escapeHtml(item.date)}</div></div>
            <div class="font-black text-dopamine-orange mono">¥${Number(item.amount).toFixed(2)}</div>
          </div>
          <div class="flex flex-wrap gap-2 mb-3">${(item.invoices || []).map(file => `<button class="pill bg-dopamine-sky/10 text-dopamine-sky" onclick="openReimbFileById('pending','${item.id}','${file.id}')">${iconLabel('fa-paperclip', file.name)}</button>`).join('')}</div>
          <div class="flex gap-2 justify-end">
            <button class="px-3 py-2 rounded-xl bg-dopamine-mint text-white font-bold text-sm" onclick="startReimbComplete('${item.id}')">完成报销</button>
            <button class="px-3 py-2 rounded-xl bg-rose-100 text-rose-600 font-bold text-sm" onclick="deleteReimb('${item.id}','pending')">删除</button>
          </div>
        </div>
      `).join('') : '<div class="text-sm text-calm-mute">暂无待报销项目。</div>';
      if ($('reimbDoneList')) $('reimbDoneList').innerHTML = reimb.done.length ? reimb.done.map(item => `
        <div class="rounded-2xl border border-emerald-200 bg-white p-4 cursor-pointer hover:shadow-soft transition" onclick="openReimbDoneDetail('${item.id}')">
          <div class="flex items-start justify-between gap-3 mb-2">
            <div class="font-black line-clamp-2">${escapeHtml(item.content)}</div>
            <div class="font-black text-dopamine-mint mono">¥${Number(item.amount).toFixed(2)}</div>
          </div>
          <div class="text-xs text-calm-mute">${escapeHtml(item.doneDate || item.date)}${item.projectNum ? ` · ${escapeHtml(item.projectNum)}` : ''}</div>
          <div class="text-xs text-calm-mute mt-2">发票 ${(item.invoices || []).length} 张 · 凭证 ${(item.receipts || []).length} 张</div>
          <div class="flex gap-2 justify-end mt-3">
            <button class="px-3 py-2 rounded-xl bg-rose-100 text-rose-600 font-bold text-sm" onclick="event.stopPropagation();deleteReimb('${item.id}','done')">删除</button>
          </div>
        </div>
      `).join('') : '<div class="text-sm text-calm-mute md:col-span-2">暂无已报销记录。</div>';
    }
    function openReimbDoneDetail(id) {
      const item = (state.reimb?.done || []).find(v => v.id === id);
      if (!item) return;
      const allFiles = [...(item.invoices || []), ...(item.receipts || [])];
      openEditDialog({
        title: item.content,
        desc: `已报销 · ¥${Number(item.amount).toFixed(2)}`,
        readonly: true,
        fields: [
          { name:'doneDate', label:'报销日期', value:item.doneDate || item.date, readonly:true },
          { name:'projectNum', label:'项目号', value:item.projectNum || '—', readonly:true },
          { name:'files', label:'附件', type:'html', value: allFiles.length ? allFiles.map(file => `<button class=\"pill bg-dopamine-sky/10 text-dopamine-sky mr-2 mb-2\" onclick=\"openReimbFileById('done','${item.id}','${file.id}')\">${iconLabel('fa-paperclip', file.name)}</button>`).join('') : '<span class=\"text-calm-mute text-sm\">无附件</span>' }
        ],
        hideDelete: true,
        hideSave: true
      });
    }

    function renderAll() {
      if (typeof applyCopyDedupeMap === 'function') applyCopyDedupeMap();
      updateClock();
      syncStatsModeButtons();
      renderSidebarSnapshot();
      renderLauncherHub();
      renderHomeCommandDeck();
      renderHomeQuickLinks();
      renderHomeThemeStats();
      renderWorkflow();
      renderResearchOverview();
      renderThesis();
      renderHomeAttendance();
      renderTasks();
      renderFocusTimeline();
      renderTimeline();
      renderSchedulePlanner();
      renderHabitSnapshot();
      renderHabitList();
      renderHabitManager();
      renderFoods();
      renderWeights();
      renderSupportOverview();
      renderCareThemeStats();
      renderCare();
      renderMentorThemeStats();
      renderMentor();
      renderReview();
      renderReviewThemeStats();
      renderAchievements();
      renderAchievementRangeStats();
      renderSubmissionBoard();
      renderReimb();
      renderSettingsRangeStats();
      if (isSectionVisible('dashboard-section')) renderDashboard();
      if (isSectionVisible('settings-section')) refreshSettings();
    }

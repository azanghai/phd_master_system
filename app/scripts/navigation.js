
    function navTo(sectionId) {
      const routeId = resolveRoute(sectionId);
      currentSection = routeId;
      const visible = visibleSectionsFor(routeId);
      sections.forEach(id => $(id)?.classList.toggle('section-hidden', !visible.includes(id)));
      const targetModule = moduleForSection(sectionId);
      const recentEntry = pendingRecentEntry || targetModule;
      if (recentEntry) touchRecentModule(recentEntry);
      pendingRecentEntry = '';
      renderNavigationChrome();
      state.ui.lastDomain = routeId;
      persistUiState();
      updateMobileNavTitle();
      if (isMobileViewport()) closeMobileDrawer();
      renderAll();
      if (isSectionVisible('dashboard-section')) renderDashboard();
      if (isSectionVisible('settings-section')) refreshSettings();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function updateClock() {
      const d = new Date();
      $('sidebarNowDate').textContent = `${d.getFullYear()}年${pad(d.getMonth()+1)}月${pad(d.getDate())}日 周${'日一二三四五六'[d.getDay()]}`;
      $('sidebarNowTime').textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    }

    function renderSidebarSnapshot() {
      return;
    }

    function copyMap() {
      const copy = workspaceCopy();
      return {
        navDomains: {
          launcher: copy.launcherLabel,
          command: copy.todayLabel,
          execution: copy.executionLabel,
          research: copy.researchLabel,
          life: copy.lifeLabel,
          insights: copy.insightsLabel,
          settings: copy.settingsLabel
        },
        quickLinks: {
          execution: '执行全景',
          research: isModuleEnabled('submissions') ? '研究与投稿' : '研究推进',
          wellbeing: '恢复与习惯',
          mentor: copy.guidanceLabel,
          review: '复盘计划',
          reimburse: '报销事务',
          insights: '趋势与成就',
          settings: '工作台设置'
        },
        moduleTitles: {
          researchOverview: '研究总览',
          supportPending: '生活支持总览',
          careDailyForm: '今日恢复记录',
          mentorMain: copy.guidanceLabel,
          mentorDailyForm: copy.guidanceLabel,
          achievement: '成就殿堂',
          thesis: copy.thesisLabel,
          submission: '投稿管线',
          review: '复盘与明日计划',
          settings: copy.settingsLabel
        },
        actions: {
          jumpSchedule: '新增日程',
          saveRecord: '保存记录'
        }
      };
    }

    function renderNavigationChrome() {
      const copy = workspaceCopy();
      const currentVisible = visibleSectionsFor(currentSection);
      const activeTarget = document.querySelector(`.nav-btn[data-target="${currentSection}"]`)
        ? currentSection
        : (currentVisible.find(sectionId => document.querySelector(`.nav-btn[data-target="${sectionId}"]`)) || currentSection);
      if ($('appBrandName')) $('appBrandName').textContent = copy.brand;
      if ($('appBrandSubtitle')) $('appBrandSubtitle').textContent = copy.profileLabel;
      if ($('mobileWorkspaceCaption')) $('mobileWorkspaceCaption').textContent = copy.brandEn;
      document.querySelectorAll('.nav-btn').forEach(btn => {
        const routeId = btn.dataset.target || '';
        const isVisible = isRouteVisible(routeId);
        btn.classList.toggle('hidden', !isVisible);
        btn.style.display = isVisible ? '' : 'none';
        btn.classList.toggle('active', routeId === activeTarget);
      });
      document.querySelectorAll('.cockpit-nav-group').forEach(group => {
        const hasVisibleButton = Array.from(group.querySelectorAll('.nav-btn')).some(btn => !btn.classList.contains('hidden'));
        group.classList.toggle('hidden', !hasVisibleButton);
        group.style.display = hasVisibleButton ? '' : 'none';
      });
      const activeSpan = document.querySelector(`.nav-btn[data-target="${activeTarget}"] span`);
      if ($('mobileNavSectionTitle') && !activeSpan) $('mobileNavSectionTitle').textContent = copy.brand;
    }

    function applyCopyDedupeMap() {
      const map = copyMap();
      const textById = {
        researchOverviewTitle: map.moduleTitles.researchOverview,
        supportOverviewTitle: map.moduleTitles.supportPending,
        careRecordTitle: map.moduleTitles.careDailyForm,
        mentorMainTitle: map.moduleTitles.mentorMain,
        mentorRecordTitle: map.moduleTitles.mentorDailyForm,
        achievementSectionTitle: map.moduleTitles.achievement,
        thesisSectionTitle: map.moduleTitles.thesis,
        submissionSectionTitle: map.moduleTitles.submission,
        reviewSectionTitle: map.moduleTitles.review,
        settingsSectionTitle: map.moduleTitles.settings,
        btnHomeOpenExecution: map.actions.jumpSchedule,
        btnWorkflowJumpScheduleTop: map.actions.jumpSchedule,
        btnSaveCare: map.actions.saveRecord,
        btnSaveMentor: map.actions.saveRecord
      };
      Object.entries(textById).forEach(([id, text]) => {
        const el = $(id);
        if (el) el.textContent = text;
      });
      renderNavigationChrome();
    }

    function domainLabelForRoute(routeId='') {
      const copy = workspaceCopy();
      if (['execution-domain', 'execution-section', 'workflow-section', 'reimb-section'].includes(routeId)) return '执行';
      if (['research-domain', 'research-section', 'thesis-section', 'submission-section'].includes(routeId)) return '研究';
      if (['life-domain', 'wellbeing-section', 'habit-section', 'support-section', 'care-section', 'mentor-section', 'review-section'].includes(routeId)) return '生活';
      if (['insights-domain', 'dashboard-section', 'achievement-section'].includes(routeId)) return '洞察';
      if (routeId === 'home-section') return copy.todayLabel;
      if (routeId === 'reminder-section') return '提醒';
      if (routeId === 'launcher-section') return copy.todayLabel;
      return '工作台';
    }

    function launcherEntryMeta(entryId='') {
      const copy = workspaceCopy();
      const presets = {
        schedule: {
          id: 'schedule',
          moduleId: 'execution',
          label: '日程',
          description: '安排今天、查看任务落位。',
          icon: 'fa-calendar-days',
          route: 'execution-domain',
          primarySection: 'workflow-section',
          keywords: ['时间块', '日程', 'schedule'],
          discoveryPriority: 98
        },
      };
      if (presets[entryId]) {
        const preset = presets[entryId];
        return {
          ...preset,
          domainLabel: domainLabelForRoute(preset.route),
          enabled: isModuleEnabled(preset.moduleId),
          pinned: (state.ui?.pinnedModules || []).includes(entryId)
        };
      }
      const meta = moduleMeta(entryId);
      if (!meta) return null;
      const labelMap = {
        research: copy.thesisLabel,
        mentor: copy.guidanceLabel
      };
      return {
        id: meta.id,
        moduleId: meta.id,
        label: labelMap[meta.id] || meta.entryLabel || meta.label,
        description: meta.description,
        icon: meta.icon,
        route: meta.route,
        primarySection: meta.primarySection || meta.sections?.[0] || meta.route,
        keywords: meta.keywords || [],
        discoveryPriority: meta.discoveryPriority || 50,
        domainLabel: domainLabelForRoute(meta.route),
        enabled: isModuleEnabled(meta.id),
        pinned: (state.ui?.pinnedModules || []).includes(entryId)
      };
    }

    function launcherEntryOrder() {
      const ordered = [];
      const byModuleOrder = Array.isArray(state.ui?.moduleOrder) ? state.ui.moduleOrder : MODULE_ORDER_DEFAULT;
      byModuleOrder.forEach(id => {
        if (id === 'execution') ordered.push('execution', 'schedule');
        else ordered.push(id);
      });
      LAUNCHER_ENTRY_DEFAULT.forEach(id => {
        if (!ordered.includes(id)) ordered.push(id);
      });
      return ordered.filter((id, index, list) => list.indexOf(id) === index);
    }

    function recommendedLauncherEntries(date = todayStr()) {
      const picks = [];
      const pushPick = (id) => {
        if (!id || picks.includes(id)) return;
        const meta = launcherEntryMeta(id);
        if (!meta?.enabled) return;
        picks.push(id);
      };
      if (openTasksList().some(task => task.dueDate && task.dueDate <= date) || todayExecutionTasks(date).some(task => task.status !== 'done')) pushPick('execution');
      if ((getDayTimeBlocks(date) || []).length || todayExecutionTasks(date).some(task => task.todayBucket === 'must' || task.todayBucket === 'should')) pushPick('schedule');
      if ((state.thesis?.milestones || []).some(item => !item.done && item.due && diffDays(date, item.due) >= 0 && diffDays(date, item.due) <= 14)) pushPick('research');
      if (state.submissions.some(item => item.deadline && !['已接收','已见刊/已收录','搁置/拒稿'].includes(item.stage) && diffDays(date, item.deadline) >= 0 && diffDays(date, item.deadline) <= 14)) pushPick('submissions');
      if (isModuleEnabled('mentor') && mentorPendingItems(date).length) pushPick('mentor');
      if (isModuleEnabled('care') && !careCountOn(date)) pushPick('care');
      if (isModuleEnabled('wellbeing') && todayHabitCompletion(date) < 50) pushPick('wellbeing');
      if (isModuleEnabled('review') && reviewPriorityCount(dailyReviewEntryOn(date)) < 2) pushPick('review');
      if (!picks.length) {
        launcherEntryOrder().forEach(id => {
          const meta = launcherEntryMeta(id);
          if (meta?.enabled && picks.length < 4) pushPick(id);
        });
      }
      return picks.slice(0, 4);
    }

    function launcherStatusSummary() {
      const recs = recommendedLauncherEntries();
      const recentCount = (state.ui?.recentModules || []).map(launcherEntryMeta).filter(entry => entry?.enabled).length;
      if (recs.length) return `优先看 ${recs.length} 个推荐入口，最近使用已记录 ${recentCount} 条。`;
      return recentCount ? `已记录最近使用 ${recentCount} 条，你可以直接继续上次的工作。` : '先选择一个入口开始，之后这里会自动记住你的常用路径。';
    }

    function renderLauncherEntryCard(entry, { compact=false, reason='' } = {}) {
      if (!entry) return '';
      const statusClass = entry.enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-200 text-slate-500';
      const statusText = entry.enabled ? '已启用' : '未启用';
      const actionText = entry.enabled ? '进入' : '启用并进入';
      const actionAttr = entry.enabled ? `data-launcher-enter="${entry.id}"` : `data-launcher-enable="${entry.id}"`;
      const cardClass = [
        'launcher-entry-card',
        compact ? 'is-compact px-3 py-3' : 'px-4 py-4',
        entry.enabled ? '' : 'is-disabled'
      ].join(' ').trim();
      return `
        <div class="${cardClass}">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-3 font-black text-slate-900">
                <span class="launcher-entry-icon">${faIcon(entry.icon)}</span>
                <span>${escapeHtml(entry.label)}</span>
              </div>
              <div class="text-sm mt-3 leading-6 ${entry.enabled ? 'text-calm-mute' : 'text-slate-500'}">${escapeHtml(entry.description)}</div>
            </div>
            <button class="launcher-entry-pin w-10 h-10 text-slate-500" data-launcher-pin="${entry.id}" title="${entry.pinned ? '取消置顶' : '置顶入口'}">
              <i class="fa-${entry.pinned ? 'solid' : 'regular'} fa-star"></i>
            </button>
          </div>
          <div class="flex flex-wrap items-center gap-2 mt-4">
            <span class="launcher-chip ${statusClass}">${statusText}</span>
            <span class="launcher-chip bg-slate-100 text-slate-600">${escapeHtml(entry.domainLabel)}</span>
            ${reason ? `<span class="launcher-chip bg-sky-50 text-sky-700">${escapeHtml(reason)}</span>` : ''}
          </div>
          <div class="flex items-center justify-between gap-3 mt-4">
            <div class="text-xs ${entry.enabled ? 'text-calm-mute' : 'text-slate-500'}">${escapeHtml((entry.keywords || []).slice(0, 3).join(' / '))}</div>
            <button class="launcher-entry-action ${entry.enabled ? 'primary' : 'secondary'} text-sm" ${actionAttr}>${actionText}</button>
          </div>
        </div>
      `;
    }

    function bindLauncherActions(scope=document) {
      scope.querySelectorAll('[data-launcher-enter]').forEach(btn => {
        btn.onclick = () => openLauncherEntry(btn.dataset.launcherEnter);
      });
      scope.querySelectorAll('[data-launcher-enable]').forEach(btn => {
        btn.onclick = () => openLauncherEntry(btn.dataset.launcherEnable);
      });
      scope.querySelectorAll('[data-launcher-pin]').forEach(btn => {
        btn.onclick = (event) => {
          event.stopPropagation();
          togglePinnedModule(btn.dataset.launcherPin);
        };
      });
    }

    function renderSidebarLauncherRail() {
      return;
    }

    function renderLauncherHub() {
      const recentHost = $('launcherRecentList');
      const recommendedHost = $('launcherRecommendedList');
      const directoryHost = $('launcherDirectoryList');
      if (!recentHost || !recommendedHost || !directoryHost) return;
      const visibleEntry = entry => entry?.enabled;
      const directoryEntries = launcherEntryOrder().map(launcherEntryMeta).filter(visibleEntry);
      const recentEntries = (state.ui?.recentModules || []).map(launcherEntryMeta).filter(visibleEntry).slice(0, 5);
      const pinnedEntries = (state.ui?.pinnedModules || []).map(launcherEntryMeta).filter(visibleEntry).slice(0, 5);
      const recommendedEntries = recommendedLauncherEntries().map(launcherEntryMeta).filter(visibleEntry);

      if ($('launcherProfileSummary')) $('launcherProfileSummary').textContent = workspaceCopy().profileLabel;
      if ($('launcherStatusSummary')) $('launcherStatusSummary').textContent = launcherStatusSummary();
      if ($('launcherDirectoryCount')) $('launcherDirectoryCount').textContent = `${directoryEntries.length} 个入口`;
      if ($('launcherRecentCount')) $('launcherRecentCount').textContent = `${recentEntries.length} 个`;
      if ($('launcherRecommendedCount')) $('launcherRecommendedCount').textContent = `${recommendedEntries.length} 个`;
      if ($('launcherPinnedCount')) $('launcherPinnedCount').textContent = `${pinnedEntries.length} 个`;
      if ($('launcherDisabledCount')) $('launcherDisabledCount').textContent = '0 个';

      recentHost.innerHTML = recentEntries.map(entry => renderLauncherEntryCard(entry, { compact:true })).join('') || '<div class="list-empty-state text-sm text-calm-mute">还没有最近使用记录，先从右侧目录进入一个功能。</div>';
      recommendedHost.innerHTML = recommendedEntries.map(entry => {
        let reason = '推荐';
        if (entry.id === 'submissions') reason = '截止临近';
        else if (entry.id === 'mentor') reason = '待跟进';
        else if (entry.id === 'care' || entry.id === 'wellbeing') reason = '恢复优先';
        else if (entry.id === 'schedule') reason = '安排今天';
        return renderLauncherEntryCard(entry, { compact:true, reason });
      }).join('') || '<div class="list-empty-state text-sm text-calm-mute">今天没有特别突出的入口，你可以从目录继续推进最重要的模块。</div>';
      if ($('launcherPinnedList')) $('launcherPinnedList').innerHTML = pinnedEntries.map(entry => renderLauncherEntryCard(entry, { compact:true })).join('') || '<div class="list-empty-state text-sm text-calm-mute">把常用模块置顶后，这里会形成你的固定入口带。</div>';
      directoryHost.innerHTML = directoryEntries.map(entry => renderLauncherEntryCard(entry)).join('');
      if ($('launcherDisabledList')) $('launcherDisabledList').innerHTML = '<div class="list-empty-state text-sm text-calm-mute">隐藏模块只在设置的模块中心重新开启。</div>';
      bindLauncherActions(document);
    }

    function buildHomePriorityItems(date = todayStr()) {
      const items = [];
      const priorityTasks = openTasksList()
        .filter(task => task.todayBucket === 'must' || task.todayBucket === 'should' || (task.dueDate && task.dueDate <= date))
        .sort((a, b) => {
          const aRank = a.todayBucket === 'must' ? 0 : a.todayBucket === 'should' ? 1 : 2;
          const bRank = b.todayBucket === 'must' ? 0 : b.todayBucket === 'should' ? 1 : 2;
          return aRank - bRank || (a.dueDate || '9999-99-99').localeCompare(b.dueDate || '9999-99-99');
        })
        .slice(0, 4);
      priorityTasks.forEach(task => items.push({
        tone: 'rose',
        title: task.title,
        detail: `${taskStatusMeta(task.status).label}${task.dueDate ? ` · 截止 ${task.dueDate}` : ' · 统一任务源'}`,
        target: 'execution-section'
      }));
      if (isModuleEnabled('research')) {
        const milestone = (state.thesis?.milestones || [])
          .filter(item => !item.done)
          .sort((a, b) => (a.due || '9999-99-99').localeCompare(b.due || '9999-99-99'))[0];
        if (milestone) items.push({
          tone: 'purple',
          title: `研究里程碑：${milestone.name}`,
          detail: milestone.due ? `最近截止 ${milestone.due}` : '尚未设置截止',
          target: 'thesis-section'
        });
      }
      if (isModuleEnabled('submissions')) {
        const nextSubmission = state.submissions
          .filter(item => !['已接收','已见刊/已收录','搁置/拒稿'].includes(item.stage) && item.deadline)
          .sort((a, b) => a.deadline.localeCompare(b.deadline))[0];
        if (nextSubmission) items.push({
          tone: 'sky',
          title: `投稿推进：${nextSubmission.title}`,
          detail: `${nextSubmission.stage} · 截止 ${nextSubmission.deadline}`,
          target: 'submission-section'
        });
      }
      if (isModuleEnabled('mentor')) {
        const mentorPending = mentorPendingItems(date)[0];
        const guidanceLabel = workspaceCopy().guidanceLabel;
        if (mentorPending) items.push({
          tone: 'amber',
          title: `${guidanceLabel}待跟进：${mentorPending.entry.commitment.slice(0, 30)}`,
          detail: mentorPending.entry.followupDate ? `核对日期 ${mentorPending.entry.followupDate}` : '建议今天确认下一步',
          target: 'mentor-section'
        });
      }
      return items.slice(0, 6);
    }

    function buildHomeRiskItems(date = todayStr()) {
      const items = [];
      const overdueTasks = openTasksList().filter(task => task.dueDate && task.dueDate < date);
      if (overdueTasks.length) {
        items.push({
          tone: 'rose',
          title: `有 ${overdueTasks.length} 项任务已逾期`,
          detail: overdueTasks.slice(0, 2).map(task => task.title).join('；'),
          target: 'execution-section'
        });
      }
      const dueSoonSubmissions = isModuleEnabled('submissions')
        ? state.submissions.filter(item => item.deadline && !['已接收','已见刊/已收录','搁置/拒稿'].includes(item.stage) && diffDays(date, item.deadline) >= 0 && diffDays(date, item.deadline) <= 7)
        : [];
      if (dueSoonSubmissions.length) {
        items.push({
          tone: 'orange',
          title: `有 ${dueSoonSubmissions.length} 个投稿截止临近`,
          detail: dueSoonSubmissions.slice(0, 2).map(item => `${item.title} · ${item.deadline}`).join('；'),
          target: 'submission-section'
        });
      }
      const overdueMentor = isModuleEnabled('mentor') ? mentorPendingItems(date).filter(item => item.entry.followupDate && item.entry.followupDate < date) : [];
      if (overdueMentor.length) {
        items.push({
          tone: 'purple',
          title: `有 ${overdueMentor.length} 条${workspaceCopy().guidanceLabel}承诺已超期`,
          detail: overdueMentor[0]?.entry?.commitment || '建议优先确认下一步',
          target: 'mentor-section'
        });
      }
      const careEnabled = isModuleEnabled('care');
      const wellbeingEnabled = isModuleEnabled('wellbeing');
      const recoveryGap = recentDates(3).every(day => (!careEnabled || !careCountOn(day)) && (!wellbeingEnabled || todayHabitCompletion(day) < 40));
      if ((careEnabled || wellbeingEnabled) && recoveryGap) {
        items.push({
          tone: 'mint',
          title: '连续 3 天恢复动作偏少',
          detail: careEnabled ? '建议先补一条心灵关怀记录。' : '建议先补一个习惯或恢复动作。',
          target: careEnabled ? 'care-section' : 'wellbeing-section'
        });
      } else if ((careEnabled && !careCountOn(date)) || (wellbeingEnabled && todayHabitCompletion(date) < 40)) {
        items.push({
          tone: 'mint',
          title: '今天的恢复记录还不完整',
          detail: [
            careEnabled ? `关怀 ${careCountOn(date) ? '已写' : '未写'}` : null,
            wellbeingEnabled ? `习惯完成 ${todayHabitCompletion(date)}%` : null
          ].filter(Boolean).join(' · '),
          target: careEnabled && !careCountOn(date) ? 'care-section' : 'wellbeing-section'
        });
      }
      return items.slice(0, 5);
    }

    function buildHomeTimelineItems(date = todayStr()) {
      const items = [];
      const attendanceLogs = isModuleEnabled('wellbeing') ? sortByTime(getDayAttendance(date).logs || []).map(log => ({
        time: log.start,
        title: `打卡：${log.note || '工作记录'}`,
        detail: `${log.start}${log.end ? ` - ${log.end}` : ' - 进行中'}`,
        target: 'wellbeing-section'
      })) : [];
      const blocks = isModuleEnabled('execution') ? sortByTime(getDayTimeBlocks(date) || []).map(block => ({
        time: block.start,
        title: `时间块：${block.title}`,
        detail: `${block.start} - ${block.end}`,
        target: 'workflow-section'
      })) : [];
      const focus = isModuleEnabled('execution') ? sortByTime(state.focus.sessions.filter(item => item.date === date), 'start').map(item => ({
        time: item.start,
        title: `专注：${item.title}`,
        detail: `${item.start} - ${item.end} · ${formatMinutes(item.minutes)}`,
        target: 'execution-section'
      })) : [];
      return [...attendanceLogs, ...blocks, ...focus].sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99')).slice(0, 6);
    }

    function renderHomeCommandDeck() {
      const priorities = buildHomePriorityItems();
      const risks = buildHomeRiskItems();
      const timeline = buildHomeTimelineItems();
      if ($('homePriorityBadge')) $('homePriorityBadge').textContent = `${priorities.length} 项`;
      if ($('homeRiskBadge')) $('homeRiskBadge').textContent = `${risks.length} 条`;
      if ($('homeTimelineBadge')) $('homeTimelineBadge').textContent = `${timeline.length} 条`;
      if ($('homePriorityList')) $('homePriorityList').innerHTML = priorities.map(item => `
        <button class="home-signal-card w-full text-left px-4 py-3" data-home-target="${item.target}">
          <div class="font-black ${item.tone === 'rose' ? 'text-rose-600' : item.tone === 'purple' ? 'text-dopamine-purple' : item.tone === 'sky' ? 'text-dopamine-sky' : item.tone === 'amber' ? 'text-amber-700' : 'text-dopamine-mint'}">${escapeHtml(item.title)}</div>
          <div class="text-calm-mute mt-1">${escapeHtml(item.detail)}</div>
        </button>
      `).join('') || '<div class="list-empty-state text-sm text-calm-mute">今天的主线还比较干净，可以主动安排高价值推进。</div>';
      if ($('homeRiskList')) $('homeRiskList').innerHTML = risks.map(item => `
        <button class="home-signal-card w-full text-left px-4 py-3" data-home-target="${item.target}">
          <div class="font-black">${escapeHtml(item.title)}</div>
          <div class="text-calm-mute mt-1">${escapeHtml(item.detail)}</div>
        </button>
      `).join('') || '<div class="list-empty-state text-sm text-calm-mute">当前没有明显风险暴露，可以把注意力留给主动推进。</div>';
      if ($('homeTimelineList')) $('homeTimelineList').innerHTML = timeline.map(item => `
        <button class="home-signal-card w-full text-left px-4 py-3" data-home-target="${item.target}">
          <div class="flex items-center justify-between gap-3">
            <div class="font-black">${escapeHtml(item.title)}</div>
            <div class="text-xs text-calm-mute mono">${escapeHtml(item.time || '--:--')}</div>
          </div>
          <div class="text-calm-mute mt-1">${escapeHtml(item.detail)}</div>
        </button>
      `).join('') || '<div class="list-empty-state text-sm text-calm-mute">今天还没有形成可读的时间线，先新增一条日程吧。</div>';
      if ($('homeQuickActionStatus')) {
        const statusParts = [];
        if (isModuleEnabled('mentor')) {
          const mentorReady = !!mentorEntryOn(todayStr()).nextAction.trim();
          statusParts.push(`${workspaceCopy().guidanceLabel}下一步${mentorReady ? '已可生成' : '未填写'}`);
        }
        if (isModuleEnabled('review')) {
          const reviewReady = reviewPriorityCount(dailyReviewEntryOn(todayStr()));
          statusParts.push(`明日优先${reviewReady ? `已写 ${reviewReady} 条` : '未填写'}`);
        }
        $('homeQuickActionStatus').textContent = statusParts.join(' · ') || '你可以从这里快速把今天的动作收束进系统。';
      }
      if ($('btnHomeMentorTask')) $('btnHomeMentorTask').classList.toggle('hidden', !isModuleEnabled('mentor'));
      if ($('btnHomeReviewTasks')) $('btnHomeReviewTasks').classList.toggle('hidden', !isModuleEnabled('review'));
      document.querySelectorAll('[data-home-target]').forEach(el => el.onclick = () => navTo(el.dataset.homeTarget));
    }

    function renderHomeQuickLinks() {
      const host = $('homeQuickLinks');
      if (!host) return;
      const copy = workspaceCopy();
      const cards = [
        { target:'wellbeing-section', module:'wellbeing', label:'开始 / 结束打卡', value:`今日 ${formatMinutes(totalAttendanceMinutes())}`, icon:'fa-heart-pulse' },
        { target:'thesis-section', module:'research', label:'记录论文日志', value:`进度 ${thesisOverallProgress()}%`, icon:'fa-book-open' },
        { target:'submission-section', module:'submissions', label:'记录投稿进展', value:`进行中 ${runningSubmissionCount()} 项`, icon:'fa-paper-plane' },
        { target:'review-section', module:'review', label:'写复盘', value:`明日优先 ${reviewPriorityCount(dailyReviewEntryOn(todayStr()))} 条`, icon:'fa-clipboard-check' },
        { target:'mentor-section', module:'mentor', label:`记录${copy.guidanceLabel}`, value:`待跟进 ${mentorPendingItems(todayStr()).length} 条`, icon:'fa-user-tie' },
        { target:'workflow-section', module:'execution', label:'新增日程', value:`今日 ${getDayTimeBlocks(todayStr()).length} 条`, icon:'fa-calendar-days' }
      ].filter(card => isModuleEnabled(card.module)).slice(0, 6);
      host.innerHTML = cards.map(card => `
        <button class="cockpit-action-btn" data-target="${card.target}">
          <i class="fa-solid ${card.icon}"></i>
          <span>${escapeHtml(card.label)}</span>
          <small>${escapeHtml(card.value)}</small>
        </button>
      `).join('');
      host.querySelectorAll('[data-target]').forEach(el => el.onclick = () => navTo(el.dataset.target));
    }

    function renderResearchOverview() {
      if (!$('researchOverviewList')) return;
      const copy = workspaceCopy();
      const thesisMilestones = (state.thesis?.milestones || [])
        .filter(item => !item.done)
        .map(item => ({
          sortDate: item.due || '9999-99-99',
          title: `研究里程碑：${item.name}`,
          detail: item.due ? `截止 ${item.due}` : '未设置截止',
          target: 'thesis-section'
        }));
      const thesisChapters = (state.thesis?.chapters || [])
        .filter(item => item.updatedAt)
        .slice(0, 3)
        .map(item => ({
          sortDate: dateFromDateTime(item.updatedAt) || todayStr(),
          title: `章节更新：${item.name}`,
          detail: `${item.progress || 0}% · ${item.status === 'done' ? '完成' : item.status === 'revise' ? '修改中' : '草稿'}`,
          target: 'thesis-section'
        }));
      const submissionItems = isModuleEnabled('submissions')
        ? state.submissions
          .filter(item => !['已接收','已见刊/已收录','搁置/拒稿'].includes(item.stage))
          .map(item => ({
            sortDate: item.deadline || dateFromDateTime(item.updatedAt || item.createdAt) || todayStr(),
            title: `投稿推进：${item.title}`,
            detail: `${item.stage}${item.deadline ? ` · 截止 ${item.deadline}` : ''}`,
            target: 'submission-section'
          }))
        : [];
      const items = [...thesisMilestones, ...thesisChapters, ...submissionItems]
        .sort((a, b) => (a.sortDate || '9999-99-99').localeCompare(b.sortDate || '9999-99-99'))
        .slice(0, 8);
      if ($('researchOverviewBadge')) $('researchOverviewBadge').textContent = `${items.length} 条`;
      if ($('researchOverviewStats')) $('researchOverviewStats').innerHTML = [
        { label: '研究总体进度', value: `${thesisOverallProgress()}%`, color: 'text-dopamine-purple' },
        { label: '未完成里程碑', value: (state.thesis?.milestones || []).filter(item => !item.done).length, color: 'text-dopamine-orange' },
        { label: '进行中投稿', value: isModuleEnabled('submissions') ? runningSubmissionCount() : '已隐藏', color: 'text-dopamine-sky' },
        { label: copy.thesisLabel, value: state.thesis?.meta?.version || '未填写', color: 'text-dopamine-pink' }
      ].map(item => `
        <div class="small-stat p-4">
          <div class="text-sm text-calm-mute">${item.label}</div>
          <div class="text-2xl font-black mt-1 ${item.color}">${escapeHtml(String(item.value))}</div>
        </div>
      `).join('');
      $('researchOverviewList').innerHTML = items.map(item => `
        <button class="w-full text-left rounded-2xl border border-calm-line bg-white px-4 py-3 hover:border-dopamine-purple transition" data-home-target="${item.target}">
          <div class="font-black">${escapeHtml(item.title)}</div>
          <div class="text-sm text-calm-mute mt-1">${escapeHtml(item.detail)}</div>
        </button>
      `).join('') || '<div class="text-sm text-calm-mute">还没有科研推进事件，先在论文或投稿模块补一条推进记录吧。</div>';
      $('researchOverviewList').querySelectorAll('[data-home-target]').forEach(el => el.onclick = () => navTo(el.dataset.homeTarget));
    }

    function renderSupportOverview() {
      if (!$('supportOverviewList')) return;
      const today = todayStr();
      const review = dailyReviewEntryOn(today);
      const careEnabled = isModuleEnabled('care');
      const care = careEnabled ? careEntryOn(today) : null;
      const mentorPending = isModuleEnabled('mentor') ? mentorPendingItems(today) : [];
      const guidanceLabel = workspaceCopy().guidanceLabel;
      const items = [];
      mentorPending.slice(0, 3).forEach(item => items.push({
        title: `${guidanceLabel}承诺：${item.entry.commitment.slice(0, 36)}`,
        detail: item.entry.followupDate ? `核对日期 ${item.entry.followupDate}` : '建议补一条跟进动作',
        target: 'mentor-section'
      }));
      if (isModuleEnabled('review')) {
        review.tomorrow.filter(item => String(item || '').trim()).slice(0, 3).forEach((item, index) => items.push({
          title: `明日优先 ${index + 1}：${item}`,
          detail: '来自结构化复盘',
          target: 'review-section'
        }));
      }
      if (careEnabled && !careCountOn(today)) {
        items.push({ title: '今天还没有心灵关怀记录', detail: '先补压力、能量和一个恢复动作。', target: 'care-section' });
      } else if (careEnabled && care.stress >= 4) {
        items.push({ title: `今天压力偏高：${care.stress}/5`, detail: '建议先做恢复动作，再安排高负荷推进。', target: 'care-section' });
      }
      if ($('supportOverviewBadge')) $('supportOverviewBadge').textContent = `${items.length} 条`;
      if ($('supportOverviewStats')) $('supportOverviewStats').innerHTML = [
        { label: `待跟进${guidanceLabel}`, value: isModuleEnabled('mentor') ? mentorPending.length : '已隐藏', color: 'text-dopamine-purple' },
        { label: '今日明日优先', value: isModuleEnabled('review') ? reviewPriorityCount(review) : '已隐藏', color: 'text-dopamine-pink' },
        careEnabled ? { label: '今日关怀记录', value: careCountOn(today) ? '已写' : '未写', color: 'text-dopamine-mint' } : null,
        { label: '等待反馈状态', value: isModuleEnabled('mentor') ? Object.values(state.mentor?.entries || {}).filter(entry => entry.status === 'waiting').length : '已隐藏', color: 'text-dopamine-sky' }
      ].filter(Boolean).map(item => `
        <div class="small-stat p-4">
          <div class="text-sm text-calm-mute">${item.label}</div>
          <div class="text-2xl font-black mt-1 ${item.color}">${escapeHtml(String(item.value))}</div>
        </div>
      `).join('');
      $('supportOverviewList').innerHTML = items.map(item => `
        <button class="w-full text-left rounded-2xl border border-calm-line bg-white px-4 py-3 hover:border-dopamine-purple transition" data-home-target="${item.target}">
          <div class="font-black">${escapeHtml(item.title)}</div>
          <div class="text-sm text-calm-mute mt-1">${escapeHtml(item.detail)}</div>
        </button>
      `).join('') || '<div class="text-sm text-calm-mute">当前支持域没有待处理项，记得继续维持低成本的恢复和记录。</div>';
      $('supportOverviewList').querySelectorAll('[data-home-target]').forEach(el => el.onclick = () => navTo(el.dataset.homeTarget));
    }

    function renderHomeThemeStats() {
      const host = $('homeThemeStats');
      if (!host) return;
      const range = getStatsRange(todayStr());
      if ($('homeStatsRangeLabel')) $('homeStatsRangeLabel').textContent = range.label;
      const days = Math.max(1, range.dates.length);
      const focusMins = range.dates.reduce((sum, d) => sum + focusMinutesOn(d), 0);
      const workMins = range.dates.reduce((sum, d) => sum + totalAttendanceMinutes(d), 0);
      const avgHabit = Math.round(range.dates.reduce((sum, d) => sum + todayHabitCompletion(d), 0) / days);
      const careEntries = isModuleEnabled('care') ? range.dates.reduce((sum, d) => sum + careCountOn(d), 0) : 0;
      const mentorEntries = range.dates.reduce((sum, d) => sum + mentorCountOn(d), 0);
      const reviewEntries = range.dates.reduce((sum, d) => sum + reviewCountOn(d), 0);
      const doneTasks = state.tasks.filter(t => t.doneAt && isDateInRange(dateFromDateTime(t.doneAt), range.start, range.end)).length;
      const newSubs = state.submissions.filter(s => s.createdAt && isDateInRange(dateFromDateTime(s.createdAt), range.start, range.end)).length;
      const cards = [
        { label:`${statsModeText()}专注`, value: formatMinutes(focusMins), color:'text-dopamine-orange' },
        { label:`${statsModeText()}打卡`, value: formatMinutes(workMins), color:'text-dopamine-sky' },
        { label:`${statsModeText()}习惯均值`, value: `${avgHabit}%`, color:'text-dopamine-mint' },
        isModuleEnabled('care') ? { label:`${statsModeText()}心灵关怀`, value: careEntries, color:'text-dopamine-mint' } : null,
        isModuleEnabled('mentor') ? { label:`${statsModeText()}${workspaceCopy().guidanceLabel}`, value: mentorEntries, color:'text-dopamine-purple' } : null,
        isModuleEnabled('review') ? { label:`${statsModeText()}复盘`, value: reviewEntries, color:'text-dopamine-pink' } : null,
        { label:`${statsModeText()}完成任务`, value: doneTasks, color:'text-dopamine-purple' },
        isModuleEnabled('submissions') ? { label:`${statsModeText()}新增投稿`, value: newSubs, color:'text-dopamine-sky' } : null
      ].filter(Boolean);
      host.innerHTML = cards.map(item => `
        <div class="metric-tile p-4">
          <div class="text-sm text-calm-mute">${item.label}</div>
          <div class="metric-value font-black mt-2 ${item.color}">${escapeHtml(String(item.value))}</div>
        </div>
      `).join('');
    }

    function addWorkLog() {
      const day = getDayAttendance();
      day.logs.push({ id:uid('work'), date:todayStr(), start:nowTime(), end:null, note:'', arriveMood:'', leaveMood:'' });
      saveState(); renderAll();
    }
    function endWorkLog() {
      const open = [...todayOpenLogs()].pop();
      if (!open) { alert('今天没有进行中的工作段。'); return; }
      open.end = nowTime();
      saveState(); renderAll();
    }
    function showAttendanceMoodPicker(slotKey, action) {
      const slot = attendanceSlotMeta(slotKey);
      if (!slot) return;
      attendanceMoodPending = { slotKey, action };
      $('attendanceMoodTitle').textContent = `${slot.label}${action === 'arrive' ? '到岗' : '离岗'}`;
      $('attendanceMoodSubtitle').textContent = action === 'arrive' ? '到岗时，你的心情是？' : '离岗时，感觉怎么样？';
      const grid = $('attendanceMoodGrid');
      if (!grid || !$('attendanceMoodPicker')) return;
      grid.innerHTML = ATTENDANCE_MOODS.map(item => `<button type="button" class="mood-opt-v3" data-mood="${item.value}"><span class="e">${faIcon(item.icon)}</span><span class="l">${escapeHtml(item.l)}</span></button>`).join('');
      grid.querySelectorAll('[data-mood]').forEach(btn => btn.onclick = () => confirmAttendanceMood(btn.dataset.mood));
      $('attendanceMoodPicker').classList.add('show');
    }
    function closeAttendanceMoodPicker() {
      $('attendanceMoodPicker').classList.remove('show');
      attendanceMoodPending = null;
    }
    function confirmAttendanceMood(mood) {
      const pending = attendanceMoodPending;
      if (!pending) return;
      const day = getDayAttendance();
      let item = findAttendanceLogBySlot(pending.slotKey);
      if (pending.action === 'arrive') {
        const permission = attendancePermission(pending.slotKey, item, nowTime());
        if (!permission.allowed || permission.action !== 'arrive') {
          closeAttendanceMoodPicker();
          alert(permission.message || '当前时段不可到岗打卡');
          return;
        }
        if (!item) {
          item = { id:uid('work'), date:todayStr(), start:nowTime(), end:null, note:attendanceSlotNote(pending.slotKey), arriveMood:mood, leaveMood:'' };
          day.logs.push(item);
        } else {
          item.start = item.start || nowTime();
          item.arriveMood = mood;
          item.note = attendanceSlotNote(pending.slotKey);
        }
      } else if (item && !item.end) {
        item.end = nowTime();
        item.leaveMood = mood;
        item.note = attendanceSlotNote(pending.slotKey);
      }
      closeAttendanceMoodPicker();
      saveState(); renderAll();
    }
    function toggleAttendanceSlot(slotKey) {
      const slot = attendanceSlotMeta(slotKey);
      if (!slot) return;
      const item = findAttendanceLogBySlot(slotKey);
      const permission = attendancePermission(slotKey, item, nowTime());
      if (!permission.allowed) {
        alert(permission.message || `${slot.label}当前不可打卡`);
        return;
      }
      if (permission.action === 'arrive') {
        showAttendanceMoodPicker(slotKey, 'arrive');
        return;
      }
      if (permission.action === 'leave') {
        showAttendanceMoodPicker(slotKey, 'leave');
        return;
      }
      alert(`${slot.label}时段已完成。如需修改，请在下方明细中点击“修改”。`);
    }
    function setAttendanceSlotButton(slotKey, log) {
      const btnIdMap = { morning:'btnCheckinMorning', midday:'btnCheckinMidday', evening:'btnCheckinEvening' };
      const btn = $(btnIdMap[slotKey]);
      const slot = attendanceSlotMeta(slotKey);
      const card = $(`card-${slotKey}`);
      if (!btn || !slot) return;
      if (card) card.className = 'period-card-v3';
      btn.disabled = false;
      btn.className = 'checkin-btn-v3 btn-arrive-v3';
      if (!log) {
        const permission = attendancePermission(slotKey, null, nowTime());
        if (permission.allowed) {
          btn.innerHTML = `${faIcon('fa-right-to-bracket')} 到岗`;
          btn.disabled = false;
          btn.title = '';
        } else if (permission.reason === 'outside-window') {
          btn.innerHTML = permission.phase || '未到时段';
          btn.disabled = true;
          btn.title = `${slot.label}仅允许在 ${slotWindowLabel(slotKey)} 到岗打卡`;
        } else {
          btn.innerHTML = '不可打卡';
          btn.disabled = true;
          btn.title = permission.message || '';
        }
        return;
      }
      if (card) card.classList.add('has-checkin');
      if (!log.end) {
        const permission = attendancePermission(slotKey, log, nowTime());
        if (permission.allowed) {
          btn.className = 'checkin-btn-v3 btn-leave-v3 enabled';
          btn.innerHTML = '离岗 →';
          btn.disabled = false;
          btn.title = '';
        } else {
          btn.className = 'checkin-btn-v3 btn-leave-v3';
          btn.innerHTML = '请修正记录';
          btn.disabled = true;
          btn.title = permission.message || '';
        }
        return;
      }
      if (card) { card.classList.remove('has-checkin'); card.classList.add('completed'); }
      btn.className = 'checkin-btn-v3 btn-complete-v3';
      btn.innerHTML = `${faIcon('fa-check')} 已完成`;
      btn.disabled = true;
    }
    function addLeave() {
      const day = getDayAttendance();
      day.leaves.push({ id:uid('leave'), date:todayStr(), type:$('leaveTypeSelect').value || '其他' });
      saveState(); renderAll();
    }
    function closeAllOpenLogs() {
      const now = nowTime();
      todayOpenLogs().forEach(log => { log.end = now; });
      saveState(); renderAll();
    }
    function clearTodayLeaves() {
      getDayAttendance().leaves = [];
      saveState(); renderAll();
    }

    function renderHomeAttendance() {
      const day = getDayAttendance();
      const slotState = getAttendanceSlotLogs();
      const completedCount = slotState.slots.filter(item => item.log?.end).length;
      const moodCount = slotState.slots.reduce((sum, item) => sum + (item.log?.arriveMood ? 1 : 0) + (item.log?.leaveMood ? 1 : 0), 0);
      $('todayCheckinCount').textContent = `${completedCount}/3`;
      $('todayWorkMinutes').textContent = formatMinutes(totalAttendanceMinutes());
      if ($('todayMoodCount')) $('todayMoodCount').textContent = `${moodCount}/6`;
      $('todayLeaveCount').textContent = String(day.leaves.length);
      slotState.slots.forEach(item => setAttendanceSlotButton(item.key, item.log));
      const logHtml = slotState.slots.map(item => {
        const log = item.log;
        const status = !log ? '未开始' : log.end ? '已完成' : '进行中';
        const tone = !log ? 'bg-gray-100 text-calm-mute' : log.end ? 'bg-emerald-100 text-emerald-700' : 'bg-sky-100 text-sky-700';
        const arriveMood = attendanceMoodMeta(log?.arriveMood);
        const leaveMood = attendanceMoodMeta(log?.leaveMood);
        const moodLine = !log ? '尚未打卡' : `到岗心情 ${arriveMood ? iconLabel(arriveMood.icon, arriveMood.l) : '—'}${log.leaveMood ? ` · 离岗心情 ${leaveMood ? iconLabel(leaveMood.icon, leaveMood.l) : escapeHtml(log.leaveMood)}` : ''}`;
        return `
        <div class="flex items-center justify-between gap-3 rounded-2xl bg-white px-3 py-3 border border-calm-line">
          <div>
            <div class="font-bold">${item.label} <span class="pill ml-2 ${tone}">${status}</span></div>
            <div class="text-xs text-calm-mute mt-1">${!log ? '尚未打卡' : `${log.start}${log.end ? ` - ${log.end}` : ' - 进行中'} · ${log.end ? formatMinutes(minutesBetween(log.start, log.end)) : '尚未结束'}`}</div>
            <div class="text-xs text-calm-mute mt-1">${moodLine}</div>
          </div>
          ${log ? `<button class="text-sm font-bold text-dopamine-orange" data-edit-log="${log.id}">修改</button>` : '<span class="text-xs text-calm-mute">待记录</span>'}
        </div>`;
      }).join('');
      const extraHtml = slotState.extras.map(log => `
        <div class="flex items-center justify-between gap-3 rounded-2xl bg-amber-50 px-3 py-3 border border-amber-100">
          <div>
            <div class="font-bold text-amber-700">额外记录 <span class="text-xs text-calm-mute">${log.start}${log.end ? ` - ${log.end}` : ' - 进行中'}</span></div>
            <div class="text-xs text-calm-mute mt-1">${log.end ? formatMinutes(minutesBetween(log.start, log.end)) : '尚未结束'}</div>
          </div>
          <button class="text-sm font-bold text-dopamine-orange" data-edit-log="${log.id}">修改</button>
        </div>
      `).join('');
      const leaveHtml = day.leaves.map(item => `
        <div class="flex items-center justify-between gap-3 rounded-2xl bg-purple-50 px-3 py-3 border border-purple-100">
          <div><div class="font-bold text-dopamine-purple">请假：${item.type}</div><div class="text-xs text-calm-mute">${item.date}</div></div>
          <button class="text-sm font-bold text-dopamine-orange" data-edit-leave="${item.id}">修改</button>
        </div>
      `).join('');
      $('todayAttendanceList').innerHTML = logHtml + extraHtml + leaveHtml || '<div class="text-calm-mute text-sm">今天还没有记录。可分别补上午、下午或晚上的打卡。</div>';
      $('todayAttendanceList').querySelectorAll('[data-edit-log]').forEach(btn => btn.onclick = () => openWorkLogEditor(btn.dataset.editLog));
      $('todayAttendanceList').querySelectorAll('[data-edit-leave]').forEach(btn => btn.onclick = () => openLeaveEditor(btn.dataset.editLeave));
    }

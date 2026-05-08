
    function bindEvents() {
      document.querySelectorAll('.nav-btn').forEach(btn => btn.onclick = () => navTo(btn.dataset.target));
      document.querySelectorAll('.stats-mode-btn').forEach(btn => btn.onclick = () => setStatsMode(btn.dataset.statsMode));
      $('btnSidebarToggle').onclick = toggleSidebar;
      if ($('btnMobileNavToggle')) $('btnMobileNavToggle').onclick = toggleMobileDrawer;
      if ($('mobileNavBackdrop')) $('mobileNavBackdrop').onclick = closeMobileDrawer;
      window.addEventListener('resize', syncResponsiveLayout);
      window.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMobileDrawer(); });

      $('btnSaveThesisMeta').onclick = saveThesisMeta;
      $('btnAddThesisMilestone').onclick = addThesisMilestone;
      $('btnAddThesisChapter').onclick = addThesisChapter;
      $('btnAddThesisLog').onclick = addThesisLog;
      $('thesisLogDate').value = todayStr();

      $('btnCheckinMorning').onclick = () => toggleAttendanceSlot('morning');
      $('btnCheckinMidday').onclick = () => toggleAttendanceSlot('midday');
      $('btnCheckinEvening').onclick = () => toggleAttendanceSlot('evening');
      if ($('attendanceMoodPicker')) $('attendanceMoodPicker').onclick = (e) => { if (e.target === $('attendanceMoodPicker')) closeAttendanceMoodPicker(); };
      $('btnLeaveAdd').onclick = addLeave;
      $('btnCloseOpenLogs').onclick = closeAllOpenLogs;
      $('btnClearTodayLeaves').onclick = clearTodayLeaves;

      if ($('reimbFileInput')) $('reimbFileInput').onchange = (e) => readFilesToArray(e.target.files, reimbPendingFiles, 'reimbFilePreview', 'reimbFileLabel');
      if ($('reimbDoneFileInput')) $('reimbDoneFileInput').onchange = (e) => readFilesToArray(e.target.files, reimbDoneFiles, 'reimbDoneFilePreview', 'reimbDoneFileLabel');
      if ($('btnAddReimb')) $('btnAddReimb').onclick = addReimb;
      if ($('btnCloseReimbDialog')) $('btnCloseReimbDialog').onclick = cancelReimbComplete;
      if ($('btnCancelReimbComplete')) $('btnCancelReimbComplete').onclick = cancelReimbComplete;
      if ($('btnConfirmReimbComplete')) $('btnConfirmReimbComplete').onclick = confirmReimbComplete;
      if ($('reimbCompleteDialog')) $('reimbCompleteDialog').addEventListener('click', (e) => {
        const dialog = $('reimbCompleteDialog');
        const rect = dialog.getBoundingClientRect();
        const inDialog = rect.top <= e.clientY && e.clientY <= rect.top + rect.height && rect.left <= e.clientX && e.clientX <= rect.left + rect.width;
        if (!inDialog) cancelReimbComplete();
      });

      $('workflowDate').value = todayStr();
      if ($('workflowProjectStartDate')) $('workflowProjectStartDate').value = todayStr();
      $('workflowDate').onchange = renderAll;
      $('btnWorkflowToday').onclick = () => { $('workflowDate').value = todayStr(); renderAll(); };
      $('btnWorkflowCapture').onclick = addWorkflowCaptureTask;
      $('btnAddWorkflowProject').onclick = addWorkflowProject;
      $('workflowCaptureText')?.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); addWorkflowCaptureTask(); } });
      ['workflowProjectTitle','workflowProjectOutcome'].forEach(id => $(id)?.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); addWorkflowProject(); } }));
      $('workflowTaskFilter').onchange = renderWorkflow;
      if ($('workflowProjectFilterSelect')) $('workflowProjectFilterSelect').onchange = () => { workflowSelectedProjectId = $('workflowProjectFilterSelect').value || ''; renderWorkflow(); };
      const jumpWorkflowToSchedule = () => {
        $('scheduleDate').value = $('workflowDate').value || todayStr();
        navTo('workflow-section');
        renderAll();
      };
      $('btnWorkflowJumpScheduleTop').onclick = jumpWorkflowToSchedule;

      $('btnAddTask').onclick = addTask;
      $('taskInput').addEventListener('keydown', e => { if (e.key === 'Enter') addTask(); });
      if ($('btnHomeOpenExecution')) $('btnHomeOpenExecution').onclick = () => navTo('workflow-section');
      if ($('btnOpenWorkspaceSettings')) $('btnOpenWorkspaceSettings').onclick = () => navTo('settings-section');
      if ($('btnHomeMentorTask')) $('btnHomeMentorTask').onclick = () => ensureMentorNextActionTaskForDate(todayStr());
      if ($('btnHomeReviewTasks')) $('btnHomeReviewTasks').onclick = () => createTomorrowTasksFromReview(todayStr());
      $('btnFocusStart').onclick = startFocus;
      $('btnFocusStop').onclick = stopFocus;
      $('btnFocusDiscard').onclick = discardFocus;
      $('manualFocusDate').value = todayStr();
      $('btnAddManualFocus').onclick = addManualFocus;
      $('scheduleDate').value = todayStr();
      $('scheduleDate').onchange = renderAll;
      $('btnScheduleToday').onclick = () => { $('scheduleDate').value = todayStr(); renderAll(); };
      $('scheduleTaskSelect').onchange = () => {
        const task = state.tasks.find(item => item.id === $('scheduleTaskSelect').value);
        if (!task) return;
        $('scheduleTaskTitle').value = task.title;
        if (parseHM($('scheduleTaskStart').value) && task.estimate) $('scheduleTaskEnd').value = addMinutesToHM($('scheduleTaskStart').value, task.estimate);
      };
      $('scheduleTaskStart').onchange = () => {
        const task = state.tasks.find(item => item.id === $('scheduleTaskSelect').value);
        if (task?.estimate && parseHM($('scheduleTaskStart').value)) $('scheduleTaskEnd').value = addMinutesToHM($('scheduleTaskStart').value, task.estimate);
      };
      $('btnAddTaskBlock').onclick = addScheduledTaskBlock;
      $('scheduleTaskTitle')?.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); addScheduledTaskBlock(); } });

      $('habitDate').value = todayStr();
      $('habitDate').onchange = renderAll;
      $('btnHabitToday').onclick = () => { $('habitDate').value = todayStr(); renderAll(); };
      $('btnAddHabit').onclick = addCustomHabit;
      $('btnAddFood').onclick = addFood;
      $('btnAddWeight').onclick = addWeight;

      $('careDate').value = todayStr();
      $('careDate').onchange = renderAll;
      $('btnCareToday').onclick = () => { $('careDate').value = todayStr(); renderAll(); };
      document.querySelectorAll('[data-care-mood]').forEach(btn => btn.onclick = () => {
        selectedCareMood = btn.dataset.careMood;
        document.querySelectorAll('[data-care-mood]').forEach(el => el.classList.toggle('active', el.dataset.careMood === selectedCareMood));
      });
      $('btnSaveCare').onclick = saveCareEntry;
      $('btnDeleteCare').onclick = () => { if (confirm('确定清空这天的心灵关怀记录吗？')) deleteCareEntry(); };

      $('mentorDate').value = todayStr();
      $('mentorDate').onchange = renderAll;
      $('btnMentorToday').onclick = () => { $('mentorDate').value = todayStr(); renderAll(); };
      $('btnSaveMentor').onclick = saveMentorEntry;
      ['mentorTopic','mentorEvidence','mentorAsk','mentorRisk','mentorFeedback','mentorCommitment','mentorConfirmation','mentorBoundary','mentorNextAction'].forEach(id => {
        $(id)?.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); saveMentorEntry(); } });
      });
      if ($('btnMentorNextActionTask')) $('btnMentorNextActionTask').onclick = () => ensureMentorNextActionTaskForDate($('mentorDate').value || todayStr());
      $('btnDeleteMentor').onclick = () => { if (confirm('确定清空这天的导师沟通记录吗？')) deleteMentorEntry(); };

      $('reviewDate').value = todayStr();
      $('reviewDate').onchange = renderAll;
      $('btnSaveDailyReview').onclick = saveDailyReview;
      ['reviewEnergyNote','reviewAccomplishments','reviewUnfinished','reviewInsights','reviewObstacles','reviewTomorrow1','reviewTomorrow2','reviewTomorrow3'].forEach(id => {
        $(id)?.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); saveDailyReview(); } });
      });
      if ($('btnReviewTomorrowTasks')) $('btnReviewTomorrowTasks').onclick = createTomorrowTasksFromReview;
      $('btnDeleteDailyReview').onclick = () => { if (confirm('确定清空这天的学术复盘吗？')) deleteDailyReview(); };
      $('btnDownloadReviewMd').onclick = downloadReviewMarkdown;
      $('btnReviewToday').onclick = () => { $('reviewDate').value = todayStr(); renderAll(); };

      $('btnToggleSubmissionForm').onclick = () => $('submissionFormWrap').classList.toggle('hidden');
      $('btnCancelSubmissionForm').onclick = () => $('submissionFormWrap').classList.add('hidden');
      $('btnAddSubmission').onclick = addSubmission;
      $('submissionFilterQuery').oninput = renderSubmissionBoard;
      $('submissionFilterMonth').onchange = renderSubmissionBoard;
      $('submissionFilterStage').onchange = renderSubmissionBoard;
      $('submissionLogDate').value = todayStr();
      $('submissionLogProject').onchange = renderSubmissionLogs;
      $('btnAddSubmissionLog').onclick = addSubmissionLog;
      $('submissionLogNote')?.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); addSubmissionLog(); } });
      $('btnDownloadSubmissionMd').onclick = downloadSubmissionMarkdown;

      $('dashboardRange').onchange = () => {
        const v = String($('dashboardRange').value || '');
        if (v === '7') setStatsMode('week');
        else if (v === '30') setStatsMode('month');
        else setStatsMode('day');
      };

      $('btnClearAllData').onclick = clearAllData;

      $('btnCloseEditDialog').onclick = closeEditDialog;
      $('btnSaveRecord').onclick = () => { if (editContext?.onSave) editContext.onSave(collectEditValues()); closeEditDialog(); };
      $('btnDeleteRecord').onclick = () => { if (editContext?.onDelete && confirm('确定删除这条记录吗？')) { editContext.onDelete(); closeEditDialog(); } };
    }

    window.PhdWorkbenchSyncAdapter = {
      getState: () => deepClone(state),
      normalizeState: (next) => buildStateFromParsed(next || {}),
      exportNormalizedState: () => buildStateFromParsed(deepClone(state)),
      replaceStateFromSync: (nextState, meta={}) => {
        window.PhdWorkbenchSyncAdapter._suppressLocalChange = true;
        replaceState(buildStateFromParsed(nextState || {}));
        const raw = serializeState();
        persistStateToLocal(raw);
        queueJsonFilePersist(raw);
        if (meta?.syncState) storageMeta.syncState = String(meta.syncState);
        window.PhdWorkbenchSyncAdapter._syncDirty = false;
        window.PhdWorkbenchSyncAdapter._suppressLocalChange = false;
        renderAll();
        setTimeout(() => migrateLegacyAttachmentsInState({ render: true }), 0);
      },
      applyState: (next, meta={}) => window.PhdWorkbenchSyncAdapter.replaceStateFromSync(next, meta),
      setStorageSyncState: (text) => { storageMeta.syncState = text || storageMeta.syncState; if (isSectionVisible('settings-section')) refreshSettings(); },
      onLocalChange: (handler) => { window.PhdWorkbenchSyncAdapter._onLocalChange = handler; },
      notifyLocalChange: () => {
        if (window.PhdWorkbenchSyncAdapter._suppressLocalChange) return;
        window.PhdWorkbenchSyncAdapter._syncDirty = true;
        window.PhdWorkbenchSyncAdapter._dirtyAt = Date.now();
        window.PhdWorkbenchSyncAdapter._onLocalChange?.();
      }
    };

    bindEvents();
    loadPrefs();
    navTo(currentSection);
    syncResponsiveLayout();
    hydrateStateFromJson().finally(() => migrateLegacyAttachmentsInState({ render: true }));
    updateClock();
    setInterval(updateClock, 1000);

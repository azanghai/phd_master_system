const STORAGE_KEY = 'phd_master_workspace_merged_v1';
    const STORAGE_FILE_NAME = 'workspace-data.json';
    const SUBMISSION_COLUMNS = ['选题中','写作中','待投稿','已投稿','审稿中','返修中','已接收','已见刊/已收录','搁置/拒稿'];
    const STAGE_COLORS = {
      '选题中':'#9B5DE5','写作中':'#FF8C42','待投稿':'#4D9DE0','已投稿':'#43AA8B','审稿中':'#3b82f6','返修中':'#f97316','已接收':'#10b981','已见刊/已收录':'#059669','搁置/拒稿':'#9ca3af'
    };
    const CATEGORY_COLORS = { research:'#BBAECC', writing:'#FF8C42', reading:'#4D9DE0', admin:'#9fbcdb', other:'#43AA8B' };
    const GTD_BUCKETS = [
      { value:'inbox', label:'收集箱', short:'Inbox' },
      { value:'next', label:'下一步', short:'Next' },
      { value:'waiting', label:'等待反馈', short:'Waiting' },
      { value:'someday', label:'将来也许', short:'Someday' },
      { value:'done', label:'已完成', short:'Done' }
    ];
    const QUADRANT_OPTIONS = [
      { value:'q1', label:'重要且紧急', short:'Q1', note:'先处理，防止失控', color:'bg-rose-100 text-rose-700' },
      { value:'q2', label:'重要不紧急', short:'Q2', note:'最值得主动安排时间块', color:'bg-purple-100 text-purple-700' },
      { value:'q3', label:'紧急不重要', short:'Q3', note:'能委托就委托，能压缩就压缩', color:'bg-sky-100 text-sky-700' },
      { value:'q4', label:'不紧急不重要', short:'Q4', note:'少量保留，避免吞掉注意力', color:'bg-gray-100 text-gray-600' }
    ];
    const TODAY_BUCKETS = [
      { value:'', label:'不放入今日清单', short:'未安排', color:'bg-gray-100 text-gray-600' },
      { value:'must', label:'今日必做', short:'Must', color:'bg-rose-100 text-rose-700' },
      { value:'should', label:'今日应该', short:'Should', color:'bg-amber-100 text-amber-700' },
      { value:'could', label:'今日可以', short:'Could', color:'bg-emerald-100 text-emerald-700' }
    ];
    const TASK_STATUS_OPTIONS = [
      { value:'planned', label:'计划中', progress:10, color:'bg-slate-100 text-slate-600' },
      { value:'todo', label:'没开始', progress:0, color:'bg-gray-100 text-gray-600' },
      { value:'active', label:'进行中', progress:50, color:'bg-sky-100 text-sky-700' },
      { value:'done', label:'完成', progress:100, color:'bg-emerald-100 text-emerald-700' }
    ];
    const PROJECT_AREAS = [
      { value:'research', label:'科研 / 实验' },
      { value:'writing', label:'写作 / 论文' },
      { value:'submission', label:'投稿 / 发表' },
      { value:'admin', label:'行政 / 沟通' },
      { value:'life', label:'生活 / 健康' },
      { value:'other', label:'其他 / 暂不好分类' }
    ];
    const PROJECT_STATUS_OPTIONS = [
      { value:'active', label:'进行中' },
      { value:'paused', label:'暂停' },
      { value:'done', label:'已完成' }
    ];
    const CARE_MOOD_OPTIONS = [
      { value:'overloaded', icon:'fa-face-tired', label:'压力拉满' },
      { value:'tense', icon:'fa-face-frown', label:'绷得很紧' },
      { value:'steady', icon:'fa-face-meh', label:'勉强平稳' },
      { value:'lighter', icon:'fa-face-smile', label:'慢慢松开' },
      { value:'energized', icon:'fa-face-smile-beam', label:'有一点能量' }
    ];
    const MENTOR_STATUS_OPTIONS = [
      { value:'drafting', icon:'fa-pen-to-square', label:'准备汇报' },
      { value:'reported', icon:'fa-paper-plane', label:'已汇报' },
      { value:'meeting', icon:'fa-comments', label:'已沟通 / 已开会' },
      { value:'waiting', icon:'fa-hourglass-half', label:'等待反馈' },
      { value:'blocked', icon:'fa-flag', label:'需要主动推进' }
    ];
    const MENTOR_PROMISE_STATUS_OPTIONS = [
      { value:'open', label:'待核对', color:'bg-yellow-100 text-yellow-800' },
      { value:'confirmed', label:'已确认待兑现', color:'bg-sky-100 text-sky-700' },
      { value:'remind', label:'需再次提醒', color:'bg-rose-100 text-rose-700' },
      { value:'resolved', label:'已落实', color:'bg-emerald-100 text-emerald-700' }
    ];
    const MENTOR_CHANNEL_OPTIONS = ['', '面谈', '邮件 / 微信', '文稿批注', '组会', '其他'];
    const REVIEW_ENERGY_OPTIONS = [
      { value:'high', icon:'fa-sun', label:'高：可以攻坚', short:'高', color:'text-dopamine-orange' },
      { value:'medium', icon:'fa-face-meh', label:'中：稳定推进', short:'中', color:'text-dopamine-sky' },
      { value:'low', icon:'fa-cloud-rain', label:'低：需要降载', short:'低', color:'text-dopamine-purple' }
    ];
    const ATTENDANCE_MOODS = [
      { value:'happy', icon:'fa-face-smile-beam', l:'愉快' },
      { value:'driven', icon:'fa-dumbbell', l:'干劲' },
      { value:'calm', icon:'fa-face-smile', l:'平静' },
      { value:'focused', icon:'fa-bullseye', l:'专注' },
      { value:'neutral', icon:'fa-face-meh', l:'一般' },
      { value:'sleepy', icon:'fa-bed', l:'困倦' },
      { value:'irritated', icon:'fa-face-angry', l:'烦躁' },
      { value:'tired', icon:'fa-battery-quarter', l:'疲惫' },
      { value:'great', icon:'fa-star', l:'超棒' },
      { value:'anxious', icon:'fa-face-tired', l:'焦虑' }
    ];
    const ATTENDANCE_SLOTS = [
      { key:'morning', label:'上午', icon:'fa-sun' },
      { key:'midday', label:'下午', icon:'fa-cloud-sun' },
      { key:'evening', label:'晚上', icon:'fa-moon' }
    ];
    const ATTENDANCE_SLOT_WINDOWS = {
      morning: { start:'06:00', end:'11:59' },
      midday: { start:'12:00', end:'17:59' },
      // 夜间时段允许跨午夜：从 18:00 到次日 04:00
      evening: { start:'18:00', end:'04:00' }
    };
    const DEFAULT_HABITS = [
      { id:'habit_early_sleep', name:'早睡', icon:'fa-moon', mode:'time', enabled:true, locked:false },
      { id:'habit_early_wake', name:'早起', icon:'fa-sun', mode:'time', enabled:true, locked:false },
      { id:'habit_exercise', name:'运动', icon:'fa-person-running', mode:'duration', enabled:true, locked:false },
      { id:'habit_food_record', name:'饮食记录', icon:'fa-utensils', mode:'food', enabled:true, locked:false }
    ];
    const LEGACY_REMOVED_HABITS = new Set(['habit_reading','habit_writing','habit_phone_control','habit_food_journal','habit_mind_record']);

    const APP_SCHEMA_VERSION = 5;
    const PROJECT_ORIGIN_TYPES = ['manual','thesis','submission','mentor'];
    const TASK_ORIGIN_TYPES = ['manual','review','mentor','schedule','project'];
    const WORKSPACE_NAME = '学术工作台';
    const PROFILE_PRESETS = Object.freeze({
      general: Object.freeze({
        id: 'general',
        label: '通用研究者',
        shortLabel: '通用',
        description: '适合需要任务、研究与恢复系统的通用学术用户。',
        thesisLabel: '研究项目 / 学位论文',
        guidanceLabel: '指导沟通',
        enabledModules: Object.freeze({
          execution: true,
          research: true,
          wellbeing: true,
          care: true,
          insights: true,
          reimburse: false,
          submissions: false,
          mentor: false,
          review: false
        })
      }),
      master: Object.freeze({
        id: 'master',
        label: '硕士研究者',
        shortLabel: '硕士',
        description: '强调研究推进、阶段复盘和与导师/指导老师的阶段性协作。',
        thesisLabel: '硕士论文 / 研究项目',
        guidanceLabel: '导师沟通',
        enabledModules: Object.freeze({
          execution: true,
          research: true,
          wellbeing: true,
          care: true,
          insights: true,
          reimburse: false,
          submissions: true,
          mentor: true,
          review: true
        })
      }),
      phd: Object.freeze({
        id: 'phd',
        label: '博士研究者',
        shortLabel: '博士',
        description: '强调长周期研究、投稿管线、导师沟通与长期节奏管理。',
        thesisLabel: '博士论文 / 研究项目',
        guidanceLabel: '导师沟通',
        enabledModules: Object.freeze({
          execution: true,
          research: true,
          wellbeing: true,
          care: true,
          insights: true,
          reimburse: false,
          submissions: true,
          mentor: true,
          review: true
        })
      })
    });
    const MODULE_REGISTRY = Object.freeze({
      execution: Object.freeze({
        id: 'execution',
        label: '任务执行',
        entryLabel: '任务执行',
        description: '任务、项目、时间块与专注的主执行域。',
        icon: 'fa-diagram-project',
        route: 'execution-domain',
        primarySection: 'execution-section',
        keywords: Object.freeze(['任务', '执行', '待办', '项目', '专注', 'gtd']),
        discoveryPriority: 100,
        sections: Object.freeze(['execution-section', 'workflow-section'])
      }),
      research: Object.freeze({
        id: 'research',
        label: '研究项目',
        entryLabel: '研究项目 / 学位论文',
        description: '管理学位论文、研究推进和阶段性成果。',
        icon: 'fa-book-open',
        route: 'research-domain',
        primarySection: 'research-section',
        keywords: Object.freeze(['研究', '论文', '学位论文', '章节', '里程碑']),
        discoveryPriority: 94,
        sections: Object.freeze(['research-section', 'thesis-section'])
      }),
      submissions: Object.freeze({
        id: 'submissions',
        label: '投稿管线',
        entryLabel: '投稿管线',
        description: '跟踪投稿阶段、截止节点与推进日志。',
        icon: 'fa-paper-plane',
        route: 'research-domain',
        primarySection: 'submission-section',
        keywords: Object.freeze(['投稿', '期刊', '会议', 'deadline', '返修']),
        discoveryPriority: 88,
        sections: Object.freeze(['submission-section'])
      }),
      wellbeing: Object.freeze({
        id: 'wellbeing',
        label: '习惯与恢复',
        entryLabel: '习惯与恢复',
        description: '打卡、习惯、饮食、体重与情绪恢复。',
        icon: 'fa-heart-pulse',
        route: 'life-domain',
        primarySection: 'wellbeing-section',
        keywords: Object.freeze(['习惯', '恢复', '打卡', '健康', '饮食', '体重']),
        discoveryPriority: 86,
        sections: Object.freeze(['wellbeing-section', 'habit-section', 'support-section'])
      }),
      care: Object.freeze({
        id: 'care',
        label: '心灵关怀',
        entryLabel: '心灵关怀',
        description: '记录压力、能量和恢复动作，先把自己稳住。',
        icon: 'fa-seedling',
        route: 'life-domain',
        primarySection: 'care-section',
        keywords: Object.freeze(['关怀', '情绪', '压力', '恢复']),
        discoveryPriority: 82,
        sections: Object.freeze(['care-section'])
      }),
      mentor: Object.freeze({
        id: 'mentor',
        label: '指导沟通',
        entryLabel: '指导沟通',
        description: '记录导师或指导老师反馈、承诺与后续动作。',
        icon: 'fa-user-tie',
        route: 'life-domain',
        primarySection: 'mentor-section',
        keywords: Object.freeze(['导师', '指导', '沟通', '反馈', '承诺']),
        discoveryPriority: 84,
        sections: Object.freeze(['mentor-section'])
      }),
      review: Object.freeze({
        id: 'review',
        label: '复盘计划',
        entryLabel: '复盘计划',
        description: '沉淀今日复盘，并生成明日优先项。',
        icon: 'fa-clipboard-check',
        route: 'life-domain',
        primarySection: 'review-section',
        keywords: Object.freeze(['复盘', '总结', '明日计划', '明日优先']),
        discoveryPriority: 76,
        sections: Object.freeze(['review-section'])
      }),
      reimburse: Object.freeze({
        id: 'reimburse',
        label: '报销事务',
        entryLabel: '报销事务',
        description: '记录待报销与已报销事项。',
        icon: 'fa-receipt',
        route: 'execution-domain',
        primarySection: 'reimb-section',
        keywords: Object.freeze(['报销', '发票', '收据', '财务']),
        discoveryPriority: 60,
        sections: Object.freeze(['reimb-section'])
      }),
      insights: Object.freeze({
        id: 'insights',
        label: '数据洞察',
        entryLabel: '数据洞察',
        description: '查看趋势、图表、成就和范围统计。',
        icon: 'fa-chart-line',
        route: 'insights-domain',
        primarySection: 'dashboard-section',
        keywords: Object.freeze(['洞察', '图表', '趋势', '统计', '成就']),
        discoveryPriority: 72,
        sections: Object.freeze(['dashboard-section', 'achievement-section'])
      })
    });
    const MODULE_IDS = Object.freeze(Object.keys(MODULE_REGISTRY));
    const MODULE_ORDER_DEFAULT = Object.freeze(['execution', 'research', 'wellbeing', 'care', 'submissions', 'mentor', 'review', 'reimburse', 'insights']);
    const LAUNCHER_ENTRY_DEFAULT = Object.freeze(['execution', 'schedule', 'research', 'submissions', 'wellbeing', 'care', 'mentor', 'review', 'reimburse', 'insights']);
    const HOME_LAYOUT_DEFAULT = Object.freeze(['priorities', 'timeline', 'risks', 'quick-actions', 'modules']);
    const PRIMARY_ROUTES = Object.freeze(['home-section', 'execution-domain', 'research-domain', 'life-domain', 'insights-domain', 'settings-section']);
    const $ = (id) => document.getElementById(id);
    const SECTION_ROUTES = {
      'home-section': ['home-section'],
      'reminder-section': ['reminder-section'],
      'execution-section': ['execution-section'],
      'workflow-section': ['workflow-section'],
      'reimb-section': ['reimb-section'],
      'research-section': ['research-section'],
      'thesis-section': ['thesis-section'],
      'submission-section': ['submission-section'],
      'wellbeing-section': ['wellbeing-section'],
      'habit-section': ['habit-section'],
      'support-section': ['support-section'],
      'care-section': ['care-section'],
      'mentor-section': ['mentor-section'],
      'review-section': ['review-section'],
      'dashboard-section': ['dashboard-section'],
      'achievement-section': ['achievement-section'],
      'settings-section': ['settings-section'],
      'execution-domain': ['execution-section', 'workflow-section', 'reimb-section'],
      'research-domain': ['research-section', 'thesis-section', 'submission-section'],
      'life-domain': ['wellbeing-section', 'habit-section', 'care-section', 'support-section', 'mentor-section', 'review-section'],
      'wellbeing-domain': ['wellbeing-section', 'habit-section', 'care-section', 'support-section', 'mentor-section', 'review-section'],
      'support-domain': ['wellbeing-section', 'habit-section', 'care-section', 'support-section', 'mentor-section', 'review-section'],
      'insights-domain': ['dashboard-section', 'achievement-section']
    };
    const SECTION_ROUTE_ALIAS = {
      'launcher-section': 'home-section',
      'wellbeing-domain': 'life-domain',
      'support-domain': 'life-domain'
    };
    const sections = Array.from(new Set(Object.values(SECTION_ROUTES).flat()));
    const charts = { focus:null, attendance:null, habit:null, thesis:null, wellbeing:null, submission:null };
    const PREF_SIDEBAR_HIDDEN_KEY = `${STORAGE_KEY}__sidebar_hidden`;
    const PREF_STATS_MODE_KEY = `${STORAGE_KEY}__stats_mode`;
    const storageMeta = {
      backend: '浏览器本地缓存',
      filePath: '',
      syncState: '仅本地缓存',
      lastSavedAt: '',
      lastLoadedAt: ''
    };
    let persistStateTimer = null;
    let currentSection = 'home-section';
    let pendingRecentEntry = '';
    let focusInterval = null;
    let attendanceMoodPending = null;
    let selectedCareMood = 'steady';
    let editContext = null;
    let sidebarHidden = false;
    let statsMode = 'day';

    function uid(prefix='id') { return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2,8)}`; }
    function pad(n) { return String(n).padStart(2,'0'); }
    function todayStr(offset=0) {
      const d = new Date();
      if (Number(offset) === 0 && d.getHours() < 4) {
        d.setDate(d.getDate() - 1);
      }
      d.setDate(d.getDate() + offset);
      return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
    }
    function nowTime() { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; }
    function nowDateTime() { const d = new Date(); return `${todayStr()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`; }
    function parseYMD(dateStr) {
      const m = String(dateStr || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (!m) return null;
      const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
      d.setHours(0,0,0,0);
      return d;
    }
    function ymd(d) { return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
    function dateFromDateTime(dtStr='') { return String(dtStr || '').slice(0,10); }
    function shiftDate(dateStr, offset=0) {
      const d = parseYMD(dateStr);
      if (!d) return todayStr(offset);
      d.setDate(d.getDate() + offset);
      return ymd(d);
    }
    function parseHM(v) { if (!v) return null; const m=String(v).match(/^(\d{1,2}):(\d{2})$/); if(!m) return null; const h=+m[1], mm=+m[2]; if(h<0||h>23||mm<0||mm>59) return null; return `${pad(h)}:${pad(mm)}`; }
    function escapeHtml(s='') { return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
    const LEGACY_ICON_MAP = Object.freeze({
      '\u2705':'fa-check', '\u2600\ufe0f':'fa-sun', '\ud83c\udf1e':'fa-sun', '\ud83c\udf27\ufe0f':'fa-cloud-rain', '\ud83c\udf19':'fa-moon', '\ud83c\udf05':'fa-sun',
      '\ud83c\udfc3':'fa-person-running', '\ud83c\udf7d\ufe0f':'fa-utensils', '\ud83c\udf7d':'fa-utensils', '\ud83d\udcc1':'fa-folder-open', '\ud83d\uddc2\ufe0f':'fa-folder-tree',
      '\ud83d\uddd3\ufe0f':'fa-calendar-days', '\u23f1\ufe0f':'fa-stopwatch', '\ud83d\udd25':'fa-fire', '\ud83d\udcdd':'fa-pen-to-square', '\ud83d\udcee':'fa-paper-plane',
      '\ud83c\udfc6':'fa-trophy', '\ud83d\udd2c':'fa-microscope', '\ud83c\udf3f':'fa-seedling', '\ud83c\udf31':'fa-seedling', '\ud83d\udc97':'fa-heart',
      '\ud83e\udd1d':'fa-handshake', '\ud83e\udef6':'fa-hands-holding-heart', '\ud83d\udcce':'fa-paperclip', '\ud83d\udce4':'fa-paper-plane',
      '\ud83d\udde3\ufe0f':'fa-comments', '\u23f3':'fa-hourglass-half', '\ud83d\udea9':'fa-flag', '\ud83d\ude23':'fa-face-tired', '\ud83d\ude15':'fa-face-frown',
      '\ud83d\ude10':'fa-face-meh', '\ud83d\ude42':'fa-face-smile', '\ud83d\ude0a':'fa-face-smile-beam', '\ud83d\udcaa':'fa-dumbbell', '\ud83d\ude0c':'fa-face-smile',
      '\ud83e\udd14':'fa-bullseye', '\ud83d\ude34':'fa-bed', '\ud83d\ude24':'fa-face-angry', '\ud83e\udd71':'fa-battery-quarter', '\ud83c\udf1f':'fa-star', '\ud83d\ude30':'fa-face-tired'
    });
    function normalizeFaIcon(icon, fallback='fa-circle-dot') {
      const raw = String(icon || '').trim();
      if (!raw) return fallback;
      if (LEGACY_ICON_MAP[raw]) return LEGACY_ICON_MAP[raw];
      if (/^fa-[a-z0-9-]+$/i.test(raw)) return raw;
      return fallback;
    }
    function faIcon(icon, extraClass='', style='solid') {
      const cleanStyle = style === 'regular' ? 'regular' : style === 'brands' ? 'brands' : 'solid';
      return `<i class="fa-${cleanStyle} ${normalizeFaIcon(icon)}${extraClass ? ` ${escapeHtml(extraClass)}` : ''}"></i>`;
    }
    function iconLabel(icon, label='', extraClass='') {
      return `${faIcon(icon, extraClass)}${label ? ` ${escapeHtml(label)}` : ''}`;
    }
    function hmToMinutes(hm) { const t=parseHM(hm); if(!t) return 0; const [h,m]=t.split(':').map(Number); return h*60+m; }
    function slotWindowLabel(slotKey='') {
      const range = ATTENDANCE_SLOT_WINDOWS[slotKey];
      return range ? `${range.start}-${range.end}` : '--';
    }
    function isWithinSlotWindow(slotKey='', hm=nowTime()) {
      const range = ATTENDANCE_SLOT_WINDOWS[slotKey];
      if (!range) return false;
      const minute = hmToMinutes(hm);
      const startMin = hmToMinutes(range.start);
      const endMin = hmToMinutes(range.end);
      if (endMin >= startMin) {
        return minute >= startMin && minute <= endMin;
      }
      return minute >= startMin || minute <= endMin;
    }
    function attendancePermission(slotKey, currentLog, nowHm=nowTime()) {
      const slot = attendanceSlotMeta(slotKey);
      const range = ATTENDANCE_SLOT_WINDOWS[slotKey];
      if (!slot || !range) return { allowed:false, reason:'invalid-slot', message:'无效时段' };
      if (currentLog && !currentLog.end) {
        if (currentLog.date && currentLog.date !== todayStr()) {
          return { allowed:false, reason:'cross-day-open', message:`${slot.label}到岗记录已跨天，请在“修改打卡”中修正` };
        }
        return { allowed:true, action:'leave' };
      }
      if (currentLog && currentLog.end) {
        return { allowed:false, reason:'already-completed', message:`${slot.label}时段已完成。如需修改，请在下方明细中点击“修改”。` };
      }
      if (isWithinSlotWindow(slotKey, nowHm)) {
        return { allowed:true, action:'arrive' };
      }
      const nowMinute = hmToMinutes(nowHm);
      const phase = nowMinute < hmToMinutes(range.start) ? '未到时段' : '已过时段';
      return {
        allowed:false,
        reason:'outside-window',
        phase,
        message:`${slot.label}仅允许在 ${slotWindowLabel(slotKey)} 到岗打卡`
      };
    }
    function minutesBetween(start,end) { let s=hmToMinutes(start), e=hmToMinutes(end); if (e < s) e += 24*60; return Math.max(0, e-s); }
    function formatMinutes(mins) { mins = Math.round(Number(mins)||0); const h=Math.floor(mins/60), m=mins%60; return h>0 ? `${h}小时 ${m}分钟` : `${m}分钟`; }
    function formatDurationHM(mins) { mins=Math.round(Number(mins)||0); const h=Math.floor(mins/60), m=mins%60; return `${pad(h)}:${pad(m)}`; }
    function addMinutesToHM(start, mins) {
      const base = hmToMinutes(start);
      const total = (base + Math.max(0, Number(mins) || 0)) % (24 * 60);
      return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
    }
    function bytesToKB(bytes) { return `${(bytes/1024).toFixed(1)} KB`; }
    function dayLabel(dateStr) { const d=parseYMD(dateStr); return d ? `${dateStr} · 周${'日一二三四五六'[d.getDay()]}` : String(dateStr || ''); }
    function sortByTime(arr, key='start') { return [...arr].sort((a,b)=>(a[key]||'').localeCompare(b[key]||'')); }
    function jsDateFrom(dateStr, hm='00:00') { return new Date(`${dateStr}T${parseHM(hm)||'00:00'}:00`); }
    function deepClone(obj) { return JSON.parse(JSON.stringify(obj)); }
    function clamp(value, min, max) { return Math.max(min, Math.min(max, Number(value) || 0)); }
    function isTauriRuntime() { return !!(window.__TAURI__?.core?.invoke || window.__TAURI_INTERNALS__?.invoke); }
    async function invokeTauri(command, args={}) {
      const invoke = window.__TAURI__?.core?.invoke || window.__TAURI_INTERNALS__?.invoke;
      if (!invoke) throw new Error('Tauri runtime unavailable');
      return await invoke(command, args);
    }

    function diffDays(fromDateStr, toDateStr) {
      const a = parseYMD(fromDateStr);
      const b = parseYMD(toDateStr);
      if (!a || !b) return NaN;
      return Math.round((b - a) / (1000 * 3600 * 24));
    }
    function startOfWeek(dateStr) {
      const d = parseYMD(dateStr);
      if (!d) return todayStr();
      const weekday = d.getDay();
      const diff = weekday === 0 ? 6 : weekday - 1;
      d.setDate(d.getDate() - diff);
      return ymd(d);
    }
    function startOfMonth(dateStr) {
      const d = parseYMD(dateStr);
      if (!d) return todayStr();
      d.setDate(1);
      return ymd(d);
    }
    function dateSpan(startStr, endStr) {
      const start = parseYMD(startStr);
      const end = parseYMD(endStr);
      if (!start || !end || start > end) return [];
      const dates = [];
      const cursor = new Date(start);
      while (cursor <= end) {
        dates.push(ymd(cursor));
        cursor.setDate(cursor.getDate() + 1);
      }
      return dates;
    }
    function isDateInRange(dateStr, startStr, endStr) {
      if (!dateStr || !startStr || !endStr) return false;
      return dateStr >= startStr && dateStr <= endStr;
    }
    function statsModeText(baseDate=todayStr()) {
      if (statsMode === 'week') return '本周';
      if (statsMode === 'month') return '本月';
      return baseDate === todayStr() ? '今日' : '当日';
    }
    function getStatsRange(baseDate=todayStr()) {
      const base = baseDate || todayStr();
      if (statsMode === 'week') {
        const start = startOfWeek(base);
        return { start, end: base, dates: dateSpan(start, base), label: `本周 ${start} ~ ${base}` };
      }
      if (statsMode === 'month') {
        const start = startOfMonth(base);
        return { start, end: base, dates: dateSpan(start, base), label: `本月 ${start} ~ ${base}` };
      }
      return { start: base, end: base, dates: [base], label: dayLabel(base) };
    }

    function syncStatsModeButtons() {
      document.querySelectorAll('.stats-mode-btn').forEach(btn => {
        const active = btn.dataset.statsMode === statsMode;
        btn.classList.toggle('bg-dopamine-orange', active);
        btn.classList.toggle('text-white', active);
        btn.classList.toggle('shadow-soft', active);
        btn.classList.toggle('text-calm-mute', !active);
      });
    }
    function statsModeToDashboardDays(mode) { return mode === 'week' ? 7 : mode === 'month' ? 30 : 1; }
    function syncDashboardRangeToStatsMode() {
      const el = $('dashboardRange');
      if (!el) return;
      const nextDays = String(statsModeToDashboardDays(statsMode));
      if (el.value !== nextDays) el.value = nextDays;
    }
    function setStatsMode(nextMode, { persist=true, rerender=true } = {}) {
      const mode = ['day','week','month'].includes(nextMode) ? nextMode : 'day';
      if (statsMode === mode) return;
      statsMode = mode;
      if (persist) localStorage.setItem(PREF_STATS_MODE_KEY, statsMode);
      syncStatsModeButtons();
      syncDashboardRangeToStatsMode();
      if (rerender) renderAll();
    }

    function applySidebarHidden(hidden) {
      const layout = $('appLayout');
      if (!layout) return;
      layout.classList.toggle('layout-sidebar-hidden', !!hidden);
      const btn = $('btnSidebarToggle');
      if (!btn) return;
      const label = hidden ? '显示边栏' : '隐藏边栏';
      btn.setAttribute('aria-label', label);
      btn.title = label;
      btn.innerHTML = `<i class="fa-solid ${hidden ? 'fa-angles-right' : 'fa-angles-left'}"></i>`;
    }
    function toggleSidebar() {
      sidebarHidden = !sidebarHidden;
      localStorage.setItem(PREF_SIDEBAR_HIDDEN_KEY, sidebarHidden ? '1' : '0');
      applySidebarHidden(sidebarHidden);
    }
    function loadPrefs() {
      const storedMode = localStorage.getItem(PREF_STATS_MODE_KEY);
      statsMode = ['day','week','month'].includes(storedMode) ? storedMode : 'day';
      sidebarHidden = localStorage.getItem(PREF_SIDEBAR_HIDDEN_KEY) === '1';
      currentSection = firstAvailableRoute(state.ui?.lastDomain || 'home-section', state.ui);
      applySidebarHidden(sidebarHidden);
      syncStatsModeButtons();
      syncDashboardRangeToStatsMode();
    }


    function isMobileViewport() {
      return window.innerWidth < 1024;
    }
    function updateMobileNavTitle() {
      const titleEl = $('mobileNavSectionTitle');
      if (!titleEl) return;
      const activeBtn = document.querySelector('.nav-btn.active span');
      titleEl.textContent = activeBtn ? activeBtn.textContent.trim() : WORKSPACE_NAME;
    }
    function openMobileDrawer() {
      if (!isMobileViewport()) return;
      document.body.classList.add('mobile-drawer-open');
    }
    function closeMobileDrawer() {
      document.body.classList.remove('mobile-drawer-open');
    }
    function toggleMobileDrawer() {
      if (!isMobileViewport()) return;
      document.body.classList.toggle('mobile-drawer-open');
    }
    function syncResponsiveLayout() {
      if (!isMobileViewport()) closeMobileDrawer();
      updateMobileNavTitle();
    }

    function taskBucketMeta(bucket) {
      return GTD_BUCKETS.find(item => item.value === bucket) || GTD_BUCKETS[1];
    }
    function taskQuadrantMeta(quadrant) {
      return QUADRANT_OPTIONS.find(item => item.value === quadrant) || QUADRANT_OPTIONS[1];
    }
    function todayBucketMeta(bucket) {
      return TODAY_BUCKETS.find(item => item.value === bucket) || TODAY_BUCKETS[0];
    }
    function taskStatusMeta(status) {
      return TASK_STATUS_OPTIONS.find(item => item.value === status) || TASK_STATUS_OPTIONS[1];
    }
    function projectAreaMeta(area) {
      return PROJECT_AREAS.find(item => item.value === area) || PROJECT_AREAS[0];
    }
    function projectStatusMeta(status) {
      return PROJECT_STATUS_OPTIONS.find(item => item.value === status) || PROJECT_STATUS_OPTIONS[0];
    }
    function blockColorForTask(task) {
      const quadrant = taskQuadrantMeta(task?.quadrant);
      if (quadrant.value === 'q1') return '#FB7185';
      if (quadrant.value === 'q2') return '#9B5DE5';
      if (quadrant.value === 'q3') return '#4D9DE0';
      return '#9CA3AF';
    }
    function normalizeStateMeta(meta) {
      return {
        schemaVersion: Math.max(APP_SCHEMA_VERSION, Number(meta?.schemaVersion) || 0)
      };
    }
    function defaultEnabledModules(profile='general') {
      const preset = PROFILE_PRESETS[profile] || PROFILE_PRESETS.general;
      return MODULE_IDS.reduce((acc, id) => {
        acc[id] = preset.enabledModules[id] !== false;
        return acc;
      }, {});
    }
    function normalizeEnabledModules(enabledModules, profile='general') {
      const normalized = defaultEnabledModules(profile);
      if (Array.isArray(enabledModules)) {
        MODULE_IDS.forEach(id => { normalized[id] = enabledModules.includes(id); });
        return normalized;
      }
      if (!enabledModules || typeof enabledModules !== 'object') return normalized;
      MODULE_IDS.forEach(id => {
        if (enabledModules[id] != null) normalized[id] = enabledModules[id] !== false;
      });
      return normalized;
    }
    function normalizeModuleOrder(order) {
      if (!Array.isArray(order) || !order.length) return [...MODULE_ORDER_DEFAULT];
      const seen = new Set();
      const normalized = order
        .map(item => String(item || ''))
        .filter(id => MODULE_IDS.includes(id) && !seen.has(id) && (seen.add(id) || true));
      MODULE_ORDER_DEFAULT.forEach(id => { if (!seen.has(id)) normalized.push(id); });
      return normalized;
    }
    function normalizeHomeLayout(layout) {
      if (!Array.isArray(layout) || !layout.length) return [...HOME_LAYOUT_DEFAULT];
      const seen = new Set();
      const normalized = layout
        .map(item => String(item || ''))
        .filter(id => HOME_LAYOUT_DEFAULT.includes(id) && !seen.has(id) && (seen.add(id) || true));
      HOME_LAYOUT_DEFAULT.forEach(id => { if (!seen.has(id)) normalized.push(id); });
      return normalized;
    }
    function normalizeUiIdList(list) {
      if (!Array.isArray(list) || !list.length) return [];
      const seen = new Set();
      return list
        .map(item => String(item || '').trim())
        .filter(id => id && !seen.has(id) && (seen.add(id) || true))
        .slice(0, 12);
    }
    function normalizeUiState(ui) {
      const landingDefaults = ['priorities', 'timeline', 'risks', 'quick-capture', 'summary'];
      const profile = PROFILE_PRESETS[String(ui?.profile || '')] ? String(ui.profile) : 'general';
      return {
        lastDomain: String(ui?.lastDomain || 'home-section'),
        landingCardOrder: Array.isArray(ui?.landingCardOrder) && ui.landingCardOrder.length ? ui.landingCardOrder.map(item => String(item)) : landingDefaults,
        collapsedPanels: ui?.collapsedPanels && typeof ui.collapsedPanels === 'object' ? { ...ui.collapsedPanels } : {},
        profile,
        enabledModules: normalizeEnabledModules(ui?.enabledModules, profile),
        moduleOrder: normalizeModuleOrder(ui?.moduleOrder),
        homeLayout: normalizeHomeLayout(ui?.homeLayout),
        recentModules: normalizeUiIdList(ui?.recentModules),
        pinnedModules: normalizeUiIdList(ui?.pinnedModules),
        showSidebarRail: ui?.showSidebarRail !== false,
        launcherView: 'all',
        profileSetupDone: ui?.profileSetupDone === true
      };
    }
    function profileMeta(profile = state?.ui?.profile || 'general') {
      return PROFILE_PRESETS[profile] || PROFILE_PRESETS.general;
    }
    function workspaceCopy(profile = state?.ui?.profile || 'general') {
      const meta = profileMeta(profile);
      return {
        brand: WORKSPACE_NAME,
        brandEn: 'Academic Workspace',
        profileLabel: meta.label,
        thesisLabel: meta.thesisLabel,
        guidanceLabel: meta.guidanceLabel,
        launcherLabel: '快捷入口',
        todayLabel: '今日',
        executionLabel: '执行系统',
        researchLabel: '研究系统',
        lifeLabel: '生活系统',
        insightsLabel: '洞察回顾',
        settingsLabel: '工作台设置'
      };
    }
    function moduleMeta(moduleId='') {
      return MODULE_REGISTRY[moduleId] || null;
    }
    function discoveryModuleForEntry(entryId='') {
      if (MODULE_IDS.includes(entryId)) return entryId;
      if (entryId === 'schedule') return 'execution';
      return '';
    }
    function discoveryPrimarySection(entryId='') {
      if (entryId === 'schedule') return 'workflow-section';
      if (entryId === 'care') return 'care-section';
      return moduleMeta(entryId)?.primarySection || moduleMeta(entryId)?.sections?.[0] || '';
    }
    function touchRecentModule(entryId='') {
      const cleanId = String(entryId || '').trim();
      if (!cleanId) return;
      state.ui = normalizeUiState({
        ...state.ui,
        recentModules: [cleanId, ...(state.ui?.recentModules || []).filter(id => id !== cleanId)]
      });
      persistUiState();
    }
    function togglePinnedModule(entryId='') {
      const cleanId = String(entryId || '').trim();
      if (!cleanId) return;
      const pinned = new Set(normalizeUiIdList(state.ui?.pinnedModules));
      if (pinned.has(cleanId)) pinned.delete(cleanId);
      else pinned.add(cleanId);
      state.ui = normalizeUiState({
        ...state.ui,
        pinnedModules: Array.from(pinned)
      });
      persistUiState();
      renderAll();
    }
    function openLauncherEntry(entryId='', { enableIfNeeded=false } = {}) {
      const moduleId = discoveryModuleForEntry(entryId);
      if (!moduleId) return;
      if (!isModuleEnabled(moduleId)) return;
      pendingRecentEntry = String(entryId || '').trim();
      navTo(discoveryPrimarySection(entryId) || moduleMeta(moduleId)?.route || 'home-section');
    }
    function moduleForSection(sectionId='') {
      return MODULE_IDS.find(id => moduleMeta(id)?.sections?.includes(sectionId)) || '';
    }
    function isModuleEnabled(moduleId='', uiState = state?.ui) {
      const normalizedUi = normalizeUiState(uiState || {});
      return normalizedUi.enabledModules?.[moduleId] !== false;
    }
    function enabledModuleIds(uiState = state?.ui) {
      return MODULE_IDS.filter(id => isModuleEnabled(id, uiState));
    }
    function activeModuleCount(uiState = state?.ui) {
      return enabledModuleIds(uiState).length;
    }
    function isRouteVisible(routeId='home-section', uiState = state?.ui) {
      const resolvedRoute = SECTION_ROUTES[routeId] ? routeId : (SECTION_ROUTE_ALIAS[routeId] || 'home-section');
      if (resolvedRoute === 'home-section' || resolvedRoute === 'settings-section') return true;
      return visibleSectionsFor(resolvedRoute, uiState).length > 0;
    }
    function firstAvailableRoute(preferred='home-section', uiState = state?.ui) {
      const resolvedRoute = SECTION_ROUTES[preferred] ? preferred : (SECTION_ROUTE_ALIAS[preferred] || 'home-section');
      if (isRouteVisible(resolvedRoute, uiState)) return resolvedRoute;
      return PRIMARY_ROUTES.find(routeId => isRouteVisible(routeId, uiState)) || 'home-section';
    }
    function applyProfilePreset(profile='general', { rerender=true } = {}) {
      const preset = PROFILE_PRESETS[profile] || PROFILE_PRESETS.general;
      state.ui = normalizeUiState({
        ...state.ui,
        profile: preset.id,
        enabledModules: { ...preset.enabledModules },
        moduleOrder: [...MODULE_ORDER_DEFAULT],
        homeLayout: [...HOME_LAYOUT_DEFAULT],
        profileSetupDone: true
      });
      const nextRoute = firstAvailableRoute(currentSection, state.ui);
      state.ui.lastDomain = nextRoute;
      saveState();
      if (rerender) navTo(nextRoute);
    }
    function setModuleEnabled(moduleId='', enabled=true, { rerender=true } = {}) {
      if (!MODULE_IDS.includes(moduleId)) return;
      state.ui = normalizeUiState({
        ...state.ui,
        enabledModules: {
          ...state.ui.enabledModules,
          [moduleId]: !!enabled
        },
        profileSetupDone: true
      });
      const nextRoute = firstAvailableRoute(currentSection, state.ui);
      state.ui.lastDomain = nextRoute;
      saveState();
      if (rerender) navTo(nextRoute);
    }
    function inferProjectOrigin(item={}) {
      const note = String(item?.note || '');
      if (item?.origin && PROJECT_ORIGIN_TYPES.includes(item.origin.type)) {
        return { type: item.origin.type, refId: String(item.origin.refId || '') };
      }
      if (note === 'module:thesis') return { type: 'thesis', refId: 'module' };
      if (note === 'module:mentor') return { type: 'mentor', refId: 'module' };
      if (note === 'module:submission') return { type: 'submission', refId: 'module' };
      if (note.startsWith('submission:')) return { type: 'submission', refId: note.slice('submission:'.length) };
      return { type: 'manual', refId: '' };
    }
    function normalizeProjectOrigin(origin, item={}) {
      const inferred = inferProjectOrigin({ ...item, origin });
      return {
        type: PROJECT_ORIGIN_TYPES.includes(inferred.type) ? inferred.type : 'manual',
        refId: String(inferred.refId || '')
      };
    }
    function inferTaskOrigin(item={}) {
      const note = String(item?.note || item?.notes || '');
      if (item?.origin && TASK_ORIGIN_TYPES.includes(item.origin.type)) {
        return { type: item.origin.type, refId: String(item.origin.refId || '') };
      }
      if (/^review:\d{4}-\d{2}-\d{2}:tomorrow:[1-3]$/.test(note)) return { type: 'review', refId: note };
      if (/^mentor:\d{4}-\d{2}-\d{2}:(promise|nextAction)$/.test(note)) return { type: 'mentor', refId: note };
      if (note === 'module:thesis' || note === 'module:submission') return { type: 'project', refId: String(item.projectId || note) };
      if (/^schedule:/.test(note)) return { type: 'schedule', refId: note.slice('schedule:'.length) || note };
      return { type: 'manual', refId: '' };
    }
    function normalizeTaskOrigin(origin, item={}) {
      const inferred = inferTaskOrigin({ ...item, origin });
      return {
        type: TASK_ORIGIN_TYPES.includes(inferred.type) ? inferred.type : 'manual',
        refId: String(inferred.refId || '')
      };
    }
    function visibleSectionsFor(routeId='home-section', uiState = state?.ui) {
      const resolvedRoute = SECTION_ROUTES[routeId] ? routeId : (SECTION_ROUTE_ALIAS[routeId] || routeId);
      const baseSections = SECTION_ROUTES[resolvedRoute] || [resolvedRoute];
      return baseSections.filter(sectionId => {
        const requiredModule = moduleForSection(sectionId);
        return !requiredModule || isModuleEnabled(requiredModule, uiState);
      });
    }
    function resolveRoute(sectionOrRoute='home-section') {
      const routeId = SECTION_ROUTES[sectionOrRoute] ? sectionOrRoute : (SECTION_ROUTE_ALIAS[sectionOrRoute] || 'home-section');
      return firstAvailableRoute(routeId, state?.ui);
    }
    function isSectionVisible(sectionId='') {
      return visibleSectionsFor(currentSection).includes(sectionId);
    }
    function isAutoManagedProject(project) {
      const origin = normalizeProjectOrigin(project?.origin, project);
      return origin.type !== 'manual';
    }

    function normalizeTaskItem(item) {
      if (!item || item.title == null) return null;
      const title = String(item.title || '').trim();
      if (!title) return null;
      const status = TASK_STATUS_OPTIONS.some(opt => opt.value === item.status) ? item.status : 'todo';
      const rawBucket = GTD_BUCKETS.some(opt => opt.value === item.gtdBucket) ? item.gtdBucket : (status === 'done' ? 'done' : 'next');
      const bucket = status === 'done' ? 'done' : rawBucket;
      const quadrant = QUADRANT_OPTIONS.some(opt => opt.value === item.quadrant) ? item.quadrant : 'q2';
      const todayBucket = TODAY_BUCKETS.some(opt => opt.value === item.todayBucket) ? item.todayBucket : '';
      return {
        id: String(item.id || uid('task')),
        title,
        status,
        projectId: String(item.projectId || ''),
        gtdBucket: bucket,
        quadrant,
        todayBucket: status === 'done' ? '' : todayBucket,
        dueDate: String(item.dueDate || ''),
        estimate: Math.max(0, Number(item.estimate) || 0),
        context: String(item.context || ''),
        note: String(item.note || item.notes || ''),
        origin: normalizeTaskOrigin(item.origin, item),
        createdAt: String(item.createdAt || nowDateTime()),
        startedAt: String(item.startedAt || ''),
        doneAt: String(item.doneAt || '')
      };
    }

    function normalizeTasksState(tasks) {
      return Array.isArray(tasks) ? tasks.map(normalizeTaskItem).filter(Boolean) : [];
    }

    function normalizeProgressLog(item) {
      if (!item || typeof item !== 'object') return null;
      const note = String(item.note || item.title || '').trim();
      if (!note) return null;
      return {
        id: String(item.id || uid('plog')),
        date: String(item.date || dateFromDateTime(item.at) || todayStr()),
        type: String(item.type || '推进'),
        minutes: Math.max(0, Number(item.minutes) || 0),
        note,
        sourceTaskId: String(item.sourceTaskId || item.taskId || ''),
        at: String(item.at || nowDateTime())
      };
    }

    function normalizeProjectItem(item) {
      if (!item || item.title == null) return null;
      const title = String(item.title || '').trim();
      if (!title) return null;
      const area = PROJECT_AREAS.some(opt => opt.value === item.area) ? item.area : 'research';
      const status = PROJECT_STATUS_OPTIONS.some(opt => opt.value === item.status) ? item.status : 'active';
      return {
        id: String(item.id || uid('proj')),
        title,
        outcome: String(item.outcome || ''),
        area,
        status,
        startDate: String(item.startDate || dateFromDateTime(item.createdAt || nowDateTime()) || ''),
        deadline: String(item.deadline || ''),
        note: String(item.note || ''),
        origin: normalizeProjectOrigin(item.origin, item),
        logs: Array.isArray(item.logs) ? item.logs.map(normalizeProgressLog).filter(Boolean) : [],
        createdAt: String(item.createdAt || nowDateTime()),
        updatedAt: String(item.updatedAt || item.createdAt || nowDateTime())
      };
    }

    function normalizeProjectsState(projects) {
      return Array.isArray(projects) ? projects.map(normalizeProjectItem).filter(Boolean) : [];
    }

    function normalizeHabitItem(item) {
      if (!item || !item.id) return null;
      const id = String(item.id);
      const name = item.name != null ? String(item.name).trim() : '';
      if (!name) return null;
      const icon = normalizeFaIcon(item.icon, 'fa-check');
      const rawMode = String(item.mode || 'checkbox');
      let mode = rawMode;
      // Backward compatibility.
      if (mode === 'sleep' || mode === 'wake') mode = 'time';
      if (id === 'habit_early_sleep' || id === 'habit_early_wake') mode = 'time';
      if (id === 'habit_exercise') mode = 'duration';
      if (!['time','duration','checkbox','text','count','food'].includes(mode)) mode = 'checkbox';
      const enabled = item.enabled !== false;
      return { id, name, icon, mode, enabled, locked: !!item.locked };
    }

    function normalizeAttendance(attendance) {
      const out = {};
      if (!attendance || typeof attendance !== 'object') return out;
      for (const [date, rawDay] of Object.entries(attendance)) {
        if (!rawDay || typeof rawDay !== 'object') continue;
        const day = { wake: rawDay.wake || null, sleep: rawDay.sleep || null, logs: [], leaves: [] };
        if (Array.isArray(rawDay.logs)) {
          day.logs = rawDay.logs.map(log => ({
            id: log.id || uid('work'),
            date: log.date || date,
            start: parseHM(log.start) || parseHM(log.in) || nowTime(),
            end: parseHM(log.end) || parseHM(log.out) || null,
            note: log.note || log.notes || '',
            arriveMood: log.arriveMood || log.mood || '',
            leaveMood: log.leaveMood || ''
          }));
        }
        if (!day.logs.length && rawDay.periods && typeof rawDay.periods === 'object') {
          for (const [periodName, periodData] of Object.entries(rawDay.periods)) {
            if (Array.isArray(periodData?.segments)) {
              periodData.segments.forEach((seg, idx) => {
                day.logs.push({
                  id: seg.id || `legacy_${date}_${periodName}_${idx}`,
                  date,
                  start: parseHM(seg.start) || parseHM(seg.in) || '09:00',
                  end: parseHM(seg.end) || parseHM(seg.out) || null,
                  note: periodName,
                  arriveMood: seg.arriveMood || seg.mood || '',
                  leaveMood: seg.leaveMood || ''
                });
              });
            }
            if (periodData?.activeStart) {
              day.logs.push({ id:`legacy_open_${date}_${periodName}`, date, start: parseHM(periodData.activeStart) || '09:00', end:null, note:`${periodName}（未结束）`, arriveMood:'', leaveMood:''});
            }
          }
        }
        if (Array.isArray(rawDay.leaves)) {
          day.leaves = rawDay.leaves.map(item => ({ id:item.id||uid('leave'), date:item.date||date, type:item.type||'其他' }));
        } else if (rawDay.leave) {
          if (typeof rawDay.leave === 'string') day.leaves = [{ id:uid('leave'), date, type:rawDay.leave }];
          else if (typeof rawDay.leave === 'object') day.leaves = [{ id: rawDay.leave.id||uid('leave'), date, type: rawDay.leave.type||'其他' }];
        }
        out[date] = day;
      }
      return out;
    }

    function normalizeMoodMap(source) {
      const out = {};
      if (!source || typeof source !== 'object') return out;
      for (const [date, value] of Object.entries(source)) {
        if (Array.isArray(value)) {
          out[date] = value.map(item => ({ id:item.id||uid('mood'), mood:item.mood||item.emoji||'steady', note:item.note||'', at:item.at||item.ts||nowDateTime() }));
        } else if (value && typeof value === 'object') {
          out[date] = [{ id:value.id||uid('mood'), mood:value.mood||value.emoji||'steady', note:value.note||'', at:value.at||value.ts||nowDateTime() }];
        }
      }
      return out;
    }

    function normalizeReflectionMap(source) {
      const out = {};
      if (!source || typeof source !== 'object') return out;
      for (const [date, value] of Object.entries(source)) {
        if (Array.isArray(value)) {
          out[date] = value.map(item => ({ id:item.id||uid('ref'), text:item.text||item.note||'', at:item.at||item.ts||nowDateTime() }));
        } else if (typeof value === 'string') {
          out[date] = [{ id:uid('ref'), text:value, at:nowDateTime() }];
        } else if (value && typeof value === 'object' && value.text) {
          out[date] = [{ id:value.id||uid('ref'), text:value.text, at:value.at||value.ts||nowDateTime() }];
        }
      }
      return out;
    }

    function normalizeSubmissionItem(item) {
      if (!item || typeof item !== 'object') return null;
      const stage = SUBMISSION_COLUMNS.includes(item.stage) ? item.stage : '选题中';
      const createdAt = String(item.createdAt || item.at || nowDateTime());
      return {
        id: String(item.id || uid('sub')),
        title: String(item.title || '').trim() || '未命名项目',
        venue: String(item.venue || ''),
        deadline: String(item.deadline || ''),
        stage,
        type: String(item.type || 'Other'),
        notes: String(item.notes || ''),
        logs: Array.isArray(item.logs) ? item.logs.map(log => ({
          id: String(log.id || uid('sublog')),
          date: String(log.date || dateFromDateTime(log.at) || todayStr()),
          type: String(log.type || '推进'),
          minutes: Math.max(0, Number(log.minutes) || 0),
          note: String(log.note || log.text || ''),
          stage: String(log.stage || stage),
          at: String(log.at || log.createdAt || nowDateTime())
        })) : [],
        createdAt,
        updatedAt: String(item.updatedAt || createdAt)
      };
    }

    function normalizeSubmissions(source) {
      return Array.isArray(source) ? source.map(normalizeSubmissionItem).filter(Boolean) : [];
    }

    function normalizeRemindersState(reminders) {
      const source = reminders && typeof reminders === 'object' ? reminders : {};
      const dismissed = source.dismissedBySourceId && typeof source.dismissedBySourceId === 'object' ? source.dismissedBySourceId : {};
      const snoozed = source.snoozedBySourceId && typeof source.snoozedBySourceId === 'object' ? source.snoozedBySourceId : {};
      return {
        dismissedBySourceId: Object.fromEntries(Object.entries(dismissed).map(([key, value]) => [String(key), String(value || nowDateTime())])),
        snoozedBySourceId: Object.fromEntries(Object.entries(snoozed).map(([key, value]) => [String(key), String(value || '')]).filter(([, value]) => value)),
        manual: Array.isArray(source.manual) ? source.manual.map(item => ({
          id: String(item?.id || uid('rem')),
          title: String(item?.title || '').trim() || '未命名提醒',
          dueDate: String(item?.dueDate || todayStr()),
          note: String(item?.note || ''),
          done: item?.done === true,
          createdAt: String(item?.createdAt || nowDateTime())
        })) : []
      };
    }

    function legacyMoodToCareMood(rawMood) {
      const mood = String(rawMood || '');
      if (['\ud83d\ude2d','\ud83d\ude23'].includes(mood)) return 'overloaded';
      if (['\ud83d\ude15'].includes(mood)) return 'tense';
      if (['\ud83d\ude42'].includes(mood)) return 'lighter';
      if (['\ud83d\ude0a'].includes(mood)) return 'energized';
      return 'steady';
    }

    function careMoodMeta(mood) {
      return CARE_MOOD_OPTIONS.find(item => item.value === mood) || CARE_MOOD_OPTIONS[2];
    }

    function mentorStatusMeta(status) {
      return MENTOR_STATUS_OPTIONS.find(item => item.value === status) || MENTOR_STATUS_OPTIONS[0];
    }

    function mentorPromiseStatusMeta(status) {
      return MENTOR_PROMISE_STATUS_OPTIONS.find(item => item.value === status) || MENTOR_PROMISE_STATUS_OPTIONS[0];
    }

    function reviewEnergyMeta(energy) {
      return REVIEW_ENERGY_OPTIONS.find(item => item.value === energy) || REVIEW_ENERGY_OPTIONS[1];
    }
    function attendanceMoodMeta(mood) {
      const raw = String(mood || '').trim();
      return ATTENDANCE_MOODS.find(item => item.value === raw)
        || ATTENDANCE_MOODS.find(item => LEGACY_ICON_MAP[raw] && item.icon === LEGACY_ICON_MAP[raw])
        || null;
    }

    function attendanceSlotMeta(slotKey='') {
      return ATTENDANCE_SLOTS.find(item => item.key === slotKey) || null;
    }
    function normalizeAttendanceSlotKey(value='') {
      const raw = String(value || '').toLowerCase().trim();
      if (!raw) return '';
      if (raw === 'morning' || raw.includes('slot:morning') || raw.includes('早段') || raw.includes('上午')) return 'morning';
      if (raw === 'midday' || raw.includes('slot:midday') || raw.includes('中段') || raw.includes('下午')) return 'midday';
      if (raw === 'evening' || raw.includes('slot:evening') || raw.includes('晚段') || raw.includes('晚上')) return 'evening';
      return '';
    }
    function attendanceSlotNote(slotKey='') {
      return `slot:${slotKey}`;
    }
    function getAttendanceSlotLogs(date=todayStr()) {
      const day = getDayAttendance(date);
      const sorted = sortByTime(day.logs || []);
      const slotMap = { morning:null, midday:null, evening:null };
      const extras = [];
      for (const log of sorted) {
        const direct = normalizeAttendanceSlotKey(log.note);
        if (direct && !slotMap[direct]) {
          slotMap[direct] = log;
          continue;
        }
        if (!direct) {
          const emptySlot = ATTENDANCE_SLOTS.find(slot => !slotMap[slot.key]);
          if (emptySlot) {
            slotMap[emptySlot.key] = log;
            continue;
          }
        }
        extras.push(log);
      }
      return {
        slots: ATTENDANCE_SLOTS.map(slot => ({ ...slot, log: slotMap[slot.key] || null })),
        extras
      };
    }
    function findAttendanceLogBySlot(slotKey, date=todayStr()) {
      return getAttendanceSlotLogs(date).slots.find(item => item.key === slotKey)?.log || null;
    }

    function defaultCareEntry() {
      return {
        mood: 'steady',
        stress: 3,
        energy: 3,
        challenge: '',
        selfCare: '',
        gratitude: '',
        support: '',
        note: '',
        updatedAt: ''
      };
    }

    function normalizeCareEntry(raw) {
      const base = defaultCareEntry();
      if (!raw || typeof raw !== 'object') return { ...base };
      const mood = CARE_MOOD_OPTIONS.some(item => item.value === raw.mood) ? raw.mood : base.mood;
      return {
        mood,
        stress: clamp(raw.stress ?? 3, 1, 5),
        energy: clamp(raw.energy ?? 3, 1, 5),
        challenge: String(raw.challenge || raw.trigger || ''),
        selfCare: String(raw.selfCare || raw.relief || ''),
        gratitude: String(raw.gratitude || ''),
        support: String(raw.support || ''),
        note: String(raw.note || raw.compassion || ''),
        updatedAt: String(raw.updatedAt || raw.at || '')
      };
    }

    function buildLegacyCareEntries(legacyMood) {
      const out = {};
      if (!legacyMood || typeof legacyMood !== 'object') return out;
      for (const [date, items] of Object.entries(legacyMood)) {
        if (!Array.isArray(items) || !items.length) continue;
        const latest = items[0];
        out[date] = normalizeCareEntry({
          mood: legacyMoodToCareMood(latest?.mood || latest?.emoji),
          note: latest?.note || '',
          updatedAt: latest?.at || latest?.ts || ''
        });
      }
      return out;
    }

    function normalizeCareState(care, legacyMood) {
      const merged = buildLegacyCareEntries(legacyMood);
      const sourceEntries = care?.entries && typeof care.entries === 'object' ? care.entries : {};
      Object.entries(sourceEntries).forEach(([date, entry]) => { merged[date] = normalizeCareEntry(entry); });
      return { entries: merged };
    }

    function defaultDailyReviewEntry() {
      return {
        energy: 'medium',
        energyNote: '',
        accomplishments: '',
        unfinished: '',
        insights: '',
        obstacles: '',
        tomorrow: ['', '', ''],
        tomorrowTaskIds: ['', '', ''],
        updatedAt: ''
      };
    }

    function normalizeDailyReviewEntry(raw) {
      const base = defaultDailyReviewEntry();
      if (!raw || typeof raw !== 'object') return { ...base };
      const tomorrow = Array.isArray(raw.tomorrow)
        ? raw.tomorrow.slice(0, 3).map(item => String(item || ''))
        : [
            String(raw.tomorrow1 || raw.priority1 || raw.start || ''),
            String(raw.tomorrow2 || raw.priority2 || ''),
            String(raw.tomorrow3 || raw.priority3 || '')
          ];
      while (tomorrow.length < 3) tomorrow.push('');
      const tomorrowTaskIds = Array.isArray(raw.tomorrowTaskIds) ? raw.tomorrowTaskIds.slice(0, 3).map(item => String(item || '')) : [];
      while (tomorrowTaskIds.length < 3) tomorrowTaskIds.push('');
      const energy = REVIEW_ENERGY_OPTIONS.some(item => item.value === raw.energy) ? raw.energy : base.energy;
      return {
        energy,
        energyNote: String(raw.energyNote || raw.note || ''),
        accomplishments: String(raw.accomplishments || raw.output || raw.keep || ''),
        unfinished: String(raw.unfinished || raw.delayAnalysis || raw.improve || ''),
        insights: String(raw.insights || raw.knowledge || ''),
        obstacles: String(raw.obstacles || raw.action || raw.stop || ''),
        tomorrow,
        tomorrowTaskIds,
        updatedAt: String(raw.updatedAt || raw.at || '')
      };
    }

    function buildLegacyReviewEntries(legacyReflections) {
      const out = {};
      if (!legacyReflections || typeof legacyReflections !== 'object') return out;
      for (const [date, items] of Object.entries(legacyReflections)) {
        if (!Array.isArray(items) || !items.length) continue;
        const latest = items[0];
        out[date] = normalizeDailyReviewEntry({
          accomplishments: latest?.text || '',
          updatedAt: latest?.at || latest?.ts || ''
        });
      }
      return out;
    }

    function normalizeDailyReviewState(reviewDaily, legacyReflections) {
      const merged = buildLegacyReviewEntries(legacyReflections);
      const sourceEntries = reviewDaily?.entries && typeof reviewDaily.entries === 'object' ? reviewDaily.entries : {};
      Object.entries(sourceEntries).forEach(([date, entry]) => { merged[date] = normalizeDailyReviewEntry(entry); });
      return { entries: merged };
    }

    function defaultMentorEntry() {
      return {
        status: 'drafting',
        channel: '',
        pressure: 3,
        clarity: 3,
        topic: '',
        evidence: '',
        ask: '',
        risk: '',
        feedback: '',
        commitment: '',
        confirmation: '',
        followupDate: '',
        promiseStatus: 'open',
        promiseTaskId: '',
        boundary: '',
        nextAction: '',
        nextActionTaskId: '',
        updatedAt: ''
      };
    }

    function normalizeMentorEntry(raw) {
      const base = defaultMentorEntry();
      if (!raw || typeof raw !== 'object') return { ...base };
      const status = MENTOR_STATUS_OPTIONS.some(item => item.value === raw.status) ? raw.status : base.status;
      const channelRaw = String(raw.channel || '').trim().replace(/\s*\/\s*/g, ' / ');
      const channel = MENTOR_CHANNEL_OPTIONS.includes(channelRaw) ? channelRaw : '';
      const promiseStatus = MENTOR_PROMISE_STATUS_OPTIONS.some(item => item.value === raw.promiseStatus) ? raw.promiseStatus : base.promiseStatus;
      return {
        status,
        channel,
        pressure: clamp(raw.pressure ?? raw.stress ?? 3, 1, 5),
        clarity: clamp(raw.clarity ?? 3, 1, 5),
        topic: String(raw.topic || ''),
        evidence: String(raw.evidence || raw.progress || ''),
        ask: String(raw.ask || raw.support || ''),
        risk: String(raw.risk || raw.challenge || ''),
        feedback: String(raw.feedback || raw.decision || raw.response || ''),
        commitment: String(raw.commitment || raw.promise || raw.agreement || ''),
        confirmation: String(raw.confirmation || raw.memo || raw.minutes || ''),
        followupDate: String(raw.followupDate || raw.checkDate || raw.promiseDate || ''),
        promiseStatus,
        promiseTaskId: String(raw.promiseTaskId || ''),
        boundary: String(raw.boundary || ''),
        nextAction: String(raw.nextAction || raw.next || ''),
        nextActionTaskId: String(raw.nextActionTaskId || ''),
        updatedAt: String(raw.updatedAt || raw.at || '')
      };
    }

    function normalizeMentorState(mentor) {
      const entries = mentor?.entries && typeof mentor.entries === 'object' ? mentor.entries : {};
      const out = {};
      Object.entries(entries).forEach(([date, entry]) => { out[date] = normalizeMentorEntry(entry); });
      return { entries: out };
    }

    function normalizeHabitsState(habits) {
      const sourceList = Array.isArray(habits?.list) ? habits.list : [];
      const defaultIds = new Set(DEFAULT_HABITS.map(h => h.id));
      const defaultOverrides = new Map();
      const customs = [];
      const used = new Set();
      sourceList.forEach(item => {
        const clean = normalizeHabitItem(item);
        if (!clean) return;
        if (LEGACY_REMOVED_HABITS.has(clean.id)) return;
        if (defaultIds.has(clean.id)) { defaultOverrides.set(clean.id, clean); used.add(clean.id); return; }
        if (used.has(clean.id)) return;
        customs.push(clean);
        used.add(clean.id);
      });
      return {
        list: [
          ...DEFAULT_HABITS.map(def => {
            const ov = defaultOverrides.get(def.id);
            return ov ? { ...def, ...ov, locked:false } : { ...def };
          }),
          ...customs
        ],
        logs: habits?.logs && typeof habits.logs === 'object' ? habits.logs : {},
        entries: habits?.entries && typeof habits.entries === 'object' ? habits.entries : {}
      };
    }

    function defaultThesisState() {
      return {
        meta: { title:'', targetDate:'', version:'', note:'' },
        milestones: [
          { id:'ms_proposal', name:'开题 / Proposal', due:'', done:false, doneAt:'', note:'' },
          { id:'ms_midterm', name:'中期检查', due:'', done:false, doneAt:'', note:'' },
          { id:'ms_predefense', name:'预答辩', due:'', done:false, doneAt:'', note:'' },
          { id:'ms_submission', name:'论文提交', due:'', done:false, doneAt:'', note:'' },
          { id:'ms_defense', name:'正式答辩', due:'', done:false, doneAt:'', note:'' }
        ],
        chapters: [
          { id:'ch_intro', name:'引言 / Introduction', progress:0, status:'draft', updatedAt:'', note:'' },
          { id:'ch_related', name:'相关工作 / Related Work', progress:0, status:'draft', updatedAt:'', note:'' },
          { id:'ch_method', name:'方法 / Method', progress:0, status:'draft', updatedAt:'', note:'' },
          { id:'ch_exp', name:'实验 / Experiments', progress:0, status:'draft', updatedAt:'', note:'' },
          { id:'ch_conc', name:'结论 / Conclusion', progress:0, status:'draft', updatedAt:'', note:'' }
        ],
        logs: []
      };
    }
    function normalizeThesisState(thesis) {
      const def = defaultThesisState();
      if (!thesis || typeof thesis !== 'object') return def;
      const metaRaw = thesis.meta && typeof thesis.meta === 'object' ? thesis.meta : {};
      const meta = {
        title: String(metaRaw.title || ''),
        targetDate: String(metaRaw.targetDate || ''),
        version: String(metaRaw.version || ''),
        note: String(metaRaw.note || '')
      };
      const milestones = Array.isArray(thesis.milestones)
        ? thesis.milestones.map(item => ({
          id: String(item?.id || uid('ms')),
          name: String(item?.name || '未命名里程碑'),
          due: String(item?.due || ''),
          done: !!item?.done,
          doneAt: String(item?.doneAt || ''),
          note: String(item?.note || '')
        }))
        : def.milestones.map(v => ({ ...v }));
      const chapters = Array.isArray(thesis.chapters)
        ? thesis.chapters.map(item => ({
          id: String(item?.id || uid('ch')),
          name: String(item?.name || '未命名章节'),
          progress: Math.max(0, Math.min(100, Number(item?.progress) || 0)),
          status: ['draft','revise','done'].includes(item?.status) ? item.status : 'draft',
          updatedAt: String(item?.updatedAt || ''),
          note: String(item?.note || '')
        }))
        : def.chapters.map(v => ({ ...v }));
      const logs = Array.isArray(thesis.logs)
        ? thesis.logs.map(item => ({
          id: String(item?.id || uid('thlog')),
          date: String(item?.date || todayStr()),
          type: ['writing','revise','experiment','meeting','other'].includes(item?.type) ? item.type : 'other',
          minutes: Math.max(0, Number(item?.minutes) || 0),
          words: Math.max(0, Number(item?.words) || 0),
          note: String(item?.note || ''),
          at: String(item?.at || item?.ts || nowDateTime())
        }))
        : [];
      return { meta, milestones, chapters, logs };
    }


    function normalizeReimbFile(item) {
      if (!item || typeof item !== 'object') return null;
      const attachmentRef = window.PhdWorkbenchAttachments?.normalizeRef?.(item);
      if (attachmentRef) return attachmentRef;
      const dataUrl = String(item.dataUrl || item.url || '');
      const name = String(item.name || item.filename || '文件');
      if (!dataUrl) return null;
      return { id: String(item.id || uid('rf')), name, dataUrl, type: String(item.type || '') };
    }
    function normalizeReimbState(reimb) {
      const base = { pending: [], done: [] };
      if (!reimb || typeof reimb !== 'object') return base;
      const normalizeItem = (item, done=false) => ({
        id: String(item?.id || uid('reimb')),
        content: String(item?.content || item?.title || '').trim() || '未命名报销',
        amount: Math.max(0, Number(item?.amount) || 0),
        invoices: Array.isArray(item?.invoices) ? item.invoices.map(normalizeReimbFile).filter(Boolean) : [],
        receipts: Array.isArray(item?.receipts) ? item.receipts.map(normalizeReimbFile).filter(Boolean) : [],
        date: String(item?.date || dateFromDateTime(item?.createdAt) || todayStr()),
        createdAt: String(item?.createdAt || nowDateTime()),
        doneDate: done ? String(item?.doneDate || '') : '',
        projectNum: done ? String(item?.projectNum || '') : '',
        completedAt: done ? String(item?.completedAt || item?.createdAt || nowDateTime()) : ''
      });
      return {
        pending: Array.isArray(reimb.pending) ? reimb.pending.map(item => normalizeItem(item, false)).filter(item => item.amount > 0) : [],
        done: Array.isArray(reimb.done) ? reimb.done.map(item => normalizeItem(item, true)).filter(item => item.amount > 0) : []
      };
    }

    function buildStateFromParsed(parsed={}) {
      const nextState = {
        meta: normalizeStateMeta(parsed.meta),
        ui: normalizeUiState(parsed.ui),
        attendance: normalizeAttendance(parsed.attendance),
        timeBlocks: parsed.timeBlocks && typeof parsed.timeBlocks === 'object' ? parsed.timeBlocks : {},
        tasks: normalizeTasksState(parsed.tasks),
        projects: normalizeProjectsState(parsed.projects),
        focus: parsed.focus && typeof parsed.focus === 'object' ? { active: parsed.focus.active || null, sessions: Array.isArray(parsed.focus.sessions) ? parsed.focus.sessions : [] } : { active:null, sessions:[] },
        habits: normalizeHabitsState(parsed.habits),
        foods: Array.isArray(parsed.foods) ? parsed.foods : [],
        weights: Array.isArray(parsed.weights) ? parsed.weights.map(item => ({
          id: String(item.id || uid('weight')),
          date: String(item.date || dateFromDateTime(item.at) || todayStr()),
          value: Math.max(0, Number(item.value) || 0),
          unit: ['kg','斤','lb'].includes(item.unit) ? item.unit : 'kg',
          at: String(item.at || nowDateTime())
        })).filter(item => item.value > 0) : [],
        mood: normalizeMoodMap(parsed.mood),
        reflections: normalizeReflectionMap(parsed.reflections),
        care: normalizeCareState(parsed.care, parsed.mood),
        mentor: normalizeMentorState(parsed.mentor),
        reviewDaily: normalizeDailyReviewState(parsed.reviewDaily, parsed.reflections),
        submissions: normalizeSubmissions(parsed.submissions),
        reimb: normalizeReimbState(parsed.reimb),
        thesis: normalizeThesisState(parsed.thesis),
        reminders: normalizeRemindersState(parsed.reminders)
      };
      nextState.tasks = nextState.tasks.map(task => {
        const normalized = normalizeTaskItem(task);
        if (!normalized) return null;
        if (normalized.projectId && !nextState.projects.some(project => project.id === normalized.projectId)) normalized.projectId = '';
        return normalized;
      }).filter(Boolean);
      nextState.projects = nextState.projects.map(project => {
        const normalized = normalizeProjectItem(project);
        if (!normalized) return null;
        const origin = normalizeProjectOrigin(normalized.origin, normalized);
        if (origin.type === 'submission' && origin.refId && origin.refId !== 'module' && !nextState.submissions.some(item => item.id === origin.refId)) {
          normalized.origin = { type: 'manual', refId: '' };
        }
        return normalized;
      }).filter(Boolean);
      Object.entries(nextState.mentor?.entries || {}).forEach(([date, entry]) => {
        if (entry.promiseTaskId && !nextState.tasks.some(task => task.id === entry.promiseTaskId)) nextState.mentor.entries[date].promiseTaskId = '';
        if (entry.nextActionTaskId && !nextState.tasks.some(task => task.id === entry.nextActionTaskId)) nextState.mentor.entries[date].nextActionTaskId = '';
      });
      Object.entries(nextState.reviewDaily?.entries || {}).forEach(([date, entry]) => {
        const ids = Array.isArray(entry.tomorrowTaskIds) ? entry.tomorrowTaskIds : [];
        nextState.reviewDaily.entries[date].tomorrowTaskIds = ids.map(id => (id && nextState.tasks.some(task => task.id === id) ? id : ''));
      });
      nextState.meta.schemaVersion = APP_SCHEMA_VERSION;
      nextState.ui = normalizeUiState(nextState.ui);
      return nextState;
    }
    function loadState() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : {};
        return buildStateFromParsed(parsed);
      } catch (err) {
        console.error(err);
        return buildStateFromParsed({});
      }
    }

    const state = loadState();
    let workflowSelectedProjectId = '';

    function replaceState(nextState) {
      Object.keys(state).forEach(key => delete state[key]);
      Object.assign(state, nextState);
    }
    function serializeState() {
      state.meta = normalizeStateMeta(state.meta);
      state.ui = normalizeUiState(state.ui);
      return JSON.stringify(state, null, 2);
    }
    function persistStateToLocal(raw) {
      localStorage.setItem(STORAGE_KEY, raw);
      storageMeta.lastSavedAt = nowDateTime();
    }
    function queueJsonFilePersist(raw = serializeState()) {
      if (!isTauriRuntime()) return Promise.resolve(null);
      storageMeta.backend = '桌面 JSON 文件';
      storageMeta.syncState = '正在同步 JSON';
      if (persistStateTimer) clearTimeout(persistStateTimer);
      return new Promise((resolve) => {
        persistStateTimer = setTimeout(async () => {
          try {
            const result = await invokeTauri('write_state_json', { payload: raw });
            storageMeta.backend = '桌面 JSON 文件';
            storageMeta.filePath = result?.path || storageMeta.filePath;
            storageMeta.syncState = '已同步到 JSON';
            storageMeta.lastSavedAt = nowDateTime();
          } catch (err) {
            console.error(err);
            storageMeta.syncState = 'JSON 写入失败，已保留本地缓存';
          } finally {
            persistStateTimer = null;
            if (isSectionVisible('settings-section')) refreshSettings();
            resolve();
          }
        }, 120);
      });
    }
    async function hydrateStateFromJson() {
      if (!isTauriRuntime()) {
        storageMeta.backend = '浏览器本地缓存';
        storageMeta.syncState = '当前为浏览器缓存模式';
        if (isSectionVisible('settings-section')) refreshSettings();
        return;
      }
      try {
        const result = await invokeTauri('read_state_json');
        storageMeta.backend = '桌面 JSON 文件';
        storageMeta.filePath = result?.path || storageMeta.filePath;
        if (result?.exists && result?.content) {
          replaceState(buildStateFromParsed(JSON.parse(result.content)));
          currentSection = resolveRoute(state.ui?.lastDomain || currentSection);
          storageMeta.syncState = '已从 JSON 加载';
          storageMeta.lastLoadedAt = nowDateTime();
          persistStateToLocal(serializeState());
          navTo(currentSection);
        } else {
          storageMeta.syncState = '已启用 JSON 存储';
          const raw = localStorage.getItem(STORAGE_KEY) || serializeState();
          persistStateToLocal(raw);
          queueJsonFilePersist(raw);
        }
      } catch (err) {
        console.error(err);
        storageMeta.syncState = 'JSON 加载失败，继续使用本地缓存';
      } finally {
        if (isSectionVisible('settings-section')) refreshSettings();
      }
    }
    async function clearJsonFileStorage() {
      if (!isTauriRuntime()) return;
      try {
        await invokeTauri('clear_state_json');
        storageMeta.syncState = '已删除 JSON 文件';
      } catch (err) {
        console.error(err);
        storageMeta.syncState = 'JSON 文件删除失败';
      }
    }
    function saveState() {
      state.meta = normalizeStateMeta(state.meta);
      state.ui = normalizeUiState(state.ui);
      const raw = serializeState();
      persistStateToLocal(raw);
      queueJsonFilePersist(raw);
      window.PhdWorkbenchSyncAdapter?.notifyLocalChange?.();
      if (isSectionVisible('settings-section')) refreshSettings();
    }
    async function migrateLegacyAttachmentsInState({ render = false } = {}) {
      if (!window.PhdWorkbenchAttachments?.migrateLegacyDataUrls) return 0;
      const count = await window.PhdWorkbenchAttachments.migrateLegacyDataUrls(state);
      if (count > 0) {
        saveState();
        if (render && typeof renderAll === 'function') renderAll();
      }
      return count;
    }
    function persistUiState() {
      state.meta = normalizeStateMeta(state.meta);
      state.ui = normalizeUiState({
        ...state.ui,
        lastDomain: currentSection
      });
      const raw = serializeState();
      persistStateToLocal(raw);
      queueJsonFilePersist(raw);
    }
    function getDayAttendance(date=todayStr()) {
      if (!state.attendance[date]) state.attendance[date] = { wake:null, sleep:null, logs:[], leaves:[] };
      return state.attendance[date];
    }
    function getDayTimeBlocks(date=todayStr()) {
      if (!state.timeBlocks[date]) state.timeBlocks[date] = [];
      return state.timeBlocks[date];
    }
    function getHabitEntryMap(date=todayStr()) {
      if (!state.habits.entries[date]) state.habits.entries[date] = {};
      return state.habits.entries[date];
    }
    function projectById(id='') { return state.projects.find(item => item.id === id) || null; }
    function careEntryOn(date=todayStr()) { return normalizeCareEntry(state.care?.entries?.[date]); }
    function mentorEntryOn(date=todayStr()) { return normalizeMentorEntry(state.mentor?.entries?.[date]); }
    function dailyReviewEntryOn(date=todayStr()) { return normalizeDailyReviewEntry(state.reviewDaily?.entries?.[date]); }
    function activeTask() { return state.tasks.find(t => t.status === 'active') || null; }
    function taskOpen(task) { return task && task.status !== 'done' && task.gtdBucket !== 'done'; }
    function openTasksList() { return state.tasks.filter(taskOpen); }
    function tasksForProject(projectId='') { return state.tasks.filter(item => item.projectId === projectId); }
    function nextActionTasks() { return state.tasks.filter(item => taskOpen(item) && item.gtdBucket === 'next'); }
    function focusMinutesOn(date=todayStr()) { return state.focus.sessions.filter(s => s.date===date).reduce((sum,s)=>sum + (Number(s.minutes)||0), 0); }
    function reviewPriorityCount(entry) {
      const clean = normalizeDailyReviewEntry(entry);
      return clean.tomorrow.filter(item => String(item || '').trim()).length;
    }
    function reviewTemplateCount(entry) {
      const clean = normalizeDailyReviewEntry(entry);
      return [
        clean.accomplishments,
        clean.unfinished,
        clean.insights,
        clean.obstacles,
        reviewPriorityCount(clean) ? 'tomorrow' : ''
      ].filter(item => String(item || '').trim()).length;
    }
    function reviewContentCount(entry) {
      const clean = normalizeDailyReviewEntry(entry);
      return reviewTemplateCount(clean) + (clean.energyNote.trim() ? 1 : 0);
    }
    function careCountOn(date=todayStr()) {
      const entry = careEntryOn(date);
      return entry.updatedAt || entry.challenge || entry.selfCare || entry.gratitude || entry.support || entry.note ? 1 : 0;
    }
    function mentorCountOn(date=todayStr()) {
      const entry = mentorEntryOn(date);
      return entry.updatedAt || entry.topic || entry.evidence || entry.ask || entry.risk || entry.feedback || entry.commitment || entry.confirmation || entry.followupDate || entry.boundary || entry.nextAction || entry.status !== 'drafting' || entry.channel || entry.pressure !== 3 || entry.clarity !== 3 || entry.promiseStatus !== 'open' ? 1 : 0;
    }
    function reviewCountOn(date=todayStr()) {
      const entry = dailyReviewEntryOn(date);
      return entry.updatedAt || reviewContentCount(entry) > 0 ? 1 : 0;
    }
    function supportPageCountOn(date=todayStr()) { return careCountOn(date) + mentorCountOn(date) + reviewCountOn(date); }
    function moodCountOn(date=todayStr()) { return careCountOn(date) + reviewCountOn(date); }
    function mentorPendingItems(baseDate=todayStr()) {
      return Object.entries(state.mentor?.entries || {})
        .map(([date]) => ({ date, entry: mentorEntryOn(date) }))
        .filter(item => item.entry.commitment.trim() && item.entry.promiseStatus !== 'resolved')
        .sort((a, b) => (a.entry.followupDate || '9999-99-99').localeCompare(b.entry.followupDate || '9999-99-99') || b.date.localeCompare(a.date));
    }
    function mentorOverdueCount(baseDate=todayStr()) {
      return mentorPendingItems(baseDate).filter(item => item.entry.followupDate && item.entry.followupDate < baseDate).length;
    }
    function runningSubmissionCount() { return state.submissions.filter(s => !['已接收','已见刊/已收录','搁置/拒稿'].includes(s.stage)).length; }
    function totalAttendanceMinutes(date=todayStr()) { return (state.attendance[date]?.logs || []).reduce((sum,log)=>sum + (log.end ? minutesBetween(log.start, log.end) : 0), 0); }
    function todayOpenLogs(date=todayStr()) { return getDayAttendance(date).logs.filter(log => !log.end); }
    function qualifiesWake(time) { return !!parseHM(time) && hmToMinutes(time) <= hmToMinutes('09:00'); }
    function qualifiesSleep(time) { return !!parseHM(time) && hmToMinutes(time) <= hmToMinutes('23:30'); }
    function todayHabitCompletion(date=todayStr()) {
      const habits = (state.habits?.list || []).filter(h => h && h.enabled !== false);
      const trackables = habits.filter(h => !LEGACY_REMOVED_HABITS.has(h.id));
      if (!trackables.length) return 0;
      const doneCount = trackables.filter(h => habitDoneOnDate(h, date)).length;
      return Math.round(doneCount / trackables.length * 100);
    }
    function ensureTaskCleanup() {
      state.tasks = normalizeTasksState(state.tasks);
      state.projects = normalizeProjectsState(state.projects);
    }
    ensureTaskCleanup();

    function setInputIfIdle(id, value) {
      const el = $(id);
      if (!el) return;
      if (document.activeElement === el) return;
      const v = String(value ?? '');
      if (el.value !== v) el.value = v;
    }

    function thesisOverallProgress() {
      const thesis = state.thesis || defaultThesisState();
      const milestones = Array.isArray(thesis.milestones) ? thesis.milestones : [];
      const chapters = Array.isArray(thesis.chapters) ? thesis.chapters : [];
      const msTotal = milestones.length;
      const msDone = milestones.filter(m => m.done).length;
      const msRatio = msTotal ? msDone / msTotal : 0;
      const chTotal = chapters.length;
      const chRatio = chTotal ? chapters.reduce((sum, c) => sum + (Number(c.progress) || 0), 0) / (100 * chTotal) : 0;
      const overall = Math.round((msRatio * 0.4 + chRatio * 0.6) * 100);
      return Math.max(0, Math.min(100, overall));
    }

    function renderThesisThemeStats() {
      const range = getStatsRange(todayStr());
      if ($('thesisStatsRangeLabel')) $('thesisStatsRangeLabel').textContent = range.label;
      const logs = (state.thesis?.logs || []);
      const inRangeLogs = logs.filter(item => isDateInRange(item.date, range.start, range.end));
      const minutes = inRangeLogs.reduce((sum, item) => sum + (Number(item.minutes) || 0), 0);
      const words = inRangeLogs.reduce((sum, item) => sum + (Number(item.words) || 0), 0);
      const milestoneDone = (state.thesis?.milestones || []).filter(m => m.doneAt && isDateInRange(dateFromDateTime(m.doneAt), range.start, range.end)).length;
      const chapterUpdated = (state.thesis?.chapters || []).filter(c => c.updatedAt && isDateInRange(dateFromDateTime(c.updatedAt), range.start, range.end)).length;
      const cards = [
        { label:`${statsModeText()}日志条目`, value: inRangeLogs.length, color:'text-dopamine-sky' },
        { label:`${statsModeText()}投入分钟`, value: Math.round(minutes), color:'text-dopamine-orange' },
        { label:`${statsModeText()}写作字数`, value: Math.round(words), color:'text-dopamine-pink' },
        { label:`${statsModeText()}章节更新`, value: chapterUpdated, color:'text-dopamine-purple' },
        { label:`${statsModeText()}完成里程碑`, value: milestoneDone, color:'text-dopamine-mint' }
      ];
      $('thesisThemeStats').innerHTML = cards.map(item => `
        <div class="small-stat p-4">
          <div class="text-sm text-calm-mute">${item.label}</div>
          <div class="text-2xl font-black mt-1 ${item.color}">${escapeHtml(String(item.value))}</div>
        </div>
      `).join('');
    }

    function renderThesisMeta() {
      const thesis = state.thesis || defaultThesisState();
      setInputIfIdle('thesisMetaTitle', thesis.meta?.title || '');
      setInputIfIdle('thesisMetaTargetDate', thesis.meta?.targetDate || '');
      setInputIfIdle('thesisMetaVersion', thesis.meta?.version || '');
      setInputIfIdle('thesisMetaNote', thesis.meta?.note || '');
      const overall = thesisOverallProgress();
      if ($('thesisOverallText')) $('thesisOverallText').textContent = `${overall}%`;
      if ($('thesisOverallBar')) $('thesisOverallBar').style.width = `${overall}%`;
      if ($('thesisOverallHint')) {
        const msTotal = thesis.milestones?.length || 0;
        const msDone = (thesis.milestones || []).filter(m => m.done).length;
        const chTotal = thesis.chapters?.length || 0;
        $('thesisOverallHint').textContent = `里程碑 ${msDone}/${msTotal} · 章节 ${chTotal} 个`;
      }
    }

    function addThesisMilestone() {
      const name = $('thesisMilestoneName').value.trim();
      if (!name) return;
      const due = $('thesisMilestoneDue').value || '';
      state.thesis.milestones.unshift({ id: uid('ms'), name, due, done:false, doneAt:'', note:'' });
      $('thesisMilestoneName').value = '';
      $('thesisMilestoneDue').value = '';
      saveState(); renderAll();
    }
    function toggleThesisMilestoneDone(id) {
      const item = state.thesis.milestones.find(m => m.id === id);
      if (!item) return;
      item.done = !item.done;
      item.doneAt = item.done ? nowDateTime() : '';
      saveState(); renderAll();
    }
    function renderThesisMilestones() {
      const list = (state.thesis?.milestones || []);
      $('thesisMilestoneList').innerHTML = list.map(item => `
        <div class="rounded-2xl border border-calm-line bg-white p-3 flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="flex items-center gap-3">
              <button class="w-10 h-10 rounded-2xl ${item.done ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-calm-mute'} font-black" data-ms-toggle="${item.id}" title="切换完成状态">${item.done ? faIcon('fa-check') : ''}</button>
              <div class="min-w-0">
                <div class="font-black ${item.done ? 'line-through text-calm-mute' : ''}">${escapeHtml(item.name)}</div>
                <div class="text-xs text-calm-mute mt-1">${item.due ? `截止：${escapeHtml(item.due)}` : '未设置截止'}${item.doneAt ? ` · 完成于 ${escapeHtml(item.doneAt)}` : ''}</div>
              </div>
            </div>
          </div>
          <button class="text-sm font-bold text-dopamine-orange" data-ms-edit="${item.id}">修改</button>
        </div>
      `).join('') || '<div class="text-sm text-calm-mute">还没有里程碑，先添加一条吧。</div>';
      $('thesisMilestoneList').querySelectorAll('[data-ms-toggle]').forEach(btn => btn.onclick = () => toggleThesisMilestoneDone(btn.dataset.msToggle));
      $('thesisMilestoneList').querySelectorAll('[data-ms-edit]').forEach(btn => btn.onclick = () => openThesisMilestoneEditor(btn.dataset.msEdit));
    }

    function addThesisChapter() {
      const name = $('thesisChapterName').value.trim();
      if (!name) return;
      const status = ['draft','revise','done'].includes($('thesisChapterStatus').value) ? $('thesisChapterStatus').value : 'draft';
      state.thesis.chapters.unshift({ id: uid('ch'), name, progress: 0, status, updatedAt: nowDateTime(), note:'' });
      $('thesisChapterName').value = '';
      saveState(); renderAll();
    }
    function setThesisChapterProgress(id, value) {
      const item = state.thesis.chapters.find(c => c.id === id);
      if (!item) return;
      item.progress = Math.max(0, Math.min(100, Number(value) || 0));
      item.updatedAt = nowDateTime();
      if (item.progress >= 100) item.status = 'done';
      saveState(); renderAll();
    }
    function renderThesisChapters() {
      const list = (state.thesis?.chapters || []);
      const statusText = { draft:'草稿', revise:'修改', done:'完成' };
      const statusColor = { draft:'bg-gray-100 text-calm-mute', revise:'bg-amber-100 text-amber-700', done:'bg-green-100 text-green-700' };
      $('thesisChapterList').innerHTML = list.map(item => `
        <div class="rounded-2xl border border-calm-line bg-white p-4">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <div class="font-black">${escapeHtml(item.name)}</div>
              <div class="text-xs text-calm-mute mt-1">${item.updatedAt ? `更新：${escapeHtml(item.updatedAt)}` : '未更新'}</div>
            </div>
            <div class="flex items-center gap-2">
              <span class="pill ${statusColor[item.status] || statusColor.draft}">${statusText[item.status] || '草稿'}</span>
              <button class="text-sm font-bold text-dopamine-orange" data-ch-edit="${item.id}">修改</button>
            </div>
          </div>
          <div class="mt-3 flex items-center gap-3">
            <input data-ch-range="${item.id}" type="range" min="0" max="100" value="${Number(item.progress) || 0}" class="w-full">
            <div class="font-black mono w-12 text-right">${Math.round(Number(item.progress) || 0)}%</div>
          </div>
          <div class="mt-2 h-2 rounded-full bg-gray-100 overflow-hidden">
            <div class="h-full" style="width:${Math.max(0, Math.min(100, Number(item.progress) || 0))}%; background: linear-gradient(90deg, #43AA8B, #4D9DE0);"></div>
          </div>
        </div>
      `).join('') || '<div class="text-sm text-calm-mute">还没有章节，先添加一条吧。</div>';
      $('thesisChapterList').querySelectorAll('[data-ch-range]').forEach(el => el.onchange = () => setThesisChapterProgress(el.dataset.chRange, el.value));
      $('thesisChapterList').querySelectorAll('[data-ch-edit]').forEach(btn => btn.onclick = () => openThesisChapterEditor(btn.dataset.chEdit));
    }

    function addThesisLog() {
      const date = $('thesisLogDate').value || todayStr();
      const type = $('thesisLogType').value || 'other';
      const minutes = Math.max(0, Number($('thesisLogMinutes').value) || 0);
      const words = Math.max(0, Number($('thesisLogWords').value) || 0);
      const note = $('thesisLogNote').value.trim();
      state.thesis.logs.unshift({ id: uid('thlog'), date, type, minutes, words, note, at: nowDateTime() });
      $('thesisLogMinutes').value = '';
      $('thesisLogWords').value = '';
      $('thesisLogNote').value = '';
      saveState(); renderAll();
    }
    function renderThesisLogs() {
      const icons = { writing:'fa-pen-to-square', revise:'fa-pen-nib', experiment:'fa-flask', meeting:'fa-comments', other:'fa-thumbtack' };
      const typeText = { writing:'写作', revise:'修改', experiment:'实验', meeting:'讨论/组会', other:'其他' };
      const logs = (state.thesis?.logs || []).slice(0, 30);
      $('thesisLogList').innerHTML = logs.map(item => `
        <div class="rounded-2xl border border-calm-line bg-white p-3 flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <div class="text-2xl">${faIcon(icons[item.type] || icons.other)}</div>
              <div class="min-w-0">
                <div class="font-black">${escapeHtml(item.date)} · ${escapeHtml(typeText[item.type] || '其他')}</div>
                <div class="text-xs text-calm-mute mt-1">${item.minutes ? `${Math.round(item.minutes)} 分钟` : '—'}${item.words ? ` · ${Math.round(item.words)} 字` : ''}${item.note ? ` · ${escapeHtml(item.note)}` : ''}</div>
              </div>
            </div>
          </div>
          <button class="text-sm font-bold text-dopamine-orange" data-thlog-edit="${item.id}">修改</button>
        </div>
      `).join('') || '<div class="text-sm text-calm-mute">还没有推进日志，先记录一条吧。</div>';
      $('thesisLogList').querySelectorAll('[data-thlog-edit]').forEach(btn => btn.onclick = () => openThesisLogEditor(btn.dataset.thlogEdit));
    }

    function saveThesisMeta() {
      state.thesis.meta = {
        title: $('thesisMetaTitle').value.trim(),
        targetDate: $('thesisMetaTargetDate').value || '',
        version: $('thesisMetaVersion').value.trim(),
        note: $('thesisMetaNote').value.trim()
      };
      saveState(); renderAll();
      alert('已保存论文信息。');
    }

    function renderThesis() {
      renderThesisThemeStats();
      renderThesisMeta();
      renderThesisMilestones();
      renderThesisChapters();
      renderThesisLogs();
    }

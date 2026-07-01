// ============================================================
// MEETING MANAGEMENT PLATFORM - app.js
// Full lifecycle: Login → Room → Agenda → AI Recording → Minutes → Save
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
  if (window.lucide) lucide.createIcons();

  // ========== EMPLOYEES DB ==========
  const EMPLOYEES = [
    { name: "ابراهيم خليل مزهر",          id: "400152", phone: "96566695443" },
    { name: "عبدالله سالم مهوس",           id: "465154", phone: "96566460464" },
    { name: "مشعل صالح الشمري",            id: "440103", phone: "96599582005" },
    { name: "لافي هجرس عبدالله",           id: "435103", phone: "96597244213" },
    { name: "وليد محمد أحمد علي الهتاري", id: "325145", phone: "96555963037" },
    { name: "سعود ماجد محسن",              id: "325137", phone: "96599545705" },
    { name: "رسام عبدالله مضحي عبدالله",   id: "465113", phone: "96599807881" },
    { name: "علاء حسين سعيد حسين",         id: "315125", phone: "96598853383" },
    { name: "مشعل مضحي موسي",              id: "466103", phone: "96597915529" },
    { name: "محمد زين العابدين محمد سليم", id: "470125", phone: "96597288577" },
    { name: "مساعد جمعة الشمري",           id: "325109", phone: "96599497497" },
    { name: "احمد جبار نخيلان",            id: "315103", phone: "96597536333" },
    { name: "عقاب لافي جندار",             id: "465104", phone: "96599222624" },
    { name: "عصام ابراهيم",               id: "465133", phone: "96598770453" },
    { name: "محمد ناظر خان محمد طاهر",    id: "400137", phone: "96599096467" },
    { name: "وليد الفقيه",                 id: "325143", phone: "96555410444" },
    { name: "موسى حسانين محمد",            id: "315102", phone: "96599501171" },
    { name: "محمد عمر سالمين",             id: "350108", phone: "96594927617" },
    { name: "خالد صالح عبدالمانع",         id: "325142", phone: "96594027705" }
  ];

  // ========== STATE ==========
  let currentUser = null;
  let currentMeetingId = null;
  let isRecording = false;
  let recognition = null;
  let isSpeechActive = false;
  let meetings = [];
  let agendaItems = [];
  let attendees = [];
  let minutesItems = [];
  let actionItems = [];
  // meetingCounter now handled by backend

  // ========== API KEYS & BACKEND ==========
  const GEMINI_API_KEY = "AQ.Ab8RN6LUm9ygPswcLTL58FR114q4ujNH2CECQdUyh2lR9PGI6g";
  const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxRGrZwpI5z5ZGDBzvpfywF9w7ZQf_4SDdK8cJkmCIbf8G6h3atw7CiQufaBdRdEq8a/exec";

  // ========== AUTH ==========
  const loginScreen   = document.getElementById("loginScreen");
  const dashboardLayout = document.getElementById("dashboardLayout");

  window.fetchMeetingsFromCloud = async function() {
    try {
      const container = document.getElementById('meetingsTableContainer');
      if(container) container.innerHTML = '<div class="text-center py-10"><i data-lucide="loader-2" class="w-8 h-8 animate-spin mx-auto text-[#097834]"></i><p class="mt-4 text-[#66756d] font-bold">جاري المزامنة مع السحابة...</p></div>';
      if(window.lucide) lucide.createIcons();

      const res = await fetch(SCRIPT_URL + '?action=getMeetings');
      const data = await res.json();
      if(data.success && data.meetings) {
        meetings = data.meetings.filter(m => !m.deleted);
        renderMeetingsTable();
      }
    } catch(e) {
      console.error('Error fetching meetings:', e);
    }
  };

  function initApp() {
    const saved = localStorage.getItem('loggedInUser');
    if (saved) {
      currentUser = JSON.parse(saved);
      loginScreen.classList.add("hide");
      dashboardLayout.classList.remove("hide");
      const firstName = currentUser.name.split(" ")[0];
      document.getElementById("sidebarUserName").innerText  = currentUser.name;
      document.getElementById("dashUserName").innerText     = firstName;
      document.getElementById("sidebarUserInitials").innerText = firstName.charAt(0);
      populateMembersTable();
      navigateTo('dashboard');
      fetchMeetingsFromCloud(); // <--- Fetch from Google Script
    } else {
      loginScreen.classList.remove("hide");
      dashboardLayout.classList.add("hide");
    }
    if (window.lucide) lucide.createIcons();
  }

  window.attemptLogin = () => {
    const inputId = document.getElementById("loginIdInput").value.trim();
    const errorEl = document.getElementById("loginError");
    const user = EMPLOYEES.find(e => e.id === inputId);
    if (user) {
      errorEl.classList.add("hide");
      localStorage.setItem('loggedInUser', JSON.stringify(user));
      initApp();
    } else {
      errorEl.classList.remove("hide");
      document.getElementById("loginIdInput").value = "";
    }
  };

  window.logout = () => {
    localStorage.removeItem('loggedInUser');
    currentUser = null;
    document.getElementById("loginIdInput").value = "";
    initApp();
  };

  // ========== NAVIGATION ==========
  const ALL_VIEWS = ['viewDashboard','viewMeetings','viewMembers'];

  function hideAllViews() {
    ALL_VIEWS.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.add("hide");
    });
    document.querySelectorAll('.sidebar-link').forEach(b => b.classList.remove('active'));
  }

  window.navigateTo = (view) => {
    hideAllViews();
    closeWizard();
    const el = document.getElementById('view' + capitalize(view));
    if (el) el.classList.remove("hide");
    const navBtn = document.getElementById('nav-' + view);
    if (navBtn) navBtn.classList.add('active');
    if (view === 'meetings') renderMeetingsTable();
    if (window.lucide) lucide.createIcons();
  };

  function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  // ========== MEMBERS ==========
  function populateMembersTable() {
    const tbody = document.getElementById("membersTableBody");
    if (!tbody) return;
    tbody.innerHTML = "";
    EMPLOYEES.forEach((emp, i) => {
      tbody.innerHTML += `
        <tr class="hover:bg-gray-50 transition-colors">
          <td class="p-4 text-[#66756d] text-sm">${i + 1}</td>
          <td class="p-4 font-bold text-[#17201b]">${emp.name}</td>
          <td class="p-4 text-[#66756d] font-mono text-sm">${emp.id}</td>
        </tr>`;
    });
    if (window.lucide) lucide.createIcons();
  }

  // ========== WIZARD OPEN/CLOSE ==========
  window.startNewMeeting = () => {
    currentMeetingId = null;
    resetWizard();
    document.getElementById("wizardOverlay").classList.remove("hide");
    goToStep(1);
  };

  window.closeWizard = () => {
    document.getElementById("wizardOverlay").classList.add("hide");
    stopRecording();
  };

  function resetWizard() {
    // Reset state
    agendaItems = [];
    attendees = [];
    minutesItems = [];
    actionItems = [];
    isRecording = false;
    if (recognition && isSpeechActive) {
      recognition.stop();
    }

    // Reset fields
    ['bookingDate','bookingTime','agendaDept','agendaLocation','agendaDate','agendaTime',
     'transcriptArea','minNum','minLocation'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });

    // Reset booking
    document.getElementById('bookingDetails').classList.add('hide');
    document.getElementById('btnYesBooked').classList.remove('bg-[#097834]','text-white');

    // Clear lists
    ['agendaItemsList','attendeeTableBody','minutesItemsTbody','actionItemsTbody'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = '';
    });

    // Reset AI
    document.getElementById('aiTasksSection').classList.add('hide');
    document.getElementById('aiTasksList').innerHTML = '';
    document.getElementById('recordingBadge').classList.add('hide');

    // Add default agenda item and attendee
    addAgendaItem();
    addAttendeeRow();
    addMinuteItem();
    addActionItem();
  }

  // ========== STEPPER ==========
  const STEP_PROGRESS = { 1: '0%', 2: '25%', 3: '50%', 4: '75%', 5: '100%' };

  window.goToStep = (step) => {
    if (step === 3) updateAgendaPreview();
    if (step === 4) {
      updateAgendaPreview();
      updateMinutesPreview();
      syncMinutesFromAgenda();
    }
    if (step === 5) {
      updateMinutesPreview();
    }

    // Hide all panels
    for (let i = 1; i <= 5; i++) {
      const p = document.getElementById('wzStep' + i);
      if (p) { p.classList.remove('active'); p.style.display = 'none'; }
    }
    const target = document.getElementById('wzStep' + step);
    if (target) { target.classList.add('active'); target.style.display = 'block'; }

    // Update stepper dots
    for (let i = 1; i <= 5; i++) {
      const dot = document.getElementById('stepDot' + i);
      if (!dot) continue;
      const circle = dot.querySelector('.step-dot');
      const label = dot.querySelector('span');
      if (i < step) {
        circle.className = 'step-dot done';
        if (label) { label.className = 'text-[10px] font-bold text-[#097834]'; }
      } else if (i === step) {
        circle.className = 'step-dot active';
        if (label) { label.className = 'text-[10px] font-bold text-[#097834]'; }
      } else {
        circle.className = 'step-dot idle';
        if (label) { label.className = 'text-[10px] font-bold text-gray-400'; }
      }
    }

    // Update progress line
    const prog = document.getElementById('stepperProgress');
    if (prog) prog.style.width = STEP_PROGRESS[step] || '0%';

    // Scroll to top of wizard
    document.getElementById('wizardOverlay').scrollTop = 0;
    if (window.lucide) lucide.createIcons();
  };

  // ========== HIJRI DATE CONVERTER ==========
  function toHijri(dateVal) {
    if (!dateVal) return '---';
    try {
      const d = new Date(dateVal + 'T12:00:00');
      const hijri = new Intl.DateTimeFormat('ar-SA-u-ca-islamic', {
        day: 'numeric', month: 'long', year: 'numeric'
      }).format(d);
      return hijri;
    } catch(e) {
      return '---';
    }
  }

  // ========== STEP 1: ROOM BOOKING ==========
  window.setBookingStatus = (booked) => {
    const details = document.getElementById('bookingDetails');
    const yBtn = document.getElementById('btnYesBooked');
    const err = document.getElementById('step1Error');
    if (booked) {
      details.classList.remove('hide');
      yBtn.classList.add('bg-[#097834]','text-white');
      if (err) err.classList.add('hide'); // Clear error if they click Yes
    }
  };

  window.validateAndGoToStep2 = () => {
    const details = document.getElementById('bookingDetails');
    const err = document.getElementById('step1Error');
    const errMsg = document.getElementById('step1ErrorMsg');
    
    const isBooked = !details.classList.contains('hide');
    if (!isBooked) {
      errMsg.innerText = 'يجب الإقرار بحجز القاعة بالضغط على زر "نعم" أولاً للتمكن من المتابعة.';
      err.classList.remove('hide');
      return;
    }
    const d = document.getElementById('bookingDate').value;
    const t = document.getElementById('bookingTime').value;
    if (!d || !t) {
      errMsg.innerText = 'يرجى تحديد التاريخ والوقت للاجتماع.';
      err.classList.remove('hide');
      return;
    }
    
    err.classList.add('hide');
    goToStep(2);
  };

  function checkAutoAdvance() {
    const d = document.getElementById('bookingDate').value;
    const t = document.getElementById('bookingTime').value;
    if (d && t) {
      const notice = document.getElementById('autoAdvanceNotice');
      if (notice) notice.classList.remove('hide');
      setTimeout(() => { goToStep(2); }, 1200);
    }
  }

  window.syncDateFromBooking = () => {
    const d = document.getElementById('bookingDate').value;
    document.getElementById('agendaDate').value = d;
    // Update Hijri
    const hj = toHijri(d);
    const hijriEl = document.getElementById('hijriDateDisplay');
    if (hijriEl) hijriEl.innerText = hj;
    const agendaHijri = document.getElementById('agendaHijriDate');
    if (agendaHijri) agendaHijri.value = hj;
    updateAgendaPreview();
    checkAutoAdvance();
  };

  window.syncHijriFromAgendaDate = () => {
    const d = document.getElementById('agendaDate').value;
    const hj = toHijri(d);
    const agendaHijri = document.getElementById('agendaHijriDate');
    if (agendaHijri) agendaHijri.value = hj;
  };

  window.syncTimeFromBooking = () => {
    const t = document.getElementById('bookingTime').value;
    document.getElementById('agendaTime').value = t;
    updateAgendaPreview();
    checkAutoAdvance();
  };

  const DEPARTMENT_MEMBERS = {
    "قسم الكلمة الطيبة": [
      { name: "حيلان الحيلان", role: "رئيس قسم الكلمة الطيبة" },
      { name: "طلال العلي", role: "عضو هيئة إدارية" },
      { name: "احمد نايف", role: "عضو هيئة إدارية" },
      { name: "أسامة الشطي", role: "عضو هيئة إدارية" },
      { name: "حمود العميري", role: "عضو هيئة إدارية" },
      { name: "فهد بن صبح", role: "عضو هيئة إدارية" },
      { name: "خالد المكيمي", role: "عضو هيئة إدارية" },
      { name: "عقاب الشمري", role: "مشرف" },
      { name: "موسى حسانين", role: "سكرتير" }
    ],
    "قسم الإعلامية والتسويق": [
      { name: "سعود حشف المطيري", role: "رئيس قسم" },
      { name: "مشعل العلي", role: "عضو هيئة إدارية" },
      { name: "خالد المكيمي", role: "عضو هيئة إدارية" },
      { name: "فهد سعود المطيري", role: "عضو هيئة إدارية" },
      { name: "يعقوب اللوغاني", role: "عضو هيئة إدارية" },
      { name: "وليد الفقيه", role: "مشرف" },
      { name: "سعود ماجد", role: "سكرتير" }
    ],
    "قسم الريع الوقفي": [
      { name: "سعود حشف المطيري", role: "رئيس قسم" },
      { name: "ناصر بن شوق", role: "عضو هيئة إدارية" },
      { name: "فهد المطيري", role: "عضو هيئة إدارية" },
      { name: "منصور الضعينة", role: "عضو هيئة إدارية" },
      { name: "فهد المويزري", role: "عضو هيئة إدارية" },
      { name: "وليد الفقيه", role: "مشرف" },
      { name: "وليد الفقيه", role: "سكرتير" }
    ],
    "قسم المشاريع": [
      { name: "مشعل العلي", role: "رئيس قسم" },
      { name: "طلال العلي", role: "عضو هيئة إدارية" },
      { name: "منصور الضعينة", role: "عضو هيئة إدارية" },
      { name: "عقاب الشمري", role: "مشرف" },
      { name: "مشعل صالح", role: "سكرتير" }
    ],
    "قسم الرعاية الاجتماعية": [
      { name: "ناصر بن شوق", role: "رئيس قسم" },
      { name: "منصور العدواني", role: "عضو هيئة إدارية" },
      { name: "عثمان الانصاري", role: "عضو هيئة إدارية" },
      { name: "يوسف اللحدان", role: "عضو هيئة إدارية" },
      { name: "مرزوق العتيبي", role: "عضو هيئة إدارية" },
      { name: "عقاب الشمري", role: "مشرف" },
      { name: "رسام عبدالله", role: "سكرتير" }
    ],
    "قسم النشء والشباب": [
      { name: "مشعل العلي", role: "رئيس قسم" },
      { name: "طلال العلي", role: "عضو هيئة إدارية" },
      { name: "حمد القطان", role: "عضو هيئة إدارية" },
      { name: "عدنان السعيد", role: "عضو هيئة إدارية" },
      { name: "إبراهيم الحميدي", role: "عضو هيئة إدارية" },
      { name: "خالد المكيمي", role: "عضو هيئة إدارية" },
      { name: "عقاب الشمري", role: "مشرف" },
      { name: "موسى حسانين", role: "سكرتير" }
    ],
    "قسم حلقات تحفيظ القرآن": [
      { name: "بندر المطيري", role: "رئيس قسم" },
      { name: "حمد القطان", role: "عضو هيئة إدارية" },
      { name: "طلال العلي", role: "عضو هيئة إدارية" },
      { name: "عبد الله الكندري", role: "عضو هيئة إدارية" },
      { name: "محمد علي مهدي", role: "عضو هيئة إدارية" },
      { name: "وليد الفقيه", role: "مشرف" },
      { name: "عبدالله سالم", role: "سكرتير" }
    ],
    "قسم ضبط الجودة": [
      { name: "سعود حشف المطيري", role: "رئيس قسم" },
      { name: "مشعل العلي", role: "عضو هيئة إدارية" },
      { name: "خالد المكيمي", role: "عضو هيئة إدارية" },
      { name: "يعقوب اللوغاني", role: "عضو هيئة إدارية" },
      { name: "سعود ماجد", role: "عضو هيئة إدارية" },
      { name: "عقاب الشمري", role: "عضو هيئة إدارية" },
      { name: "وليد الفقيه", role: "مشرف" },
      { name: "إبراهيم خليل", role: "سكرتير" }
    ],
    "قسم اللجنة العلمية": [
      { name: "محمد حمود النجدي", role: "رئيس اللجنة العلمية" },
      { name: "محمد ناظر", role: "عضو هيئة إدارية" },
      { name: "عبد الرشيد بلوشي", role: "عضو هيئة إدارية" },
      { name: "عقاب الشمري", role: "مشرف" },
      { name: "عصام ابراهيم", role: "سكرتير" }
    ],
    "قسم متابعة الأقسام": [
      { name: "سعود حشف المطيري", role: "رئيس قسم" },
      { name: "وليد الفقيه", role: "مشرف" },
      { name: "سعود ماجد", role: "سكرتير" }
    ],
    "قسم تطوير الأنظمة التقنية": [
      { name: "سعود حشف المطيري", role: "رئيس قسم" },
      { name: "سعود ماجد", role: "عضو هيئة إدارية" },
      { name: "وليد الهتاري", role: "عضو هيئة إدارية" },
      { name: "وليد الفقيه", role: "مشرف" },
      { name: "إبراهيم خليل", role: "سكرتير" }
    ],
    "قسم الأرشيف الالكتروني": [
      { name: "سعود حشف المطيري", role: "رئيس قسم" },
      { name: "وليد الفقيه", role: "مشرف" },
      { name: "خالد صالح", role: "سكرتير" }
    ],
    "قسم الاستقطاعات": [
      { name: "سعود حشف المطيري", role: "رئيس قسم" },
      { name: "وليد الفقيه", role: "مشرف" },
      { name: "وليد الهتاري", role: "سكرتير" },
      { name: "علاء حسين", role: "سكرتير" },
      { name: "محمد زين العابدين", role: "سكرتير" }
    ],
    "قسم الدعم الفني": [
      { name: "سعود حشف المطيري", role: "رئيس قسم" },
      { name: "وليد الفقيه", role: "مشرف" },
      { name: "وليد الهتاري", role: "سكرتير" }
    ],
    "قسم الاستقبال": [
      { name: "ناصر بن شوق", role: "رئيس قسم" },
      { name: "عقاب الشمري", role: "مشرف" },
      { name: "رسام عبدالله", role: "سكرتير" },
      { name: "احمد جبار", role: "سكرتير" },
      { name: "عبدالله سالم", role: "سكرتير" },
      { name: "لافي هجرس", role: "سكرتير" },
      { name: "محمد عمر", role: "سكرتير" },
      { name: "مساعد جمعة", role: "سكرتير" }
    ]
  };

  // ========== DEPT DROPDOWN HANDLER ==========
  window.handleDeptSelect = () => {
    const sel = document.getElementById('agendaDeptSelect');
    const manual = document.getElementById('agendaDept');
    if (!sel || !manual) return;
    if (sel.value === '__custom__') {
      manual.classList.remove('hide');
      manual.value = '';
      manual.focus();
    } else {
      manual.classList.add('hide');
      manual.value = sel.value;
      
      // Auto-populate attendees
      if (sel.value && DEPARTMENT_MEMBERS[sel.value]) {
        const tbody = document.getElementById('attendeeTableBody');
        if (tbody) {
          tbody.innerHTML = ''; // Clear existing
          DEPARTMENT_MEMBERS[sel.value].forEach(m => {
            window.addAttendeeRow();
            // Get the last added row
            const lastRow = tbody.lastElementChild;
            const selectEl = lastRow.querySelector('.attendee-name-select');
            const roleEl = lastRow.querySelector('.attendee-role-input');
            
            // Set values
            let found = false;
            for (let i = 0; i < selectEl.options.length; i++) {
              if (selectEl.options[i].value === m.name) {
                selectEl.selectedIndex = i;
                found = true;
                break;
              }
            }
            if (!found) {
              selectEl.value = '__manual__';
              window.handleAttendeeSelect(selectEl);
              const manualInput = lastRow.querySelector('.attendee-name-input');
              manualInput.value = m.name;
            }
            roleEl.value = m.role;
          });
        }
      }
    }
    updateAgendaPreview();
  };

  // ========== STEP 2: AGENDA ITEMS ==========
  window.addAgendaItem = (itemData = null) => {
    let text = '';
    let note = '';
    if (itemData) {
      if (typeof itemData === 'string') {
        text = itemData;
      } else {
        text = itemData.text || '';
        note = itemData.note || '';
      }
    }

    const list = document.getElementById('agendaItemsList');
    if (!list) return;
    const idx = list.children.length + 1;
    const div = document.createElement('div');
    div.className = 'agenda-row flex items-center gap-2 mb-2 p-1';
    div.innerHTML = `
      <span class="text-sm font-bold text-[#66756d] w-5 shrink-0">${idx}.</span>
      <input type="text" class="mq-input flex-1 py-2 agenda-item-input font-bold" placeholder="أدخل بند جدول الأعمال..." value="${text}" oninput="updateAgendaPreview()">
      <div class="flex-1 flex items-center gap-2">
        <i data-lucide="file-text" class="w-4 h-4 text-gray-400 shrink-0"></i>
        <input type="text" class="mq-input flex-1 py-2 text-sm agenda-note-input" placeholder="ملاحظات (اختياري)..." value="${note}" oninput="updateAgendaPreview()">
      </div>
      <button onclick="this.closest('.agenda-row').remove();reIndexAgendaItems();updateAgendaPreview();" class="text-red-400 hover:text-red-600 shrink-0">
        <i data-lucide="trash-2" class="w-4 h-4"></i>
      </button>`;
    list.appendChild(div);
    if (window.lucide) lucide.createIcons();
  };

  function reIndexAgendaItems() {
    document.querySelectorAll('#agendaItemsList > div').forEach((div, i) => {
      const num = div.querySelector('span');
      if (num) num.innerText = (i + 1) + '.';
    });
  }

  // ========== MEMBERS DATA ==========
  const MEMBERS = [
    // القيادات والهيئة الإدارية
    { name: 'سعود حشف المطيري',         role: 'رئيس الهيئة الإدارية' },
    { name: 'مشعل العلي',               role: 'مقرر الهيئة الادارية' },
    { name: 'عقاب الشمري',              role: 'المشرف الإداري' },
    { name: 'وليد الفقيه',              role: 'المشرف الفني' },
    { name: 'محمد حمود النجدي',         role: 'رئيس قسم اللجنة العلمية' },
    { name: 'حيلان الحيلان',            role: 'رئيس قسم الكلمة الطيبة' },
    { name: 'ناصر بن شوق',              role: 'رئيس قسم الرعاية الاجتماعية' },
    { name: 'بندر المطيري',             role: 'رئيس قسم حلقات تحفيظ القرآن الكريم' },
    
    // سكرتارية الأقسام
    { name: 'موسى حسانين',              role: 'سكرتير' },
    { name: 'سعود ماجد',                role: 'سكرتير' },
    { name: 'مشعل صالح',                role: 'سكرتير' },
    { name: 'رسام عبدالله',             role: 'سكرتير' },
    { name: 'عبدالله سالم',             role: 'سكرتير' },
    { name: 'إبراهيم خليل',             role: 'سكرتير' },
    { name: 'عصام ابراهيم',             role: 'سكرتير' },
    { name: 'خالد صالح',                role: 'سكرتير' },
    { name: 'وليد الهتاري',             role: 'سكرتير' },
    { name: 'علاء حسين',                role: 'سكرتير' },
    { name: 'محمد زين العابدين',        role: 'سكرتير' },
    { name: 'احمد جبار',                role: 'سكرتير' },
    { name: 'لافي هجرس',                role: 'سكرتير' },
    { name: 'محمد عمر',                 role: 'سكرتير' },
    { name: 'مساعد جمعة',               role: 'سكرتير' },

    // أعضاء الأقسام
    { name: 'طلال العلي',               role: 'عضو هيئة إدارية' },
    { name: 'احمد نايف',                role: 'عضو هيئة إدارية' },
    { name: 'أسامة الشطي',              role: 'عضو هيئة إدارية' },
    { name: 'حمود العميري',             role: 'عضو هيئة إدارية' },
    { name: 'فهد بن صبح',               role: 'عضو هيئة إدارية' },
    { name: 'خالد المكيمي',             role: 'عضو هيئة إدارية' },
    { name: 'فهد سعود المطيري',         role: 'عضو هيئة إدارية' },
    { name: 'يعقوب اللوغاني',           role: 'عضو هيئة إدارية' },
    { name: 'فهد المطيري',              role: 'عضو هيئة إدارية' },
    { name: 'منصور الضعينة',            role: 'عضو هيئة إدارية' },
    { name: 'فهد المويزري',             role: 'عضو هيئة إدارية' },
    { name: 'منصور العدواني',           role: 'عضو هيئة إدارية' },
    { name: 'عثمان الانصاري',           role: 'عضو هيئة إدارية' },
    { name: 'يوسف اللحدان',             role: 'عضو هيئة إدارية' },
    { name: 'مرزوق العتيبي',            role: 'عضو هيئة إدارية' },
    { name: 'حمد القطان',               role: 'عضو هيئة إدارية' },
    { name: 'عدنان السعيد',             role: 'عضو هيئة إدارية' },
    { name: 'إبراهيم الحميدي',          role: 'عضو هيئة إدارية' },
    { name: 'عبد الله الكندري',         role: 'عضو هيئة إدارية' },
    { name: 'محمد علي مهدي',            role: 'سكرتير' },
    { name: 'محمد ناظر',                role: 'سكرتير' },
    { name: 'عبد الرشيد بلوشي',         role: 'سكرتير' },
  ];

  function buildMembersDropdown() {
    let opts = '<option value="">-- اختر العضو --</option>';
    MEMBERS.forEach(m => {
      opts += `<option value="${m.name}" data-role="${m.role}">${m.name}</option>`;
    });
    opts += '<option value="__manual__">✏️ إدخال يدوي...</option>';
    return opts;
  }

  // ========== STEP 2: ATTENDEES ==========
  window.addAttendeeRow = (forcedIdx, name, role) => {
    const tbody = document.getElementById('attendeeTableBody');
    if (!tbody) return;
    const idx = tbody.children.length + 1;
    const tr = document.createElement('tr');
    tr.className = 'border-b border-[#dfe7e2]';
    tr.innerHTML = `
      <td class="py-2 text-sm text-[#66756d] shrink-0">${idx}</td>
      <td class="py-2 pl-2">
        <select class="mq-input attendee-name-select py-1.5 text-sm" onchange="handleAttendeeSelect(this)">
          ${buildMembersDropdown()}
        </select>
        <input type="text" class="mq-input attendee-name-input py-1.5 text-sm mt-1.5 hide" placeholder="الاسم (يدوي)" oninput="updateAgendaPreview()">
      </td>
      <td class="py-2 pl-2">
        <input type="text" class="mq-input attendee-role-input py-1.5 text-sm" placeholder="المسمى الوظيفي" oninput="updateAgendaPreview()">
      </td>
      <td class="py-2 text-center">
        <button onclick="this.closest('tr').remove();reIndexAttendees();updateAgendaPreview();" class="text-red-400 hover:text-red-600">
          <i data-lucide="trash-2" class="w-4 h-4"></i>
        </button>
      </td>`;
    tbody.appendChild(tr);

    if (name) {
      const selectEl = tr.querySelector('.attendee-name-select');
      const manualInput = tr.querySelector('.attendee-name-input');
      const roleInput = tr.querySelector('.attendee-role-input');
      
      let found = false;
      for (let i = 0; i < selectEl.options.length; i++) {
        if (selectEl.options[i].value === name) {
          selectEl.selectedIndex = i;
          found = true;
          break;
        }
      }
      if (!found) {
        selectEl.value = '__manual__';
        window.handleAttendeeSelect(selectEl);
        manualInput.value = name;
      }
      if (role) roleInput.value = role;
    }

    if (window.lucide) lucide.createIcons();
  };

  window.handleAttendeeSelect = (sel) => {
    const tr = sel.closest('tr');
    const manualInput = tr.querySelector('.attendee-name-input');
    const roleInput   = tr.querySelector('.attendee-role-input');
    if (sel.value === '__manual__') {
      manualInput.classList.remove('hide');
      manualInput.value = '';
      manualInput.focus();
    } else {
      manualInput.classList.add('hide');
      // auto-fill role
      const opt = sel.options[sel.selectedIndex];
      if (opt && roleInput) roleInput.value = opt.getAttribute('data-role') || '';
    }
    updateAgendaPreview();
  };

  function reIndexAttendees() {
    document.querySelectorAll('#attendeeTableBody tr').forEach((tr, i) => {
      const td = tr.querySelector('td');
      if (td) td.innerText = i + 1;
    });
  }

  function getAttendees() {
    const rows = document.querySelectorAll('#attendeeTableBody tr');
    const result = [];
    rows.forEach(tr => {
      const sel    = tr.querySelector('.attendee-name-select');
      const manual = tr.querySelector('.attendee-name-input');
      const role   = tr.querySelector('.attendee-role-input')?.value.trim();
      let name = '';
      if (sel && sel.value && sel.value !== '__manual__') {
        name = sel.value;
      } else if (manual && manual.value.trim()) {
        name = manual.value.trim();
      }
      if (name) result.push({ name, role: role || '' });
    });
    return result;
  }

  function getDept() {
    const sel = document.getElementById('agendaDeptSelect');
    const manual = document.getElementById('agendaDept');
    if (sel && sel.value && sel.value !== '__custom__') return sel.value;
    if (manual) return manual.value;
    return '';
  }

  function getAgendaItems() {
    const items = [];
    document.querySelectorAll('#agendaItemsList > .agenda-row').forEach(div => {
      const textInput = div.querySelector('.agenda-item-input');
      const noteInput = div.querySelector('.agenda-note-input');
      const text = textInput ? textInput.value.trim() : '';
      const note = noteInput ? noteInput.value.trim() : '';
      if (text) {
        items.push({ text, note });
      }
    });
    return items;
  }

  // ========== AGENDA PREVIEW ==========
  window.updateAgendaPreview = () => {
    const dept = getDept();
    const location = document.getElementById('agendaLocation')?.value || '';
    const dateVal = document.getElementById('agendaDate')?.value || '';
    const hijriVal = document.getElementById('agendaHijriDate')?.value || '---';
    const timeVal = document.getElementById('agendaTime')?.value || '';

    let cleanDateG = '---';
    if (dateVal) {
      const parts = dateVal.split('-');
      if (parts.length === 3) {
        cleanDateG = `${parseInt(parts[2], 10)} - ${parseInt(parts[1], 10)} - ${parts[0]} م`;
      }
    }
    const cleanDateH = hijriVal !== '---' && !hijriVal.includes('هـ') ? `${hijriVal} هـ` : hijriVal;
    
    // Get year from date or current year
    const yearStr = dateVal ? dateVal.split('-')[0] : String(new Date().getFullYear());
    
    // Auto-calculate meeting number for this department and year
    let meetingNumFormatted = '';
    if (currentMeetingId !== null) {
      const existing = meetings.find(m => m.id === currentMeetingId);
      if (existing && existing.num) {
        meetingNumFormatted = existing.num;
      }
    }
    
    if (!meetingNumFormatted) {
      let mCount = 1;
      if (dept && yearStr) {
        const counters = JSON.parse(localStorage.getItem('deptCounters') || '{}');
        const key = `${dept}-${yearStr}`;
        mCount = counters[key] || 1;
      }
      meetingNumFormatted = `${String(mCount).padStart(2,'0')}/${yearStr}`;
    }

    const dayName = dateVal ? new Date(dateVal + 'T00:00:00').toLocaleDateString('ar-KW', { weekday:'long' }) : '---';
    const timeFormatted = timeVal ? formatTime12(timeVal) : '---';

    const monthName = dateVal ? new Date(dateVal + 'T00:00:00').toLocaleDateString('ar-KW', { month:'long' }) : '---';

    setText('pvDeptTitle', dept || 'القسم / اللجنة');
    setText('pvInfoDate', cleanDateG);
    setText('pvInfoDay', dayName);
    setText('pvInfoTime', timeFormatted);
    setText('pvInfoLocation', location || '---');
    setText('pvDateG', cleanDateG);
    setText('pvDateH', cleanDateH);
    
    // We only need the meeting number for the top left header and the subtitle
    setText('pvMeetingNum', meetingNumFormatted);
    setText('pvMeetingNumTitle', meetingNumFormatted);
    setText('pvMonthTitle', monthName);
    setText('pvYearTitle', yearStr);

    // Attendees
    const ats = getAttendees();
    const atBody = document.getElementById('pvAttendeesTbody');
    if (atBody) {
      atBody.innerHTML = '';
      const pairs = Math.ceil(ats.length / 2);
      for (let i = 0; i < pairs; i++) {
        const left  = ats[i];
        const right = ats[i + pairs] || null;
        atBody.innerHTML += `<tr>
          <td class="border border-gray-300 px-2 py-1 text-center bg-[#f6faf7] font-bold">${i+1}</td>
          <td class="border border-gray-300 px-2 py-1">${left.name}</td>
          <td class="border border-gray-300 px-2 py-1">${left.role}</td>
          <td class="border border-gray-300 px-2 py-1 text-center bg-[#f6faf7] font-bold">${right ? i+pairs+1 : ''}</td>
          <td class="border border-gray-300 px-2 py-1">${right ? right.name : ''}</td>
          <td class="border border-gray-300 px-2 py-1">${right ? right.role : ''}</td>
        </tr>`;
      }
      if (ats.length === 0) atBody.innerHTML = '<tr><td colspan="6" class="border border-gray-300 px-2 py-2 text-center text-gray-400 text-xs">لم يتم إضافة أعضاء بعد</td></tr>';
    }

    // Agenda items
    const items = getAgendaItems();
    const itmBody = document.getElementById('pvItemsTbody');
    if (itmBody) {
      itmBody.innerHTML = '';
      if (items.length > 0) {
        items.forEach((item, i) => {
          const itemText = typeof item === 'string' ? item : item.text;
          const itemNote = typeof item === 'object' && item.note ? item.note : '&nbsp;';
          itmBody.innerHTML += `<tr>
            <td class="border border-gray-300 px-2 py-1.5 text-center font-bold bg-[#f6faf7]">${i+1}</td>
            <td class="border border-gray-300 px-2 py-1.5 font-bold">${itemText}</td>
            <td class="border border-gray-300 px-2 py-1.5 text-xs text-gray-700">${itemNote}</td>
          </tr>`;
        });
      } else {
        itmBody.innerHTML = '<tr><td colspan="3" class="border border-gray-300 px-2 py-2 text-center text-gray-400 text-xs">لم يتم إضافة بنود بعد</td></tr>';
      }
    }

    // AOB Table (ما يستجد من أعمال)
    const aobBody = document.getElementById('pvAobTbody');
    if (aobBody) {
      aobBody.innerHTML = '';
      for(let j=1; j<=2; j++) {
        aobBody.innerHTML += `<tr>
          <td class="border border-gray-300 px-2 py-1.5 text-center text-gray-400 font-bold">${j}</td>
          <td class="border border-gray-300 px-2 py-1.5">&nbsp;</td>
          <td class="border border-gray-300 px-2 py-1.5">&nbsp;</td>
        </tr>`;
      }
    }
  };

  function setText(id, txt) {
    const el = document.getElementById(id);
    if (el) el.innerText = txt;
  }

  function formatTime12(t) {
    if (!t) return '---';
    const [hh, mm] = t.split(':').map(Number);
    const ampm = hh >= 12 ? 'م' : 'ص';
    const h12 = hh % 12 || 12;
    return `${h12}:${String(mm).padStart(2,'0')} ${ampm}`;
  }

  // ========== STEP 3: RECORDING ==========

  window.toggleRecording = () => {
    if (!isRecording) {
      startRecording();
    } else {
      stopRecording();
    }
  };

  function initSpeechRecognition() {
    if (!('webkitSpeechRecognition' in window)) {
      alert("عذراً، متصفحك لا يدعم تقنية التفريغ الصوتي المباشر. يرجى استخدام متصفح جوجل كروم.");
      return false;
    }
    recognition = new webkitSpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'ar-SA'; // Arabic

    recognition.onstart = function() {
      isSpeechActive = true;
    };

    recognition.onresult = function(event) {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + ' ';
        }
      }
      const area = document.getElementById('transcriptArea');
      if (area && finalTranscript) {
        area.value += finalTranscript;
        area.scrollTop = area.scrollHeight;
      }
    };

    recognition.onerror = function(event) {
      console.error("Speech recognition error", event.error);
    };

    recognition.onend = function() {
      // Auto-restart for long meetings (> 2 hours)
      if (isRecording) {
        try { recognition.start(); } catch(e){}
      } else {
        isSpeechActive = false;
      }
    };
    return true;
  }

  function startRecording() {
    if (!recognition) {
      if (!initSpeechRecognition()) return;
    }
    isRecording = true;
    const btn = document.getElementById('btnRecord');
    const badge = document.getElementById('recordingBadge');
    if (btn) btn.innerHTML = '<i data-lucide="square" class="w-4 h-4"></i> إيقاف التسجيل';
    if (badge) badge.classList.remove('hide');

    if (!isSpeechActive) {
      try { recognition.start(); } catch(e){}
    }
    if (window.lucide) lucide.createIcons();
  }

  function stopRecording() {
    isRecording = false;
    const btn = document.getElementById('btnRecord');
    const badge = document.getElementById('recordingBadge');
    if (btn) btn.innerHTML = '<i data-lucide="mic" class="w-4 h-4"></i> بدء التسجيل الصوتي';
    if (badge) badge.classList.add('hide');

    if (recognition && isSpeechActive) {
      recognition.stop();
    }
    if (window.lucide) lucide.createIcons();
  }

  window.analyzeWithAI = async () => {
    const transcript = document.getElementById('transcriptArea')?.value || '';
    if (!transcript.trim()) {
      alert('الرجاء كتابة الملاحظات أو تسجيل الاجتماع أولاً!');
      return;
    }
    const btn = document.getElementById('btnAI');
    if (btn) {
      btn.innerHTML = '<span>جاري التحليل (AI)... يرجى الانتظار</span>';
      btn.disabled = true;
    }

    try {
      const agendaText = agendaItems.map(a => a.title).join(' - ');
      const prompt = `أنت مساعد إداري محترف. قم بقراءة التفريغ الصوتي (الدارج) التالي للاجتماع، وبنود جدول الأعمال المقررة.
المطلوب منك:
1. صياغة محتوى الاجتماع بالكامل إلى نص باللغة العربية الفصحى الإدارية السليمة.
2. استخراج أبرز القرارات والمهام التي تم اتخاذها بناءً على البنود.

يجب أن يكون الرد بصيغة JSON فقط بالتنسيق التالي بدون أي زيادات:
{
  "formal_transcript": "هنا النص باللغة العربية الفصحى...",
  "tasks": [
    { "text": "نص القرار المستخرج", "person": "الشخص المكلف أو الجهة" }
  ]
}

بنود جدول الأعمال: ${agendaText || 'لا يوجد بنود محددة'}

التفريغ الصوتي:
${transcript}`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, responseMimeType: "application/json" }
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(()=>({}));
        console.error("API Error Response:", errData);
        throw new Error(`فشل الاتصال بخادم الذكاء الاصطناعي (كود الخطأ: ${response.status}).\n\nتفاصيل الخطأ:\n${errData.error?.message || 'غير معروف'}`);
      }

      const data = await response.json();
      const rawText = data.candidates[0].content.parts[0].text;
      
      let parsed;
      try {
        parsed = JSON.parse(rawText);
      } catch(e) {
        parsed = JSON.parse(rawText.replace(/```json/g,'').replace(/```/g,''));
      }

      // Populate Formal Transcript
      const formalArea = document.getElementById('formalTranscriptArea');
      const formalSection = document.getElementById('aiFormalSection');
      if (formalArea && formalSection) {
        formalArea.value = parsed.formal_transcript || '';
        formalSection.classList.remove('hide');
      }

      // Populate Tasks
      const list = document.getElementById('aiTasksList');
      const section = document.getElementById('aiTasksSection');
      if (list && section && parsed.tasks) {
        list.innerHTML = '';
        parsed.tasks.forEach((t, i) => {
          list.innerHTML += `
            <div class="ai-task-card" id="aiTask${i}">
              <div class="w-7 h-7 rounded-full bg-[#097834]/10 text-[#097834] flex items-center justify-center font-bold text-sm shrink-0">${i+1}</div>
              <div class="flex-1">
                <p class="font-bold text-sm text-[#17201b]" id="aiTaskText${i}" contenteditable="true" onclick="enableEdit(${i})">${t.text}</p>
                <p class="text-xs text-[#66756d] mt-0.5">الشخص: <span id="aiTaskPerson${i}" contenteditable="true">${t.person}</span></p>
              </div>
              <div class="flex gap-2 shrink-0 items-center">
                <button onclick="exportSingleTaskToMinutes(${i})" title="تصدير إلى المحضر" class="text-[#097834] hover:text-[#075e28]">
                  <i data-lucide="arrow-down-circle" class="w-5 h-5"></i>
                </button>
                <button onclick="document.getElementById('aiTask${i}').remove()" title="حذف البند" class="text-red-500 hover:text-red-700">
                  <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
              </div>
            </div>`;
        });
        section.classList.remove('hide');
      }
    } catch (error) {
      console.error(error);
      alert('حدث خطأ أثناء معالجة الذكاء الاصطناعي.\n' + error.message);
    } finally {
      if (btn) { 
        btn.innerHTML = '<i data-lucide="sparkles" class="w-4 h-4"></i> تحليل واستخراج أبرز البنود'; 
        btn.disabled = false; 
      }
      if (window.lucide) lucide.createIcons();
    }
  };

  window.enableEdit = (i) => {
    const el = document.getElementById('aiTaskText' + i);
    if (el) { el.focus(); }
  };

  window.exportTasksToMinutes = () => {
    const cards = document.querySelectorAll('.ai-task-card');
    cards.forEach(card => {
      const text = card.querySelector('[contenteditable]')?.innerText?.trim() || '';
      const sub  = card.querySelectorAll('p')[1]?.innerText?.replace('المكلف: ','').trim() || '';
      if (text) addMinuteItemWithData(text, sub);
    });
    goToStep(4);
  };

  window.exportSingleTaskToMinutes = (idx) => {
    const textEl = document.getElementById(`aiTaskText${idx}`);
    const personEl = document.getElementById(`aiTaskPerson${idx}`);
    if (textEl && personEl) {
      addMinuteItemWithData(textEl.innerText, `تنفيذ: ${personEl.innerText}`);
      alert('تم تصدير البند إلى محضر الاجتماع بنجاح!');
    }
  };

  // ========== STEP 4: MINUTES ==========
  function syncMinutesFromAgenda() {
    const dept = getDept();
    const loc  = document.getElementById('agendaLocation')?.value || '';
    
    const pvNumEl = document.getElementById('pvMeetingNum');
    const minNumEl = document.getElementById('minNum');
    if (pvNumEl && minNumEl && (!minNumEl.value || minNumEl.value.includes('undefined'))) {
      minNumEl.value = pvNumEl.innerText.trim();
    }
    
    const locEl = document.getElementById('minLocation');
    if (locEl && !locEl.value) locEl.value = loc;

    const minDateEl = document.getElementById('minDate');
    const agendaDate = document.getElementById('agendaDate')?.value || '';
    if (minDateEl && !minDateEl.value) minDateEl.value = agendaDate;

    const minTimeEl = document.getElementById('minTime');
    const agendaTime = document.getElementById('agendaTime')?.value || '';
    if (minTimeEl && !minTimeEl.value) minTimeEl.value = agendaTime;

    // Populate Attendance Checklist
    const ats = getAttendees();
    const checklist = document.getElementById('minutesAttendanceChecklist');
    if (checklist) {
      const stateMap = {};
      checklist.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        stateMap[cb.dataset.name] = cb.checked;
      });

      checklist.innerHTML = '';
      if (ats.length === 0) {
        checklist.innerHTML = '<p class="text-xs text-gray-500">لا يوجد مدعوين مسجلين في جدول الأعمال.</p>';
      } else {
        ats.forEach((att, i) => {
          const isChecked = stateMap.hasOwnProperty(att.name) ? stateMap[att.name] : true;
          checklist.innerHTML += `
            <label class="flex items-center gap-2 cursor-pointer bg-white p-2 rounded border border-gray-100 shadow-sm hover:border-gray-200 transition-colors">
              <input type="checkbox" id="minAttCheck${i}" data-name="${att.name}" class="w-4 h-4 text-[#097834] rounded border-gray-300 focus:ring-[#097834]" ${isChecked ? 'checked' : ''} onchange="updateMinutesPreview()">
              <span class="text-sm font-bold text-gray-800">${att.name} <span class="text-xs text-gray-500 font-normal">(${att.role})</span></span>
            </label>
          `;
        });
      }
    }

    updateMinutesPreview();
  }

  window.addMinuteItem = () => { addMinuteItemWithData('',''); };
  window.addActionItem = () => { addActionItemWithData('',''); };

  function addMinuteItemWithData(item, decision) {
    const tbody = document.getElementById('minutesItemsTbody');
    if (!tbody) return;
    const idx = tbody.children.length + 1;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="p-2 text-center font-bold text-[#66756d] text-xs">${idx}</td>
      <td class="p-1"><input type="text" class="mq-input min-item-text py-1.5 text-sm w-full" placeholder="البند" value="${item}" oninput="updateMinutesPreview()"></td>
      <td class="p-1"><input type="text" class="mq-input min-item-dec py-1.5 text-sm w-full" placeholder="القرار / الملاحظة" value="${decision}" oninput="updateMinutesPreview()"></td>
      <td class="p-2 text-center">
        <button onclick="this.closest('tr').remove();reIndexMinuteItems('minutesItemsTbody');updateMinutesPreview();" class="text-red-400 hover:text-red-600">
          <i data-lucide="trash-2" class="w-4 h-4"></i>
        </button>
      </td>`;
    tbody.appendChild(tr);
    if (window.lucide) lucide.createIcons();
    updateMinutesPreview();
  }

  function addActionItemWithData(item, decision) {
    const tbody = document.getElementById('actionItemsTbody');
    if (!tbody) return;
    const idx = tbody.children.length + 1;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="p-2 text-center font-bold text-[#66756d] text-xs">${idx}</td>
      <td class="p-1"><input type="text" class="mq-input action-item-text py-1.5 text-sm w-full" placeholder="البند" value="${item}" oninput="updateMinutesPreview()"></td>
      <td class="p-1"><input type="text" class="mq-input action-item-dec py-1.5 text-sm w-full" placeholder="القرار / الإجراء" value="${decision}" oninput="updateMinutesPreview()"></td>
      <td class="p-2 text-center">
        <button onclick="this.closest('tr').remove();reIndexMinuteItems('actionItemsTbody');updateMinutesPreview();" class="text-red-400 hover:text-red-600">
          <i data-lucide="trash-2" class="w-4 h-4"></i>
        </button>
      </td>`;
    tbody.appendChild(tr);
    if (window.lucide) lucide.createIcons();
    updateMinutesPreview();
  }

  function reIndexMinuteItems(tbodyId) {
    document.querySelectorAll(`#${tbodyId} tr`).forEach((tr, i) => {
      const td = tr.querySelector('td');
      if (td) td.innerText = i + 1;
    });
  }

  window.updateMinutesPreview = () => {
    const dept = getDept();
    
    const minDateEl = document.getElementById('minDate');
    const minTimeEl = document.getElementById('minTime');
    const dateVal = (minDateEl && minDateEl.value) ? minDateEl.value : (document.getElementById('agendaDate')?.value || '');
    const timeVal = (minTimeEl && minTimeEl.value) ? minTimeEl.value : (document.getElementById('agendaTime')?.value || '');
    
    const locEl  = document.getElementById('minLocation');
    const loc    = locEl?.value || document.getElementById('agendaLocation')?.value || '';
    const numVal = document.getElementById('minNum')?.value || '01';

    let cleanDateG = '---';
    if (dateVal) {
      const parts = dateVal.split('-');
      if (parts.length === 3) {
        cleanDateG = `${parseInt(parts[2], 10)} - ${parseInt(parts[1], 10)} - ${parts[0]} م`;
      }
    }
    
    let hj = toHijri(dateVal);
    const cleanDateH = hj !== '---' && !hj.includes('هـ') ? `${hj} هـ` : hj;
    
    const yearStr = dateVal ? dateVal.split('-')[0] : new Date().getFullYear();
    
    // Auto-calculate meeting number for minutes if not provided (fallback)
    let minNumFormatted = numVal;
    if (!minNumFormatted.includes('/')) {
        minNumFormatted = `${numVal}/${yearStr}`;
    }

    const timeFormatted = timeVal ? formatTime12(timeVal) : '---';

    setText('minPvNum', minNumFormatted);
    setText('minPvDept', dept || 'القسم / اللجنة');
    setText('minPvDate', cleanDateG);
    setText('minPvHijri', cleanDateH);
    setText('minPvDateInfo', cleanDateG);
    setText('minPvTimeInfo', timeFormatted);
    setText('minPvLocationInfo', loc || '---');

    // Attendees in minutes
    const ats = getAttendees();
    const checkedAts = [];
    ats.forEach((att, i) => {
      const cb = document.getElementById(`minAttCheck${i}`);
      // If checkbox exists and is checked, OR if checkbox doesn't exist yet (fallback), include them
      if (!cb || cb.checked) {
        checkedAts.push(att);
      }
    });

    const minAtBody = document.getElementById('minPvAttendeesTbody');
    if (minAtBody) {
      minAtBody.innerHTML = '';
      const pairs = Math.ceil(checkedAts.length / 2);
      for (let i = 0; i < pairs; i++) {
        const left  = checkedAts[i];
        const right = checkedAts[i + pairs] || null;
        minAtBody.innerHTML += `<tr>
          <td class="border border-gray-300 px-2 py-1 text-center bg-[#f6faf7] font-bold text-xs">${i+1}</td>
          <td class="border border-gray-300 px-2 py-1 text-xs">${left.name}</td>
          <td class="border border-gray-300 px-2 py-1 text-xs">${left.role}</td>
          <td class="border border-gray-300 px-2 py-1 text-center bg-[#f6faf7] font-bold text-xs">${right ? i+pairs+1 : ''}</td>
          <td class="border border-gray-300 px-2 py-1 text-xs">${right ? right.name : ''}</td>
          <td class="border border-gray-300 px-2 py-1 text-xs">${right ? right.role : ''}</td>
        </tr>`;
      }
      if (checkedAts.length === 0) {
        minAtBody.innerHTML = '<tr><td colspan="6" class="border border-gray-300 px-2 py-2 text-center text-gray-400 text-xs">لا يوجد حضور</td></tr>';
      }
    }

    // Minutes items
    buildMinutesPreviewTable('minutesItemsTbody','minPvItemsTbody','.min-item-text','.min-item-dec');
    buildMinutesPreviewTable('actionItemsTbody','minPvActionTbody','.action-item-text','.action-item-dec');
  };

  function buildMinutesPreviewTable(srcId, dstId, itemSel, decSel) {
    const src = document.getElementById(srcId);
    const dst = document.getElementById(dstId);
    if (!src || !dst) return;
    dst.innerHTML = '';
    const rows = src.querySelectorAll('tr');
    rows.forEach((tr, i) => {
      const item = tr.querySelector(itemSel)?.value?.trim() || '';
      const dec  = tr.querySelector(decSel)?.value?.trim() || '';
      dst.innerHTML += `<tr>
        <td class="border border-gray-300 px-2 py-1.5 text-center font-bold bg-[#f6faf7] text-xs">${i+1}</td>
        <td class="border border-gray-300 px-2 py-1.5 text-xs">${item}</td>
        <td class="border border-gray-300 px-2 py-1.5 text-xs">${dec}</td>
      </tr>`;
    });
    if (rows.length === 0) {
      dst.innerHTML = '<tr><td colspan="3" class="border border-gray-300 px-2 py-2 text-center text-gray-400 text-xs">لا يوجد بنود</td></tr>';
    }
  }

  // ========== SAVE / SCHEDULE MEETING ==========
  window.scheduleMeetingAndClose = () => {
    saveMeetingData('مجدول');
  };

  window.saveMeetingAndClose = () => {
    saveMeetingData('مكتمل');
  };

  window.saveCurrentMeetingDraft = async (status = 'مسودة') => {
    const dept     = getDept();
    const dateVal  = document.getElementById('agendaDate')?.value || '';
    const timeVal  = document.getElementById('agendaTime')?.value || '';
    const location = document.getElementById('minLocation')?.value || document.getElementById('agendaLocation')?.value || '';
    let yearStr = dateVal ? dateVal.split('-')[0] : String(new Date().getFullYear());
    
    let meetingObj = null;

    if (currentMeetingId !== null) {
      meetingObj = meetings.find(m => m.id === currentMeetingId);
      if (meetingObj) {
        meetingObj.title = dept;
        meetingObj.department = dept;
        meetingObj.date = dateVal;
        meetingObj.time = timeVal;
        meetingObj.location = location;
        meetingObj.status = status;
        meetingObj.items = getAgendaItems();
        meetingObj.attendees = getAttendees();
      }
    } else {
      let minNum = 1;
      try {
        const nextNumRes = await fetch(SCRIPT_URL, {
          method: 'POST',
          body: JSON.stringify({ action: 'getNextMeetingNum', department: dept, year: yearStr })
        });
        const nextNumData = await nextNumRes.json();
        if(nextNumData.success) minNum = nextNumData.nextNum;
      } catch(err) { console.error("Counter fetch failed", err); }
      
      let numVal = `${String(minNum).padStart(2,'0')}/${yearStr}`;
      let newId = Date.now().toString() + Math.floor(Math.random()*1000);
      
      meetingObj = {
        id:         newId,
        minNum:     numVal,
        title:      dept,
        department: dept,
        date:       dateVal,
        time:       timeVal,
        location:   location,
        status:     status,
        createdBy:  currentUser?.name || '',
        items:      getAgendaItems(),
        attendees:  getAttendees(),
      };
      meetings.push(meetingObj);
      currentMeetingId = newId;
    }

    if (meetingObj) {
      try {
        await fetch(SCRIPT_URL, {
          method: 'POST',
          body: JSON.stringify({ action: 'saveMeeting', meetingData: meetingObj })
        });
      } catch(err) { console.error(err); }
    }
    return meetingObj;
  };

  async function saveMeetingData(status) {
    const btn = document.querySelector('button[onclick*="saveMeetingToStorage"]');
    let oldHTML = '';
    if(btn) {
      oldHTML = btn.innerHTML;
      btn.innerHTML = '<i data-lucide="loader-2" class="w-5 h-5 animate-spin"></i> جاري الحفظ سحابياً...';
      btn.disabled = true;
      if(window.lucide) lucide.createIcons();
    }

    try {
      await window.saveCurrentMeetingDraft(status);
      closeWizard();
      navigateTo('meetings');
      renderMeetingsTable();
    } catch(e) {
      console.error(e);
      alert('حدث خطأ أثناء الاتصال بقاعدة البيانات السحابية');
    } finally {
      if (btn) {
        btn.innerHTML = oldHTML;
        btn.disabled = false;
        if(window.lucide) lucide.createIcons();
      }
    }
  }

  window.resumeMeeting = (id) => {
    const m = meetings.find(x => String(x.id) === String(id));
    if (!m) return;
    
    currentMeetingId = id;
    resetWizard();

    // Fill agenda form
    if (m.department) {
      const deptSel = document.getElementById('agendaDeptSelect');
      if (deptSel) deptSel.value = m.department;
    }
    if (m.date) document.getElementById('agendaDate').value = m.date;
    if (m.time) document.getElementById('agendaTime').value = m.time;
    if (m.location) document.getElementById('agendaLocation').value = m.location;
    if (m.date) document.getElementById('agendaHijriDate').value = toHijri(m.date);

    // Reconstruct items
    const itemsList = document.getElementById('agendaItemsList');
    itemsList.innerHTML = '';
    if (m.items && m.items.length > 0) {
      m.items.forEach(item => {
        addAgendaItem(item);
      });
    } else {
      addAgendaItem();
    }

    // Reconstruct attendees
    const attList = document.getElementById('attendeeTableBody');
    attList.innerHTML = '';
    if (m.attendees && m.attendees.length > 0) {
      m.attendees.forEach((att, idx) => {
        addAttendeeRow(idx, att.name, att.role);
      });
    } else {
      addAttendeeRow();
    }

    document.getElementById("wizardOverlay").classList.remove("hide");
    goToStep(3); // Jump to AI recording
  };

  window.editMeeting = (id) => {
    const m = meetings.find(x => String(x.id) === String(id));
    if (!m) return;
    
    currentMeetingId = id;
    resetWizard();

    // Fill agenda form
    if (m.department) {
      const deptSel = document.getElementById('agendaDeptSelect');
      if (deptSel) deptSel.value = m.department;
    }
    if (m.date) document.getElementById('agendaDate').value = m.date;
    if (m.time) document.getElementById('agendaTime').value = m.time;
    if (m.location) document.getElementById('agendaLocation').value = m.location;
    if (m.date) document.getElementById('agendaHijriDate').value = toHijri(m.date);

    // Reconstruct items
    const itemsList = document.getElementById('agendaItemsList');
    itemsList.innerHTML = '';
    if (m.items && m.items.length > 0) {
      m.items.forEach(item => {
        addAgendaItem(item);
      });
    } else {
      addAgendaItem();
    }

    // Reconstruct attendees
    const attList = document.getElementById('attendeeTableBody');
    attList.innerHTML = '';
    if (m.attendees && m.attendees.length > 0) {
      m.attendees.forEach((att, idx) => {
        addAttendeeRow(idx, att.name, att.role);
      });
    } else {
      addAttendeeRow();
    }

    document.getElementById("wizardOverlay").classList.remove("hide");
    goToStep(2); // Open at Step 2 for editing (Agenda)
  };

  // ========== MEETINGS TABLE ==========
  function renderMeetingsTable() {
    const container = document.getElementById('meetingsTableContainer');
    if (!container) return;

    if (meetings.length === 0) {
      container.innerHTML = `
        <div class="bg-white rounded-2xl border border-[#dfe7e2] shadow-sm p-16 text-center">
          <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
            <i data-lucide="folder-open" class="w-8 h-8"></i>
          </div>
          <h3 class="font-bold text-[#17201b] mb-2">لا توجد اجتماعات بعد</h3>
          <p class="text-sm text-[#66756d] mb-6">ابدأ بإنشاء اجتماعك الأول من زر "بدء اجتماع جديد".</p>
          <button onclick="startNewMeeting()" class="btn-gorgeous px-6 py-2.5 rounded-xl font-bold shadow-md gap-2">
            <i data-lucide="plus-circle" class="w-5 h-5"></i> بدء اجتماع جديد
          </button>
        </div>`;
      if (window.lucide) lucide.createIcons();
      return;
    }

    let html = `
      <div class="bg-white rounded-2xl shadow-sm border border-[#dfe7e2] overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-right text-sm">
            <thead class="bg-[#f6faf7] border-b border-[#dfe7e2]">
              <tr>
                <th class="p-4 font-bold text-[#17201b] w-20">رقم</th>
                <th class="p-4 font-bold text-[#17201b]">موضوع الاجتماع</th>
                <th class="p-4 font-bold text-[#17201b]">التاريخ</th>
                <th class="p-4 font-bold text-[#17201b]">الوقت</th>
                <th class="p-4 font-bold text-[#17201b] text-center">الحالة</th>
                <th class="p-4 font-bold text-[#17201b] text-center">الخيارات</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#dfe7e2]">`;

    meetings.forEach((m) => {
      const dateFormatted = m.date ? new Date(m.date + 'T00:00:00').toLocaleDateString('ar-KW') : '---';
      
      let badge = '';
      if (m.status === 'مكتمل') {
        badge = '<span class="px-2.5 py-1 text-xs font-bold text-green-700 bg-green-100 rounded-lg">مكتمل</span>';
      } else if (m.status === 'مجدول') {
        badge = '<span class="px-2.5 py-1 text-xs font-bold text-blue-700 bg-blue-100 rounded-lg">مجدول</span>';
      } else {
        badge = '<span class="px-2.5 py-1 text-xs font-bold text-orange-700 bg-orange-100 rounded-lg">قيد الإعداد</span>';
      }

      let actionBtn = '';
      if (m.status === 'مكتمل') {
        actionBtn = `<button onclick="viewMinutesMeeting('${m.id}')" class="px-3 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg flex items-center gap-1 transition-colors">
             <i data-lucide="file-text" class="w-3.5 h-3.5"></i> المحضر
           </button>`;
      } else if (m.status === 'مجدول') {
        actionBtn = `<button onclick="resumeMeeting('${m.id}')" class="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-1 transition-colors">
             <i data-lucide="play-circle" class="w-3.5 h-3.5"></i> بدء الاجتماع
           </button>`;
      } else {
        actionBtn = `<button onclick="resumeMeeting('${m.id}')" class="px-3 py-1.5 text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-lg flex items-center gap-1 transition-colors">
             <i data-lucide="edit" class="w-3.5 h-3.5"></i> إكمال
           </button>`;
      }

      html += `
        <tr class="hover:bg-gray-50 transition-colors">
          <td class="p-4 font-bold text-[#097834]">#${m.num || m.id}</td>
          <td class="p-4 font-bold text-[#17201b]">${m.title || m.department}</td>
          <td class="p-4 text-[#66756d] font-mono" dir="ltr">${dateFormatted}</td>
          <td class="p-4 text-[#66756d] font-mono" dir="ltr">${m.time ? formatTime12(m.time) : '---'}</td>
          <td class="p-4 text-center">${badge}</td>
          <td class="p-4">
            <div class="flex items-center justify-center gap-2 flex-wrap">
              ${actionBtn}
              <button onclick="editMeeting('${m.id}')" class="px-3 py-1.5 text-xs font-bold text-gray-600 border border-gray-200 hover:bg-gray-100 rounded-lg flex items-center gap-1 transition-colors">
                <i data-lucide="edit-3" class="w-3.5 h-3.5"></i> تعديل
              </button>
              <button onclick="deleteMeeting('${m.id}')" class="px-3 py-1.5 text-xs font-bold text-red-500 bg-red-50 hover:bg-red-100 rounded-lg flex items-center gap-1 transition-colors">
                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i> حذف
              </button>
            </div>
          </td>
        </tr>`;
    });

    html += `</tbody></table></div></div>`;
    container.innerHTML = html;
    if (window.lucide) lucide.createIcons();
  }

  window.completeMeeting = async (id) => {
    const m = meetings.find(x => String(x.id) === String(id));
    if (m) {
      m.status = 'مكتمل';
      renderMeetingsTable(); // Optimistic update
      try {
        await fetch(SCRIPT_URL, {
          method: 'POST',
          body: JSON.stringify({ action: 'saveMeeting', meetingData: m })
        });
      } catch(e) {
        console.error('Failed to complete on cloud:', e);
      }
    }
  };

  window.deleteMeeting = async (id) => {
    if (!confirm('هل تريد حذف هذا الاجتماع نهائياً؟')) return;
    const m = meetings.find(x => String(x.id) === String(id));
    if (m) {
      m.deleted = true; // Soft delete
      meetings = meetings.filter(x => x.id !== id);
      renderMeetingsTable(); // Optimistic update
      try {
        await fetch(SCRIPT_URL, {
          method: 'POST',
          body: JSON.stringify({ action: 'saveMeeting', meetingData: m })
        });
      } catch(e) {
        console.error('Failed to delete on cloud:', e);
      }
    }
  };

  window.viewMinutesMeeting = (id) => {
    alert('ميزة عرض المحضر التفصيلي قيد التطوير. سيتم إضافتها قريباً!');
  };

  // ========== PRINT / EXPORT ==========
  window.printAgenda = () => {
    const printArea = document.getElementById('printArea');
    const card = document.getElementById('agendaPreviewCard');
    if (!printArea || !card) return;
    printArea.innerHTML = card.outerHTML;
    printArea.style.display = 'block';
    window.print();
    setTimeout(() => { printArea.style.display = 'none'; printArea.innerHTML = ''; }, 1000);
  };

  window.printMinutes = () => {
    const printArea = document.getElementById('printArea');
    const card = document.getElementById('minutesPreviewCard');
    if (!printArea || !card) return;
    printArea.innerHTML = card.outerHTML;
    printArea.style.display = 'block';
    window.print();
    setTimeout(() => { printArea.style.display = 'none'; printArea.innerHTML = ''; }, 1000);
  };

  window.shareAgendaWhatsApp = async () => {
    const btn = document.querySelector('button[onclick*="shareAgendaWhatsApp"]');
    let oldHTML = '';
    if(btn) { oldHTML = btn.innerHTML; btn.innerHTML = '<i class="w-4 h-4 animate-spin inline-block"></i>...'; btn.disabled=true; }

    // Save as draft to cloud
    let mObj = await window.saveCurrentMeetingDraft('مسودة');

    const dateFormatted = mObj.date ? new Date(mObj.date+'T00:00:00').toLocaleDateString('ar-KW',{weekday:'long',year:'numeric',month:'long',day:'numeric'}) : '---';
    const timeFormatted = mObj.time ? formatTime12(mObj.time) : '---';
    const dayName = mObj.date ? new Date(mObj.date+'T00:00:00').toLocaleDateString('ar-KW',{weekday:'long'}) : '---';

    let itemsText = '';
    (mObj.items || []).forEach((item, i) => { 
      const text = typeof item === 'object' ? item.text : item;
      itemsText += `\n   ${i+1}. ${text}`; 
    });

    const hijriVal = document.getElementById('agendaHijriDate')?.value || '---';
    
    // Short URL
    const basePath = window.location.href.substring(0, window.location.href.lastIndexOf('/'));
    const previewLink = `${basePath}/agenda-view.html?id=${mObj.id}`;

    const msg = `السلام عليكم ورحمة الله وبركاته،

أعضاء قسم ${mObj.department} الكرام، 
يرجى التكرم لحضور اجتماع القسم رقم : ${mObj.minNum} .

تفاصيل الاجتماع:

التاريخ: ${dayName} ${dateFormatted} (${hijriVal})
الوقت: ${timeFormatted}
المكان: ${mObj.location || 'غير محدد'}
جزاكم الله خيراً.

لمعاينة جدول الأعمال: ${previewLink}`;

    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
    
    if(btn) { btn.innerHTML = oldHTML; btn.disabled=false; }
  };

  window.shareMinutesWhatsApp = async () => {
    const btn = document.querySelector('button[onclick*="shareMinutesWhatsApp"]');
    let oldHTML = '';
    if(btn) { oldHTML = btn.innerHTML; btn.innerHTML = '<i class="w-4 h-4 animate-spin inline-block"></i>...'; btn.disabled=true; }

    // Attendees
    const ats = getAttendees();
    const checklist = document.getElementById('minutesAttendanceChecklist');
    const attended = [];
    if (checklist) {
      checklist.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        if (cb.checked) {
          const at = ats.find(a => a.name === cb.dataset.name);
          if (at) attended.push(at);
        }
      });
    }

    // Items
    const minItems = [];
    document.querySelectorAll('#minutesItemsTbody tr').forEach(tr => {
      const text = tr.querySelector('.min-item-text')?.value?.trim() || '';
      const dec  = tr.querySelector('.min-item-dec')?.value?.trim() || '';
      if (text) minItems.push({ text, dec });
    });

    // Actions
    const actItems = [];
    document.querySelectorAll('#actionItemsTbody tr').forEach(tr => {
      const text = tr.querySelector('.min-item-text')?.value?.trim() || '';
      const dec  = tr.querySelector('.min-item-dec')?.value?.trim() || '';
      if (text) actItems.push({ text, dec });
    });

    // Save as draft to cloud
    let mObj = await window.saveCurrentMeetingDraft('مسودة');
    
    // Append extra Step 4 data to the cloud meeting
    mObj.actualAttendees = attended;
    mObj.minutesItems = minItems;
    mObj.actionItems = actItems;
    
    try {
      await fetch(SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'saveMeeting', meetingData: mObj })
      });
    } catch(err) { console.error(err); }

    let dayNameMsg = '......';
    let timeMsg = '......';
    if (mObj.date) {
      dayNameMsg = new Date(mObj.date + 'T00:00:00').toLocaleDateString('ar-KW', { weekday:'long' });
    }
    if (mObj.time) {
      timeMsg = formatTime12(mObj.time);
    }

    // Build Short URL
    const baseUrl = window.location.href.split('/').slice(0, -1).join('/') + '/minutes-view.html';
    const linkUrl = baseUrl + '?id=' + mObj.id;
    
    const msg = `السلام عليكم ورحمة الله وبركاته،
يعطيكم العافية جميعاً.

أضع بين أيديكم محضر الاجتماع الذي تم انعقاده يوم ${dayNameMsg} في تمام الساعة ${timeMsg}، والذي يوضح أبرز النقاط والتكاليف التي تم الاتفاق عليها للبدء بالعمل عليها

لمراجعة تفاصيل المحضر يرجى دخول الرابط أدناة: -
${linkUrl}

جزاكم الله خير، ومشكورين على جهودكم`;

    const wpUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
    window.open(wpUrl, '_blank');

    if(btn) { btn.innerHTML = oldHTML; btn.disabled=false; }
  };

  // ========== INIT ==========
  initApp();

}); // DOMContentLoaded

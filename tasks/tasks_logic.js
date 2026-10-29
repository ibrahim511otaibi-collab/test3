// ==========================================
// إعدادات الاتصال بقاعدة بيانات سوبابيس (Supabase)
// ==========================================
const SUPABASE_URL = 'https://xkvxticrvhhehfigjlnt.supabase.co';
const SUPABASE_KEY = 'sb_publishable_hS4EERXUgjzYHZrt1rnRTg_QZg5Y6s_';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const ADMIN_PIN = '1234';

// قائمة احتياطية للموظفين في حال عدم الاتصال الأولي
let employeesData = [
    { name: 'ابراهيم خليل مزهر', id: '400152', phone: '96566695443' },
    { name: 'عبدالله سالم مهوس', id: '465154', phone: '96566460464' },
    { name: 'مشعل صالح الشمري', id: '440103', phone: '96599582005' },
    { name: 'لافي هجرس عبدالله', id: '435103', phone: '96597244213' },
    { name: 'وليد محمد أحمد علي الهتاري', id: '325145', phone: '96555963037' },
    { name: 'سعود ماجد محسن', id: '325137', phone: '96599545705' },
    { name: 'رسام عبدالله مضحي عبدالله', id: '465113', phone: '96599807881' },
    { name: 'علاء حسين سعيد حسين', id: '315125', phone: '96598853383' },
    { name: 'مشعل مضحي موسي', id: '466103', phone: '96597915529' },
    { name: 'محمد زين العابدين محمد سليم', id: '470125', phone: '96597288577' },
    { name: 'مساعد جمعة الشمري', id: '325109', phone: '96599497497' },
    { name: 'احمد جبار نخيلان', id: '315103', phone: '96597536333' },
    { name: 'عقاب لافي جندار', id: '465104', phone: '96599222624' },
    { name: 'عصام ابراهيم', id: '465133', phone: '96598770453' },
    { name: 'محمد ناظر خان محمد طاهر', id: '400137', phone: '96599096467' },
    { name: 'وليد الفقيه', id: '325143', phone: '96555410444' },
    { name: 'موسى حسانين محمد', id: '315102', phone: '96599501171' },
    { name: 'محمد عمر سالمين', id: '350108', phone: '96594927617' },
    { name: 'خالد صالح عبدالمانع', id: '325142', phone: '96594027705' }
];

let departmentsData = [
    { id: 1, name: 'قسم الكلمة الطيبة' },
    { id: 2, name: 'قسم الإعلامية والتسويق' },
    { id: 3, name: 'قسم الريع الوقفي' },
    { id: 4, name: 'قسم المشاريع' },
    { id: 5, name: 'قسم الرعاية الاجتماعية' },
    { id: 6, name: 'قسم النشء والشباب' },
    { id: 7, name: 'قسم حلقات تحفيظ القرآن' },
    { id: 8, name: 'قسم ضبط الجودة' },
    { id: 9, name: 'قسم اللجنة العلمية' },
    { id: 10, name: 'قسم متابعة الأقسام' },
    { id: 11, name: 'قسم تطوير الأنظمة التقنية' },
    { id: 12, name: 'قسم الأرشيف الالكتروني' },
    { id: 13, name: 'قسم الاستقطاعات' },
    { id: 14, name: 'قسم الدعم الفني' },
    { id: 15, name: 'قسم الاستقبال' },
    { id: 16, name: 'الهيئة الإدارية' }
];

let currentTaskId = null;
let currentMessageId = null;
let globalTasks = [];
let globalMessages = [];
let loggedInEmployee = null;
let realtimeChannel = null;
let lastEmployeesSyncTime = 0;
let realtimeTasksTimer = null;
let realtimeMsgsTimer = null;
let convertedMessageAttachmentUrl = '';
let currentLoadedMessageObj = null;

// ==========================================
// دوال مساعدة للتاريخ والواتساب والملفات
// ==========================================
function getLocalDateString(d) {
    try {
        const date = d ? new Date(d) : new Date();
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    } catch (e) {
        return '';
    }
}

// توليد المسار والرابط الرسمي المختصر للمنصة (يدعم وجود المنصة داخل مجلد فرعي مثل /tasks/ في قيت هاب وفيرسيل أو في الواجهة الرئيسية)
function getCleanPlatformPathname() {
    const isHttp = window.location.protocol === 'http:' || window.location.protocol === 'https:';
    const path = window.location.pathname || '/';
    if (!isHttp) return path;
    let clean = path.replace(/\/(tasks|index)\.html$/i, '/');
    if (!clean.endsWith('/') && !clean.endsWith('.html')) {
        clean += '/';
    }
    return clean || '/';
}

function getCleanPlatformBaseUrl() {
    const isHttp = window.location.protocol === 'http:' || window.location.protocol === 'https:';
    if (!isHttp) {
        return `${window.location.origin}${window.location.pathname}`;
    }
    return `${window.location.origin}${getCleanPlatformPathname()}`;
}

function normalizePhone(phone) {
    if (!phone) return '';
    let digits = String(phone).replace(/\D/g, '');
    if (digits.startsWith('00')) digits = digits.slice(2);
    if (digits.length === 8) digits = '965' + digits;
    return digits;
}

// توحيد النص العربي والهمزات والمسافات لضمان عدم ضياع أي تكليف بسبب اختلاف الإملاء
function normalizeArabicText(str) {
    if (!str) return '';
    return String(str)
        .trim()
        .replace(/[أإآ]/g, 'ا')
        .replace(/ة/g, 'ه')
        .replace(/ى/g, 'ي')
        .replace(/\s+/g, ' ');
}

// تأمين النصوص ضد رموز HTML الخاصة لمنع أي خلل في العرض أو ثغرات حقن النصوص
function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// تأمين النصوص الممررة داخل دوال الأزرار الديناميكية
function escapeJsStr(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/"/g, '&quot;')
        .replace(/\r?\n/g, ' ');
}

// فتح منتقي التاريخ بأمان تام على جميع المتصفحات والأجهزة الذكية
function safeShowDatePicker(elOrId) {
    try {
        const el = typeof elOrId === 'string' ? document.getElementById(elOrId) : elOrId;
        if (el && typeof el.showPicker === 'function') {
            el.showPicker();
        } else if (el) {
            el.focus();
        }
    } catch (e) {
        // تجاهل الخطأ في المتصفحات التي لا تدعم الفتح البرمجي لمنتقي التاريخ
    }
}

// جلب أحدث نسخة من التكليف من قاعدة البيانات مباشرة قبل التعديل لمنع مسح ردود الموظف المتزامنة
async function fetchLatestTaskFromDb(taskId) {
    const { data, error } = await supabaseClient
        .from('tasks')
        .select('replyHistory, taskStatus, dueDate, submittedAt, employeeName, employeePhone, requesterName, taskDetails')
        .eq('taskId', taskId)
        .single();
    if (!error && data) return data;
    return globalTasks.find(t => t.taskId === taskId) || null;
}

// مطابقة ذكية مزدوجة للتكليف مع الموظف (بالاسم الموحد أو برقم الهاتف)
function isTaskForEmployee(task, emp) {
    if (!task || !emp) return false;
    const taskName = normalizeArabicText(task.employeeName);
    const empName = normalizeArabicText(emp.name);
    if (taskName && empName && taskName === empName) return true;

    const taskPhone = normalizePhone(task.employeePhone);
    const empPhone = normalizePhone(emp.phone);
    if (taskPhone && empPhone && taskPhone === empPhone) return true;

    return false;
}

// مطابقة الأسماء العربية بمرونة عالية (مع توحيد الهمزات والتاء المربوطة)
function isSameArabicName(nameA, nameB) {
    if (!nameA || !nameB) return false;
    return normalizeArabicText(nameA) === normalizeArabicText(nameB);
}

// نظام الإشعارات العائمة الفاخرة بالهوية التراثية (بديل نوافذ المتصفح التقليدية)
function showHeritageToast(message, type = 'success') {
    const container = document.getElementById('heritageToastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    let bgClass = 'bg-gradient-to-l from-primary-dark via-primary to-green-700 text-white border-secondary';
    let icon = '✅';

    if (type === 'error') {
        bgClass = 'bg-gradient-to-l from-red-800 via-red-700 to-red-600 text-white border-red-300';
        icon = '⚠️';
    } else if (type === 'warning') {
        bgClass = 'bg-gradient-to-l from-amber-700 via-amber-600 to-amber-500 text-white border-amber-200';
        icon = '🔔';
    } else if (type === 'info') {
        bgClass = 'bg-gradient-to-l from-primary-dark via-[#0b6b2f] to-primary text-amber-100 border-secondary';
        icon = '⏳';
    }

    const cleanMsg = String(message || '').trim();
    const displayIcon = (type === 'info' && cleanMsg.startsWith('⏳')) ? '🤲' : icon;

    toast.className = `${bgClass} border-2 px-5 py-3.5 rounded-2xl shadow-2xl font-extrabold text-xs sm:text-sm flex items-center gap-3 w-full pointer-events-auto transform transition-all duration-300 -translate-y-4 opacity-0`;
    toast.innerHTML = `
        <span class="text-lg flex-shrink-0">${displayIcon}</span>
        <span class="flex-1 leading-relaxed">${cleanMsg}</span>
    `;

    container.appendChild(toast);
    requestAnimationFrame(() => {
        toast.classList.remove('-translate-y-4', 'opacity-0');
        toast.classList.add('translate-y-0', 'opacity-100');
    });

    setTimeout(() => {
        toast.classList.remove('translate-y-0', 'opacity-100');
        toast.classList.add('-translate-y-4', 'opacity-0');
        setTimeout(() => toast.remove(), 300);
    }, 3600);
}

// فتح الواتساب بترميز مضمون 100% مع زر تفاعلي عائم يتجاوز حظر النوافذ في الآيفون والمتصفحات
function openWhatsApp(phone, messageText) {
    const encodedText = encodeURIComponent(messageText);
    const cleanPhone = normalizePhone(phone);
    let url = '';
    if (cleanPhone) {
        url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`;
    } else {
        url = `https://api.whatsapp.com/send?text=${encodedText}`;
    }

    try {
        window.open(url, '_blank');
    } catch (e) {}

    showWhatsAppActionToast(url);
}

function showWhatsAppActionToast(url) {
    const container = document.getElementById('heritageToastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'bg-white border-2 border-green-500 px-4 py-3 rounded-2xl shadow-2xl text-xs sm:text-sm flex items-center justify-between gap-3 w-full pointer-events-auto transform transition-all duration-300';
    toast.innerHTML = `
        <div class="flex items-center gap-2 font-extrabold text-gray-800">
            <span class="text-lg">📱</span>
            <span>إشعار الواتساب جاهز للإرسال:</span>
        </div>
        <div class="flex items-center gap-2">
            <a href="${url}" target="_blank" onclick="this.closest('div.bg-white')?.remove()"
                class="bg-green-600 hover:bg-green-700 text-white font-extrabold px-3.5 py-2 rounded-xl text-xs shadow-sm transition whitespace-nowrap">
                فتح الواتساب الآن ↗
            </a>
            <button type="button" onclick="this.closest('div.bg-white')?.remove()" class="text-gray-400 hover:text-red-500 font-bold px-1.5 text-base">&times;</button>
        </div>
    `;
    container.appendChild(toast);
    setTimeout(() => {
        if (toast.parentNode) toast.remove();
    }, 9000);
}

// استخراج وعرض المرفقات الأساسية ومرفقات التسليم في أعلى بطاقة التكليف
function renderTaskAttachmentsBox(containerId, task) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const history = Array.isArray(task?.replyHistory) ? task.replyHistory : [];
    const attachments = [];

    history.forEach((item, idx) => {
        if (item && item.attachmentUrl) {
            const isMgr = item.sender === 'manager' || String(item.status || '').includes('تكليف جديد') || String(item.reply || '').includes('مرفقات التكليف من الإدارة');
            attachments.push({
                url: item.attachmentUrl,
                isManager: isMgr,
                label: isMgr ? '📎 مرفق التكليف الأساسي (من الإدارة)' : `📎 مرفق مرسل من الموظف (${item.status || 'رد'})`,
                index: idx + 1
            });
        }
    });

    if (attachments.length === 0) {
        container.classList.add('hidden');
        container.innerHTML = '';
        return;
    }

    container.classList.remove('hidden');
    container.innerHTML = `
        <div class="bg-amber-50/70 border border-amber-200/90 p-3.5 rounded-2xl space-y-2">
            <div class="text-xs font-extrabold text-amber-900 flex items-center gap-1.5">
                <span>📂</span>
                <span>المرفقات المرتبطة بهذا التكليف (${attachments.length}):</span>
            </div>
            <div class="flex flex-wrap gap-2">
                ${attachments.map(att => `
                    <a href="${escapeHtml(att.url)}" target="_blank"
                        class="${att.isManager ? 'bg-primary text-white hover:bg-primary-hover' : 'bg-white text-primary-dark border border-primary/30 hover:bg-primary/5'} px-3.5 py-2 rounded-xl text-xs font-extrabold transition shadow-sm inline-flex items-center gap-1.5">
                        <span>${att.label}</span>
                        <span>↗</span>
                    </a>
                `).join('')}
            </div>
        </div>
    `;
}

// استخراج الموعد الأصلي للتكليف في حال تم تمديده سابقاً
function getTaskOriginalDueDate(task) {
    const history = Array.isArray(task?.replyHistory) ? task.replyHistory : [];
    for (let i = 0; i < history.length; i++) {
        if (history[i] && history[i].previousDueDate) {
            return history[i].previousDueDate;
        }
    }
    return null;
}

// استخراج آخر موعد مقترح للتمديد طلبه الموظف
function getTaskRequestedExtensionDate(task) {
    const history = Array.isArray(task?.replyHistory) ? task.replyHistory : [];
    for (let i = history.length - 1; i >= 0; i--) {
        if (history[i] && history[i].requestedDueDate) {
            return history[i].requestedDueDate;
        }
    }
    return null;
}

// حساب نقاط السرعة الآلية بعدالة بناءً على تاريخ التسليم الأول للموظف (حتى لا يُظلم عند إرجاع التكليف للتعديل)
function calculateFairSpeedScore(task) {
    if (!task || !task.dueDate) {
        return { score: 30, speedScore: 30, firstSubDate: null, wasRevised: false, note: '' };
    }

    let firstReadyDate = null;
    let readyCount = 0;
    const history = Array.isArray(task.replyHistory) ? task.replyHistory : [];

    history.forEach(item => {
        if (item && (item.status === 'جاهز للمراجعة' || item.status === 'مغلق ومُقيم') && item.date) {
            readyCount++;
            const d = new Date(item.date);
            if (!isNaN(d.getTime()) && (!firstReadyDate || d < firstReadyDate)) {
                firstReadyDate = d;
            }
        }
    });

    if (!firstReadyDate && task.submittedAt) {
        const subD = new Date(task.submittedAt);
        if (!isNaN(subD.getTime())) firstReadyDate = subD;
    }

    if (!firstReadyDate) firstReadyDate = new Date();

    let speedScore = 0;
    try {
        const due = new Date(task.dueDate + 'T23:59:59');
        if (firstReadyDate <= due) {
            speedScore = 30;
        } else {
            const diffTime = Math.abs(firstReadyDate - due);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays === 1) speedScore = 20;
            else if (diffDays === 2) speedScore = 10;
            else speedScore = 0;
        }
    } catch (e) {
        speedScore = 30;
    }

    const wasRevised = readyCount > 1;
    const note = wasRevised ? '✅ احتُسبت نقاط السرعة بناءً على أول تسليم للموظف قبل طلب التعديل' : '';

    return {
        score: speedScore,
        speedScore,
        firstSubDate: firstReadyDate,
        wasRevised,
        note
    };
}

// قالب رسالة الواتساب الموسعة والمرتبة للتكاليف
function buildTaskWhatsAppMessage({ requester, title, priority, date, desc, link }) {
    let priorityIcon = '🟢';
    if (String(priority).includes('عاجل')) priorityIcon = '🔴';
    else if (String(priority).includes('هام')) priorityIcon = '🟡';

    const cleanDesc = String(desc || '').trim();
    const shortDesc = cleanDesc.length > 220 ? cleanDesc.substring(0, 220) + '...' : cleanDesc;

    return [
        `السلام عليكم ورحمة الله وبركاته 🌿`,
        ``,
        `📋 *إشعار تكليف عمل جديد*`,
        `🕌 *جمعية إحياء التراث الإسلامي - مركز الفروانية*`,
        `━━━━━━━━━━━━━━━`,
        `🏢 *الجهة الطالبة:* ${requester}`,
        `📌 *عنوان التكليف:* ${title}`,
        `${priorityIcon} *الأولوية:* ${priority}`,
        `📅 *آخر موعد للتسليم:* ${date}`,
        `━━━━━━━━━━━━━━━`,
        `📝 *التفاصيل:*`,
        `${shortDesc}`,
        ``,
        `🔗 *للاطلاع على التفاصيل والرد عبر المنصة اضغط الرابط التالي:*`,
        `${link}`
    ].join('\n');
}

// رفع المرفقات مباشرة إلى مخزن سوبابيس (Supabase Storage)
async function uploadFileToSupabase(file) {
    if (!file) return '';
    const ext = file.name.includes('.') ? file.name.split('.').pop() : 'bin';
    const safeName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
    const filePath = `uploads/${safeName}`;

    const { error } = await supabaseClient.storage
        .from('attachments')
        .upload(filePath, file, {
            cacheControl: '3600',
            upsert: true,
            contentType: file.type || 'application/octet-stream'
        });

    if (error) {
        throw new Error('تعذر رفع المرفق: ' + error.message);
    }

    const { data } = supabaseClient.storage.from('attachments').getPublicUrl(filePath);
    return data.publicUrl;
}

// ==========================================
// التخزين المؤقت الذكي لتسريع فتح المنصة وجلب البيانات بلمح البصر
// ==========================================
function restoreLocalDataCache() {
    try {
        const cEmps = localStorage.getItem('turath_cache_emps_v1');
        const cDepts = localStorage.getItem('turath_cache_depts_v1');
        const cTasks = localStorage.getItem('turath_cache_tasks_v1');
        const cMsgs = localStorage.getItem('turath_cache_msgs_v1');
        if (cEmps) {
            const parsed = JSON.parse(cEmps);
            if (Array.isArray(parsed) && parsed.length > 0) employeesData = parsed;
        }
        if (cDepts) {
            const parsed = JSON.parse(cDepts);
            if (Array.isArray(parsed) && parsed.length > 0) departmentsData = parsed;
        }
        if (cTasks) {
            const parsed = JSON.parse(cTasks);
            if (Array.isArray(parsed)) globalTasks = parsed;
        }
        if (cMsgs) {
            const parsed = JSON.parse(cMsgs);
            if (Array.isArray(parsed)) globalMessages = parsed;
        }
    } catch (e) {}
}

function compactReplyHistoryForCache(history) {
    if (!Array.isArray(history) || history.length === 0) return [];
    if (history.length <= 20) return history;
    const important = [];
    const seenIdx = new Set();
    // الاحتفاظ دائماً بالرد الأول (الذي يحمل مرفق الإدارة الأساسي) وأي رد يحمل تاريخ التمديد الأصلي أو التسليم الأول
    history.forEach((item, idx) => {
        if (
            idx === 0 ||
            (item && (item.attachmentUrl || item.previousDueDate || item.requestedDueDate || item.status === 'جاهز للمراجعة'))
        ) {
            important.push(item);
            seenIdx.add(idx);
        }
    });
    const tailStart = Math.max(0, history.length - 10);
    for (let i = tailStart; i < history.length; i++) {
        if (!seenIdx.has(i)) {
            important.push(history[i]);
            seenIdx.add(i);
        }
    }
    return important;
}

function saveLocalTasksCache() {
    try {
        let existingMap = new Map();
        try {
            const rawOld = localStorage.getItem('turath_cache_tasks_v1');
            if (rawOld) {
                const parsedOld = JSON.parse(rawOld);
                if (Array.isArray(parsedOld)) {
                    parsedOld.forEach(oldT => {
                        if (oldT && oldT.taskId && Array.isArray(oldT.replyHistory) && oldT.replyHistory.length > 0) {
                            existingMap.set(oldT.taskId, oldT.replyHistory);
                        }
                    });
                }
            }
        } catch (e) {}

        // حفظ نسخة ذكية من التكاليف للتشغيل الفوري مع الحفاظ التام على المرفقات وسجل التقييم
        const lightTasks = (globalTasks || []).map(t => {
            const resolvedHistory = Array.isArray(t.replyHistory)
                ? compactReplyHistoryForCache(t.replyHistory)
                : (existingMap.get(t.taskId) || []);
            return {
                taskId: t.taskId,
                createdAt: t.createdAt,
                requesterName: t.requesterName,
                employeeName: t.employeeName,
                employeePhone: t.employeePhone,
                taskDetails: t.taskDetails,
                dueDate: t.dueDate,
                taskStatus: t.taskStatus,
                managerScore: t.managerScore,
                speedScore: t.speedScore,
                submittedAt: t.submittedAt,
                batchId: t.batchId,
                replyHistory: resolvedHistory
            };
        });
        localStorage.setItem('turath_cache_tasks_v1', JSON.stringify(lightTasks));
    } catch (e) {}
}

function saveLocalMessagesCache() {
    try {
        localStorage.setItem('turath_cache_msgs_v1', JSON.stringify((globalMessages || []).slice(0, 60)));
    } catch (e) {}
}

// ==========================================
// تحميل بيانات الموظفين والجهات من سوبابيس
// ==========================================
async function syncEmployeesAndDepartments() {
    try {
        const [empRes, deptRes] = await Promise.all([
            supabaseClient.from('employees').select('*').order('name', { ascending: true }),
            supabaseClient.from('departments').select('*').order('id', { ascending: true })
        ]);

        if (!empRes.error && Array.isArray(empRes.data) && empRes.data.length > 0) {
            employeesData = empRes.data;
            try { localStorage.setItem('turath_cache_emps_v1', JSON.stringify(employeesData)); } catch (e) {}
        }
        if (!deptRes.error && Array.isArray(deptRes.data) && deptRes.data.length > 0) {
            departmentsData = deptRes.data;
            try { localStorage.setItem('turath_cache_depts_v1', JSON.stringify(departmentsData)); } catch (e) {}
        }
        lastEmployeesSyncTime = Date.now();
    } catch (e) {
        console.warn('Sync fallback used:', e);
    }

    renderEmployeeCheckboxes();
    renderDepartmentsDropdown();
    renderEmployeeReceiverDropdown();
    renderSettingsLists();
    populateReportDepartmentFilter();
}

function populateReportDepartmentFilter() {
    const select = document.getElementById('reportDeptFilter');
    if (!select) return;
    const currentVal = select.value;
    const deptNames = new Set();
    departmentsData.forEach(d => { if (d && d.name) deptNames.add(d.name); });
    globalTasks.forEach(t => { if (t && t.requesterName) deptNames.add(t.requesterName); });

    let html = '<option value="">🏢 كل الجهات والأقسام</option>';
    deptNames.forEach(dName => {
        const sel = currentVal === dName ? 'selected' : '';
        html += `<option value="${escapeHtml(dName)}" ${sel}>${escapeHtml(dName)}</option>`;
    });
    select.innerHTML = html;
}

// ==========================================
// القائمة المدمجة الذكية لاختيار الموظفين المكلفين (قائمة منسدلة + بحث وكتابة يدوية + شارات تفاعلية)
// ==========================================
function renderEmployeeCheckboxes() {
    const container = document.getElementById('checkboxesContainer');
    if (!container) return;

    // الحفاظ على الاختيارات الحالية (بما فيها الأسماء اليدوية المضافة) إن وجدت
    const previouslyCheckedMap = new Map();
    document.querySelectorAll('.emp-checkbox:checked').forEach(cb => {
        previouslyCheckedMap.set(cb.value, true);
    });

    container.innerHTML = '';
    const renderedValues = new Set();

    employeesData.forEach((emp, idx) => {
        const cleanPhone = emp.phone || '';
        const cleanName = emp.name || '';
        const val = `${cleanPhone}|${cleanName}`;
        renderedValues.add(val);
        const isChecked = previouslyCheckedMap.has(val) ? 'checked' : '';
        const searchKey = `${normalizeArabicText(cleanName)} ${String(emp.id || '')} ${cleanPhone}`.toLowerCase();

        const div = document.createElement('div');
        div.className = 'emp-checkbox-row flex items-center gap-2.5 hover:bg-surface p-2.5 rounded-xl transition cursor-pointer border border-transparent hover:border-primary/20';
        div.dataset.search = searchKey;
        div.dataset.name = cleanName;
        div.onclick = function (e) {
            if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'LABEL') {
                const cb = div.querySelector('.emp-checkbox');
                if (cb) {
                    cb.checked = !cb.checked;
                    updateMultiSelectLabel();
                }
            }
        };
        div.innerHTML = `
            <input type="checkbox" id="empCheckbox_${idx}" class="emp-checkbox w-4 h-4 text-primary rounded border-line focus:ring-primary cursor-pointer" value="${escapeHtml(val)}" ${isChecked} onchange="updateMultiSelectLabel()">
            <label for="empCheckbox_${idx}" class="text-sm font-bold text-ink cursor-pointer flex-1 select-none">${escapeHtml(cleanName)}</label>
            <span class="text-[11px] font-mono text-gray-400 bg-gray-50 px-2 py-0.5 rounded-md border border-gray-100">${escapeHtml(emp.id || '')}</span>
        `;
        container.appendChild(div);
    });

    // إعادة إدراج أي موظف تم كتابته يدوياً وكان محدداً قبل التحديث
    previouslyCheckedMap.forEach((_, val) => {
        if (!renderedValues.has(val)) {
            const [, customName] = val.split('|');
            if (customName) appendCustomTaskEmployeeRow(customName, true);
        }
    });

    const currentQuery = document.getElementById('taskEmpSearchInput')?.value || '';
    if (currentQuery) {
        filterTaskEmployeesList(currentQuery);
    }
    updateMultiSelectLabel();
}

function appendCustomTaskEmployeeRow(customName, checked = true) {
    const container = document.getElementById('checkboxesContainer');
    if (!container) return;
    const cleanName = String(customName || '').trim();
    if (!cleanName) return;
    const val = `|${cleanName}`;

    // فحص إذا كان موجوداً مسبقاً
    const existing = Array.from(container.querySelectorAll('.emp-checkbox')).find(
        cb => isSameArabicName(cb.value.split('|')[1], cleanName)
    );
    if (existing) {
        existing.checked = checked;
        updateMultiSelectLabel();
        return;
    }

    const idx = 'custom_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    const searchKey = normalizeArabicText(cleanName).toLowerCase();
    const div = document.createElement('div');
    div.className = 'emp-checkbox-row flex items-center gap-2.5 hover:bg-surface p-2.5 rounded-xl transition cursor-pointer border border-amber-200/80 bg-amber-50/40';
    div.dataset.search = searchKey;
    div.dataset.name = cleanName;
    div.innerHTML = `
        <input type="checkbox" id="empCheckbox_${idx}" class="emp-checkbox w-4 h-4 text-primary rounded border-line focus:ring-primary cursor-pointer" value="${escapeHtml(val)}" ${checked ? 'checked' : ''} onchange="updateMultiSelectLabel()">
        <label for="empCheckbox_${idx}" class="text-sm font-bold text-ink cursor-pointer flex-1 select-none">${escapeHtml(cleanName)}</label>
        <span class="text-[10px] font-extrabold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md">إدخال يدوي</span>
    `;
    container.prepend(div);
}

function openTaskEmployeeDropdown() {
    const dropdown = document.getElementById('checkboxDropdown');
    if (dropdown) dropdown.classList.remove('hidden');
}

function openTaskEmployeeDropdownAndFocus(e) {
    if (e && (e.target.closest('button') || e.target.tagName === 'INPUT')) return;
    openTaskEmployeeDropdown();
    const searchInput = document.getElementById('taskEmpSearchInput');
    if (searchInput) searchInput.focus();
}

function filterTaskEmployeesList(query) {
    openTaskEmployeeDropdown();
    const normQ = normalizeArabicText(query || '').toLowerCase();
    const rows = document.querySelectorAll('#checkboxesContainer .emp-checkbox-row');
    let visibleCount = 0;
    let exactMatchFound = false;

    rows.forEach(row => {
        const searchStr = (row.dataset.search || '').toLowerCase();
        const rowNameNorm = normalizeArabicText(row.dataset.name || '').toLowerCase();
        if (!normQ || searchStr.includes(normQ)) {
            row.classList.remove('hidden');
            visibleCount++;
            if (rowNameNorm === normQ) exactMatchFound = true;
        } else {
            row.classList.add('hidden');
        }
    });

    const customBox = document.getElementById('taskEmpCustomAddBox');
    const cleanRaw = String(query || '').trim();
    if (customBox) {
        if (cleanRaw && !exactMatchFound) {
            const safeRawJs = escapeJsStr(cleanRaw);
            const safeRawHtml = escapeHtml(cleanRaw);
            customBox.classList.remove('hidden');
            customBox.innerHTML = `
                <button type="button" onclick="addCustomTaskEmployee('${safeRawJs}')"
                    class="w-full text-right bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 px-3 py-2 rounded-xl text-xs font-extrabold transition flex items-center justify-between gap-2">
                    <span>➕ إضافة اسم المكلف يدوياً: «${safeRawHtml}»</span>
                    <span class="bg-white px-2 py-0.5 rounded-md text-[10px] border border-amber-200">اضغط للإضافة ↵</span>
                </button>
            `;
        } else {
            customBox.classList.add('hidden');
            customBox.innerHTML = '';
        }
    }
}

function addCustomTaskEmployee(nameStr) {
    const searchInput = document.getElementById('taskEmpSearchInput');
    const clean = String(nameStr !== undefined ? nameStr : (searchInput?.value || '')).trim();
    if (!clean) return;
    appendCustomTaskEmployeeRow(clean, true);
    if (searchInput) {
        searchInput.value = '';
        filterTaskEmployeesList('');
        searchInput.focus();
    }
    updateMultiSelectLabel();
}

function handleTaskEmpSearchKeydown(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        const searchInput = document.getElementById('taskEmpSearchInput');
        const q = (searchInput?.value || '').trim();
        if (!q) return;

        const visibleCheckboxes = Array.from(document.querySelectorAll('#checkboxesContainer .emp-checkbox-row:not(.hidden) .emp-checkbox'));
        if (visibleCheckboxes.length === 1) {
            visibleCheckboxes[0].checked = true;
            if (searchInput) searchInput.value = '';
            filterTaskEmployeesList('');
            updateMultiSelectLabel();
        } else {
            const exactCb = visibleCheckboxes.find(cb => isSameArabicName(cb.value.split('|')[1], q));
            if (exactCb) {
                exactCb.checked = true;
                if (searchInput) searchInput.value = '';
                filterTaskEmployeesList('');
                updateMultiSelectLabel();
            } else {
                addCustomTaskEmployee(q);
            }
        }
    } else if (event.key === 'Backspace' && !event.target.value) {
        const checked = Array.from(document.querySelectorAll('.emp-checkbox:checked'));
        if (checked.length > 0) {
            checked[checked.length - 1].checked = false;
            updateMultiSelectLabel();
        }
    }
}

function removeTaskEmployeeChip(val, e) {
    if (e) e.stopPropagation();
    document.querySelectorAll('.emp-checkbox').forEach(cb => {
        if (cb.value === val) cb.checked = false;
    });
    updateMultiSelectLabel();
}

function renderDepartmentsDropdown() {
    const select = document.getElementById('requesterNameSelect');
    if (!select) return;

    const savedRequester = select.value || localStorage.getItem('lastRequesterSelect') || '';
    const savedOther = localStorage.getItem('lastRequesterOther') || '';

    let html = `<option value="" disabled ${!savedRequester ? 'selected' : ''}>اختر الجهة الطالبة</option>`;
    departmentsData.forEach(d => {
        const sel = (savedRequester === d.name) ? 'selected' : '';
        html += `<option value="${escapeHtml(d.name)}" ${sel}>${escapeHtml(d.name)}</option>`;
    });
    html += `<option value="أخرى" ${savedRequester === 'أخرى' ? 'selected' : ''}>أخرى (كتابة يدوية)</option>`;
    select.innerHTML = html;

    const otherInput = document.getElementById('requesterNameOther');
    if (otherInput) {
        if (savedRequester === 'أخرى') {
            otherInput.classList.remove('hidden');
            if (!otherInput.value && savedOther) otherInput.value = savedOther;
        } else {
            otherInput.classList.add('hidden');
        }
    }
}

// ==========================================
// القائمة المدمجة الذكية لاختيار مستلمي الرسائل الداخلية (بحث + كتابة يدوية + اختيار متعدد)
// ==========================================
function renderEmployeeReceiverDropdown() {
    const container = document.getElementById('empMsgCheckboxesContainer');
    if (!container) return;

    const previouslyChecked = new Set(
        Array.from(document.querySelectorAll('.emp-msg-checkbox:checked')).map(cb => cb.value)
    );

    container.innerHTML = '';
    const renderedVals = new Set();

    employeesData.forEach((emp, idx) => {
        if (loggedInEmployee && String(emp.id) === String(loggedInEmployee.id)) return; // استثناء الموظف نفسه
        const val = `${emp.id}|${emp.phone || ''}|${emp.name || ''}`;
        renderedVals.add(val);
        const isChecked = previouslyChecked.has(val) ? 'checked' : '';
        const searchKey = `${normalizeArabicText(emp.name)} ${String(emp.id || '')} ${String(emp.phone || '')}`.toLowerCase();

        const div = document.createElement('div');
        div.className = 'emp-msg-row flex items-center gap-2.5 hover:bg-surface p-2.5 rounded-xl transition cursor-pointer border border-transparent hover:border-primary/20';
        div.dataset.search = searchKey;
        div.dataset.name = emp.name || '';
        div.onclick = function (e) {
            if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'LABEL') {
                const cb = div.querySelector('.emp-msg-checkbox');
                if (cb) {
                    cb.checked = !cb.checked;
                    updateEmpMsgReceiverSelectionUI();
                }
            }
        };
        div.innerHTML = `
            <input type="checkbox" id="empMsgCb_${idx}" class="emp-msg-checkbox w-4 h-4 text-primary rounded border-line focus:ring-primary cursor-pointer" value="${escapeHtml(val)}" ${isChecked} onchange="updateEmpMsgReceiverSelectionUI()">
            <label for="empMsgCb_${idx}" class="text-sm font-bold text-ink cursor-pointer flex-1 select-none">${escapeHtml(emp.name)}</label>
            <span class="text-[11px] font-mono text-gray-400 bg-gray-50 px-2 py-0.5 rounded-md border border-gray-100">${escapeHtml(emp.id)}</span>
        `;
        container.appendChild(div);
    });

    previouslyChecked.forEach(val => {
        if (!renderedVals.has(val)) {
            const parts = val.split('|');
            const customName = parts.slice(2).join('|');
            if (customName) appendCustomEmpMsgReceiverRow(customName, true);
        }
    });

    updateEmpMsgReceiverSelectionUI();
}

function appendCustomEmpMsgReceiverRow(customName, checked = true) {
    const container = document.getElementById('empMsgCheckboxesContainer');
    if (!container) return;
    const cleanName = String(customName || '').trim();
    if (!cleanName) return;

    const existing = Array.from(container.querySelectorAll('.emp-msg-checkbox')).find(
        cb => isSameArabicName(cb.value.split('|').slice(2).join('|'), cleanName)
    );
    if (existing) {
        existing.checked = checked;
        updateEmpMsgReceiverSelectionUI();
        return;
    }

    const customId = 'MANUAL-' + Math.random().toString(36).substr(2, 5).toUpperCase();
    const val = `${customId}||${cleanName}`;
    const idx = 'custom_msg_' + Date.now();
    const div = document.createElement('div');
    div.className = 'emp-msg-row flex items-center gap-2.5 hover:bg-surface p-2.5 rounded-xl transition cursor-pointer border border-amber-200 bg-amber-50/40';
    div.dataset.search = normalizeArabicText(cleanName).toLowerCase();
    div.dataset.name = cleanName;
    div.innerHTML = `
        <input type="checkbox" id="empMsgCb_${idx}" class="emp-msg-checkbox w-4 h-4 text-primary rounded border-line focus:ring-primary cursor-pointer" value="${escapeHtml(val)}" ${checked ? 'checked' : ''} onchange="updateEmpMsgReceiverSelectionUI()">
        <label for="empMsgCb_${idx}" class="text-sm font-bold text-ink cursor-pointer flex-1 select-none">${escapeHtml(cleanName)}</label>
        <span class="text-[10px] font-extrabold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md">إدخال يدوي</span>
    `;
    container.prepend(div);
}

function openEmpMsgReceiverDropdown() {
    const dd = document.getElementById('empMsgReceiverDropdown');
    if (dd) dd.classList.remove('hidden');
}

function toggleEmpMsgReceiverDropdown() {
    const dd = document.getElementById('empMsgReceiverDropdown');
    if (dd) dd.classList.toggle('hidden');
}

function openEmpMsgReceiverDropdownAndFocus(e) {
    if (e && (e.target.closest('button') || e.target.tagName === 'INPUT')) return;
    openEmpMsgReceiverDropdown();
    const input = document.getElementById('empMsgSearchInput');
    if (input) input.focus();
}

function filterEmpMsgReceiversList(query) {
    openEmpMsgReceiverDropdown();
    const normQ = normalizeArabicText(query || '').toLowerCase();
    const rows = document.querySelectorAll('#empMsgCheckboxesContainer .emp-msg-row');
    let exactMatch = false;

    rows.forEach(row => {
        const searchStr = (row.dataset.search || '').toLowerCase();
        const rowNameNorm = normalizeArabicText(row.dataset.name || '').toLowerCase();
        if (!normQ || searchStr.includes(normQ)) {
            row.classList.remove('hidden');
            if (rowNameNorm === normQ) exactMatch = true;
        } else {
            row.classList.add('hidden');
        }
    });

    const customBox = document.getElementById('empMsgCustomAddBox');
    const cleanRaw = String(query || '').trim();
    if (customBox) {
        if (cleanRaw && !exactMatch) {
            const safeJs = escapeJsStr(cleanRaw);
            const safeHtml = escapeHtml(cleanRaw);
            customBox.classList.remove('hidden');
            customBox.innerHTML = `
                <button type="button" onclick="addCustomEmpMsgReceiver('${safeJs}')"
                    class="w-full text-right bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 px-3 py-2 rounded-xl text-xs font-extrabold transition flex items-center justify-between gap-2">
                    <span>➕ إضافة اسم المستلم يدوياً: «${safeHtml}»</span>
                    <span class="bg-white px-2 py-0.5 rounded-md text-[10px] border border-amber-200">إضافة ↵</span>
                </button>
            `;
        } else {
            customBox.classList.add('hidden');
            customBox.innerHTML = '';
        }
    }
}

function addCustomEmpMsgReceiver(nameStr) {
    const clean = String(nameStr || '').trim();
    if (!clean) return;
    appendCustomEmpMsgReceiverRow(clean, true);
    const input = document.getElementById('empMsgSearchInput');
    if (input) {
        input.value = '';
        filterEmpMsgReceiversList('');
        input.focus();
    }
    updateEmpMsgReceiverSelectionUI();
}

function handleEmpMsgSearchKeydown(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        const input = document.getElementById('empMsgSearchInput');
        const q = (input?.value || '').trim();
        if (!q) return;

        const visibleCbs = Array.from(document.querySelectorAll('#empMsgCheckboxesContainer .emp-msg-row:not(.hidden) .emp-msg-checkbox'));
        if (visibleCbs.length === 1) {
            visibleCbs[0].checked = true;
            if (input) input.value = '';
            filterEmpMsgReceiversList('');
            updateEmpMsgReceiverSelectionUI();
        } else {
            const exactCb = visibleCbs.find(cb => isSameArabicName(cb.value.split('|').slice(2).join('|'), q));
            if (exactCb) {
                exactCb.checked = true;
                if (input) input.value = '';
                filterEmpMsgReceiversList('');
                updateEmpMsgReceiverSelectionUI();
            } else {
                addCustomEmpMsgReceiver(q);
            }
        }
    } else if (event.key === 'Backspace' && !event.target.value) {
        const checked = Array.from(document.querySelectorAll('.emp-msg-checkbox:checked'));
        if (checked.length > 0) {
            checked[checked.length - 1].checked = false;
            updateEmpMsgReceiverSelectionUI();
        }
    }
}

function selectAllEmpMsgReceivers(check) {
    const rows = document.querySelectorAll('#empMsgCheckboxesContainer .emp-msg-row');
    rows.forEach(row => {
        if (!check || !row.classList.contains('hidden')) {
            const cb = row.querySelector('.emp-msg-checkbox');
            if (cb) cb.checked = check;
        }
    });
    updateEmpMsgReceiverSelectionUI();
}

function removeEmpMsgReceiverChip(val) {
    document.querySelectorAll('.emp-msg-checkbox').forEach(cb => {
        if (cb.value === val) cb.checked = false;
    });
    updateEmpMsgReceiverSelectionUI();
}

function updateEmpMsgReceiverSelectionUI() {
    const checked = Array.from(document.querySelectorAll('.emp-msg-checkbox:checked'));
    const chipsContainer = document.getElementById('empMsgSelectedChips');
    const countBadge = document.getElementById('empMsgSelectedCountBadge');
    const routingHint = document.getElementById('empMsgRoutingHint');
    const searchInput = document.getElementById('empMsgSearchInput');

    if (countBadge) countBadge.innerText = `${checked.length} محدد`;

    if (routingHint) {
        if (checked.length === 0) {
            routingHint.innerText = 'اختر موظفاً أو عدة موظفين';
            routingHint.className = 'text-[11px] font-extrabold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full';
        } else if (checked.length === 1) {
            routingHint.innerText = '📱 موظف واحد: تحويل مباشر لرقمه بالواتساب';
            routingHint.className = 'text-[11px] font-extrabold text-emerald-800 bg-emerald-100 border border-emerald-200 px-2.5 py-0.5 rounded-full';
        } else {
            routingHint.innerText = `👥 (${checked.length}) موظفين: فتح القائمة العامة بالواتساب للاختيار`;
            routingHint.className = 'text-[11px] font-extrabold text-amber-900 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-full';
        }
    }

    if (chipsContainer) {
        chipsContainer.innerHTML = checked.map(cb => {
            const parts = cb.value.split('|');
            const empName = parts.slice(2).join('|') || 'موظف';
            const safeValJs = escapeJsStr(cb.value);
            return `
                <span class="inline-flex items-center gap-1.5 bg-primary/10 text-primary-dark border border-primary/25 px-2.5 py-1 rounded-xl text-xs font-extrabold shadow-sm">
                    <span>👤 ${escapeHtml(empName)}</span>
                    <button type="button" onclick="event.stopPropagation(); removeEmpMsgReceiverChip('${safeValJs}')"
                        class="text-primary hover:text-red-600 font-black text-xs leading-none px-0.5" title="إزالة">&times;</button>
                </span>
            `;
        }).join('');
    }

    if (searchInput) {
        searchInput.placeholder = checked.length > 0 ? 'ابحث أو أضف موظفاً آخر...' : 'اكتب اسم الموظف أو اختر من القائمة...';
    }
}

// ==========================================
// تهيئة النظام عند فتح الصفحة
// ==========================================
window.onload = async () => {
    try {
        const today = getLocalDateString();
        const dDate = document.getElementById('taskDate');
        if (dDate) dDate.setAttribute('min', today);
    } catch (e) {}

    document.addEventListener('click', function (e) {
        const toggle = document.getElementById('multiSelectToggle');
        const dropdown = document.getElementById('checkboxDropdown');
        if (toggle && dropdown) {
            if (!toggle.contains(e.target) && !dropdown.contains(e.target)) {
                dropdown.classList.add('hidden');
            }
        }

        const msgToggle = document.getElementById('empMsgMultiSelectToggle');
        const msgDropdown = document.getElementById('empMsgReceiverDropdown');
        if (msgToggle && msgDropdown) {
            if (!msgToggle.contains(e.target) && !msgDropdown.contains(e.target)) {
                msgDropdown.classList.add('hidden');
            }
        }
    });

    // استرجاع البيانات المخزنة مؤقتاً فوراً (0 ملي ثانية) لتسريع فتح المنصة بدون أي انتظار
    restoreLocalDataCache();
    renderEmployeeCheckboxes();
    renderDepartmentsDropdown();
    renderEmployeeReceiverDropdown();
    populateReportDepartmentFilter();

    // مزامنة الموظفين والأقسام بالخلفية بالتوازي مع جلب التكاليف
    const syncPromise = syncEmployeesAndDepartments();
    setupRealtimeSubscription();

    // تنظيف عنوان المتصفح تلقائياً على فيرسيل ليختفي (/tasks.html) ويبقى الرابط الرسمي المختصر فقط
    const cleanPathOnLoad = getCleanPlatformPathname();
    if (cleanPathOnLoad !== window.location.pathname) {
        window.history.replaceState({}, document.title, cleanPathOnLoad + window.location.search);
    }

    const params = new URLSearchParams(window.location.search);
    const taskIdParam = params.get('id');
    const batchIdParam = params.get('batch');
    const msgIdParam = params.get('msg');

    const adminLogged = localStorage.getItem('adminLoggedIn');
    const savedEmpId = localStorage.getItem('empId');

    if (savedEmpId) {
        let employee = employeesData.find(e => e.id === savedEmpId);
        if (!employee) {
            await syncPromise;
            employee = employeesData.find(e => e.id === savedEmpId);
        }
        if (employee) {
            loggedInEmployee = employee;
            document.getElementById('logoutBtn').classList.remove('hidden');
            document.getElementById('empWelcomeName').innerText = employee.name.split(' ')[0];
            renderEmployeeReceiverDropdown();
        }
    }

    // 1. إذا كان الرابط يفتح رسالة داخلية مباشرة أو رسالة جماعية (?msg=MSG-... أو ?msg=MGRP-...)
    if (msgIdParam) {
        if (adminLogged === 'true' || loggedInEmployee) {
            document.getElementById('logoutBtn').classList.remove('hidden');
            await openMessageById(msgIdParam);
            return;
        } else {
            const notice = document.getElementById('loginRedirectNotice');
            if (notice) notice.classList.remove('hidden');
            showLoginSection();
            return;
        }
    }

    // 2. إذا كان الرابط يفتح تكليف جماعي ذكي (?batch=GRP-...)
    if (batchIdParam) {
        if (loggedInEmployee) {
            const matchedTaskId = await findEmployeeTaskInBatch(batchIdParam, loggedInEmployee.name);
            if (matchedTaskId) {
                currentTaskId = matchedTaskId;
                document.getElementById('employeeSection').classList.remove('hidden');
                document.getElementById('globalBackBtn').classList.remove('hidden');
                loadTaskData(matchedTaskId);
                return;
            } else {
                showHeritageToast('عذراً، هذا التكليف الجماعي غير موجه لاسمك. تم فتح لوحتك الخاصة.', 'warning');
                window.history.replaceState({}, document.title, getCleanPlatformPathname());
            }
        } else if (adminLogged === 'true') {
            document.getElementById('managerSection').classList.remove('hidden');
            document.getElementById('logoutBtn').classList.remove('hidden');
            window.history.replaceState({}, document.title, getCleanPlatformPathname());
            switchManagerTab('Dashboard');
            return;
        } else {
            // يطلب منه إدخال رقمه الوظيفي ليتم توجيهه لتكليفه مباشرة
            const notice = document.getElementById('loginRedirectNotice');
            if (notice) notice.classList.remove('hidden');
            showLoginSection();
            return;
        }
    }

    // 3. إذا كان الرابط يفتح تكليف محدد مباشرة (?id=TSK-...)
    if (taskIdParam) {
        if (adminLogged === 'true' && !loggedInEmployee) {
            document.getElementById('managerSection').classList.remove('hidden');
            document.getElementById('logoutBtn').classList.remove('hidden');
            switchManagerTab('Dashboard');
            await loadDashboard();
            openManagerTaskDetails(taskIdParam);
            return;
        }
        if (loggedInEmployee) {
            currentTaskId = taskIdParam;
            document.getElementById('employeeSection').classList.remove('hidden');
            document.getElementById('globalBackBtn').classList.remove('hidden');
            loadTaskData(taskIdParam);
            return;
        }
        // إلزام تسجيل الدخول بالرقم الوظيفي أولاً لمنع فتح التكليف أو تحويله لـ (تم الاطلاع) بدون هوية موثقة
        const notice = document.getElementById('loginRedirectNotice');
        if (notice) notice.classList.remove('hidden');
        showLoginSection();
        return;
    }

    // 4. الدخول العادي للوحة الإدارة أو الموظف أو شاشة الدخول الموحدة
    if (adminLogged === 'true') {
        document.getElementById('managerSection').classList.remove('hidden');
        document.getElementById('logoutBtn').classList.remove('hidden');
        switchManagerTab('Dashboard');
    } else if (loggedInEmployee) {
        document.getElementById('employeeDashboardSection').classList.remove('hidden');
        document.getElementById('logoutBtn').classList.remove('hidden');
        loadEmployeeDashboardData();
        loadEmployeeMessagesData();
    } else {
        showLoginSection();
    }
};

function setupRealtimeSubscription() {
    if (realtimeChannel) {
        supabaseClient.removeChannel(realtimeChannel);
    }
    realtimeChannel = supabaseClient
        .channel('public-db-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
            if (realtimeTasksTimer) clearTimeout(realtimeTasksTimer);
            realtimeTasksTimer = setTimeout(() => {
                if (!document.getElementById('managerSection').classList.contains('hidden')) {
                    refreshManagerTasksOnly();
                }
                if (loggedInEmployee && !document.getElementById('employeeDashboardSection').classList.contains('hidden')) {
                    loadEmployeeDashboardData();
                }
                if (currentTaskId && !document.getElementById('employeeSection').classList.contains('hidden')) {
                    // منع إعادة الرسم المزدوج إذا كان التحديث ناتجاً عن تحويل الحالة تلقائياً إلى (تم الاطلاع) لنفس الموظف قبل لحظات
                    if (window.__ignoreRealtimeTaskUntil && Date.now() < window.__ignoreRealtimeTaskUntil) {
                        return;
                    }
                    loadTaskData(currentTaskId);
                }
            }, 350);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
            if (realtimeMsgsTimer) clearTimeout(realtimeMsgsTimer);
            realtimeMsgsTimer = setTimeout(() => {
                if (!document.getElementById('managerSection').classList.contains('hidden')) {
                    refreshManagerMessagesOnly();
                }
                if (loggedInEmployee) {
                    loadEmployeeMessagesData();
                }
                if (currentMessageId && !document.getElementById('messageViewSection').classList.contains('hidden')) {
                    if (window.__ignoreRealtimeMsgUntil && Date.now() < window.__ignoreRealtimeMsgUntil) {
                        return;
                    }
                    openMessageById(currentMessageId);
                }
            }, 350);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'employees' }, () => {
            syncEmployeesAndDepartments();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'departments' }, () => {
            syncEmployeesAndDepartments();
        })
        .subscribe();
}

async function findEmployeeTaskInBatch(batchId, employeeName) {
    const { data, error } = await supabaseClient
        .from('tasks')
        .select('taskId, employeeName, employeePhone')
        .eq('batchId', batchId);

    if (!error && Array.isArray(data) && data.length > 0) {
        const empObj = loggedInEmployee || employeesData.find(e => e.name === employeeName) || { name: employeeName, phone: '' };
        const match = data.find(t => isTaskForEmployee(t, empObj));
        return match ? match.taskId : null;
    }
    return null;
}

// ==========================================
// نظام الدخول الموحد (للإدارة والموظفين)
// ==========================================
function showLoginSection() {
    document.getElementById('loginSection').classList.remove('hidden');
    const input = document.getElementById('unifiedLoginInput');
    if (input) {
        updateLoginInteractiveDots(input.value || '');
        setTimeout(() => input.focus(), 100);
    }
}

function updateLoginInteractiveDots(val) {
    const cleanLen = String(val || '').trim().length;
    const dotsContainer = document.getElementById('loginLiveDots');
    const errEl = document.getElementById('unifiedLoginError');
    if (errEl && !errEl.classList.contains('hidden')) {
        errEl.classList.add('hidden');
    }

    if (dotsContainer) {
        const dots = dotsContainer.querySelectorAll('.login-dot');
        dots.forEach((dot, idx) => {
            if (idx < cleanLen) {
                dot.className = 'login-dot w-6 h-2.5 rounded-full bg-gradient-to-l from-primary to-secondary shadow-sm transition-all duration-300';
            } else {
                dot.className = 'login-dot w-2.5 h-2.5 rounded-full bg-gray-200 transition-all duration-300';
            }
        });
    }

    const shield = document.getElementById('loginCenterShield');
    if (shield) {
        shield.style.transform = 'scale(1.12)';
        setTimeout(() => {
            shield.style.transform = '';
        }, 160);
    }
}

function toggleLoginPasswordVisibility() {
    const inputEl = document.getElementById('unifiedLoginInput');
    const iconEl = document.getElementById('loginEyeIcon');
    if (!inputEl) return;

    const isHidden = inputEl.type === 'password';
    inputEl.type = isHidden ? 'text' : 'password';

    if (iconEl) {
        if (isHidden) {
            iconEl.innerHTML = `
                <path stroke-linecap="round" stroke-linejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
            `;
        } else {
            iconEl.innerHTML = `
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
            `;
        }
    }
    inputEl.focus();
}

async function handleUnifiedLogin() {
    const inputEl = document.getElementById('unifiedLoginInput');
    const errEl = document.getElementById('unifiedLoginError');
    const loginBtn = document.getElementById('btnUnifiedLogin');
    const code = (inputEl ? inputEl.value : '').trim();

    if (!code) return;
    errEl.classList.add('hidden');
    if (loginBtn) loginBtn.disabled = true;

    try {
        // عدم إعادة تحميل قائمة الموظفين إذا كانت محملة حديثاً لتسريع الدخول بلمح البصر
        const isRecentlySynced = (Date.now() - lastEmployeesSyncTime) < 60000 && employeesData.length > 0;
        const matchedInCache = code === ADMIN_PIN || employeesData.some(e => String(e.id).trim() === code);
        if (!isRecentlySynced || !matchedInCache) {
            await syncEmployeesAndDepartments();
        } else {
            // تحديث صامت بالخلفية بدون تعطيل الدخول
            syncEmployeesAndDepartments();
        }

        const params = new URLSearchParams(window.location.search);
        const taskIdParam = params.get('id');
        const batchIdParam = params.get('batch');
        const msgIdParam = params.get('msg');

        // 1. فحص إذا كان المدخل هو رمز الإدارة
        if (code === ADMIN_PIN) {
            loggedInEmployee = null;
            localStorage.setItem('adminLoggedIn', 'true');
            localStorage.removeItem('empId');
            document.getElementById('loginSection').classList.add('hidden');
            document.getElementById('logoutBtn').classList.remove('hidden');

            if (msgIdParam) {
                await openMessageById(msgIdParam);
                return;
            }

            document.getElementById('managerSection').classList.remove('hidden');
            switchManagerTab('Dashboard');

            if (taskIdParam) {
                await loadDashboard();
                openManagerTaskDetails(taskIdParam);
            }
            return;
        }

        // 2. فحص إذا كان المدخل رقم وظيفي لموظف
        const employee = employeesData.find(e => String(e.id).trim() === code);
        if (employee) {
            loggedInEmployee = employee;
            localStorage.setItem('empId', employee.id);
            localStorage.removeItem('adminLoggedIn');
            document.getElementById('loginSection').classList.add('hidden');
            document.getElementById('logoutBtn').classList.remove('hidden');
            document.getElementById('empWelcomeName').innerText = employee.name.split(' ')[0];
            renderEmployeeReceiverDropdown();

            if (batchIdParam) {
                const matchedTaskId = await findEmployeeTaskInBatch(batchIdParam, employee.name);
                if (matchedTaskId) {
                    currentTaskId = matchedTaskId;
                    document.getElementById('employeeSection').classList.remove('hidden');
                    document.getElementById('globalBackBtn').classList.remove('hidden');
                    loadTaskData(matchedTaskId);
                    return;
                } else {
                    showHeritageToast('عذراً، هذا التكليف الجماعي غير موجه لاسمك. تم فتح لوحتك الخاصة.', 'warning');
                    window.history.replaceState({}, document.title, getCleanPlatformPathname());
                }
            }

            if (taskIdParam) {
                currentTaskId = taskIdParam;
                document.getElementById('employeeSection').classList.remove('hidden');
                document.getElementById('globalBackBtn').classList.remove('hidden');
                loadTaskData(taskIdParam);
                return;
            }

            if (msgIdParam) {
                await openMessageById(msgIdParam);
                return;
            }

            document.getElementById('employeeDashboardSection').classList.remove('hidden');
            loadEmployeeDashboardData();
            loadEmployeeMessagesData();
        } else {
            errEl.classList.remove('hidden');
            const cardBox = document.getElementById('loginCardBox');
            if (cardBox) {
                cardBox.classList.remove('login-shake');
                void cardBox.offsetWidth;
                cardBox.classList.add('login-shake');
            }
        }
    } finally {
        if (loginBtn) loginBtn.disabled = false;
    }
}

function logout() {
    localStorage.removeItem('adminLoggedIn');
    localStorage.removeItem('empId');
    localStorage.removeItem('turath_cache_tasks_v1');
    localStorage.removeItem('turath_cache_msgs_v1');

    document.getElementById('managerSection').classList.add('hidden');
    document.getElementById('employeeDashboardSection').classList.add('hidden');
    document.getElementById('employeeSection').classList.add('hidden');
    document.getElementById('messageViewSection').classList.add('hidden');
    document.getElementById('logoutBtn').classList.add('hidden');
    document.getElementById('globalBackBtn').classList.add('hidden');

    if (window.location.search) {
        window.history.replaceState({}, document.title, getCleanPlatformPathname());
    }

    const inputEl = document.getElementById('unifiedLoginInput');
    if (inputEl) inputEl.value = '';
    loggedInEmployee = null;
    currentTaskId = null;
    currentMessageId = null;
    currentLoadedMessageObj = null;
    window.currentLoadedTask = null;
    window.empGlobalTasks = [];
    globalTasks = [];
    globalMessages = [];
    showLoginSection();
}

// ==========================================
// لوحة الموظف: التبديل بين التكاليف والمراسلات
// ==========================================
function switchEmployeeSectionTab(tabName) {
    const tasksBtn = document.getElementById('empTabTasksBtn');
    const msgsBtn = document.getElementById('empTabMessagesBtn');
    const tasksView = document.getElementById('empTasksSubView');
    const msgsView = document.getElementById('empMessagesSubView');

    if (tabName === 'messages') {
        msgsBtn.className = 'flex-1 font-extrabold text-sm py-3 px-4 rounded-xl transition-all duration-300 bg-primary text-white shadow-md flex items-center justify-center gap-2';
        tasksBtn.className = 'flex-1 font-extrabold text-sm py-3 px-4 rounded-xl transition-all duration-300 text-gray-500 hover:text-primary flex items-center justify-center gap-2';
        tasksView.classList.add('hidden');
        msgsView.classList.remove('hidden');
        loadEmployeeMessagesData();
    } else {
        tasksBtn.className = 'flex-1 font-extrabold text-sm py-3 px-4 rounded-xl transition-all duration-300 bg-primary text-white shadow-md flex items-center justify-center gap-2';
        msgsBtn.className = 'flex-1 font-extrabold text-sm py-3 px-4 rounded-xl transition-all duration-300 text-gray-500 hover:text-primary flex items-center justify-center gap-2';
        msgsView.classList.add('hidden');
        tasksView.classList.remove('hidden');
        loadEmployeeDashboardData();
    }
}

// ==========================================
// ترتيب وعرض تكاليف الموظف
// ==========================================
function sortTasksIntelligently(tasks) {
    return tasks.sort((a, b) => {
        const getPriority = (status) => {
            if (status === 'جاهز للمراجعة') return 2;
            if (status === 'مغلق ومُقيم' || status === 'ملغي') return 3;
            return 1;
        };
        const pA = getPriority(a.taskStatus);
        const pB = getPriority(b.taskStatus);

        if (pA !== pB) return pA - pB;

        if (pA === 1) {
            const dateA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
            const dateB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
            if (dateA !== dateB) return dateA - dateB;
        }

        const createA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const createB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return createB - createA;
    });
}

function renderEmployeeDashboardCounters(rawTasksList) {
    if (!loggedInEmployee) return;
    const myTasks = (rawTasksList || []).filter(t => isTaskForEmployee(t, loggedInEmployee));
    window.empGlobalTasks = sortTasksIntelligently(myTasks);

    let total = window.empGlobalTasks.length;
    let completed = 0;
    let pending = 0;
    let cancelledCount = 0;
    let cNew = 0, cWorking = 0, cReady = 0, cArchived = 0, cReturned = 0;

    window.empGlobalTasks.forEach(t => {
        let st = t.taskStatus || 'مرسل';
        if (st === 'مرسل' || st === 'جديد' || st === 'تم الاطلاع') {
            cNew++;
            pending++;
        } else if (st === 'مرتجع للتعديل' || String(st).includes('مرتجع')) {
            cWorking++;
            cReturned++;
            pending++;
        } else if (st === 'جاري العمل' || st === 'متوقف لعائق' || st === 'طلب تمديد موعد') {
            cWorking++;
            pending++;
        } else if (st === 'جاهز للمراجعة') {
            cReady++;
            pending++;
        } else if (st === 'مغلق ومُقيم') {
            cArchived++;
            completed++;
        } else if (st === 'ملغي') {
            cArchived++;
            cancelledCount++;
        } else {
            cWorking++;
            pending++;
        }
    });

    const effectiveTotal = Math.max(0, total - cancelledCount);
    document.getElementById('empStatTotal').innerText = effectiveTotal;
    document.getElementById('empStatCompleted').innerText = completed;
    document.getElementById('empStatPending').innerText = pending;

    const returnedSubBadge = document.getElementById('empStatReturnedSubBadge');
    if (returnedSubBadge) {
        if (cReturned > 0) {
            returnedSubBadge.innerText = `↩️ مرتجع للتعديل: ${cReturned}`;
            returnedSubBadge.classList.remove('hidden');
        } else {
            returnedSubBadge.classList.add('hidden');
        }
    }

    const readySubBadge = document.getElementById('empStatReadySubBadge');
    if (readySubBadge) {
        if (cReady > 0) {
            readySubBadge.innerText = `👁️ بانتظار الاعتماد: ${cReady}`;
            readySubBadge.classList.remove('hidden');
        } else {
            readySubBadge.classList.add('hidden');
        }
    }

    let pct = effectiveTotal > 0 ? Math.round((completed / effectiveTotal) * 100) : 0;
    const progressText = document.getElementById('empStatProgressText');
    const progressBar = document.getElementById('empProgressBar');
    if (progressText) progressText.innerText = pct + '%';
    if (progressBar) progressBar.style.width = pct + '%';

    const fNew = document.getElementById('folderCountNew');
    const fWorking = document.getElementById('folderCountWorking');
    const fReady = document.getElementById('folderCountReady');
    const fArchived = document.getElementById('folderCountArchived');
    if (fNew) fNew.innerText = cNew;
    if (fWorking) fWorking.innerText = cWorking;
    if (fReady) fReady.innerText = cReady;
    if (fArchived) fArchived.innerText = cArchived;

    if (window.currentFolderOpen) openFolder(window.currentFolderOpen);
    else if (document.getElementById('empSearchInput') && document.getElementById('empSearchInput').value.trim() !== '') handleEmployeeSearch();
}

async function loadEmployeeDashboardData() {
    if (!loggedInEmployee) return;

    // عرض فوري من الذاكرة المخبأة إن وجدت لتجنب أي انتظار
    if (Array.isArray(globalTasks) && globalTasks.length > 0) {
        renderEmployeeDashboardCounters(globalTasks);
    }

    // سحب الحقول الأساسية فقط بدون سجل الدردشة الطويل لتسريع التلفون وتقليل استهلاك الإنترنت
    const { data, error } = await supabaseClient
        .from('tasks')
        .select('taskId, createdAt, requesterName, employeeName, employeePhone, taskDetails, dueDate, taskStatus, managerScore, speedScore, submittedAt, batchId');

    if (error) {
        console.error('Error loading employee tasks:', error);
        return;
    }

    if (Array.isArray(data)) {
        // دمج السجل الزمني المخبأ سابقاً حتى لا يُفقد عند الجلب الخفيف
        const historyMap = new Map();
        (globalTasks || []).forEach(oldT => {
            if (oldT && oldT.taskId && Array.isArray(oldT.replyHistory)) {
                historyMap.set(oldT.taskId, oldT.replyHistory);
            }
        });
        globalTasks = data.map(item => ({
            ...item,
            replyHistory: historyMap.get(item.taskId) || undefined
        }));
        saveLocalTasksCache();
        renderEmployeeDashboardCounters(globalTasks);
    }
}

window.currentFolderOpen = null;

function getTasksForFolder(type) {
    if (!window.empGlobalTasks) return [];
    return window.empGlobalTasks.filter(t => {
        let st = t.taskStatus || 'مرسل';
        if (type === 'new') return st === 'مرسل' || st === 'جديد' || st === 'تم الاطلاع';
        if (type === 'working') return st === 'جاري العمل' || st === 'متوقف لعائق' || st === 'طلب تمديد موعد' || (!['مرسل', 'جديد', 'تم الاطلاع', 'جاهز للمراجعة', 'مغلق ومُقيم', 'ملغي'].includes(st));
        if (type === 'ready') return st === 'جاهز للمراجعة';
        if (type === 'archived') return st === 'مغلق ومُقيم' || st === 'ملغي';
        return true;
    });
}

function openFolder(type) {
    window.currentFolderOpen = type;
    document.getElementById('empFoldersGrid').classList.add('hidden');
    document.getElementById('empFolderViewSection').classList.remove('hidden');

    let title = 'مجلد التكاليف';
    if (type === 'new') title = '🆕 التكاليف الجديدة';
    else if (type === 'working') title = '⏳ جاري العمل عليها';
    else if (type === 'ready') title = '👁️ جاهزة للمراجعة';
    else if (type === 'archived') title = '🗄️ الأرشيف والمنجزة';

    document.getElementById('currentFolderTitle').innerText = title;
    renderEmployeeTasksList(getTasksForFolder(type));
}

function closeFolder() {
    window.currentFolderOpen = null;
    document.getElementById('empFolderViewSection').classList.add('hidden');
    document.getElementById('empFoldersGrid').classList.remove('hidden');
    document.getElementById('empSearchInput').value = '';
}

function handleEmployeeSearch() {
    const q = document.getElementById('empSearchInput').value.trim().toLowerCase();
    if (q === '') {
        if (window.currentFolderOpen) openFolder(window.currentFolderOpen);
        else closeFolder();
        return;
    }

    document.getElementById('empFoldersGrid').classList.add('hidden');
    document.getElementById('empFolderViewSection').classList.remove('hidden');
    document.getElementById('currentFolderTitle').innerText = '🔍 نتائج البحث...';

    let baseTasks = window.currentFolderOpen ? getTasksForFolder(window.currentFolderOpen) : (window.empGlobalTasks || []);
    const filtered = baseTasks.filter(t => {
        const idMatch = t.taskId && t.taskId.toLowerCase().includes(q);
        const titleMatch = t.taskDetails && t.taskDetails.toLowerCase().includes(q);
        return idMatch || titleMatch;
    });

    renderEmployeeTasksList(filtered);
}

function renderEmployeeTasksList(tasksList) {
    const tbody = document.getElementById('empDashboardTableBody');
    tbody.innerHTML = '';

    if (tasksList.length === 0) {
        tbody.innerHTML = '<div class="col-span-full p-12 text-center text-gray-500 font-bold bg-white rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center justify-center gap-4"><span class="text-5xl">☕</span><span>لا توجد تكاليف في هذا القسم حالياً.</span></div>';
        return;
    }

    tasksList.forEach(task => {
        let title = String(task.taskDetails || '').split('\n')[0].replace('العنوان: ', '');
        if (!title) title = 'تكليف: ' + task.taskId;

        let statusColor = 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200';
        if (task.taskStatus === 'تم الرد' || task.taskStatus === 'جاهز للمراجعة' || task.taskStatus === 'مغلق ومُقيم') statusColor = 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200';
        else if (String(task.taskStatus).includes('مرتجع')) statusColor = 'bg-rose-100 text-rose-800 ring-2 ring-inset ring-rose-300 animate-pulse';
        else if (String(task.taskStatus).includes('متوقف') || String(task.taskStatus).includes('مرفوض') || String(task.taskStatus).includes('اعتذار')) statusColor = 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-200';

        let dateStr = task.dueDate;
        try { dateStr = getLocalDateString(dateStr); } catch (e) {}

        let indicatorColor = 'bg-gray-300';
        let circleColor = '#e5e7eb';
        let circleTooltip = 'غير محدد';

        if (task.createdAt && task.dueDate && task.taskStatus !== 'مغلق ومُقيم' && task.taskStatus !== 'ملغي' && task.taskStatus !== 'جاهز للمراجعة') {
            const start = new Date(task.createdAt).getTime();
            const due = new Date(task.dueDate);
            due.setHours(23, 59, 59);
            const end = due.getTime();
            const totalDuration = Math.max(1, end - start);
            const now = Date.now();
            const elapsed = now - start;
            let ratio = Math.max(0, Math.min(1, elapsed / totalDuration));

            const diffDays = Math.ceil((due.getTime() - now) / (1000 * 60 * 60 * 24));
            if (diffDays < 0) ratio = 1;

            let hue = Math.floor(120 * (1 - ratio));
            circleColor = `hsl(${hue}, 80%, 45%)`;

            if (diffDays < 0) circleTooltip = `متأخر ${Math.abs(diffDays)} يوم`;
            else if (diffDays === 0) circleTooltip = `ينتهي اليوم!`;
            else circleTooltip = `متبقي ${diffDays} يوم`;

            if (now > end) indicatorColor = 'bg-red-500';
            else if (ratio <= 0.40) indicatorColor = 'bg-green-500';
            else if (ratio <= 0.70) indicatorColor = 'bg-yellow-400';
            else indicatorColor = 'bg-red-500';
        } else if (task.taskStatus === 'مغلق ومُقيم' || task.taskStatus === 'جاهز للمراجعة') {
            circleColor = '#10b981';
            circleTooltip = 'تم الإنجاز';
            indicatorColor = 'bg-green-500';
        }

        let priority = 'عادي';
        let descStr = task.taskDetails || '';
        if (descStr.includes('الأولوية:')) {
            const lines = descStr.split('\n');
            if (lines.length > 1 && lines[1].includes('الأولوية:')) priority = lines[1].replace('الأولوية: ', '');
        }

        let requester = task.requesterName || 'الإدارة';
        const safeTaskIdJs = escapeJsStr(task.taskId);
        const safeTitleHtml = escapeHtml(title);
        const safeReqHtml = escapeHtml(requester);
        const safeStatusHtml = escapeHtml(task.taskStatus || 'مرسل');

        tbody.innerHTML += `
            <div class="bg-white rounded-2xl p-4 md:p-6 border border-gray-200 shadow-sm hover:shadow-md hover:border-primary/30 transition duration-300 relative overflow-hidden group flex flex-col md:flex-row md:items-center gap-4 w-full">
                <div class="absolute top-0 right-0 w-2 h-full ${indicatorColor}"></div>
                
                <div class="flex-1 md:pr-4 md:border-l border-gray-100">
                    <div class="flex items-center gap-3 mb-2">
                        <span class="text-xs font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded">#${escapeHtml(task.taskId)}</span>
                        <span class="${statusColor} text-[11px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap shadow-sm border border-white">${safeStatusHtml}</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <div title="${escapeHtml(circleTooltip)}" class="w-3.5 h-3.5 rounded-full flex-shrink-0 shadow-sm border border-black/10 cursor-help" style="background-color: ${circleColor}"></div>
                        <h3 class="font-extrabold text-lg md:text-xl text-gray-800 leading-tight" title="${safeTitleHtml}">${safeTitleHtml}</h3>
                    </div>
                </div>
                
                <div class="flex flex-wrap md:flex-nowrap items-center gap-4 md:gap-8 text-sm bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <div class="flex flex-col">
                        <span class="text-gray-400 text-[10px] uppercase font-bold mb-0.5">الجهة الطالبة</span>
                        <span class="font-bold text-gray-800 text-xs md:text-sm">${safeReqHtml}</span>
                    </div>
                    <div class="flex flex-col border-r border-gray-200 pr-4 md:pr-8">
                        <span class="text-gray-400 text-[10px] uppercase font-bold mb-0.5">تاريخ التسليم</span>
                        <span class="font-bold text-gray-800 text-xs md:text-sm">${escapeHtml(dateStr)}</span>
                    </div>
                    <div class="flex flex-col border-r border-gray-200 pr-4 md:pr-8">
                        <span class="text-gray-400 text-[10px] uppercase font-bold mb-0.5">الأولوية</span>
                        <span class="font-bold ${priority.includes('عاجل') ? 'text-red-600' : priority.includes('هام') ? 'text-yellow-600' : 'text-primary'} text-xs md:text-sm">${escapeHtml(priority)}</span>
                    </div>
                </div>
                
                <div class="flex items-center gap-4 mt-2 md:mt-0 md:mr-auto w-full md:w-auto">
                    <button onclick="openTaskFromDashboard('${safeTaskIdJs}')" class="bg-primary hover:bg-primary-hover text-white px-6 py-3 rounded-xl text-sm font-extrabold transition shadow-btn hover:shadow-btn-hover flex items-center justify-center gap-2 w-full md:w-auto">
                        <span>التفاصيل والرد</span>
                        <span class="text-lg leading-none">»</span>
                    </button>
                </div>
            </div>
        `;
    });
}

function openTaskFromDashboard(taskId) {
    currentTaskId = taskId;
    document.getElementById('employeeDashboardSection').classList.add('hidden');
    document.getElementById('employeeSection').classList.remove('hidden');
    document.getElementById('globalBackBtn').classList.remove('hidden');

    document.getElementById('empReplyMsg').value = '';
    document.getElementById('empReplyMsg').disabled = false;
    document.getElementById('empReplyMsg').placeholder = 'مثال: جاري إعداد التقرير المطلوب...';
    document.getElementById('empFile').value = '';
    document.getElementById('empFile').disabled = false;
    document.getElementById('replyMsg').className = 'hidden';

    const extDateInput = document.getElementById('empRequestedDueDate');
    const extBox = document.getElementById('empRequestedExtensionBox');
    if (extDateInput) extDateInput.value = '';
    if (extBox) extBox.classList.add('hidden');

    const selectEl = document.getElementById('empStatusSelect');
    const submitBtn = document.getElementById('btnSubmitEmpReply');
    if (selectEl) selectEl.disabled = false;
    if (submitBtn) submitBtn.disabled = false;

    loadTaskData(taskId);
}

function backToEmployeeDashboard() {
    document.getElementById('employeeSection').classList.add('hidden');
    document.getElementById('messageViewSection').classList.add('hidden');
    document.getElementById('globalBackBtn').classList.add('hidden');

    if (window.location.search) {
        window.history.replaceState({}, document.title, getCleanPlatformPathname());
    }

    if (localStorage.getItem('adminLoggedIn') === 'true') {
        document.getElementById('managerSection').classList.remove('hidden');
        document.getElementById('logoutBtn').classList.remove('hidden');
        const foldersHidden = document.getElementById('mgrFoldersGrid')?.classList.contains('hidden');
        const folderViewHidden = document.getElementById('mgrFolderViewSection')?.classList.contains('hidden');
        if (globalTasks.length === 0 || (foldersHidden && folderViewHidden)) {
            switchManagerTab('Dashboard');
        } else {
            refreshManagerTasksSilently();
        }
    } else if (loggedInEmployee) {
        document.getElementById('employeeDashboardSection').classList.remove('hidden');
        document.getElementById('logoutBtn').classList.remove('hidden');
        loadEmployeeDashboardData();
        loadEmployeeMessagesData();
    } else {
        showLoginSection();
    }
}

function globalGoBack() {
    backToEmployeeDashboard();
}

// ==========================================
// نظام المراسلات الداخلية بين الموظفين (اختيار موظف واحد أو عدة موظفين + بحث وكتابة يدوية)
// ==========================================
function openSendMessageModal() {
    renderEmployeeReceiverDropdown();
    selectAllEmpMsgReceivers(false);
    const searchInput = document.getElementById('empMsgSearchInput');
    if (searchInput) searchInput.value = '';
    filterEmpMsgReceiversList('');
    const dd = document.getElementById('empMsgReceiverDropdown');
    if (dd) dd.classList.add('hidden');

    document.getElementById('empMsgTitle').value = '';
    document.getElementById('empMsgContent').value = '';
    document.getElementById('empMsgFile').value = '';
    document.getElementById('empMsgStatusAlert').classList.add('hidden');
    document.getElementById('sendMessageModal').classList.remove('hidden');
}

function closeSendMessageModal() {
    document.getElementById('sendMessageModal').classList.add('hidden');
}

async function submitInternalMessage() {
    if (!loggedInEmployee) {
        showHeritageToast('يرجى تسجيل الدخول برقمك الوظيفي أولاً', 'warning');
        return;
    }

    const title = document.getElementById('empMsgTitle').value.trim();
    const content = document.getElementById('empMsgContent').value.trim();
    const file = document.getElementById('empMsgFile').files[0];
    const alertBox = document.getElementById('empMsgStatusAlert');
    const btn = document.getElementById('btnSendInternalMsg');

    // إذا كتب الموظف اسماً في خانة البحث ولم يضغط Enter بعد، نطابقه أو نضيفه تلقائياً
    const typedSearch = (document.getElementById('empMsgSearchInput')?.value || '').trim();
    let checkedCbs = Array.from(document.querySelectorAll('.emp-msg-checkbox:checked'));
    if (checkedCbs.length === 0 && typedSearch) {
        const matchedEmp = employeesData.find(e => isSameArabicName(e.name, typedSearch) || String(e.id) === typedSearch);
        if (matchedEmp) {
            const targetCb = Array.from(document.querySelectorAll('.emp-msg-checkbox')).find(
                cb => String(cb.value).startsWith(matchedEmp.id + '|')
            );
            if (targetCb) targetCb.checked = true;
        } else {
            appendCustomEmpMsgReceiverRow(typedSearch, true);
        }
        updateEmpMsgReceiverSelectionUI();
        checkedCbs = Array.from(document.querySelectorAll('.emp-msg-checkbox:checked'));
    }

    const selectedReceivers = checkedCbs.map(cb => {
        const parts = cb.value.split('|');
        return {
            id: parts[0] || '',
            phone: parts[1] || '',
            name: parts.slice(2).join('|') || 'موظف'
        };
    });

    if (!title || selectedReceivers.length === 0 || !content) {
        alertBox.innerText = 'يرجى تعبئة عنوان الرسالة واختيار موظف واحد على الأقل (أو كتابة اسمه) وكتابة محتوى الرسالة!';
        alertBox.className = 'p-3 rounded-xl text-xs font-bold text-center bg-red-50 text-red-700 block';
        return;
    }

    if (file && file.size > 25 * 1024 * 1024) {
        alertBox.innerText = 'حجم المرفق يتجاوز الحد المسموح (25 ميجا)!';
        alertBox.className = 'p-3 rounded-xl text-xs font-bold text-center bg-red-50 text-red-700 block';
        return;
    }

    btn.disabled = true;
    alertBox.innerText = '⏳ جاري العمل، اشغل انتظارك بإستغفارك...';
    alertBox.className = 'p-3 rounded-xl text-xs font-bold text-center bg-blue-50 text-blue-700 block';

    try {
        let attachmentUrl = '';
        if (file) {
            attachmentUrl = await uploadFileToSupabase(file);
        }

        const isMultiple = selectedReceivers.length > 1;
        const batchPrefix = isMultiple
            ? ('MGRP-' + Math.random().toString(36).substr(2, 5).toUpperCase())
            : '';
        const nowIso = new Date().toISOString();
        const rowsToInsert = [];

        selectedReceivers.forEach((rec, idx) => {
            const rowMsgId = isMultiple
                ? `${batchPrefix}-${idx + 1}`
                : ('MSG-' + Math.random().toString(36).substr(2, 6).toUpperCase());

            rowsToInsert.push({
                msgId: rowMsgId,
                createdAt: nowIso,
                senderId: loggedInEmployee.id,
                senderName: loggedInEmployee.name,
                receiverId: rec.id,
                receiverName: rec.name,
                receiverPhone: rec.phone,
                title: title,
                content: content,
                attachmentUrl: attachmentUrl,
                isRead: false,
                replyHistory: []
            });
        });

        const { error } = await supabaseClient.from('messages').insert(rowsToInsert);
        if (error) throw new Error(error.message);

        // تحديد الرابط ورقم التوجيه حسب عدد الموظفين المختارين:
        // - موظف واحد: يفتح الواتساب على رقمه مباشرة
        // - أكثر من موظف: يفتح القائمة العامة في الواتساب ليختار الموظفين الذين يريدهم مع رابط ذكي موحد
        const targetLinkId = isMultiple ? batchPrefix : rowsToInsert[0].msgId;
        const msgLink = `${getCleanPlatformBaseUrl()}?msg=${targetLinkId}`;

        const waMessage = [
            `السلام عليكم ورحمة الله وبركاته`,
            `رساله من / ${loggedInEmployee.name}`,
            `اضغط على الرابط للتفاصيل`,
            `${msgLink}`
        ].join('\n');

        if (!isMultiple) {
            alertBox.innerText = '✅ تم إرسال الرسالة بنجاح! جاري تحويلك لواتساب الموظف...';
            alertBox.className = 'p-3 rounded-xl text-xs font-bold text-center bg-green-50 text-green-700 block';
            openWhatsApp(selectedReceivers[0].phone, waMessage);
        } else {
            alertBox.innerText = `✅ تم حفظ الرسالة لعدد (${selectedReceivers.length}) موظفين! جاري فتح قائمة الواتساب العامة للاختيار...`;
            alertBox.className = 'p-3 rounded-xl text-xs font-bold text-center bg-green-50 text-green-700 block';
            openWhatsApp('', waMessage);
        }

        setTimeout(() => {
            closeSendMessageModal();
            loadEmployeeMessagesData();
        }, 1200);
    } catch (err) {
        alertBox.innerText = 'حدث خطأ: ' + err.message;
        alertBox.className = 'p-3 rounded-xl text-xs font-bold text-center bg-red-50 text-red-700 block';
    }
    btn.disabled = false;
}

function hasUnreadReplyForEmployee(msg, emp) {
    if (!msg || !emp) return false;
    const replies = Array.isArray(msg.replyHistory) ? msg.replyHistory : [];
    if (replies.length === 0) return false;
    const empIdStr = String(emp.id);
    return replies.some(r => {
        if (!r || r.senderName === emp.name) return false;
        const readList = Array.isArray(r.readBy) ? r.readBy.map(String) : [];
        return !readList.includes(empIdStr);
    });
}

async function loadEmployeeMessagesData() {
    if (!loggedInEmployee) return;

    const { data, error } = await supabaseClient
        .from('messages')
        .select('*')
        .or(`senderId.eq.${loggedInEmployee.id},receiverId.eq.${loggedInEmployee.id}`)
        .order('createdAt', { ascending: false });

    if (error) {
        console.error('Error loading messages:', error);
        return;
    }

    globalMessages = data || [];
    const inbox = globalMessages.filter(m => String(m.receiverId) === String(loggedInEmployee.id));
    const sent = globalMessages.filter(m => String(m.senderId) === String(loggedInEmployee.id));

    const unreadCount = globalMessages.filter(m => {
        const isUnreadInitial = String(m.receiverId) === String(loggedInEmployee.id) && !m.isRead;
        const hasNewReply = hasUnreadReplyForEmployee(m, loggedInEmployee);
        return isUnreadInitial || hasNewReply;
    }).length;

    const badge = document.getElementById('empUnreadMsgBadge');
    if (badge) {
        if (unreadCount > 0) {
            badge.innerText = unreadCount;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }

    document.getElementById('empInboxCount').innerText = inbox.length;
    document.getElementById('empSentCount').innerText = sent.length;

    const inboxContainer = document.getElementById('empInboxList');
    const sentContainer = document.getElementById('empSentList');

    if (inbox.length === 0) {
        inboxContainer.innerHTML = '<div class="text-center text-gray-400 font-bold py-8 text-sm">لا توجد رسائل واردة حتى الآن.</div>';
    } else {
        inboxContainer.innerHTML = inbox.map(m => {
            let dStr = '';
            try { dStr = new Date(m.createdAt).toLocaleDateString('ar-SA'); } catch (e) {}
            const safeMsgId = escapeJsStr(m.msgId);
            const hasNewReply = hasUnreadReplyForEmployee(m, loggedInEmployee);
            const isHighlighted = !m.isRead || hasNewReply;
            const repliesLen = Array.isArray(m.replyHistory) ? m.replyHistory.length : 0;
            return `
                <div onclick="openMessageById('${safeMsgId}')" class="p-4 rounded-2xl border ${isHighlighted ? 'bg-amber-50/70 border-amber-300 shadow-sm' : 'bg-surface/60 border-gray-100'} hover:border-primary cursor-pointer transition flex items-center justify-between gap-3">
                    <div>
                        <div class="flex flex-wrap items-center gap-2 mb-1">
                            ${!m.isRead ? '<span class="bg-red-500 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full">جديدة</span>' : ''}
                            ${hasNewReply ? '<span class="bg-red-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full animate-pulse">🔴 رد جديد</span>' : ''}
                            <h5 class="font-extrabold text-gray-800 text-sm">${escapeHtml(m.title)}</h5>
                        </div>
                        <p class="text-xs text-gray-500 font-bold">من: <span class="text-primary">${escapeHtml(m.senderName)}</span> • ${dStr} ${repliesLen > 0 ? `• 💬 (${repliesLen})` : ''}</p>
                    </div>
                    <span class="text-primary font-extrabold text-xs bg-white px-3 py-1.5 rounded-xl border border-gray-200 shadow-sm">عرض »</span>
                </div>
            `;
        }).join('');
    }

    if (sent.length === 0) {
        sentContainer.innerHTML = '<div class="text-center text-gray-400 font-bold py-8 text-sm">لم تقم بإرسال أي رسائل داخلية بعد.</div>';
    } else {
        sentContainer.innerHTML = sent.map(m => {
            let dStr = '';
            try { dStr = new Date(m.createdAt).toLocaleDateString('ar-SA'); } catch (e) {}
            const safeMsgId = escapeJsStr(m.msgId);
            const hasNewReply = hasUnreadReplyForEmployee(m, loggedInEmployee);
            const repliesLen = Array.isArray(m.replyHistory) ? m.replyHistory.length : 0;
            return `
                <div onclick="openMessageById('${safeMsgId}')" class="p-4 rounded-2xl border ${hasNewReply ? 'bg-amber-50/70 border-amber-300 shadow-sm' : 'bg-gray-50/70 border-gray-100'} hover:border-primary cursor-pointer transition flex items-center justify-between gap-3">
                    <div>
                        <div class="flex flex-wrap items-center gap-2 mb-1">
                            ${hasNewReply ? '<span class="bg-red-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full animate-pulse">🔴 رد جديد</span>' : ''}
                            <h5 class="font-extrabold text-gray-800 text-sm">${escapeHtml(m.title)}</h5>
                        </div>
                        <p class="text-xs text-gray-500 font-bold">إلى: <span class="text-gray-700">${escapeHtml(m.receiverName)}</span> • ${dStr} ${repliesLen > 0 ? `• 💬 (${repliesLen})` : ''}</p>
                    </div>
                    <span class="text-gray-600 font-extrabold text-xs bg-white px-3 py-1.5 rounded-xl border border-gray-200">عرض »</span>
                </div>
            `;
        }).join('');
    }
}

async function openMessageById(msgId) {
    document.getElementById('loginSection').classList.add('hidden');
    document.getElementById('employeeDashboardSection').classList.add('hidden');
    document.getElementById('employeeSection').classList.add('hidden');
    document.getElementById('managerSection').classList.add('hidden');
    document.getElementById('messageViewSection').classList.remove('hidden');
    document.getElementById('globalBackBtn').classList.remove('hidden');

    const isAdminSession = localStorage.getItem('adminLoggedIn') === 'true' && !loggedInEmployee;
    let resolvedMsgId = msgId;
    let data = null;
    let error = null;

    // دعم فتح الرابط الجماعي الذكي للرسائل (?msg=MGRP-XXXXX) وتوجيه كل موظف لنسخته الخاصة
    if (String(msgId).startsWith('MGRP-') && String(msgId).split('-').length === 2) {
        const batchRes = await supabaseClient
            .from('messages')
            .select('*')
            .ilike('msgId', `${msgId}-%`);

        if (!batchRes.error && Array.isArray(batchRes.data) && batchRes.data.length > 0) {
            if (loggedInEmployee) {
                const match = batchRes.data.find(m =>
                    String(m.receiverId) === String(loggedInEmployee.id) ||
                    isSameArabicName(m.receiverName, loggedInEmployee.name) ||
                    String(m.senderId) === String(loggedInEmployee.id)
                );
                if (match) {
                    data = match;
                    resolvedMsgId = match.msgId;
                } else if (!isAdminSession) {
                    showHeritageToast('عذراً، هذه الرسالة الجماعية غير موجهة لاسمك. تم فتح لوحتك الخاصة.', 'warning');
                    backToEmployeeDashboard();
                    return;
                }
            }
            if (!data && isAdminSession) {
                data = batchRes.data[0];
                resolvedMsgId = data.msgId;
            }
        }
    } else {
        const singleRes = await supabaseClient
            .from('messages')
            .select('*')
            .eq('msgId', resolvedMsgId)
            .single();
        data = singleRes.data;
        error = singleRes.error;
    }

    currentMessageId = resolvedMsgId;

    if (error || !data) {
        document.getElementById('viewMsgTitle').innerText = 'لم يتم العثور على الرسالة';
        document.getElementById('viewMsgContent').innerText = 'الرابط غير صحيح أو تم حذف الرسالة.';
        return;
    }

    currentLoadedMessageObj = data;

    const convertBtn = document.getElementById('btnConvertMsgToTask');
    if (convertBtn) {
        if (isAdminSession) convertBtn.classList.remove('hidden');
        else convertBtn.classList.add('hidden');
    }

    // حماية خصوصية المراسلات: منع الموظف من فتح رسالة لا تخصه
    if (!isAdminSession && loggedInEmployee) {
        const isParticipant =
            String(data.senderId) === String(loggedInEmployee.id) ||
            String(data.receiverId) === String(loggedInEmployee.id) ||
            isSameArabicName(data.receiverName, loggedInEmployee.name) ||
            isSameArabicName(data.senderName, loggedInEmployee.name);
        if (!isParticipant) {
            showHeritageToast('عذراً، هذه الرسالة الداخلية خاصة بزملاء آخرين ولا يمكنك الاطلاع عليها.', 'warning');
            backToEmployeeDashboard();
            return;
        }
    }

    // تعليم الرسالة والردود الجديدة كمقروءة للمستخدم الحالي
    if (loggedInEmployee) {
        const empIdStr = String(loggedInEmployee.id);
        let needsUpdate = false;
        const updatePayload = {};

        if ((String(data.receiverId) === empIdStr || isSameArabicName(data.receiverName, loggedInEmployee.name)) && !data.isRead) {
            updatePayload.isRead = true;
            needsUpdate = true;
        }

        if (Array.isArray(data.replyHistory) && data.replyHistory.length > 0) {
            let replyMarked = false;
            const updatedReplies = data.replyHistory.map(r => {
                if (!r || r.senderName === loggedInEmployee.name) return r;
                const readList = Array.isArray(r.readBy) ? r.readBy.map(String) : [];
                if (!readList.includes(empIdStr)) {
                    replyMarked = true;
                    return { ...r, readBy: [...readList, empIdStr] };
                }
                return r;
            });
            if (replyMarked) {
                updatePayload.replyHistory = updatedReplies;
                data.replyHistory = updatedReplies;
                needsUpdate = true;
            }
        }

        if (needsUpdate) {
            window.__ignoreRealtimeMsgUntil = Date.now() + 2000;
            await supabaseClient.from('messages').update(updatePayload).eq('msgId', resolvedMsgId);
        }
    }

    document.getElementById('viewMsgTitle').innerText = data.title || 'رسالة داخلية';
    document.getElementById('viewMsgId').innerText = '#' + data.msgId;
    document.getElementById('viewMsgSender').innerText = data.senderName || '';
    document.getElementById('viewMsgReceiver').innerText = data.receiverName || '';
    try {
        const cd = new Date(data.createdAt);
        document.getElementById('viewMsgDate').innerText = cd.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) + ' - ' + cd.toLocaleDateString('ar-SA');
    } catch (e) {
        document.getElementById('viewMsgDate').innerText = data.createdAt || '';
    }
    document.getElementById('viewMsgContent').innerText = data.content || '';

    const attBox = document.getElementById('viewMsgAttachmentBox');
    const attLink = document.getElementById('viewMsgAttachmentLink');
    if (data.attachmentUrl) {
        attBox.classList.remove('hidden');
        attLink.href = data.attachmentUrl;
    } else {
        attBox.classList.add('hidden');
    }

    const timeline = document.getElementById('msgChatTimeline');
    timeline.innerHTML = '';

    // الرسالة الأساسية كأول فقاعة
    timeline.innerHTML += `
        <div class="max-w-[85%] mr-auto bg-white p-3.5 rounded-2xl shadow-sm border border-black/5">
            <div class="text-[11px] font-extrabold text-primary mb-1">~ ${escapeHtml(data.senderName)} (المرسل)</div>
            <div class="whitespace-pre-wrap text-sm text-gray-800 font-medium">${escapeHtml(data.content)}</div>
            ${data.attachmentUrl ? `<a href="${escapeHtml(data.attachmentUrl)}" target="_blank" class="mt-2 inline-flex items-center gap-1 bg-primary/10 text-primary px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-primary hover:text-white transition">📎 عرض المرفق</a>` : ''}
        </div>
    `;

    const replies = Array.isArray(data.replyHistory) ? data.replyHistory : [];
    replies.forEach(r => {
        let dStr = '';
        try {
            const d = new Date(r.date);
            dStr = d.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) + ' - ' + d.toLocaleDateString('ar-SA');
        } catch (e) {}
        const isManagerReply = r.senderRole === 'manager' || r.senderName === 'الإدارة';
        const isMe = (loggedInEmployee && r.senderName === loggedInEmployee.name) || (isAdminSession && isManagerReply);
        const align = isMe ? 'ml-auto bg-[#dcf8c6]' : (isManagerReply ? 'mr-auto bg-amber-50 border-amber-300' : 'mr-auto bg-white');
        const senderLabel = isManagerReply ? '👑 الإدارة' : `~ ${escapeHtml(r.senderName || 'موظف')}`;
        const labelColor = isManagerReply ? 'text-amber-800' : 'text-primary';

        timeline.innerHTML += `
            <div class="max-w-[85%] ${align} p-3.5 rounded-2xl shadow-sm border border-black/5">
                <div class="text-[11px] font-extrabold ${labelColor} mb-1">${senderLabel}</div>
                <div class="whitespace-pre-wrap text-sm text-gray-800 font-medium">${escapeHtml(r.reply || '')}</div>
                ${r.attachmentUrl ? `<a href="${escapeHtml(r.attachmentUrl)}" target="_blank" class="mt-2 inline-flex items-center gap-1 bg-black/5 text-gray-800 px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-black/10 transition">📎 عرض المرفق</a>` : ''}
                <div class="text-[10px] text-gray-500 mt-1 text-left" dir="ltr">${dStr}</div>
            </div>
        `;
    });

    setTimeout(() => { timeline.scrollTop = timeline.scrollHeight; }, 100);
}

// تحويل الرسالة الداخلية إلى تكليف رسمي بضغطة زر لدى الإدارة
function convertCurrentMessageToTask() {
    if (!currentLoadedMessageObj) return;
    const msg = currentLoadedMessageObj;

    document.getElementById('messageViewSection').classList.add('hidden');
    document.getElementById('globalBackBtn').classList.add('hidden');
    document.getElementById('managerSection').classList.remove('hidden');
    switchManagerTab('Create');

    const titleEl = document.getElementById('taskTitle');
    const descEl = document.getElementById('taskDesc');
    if (titleEl) titleEl.value = msg.title || '';
    if (descEl) {
        descEl.value = `${msg.content || ''}\n\n(محول من رسالة داخلية رقم #${msg.msgId} مرسلة من: ${msg.senderName} إلى: ${msg.receiverName})`;
    }

    // تحديد الموظف المستقبل (أو المرسل) تلقائياً في قائمة المكلفين
    selectAllCheckboxes(false);
    document.querySelectorAll('.emp-checkbox').forEach(cb => {
        const [, empName] = cb.value.split('|');
        if (normalizeArabicText(empName) === normalizeArabicText(msg.receiverName)) {
            cb.checked = true;
        }
    });
    updateMultiSelectLabel();

    // ربط مرفق الرسالة إن وجد
    const banner = document.getElementById('convertedMsgAttachmentBanner');
    if (msg.attachmentUrl) {
        convertedMessageAttachmentUrl = msg.attachmentUrl;
        if (banner) banner.classList.remove('hidden');
    } else {
        convertedMessageAttachmentUrl = '';
        if (banner) banner.classList.add('hidden');
    }

    showHeritageToast('تم نسخ بيانات الرسالة إلى نموذج إصدار تكليف رسمي بنجاح! حدد موعد التسليم واعتمد التكليف.');
}

function clearConvertedMsgAttachment() {
    convertedMessageAttachmentUrl = '';
    const banner = document.getElementById('convertedMsgAttachmentBanner');
    if (banner) banner.classList.add('hidden');
}

function closeMessageDetailsView() {
    backToEmployeeDashboard();
}

async function submitMessageReply() {
    if (!currentMessageId) return;
    const replyText = document.getElementById('msgReplyInput').value.trim();
    const file = document.getElementById('msgReplyFile').files[0];
    const alertEl = document.getElementById('msgReplyAlert');
    const btn = document.getElementById('btnSubmitMsgReply');

    if (!replyText && !file) {
        alertEl.innerText = 'يرجى كتابة الرد أو إرفاق ملف!';
        alertEl.className = 'p-3 rounded-xl text-xs font-bold text-center bg-red-50 text-red-700 block';
        return;
    }

    btn.disabled = true;
    alertEl.innerText = '⏳ جاري العمل، اشغل انتظارك بإستغفارك...';
    alertEl.className = 'p-3 rounded-xl text-xs font-bold text-center bg-blue-50 text-blue-700 block';

    try {
        const { data: msgDoc, error: fetchErr } = await supabaseClient
            .from('messages')
            .select('*')
            .eq('msgId', currentMessageId)
            .single();

        if (fetchErr || !msgDoc) throw new Error('لم يتم العثور على الرسالة');

        let fileUrl = '';
        if (file) {
            fileUrl = await uploadFileToSupabase(file);
        }

        const isAdminSession = localStorage.getItem('adminLoggedIn') === 'true' && !loggedInEmployee;
        const replierName = isAdminSession ? 'الإدارة' : (loggedInEmployee ? loggedInEmployee.name : msgDoc.receiverName);
        const senderRole = isAdminSession ? 'manager' : 'employee';
        const replierReadId = isAdminSession ? 'admin' : (loggedInEmployee ? String(loggedInEmployee.id) : '');

        const replyObj = {
            senderName: replierName,
            senderRole: senderRole,
            date: new Date().toISOString(),
            reply: replyText,
            attachmentUrl: fileUrl,
            readBy: replierReadId ? [replierReadId] : []
        };

        const updatedHistory = Array.isArray(msgDoc.replyHistory) ? [...msgDoc.replyHistory, replyObj] : [replyObj];
        const { error: updErr } = await supabaseClient
            .from('messages')
            .update({ replyHistory: updatedHistory })
            .eq('msgId', currentMessageId);

        if (updErr) throw new Error(updErr.message);

        document.getElementById('msgReplyInput').value = '';
        document.getElementById('msgReplyFile').value = '';
        alertEl.innerText = '✅ تم إرسال الرد بنجاح!';
        alertEl.className = 'p-3 rounded-xl text-xs font-bold text-center bg-green-50 text-green-700 block';

        // تحديد الطرف الآخر لإشعاره عبر واتساب
        let targetPhone = '';
        if (isAdminSession) {
            targetPhone = msgDoc.receiverPhone;
            if (!targetPhone) {
                const senderEmp = employeesData.find(e => String(e.id) === String(msgDoc.senderId));
                if (senderEmp) targetPhone = senderEmp.phone;
            }
        } else if (loggedInEmployee && String(loggedInEmployee.id) === String(msgDoc.senderId)) {
            targetPhone = msgDoc.receiverPhone;
        } else {
            const senderEmp = employeesData.find(e => String(e.id) === String(msgDoc.senderId));
            if (senderEmp) targetPhone = senderEmp.phone;
        }

        const msgLink = `${getCleanPlatformBaseUrl()}?msg=${currentMessageId}`;
        const waReplyText = [
            `السلام عليكم ورحمة الله وبركاته`,
            `رساله من / ${replierName}`,
            `اضغط على الرابط للتفاصيل`,
            `${msgLink}`
        ].join('\n');

        if (targetPhone) {
            openWhatsApp(targetPhone, waReplyText);
        }

        await openMessageById(currentMessageId);
        setTimeout(() => alertEl.classList.add('hidden'), 2500);
    } catch (err) {
        alertEl.innerText = 'خطأ: ' + err.message;
        alertEl.className = 'p-3 rounded-xl text-xs font-bold text-center bg-red-50 text-red-700 block';
    }
    btn.disabled = false;
}

// ==========================================
// إدارة الموظفين والجهات (لوحة التحكم - التبويب الرابع)
// ==========================================
function switchControlPanelSubTab(subTab) {
    const empSec = document.getElementById('cpEmployeesSection');
    const deptSec = document.getElementById('cpDepartmentsSection');
    const btnEmp = document.getElementById('cpTabEmployeesBtn');
    const btnDept = document.getElementById('cpTabDepartmentsBtn');
    const btnBoth = document.getElementById('cpTabBothBtn');

    const activeBtnClass = 'flex-1 md:flex-none bg-white text-primary font-extrabold text-xs md:text-sm px-4 py-2.5 rounded-xl shadow-sm transition flex items-center justify-center gap-2';
    const inactiveBtnClass = 'flex-1 md:flex-none text-white hover:bg-white/10 font-extrabold text-xs md:text-sm px-4 py-2.5 rounded-xl transition flex items-center justify-center gap-2';

    if (subTab === 'departments') {
        empSec.classList.add('hidden');
        deptSec.classList.remove('hidden');
        if (btnEmp) btnEmp.className = inactiveBtnClass;
        if (btnDept) btnDept.className = activeBtnClass;
        if (btnBoth) btnBoth.className = inactiveBtnClass;
    } else if (subTab === 'both') {
        empSec.classList.remove('hidden');
        deptSec.classList.remove('hidden');
        if (btnEmp) btnEmp.className = inactiveBtnClass;
        if (btnDept) btnDept.className = inactiveBtnClass;
        if (btnBoth) btnBoth.className = activeBtnClass;
    } else {
        empSec.classList.remove('hidden');
        deptSec.classList.add('hidden');
        if (btnEmp) btnEmp.className = activeBtnClass;
        if (btnDept) btnDept.className = inactiveBtnClass;
        if (btnBoth) btnBoth.className = inactiveBtnClass;
    }
}

function renderSettingsLists() {
    const empBadge = document.getElementById('cpEmpCountBadge');
    const deptBadge = document.getElementById('cpDeptCountBadge');
    if (empBadge) empBadge.innerText = employeesData.length;
    if (deptBadge) deptBadge.innerText = departmentsData.length;

    const searchQuery = (document.getElementById('cpEmpSearchInput')?.value || '').trim().toLowerCase();
    const filteredEmps = employeesData.filter(emp => {
        if (!searchQuery) return true;
        return String(emp.name || '').toLowerCase().includes(searchQuery) ||
               String(emp.id || '').toLowerCase().includes(searchQuery) ||
               String(emp.phone || '').toLowerCase().includes(searchQuery);
    });

    const empList = document.getElementById('settingsEmployeesList');
    if (empList) {
        if (filteredEmps.length === 0) {
            empList.innerHTML = '<div class="col-span-full text-center text-gray-400 py-10 font-bold text-sm bg-surface/50 rounded-2xl border border-dashed border-gray-200">لا يوجد موظفين مطابقين للبحث.</div>';
        } else {
            empList.innerHTML = filteredEmps.map(emp => {
                const initial = escapeHtml(String(emp.name || 'م').trim().charAt(0));
                const safeId = escapeJsStr(emp.id);
                const safeNameHtml = escapeHtml(emp.name);
                const safeIdHtml = escapeHtml(emp.id);
                const safePhoneHtml = escapeHtml(emp.phone);
                return `
                <div class="flex items-center justify-between gap-3 p-4 bg-white hover:bg-surface/80 rounded-2xl border-2 border-gray-100 hover:border-primary/30 shadow-sm transition group">
                    <div class="flex items-center gap-3.5 min-w-0">
                        <div class="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary to-primary-dark text-white font-black text-lg flex items-center justify-center flex-shrink-0 shadow-sm border border-secondary/40">
                            ${initial}
                        </div>
                        <div class="min-w-0">
                            <div class="font-extrabold text-gray-800 text-sm md:text-base truncate group-hover:text-primary transition" title="${safeNameHtml}">${safeNameHtml}</div>
                            <div class="flex flex-wrap items-center gap-2 mt-1.5">
                                <span class="inline-flex items-center gap-1 bg-primary/10 text-primary px-2.5 py-0.5 rounded-lg text-xs font-extrabold font-mono">
                                    🆔 ${safeIdHtml}
                                </span>
                                <span class="inline-flex items-center gap-1 bg-gray-100 text-gray-600 px-2.5 py-0.5 rounded-lg text-xs font-bold font-mono" dir="ltr">
                                    📱 ${safePhoneHtml}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div class="flex items-center gap-1.5 flex-shrink-0">
                        <button onclick="editEmployeeInSettings('${safeId}')"
                            class="bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white font-extrabold px-3 py-2 rounded-xl text-xs transition shadow-sm" title="تعديل بيانات الموظف">
                            ✏️ تعديل
                        </button>
                        <button onclick="deleteEmployeeFromSettings('${safeId}')"
                            class="bg-red-50 hover:bg-red-600 text-red-600 hover:text-white font-extrabold px-3 py-2 rounded-xl text-xs transition shadow-sm" title="حذف الموظف">
                            🗑️
                        </button>
                    </div>
                </div>
            `}).join('');
        }
    }

    const deptList = document.getElementById('settingsDepartmentsList');
    if (deptList) {
        if (departmentsData.length === 0) {
            deptList.innerHTML = '<div class="col-span-full text-center text-gray-400 py-10 font-bold text-sm">لا توجد أقسام مسجلة.</div>';
        } else {
            deptList.innerHTML = departmentsData.map(d => {
                const safeName = escapeJsStr(d.name || '');
                const safeNameHtml = escapeHtml(d.name || '');
                const safeDeptId = Number(d.id) || 0;
                return `
                <div class="flex items-center justify-between gap-2 p-4 bg-white hover:bg-surface/80 rounded-2xl border-2 border-gray-100 hover:border-primary/30 shadow-sm transition group">
                    <div class="flex items-center gap-3 min-w-0">
                        <span class="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-lg flex-shrink-0">🏛️</span>
                        <span class="font-extrabold text-gray-800 text-sm truncate group-hover:text-primary transition" title="${safeNameHtml}">${safeNameHtml}</span>
                    </div>
                    <div class="flex items-center gap-1.5 flex-shrink-0">
                        <button onclick="editDepartmentInSettings(${safeDeptId}, '${safeName}')"
                            class="bg-amber-50 hover:bg-amber-500 text-amber-800 hover:text-white font-bold px-2.5 py-1.5 rounded-xl text-xs transition" title="تعديل اسم القسم">
                            ✏️ تعديل
                        </button>
                        <button onclick="deleteDepartmentFromSettings(${safeDeptId}, '${safeName}')"
                            class="bg-red-50 hover:bg-red-600 text-red-600 hover:text-white font-bold px-2.5 py-1.5 rounded-xl text-xs transition" title="حذف القسم">
                            🗑️
                        </button>
                    </div>
                </div>
            `}).join('');
        }
    }
}

function editDepartmentInSettings(deptId, deptName) {
    document.getElementById('editDeptOriginalId').value = deptId || '';
    document.getElementById('editDeptOriginalName').value = deptName || '';
    document.getElementById('settingDeptName').value = deptName || '';
    document.getElementById('btnAddDept').innerHTML = '<span>💾 حفظ وتحديث اسم القسم</span>';
    document.getElementById('btnCancelEditDept').classList.remove('hidden');

    const modeTitle = document.getElementById('deptFormModeTitle');
    if (modeTitle) modeTitle.innerHTML = `<span>✏️</span> <span class="text-amber-700">تعديل اسم القسم: (${escapeHtml(deptName)})</span>`;

    const formCard = document.getElementById('deptFormCard');
    if (formCard) {
        formCard.classList.add('ring-4', 'ring-secondary/30');
        formCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    document.getElementById('settingDeptName').focus();
}

function resetDepartmentForm() {
    document.getElementById('editDeptOriginalId').value = '';
    document.getElementById('editDeptOriginalName').value = '';
    document.getElementById('settingDeptName').value = '';
    document.getElementById('btnAddDept').innerHTML = '<span>➕ إضافة القسم للقائمة</span>';
    document.getElementById('btnCancelEditDept').classList.add('hidden');

    const modeTitle = document.getElementById('deptFormModeTitle');
    if (modeTitle) modeTitle.innerHTML = '<span>➕</span> <span>إضافة قسم أو جهة جديدة <span class="text-red-500">*</span></span>';

    const formCard = document.getElementById('deptFormCard');
    if (formCard) formCard.classList.remove('ring-4', 'ring-secondary/30');
}

function editEmployeeInSettings(empId) {
    const emp = employeesData.find(e => String(e.id) === String(empId));
    if (!emp) return;
    document.getElementById('editEmpOriginalId').value = emp.id;
    document.getElementById('settingEmpName').value = emp.name;
    document.getElementById('settingEmpId').value = emp.id;
    document.getElementById('settingEmpPhone').value = emp.phone;
    document.getElementById('btnSaveEmployee').innerHTML = '<span>💾 حفظ وتحديث بيانات الموظف</span>';
    document.getElementById('btnCancelEditEmp').classList.remove('hidden');

    const modeTitle = document.getElementById('empFormModeTitle');
    if (modeTitle) modeTitle.innerHTML = `<span>✏️</span> <span class="text-amber-700">تعديل بيانات الموظف: (${escapeHtml(emp.name)})</span>`;

    const formCard = document.getElementById('empFormCard');
    if (formCard) {
        formCard.classList.add('ring-4', 'ring-secondary/30');
        formCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

function resetEmployeeForm() {
    document.getElementById('editEmpOriginalId').value = '';
    document.getElementById('settingEmpName').value = '';
    document.getElementById('settingEmpId').value = '';
    document.getElementById('settingEmpPhone').value = '';
    document.getElementById('btnSaveEmployee').innerHTML = '<span>➕ حفظ واعتماد بيانات الموظف</span>';
    document.getElementById('btnCancelEditEmp').classList.add('hidden');

    const modeTitle = document.getElementById('empFormModeTitle');
    if (modeTitle) modeTitle.innerHTML = '<span>➕</span> <span>إضافة موظف جديد للنظام</span>';

    const formCard = document.getElementById('empFormCard');
    if (formCard) formCard.classList.remove('ring-4', 'ring-secondary/30');
}

async function saveEmployeeFromSettings() {
    const origId = document.getElementById('editEmpOriginalId').value.trim();
    const name = document.getElementById('settingEmpName').value.trim();
    const id = document.getElementById('settingEmpId').value.trim();
    const rawPhone = document.getElementById('settingEmpPhone').value.trim();
    const msgBox = document.getElementById('settingEmpMsg');
    const btn = document.getElementById('btnSaveEmployee');

    if (!name || !id || !rawPhone) {
        msgBox.innerText = 'يرجى إدخال اسم الموظف والرقم الوظيفي ورقم التلفون!';
        msgBox.className = 'p-3 rounded-xl text-xs font-bold text-center bg-red-50 text-red-700 block';
        return;
    }

    const phone = normalizePhone(rawPhone);
    btn.disabled = true;

    try {
        const oldEmp = origId ? employeesData.find(e => String(e.id) === String(origId)) : null;

        if (origId && origId !== id) {
            await supabaseClient.from('employees').delete().eq('id', origId);
        }

        const { error } = await supabaseClient
            .from('employees')
            .upsert([{ id, name, phone, createdAt: new Date().toISOString() }], { onConflict: 'id' });

        if (error) throw new Error(error.message);

        // إذا تم تعديل اسم موظف سابق، نحدث اسمه تلقائياً في تكاليفه السابقة حتى لا تضيع منه
        if (oldEmp && oldEmp.name && oldEmp.name !== name) {
            await supabaseClient
                .from('tasks')
                .update({ employeeName: name, employeePhone: phone })
                .eq('employeeName', oldEmp.name);
        }

        msgBox.innerText = `✅ تم حفظ الموظف (${name}) بنجاح! يمكنه الآن تسجيل الدخول بالرقم الوظيفي (${id}).`;
        msgBox.className = 'p-3 rounded-xl text-xs font-bold text-center bg-green-50 text-green-700 block';
        showHeritageToast(`تم حفظ بيانات الموظف (${name}) بنجاح!`);
        resetEmployeeForm();
        await syncEmployeesAndDepartments();
        setTimeout(() => msgBox.classList.add('hidden'), 4000);
    } catch (err) {
        msgBox.innerText = 'حدث خطأ: ' + err.message;
        msgBox.className = 'p-3 rounded-xl text-xs font-bold text-center bg-red-50 text-red-700 block';
    }
    btn.disabled = false;
}

async function deleteEmployeeFromSettings(empId) {
    const emp = employeesData.find(e => String(e.id) === String(empId));
    if (!confirm(`هل أنت متأكد من حذف الموظف (${emp ? emp.name : empId})؟`)) return;

    try {
        const { error } = await supabaseClient.from('employees').delete().eq('id', empId);
        if (error) throw new Error(error.message);
        showHeritageToast(`تم حذف الموظف بنجاح`, 'warning');
        await syncEmployeesAndDepartments();
    } catch (err) {
        showHeritageToast('فشل الحذف: ' + err.message, 'error');
    }
}

async function addDepartmentFromSettings() {
    const input = document.getElementById('settingDeptName');
    const origId = document.getElementById('editDeptOriginalId').value.trim();
    const origName = document.getElementById('editDeptOriginalName').value.trim();
    const name = input.value.trim();
    const msgBox = document.getElementById('settingDeptMsg');
    const btn = document.getElementById('btnAddDept');

    if (!name) {
        msgBox.innerText = 'يرجى كتابة اسم القسم أولاً!';
        msgBox.className = 'p-3 rounded-xl text-xs font-bold text-center bg-red-50 text-red-700 block';
        return;
    }

    btn.disabled = true;
    try {
        if (origName) {
            let updQuery = supabaseClient.from('departments').update({ name });
            if (origId && origId !== '0') updQuery = updQuery.eq('id', origId);
            else updQuery = updQuery.eq('name', origName);

            const { error } = await updQuery;
            if (error) throw new Error(error.message);

            if (origName !== name) {
                await supabaseClient.from('tasks').update({ requesterName: name }).eq('requesterName', origName);
            }

            msgBox.innerText = `✅ تم تعديل اسم القسم إلى (${name}) بنجاح!`;
            msgBox.className = 'p-3 rounded-xl text-xs font-bold text-center bg-green-50 text-green-700 block';
            showHeritageToast(`تم تعديل اسم القسم إلى (${name}) بنجاح!`);
            resetDepartmentForm();
        } else {
            const { error } = await supabaseClient
                .from('departments')
                .upsert([{ name }], { onConflict: 'name' });

            if (error) throw new Error(error.message);

            input.value = '';
            msgBox.innerText = '✅ تمت إضافة القسم بنجاح وظهر فوراً في قائمة الجهات الطالبة للتكليف!';
            msgBox.className = 'p-3 rounded-xl text-xs font-bold text-center bg-green-50 text-green-700 block';
            showHeritageToast(`تمت إضافة (${name}) لقائمة الجهات بنجاح!`);
        }

        await syncEmployeesAndDepartments();
        setTimeout(() => msgBox.classList.add('hidden'), 3000);
    } catch (err) {
        msgBox.innerText = 'خطأ: ' + err.message;
        msgBox.className = 'p-3 rounded-xl text-xs font-bold text-center bg-red-50 text-red-700 block';
    }
    btn.disabled = false;
}

async function deleteDepartmentFromSettings(deptId, deptName) {
    if (!confirm(`هل أنت متأكد من حذف (${deptName}) من قائمة الجهات؟`)) return;

    try {
        let query = supabaseClient.from('departments').delete();
        if (deptId) query = query.eq('id', deptId);
        else query = query.eq('name', deptName);

        const { error } = await query;
        if (error) throw new Error(error.message);
        showHeritageToast(`تم حذف (${deptName}) من قائمة الجهات`, 'warning');
        await syncEmployeesAndDepartments();
    } catch (err) {
        showHeritageToast('فشل حذف القسم: ' + err.message, 'error');
    }
}

// ==========================================
// لوحة الإدارة: التبويبات والمتابعة والإجراءات
// ==========================================
function switchManagerTab(tab) {
    const tabs = ['Create', 'Dashboard', 'Report', 'Settings'];
    document.getElementById('managerTaskActionSection').classList.add('hidden');

    tabs.forEach(t => {
        const btn = document.getElementById('tab' + t);
        const content = document.getElementById('tabContent' + t);
        if (!btn || !content) return;

        if (tab.toLowerCase() === t.toLowerCase()) {
            btn.className = 'font-extrabold text-xs sm:text-sm md:text-base py-3 px-3 rounded-xl transition-all duration-300 bg-primary text-white shadow-md flex items-center justify-center gap-1.5 relative';
            content.classList.remove('hidden');
            if (t === 'Dashboard') {
                closeManagerFolder();
                loadDashboard();
            }
            if (t === 'Report') {
                populateManagerEmployeeDropdowns();
                const selectReport = document.getElementById('reportEmployeeSelect');
                if (selectReport && !selectReport.value) {
                    selectReport.value = '__ALL__';
                }
                loadEmployeeReport();
            }
            if (t === 'Settings') syncEmployeesAndDepartments();
        } else {
            btn.className = 'font-extrabold text-xs sm:text-sm md:text-base py-3 px-3 rounded-xl transition-all duration-300 text-gray-500 hover:text-primary flex items-center justify-center gap-1.5 relative';
            content.classList.add('hidden');
        }
    });
}

async function refreshManagerTasksOnly() {
    const tasksRes = await supabaseClient.from('tasks').select('*');
    if (!tasksRes.error && tasksRes.data) {
        globalTasks = tasksRes.data;
        saveLocalTasksCache();
    }

    populateManagerEmployeeDropdowns();
    updateDashboardKPIs();
    updateManagerFolderCounts();

    if (!document.getElementById('mgrFolderViewSection').classList.contains('hidden') && currentManagerFolder !== 'messages') {
        handleManagerSearch();
    }
    const openId = document.getElementById('mgrTaskId')?.innerText;
    if (openId && !document.getElementById('managerTaskActionSection').classList.contains('hidden')) {
        openManagerTaskDetails(openId);
    }
}

async function refreshManagerMessagesOnly() {
    const msgsRes = await supabaseClient.from('messages').select('*').order('createdAt', { ascending: false });
    if (!msgsRes.error && msgsRes.data) {
        globalMessages = msgsRes.data;
        saveLocalMessagesCache();
    }

    updateDashboardKPIs();
    updateManagerFolderCounts();

    if (!document.getElementById('mgrFolderViewSection').classList.contains('hidden') && currentManagerFolder === 'messages') {
        handleManagerSearch();
    }
}

async function refreshManagerTasksSilently() {
    const [tasksRes, msgsRes] = await Promise.all([
        supabaseClient.from('tasks').select('*'),
        supabaseClient.from('messages').select('*').order('createdAt', { ascending: false })
    ]);
    if (!tasksRes.error && tasksRes.data) {
        globalTasks = tasksRes.data;
        saveLocalTasksCache();
    }
    if (!msgsRes.error && msgsRes.data) {
        globalMessages = msgsRes.data;
        saveLocalMessagesCache();
    }

    populateManagerEmployeeDropdowns();
    updateDashboardKPIs();
    updateManagerFolderCounts();

    if (!document.getElementById('mgrFolderViewSection').classList.contains('hidden')) {
        handleManagerSearch();
    }
    const openId = document.getElementById('mgrTaskId')?.innerText;
    if (openId && !document.getElementById('managerTaskActionSection').classList.contains('hidden')) {
        openManagerTaskDetails(openId);
    }
}

function populateManagerEmployeeDropdowns() {
    const emps = [];
    const addUniqueEmp = (name) => {
        const clean = String(name || '').trim();
        if (!clean) return;
        if (!emps.some(existing => isSameArabicName(existing, clean))) {
            emps.push(clean);
        }
    };
    employeesData.forEach(e => addUniqueEmp(e.name));
    globalTasks.forEach(t => { if (t.employeeName) addUniqueEmp(t.employeeName); });

    const selectReport = document.getElementById('reportEmployeeSelect');
    if (selectReport) {
        const currentVal = selectReport.value;
        selectReport.innerHTML = '<option value="">👤 اضغط لاختيار موظف أو التقرير الشامل للمركز...</option>';
        const allSel = currentVal === '__ALL__' ? 'selected' : '';
        selectReport.innerHTML += `<option value="__ALL__" ${allSel}>📊 تقرير شامل لجميع موظفي المركز (مقارنة الأداء العام)</option>`;
        emps.forEach(emp => {
            const sel = isSameArabicName(emp, currentVal) ? 'selected' : '';
            const safeEmp = escapeHtml(emp);
            selectReport.innerHTML += `<option value="${safeEmp}" ${sel}>👤 ${safeEmp}</option>`;
        });
    }

    const selectFilter = document.getElementById('mgrFilterEmp');
    if (selectFilter) {
        const currentFilter = selectFilter.value;
        selectFilter.innerHTML = '<option value="">👤 تصفية حسب الموظف (الكل)</option>';
        emps.forEach(emp => {
            const sel = isSameArabicName(emp, currentFilter) ? 'selected' : '';
            const safeEmp = escapeHtml(emp);
            selectFilter.innerHTML += `<option value="${safeEmp}" ${sel}>${safeEmp}</option>`;
        });
    }

    populateReportDepartmentFilter();
}

function renderManagerDashboardImmediateState() {
    populateManagerEmployeeDropdowns();
    updateDashboardKPIs();
    updateManagerFolderCounts();

    const folderViewEl = document.getElementById('mgrFolderViewSection');
    const foldersGridEl = document.getElementById('mgrFoldersGrid');
    const actionSecEl = document.getElementById('managerTaskActionSection');

    if (folderViewEl && !folderViewEl.classList.contains('hidden')) {
        handleManagerSearch();
    } else if (actionSecEl && actionSecEl.classList.contains('hidden') && foldersGridEl) {
        foldersGridEl.classList.remove('hidden');
    }
}

async function loadDashboard() {
    // إذا كانت البيانات محملة مسبقاً أو مخبأة، نعرضها فوراً (0 ملي ثانية) ونحدث بالخلفية
    if (Array.isArray(globalTasks) && globalTasks.length > 0) {
        renderManagerDashboardImmediateState();
    } else {
        const tbody = document.getElementById('mgrDashboardTableBody');
        if (tbody) tbody.innerHTML = '<div class="p-8 text-center text-primary font-bold animate-pulse">⏳ جاري العمل، اشغل انتظارك بإستغفارك...</div>';
    }

    const [tasksRes, msgsRes] = await Promise.all([
        supabaseClient.from('tasks').select('*'),
        supabaseClient.from('messages').select('*').order('createdAt', { ascending: false })
    ]);

    if (tasksRes.error) {
        console.error('Dashboard error:', tasksRes.error);
        return;
    }

    globalTasks = tasksRes.data || [];
    saveLocalTasksCache();

    if (!msgsRes.error && msgsRes.data) {
        globalMessages = msgsRes.data;
        saveLocalMessagesCache();
    }

    renderManagerDashboardImmediateState();
}

function loadTasks() {
    loadDashboard();
}

function updateDashboardKPIs() {
    let active = 0, late = 0, review = 0, done = 0, actionRequired = 0;
    const now = Date.now();
    globalTasks.forEach(t => {
        const status = String(t.taskStatus || '');
        if (status.includes('مغلق')) {
            done++;
        } else if (status.includes('جاهز')) {
            review++;
            actionRequired++;
        } else if (status.includes('تمديد') || status.includes('متوقف') || status.includes('اعتذار')) {
            actionRequired++;
            active++;
        } else if (!status.includes('ملغي') && !status.includes('مرفوض')) {
            active++;
            if (t.dueDate) {
                const due = new Date(t.dueDate);
                due.setHours(23, 59, 59);
                if (now > due.getTime()) {
                    late++;
                }
            }
        }
    });
    const eActive = document.getElementById('kpiActive');
    const eLate = document.getElementById('kpiLate');
    const eReview = document.getElementById('kpiReview');
    const eDone = document.getElementById('kpiDone');
    const eMsgs = document.getElementById('kpiMessages');
    if (eActive) eActive.innerText = active;
    if (eLate) eLate.innerText = late;
    if (eReview) eReview.innerText = review;
    if (eDone) eDone.innerText = done;
    if (eMsgs) eMsgs.innerText = globalMessages.length;

    const alertBadge = document.getElementById('mgrTabAlertBadge');
    if (alertBadge) {
        if (actionRequired > 0) {
            alertBadge.innerText = actionRequired;
            alertBadge.classList.remove('hidden');
        } else {
            alertBadge.classList.add('hidden');
        }
    }
}

function updateManagerFolderCounts() {
    const tasks = globalTasks;
    const countNew = tasks.filter(t => t.taskStatus === 'مرسل' || t.taskStatus === 'تم الاطلاع' || !t.taskStatus).length;
    const countWorking = tasks.filter(t => String(t.taskStatus).includes('جاري') || String(t.taskStatus).includes('اعتذار') || String(t.taskStatus).includes('متوقف') || String(t.taskStatus).includes('مرتجع') || String(t.taskStatus).includes('تمديد')).length;
    const countReady = tasks.filter(t => t.taskStatus === 'جاهز للمراجعة').length;
    const countArchived = tasks.filter(t => String(t.taskStatus).includes('مغلق') || String(t.taskStatus).includes('ملغي')).length;

    const elNew = document.getElementById('mgrFolderCountNew');
    const elWorking = document.getElementById('mgrFolderCountWorking');
    const elReady = document.getElementById('mgrFolderCountReady');
    const elArchived = document.getElementById('mgrFolderCountArchived');
    const elMessages = document.getElementById('mgrFolderCountMessages');

    if (elNew) elNew.innerText = countNew;
    if (elWorking) elWorking.innerText = countWorking;
    if (elReady) elReady.innerText = countReady;
    if (elArchived) elArchived.innerText = countArchived;
    if (elMessages) elMessages.innerText = globalMessages.length;
}

let currentManagerFolder = '';
function openManagerFolder(type) {
    currentManagerFolder = type;
    document.getElementById('mgrFoldersGrid').classList.add('hidden');
    document.getElementById('mgrFolderViewSection').classList.remove('hidden');
    document.getElementById('managerTaskActionSection').classList.add('hidden');

    const titles = {
        'new': '🆕 التكاليف المرسلة (الجديدة والمُطلع عليها)',
        'working': '⏳ التكاليف الجاري العمل عليها',
        'ready': '👁️ التكاليف الجاهزة للمراجعة والتقييم',
        'archived': '🗄️ أرشيف التكاليف المنجزة والمغلقة',
        'late': '⏰ التكاليف المتأخرة عن موعد التسليم',
        'all': '📋 جميع التكاليف المسجلة بالنظام',
        'messages': '📨 سجل المراسلات الداخلية بين الموظفين (إشراف الإدارة)'
    };
    document.getElementById('mgrCurrentFolderTitle').innerText = titles[type] || 'المجلد';
    handleManagerSearch();
}

function closeManagerFolder() {
    currentManagerFolder = '';
    document.getElementById('mgrFoldersGrid').classList.remove('hidden');
    document.getElementById('mgrFolderViewSection').classList.add('hidden');
    document.getElementById('managerTaskActionSection').classList.add('hidden');
}

function handleManagerSearch() {
    const search = document.getElementById('mgrSearchInput').value.toLowerCase();
    const emp = document.getElementById('mgrFilterEmp').value;

    if (!currentManagerFolder) {
        if (emp || search) {
            currentManagerFolder = 'all';
            document.getElementById('mgrFoldersGrid').classList.add('hidden');
            document.getElementById('mgrFolderViewSection').classList.remove('hidden');
            document.getElementById('managerTaskActionSection').classList.add('hidden');
            document.getElementById('mgrCurrentFolderTitle').innerText = emp ? '👤 جميع تكاليف: ' + emp : '🔍 نتائج البحث في التكاليف';
        } else {
            return;
        }
    }

    // في حال استعراض سجل المراسلات الداخلية بين الموظفين
    if (currentManagerFolder === 'messages') {
        const filteredMessages = globalMessages.filter(m => {
            const titleStr = String(m.title || '').toLowerCase();
            const contentStr = String(m.content || '').toLowerCase();
            const idStr = String(m.msgId || '').toLowerCase();
            const senderStr = String(m.senderName || '').toLowerCase();
            const receiverStr = String(m.receiverName || '').toLowerCase();

            const matchSearch = !search || titleStr.includes(search) || contentStr.includes(search) || idStr.includes(search) || senderStr.includes(search) || receiverStr.includes(search);
            const matchEmp = !emp || isSameArabicName(m.senderName, emp) || isSameArabicName(m.receiverName, emp);
            return matchSearch && matchEmp;
        });
        renderManagerMessagesTable(filteredMessages);
        return;
    }

    if (currentManagerFolder === 'all') {
        document.getElementById('mgrCurrentFolderTitle').innerText = emp ? '👤 جميع تكاليف: ' + emp : (search ? '🔍 نتائج البحث' : '📋 جميع التكاليف المسجلة بالنظام');
    }

    let filtered = globalTasks.filter(t => {
        const titleStr = String(t.taskDetails || '').toLowerCase();
        const idStr = String(t.taskId || '').toLowerCase();
        const matchSearch = titleStr.includes(search) || idStr.includes(search) || (t.employeeName || '').toLowerCase().includes(search);
        const matchEmp = emp ? isSameArabicName(t.employeeName, emp) : true;
        return matchSearch && matchEmp;
    });

    if (currentManagerFolder === 'new') {
        filtered = filtered.filter(t => t.taskStatus === 'مرسل' || t.taskStatus === 'تم الاطلاع' || !t.taskStatus);
    } else if (currentManagerFolder === 'working') {
        filtered = filtered.filter(t => String(t.taskStatus).includes('جاري') || String(t.taskStatus).includes('اعتذار') || String(t.taskStatus).includes('متوقف') || String(t.taskStatus).includes('مرتجع') || String(t.taskStatus).includes('تمديد'));
    } else if (currentManagerFolder === 'ready') {
        filtered = filtered.filter(t => t.taskStatus === 'جاهز للمراجعة');
    } else if (currentManagerFolder === 'archived') {
        filtered = filtered.filter(t => String(t.taskStatus).includes('مغلق') || String(t.taskStatus).includes('ملغي'));
    } else if (currentManagerFolder === 'late') {
        const todayStr = getLocalDateString();
        filtered = filtered.filter(t => {
            if (!t.dueDate) return false;
            const isNotClosed = !String(t.taskStatus).includes('مغلق') && !String(t.taskStatus).includes('ملغي');
            const isPastDue = t.dueDate < todayStr;
            return isNotClosed && isPastDue;
        });
    }

    renderManagerDashboardTable(filtered);
}

function renderManagerMessagesTable(messagesList) {
    const tbody = document.getElementById('mgrDashboardTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (messagesList.length === 0) {
        tbody.innerHTML = '<div class="text-center text-gray-500 font-bold p-10 bg-surface/60 rounded-3xl border-2 border-dashed border-line">لا توجد مراسلات داخلية بين الموظفين تطابق العرض حالياً.</div>';
        return;
    }

    messagesList.forEach(m => {
        let dateStr = '';
        try {
            const d = new Date(m.createdAt);
            dateStr = d.toLocaleDateString('ar-SA') + ' • ' + d.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
        } catch (e) { dateStr = m.createdAt || ''; }

        const repliesCount = Array.isArray(m.replyHistory) ? m.replyHistory.length : 0;
        const hasAttachment = Boolean(m.attachmentUrl);
        const safeMsgId = escapeJsStr(m.msgId);

        tbody.innerHTML += `
            <div onclick="openMessageById('${safeMsgId}')" class="bg-white p-5 rounded-3xl border-2 border-secondary/40 hover:border-primary hover:shadow-md transition-all duration-300 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden group">
                <div class="absolute top-0 right-0 w-2 h-full bg-gradient-to-b from-primary via-secondary to-primary"></div>
                <div class="flex-1 pr-3">
                    <div class="flex flex-wrap items-center gap-2 mb-2">
                        <span class="bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold">✉️ رسالة داخلية</span>
                        <span class="text-xs text-gray-400 font-mono">#${escapeHtml(m.msgId)}</span>
                        ${hasAttachment ? '<span class="bg-primary/10 text-primary px-2.5 py-0.5 rounded-full text-[11px] font-extrabold">📎 مرفق</span>' : ''}
                        ${repliesCount > 0 ? `<span class="bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold">💬 الردود: ${repliesCount}</span>` : ''}
                    </div>
                    <h4 class="font-extrabold text-lg text-ink group-hover:text-primary transition-colors mb-2">${escapeHtml(m.title)}</h4>
                    <p class="text-xs text-gray-500 line-clamp-1 mb-2 font-medium">${escapeHtml(m.content || '')}</p>
                    <div class="flex flex-wrap items-center gap-2 mt-1">
                        <span class="inline-flex items-center gap-1 bg-surface text-primary-dark px-3 py-1 rounded-xl text-xs font-extrabold border border-line">
                            📤 من: ${escapeHtml(m.senderName)}
                        </span>
                        <span class="text-gray-400 font-bold">⬅</span>
                        <span class="inline-flex items-center gap-1 bg-amber-50/80 text-amber-900 px-3 py-1 rounded-xl text-xs font-extrabold border border-amber-200">
                            📥 إلى: ${escapeHtml(m.receiverName)}
                        </span>
                    </div>
                </div>
                <div class="flex flex-wrap md:flex-col items-end justify-between gap-2">
                    <span class="${m.isRead ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'} border px-3 py-1 rounded-xl text-xs font-extrabold">
                        ${m.isRead ? '✓✓ تمت القراءة' : '🆕 غير مقروءة'}
                    </span>
                    <span class="text-xs font-bold text-gray-500 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100" dir="ltr">
                        🕒 ${dateStr}
                    </span>
                    <span class="text-xs font-extrabold text-primary group-hover:translate-x-[-4px] transition-transform">
                        استعراض الرسالة والمرفقات »
                    </span>
                </div>
            </div>
        `;
    });
}

function renderManagerDashboardTable(tasksList) {
    const tbody = document.getElementById('mgrDashboardTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (tasksList.length === 0) {
        tbody.innerHTML = '<div class="text-center text-gray-500 font-bold p-8 bg-gray-50 rounded-2xl border border-gray-100">المجلد فارغ حالياً.</div>';
        return;
    }

    const sortedTasks = sortTasksIntelligently(tasksList);

    sortedTasks.forEach(task => {
        let title = task.taskId;
        let priority = 'عادي';
        let desc = task.taskDetails || '';
        if (desc.includes('العنوان:')) {
            const lines = desc.split('\n');
            title = lines[0].replace('العنوان: ', '');
            if (lines.length > 1 && lines[1].includes('الأولوية:')) priority = lines[1].replace('الأولوية: ', '');
        } else {
            title = desc.split('\n')[0] || task.taskId;
        }

        let pColor = 'bg-gray-100 text-gray-600';
        if (priority.includes('عاجل')) pColor = 'bg-red-50 text-red-700';
        else if (priority.includes('هام')) pColor = 'bg-yellow-50 text-yellow-700';
        else if (priority.includes('عادي')) pColor = 'bg-green-50 text-green-700';

        let statusColor = 'bg-blue-50 text-blue-700';
        let statusLabel = task.taskStatus || 'مرسل';
        if (task.taskStatus === 'تم الاطلاع') {
            statusColor = 'bg-teal-50 text-teal-700';
            statusLabel = '👁️ تم الاطلاع';
        } else if (task.taskStatus === 'تم الرد' || String(task.taskStatus).includes('جاهز')) {
            statusColor = 'bg-purple-50 text-purple-700';
        } else if (String(task.taskStatus).includes('متوقف') || String(task.taskStatus).includes('مرفوض') || String(task.taskStatus).includes('اعتذار') || String(task.taskStatus).includes('مرتجع')) {
            statusColor = 'bg-red-50 text-red-700';
        } else if (String(task.taskStatus).includes('تمديد')) {
            statusColor = 'bg-orange-50 text-orange-700';
        } else if (String(task.taskStatus).includes('مغلق')) {
            statusColor = 'bg-green-50 text-green-700';
        } else if (String(task.taskStatus).includes('ملغي')) {
            statusColor = 'bg-gray-200 text-gray-600';
        }

        let dateStr = task.dueDate;
        try { dateStr = getLocalDateString(dateStr); } catch (e) {}

        let isLate = false;
        if (task.dueDate && !String(task.taskStatus).includes('مغلق') && !String(task.taskStatus).includes('ملغي')) {
            const due = new Date(task.dueDate);
            due.setHours(23, 59, 59);
            if (Date.now() > due.getTime()) isLate = true;
        }

        const safeTaskId = escapeJsStr(task.taskId);

        tbody.innerHTML += `
            <div onclick="openManagerTaskDetails('${safeTaskId}')" class="bg-white p-4 md:p-5 rounded-2xl border ${isLate ? 'border-red-200 hover:border-red-400 hover:shadow-md' : 'border-gray-100 hover:border-primary/50 hover:shadow-md'} transition-all duration-300 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden group">
                ${isLate ? '<div class="absolute top-0 right-0 w-2 h-full bg-red-500"></div>' : ''}
                <div class="flex-1 pr-2">
                    <h4 class="font-extrabold text-lg text-gray-800 group-hover:text-primary transition-colors mb-2">${escapeHtml(title)}</h4>
                    <div class="flex flex-wrap items-center gap-2 mt-1">
                        <span class="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded-md text-xs font-bold border border-blue-100 shadow-sm">
                            🏢 ${escapeHtml(task.requesterName || 'جهة غير محددة')}
                        </span>
                        <span class="inline-flex items-center gap-1 bg-gray-50 text-gray-600 px-2 py-1 rounded-md text-xs font-bold border border-gray-100 shadow-sm">
                            👤 ${escapeHtml(task.employeeName)}
                        </span>
                        <span class="text-[10px] text-gray-400 font-mono ml-auto">#${escapeHtml(task.taskId)}</span>
                    </div>
                </div>
                <div class="flex flex-wrap md:flex-nowrap items-center gap-3">
                    <span class="${statusColor} px-3 py-1 rounded-lg text-xs font-bold border border-current opacity-85">${escapeHtml(statusLabel)}</span>
                    <span class="${pColor} px-3 py-1 rounded-lg text-xs font-bold">${escapeHtml(priority)}</span>
                    <span class="${isLate ? 'bg-red-50 text-red-700 border-red-200' : 'bg-gray-50 text-gray-600 border-gray-200'} border px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1">
                        📅 ${escapeHtml(dateStr)} ${isLate ? '⚠️' : ''}
                    </span>
                </div>
            </div>
        `;
    });
}

function sendReminder(taskId) {
    const task = globalTasks.find(t => t.taskId === taskId);
    if (!task) return;

    let phone = '';
    const emp = employeesData.find(e => isSameArabicName(e.name, task.employeeName));
    if (emp) phone = emp.phone;
    if (!phone && task.employeePhone) phone = task.employeePhone;

    if (!phone) {
        showHeritageToast('لم يتم العثور على رقم هاتف الموظف: ' + task.employeeName, 'warning');
        return;
    }

    let title = String(task.taskDetails || '').split('\n')[0].replace('العنوان: ', '');
    if (!title) title = 'تكليف: ' + task.taskId;

    const taskUrl = `${getCleanPlatformBaseUrl()}?id=${task.taskId}`;
    const message = [
        `السلام عليكم ورحمة الله وبركاته 🌿`,
        ``,
        `🔔 *تذكير بتكليف عمل*`,
        `📌 *العنوان:* ${title}`,
        `🏢 *الجهة الطالبة:* ${task.requesterName || 'الإدارة'}`,
        `📅 *موعد التسليم:* ${task.dueDate || 'غير محدد'}`,
        ``,
        `🔗 *للدخول على التكليف وتحديث الحالة اضغط الرابط:*`,
        `${taskUrl}`
    ].join('\n');

    openWhatsApp(phone, message);
}

function openManagerTaskDetails(taskId) {
    const task = globalTasks.find(t => t.taskId === taskId);
    if (!task) return;

    document.getElementById('mgrFoldersGrid').classList.add('hidden');
    document.getElementById('mgrFolderViewSection').classList.add('hidden');
    document.getElementById('managerTaskActionSection').classList.remove('hidden');

    let title = String(task.taskDetails || '').split('\n')[0].replace('العنوان: ', '');
    if (!title) title = 'تكليف: ' + task.taskId;

    let priority = 'عادي';
    let desc = task.taskDetails || '';
    let cleanDesc = desc;
    if (desc.includes('العنوان:')) {
        const lines = desc.split('\n');
        if (lines.length > 1 && lines[1].includes('الأولوية:')) priority = lines[1].replace('الأولوية: ', '');
        cleanDesc = lines.slice(3).join('\n');
    }
    cleanDesc = cleanDesc.replace('التفاصيل:', '').trim();

    document.getElementById('mgrTaskTitle').innerText = title;
    document.getElementById('mgrTaskEmpName').innerText = task.employeeName || 'غير محدد';
    document.getElementById('mgrTaskDueDate').innerText = task.dueDate || 'غير محدد';
    document.getElementById('mgrTaskPriority').innerText = priority;

    // عرض الموعد الأصلي قبل التمديد إن وجد
    const origDueBadge = document.getElementById('mgrOriginalDueDateBadge');
    const origDue = getTaskOriginalDueDate(task);
    if (origDueBadge) {
        if (origDue) {
            origDueBadge.innerText = `(الموعد الأصلي قبل التمديد: ${origDue})`;
            origDueBadge.classList.remove('hidden');
        } else {
            origDueBadge.classList.add('hidden');
        }
    }

    // عرض صندوق المرفقات البارز في أعلى البطاقة
    renderTaskAttachmentsBox('mgrAttachmentContainer', task);

    const pageReminderBtn = document.getElementById('pageReminderBtn');
    if (pageReminderBtn) {
        if (task.taskStatus !== 'مغلق ومُقيم' && task.taskStatus !== 'ملغي' && task.taskStatus !== 'جاهز للمراجعة') {
            pageReminderBtn.classList.remove('hidden');
            pageReminderBtn.onclick = () => sendReminder(taskId);
        } else {
            pageReminderBtn.classList.add('hidden');
        }
    }

    document.getElementById('mgrTaskId').innerText = taskId;
    document.getElementById('mgrTaskDesc').innerText = cleanDesc ? 'تفاصيل التكليف: -\n' + cleanDesc : 'لا يوجد تفاصيل إضافية.';

    const banner = document.getElementById('mgrUrgencyBanner');
    const statusBadge = document.getElementById('mgrTaskStatusBadge');
    const timeBadge = document.getElementById('mgrTaskTimeBadge');

    if (statusBadge) {
        statusBadge.innerText = task.taskStatus || 'جديد';
        statusBadge.className = 'text-[11px] px-3 py-1 rounded-full font-bold shadow-sm border border-gray-100';
        if (task.taskStatus === 'جاهز للمراجعة') statusBadge.classList.add('bg-green-100', 'text-green-700');
        else if (task.taskStatus === 'تم الاطلاع') statusBadge.classList.add('bg-teal-100', 'text-teal-700');
        else if (task.taskStatus === 'مغلق ومُقيم' || task.taskStatus === 'ملغي') statusBadge.classList.add('bg-gray-100', 'text-gray-700');
        else if (task.taskStatus === 'مرتجع للتعديل') {
            statusBadge.innerText = '↩️ مرتجع للتعديل';
            statusBadge.classList.add('bg-amber-100', 'text-amber-800', 'border-amber-300');
        }
        else if (task.taskStatus === 'متوقف لعائق') statusBadge.classList.add('bg-red-100', 'text-red-700');
        else if (task.taskStatus === 'طلب تمديد موعد') statusBadge.classList.add('bg-orange-100', 'text-orange-700');
        else statusBadge.classList.add('bg-blue-100', 'text-blue-700');
    }

    if (task.taskStatus !== 'مغلق ومُقيم' && task.taskStatus !== 'ملغي' && task.taskStatus !== 'جاهز للمراجعة' && task.dueDate) {
        const due = new Date(task.dueDate);
        due.setHours(23, 59, 59);
        const start = new Date(task.createdAt || Date.now()).getTime();
        const now = new Date().getTime();

        let totalDuration = Math.max(1, due.getTime() - start);
        let elapsed = now - start;
        let ratio = Math.max(0, Math.min(1, elapsed / totalDuration));

        const diffDays = Math.ceil((due.getTime() - now) / (1000 * 60 * 60 * 24));
        if (diffDays < 0) ratio = 1;

        let hue = Math.floor(120 * (1 - ratio));

        if (timeBadge) {
            timeBadge.classList.remove('hidden');
            timeBadge.style.backgroundColor = `hsl(${hue}, 80%, 95%)`;
            timeBadge.style.color = `hsl(${hue}, 80%, 35%)`;
            timeBadge.style.borderColor = `hsl(${hue}, 80%, 80%)`;

            if (diffDays < 0) timeBadge.innerHTML = `متأخر ${Math.abs(diffDays)} يوم ⚠️`;
            else if (diffDays === 0) timeBadge.innerHTML = `ينتهي اليوم! ⏳`;
            else timeBadge.innerHTML = `متبقي ${diffDays} أيام`;
        }

        banner.classList.remove('hidden', 'bg-green-100', 'text-green-800', 'border-green-300', 'bg-yellow-100', 'text-yellow-800', 'border-yellow-300', 'bg-red-100', 'text-red-800', 'border-red-300');
        if (diffDays < 0) {
            banner.classList.add('bg-red-100', 'text-red-800', 'border-red-300');
            banner.innerHTML = `تحذير ⚠️: لقد تجاوز التكليف الموعد المحدد بـ ${Math.abs(diffDays)} أيام.`;
        } else if (diffDays === 0) {
            banner.classList.add('bg-yellow-100', 'text-yellow-800', 'border-yellow-300');
            banner.innerHTML = `تنبيه ⏳: ينتهي هذا التكليف اليوم!`;
        } else {
            banner.classList.add('bg-green-100', 'text-green-800', 'border-green-300');
            banner.innerHTML = `الوقت المتبقي: ${diffDays} أيام.`;
        }
    } else {
        banner.classList.add('hidden');
        if (timeBadge) timeBadge.classList.add('hidden');
    }

    const directExtendBox = document.getElementById('mgrDirectExtendBox');
    const rejectExtBtn = document.getElementById('mgrRejectExtBtn');
    const extRequestNotice = document.getElementById('mgrExtRequestNotice');
    document.getElementById('mgrStateDefault').classList.add('hidden');
    document.getElementById('mgrStateReview').classList.add('hidden');
    document.getElementById('mgrStateClosed').classList.add('hidden');
    document.getElementById('mgrCommonNoteWrapper').classList.remove('hidden');

    document.getElementById('mgrStateDefault').classList.remove('flex', 'flex-col');
    document.getElementById('mgrStateReview').classList.remove('flex', 'flex-col');

    const tStatus = task.taskStatus || 'مرسل';
    if (tStatus === 'مغلق ومُقيم' || tStatus === 'ملغي') {
        document.getElementById('mgrStateClosed').classList.remove('hidden');
        document.getElementById('mgrCommonNoteWrapper').classList.add('hidden');
        if (directExtendBox) directExtendBox.classList.add('hidden');
    } else {
        // إتاحة خيار تمديد التكليف للمدير في جميع الحالات النشطة حتى بدون طلب الموظف
        if (directExtendBox) directExtendBox.classList.remove('hidden');

        const requestedExtDate = getTaskRequestedExtensionDate(task);
        if (tStatus === 'طلب تمديد موعد' && requestedExtDate) {
            document.getElementById('mgrNewDueDate').value = requestedExtDate;
            if (extRequestNotice) {
                extRequestNotice.innerText = `🔔 الموظف يطلب التمديد إلى تاريخ: ${requestedExtDate} (تم تعبئة الحقل تلقائياً لتسهيل الاعتماد)`;
                extRequestNotice.classList.remove('hidden');
            }
        } else {
            document.getElementById('mgrNewDueDate').value = task.dueDate || '';
            if (extRequestNotice) extRequestNotice.classList.add('hidden');
        }

        if (rejectExtBtn) {
            if (tStatus === 'طلب تمديد موعد') rejectExtBtn.classList.remove('hidden');
            else rejectExtBtn.classList.add('hidden');
        }

        if (tStatus === 'جاهز للمراجعة') {
            document.getElementById('mgrStateReview').classList.remove('hidden');
            document.getElementById('mgrStateReview').classList.add('flex', 'flex-col');

            const fairSpeed = calculateFairSpeedScore(task);
            const speedDisplay = document.getElementById('mgrSpeedDisplay');
            const speedHidden = document.getElementById('mgrSpeedHiddenValue');
            const speedFairnessNote = document.getElementById('mgrSpeedFairnessNote');
            if (speedDisplay) speedDisplay.innerText = fairSpeed.score;
            if (speedHidden) speedHidden.value = fairSpeed.score;
            if (speedFairnessNote) {
                if (fairSpeed.note) {
                    speedFairnessNote.innerText = fairSpeed.note;
                    speedFairnessNote.classList.remove('hidden');
                } else {
                    speedFairnessNote.classList.add('hidden');
                }
            }

            const selectedRadio = document.querySelector('input[name="mgrQualityScore"][value="70"]');
            if (selectedRadio) selectedRadio.checked = true;
            const customInput = document.getElementById('mgrCustomQualityInput');
            if (customInput) customInput.value = '70';
            updateLiveTotalScore();
        } else {
            document.getElementById('mgrStateDefault').classList.remove('hidden');
            document.getElementById('mgrStateDefault').classList.add('flex', 'flex-col');
        }
    }

    document.getElementById('mgrTaskNote').value = '';

    const historyContainer = document.getElementById('mgrChatHistory');
    historyContainer.innerHTML = '';

    let createdDate = task.createdAt || Date.now();
    let cDateStr = '';
    try {
        const cd = new Date(createdDate);
        cDateStr = cd.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) + ' - ' + cd.toLocaleDateString('ar-SA');
    } catch (e) {}

    historyContainer.innerHTML += `
        <div class="max-w-[85%] md:max-w-[70%] ml-auto bg-[#dcf8c6] rounded-tl-none p-3 rounded-2xl shadow-sm relative mb-2 border border-black/5">
            <div class="text-[11px] font-extrabold text-[#075e54] mb-1">~ أنا (${escapeHtml(task.requesterName || 'الجهة الطالبة للتكليف')})</div>
            <div class="whitespace-pre-wrap text-[15px] leading-relaxed text-gray-800 font-medium">${escapeHtml(cleanDesc)}</div>
            <div class="text-[10px] text-gray-500 mt-1 flex justify-end items-center gap-1" dir="ltr">
                <span>${cDateStr}</span>
                <span class="text-[#53bdeb] text-xs leading-none tracking-tighter">✓✓</span>
            </div>
        </div>
    `;

    if (task.replyHistory && task.replyHistory.length > 0) {
        const history = [...task.replyHistory];
        history.forEach(item => {
            let dateStr = item.date;
            try {
                const d = new Date(item.date);
                dateStr = d.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) + ' - ' + d.toLocaleDateString('ar-SA');
            } catch (e) {}

            let isManager = false;
            if (item.sender) {
                isManager = (item.sender === 'manager');
            } else {
                const stStr = String(item.status || '');
                isManager = stStr.includes('تقييم') || stStr.includes('إرجاع') || stStr.includes('تحديث من الإدارة') || stStr.includes('إلغاء') || stStr.includes('مغلق') || stStr.includes('ملغي') || stStr.includes('تمديد') || (item.reply && (item.reply.includes('تم إرجاع') || item.reply.includes('الإدارة') || item.reply.includes('👑') || item.reply.startsWith('✅') || item.reply.startsWith('❌') || item.reply.startsWith('📅') || item.reply.startsWith('↩️') || item.reply.startsWith('💬')));
            }

            const alignClass = isManager ? 'ml-auto bg-[#dcf8c6] rounded-tl-none' : 'mr-auto bg-white rounded-tr-none';
            let senderName = isManager ? `~ أنا (${escapeHtml(task.requesterName || 'الجهة الطالبة للتكليف')})` : `~ ${escapeHtml(task.employeeName || 'الموظف')}`;
            let nameColor = isManager ? 'text-[#075e54]' : 'text-gray-500';

            historyContainer.innerHTML += `
                <div class="max-w-[85%] md:max-w-[70%] ${alignClass} p-3 rounded-2xl shadow-sm relative mb-2 border border-black/5">
                    <div class="text-[11px] font-extrabold ${nameColor} mb-1 flex justify-between">
                        <span>${senderName}</span>
                        <span class="bg-black/5 px-2 py-0.5 rounded text-[9px] font-mono">${escapeHtml(item.status || '')}</span>
                    </div>
                    <div class="whitespace-pre-wrap text-[15px] leading-relaxed text-gray-800 font-medium">${escapeHtml(item.reply || '')}</div>
                    ${item.requestedDueDate ? `<div class="mt-1.5 text-xs font-extrabold text-orange-800 bg-orange-50 px-2.5 py-1 rounded-lg border border-orange-200 inline-block">📅 التاريخ المطلوب للتمديد: ${escapeHtml(item.requestedDueDate)}</div>` : ''}
                    ${item.attachmentUrl ? `<a href="${escapeHtml(item.attachmentUrl)}" target="_blank" class="mt-2 inline-flex items-center gap-1 bg-black/5 text-gray-700 px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-black/10 transition">📎 عرض المرفق</a>` : ''}
                    <div class="text-[10px] text-gray-500 mt-1 flex justify-end items-center gap-1" dir="ltr">
                        <span>${dateStr}</span>
                        ${isManager ? '<span class="text-[#53bdeb] text-xs leading-none tracking-tighter">✓✓</span>' : ''}
                    </div>
                </div>
            `;
        });
    }
    setTimeout(() => { historyContainer.scrollTop = historyContainer.scrollHeight; }, 100);
}

function closeManagerTaskAction() {
    document.getElementById('managerTaskActionSection').classList.add('hidden');
    if (window.location.search) {
        window.history.replaceState({}, document.title, getCleanPlatformPathname());
    }
    if (currentManagerFolder) {
        document.getElementById('mgrFoldersGrid').classList.add('hidden');
        document.getElementById('mgrFolderViewSection').classList.remove('hidden');
    } else {
        document.getElementById('mgrFolderViewSection').classList.add('hidden');
        document.getElementById('mgrFoldersGrid').classList.remove('hidden');
    }
}

function selectQualityPreset(val) {
    const customInput = document.getElementById('mgrCustomQualityInput');
    if (customInput) customInput.value = String(val);
    updateLiveTotalScore();
}

function onCustomQualityInputChange(val) {
    let num = parseInt(val);
    if (isNaN(num)) num = 0;
    if (num < 0) num = 0;
    if (num > 70) num = 70;
    const radios = document.querySelectorAll('input[name="mgrQualityScore"]');
    radios.forEach(r => {
        r.checked = (parseInt(r.value) === num);
    });
    updateLiveTotalScore();
}

function updateLiveTotalScore() {
    const speedStr = document.getElementById('mgrSpeedHiddenValue')?.value || '0';
    const speed = parseInt(speedStr) || 0;
    const customInput = document.getElementById('mgrCustomQualityInput');
    const checkedRadio = document.querySelector('input[name="mgrQualityScore"]:checked');
    let quality = 70;
    if (customInput && customInput.value !== '') {
        quality = Math.max(0, Math.min(70, parseInt(customInput.value) || 0));
    } else if (checkedRadio) {
        quality = parseInt(checkedRadio.value) || 0;
    }
    const total = speed + quality;
    const totalEl = document.getElementById('mgrLiveTotalScore');
    if (totalEl) {
        totalEl.innerText = total + '%';
        if (total >= 90) totalEl.className = 'bg-white text-green-600 px-1.5 rounded-md';
        else if (total >= 70) totalEl.className = 'bg-white text-blue-600 px-1.5 rounded-md';
        else totalEl.className = 'bg-white text-orange-600 px-1.5 rounded-md';
    }
}

async function managerActionEval(actionType) {
    const taskId = document.getElementById('mgrTaskId').innerText;
    if (!taskId) return;

    let score = '70';
    const customInput = document.getElementById('mgrCustomQualityInput');
    const checkedRadio = document.querySelector('input[name="mgrQualityScore"]:checked');
    if (customInput && customInput.value !== '') {
        score = String(customInput.value).trim();
    } else if (checkedRadio) {
        score = checkedRadio.value;
    }
    let note = document.getElementById('mgrTaskNote').value.trim();

    let speedScore = 0;
    if (actionType === 'مغلق ومُقيم') {
        const speedHidden = document.getElementById('mgrSpeedHiddenValue');
        if (speedHidden) speedScore = parseInt(speedHidden.value) || 0;
    }

    const numericScore = Number(score);
    if (actionType === 'مغلق ومُقيم' && (score === '' || isNaN(numericScore) || numericScore < 0 || numericScore > 70)) {
        showHeritageToast('الرجاء إدخال تقييم صحيح لجودة المخرجات من 0 إلى 70', 'warning');
        return;
    }
    if ((actionType === 'مرتجع للتعديل' || actionType === 'تحديث من الإدارة') && !note) {
        showHeritageToast('الرجاء كتابة رسالة أو ملاحظة التوجيه للموظف أولاً', 'warning');
        return;
    }
    if (actionType === 'ملغي') {
        if (!confirm('هل أنت متأكد من إلغاء هذا التكليف نهائياً؟')) return;
    }

    showHeritageToast('⏳ جاري العمل، اشغل انتظارك بإستغفارك...', 'info');

    let prefix = '👑 تحديث الإدارة: ';
    if (actionType === 'مغلق ومُقيم') prefix = `✅ تم إغلاق التكليف بنجاح (النتيجة: ${Math.round(numericScore) + speedScore}%).\nملاحظة الإدارة: `;
    if (actionType === 'مرتجع للتعديل') prefix = '↩️ إرجاع للتعديل: ';
    if (actionType === 'ملغي') prefix = '❌ التكليف ملغي: ';
    if (actionType === 'تحديث من الإدارة') prefix = '💬 رسالة/توجيه: ';

    const replyText = prefix + (note ? note : (actionType === 'مغلق ومُقيم' ? 'أحسنت العمل، جزاك الله خيراً.' : ''));

    const replyObj = {
        sender: 'manager',
        date: new Date().toISOString(),
        status: actionType,
        reply: replyText,
        attachmentUrl: ''
    };

    try {
        const latestTask = await fetchLatestTaskFromDb(taskId);
        if (!latestTask) throw new Error('لم يتم العثور على التكليف في قاعدة البيانات');

        const currentHistory = Array.isArray(latestTask.replyHistory) ? [...latestTask.replyHistory, replyObj] : [replyObj];
        let updateData = {
            replyHistory: currentHistory
        };

        if (actionType !== 'تحديث من الإدارة') {
            updateData.taskStatus = actionType;
        }

        if (actionType === 'مغلق ومُقيم') {
            updateData.managerScore = String(Math.round(numericScore));
            updateData.speedScore = String(speedScore);
        }

        const { error } = await supabaseClient.from('tasks').update(updateData).eq('taskId', taskId);
        if (error) throw new Error(error.message);

        // تحديث فوري للذاكرة المحلية بدون انتظار إعادة التحميل الكامل
        const idx = globalTasks.findIndex(t => t.taskId === taskId);
        if (idx !== -1) {
            globalTasks[idx] = { ...globalTasks[idx], ...updateData };
            saveLocalTasksCache();
        }

        showHeritageToast('تم اعتماد قرار الإدارة وحفظه بنجاح!');
        closeManagerTaskAction();
        renderManagerDashboardImmediateState();
        refreshManagerTasksOnly();
    } catch (err) {
        showHeritageToast('خطأ في الاتصال: ' + err.message, 'error');
    }
}

async function managerUpdateDate() {
    const taskId = document.getElementById('mgrTaskId').innerText;
    if (!taskId) return;

    let newDate = document.getElementById('mgrNewDueDate').value;
    let note = document.getElementById('mgrTaskNote').value.trim();

    if (!newDate) {
        showHeritageToast('الرجاء اختيار تاريخ جديد من حقل (تمديد / تعديل موعد التسليم).', 'warning');
        return;
    }

    showHeritageToast('⏳ جاري العمل، اشغل انتظارك بإستغفارك...', 'info');

    try {
        const latestTask = await fetchLatestTaskFromDb(taskId);
        if (!latestTask) throw new Error('لم يتم العثور على التكليف في قاعدة البيانات');

        const prevDue = latestTask.dueDate || '';
        const replyObj = {
            sender: 'manager',
            date: new Date().toISOString(),
            status: 'تمديد موعد',
            previousDueDate: prevDue,
            newDueDate: newDate,
            reply: `📅 تم تمديد / تحديث موعد التسليم من الإدارة إلى: ${newDate}${prevDue ? ` (الموعد السابق: ${prevDue})` : ''}${note ? '\nملاحظة: ' + note : ''}`,
            attachmentUrl: ''
        };

        const currentHistory = Array.isArray(latestTask.replyHistory) ? [...latestTask.replyHistory, replyObj] : [replyObj];
        const nextStatus = (latestTask.taskStatus === 'طلب تمديد موعد') ? 'جاري العمل' : (latestTask.taskStatus || 'مرسل');

        const updatePayload = {
            dueDate: newDate,
            taskStatus: nextStatus,
            replyHistory: currentHistory
        };

        const { error } = await supabaseClient
            .from('tasks')
            .update(updatePayload)
            .eq('taskId', taskId);

        if (error) throw new Error(error.message);

        const idx = globalTasks.findIndex(t => t.taskId === taskId);
        if (idx !== -1) {
            globalTasks[idx] = { ...globalTasks[idx], ...updatePayload };
            saveLocalTasksCache();
        }

        showHeritageToast(`تم تمديد وتحديث موعد التسليم إلى (${newDate}) بنجاح!`);
        renderManagerDashboardImmediateState();
        openManagerTaskDetails(taskId);
        refreshManagerTasksOnly();
    } catch (e) {
        showHeritageToast('حدث خطأ: ' + e.message, 'error');
    }
}

async function managerRejectExtension() {
    const taskId = document.getElementById('mgrTaskId').innerText;
    if (!taskId) return;

    let note = document.getElementById('mgrTaskNote').value.trim();
    if (!note) {
        showHeritageToast('الرجاء كتابة سبب رفض التمديد في حقل الرسالة أولاً.', 'warning');
        return;
    }

    showHeritageToast('⏳ جاري العمل، اشغل انتظارك بإستغفارك...', 'info');

    const replyObj = {
        sender: 'manager',
        date: new Date().toISOString(),
        status: 'جاري العمل',
        reply: `❌ الإدارة رفضت طلب تمديد الموعد.\nالسبب: ${note}`,
        attachmentUrl: ''
    };

    try {
        const latestTask = await fetchLatestTaskFromDb(taskId);
        if (!latestTask) throw new Error('لم يتم العثور على التكليف في قاعدة البيانات');

        const currentHistory = Array.isArray(latestTask.replyHistory) ? [...latestTask.replyHistory, replyObj] : [replyObj];
        const updatePayload = {
            taskStatus: 'جاري العمل',
            replyHistory: currentHistory
        };

        const { error } = await supabaseClient
            .from('tasks')
            .update(updatePayload)
            .eq('taskId', taskId);

        if (error) throw new Error(error.message);

        const idx = globalTasks.findIndex(t => t.taskId === taskId);
        if (idx !== -1) {
            globalTasks[idx] = { ...globalTasks[idx], ...updatePayload };
            saveLocalTasksCache();
        }

        showHeritageToast('تم رفض طلب التمديد وتحديث السجل الزمني.', 'warning');
        closeManagerTaskAction();
        renderManagerDashboardImmediateState();
        refreshManagerTasksOnly();
    } catch (e) {
        showHeritageToast('حدث خطأ: ' + e.message, 'error');
    }
}

async function managerReopenTask() {
    const taskId = document.getElementById('mgrTaskId')?.innerText;
    if (!taskId) return;

    if (!confirm('هل ترغب في إعادة فتح هذا التكليف وتنشيطه للعمل مرة أخرى؟')) return;

    const customNote = prompt('يمكنك كتابة سبب أو توجيه للموظف عند إعادة فتح التكليف (اختياري):', 'تم إعادة فتح التكليف من الإدارة لاستكمال العمل.') || '';

    showHeritageToast('⏳ جاري العمل، اشغل انتظارك بإستغفارك...', 'info');

    const replyObj = {
        sender: 'manager',
        date: new Date().toISOString(),
        status: 'إعادة فتح التكليف',
        reply: `🔓 تم إعادة فتح التكليف وتنشيطه للعمل من الإدارة.${customNote.trim() ? '\nتوجيه الإدارة: ' + customNote.trim() : ''}`,
        attachmentUrl: ''
    };

    try {
        const latestTask = await fetchLatestTaskFromDb(taskId);
        if (!latestTask) throw new Error('لم يتم العثور على التكليف في قاعدة البيانات');

        const currentHistory = Array.isArray(latestTask.replyHistory) ? [...latestTask.replyHistory, replyObj] : [replyObj];
        const updatePayload = {
            taskStatus: 'جاري العمل',
            replyHistory: currentHistory
        };

        const { error } = await supabaseClient
            .from('tasks')
            .update(updatePayload)
            .eq('taskId', taskId);

        if (error) throw new Error(error.message);

        const idx = globalTasks.findIndex(t => t.taskId === taskId);
        if (idx !== -1) {
            globalTasks[idx] = { ...globalTasks[idx], ...updatePayload };
            saveLocalTasksCache();
        }

        showHeritageToast('تم إعادة فتح التكليف وتنشيطه للعمل بنجاح!');
        renderManagerDashboardImmediateState();
        openManagerTaskDetails(taskId);
        refreshManagerTasksOnly();
    } catch (e) {
        showHeritageToast('حدث خطأ: ' + e.message, 'error');
    }
}

// ==========================================
// الإحصائيات والتقارير الشاملة والتنفيذية
// ==========================================
function openStatsModal() {
    let total = globalTasks.length;
    let closed = globalTasks.filter(t => t.taskStatus === 'مغلق ومُقيم').length;
    let working = globalTasks.filter(t => String(t.taskStatus).includes('جاري')).length;
    let stopped = globalTasks.filter(t => String(t.taskStatus).includes('متوقف')).length;

    let totalScore = 0;
    let evaluatedCount = 0;
    globalTasks.forEach(t => {
        if (t.taskStatus === 'مغلق ومُقيم' && t.managerScore !== undefined && t.speedScore !== undefined) {
            let s = parseInt(t.managerScore) + parseInt(t.speedScore);
            if (!isNaN(s)) {
                totalScore += s;
                evaluatedCount++;
            }
        }
    });
    let avg = evaluatedCount > 0 ? Math.round(totalScore / evaluatedCount) : 0;

    document.getElementById('statsModal').innerHTML = `
<div class="bg-white rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-2xl relative">
    <button onclick="closeStatsModal()" class="absolute top-4 left-4 text-gray-400 hover:text-red-500 font-bold text-xl">&times;</button>
    <h3 class="text-xl font-bold text-primary mb-6 flex items-center gap-2">📊 إحصائيات النظام الحية</h3>
    
    <div class="space-y-4">
        <div class="flex justify-between items-center p-4 bg-gray-50 rounded-xl border border-gray-100">
            <span class="font-bold text-gray-600">إجمالي التكاليف</span>
            <span class="text-xl font-extrabold text-primary">${total}</span>
        </div>
        <div class="flex justify-between items-center p-4 bg-green-50 rounded-xl border border-green-100">
            <span class="font-bold text-green-700">المغلقة والمُقيمة</span>
            <span class="text-xl font-extrabold text-green-700">${closed}</span>
        </div>
        <div class="flex justify-between items-center p-4 bg-blue-50 rounded-xl border border-blue-100">
            <span class="font-bold text-blue-700">قيد العمل</span>
            <span class="text-xl font-extrabold text-blue-700">${working}</span>
        </div>
        <div class="flex justify-between items-center p-4 bg-red-50 rounded-xl border border-red-100">
            <span class="font-bold text-red-700">متوقفة لعائق</span>
            <span class="text-xl font-extrabold text-red-700">${stopped}</span>
        </div>
        <div class="flex justify-between items-center p-4 bg-yellow-50 rounded-xl border border-yellow-100">
            <span class="font-bold text-yellow-700">أداء المركز العام</span>
            <span class="text-xl font-extrabold text-primary">${avg}%</span>
        </div>
    </div>
</div>
    `;
    document.getElementById('statsModal').classList.remove('hidden');
}

function closeStatsModal() {
    document.getElementById('statsModal').classList.add('hidden');
}

function resetReportFilters() {
    const deptEl = document.getElementById('reportDeptFilter');
    const fromEl = document.getElementById('reportDateFrom');
    const toEl = document.getElementById('reportDateTo');
    if (deptEl) deptEl.value = '';
    if (fromEl) fromEl.value = '';
    if (toEl) toEl.value = '';
    loadEmployeeReport();
}

let currentReportExportRows = [];

function loadEmployeeReport() {
    const empSelect = document.getElementById('reportEmployeeSelect');
    const empName = empSelect ? empSelect.value : '';
    const deptFilter = document.getElementById('reportDeptFilter')?.value || '';
    const dateFrom = document.getElementById('reportDateFrom')?.value || '';
    const dateTo = document.getElementById('reportDateTo')?.value || '';
    const printArea = document.getElementById('reportPrintArea');

    if (!empName && !deptFilter) {
        if (printArea) printArea.classList.add('hidden');
        return;
    }

    // في حال اختار المدير قسماً معيناً بدون اختيار موظف، ننتقل تلقائياً لوضع التقرير الشامل للقسم
    const isAllMode = (empName === '__ALL__' || (!empName && deptFilter));
    if (!empName && deptFilter && empSelect) {
        empSelect.value = '__ALL__';
    }

    const todayStr = getLocalDateString();
    const isTaskInDateRange = (t) => {
        if (!dateFrom && !dateTo) return true;
        const createdDay = t.createdAt ? String(t.createdAt).slice(0, 10) : (t.dueDate || '');
        if (dateFrom && createdDay && createdDay < dateFrom) return false;
        if (dateTo && createdDay && createdDay > dateTo) return false;
        return true;
    };

    const getEmpDepartmentsLabel = (name, empTasksList) => {
        if (deptFilter) return deptFilter;
        const found = employeesData.find(e => isSameArabicName(e.name, name));
        if (found && found.department) return found.department;
        const reqs = [];
        const sourceTasks = Array.isArray(empTasksList) && empTasksList.length > 0
            ? empTasksList
            : globalTasks.filter(t => isSameArabicName(t.employeeName, name) && !String(t.taskStatus).includes('ملغي'));
        sourceTasks.forEach(t => {
            const rq = String(t.requesterName || '').trim();
            if (rq && !reqs.some(r => isSameArabicName(r, rq))) reqs.push(rq);
        });
        if (reqs.length === 0) return 'عام';
        if (reqs.length <= 2) return reqs.join(' ، ');
        return `${reqs[0]} ، ${reqs[1]} (+${reqs.length - 2})`;
    };

    const headRow = document.getElementById('reportTableHeadRow');
    const tbody = document.getElementById('reportTableBody');
    const deptBadge = document.getElementById('reportDeptBadge');
    const periodBadge = document.getElementById('reportPeriodBadge');

    if (periodBadge) {
        if (dateFrom || dateTo) {
            periodBadge.innerText = `الفترة: ${dateFrom || 'البداية'} إلى ${dateTo || 'اليوم'}`;
            periodBadge.classList.remove('hidden');
        } else {
            periodBadge.innerText = 'الفترة: جميع الأوقات';
            periodBadge.classList.remove('hidden');
        }
    }

    currentReportExportRows = [];

    if (isAllMode) {
        document.getElementById('reportEmpName').innerText = deptFilter ? `تقرير تكاليف وأداء قسم / جهة: ${deptFilter}` : 'التقرير الشامل لجميع موظفي المركز';
        document.getElementById('reportDate').innerText = 'تاريخ إصدار التقرير: ' + new Date().toLocaleDateString('ar-SA');
        if (deptBadge) {
            deptBadge.innerText = deptFilter ? `🏢 الجهة / القسم: ${deptFilter}` : '🏢 جميع أقسام المركز';
            deptBadge.classList.remove('hidden');
        }

        if (headRow) {
            headRow.innerHTML = `
                <th class="p-3 border-b">الموظف</th>
                <th class="p-3 border-b">القسم / الجهة الطالبة</th>
                <th class="p-3 border-b text-center">إجمالي التكاليف</th>
                <th class="p-3 border-b text-center">مكتملة ومُقيمة</th>
                <th class="p-3 border-b text-center">قيد التنفيذ / المراجعة</th>
                <th class="p-3 border-b text-center">متأخرة / متوقفة</th>
                <th class="p-3 border-b text-center">متوسط السرعة</th>
                <th class="p-3 border-b text-center">المعدل العام</th>
            `;
        }

        // تجميع قائمة الموظفين بدون تكرار للهمزات
        const empNamesList = [];
        const addEmpUnique = (nm) => {
            const clean = String(nm || '').trim();
            if (!clean) return;
            if (!empNamesList.some(existing => isSameArabicName(existing, clean))) {
                empNamesList.push(clean);
            }
        };
        employeesData.forEach(e => addEmpUnique(e.name));
        globalTasks.forEach(t => {
            if (t.employeeName) addEmpUnique(t.employeeName);
        });

        let centerAssigned = 0, centerClosed = 0, centerActive = 0, centerLate = 0;
        let centerScoreSum = 0, centerSpeedSum = 0, centerEvaluatedTasks = 0;

        const empRows = [];
        empNamesList.forEach(name => {
            const tasksForEmp = globalTasks.filter(t =>
                isSameArabicName(t.employeeName, name) &&
                !String(t.taskStatus).includes('ملغي') &&
                isTaskInDateRange(t) &&
                (!deptFilter || isSameArabicName(t.requesterName, deptFilter))
            );
            if (tasksForEmp.length === 0 && (deptFilter || dateFrom || dateTo)) return;

            const empDept = getEmpDepartmentsLabel(name, tasksForEmp);
            let assigned = tasksForEmp.length;
            let closed = 0, active = 0, lateOrStopped = 0;
            let scoreSum = 0, speedSum = 0, evalCount = 0;

            tasksForEmp.forEach(t => {
                const st = String(t.taskStatus || 'مرسل');
                if (st === 'مغلق ومُقيم') {
                    closed++;
                    const spd = parseInt(t.speedScore) || 0;
                    const mgr = parseInt(t.managerScore) || 0;
                    scoreSum += (spd + mgr);
                    speedSum += spd;
                    evalCount++;
                } else {
                    active++;
                    const isPastDue = t.dueDate && t.dueDate < todayStr;
                    if (isPastDue || st.includes('متوقف') || st.includes('اعتذار')) {
                        lateOrStopped++;
                    }
                }
            });

            centerAssigned += assigned;
            centerClosed += closed;
            centerActive += active;
            centerLate += lateOrStopped;
            centerScoreSum += scoreSum;
            centerSpeedSum += speedSum;
            centerEvaluatedTasks += evalCount;

            const avgScore = evalCount > 0 ? Math.round(scoreSum / evalCount) : -1;
            const avgSpeed = evalCount > 0 ? Math.round(speedSum / evalCount) : -1;

            empRows.push({
                name,
                dept: empDept,
                assigned,
                closed,
                active,
                lateOrStopped,
                avgScore,
                avgSpeed
            });
        });

        // ترتيب تنازلي حسب المعدل العام ثم عدد المنجزات
        empRows.sort((a, b) => {
            if (b.avgScore !== a.avgScore) return b.avgScore - a.avgScore;
            return b.closed - a.closed;
        });

        tbody.innerHTML = '';
        if (empRows.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="p-6 text-center text-gray-500 font-bold">لا توجد بيانات مطابقة للفلاتر المختارة.</td></tr>';
        } else {
            empRows.forEach(r => {
                const scoreText = r.avgScore >= 0 ? `${r.avgScore}%` : '—';
                const speedText = r.avgSpeed >= 0 ? `${r.avgSpeed}/30` : '—';
                const scoreBadgeClass = r.avgScore >= 85 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : (r.avgScore >= 65 ? 'bg-blue-50 text-blue-700 border-blue-200' : (r.avgScore >= 0 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-gray-50 text-gray-400 border-gray-200'));

                tbody.innerHTML += `
                    <tr class="hover:bg-gray-50 border-b transition-colors">
                        <td class="p-3 font-extrabold text-ink text-sm">${escapeHtml(r.name)}</td>
                        <td class="p-3 text-xs font-bold text-gray-600">${escapeHtml(r.dept)}</td>
                        <td class="p-3 text-center font-extrabold text-gray-800">${r.assigned}</td>
                        <td class="p-3 text-center font-extrabold text-emerald-700">${r.closed}</td>
                        <td class="p-3 text-center font-bold text-blue-700">${r.active}</td>
                        <td class="p-3 text-center font-bold ${r.lateOrStopped > 0 ? 'text-red-600' : 'text-gray-400'}">${r.lateOrStopped}</td>
                        <td class="p-3 text-center font-bold text-amber-700">${speedText}</td>
                        <td class="p-3 text-center"><span class="px-2.5 py-1 rounded-lg border font-extrabold text-xs ${scoreBadgeClass}">${scoreText}</span></td>
                    </tr>
                `;

                currentReportExportRows.push({
                    'الموظف': r.name,
                    'القسم': r.dept,
                    'إجمالي التكاليف': r.assigned,
                    'المكتملة والمقيمة': r.closed,
                    'قيد التنفيذ أو المراجعة': r.active,
                    'متأخرة أو متوقفة': r.lateOrStopped,
                    'متوسط السرعة (من 30)': speedText,
                    'المعدل العام': scoreText
                });
            });
        }

        document.getElementById('reportTotalAllTasks').innerText = centerAssigned;
        document.getElementById('reportTotalTasks').innerText = centerClosed;
        document.getElementById('reportActiveTasks').innerText = centerActive;
        document.getElementById('reportLateTasks').innerText = centerLate;
        document.getElementById('reportAvgSpeed').innerText = centerEvaluatedTasks > 0 ? `${Math.round(centerSpeedSum / centerEvaluatedTasks)}/30` : '0/30';
        document.getElementById('reportAvgScore').innerText = centerEvaluatedTasks > 0 ? `${Math.round(centerScoreSum / centerEvaluatedTasks)}%` : '0%';

        printArea.classList.remove('hidden');
        return;
    }

    // تقرير مفصل لموظف واحد (يشمل جميع التكاليف: المكتملة، الجارية، المتأخرة، المتوقفة)
    const allEmpTasks = globalTasks.filter(t =>
        isSameArabicName(t.employeeName, empName) &&
        !String(t.taskStatus).includes('ملغي') &&
        isTaskInDateRange(t) &&
        (!deptFilter || isSameArabicName(t.requesterName, deptFilter))
    );
    const empDept = getEmpDepartmentsLabel(empName, allEmpTasks);
    document.getElementById('reportEmpName').innerText = empName;
    document.getElementById('reportDate').innerText = 'تاريخ إصدار التقرير: ' + new Date().toLocaleDateString('ar-SA');
    if (deptBadge) {
        deptBadge.innerText = `🏢 القسم / الجهة: ${empDept}`;
        deptBadge.classList.remove('hidden');
    }

    if (headRow) {
        headRow.innerHTML = `
            <th class="p-3 border-b">رقم التكليف</th>
            <th class="p-3 border-b">عنوان التكليف</th>
            <th class="p-3 border-b text-center">الحالة</th>
            <th class="p-3 border-b text-center">موعد التسليم</th>
            <th class="p-3 border-b text-center">نقاط السرعة (30)</th>
            <th class="p-3 border-b text-center">تقييم الجودة (70)</th>
            <th class="p-3 border-b text-center">النتيجة</th>
        `;
    }

    let assignedCount = allEmpTasks.length;
    let closedCount = 0, activeCount = 0, lateStoppedCount = 0;
    let sumScores = 0, sumSpeed = 0;

    tbody.innerHTML = '';

    if (assignedCount === 0) {
        document.getElementById('reportTotalAllTasks').innerText = '0';
        document.getElementById('reportTotalTasks').innerText = '0';
        document.getElementById('reportActiveTasks').innerText = '0';
        document.getElementById('reportLateTasks').innerText = '0';
        document.getElementById('reportAvgScore').innerText = '0%';
        document.getElementById('reportAvgSpeed').innerText = '0/30';
        tbody.innerHTML = '<tr><td colspan="7" class="p-6 text-center text-gray-500 font-bold">لا توجد تكاليف مسجلة لهذا الموظف ضمن الفترة المحددة.</td></tr>';
    } else {
        allEmpTasks.forEach(t => {
            const st = String(t.taskStatus || 'مرسل');
            const isClosed = (st === 'مغلق ومُقيم');
            const isPastDue = !isClosed && t.dueDate && t.dueDate < todayStr;
            if (isClosed) {
                closedCount++;
            } else {
                activeCount++;
                if (isPastDue || st.includes('متوقف') || st.includes('اعتذار')) {
                    lateStoppedCount++;
                }
            }

            let spd = isClosed ? (parseInt(t.speedScore) || 0) : null;
            let mgr = isClosed ? (parseInt(t.managerScore) || 0) : null;
            let tot = isClosed ? (spd + mgr) : null;

            if (isClosed) {
                sumScores += tot;
                sumSpeed += spd;
            }

            let title = String(t.taskDetails || '').split('\n')[0].replace('العنوان: ', '') || t.taskId;
            let statusBadge = 'bg-blue-50 text-blue-700 border-blue-200';
            if (isClosed) statusBadge = 'bg-emerald-50 text-emerald-700 border-emerald-200';
            else if (st === 'جاهز للمراجعة') statusBadge = 'bg-purple-50 text-purple-700 border-purple-200';
            else if (isPastDue || st.includes('متوقف') || st.includes('اعتذار')) statusBadge = 'bg-red-50 text-red-700 border-red-200';

            tbody.innerHTML += `
                <tr class="hover:bg-gray-50 border-b">
                    <td class="whitespace-nowrap p-3 text-xs font-mono text-gray-500">${escapeHtml(t.taskId)}</td>
                    <td class="p-3 font-bold text-right text-sm text-gray-800 leading-relaxed min-w-[200px]">${escapeHtml(title)}</td>
                    <td class="whitespace-nowrap p-3 text-center"><span class="px-2.5 py-1 rounded-lg border text-xs font-bold ${statusBadge}">${escapeHtml(st)}${isPastDue ? ' ⚠️' : ''}</span></td>
                    <td class="whitespace-nowrap p-3 text-center text-xs font-bold text-gray-600" dir="ltr">${escapeHtml(t.dueDate || '—')}</td>
                    <td class="whitespace-nowrap p-3 text-center text-amber-700 font-bold">${spd !== null ? spd : '—'}</td>
                    <td class="whitespace-nowrap p-3 text-center text-primary font-bold">${mgr !== null ? mgr : '—'}</td>
                    <td class="whitespace-nowrap p-3 text-center text-primary font-extrabold">${tot !== null ? tot + '%' : 'قيد العمل'}</td>
                </tr>
            `;

            currentReportExportRows.push({
                'رقم التكليف': t.taskId,
                'عنوان التكليف': title,
                'الجهة الطالبة': t.requesterName || '',
                'الحالة': st + (isPastDue ? ' (متأخر)' : ''),
                'موعد التسليم': t.dueDate || '',
                'نقاط السرعة (30)': spd !== null ? spd : '—',
                'تقييم الجودة (70)': mgr !== null ? mgr : '—',
                'النتيجة النهائية': tot !== null ? `${tot}%` : 'قيد العمل'
            });
        });

        document.getElementById('reportTotalAllTasks').innerText = assignedCount;
        document.getElementById('reportTotalTasks').innerText = closedCount;
        document.getElementById('reportActiveTasks').innerText = activeCount;
        document.getElementById('reportLateTasks').innerText = lateStoppedCount;
        document.getElementById('reportAvgScore').innerText = closedCount > 0 ? Math.round(sumScores / closedCount) + '%' : '—';
        document.getElementById('reportAvgSpeed').innerText = closedCount > 0 ? Math.round(sumSpeed / closedCount) + '/30' : '—';
    }
    printArea.classList.remove('hidden');
}

async function getSafeReportLogoDataUrl() {
    if (window.__cachedLogoBase64) return window.__cachedLogoBase64;
    const remoteLogo = 'https://xkvxticrvhhehfigjlnt.supabase.co/storage/v1/object/public/attachments/branding/turath_logo.png';
    try {
        const res = await fetch(remoteLogo, { mode: 'cors' });
        if (res.ok) {
            const blob = await res.blob();
            const dataUrl = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = () => resolve('');
                reader.readAsDataURL(blob);
            });
            if (dataUrl) {
                window.__cachedLogoBase64 = dataUrl;
                return dataUrl;
            }
        }
    } catch (e) {}
    return '';
}

function buildOfficialExecutiveReportHtml(logoDataUrl) {
    const scopeTitle = document.getElementById('reportEmpName')?.innerText || 'التقرير الشامل لجميع موظفي المركز';
    const reportDateStr = document.getElementById('reportDate')?.innerText || ('تاريخ إصدار التقرير: ' + new Date().toLocaleDateString('ar-SA'));
    const deptBadgeStr = document.getElementById('reportDeptBadge')?.innerText || '🏢 جميع أقسام المركز';
    const periodBadgeStr = document.getElementById('reportPeriodBadge')?.innerText || 'الفترة: جميع الأوقات';

    const kpiScore = document.getElementById('reportAvgScore')?.innerText || '0%';
    const kpiSpeed = document.getElementById('reportAvgSpeed')?.innerText || '0/30';
    const kpiTotal = document.getElementById('reportTotalAllTasks')?.innerText || '0';
    const kpiDone = document.getElementById('reportTotalTasks')?.innerText || '0';
    const kpiActive = document.getElementById('reportActiveTasks')?.innerText || '0';
    const kpiLate = document.getElementById('reportLateTasks')?.innerText || '0';

    const headers = currentReportExportRows && currentReportExportRows.length > 0
        ? Object.keys(currentReportExportRows[0])
        : ['البيان'];

    const headerCellsHtml = headers.map((h, idx) => `
        <th style="padding: 10px 8px; background-color: #065323; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #097834; text-align: ${idx <= 1 ? 'right' : 'center'};">
            ${escapeHtml(h)}
        </th>
    `).join('');

    const bodyRowsHtml = (currentReportExportRows && currentReportExportRows.length > 0)
        ? currentReportExportRows.map((row, rIdx) => {
            const rowBg = rIdx % 2 === 0 ? '#ffffff' : '#f6faf7';
            const cells = headers.map((h, cIdx) => {
                const val = row[h] !== undefined && row[h] !== null ? String(row[h]) : '—';
                const isBoldCol = cIdx === 0 || cIdx === 1 || cIdx === headers.length - 1;
                let textColor = '#17201b';
                if (cIdx === headers.length - 1) textColor = '#097834';
                else if (val.includes('متأخر') || (h.includes('متأخرة') && parseInt(val) > 0)) textColor = '#dc2626';
                return `
                    <td style="padding: 9px 8px; background-color: ${rowBg}; color: ${textColor}; font-weight: ${isBoldCol ? '800' : '600'}; font-size: 11px; border: 1px solid #dfe7e2; text-align: ${cIdx <= 1 ? 'right' : 'center'}; line-height: 1.5;">
                        ${escapeHtml(val)}
                    </td>
                `;
            }).join('');
            return `<tr style="page-break-inside: avoid;">${cells}</tr>`;
        }).join('')
        : `<tr><td colspan="${headers.length}" style="padding: 18px; text-align: center; color: #66756d; font-weight: 700; font-size: 12px; border: 1px solid #dfe7e2;">لا توجد بيانات مسجلة ضمن هذا النطاق حالياً.</td></tr>`;

    const logoBlock = logoDataUrl
        ? `<img src="${logoDataUrl}" style="width: 78px; height: 78px; object-fit: contain; display: block; margin: 0 auto 8px auto;" />`
        : `<div style="width: 68px; height: 68px; margin: 0 auto 8px auto; border-radius: 50%; background-color: #f6faf7; border: 2px solid #c7ac25; display: flex; align-items: center; justify-content: center; color: #097834; font-weight: 900; font-size: 26px;">🕌</div>`;

    return `
        <div dir="rtl" style="width: 760px; margin: 0 auto; background-color: #ffffff; color: #17201b; font-family: 'Noto Kufi Arabic', 'IBM Plex Sans Arabic', Tahoma, Arial, sans-serif; padding: 22px; border: 3px double #c7ac25; border-radius: 18px; box-sizing: border-box;">
            <!-- ترويسة التقرير الرسمية -->
            <div style="border-bottom: 2px solid #097834; padding-bottom: 16px; margin-bottom: 18px; text-align: center; background: linear-gradient(180deg, #f9f5e3 0%, #ffffff 100%); border-radius: 12px 12px 0 0; padding-top: 14px;">
                ${logoBlock}
                <div style="font-size: 13px; font-weight: 800; color: #097834; margin-bottom: 4px;">جمعية إحياء التراث الإسلامي — مركز محافظة الفروانية</div>
                <div style="font-size: 22px; font-weight: 900; color: #065323; margin-bottom: 8px;">تقرير تقييم الأداء وإنجاز التكاليف الرسمي</div>
                <div style="display: inline-block; background-color: #f6faf7; border: 1px solid #097834; color: #065323; padding: 5px 16px; border-radius: 999px; font-size: 13px; font-weight: 800; margin-bottom: 8px;">
                    النطاق: ${escapeHtml(scopeTitle)}
                </div>
                <div style="display: flex; justify-content: center; gap: 10px; flex-wrap: wrap; margin-top: 4px; font-size: 11px; font-weight: 700; color: #66756d;">
                    <span style="background-color: #f9f5e3; color: #785f08; border: 1px solid #e6d37a; padding: 3px 10px; border-radius: 8px;">${escapeHtml(deptBadgeStr)}</span>
                    <span style="background-color: #f6faf7; color: #065323; border: 1px solid #c6dfd0; padding: 3px 10px; border-radius: 8px;">${escapeHtml(periodBadgeStr)}</span>
                    <span style="background-color: #f3f4f6; color: #374151; border: 1px solid #e5e7eb; padding: 3px 10px; border-radius: 8px;">${escapeHtml(reportDateStr)}</span>
                </div>
            </div>

            <!-- بطاقات مؤشرات الأداء الستة -->
            <table style="width: 100%; border-collapse: separate; border-spacing: 6px; margin-bottom: 18px;">
                <tr>
                    <td style="width: 16.66%; background-color: #f0fdf4; border: 1.5px solid #86efac; border-radius: 12px; padding: 10px 6px; text-align: center;">
                        <div style="font-size: 10px; font-weight: 800; color: #166534; margin-bottom: 4px;">متوسط التقييم</div>
                        <div style="font-size: 18px; font-weight: 900; color: #097834;">${escapeHtml(kpiScore)}</div>
                    </td>
                    <td style="width: 16.66%; background-color: #fefce8; border: 1.5px solid #fde047; border-radius: 12px; padding: 10px 6px; text-align: center;">
                        <div style="font-size: 10px; font-weight: 800; color: #854d0e; margin-bottom: 4px;">متوسط السرعة</div>
                        <div style="font-size: 18px; font-weight: 900; color: #a16207;">${escapeHtml(kpiSpeed)}</div>
                    </td>
                    <td style="width: 16.66%; background-color: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 12px; padding: 10px 6px; text-align: center;">
                        <div style="font-size: 10px; font-weight: 800; color: #334155; margin-bottom: 4px;">إجمالي التكاليف</div>
                        <div style="font-size: 18px; font-weight: 900; color: #1e293b;">${escapeHtml(kpiTotal)}</div>
                    </td>
                    <td style="width: 16.66%; background-color: #ecfdf5; border: 1.5px solid #6ee7b7; border-radius: 12px; padding: 10px 6px; text-align: center;">
                        <div style="font-size: 10px; font-weight: 800; color: #065f46; margin-bottom: 4px;">منجزة ومُقيمة</div>
                        <div style="font-size: 18px; font-weight: 900; color: #047857;">${escapeHtml(kpiDone)}</div>
                    </td>
                    <td style="width: 16.66%; background-color: #eff6ff; border: 1.5px solid #93c5fd; border-radius: 12px; padding: 10px 6px; text-align: center;">
                        <div style="font-size: 10px; font-weight: 800; color: #1e40af; margin-bottom: 4px;">جاري / للمراجعة</div>
                        <div style="font-size: 18px; font-weight: 900; color: #1d4ed8;">${escapeHtml(kpiActive)}</div>
                    </td>
                    <td style="width: 16.66%; background-color: #fef2f2; border: 1.5px solid #fca5a5; border-radius: 12px; padding: 10px 6px; text-align: center;">
                        <div style="font-size: 10px; font-weight: 800; color: #991b1b; margin-bottom: 4px;">متأخرة / متوقفة</div>
                        <div style="font-size: 18px; font-weight: 900; color: #dc2626;">${escapeHtml(kpiLate)}</div>
                    </td>
                </tr>
            </table>

            <!-- جدول البيانات التفصيلي -->
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 22px;">
                <thead>
                    <tr>${headerCellsHtml}</tr>
                </thead>
                <tbody>
                    ${bodyRowsHtml}
                </tbody>
            </table>

            <!-- تذييل التقرير الرسمي والتوقيع -->
            <div style="border-top: 2px solid #dfe7e2; padding-top: 14px; margin-top: 10px; display: flex; justify-content: space-between; align-items: flex-end; font-size: 11px; color: #66756d; page-break-inside: avoid;">
                <div>
                    <div style="font-weight: 800; color: #097834; margin-bottom: 3px;">إشراف وتطوير: قسم تطوير الأنظمة التقنية — مركز محافظة الفروانية</div>
                    <div>تم استخراج هذا التقرير آلياً من منصة إدارة التكاليف والمراسلات المعتمدة.</div>
                </div>
                <div style="text-align: center; min-width: 170px;">
                    <div style="font-weight: 800; color: #17201b; margin-bottom: 24px;">اعتماد إدارة المركز</div>
                    <div style="border-bottom: 1px dashed #9ca3af; width: 150px; margin: 0 auto;"></div>
                </div>
            </div>
        </div>
    `;
}

async function exportToPDF() {
    const selectEl = document.getElementById('reportEmployeeSelect');
    const element = document.getElementById('reportPrintArea');

    // إذا لم يكن هناك تقرير معروض حالياً، نختار التقرير الشامل تلقائياً ليعمل الزر فوراً
    if (!element || element.classList.contains('hidden')) {
        if (selectEl) {
            selectEl.value = '__ALL__';
            loadEmployeeReport();
        }
    }

    if (!element || element.classList.contains('hidden')) {
        showHeritageToast('الرجاء اختيار الموظف أو التقرير الشامل أولاً لعرض وتصدير التقرير', 'warning');
        return;
    }

    const pdfBtn = document.getElementById('btnExportPdf');
    const oldBtnHtml = pdfBtn ? pdfBtn.innerHTML : '';
    if (pdfBtn) {
        pdfBtn.disabled = true;
        pdfBtn.innerHTML = '<span>⏳ جاري العمل، اشغل انتظارك بإستغفارك...</span>';
    }
    showHeritageToast('⏳ جاري العمل، اشغل انتظارك بإستغفارك...', 'info');

    const empName = selectEl?.value || '__ALL__';
    const fileLabel = empName === '__ALL__' ? 'الشامل_للمركز' : empName.replace(/\s+/g, '_');
    const fileName = `تقرير_تقييم_${fileLabel}_${getLocalDateString()}.pdf`;

    let tempWrapper = null;
    try {
        const logoDataUrl = await getSafeReportLogoDataUrl();
        const reportHtml = buildOfficialExecutiveReportHtml(logoDataUrl);

        tempWrapper = document.createElement('div');
        tempWrapper.style.position = 'fixed';
        tempWrapper.style.top = '0';
        tempWrapper.style.left = '0';
        tempWrapper.style.width = '794px';
        tempWrapper.style.backgroundColor = '#ffffff';
        tempWrapper.style.zIndex = '-9999';
        tempWrapper.style.opacity = '0.01';
        tempWrapper.style.pointerEvents = 'none';
        tempWrapper.innerHTML = reportHtml;
        document.body.appendChild(tempWrapper);

        await new Promise(r => setTimeout(r, 150));

        const targetNode = tempWrapper.firstElementChild || tempWrapper;
        const opt = {
            margin: [0.28, 0.25, 0.28, 0.25],
            filename: fileName,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: {
                scale: 2,
                useCORS: true,
                allowTaint: false,
                backgroundColor: '#ffffff',
                scrollX: 0,
                scrollY: 0
            },
            jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' },
            pagebreak: { mode: ['css', 'legacy'] }
        };

        await html2pdf().set(opt).from(targetNode).save();
        showHeritageToast('تم تصدير وتحميل التقرير الرسمي (PDF) بنجاح!');
    } catch (err) {
        console.warn('Direct PDF save fallback to print window:', err);
        try {
            const logoDataUrl = window.__cachedLogoBase64 || '';
            const reportHtml = buildOfficialExecutiveReportHtml(logoDataUrl);
            const printWin = window.open('', '_blank', 'width=900,height=800');
            if (printWin) {
                printWin.document.write(`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>تقرير تقييم الأداء</title><link href="https://fonts.googleapis.com/css2?family=Noto+Kufi+Arabic:wght@400;700;800;900&display=swap" rel="stylesheet"><style>@page { size: A4 portrait; margin: 10mm; } body { margin: 0; padding: 0; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }</style></head><body>${reportHtml}<script>window.onload=function(){setTimeout(function(){window.print();},400);};<\/script></body></html>`);
                printWin.document.close();
            }
        } catch (e2) {
            showHeritageToast('تعذر تصدير التقرير: ' + err.message, 'error');
        }
    } finally {
        if (tempWrapper && tempWrapper.parentNode) {
            tempWrapper.parentNode.removeChild(tempWrapper);
        }
        if (pdfBtn) {
            pdfBtn.disabled = false;
            pdfBtn.innerHTML = oldBtnHtml || '<span>تصدير التقرير PDF</span> 📥';
        }
    }
}

function exportReportToExcel() {
    const selectEl = document.getElementById('reportEmployeeSelect');
    const element = document.getElementById('reportPrintArea');
    if (!element || element.classList.contains('hidden')) {
        if (selectEl) {
            selectEl.value = '__ALL__';
            loadEmployeeReport();
        }
    }
    if (!currentReportExportRows || currentReportExportRows.length === 0) {
        showHeritageToast('لا توجد بيانات في التقرير لتصديرها إلى إكسل حالياً.', 'warning');
        return;
    }

    const headers = Object.keys(currentReportExportRows[0]);
    const csvRows = [];
    csvRows.push(headers.map(h => `"${String(h).replace(/"/g, '""')}"`).join(','));

    currentReportExportRows.forEach(row => {
        const vals = headers.map(h => {
            const val = row[h] !== undefined && row[h] !== null ? String(row[h]) : '';
            return `"${val.replace(/"/g, '""')}"`;
        });
        csvRows.push(vals.join(','));
    });

    // إضافة BOM لدعم اللغة العربية بشكل كامل في برنامج Microsoft Excel
    const csvString = '\uFEFF' + csvRows.join('\r\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const empName = document.getElementById('reportEmployeeSelect').value || 'المركز';
    const fileLabel = empName === '__ALL__' ? 'الشامل_للمركز' : empName.replace(/\s+/g, '_');

    const a = document.createElement('a');
    a.href = url;
    a.download = `تقرير_أداء_${fileLabel}_${getLocalDateString()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showHeritageToast('تم تصدير التقرير بصيغة إكسل (CSV) بنجاح!');
}

let activeEvalTask = null;
let currentSpeedScore = 30;

function openEvalModal(taskId) {
    const resolvedId = taskId || document.getElementById('mgrTaskId')?.innerText || '';
    activeEvalTask = resolvedId;
    const task = globalTasks.find(t => t.taskId === resolvedId);

    const fairSpeed = calculateFairSpeedScore(task);
    currentSpeedScore = fairSpeed.score;

    const speedDisp = document.getElementById('speedScoreDisplay');
    const speedText = document.getElementById('speedScoreText');
    if (speedDisp && speedText) {
        if (currentSpeedScore === 30) {
            speedDisp.className = 'bg-green-50 border-2 border-green-200 text-green-700 px-4 py-2 rounded-xl text-center';
        } else if (currentSpeedScore >= 10) {
            speedDisp.className = 'bg-amber-50 border-2 border-amber-200 text-amber-700 px-4 py-2 rounded-xl text-center';
        } else {
            speedDisp.className = 'bg-red-50 border-2 border-red-200 text-red-700 px-4 py-2 rounded-xl text-center';
        }
        speedText.innerHTML = `${currentSpeedScore} <span class="text-sm">/ 30</span>`;
    }

    for (let i = 1; i <= 7; i++) {
        const qEl = document.getElementById('q' + i);
        if (qEl) qEl.value = '10';
    }
    calculateLiveScore();
    document.getElementById('evalModal').classList.remove('hidden');
}

function applyDetailedEvalToForm() {
    let managerScore = 0;
    for (let i = 1; i <= 7; i++) {
        managerScore += parseInt(document.getElementById('q' + i)?.value || 0);
    }
    const customInput = document.getElementById('mgrCustomQualityInput');
    if (customInput) {
        customInput.value = String(managerScore);
        onCustomQualityInputChange(managerScore);
    }
    closeEvalModal();
    showHeritageToast(`تم نقل مجموع المعايير السبعة (${managerScore}/70) إلى حقل التقييم بنجاح!`);
}

function calculateLiveScore() {
    let managerScore = 0;
    for (let i = 1; i <= 7; i++) managerScore += parseInt(document.getElementById('q' + i).value || 0);
    const total = managerScore + currentSpeedScore;

    const totalDisp = document.getElementById('totalScoreDisplay');
    totalDisp.innerText = total + '%';
    if (total >= 85) totalDisp.className = 'text-2xl md:text-3xl font-extrabold text-green-600';
    else if (total >= 60) totalDisp.className = 'text-2xl md:text-3xl font-extrabold text-yellow-600';
    else totalDisp.className = 'text-2xl md:text-3xl font-extrabold text-red-600';
}

function closeEvalModal() {
    document.getElementById('evalModal').classList.add('hidden');
}

async function submitEvaluation() {
    let managerScore = 0;
    for (let i = 1; i <= 7; i++) managerScore += parseInt(document.getElementById('q' + i).value || 0);
    const total = managerScore + currentSpeedScore;

    const btn = document.getElementById('btnSubmitEval');
    const msgBox = document.getElementById('evalMsg');
    const oldText = btn.innerText;

    btn.innerText = '⏳ جاري العمل، اشغل انتظارك بإستغفارك...';
    btn.disabled = true;
    msgBox.innerText = '⏳ جاري العمل، اشغل انتظارك بإستغفارك...';
    msgBox.className = 'p-4 rounded-xl font-bold text-sm bg-blue-50 text-blue-700 block mt-4 text-center';

    try {
        const latestTask = await fetchLatestTaskFromDb(activeEvalTask);
        const note = document.getElementById('mgrTaskNote')?.value.trim() || '';
        const replyObj = {
            sender: 'manager',
            date: new Date().toISOString(),
            status: 'مغلق ومُقيم',
            reply: `✅ تم إغلاق التكليف واعتماد التقييم التفصيلي من الإدارة (${total}%)${note ? '\nملاحظة الإدارة: ' + note : ''}`,
            attachmentUrl: ''
        };
        const currentHistory = (latestTask && Array.isArray(latestTask.replyHistory)) ? [...latestTask.replyHistory, replyObj] : [replyObj];
        const updatePayload = {
            taskStatus: 'مغلق ومُقيم',
            speedScore: String(currentSpeedScore),
            managerScore: String(managerScore),
            replyHistory: currentHistory
        };

        const { error } = await supabaseClient
            .from('tasks')
            .update(updatePayload)
            .eq('taskId', activeEvalTask);

        if (error) throw new Error(error.message);

        const idx = globalTasks.findIndex(t => t.taskId === activeEvalTask);
        if (idx !== -1) {
            globalTasks[idx] = { ...globalTasks[idx], ...updatePayload };
            saveLocalTasksCache();
        }

        msgBox.className = 'hidden';
        showHeritageToast(`تم التقييم وإغلاق التكليف بنجاح! النتيجة الإجمالية: ${total}%`);
        closeEvalModal();
        closeManagerTaskAction();
        renderManagerDashboardImmediateState();
        refreshManagerTasksOnly();
    } catch (err) {
        msgBox.innerText = '❌ فشل الاتصال: ' + err.message;
        msgBox.className = 'p-4 rounded-xl font-bold text-sm bg-red-50 text-red-700 block mt-4 text-center';
    }
    btn.innerText = oldText;
    btn.disabled = false;
}

// ==========================================
// إنشاء تكليف جديد (مع ثبات الجهة الطالبة وتوجيه الواتساب للفرد والجماعة)
// ==========================================
function generateSecureId() {
    return 'TSK-' + Math.random().toString(36).substr(2, 6).toUpperCase();
}
function generateBatchId() {
    return 'GRP-' + Math.random().toString(36).substr(2, 6).toUpperCase();
}
function toggleCheckboxDropdown() {
    const dd = document.getElementById('checkboxDropdown');
    if (!dd) return;
    dd.classList.toggle('hidden');
    if (!dd.classList.contains('hidden')) {
        const inp = document.getElementById('taskEmpSearchInput');
        if (inp) inp.focus();
    }
}
function updateMultiSelectLabel() {
    const checkboxes = document.querySelectorAll('.emp-checkbox:checked');
    const chipsContainer = document.getElementById('taskSelectedEmpChips');
    const searchInput = document.getElementById('taskEmpSearchInput');
    const countBadge = document.getElementById('taskEmpSelectedCountBadge');

    if (chipsContainer) {
        chipsContainer.innerHTML = '';
        checkboxes.forEach(cb => {
            const val = cb.value || '';
            const name = val.split('|')[1] || val;
            const safeVal = escapeJsStr(val);
            chipsContainer.innerHTML += `
                <span class="inline-flex items-center gap-1.5 bg-primary/10 text-primary border border-primary/25 px-2.5 py-1 rounded-xl text-xs font-extrabold shadow-sm">
                    <span>👤 ${escapeHtml(name)}</span>
                    <button type="button" onclick="removeTaskEmployeeChip('${safeVal}', event)" class="text-primary hover:text-red-600 font-black px-1 rounded-full hover:bg-white/70 transition" title="إزالة">✕</button>
                </span>
            `;
        });
    }

    if (countBadge) {
        countBadge.innerText = `${checkboxes.length} محدد`;
    }

    if (searchInput) {
        searchInput.placeholder = checkboxes.length === 0 ? 'اكتب اسم الموظف أو اختر من القائمة...' : 'أضف موظفاً آخر...';
    }
}
function selectAllCheckboxes(check) {
    const searchInp = document.getElementById('taskEmpSearchInput');
    const hasFilter = searchInp && searchInp.value.trim().length > 0;
    document.querySelectorAll('.emp-checkbox').forEach(cb => {
        const row = cb.closest('.emp-checkbox-row');
        if (check && hasFilter && row && row.classList.contains('hidden')) return;
        cb.checked = check;
    });
    if (!check && searchInp) {
        searchInp.value = '';
        filterTaskEmployeesList('');
    }
    updateMultiSelectLabel();
}

window.toggleRequesterOther = function () {
    const select = document.getElementById('requesterNameSelect');
    const otherInput = document.getElementById('requesterNameOther');
    if (select && otherInput) {
        localStorage.setItem('lastRequesterSelect', select.value);
        if (select.value === 'أخرى') {
            otherInput.classList.remove('hidden');
        } else {
            otherInput.classList.add('hidden');
        }
    }
};

async function createTask() {
    const reqSelectEl = document.getElementById('requesterNameSelect');
    const reqOtherEl = document.getElementById('requesterNameOther');
    const reqSelect = reqSelectEl.value;
    const reqOther = reqOtherEl.value.trim();
    const requester = reqSelect === 'أخرى' ? reqOther : reqSelect;

    const title = document.getElementById('taskTitle').value.trim();

    // إذا كتب المدير اسم الموظف يدوياً في خانة البحث وضغط حفظ مباشرة دون الضغط على Enter، نعتمد الاسم تلقائياً
    const searchInputEl = document.getElementById('taskEmpSearchInput');
    if (document.querySelectorAll('.emp-checkbox:checked').length === 0 && searchInputEl && searchInputEl.value.trim()) {
        addCustomTaskEmployee();
    }

    const checkboxes = document.querySelectorAll('.emp-checkbox:checked');
    const selectedEmployeesArray = [];
    checkboxes.forEach(cb => {
        const [phone, name] = cb.value.split('|');
        selectedEmployeesArray.push({ phone, name });
    });

    const desc = document.getElementById('taskDesc').value.trim();
    const date = document.getElementById('taskDate').value;
    const priority = document.getElementById('taskPriority').value;
    const file = document.getElementById('managerTaskFile').files[0];
    const msgBox = document.getElementById('createMsg');
    const btn = document.getElementById('btnCreate');

    if (!requester || !title || selectedEmployeesArray.length === 0 || !desc || !date) {
        msgBox.innerText = 'يرجى إكمال جميع الحقول الإلزامية وتحديد موظف واحد على الأقل!';
        msgBox.className = 'p-4 rounded-2xl font-bold text-sm bg-red-50 text-red-700 block mt-4';
        return;
    }

    if (file && file.size > 25 * 1024 * 1024) {
        msgBox.innerText = 'حجم الملف يتجاوز 25 ميجا!';
        msgBox.className = 'p-4 rounded-2xl font-bold text-sm bg-red-50 text-red-700 block mt-4';
        return;
    }

    // حفظ الجهة الطالبة لتبقى ثابتة وغير متغيرة بعد الإرسال
    localStorage.setItem('lastRequesterSelect', reqSelect);
    localStorage.setItem('lastRequesterOther', reqOther);

    msgBox.innerText = '⏳ جاري العمل، اشغل انتظارك بإستغفارك...';
    msgBox.className = 'p-4 rounded-2xl font-bold text-sm bg-blue-50 text-blue-700 block mt-4';
    btn.disabled = true;

    try {
        let fileUrl = '';
        if (file) {
            msgBox.innerText = '⏳ جاري العمل، اشغل انتظارك بإستغفارك...';
            fileUrl = await uploadFileToSupabase(file);
        } else if (convertedMessageAttachmentUrl) {
            fileUrl = convertedMessageAttachmentUrl;
        }

        const combinedDetails = `العنوان: ${title}\nالأولوية: ${priority}\n\nالتفاصيل:\n${desc}`;
        let replyHistory = [];
        if (fileUrl) {
            replyHistory.push({
                sender: 'manager',
                date: new Date().toISOString(),
                status: 'تكليف جديد (مرفق)',
                reply: 'مرفقات التكليف من الإدارة',
                attachmentUrl: fileUrl
            });
        }

        const isMultiple = selectedEmployeesArray.length > 1;
        const batchId = isMultiple ? generateBatchId() : null;
        const rowsToInsert = [];

        for (let i = 0; i < selectedEmployeesArray.length; i++) {
            const emp = selectedEmployeesArray[i];
            const empTaskId = generateSecureId();
            const directLink = `${getCleanPlatformBaseUrl()}?id=${empTaskId}`;

            rowsToInsert.push({
                taskId: empTaskId,
                createdAt: new Date().toISOString(),
                requesterName: requester,
                employeeName: emp.name,
                employeePhone: emp.phone,
                taskDetails: combinedDetails,
                dueDate: date,
                taskStatus: 'مرسل',
                taskLink: directLink,
                replyHistory: replyHistory,
                batchId: batchId
            });
        }

        const { error } = await supabaseClient.from('tasks').insert(rowsToInsert);
        if (error) throw new Error(error.message);

        // تحديث الذاكرة المحلية فوراً
        globalTasks = [...rowsToInsert, ...globalTasks];
        saveLocalTasksCache();

        // تجهيز وتوجيه رسالة الواتساب (عند إنشاء تكليف جديد فقط)
        if (document.getElementById('sendWhatsAppCb').checked) {
            if (!isMultiple) {
                const singleTask = rowsToInsert[0];
                const waMsg = buildTaskWhatsAppMessage({
                    requester,
                    title,
                    priority,
                    date,
                    desc,
                    link: singleTask.taskLink
                });
                openWhatsApp(singleTask.employeePhone, waMsg);
            } else {
                const smartGroupLink = `${getCleanPlatformBaseUrl()}?batch=${batchId}`;
                const waGroupMsg = buildTaskWhatsAppMessage({
                    requester,
                    title,
                    priority,
                    date,
                    desc,
                    link: smartGroupLink
                });
                openWhatsApp('', waGroupMsg);
            }
        }

        msgBox.innerHTML = `✅ تم اعتماد وحفظ التكليف لعدد (${rowsToInsert.length}) موظف بنجاح! <span class="text-xs font-normal">(الجهة الطالبة محفوظة للتكليف القادم)</span>`;
        msgBox.className = 'p-4 rounded-2xl font-bold text-sm bg-green-50 text-green-700 block mt-4';

        // الإبقاء على اسم الجهة المرسلة ثابتاً بدون تغيير وتفريغ باقي الحقول فقط
        document.getElementById('taskTitle').value = '';
        document.getElementById('taskDesc').value = '';
        document.getElementById('taskDate').value = '';
        document.getElementById('taskPriority').value = 'عادي';
        document.getElementById('managerTaskFile').value = '';
        if (searchInputEl) searchInputEl.value = '';
        clearConvertedMsgAttachment();
        selectAllCheckboxes(false);
        document.getElementById('checkboxDropdown')?.classList.add('hidden');

        setTimeout(() => msgBox.classList.add('hidden'), 5000);
    } catch (err) {
        msgBox.innerText = 'حدث خطأ: ' + err.message;
        msgBox.className = 'p-4 rounded-2xl font-bold text-sm bg-red-50 text-red-700 block mt-4';
    }
    btn.disabled = false;
}

// ==========================================
// عرض تفاصيل التكليف والردود لدى الموظف (بسرعة فائقة)
// ==========================================
function toggleEmpExtensionDateInput() {
    const selectEl = document.getElementById('empStatusSelect');
    const extBox = document.getElementById('empRequestedExtensionBox');
    const extDateInput = document.getElementById('empRequestedDueDate');
    if (!selectEl || !extBox) return;

    if (selectEl.value === 'طلب تمديد موعد') {
        extBox.classList.remove('hidden');
        if (extDateInput && !extDateInput.value && window.currentLoadedTask?.dueDate) {
            extDateInput.value = window.currentLoadedTask.dueDate;
        }
    } else {
        extBox.classList.add('hidden');
    }
}

function renderEmployeeTaskViewDOM(task) {
    if (!task) return;
    window.currentLoadedTask = task;

    // إعادة ضبط حقل تاريخ التمديد المقترح ليطابق التكليف المفتوح حالياً
    const extDateInput = document.getElementById('empRequestedDueDate');
    if (extDateInput) {
        extDateInput.value = getTaskRequestedExtensionDate(task) || task.dueDate || '';
    }

    let title = 'تكليف عمل';
    let priority = 'عادي';
    let desc = task.taskDetails || '';

    let cleanDesc = desc;
    if (desc.includes('العنوان:')) {
        const lines = desc.split('\n');
        title = lines[0].replace('العنوان: ', '');
        if (lines.length > 1) priority = lines[1].replace('الأولوية: ', '');
        cleanDesc = lines.slice(3).join('\n');
    }
    cleanDesc = cleanDesc.replace('التفاصيل:', '').trim();

    document.getElementById('empTaskTitle').innerText = title;
    document.getElementById('empTaskDesc').innerText = 'تفاصيل التكليف: -\n' + cleanDesc;
    document.getElementById('empTaskPriority').innerText = priority;

    // عرض الموعد الأصلي قبل التمديد إن وجد
    const empOrigDueBadge = document.getElementById('empOriginalDueDateBadge');
    const origDue = getTaskOriginalDueDate(task);
    if (empOrigDueBadge) {
        if (origDue) {
            empOrigDueBadge.innerText = `(الموعد الأصلي قبل التمديد: ${origDue})`;
            empOrigDueBadge.classList.remove('hidden');
        } else {
            empOrigDueBadge.classList.add('hidden');
        }
    }

    // عرض صندوق المرفقات البارز في أعلى بطاقة الموظف
    renderTaskAttachmentsBox('empAttachmentContainer', task);

    const banner = document.getElementById('empUrgencyBanner');
    const statusBadge = document.getElementById('empTaskStatusBadge');
    const timeBadge = document.getElementById('empTaskTimeBadge');

    if (statusBadge) {
        statusBadge.innerText = task.taskStatus || 'جديد';
        statusBadge.classList.remove('hidden', 'bg-green-100', 'text-green-700', 'bg-teal-100', 'text-teal-700', 'bg-gray-100', 'text-gray-700', 'bg-red-100', 'text-red-700', 'bg-blue-100', 'text-blue-700', 'bg-orange-100', 'text-orange-700', 'bg-amber-100', 'text-amber-800');
        if (task.taskStatus === 'جاهز للمراجعة') statusBadge.classList.add('bg-green-100', 'text-green-700');
        else if (task.taskStatus === 'تم الاطلاع') statusBadge.classList.add('bg-teal-100', 'text-teal-700');
        else if (task.taskStatus === 'مغلق ومُقيم' || task.taskStatus === 'ملغي') statusBadge.classList.add('bg-gray-100', 'text-gray-700');
        else if (task.taskStatus === 'مرتجع للتعديل') {
            statusBadge.innerText = '↩️ مرتجع للتعديل';
            statusBadge.classList.add('bg-amber-100', 'text-amber-800');
        }
        else if (task.taskStatus === 'متوقف لعائق') statusBadge.classList.add('bg-red-100', 'text-red-700');
        else if (task.taskStatus === 'طلب تمديد موعد') statusBadge.classList.add('bg-orange-100', 'text-orange-700');
        else statusBadge.classList.add('bg-blue-100', 'text-blue-700');
    }

    if (task.taskStatus !== 'مغلق ومُقيم' && task.taskStatus !== 'ملغي' && task.taskStatus !== 'جاهز للمراجعة' && task.dueDate) {
        const due = new Date(task.dueDate);
        due.setHours(23, 59, 59);
        const start = new Date(task.createdAt || Date.now()).getTime();
        const now = new Date().getTime();

        let totalDuration = Math.max(1, due.getTime() - start);
        let elapsed = now - start;
        let ratio = Math.max(0, Math.min(1, elapsed / totalDuration));

        const diffDays = Math.ceil((due.getTime() - now) / (1000 * 60 * 60 * 24));
        if (diffDays < 0) ratio = 1;

        let hue = Math.floor(120 * (1 - ratio));

        if (timeBadge) {
            timeBadge.classList.remove('hidden');
            timeBadge.style.backgroundColor = `hsl(${hue}, 80%, 95%)`;
            timeBadge.style.color = `hsl(${hue}, 80%, 35%)`;
            timeBadge.style.borderColor = `hsl(${hue}, 80%, 80%)`;

            if (diffDays < 0) timeBadge.innerHTML = `متأخر ${Math.abs(diffDays)} يوم ⚠️`;
            else if (diffDays === 0) timeBadge.innerHTML = `ينتهي اليوم! ⏳`;
            else timeBadge.innerHTML = `متبقي ${diffDays} أيام`;
        }

        banner.classList.remove('hidden', 'bg-green-100', 'text-green-800', 'border-green-300', 'bg-yellow-100', 'text-yellow-800', 'border-yellow-300', 'bg-red-100', 'text-red-800', 'border-red-300', 'bg-amber-100', 'text-amber-900', 'border-amber-300');
        if (task.taskStatus === 'مرتجع للتعديل') {
            banner.classList.add('bg-amber-100', 'text-amber-900', 'border-amber-300');
            banner.innerHTML = `↩️ تنبيه هام: تم إرجاع هذا التكليف من الإدارة للتعديل واستكمال الملاحظات (راجع سجل المحادثة بالأسفل).`;
        } else if (diffDays < 0) {
            banner.classList.add('bg-red-100', 'text-red-800', 'border-red-300');
            banner.innerHTML = `تحذير ⚠️: لقد تجاوزت الموعد المحدد بـ ${Math.abs(diffDays)} أيام. يرجى إنجاز التكليف فوراً أو إرسال طلب تمديد.`;
        } else if (diffDays === 0) {
            banner.classList.add('bg-yellow-100', 'text-yellow-800', 'border-yellow-300');
            banner.innerHTML = `تنبيه ⏳: ينتهي هذا التكليف اليوم!`;
        } else {
            banner.classList.add('bg-green-100', 'text-green-800', 'border-green-300');
            banner.innerHTML = `الوقت المتبقي: ${diffDays} أيام. أمامك متسع من الوقت للعمل بشكل متقن.`;
        }
    } else {
        banner.classList.add('hidden');
        if (timeBadge) timeBadge.classList.add('hidden');
    }

    let dDate = task.dueDate;
    try { dDate = getLocalDateString(dDate); } catch (e) {}
    document.getElementById('empTaskDueDate').innerText = dDate || 'غير محدد';
    document.getElementById('empTaskRequester').innerText = task.requesterName || 'غير محدد';

    const selectEl = document.getElementById('empStatusSelect');
    const submitBtn = document.getElementById('btnSubmitEmpReply');
    if (selectEl) selectEl.disabled = false;
    if (submitBtn) submitBtn.disabled = false;

    document.getElementById('empReplyMsg').disabled = false;
    document.getElementById('empFile').disabled = false;
    document.getElementById('replyMsg').classList.add('hidden');

    if (task.taskStatus) {
        if (selectEl) {
            let found = false;
            for (let opt of selectEl.options) {
                if (task.taskStatus.includes(opt.value)) {
                    selectEl.value = opt.value;
                    found = true;
                    break;
                }
            }
            if (!found) selectEl.value = 'جاري العمل';
        }

        if (task.taskStatus === 'جاهز للمراجعة' || task.taskStatus === 'مغلق ومُقيم' || task.taskStatus === 'ملغي') {
            document.getElementById('empReplyMsg').disabled = true;
            document.getElementById('empReplyMsg').placeholder = 'تم قفل هذا التكليف.';
            document.getElementById('empFile').disabled = true;
            if (selectEl) selectEl.disabled = true;
            if (submitBtn) submitBtn.disabled = true;

            const msgBox = document.getElementById('replyMsg');
            msgBox.innerText = '🔒 تم قفل هذا التكليف لأن حالته: ' + task.taskStatus;
            msgBox.className = 'p-4 rounded-xl font-bold text-sm bg-gray-100 text-gray-700 block mt-4 text-center border';
        }
    }

    toggleEmpExtensionDateInput();

    const chatHistory = document.getElementById('chatHistory');
    chatHistory.innerHTML = '';
    chatHistory.classList.add('bg-[#efeae2]', 'p-4', 'rounded-2xl', 'flex', 'flex-col');

    let createdDate = task.createdAt || Date.now();
    let cDateStr = '';
    try {
        const cd = new Date(createdDate);
        cDateStr = cd.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) + ' - ' + cd.toLocaleDateString('ar-SA');
    } catch (e) {}

    chatHistory.innerHTML += `
        <div class="max-w-[85%] md:max-w-[70%] mr-auto bg-white rounded-tr-none p-3 rounded-2xl shadow-sm relative mb-2 border border-black/5">
            <div class="text-[11px] font-extrabold text-[#075e54] mb-1">~ ${escapeHtml(task.requesterName || 'الجهة الطالبة للتكليف')}</div>
            <div class="whitespace-pre-wrap text-[15px] leading-relaxed text-gray-800 font-medium">${escapeHtml(cleanDesc)}</div>
            <div class="text-[10px] text-gray-500 mt-1 flex justify-end items-center gap-1" dir="ltr">
                <span>${cDateStr}</span>
            </div>
        </div>
    `;

    if (task.replyHistory && task.replyHistory.length > 0) {
        const history = [...task.replyHistory];
        history.forEach(item => {
            let dateStr = item.date;
            try {
                const d = new Date(item.date);
                dateStr = d.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) + ' - ' + d.toLocaleDateString('ar-SA');
            } catch (e) {}

            let isManager = false;
            if (item.sender) {
                isManager = (item.sender === 'manager');
            } else {
                const stStr = String(item.status || '');
                isManager = stStr.includes('تقييم') || stStr.includes('إرجاع') || stStr.includes('إعادة فتح') || stStr.includes('تحديث من الإدارة') || stStr.includes('إلغاء') || stStr.includes('تمديد') || (item.reply && (item.reply.includes('تم إرجاع') || item.reply.includes('من الإدارة') || item.reply.startsWith('👑') || item.reply.startsWith('✅') || item.reply.startsWith('❌') || item.reply.startsWith('📅') || item.reply.startsWith('↩️') || item.reply.startsWith('💬') || item.reply.startsWith('🔓')));
            }

            let alignmentClass = isManager ? 'mr-auto bg-white rounded-tr-none' : 'ml-auto bg-[#dcf8c6] rounded-tl-none';
            let senderName = isManager ? `~ ${escapeHtml(task.requesterName || 'الجهة الطالبة للتكليف')}` : `~ أنا`;
            let nameColor = isManager ? 'text-[#075e54]' : 'text-gray-500';
            let textMsg = item.reply || '';

            chatHistory.innerHTML += `
                <div class="max-w-[85%] md:max-w-[70%] ${alignmentClass} p-3 rounded-2xl shadow-sm relative mb-2 border border-black/5">
                    <div class="text-[11px] font-extrabold ${nameColor} mb-1 flex justify-between">
                        <span>${senderName}</span>
                        <span class="bg-black/5 px-2 py-0.5 rounded text-[9px] font-mono">${escapeHtml(item.status || '')}</span>
                    </div>
                    <div class="whitespace-pre-wrap text-[15px] leading-relaxed text-gray-800 font-medium">${escapeHtml(textMsg)}</div>
                    ${item.requestedDueDate ? `<div class="mt-1.5 text-xs font-extrabold text-orange-800 bg-orange-50 px-2.5 py-1 rounded-lg border border-orange-200 inline-block">📅 التاريخ المطلوب للتمديد: ${escapeHtml(item.requestedDueDate)}</div>` : ''}
                    ${item.attachmentUrl ? `<a href="${escapeHtml(item.attachmentUrl)}" target="_blank" class="inline-flex items-center gap-1 mt-2 bg-black/5 px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-black/10 transition">📎 عرض المرفق</a>` : ''}
                    <div class="text-[10px] text-gray-500 mt-1 flex justify-end items-center gap-1" dir="ltr">
                        <span>${dateStr}</span>
                        ${!isManager ? '<span class="text-[#53bdeb] text-xs leading-none tracking-tighter">✓✓</span>' : ''}
                    </div>
                </div>
            `;
        });
    }
    setTimeout(() => { chatHistory.scrollTop = chatHistory.scrollHeight; }, 100);
}

async function loadTaskData(id) {
    document.getElementById('globalBackBtn')?.classList.remove('hidden');
    document.getElementById('empTaskId').innerText = id;

    // عرض فوري (0 ملي ثانية) من الذاكرة المخبأة إن وجدت ريثما تكتمل مزامنة سجل المحادثة
    const cachedTask = (window.empGlobalTasks && window.empGlobalTasks.find(t => t.taskId === id)) || globalTasks.find(t => t.taskId === id);
    if (cachedTask) {
        renderEmployeeTaskViewDOM(cachedTask);
    } else {
        document.getElementById('empTaskDesc').innerText = '⏳ جاري العمل، اشغل انتظارك بإستغفارك...';
        document.getElementById('empTaskTitle').innerText = '⏳ جاري العمل، اشغل انتظارك بإستغفارك...';
    }

    const { data: task, error } = await supabaseClient
        .from('tasks')
        .select('*')
        .eq('taskId', id)
        .single();

    if (error || !task) {
        if (!cachedTask) {
            document.getElementById('empTaskDesc').innerText = '❌ لم يتم العثور على التكليف المطلوب.';
            document.getElementById('empTaskTitle').innerText = 'غير موجود';
        }
        return;
    }

    // حماية خصوصية التكاليف: إذا كان الموظف مسجل دخول وفتح رابط تكليف يخص زميل آخر
    if (loggedInEmployee && localStorage.getItem('adminLoggedIn') !== 'true') {
        if (!isTaskForEmployee(task, loggedInEmployee)) {
            showHeritageToast('عذراً، هذا التكليف خاص بزميل آخر ولا يمكنك الاطلاع عليه.', 'warning');
            backToEmployeeDashboard();
            return;
        }
    }

    // تحديث تلقائي لحالة التكليف من (مرسل) إلى (تم الاطلاع) بمجرد فتح الموظف للتكليف
    const isAdminViewing = (localStorage.getItem('adminLoggedIn') === 'true');
    if (!isAdminViewing && (!task.taskStatus || task.taskStatus === 'مرسل' || task.taskStatus === 'جديد')) {
        const readTimeStr = new Date().toISOString();
        const readHistoryItem = {
            sender: 'employee',
            date: readTimeStr,
            status: 'تم الاطلاع',
            reply: '👁️ تم استلام التكليف والاطلاع على تفاصيله من قِبل الموظف.',
            attachmentUrl: ''
        };
        const updatedReadHistory = Array.isArray(task.replyHistory) ? [...task.replyHistory, readHistoryItem] : [readHistoryItem];
        task.taskStatus = 'تم الاطلاع';
        task.replyHistory = updatedReadHistory;

        window.__ignoreRealtimeTaskUntil = Date.now() + 2500;
        supabaseClient
            .from('tasks')
            .update({ taskStatus: 'تم الاطلاع', replyHistory: updatedReadHistory })
            .eq('taskId', id)
            .then(() => {
                const idx = (window.empGlobalTasks || []).findIndex(t => t.taskId === id);
                if (idx !== -1) {
                    window.empGlobalTasks[idx].taskStatus = 'تم الاطلاع';
                    window.empGlobalTasks[idx].replyHistory = updatedReadHistory;
                }
                const gIdx = globalTasks.findIndex(t => t.taskId === id);
                if (gIdx !== -1) {
                    globalTasks[gIdx].taskStatus = 'تم الاطلاع';
                    globalTasks[gIdx].replyHistory = updatedReadHistory;
                    saveLocalTasksCache();
                }
                renderEmployeeDashboardCounters();
            });
    }

    renderEmployeeTaskViewDOM(task);
}

async function submitEmpReply() {
    const status = document.getElementById('empStatusSelect').value;
    const replyMsg = document.getElementById('empReplyMsg').value.trim();
    const requestedDueDate = document.getElementById('empRequestedDueDate')?.value || '';
    const file = document.getElementById('empFile').files[0];
    const msgBox = document.getElementById('replyMsg');
    const submitBtn = document.getElementById('btnSubmitEmpReply');

    if (!replyMsg) {
        msgBox.innerText = 'يرجى كتابة التفاصيل أو التحديث في المربع أولاً!';
        msgBox.className = 'p-4 rounded-xl font-bold text-sm bg-red-50 text-red-700 block mt-4';
        return;
    }
    if (status === 'طلب تمديد موعد' && !requestedDueDate) {
        msgBox.innerText = 'يرجى تحديد التاريخ الجديد المقترح للتسليم في حقل طلب التمديد!';
        msgBox.className = 'p-4 rounded-xl font-bold text-sm bg-orange-50 text-orange-800 block mt-4';
        return;
    }
    if (file && file.size > 25 * 1024 * 1024) {
        msgBox.innerText = 'حجم الملف يتجاوز 25 ميجا!';
        msgBox.className = 'p-4 rounded-xl font-bold text-sm bg-red-50 text-red-700 block mt-4';
        return;
    }

    const oldBtnHtml = submitBtn ? submitBtn.innerHTML : '';
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.classList.add('opacity-50');
        submitBtn.innerHTML = '<span>⏳ جاري العمل، اشغل انتظارك بإستغفارك...</span>';
    }

    msgBox.innerText = '⏳ جاري العمل، اشغل انتظارك بإستغفارك...';
    msgBox.className = 'p-4 rounded-xl font-bold text-sm bg-blue-50 text-blue-700 block mt-4';

    try {
        // جلب أحدث نسخة من قاعدة البيانات أولاً لضمان عدم مسح أي ملاحظة أو تمديد أضافه المدير في نفس اللحظة
        let baseTask = await fetchLatestTaskFromDb(currentTaskId);
        if (!baseTask && window.currentLoadedTask && window.currentLoadedTask.taskId === currentTaskId) {
            baseTask = window.currentLoadedTask;
        }
        if (!baseTask) {
            throw new Error('لم يتم العثور على التكليف في قاعدة البيانات');
        }

        let fileUrl = '';
        if (file) {
            fileUrl = await uploadFileToSupabase(file);
        }

        const finalReplyText = (status === 'طلب تمديد موعد' && requestedDueDate)
            ? `${replyMsg}\n📅 التاريخ المقترح للتمديد: ${requestedDueDate}`
            : replyMsg;

        const replyObj = {
            sender: 'employee',
            date: new Date().toISOString(),
            status: status,
            reply: finalReplyText,
            requestedDueDate: status === 'طلب تمديد موعد' ? requestedDueDate : undefined,
            attachmentUrl: fileUrl
        };

        const updatedHistory = Array.isArray(baseTask.replyHistory) ? [...baseTask.replyHistory, replyObj] : [replyObj];
        let updateData = {
            taskStatus: status,
            replyHistory: updatedHistory
        };
        // الحفاظ على أول تاريخ تسليم (submittedAt) لضمان عدالة احتساب نقاط السرعة حتى لو أُرجعت المهمة للتعديل
        if (status === 'جاهز للمراجعة' && !baseTask.submittedAt) {
            updateData.submittedAt = new Date().toISOString();
        }

        window.__ignoreRealtimeTaskUntil = Date.now() + 2500;
        const { error: updErr } = await supabaseClient
            .from('tasks')
            .update(updateData)
            .eq('taskId', currentTaskId);

        if (updErr) throw new Error(updErr.message);

        // تحديث فوري للواجهة والذاكرة في 0 ملي ثانية بدون انتظار جولة اتصال إضافية
        const updatedTaskObj = { ...baseTask, ...updateData };
        window.currentLoadedTask = updatedTaskObj;
        const gIdx = globalTasks.findIndex(t => t.taskId === currentTaskId);
        if (gIdx !== -1) {
            globalTasks[gIdx] = updatedTaskObj;
            saveLocalTasksCache();
        }
        if (Array.isArray(window.empGlobalTasks)) {
            const eIdx = window.empGlobalTasks.findIndex(t => t.taskId === currentTaskId);
            if (eIdx !== -1) window.empGlobalTasks[eIdx] = updatedTaskObj;
        }

        document.getElementById('empReplyMsg').value = '';
        document.getElementById('empFile').value = '';
        renderEmployeeTaskViewDOM(updatedTaskObj);
        renderEmployeeDashboardCounters();

        msgBox.innerText = '✅ تم إرسال التحديث بنجاح!';
        msgBox.className = 'p-4 rounded-xl font-bold text-sm bg-green-50 text-green-700 block mt-4';
        showHeritageToast('تم إرسال التحديث وحفظه في النظام بنجاح!');

        setTimeout(() => msgBox.classList.add('hidden'), 3000);
    } catch (err) {
        msgBox.innerText = 'فشل الاتصال: ' + err.message;
        msgBox.className = 'p-4 rounded-xl font-bold text-sm bg-red-50 text-red-700 block mt-4';
    }

    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.classList.remove('opacity-50');
        submitBtn.innerHTML = oldBtnHtml || '<span>إرسال التحديث</span><span class="text-xl">🚀</span>';
    }
}

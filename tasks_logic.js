// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBLsloMWYMdQ95b_D6BG_F8rpl9-HieOUM",
    authDomain: "taskmanager-8b075.firebaseapp.com",
    projectId: "taskmanager-8b075",
    storageBucket: "taskmanager-8b075.firebasestorage.app",
    messagingSenderId: "101642103436",
    appId: "1:101642103436:web:e560e50900b8cff4ace9a9",
    measurementId: "G-1RPS225NFR"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const scriptURL = 'https://script.google.com/macros/s/AKfycbyeEUhqgUNkWSI3ABNVB8L6jPnt1EphHWC26I2G8b5MHX8menDOLsN6nCtr66-NyVA/exec';

function sendSmsDirect(phone, message) {
    const url = "https://www.kwtsms.com/API/send/?username=alturath&password=nPjKfNvZQjQ97E@&sender=TrathFrwnya&mobile=" + phone + "&message=" + encodeURIComponent(message) + "&lang=3&test=0";
    fetch(url, { mode: 'no-cors' }).catch(e => console.log('SMS Direct Error:', e));
}

async function checkAndSendReminders() {
    try {
        const todayStr = getLocalDateString(new Date());
        const reminderDoc = await db.collection('System').doc('Reminders').get();
        if (reminderDoc.exists && reminderDoc.data().lastSentDate === todayStr) {
            return; // Already sent today
        }

        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = getLocalDateString(tomorrow);

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = getLocalDateString(yesterday);

        const snapshot = await db.collection('Tasks').where('dueDate', 'in', [tomorrowStr, yesterdayStr]).get();
        let count = 0;
        snapshot.forEach(doc => {
            const t = doc.data();
            if (t.taskStatus !== 'مغلق ومُقيم' && t.taskStatus !== 'ملغي' && t.taskStatus !== 'جاهز للمراجعة') {
                let empPhone = t.employeePhone;
                if (!empPhone) {
                    // Try to find in employeesData if not saved in task
                    try {
                        const e = employeesData.find(emp => emp.name === t.employeeName);
                        if (e) empPhone = e.phone;
                    } catch (e) { }
                }
                if (empPhone) {
                    let title = String(t.taskDetails || '').split('\n')[0].replace('العنوان: ', '');
                    if (!title) title = 'تكليف: ' + t.taskId;
                    const taskUrl = window.location.origin + window.location.pathname + '?id=' + t.taskId;
                    const requester = t.requesterName || 'الإدارة';
                    
                    let msg = '';
                    if (t.dueDate === tomorrowStr) {
                        msg = `تذكير !\nيوجد لديك تكليف يجب تسليمه غداً\nمن / ${requester}\nالتكليف :-\n(${title})\n\nللتفاصيل يرجى الدخول على الرابط التالي:-\n${taskUrl}`;
                    } else if (t.dueDate === yesterdayStr) {
                        msg = `تنبيه عاجل !\nانتهت مدة التكليف البارحة ولم تقم بإنجازه\nمن / ${requester}\nالتكليف :-\n(${title})\nيرجى إنجازه فوراً لتجنب الخصم.\n\nالرابط:-\n${taskUrl}`;
                    }

                    if (msg !== '') {
                        sendSmsDirect(empPhone, msg);
                        count++;
                    }
                }
            }
        });

        await db.collection('System').doc('Reminders').set({ lastSentDate: todayStr }, { merge: true });
        console.log(`Reminders sent for ${count} tasks.`);
    } catch (err) {
        console.log('Reminder Error:', err);
    }
}

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

const ADMIN_PIN = '1234';

const employeesData = [
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

let currentTaskId = null;
let selectedStatus = null;
let globalTasks = [];
let loggedInEmployee = null;
let unsubscribeDashboard = null;
let unsubscribeTask = null;

window.onload = () => {
    checkAndSendReminders();
    try {
        const today = getLocalDateString();
        const dDate = document.getElementById('taskDate');
        if (dDate) dDate.setAttribute('min', today);
    } catch (e) { }

    try {
        const container = document.getElementById('checkboxesContainer');
        if (container) {
            container.innerHTML = '';
            employeesData.forEach((emp, idx) => {
                const div = document.createElement('div');
                div.className = 'flex items-center gap-2 hover:bg-surface p-1 rounded transition';
                div.innerHTML = `
                    <input type="checkbox" id="empCheckbox_${idx}" class="emp-checkbox w-4 h-4 text-primary rounded border-line focus:ring-primary cursor-pointer" value="${emp.phone}|${emp.name}" onchange="updateMultiSelectLabel()">
                    <label for="empCheckbox_${idx}" class="text-sm font-semibold text-ink cursor-pointer flex-1">${emp.name}</label>
                `;
                container.appendChild(div);
            });
        }

        document.addEventListener('click', function (e) {
            const toggle = document.getElementById('multiSelectToggle');
            const dropdown = document.getElementById('checkboxDropdown');
            if (toggle && dropdown) {
                if (!toggle.contains(e.target) && !dropdown.contains(e.target)) {
                    dropdown.classList.add('hidden');
                }
            }
        });
    } catch (e) { }

    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');

    if (id) {
        currentTaskId = id;
        document.getElementById('employeeSection').classList.remove('hidden');
        loadTaskData(id);
        if (localStorage.getItem('empId')) document.getElementById('logoutBtn').classList.remove('hidden');
        return;
    }

    const adminLogged = localStorage.getItem('adminLoggedIn');
    const savedEmpId = localStorage.getItem('empId');

    if (adminLogged === 'true') {
        document.getElementById('managerSection').classList.remove('hidden');
        document.getElementById('logoutBtn').classList.remove('hidden');
        switchManagerTab('Dashboard');
    } else if (savedEmpId) {
        const employee = employeesData.find(e => e.id === savedEmpId);
        if (employee) {
            loggedInEmployee = employee;
            document.getElementById('employeeDashboardSection').classList.remove('hidden');
            document.getElementById('logoutBtn').classList.remove('hidden');
            document.getElementById('empWelcomeName').innerText = employee.name.split(' ')[0];
            loadEmployeeDashboardData();
        } else {
            showLoginSection();
        }
    } else {
        showLoginSection();
    }
};

function showLoginSection() {
    document.getElementById('loginSection').classList.remove('hidden');
    document.getElementById('loginSection').classList.add('grid');
}

function verifyPin() {
    const pin = document.getElementById('adminPin').value;
    if (pin === ADMIN_PIN) {
        localStorage.setItem('adminLoggedIn', 'true');
        document.getElementById('loginSection').classList.add('hidden');
        document.getElementById('loginSection').classList.remove('grid');
        document.getElementById('managerSection').classList.remove('hidden');
        document.getElementById('logoutBtn').classList.remove('hidden');
        switchManagerTab('Dashboard');
    } else {
        document.getElementById('loginError').classList.remove('hidden');
    }
}

function logout() {
    localStorage.removeItem('adminLoggedIn');
    localStorage.removeItem('empId');
    if (unsubscribeDashboard) { unsubscribeDashboard(); unsubscribeDashboard = null; }
    if (unsubscribeTask) { unsubscribeTask(); unsubscribeTask = null; }

    document.getElementById('managerSection').classList.add('hidden');
    document.getElementById('employeeDashboardSection').classList.add('hidden');
    document.getElementById('employeeSection').classList.add('hidden');
    document.getElementById('logoutBtn').classList.add('hidden');
    showLoginSection();

    document.getElementById('adminPin').value = '';
    document.getElementById('empIdInput').value = '';
    loggedInEmployee = null;
    currentTaskId = null;
}

function verifyEmployee() {
    const empId = document.getElementById('empIdInput').value.trim();
    const errorMsg = document.getElementById('empLoginError');
    if (!empId) return;

    const employee = employeesData.find(e => e.id === empId);
    if (employee) {
        errorMsg.classList.add('hidden');
        loggedInEmployee = employee;
        localStorage.setItem('empId', empId);
        document.getElementById('loginSection').classList.add('hidden');
        document.getElementById('loginSection').classList.remove('grid');
        document.getElementById('employeeDashboardSection').classList.remove('hidden');
        document.getElementById('logoutBtn').classList.remove('hidden');
        document.getElementById('empWelcomeName').innerText = employee.name.split(' ')[0];
        loadEmployeeDashboardData();
    } else {
        errorMsg.classList.remove('hidden');
    }
}

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

function loadEmployeeDashboardData() {
    if (unsubscribeDashboard) unsubscribeDashboard();

    unsubscribeDashboard = db.collection('Tasks')
        .where('employeeName', '==', loggedInEmployee.name)
        .onSnapshot((snapshot) => {
            let myTasks = [];
            snapshot.forEach(doc => {
                myTasks.push(doc.data());
            });
            window.empGlobalTasks = sortTasksIntelligently(myTasks);

            let total = window.empGlobalTasks.length;
            let completed = 0; let pending = 0;
            let cNew = 0, cWorking = 0, cReady = 0, cArchived = 0;

            window.empGlobalTasks.forEach(t => {
                let st = t.taskStatus || 'مرسل';
                if (st === 'مرسل' || st === 'جديد') cNew++;
                else if (st === 'جاري العمل' || st === 'متوقف لعائق' || st === 'طلب تمديد موعد') cWorking++;
                else if (st === 'جاهز للمراجعة') { cReady++; completed++; }
                else if (st === 'مغلق ومُقيم' || st === 'ملغي') { cArchived++; completed++; }
                else cWorking++;

                if (st !== 'جاهز للمراجعة' && st !== 'مغلق ومُقيم' && st !== 'ملغي') pending++;
            });

            document.getElementById('empStatTotal').innerText = total;
            document.getElementById('empStatCompleted').innerText = completed;
            document.getElementById('empStatPending').innerText = pending;

            let pct = total > 0 ? Math.round((completed / total) * 100) : 0;
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
        }, (err) => {
            alert("خطأ في جلب البيانات");
        });
}

window.currentFolderOpen = null;

function getTasksForFolder(type) {
    if (!window.empGlobalTasks) return [];
    return window.empGlobalTasks.filter(t => {
        let st = t.taskStatus || 'مرسل';
        if (type === 'new') return st === 'مرسل' || st === 'جديد';
        if (type === 'working') return st === 'جاري العمل' || st === 'متوقف لعائق' || st === 'طلب تمديد موعد' || (!['مرسل', 'جديد', 'جاهز للمراجعة', 'مغلق ومُقيم', 'ملغي'].includes(st));
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

    let baseTasks = window.currentFolderOpen ? getTasksForFolder(window.currentFolderOpen) : window.empGlobalTasks;
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
        tbody.innerHTML = '<div class="col-span-full p-12 text-center text-gray-500 font-bold bg-white rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center justify-center gap-4"><span class="text-5xl">☕</span><span>لا توجد تكاليف مطابقة.</span></div>';
        return;
    }

    tasksList.forEach(task => {
        let title = String(task.taskDetails || '').split('\n')[0].replace('العنوان: ', '');
        if (!title) title = 'تكليف: ' + task.taskId;

        let statusColor = 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200';
        if (task.taskStatus === 'تم الرد' || task.taskStatus === 'جاهز للمراجعة' || task.taskStatus === 'مغلق ومُقيم') statusColor = 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200';
        else if (String(task.taskStatus).includes('متوقف') || String(task.taskStatus).includes('مرفوض') || String(task.taskStatus).includes('اعتذار') || String(task.taskStatus).includes('مرتجع')) statusColor = 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-200';

        let dateStr = task.dueDate;
        try { dateStr = getLocalDateString(dateStr); } catch (e) { }

        let indicatorColor = 'bg-gray-300';
        let indicatorTitle = 'غير محدد';

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
        } else if (task.taskStatus === 'مغلق ومُقيم' || task.taskStatus === 'جاهز للمراجعة') {
            circleColor = '#10b981';
            circleTooltip = 'تم الإنجاز';
        } else if (task.taskStatus === 'ملغي') {
            circleColor = '#6b7280';
            circleTooltip = 'ملغي';
        }

        if (task.createdAt && task.dueDate) {
            const start = new Date(task.createdAt).getTime();
            const due = new Date(task.dueDate);
            due.setHours(23, 59, 59);
            const end = due.getTime();
            const totalDuration = end - start;

            let targetTime = Date.now();
            if (task.taskStatus === 'جاهز للمراجعة' || task.taskStatus === 'مغلق ومُقيم') {
                if (task.replyHistory) {
                    for (let item of task.replyHistory) {
                        if (item.status === 'جاهز للمراجعة' || item.status === 'مغلق ومُقيم') {
                            targetTime = new Date(item.date).getTime();
                            break;
                        }
                    }
                }
            }

            const elapsed = targetTime - start;
            if (totalDuration > 0) {
                const ratio = elapsed / totalDuration;
                if (targetTime > end) {
                    indicatorColor = 'bg-red-500 shadow-red-500/50 animate-pulse';
                    indicatorTitle = 'متأخر (أحمر)';
                } else if (ratio <= 0.40) {
                    indicatorColor = 'bg-green-500 shadow-green-500/50';
                    indicatorTitle = 'في البداية (أخضر)';
                } else if (ratio <= 0.70) {
                    indicatorColor = 'bg-yellow-400 shadow-yellow-400/50';
                    indicatorTitle = 'منتصف المدة (أصفر)';
                } else {
                    indicatorColor = 'bg-red-500 shadow-red-500/50';
                    indicatorTitle = 'قارب على الانتهاء / متأخر (أحمر)';
                }
            }
        }

        let priority = 'عادي';
        let descStr = task.taskDetails || '';
        if (descStr.includes('الأولوية:')) {
            const lines = descStr.split('\n');
            if (lines.length > 1 && lines[1].includes('الأولوية:')) priority = lines[1].replace('الأولوية: ', '');
        }

        let requester = task.requesterName || 'الإدارة';

        tbody.innerHTML += `
            <div class="bg-white rounded-2xl p-4 md:p-6 border border-gray-200 shadow-sm hover:shadow-md hover:border-primary/30 transition duration-300 relative overflow-hidden group flex flex-col md:flex-row md:items-center gap-4 w-full">
                <div class="absolute top-0 right-0 w-2 h-full ${indicatorColor.split(' ')[0]}"></div>
                
                <div class="flex-1 md:pr-4 md:border-l border-gray-100">
                    <div class="flex items-center gap-3 mb-2">
                        <span class="text-xs font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded">#${task.taskId}</span>
                        <span class="${statusColor} text-[11px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap shadow-sm border border-white">${task.taskStatus || 'مرسل'}</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <div title="${circleTooltip}" class="w-3.5 h-3.5 rounded-full flex-shrink-0 shadow-sm border border-black/10 cursor-help" style="background-color: ${circleColor}"></div>
                        <h3 class="font-extrabold text-lg md:text-xl text-gray-800 leading-tight" title="${title}">${title}</h3>
                    </div>
                </div>
                
                <div class="flex flex-wrap md:flex-nowrap items-center gap-4 md:gap-8 text-sm bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <div class="flex flex-col">
                        <span class="text-gray-400 text-[10px] uppercase font-bold mb-0.5">الجهة الطالبة</span>
                        <span class="font-bold text-gray-800 text-xs md:text-sm">${requester}</span>
                    </div>
                    <div class="flex flex-col border-r border-gray-200 pr-4 md:pr-8">
                        <span class="text-gray-400 text-[10px] uppercase font-bold mb-0.5">تاريخ التسليم</span>
                        <span class="font-bold text-gray-800 text-xs md:text-sm">${dateStr}</span>
                    </div>
                    <div class="flex flex-col border-r border-gray-200 pr-4 md:pr-8">
                        <span class="text-gray-400 text-[10px] uppercase font-bold mb-0.5">الأولوية</span>
                        <span class="font-bold ${priority === 'عاجل جداً' ? 'text-red-600' : priority === 'عاجل' ? 'text-yellow-600' : 'text-primary'} text-xs md:text-sm">${priority}</span>
                    </div>
                </div>
                
                <div class="flex items-center gap-4 mt-2 md:mt-0 md:mr-auto w-full md:w-auto">
                    <button onclick="openTaskFromDashboard('${task.taskId}')" class="bg-primary hover:bg-primary-hover text-white px-6 py-3 rounded-xl text-sm font-extrabold transition shadow-btn hover:shadow-btn-hover flex items-center justify-center gap-2 group-hover:scale-105 transform w-full md:w-auto">
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

    const selectEl = document.getElementById('empStatusSelect');
    const submitBtn = document.getElementById('btnSubmitEmpReply');
    if (selectEl) selectEl.disabled = false;
    if (submitBtn) submitBtn.disabled = false;

    loadTaskData(taskId);
}

function backToEmployeeDashboard() {
    if (unsubscribeTask) { unsubscribeTask(); unsubscribeTask = null; }
    document.getElementById('employeeSection').classList.add('hidden');
    document.getElementById('employeeDashboardSection').classList.remove('hidden');
    document.getElementById('globalBackBtn').classList.add('hidden');
}

function globalGoBack() {
    if (!document.getElementById('employeeSection').classList.contains('hidden')) {
        backToEmployeeDashboard();
    }
}

function switchManagerTab(tab) {
    const tabs = ['Create', 'Dashboard', 'Report'];
    tabs.forEach(t => {
        const btn = document.getElementById('tab' + t);
        const content = document.getElementById('tabContent' + t);
        if (tab.toLowerCase() === t.toLowerCase()) {
            btn.className = "font-bold text-lg text-primary border-b-4 border-primary pb-2 px-2";
            content.classList.remove('hidden');
            if (t === 'Dashboard') loadDashboard();
        } else {
            btn.className = "font-bold text-lg text-gray-400 hover:text-primary transition pb-2 px-2";
            content.classList.add('hidden');
        }
    });
}

function loadDashboard() {
    const tbody = document.getElementById('tasksTableBody');
    tbody.innerHTML = '<tr><td colspan="6" class="p-4 md:p-8 text-center text-primary font-bold animate-pulse">اشغل الإنتظار بالاستغفار لحين جلب البيانات...</td></tr>';

    if (unsubscribeDashboard) unsubscribeDashboard();

    unsubscribeDashboard = db.collection('Tasks').onSnapshot((snapshot) => {
        tbody.innerHTML = '';
        globalTasks = [];
        snapshot.forEach(doc => globalTasks.push(doc.data()));

        if (globalTasks.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="p-4 md:p-8 text-center text-gray-500 font-bold">لا يوجد تكاليف حالياً.</td></tr>';
            return;
        }

        const emps = new Set();
        globalTasks.forEach(t => { if (t.employeeName) emps.add(t.employeeName); });

        const selectReport = document.getElementById('reportEmployeeSelect');
        if (selectReport) {
            selectReport.innerHTML = '<option value="">اختر الموظف لعرض تقاريره...</option>';
            emps.forEach(emp => { selectReport.innerHTML += `<option value="${emp}">${emp}</option>`; });
        }

        const selectFilter = document.getElementById('dashFilterEmp');
        if (selectFilter) {
            selectFilter.innerHTML = '<option value="">كل الموظفين</option>';
            emps.forEach(emp => { selectFilter.innerHTML += `<option value="${emp}">${emp}</option>`; });
        }

        renderDashboardTable(globalTasks);
    }, (err) => {
        tbody.innerHTML = '<tr><td colspan="7" class="p-4 md:p-8 text-center text-red-500 font-bold">فشل جلب البيانات.</td></tr>';
    });
}

function updateDashboardKPIs() {
    let active = 0, late = 0, review = 0, done = 0;
    const now = Date.now();
    globalTasks.forEach(t => {
        const status = String(t.taskStatus);
        if (status.includes('مغلق')) {
            done++;
        } else if (status.includes('جاهز')) {
            review++;
        } else if (!status.includes('ملغي') && !status.includes('متوقف') && !status.includes('مرفوض')) {
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
    if (eActive) eActive.innerText = active;
    if (eLate) eLate.innerText = late;
    if (eReview) eReview.innerText = review;
    if (eDone) eDone.innerText = done;
}

function filterDashboard() {
    const search = document.getElementById('dashSearch').value.toLowerCase();
    const emp = document.getElementById('dashFilterEmp').value;
    const status = document.getElementById('dashFilterStatus').value;

    const filtered = globalTasks.filter(t => {
        const titleStr = String(t.taskDetails || '').toLowerCase();
        const idStr = String(t.taskId || '').toLowerCase();
        const matchSearch = titleStr.includes(search) || idStr.includes(search);
        const matchEmp = emp ? t.employeeName === emp : true;
        const matchStatus = status ? String(t.taskStatus).includes(status) : true;
        return matchSearch && matchEmp && matchStatus;
    });
    renderDashboardTable(filtered);
}

function renderDashboardTable(tasksList) {
    updateDashboardKPIs();
    const tbody = document.getElementById('tasksTableBody');
    tbody.innerHTML = '';

    if (tasksList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="p-4 md:p-8 text-center text-gray-500 font-bold">لا توجد نتائج تطابق بحثك.</td></tr>';
        return;
    }

    let sortedTasks = tasksList.map(task => {
        let priority = 'عادي';
        let title = 'تكليف عمل';
        let desc = task.taskDetails || '';

        if (desc.includes('العنوان:')) {
            const lines = desc.split('\n');
            title = lines[0].replace('العنوان: ', '');
            if (lines.length > 1 && lines[1].includes('الأولوية:')) priority = lines[1].replace('الأولوية: ', '');
        } else {
            title = desc.split('\n')[0];
        }
        if (!title) title = 'تكليف: ' + task.taskId;

        let pWeight = 3;
        if (priority.includes('عاجل')) pWeight = 1;
        else if (priority.includes('هام')) pWeight = 2;

        let sWeight = 2;
        if (String(task.taskStatus).includes('جاهز')) sWeight = 1;
        else if (String(task.taskStatus).includes('متوقف') || String(task.taskStatus).includes('مرفوض') || String(task.taskStatus).includes('اعتذار') || String(task.taskStatus).includes('مرتجع')) sWeight = 3;
        else if (String(task.taskStatus).includes('مغلق') || String(task.taskStatus).includes('ملغي')) sWeight = 4;

        let timeWeight = new Date(task.createdAt || 0).getTime();

        return { ...task, _pWeight: pWeight, _sWeight: sWeight, _timeWeight: timeWeight, _extractedPriority: priority, _extractedTitle: title };
    });

    sortedTasks.sort((a, b) => {
        if (a._sWeight !== b._sWeight) return a._sWeight - b._sWeight;
        if (a._pWeight !== b._pWeight) return a._pWeight - b._pWeight;
        return b._timeWeight - a._timeWeight;
    });

    sortedTasks.forEach(task => {
        let priority = task._extractedPriority;
        let title = task._extractedTitle;

        let pColor = 'bg-gray-100 text-gray-600';
        if (priority.includes('عاجل')) pColor = 'bg-red-50 text-red-700 border border-red-200';
        else if (priority.includes('هام')) pColor = 'bg-yellow-50 text-yellow-700 border border-yellow-200';
        else if (priority.includes('عادي')) pColor = 'bg-green-50 text-green-700 border border-green-200';

        let statusColor = 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200';
        if (task.taskStatus === 'تم الرد' || String(task.taskStatus).includes('جاهز')) statusColor = 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200';
        else if (String(task.taskStatus).includes('متوقف') || String(task.taskStatus).includes('مرفوض') || String(task.taskStatus).includes('اعتذار') || String(task.taskStatus).includes('مرتجع')) statusColor = 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-200';
        else if (String(task.taskStatus).includes('ملغي')) statusColor = 'bg-gray-200 text-gray-600';

        let dateStr = task.dueDate;
        try { dateStr = getLocalDateString(dateStr); } catch (e) { }

        let smartDateHTML = `<span class="text-sm font-bold text-gray-600">${dateStr}</span>`;
        let isLateForRow = false;
        if (task.dueDate && task.taskStatus !== 'مغلق ومُقيم' && task.taskStatus !== 'ملغي' && task.taskStatus !== 'جاهز للمراجعة') {
            const due = new Date(task.dueDate);
            due.setHours(23, 59, 59);
            const now = new Date();
            const diffTime = due.getTime() - now.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays < 0) {
                smartDateHTML = `<span class="text-xs px-2 py-1 bg-red-100 text-red-700 rounded font-bold">متأخر ${Math.abs(diffDays)} يوم ⚠️</span><br><span class="text-xs text-gray-400">${dateStr}</span>`;
                isLateForRow = true;
            } else if (diffDays === 0) {
                smartDateHTML = `<span class="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded font-bold">ينتهي اليوم! ⏳</span><br><span class="text-xs text-gray-400">${dateStr}</span>`;
            } else if (diffDays <= 3) {
                smartDateHTML = `<span class="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded font-bold">باقي ${diffDays} أيام</span><br><span class="text-xs text-gray-400">${dateStr}</span>`;
            } else {
                smartDateHTML = `<span class="text-xs px-2 py-1 bg-green-100 text-green-700 rounded font-bold">باقي ${diffDays} يوم</span><br><span class="text-xs text-gray-400">${dateStr}</span>`;
            }
        }
        let rowBgClass = isLateForRow ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-primary/5';

        let indicatorColor = 'bg-gray-300';
        let indicatorTitle = 'غير محدد';

        if (task.createdAt && task.dueDate) {
            const start = new Date(task.createdAt).getTime();
            const due = new Date(task.dueDate);
            due.setHours(23, 59, 59);
            const end = due.getTime();

            const totalDuration = end - start;
            let targetTime = Date.now();
            if (task.taskStatus === 'جاهز للمراجعة' || task.taskStatus === 'مغلق ومُقيم') {
                if (task.replyHistory) {
                    for (let item of task.replyHistory) {
                        if (item.status === 'جاهز للمراجعة' || item.status === 'مغلق ومُقيم') {
                            targetTime = new Date(item.date).getTime();
                            break;
                        }
                    }
                }
            }

            const elapsed = targetTime - start;
            if (totalDuration > 0) {
                const ratio = elapsed / totalDuration;
                if (targetTime > end) {
                    indicatorColor = 'bg-red-500 shadow-red-500/50 animate-pulse';
                    indicatorTitle = 'متأخر (أحمر)';
                } else if (ratio <= 0.40) {
                    indicatorColor = 'bg-green-500 shadow-green-500/50';
                    indicatorTitle = 'في البداية (أخضر)';
                } else if (ratio <= 0.70) {
                    indicatorColor = 'bg-yellow-400 shadow-yellow-400/50';
                    indicatorTitle = 'منتصف المدة (أصفر)';
                } else {
                    indicatorColor = 'bg-red-500 shadow-red-500/50';
                    indicatorTitle = 'قارب على الانتهاء / متأخر (أحمر)';
                }
            }
        }

        tbody.innerHTML += `
            <tr class="transition duration-150 ${rowBgClass} border-b border-gray-100">
                <td class="whitespace-nowrap p-4">
                    <div class="font-bold text-primary truncate max-w-[200px]" title="${title}">${title}</div>
                    <div class="text-xs text-gray-500">${task.taskId} | 🏢 ${task.requesterName || 'جهة غير محددة'}</div>
                </td>
                <td class="whitespace-nowrap p-4 font-medium">${task.employeeName}</td>
                <td class="whitespace-nowrap p-4 text-center">
                    <span class="${pColor} text-xs px-2 py-1 rounded font-bold">${priority}</span>
                </td>
                <td class="whitespace-nowrap p-4">
                    <span class="${statusColor} text-xs px-3 py-1 rounded-full font-bold">${task.taskStatus || 'مرسل'}</span>
                </td>
                <td class="whitespace-nowrap p-4 text-center">${smartDateHTML}</td>
                <td class="whitespace-nowrap p-4 flex justify-center gap-2 flex-wrap">
                    <button class="bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-1 rounded text-xs font-bold transition flex items-center gap-1" onclick="openManagerTaskDetails('${task.taskId}')">تفاصيل</button>
                    ${(task.taskStatus !== 'مغلق ومُقيم' && task.taskStatus !== 'ملغي' && task.taskStatus !== 'جاهز للمراجعة') ? `<button class="bg-blue-100 hover:bg-blue-200 text-blue-800 px-3 py-1 rounded text-xs font-bold transition flex items-center gap-1" onclick="sendReminder('${task.taskId}')">🔔 تذكير</button>` : ''}
                </td>
                <td class="whitespace-nowrap p-4 text-center">
                    <div title="${indicatorTitle}" class="inline-block w-4 h-4 rounded-full shadow-md ${indicatorColor}"></div>
                </td>
            </tr>
        `;
    });
}

function sendReminder(taskId) {
    const task = globalTasks.find(t => t.taskId === taskId);
    if (!task) return;

    let phone = '';
    const emp = employeesData.find(e => e.name === task.employeeName);
    if (emp) phone = emp.phone;
    if (!phone && task.employeePhone) phone = task.employeePhone;

    if (!phone) {
        alert('لم يتم العثور على رقم هاتف الموظف: ' + task.employeeName);
        return;
    }

    let title = String(task.taskDetails || '').split('\n')[0].replace('العنوان: ', '');
    if (!title) title = 'تكليف: ' + task.taskId;

    const message = `السلام عليكم\nتذكير !\nعنوان التكليف: ${title}\nانقر لمشاهدة تفاصيل التكليف:\n${task.taskLink}`;
    const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
}

function openManagerTaskDetails(taskId) {
    const task = globalTasks.find(t => t.taskId === taskId);
    if (!task) return;

    let title = String(task.taskDetails || '').split('\n')[0].replace('العنوان: ', '');
    if (!title) title = 'تكليف: ' + task.taskId;

    let priority = 'عادي';
    let desc = task.taskDetails || '';
    if (desc.includes('العنوان:')) {
        const lines = desc.split('\n');
        if (lines.length > 1 && lines[1].includes('الأولوية:')) priority = lines[1].replace('الأولوية: ', '');
        desc = lines.slice(3).join('\n');
    }

    let dDate = task.dueDate;
    try { dDate = getLocalDateString(dDate); } catch (e) { }

    document.getElementById('mngTaskEmployee').innerText = task.employeeName || 'غير محدد';
    document.getElementById('mngTaskDueDate').innerText = dDate || 'غير محدد';
    document.getElementById('mngTaskPriority').innerText = priority;
    document.getElementById('mngTaskTitle').innerText = title;
    document.getElementById('mngTaskDesc').innerText = desc || 'لا يوجد تفاصيل إضافية.';
    document.getElementById('mngTaskId').innerText = taskId;

    const timeline = document.getElementById('mngTimeline');
    timeline.innerHTML = '';

    if (task.replyHistory && task.replyHistory.length > 0) {
        const history = [...task.replyHistory].reverse();
        history.forEach(item => {
            let dateStr = item.date;
            try { dateStr = new Date(item.date).toLocaleString('ar-SA'); } catch (e) { }

            let bg = 'bg-gray-100';
            let textC = 'text-gray-800';
            if (item.status.includes('متوقف') || item.status.includes('اعتذار') || item.status.includes('مرتجع')) {
                bg = 'bg-red-100'; textC = 'text-red-800';
            } else if (item.status.includes('جاهز') || item.status.includes('مغلق')) {
                bg = 'bg-green-100'; textC = 'text-green-800';
            } else if (item.status.includes('جاري')) {
                bg = 'bg-blue-100'; textC = 'text-blue-800';
            }

            timeline.innerHTML += `
                <div class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm relative ml-2 md:ml-12 hover:shadow-md transition">
                    <div class="flex justify-between items-start mb-3 border-b border-gray-50 pb-2">
                        <span class="${bg} ${textC} px-3 py-1 rounded-full text-xs font-bold shadow-sm">${item.status}</span>
                        <span class="text-xs text-gray-500 font-bold bg-gray-50 px-2 py-1 rounded" dir="ltr">🕒 ${dateStr}</span>
                    </div>
                    <div class="text-gray-700 whitespace-pre-wrap text-sm font-medium leading-relaxed">${item.reply || 'لم يتم كتابة تفاصيل إضافية.'}</div>
                    ${item.attachmentUrl ? `<a href="${item.attachmentUrl}" target="_blank" class="inline-block mt-4 bg-primary/10 border border-primary/20 px-4 py-2 rounded-xl text-xs font-bold text-primary hover:bg-primary hover:text-white transition shadow-sm">📎 تحميل المرفق</a>` : ''}
                </div>
            `;
        });
    } else {
        timeline.innerHTML = '<div class="text-center text-gray-400 font-bold py-12 bg-white rounded-xl border border-gray-100">لا يوجد أي ردود في السجل الزمني حتى الآن.</div>';
    }

    const evalBtn = document.getElementById('mngEvalBtn');
    const rejectBtn = document.getElementById('btnShowReject');
    const cancelBtn = document.getElementById('btnCancelTask');
    const updateDateBtn = document.getElementById('btnShowUpdateDate');

    updateDateBtn.classList.add('hidden');
    if (task.taskStatus === 'طلب تمديد موعد' || task.taskStatus === 'جاري العمل' || task.taskStatus === 'متوقف لعائق') {
        updateDateBtn.classList.remove('hidden');
    }

    if (task.taskStatus === 'مغلق ومُقيم' || task.taskStatus === 'ملغي') {
        evalBtn.classList.add('hidden');
        rejectBtn.classList.add('hidden');
        cancelBtn.classList.add('hidden');
    } else {
        evalBtn.classList.remove('hidden');
        rejectBtn.classList.remove('hidden');
        cancelBtn.classList.remove('hidden');
        evalBtn.onclick = () => {
            closeManagerTaskDetails();
            openEvalModal(taskId);
        };
    }

    document.getElementById('mngRejectSection').classList.add('hidden');
    document.getElementById('mngRejectNote').value = '';
    document.getElementById('mngRejectMsg').classList.add('hidden');
    document.getElementById('mngUpdateDateSection').classList.add('hidden');
    document.getElementById('mngNewDueDate').value = '';
    document.getElementById('mngUpdateDateMsg').classList.add('hidden');

    document.getElementById('managerTaskDetailsModal').classList.remove('hidden');
}

function closeManagerTaskDetails() {
    document.getElementById('managerTaskDetailsModal').classList.add('hidden');
}

async function submitManagerDateUpdate() {
    const newDate = document.getElementById('mngNewDueDate').value;
    const msgBox = document.getElementById('mngUpdateDateMsg');
    const btn = document.getElementById('btnSubmitDateUpdate');
    const taskId = document.getElementById('mngTaskId').innerText;

    if (!newDate) {
        msgBox.innerText = 'يرجى اختيار تاريخ جديد أولاً!';
        msgBox.className = 'text-red-600 block mt-2 text-sm font-bold';
        msgBox.classList.remove('hidden');
        return;
    }

    btn.disabled = true;
    btn.innerText = 'جاري التحديث...';
    msgBox.classList.add('hidden');

    try {
        await db.collection('Tasks').doc(taskId).update({
            dueDate: newDate
        });
        msgBox.innerText = 'تم تحديث الموعد بنجاح!';
        msgBox.className = 'text-green-600 block mt-2 text-sm font-bold';
        msgBox.classList.remove('hidden');
        setTimeout(() => { closeManagerTaskDetails(); }, 1500);
    } catch (err) {
        msgBox.innerText = 'خطأ: ' + err.message;
        msgBox.className = 'text-red-600 block mt-2 text-sm font-bold';
        msgBox.classList.remove('hidden');
    }
    btn.disabled = false;
    btn.innerText = 'حفظ الموعد الجديد';
}

async function submitManagerRejection() {
    const note = document.getElementById('mngRejectNote').value.trim();
    const msgBox = document.getElementById('mngRejectMsg');
    const btn = document.getElementById('btnSubmitRejection');
    const taskId = document.getElementById('mngTaskId').innerText;

    if (!note) {
        msgBox.innerText = 'يرجى كتابة ملاحظات التعديل أولاً!';
        msgBox.className = 'text-red-600 block mt-2 text-sm font-bold';
        return;
    }

    msgBox.innerText = 'جاري إرجاع التكليف للموظف...';
    msgBox.className = 'text-blue-600 block mt-2 text-sm font-bold';
    btn.disabled = true;

    try {
        const replyObj = {
            sender: 'manager',
            date: new Date().toISOString(),
            status: 'مرتجع للتعديل',
            reply: '🔴 ملاحظة من الإدارة (يحتاج تعديل): ' + note,
            attachmentUrl: ''
        };
        await db.collection('Tasks').doc(taskId).update({
            taskStatus: 'مرتجع للتعديل',
            replyHistory: firebase.firestore.FieldValue.arrayUnion(replyObj)
        });

        const task = globalTasks.find(t => t.taskId === taskId);
        if (task) {
            let phone = task.employeePhone;
            if (!phone) {
                const emp = employeesData.find(e => e.name === task.employeeName);
                if (emp) phone = emp.phone;
            }
            if (phone) {
                let title = String(task.taskDetails || '').split('\n')[0].replace('العنوان: ', '');
                if (!title) title = 'تكليف: ' + task.taskId;
                const taskUrl = window.location.origin + window.location.pathname + '?id=' + task.taskId;
                const smsMessage = `تم إرجاع تكليفك للتعديل: (${title}) يرجى مراجعة ملاحظات الإدارة.\n\nللتفاصيل اضغط الرابط:-\n${taskUrl}`;
                sendSmsDirect(phone, smsMessage);
            }
        }

        msgBox.innerText = '✅ تم إرجاع التكليف للموظف بنجاح!';
        msgBox.className = 'text-green-600 block mt-2 text-sm font-bold';
        setTimeout(() => { closeManagerTaskDetails(); }, 1500);
    } catch (err) {
        msgBox.innerText = 'فشل الاتصال: ' + err.message;
        msgBox.className = 'text-red-600 block mt-2 text-sm font-bold';
    }
    btn.disabled = false;
}

async function cancelManagerTask() {
    const taskId = document.getElementById('mngTaskId').innerText;
    if (!confirm('هل أنت متأكد من إلغاء هذا التكليف نهائياً؟')) return;

    const btn = document.getElementById('btnCancelTask');
    btn.disabled = true;
    btn.innerText = 'جاري الإلغاء...';

    try {
        const replyObj = {
            sender: 'manager',
            date: new Date().toISOString(),
            status: 'ملغي',
            reply: '🔴 تم إلغاء التكليف من قبل الإدارة، ولا يتطلب أي إجراء إضافي.',
            attachmentUrl: ''
        };
        await db.collection('Tasks').doc(taskId).update({
            taskStatus: 'ملغي',
            replyHistory: firebase.firestore.FieldValue.arrayUnion(replyObj)
        });
        closeManagerTaskDetails();
    } catch (err) {
        alert('فشل الاتصال بالخادم.');
    }
    btn.disabled = false;
    btn.innerText = 'إلغاء التكليف ❌';
}

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
<div class="bg-white rounded-3xl p-4 md:p-6 md:p-4 md:p-8 max-w-sm w-full shadow-2xl relative">
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
            <span class="font-bold text-yellow-700">أداء المنظمة العام</span>
            <span class="text-xl font-extrabold text-secondary">${avg}%</span>
        </div>
    </div>
</div>
    `;
    document.getElementById('statsModal').classList.remove('hidden');
}

function closeStatsModal() { document.getElementById('statsModal').classList.add('hidden'); }

function loadEmployeeReport() {
    const empName = document.getElementById('reportEmployeeSelect').value;
    const printArea = document.getElementById('reportPrintArea');
    if (!empName) { printArea.classList.add('hidden'); return; }

    const empTasks = globalTasks.filter(t => t.employeeName === empName && t.taskStatus === 'مغلق ومُقيم');
    document.getElementById('reportEmpName').innerText = empName;
    document.getElementById('reportDate').innerText = 'تاريخ التقرير: ' + new Date().toLocaleDateString('ar-SA');

    let totalTasks = empTasks.length;
    const tbody = document.getElementById('reportTableBody');
    tbody.innerHTML = '';

    if (totalTasks === 0) {
        document.getElementById('reportAvgScore').innerText = '0%';
        document.getElementById('reportTotalTasks').innerText = '0';
        document.getElementById('reportAvgSpeed').innerText = '0/30';
        tbody.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-gray-500 font-bold">لا يوجد تكاليف مقيمة حتى الآن.</td></tr>';
    } else {
        let sumScores = 0, sumSpeed = 0;
        empTasks.forEach(t => {
            let spd = parseInt(t.speedScore) || 0;
            let mgr = parseInt(t.managerScore) || 0;
            let tot = spd + mgr;
            sumScores += tot; sumSpeed += spd;

            let title = String(t.taskDetails || '').split('\n')[0].replace('العنوان: ', '');
            tbody.innerHTML += `
                <tr class="hover:bg-gray-50 border-b">
                    <td class="whitespace-nowrap p-3 text-sm text-gray-500">${t.taskId}</td>
                    <td class="whitespace-nowrap p-3 font-medium text-right text-sm truncate max-w-[150px]">${title}</td>
                    <td class="whitespace-nowrap p-3 text-center text-green-600 font-bold">${spd}</td>
                    <td class="whitespace-nowrap p-3 text-center text-primary font-bold">${mgr}</td>
                    <td class="whitespace-nowrap p-3 text-center text-primary font-extrabold">${tot}%</td>
                </tr>
            `;
        });
        document.getElementById('reportAvgScore').innerText = Math.round(sumScores / totalTasks) + '%';
        document.getElementById('reportTotalTasks').innerText = totalTasks;
        document.getElementById('reportAvgSpeed').innerText = Math.round(sumSpeed / totalTasks) + '/30';
    }
    printArea.classList.remove('hidden');
}

function exportToPDF() {
    const element = document.getElementById('reportPrintArea');
    if (element.classList.contains('hidden')) { alert('الرجاء اختيار الموظف أولاً'); return; }
    const empName = document.getElementById('reportEmployeeSelect').value;
    const opt = {
        margin: 0.5,
        filename: `تقرير_تقييم_${empName.replace(' ', '_')}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
}

let activeEvalTask = null;
let currentSpeedScore = 30;

function openEvalModal(taskId) {
    activeEvalTask = taskId;
    const task = globalTasks.find(t => t.taskId === taskId);

    currentSpeedScore = 0;
    if (task) {
        let firstReadyDate = null;
        if (task.replyHistory) {
            for (let item of task.replyHistory) {
                if (item.status === 'جاهز للمراجعة' || item.status === 'مغلق ومُقيم') {
                    firstReadyDate = new Date(item.date);
                    break;
                }
            }
        }
        if (firstReadyDate && task.dueDate) {
            const due = new Date(task.dueDate);
            due.setHours(23, 59, 59);
            if (firstReadyDate <= due) currentSpeedScore = 30;
        }
    }

    const speedDisp = document.getElementById('speedScoreDisplay');
    const speedText = document.getElementById('speedScoreText');
    if (currentSpeedScore === 30) {
        speedDisp.className = 'bg-green-50 border-2 border-green-200 text-green-700 px-4 py-2 rounded-xl text-center';
        speedText.innerHTML = '30 <span class="text-sm">/ 30</span>';
    } else {
        speedDisp.className = 'bg-red-50 border-2 border-red-200 text-red-700 px-4 py-2 rounded-xl text-center';
        speedText.innerHTML = '0 <span class="text-sm">/ 30</span>';
    }

    for (let i = 1; i <= 7; i++) { document.getElementById('q' + i).value = "10"; }
    calculateLiveScore();
    document.getElementById('evalModal').classList.remove('hidden');
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

function closeEvalModal() { document.getElementById('evalModal').classList.add('hidden'); }

async function submitEvaluation() {
    let managerScore = 0;
    for (let i = 1; i <= 7; i++) managerScore += parseInt(document.getElementById('q' + i).value || 0);
    const total = managerScore + currentSpeedScore;

    const btn = document.getElementById('btnSubmitEval');
    const msgBox = document.getElementById('evalMsg');
    const oldText = btn.innerText;

    btn.innerText = 'جاري الاعتماد...';
    btn.disabled = true;
    msgBox.innerText = 'اشغل الإنتظار بالاستغفار لحين استجابة النظام...';
    msgBox.className = 'p-4 rounded-xl font-bold text-sm bg-blue-50 text-blue-700 block mt-4 text-center';

    try {
        const replyObj = {
            sender: 'manager',
            date: new Date().toISOString(),
            status: 'مغلق ومُقيم',
            reply: `✅ تم إغلاق التكليف من الإدارة`,
            attachmentUrl: ''
        };
        await db.collection('Tasks').doc(activeEvalTask).update({
            taskStatus: 'مغلق ومُقيم',
            speedScore: String(currentSpeedScore),
            managerScore: String(managerScore),
            replyHistory: firebase.firestore.FieldValue.arrayUnion(replyObj)
        });

        // Send SMS for Evaluation
        const task = globalTasks.find(t => t.taskId === activeEvalTask);
        if (task) {
            let phone = task.employeePhone;
            if (!phone) {
                const emp = employeesData.find(e => e.name === task.employeeName);
                if (emp) phone = emp.phone;
            }
            if (phone) {
                let title = String(task.taskDetails || '').split('\n')[0].replace('العنوان: ', '');
                if (!title) title = 'تكليف: ' + task.taskId;
                const taskUrl = window.location.origin + window.location.pathname + '?id=' + task.taskId;
                const requester = task.requesterName || 'الإدارة';
                const smsMessage = `تكليفك الخاص من قسم / ${requester}\nللقيام بـ ... ${title}\nتم الإنتهاء منه واغلاقه\n\nجزاكم الله خير\n\nللتفاصيل يرجى الدخول على الرابط التالي:-\n${taskUrl}`;
                sendSmsDirect(phone, smsMessage);
            }
        }

        msgBox.className = 'hidden';
        alert('✅ تم التقييم وإغلاق التكليف بنجاح!\nالنسبة المئوية الإجمالية: ' + total + '%');
        closeEvalModal();
    } catch (err) {
        msgBox.innerText = '❌ فشل الاتصال بقاعدة البيانات: ' + err.message;
        msgBox.className = 'p-4 rounded-xl font-bold text-sm bg-red-50 text-red-700 block mt-4 text-center';
    }
    btn.innerText = oldText;
    btn.disabled = false;
}

function generateSecureId() { return 'TSK-' + Math.random().toString(36).substr(2, 6).toUpperCase(); }
function toggleCheckboxDropdown() { document.getElementById('checkboxDropdown').classList.toggle('hidden'); }
function updateMultiSelectLabel() {
    const checkboxes = document.querySelectorAll('.emp-checkbox:checked');
    const label = document.getElementById('multiSelectLabel');
    if (checkboxes.length === 0) label.textContent = 'اختر الموظفين...';
    else if (checkboxes.length === 1) label.textContent = checkboxes[0].value.split('|')[1];
    else label.textContent = `تم تحديد (${checkboxes.length}) موظفين`;
}
function selectAllCheckboxes(check) {
    document.querySelectorAll('.emp-checkbox').forEach(cb => cb.checked = check);
    updateMultiSelectLabel();
}

async function uploadFileToDrive(file) {
    if (!file) return '';
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function (e) {
            const payload = {
                action: 'uploadFileOnly',
                fileBase64: e.target.result,
                fileName: file.name,
                mimeType: file.type
            };
            fetch(scriptURL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify(payload)
            })
                .then(res => res.json())
                .then(data => {
                    if (data.success) resolve(data.fileUrl);
                    else reject(new Error(data.message || 'فشل الرفع لقوقل درايف'));
                })
                .catch(err => reject(err));
        };
        reader.onerror = () => reject(new Error('فشل قراءة الملف'));
        reader.readAsDataURL(file);
    });
}

window.toggleRequesterOther = function () {
    const select = document.getElementById('requesterNameSelect');
    const otherInput = document.getElementById('requesterNameOther');
    if (select && otherInput) {
        if (select.value === 'أخرى') {
            otherInput.classList.remove('hidden');
        } else {
            otherInput.classList.add('hidden');
        }
    }
};

async function createTask() {
    const reqSelect = document.getElementById('requesterNameSelect').value;
    const reqOther = document.getElementById('requesterNameOther').value.trim();
    const requester = reqSelect === 'أخرى' ? reqOther : reqSelect;
    const title = document.getElementById('taskTitle').value.trim();
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
        msgBox.innerText = 'يرجى إكمال جميع الحقول الإلزامية وتحديد موظف واحد على الأقل';
        msgBox.className = 'p-4 rounded-xl font-bold text-sm bg-red-50 text-red-700 block';
        return;
    }

    if (file && file.size > 5 * 1024 * 1024) {
        msgBox.innerText = 'حجم الملف يتجاوز 5 ميجا!';
        msgBox.className = 'p-4 rounded-xl font-bold text-sm bg-red-50 text-red-700 block';
        return;
    }

    const taskId = generateSecureId();
    const taskUrl = window.location.origin + window.location.pathname + '?id=' + taskId;
    const waText = `🔴 *تكليف جديد*\n\n*جهة التكليف:* ${requester}\n*الموضوع:* ${title}\n*الأولوية:* ${priority}\n*التسليم:* ${date}\n\n🔗 *للتفاصيل والبدء بالتنفيذ، اضغط الرابط التالي:*\n${taskUrl}`;

    msgBox.innerText = `اشغل الإنتظار بالاستغفار لحين استجابة النظام...`;
    msgBox.className = 'p-4 rounded-xl font-bold text-sm bg-blue-50 text-blue-700 block';
    btn.disabled = true;

    try {
        let fileUrl = '';
        if (file) {
            msgBox.innerText = 'جاري رفع المرفقات إلى قوقل درايف...';
            fileUrl = await uploadFileToDrive(file);
        }

        const combinedDetails = `العنوان: ${title}\nالأولوية: ${priority}\n\nالتفاصيل:\n${desc}`;

        let replyHistory = [];
        if (fileUrl) {
            replyHistory.push({
                date: new Date().toISOString(),
                status: 'تكليف جديد (مرفق)',
                reply: 'مرفقات من الإدارة',
                attachmentUrl: fileUrl
            });
        }

        for (let i = 0; i < selectedEmployeesArray.length; i++) {
            const emp = selectedEmployeesArray[i];
            const empTaskId = (i === 0) ? taskId : generateSecureId(); // For multiple employees, generate unique IDs

            await db.collection('Tasks').doc(empTaskId).set({
                taskId: empTaskId,
                createdAt: new Date().toISOString(),
                requesterName: requester,
                employeeName: emp.name,
                taskDetails: combinedDetails,
                dueDate: date,
                taskStatus: 'مرسل',
                taskLink: window.location.origin + window.location.pathname + '?id=' + empTaskId,
                replyHistory: replyHistory
            });

            // Send automatic SMS via Direct Fetch
            const smsLink = window.location.origin + window.location.pathname + '?id=' + empTaskId;
            const smsMessage = `تكليف عمل جديد !\nمن / ${requester}\nللقيام بالتكليف التالي :-\n(${title})\n\nللتفاصيل يرجى الدخول على الرابط التالي:-\n${smsLink}`;
            sendSmsDirect(emp.phone, smsMessage);

            if (i === 0 && document.getElementById('sendWhatsAppCb').checked) {
                setTimeout(() => {
                    window.open(`https://wa.me/${emp.phone}?text=${encodeURIComponent(waText)}`, '_blank');
                }, 1500);
            }
        }

        msgBox.innerText = 'تم حفظ التكليف بنجاح!';
        msgBox.className = 'p-4 rounded-xl font-bold text-sm bg-green-50 text-green-700 block mt-4';

        document.getElementById('requesterNameSelect').value = '';
        document.getElementById('requesterNameOther').value = '';
        document.getElementById('requesterNameOther').classList.add('hidden');
        document.getElementById('taskTitle').value = '';
        document.getElementById('taskDesc').value = '';
        document.getElementById('taskDate').value = '';
        document.getElementById('taskPriority').value = 'عادي';
        document.getElementById('managerTaskFile').value = '';
        document.getElementById('sendWhatsAppCb').checked = false;

        setTimeout(() => msgBox.classList.add('hidden'), 3000);
    } catch (err) {
        msgBox.innerText = 'حدث خطأ: ' + err.message;
        msgBox.className = 'p-4 rounded-xl font-bold text-sm bg-red-50 text-red-700 block mt-4';
    }
    btn.disabled = false;
}

function loadTaskData(id) {
    document.getElementById('empTaskId').innerText = id;
    document.getElementById('empTaskDesc').innerText = 'اشغل الإنتظار بالاستغفار لحين جلب البيانات...';
    document.getElementById('empTaskTitle').innerText = 'تحميل...';

    if (unsubscribeTask) unsubscribeTask();

    unsubscribeTask = db.collection('Tasks').doc(id).onSnapshot((doc) => {
        if (doc.exists) {
            const task = doc.data();
            let title = 'تكليف عمل';
            let priority = 'عادي';
            let desc = task.taskDetails || '';

            let cleanDesc = desc;
            if (desc.includes('العنوان:')) {
                const lines = desc.split('\n');
                title = lines[0].replace('العنوان: ', '');
                priority = lines[1].replace('الأولوية: ', '');
                cleanDesc = lines.slice(3).join('\n');
            }
            cleanDesc = cleanDesc.replace('التفاصيل:', '').trim();

            document.getElementById('empTaskTitle').innerText = title;
            document.getElementById('empTaskDesc').innerText = 'تفاصيل التكليف: -\n' + cleanDesc;
            document.getElementById('empTaskPriority').innerText = priority;

            const banner = document.getElementById('empUrgencyBanner');
            const statusBadge = document.getElementById('empTaskStatusBadge');
            const timeBadge = document.getElementById('empTaskTimeBadge');

            if (statusBadge) {
                statusBadge.innerText = task.taskStatus || 'جديد';
                statusBadge.classList.remove('hidden', 'bg-green-100', 'text-green-700', 'bg-gray-100', 'text-gray-700', 'bg-red-100', 'text-red-700', 'bg-blue-100', 'text-blue-700', 'bg-orange-100', 'text-orange-700');
                if (task.taskStatus === 'جاهز للمراجعة') statusBadge.classList.add('bg-green-100', 'text-green-700');
                else if (task.taskStatus === 'مغلق ومُقيم' || task.taskStatus === 'ملغي') statusBadge.classList.add('bg-gray-100', 'text-gray-700');
                else if (task.taskStatus === 'متوقف لعائق') statusBadge.classList.add('bg-red-100', 'text-red-700');
                else if (task.taskStatus === 'طلب تمديد موعد') statusBadge.classList.add('bg-orange-100', 'text-orange-700');
                else statusBadge.classList.add('bg-blue-100', 'text-blue-700');
            }

            if (task.taskStatus !== 'مغلق ومُقيم' && task.taskStatus !== 'ملغي' && task.taskStatus !== 'جاهز للمراجعة' && task.dueDate) {
                const due = new Date(task.dueDate);
                due.setHours(23, 59, 59);
                const start = new Date(task.createdAt || Date.now()).getTime();
                const now = new Date().getTime();

                let totalDuration = due.getTime() - start;
                if (totalDuration <= 0) totalDuration = 1;
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
                    else if (ratio < 0.2) timeBadge.innerHTML = `مهمة جديدة ✨`;
                    else if (ratio > 0.8) timeBadge.innerHTML = `يشارف على الانتهاء ⏰`;
                    else timeBadge.innerHTML = `متبقي ${diffDays} أيام`;
                }

                banner.classList.remove('hidden', 'bg-green-100', 'text-green-800', 'border-green-300', 'bg-yellow-100', 'text-yellow-800', 'border-yellow-300', 'bg-red-100', 'text-red-800', 'border-red-300');
                if (diffDays < 0) {
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
            try { dDate = getLocalDateString(dDate); } catch (e) { }
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
                    if (!found) selectEl.value = "جاري العمل";
                }

                if (task.taskStatus === 'جاهز للمراجعة' || task.taskStatus === 'مغلق ومُقيم' || task.taskStatus === 'ملغي') {
                    document.getElementById('empReplyMsg').disabled = true;
                    document.getElementById('empReplyMsg').placeholder = "تم قفل هذا التكليف.";
                    document.getElementById('empFile').disabled = true;
                    if (selectEl) selectEl.disabled = true;
                    if (submitBtn) submitBtn.disabled = true;

                    const msgBox = document.getElementById('replyMsg');
                    msgBox.innerText = '🔒 تم قفل هذا التكليف لأن حالته: ' + task.taskStatus;
                    msgBox.className = 'p-4 rounded-xl font-bold text-sm bg-gray-100 text-gray-700 block mt-4 text-center border';
                }
            }

            const chatHistory = document.getElementById('chatHistory');
            chatHistory.innerHTML = '';
            chatHistory.classList.add('bg-[#efeae2]', 'p-4', 'rounded-2xl', 'flex', 'flex-col');
            chatHistory.classList.remove('space-y-4');

            // Add original task details as the first chat bubble
            let createdDate = task.createdAt || Date.now();
            let cDateStr = '';
            try {
                const cd = new Date(createdDate);
                cDateStr = cd.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) + ' - ' + cd.toLocaleDateString('ar-SA');
            } catch (e) { }

            chatHistory.innerHTML += `
                <div class="max-w-[85%] md:max-w-[70%] mr-auto bg-white rounded-tr-none p-3 rounded-2xl shadow-sm relative mb-2 border border-black/5">
                    <div class="text-[11px] font-extrabold text-[#075e54] mb-1">~ ${task.requesterName || 'الجهة الطالبة للتكليف'}</div>
                    <div class="whitespace-pre-wrap text-[15px] leading-relaxed text-gray-800 font-medium">${cleanDesc}</div>
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
                    } catch (e) { }

                    let isManager = false;
                    if (item.sender) {
                        isManager = (item.sender === 'manager');
                    } else {
                        isManager = item.status.includes('تقييم') || item.status.includes('إرجاع') || item.status.includes('تحديث من الإدارة') || item.status.includes('إلغاء') || (item.reply && (item.reply.includes('تم إرجاع') || item.reply.includes('من الإدارة') || item.reply.startsWith('👑') || item.reply.startsWith('✅') || item.reply.startsWith('❌') || item.reply.startsWith('📅') || item.reply.startsWith('↩️') || item.reply.startsWith('💬')));
                    }

                    let alignmentClass = isManager ? 'mr-auto bg-white rounded-tr-none' : 'ml-auto bg-[#dcf8c6] rounded-tl-none';
                    let senderName = isManager ? `~ ${task.requesterName || 'الجهة الطالبة للتكليف'}` : `~ أنا`;
                    let nameColor = isManager ? 'text-[#075e54]' : 'text-gray-500';

                    let textMsg = item.reply || '';

                    chatHistory.innerHTML += `
                        <div class="max-w-[85%] md:max-w-[70%] ${alignmentClass} p-3 rounded-2xl shadow-sm relative mb-2 border border-black/5">
                            <div class="text-[11px] font-extrabold ${nameColor} mb-1 flex justify-between">
                                <span>${senderName}</span>
                                <span class="bg-black/5 px-2 py-0.5 rounded text-[9px] font-mono">${item.status}</span>
                            </div>
                            <div class="whitespace-pre-wrap text-[15px] leading-relaxed text-gray-800 font-medium">${textMsg}</div>
                            ${item.attachmentUrl ? `<a href="${item.attachmentUrl}" target="_blank" class="inline-flex items-center gap-1 mt-2 bg-black/5 px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-black/10 transition">📎 عرض المرفق</a>` : ''}
                            <div class="text-[10px] text-gray-500 mt-1 flex justify-end items-center gap-1" dir="ltr">
                                <span>${dateStr}</span>
                                ${!isManager ? '<span class="text-[#53bdeb] text-xs leading-none tracking-tighter">✓✓</span>' : ''}
                            </div>
                        </div>
                    `;
                });
            }
            setTimeout(() => { chatHistory.scrollTop = chatHistory.scrollHeight; }, 100);
        } else {
            document.getElementById('empTaskDesc').innerText = '❌ لم يتم العثور على التكليف.';
            document.getElementById('empTaskTitle').innerText = 'خطأ';
        }
    }, (err) => {
        document.getElementById('empTaskDesc').innerText = '❌ خطأ في الاتصال بقاعدة البيانات.';
    });
}

async function submitEmpReply() {
    const status = document.getElementById('empStatusSelect').value;
    const replyMsg = document.getElementById('empReplyMsg').value.trim();
    const file = document.getElementById('empFile').files[0];
    const msgBox = document.getElementById('replyMsg');
    const submitBtn = document.getElementById('btnSubmitEmpReply');

    if (!replyMsg) {
        msgBox.innerText = 'يرجى كتابة التفاصيل أو التحديث في المربع أولاً!';
        msgBox.className = 'p-4 rounded-xl font-bold text-sm bg-red-50 text-red-700 block mt-4';
        return;
    }
    if (file && file.size > 5 * 1024 * 1024) {
        msgBox.innerText = 'حجم الملف يتجاوز 5 ميجا!';
        msgBox.className = 'p-4 rounded-xl font-bold text-sm bg-red-50 text-red-700 block mt-4';
        return;
    }

    if (submitBtn) { submitBtn.disabled = true; submitBtn.classList.add('opacity-50'); }

    msgBox.innerText = `جاري رفع المرفقات وتحديث الحالة...`;
    msgBox.className = 'p-4 rounded-xl font-bold text-sm bg-blue-50 text-blue-700 block mt-4';

    try {
        let fileUrl = '';
        if (file) {
            fileUrl = await uploadFileToDrive(file);
        }

        const replyObj = {
            sender: 'employee',
            date: new Date().toISOString(),
            status: status,
            reply: replyMsg,
            attachmentUrl: fileUrl
        };

        let updateData = {
            taskStatus: status,
            replyHistory: firebase.firestore.FieldValue.arrayUnion(replyObj)
        };
        if (status === 'جاهز للمراجعة') {
            updateData.submittedAt = new Date().toISOString();
        }
        await db.collection('Tasks').doc(currentTaskId).update(updateData);

        msgBox.innerText = '✅ تم إرسال التحديث بنجاح!';
        msgBox.className = 'p-4 rounded-xl font-bold text-sm bg-green-50 text-green-700 block mt-4';
        document.getElementById('empReplyMsg').value = '';
        document.getElementById('empFile').value = '';
        setTimeout(() => msgBox.classList.add('hidden'), 3000);
    } catch (err) {
        msgBox.innerText = 'فشل الاتصال: ' + err.message;
        msgBox.className = 'p-4 rounded-xl font-bold text-sm bg-red-50 text-red-700 block mt-4';
    }

    if (submitBtn) { submitBtn.disabled = false; submitBtn.classList.remove('opacity-50'); }
}


// --- NEW MANAGER LOGIC OVERRIDES ---

function switchManagerTab(tab) {
    const tabs = ['Create', 'Dashboard', 'Report'];
    tabs.forEach(t => {
        const btn = document.getElementById('tab' + t);
        const content = document.getElementById('tabContent' + t);
        if (tab.toLowerCase() === t.toLowerCase()) {
            btn.className = "flex-1 font-bold text-sm md:text-base py-3 px-4 rounded-xl transition-all duration-300 bg-white text-primary shadow-sm";
            content.classList.remove('hidden');
            if (t === 'Dashboard') loadDashboard();
        } else {
            btn.className = "flex-1 font-bold text-sm md:text-base py-3 px-4 rounded-xl transition-all duration-300 text-gray-500 hover:text-primary";
            content.classList.add('hidden');
        }
    });
}

function loadDashboard() {
    const tbody = document.getElementById('mgrDashboardTableBody');
    if (tbody) tbody.innerHTML = '<div class="p-8 text-center text-primary font-bold animate-pulse">جاري جلب البيانات...</div>';

    if (window.unsubscribeDashboard) window.unsubscribeDashboard();

    window.unsubscribeDashboard = db.collection('Tasks').onSnapshot((snapshot) => {
        globalTasks = [];
        snapshot.forEach(doc => globalTasks.push(doc.data()));

        const emps = new Set();
        globalTasks.forEach(t => { if (t.employeeName) emps.add(t.employeeName); });

        const selectReport = document.getElementById('reportEmployeeSelect');
        if (selectReport) {
            selectReport.innerHTML = '<option value="">👤 اضغط لاختيار موظف لعرض تقاريره...</option>';
            emps.forEach(emp => { selectReport.innerHTML += `<option value="${emp}">${emp}</option>`; });
        }

        const selectFilter = document.getElementById('mgrFilterEmp');
        if (selectFilter) {
            selectFilter.innerHTML = '<option value="">👤 كل الموظفين</option>';
            emps.forEach(emp => { selectFilter.innerHTML += `<option value="${emp}">${emp}</option>`; });
        }

        updateDashboardKPIs();
        updateManagerFolderCounts();

        // If a folder is open, re-render it
        if (!document.getElementById('mgrFolderViewSection').classList.contains('hidden')) {
            handleManagerSearch();
        }
    }, (err) => {
        console.error("Dashboard error:", err);
    });
}

function updateManagerFolderCounts() {
    const tasks = globalTasks;
    const countNew = tasks.filter(t => t.taskStatus === 'مرسل' || !t.taskStatus).length;
    const countWorking = tasks.filter(t => String(t.taskStatus).includes('جاري') || String(t.taskStatus).includes('اعتذار') || String(t.taskStatus).includes('متوقف') || String(t.taskStatus).includes('تمديد')).length;
    const countReady = tasks.filter(t => t.taskStatus === 'جاهز للمراجعة').length;
    const countArchived = tasks.filter(t => String(t.taskStatus).includes('مغلق') || String(t.taskStatus).includes('ملغي')).length;

    const elNew = document.getElementById('mgrFolderCountNew');
    const elWorking = document.getElementById('mgrFolderCountWorking');
    const elReady = document.getElementById('mgrFolderCountReady');
    const elArchived = document.getElementById('mgrFolderCountArchived');

    if (elNew) elNew.innerText = countNew;
    if (elWorking) elWorking.innerText = countWorking;
    if (elReady) elReady.innerText = countReady;
    if (elArchived) elArchived.innerText = countArchived;
}

let currentManagerFolder = '';
function openManagerFolder(type) {
    currentManagerFolder = type;
    document.getElementById('mgrFoldersGrid').classList.add('hidden');
    document.getElementById('mgrFolderViewSection').classList.remove('hidden');
    document.getElementById('managerTaskActionSection').classList.add('hidden');

    const titles = {
        'new': '🆕 التكاليف الجديدة',
        'working': '⏳ جاري العمل عليها',
        'ready': '👁️ جاهزة للمراجعة والتقييم',
        'archived': '🗄️ الأرشيف والمنجزة'
    };
    document.getElementById('mgrCurrentFolderTitle').innerText = titles[type];
    handleManagerSearch();
}

function closeManagerFolder() {
    currentManagerFolder = '';
    document.getElementById('mgrFoldersGrid').classList.remove('hidden');
    document.getElementById('mgrFolderViewSection').classList.add('hidden');
    document.getElementById('managerTaskActionSection').classList.add('hidden');
}

function handleManagerSearch() {
    if (!currentManagerFolder) return;
    const search = document.getElementById('mgrSearchInput').value.toLowerCase();
    const emp = document.getElementById('mgrFilterEmp').value;

    let filtered = globalTasks.filter(t => {
        const titleStr = String(t.taskDetails || '').toLowerCase();
        const idStr = String(t.taskId || '').toLowerCase();
        const matchSearch = titleStr.includes(search) || idStr.includes(search) || (t.employeeName || '').toLowerCase().includes(search);
        const matchEmp = emp ? t.employeeName === emp : true;
        return matchSearch && matchEmp;
    });

    if (currentManagerFolder === 'new') {
        filtered = filtered.filter(t => t.taskStatus === 'مرسل' || !t.taskStatus);
    } else if (currentManagerFolder === 'working') {
        filtered = filtered.filter(t => String(t.taskStatus).includes('جاري') || String(t.taskStatus).includes('اعتذار') || String(t.taskStatus).includes('متوقف') || String(t.taskStatus).includes('مرتجع') || String(t.taskStatus).includes('تمديد'));
    } else if (currentManagerFolder === 'ready') {
        filtered = filtered.filter(t => t.taskStatus === 'جاهز للمراجعة');
    } else if (currentManagerFolder === 'archived') {
        filtered = filtered.filter(t => String(t.taskStatus).includes('مغلق') || String(t.taskStatus).includes('ملغي'));
    }

    renderManagerDashboardTable(filtered);
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
        if (task.taskStatus === 'تم الرد' || String(task.taskStatus).includes('جاهز')) statusColor = 'bg-purple-50 text-purple-700';
        else if (String(task.taskStatus).includes('متوقف') || String(task.taskStatus).includes('مرفوض') || String(task.taskStatus).includes('اعتذار') || String(task.taskStatus).includes('مرتجع')) statusColor = 'bg-red-50 text-red-700';
        else if (String(task.taskStatus).includes('مغلق')) statusColor = 'bg-green-50 text-green-700';
        else if (String(task.taskStatus).includes('ملغي')) statusColor = 'bg-gray-200 text-gray-600';

        let dateStr = task.dueDate;
        try { dateStr = getLocalDateString(dateStr); } catch (e) { }

        let isLate = false;
        if (task.dueDate && !String(task.taskStatus).includes('مغلق') && !String(task.taskStatus).includes('ملغي')) {
            const due = new Date(task.dueDate); due.setHours(23, 59, 59);
            if (Date.now() > due.getTime()) isLate = true;
        }

        tbody.innerHTML += `
            <div onclick="openManagerTaskDetails('${task.taskId}')" class="bg-white p-4 md:p-5 rounded-2xl border ${isLate ? 'border-red-200 hover:border-red-400 hover:shadow-md' : 'border-gray-100 hover:border-primary/50 hover:shadow-md'} transition-all duration-300 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden group">
                ${isLate ? '<div class="absolute top-0 right-0 w-2 h-full bg-red-500"></div>' : ''}
                <div class="flex-1 pr-2">
                    <h4 class="font-extrabold text-lg text-gray-800 group-hover:text-primary transition-colors mb-2">${title}</h4>
                    <div class="flex flex-wrap items-center gap-2 mt-1">
                        <span class="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded-md text-xs font-bold border border-blue-100 shadow-sm">
                            🏢 ${task.requesterName || 'جهة غير محددة'}
                        </span>
                        <span class="inline-flex items-center gap-1 bg-gray-50 text-gray-600 px-2 py-1 rounded-md text-xs font-bold border border-gray-100 shadow-sm">
                            👤 ${task.employeeName}
                        </span>
                        <span class="text-[10px] text-gray-400 font-mono ml-auto">#${task.taskId}</span>
                    </div>
                </div>
                <div class="flex flex-wrap md:flex-nowrap items-center gap-3">
                    <span class="${statusColor} px-3 py-1 rounded-lg text-xs font-bold border border-current opacity-80">${task.taskStatus || 'مرسل'}</span>
                    <span class="${pColor} px-3 py-1 rounded-lg text-xs font-bold">${priority}</span>
                    <span class="${isLate ? 'bg-red-50 text-red-700 border-red-200' : 'bg-gray-50 text-gray-600 border-gray-200'} border px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1">
                        📅 ${dateStr} ${isLate ? '⚠️' : ''}
                    </span>
                </div>
            </div>
        `;
    });
}

function openManagerTaskDetails(taskId) {
    const task = globalTasks.find(t => t.taskId === taskId);
    if (!task) return;

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
    document.getElementById('mgrTaskId').innerText = taskId;
    document.getElementById('mgrTaskDesc').innerText = cleanDesc ? 'تفاصيل التكليف: -\n' + cleanDesc : 'لا يوجد تفاصيل إضافية.';
    const banner = document.getElementById('mgrUrgencyBanner');
    const statusBadge = document.getElementById('mgrTaskStatusBadge');
    const timeBadge = document.getElementById('mgrTaskTimeBadge');

    if (statusBadge) {
        statusBadge.innerText = task.taskStatus || 'جديد';
        statusBadge.className = 'text-[11px] px-3 py-1 rounded-full font-bold shadow-sm border border-gray-100';
        if (task.taskStatus === 'جاهز للمراجعة') statusBadge.classList.add('bg-green-100', 'text-green-700');
        else if (task.taskStatus === 'مغلق ومُقيم' || task.taskStatus === 'ملغي') statusBadge.classList.add('bg-gray-100', 'text-gray-700');
        else if (task.taskStatus === 'متوقف لعائق') statusBadge.classList.add('bg-red-100', 'text-red-700');
        else if (task.taskStatus === 'طلب تمديد موعد') statusBadge.classList.add('bg-orange-100', 'text-orange-700');
        else statusBadge.classList.add('bg-blue-100', 'text-blue-700');
    }

    if (task.taskStatus !== 'مغلق ومُقيم' && task.taskStatus !== 'ملغي' && task.taskStatus !== 'جاهز للمراجعة' && task.dueDate) {
        const due = new Date(task.dueDate);
        due.setHours(23, 59, 59);
        const start = new Date(task.createdAt || Date.now()).getTime();
        const now = new Date().getTime();

        let totalDuration = due.getTime() - start;
        if (totalDuration <= 0) totalDuration = 1;
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
            else if (ratio < 0.2) timeBadge.innerHTML = `مهمة جديدة ✨`;
            else if (ratio > 0.8) timeBadge.innerHTML = `يشارف على الانتهاء ⏰`;
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

    document.getElementById('mgrStateDefault').classList.add('hidden');
    document.getElementById('mgrStateExtension').classList.add('hidden');
    document.getElementById('mgrStateReview').classList.add('hidden');
    document.getElementById('mgrStateClosed').classList.add('hidden');
    document.getElementById('mgrCommonNoteWrapper').classList.remove('hidden');

    document.getElementById('mgrStateDefault').classList.remove('flex', 'flex-col');
    document.getElementById('mgrStateExtension').classList.remove('flex', 'flex-col');
    document.getElementById('mgrStateReview').classList.remove('flex', 'flex-col');

    const tStatus = task.taskStatus || 'مرسل';
    if (tStatus === 'مغلق ومُقيم' || tStatus === 'ملغي') {
        document.getElementById('mgrStateClosed').classList.remove('hidden');
        document.getElementById('mgrCommonNoteWrapper').classList.add('hidden');
    } else if (tStatus === 'جاهز للمراجعة') {
        document.getElementById('mgrStateReview').classList.remove('hidden');
        document.getElementById('mgrStateReview').classList.add('flex', 'flex-col');

        // Calculate Speed Score
        let speedScore = 0;
        try {
            const due = new Date(task.dueDate + 'T23:59:59');
            const now = task.submittedAt ? new Date(task.submittedAt) : new Date();
            if (now <= due) {
                speedScore = 30;
            } else {
                const diffTime = Math.abs(now - due);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                if (diffDays === 1) speedScore = 20;
                else if (diffDays === 2) speedScore = 10;
                else speedScore = 0;
            }
        } catch (e) { speedScore = 30; }

        const speedDisplay = document.getElementById('mgrSpeedDisplay');
        const speedHidden = document.getElementById('mgrSpeedHiddenValue');
        if (speedDisplay) speedDisplay.innerText = speedScore;
        if (speedHidden) speedHidden.value = speedScore;

        const selectedRadio = document.querySelector('input[name="mgrQualityScore"][value="70"]');
        if (selectedRadio) selectedRadio.checked = true;
        updateLiveTotalScore();
    } else if (tStatus === 'طلب تمديد موعد') {
        document.getElementById('mgrStateExtension').classList.remove('hidden');
        document.getElementById('mgrStateExtension').classList.add('flex', 'flex-col');
        document.getElementById('mgrNewDueDate').value = task.dueDate || '';
    } else {
        document.getElementById('mgrStateDefault').classList.remove('hidden');
        document.getElementById('mgrStateDefault').classList.add('flex', 'flex-col');
    }

    document.getElementById('mgrTaskNote').value = '';

    const historyContainer = document.getElementById('mgrChatHistory');
    historyContainer.innerHTML = '';

    // Add original task details as the first chat bubble
    let createdDate = task.createdAt || Date.now();
    let cDateStr = '';
    try {
        const cd = new Date(createdDate);
        cDateStr = cd.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) + ' - ' + cd.toLocaleDateString('ar-SA');
    } catch (e) { }

    historyContainer.innerHTML += `
        <div class="max-w-[85%] md:max-w-[70%] ml-auto bg-[#dcf8c6] rounded-tl-none p-3 rounded-2xl shadow-sm relative mb-2 border border-black/5">
            <div class="text-[11px] font-extrabold text-[#075e54] mb-1">~ أنا (${task.requesterName || 'الجهة الطالبة للتكليف'})</div>
            <div class="whitespace-pre-wrap text-[15px] leading-relaxed text-gray-800 font-medium">${cleanDesc}</div>
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
            } catch (e) { }

            let isManager = false;
            if (item.sender) {
                isManager = (item.sender === 'manager');
            } else {
                isManager = item.status.includes('تقييم') || item.status.includes('إرجاع') || item.status.includes('تحديث من الإدارة') || item.status.includes('إلغاء') || item.status.includes('مغلق') || item.status.includes('ملغي') || (item.reply && (item.reply.includes('تم إرجاع') || item.reply.includes('الإدارة') || item.reply.includes('👑') || item.reply.startsWith('✅') || item.reply.startsWith('❌') || item.reply.startsWith('📅') || item.reply.startsWith('↩️') || item.reply.startsWith('💬')));
            }

            const alignClass = isManager ? 'ml-auto bg-[#dcf8c6] rounded-tl-none' : 'mr-auto bg-white rounded-tr-none';
            let senderName = isManager ? `~ أنا (${task.requesterName || 'الجهة الطالبة للتكليف'})` : `~ ${task.employeeName || 'الموظف'}`;
            let nameColor = isManager ? 'text-[#075e54]' : 'text-gray-500';

            historyContainer.innerHTML += `
                <div class="max-w-[85%] md:max-w-[70%] ${alignClass} p-3 rounded-2xl shadow-sm relative mb-2 border border-black/5">
                    <div class="text-[11px] font-extrabold ${nameColor} mb-1 flex justify-between">
                        <span>${senderName}</span>
                        <span class="bg-black/5 px-2 py-0.5 rounded text-[9px] font-mono">${item.status}</span>
                    </div>
                    <div class="whitespace-pre-wrap text-[15px] leading-relaxed text-gray-800 font-medium">${item.reply || ''}</div>
                    ${item.attachmentUrl ? `<a href="${item.attachmentUrl}" target="_blank" class="mt-2 inline-flex items-center gap-1 bg-black/5 text-gray-700 px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-black/10 transition">📎 عرض المرفق</a>` : ''}
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
    document.getElementById('mgrFolderViewSection').classList.remove('hidden');
}

function updateLiveTotalScore() {
    const speedStr = document.getElementById('mgrSpeedHiddenValue')?.value || '0';
    const speed = parseInt(speedStr) || 0;
    const checkedRadio = document.querySelector('input[name="mgrQualityScore"]:checked');
    const quality = checkedRadio ? parseInt(checkedRadio.value) : 0;
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
    const task = globalTasks.find(t => t.taskId === taskId);
    if (!task) return;

    let score = '70';
    const checkedRadio = document.querySelector('input[name="mgrQualityScore"]:checked');
    if (checkedRadio) score = checkedRadio.value;
    let note = document.getElementById('mgrTaskNote').value.trim();

    let speedScore = 0;
    if (actionType === 'مغلق ومُقيم') {
        const speedHidden = document.getElementById('mgrSpeedHiddenValue');
        if (speedHidden) speedScore = parseInt(speedHidden.value) || 0;
    }

    if (actionType === 'مغلق ومُقيم' && (score === '' || score < 0 || score > 70)) {
        alert('الرجاء إدخال تقييم صحيح لجودة المخرجات من 0 إلى 70');
        return;
    }
    if ((actionType === 'مرتجع للتعديل' || actionType === 'تحديث من الإدارة') && !note) {
        alert('الرجاء كتابة رسالة/ملاحظة للموظف');
        return;
    }
    if (actionType === 'ملغي') {
        if (!confirm('هل أنت متأكد من إلغاء هذا التكليف نهائياً؟')) return;
    }

    let prefix = '👑 تحديث الإدارة: ';
    if (actionType === 'مغلق ومُقيم') {
        prefix = `✅ تم إغلاق التكليف بنجاح.\nملاحظة الإدارة: `;
    }
    if (actionType === 'مرتجع للتعديل') prefix = '↩️ إرجاع للتعديل: ';
    if (actionType === 'ملغي') prefix = '❌ التكليف ملغي: ';
    if (actionType === 'تحديث من الإدارة') prefix = '💬 رسالة/توجيه: ';

    const replyText = prefix + (note ? note : (actionType === 'مغلق ومُقيم' ? 'أحسنت العمل.' : ''));

    const replyObj = {
        sender: 'manager',
        date: new Date().toISOString(),
        status: actionType,
        reply: replyText,
        attachmentUrl: ''
    };

    let updateData = {
        replyHistory: firebase.firestore.FieldValue.arrayUnion(replyObj)
    };

    if (actionType !== 'تحديث من الإدارة') {
        updateData.taskStatus = actionType;
    }

    if (actionType === 'مغلق ومُقيم') {
        updateData.managerScore = String(score);
        updateData.speedScore = String(speedScore);
    }

    try {
        await db.collection('Tasks').doc(taskId).update(updateData);
        alert('تم تطبيق الإجراء بنجاح!');

        let phone = task.employeePhone;
        if (!phone) {
            const emp = employeesData.find(e => e.name === task.employeeName);
            if (emp) phone = emp.phone;
        }
        if (phone) {
            let title = String(task.taskDetails || '').split('\n')[0].replace('العنوان: ', '');
            if (!title) title = 'تكليف: ' + task.taskId;
            const taskUrl = window.location.origin + window.location.pathname + '?id=' + task.taskId;
            let smsMessage = `تم تحديث حالة تكليفك: (${title})\nالإجراء: ${actionType}\nالملاحظات: ${note}\nللتفاصيل: ${taskUrl}`;
            sendSmsDirect(phone, smsMessage);
        }

        closeManagerTaskAction();
        loadTasks();
    } catch (err) {
        alert('خطأ في الاتصال بقاعدة البيانات: ' + err.message);
    }
}

async function managerUpdateDate() {
    const taskId = document.getElementById('mgrTaskId').innerText;
    const task = globalTasks.find(t => t.taskId === taskId);
    if (!task) return;

    let newDate = document.getElementById('mgrNewDueDate').value;
    let note = document.getElementById('mgrTaskNote').value.trim();

    if (!newDate) {
        alert('الرجاء اختيار تاريخ جديد من حقل (تحديث موعد التسليم).');
        return;
    }

    const replyObj = {
        sender: 'manager',
        date: new Date().toISOString(),
        status: 'تمديد موعد',
        reply: `📅 تم تحديث موعد التسليم إلى: ${newDate}\n${note ? 'ملاحظة: ' + note : ''}`,
        attachmentUrl: ''
    };

    try {
        await db.collection('Tasks').doc(taskId).update({
            dueDate: newDate,
            taskStatus: 'جاري العمل',
            replyHistory: firebase.firestore.FieldValue.arrayUnion(replyObj)
        });
        alert('تم تحديث موعد التسليم بنجاح!');
        closeManagerTaskAction();
        loadTasks();
    } catch (e) {
        alert('حدث خطأ: ' + e.message);
    }
}

async function managerRejectExtension() {
    const taskId = document.getElementById('mgrTaskId').innerText;
    const task = globalTasks.find(t => t.taskId === taskId);
    if (!task) return;

    let note = document.getElementById('mgrTaskNote').value.trim();
    if (!note) {
        alert('الرجاء كتابة سبب رفض التمديد في حقل الرسالة.');
        return;
    }

    const replyObj = {
        sender: 'manager',
        date: new Date().toISOString(),
        status: 'جاري العمل',
        reply: `❌ الإدارة رفضت طلب تمديد الموعد.\nالسبب: ${note}`,
        attachmentUrl: ''
    };

    try {
        await db.collection('Tasks').doc(taskId).update({
            taskStatus: 'جاري العمل',
            replyHistory: firebase.firestore.FieldValue.arrayUnion(replyObj)
        });
        alert('تم رفض طلب التمديد وإشعار الموظف.');

        let phone = task.employeePhone;
        if (!phone) {
            const emp = employeesData.find(e => e.name === task.employeeName);
            if (emp) phone = emp.phone;
        }
        if (phone) {
            let title = String(task.taskDetails || '').split('\n')[0].replace('العنوان: ', '');
            if (!title) title = 'تكليف: ' + task.taskId;
            const taskUrl = window.location.origin + window.location.pathname + '?id=' + task.taskId;
            sendSmsDirect(phone, `تم رفض طلب تمديد التكليف: (${title})\nالسبب: ${note}\nللتفاصيل: ${taskUrl}`);
        }

        closeManagerTaskAction();
        loadTasks();
    } catch (e) {
        alert('حدث خطأ: ' + e.message);
    }
}

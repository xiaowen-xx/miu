// --- START OF FILE script.js ---

function setAppHeight() { const vh = window.innerHeight; document.documentElement.style.setProperty('--app-height', `${vh}px`); }
window.addEventListener('resize', setAppHeight); setAppHeight();

const db = new Dexie('GeminiChatDB');
db.version(1).stores({ chats: '&id, name, isPinned', globalSettings: '&id', apiConfig: '&id', posts: '++id' });

let globalData = {};
let chatList = [];
let worldBooks = []; 
let wbGroups = ['默认分组']; 
let tempSelectedWb = [];
let currentChatId = null;
let apiProfiles = [];
let uploadContext = null;
let tempBoundCharId = null;
let currentWbFilter = 'all'; 
let savedFonts = []; 
let currentFontUrl = ''; 
let isWbManageMode = false; 
let editingWbId = null; 

async function loadAllDataFromDB() {
    try {
        const [settings, chats, configs] = await Promise.all([db.globalSettings.get('main'), db.chats.toArray(), db.apiConfig.toArray()]);
        if (settings) {
            globalData = settings;
            if(globalData.headerImg) document.getElementById('headerImg').src = globalData.headerImg;
            if(globalData.avatarImg) document.getElementById('avatarImg').src = globalData.avatarImg;
            if(globalData.kaomoji) document.getElementById('homeKaomoji').innerText = globalData.kaomoji;
            if(globalData.handle) document.getElementById('homeHandle').innerText = globalData.handle;
            if(globalData.bio) document.getElementById('homeBio').innerText = globalData.bio;
            if(globalData.location) document.getElementById('locationText').innerText = globalData.location;
            if(globalData.meBanner) document.getElementById('meBannerImg').src = globalData.meBanner;
            if(globalData.meAvatar) document.getElementById('meAvatarImg').src = globalData.meAvatar;
            if(globalData.meSlogan) document.getElementById('meSlogan').innerText = globalData.meSlogan;
            if(globalData.apiKey) document.getElementById('apiKey').value = globalData.apiKey;
            if(globalData.kawaiiAvatarLeft) document.getElementById('kawaiiAvatarLeft').src = globalData.kawaiiAvatarLeft;
            if(globalData.kawaiiAvatarRight) document.getElementById('kawaiiAvatarRight').src = globalData.kawaiiAvatarRight;
            if(globalData.kawaiiText) document.getElementById('kawaiiText').innerText = globalData.kawaiiText;
            if(globalData.kawaiiBottomText) document.getElementById('kawaiiBottomText').innerText = globalData.kawaiiBottomText;
            if(globalData.widgetTitle) document.getElementById('widgetTitle').innerText = globalData.widgetTitle;
            if(globalData.captchaLabel) document.getElementById('captchaLabel').innerText = globalData.captchaLabel;
            if(globalData.captchaInput) document.getElementById('captchaInput').innerText = globalData.captchaInput;
            if(globalData.captchaImg) document.getElementById('captchaImg').src = globalData.captchaImg;
            if(globalData.dockIcon1) document.getElementById('dockIcon1').src = globalData.dockIcon1;
            if(globalData.dockIcon2) document.getElementById('dockIcon2').src = globalData.dockIcon2;
            if(globalData.dockIcon3) document.getElementById('dockIcon3').src = globalData.dockIcon3;
            if(globalData.dockIcon4) document.getElementById('dockIcon4').src = globalData.dockIcon4;
            if(globalData.app5Icon) { document.getElementById('app5Img').src = globalData.app5Icon; document.getElementById('app5Img').style.display = 'block'; document.getElementById('app5Default').style.display = 'none'; }
            if(globalData.app6Icon) { document.getElementById('app6Img').src = globalData.app6Icon; document.getElementById('app6Img').style.display = 'block'; document.getElementById('app6Default').style.display = 'none'; }
            if(globalData.homeWallpaper) { document.body.style.backgroundImage = `url(${globalData.homeWallpaper})`; document.body.classList.add('has-wallpaper'); }
            if(globalData.wechatWallpaper) { document.getElementById('chatAppPage').style.backgroundImage = `url(${globalData.wechatWallpaper})`; document.getElementById('chatAppPage').style.backgroundSize = 'cover'; document.getElementById('chatAppPage').style.backgroundPosition = 'center'; }
            
            if(globalData.chatRoomWallpaper) { 
                const room = document.getElementById('chatRoom');
                room.style.backgroundImage = `url(${globalData.chatRoomWallpaper})`; 
                room.style.backgroundSize = 'cover'; 
                room.style.backgroundPosition = 'center'; 
                room.style.backgroundRepeat = 'no-repeat';
            }    
            
            if(globalData.apiModel) { const sel = document.getElementById('apiModel'); let exists = false; for(let i=0; i<sel.options.length; i++) { if(sel.options[i].value === globalData.apiModel) exists = true; } if(!exists) { const opt = document.createElement('option'); opt.value = globalData.apiModel; opt.innerText = globalData.apiModel; sel.add(opt); } sel.value = globalData.apiModel; }
            if(globalData.apiTemp) { document.getElementById('apiTemp').value = globalData.apiTemp; document.getElementById('tempDisplay').innerText = globalData.apiTemp; }
            
            worldBooks = globalData.worldBooksObj || []; 
            savedFonts = globalData.savedFonts || [];
            if (globalData.currentFontUrl && globalData.currentFontFamily) {
                currentFontUrl = globalData.currentFontUrl;
                const savedName = globalData.currentFontFamily.split(',')[0].replace(/['"]/g, '');
                const f = new FontFace(savedName, `url(${currentFontUrl})`);
                f.load().then(loaded => {
                    document.fonts.add(loaded);
                    document.body.style.fontFamily = globalData.currentFontFamily;
                }).catch(e => console.log('恢复字体失败', e));
            }
            wbGroups = globalData.wbGroups || ['默认分组'];
        }
        chatList = chats || [];
        initStickers(); 
        
        chatList = chats || [];
        // 强制刷新一遍所有对话的预览，把旧的“大图”变成“[动画表情]”
        chatList.forEach(chat => {
            if (chat.messages.length > 0) {
                updateChatLastMsg(chat); // 调用你刚才加的那个修复函数
            }
        });
        chatList.forEach(chat => { if(!chat.messages) chat.messages = []; });
        chatList.sort((a, b) => { if (a.isPinned !== b.isPinned) return b.isPinned - a.isPinned; return b.id - a.id; });
        renderChatList();   
        apiProfiles = configs || [];
        renderApiProfiles();
    } catch (err) { console.error("Database loading failed:", err); }
}

async function saveData() {
    const settingsToSave = {
        id: 'main',
        headerImg: document.getElementById('headerImg').src,
        avatarImg: document.getElementById('avatarImg').src,
        kaomoji: document.getElementById('homeKaomoji').innerText,
        handle: document.getElementById('homeHandle').innerText,
        bio: document.getElementById('homeBio').innerText,
        location: document.getElementById('locationText').innerText,
        meBanner: document.getElementById('meBannerImg').src,
        meAvatar: document.getElementById('meAvatarImg').src,
        meSlogan: document.getElementById('meSlogan').innerText,
        apiEndpoint: document.getElementById('apiEndpoint').value,
        apiKey: document.getElementById('apiKey').value,
        apiModel: document.getElementById('apiModel').value,
        apiTemp: document.getElementById('apiTemp').value,
        kawaiiAvatarLeft: document.getElementById('kawaiiAvatarLeft').src,
        kawaiiAvatarRight: document.getElementById('kawaiiAvatarRight').src,
        kawaiiText: document.getElementById('kawaiiText').innerText,
        kawaiiBottomText: document.getElementById('kawaiiBottomText').innerText,
        widgetTitle: document.getElementById('widgetTitle').innerText,
        captchaLabel: document.getElementById('captchaLabel').innerText,
        captchaInput: document.getElementById('captchaInput').innerText,
        captchaImg: document.getElementById('captchaImg').src,
        dockIcon1: document.getElementById('dockIcon1').src,
        dockIcon2: document.getElementById('dockIcon2').src,
        dockIcon3: document.getElementById('dockIcon3').src,
        dockIcon4: document.getElementById('dockIcon4').src,
        app5Icon: document.getElementById('app5Img').style.display === 'block' ? document.getElementById('app5Img').src : '',
        app6Icon: document.getElementById('app6Img').style.display === 'block' ? document.getElementById('app6Img').src : '',
        homeWallpaper: document.body.style.backgroundImage.slice(5, -2).replace(/['"]/g, ""),
        wechatWallpaper: document.getElementById('chatAppPage').style.backgroundImage.slice(5, -2).replace(/['"]/g, ""),
        chatRoomWallpaper: document.getElementById('chatRoom').style.backgroundImage.slice(5, -2).replace(/['"]/g, ""),
        worldBooksObj: worldBooks, 
        wbGroups: wbGroups, 
        savedFonts: savedFonts,
        currentFontUrl: currentFontUrl,
        currentFontFamily: document.body.style.fontFamily,
        cssPresets: globalData.cssPresets, // 确保预设也被保存
        stickers: typeof myStickers !== 'undefined' ? myStickers : []     
    };
    try {
        await db.globalSettings.put(settingsToSave);
        if (chatList.length > 0) await db.chats.bulkPut(chatList); else await db.chats.clear();
        if (apiProfiles.length > 0) await db.apiConfig.bulkPut(apiProfiles);
    } catch (e) { console.error("Save failed", e); }
}

function openFontSettings() {
    document.getElementById('fontSettingsPage').classList.add('active');
    renderFontSchemes();
}
function closeFontSettings() {
    document.getElementById('fontSettingsPage').classList.remove('active');
}

async function applyGlobalFont(fontName, fontUrl) {
    try {
        const newFont = new FontFace(fontName, `url(${fontUrl})`);
        const loadedFace = await newFont.load();
        document.fonts.add(loadedFace);
        document.body.style.fontFamily = `"${fontName}", -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif`;
        currentFontUrl = fontUrl; 
    } catch (err) {
        alert('字体加载失败，请检查链接或文件是否有效。\n' + err.message);
    }
}

function setFontByLink() {
    const url = prompt("请输入字体文件链接 (TTF/WOFF):");
    if(url) {
        const tempName = 'CustomFont_' + Date.now();
        applyGlobalFont(tempName, url);
    }
}

function handleFontFile(input) {
    const file = input.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        const result = e.target.result; 
        const tempName = 'LocalFont_' + Date.now();
        applyGlobalFont(tempName, result);
    };
    reader.readAsDataURL(file);
    input.value = '';
}

function resetDefaultFont() {
    document.body.style.fontFamily = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif';
    currentFontUrl = '';
    saveData();
}

function saveFontScheme() {
    const name = document.getElementById('fontSchemeName').value.trim();
    if(!name) { alert('请输入方案名称'); return; }
    if(!currentFontUrl) { alert('当前没有应用自定义字体'); return; }

    const fontId = 'Font_' + Date.now();
    const scheme = { id: fontId, name: name, src: currentFontUrl };

    savedFonts.push(scheme);
    saveData(); 
    renderFontSchemes();
    document.getElementById('fontSchemeName').value = '';
}

function renderFontSchemes() {
    const list = document.getElementById('fontSchemeList');
    list.innerHTML = '';

    savedFonts.forEach((scheme, index) => {
        const fontFaceCheck = new FontFace(scheme.id, `url(${scheme.src})`);
        fontFaceCheck.load().then(loaded => {
            document.fonts.add(loaded);
        }).catch(()=>{});

        const item = document.createElement('div');
        item.className = 'font-scheme-item';
        item.onclick = (e) => {
            if(e.target.classList.contains('font-del-btn') || e.target.closest('.font-del-btn')) return;
            document.body.style.fontFamily = `"${scheme.id}", sans-serif`;
            currentFontUrl = scheme.src;
            saveData();
        };

        item.innerHTML = `
            <div class="font-scheme-left">
                <div class="font-preview-char" style="font-family: '${scheme.id}', sans-serif;">你好</div>
                <div class="font-scheme-info">
                    <div class="font-scheme-name">${scheme.name}</div>
                    <div class="font-scheme-src">${scheme.src.startsWith('data:') ? '本地文件' : '网络链接'}</div>
                </div>
            </div>
            <div class="font-del-btn" onclick="deleteFontScheme(${index})"><i class="fas fa-trash"></i></div>
        `;
        list.appendChild(item);
    });
    
    if(savedFonts.length === 0) {
        list.innerHTML = '<div style="text-align:center;color:#ccc;font-size:12px;padding:10px;">暂无保存的字体方案</div>';
    }
}

function deleteFontScheme(index) {
    if(confirm('删除此字体方案？')) {
        savedFonts.splice(index, 1);
        saveData();
        renderFontSchemes();
    }
}

function openWbFilterSheet() { document.getElementById('wbFilterOverlay').classList.add('active'); }
function closeWbFilterSheet() { document.getElementById('wbFilterOverlay').classList.remove('active'); }
function selectWbFilter(type, el) {
    document.querySelectorAll('.sheet-option').forEach(opt => opt.classList.remove('selected'));
    el.classList.add('selected');
    currentWbFilter = type;
    const textMap = { 'all': '全部类型', 'always': '始终触发', 'keyword': '关键词触发' };
    document.getElementById('wbFilterText').innerText = textMap[type];
    closeWbFilterSheet();
    renderWorldBookPage(); 
}

function openWorldBookSettings() {
    document.getElementById('worldBookSettingsPage').classList.add('active');
    renderWorldBookPage();
}
function closeWorldBookSettings() {
    document.getElementById('worldBookSettingsPage').classList.remove('active');
    document.getElementById('wbPopMenu').style.display = 'none';
}
function toggleWbMenu(e) {
    e.stopPropagation();
    if (isWbManageMode) {
        toggleWbManageMode();
        return;
    }
    const m = document.getElementById('wbPopMenu');
    m.style.display = m.style.display === 'flex' ? 'none' : 'flex';
}

function toggleWbManageMode() {
    isWbManageMode = !isWbManageMode;
    document.getElementById('wbPopMenu').style.display = 'none';
    const btn = document.getElementById('wbHeaderBtn');
    if(isWbManageMode) {
        btn.innerHTML = '<span style="font-size:14px; font-weight:bold; color:#000;">完成</span>';
    } else {
        btn.innerHTML = '<i class="fas fa-plus"></i>';
    }
    renderWorldBookPage();
}

function renderWorldBookPage() {
    const area = document.getElementById('wbContentArea');
    area.innerHTML = '';
    let filteredBooks = worldBooks;
    if (currentWbFilter !== 'all') {
        filteredBooks = worldBooks.filter(wb => wb.triggerType === currentWbFilter);
    }
    const grouped = {};
    wbGroups.forEach(g => grouped[g] = []);
    filteredBooks.forEach(wb => {
        if(!grouped[wb.group]) grouped[wb.group] = []; 
        grouped[wb.group].push(wb);
    });

    for (const [groupName, books] of Object.entries(grouped)) {
        if (books.length === 0) continue; 
        const card = document.createElement('div');
        card.className = 'wb-group-card';
        if (isWbManageMode) {
            card.classList.add('shaking');
            const badge = document.createElement('div');
            badge.className = 'wb-del-badge';
            badge.onclick = (e) => {
                e.stopPropagation();
                if(confirm(`确认删除世界书分组 “${groupName}” 吗？\n\n删除后世界书内包裹的所有条目也将一起删除`)) {
                    worldBooks = worldBooks.filter(b => b.group !== groupName);
                    saveData();
                    renderWorldBookPage();
                }
            };
            card.appendChild(badge);
        } else {
            card.classList.remove('shaking');
        }
        const gTitle = document.createElement('div');
        gTitle.className = 'wb-group-title';
        gTitle.innerText = groupName;
        card.appendChild(gTitle);
        books.forEach(b => {
            const item = document.createElement('div');
            item.className = 'wb-book-item';
            item.innerHTML = `<span>${b.name}</span><span style="font-size:12px;color:#ccc;">${b.entries.length}条目</span>`;
            item.onclick = (e) => {
                if(isWbManageMode) return; 
                openEditWBModal(b);
            };
            card.appendChild(item);
        });
        area.appendChild(card);
    }
    if(filteredBooks.length === 0) {
            area.innerHTML = '<div style="text-align:center;color:#999;margin-top:20px;">暂无符合条件的世界书</div>';
    }
}

function openCreateWBModal() {
    editingWbId = null; 
    document.querySelector('.wb-create-title').innerText = "新建世界书";
    _setupModalFields();
}

function openEditWBModal(wbData) {
    editingWbId = wbData.id; 
    document.querySelector('.wb-create-title').innerText = "修改世界书";
    _setupModalFields(wbData);
}

function _setupModalFields(data = null) {
    document.getElementById('wbPopMenu').style.display = 'none';
    document.getElementById('wbCreateName').value = data ? data.name : '';
    const grpSel = document.getElementById('wbCreateGroup');
    grpSel.innerHTML = '';
    wbGroups.forEach(g => {
        const opt = document.createElement('option');
        opt.value = g; opt.innerText = g;
        grpSel.appendChild(opt);
    });
    if (data) grpSel.value = data.group;
    const toggle = document.getElementById('wbCharToggle');
    const isChar = data ? data.isCharBook : false;
    if (isChar) toggle.classList.add('checked'); else toggle.classList.remove('checked');
    checkCharBind();
    tempBoundCharId = data ? data.boundCharId : null;
    if (tempBoundCharId) {
        const char = chatList.find(c => c.id === tempBoundCharId);
        document.getElementById('wbBoundCharName').innerText = char ? char.name : '未知角色';
    } else {
        document.getElementById('wbBoundCharName').innerText = '无';
    }
    document.getElementById('wbTriggerType').value = data ? data.triggerType : 'always';
    checkKeywords();
    document.getElementById('wbCreateKeywords').value = data ? data.keywords : '';
    const list = document.getElementById('wbEntriesList');
    list.innerHTML = '';
    if (data && data.entries && data.entries.length > 0) {
        data.entries.forEach(entry => addEntryRow(entry.title, entry.content));
    } else {
        addEntryRow(); 
    }
    document.getElementById('wbCreateModal').classList.add('show');
}

function addEntryRow(titleVal = '', contentVal = '') {
    const list = document.getElementById('wbEntriesList');
    const row = document.createElement('div');
    row.className = 'wb-entry-row';
    row.innerHTML = `
        <input type="text" class="wb-entry-input wb-entry-title" placeholder="条目标题 (可选)" value="${titleVal}">
        <textarea class="wb-entry-input wb-entry-content" placeholder="输入内容...">${contentVal}</textarea>
        <i class="fas fa-times wb-del-entry" onclick="this.parentElement.remove()"></i>
    `;
    list.appendChild(row);
}

function saveWorldBook() {
    const name = document.getElementById('wbCreateName').value.trim();
    if(!name) { alert('请输入世界书名称'); return; }
    const group = document.getElementById('wbCreateGroup').value;
    const isCharBook = document.getElementById('wbCharToggle').classList.contains('checked');
    const triggerType = document.getElementById('wbTriggerType').value;
    const keywords = document.getElementById('wbCreateKeywords').value.trim();
    const entries = [];
    document.querySelectorAll('.wb-entry-row').forEach(row => {
        const t = row.querySelector('.wb-entry-title').value.trim();
        const c = row.querySelector('.wb-entry-content').value.trim();
        if(c) entries.push({ title: t, content: c });
    });
    if (editingWbId) {
        const index = worldBooks.findIndex(b => b.id === editingWbId);
        if (index !== -1) {
            worldBooks[index] = {
                ...worldBooks[index], 
                name, group, isCharBook, boundCharId: tempBoundCharId, triggerType, keywords, entries
            };
        }
    } else {
        const newBook = {
            id: Date.now(),
            name, group, isCharBook, boundCharId: tempBoundCharId, triggerType, keywords, entries
        };
        worldBooks.push(newBook);
    }
    saveData();
    closeCreateWBModal();
    renderWorldBookPage();
}

// 1. 切换开关 UI 逻辑
function toggleSwitch(el) {
    el.classList.toggle('checked');
}

// 2. 检查是否显示“绑定角色”区域
function checkCharBind() {
    const toggle = document.getElementById('wbCharToggle');
    const div = document.getElementById('wbBindCharDiv');
    if (toggle.classList.contains('checked')) {
        div.style.display = 'block';
    } else {
        div.style.display = 'none';
    }
}

// 3. 检查是否显示“关键词”输入框
function checkKeywords() {
    const type = document.getElementById('wbTriggerType').value;
    const field = document.getElementById('wbKeywordField');
    if (type === 'keyword') {
        field.style.display = 'flex';
    } else {
        field.style.display = 'none';
    }
}

// 4. 关闭新建/编辑弹窗
function closeCreateWBModal() {
    document.getElementById('wbCreateModal').classList.remove('show');
}

/* --- 分组管理逻辑 --- */
function openGroupManager() {
    document.getElementById('wbGroupOverlay').style.display = 'flex';
    renderGroupList();
}

function closeGroupManager() {
    document.getElementById('wbGroupOverlay').style.display = 'none';
    // 更新主弹窗里的下拉框
    const grpSel = document.getElementById('wbCreateGroup');
    const currentVal = grpSel.value; // 记住当前选的值
    grpSel.innerHTML = '';
    wbGroups.forEach(g => {
        const opt = document.createElement('option');
        opt.value = g; opt.innerText = g;
        grpSel.appendChild(opt);
    });
    // 如果刚才选的值还在，保持选中；否则选中默认
    if (wbGroups.includes(currentVal)) {
        grpSel.value = currentVal;
    }
}

function renderGroupList() {
    const list = document.getElementById('wbGroupList');
    list.innerHTML = '';
    wbGroups.forEach((g, index) => {
        const item = document.createElement('div');
        item.className = 'wb-mini-item';
        // 默认分组不允许删除
        const delBtn = (g === '默认分组') ? '' : `<span class="wb-mini-del" onclick="deleteGroup(${index})">删除</span>`;
        item.innerHTML = `<span>${g}</span>${delBtn}`;
        list.appendChild(item);
    });
}

function addGroup() {
    const input = document.getElementById('wbNewGroupInput');
    const val = input.value.trim();
    if (val && !wbGroups.includes(val)) {
        wbGroups.push(val);
        saveData(); // 保存到数据库
        renderGroupList();
        input.value = '';
    } else if (wbGroups.includes(val)) {
        alert('分组已存在');
    }
}

function deleteGroup(index) {
    if (confirm('确认删除该分组吗？组内的世界书将移动到默认分组。')) {
        const deletedGroup = wbGroups[index];
        wbGroups.splice(index, 1);
        
        // 将被删分组的世界书移动到默认分组
        let modified = false;
        worldBooks.forEach(wb => {
            if (wb.group === deletedGroup) {
                wb.group = '默认分组';
                modified = true;
            }
        });
        
        saveData();
        renderGroupList();
        if(modified) renderWorldBookPage(); // 刷新背景列表
    }
}

/* --- 角色绑定逻辑 --- */
function openCharBinder() {
    document.getElementById('wbCharOverlay').style.display = 'flex';
    renderCharList();
}

function closeCharBinder() {
    document.getElementById('wbCharOverlay').style.display = 'none';
}

function renderCharList() {
    const list = document.getElementById('wbCharList');
    list.innerHTML = '';
    if (chatList.length === 0) {
        list.innerHTML = '<div style="text-align:center;color:#999;">暂无角色，请先在聊天页添加</div>';
        return;
    }
    chatList.forEach(chat => {
        const item = document.createElement('div');
        item.className = 'wb-mini-item';
        item.style.cursor = 'pointer';
        // 点击选中
        item.onclick = () => selectCharForWb(chat.id, chat.name);
        item.innerHTML = `
            <div style="display:flex;align-items:center;gap:10px;">
                <img src="${chat.avatar}" style="width:30px;height:30px;border-radius:50%;object-fit:cover;">
                <span>${chat.name}</span>
            </div>
            ${tempBoundCharId === chat.id ? '<i class="fas fa-check" style="color:green;"></i>' : ''}
        `;
        list.appendChild(item);
    });
}

function selectCharForWb(id, name) {
    tempBoundCharId = id;
    document.getElementById('wbBoundCharName').innerText = name;
    closeCharBinder();
}

function openBeautifyPage() {
    document.getElementById('beautifyPage').classList.add('active');
    
    // 1. 加载 Dock 和 APP 图标预览
    document.getElementById('previewDock1').src = document.getElementById('dockIcon1').src;
    document.getElementById('previewDock2').src = document.getElementById('dockIcon2').src;
    document.getElementById('previewDock3').src = document.getElementById('dockIcon3').src;
    document.getElementById('previewDock4').src = document.getElementById('dockIcon4').src;
    
    if(document.getElementById('app5Img').src) { 
        document.getElementById('previewApp5').src = document.getElementById('app5Img').src; 
        document.getElementById('previewApp5').style.display = 'block'; 
        document.getElementById('previewApp5Default').style.display = 'none'; 
    }
    if(document.getElementById('app6Img').src) { 
        document.getElementById('previewApp6').src = document.getElementById('app6Img').src; 
        document.getElementById('previewApp6').style.display = 'block'; 
        document.getElementById('previewApp6Default').style.display = 'none'; 
    }
    
    // 1. 主屏幕预览
    const homeBg = document.body.style.backgroundImage;
    const wpImg = document.getElementById('wallpaperPreviewImg');
    const wpPh = document.getElementById('wallpaperPlaceholder');
    if (homeBg && homeBg !== 'none' && homeBg !== 'url("")') { 
        wpImg.src = homeBg.slice(5, -2).replace(/['"]/g, ""); wpImg.style.display = 'block'; wpPh.style.display = 'none'; 
    } else { 
        wpImg.style.display = 'none'; wpImg.src = ''; wpPh.style.display = 'flex'; 
    }
    // 2. WeChat 预览
    const chatPage = document.getElementById('chatAppPage');
    const wcBg = chatPage.style.backgroundImage;
    const wcPreviewImg = document.getElementById('wcWallpaperPreviewImg');
    const wcPlaceholder = document.getElementById('wcWallpaperPlaceholder');
    if (wcBg && wcBg !== 'none' && wcBg !== 'url("")') { 
        wcPreviewImg.src = wcBg.slice(5, -2).replace(/['"]/g, ""); wcPreviewImg.style.display = 'block'; wcPlaceholder.style.display = 'none'; 
    } else { 
        wcPreviewImg.style.display = 'none'; wcPreviewImg.src = ''; wcPlaceholder.style.display = 'flex'; 
    }
    // ★★★ 3. 新增：聊天页预览 ★★★
    const room = document.getElementById('chatRoom');
    const roomBg = room.style.backgroundImage;
    const roomPreviewImg = document.getElementById('chatRoomWallpaperPreviewImg');
    const roomPlaceholder = document.getElementById('chatRoomWallpaperPlaceholder');
    if (roomBg && roomBg !== 'none' && roomBg !== 'url("")') { 
        roomPreviewImg.src = roomBg.slice(5, -2).replace(/['"]/g, ""); 
        roomPreviewImg.style.display = 'block'; 
        roomPlaceholder.style.display = 'none'; 
    } else { 
        roomPreviewImg.style.display = 'none'; 
        roomPreviewImg.src = ''; 
        roomPlaceholder.style.display = 'flex'; 
    }
}

function closeBeautifyPage() { 
    document.getElementById('beautifyPage').classList.remove('active'); 
    saveData(); 
}

function changeWallpaper(type) {
    if (type.startsWith('wechat')) {
        uploadContext = { type: 'wechatWallpaper' };
        if (type === 'wechat_link') { 
            const u = prompt("请输入图片链接:"); 
            if(u) handleBeautifyImageUpdate(u); 
        } else { 
            document.getElementById('fileInput').click(); 
        }
    } 
    else if (type.startsWith('chatroom')) {
        uploadContext = { type: 'chatRoomWallpaper' };
        if (type === 'chatroom_link') {
            const u = prompt("请输入图片链接:"); 
            if(u) handleBeautifyImageUpdate(u); 
        } else {
            document.getElementById('fileInput').click(); 
        }
    }
    else {
        uploadContext = { type: 'wallpaper' };
        if (type === 'link') { 
            const u = prompt("请输入图片链接:"); 
            if(u) handleBeautifyImageUpdate(u); 
        } else { 
            document.getElementById('fileInput').click(); 
        }
    }
}

function clearWechatWallpaper() {
    const chatPage = document.getElementById('chatAppPage');
    chatPage.style.backgroundImage = ''; 
    chatPage.style.backgroundSize = '';
    chatPage.style.backgroundPosition = '';
    openBeautifyPage(); 
    saveData();
}

function clearWallpaper() { 
    document.body.style.backgroundImage = ''; 
    document.body.classList.remove('has-wallpaper'); 
    openBeautifyPage(); 
    saveData(); 
}

function handleBeautifyImageUpdate(src) {
    if (!uploadContext) return;
    
    if (uploadContext.type === 'dock') {
        const id = 'dockIcon' + uploadContext.index; 
        const previewId = 'previewDock' + uploadContext.index;
        document.getElementById(id).src = src; 
        document.getElementById(previewId).src = src;
    } else if (uploadContext.type === 'app') {
        const imgId = 'app' + uploadContext.index + 'Img'; document.getElementById(imgId).src = src; document.getElementById(imgId).style.display = 'block'; document.getElementById('app' + uploadContext.index + 'Default').style.display = 'none'; document.getElementById('previewApp' + uploadContext.index).src = src; document.getElementById('previewApp' + uploadContext.index).style.display = 'block'; document.getElementById('previewApp' + uploadContext.index + 'Default').style.display = 'none';
    } else if (uploadContext.type === 'wallpaper') {
        document.body.style.backgroundImage = `url(${src})`; 
        document.body.classList.add('has-wallpaper'); 
        openBeautifyPage();
    } else if (uploadContext.type === 'wechatWallpaper') {
        const chatPage = document.getElementById('chatAppPage');
        chatPage.style.backgroundImage = `url(${src})`; 
        chatPage.style.backgroundSize = 'cover'; 
        chatPage.style.backgroundPosition = 'center'; 
        openBeautifyPage();
    } 
    else if (uploadContext.type === 'chatRoomWallpaper') {
        const room = document.getElementById('chatRoom');
        room.style.backgroundImage = `url(${src})`;
        room.style.backgroundSize = 'cover';
        room.style.backgroundPosition = 'center';
        room.style.backgroundRepeat = 'no-repeat';
        openBeautifyPage(); 
    }

    saveData(); 
    uploadContext = null;
}

async function exportBackup() { try { const settings = await db.globalSettings.get('main'); const chats = await db.chats.toArray(); const configs = await db.apiConfig.toArray(); const backupData = { version: "2.0", timestamp: new Date().toISOString(), settings: settings || {}, chats: chats || [], apiConfig: configs || [] }; const blob = new Blob([JSON.stringify(backupData)], {type: "application/json"}); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `backup_${new Date().toISOString().slice(0,10)}.json`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); alert("备份已开始下载"); } catch (e) { alert("导出失败: " + e.message); } }
async function handleImportFile(input) { const file = input.files[0]; if (!file) return; if (confirm("恢复备份将覆盖当前所有数据，确定继续吗？")) { const reader = new FileReader(); reader.onload = async (e) => { try { const data = JSON.parse(e.target.result); await db.transaction('rw', db.globalSettings, db.chats, db.apiConfig, async () => { await db.globalSettings.clear(); await db.chats.clear(); await db.apiConfig.clear(); if (data.settings) await db.globalSettings.put(data.settings); if (data.chats && data.chats.length) await db.chats.bulkAdd(data.chats); if (data.apiConfig && data.apiConfig.length) await db.apiConfig.bulkAdd(data.apiConfig); }); alert("数据恢复成功，即将刷新页面..."); location.reload(); } catch (err) { alert("恢复失败，文件可能已损坏: " + err.message); } }; reader.readAsText(file); } input.value = ''; }
function openGeneralSettings() { document.getElementById('generalSettingsPage').classList.add('active'); }
function closeGeneralSettings() { document.getElementById('generalSettingsPage').classList.remove('active'); }

function renderMessages(chat) {
    const container = document.getElementById('roomMessages');
    container.innerHTML = ''; 
    
    // 获取当前聊天对象的头像设置 (如果未定义则默认为 true)
    const showAi = (chat.showAiAvatar !== false);
    const showUser = (chat.showUserAvatar !== false);

    const myAvatar = chat.userAvatar || document.getElementById('meAvatarImg').src; 
    const otherAvatar = chat.avatar; 
    
    let lastTimeMinutes = -9999; 
    let lastSenderType = null; 

    chat.messages.forEach((msg, index) => { 
        // --- 时间分割线逻辑 ---
        const [hh, mm] = msg.time.split(':').map(Number); 
        const currentMinutes = hh * 60 + mm; 
        if (index === 0 || (currentMinutes - lastTimeMinutes > 60)) { 
            const dateDiv = document.createElement('div'); 
            dateDiv.className = 'date-divider'; 
            dateDiv.innerText = `Today ${msg.time}`; 
            container.appendChild(dateDiv); 
            lastSenderType = null; 
        } 
        lastTimeMinutes = currentMinutes; 

        // ★★★ 修正点 1：定义缺失的 timeHtml ★★★
        const timeHtml = `<div class="time">${msg.time}</div>`;

        // --- 创建消息行 ---
        const row = document.createElement('div'); 
        const isSelf = msg.isSelf; 
        row.className = `Miu-miu ${isSelf ? 'user' : 'ai'}`;
        
        // ★★★ 修正点 2：处理特殊气泡样式 ★★★
        let specialClass = '';
        if (msg.text.includes('<img')) { 
            specialClass = 'sticker-only';
        } else if (msg.text.includes('voice-inner-container')) {
            specialClass = 'voice-bubble';
        }

        const bubbleHtml = `<div class="content ${specialClass}" data-index="${index}">${msg.text}</div>`;

        let shouldRenderAvatar = true;
        if (isSelf) {
            if (!showUser) shouldRenderAvatar = false;
            else if (lastSenderType === 'user') shouldRenderAvatar = false;
        } else {
            if (!showAi) shouldRenderAvatar = false;
            else if (lastSenderType === 'ai') shouldRenderAvatar = false;
        }

        lastSenderType = isSelf ? 'user' : 'ai';

        // --- 渲染 HTML 结构 ---
        if (isSelf) {
            let avatarHtml = '';
            if (showUser) {
                avatarHtml = `<img src="${myAvatar}" class="avatar-img" style="${shouldRenderAvatar ? '' : 'visibility:hidden;'}">`;
            }
            row.innerHTML = `
                <div class="bubble-wrapper" style="justify-content: flex-end;">
                    ${timeHtml}
                    ${bubbleHtml}
                </div>
                ${avatarHtml} 
            `;
        } else {
            let avatarHtml = '';
            if (showAi) {
                avatarHtml = `<img src="${otherAvatar}" class="avatar-img" style="${shouldRenderAvatar ? '' : 'visibility:hidden;'}">`;
            }
            row.innerHTML = `
                ${avatarHtml}
                <div class="bubble-wrapper" style="justify-content: flex-start;">
                    ${bubbleHtml}
                    ${timeHtml}
                </div>`;
        }
        
        container.appendChild(row); 
    }); 
    
    // 三击重生成逻辑
    const aiBubbles = container.querySelectorAll('.Miu-miu.ai .content');
    aiBubbles.forEach((bubble) => {
        let clicks = 0;
        let timer = null;
        bubble.addEventListener('click', (e) => {
            clicks++;
            if(clicks === 1) {
                timer = setTimeout(() => clicks = 0, 400);
            } else if (clicks === 3) {
                clearTimeout(timer);
                clicks = 0;
                const msgIndex = parseInt(bubble.getAttribute('data-index'));
                if (!isNaN(msgIndex)) {
                     if(confirm("确定要删除这条消息并重新生成吗？")) {
                        chat.messages.splice(msgIndex, 1);
                        saveData();
                        renderMessages(chat);
                        generateAiReply(chat, true);
                     }
                }
            }
        });
    });

    // 长按撤回逻辑
    const selfBubbles = container.querySelectorAll('.Miu-miu.user .content');
    selfBubbles.forEach(bubble => {
        const msgIndex = parseInt(bubble.getAttribute('data-index'));
        const start = (e) => {
            longPressTimer = setTimeout(() => {
                showRecallMenu(bubble, msgIndex);
            }, 500);
        };
        const cancel = () => clearTimeout(longPressTimer);
        bubble.addEventListener('touchstart', start);
        bubble.addEventListener('touchend', cancel);
        bubble.addEventListener('mousedown', start);
        bubble.addEventListener('mouseup', cancel);
        bubble.addEventListener('contextmenu', (e) => e.preventDefault());
    });

    container.scrollTop = container.scrollHeight; 
}

const chatSettingsPage = document.getElementById('chatSettingsPage');
function openChatSettings() { 
    const chat = chatList.find(c => c.id === currentChatId); 
    if (chat) { 
        document.getElementById('settingsCharAvatar').src = chat.avatar; 
        document.getElementById('settingsCharRealNameDisplay').innerText = chat.realName || chat.name; 
        document.getElementById('settingsCharName').innerText = chat.name; 
        
        const currentUserAvatar = chat.userAvatar || document.getElementById('meAvatarImg').src;
        document.getElementById('settingsUserAvatar').src = currentUserAvatar; 
        
        document.getElementById('settingsUserRealNameDisplay').innerText = chat.userRealName || "我的"; 
        document.getElementById('settingsUserName').innerText = chat.userRemark || "默认"; 

        document.getElementById('charPersona').value = chat.charPersona || '';
        document.getElementById('userPersona').value = chat.userPersona || '';
        
        document.getElementById('chatMemory').value = chat.chatMemory || ''; 
        document.getElementById('customCssInput').value = chat.customCss || '';
        
        document.getElementById('memContextLimit').value = chat.memContextLimit || 50;
        document.getElementById('memThreshold').value = chat.memThreshold || 50;
        
        document.getElementById('summaryStart').value = 1;
        document.getElementById('summaryEnd').value = chat.messages.length;

        const toggle = document.getElementById('memAutoToggle');
        const text = document.getElementById('memModeText');
        if (chat.memAutoSummary) {
            toggle.classList.add('checked');
            text.innerText = "自动";
            text.style.color = "#34c759";
        } else {
            toggle.classList.remove('checked');
            text.innerText = "手动";
            text.style.color = "#007aff";
        }
// --- 插入开始 ---
const tAi = document.getElementById('toggleAiAvatar');
const tUser = document.getElementById('toggleUserAvatar');

if (chat.showAiAvatar !== false) tAi.classList.add('checked'); 
else tAi.classList.remove('checked');

if (chat.showUserAvatar !== false) tUser.classList.add('checked'); 
else tUser.classList.remove('checked');
        const previewAiImg = document.getElementById('previewRealAvatar');
        if(previewAiImg) previewAiImg.src = chat.avatar;

        const previewUserImg = document.getElementById('previewUserAvatar');
        if(previewUserImg) previewUserImg.src = currentUserAvatar;

        renderMemSummaryList(chat);
        updateMemStats(chat);
        updateBubblePreview();
        chatSettingsPage.classList.add('active'); 
    } 
}
function closeChatSettings() { chatSettingsPage.classList.remove('active'); }
function editCharNameInSettings() { const chat = chatList.find(c => c.id === currentChatId); if(!chat) return; const realName = prompt("角色真实姓名:", chat.realName); const remark = prompt("备注名:", chat.name); if (realName) chat.realName = realName; if (remark) chat.name = remark; saveData(); openChatSettings(); document.getElementById('roomTitle').innerText = chat.name; renderChatList(); }
function editUserNameInSettings() { const chat = chatList.find(c => c.id === currentChatId); if(!chat) return; const realName = prompt("我的真实姓名:", chat.userRealName || ""); const remark = prompt("角色对我的称呼(备注):", chat.userRemark || ""); if (realName) chat.userRealName = realName; if (remark) chat.userRemark = remark; saveData(); openChatSettings(); }

function saveCurrentChatSettings() {
    const chat = chatList.find(c => c.id === currentChatId);
    if (!chat) return;
// --- 插入开始 ---
chat.showAiAvatar = document.getElementById('toggleAiAvatar').classList.contains('checked');
chat.showUserAvatar = document.getElementById('toggleUserAvatar').classList.contains('checked');
// --- 插入结束 ---

    chat.charPersona = document.getElementById('charPersona').value;
    chat.userPersona = document.getElementById('userPersona').value;
    chat.chatMemory = document.getElementById('chatMemory').value; 
    chat.customCss = document.getElementById('customCssInput').value;

    chat.memContextLimit = parseInt(document.getElementById('memContextLimit').value) || 50;
    chat.memThreshold = parseInt(document.getElementById('memThreshold').value) || 50;
    
    chat.memAutoSummary = document.getElementById('memAutoToggle').classList.contains('checked');

    saveData();
    applyChatCustomCss(chat.customCss);
    
    updateMemStats(chat);
}

function applyChatCustomCss(cssCode) {
    let styleTag = document.getElementById('dynamic-chat-style');
    if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = 'dynamic-chat-style';
        document.head.appendChild(styleTag);
    }
    styleTag.innerHTML = cssCode || '';
}

function openChatRoom(id) {
    currentChatId = id; 
    const chat = chatList.find(c => c.id === id); 
    if(!chat) return; 
    
    // 填充设置页面的数据
    document.getElementById('charPersona').value = chat.charPersona || '';
    document.getElementById('userPersona').value = chat.userPersona || '';
    document.getElementById('chatMemory').value = chat.chatMemory || '';
    document.getElementById('customCssInput').value = chat.customCss || '';
    
    // 应用样式和标题
    applyChatCustomCss(chat.customCss);
    document.getElementById('roomTitle').innerText = chat.name;

    // ★★★ 核心修复：删除了原来在这里操作 roomHeaderAvatar 的代码 ★★★
    // 原来的代码在这里试图设置头像图片，因为标签没了所以报错，现在删掉了就好了

    // 渲染消息并显示
    renderMessages(chat); 
    document.getElementById('chatRoom').classList.add('active'); 
};

function exitChatRoom() {
    document.getElementById('chatRoom').classList.remove('active'); 
    currentChatId = null;
    applyChatCustomCss(''); 
};
const menu = document.getElementById('popMenu'), fileInput = document.getElementById('fileInput'), frame = document.getElementById('phoneFrame');
let currentTargetImg = null; 
function showMenu(e, t) { e.stopPropagation(); if (t === 'settingsCharAvatar') { const chat = chatList.find(c => c.id === currentChatId); currentTargetImg = document.getElementById('settingsCharAvatar'); currentTargetImg.dataset.isChar = 'true'; } else if (t === 'settingsUserAvatar') { currentTargetImg = document.getElementById('settingsUserAvatar'); } else { const map = { 'header': 'headerImg', 'avatar': 'avatarImg', 'newCharAvatar': 'newCharAvatar', 'meBanner': 'meBannerImg', 'meAvatar': 'meAvatarImg', 'kawaiiAvatarLeft': 'kawaiiAvatarLeft', 'kawaiiAvatarRight': 'kawaiiAvatarRight', 'captcha': 'captchaImg' }; if (map[t]) currentTargetImg = document.getElementById(map[t]); } if (currentTargetImg) { const r = frame.getBoundingClientRect(); menu.style.left = (e.clientX - r.left + 15)+'px'; menu.style.top = (e.clientY - r.top - 10)+'px'; menu.style.display = 'flex'; } }
function togglePlusMenu(e) { e.stopPropagation(); const m = document.getElementById('plusMenu'); m.style.display = m.style.display === 'flex' ? 'none' : 'flex'; }

document.addEventListener('click', () => { 
    menu.style.display = 'none'; 
    document.getElementById('plusMenu').style.display='none'; 
    document.getElementById('wbPopMenu').style.display='none'; 
});

function changeByLink() { const u = prompt("链接:"); if(u && currentTargetImg) { handleImageUpdate(u); } menu.style.display='none'; }
function triggerFileInput() { fileInput.click(); menu.style.display='none'; }
fileInput.addEventListener('change', (e) => { const f = e.target.files[0]; if (f && uploadContext) { const r = new FileReader(); r.onload = (ev) => { handleBeautifyImageUpdate(ev.target.result); }; r.readAsDataURL(f); fileInput.value = ''; return; } if(f && currentTargetImg) { const r = new FileReader(); r.onload=(ev)=> { handleImageUpdate(ev.target.result); }; r.readAsDataURL(f); } fileInput.value=''; });

function handleImageUpdate(src) { 
    if (currentTargetImg) {
        currentTargetImg.src = src; 
    }

    if (currentTargetImg && currentTargetImg.id === 'settingsCharAvatar') { 
        const chat = chatList.find(c => c.id === currentChatId); 
        if (chat) chat.avatar = src; 
        
        const headerAvatar = document.getElementById('roomHeaderAvatar');
        if(headerAvatar) {
            headerAvatar.src = src;
            headerAvatar.style.display = 'block';
        }

        renderMessages(chat); 
        renderChatList(); 
    } 
    
    else if (currentTargetImg && currentTargetImg.id === 'settingsUserAvatar') { 
        const chat = chatList.find(c => c.id === currentChatId); 
        if (chat) {
            chat.userAvatar = src; 
            renderMessages(chat); 
        }
    } 
    
    if (currentTargetImg && currentTargetImg.id !== 'newCharAvatar') {
        saveData(); 
    }
}
async function fetchModels() { const endpoint = document.getElementById('apiEndpoint').value.replace(/\/+$/, ''); const key = document.getElementById('apiKey').value; const modelSelect = document.getElementById('apiModel'); if (!key) { alert('请先填写 API Key'); return; } const btn = document.querySelector('.api-btn-small'); const originalText = btn.innerText; btn.innerText = '拉取中...'; try { const response = await fetch(`${endpoint}/models`, { method: 'GET', headers: { 'Authorization': `Bearer ${key}` } }); if (!response.ok) throw new Error('网络请求失败'); const data = await response.json(); modelSelect.innerHTML = ''; if (data.data && Array.isArray(data.data)) { data.data.forEach(model => { const option = document.createElement('option'); option.value = model.id; option.innerText = model.id; modelSelect.appendChild(option); }); alert(`成功拉取 ${data.data.length} 个模型`); } else { alert('格式无法解析，请检查端点'); } saveData(); } catch (error) { alert('拉取失败: ' + error.message); } finally { btn.innerText = originalText; } }
async function saveCurrentConfig() { const name = document.getElementById('configName').value.trim(); if (!name) { alert('请输入方案名称'); return; } const profile = { id: Date.now(), name: name, endpoint: document.getElementById('apiEndpoint').value, key: document.getElementById('apiKey').value, model: document.getElementById('apiModel').value, temp: document.getElementById('apiTemp').value }; apiProfiles.push(profile); await db.apiConfig.put(profile); renderApiProfiles(); document.getElementById('configName').value = ''; }
async function deleteProfile(index) { if(confirm('确定删除该方案吗？')) { const id = apiProfiles[index].id; apiProfiles.splice(index, 1); await db.apiConfig.delete(id); renderApiProfiles(); } }
function loadProfile(index) { const p = apiProfiles[index]; document.getElementById('apiEndpoint').value = p.endpoint; document.getElementById('apiKey').value = p.key; const sel = document.getElementById('apiModel'); let exists = false; for(let i=0; i<sel.options.length; i++) { if(sel.options[i].value === p.model) exists = true; } if(!exists) { const opt = document.createElement('option'); opt.value = p.model; opt.innerText = p.model; sel.add(opt); } sel.value = p.model; document.getElementById('apiTemp').value = p.temp; document.getElementById('tempDisplay').innerText = p.temp; saveData(); alert(`已加载方案: ${p.name}`); }
function renderApiProfiles() { const list = document.getElementById('configList'); list.innerHTML = ''; apiProfiles.forEach((p, index) => { const item = document.createElement('div'); item.className = 'config-card'; item.innerHTML = `<div class="config-info"><div class="config-name">${p.name}</div><div class="config-detail">${p.model} | Temp: ${p.temp}</div></div><div class="config-actions"><div class="config-icon-btn btn-load" onclick="loadProfile(${index})"><i class="fas fa-upload"></i></div><div class="config-icon-btn btn-delete" onclick="deleteProfile(${index})"><i class="fas fa-trash"></i></div></div>`; list.appendChild(item); }); }
function openApiSettings() { document.getElementById('apiSettingsPage').classList.add('active'); renderApiProfiles(); }
function closeApiSettings() { document.getElementById('apiSettingsPage').classList.remove('active'); saveData(); }
function switchAppTab(index) { document.querySelectorAll('.tab-view').forEach(v => v.classList.remove('active')); document.querySelectorAll('.chat-nav-item').forEach(btn => btn.classList.remove('active')); const views = ['view-messages', 'view-diary', 'view-moments', 'view-me']; document.getElementById(views[index]).classList.add('active'); document.querySelectorAll('.chat-nav-item')[index].classList.add('active'); }
function editText(el) { const t = prompt("修改:", el.innerText); if(t) { el.innerText=t; saveData(); } }
function editLocation() { const el = document.getElementById('locationText'); const t = prompt("位置:", el.innerText); if(t) { el.innerText=t; saveData(); } }
function exitChatRoom() { chatRoom.classList.remove('active'); currentChatId = null; }

async function sendMsg() {
    const inputEl = document.getElementById('msgInput');
    const text = inputEl.value.trim();
    
    if (!currentChatId) return;
    const chat = chatList.find(c => c.id === currentChatId);

    // ★ 如果输入框是空的：手动触发 AI 回复
    if (!text) {
        const lastMsg = chat.messages[chat.messages.length - 1];
        if (lastMsg && lastMsg.isLoading) return; 
        generateAiReply(chat);
        return; 
    }

    // ★ 如果输入框有字：只发送文字
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    chat.messages.push({ text: text, isSelf: true, time: timeStr });
    updateChatLastMsg(chat);
    
    if (!chat.isPinned) {
        chatList = chatList.filter(c => c.id !== currentChatId);
        chatList.unshift(chat);
    }
    
    saveData();
    renderMessages(chat);
    renderChatList();

    inputEl.value = ''; 
    inputEl.style.height = '38px'; 

    // --- 自动总结逻辑 (必须在函数内部且在 saveData 之后) ---
    const threshold = chat.memThreshold || 50;
    if (chat.messages.length >= threshold) {
        if (chat.memAutoSummary) {
            await triggerManualSummary(true); 
        } else if(confirm(`消息已达 ${threshold} 条，是否总结记忆？`)) {
            await triggerManualSummary();
        }
    }
}
function renderChatList() { 
    const pinnedSec = document.getElementById('pinnedSection'); 
    const normalSec = document.getElementById('normalSection'); 
    pinnedSec.innerHTML = ''; 
    normalSec.innerHTML = ''; 
    const pinnedItems = chatList.filter(c => c.isPinned); 
    const normalItems = chatList.filter(c => !c.isPinned); 
    if (pinnedItems.length > 0) {
        pinnedSec.style.display = 'flex'; 
        pinnedItems.forEach(item => pinnedSec.appendChild(createChatItem(item))); 
    } else {
        pinnedSec.style.display = 'none'; 
    }
    if (normalItems.length > 0) {
        normalSec.style.display = 'flex'; 
        normalItems.forEach(item => normalSec.appendChild(createChatItem(item))); 
    } else {
        normalSec.style.display = 'none'; 
    }
}

function createChatItem(data) { 
    const wrapper = document.createElement('div'); 
    wrapper.className = 'chat-item-wrapper'; 
    wrapper.dataset.id = data.id; 
    const pinText = data.isPinned ? "取消置顶" : "置顶"; 
    wrapper.innerHTML = `
        <div class="chat-actions-right">
            <div class="action-btn btn-cancel">取消</div>
            <div class="action-btn btn-pin">${pinText}</div>
            <div class="action-btn btn-del">删除</div>
        </div>
        <div class="chat-item-content">
            <img src="${data.avatar}" class="chat-item-avatar">
            <div class="chat-item-text">
                <div class="chat-item-top"><span class="chat-item-name">${data.name}</span><span class="chat-item-time">${data.time}</span></div>
                <div class="chat-item-msg">${data.msg || ''}</div>
            </div>
        </div>
    `;
    bindSwipeLogic(wrapper, data.id); 
    wrapper.querySelector('.btn-cancel').onclick = (e) => { e.stopPropagation(); resetSwipe(wrapper); }; 
    wrapper.querySelector('.btn-pin').onclick = (e) => { e.stopPropagation(); togglePin(data.id); resetSwipe(wrapper); }; 
    wrapper.querySelector('.btn-del').onclick = (e) => { e.stopPropagation(); if(confirm(`确定删除 ${data.name} 吗？`)) { deleteChat(data.id); } else { resetSwipe(wrapper); } }; 
    return wrapper; 
}

function bindSwipeLogic(el, chatId) {
    const content = el.querySelector('.chat-item-content');
    let startX = 0;
    let currentX = 0;
    let isDragging = false;
    let isSwiping = false; 
    const maxSwipe = 210; 
    const start = (e) => {
        if (e.target.closest('.chat-actions-right')) return;
        document.querySelectorAll('.chat-item-content').forEach(c => { if(c !== content) c.style.transform = 'translateX(0)'; });
        startX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
        isDragging = true;
        isSwiping = false; 
        content.style.transition = 'none'; 
    };
    const move = (e) => {
        if (!isDragging) return;
        const x = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
        const diff = x - startX;
        if (diff < -5) { isSwiping = true; }
        if (diff < 0 && diff > -maxSwipe - 50) {
            currentX = diff;
            content.style.transform = `translateX(${currentX}px)`;
        }
    };
    const end = (e) => {
        if (!isDragging) return;
        isDragging = false;
        content.style.transition = 'transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)'; 
        if (!isSwiping || Math.abs(currentX) < 5) {
            content.style.transform = `translateX(0)`;
            openChatRoom(chatId);
            return;
        }
        if (currentX < -80) {
            content.style.transform = `translateX(-${maxSwipe}px)`;
        } else {
            content.style.transform = `translateX(0)`;
        }
        currentX = 0;
    };
    el.addEventListener('touchstart', start);
    el.addEventListener('touchmove', move);
    el.addEventListener('touchend', end);
    el.addEventListener('mousedown', start);
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', end);
}

function resetSwipe(el) {
    const content = el.querySelector('.chat-item-content');
    content.style.transform = 'translateX(0)';
}

async function deleteChat(id) { chatList = chatList.filter(c => c.id !== id); await db.chats.delete(id); renderChatList(); }
function togglePin(id) { const chat = chatList.find(c => c.id === id); if (chat) { chat.isPinned = !chat.isPinned; saveData(); renderChatList(); } }

const addCharModal = document.getElementById('addCharModal');
const wbModal = document.getElementById('wbModal');
const wbList = document.getElementById('wbList');
const wbSelectorText = document.getElementById('wbSelectedText');

function openAddCharModal() {
    document.getElementById('plusMenu').style.display = 'none';
    
    document.getElementById('newCharAvatar').src = 'https://placehold.co/100/e0e0e0/888?text=+';
    document.getElementById('newCharRealName').value = '';
    document.getElementById('newCharName').value = '';
    document.getElementById('newCharSetting').value = '';
    
    tempSelectedWb = [];
    updateWbSelectorText();
    
    addCharModal.style.display = 'flex';
    setTimeout(() => addCharModal.classList.add('show'), 10);
}

function closeAddCharModal() {
    addCharModal.classList.remove('show');
    setTimeout(() => addCharModal.style.display = 'none', 300);
}

function openWorldBookModal() { 
    wbList.innerHTML = ''; 
    if(worldBooks.length === 0) {
        wbList.innerHTML = '<div style="text-align:center;color:#999;margin-top:20px;">暂无世界书<br>请在“我的”页面添加</div>';
    } else {
        worldBooks.forEach(wb => { 
            const item = document.createElement('div'); 
            item.className = 'wb-item'; 
            const isChecked = tempSelectedWb.includes(wb.name) ? 'checked' : ''; 
            item.innerHTML = `<input type="checkbox" class="wb-checkbox" value="${wb.name}" ${isChecked}><span>${wb.name}</span>`; 
            
            item.onclick = (e) => { 
                if(e.target.tagName !== 'INPUT') { 
                    const cb = item.querySelector('input'); 
                    cb.checked = !cb.checked; 
                } 
            }; 
            wbList.appendChild(item); 
        });
    }
    wbModal.style.display = 'flex'; 
}

function confirmWorldBooks() { 
    const checkboxes = document.querySelectorAll('.wb-checkbox:checked'); 
    tempSelectedWb = Array.from(checkboxes).map(cb => cb.value); 
    updateWbSelectorText(); 
    wbModal.style.display = 'none'; 
}

function updateWbSelectorText() { 
    if(tempSelectedWb.length > 0) { 
        wbSelectorText.innerText = tempSelectedWb.join('、'); 
        wbSelectorText.style.color = '#333'; 
    } else { 
        wbSelectorText.innerText = '点击选择世界书...'; 
        wbSelectorText.style.color = '#888'; 
    } 
}

async function confirmAddChar() { 
    const name = document.getElementById('newCharName').value.trim(); 
    if (!name) { 
        alert("请填写备注名 (显示在列表的名字)"); 
        return; 
    } 
    
    const now = new Date();
    const timeStr = String(now.getHours()).padStart(2,'0') + ":" + String(now.getMinutes()).padStart(2,'0');

    const newItem = { 
        id: Date.now(), 
        name: name, 
        realName: document.getElementById('newCharRealName').value.trim(), 
        avatar: document.getElementById('newCharAvatar').src, 
        setting: document.getElementById('newCharSetting').value, 
        worldBooks: tempSelectedWb, 
        msg: "新添加的角色", 
        messages: [],       
        time: timeStr,
        isPinned: false,
        userAvatar: "", 
        userRealName: "",
        userRemark: ""
    }; 
    
    chatList.push(newItem); 
    
    await db.chats.add(newItem); 
    
    renderChatList(); 
    closeAddCharModal(); 
}

const overlay = document.getElementById('appOverlay'), chatPage = document.getElementById('chatAppPage'), genericPage = document.getElementById('genericAppPage'), appTitle = document.getElementById('appTitle');
function openApp(appName) { overlay.classList.add('active'); if (appName === 'Page 1') { chatPage.style.display = 'flex'; genericPage.style.display = 'none'; renderChatList(); switchAppTab(0); } else { chatPage.style.display = 'none'; genericPage.style.display = 'flex'; appTitle.innerText = appName; } }
function closeApp() { overlay.classList.remove('active'); }
function switchWechatTab(el) { document.querySelectorAll('.wechat-tab-btn').forEach(tab => tab.classList.remove('active')); el.classList.add('active'); }
let appStartX = 0; let appIsSwiping = false;
overlay.addEventListener('mousedown', (e) => { const rect = overlay.getBoundingClientRect(); if (e.clientX - rect.left < 40) { appStartX = e.clientX; appIsSwiping = true; } });
overlay.addEventListener('mouseup', (e) => { if (!appIsSwiping) return; if (e.clientX - appStartX > 60) closeApp(); appIsSwiping = false; });
overlay.addEventListener('touchstart', (e) => { const rect = overlay.getBoundingClientRect(); if (e.touches[0].clientX - rect.left < 40) { appStartX = e.touches[0].clientX; appIsSwiping = true; } });
overlay.addEventListener('touchend', (e) => { if (!appIsSwiping) return; if (e.changedTouches[0].clientX - appStartX > 60) closeApp(); appIsSwiping = false; });
function updateClock() { const now = new Date(); const timeStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`; const dateStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`; const timeEl = document.getElementById('realTimeDisplay'); const dateEl = document.getElementById('realDateDisplay'); if(timeEl) timeEl.innerText = timeStr; if(dateEl) dateEl.innerText = dateStr; }
setInterval(updateClock, 1000); updateClock();

function changeDockIcon(index, type) { uploadContext = { type: 'dock', index: index }; if (type === 'link') { const u = prompt("请输入图片链接:"); if(u) handleBeautifyImageUpdate(u); } else { document.getElementById('fileInput').click(); } }
function changeAppIcon(index, type) { uploadContext = { type: 'app', index: index }; if (type === 'link') { const u = prompt("请输入图片链接:"); if(u) handleBeautifyImageUpdate(u); } else { document.getElementById('fileInput').click(); } }
function clearWallpaper() { document.body.style.backgroundImage = ''; document.body.classList.remove('has-wallpaper'); openBeautifyPage(); saveData(); }

const msgInputArea = document.getElementById('msgInput');

// 搜索关键词: autoResizeInput
function autoResizeInput(element) {
    // 每次计算前重置高度，以便缩小
    element.style.height = '38px'; 
    // 根据文字高度动态赋值
    let newHeight = element.scrollHeight;
    // 限制最高高度
    if (newHeight > 120) {
        element.style.height = '120px';
        element.style.overflowY = 'auto';
    } else {
        element.style.height = newHeight + 'px';
        element.style.overflowY = 'hidden';
    }
}

if (msgInputArea) {
    msgInputArea.addEventListener('input', function() {
        autoResizeInput(this);
    });

    msgInputArea.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault(); 
            sendMsg();
            
            this.style.height = '24px'; 
            this.value = ''; 
        }
    });
}
loadAllDataFromDB();

function renderMemSummaryList(chat) {
    const list = document.getElementById('memSummaryList');
    list.innerHTML = '';
    
    if (!chat.summaries) chat.summaries = [];

    if (chat.summaries.length === 0) {
        list.innerHTML = '<div style="text-align:center;font-size:12px;color:#ccc;padding:10px;">暂无总结记录</div>';
        return;
    }

    const reversedSummaries = chat.summaries.map((item, idx) => ({...item, originalIndex: idx})).reverse();

    reversedSummaries.forEach((item) => {
        const card = document.createElement('div');
        card.className = 'mem-summary-card';
        
        card.innerHTML = `
            <div class="mem-card-date">${item.date}</div>
            <textarea class="mem-card-textarea" onchange="updateSummaryContent(${item.originalIndex}, this.value)">${item.content}</textarea>
            <div class="mem-card-actions">
                <span class="mem-del-btn-text" onclick="deleteSummary(${item.originalIndex})">删除</span>
            </div>
        `;
        list.appendChild(card);
    });
}
function toggleMemMode() {
    const toggle = document.getElementById('memAutoToggle');
    const text = document.getElementById('memModeText');
    
    toggle.classList.toggle('checked');
    
    if (toggle.classList.contains('checked')) {
        text.innerText = "自动";
        text.style.color = "#34c759"; 
    } else {
        text.innerText = "手动";
        text.style.color = "#007aff"; 
    }
    
    saveCurrentChatSettings();
}
function toggleBankList() {
    const header = document.getElementById('memBankHeader');
    const container = document.getElementById('memSummaryContainer');
    
    header.classList.toggle('open');
    
    if (header.classList.contains('open')) {
        container.style.display = 'flex';
    } else {
        container.style.display = 'none';
    }
}
function switchMemMode(mode, autoSave = true) {
    const btnAuto = document.getElementById('modeBtnAuto');
    const btnManual = document.getElementById('modeBtnManual');
    
    if (mode === 'auto') {
        btnAuto.classList.add('active');
        btnManual.classList.remove('active');
    } else {
        btnManual.classList.add('active');
        btnAuto.classList.remove('active');
    }

    if (autoSave) saveCurrentChatSettings();
}
async function triggerRangeSummary() {
    const chat = chatList.find(c => c.id === currentChatId);
    if (!chat) return;

    const startVal = parseInt(document.getElementById('summaryStart').value);
    const endVal = parseInt(document.getElementById('summaryEnd').value);
    const totalMsgs = chat.messages.length;

    if (isNaN(startVal) || isNaN(endVal) || startVal < 1 || startVal > endVal) {
        alert("请输入有效的消息范围 (例如 1 到 " + totalMsgs + ")");
        return;
    }
    
    const sliceStart = Math.max(0, startVal - 1);
    const sliceEnd = Math.min(totalMsgs, endVal);
    
    const msgsToProcess = chat.messages.slice(sliceStart, sliceEnd);
    
    if (msgsToProcess.length === 0) {
        alert("选定范围内没有消息！");
        return;
    }

    const confirmMsg = `确定要总结第 ${startVal} 到 ${sliceEnd} 条消息吗？\n(共 ${msgsToProcess.length} 条)`;
    if (!confirm(confirmMsg)) return;

    await executeSummaryApi(chat, msgsToProcess, `范围总结 (${startVal}-${sliceEnd})`);
}

async function executeSummaryApi(chat, messagesArray, dateSuffix = "") {
    const endpoint = document.getElementById('apiEndpoint').value;
    const key = document.getElementById('apiKey').value;
    const model = document.getElementById('apiModel').value;

    if (!key) { alert("请先填写 API Key"); return; }

    const originalText = document.querySelector('.plump-btn').innerHTML;
    document.querySelector('.plump-btn').innerHTML = '<i class="fas fa-spinner fa-spin"></i> 处理中...';

    const promptText = messagesArray.map(m => `${m.isSelf ? '用户' : chat.name}: ${m.text}`).join('\n');
    const systemPrompt = `
    请对以下对话内容进行简明扼要的总结，提取关键信息、事件进展和情感变化。
    总结内容将作为“长期记忆”存储。
    
    对话片段：
    ${promptText}
    
    请直接输出总结内容。
    `;

    try {
        const response = await fetch(`${endpoint}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
            body: JSON.stringify({
                model: model,
                messages: [{ role: "user", content: systemPrompt }],
                temperature: 0.7
            })
        });

        if (!response.ok) throw new Error('API请求失败');
        
        const data = await response.json();
        const summaryText = data.choices[0].message.content.trim();

        if (!chat.summaries) chat.summaries = [];
        chat.summaries.push({
            date: new Date().toLocaleString() + (dateSuffix ? ` [${dateSuffix}]` : ""),
            content: summaryText
        });

        saveData();
        
        renderMemSummaryList(chat);
        updateMemStats(chat);
        alert("总结完成！");

    } catch (error) {
        console.error("总结失败", error);
        alert("总结失败: " + error.message);
    } finally {
        document.querySelector('.plump-btn').innerHTML = '<i class="fas fa-magic"></i> 立即执行 (自定义范围)';
    }
}

function deleteSummary(index) {
    const chat = chatList.find(c => c.id === currentChatId);
    if (!chat) return;
    
    if (confirm('确定删除这条总结记忆吗？')) {
        chat.summaries.splice(index, 1);
        saveData();
        renderMemSummaryList(chat);
        updateMemStats(chat); 
    }
}

function updateMemStats(chat) {
    if(!chat) return;
    const msgCount = chat.messages.length;
    document.getElementById('statMsgCount').innerText = msgCount;

    let totalText = "";
    
    totalText += (chat.charPersona || "") + (chat.userPersona || "");
    
    if (chat.summaries) {
        chat.summaries.forEach(s => totalText += s.content);
    }
    
    chat.messages.forEach(m => totalText += m.text);

    let tokenEst = 0;
    for (let i = 0; i < totalText.length; i++) {
        const code = totalText.charCodeAt(i);
        if (code > 255) tokenEst += 1.5; 
        else tokenEst += 0.25; 
    }
    
    document.getElementById('statTokenCount').innerText = Math.ceil(tokenEst);
}

async function triggerManualSummary(isAuto = false) {
    const chat = chatList.find(c => c.id === currentChatId);
    if (!chat) return;

    const endpoint = document.getElementById('apiEndpoint').value;
    const key = document.getElementById('apiKey').value;
    const model = document.getElementById('apiModel').value;

    if (!key) {
        alert("请先在API配置页面填写API Key");
        return;
    }

    const btn = document.getElementById('btnManualSummary');
    if(!isAuto && btn) {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 正在总结...';
        btn.classList.add('loading');
    }

    const msgsToSummarize = chat.messages.map(m => `${m.isSelf ? '用户' : chat.name}: ${m.text}`).join('\n');
    
    const prompt = `
    请对以下对话内容进行简明扼要的总结，提取关键信息、事件进展和情感变化。
    总结内容将作为“长期记忆”存储，供后续对话参考。
    
    对话内容：
    ${msgsToSummarize}
    
    请直接输出总结内容，不要包含其他废话。
    `;

    try {
        const response = await fetch(`${endpoint}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${key}`
            },
            body: JSON.stringify({
                model: model,
                messages: [{ role: "user", content: prompt }],
                temperature: 0.7
            })
        });

        if (!response.ok) throw new Error('API请求失败');
        
        const data = await response.json();
        const summaryText = data.choices[0].message.content.trim();

        if (!chat.summaries) chat.summaries = [];
        
        chat.summaries.push({
            date: new Date().toLocaleString(),
            content: summaryText
        });

        saveData();
        
        if(document.getElementById('chatSettingsPage').classList.contains('active')) {
            renderMemSummaryList(chat);
            updateMemStats(chat);
        }

        if(!isAuto) {
            alert("总结已完成并存入记忆库！");
        } else {
            console.log("自动总结完成");
        }

    } catch (error) {
        console.error("总结失败", error);
        if(!isAuto) alert("总结失败: " + error.message);
    } finally {
        if(!isAuto && btn) {
            btn.innerHTML = '<i class="fas fa-magic"></i> 立即执行总结';
            btn.classList.remove('loading');
        }
    }
}

const bubbleColors = [
    { name: "默认", userBg: "#ffeeb0", aiBg: "#ffffff", userText: "#000", aiText: "#333" },
    { name: "黑白", userBg: "#000000", aiBg: "#ffffff", userText: "#fff", aiText: "#000" },
    { name: "绿白", userBg: "#dcf8c6", aiBg: "#ffffff", userText: "#000", aiText: "#333" },
    { name: "奶桃", userBg: "#F3E4E9", aiBg: "#FFF7FA", userText: "#333", aiText: "#333" }, 
    { name: "豆沙", userBg: "#8D6F7B", aiBg: "#F2E4E9", userText: "#fff", aiText: "#333" },
    { name: "海盐", userBg: "#E6F2FD", aiBg: "#A3ACAD", userText: "#333", aiText: "#fff" },
    { name: "芝麻", userBg: "#BFBBBE", aiBg: "#fffef8", userText: "#fff", aiText: "#333" },
    { name: "极光", userBg: "#C0C0C0", aiBg: "#EBF7F7", userText: "#fff", aiText: "#333" }
];

function renderColorGrid() {
    const grid = document.getElementById('colorGrid');
    if(!grid) return;
    grid.innerHTML = '';

    bubbleColors.forEach(theme => {
        const item = document.createElement('div');
        item.className = 'color-option';
        item.onclick = () => generateCssForTheme(theme);

        item.innerHTML = `
            <div class="color-circle">
                <div class="c-half-left" style="background:${theme.aiBg}"></div>
                <div class="c-half-right" style="background:${theme.userBg}"></div>
            </div>
            <div class="color-name">${theme.name}</div>
        `;
        grid.appendChild(item);
    });
}

function generateCssForTheme(theme) {
    const css = `/* ${theme.name}配色 */

/* 1. 普通文本气泡 */
.Miu-miu.user .content {
    background: ${theme.userBg} !important;
    color: ${theme.userText} !important;
}
.Miu-miu.ai .content {
    background: ${theme.aiBg} !important;
    color: ${theme.aiText} !important;
}

/* 2. ★★★ 语音气泡 ★★★ */
/* 直接给语音气泡的容器上背景色 */
.Miu-miu.user .content.voice-bubble {
    background-color: ${theme.userBg} !important;
}
.Miu-miu.ai .content.voice-bubble {
    background-color: ${theme.aiBg} !important;
}

/* 语音气泡内部所有元素的文字/图标颜色 */
.Miu-miu.user .content.voice-bubble .voice-icon,
.Miu-miu.user .content.voice-bubble .voice-duration {
    color: ${theme.userText} !important;
}
.Miu-miu.ai .content.voice-bubble .voice-icon,
.Miu-miu.ai .content.voice-bubble .voice-duration {
    color: ${theme.aiText} !important;
}

/* 3. 小尾巴 (保持不变) */
.Miu-miu.user .content::after {
    background-color: ${theme.userBg} !important;
}
.Miu-miu.ai .content::before {
    background-color: ${theme.aiBg} !important;
}`;
    
    document.getElementById('customCssInput').value = css;
    updateBubblePreview(); 
}
function updateBubblePreview() {
    const cssCode = document.getElementById('customCssInput').value;
    
    let previewStyle = document.getElementById('preview-dynamic-style');
    if (!previewStyle) {
        previewStyle = document.createElement('style');
        previewStyle.id = 'preview-dynamic-style';
        document.head.appendChild(previewStyle);
    }
    previewStyle.innerHTML = cssCode;
}

function togglePresetManager() {
    const body = document.getElementById('presetManagerBody');
    const arrow = document.getElementById('presetArrow');
    
    if (body.style.display === 'flex') {
        body.style.display = 'none';
        arrow.classList.replace('fa-chevron-up', 'fa-chevron-down');
    } else {
        body.style.display = 'flex';
        arrow.classList.replace('fa-chevron-down', 'fa-chevron-up');
    }
}

let cssPresets = []; 

async function loadPresetsFromDB() {
    try {
        const settings = await db.globalSettings.get('main');
        if (settings && settings.cssPresets) {
            cssPresets = settings.cssPresets;
        } else {
            cssPresets = [];
        }
        renderPresetDropdown();
    } catch (e) {
        console.error("加载预设失败", e);
    }
}

function renderPresetDropdown() {
    const select = document.getElementById('cssPresetDropdown');
    if(!select) return;
    select.innerHTML = '<option value="">-- 选择已保存的预设 --</option>';
    cssPresets.forEach((preset, index) => {
        const opt = document.createElement('option');
        opt.value = index;
        opt.innerText = preset.name;
        select.appendChild(opt);
    });
}

function loadSelectedPreset() {
    const select = document.getElementById('cssPresetDropdown');
    const index = select.value;
    if (index === "") return;
    
    const preset = cssPresets[index];
    if (preset) {
        document.getElementById('customCssInput').value = preset.code;
        updateBubblePreview(); 
    }
}

async function saveNewPreset() {
    const code = document.getElementById('customCssInput').value.trim();
    if (!code) { alert("代码为空，无法保存"); return; }
    
    const name = prompt("给这个气泡预设起个名字：");
    if (!name) return;

    cssPresets.push({ name: name, code: code });
    await savePresetsToDB();
    renderPresetDropdown();
    alert("已保存预设：" + name);
}

async function updateCurrentPreset() {
    const select = document.getElementById('cssPresetDropdown');
    const index = select.value;
    if (index === "") { alert("请先在下拉框选择一个要修改的预设"); return; }
    
    const code = document.getElementById('customCssInput').value.trim();
    if (confirm(`确定要覆盖更新预设 "${cssPresets[index].name}" 吗？`)) {
        cssPresets[index].code = code;
        await savePresetsToDB();
        alert("更新成功");
    }
}

async function deleteCurrentPreset() {
    const select = document.getElementById('cssPresetDropdown');
    const index = select.value;
    if (index === "") { alert("请先选择一个要删除的预设"); return; }

    if (confirm(`确定删除预设 "${cssPresets[index].name}" 吗？`)) {
        cssPresets.splice(index, 1);
        await savePresetsToDB();
        renderPresetDropdown();
        document.getElementById('customCssInput').value = ""; 
        updateBubblePreview();
    }
}

async function savePresetsToDB() {
    const settings = await db.globalSettings.get('main') || { id: 'main' };
    settings.cssPresets = cssPresets;
    await db.globalSettings.put(settings);
    globalData.cssPresets = cssPresets; 
}

document.addEventListener('DOMContentLoaded', () => {
    renderColorGrid();
    loadPresetsFromDB();
});
// ★★★ 新增：点击头像开关立刻保存并刷新 ★★★
function toggleAvatarSwitch(el, type) {
    // 1. 切换开关视觉状态
    el.classList.toggle('checked');
    
    // 2. 获取当前聊天数据
    const chat = chatList.find(c => c.id === currentChatId);
    if (!chat) return;
    
    // 3. 更新数据对象
    const isChecked = el.classList.contains('checked');
    if (type === 'ai') {
        chat.showAiAvatar = isChecked;
    } else if (type === 'user') {
        chat.showUserAvatar = isChecked;
    }
    
    // 4. 保存到数据库
    saveData();
    
    // 5. 立刻重新渲染聊天界面 (这样你关掉设置页时，背后已经变了)
    renderMessages(chat);
}
async function generateAiReply(chat, isRegenerate = false) {
    if (!chat) return;

    // 1. 获取配置
    const endpoint = document.getElementById('apiEndpoint').value;
    const key = document.getElementById('apiKey').value;
    const model = document.getElementById('apiModel').value;
    const temp = parseFloat(document.getElementById('apiTemp').value) || 1.0;

    if (!key) { alert("请先在 API 配置中填写 Key"); return; }

    // 2. UI 显示 "对方正在输入..."
    const tempId = Date.now();
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    
    chat.messages.push({
        text: '<i class="fas fa-spinner fa-spin"></i> thinking...',
        isSelf: false,
        time: timeStr,
        id: tempId,
        isLoading: true
    });
    renderMessages(chat); 

    const charName = chat.name;
    const userName = chat.userRemark || "User";

    let systemPrompt = `你正在扮演一个角色与用户进行对话。\n`;
    systemPrompt += `【你的角色设定】\n姓名：${charName}\n设定：${chat.charPersona || "无"}\n`;
    systemPrompt += `【用户设定】\n称呼：${userName}\n设定：${chat.userPersona || "无"}\n`;

    // 1. 世界书逻辑
    let wbContext = "";
    const boundWbNames = chat.worldBooks || []; 
    worldBooks.forEach(wb => {
        const isBound = boundWbNames.includes(wb.name) || wb.boundCharId === chat.id;
        if (isBound) {
            const recentContext = chat.messages.slice(-3).map(m => m.text).join(' ');
            if (wb.triggerType === 'always') {
                wb.entries.forEach(entry => {
                    wbContext += `【世界观/背景 - ${entry.title || '设定'}】: ${entry.content}\n`;
                });
            } else if (wb.triggerType === 'keyword' && wb.keywords) {
                const keys = wb.keywords.replace(/，/g, ',').split(',').map(k => k.trim()).filter(k => k);
                const isHit = keys.some(key => recentContext.includes(key));
                if (isHit) {
                    wb.entries.forEach(entry => {
                        wbContext += `【触发词设定 - ${entry.title || '设定'}】: ${entry.content}\n`;
                    });
                }
            }
        }
    });

    if (wbContext) {
        systemPrompt += `\n【相关世界观设定/百科知识】：\n${wbContext}\n`;
    }

    // 2. 长期记忆逻辑
    if (chat.summaries && chat.summaries.length > 0) {
        systemPrompt += `\n【长期记忆/前情提要】：\n${chat.summaries.map(s => s.content).join('\n')}\n`;
    }

    systemPrompt += `\n请沉浸在角色中回复，不要输出任何像"作为AI..."之类的出戏内容。保持口语化。`;

    // 3. 表情包能力
    if (myStickers && myStickers.length > 0) {
        const stickerNames = myStickers.map(s => s.name).join('、');
        systemPrompt += `\n\n【表情包能力启用】：
你拥有一个表情包库，包含以下表情：[${stickerNames}]。
当对话语境情绪到位时，你可以“偶尔”发送表情包来表达情感（不要每条都发，自然一点）。
发送方式：请严格仅输出格式为 [STICKER:表情名称] 的代码，不要改动名称。`;
    }
    
    // 4. 语音消息能力
    systemPrompt += `\n\n【语音消息能力】：
你偶尔也可以发送语音消息来表达更强烈的感情或语气。
发送方式：请严格仅输出格式为 [VOICE:你想说的话] 的代码。例如：[VOICE:我真的好开心呀！]`;

    // 5. 【深度清洗上下文】防止 AI 变傻的关键
    const limit = chat.memContextLimit || 50;
    const validMsgs = chat.messages.filter(m => !m.isLoading);
    
    const contextMsgs = validMsgs.slice(-limit).map(m => {
        let contentToSend = "";
        if (m.contentDescription) {
            contentToSend = m.contentDescription; // 优先发描述文字
        } else if (m.text.includes('<div') || m.text.includes('<img')) {
            const tempEl = document.createElement('div');
            tempEl.innerHTML = m.text;
            const voiceResult = tempEl.querySelector('.voice-trans-result');
            contentToSend = voiceResult ? `[语音消息：${voiceResult.innerText.trim()}]` : tempEl.innerText.trim() || "[多媒体内容]"; // 清洗 HTML
        } else {
            contentToSend = m.text;
        }
        return { role: m.isSelf ? "user" : "assistant", content: contentToSend };
    });
    
    const messagesPayload = [
        { role: "system", content: systemPrompt },
        ...contextMsgs
    ];

    try {
        const response = await fetch(`${endpoint}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${key}`
            },
            body: JSON.stringify({
                model: model,
                messages: messagesPayload,
                temperature: temp
            })
        });

        if (!response.ok) throw new Error(`API Error: ${response.status}`);
        
        const data = await response.json();
        // --- 搜索并替换 generateAiReply 内部的这段逻辑 ---
        // 1. 获取 AI 原始回复
        let replyContent = data.choices[0].message.content;
        let segments = [];
        let regex = /(\[VOICE:.*?\]|\[STICKER:.*?\]|[^。？！!?\n]+[。？！!?\n]*)/g;
        let match;
        while ((match = regex.exec(replyContent)) !== null) {
            let segment = match[0].trim();
            if (segment) segments.push(segment);
        }
        if (segments.length === 0) segments = [replyContent];

        // 3. 移除旧的 Loading 状态并开始循环发送段落
        chat.messages = chat.messages.filter(m => m.id !== tempId);
        renderMessages(chat);

        for (let i = 0; i < segments.length; i++) {
            let segmentText = segments[i];

            // --- A. 转换语音格式 ---
            segmentText = segmentText.replace(/\[VOICE:(.*?)\]/g, (match, voiceText) => {
                const text = voiceText.trim();
                const duration = Math.min(60, Math.max(1, Math.ceil(text.length / 3)));
                const bubbleWidth = Math.min(150, 50 + (duration * 3));
                return `
                    <div class="voice-inner-container" onclick="toggleVoiceText(this, event)">
                        <div class="voice-main-row" style="width: ${bubbleWidth}px; display:flex; align-items:center; justify-content:space-between;">
                            <i class="fas fa-volume-up voice-icon"></i>
                            <span class="voice-duration">${duration}"</span>
                        </div>
                        <div class="voice-trans-result">${text}</div>
                    </div>
                `;
            });

            // --- B. 转换表情包格式 ---
            segmentText = segmentText.replace(/\[STICKER:(.*?)\]/g, (match, name) => {
                const sticker = myStickers.find(s => s.name === name.trim());
                if (sticker) return `<img src="${sticker.src}" class="chat-sticker-img">`;
                return match;
            });

            // --- C. 构建 AI 描述 (用于上下文记忆) ---
            let desc = null;
            if (segmentText.includes('voice-inner-container')) {
                const tempEl = document.createElement('div');
                tempEl.innerHTML = segmentText;
                const resultNode = tempEl.querySelector('.voice-trans-result');
                desc = resultNode ? `[语音消息：${resultNode.innerText}]` : '[语音消息]';
            } else if (segmentText.includes('chat-sticker-img')) {
                desc = "[发送了一张表情包]";
            }

            // --- D. 处理发送延迟 ---
            const delay = 500 + (segmentText.length * 50);
            if (i > 0) await new Promise(resolve => setTimeout(resolve, delay));
            else await new Promise(resolve => setTimeout(resolve, 300));

            const newTime = new Date();
            const newTimeStr = `${String(newTime.getHours()).padStart(2,'0')}:${String(newTime.getMinutes()).padStart(2,'0')}`;
            
            // --- E. 正式推送到聊天记录 ---
            chat.messages.push({
                text: segmentText,
                isSelf: false,
                time: newTimeStr,
                contentDescription: desc 
            });
            
            // 更新预览和列表顺序
            updateChatLastMsg(chat);
            chat.time = newTimeStr;
            if (!chat.isPinned) {
                chatList = chatList.filter(c => c.id !== chat.id);
                chatList.unshift(chat);
            }

            saveData();
            renderMessages(chat);
            
            // 滚动到底部
            const msgContainer = document.getElementById('roomMessages');
            if(msgContainer) msgContainer.scrollTop = msgContainer.scrollHeight;
        }
    } catch (error) {
        console.error(error);
        chat.messages = chat.messages.filter(m => m.id !== tempId);
        renderMessages(chat);
        alert("AI 生成失败: " + error.message);
    }
}
// 5. 修改主菜单的重置逻辑
function toggleChatTools(e) {  // <--- 改成这样，直接用 function 开头
    if (e) e.stopPropagation();

    const footer = document.getElementById('newRoomFooter');
    const panel = document.getElementById('chatToolsPanel');
    const msgInput = document.getElementById('msgInput');
    
    // 防止页面没加载完找不到元素
    if (!panel || !footer) return;
    
    const isActive = panel.classList.contains('active');
    
    if (isActive) {
        // 关闭
        footer.classList.remove('tools-active');
        panel.classList.remove('active');
        
        // ★★★ 关闭时重置视图状态到主菜单 ★★★
        setTimeout(() => {
            const mainMenu = document.getElementById('toolsMainMenu');
            const subView = document.getElementById('stickerSubView');
            const addView = document.getElementById('addStickerView');
            if(mainMenu) mainMenu.style.display = 'flex';
            if(subView) subView.style.display = 'none';
            if(addView) addView.style.display = 'none';
        }, 300); 
    } else {
        // 打开
        footer.classList.add('tools-active');
        panel.classList.add('active');
        if(msgInput) msgInput.blur();
        setTimeout(() => {
            const container = document.getElementById('roomMessages');
            if(container) container.scrollTop = container.scrollHeight;
        }, 300);
    }
}

// 2. 点击消息区域自动关闭菜单
document.getElementById('roomMessages').addEventListener('click', () => {
    const panel = document.getElementById('chatToolsPanel');
    if (panel && panel.classList.contains('active')) {
        toggleChatTools(); // 关闭
    }
});

// 3. 切换到表情列表
function openStickerView() {
    document.getElementById('toolsMainMenu').style.display = 'none';
    document.getElementById('stickerSubView').style.display = 'flex';
}

// 4. 返回主菜单
function backToToolsMenu() {
    document.getElementById('stickerSubView').style.display = 'none';
    document.getElementById('toolsMainMenu').style.display = 'flex';
}

// 5. 发送表情
function sendSticker(src) {
    if (!currentChatId) return;
    const chat = chatList.find(c => c.id === currentChatId);
    if (chat) {
        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
        
        // 插入 HTML 图片标签
        chat.messages.push({ 
            text: `<img src="${src}" class="chat-sticker-img">`, 
            isSelf: true, 
            time: timeStr 
        });
        
        chat.msg = '[表情]';
        chat.time = timeStr;
        
        if (!chat.isPinned) {
            chatList = chatList.filter(c => c.id !== currentChatId);
            chatList.unshift(chat);
        }
        
        saveData();
        renderMessages(chat);
        
        // 发送后关闭菜单 (如果你想连续发，可以删掉这一行)
        toggleChatTools();
    }
}
/* --- [新增] 自定义表情包功能 --- */

let myStickers = []; 
function initStickers() {
    if (globalData.stickers) {
        myStickers = globalData.stickers;
    } else {
        // 去除预选
        myStickers = [];
    }
    renderStickerGrid();
}
// 2. 渲染表情网格
function renderStickerGrid() {
    const grid = document.getElementById('stickerGrid');
    grid.innerHTML = `
         <div class="sticker-add-btn" onclick="goToAddStickerPage()">
            <i class="fas fa-plus"></i>
        </div>
    `;

    myStickers.forEach((s, index) => {
        const div = document.createElement('div');
        div.className = 'sticker-item-wrapper';
        div.innerHTML = `
            <img src="${s.src}" class="sticker-option" onclick="sendCustomSticker(${index})">
            <div class="sticker-del-btn" onclick="deleteSticker(${index})">×</div>
        `;
        grid.appendChild(div);
    });
}

// 1. 进入“添加表情”页面 (从列表页 -> 添加页)
function goToAddStickerPage() {
    document.getElementById('newStickerName').value = '';
    document.getElementById('stickerSubView').style.display = 'none';
    document.getElementById('addStickerView').style.display = 'flex';
}

// 2. 返回“表情列表”页面 (从添加页 -> 列表页)
function backToStickerList() {
    document.getElementById('addStickerView').style.display = 'none';
    document.getElementById('stickerSubView').style.display = 'flex';
}

// 3. 处理添加逻辑
function handleAddSticker(type) {
    const name = document.getElementById('newStickerName').value.trim();
    if (!name) {
        alert("请先填写表情描述。");
        return;
    }

    if (type === 'link') {
        const url = prompt("请输入图片链接:");
        if (url) {
            saveNewSticker(url, name);
        }
    } else {
        document.getElementById('stickerFileInput').click();
    }
}

// 4. 保存并刷新
function saveNewSticker(src, name) {
    myStickers.push({
        id: Date.now(),
        src: src,
        name: name
    });
    
    globalData.stickers = myStickers;
    saveData();
    
    renderStickerGrid(); 
    backToStickerList(); // ★★★ 保存后自动返回列表
}

// ★★★ 修复：处理本地图片选择 ★★★
function handleStickerFile(input) {
    const file = input.files[0];
    // 再次获取名字，防止作用域问题
    let name = document.getElementById('newStickerName').value.trim();
    if (!name) {
        // 如果没名字，自动生成
        const now = new Date();
        name = "表情_" + now.getHours() + now.getMinutes() + now.getSeconds();
    }

    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            // 读取成功后，调用保存函数
            saveNewSticker(e.target.result, name);
        };
        reader.readAsDataURL(file);
    }
    input.value = ''; // 重置控件，允许重复上传同一张图
}
// =========================================
// ★★★ [更新版] 批量导入表情包逻辑 (支持冒号) ★★★
// =========================================
function handleBatchStickerImport() {
    const input = prompt("请粘贴链接列表（一行一个）。\n\n【支持格式】：\n1. 表情名：图片链接 (支持中文/英文冒号)\n2. 表情名 | 图片链接\n3. 直接粘贴链接\n\n【示例】：\n开心：https://xx.com/1.jpg\n难过: https://xx.com/2.gif");

    if (!input) return;

    const lines = input.split('\n'); // 按行分割
    let successCount = 0;

    lines.forEach((line, index) => {
        line = line.trim();
        if (!line) return; // 跳过空行

        let name = "";
        let src = "";

        // --- 智能解析逻辑 ---

        // 1. 优先检测中文冒号 '：' (最安全)
        if (line.includes('：')) {
            const parts = line.split('：');
            name = parts[0].trim();
            src = parts.slice(1).join('：').trim();
        }
        // 2. 检测竖线 '|' 或 '｜'
        else if (line.includes('|') || line.includes('｜')) {
            const separator = line.includes('|') ? '|' : '｜';
            const parts = line.split(separator);
            name = parts[0].trim();
            src = parts.slice(1).join(separator).trim();
        }
        // 3. 检测英文冒号 ':' (需防止把 http:// 切断)
        else if (line.includes(':')) {
            const firstIndex = line.indexOf(':');
            // 获取冒号前面的部分，转小写检查
            const prefix = line.substring(0, firstIndex).trim().toLowerCase();

            // 如果冒号前面是 http 或 https，说明这行只是个纯链接，没有名字
            if (prefix === 'http' || prefix === 'https') {
                src = line;
            } else {
                // 否则，冒号前面是名字 (例如 "开心: http://...")
                name = line.substring(0, firstIndex).trim();
                src = line.substring(firstIndex + 1).trim();
            }
        }
        // 4. 纯链接情况
        else {
            src = line;
        }

        // --- 数据处理 ---
        
        // 如果没有解析出名字，自动生成一个
        if (!name && src) {
            const now = new Date();
            // 简单生成：批量_1230_序号
            name = "批量_" + now.getHours() + now.getMinutes() + "_" + index;
        }

        if (src) {
            myStickers.push({
                id: Date.now() + index, // 确保ID唯一
                src: src,
                name: name
            });
            successCount++;
        }
    });

    if (successCount > 0) {
        globalData.stickers = myStickers;
        saveData(); // 保存到数据库
        renderStickerGrid(); // 刷新网格
        backToStickerList(); // 返回列表页
        alert(`成功导入 ${successCount} 个表情！`);
    } else {
        alert("未识别到有效内容，请检查格式");
    }
}

// 7. 删除表情
function deleteSticker(index) {
    if(confirm("确定删除这个表情吗？")) {
        myStickers.splice(index, 1);
        globalData.stickers = myStickers;
        saveData();
        renderStickerGrid();
    }
}

// 8. 发送自定义表情 (修正版)
function sendCustomSticker(index) {
    if (!currentChatId) return;
    const sticker = myStickers[index];
    if (!sticker) return;

    const chat = chatList.find(c => c.id === currentChatId);
    if (chat) {
        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

        chat.messages.push({ 
            text: `<img src="${sticker.src}" class="chat-sticker-img">`, 
            isSelf: true, 
            time: timeStr,
            contentDescription: `[发送了一个表情：${sticker.name}]` 
        });
        
        // ★★★ 使用新函数更新预览，显示 [动画表情] ★★★
        updateChatLastMsg(chat);
        
        if (!chat.isPinned) {
            chatList = chatList.filter(c => c.id !== currentChatId);
            chatList.unshift(chat);
        }
        
        saveData();
        renderMessages(chat);
        toggleChatTools(); 
    }
}
// 1. 打开弹窗
function startVoiceSimulation() {
    // 关闭工具栏
    toggleChatTools();
    const modal = document.getElementById('voiceInputModal');
    document.getElementById('voiceTextContent').value = '';
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('show'), 10);
}

// 2. 关闭弹窗
function closeVoiceModal() {
    const modal = document.getElementById('voiceInputModal');
    modal.classList.remove('show');
    setTimeout(() => modal.style.display = 'none', 300);
}
function confirmSendVoice() {
    const text = document.getElementById('voiceTextContent').value.trim();
    if (!text || !currentChatId) {
        closeVoiceModal();
        return;
    }

    const chat = chatList.find(c => c.id === currentChatId);
    if (chat) {
        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        
        // 计算气泡宽度：根据字数模拟时长
        const duration = Math.min(60, Math.max(1, Math.ceil(text.length / 3)));
        const bubbleWidth = Math.min(150, 50 + (duration * 3));

        // ★★★ 关键：HTML 结构必须包含 onclick 和转文字容器 ★★★
        // voice-inner-container 会作为气泡内部的实际内容
        const voiceHtml = `
            <div class="voice-inner-container" onclick="toggleVoiceText(this, event)">
                <div class="voice-main-row" style="width: ${bubbleWidth}px; display:flex; align-items:center; justify-content:space-between;">
                    <i class="fas fa-volume-up voice-icon"></i>
                    <span class="voice-duration">${duration}"</span>
                </div>
                <div class="voice-trans-result">${text}</div>
            </div>
        `;

        chat.messages.push({
            text: voiceHtml,
            isSelf: true,
            time: timeStr,
            contentDescription: `[语音消息：${text}]` // 让AI能听懂
        });

        chat.msg = '[语音]';
        chat.time = timeStr;

        saveData();
        renderMessages(chat);
        closeVoiceModal();
    }
}
// =========================================
// ★★★ [新增] 长按撤回功能逻辑 (放在外面) ★★★
// =========================================

let longPressTimer = null; 
let activeRecallIndex = null; 
const popover = document.getElementById('msgPopover');

// 1. 显示菜单 (计算位置)
function showRecallMenu(element, index) {
    if (!popover) return;
    
    activeRecallIndex = index; 
    
    // 获取气泡的位置
    const rect = element.getBoundingClientRect();

    let topPos = rect.top - 35; 
    let leftPos = rect.left + (rect.width / 2); // 水平居中
    
    if (topPos < 60) { 
        topPos = rect.bottom + 10;
        document.querySelector('.msg-popover-arrow').style.top = '-6px';
        document.querySelector('.msg-popover-arrow').style.bottom = 'auto';
        document.querySelector('.msg-popover-arrow').style.borderTop = 'none';
        document.querySelector('.msg-popover-arrow').style.borderBottom = '6px solid rgba(255, 255, 255, 0.95)';
    } else {
        // 恢复箭头向下
        document.querySelector('.msg-popover-arrow').style.top = 'auto';
        document.querySelector('.msg-popover-arrow').style.bottom = '-6px';
        document.querySelector('.msg-popover-arrow').style.borderBottom = 'none';
        document.querySelector('.msg-popover-arrow').style.borderTop = '6px solid rgba(255, 255, 255, 0.95)';
    }

    // 应用样式
    popover.style.top = topPos + 'px';
    popover.style.left = leftPos + 'px';
    popover.style.transform = 'translateX(-50%)'; // 修正水平居中
    popover.style.display = 'block';
    
    // 手机震动反馈 (如果支持)
    if (navigator.vibrate) navigator.vibrate(50);
}

// 2. 隐藏菜单
function hideRecallMenu() {
    if (popover) popover.style.display = 'none';
    activeRecallIndex = null;
}

// 3. 执行撤回操作 (修正版)
function handleRecallMsg() {
    if (activeRecallIndex === null || !currentChatId) return;
    
    const chat = chatList.find(c => c.id === currentChatId);
    if (chat) {
        // 删除该条消息
        chat.messages.splice(activeRecallIndex, 1);
        
        // ★★★ 使用新函数更新预览，防止变成图片代码 ★★★
        updateChatLastMsg(chat);
        
        saveData();       
        renderMessages(chat); 
        hideRecallMenu(); 
    }
}
// 4. 全局点击或滚动时关闭菜单
document.addEventListener('click', (e) => {
    // 如果点击的不是菜单本身，也不是触发长按的瞬间，就关闭
    if (!e.target.closest('.msg-popover')) {
        hideRecallMenu();
    }
});
document.getElementById('roomMessages').addEventListener('scroll', hideRecallMenu);
// =========================================
// ★★★ [新增] 聊天列表预览文案修正函数 ★★★
// =========================================
function updateChatLastMsg(chat) {
    if (!chat || !chat.messages) return;
    const lastMsg = chat.messages[chat.messages.length - 1];
    if (!lastMsg) {
        chat.msg = '';
        chat.time = '';
        return;
    }
    chat.time = lastMsg.time;

    if (lastMsg.text.includes('voice-inner-container')) { // 修改这里的判断条件
        chat.msg = '[语音]';
    } else if (lastMsg.text.includes('chat-sticker-img')) {
        chat.msg = '[动画表情]';
    } else if (lastMsg.text.includes('<img')) {
        chat.msg = '[图片]';
    } else {
        chat.msg = lastMsg.text;
    }
}
function toggleVoiceText(el, e) {
    if (e) e.stopPropagation(); // 阻止事件冒泡
    const resultBox = el.querySelector('.voice-trans-result');
    if (resultBox) {
        // 切换显示/隐藏类
        resultBox.classList.toggle('show');
        
        // 自动滚动到底部，确保转文字出来的瞬间不会被遮挡
        const container = document.getElementById('roomMessages');
        if(container) {
            setTimeout(() => {
                container.scrollTop = container.scrollHeight;
            }, 50); 
        }
    }
}
 // ★★★ 新增：清除聊天页壁纸 ★★★
            function clearChatRoomWallpaper() {
                const room = document.getElementById('chatRoom');
                room.style.backgroundImage = ''; 
                room.style.backgroundSize = '';
                openBeautifyPage(); 
                saveData();
            }
// 脚本最后一行，执行数据加载
loadAllDataFromDB();
export const launcherScripts = `
    // STATE
    let currentMode = 'normal';
    let activeTag = 'All'; 
    let activeChild = null; 
    let activeGroup = null; 
    let contextTargetId = null;
    let dragSrcEl = null;
    let editingTagIndex = -1;

    function init() {
        initClock();
        spawnBubbles();
        
        // --- AUTO IMPORT TAGS ---
        const gameTags = GAMES.reduce((acc, g) => [...acc, ...(g.tags || [])], []);
        const groupRules = GROUPS.reduce((acc, g) => [...acc, ...(g.rules || (g.rule?[g.rule]:[]))], []);
        const allUsedTags = [...new Set([...gameTags, ...groupRules])];
        
        let hasNew = false;
        allUsedTags.forEach(t => {
            if(!TAGS.includes(t)) {
                TAGS.push(t);
                hasNew = true;
            }
        });

        // FORCE EMULATION TAG
        if (!TAGS.includes('Emulation')) {
            TAGS.push('Emulation');
            hasNew = true;
        }

        if(hasNew) TAGS.sort();

        updateDropdown();
        switchMode('normal');
        
        if(window.onSnapshot) {
            window.onSnapshot(window.collection(window.db, "games"), (snap) => {
                GAMES = []; snap.forEach(d => GAMES.push({id: d.id, ...d.data()}));
                sortGames(); refreshUI();
            });
            window.onSnapshot(window.collection(window.db, "groups"), (snap) => {
                GROUPS = []; snap.forEach(d => GROUPS.push({id: d.id, ...d.data()}));
                refreshUI();
            });
            window.onSnapshot(window.doc(window.db, "system", "metadata"), (snap) => {
                if(snap.exists()) { 
                    const d = snap.data();
                    const newTags = d.categories || []; 
                    const newH = d.hierarchy || {};
                    if(newTags.length > 0) TAGS = newTags;
                    HIERARCHY = newH;
                    
                    // Re-ensure Emulation is present if DB update wiped it
                    if (!TAGS.includes('Emulation')) {
                        TAGS.push('Emulation');
                        TAGS.sort();
                    }

                    if(currentMode === 'admin') renderAdminPanels();
                    updateDropdown();
                }
            });
        }
    }

    function spawnBubbles() {
        const container = document.getElementById('bg-container');
        const bubbleCount = 15;
        for(let i=0; i<bubbleCount; i++) {
            const b = document.createElement('div');
            b.className = 'bubble';
            b.style.left = Math.random() * 100 + 'vw';
            b.style.width = Math.random() * 50 + 20 + 'px';
            b.style.height = b.style.width;
            b.style.animationDuration = Math.random() * 10 + 10 + 's';
            b.style.animationDelay = Math.random() * 5 + 's';
            container.appendChild(b);
        }
    }

    function randomGame() {
        const available = currentMode === 'normal' 
            ? GAMES.filter(g => !g.isDeleted && (!g.tags || !g.tags.includes('Emulation')))
            : (currentMode === 'emulation' && activeGroup 
                ? GAMES.filter(g => {
                    const grp = GROUPS.find(x => x.id === activeGroup);
                    const rules = grp ? (grp.rules || (grp.rule?[grp.rule]:[])) : [];
                    return !g.isDeleted && g.tags && g.tags.includes('Emulation') && g.tags.some(t => rules.includes(t));
                  })
                : []);
        
        if(available.length === 0) return alert("No games available to pick from!");
        const random = available[Math.floor(Math.random() * available.length)];
        playGame(random.url, random.title);
    }

    function sortGames() {
        GAMES.sort((a, b) => {
            if (a.orderIndex !== undefined && b.orderIndex !== undefined) return a.orderIndex - b.orderIndex;
            if (a.orderIndex !== undefined) return -1;
            if (b.orderIndex !== undefined) return 1;
            return a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: 'base' });
        });
    }

    function refreshUI() {
        updateDropdown();
        if (currentMode === 'normal') applyFilters();
        else if (currentMode === 'emulation') activeGroup ? openGroupFilter(activeGroup) : renderGroups();
        else if (currentMode === 'admin') renderAdminPanels();
    }

    function updateDropdown() {
        const drop = document.getElementById('tag-dropdown');
        drop.innerHTML = '<div class="tag-option active" onclick="filterGames(\\'All\\', this)"><span>All</span></div>';
        
        const allChildren = new Set(Object.values(HIERARCHY).flat());
        // Allow Emulation to appear in dropdown
        const roots = TAGS.filter(t => !allChildren.has(t)).sort();

        roots.forEach(root => {
            drop.innerHTML += \`<div class="tag-option" onclick="filterGames('\${root}', this)"><span>\${root}</span></div>\`;
        });
    }

    function resetHome() {
        switchMode('normal');
        activeTag = 'All';
        activeChild = null;
        document.getElementById('game-search').value = '';
        document.getElementById('tag-dropdown').classList.remove('show');
        applyFilters();
    }

    function switchMode(mode) {
        currentMode = mode;
        activeGroup = null; 
        document.getElementById('sub-filters').innerHTML = '';
        document.getElementById('btn-normal').classList.toggle('active', mode === 'normal');
        document.getElementById('btn-emulation').classList.toggle('active', mode === 'emulation');
        const adminBtn = document.getElementById('btn-admin');
        if(adminBtn) adminBtn.classList.toggle('active', mode === 'admin');

        document.getElementById('grid-container').classList.remove('active');
        document.getElementById('emulation-groups').classList.remove('active');
        document.getElementById('admin-view').classList.remove('active');
        document.getElementById('tag-wrapper').style.display = mode === 'admin' ? 'none' : 'block';

        if(mode === 'admin') {
            document.getElementById('admin-view').classList.add('active');
            renderAdminPanels();
        } else if (mode === 'normal') {
            document.getElementById('grid-container').classList.add('active');
            applyFilters();
        } else {
            document.getElementById('emulation-groups').classList.add('active');
            renderGroups();
        }
    }

    function switchAdminTab(tab) {
        document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
        document.getElementById('tab-btn-'+tab).classList.add('active');
        document.querySelectorAll('.admin-panel-content').forEach(p => p.classList.remove('active'));
        document.getElementById('admin-panel-'+tab).classList.add('active');
    }

    function filterGames(tag, el) { 
        const isParent = el && el.classList.contains('tag-option');
        if(isParent) {
            if(tag) activeTag = tag;
            activeChild = null;
            updateRibbon();
            document.getElementById('tag-dropdown').classList.remove('show');
        } else {
            if(tag === activeChild) activeChild = null; 
            else activeChild = tag;
        }
        applyFilters(); 
    }

    function updateRibbon() {
        const container = document.getElementById('sub-filters');
        container.innerHTML = '';
        if(activeTag === 'All') return;

        const children = HIERARCHY[activeTag] || [];
        if(children.length === 0) return;

        children.forEach(child => {
            if(TAGS.includes(child)) {
                container.innerHTML += \`<button class="ribbon-tag \${activeChild === child ? 'active' : ''}" onclick="filterGames('\${child}', this)">\${child}</button>\`;
            }
        });
    }

    function applyFilters() {
        const q = document.getElementById('game-search').value.toLowerCase();
        const effectiveTag = activeChild || activeTag;
        
        const list = q ? GAMES.filter(g=> !g.isDeleted && g.title.toLowerCase().includes(q) && (!g.tags||!g.tags.includes('Emulation'))) : 
                       (effectiveTag==='All' ? GAMES.filter(g=> !g.isDeleted && (!g.tags||!g.tags.includes('Emulation'))) : GAMES.filter(g=> !g.isDeleted && g.tags&&g.tags.includes(effectiveTag)));
        
        renderGrid(list);
        document.querySelectorAll('.tag-option').forEach(o => o.classList.toggle('active', o.querySelector('span').innerText===activeTag));
        updateRibbon(); 
    }
    
    function renderAdminPanels() {
        const qGame = document.getElementById('admin-search-games')?.value.toLowerCase() || '';
        const qGroup = document.getElementById('admin-search-groups')?.value.toLowerCase() || '';
        const qTag = document.getElementById('admin-search-tags')?.value.toLowerCase() || '';

        const gBody = document.getElementById('admin-games-tbody');
        if(gBody) {
            gBody.innerHTML = '';
            GAMES.filter(g => !g.isDeleted && g.title.toLowerCase().includes(qGame)).forEach((g, i) => {
                const tr = document.createElement('tr');
                tr.setAttribute('draggable', 'true'); 
                tr.dataset.index = i;
                tr.dataset.type = 'game';
                tr.addEventListener('dragstart', handleDragStart);
                tr.addEventListener('dragover', handleDragOver);
                tr.addEventListener('drop', handleDrop);
                tr.innerHTML = \`<td><div class="drag-handle">☰</div></td><td><img src="\${g.img}" class="thumb-mini"></td><td><div style="font-weight:700;color:white">\${g.title}</div></td><td>\${(g.tags||[]).map(t => \`<span class="admin-tag">\${t}</span>\`).join('')} \${g.badge ? \`<span class="badge \${g.badge}" style="position:static; font-size:0.6rem; margin-left:5px;">\${g.badge}</span>\` : ''}</td><td><button class="admin-btn" style="padding:5px 10px; font-size:0.7rem;" onclick="openEditModal('\${g.id}')">Edit</button> <button class="admin-btn del" style="padding:5px 10px; font-size:0.7rem;" onclick="deleteGame('\${g.id}')">Del</button></td>\`;
                gBody.appendChild(tr);
            });
        }

        const grBody = document.getElementById('admin-groups-tbody');
        if(grBody) {
            grBody.innerHTML = '';
            GROUPS.filter(g => g.title.toLowerCase().includes(qGroup)).forEach(g => {
                const rules = g.rules || (g.rule ? [g.rule] : []);
                grBody.innerHTML += \`<tr><td><img src="\${g.img}" class="thumb-mini"></td><td style="font-weight:700">\${g.title}</td><td>\${rules.join(', ')}</td><td><button class="admin-btn" style="padding:5px 10px; font-size:0.7rem;" onclick="openGroupModal('\${g.id}')">Edit</button> <button class="admin-btn del" style="padding:5px 10px; font-size:0.7rem;" onclick="deleteGroup('\${g.id}')">Del</button></td></tr>\`;
            });
        }

        const tBody = document.getElementById('admin-tags-tbody');
        if(tBody) {
            tBody.innerHTML = '';
            const filteredTags = TAGS.filter(t => t.toLowerCase().includes(qTag));
            if(filteredTags.length === 0) {
                 tBody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#64748b; padding:20px;">No tags found. Add one above.</td></tr>';
            } else {
                filteredTags.forEach((t) => {
                    const originalIndex = TAGS.indexOf(t);
                    const children = HIERARCHY[t] || [];
                    const tr = document.createElement('tr');
                    tr.setAttribute('draggable', 'true');
                    tr.dataset.index = originalIndex;
                    tr.dataset.type = 'tag';
                    tr.addEventListener('dragstart', handleDragStart);
                    tr.addEventListener('dragover', handleDragOver);
                    tr.addEventListener('drop', handleDrop);
                    tr.innerHTML = \`<td><div class="drag-handle">☰</div></td><td style="font-weight:600; color:#cbd5e1">\${t}</td><td style="font-size:0.8rem; color:#94a3b8">\${children.length > 0 ? children.join(', ') : '-'}</td><td><button class="admin-btn" style="padding:5px 10px; font-size:0.7rem;" onclick="openTagModal(\${originalIndex})">Edit</button> <button class="admin-btn del" style="padding:5px 10px; font-size:0.7rem;" onclick="deleteTag(\${originalIndex})">Del</button></td>\`;
                    tBody.appendChild(tr);
                });
            }
        }

        const gbBody = document.getElementById('admin-garbage-tbody');
        if(gbBody) {
            gbBody.innerHTML = '';
            const garbage = GAMES.filter(g => g.isDeleted);
            if(garbage.length === 0) {
                 gbBody.innerHTML = '<tr><td colspan="3" style="text-align:center; color:#64748b; padding:20px;">Trash is empty</td></tr>';
            } else {
                garbage.forEach(g => {
                    gbBody.innerHTML += \`<tr><td><img src="\${g.img}" class="thumb-mini"></td><td style="font-weight:700; color:#cbd5e1">\${g.title}</td><td><button class="admin-btn primary" style="padding:5px 10px; font-size:0.7rem;" onclick="restoreGame('\${g.id}')">Restore</button> <button class="admin-btn del" style="padding:5px 10px; font-size:0.7rem;" onclick="purgeGame('\${g.id}')">Purge</button></td></tr>\`;
                });
            }
        }
    }
    
    window.filterTagsInEdit = () => {
         const q = document.getElementById('edit-tag-search').value.toLowerCase();
         const items = document.querySelectorAll('#edit-tag-container .checkbox-item');
         items.forEach(item => { item.style.display = item.innerText.toLowerCase().includes(q) ? 'flex' : 'none'; });
    };

    window.openEditModal = (id) => {
        contextTargetId = id || "NEW";
        const g = id ? GAMES.find(x => x.id === id) : null;
        document.getElementById('edit-modal-title').innerText = id ? "Edit Game" : "Add Game";
        document.getElementById('edit-title').value = g ? g.title : "";
        document.getElementById('edit-img').value = g ? g.img : "";
        document.getElementById('edit-url').value = g ? g.url : "";
        
        if(document.getElementById('edit-tag-search')) document.getElementById('edit-tag-search').value = '';
        const currentTags = g ? (g.tags||[]) : [];
        const selectionPool = [...TAGS];
        renderMultiSelect('edit-tag-container', selectionPool, currentTags);
        document.getElementById('edit-modal').style.display = 'flex';
    };

    window.saveGameChanges = async () => {
        const title = document.getElementById('edit-title').value;
        const img = document.getElementById('edit-img').value;
        const url = document.getElementById('edit-url').value;
        if(!title || !url) return alert("Title and URL required");
        
        let tags = getCheckedValues('edit-tag-container');
        tags = [...new Set(tags)];

        let badge = "";
        if (tags.includes("Heavy")) badge = "Heavy";
        else if (tags.includes("Medium")) badge = "Medium";
        else if (tags.includes("Light")) badge = "Light";

        const data = { title, img, url, tags, badge };
        try {
            if(contextTargetId === "NEW") await window.addDoc(window.collection(window.db, "games"), data);
            else await window.updateDoc(window.doc(window.db, "games", contextTargetId), data);
            document.getElementById('edit-modal').style.display = 'none';
        } catch(e) { alert(e.message); }
    };

    window.deleteGame = async (id) => { if(confirm("Move game to Garbage Bin?")) await window.updateDoc(window.doc(window.db, "games", id), { isDeleted: true }); };
    window.restoreGame = async (id) => { await window.updateDoc(window.doc(window.db, "games", id), { isDeleted: false }); };
    window.purgeGame = async (id) => { if(confirm("PERMANENTLY DELETE?")) await window.deleteDoc(window.doc(window.db, "games", id)); };

    window.openGroupModal = (id) => {
        contextTargetId = id || "NEW";
        const g = id ? GROUPS.find(x => x.id === id) : null;
        document.getElementById('group-modal-title').innerText = id ? "Edit Group" : "Create Group";
        document.getElementById('grp-title').value = g ? g.title : "";
        document.getElementById('grp-img').value = g ? g.img : "";
        const currentRules = g ? (g.rules || (g.rule?[g.rule]:[])) : [];
        const selectionPool = [...TAGS]; // Allow selecting Emulation if needed
        renderMultiSelect('grp-rules-container', selectionPool, currentRules);
        document.getElementById('group-modal').style.display = 'flex';
    };

    window.saveGroupChanges = async () => {
        const title = document.getElementById('grp-title').value;
        const img = document.getElementById('grp-img').value;
        const rules = getCheckedValues('grp-rules-container');
        if(!title || rules.length===0) return alert("Title & Rule required");
        const data = { title, img, rules };
        try {
            if(contextTargetId === "NEW") await window.addDoc(window.collection(window.db, "groups"), data);
            else await window.updateDoc(window.doc(window.db, "groups", contextTargetId), data);
            document.getElementById('group-modal').style.display = 'none';
        } catch(e) { alert(e.message); }
    };

    window.deleteGroup = async (id) => { if(confirm("Delete Group?")) await window.deleteDoc(window.doc(window.db, "groups", id)); };

    window.addMetadata = async (type) => {
        const val = document.getElementById('new-tag-input').value.trim();
        if(!val) return;
        try {
            if(!TAGS.includes(val)) {
                TAGS.push(val);
                await saveTags();
                document.getElementById('new-tag-input').value = '';
                renderAdminPanels();
                updateDropdown();
            }
        } catch(e) { alert(e.message); }
    };
    
    window.deleteTag = async (index) => {
        const tagToDelete = TAGS[index];
        if(!confirm(\`Delete '\${tagToDelete}' tag?\`)) return;
        const removeTags = confirm(\`Do you also want to remove the tag '\${tagToDelete}' from all games?\`);

        if(removeTags) {
            const batch = window.writeBatch(window.db);
            let updateCount = 0;
            GAMES.forEach(g => {
                if(g.tags && g.tags.includes(tagToDelete)) {
                    const newTags = g.tags.filter(t => t !== tagToDelete);
                    let badge = "";
                    if (newTags.includes("Heavy")) badge = "Heavy"; else if (newTags.includes("Medium")) badge = "Medium"; else if (newTags.includes("Light")) badge = "Light";
                    batch.update(window.doc(window.db, "games", g.id), { tags: newTags, badge: badge });
                    updateCount++;
                }
            });
            if(updateCount > 0) await batch.commit();
        }

        delete HIERARCHY[tagToDelete];
        Object.keys(HIERARCHY).forEach(k => { HIERARCHY[k] = HIERARCHY[k].filter(c => c !== tagToDelete); });
        TAGS.splice(index, 1);
        await saveTags();
        renderAdminPanels();
        updateDropdown();
    };

    window.openTagModal = (index) => {
        editingTagIndex = index;
        const tagName = TAGS[index];
        document.getElementById('tag-edit-name').value = tagName;
        const pool = TAGS.filter(t => t !== tagName); // Don't filter out Emulation
        const currentSubs = HIERARCHY[tagName] || [];
        renderMultiSelect('tag-sub-container', pool, currentSubs);
        document.getElementById('tag-modal').style.display = 'flex';
    };

    window.saveTagChanges = async () => {
        if(editingTagIndex === -1) return;
        const oldName = TAGS[editingTagIndex];
        const newName = document.getElementById('tag-edit-name').value.trim();
        const subs = getCheckedValues('tag-sub-container');
        
        if(!newName) return alert("Tag name required");

        if(newName !== oldName) {
            const batch = window.writeBatch(window.db);
            GAMES.forEach(g => {
                if(g.tags && g.tags.includes(oldName)) {
                    const newTags = g.tags.map(t => t === oldName ? newName : t);
                    batch.update(window.doc(window.db, "games", g.id), { tags: newTags });
                }
            });
            await batch.commit();
            TAGS[editingTagIndex] = newName;
            
            if(HIERARCHY[oldName]) { HIERARCHY[newName] = HIERARCHY[oldName]; delete HIERARCHY[oldName]; }
            Object.keys(HIERARCHY).forEach(k => { HIERARCHY[k] = HIERARCHY[k].map(c => c === oldName ? newName : c); });
        }
        HIERARCHY[newName] = subs;
        await saveTags();
        document.getElementById('tag-modal').style.display = 'none';
        renderAdminPanels();
        updateDropdown();
    };

    async function saveTags() { await window.setDoc(window.doc(window.db, "system", "metadata"), { categories: TAGS, hierarchy: HIERARCHY }, { merge: true }); }

    function handleDragStart(e) { dragSrcEl = this; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/html', this.innerHTML); this.style.opacity = '0.4'; }
    function handleDragOver(e) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; return false; }
    async function handleDrop(e) {
        e.stopPropagation();
        const type = this.dataset.type;
        const dragType = dragSrcEl.dataset.type;
        
        if (dragSrcEl !== this && type === dragType) {
            const oldIdx = parseInt(dragSrcEl.dataset.index);
            const newIdx = parseInt(this.dataset.index);
            
            if (type === 'tag') {
                 const item = TAGS[oldIdx]; TAGS.splice(oldIdx, 1); TAGS.splice(newIdx, 0, item);
                 await saveTags(); renderAdminPanels(); updateDropdown();
            } else if (type === 'game') {
                const item = GAMES[oldIdx]; GAMES.splice(oldIdx, 1); GAMES.splice(newIdx, 0, item);
                const batch = window.writeBatch(window.db);
                GAMES.forEach((g, i) => { g.orderIndex = i; batch.update(window.doc(window.db, "games", g.id), { orderIndex: i }); });
                await batch.commit();
            }
        }
        dragSrcEl.style.opacity = '1'; return false;
    }

    function renderMultiSelect(id, options, selected) {
        const c = document.getElementById(id); c.innerHTML='';
        options.forEach(o => { c.innerHTML += \`<label class="checkbox-item"><input type="checkbox" value="\${o}" \${selected.includes(o)?'checked':''}> \${o}</label>\`; });
    }
    function getCheckedValues(id) { return Array.from(document.querySelectorAll(\`#\${id} input:checked\`)).map(cb => cb.value); }

    function renderGroups() {
        const c = document.getElementById('emulation-groups'); c.innerHTML='';
        GROUPS.forEach(g => { c.innerHTML += \`<div class="group-card" onclick="openGroupFilter('\${g.id}')"><div class="group-bg" style="background-image:url('\${g.img}')"></div><div class="group-title">\${g.title}</div></div>\`; });
    }
    function openGroupFilter(gid) {
        const g = GROUPS.find(x=>x.id===gid); if(!g) return; activeGroup=gid;
        document.getElementById('emulation-groups').classList.remove('active'); document.getElementById('grid-container').classList.add('active');
        document.getElementById('sub-filters').innerHTML = '<button class="emu-back-btn" onclick="switchMode(\\'emulation\\')">← Back to Groups</button>';
        const rules = g.rules || (g.rule?[g.rule]:[]);
        renderGrid(GAMES.filter(x => !x.isDeleted && x.tags && x.tags.includes('Emulation') && x.tags.some(t => rules.includes(t))));
    }
    function renderGrid(list) {
        const c = document.getElementById('grid-container'); c.innerHTML='';
        if(!list.length) c.innerHTML='<div style="text-align:center;color:white;grid-column:1/-1">No games found</div>';
        list.forEach(g => {
            c.innerHTML += \`<div class="game-card" onclick="playGame('\${g.url}','\${g.title}')"><img src="\${g.img}" class="game-img"><div class="badge \${g.badge||''} \${g.badge}">\${g.badge||''}</div><div class="card-meta"><div class="game-title">\${g.title}</div></div></div>\`;
        });
    }
    
    // PERF OPTIMIZATION: Hide BG container when playing
    function playGame(url, title) {
        document.getElementById('player-title').innerText=title; 
        document.querySelector('iframe').src=url;
        document.getElementById('main-app').classList.add('dormant'); 
        document.getElementById('bg-container').classList.add('dormant'); // HIDE BACKGROUND
        document.getElementById('player-overlay').classList.add('active');
    }
    
    // RESTORE BG container
    function closePlayer() {
        document.getElementById('player-overlay').classList.remove('active');
        document.getElementById('main-app').classList.remove('dormant');
        document.getElementById('bg-container').classList.remove('dormant'); // SHOW BACKGROUND
        document.querySelector('iframe').src='about:blank';
    }

    function toggleTags(e){e.stopPropagation();document.getElementById('tag-dropdown').classList.toggle('show')}
    function initClock(){setInterval(()=>{document.getElementById('live-clock').innerText=new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})},1000)}
    
    init();
`;
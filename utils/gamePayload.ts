import { Game, Group } from "../types";
import { launcherStyles } from "./launcher/styles";
import { launcherScripts } from "./launcher/clientScripts";

export const generateGamePayload = (
  games: Game[],
  groups: Group[],
  tags: string[],
  tagHierarchy: Record<string, string[]>,
  badges: string[],
  isAdmin: boolean,
  isDev: boolean,
  username: string
) => {
  // 1. AUTO-SORT (Hybrid: Order Index > Franchise/Natural)
  games.sort((a, b) => {
    if (a.orderIndex !== undefined && b.orderIndex !== undefined) return a.orderIndex - b.orderIndex;
    if (a.orderIndex !== undefined) return -1;
    if (b.orderIndex !== undefined) return 1;
    return a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: 'base' });
  });

  const gamesJson = JSON.stringify(games);
  const groupsJson = JSON.stringify(groups);
  const tagsJson = JSON.stringify(tags);
  const hierarchyJson = JSON.stringify(tagHierarchy || {});
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Oasis</title>
    <!-- COI-ServiceWorker for Emulators (SharedArrayBuffer support) -->
    <script src="https://unpkg.com/coi-serviceworker/coi-serviceworker.min.js"></script>
    <style>
        ${launcherStyles}
    </style>
    <script>
        if (window.opener && window.opener.oasis) {
            const api = window.opener.oasis;
            window.db = api.db;
            window.addDoc = api.addDoc;
            window.collection = api.collection;
            window.doc = api.doc;
            window.updateDoc = api.updateDoc;
            window.setDoc = api.setDoc;
            window.deleteDoc = api.deleteDoc;
            window.writeBatch = api.writeBatch;
            window.onSnapshot = api.onSnapshot;
        }
    </script>
</head>
<body>
    <div class="background-container" id="bg-container">
        <!-- Bubbles injected by JS -->
    </div>
    <div class="app-container" id="main-app">
        <header class="top-bar">
            <div class="logo-section" onclick="resetHome()">
                <div class="logo">Oasis</div>
                <div class="clock"><span id="live-clock">00:00</span><span class="user-tag">${username}</span></div>
            </div>
            <div class="center-toggle">
                <button class="toggle-btn active" id="btn-normal" onclick="switchMode('normal')">Normal</button>
                <div class="toggle-divider"></div>
                <button class="toggle-btn" id="btn-emulation" onclick="switchMode('emulation')">Emulation</button>
                ${isAdmin ? `
                    <div class="toggle-divider"></div>
                    <button class="toggle-btn admin-mode" id="btn-admin" onclick="switchMode('admin')">Admin</button>
                ` : ''}
            </div>
            <div class="controls-area">
                <div class="tag-wrapper" id="tag-wrapper">
                    <button class="tag-btn" onclick="toggleTags(event)">Tags ▾</button>
                    <div class="dropdown-menu" id="tag-dropdown"></div>
                </div>
                
                <button class="icon-btn" onclick="randomGame()" title="Random Game">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="1"/><circle cx="15" cy="15" r="1"/><circle cx="15" cy="9" r="1"/><circle cx="9" cy="15" r="1"/><circle cx="12" cy="12" r="1"/></svg>
                </button>

                ${isDev ? `
                <button class="icon-btn" onclick="document.getElementById('dev-panel').classList.toggle('active')" style="color:#facc15; border-color:rgba(250,204,21,0.3)" title="Developer Tools">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
                </button>
                ` : ''}
                <div class="search-wrapper">
                    <input type="text" id="game-search" class="search-input" placeholder="Search..." oninput="filterGames()">
                </div>
            </div>
        </header>
        
        <div class="sub-filters" id="sub-filters"></div>

        <div class="dashboard-view">
            <div class="emulation-groups-container" id="emulation-groups"></div>
            <div class="game-grid" id="grid-container"></div>
            
            <!-- ADMIN EXPLORER -->
            <div id="admin-view">
                <div class="admin-nav">
                    <div class="admin-tab active" id="tab-btn-games" onclick="switchAdminTab('games')">Games</div>
                    <div class="admin-tab" id="tab-btn-groups" onclick="switchAdminTab('groups')">Groups</div>
                    <div class="admin-tab" id="tab-btn-tags" onclick="switchAdminTab('tags')">Tags</div>
                    <div class="admin-tab" id="tab-btn-garbage" onclick="switchAdminTab('garbage')" style="color:#fb7185">Garbage</div>
                </div>

                <!-- GAMES TAB -->
                <div class="admin-panel-content active" id="admin-panel-games">
                    <div class="admin-toolbar">
                        <div>
                            <h3 style="margin:0; color:white;">Game Library</h3>
                            <div style="font-size:0.8rem; color:#64748b;">Drag rows to reorder • Auto-saves</div>
                        </div>
                        <div style="display:flex; gap:10px;">
                            <input type="text" id="admin-search-games" class="dev-input" placeholder="Search games..." style="width:200px; margin:0;" oninput="renderAdminPanels()">
                            <button class="admin-btn primary" onclick="openEditModal(null)">+ Add Game</button>
                        </div>
                    </div>
                    <div style="max-height:600px; overflow-y:auto; border-radius:8px;">
                        <table class="admin-table">
                            <thead><tr><th style="width:40px"></th><th style="width:50px"></th><th>Title</th><th>Tags / Badge</th><th>Actions</th></tr></thead>
                            <tbody id="admin-games-tbody"></tbody>
                        </table>
                    </div>
                </div>

                <!-- GROUPS TAB -->
                <div class="admin-panel-content" id="admin-panel-groups">
                    <div class="admin-toolbar">
                        <h3 style="margin:0; color:white;">Groups</h3>
                        <div style="display:flex; gap:10px;">
                            <input type="text" id="admin-search-groups" class="dev-input" placeholder="Search groups..." style="width:200px; margin:0;" oninput="renderAdminPanels()">
                            <button class="admin-btn primary" onclick="openGroupModal(null)">+ Create Group</button>
                        </div>
                    </div>
                    <div style="max-height:600px; overflow-y:auto; border-radius:8px;">
                        <table class="admin-table">
                            <thead><tr><th style="width:50px"></th><th>Group Name</th><th>Rules (Tags)</th><th>Actions</th></tr></thead>
                            <tbody id="admin-groups-tbody"></tbody>
                        </table>
                    </div>
                </div>

                <!-- TAGS TAB -->
                <div class="admin-panel-content" id="admin-panel-tags">
                    <div class="admin-toolbar">
                        <div>
                             <h3 style="margin:0; color:white;">Tags</h3>
                             <div style="font-size:0.8rem; color:#64748b;">Manage library tags & badges</div>
                        </div>
                        <div style="display:flex; gap:10px;">
                             <input type="text" id="admin-search-tags" class="dev-input" placeholder="Search tags..." style="width:200px; margin:0;" oninput="renderAdminPanels()">
                             <input type="text" id="new-tag-input" class="dev-input" placeholder="New Tag..." style="width:150px; margin:0;">
                             <button class="admin-btn primary" onclick="addMetadata('tag')">+ Add</button>
                        </div>
                    </div>
                    <div style="max-height:500px; overflow-y:auto; border-radius:8px;">
                         <table class="admin-table">
                            <thead><tr><th style="width:40px"></th><th>Tag Name</th><th>Sub-categories</th><th style="width:150px">Actions</th></tr></thead>
                            <tbody id="admin-tags-tbody"></tbody>
                        </table>
                    </div>
                </div>

                <!-- GARBAGE TAB -->
                <div class="admin-panel-content" id="admin-panel-garbage">
                    <div class="admin-toolbar">
                        <div>
                            <h3 style="margin:0; color:white;">Garbage Bin</h3>
                            <div style="font-size:0.8rem; color:#64748b;">Restore or permanently delete games</div>
                        </div>
                    </div>
                    <div style="max-height:600px; overflow-y:auto; border-radius:8px;">
                        <table class="admin-table">
                            <thead><tr><th style="width:50px"></th><th>Title</th><th>Actions</th></tr></thead>
                            <tbody id="admin-garbage-tbody"></tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    </div>
    
    <!-- DEV PANEL SIDEBAR -->
    <div class="dev-panel-container" id="dev-panel">
        <div class="dev-header">
            <span class="dev-title-text">Dev Tools</span>
            <button class="close-dev-btn" onclick="document.getElementById('dev-panel').classList.remove('active')">×</button>
        </div>
        <div class="dev-body">
            <div class="dev-section">
                <div style="color:#94a3b8;font-size:0.8rem;margin-bottom:10px;">QUICK ACTIONS</div>
                <button class="dev-action-btn" onclick="openEditModal(null)">+ Add Game Manually</button>
                <button class="dev-action-btn" onclick="openGroupModal(null)">+ Create Group</button>
            </div>
            ${isAdmin ? `
            <div class="dev-section">
                 <div style="color:#f43f5e;font-size:0.8rem;margin-bottom:10px;">ADMIN NAVIGATION</div>
                 <button class="dev-action-btn" style="background:#be123c; color:white;" onclick="switchMode('admin'); document.getElementById('dev-panel').classList.remove('active');">Open Full Admin Dashboard</button>
            </div>
            ` : ''}
        </div>
    </div>

    <!-- GAME EDIT MODAL -->
    <div class="edit-modal-overlay" id="edit-modal">
        <div class="edit-box">
            <h3 style="margin:0; color:white;" id="edit-modal-title">Edit Game</h3>
            <span class="edit-label">Title</span>
            <input type="text" class="dev-input" id="edit-title">
            <span class="edit-label">Image URL</span>
            <input type="text" class="dev-input" id="edit-img">
            <span class="edit-label">Game URL</span>
            <input type="text" class="dev-input" id="edit-url">
            
            <div style="margin-top:5px;">
                <span class="edit-label">Tags (Select 'Light'/'Medium'/'Heavy' for Badge)</span>
                <input type="text" id="edit-tag-search" class="dev-input" placeholder="Search tags..." style="margin-bottom:5px; padding:5px; font-size:0.8rem;" oninput="filterTagsInEdit()">
                <div class="multi-select-container" id="edit-tag-container" style="height:150px;"></div>
            </div>

            <div style="display:flex; gap:10px; margin-top:15px;">
                <button class="admin-btn primary" onclick="saveGameChanges()">Save Changes</button>
                <button class="admin-btn" onclick="document.getElementById('edit-modal').style.display='none'">Cancel</button>
            </div>
        </div>
    </div>

    <!-- GROUP EDIT MODAL -->
    <div class="edit-modal-overlay" id="group-modal">
        <div class="edit-box">
             <h3 style="margin:0; color:white;" id="group-modal-title">Edit Group</h3>
             <span class="edit-label">Group Title</span>
             <input type="text" class="dev-input" id="grp-title">
             <span class="edit-label">Image URL</span>
             <input type="text" class="dev-input" id="grp-img">
             <span class="edit-label">Included Tags (Rules)</span>
             <div class="multi-select-container" id="grp-rules-container" style="height:150px;"></div>
             
             <div style="display:flex; gap:10px; margin-top:15px;">
                <button class="admin-btn primary" onclick="saveGroupChanges()">Save Group</button>
                <button class="admin-btn" onclick="document.getElementById('group-modal').style.display='none'">Cancel</button>
            </div>
        </div>
    </div>
    
    <!-- TAG EDIT MODAL -->
    <div class="edit-modal-overlay" id="tag-modal">
        <div class="edit-box">
             <h3 style="margin:0; color:white;">Edit Tag</h3>
             <span class="edit-label">Tag Name</span>
             <input type="text" class="dev-input" id="tag-edit-name">
             
             <span class="edit-label">Sub-categories (Select tags to be children of this tag)</span>
             <div class="multi-select-container" id="tag-sub-container" style="height:180px;"></div>
             <div style="color:#64748b; font-size:0.75rem; margin-top:5px;">Check a tag to make it a sub-category of the current tag.</div>
             
             <div style="display:flex; gap:10px; margin-top:15px;">
                <button class="admin-btn primary" onclick="saveTagChanges()">Save Tag</button>
                <button class="admin-btn" onclick="document.getElementById('tag-modal').style.display='none'">Cancel</button>
            </div>
        </div>
    </div>

    <div class="player-view" id="player-overlay">
        <div class="player-header">
            <button class="tag-btn" onclick="closePlayer()">← Back</button>
            <span id="player-title">Game</span>
            <button class="icon-btn" onclick="document.getElementById('active-game-container').requestFullscreen()">⛶</button>
        </div>
        <div id="active-game-container" style="flex:1;"><iframe src="about:blank"></iframe></div>
    </div>

    <script>
        // INJECT DATA
        let GAMES = ${gamesJson};
        let GROUPS = ${groupsJson};
        let TAGS = ${tagsJson};
        let HIERARCHY = ${hierarchyJson};
        
        const isAdmin = ${isAdmin}; 
        const isDev = ${isDev};

        ${launcherScripts}
    </script>
</body>
</html>`;
};
export const launcherStyles = `
    :root { --primary: #2dd4bf; --primary-glow: rgba(45, 212, 191, 0.4); --bg-deep: #020617; --glass-surface: rgba(15, 23, 42, 0.85); --glass-border: 1px solid rgba(45, 212, 191, 0.15); --glass-blur: blur(25px); --radius: 16px; --ease-out: cubic-bezier(0.23, 1, 0.32, 1); }
    * { margin: 0; padding: 0; box-sizing: border-box; user-select: none; }
    body { background-color: var(--bg-deep); color: #eef2ff; font-family: 'Segoe UI', system-ui, sans-serif; overflow: hidden; width: 100vw; height: 100vh; }
    ::-webkit-scrollbar { width: 10px; height: 10px; }
    ::-webkit-scrollbar-track { background: rgba(2, 6, 23, 0.5); }
    ::-webkit-scrollbar-thumb { background: rgba(45, 212, 191, 0.2); border-radius: 5px; }
    
    /* AQUATIC BUBBLES BACKGROUND */
    .background-container { position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: -1; background: linear-gradient(to bottom, #0f172a, #020617); overflow: hidden; }
    .background-container.dormant { display: none !important; animation: none; } /* PERF OPTIMIZATION */
    
    .bubble { position: absolute; bottom: -100px; background-color: rgba(45, 212, 191, 0.1); border-radius: 50%; animation: rise 15s infinite ease-in; z-index: -1; pointer-events: none; border: 1px solid rgba(45, 212, 191, 0.05); box-shadow: 0 0 20px rgba(45, 212, 191, 0.05); }
    @keyframes rise {
        0% { bottom: -100px; transform: translateX(0); opacity: 0; }
        50% { opacity: 0.6; }
        100% { bottom: 100vh; transform: translateX(100px); opacity: 0; }
    }

    .app-container { width: 100%; height: 100%; display: flex; flex-direction: column; position: relative; z-index: 10; transition: opacity 0.3s; }
    .app-container.dormant { display: none !important; }
    
    .top-bar { height: 85px; padding: 0 40px; display: flex; align-items: center; justify-content: space-between; background: var(--glass-surface); backdrop-filter: var(--glass-blur); border-bottom: var(--glass-border); z-index: 100; box-shadow: 0 4px 30px rgba(0,0,0,0.5); }
    .logo { font-size: 2.2em; font-weight: 800; background: linear-gradient(to right, #ccfbf1, #2dd4bf); -webkit-background-clip: text; -webkit-text-fill-color: transparent; cursor: pointer; }
    .clock { font-size: 0.85rem; color: #94a3b8; font-family: 'Consolas', monospace; margin-top: -4px; display:flex; gap:10px; align-items: center;}
    .user-tag { background: rgba(45, 212, 191, 0.1); color: var(--primary); padding: 2px 8px; border-radius: 4px; font-weight: 700; font-size: 0.75rem; border: 1px solid rgba(45, 212, 191, 0.2); }
    
    .center-toggle { position: absolute; left: 50%; transform: translateX(-50%); display: flex; align-items: center; background: rgba(2, 6, 23, 0.6); border: var(--glass-border); border-radius: 12px; padding: 4px; backdrop-filter: blur(10px); }
    .toggle-btn { padding: 8px 35px; font-size: 0.95rem; font-weight: 600; color: #94a3b8; background: transparent; border: 1px solid transparent; cursor: pointer; transition: all 0.3s ease; border-radius: 8px; text-transform: uppercase; letter-spacing: 1px; }
    .toggle-btn:hover { color: #cbd5e1; }
    .toggle-btn.active { background: rgba(45, 212, 191, 0.15); color: var(--primary); border-color: rgba(45, 212, 191, 0.3); }
    .toggle-divider { width: 1px; height: 25px; background: rgba(45, 212, 191, 0.2); margin: 0 2px; }
    .toggle-btn.admin-mode { color: #f43f5e; }
    .toggle-btn.admin-mode.active { background: rgba(244, 63, 94, 0.15); color: #fb7185; border-color: #fb7185; }

    .controls-area { display: flex; gap: 15px; align-items: center; }
    .tag-wrapper { position: relative; }
    .tag-btn { height: 45px; padding: 0 20px; border-radius: 12px; border: var(--glass-border); background: rgba(15, 23, 42, 0.6); color: #cbd5e1; cursor: pointer; font-size: 0.95rem; font-weight: 600; display: flex; align-items: center; gap: 8px; transition: 0.2s; }
    .tag-btn:hover { border-color: var(--primary); color: white; background: rgba(45, 212, 191, 0.05); }
    
    /* DROPDOWN */
    .dropdown-menu { 
        position: absolute; top: 60px; left: 0; width: 260px; 
        max-height: 400px; overflow-y: auto; 
        background: rgba(15, 23, 42, 0.98); border: var(--glass-border); border-radius: 12px; 
        backdrop-filter: blur(30px); padding: 8px; display: none; flex-direction: column; gap: 2px; 
        box-shadow: 0 10px 40px rgba(0,0,0,0.6); z-index: 1000; 
    }
    .dropdown-menu.show { display: flex; animation: dropIn 0.2s ease-out; }
    @keyframes dropIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
    
    .tag-option { padding: 10px 16px; border-radius: 8px; font-size: 0.9rem; color: #cbd5e1; cursor: pointer; transition: 0.1s; font-weight: 500; border: 1px solid transparent; display: flex; justify-content: space-between; align-items: center; }
    .tag-option:hover { background: rgba(255,255,255,0.08); color: white; border-color: rgba(255,255,255,0.1); }
    .tag-option.active { background: rgba(45, 212, 191, 0.15); color: var(--primary); border-color: rgba(45, 212, 191, 0.2); }
    
    /* RIBBON SUB-TAGS */
    .sub-filters { 
        display: flex; gap: 12px; padding: 15px 40px; overflow-x: auto; white-space: nowrap; 
        justify-content: center; align-items: center; min-height: 60px; 
        scrollbar-width: none; -ms-overflow-style: none;
    }
    .sub-filters::-webkit-scrollbar { display: none; }
    .sub-filters:empty { display: none; }

    .ribbon-tag {
        padding: 8px 24px;
        border-radius: 50px;
        background: rgba(15, 23, 42, 0.6);
        border: 1px solid rgba(255,255,255,0.1);
        color: #94a3b8;
        font-size: 0.95rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        backdrop-filter: blur(10px);
    }
    .ribbon-tag:hover { background: rgba(255,255,255,0.1); color: white; transform: translateY(-2px); }
    .ribbon-tag.active { background: rgba(45, 212, 191, 0.15); color: var(--primary); border-color: var(--primary); box-shadow: 0 0 20px rgba(45, 212, 191, 0.2); }
    
    .emu-back-btn { height: 45px; padding: 0 25px; border-radius: 12px; border: var(--glass-border); background: rgba(15, 23, 42, 0.6); color: #cbd5e1; cursor: pointer; font-weight: 700; display: flex; align-items: center; gap: 10px; transition: all 0.2s ease; }
    .emu-back-btn:hover { background: rgba(45, 212, 191, 0.15); color: var(--primary); border-color: var(--primary); }
    
    .search-wrapper { position: relative; width: 250px; }
    .search-input { width: 100%; height: 45px; padding: 0 15px; background: rgba(2, 6, 23, 0.5); border: var(--glass-border); border-radius: 12px; color: white; font-size: 0.9rem; outline: none; }
    .icon-btn { width: 45px; height: 45px; border-radius: 12px; border: var(--glass-border); background: rgba(15, 23, 42, 0.6); color: #cbd5e1; cursor: pointer; font-size: 1.2rem; display: flex; align-items: center; justify-content: center; transition: 0.2s; }
    .icon-btn:hover { background: rgba(45, 212, 191, 0.15); color: white; border-color: var(--primary); transform: scale(1.05); }
    
    .dashboard-view { flex: 1; overflow-y: auto; padding: 40px; position: relative; }
    
    .emulation-groups-container { display: none; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 30px; max-width: 1400px; margin: 0 auto; width: 100%; }
    .emulation-groups-container.active { display: grid; }
    .group-card { position: relative; aspect-ratio: 1/1; width: 100%; max-width: 300px; border-radius: 20px; overflow: hidden; cursor: pointer; border: var(--glass-border); transition: transform 0.4s; background: #000; margin: 0 auto; }
    .group-card:hover { transform: scale(1.02); border-color: var(--primary); }
    .group-bg { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background-size: cover; background-position: center; filter: blur(5px) brightness(0.6); transition: 0.4s; }
    .group-card:hover .group-bg { filter: blur(3px) brightness(0.8); }
    .group-title { position: relative; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 2.5rem; font-weight: 900; text-transform: uppercase; color: white; text-shadow: 0 2px 20px rgba(0,0,0,0.8); z-index: 2; }
    
    .game-grid { display: none; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 25px; max-width: 1600px; width: 100%; margin: 0 auto; padding-bottom: 60px; }
    .game-grid.active { display: grid; }

    .game-card { 
        position: relative; aspect-ratio: 1/1; background: #0f172a; border-radius: var(--radius); 
        overflow: hidden; border: var(--glass-border); cursor: pointer; 
        transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1);
        transform-style: preserve-3d;
    }
    
    .game-card::after {
        content: ''; position: absolute; top: 0; left: -100%; width: 50%; height: 100%;
        background: linear-gradient(to right, rgba(255,255,255,0) 0%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0) 100%);
        transform: skewX(-20deg); pointer-events: none; transition: none;
    }

    .game-card:hover { 
        transform: perspective(1000px) rotateY(-5deg) rotateX(2deg) translateY(-5px);
        box-shadow: -10px 15px 30px rgba(45, 212, 191, 0.2); 
        border-color: var(--primary); 
        z-index: 10;
    }
    .game-card:hover::after { transition: left 0.6s ease-in-out; left: 150%; }

    .game-img { width: 100%; height: 100%; object-fit: cover; opacity: 0.9; transition: transform 0.4s; }
    .game-card:hover .game-img { transform: scale(1.1); }
    
    .card-meta { position: absolute; bottom: 0; left: 0; width: 100%; padding: 15px; background: linear-gradient(to top, rgba(2, 6, 23, 0.95), transparent); transform: translateY(100%); transition: transform 0.3s; }
    .game-card:hover .card-meta { transform: translateY(0); }
    .game-title { font-weight: 700; font-size: 1.1rem; color: #f1f5f9; text-shadow: 0 2px 4px black; }

    .badge { 
        position: absolute; top: 12px; right: 12px; padding: 4px 10px; border-radius: 6px; 
        font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; z-index: 5; 
        box-shadow: 0 2px 8px rgba(0,0,0,0.5); 
        background: #1e293b; color: white;
        backdrop-filter: none;
    }
    .badge.Light, .badge.light { background: #16a34a; color: white; }
    .badge.Medium, .badge.medium { background: #d97706; color: white; }
    .badge.Heavy, .badge.heavy { background: #dc2626; color: white; }
    
    /* DEV PANEL */
    .dev-panel-container { position: fixed; top: 0; right: 0; width: 400px; height: 100%; background: rgba(2, 6, 23, 0.95); border-left: var(--glass-border); backdrop-filter: blur(30px); z-index: 1000; transform: translateX(100%); transition: transform 0.4s ease; display: flex; flex-direction: column; box-shadow: -10px 0 50px rgba(0,0,0,0.5); }
    .dev-panel-container.active { transform: translateX(0); }
    .dev-header { padding: 20px; border-bottom: var(--glass-border); display: flex; justify-content: space-between; align-items: center; background: rgba(15, 23, 42, 0.6); }
    .dev-title-text { color: var(--primary); font-weight: 800; font-size: 1.1rem; }
    .dev-body { padding: 25px; flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 20px; }
    .dev-section { background: rgba(15, 23, 42, 0.4); border: 1px solid rgba(255,255,255,0.05); padding: 20px; border-radius: 12px; }
    .dev-action-btn { width: 100%; padding: 12px; background: var(--primary); color: #020617; font-weight: 700; border: none; border-radius: 8px; cursor: pointer; margin-top:5px; transition: 0.2s; }
    .dev-action-btn:hover { opacity: 0.9; transform: translateY(-1px); }
    .close-dev-btn { background: none; border: none; color: white; font-size: 1.5rem; cursor: pointer; }

    /* ADMIN PANEL */
    #admin-view { display: none; width: 100%; max-width: 1400px; margin: 0 auto; flex-direction: column; gap: 20px; }
    #admin-view.active { display: flex; }
    .admin-nav { display: flex; gap: 5px; margin-bottom: 5px; }
    .admin-tab { padding: 10px 25px; background: rgba(15,23,42,0.4); border: var(--glass-border); border-bottom: none; border-radius: 12px 12px 0 0; color: #94a3b8; cursor: pointer; font-weight: 700; transition: 0.2s; }
    .admin-tab:hover { color: white; background: rgba(15,23,42,0.7); }
    .admin-tab.active { background: #1e293b; color: var(--primary); border-color: var(--primary); border-bottom: 2px solid #1e293b; margin-bottom: -1px; z-index: 2; }
    .admin-panel-content { background: #1e293b; border: var(--glass-border); border-radius: 0 12px 12px 12px; padding: 25px; display: none; flex-direction: column; gap: 20px; box-shadow: 0 20px 50px rgba(0,0,0,0.5); }
    .admin-panel-content.active { display: flex; }
    .admin-toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
    .admin-btn { padding: 10px 20px; background: #0f172a; color: white; border: 1px solid #334155; border-radius: 8px; cursor: pointer; font-weight: 600; transition: 0.2s; }
    .admin-btn:hover { background: #334155; }
    .admin-btn.primary { background: var(--primary); color: #000; border: none; }
    .admin-btn.del { background: #be123c; color: white; border:none; }
    .admin-table { width: 100%; border-collapse: collapse; }
    .admin-table th { text-align: left; padding: 12px; background: rgba(0,0,0,0.2); color: #94a3b8; font-size: 0.8rem; text-transform: uppercase; font-weight: 700; }
    .admin-table td { padding: 10px 12px; border-bottom: 1px solid rgba(255,255,255,0.05); color: #cbd5e1; vertical-align: middle; }
    .drag-handle { cursor: grab; color: #64748b; font-size: 1.2rem; }
    .thumb-mini { width: 35px; height: 35px; border-radius: 6px; object-fit: cover; }
    .admin-tag { font-size: 0.75rem; background: rgba(255,255,255,0.1); padding: 2px 6px; rounded: 4px; margin-right: 4px; }
    
    /* MODALS */
    .edit-modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 5000; display: none; align-items: center; justify-content: center; }
    .edit-box { width: 500px; background: #1e293b; border-radius: 12px; padding: 25px; border: var(--glass-border); box-shadow: 0 0 50px rgba(0,0,0,0.8); display:flex; flex-direction:column; gap:10px; }
    .edit-label { font-size: 0.8rem; color: #94a3b8; margin-top: 5px; text-transform:uppercase; font-weight:700; }
    .dev-input { width: 100%; padding: 10px; background: #0f172a; border: 1px solid #334155; color: white; border-radius: 8px; outline: none; }
    .multi-select-container { max-height: 150px; overflow-y: auto; background: #0f172a; border: 1px solid #334155; border-radius: 8px; padding: 5px; display: flex; flex-direction: column; gap: 2px; }
    .checkbox-item { display: flex; align-items: center; gap: 8px; padding: 5px 8px; cursor: pointer; border-radius: 4px; font-size: 0.85rem; color: #cbd5e1; }
    .checkbox-item:hover { background: rgba(255,255,255,0.05); }
    .checkbox-item input { accent-color: var(--primary); width: 16px; height: 16px; }

    .player-view { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: #000; display: flex; flex-direction: column; z-index: 200; opacity: 0; pointer-events: none; transition: opacity 0.4s; }
    .player-view.active { opacity: 1; pointer-events: all; }
    .player-header { height: 70px; background: var(--glass-surface); backdrop-filter: var(--glass-blur); border-bottom: var(--glass-border); display: flex; align-items: center; justify-content: space-between; padding: 0 30px; }
    iframe { width: 100%; height: 100%; border: 0; background: #000; }

    /* --- RESPONSIVENESS (CHROMEBOOKS & SMALL SCREENS) --- */
    @media (max-width: 1400px) {
        .game-grid { grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 15px; }
        .group-card { max-width: 240px; }
        .dashboard-view { padding: 20px; }
    }
    @media (max-width: 1000px) {
        .game-grid { grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); }
        .top-bar { padding: 0 20px; height: 70px; }
        .game-title { font-size: 0.9rem; }
        .badge { font-size: 0.65rem; padding: 2px 6px; }
    }
    @media (max-height: 800px) {
        /* Optimize for short screens */
        .dashboard-view { padding-top: 20px; }
    }
`;
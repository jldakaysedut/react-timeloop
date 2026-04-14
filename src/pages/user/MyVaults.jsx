import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../config/supabaseClient';

// ─── EXACT PHP HELPERS ───
const ai = (n) => (n ? n.substring(0, 2).toUpperCase() : 'U');
const moodIco = { Happy: '😊', Sad: '😢', Excited: '🎉', Nostalgic: '🥹', Hopeful: '✨', Angry: '😤' };
const visIco = { private: '🔒', public: '🌍', friends: '👥' };
const designLabels = {
  default: { ico: '🛡️', label: 'Classic' }, classic: { ico: '📜', label: 'Vintage' },
  pastel: { ico: '🌸', label: 'Pastel' }, midnight: { ico: '🌙', label: 'Midnight' },
  aurora: { ico: '🌌', label: 'Aurora' }, obsidian: { ico: '🖤', label: 'Obsidian' },
  sakura: { ico: '🌺', label: 'Sakura' }
};

const borderCss = {
  'border-none': 'linear-gradient(135deg,#FF6B5B,#FF9A8B)',
  'border-gold': 'linear-gradient(135deg,#FFD700,#FFA500)',
  'border-teal': 'linear-gradient(135deg,#00E5B0,#00B4D8)',
  'border-pink': 'linear-gradient(135deg,#FF1493,#FF69B4)',
  'border-purple': 'linear-gradient(135deg,#8B00FF,#9B59B6)',
  'border-rainbow': 'linear-gradient(135deg,#FF6B5B,#FFD700,#00E5B0,#8B00FF,#FF1493)',
  'border-fire': 'linear-gradient(135deg,#FF4500,#FF8C00,#FFD700)'
};

function capsuleTheme(color = '#FF6B5B', design = 'default') {
  let hex = (color || '#FF6B5B').replace('#', '');
  if (hex.length !== 6) hex = 'FF6B5B';
  const r = parseInt(hex.substring(0, 2), 16), g = parseInt(hex.substring(2, 4), 16), b = parseInt(hex.substring(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  let text = lum > 0.55 ? '#222222' : '#ffffff';
  const dark = '#' + [Math.max(0, Math.floor(r * 0.6)), Math.max(0, Math.floor(g * 0.6)), Math.max(0, Math.floor(b * 0.6))].map(x => x.toString(16).padStart(2, '0')).join('');
  const grads = {
    default: `linear-gradient(135deg, #${hex} 0%, ${dark} 100%)`,
    classic: `linear-gradient(145deg, #f5e6c8 0%, #${hex}88 60%, ${dark}cc 100%)`,
    pastel: `linear-gradient(135deg, #${hex}66 0%, #fff4f4 60%, #${hex}44 100%)`,
    midnight: `linear-gradient(145deg, #0f0f1a 0%, #${hex}99 50%, #1a1a2e 100%)`,
    aurora: `linear-gradient(135deg, #${hex} 0%, #7c3aedaa 50%, ${dark} 100%)`,
    obsidian: `linear-gradient(145deg, #111111 0%, #${hex}77 60%, #1a1a1a 100%)`,
    sakura: `linear-gradient(135deg, #${hex}88 0%, #fce4ec 50%, #${hex}55 100%)`
  };
  let grad = grads[design] || grads['default'];
  if (['midnight', 'obsidian'].includes(design)) text = '#ffffff';
  if (['pastel', 'classic'].includes(design)) text = '#333333';
  return { gradient: grad, text, color: `#${hex}`, dark };
}

export default function MyVaults() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const dotRef = useRef(null);
  const ringRef = useRef(null);

  // ─── STATE ───
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [lsbExp, setLsbExp] = useState(localStorage.getItem('lsb-exp') === '1');
  
  const [vaults, setVaults] = useState({ drafts: [], sealed: [], opened: [], collab: [], shared: [] });
  const [counts, setCounts] = useState({ notifs: 0, msgs: 0 });
  const [tierLimit, setTierLimit] = useState(10);
  const [currentTime, setCurrentTime] = useState(Math.floor(Date.now() / 1000));
  
  // UI Controls
  const [filter, setFilter] = useState(searchParams.get('tab') || 'all');
  const [sort, setSort] = useState('newest');
  const [search, setSearch] = useState('');
  const [layout, setLayout] = useState(localStorage.getItem('vault-layout') || 'grid');
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedBulkIds, setSelectedBulkIds] = useState([]);
  
  // Right Panel & Modals
  const [selectedVault, setSelectedVault] = useState(null);
  const [rpMobileOpen, setRpMobileOpen] = useState(false);
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState(null);

  const [shareSearch, setShareSearch] = useState('');
  const [shareResults, setShareResults] = useState([]);
  const [selectedFriend, setSelectedFriend] = useState(null);

  const showToast = (msg, type = 'teal') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ─── DATA FETCHING ───
  const fetchData = async () => {
    const uid = localStorage.getItem('user_id');
    if (!uid) { navigate('/login'); return; }

    try {
      const { data: uData } = await supabase.from('users').select('*').eq('id', uid).single();
      if (uData) {
        setUser(uData);
        setTierLimit(uData.subscription_tier === 'ultra' ? 999999 : (uData.subscription_tier === 'pro' ? 50 : 10));
      }

      // Fetch user's vaults efficiently
      const { data: vData } = await supabase
        .from('vaults')
        .select('*, vault_files(count), vault_collaborators(count), vault_recipients(count)')
        .eq('user_id', uid)
        .eq('is_archived', false)
        .order('created_at', { ascending: false });

      let drafts = [], sealed = [], opened = [];
      if (vData) {
        for (let v of vData) {
          v.file_count = v.vault_files?.[0]?.count || 0;
          v.collab_count = v.vault_collaborators?.[0]?.count || 0;
          v.recipient_count = v.vault_recipients?.[0]?.count || 0;
          
          // Auto-open logic visually check
          if (v.status === 'sealed' && new Date(v.unlock_date).getTime() <= Date.now()) {
            v.status = 'opened';
            // Optionally update in DB silently
            supabase.from('vaults').update({ status: 'opened' }).eq('id', v.id).then();
          }

          if (v.status === 'draft') drafts.push(v);
          else if (v.status === 'sealed') sealed.push(v);
          else if (v.status === 'opened') opened.push(v);
        }
      }
      
      setVaults({ drafts, sealed, opened, collab: [], shared: [] });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [navigate]);

  useEffect(() => {
    if (loading) return;
    let mx = 0, my = 0, rx = 0, ry = 0, reqId;
    const handleMouseMove = (e) => { mx = e.clientX; my = e.clientY; if(dotRef.current){dotRef.current.style.left=mx+'px';dotRef.current.style.top=my+'px'} };
    const animateCursor = () => { rx += (mx - rx) * 0.13; ry += (my - ry) * 0.13; if(ringRef.current){ringRef.current.style.left=rx+'px';ringRef.current.style.top=ry+'px'} reqId=requestAnimationFrame(animateCursor); };
    window.addEventListener('mousemove', handleMouseMove); animateCursor();
    const timer = setInterval(() => setCurrentTime(Math.floor(Date.now() / 1000)), 1000);
    return () => { window.removeEventListener('mousemove', handleMouseMove); cancelAnimationFrame(reqId); clearInterval(timer); };
  }, [loading]);

  // ─── HANDLERS ───
  const getFilteredSortedVaults = (list) => {
    let filtered = list.filter(v => (v.title || '').toLowerCase().includes(search.toLowerCase()));
    filtered.sort((a, b) => {
      if (sort === 'newest') return new Date(b.created_at) - new Date(a.created_at);
      if (sort === 'oldest') return new Date(a.created_at) - new Date(b.created_at);
      if (sort === 'unlock') return new Date(a.unlock_date) - new Date(b.unlock_date);
      if (sort === 'title') return (a.title||'').localeCompare(b.title||'');
      return 0;
    });
    return filtered;
  };

  const selectVault = (v) => {
    if (bulkMode) {
      setSelectedBulkIds(prev => prev.includes(v.id) ? prev.filter(id => id !== v.id) : [...prev, v.id]);
    } else {
      setSelectedVault(v);
      if (window.innerWidth <= 1050) setRpMobileOpen(true);
    }
  };

  const handleAction = async (actionType) => {
    if (!selectedVault) return;
    setModal(null);
    try {
      if (actionType === 'seal') {
        await supabase.from('vaults').update({ status: 'sealed', sealed_at: new Date().toISOString() }).eq('id', selectedVault.id);
        showToast('💜 Vault sealed! 24hr grace period started.', 'teal');
      } else if (actionType === 'archive') {
        await supabase.from('vaults').update({ is_archived: true }).eq('id', selectedVault.id);
        showToast('📦 Vault archived.', 'teal');
      } else if (actionType === 'delete') {
        await supabase.from('vaults').delete().eq('id', selectedVault.id);
        showToast('🗑️ Vault deleted.', 'pink');
      }
      setSelectedVault(null);
      fetchData();
    } catch(e) { console.error(e); }
  };

  const handleBulkArchive = async () => {
    if (selectedBulkIds.length === 0) return;
    setModal(null);
    try {
      await supabase.from('vaults').update({ is_archived: true }).in('id', selectedBulkIds);
      setBulkMode(false);
      setSelectedBulkIds([]);
      showToast(`📦 ${selectedBulkIds.length} vaults archived.`, 'teal');
      fetchData();
    } catch(e) { console.error(e); }
  };

  if (loading) {
    return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FFF0ED', color: '#FF6B5B', fontFamily: '"Sora", sans-serif', fontSize: '1.5rem', fontWeight: 800 }}>⏳ Loading Vaults...</div>;
  }

  const myBrd = borderCss[user?.equipped_border] || borderCss['border-none'];
  const usernameShort = user?.username ? user.username.split('@')[0] : 'User';
  const totalVaults = vaults.drafts.length + vaults.sealed.length + vaults.opened.length;
  const limitLeft = tierLimit === 999999 ? '∞' : Math.max(0, tierLimit - totalVaults);
  const limitPct = tierLimit === 999999 ? 5 : Math.min(100, Math.round((totalVaults / Math.max(1, tierLimit)) * 100));

  return (
    <>
      {/* 100% EXACT CSS FROM YOUR PHP FILE */}
      <style>{`
        /* MAGIC FIX FOR REACT VITE */
        #root { display: contents; }

        :root{--coral:#FF6B5B;--coral-l:#FFE8E4;--coral-d:#E8503F;--peach:#FFF0ED;--white:#FFFFFF;--surf:#F8F8F8;--bdr:rgba(0,0,0,.07);--txt:#222;--txt2:#777;--txt3:#BDBDBD;--teal:#1D9E75;--teal-l:#E0F5EE;--gold:#F5A623;--red:#E24B4A;--easing:cubic-bezier(.25,1,.5,1)}
        *,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
        html,body{height:100%;overflow:hidden}
        body{font-family:'Nunito',sans-serif;background:var(--peach);color:var(--txt);cursor:none}
        #cur-dot{position:fixed;width:9px;height:9px;background:var(--coral);border-radius:50%;pointer-events:none;z-index:9999;transform:translate(-50%,-50%);transition:width .15s,height .15s}
        #cur-ring{position:fixed;width:26px;height:26px;border:2px solid var(--coral);border-radius:50%;pointer-events:none;z-index:9998;transform:translate(-50%,-50%);transition:left .1s var(--easing),top .1s var(--easing),width .2s,height .2s,opacity .2s;opacity:.45}
        body:has(a:hover) #cur-dot,body:has(button:hover) #cur-dot, body:has(.clickable:hover) #cur-dot{width:14px;height:14px}
        .root{display:flex;height:100vh;overflow:hidden;padding:16px;gap:12px}
        
        /* SIDEBAR */
        .l-sidebar{width:72px;min-width:72px;display:flex;flex-direction:column;align-items:center;padding:0 0 12px;overflow:hidden;flex-shrink:0;transition:width .35s var(--easing),min-width .35s var(--easing)}
        .l-sidebar.wide{width:200px;min-width:200px}
        .ls-top{display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid var(--bdr);flex-shrink:0;min-height:58px;width:100%}
        .ls-brand{font-family:'Sora',sans-serif;font-size:.85rem;font-weight:800;color:var(--txt);white-space:nowrap;overflow:hidden;opacity:0;max-width:0;transition:opacity .2s .05s,max-width .3s var(--easing);flex:1}
        .l-sidebar.wide .ls-brand{opacity:1;max-width:120px}
        .ls-hamburger{width:40px;height:40px;border-radius:12px;display:flex;align-items:center;justify-content:center;background:transparent;border:none;color:var(--txt2);font-size:1rem;cursor:none;transition:all .25s var(--easing)}
        .ls-hamburger:hover{background:var(--coral-l);color:var(--coral)}
        .ls-nav{flex:1;overflow-y:auto;overflow-x:hidden;display:flex;flex-direction:column;gap:2px;width:100%;padding:.4rem .5rem;scrollbar-width:none}
        .ls-section{font-size:.55rem;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:var(--txt3);padding:.5rem .55rem .18rem;white-space:nowrap;opacity:0;max-height:0;overflow:hidden;transition:opacity .2s,max-height .3s var(--easing)}
        .l-sidebar.wide .ls-section{opacity:1;max-height:24px}
        .ls-icon{width:44px;height:44px;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:1.1rem;text-decoration:none;color:var(--txt3);transition:all .3s var(--easing);position:relative;cursor:none;flex-shrink:0;overflow:hidden;white-space:nowrap}
        .l-sidebar.wide .ls-icon{width:100%;justify-content:flex-start;padding:0 .65rem;gap:.65rem}
        .ls-icon:hover{background:var(--coral-l);color:var(--coral)}
        .ls-icon.on{background:var(--coral);color:#fff;box-shadow:0 6px 20px rgba(255,107,91,.35)}
        .ls-icon .ls-lbl{font-size:.8rem;font-weight:700;opacity:0;max-width:0;overflow:hidden;transition:opacity .2s .05s,max-width .3s var(--easing);pointer-events:none;white-space:nowrap}
        .l-sidebar.wide .ls-icon .ls-lbl{opacity:1;max-width:140px}
        .ls-icon::after{content:attr(data-t);position:absolute;left:calc(100% + 10px);top:50%;transform:translateY(-50%);background:var(--txt);color:#fff;font-size:.68rem;font-weight:700;padding:.22rem .6rem;border-radius:8px;white-space:nowrap;opacity:0;pointer-events:none;transition:opacity .2s;z-index:999;font-family:'Nunito',sans-serif}
        .l-sidebar:not(.wide) .ls-icon:hover::after{opacity:1}
        .ls-div{width:36px;height:1px;background:var(--bdr);margin:6px 0}
        .ls-bottom{padding:.75rem .5rem;border-top:1px solid var(--bdr);flex-shrink:0;width:100%}
        .ls-selfav-wrap{display:flex;align-items:center;gap:.6rem;padding:.4rem .5rem;border-radius:14px;text-decoration:none;transition:background .25s var(--easing);overflow:hidden;cursor:none}
        .ls-selfav-wrap:hover{background:var(--coral-l)}
        .ls-selfav{width:36px;height:36px;min-width:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:.68rem;color:#fff;overflow:hidden;transition:transform .25s var(--easing)}
        .ls-selfav-wrap:hover .ls-selfav{transform:scale(1.08)}
        .ls-selfinfo{overflow:hidden;opacity:0;max-width:0;transition:opacity .2s .05s,max-width .3s var(--easing)}
        .l-sidebar.wide .ls-selfinfo{opacity:1;max-width:130px}
        .ls-selfname{font-size:.76rem;font-weight:800;color:var(--txt);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block}
        .ls-selfrole{font-size:.6rem;color:var(--txt3);display:block;white-space:nowrap}
        
        /* MAIN CARD */
        .main-card{flex:1;min-width:0;background:var(--white);border-radius:28px;box-shadow:0 12px 48px rgba(255,107,91,.08);display:flex;flex-direction:column;overflow:hidden}
        .mc-top{display:flex;align-items:center;gap:12px;padding:18px 24px 14px;flex-shrink:0;border-bottom:1px solid rgba(0,0,0,.04)}
        .mc-title{font-family:'Sora',sans-serif;font-size:1.1rem;font-weight:800;color:var(--txt);white-space:nowrap}
        .mc-spacer{flex:1}
        .mc-user{display:flex;align-items:center;gap:.45rem;text-decoration:none;cursor:none;flex-shrink:0;padding:.3rem .55rem;border-radius:100px;transition:background .25s var(--easing)}
        .mc-user:hover{background:var(--surf)}
        .mc-uav{width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:.66rem;color:#fff;overflow:hidden;border:2px solid var(--coral-l)}
        .mc-uname{font-size:.8rem;font-weight:800;color:var(--txt)}
        .mc-body{flex:1;overflow-y:auto;padding:24px;scrollbar-width:thin;scrollbar-color:var(--coral-l) transparent;display:flex;flex-direction:column}
        .mc-body::-webkit-scrollbar{width:5px}
        .mc-body::-webkit-scrollbar-thumb{background:var(--coral-l);border-radius:10px}
        
        /* Stats */
        .stats-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:14px;margin-bottom:24px;animation:fadeUp .4s var(--easing) both;flex-shrink:0}
        .stat-box{background:var(--surf);border:1.5px solid var(--bdr);border-radius:24px;padding:16px;text-align:center;transition:all .3s var(--easing);display:flex;flex-direction:column;align-items:center;justify-content:center}
        .stat-box:hover{transform:translateY(-5px);border-color:var(--coral-l);box-shadow:0 8px 24px rgba(255,107,91,.1)}
        .sstat-val{font-family:'Sora',sans-serif;font-size:1.8rem;font-weight:800;color:var(--txt);line-height:1;margin-bottom:4px}
        .sstat-lbl{font-size:.68rem;font-weight:800;color:var(--txt2);text-transform:uppercase;letter-spacing:.07em}
        
        /* Limit bar */
        .limit-wrap{margin-bottom:24px;padding:0 4px;animation:fadeUp .4s .05s var(--easing) both;flex-shrink:0}
        .limit-header{display:flex;justify-content:space-between;font-size:.8rem;font-weight:800;color:var(--txt);margin-bottom:8px}
        .limit-track{height:8px;background:var(--surf);border-radius:100px;overflow:hidden}
        .limit-fill{height:100%;background:var(--coral);border-radius:100px;transition:width .8s var(--easing)}
        .limit-fill.full{background:var(--red)}
        
        /* Toolbar */
        .toolbar{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:24px;flex-wrap:wrap;animation:fadeUp .4s .1s var(--easing) both;flex-shrink:0}
        .tb-left{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
        .search-wrap{position:relative}
        .search-ico{position:absolute;left:14px;top:50%;transform:translateY(-50%);color:var(--txt3);font-size:.9rem}
        .search-input{padding:11px 16px 11px 38px;background:var(--surf);border:2px solid transparent;border-radius:100px;font-family:'Nunito',sans-serif;font-size:.85rem;font-weight:600;color:var(--txt);outline:none;width:210px;transition:all .3s var(--easing)}
        .search-input:focus{background:#fff;border-color:var(--coral);box-shadow:0 0 0 4px rgba(255,107,91,.12);width:250px}
        .filter-strip{display:inline-flex;background:var(--surf);border-radius:50px;padding:5px;gap:3px}
        .ftab{padding:7px 15px;border-radius:40px;font-family:'Nunito',sans-serif;font-size:.78rem;font-weight:700;color:var(--txt2);background:transparent;border:none;cursor:none;transition:all .3s var(--easing)}
        .ftab:hover{color:var(--txt)}
        .ftab.on{background:var(--coral);color:#fff;box-shadow:0 4px 14px rgba(255,107,91,.25)}
        .sort-sel{padding:10px 16px;background:var(--surf);border:2px solid transparent;border-radius:100px;font-family:'Nunito',sans-serif;font-size:.83rem;font-weight:700;color:var(--txt2);outline:none;cursor:none;transition:all .3s var(--easing)}
        .sort-sel:focus{border-color:var(--coral);background:#fff;color:var(--txt)}
        .layout-toggle{display:inline-flex;background:var(--surf);border-radius:50px;padding:4px;gap:2px}
        .lt-btn{padding:7px 13px;border-radius:40px;font-size:.8rem;background:transparent;border:none;cursor:none;color:var(--txt3);transition:all .3s var(--easing)}
        .lt-btn.on{background:var(--white);color:var(--coral);box-shadow:0 2px 8px rgba(0,0,0,.08)}
        .lt-btn:hover:not(.on){color:var(--txt)}
        .bulk-toggle{padding:10px 18px;background:var(--surf);border:2px solid transparent;border-radius:100px;font-family:'Nunito',sans-serif;font-size:.83rem;font-weight:800;color:var(--txt2);cursor:none;}
        .bulk-toggle.on{background:var(--coral-l);color:var(--coral);border-color:var(--coral)}
        
        /* Sections */
        .section-hd{display:flex;align-items:center;gap:10px;margin-bottom:16px}
        .section-hd-title{font-family:'Sora',sans-serif;font-size:1rem;font-weight:800;color:var(--txt)}
        .section-count{font-size:.7rem;font-weight:700;background:var(--surf);border:1px solid var(--bdr);color:var(--txt2);padding:3px 10px;border-radius:100px}
        .section-divider{border:none;border-top:2px solid var(--bdr);margin:28px 0 24px}
        .vault-section{animation:fadeUp .4s var(--easing) both}
        
        /* Vault Grid */
        .vault-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:20px;padding-bottom:16px}
        .vault-grid.list-view{grid-template-columns:1fr;gap:16px}
        
        /* Vault Card */
        .vcard{background:var(--white);border:2px solid var(--bdr);border-radius:28px;overflow:hidden;transition:all .3s var(--easing);position:relative;display:flex;flex-direction:column;cursor:none;animation:fadeUp .45s var(--easing) both}
        .vcard:hover{transform:translateY(-6px);border-color:var(--coral-l);box-shadow:0 16px 40px rgba(0,0,0,.06)}
        .vcard.selected{border-color:var(--coral);box-shadow:0 0 0 4px rgba(255,107,91,.15)}
        .vcard-cover{width:100%;height:150px;object-fit:cover;border-radius:26px 26px 0 0}
        .vcard-cover-ph{width:100%;height:150px;display:flex;align-items:center;justify-content:center;font-size:3rem;background:var(--surf);border-radius:26px 26px 0 0}
        .vs-badge{position:absolute;top:14px;right:14px;padding:6px 13px;border-radius:100px;font-size:.7rem;font-weight:800;background:rgba(255,255,255,.92);backdrop-filter:blur(4px);box-shadow:0 4px 12px rgba(0,0,0,.08);color:var(--txt)}
        .vs-open{color:var(--teal)}
        .vs-draft{background:rgba(255,249,235,.95);color:var(--gold);border:1px solid rgba(245,166,35,.2)}
        .vs-grace{background:rgba(224,245,238,.95);color:var(--teal);border:1px solid rgba(29,158,117,.2);animation:gracePulse 2s ease-in-out infinite}
        @keyframes gracePulse{0%,100%{opacity:1}50%{opacity:.45}}
        .vault-checkbox-wrap{position:absolute;top:14px;left:14px;display:none;background:rgba(255,255,255,.92);padding:6px;border-radius:50%;box-shadow:0 4px 12px rgba(0,0,0,.08);z-index:10}
        .bulkMode .vault-checkbox-wrap{display:flex}
        .vault-checkbox{width:20px;height:20px;accent-color:var(--coral);cursor:none}
        .vcard-body{padding:18px;display:flex;flex-direction:column;gap:6px;flex:1}
        .vcard-vis-row{display:flex;align-items:center;justify-content:space-between}
        .vcard-vis{font-size:.7rem;font-weight:800;color:var(--txt3);text-transform:uppercase;letter-spacing:.08em}
        .capsule-dot{width:13px;height:13px;border-radius:50%;flex-shrink:0;box-shadow:0 1px 4px rgba(0,0,0,.15);border:2px solid rgba(255,255,255,.8)}
        .vcard-title{font-family:'Sora',sans-serif;font-size:1.05rem;font-weight:800;color:var(--txt);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .vcard-date{font-size:.8rem;color:var(--txt2);font-weight:600}
        .vcard-files{font-size:.75rem;color:var(--txt3);font-weight:700}
        .ew-row{font-size:.75rem;font-weight:700;color:var(--gold);margin-top:2px}
        .ew-row.expired{color:var(--txt3)}
        .ew-row.grace-info{color:var(--teal)}
        .ew-row.open-info{color:var(--teal)}
        
        /* List view */
        .vault-grid.list-view .vcard{flex-direction:row;align-items:stretch;min-height:130px}
        .vault-grid.list-view .vcard-cover,.vault-grid.list-view .vcard-cover-ph{width:200px;height:auto;border-radius:26px 0 0 26px}
        .vault-grid.list-view .vcard-body{padding:18px 22px;justify-content:center}
        @media(max-width:700px){
          .vault-grid.list-view .vcard{flex-direction:column}
          .vault-grid.list-view .vcard-cover,.vault-grid.list-view .vcard-cover-ph{width:100%;height:150px;border-radius:26px 26px 0 0}
        }
        
        /* Empty state */
        .empty-state{text-align:center;padding:36px 20px;grid-column:1/-1;background:var(--surf);border-radius:22px}
        .empty-state h3{font-family:'Sora',sans-serif;font-size:1.05rem;font-weight:800;color:var(--txt);margin-bottom:6px}
        
        /* Bulk bar */
        .bulk-bar{position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(100px);background:var(--white);border:1px solid var(--coral-l);border-radius:100px;padding:10px 20px;display:flex;align-items:center;gap:16px;z-index:200;box-shadow:0 12px 40px rgba(255,107,91,.15);transition:transform .4s var(--easing)}
        .bulk-bar.visible{transform:translateX(-50%) translateY(0)}
        .bulk-count{font-size:.9rem;font-weight:800;color:var(--txt)}
        .bulk-btn{padding:8px 16px;border-radius:100px;font-size:.8rem;font-weight:800;cursor:none;border:none;font-family:'Nunito',sans-serif;transition:all .2s}
        .bb-archive{background:var(--coral-l);color:var(--coral)}
        .bb-archive:hover{background:var(--coral);color:#fff}
        .bb-clear{background:var(--surf);color:var(--txt2)}
        
        /* RIGHT PANEL */
        .r-panel{width:360px;min-width:360px;background:var(--coral);border-radius:28px;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 16px 48px rgba(255,107,91,.3);flex-shrink:0;position:relative;transition:transform .4s var(--easing),background .45s ease}
        .r-panel::before{content:'';position:absolute;inset:0;background:radial-gradient(circle at 80% 20%,rgba(255,255,255,.12) 0%,transparent 60%),radial-gradient(circle at 10% 80%,rgba(255,255,255,.08) 0%,transparent 50%);pointer-events:none;z-index:0}
        .rp-inner{position:relative;z-index:1;display:flex;flex-direction:column;height:100%;padding:28px 22px;overflow-y:auto;scrollbar-width:none;gap:11px}
        .rp-inner::-webkit-scrollbar{display:none}
        .rp-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;text-align:center;color:rgba(255,255,255,.8)}
        .rp-empty-ico{font-size:4rem;margin-bottom:16px;opacity:.8}
        .rp-empty-txt{font-family:'Sora',sans-serif;font-size:1.1rem;font-weight:800;margin-bottom:8px;color:#fff}
        
        .rp-cover{width:100%;height:195px;object-fit:cover;border-radius:20px;box-shadow:0 8px 24px rgba(0,0,0,.15);border:2px solid rgba(255,255,255,.2);flex-shrink:0}
        .rp-cover-ph{width:100%;height:155px;border-radius:20px;background:rgba(255,255,255,.15);display:flex;align-items:center;justify-content:center;font-size:4rem;border:2px solid rgba(255,255,255,.2);flex-shrink:0}
        .rp-mood-pill{display:inline-flex;padding:5px 13px;border-radius:100px;background:rgba(255,255,255,.2);color:#fff;font-size:.74rem;font-weight:800;backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,.3)}
        .rp-title{font-family:'Sora',sans-serif;font-size:1.3rem;font-weight:800;color:#fff;line-height:1.2;flex-shrink:0}
        
        .rp-stats-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px;flex-shrink:0}
        .rp-sbox{background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.2);border-radius:15px;padding:11px;backdrop-filter:blur(8px)}
        .rp-sbox-lbl{font-size:.6rem;font-weight:800;color:rgba(255,255,255,.7);text-transform:uppercase;letter-spacing:.06em;margin-bottom:3px}
        .rp-sbox-val{font-size:.8rem;font-weight:800;color:#fff}
        
        .rp-capsule-row{display:flex;align-items:center;gap:11px;background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.2);border-radius:15px;padding:11px 13px;backdrop-filter:blur(8px);flex-shrink:0}
        .rp-capsule-swatch{width:22px;height:22px;border-radius:50%;border:2px solid rgba(255,255,255,.6);box-shadow:0 2px 8px rgba(0,0,0,.2);flex-shrink:0}
        .rp-capsule-txt{font-size:.8rem;font-weight:800;color:#fff;line-height:1.3}
        .rp-capsule-txt small{display:block;font-size:.66rem;color:rgba(255,255,255,.6);font-weight:600}
        
        .rp-tag-section{flex-shrink:0}
        .rp-tag-lbl{font-size:.63rem;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:rgba(255,255,255,.65);margin-bottom:6px}
        .rp-tags{display:flex;flex-wrap:wrap;gap:5px}
        .rp-tag{display:inline-flex;align-items:center;background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.25);border-radius:100px;padding:4px 10px;font-size:.7rem;font-weight:700;color:#fff}
        .rp-tag-empty{font-size:.74rem;color:rgba(255,255,255,.45);font-style:italic;font-weight:600}
        
        .rp-grace-bar{background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.25);border-radius:15px;padding:11px 13px;backdrop-filter:blur(8px);flex-shrink:0}
        .rp-grace-lbl{font-size:.63rem;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:rgba(255,255,255,.7);margin-bottom:5px}
        .rp-grace-countdown{font-family:'Sora',sans-serif;font-size:1.1rem;font-weight:800;color:#fff}
        
        .rp-locked-box{background:rgba(0,0,0,.15);border:1px solid rgba(255,255,255,.15);border-radius:15px;padding:11px 13px;text-align:center;flex-shrink:0}
        .rp-locked-lbl{font-size:.78rem;font-weight:700;color:rgba(255,255,255,.75)}
        
        .rp-story{background:rgba(0,0,0,.15);border-radius:15px;padding:14px;font-size:.83rem;color:rgba(255,255,255,.9);line-height:1.6;font-weight:600;flex-shrink:0;word-break:break-word}
        
        .rp-actions{display:flex;flex-direction:column;gap:9px;margin-top:auto;flex-shrink:0;padding-top:10px}
        .rp-btn{width:100%;padding:13px;border-radius:100px;font-family:'Nunito',sans-serif;font-size:.88rem;font-weight:800;display:flex;align-items:center;justify-content:center;gap:8px;cursor:none;transition:all .3s var(--easing);text-decoration:none;border:none}
        .rp-btn-main{background:#fff;color:var(--coral);box-shadow:0 8px 24px rgba(0,0,0,.15)}
        .rp-btn-main:hover{transform:translateY(-3px);box-shadow:0 12px 30px rgba(0,0,0,.25)}
        .rp-btn-sec{background:rgba(255,255,255,.2);color:#fff;border:1.5px solid rgba(255,255,255,.3)}
        .rp-btn-sec:hover{background:rgba(255,255,255,.3);transform:translateY(-2px)}
        .rp-btn-gold{background:rgba(245,166,35,.25);color:#FFD97D;border:1.5px solid rgba(245,166,35,.5)}
        .rp-btn-warn{background:rgba(255,255,255,.1);color:#fff;border:1.5px solid rgba(255,255,255,.2)}
        .rp-btn-danger{background:rgba(255,60,60,.18);color:#ffb3b3;border:1.5px solid rgba(255,60,60,.3)}
        .rp-btn.disabled{opacity:.4;pointer-events:none}
        
        /* Modals */
        .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.3);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;opacity:0;pointer-events:none;transition:opacity .3s;z-index:1000}
        .modal-overlay.open{opacity:1;pointer-events:all}
        .modal-box{background:var(--white);padding:40px;border-radius:35px;text-align:center;max-width:420px;width:90%;transform:scale(.9);transition:transform .4s var(--easing);box-shadow:0 30px 60px rgba(0,0,0,.15)}
        .modal-overlay.open .modal-box{transform:scale(1)}
        .modal-icon{font-size:3.5rem;margin-bottom:15px;display:block}
        .modal-title{font-family:'Sora';font-size:1.4rem;font-weight:800;margin-bottom:10px;color:var(--txt)}
        .modal-desc{font-size:.9rem;color:var(--txt2);margin-bottom:22px;line-height:1.6;font-weight:600}
        .modal-btns{display:flex;gap:12px;justify-content:center;flex-wrap:wrap}
        .btn-cute{padding:14px 28px;border-radius:30px;background:var(--coral);color:var(--white);font-family:'Sora',sans-serif;font-size:.9rem;font-weight:800;border:none;cursor:none;box-shadow:0 8px 20px rgba(255,107,91,.25);transition:all .3s var(--easing);text-decoration:none;display:inline-flex;align-items:center;gap:6px}
        .btn-cute.secondary{background:var(--surf);color:var(--txt2);box-shadow:none;border:1.5px solid var(--bdr)}

        /* TOAST */
        .toast{position:fixed;bottom:24px;right:24px;padding:16px 24px;border-radius:20px;font-size:.9rem;font-weight:800;z-index:9999;animation:fadeUp .4s var(--easing);display:flex;align-items:center;gap:10px;box-shadow:0 12px 32px rgba(0,0,0,.15)}
        .toast-teal{background:var(--teal-l);color:var(--teal);border:1px solid rgba(29,158,117,.3)}
        .toast-pink{background:var(--coral-l);color:var(--coral);border:1px solid rgba(255,107,91,.3)}

        @keyframes fadeUp{from{opacity:0;transform:translateY(25px)}to{opacity:1;transform:translateY(0)}}
        @media(max-width:1050px){
          .r-panel{position:fixed;right:0;top:0;height:100vh;z-index:500;border-radius:0;transform:translateX(100%);box-shadow:-10px 0 40px rgba(0,0,0,.2)}
          .r-panel.mobile-open{transform:translateX(0)}
          .rp-close-mobile{display:flex;position:absolute;top:20px;right:20px;width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,.2);color:#fff;font-size:1.2rem;align-items:center;justify-content:center;border:none;z-index:10;cursor:none}
          #rpOverlay{position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:499;opacity:0;pointer-events:none;transition:opacity .4s;backdrop-filter:blur(4px)}
          #rpOverlay.open{opacity:1;pointer-events:all}
        }
        @media(max-width:700px){
          .l-sidebar{display:none}.root{padding:8px;gap:8px}.mc-body{padding:14px}
          .stats-grid{grid-template-columns:1fr 1fr}.r-panel{width:100%;min-width:100%}
          .filter-strip{flex-wrap:wrap;border-radius:18px}
        }
      `}</style>

      <div id="cur-dot" ref={dotRef}></div><div id="cur-ring" ref={ringRef}></div>

      <div className="root">
        {/* ════ LEFT SIDEBAR ════ */}
        <aside className={`l-sidebar ${lsbExp ? 'wide' : ''}`}>
          <div className="ls-top">
            <button className="ls-hamburger" onClick={() => setLsbExp(!lsbExp)}>☰</button>
            <span className="ls-brand">TimeVaulth</span>
          </div>
          <nav className="ls-nav">
            <span className="ls-section">Main</span>
            <Link to="/dashboard" className="ls-icon" data-t="Dashboard">🏠<span className="ls-lbl">Dashboard</span></Link>
            <Link to="/my-vaults" className="ls-icon on" data-t="My Vaults">🛡️<span className="ls-lbl">My Vaults</span></Link>
            <Link to="/seal-vault" className="ls-icon" data-t="New Draft">➕<span className="ls-lbl">New Draft</span></Link>
            <Link to="/feed" className="ls-icon" data-t="Global Feed">🌍<span className="ls-lbl">Global Feed</span></Link>
            <div className="ls-div"></div>
            <span className="ls-section">Social</span>
            <Link to="/friends" className="ls-icon" data-t="Friends">👥<span className="ls-lbl">Friends</span></Link>
            <Link to="/messages" className="ls-icon" data-t="Messages">💬<span className="ls-lbl">Messages</span></Link>
            <Link to="/notifications" className="ls-icon" data-t="Notifications">🔔<span className="ls-lbl">Notifications</span></Link>
            <div className="ls-div"></div>
            <span className="ls-section">Account</span>
            <Link to="/profile" className="ls-icon" data-t="Settings">⚙️<span className="ls-lbl">Settings</span></Link>
            <Link to="/login" onClick={() => localStorage.removeItem('user_id')} className="ls-icon" data-t="Logout" style={{color:'var(--coral)'}}>🚪<span className="ls-lbl" style={{color:'var(--coral)'}}>Logout</span></Link>
          </nav>
          <div className="ls-bottom">
            <Link to="/profile" className="ls-selfav-wrap">
              <div className="ls-selfav" style={{ background: myBrd, padding: '2.5px' }}>
                <div className="ls-selfav-inner">
                  {user?.avatar_path ? <img src={`https://your-supabase-url/storage/v1/object/public/${user.avatar_path}`} alt="" /> : ai(usernameShort)}
                </div>
              </div>
              <div className="ls-selfinfo">
                <span className="ls-selfname">{usernameShort}</span>
                <span className="ls-selfrole">My Vaults</span>
              </div>
            </Link>
          </div>
        </aside>

        {/* ════ MAIN CARD ════ */}
        <div className="main-card">
          <div className="mc-top">
            <div className="mc-title">🛡️ My Vaults</div>
            <div className="mc-spacer"></div>
            <Link to="/seal-vault" className={`btn-cute ${limitLeft === 0 ? 'disabled' : ''}`} style={{padding:'10px 20px', fontSize:'.8rem'}}>➕ New Draft</Link>
            <Link to="/dashboard" className="mc-user">
              <div className="mc-uav" style={{ background: myBrd, padding: '2.5px', border: 'none' }}>
                <div className="ls-selfav-inner">
                  {user?.avatar_path ? <img src={`https://your-supabase-url/storage/v1/object/public/${user.avatar_path}`} alt="" /> : ai(usernameShort)}
                </div>
              </div>
              <span className="mc-uname">Dashboard</span>
            </Link>
          </div>

          <div className="mc-body">
            
            <div className="stats-grid">
              <div className="stat-box"><span className="sstat-val">{totalVaults}</span><span className="sstat-lbl">Total</span></div>
              <div className="stat-box"><span className="sstat-val" style={{color:'var(--gold)'}}>{vaults.drafts.length}</span><span className="sstat-lbl">📝 Drafts</span></div>
              <div className="stat-box"><span className="sstat-val" style={{color:'var(--coral)'}}>{vaults.sealed.length}</span><span className="sstat-lbl">🔒 Sealed</span></div>
              <div className="stat-box"><span className="sstat-val" style={{color:'var(--teal)'}}>{vaults.opened.length}</span><span className="sstat-lbl">🔓 Opened</span></div>
              <div className="stat-box"><span className="sstat-val" style={{color:'var(--txt2)'}}>{limitLeft}</span><span className="sstat-lbl">Slots Left</span></div>
            </div>
            
            <div className="limit-wrap">
              <div className="limit-header"><span>Vault Usage</span><span>{totalVaults} / {tierLimit === 999999 ? '∞' : tierLimit}</span></div>
              <div className="limit-track"><div className={`limit-fill ${limitPct >= 100 ? 'full' : ''}`} style={{width:`${limitPct}%`}}></div></div>
            </div>
            
            <div className="toolbar">
              <div className="tb-left">
                <div className="search-wrap">
                  <span className="search-ico">🔍</span>
                  <input className="search-input" type="text" placeholder="Search vaults…" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <div className="filter-strip">
                  {['all', 'draft', 'sealed', 'opened', 'shared'].map(f => (
                    <button key={f} className={`ftab ${filter === f ? 'on' : ''}`} onClick={() => setFilter(f)}>
                      {f === 'all' ? 'All' : f === 'draft' ? '📝 Draft' : f === 'sealed' ? '🔒 Sealed' : f === 'opened' ? '🔓 Opened' : '📬 Shared'}
                    </button>
                  ))}
                </div>
                <select className="sort-sel" value={sort} onChange={e => setSort(e.target.value)}>
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="unlock">Unlock Date</option>
                  <option value="title">A–Z</option>
                </select>
                <div className="layout-toggle">
                  <button className={`lt-btn ${layout === 'grid' ? 'on' : ''}`} onClick={() => {setLayout('grid'); localStorage.setItem('vault-layout', 'grid');}}>🔲</button>
                  <button className={`lt-btn ${layout === 'list' ? 'on' : ''}`} onClick={() => {setLayout('list'); localStorage.setItem('vault-layout', 'list');}}>📄</button>
                </div>
              </div>
              <button className={`bulk-toggle ${bulkMode ? 'on' : ''}`} onClick={() => { setBulkMode(!bulkMode); setSelectedBulkIds([]); }}>☑ Bulk Edit</button>
            </div>

            {/* ══ DRAFTS ══ */}
            {(filter === 'all' || filter === 'draft') && (
              <div className="vault-section">
                <div className="section-hd"><h2 className="section-hd-title">📝 My Drafts</h2><span className="section-count">{vaults.drafts.length} vault{vaults.drafts.length !== 1 ? 's' : ''}</span></div>
                <div className={`vault-grid ${layout === 'list' ? 'list-view' : ''} ${bulkMode ? 'bulkMode' : ''}`}>
                  {vaults.drafts.length > 0 ? getFilteredSortedVaults(vaults.drafts).map(v => (
                    <div key={v.id} className={`vcard ${selectedVault?.id === v.id && !bulkMode ? 'selected' : ''} ${selectedBulkIds.includes(v.id) && bulkMode ? 'selected' : ''}`}
                         onClick={() => selectVault(v)} style={{ borderTop: `3px solid ${v.capsule_color || '#FF6B5B'}` }}>
                      <div className="vault-checkbox-wrap"><input type="checkbox" className="vault-checkbox" checked={selectedBulkIds.includes(v.id)} onChange={() => {}} /></div>
                      <div className="vs-badge vs-draft">✏️ Draft</div>
                      {v.cover_path ? <img className="vcard-cover" src={`https://your-supabase-url/storage/v1/object/public/${v.cover_path}`} alt="" /> : <div className="vcard-cover-ph" style={{background: capsuleTheme(v.capsule_color, v.capsule_design).gradient, color: capsuleTheme(v.capsule_color, v.capsule_design).text}}>{moodIco[v.mood]||'💜'}</div>}
                      <div className="vcard-body">
                        <div className="vcard-vis-row">
                          <div className="vcard-vis">{visIco[v.visibility]} {v.visibility.toUpperCase()}</div>
                          <div className="capsule-dot" style={{background: v.capsule_color}}></div>
                        </div>
                        <div className="vcard-title">{v.title}</div>
                        <div className="vcard-date">🔓 {v.unlock_date ? new Date(v.unlock_date).toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric'}) : ''}</div>
                        <div className="vcard-files">📎 {v.file_count} files · 🤝 {v.collab_count} collabs</div>
                        <div className="ew-row">📝 Draft — click to edit & seal</div>
                      </div>
                    </div>
                  )) : (
                    <div className="empty-state"><span style={{fontSize:'3rem', display:'block', marginBottom:'10px'}}>✏️</span><h3>No drafts yet</h3><p style={{fontSize:'.88rem', color:'var(--txt2)', marginBottom:'18px', fontWeight:600}}>Start a draft to add files and collaborators before sealing.</p><Link to="/seal-vault" className="btn-cute" style={{fontSize:'.85rem'}}>➕ New Draft</Link></div>
                  )}
                </div>
              </div>
            )}
            {(filter === 'all' || filter === 'draft') && <hr className="section-divider" />}

            {/* ══ SEALED ══ */}
            {(filter === 'all' || filter === 'sealed') && (
              <div className="vault-section">
                <div className="section-hd"><h2 className="section-hd-title">🔒 Sealed Vaults</h2><span className="section-count">{vaults.sealed.length} vault{vaults.sealed.length !== 1 ? 's' : ''}</span></div>
                <div className={`vault-grid ${layout === 'list' ? 'list-view' : ''} ${bulkMode ? 'bulkMode' : ''}`}>
                  {vaults.sealed.length > 0 ? getFilteredSortedVaults(vaults.sealed).map(v => {
                    const inGrace = v.sealed_at && (currentTime - Math.floor(new Date(v.sealed_at).getTime()/1000) < 86400);
                    return (
                      <div key={v.id} className={`vcard ${selectedVault?.id === v.id && !bulkMode ? 'selected' : ''} ${selectedBulkIds.includes(v.id) && bulkMode ? 'selected' : ''}`}
                           onClick={() => selectVault(v)} style={{ borderTop: `3px solid ${v.capsule_color || '#FF6B5B'}` }}>
                        <div className="vault-checkbox-wrap"><input type="checkbox" className="vault-checkbox" checked={selectedBulkIds.includes(v.id)} onChange={() => {}} /></div>
                        <div className={`vs-badge ${inGrace ? 'vs-grace' : ''}`}>{inGrace ? '⚡ Grace' : '🔒 Sealed'}</div>
                        {v.cover_path ? <img className="vcard-cover" src={`https://your-supabase-url/storage/v1/object/public/${v.cover_path}`} alt="" /> : <div className="vcard-cover-ph" style={{background: capsuleTheme(v.capsule_color, v.capsule_design).gradient, color: capsuleTheme(v.capsule_color, v.capsule_design).text}}>{moodIco[v.mood]||'💜'}</div>}
                        <div className="vcard-body">
                          <div className="vcard-vis-row">
                            <div className="vcard-vis">{visIco[v.visibility]} {v.visibility.toUpperCase()}</div>
                            <div className="capsule-dot" style={{background: v.capsule_color}}></div>
                          </div>
                          <div className="vcard-title">{v.title}</div>
                          <div className="vcard-date">🔓 {new Date(v.unlock_date).toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric'})}</div>
                          <div className="vcard-files">📎 {v.file_count} files · 📬 {v.recipient_count} recipients</div>
                          {inGrace ? (
                            <div className="ew-row grace-info">⚡ Grace period active</div>
                          ) : (
                            <div className="ew-row expired">🔒 Locked until {new Date(v.unlock_date).toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric'})}</div>
                          )}
                        </div>
                      </div>
                    );
                  }) : (
                    <div className="empty-state"><span style={{fontSize:'3rem', display:'block', marginBottom:'10px'}}>🔒</span><h3>No sealed vaults</h3></div>
                  )}
                </div>
              </div>
            )}
            {(filter === 'all' || filter === 'sealed') && <hr className="section-divider" />}

            {/* ══ OPENED ══ */}
            {(filter === 'all' || filter === 'opened') && (
              <div className="vault-section">
                <div className="section-hd"><h2 className="section-hd-title">🔓 Opened Vaults</h2><span className="section-count">{vaults.opened.length} vault{vaults.opened.length !== 1 ? 's' : ''}</span></div>
                <div className={`vault-grid ${layout === 'list' ? 'list-view' : ''} ${bulkMode ? 'bulkMode' : ''}`}>
                  {vaults.opened.length > 0 ? getFilteredSortedVaults(vaults.opened).map(v => (
                    <div key={v.id} className={`vcard ${selectedVault?.id === v.id && !bulkMode ? 'selected' : ''} ${selectedBulkIds.includes(v.id) && bulkMode ? 'selected' : ''}`}
                         onClick={() => selectVault(v)} style={{ borderTop: `3px solid ${v.capsule_color || '#FF6B5B'}` }}>
                      <div className="vault-checkbox-wrap"><input type="checkbox" className="vault-checkbox" checked={selectedBulkIds.includes(v.id)} onChange={() => {}} /></div>
                      <div className="vs-badge vs-open">🔓 Open</div>
                      {v.cover_path ? <img className="vcard-cover" src={`https://your-supabase-url/storage/v1/object/public/${v.cover_path}`} alt="" /> : <div className="vcard-cover-ph" style={{background: capsuleTheme(v.capsule_color, v.capsule_design).gradient, color: capsuleTheme(v.capsule_color, v.capsule_design).text}}>{moodIco[v.mood]||'💜'}</div>}
                      <div className="vcard-body">
                        <div className="vcard-vis-row">
                          <div className="vcard-vis">{visIco[v.visibility]} {v.visibility.toUpperCase()}</div>
                          <div className="capsule-dot" style={{background: v.capsule_color}}></div>
                        </div>
                        <div className="vcard-title">{v.title}</div>
                        <div className="vcard-date">🔓 Opened: {new Date(v.unlock_date).toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric'})}</div>
                        <div className="vcard-files">📎 {v.file_count} files</div>
                        <div className="ew-row open-info">🔓 Vault is open</div>
                      </div>
                    </div>
                  )) : (
                    <div className="empty-state"><span style={{fontSize:'3rem', display:'block', marginBottom:'10px'}}>🔓</span><h3>No opened vaults yet</h3></div>
                  )}
                </div>
              </div>
            )}
            
          </div>
        </div>

        {/* ════ RIGHT PANEL ════ */}
        <div id="rpOverlay" className={rpMobileOpen ? 'open' : ''} onClick={() => setRpMobileOpen(false)}></div>
        <div className={`r-panel ${rpMobileOpen ? 'mobile-open' : ''}`} style={{ background: selectedVault ? capsuleTheme(selectedVault.capsule_color, selectedVault.capsule_design).gradient : 'var(--coral)' }}>
          {rpMobileOpen && <button className="rp-close-mobile" onClick={() => setRpMobileOpen(false)}>✕</button>}
          
          <div className="rp-inner">
            {selectedVault ? (() => {
              const v = selectedVault;
              const inGrace = v.status === 'sealed' && v.sealed_at && (currentTime - Math.floor(new Date(v.sealed_at).getTime()/1000) < 86400);
              const graceLeft = inGrace ? 86400 - (currentTime - Math.floor(new Date(v.sealed_at).getTime()/1000)) : 0;
              const dinfo = designLabels[v.capsule_design || 'default'] || designLabels['default'];

              return (
                <>
                  {v.cover_path ? <img src={`https://your-supabase-url/storage/v1/object/public/${v.cover_path}`} className="rp-cover" alt="" /> : <div className="rp-cover-ph">{moodIco[v.mood] || '💜'}</div>}
                  <div><span className="rp-mood-pill">{moodIco[v.mood]} {v.mood}</span></div>
                  <div className="rp-title">{v.title}</div>
                  
                  <div className="rp-stats-grid">
                    {v.status === 'draft' ? (
                      <div className="rp-sbox" style={{background:'rgba(245,166,35,.2)',borderColor:'rgba(245,166,35,.4)'}}><div className="rp-sbox-lbl">Status</div><div className="rp-sbox-val">✏️ Draft</div></div>
                    ) : v.status === 'opened' ? (
                      <div className="rp-sbox" style={{background:'rgba(29,158,117,.2)',borderColor:'rgba(29,158,117,.4)'}}><div className="rp-sbox-lbl">Status</div><div className="rp-sbox-val">🔓 Opened</div></div>
                    ) : inGrace ? (
                      <>
                        <div className="rp-sbox" style={{background:'rgba(29,158,117,.2)',borderColor:'rgba(29,158,117,.4)'}}><div className="rp-sbox-lbl">Status</div><div className="rp-sbox-val">⚡ Grace Period</div></div>
                        <div className="rp-grace-bar"><div className="rp-grace-lbl">⚡ Grace period remaining</div><div className="rp-grace-countdown">{String(Math.floor(graceLeft/3600)).padStart(2,'0')}:{String(Math.floor((graceLeft%3600)/60)).padStart(2,'0')}:{String(graceLeft%60).padStart(2,'0')}</div></div>
                      </>
                    ) : (
                      <>
                        <div className="rp-sbox"><div className="rp-sbox-lbl">Status</div><div className="rp-sbox-val">🔒 Sealed</div></div>
                        <div className="rp-locked-box"><div className="rp-locked-lbl">🔒 Permanently locked — unlocks on {new Date(v.unlock_date).toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric'})}</div></div>
                      </>
                    )}
                    
                    <div className="rp-sbox"><div className="rp-sbox-lbl">Visibility</div><div className="rp-sbox-val">{visIco[v.visibility]} {v.visibility.charAt(0).toUpperCase() + v.visibility.slice(1)}</div></div>
                    <div className="rp-sbox"><div className="rp-sbox-lbl">Unlocks</div><div className="rp-sbox-val">{new Date(v.unlock_date).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric'})}</div></div>
                    <div className="rp-sbox"><div className="rp-sbox-lbl">Files</div><div className="rp-sbox-val">📎 {v.file_count}</div></div>
                  </div>

                  <div className="rp-capsule-row">
                    <div className="rp-capsule-swatch" style={{background: v.capsule_color || '#FF6B5B'}}></div>
                    <div className="rp-capsule-txt">{dinfo.ico} {dinfo.label}<small>{v.capsule_color}</small></div>
                  </div>

                  <div className="rp-tag-section">
                    <div className="rp-tag-lbl">🤝 Collaborators ({v.collab_count})</div>
                    <div className="rp-tags">{v.collab_count > 0 ? <span className="rp-tag">View in edit</span> : <span className="rp-tag-empty">No collaborators yet</span>}</div>
                  </div>

                  <div className="rp-tag-section">
                    <div className="rp-tag-lbl">📬 Recipients ({v.recipient_count})</div>
                    <div className="rp-tags">{v.recipient_count > 0 ? <span className="rp-tag">View in edit</span> : <span className="rp-tag-empty">No recipients yet</span>}</div>
                  </div>

                  <div className="rp-story">{v.story ? v.story : <em style={{opacity:.6}}>No story attached.</em>}</div>

                  <div className="rp-actions">
                    {v.status === 'draft' && (
                      <>
                        <Link to={`/seal-vault?id=${v.id}`} className="rp-btn rp-btn-main">✏️ Edit Draft</Link>
                        <button className="rp-btn rp-btn-gold" onClick={() => setModal('seal')}>🔒 Seal Vault</button>
                        <button className="rp-btn rp-btn-danger" onClick={() => setModal('cancel')}>🗑️ Delete Draft</button>
                      </>
                    )}
                    {v.status === 'sealed' && inGrace && (
                      <>
                        <Link to={`/seal-vault?id=${v.id}`} className="rp-btn rp-btn-main">✏️ Edit (Grace Period)</Link>
                        <button className="rp-btn rp-btn-danger" onClick={() => setModal('cancel')}>🗑️ Cancel & Delete</button>
                      </>
                    )}
                    {v.status === 'sealed' && !inGrace && (
                       <div className="rp-btn rp-btn-sec disabled">🔒 Locked Until Unlock Date</div>
                    )}
                    {v.status === 'opened' && (
                      <>
                        <Link to={`/vault/${v.id}`} className="rp-btn rp-btn-main">🔓 Open Vault</Link>
                        <button className="rp-btn rp-btn-warn" onClick={() => setModal('archive')}>📦 Archive</button>
                      </>
                    )}
                  </div>
                </>
              );
            })() : (
              <div className="rp-empty">
                <div className="rp-empty-ico">👈</div>
                <div className="rp-empty-txt">Select a Vault</div>
                <p style={{fontSize:'.84rem', fontWeight:600, opacity:.7}}>Click any vault card to view details, edit, or share.</p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ════ BULK BAR ════ */}
      <div className={`bulk-bar ${bulkMode && selectedBulkIds.length > 0 ? 'visible' : ''}`}>
        <span className="bulk-count">{selectedBulkIds.length} selected</span>
        <button className="bulk-btn bb-archive" onClick={() => setModal('bulk')}>📦 Archive Selected</button>
        <button className="bulk-btn bb-clear" onClick={() => setSelectedBulkIds([])}>✕ Clear</button>
      </div>

      {/* ════ MODALS ════ */}
      <div className={`modal-overlay ${modal === 'seal' ? 'open' : ''}`} onClick={(e) => e.target.classList.contains('modal-overlay') && setModal(null)}>
        <div className="modal-box">
          <span className="modal-icon">🔒</span><h3 className="modal-title">Seal This Vault?</h3>
          <p className="modal-desc" style={{color:'var(--coral)', fontWeight:800, fontSize:'1rem', marginBottom:'8px'}}>{selectedVault?.title}</p>
          <p className="modal-desc">This starts the <strong>24-hour grace period</strong>. After that it's permanently locked until the unlock date.</p>
          <div className="modal-btns">
            <button className="btn-cute" style={{background:'var(--teal)', boxShadow:'0 8px 20px rgba(29,158,117,.3)'}} onClick={() => handleAction('seal')}>🔒 Yes, Seal It</button>
            <button className="btn-cute secondary" onClick={() => setModal(null)}>Keep Editing</button>
          </div>
        </div>
      </div>

      <div className={`modal-overlay ${modal === 'archive' ? 'open' : ''}`} onClick={(e) => e.target.classList.contains('modal-overlay') && setModal(null)}>
        <div className="modal-box">
          <span className="modal-icon">📦</span><h3 className="modal-title">Archive Vault?</h3>
          <p className="modal-desc">It will move to your Archive. You can restore it anytime.</p>
          <div className="modal-btns">
            <button className="btn-cute" style={{background:'var(--gold)', color:'#000'}} onClick={() => handleAction('archive')}>Yes, Archive</button>
            <button className="btn-cute secondary" onClick={() => setModal(null)}>Cancel</button>
          </div>
        </div>
      </div>

      <div className={`modal-overlay ${modal === 'cancel' ? 'open' : ''}`} onClick={(e) => e.target.classList.contains('modal-overlay') && setModal(null)}>
        <div className="modal-box">
          <span className="modal-icon">🗑️</span><h3 className="modal-title">Delete Vault?</h3>
          <p className="modal-desc" style={{color:'var(--red)'}}>This will permanently delete the vault and all its files. This cannot be undone.</p>
          <div className="modal-btns">
            <button className="btn-cute" style={{background:'var(--red)', color:'#fff'}} onClick={() => handleAction('delete')}>Permanently Delete</button>
            <button className="btn-cute secondary" onClick={() => setModal(null)}>Keep It</button>
          </div>
        </div>
      </div>

      <div className={`modal-overlay ${modal === 'bulk' ? 'open' : ''}`} onClick={(e) => e.target.classList.contains('modal-overlay') && setModal(null)}>
        <div className="modal-box">
          <span className="modal-icon">📦</span><h3 className="modal-title">Bulk Archive</h3>
          <p className="modal-desc">Archive {selectedBulkIds.length} vault{selectedBulkIds.length !== 1 ? 's' : ''}?</p>
          <div className="modal-btns">
            <button className="btn-cute" style={{background:'var(--gold)', color:'#000'}} onClick={handleBulkArchive}>Archive All</button>
            <button className="btn-cute secondary" onClick={() => setModal(null)}>Cancel</button>
          </div>
        </div>
      </div>

      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
    </>
  );
}
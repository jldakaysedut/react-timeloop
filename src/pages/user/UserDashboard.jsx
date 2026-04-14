import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../config/supabaseClient'; 

// ─── HELPER FUNCTIONS ───
const ai = (n) => (n ? n.substring(0, 2).toUpperCase() : 'U');
const tg = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};
const ta = (dt) => {
  if (!dt) return '';
  const diff = Math.floor((Date.now() - new Date(dt).getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  return Math.floor(diff / 86400) + 'd ago';
};
const ni = (m) => {
  if (!m) return '🔔';
  if (m.includes('friend')) return '👥';
  if (m.includes('vault')) return '📤';
  if (m.includes('Ping')) return '⚡';
  if (m.includes('upgraded')) return '⭐';
  return '🔔';
};

const capsule_theme = (color = '#FF6B5B', design = 'default') => {
  let hex = (color || '#FF6B5B').replace('#', '');
  if (hex.length !== 6) hex = 'FF6B5B';
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  let text = lum > 0.55 ? '#222222' : '#ffffff';
  const dark = '#' + [Math.max(0, Math.floor(r * 0.6)), Math.max(0, Math.floor(g * 0.6)), Math.max(0, Math.floor(b * 0.6))].map(x => x.toString(16).padStart(2, '0')).join('');
  
  const grads = {
    'default': `linear-gradient(135deg, #${hex} 0%, ${dark} 100%)`,
    'classic': `linear-gradient(145deg, #f5e6c8 0%, #${hex}88 60%, ${dark}cc 100%)`,
    'pastel': `linear-gradient(135deg, #${hex}66 0%, #fff4f4 60%, #${hex}44 100%)`,
    'midnight': `linear-gradient(145deg, #0f0f1a 0%, #${hex}99 50%, #1a1a2e 100%)`,
    'aurora': `linear-gradient(135deg, #${hex} 0%, #7c3aedaa 50%, ${dark} 100%)`,
    'obsidian': `linear-gradient(145deg, #111111 0%, #${hex}77 60%, #1a1a1a 100%)`,
    'sakura': `linear-gradient(135deg, #${hex}88 0%, #fce4ec 50%, #${hex}55 100%)`
  };
  
  const grad = grads[design] || grads['default'];
  if (['midnight', 'obsidian'].includes(design)) text = '#ffffff';
  if (['pastel', 'classic'].includes(design)) text = '#333333';
  return { gradient: grad, text, color: `#${hex}`, dark };
};

const border_css = {
  'border-none': 'linear-gradient(135deg,#FF6B5B,#FF9A8B)',
  'border-gold': 'linear-gradient(135deg,#FFD700,#FFA500)',
  'border-teal': 'linear-gradient(135deg,#00E5B0,#00B4D8)',
  'border-pink': 'linear-gradient(135deg,#FF1493,#FF69B4)',
  'border-purple': 'linear-gradient(135deg,#8B00FF,#9B59B6)',
  'border-rainbow': 'linear-gradient(135deg,#FF6B5B,#FFD700,#00E5B0,#8B00FF,#FF1493)',
  'border-fire': 'linear-gradient(135deg,#FF4500,#FF8C00,#FFD700)'
};

const mood_ico = { 'Happy': '😊', 'Sad': '😢', 'Excited': '🎉', 'Nostalgic': '🥹', 'Hopeful': '✨', 'Angry': '😤' };

export default function UserDashboard() {
  const navigate = useNavigate();
  const dotRef = useRef(null);
  const ringRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [myVaults, setMyVaults] = useState([]);
  const [nextVault, setNextVault] = useState(null);
  const [friends, setFriends] = useState([]);
  const [recentNotifs, setRecentNotifs] = useState([]);
  
  const [counts, setCounts] = useState({
    vaults: 0, friends: 0, badges: 0, notifs: 0, msgs: 0, likes: 0, comments: 0
  });

  const [lsbExp, setLsbExp] = useState(localStorage.getItem('lsb-exp') === '1');
  const [ndOpen, setNdOpen] = useState(false);
  const [rpTabIdx, setRpTabIdx] = useState(0);
  const [fFilter, setFFilter] = useState('all');
  const [vFilter, setVFilter] = useState('all');
  const [cd, setCd] = useState({ d: '00', h: '00', m: '00', s: '00' });

  const toggleLsb = () => {
    const newVal = !lsbExp;
    setLsbExp(newVal);
    localStorage.setItem('lsb-exp', newVal ? '1' : '0');
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      const uid = localStorage.getItem('user_id');
      if (!uid) {
        navigate('/login');
        return;
      }

      try {
        const { data: userData } = await supabase.from('users').select('*').eq('id', uid).single();
        if (userData) setUser(userData);

        const { data: vaultsData } = await supabase
          .from('vaults')
          .select('*, vault_files(count)')
          .eq('user_id', uid)
          .eq('is_archived', false)
          .in('status', ['sealed', 'opened'])
          .order('created_at', { ascending: false })
          .limit(6);
        
        if (vaultsData) {
          const formattedVaults = vaultsData.map(v => ({
            ...v,
            fc: v.vault_files && v.vault_files[0] ? v.vault_files[0].count : 0
          }));
          setMyVaults(formattedVaults);
        }

        const nowIso = new Date().toISOString();
        const { data: nextVaultData } = await supabase
          .from('vaults')
          .select('*')
          .eq('user_id', uid)
          .eq('is_archived', false)
          .eq('status', 'sealed')
          .gt('unlock_date', nowIso)
          .order('unlock_date', { ascending: true })
          .limit(1)
          .single();
        
        if (nextVaultData) setNextVault(nextVaultData);

        const { data: fData1 } = await supabase.from('friendships').select('friend_id').eq('user_id', uid).eq('status', 'accepted');
        const { data: fData2 } = await supabase.from('friendships').select('user_id').eq('friend_id', uid).eq('status', 'accepted');
        
        let friendIds = [];
        if (fData1) friendIds = [...friendIds, ...fData1.map(f => f.friend_id)];
        if (fData2) friendIds = [...friendIds, ...fData2.map(f => f.user_id)];
        
        if (friendIds.length > 0) {
          const { data: friendsList } = await supabase
            .from('users')
            .select('id, username, avatar_path, streak_count, equipped_border')
            .in('id', friendIds)
            .order('streak_count', { ascending: false })
            .limit(10);
          if (friendsList) setFriends(friendsList);
        }

        const { data: notifData } = await supabase
          .from('notifications')
          .select(`*, actor:users!actor_id(username)`)
          .eq('user_id', uid)
          .order('created_at', { ascending: false })
          .limit(6);
        
        if (notifData) {
          setRecentNotifs(notifData.map(n => ({
            ...n,
            aname: n.actor ? n.actor.username : null
          })));
        }

        const { count: vCount } = await supabase.from('vaults').select('*', { count: 'exact', head: true }).eq('user_id', uid).eq('is_archived', false);
        const { count: bCount } = await supabase.from('achievements').select('*', { count: 'exact', head: true }).eq('user_id', uid);
        const { count: nCount } = await supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', uid).eq('is_read', false);
        const { count: mCount } = await supabase.from('messages').select('*', { count: 'exact', head: true }).eq('receiver_id', uid).eq('is_read', false);
        const { count: cCount } = await supabase.from('vault_comments').select('*, vaults!inner(user_id)').eq('vaults.user_id', uid);
        const { count: lCount } = await supabase.from('vault_likes').select('*, vaults!inner(user_id)').eq('vaults.user_id', uid);

        setCounts({
          vaults: vCount || 0,
          friends: friendIds.length,
          badges: bCount || 0,
          notifs: nCount || 0,
          msgs: mCount || 0,
          likes: lCount || 0,
          comments: cCount || 0
        });

      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [navigate]);

  useEffect(() => {
    let mx = 0, my = 0, rx = 0, ry = 0;
    let reqId;

    const handleMouseMove = (e) => {
      mx = e.clientX; my = e.clientY;
      if (dotRef.current) { dotRef.current.style.left = mx + 'px'; dotRef.current.style.top = my + 'px'; }
    };

    const animateCursor = () => {
      rx += (mx - rx) * 0.14; ry += (my - ry) * 0.14;
      if (ringRef.current) { ringRef.current.style.left = rx + 'px'; ringRef.current.style.top = ry + 'px'; }
      reqId = requestAnimationFrame(animateCursor);
    };

    window.addEventListener('mousemove', handleMouseMove);
    animateCursor();

    const handleGlobalClick = () => setNdOpen(false);
    window.addEventListener('click', handleGlobalClick);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('click', handleGlobalClick);
      cancelAnimationFrame(reqId);
    };
  }, []);

  useEffect(() => {
    if (!nextVault) return;
    const unlockTime = new Date(nextVault.unlock_date).getTime();
    
    const tick = () => {
      const diff = Math.max(0, Math.floor((unlockTime - Date.now()) / 1000));
      const d = Math.floor(diff / 86400), h = Math.floor((diff % 86400) / 3600), m = Math.floor((diff % 3600) / 60), s = diff % 60;
      const p = n => String(n).padStart(2, '0');
      setCd({ d: p(d), h: p(h), m: p(m), s: p(s) });
    };
    
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [nextVault]);

  if (loading) {
    return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FFF0ED', color: '#FF6B5B', fontFamily: '"Sora", sans-serif', fontSize: '1.5rem', fontWeight: 800 }}>⏳ Loading TimeVaulth...</div>;
  }

  if (!user) return null;

  const self_brd = border_css[user.equipped_border || 'border-none'] || border_css['border-none'];
  const nv_theme = nextVault ? capsule_theme(nextVault.capsule_color, nextVault.capsule_design) : null;
  const usernameShort = (user.username || '').split('@')[0];

  return (
    <>
      <style>{`
        :root{
          --coral:#FF6B5B; --coral-l:#FFE8E4; --coral-d:#E8503F; --peach:#FFF0ED;
          --white:#FFFFFF; --card:#FFFFFF; --surf:#F8F8F8; --bdr:rgba(0,0,0,.07);
          --txt:#222; --txt2:#777; --txt3:#BDBDBD; --teal:#1D9E75; --teal-l:#E0F5EE;
          --gold:#F5A623; --easing:cubic-bezier(.25,1,.5,1);
        }
        *,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
        html,body{height:100%;overflow:hidden}
        body{font-family:'Nunito',sans-serif;background:var(--peach);color:var(--txt);cursor:none}
        #cur-dot{position:fixed;width:9px;height:9px;background:var(--coral);border-radius:50%;pointer-events:none;z-index:9999;transform:translate(-50%,-50%);transition:width .15s,height .15s}
        #cur-ring{position:fixed;width:26px;height:26px;border:2px solid var(--coral);border-radius:50%;pointer-events:none;z-index:9998;transform:translate(-50%,-50%);transition:left .1s var(--easing),top .1s var(--easing),width .2s,height .2s,opacity .2s;opacity:.45}
        body:has(a:hover) #cur-dot,body:has(button:hover) #cur-dot{width:14px;height:14px}
        body:has(a:hover) #cur-ring,body:has(button:hover) #cur-ring{width:32px;height:32px;}
        .root{display:flex;height:100vh;overflow:hidden;padding:16px;gap:12px}
        .l-sidebar{
          width:72px;min-width:72px;
          display:flex;flex-direction:column;align-items:center;
          gap:0;padding:0 0 12px;overflow:hidden;flex-shrink:0;
          transition:width .35s var(--easing),min-width .35s var(--easing);
        }
        .l-sidebar.wide{width:200px;min-width:200px}
        .ls-top{display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid var(--bdr);flex-shrink:0;min-height:58px;width:100%}
        .ls-brand{font-family:'Sora',sans-serif;font-size:.85rem;font-weight:800;color:var(--txt);white-space:nowrap;overflow:hidden;opacity:0;max-width:0;transition:opacity .2s .05s,max-width .3s var(--easing);flex:1}
        .l-sidebar.wide .ls-brand{opacity:1;max-width:120px}
        .ls-hamburger{width:40px;height:40px;border-radius:12px;display:flex;align-items:center;justify-content:center;background:transparent;border:none;color:var(--txt2);font-size:1rem;cursor:none;transition:all .25s var(--easing)}
        .ls-hamburger:hover{background:var(--coral-l);color:var(--coral)}
        .ls-nav{flex:1;overflow-y:auto;overflow-x:hidden;display:flex;flex-direction:column;gap:2px;width:100%;padding:.4rem .5rem;scrollbar-width:thin;scrollbar-color:var(--coral-l) transparent}
        .ls-nav::-webkit-scrollbar{width:3px}
        .ls-nav::-webkit-scrollbar-thumb{background:var(--coral-l);border-radius:10px}
        .ls-section{font-size:.55rem;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:var(--txt3);padding:.5rem .55rem .18rem;white-space:nowrap;opacity:0;max-height:0;overflow:hidden;transition:opacity .2s,max-height .3s var(--easing)}
        .l-sidebar.wide .ls-section{opacity:1;max-height:24px}
        .ls-icon{width:44px;height:44px;border-radius:14px;display:flex;align-items:center;justify-content:center;gap:0;font-size:1.1rem;text-decoration:none;color:var(--txt3);transition:all .3s var(--easing);position:relative;cursor:none;flex-shrink:0;overflow:hidden;white-space:nowrap;margin:0 auto;}
        .l-sidebar.wide .ls-icon{width:100%;justify-content:flex-start;padding:0 .65rem;gap:.65rem}
        .ls-icon:hover{background:var(--coral-l);color:var(--coral)}
        .ls-icon.on{background:var(--coral);color:#fff;box-shadow:0 6px 20px rgba(255,107,91,.35)}
        .ls-icon .ls-lbl{font-size:.8rem;font-weight:700;opacity:0;max-width:0;overflow:hidden;transition:opacity .2s .05s,max-width .3s var(--easing);pointer-events:none;white-space:nowrap}
        .l-sidebar.wide .ls-icon .ls-lbl{opacity:1;max-width:140px}
        .ls-icon .ls-ibadge{margin-left:auto;background:var(--coral);color:#fff;font-size:.52rem;padding:2px 5px;border-radius:10px;font-weight:900;opacity:0;max-width:0;overflow:hidden;transition:opacity .2s .05s,max-width .3s var(--easing)}
        .l-sidebar.wide .ls-icon .ls-ibadge{opacity:1;max-width:30px}
        .ls-icon.on .ls-ibadge{background:rgba(255,255,255,.3)}
        .ls-icon::after{content:attr(data-t);position:absolute;left:calc(100% + 10px);top:50%;transform:translateY(-50%);background:var(--txt);color:#fff;font-size:.68rem;font-weight:700;padding:.22rem .6rem;border-radius:8px;white-space:nowrap;opacity:0;pointer-events:none;transition:opacity .2s;z-index:999;font-family:'Nunito',sans-serif}
        .l-sidebar:not(.wide) .ls-icon:hover::after{opacity:1}
        .ls-div{width:36px;height:1px;background:var(--bdr);margin:6px auto;transition:width .3s}
        .l-sidebar.wide .ls-div{width:calc(100% - 16px)}
        .ls-bottom{padding:.75rem .5rem;border-top:1px solid var(--bdr);flex-shrink:0;width:100%}
        .ls-selfav-wrap{display:flex;align-items:center;gap:.6rem;padding:.4rem .5rem;border-radius:14px;text-decoration:none;transition:background .25s var(--easing);overflow:hidden;cursor:none;width:100%;justify-content:center}
        .l-sidebar.wide .ls-selfav-wrap{justify-content:flex-start}
        .ls-selfav-wrap:hover{background:var(--coral-l)}
        .ls-selfav{width:36px;height:36px;min-width:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;overflow:hidden;transition:transform .25s var(--easing)}
        .ls-selfav-wrap:hover .ls-selfav{transform:scale(1.08)}
        .ls-selfav-inner{width:100%;height:100%;border-radius:50%;background:linear-gradient(135deg,var(--coral),#FF9A8B);display:flex;align-items:center;justify-content:center;font-weight:900;font-size:.68rem;color:#fff;overflow:hidden}
        .ls-selfav-inner img{width:100%;height:100%;object-fit:cover}
        .ls-selfinfo{overflow:hidden;opacity:0;max-width:0;transition:opacity .2s .05s,max-width .3s var(--easing)}
        .l-sidebar.wide .ls-selfinfo{opacity:1;max-width:130px}
        .ls-selfname{font-size:.76rem;font-weight:800;color:var(--txt);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block}
        .ls-selfrole{font-size:.6rem;color:var(--txt3);display:block;white-space:nowrap}
        .main-card{
          flex:1;min-width:0;background:var(--white);border-radius:28px;
          box-shadow:0 12px 48px rgba(255,107,91,.08);display:flex;flex-direction:column;overflow:hidden;
        }
        .mc-top{display:flex;align-items:center;gap:12px;padding:18px 24px 14px;flex-shrink:0;border-bottom:1px solid rgba(0,0,0,.04);}
        .mc-title{font-family:'Sora',sans-serif;font-size:1rem;font-weight:800;color:var(--txt);white-space:nowrap}
        .mc-search{flex:1;max-width:340px;position:relative}
        .mc-search-ico{position:absolute;left:.8rem;top:50%;transform:translateY(-50%);font-size:.82rem;pointer-events:none;color:var(--txt3)}
        .mc-search input{width:100%;padding:.48rem 1rem .48rem 2.2rem;background:var(--surf);border:1.5px solid transparent;border-radius:100px;font-family:'Nunito',sans-serif;font-size:.81rem;outline:none;color:var(--txt);transition:all .3s var(--easing);}
        .mc-search input::placeholder{color:var(--txt3)}
        .mc-search input:focus{border-color:var(--coral);background:#fff;box-shadow:0 0 0 4px rgba(255,107,91,.1)}
        .mc-spacer{flex:1}
        .mc-plus{width:36px;height:36px;border-radius:50%;background:var(--txt);display:flex;align-items:center;justify-content:center;color:#fff;font-size:1rem;text-decoration:none;transition:all .3s var(--easing);cursor:none;flex-shrink:0;box-shadow:0 4px 12px rgba(0,0,0,.2);}
        .mc-plus:hover{background:var(--coral);transform:rotate(90deg) scale(1.1);box-shadow:0 6px 20px rgba(255,107,91,.4)}
        .bell-wrap{position:relative;flex-shrink:0}
        .mc-bell{width:36px;height:36px;border-radius:12px;background:var(--surf);border:none;display:flex;align-items:center;justify-content:center;font-size:.88rem;cursor:none;transition:all .3s var(--easing);color:var(--txt2);position:relative}
        .mc-bell:hover,.mc-bell.open{background:var(--coral-l);color:var(--coral)}
        .bell-dot{position:absolute;top:6px;right:6px;min-width:15px;height:15px;background:var(--coral);border-radius:100px;font-size:.48rem;font-weight:900;color:#fff;padding:0 3px;display:flex;align-items:center;justify-content:center;border:2px solid var(--white)}
        .nd{position:absolute;top:calc(100% + 8px);right:0;width:300px;background:var(--white);border-radius:20px;box-shadow:0 20px 60px rgba(0,0,0,.14);z-index:500;display:none;overflow:hidden;border:1px solid var(--bdr)}
        .nd.open{display:block;animation:popIn .22s var(--easing)}
        @keyframes popIn{from{opacity:0;transform:translateY(-8px) scale(.97)}to{opacity:1;transform:none}}
        .nd-h{display:flex;align-items:center;justify-content:space-between;padding:.8rem 1rem;border-bottom:1px solid var(--bdr)}
        .nd-ht{font-family:'Sora',sans-serif;font-size:.8rem;font-weight:800}
        .nd-mark{font-size:.7rem;font-weight:700;color:var(--coral);text-decoration:none;cursor:none}
        .nd-mark:hover{opacity:.7}
        .nd-list{max-height:240px;overflow-y:auto;scrollbar-width:thin;scrollbar-color:var(--coral-l) transparent}
        .nd-item{display:flex;align-items:flex-start;gap:.65rem;padding:.65rem 1rem;border-bottom:1px solid rgba(0,0,0,.03);transition:background .2s}
        .nd-item:hover{background:var(--surf)}
        .nd-item.unr{background:#FFF9F8}
        .nd-ico{width:32px;height:32px;border-radius:10px;background:var(--coral-l);display:flex;align-items:center;justify-content:center;font-size:.88rem;flex-shrink:0}
        .nd-msg{flex:1;font-size:.74rem;font-weight:600;color:var(--txt);line-height:1.4}
        .nd-t{font-size:.6rem;color:var(--txt3);margin-top:.1rem;display:block}
        .nd-u{width:7px;height:7px;border-radius:50%;background:var(--coral);flex-shrink:0;margin-top:5px}
        .nd-empty{padding:1.5rem;text-align:center;font-size:.76rem;color:var(--txt3)}
        .nd-foot{padding:.65rem 1rem;text-align:center;border-top:1px solid var(--bdr)}
        .nd-foot a{font-size:.74rem;font-weight:700;color:var(--coral);text-decoration:none}
        .nd-foot a:hover{opacity:.7}
        .mc-user{display:flex;align-items:center;gap:.45rem;text-decoration:none;cursor:none;flex-shrink:0;padding:.3rem .55rem;border-radius:100px;transition:background .25s var(--easing)}
        .mc-user:hover{background:var(--surf)}
        .mc-uav{width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;overflow:hidden;}
        .mc-uav-inner{width:100%;height:100%;border-radius:50%;background:linear-gradient(135deg,var(--coral),#FF9A8B);display:flex;align-items:center;justify-content:center;font-weight:900;font-size:.66rem;color:#fff;overflow:hidden}
        .mc-uav-inner img{width:100%;height:100%;object-fit:cover}
        .mc-uname{font-size:.8rem;font-weight:800;color:var(--txt)}
        .mc-body{flex:1;overflow-y:auto;padding:20px 24px 24px;scrollbar-width:thin;scrollbar-color:var(--coral-l) transparent}
        .mc-body::-webkit-scrollbar{width:4px}
        .mc-body::-webkit-scrollbar-thumb{background:var(--coral-l);border-radius:10px}
        .sec-head{display:flex;align-items:baseline;gap:1rem;margin-bottom:12px}
        .sec-title{font-family:'Sora',sans-serif;font-size:1.1rem;font-weight:800;color:var(--txt)}
        .sec-tabs{display:flex;gap:0;margin-left:4px}
        .stab{font-size:.77rem;font-weight:700;color:var(--txt3);text-decoration:none;padding:.1rem .6rem;border-radius:100px;transition:all .25s var(--easing);cursor:none;background:transparent;border:none;font-family:'Nunito',sans-serif}
        .stab:hover{color:var(--coral)}
        .stab.on{color:var(--coral);font-weight:800}
        .sec-link{margin-left:auto;font-size:.73rem;font-weight:700;color:var(--coral);text-decoration:none}
        .sec-link:hover{opacity:.7}
        .friends-row{display:flex;gap:16px;overflow-x:auto;padding-bottom:6px;margin-bottom:22px;scrollbar-width:none}
        .friends-row::-webkit-scrollbar{display:none}
        .fr-item{display:flex;flex-direction:column;align-items:center;gap:6px;flex-shrink:0;text-decoration:none;cursor:none}
        .fr-av-wrap{position:relative}
        .fr-av{width:58px;height:58px;border-radius:50%;display:flex;align-items:center;justify-content:center;overflow:hidden;box-shadow:0 4px 14px rgba(255,107,91,.2);transition:transform .3s var(--easing),box-shadow .3s var(--easing);}
        .fr-av-inner{width:100%;height:100%;border-radius:50%;background:linear-gradient(135deg,var(--coral),#FF9A8B);display:flex;align-items:center;justify-content:center;font-weight:900;font-size:.9rem;color:#fff;overflow:hidden}
        .fr-av-inner img{width:100%;height:100%;object-fit:cover}
        .fr-item:hover .fr-av{transform:translateY(-4px);box-shadow:0 10px 24px rgba(255,107,91,.3)}
        .fr-online{position:absolute;bottom:2px;right:2px;width:13px;height:13px;border-radius:50%;background:var(--teal);border:2.5px solid var(--white)}
        .fr-name{font-size:.67rem;font-weight:700;color:var(--txt2);text-align:center;max-width:62px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .fr-add-av{width:58px;height:58px;border-radius:50%;background:var(--surf);border:2px dashed var(--bdr);display:flex;align-items:center;justify-content:center;font-size:1.2rem;transition:all .3s var(--easing)}
        .fr-item:hover .fr-add-av{background:var(--coral-l);border-color:var(--coral)}
        .vault-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px}
        .vc{background:var(--white);border-radius:22px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,.06);border:1.5px solid var(--bdr);transition:all .3s var(--easing);text-decoration:none;display:block;position:relative;}
        .vc:hover{transform:translateY(-6px);box-shadow:0 16px 40px rgba(255,107,91,.16);border-color:rgba(255,107,91,.25)}
        .vc-cover{width:100%;height:130px;object-fit:cover;display:block}
        .vc-ph{width:100%;height:110px;display:flex;align-items:center;justify-content:center;font-size:2.2rem}
        .vc-new{position:absolute;top:10px;left:10px;background:var(--coral);color:#fff;font-size:.6rem;font-weight:900;padding:.2rem .55rem;border-radius:100px;letter-spacing:.05em}
        .vc-body{padding:.85rem 1rem}
        .vc-row{display:flex;align-items:center;justify-content:space-between;margin-bottom:.3rem}
        .vc-mood{font-size:.6rem;font-weight:800;padding:.16rem .52rem;border-radius:100px;background:var(--coral-l);color:var(--coral)}
        .vc-st{font-size:.6rem;font-weight:800;padding:.16rem .52rem;border-radius:100px}
        .vc-open{background:var(--teal-l);color:var(--teal)}
        .vc-sealed{background:var(--surf);color:var(--txt3)}
        .vc-title{font-family:'Sora',sans-serif;font-size:.88rem;font-weight:700;color:var(--txt);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:.2rem}
        .vc-date{font-size:.66rem;color:var(--txt3);font-weight:600}
        .vc-likes{display:flex;align-items:center;gap:.65rem;margin-top:.45rem;padding-top:.45rem;border-top:1px solid rgba(0,0,0,.04)}
        .vc-stat{display:flex;align-items:center;gap:.22rem;font-size:.65rem;font-weight:700;color:var(--txt3)}
        .empty-g{grid-column:1/-1;text-align:center;padding:2.5rem;color:var(--txt3)}
        .empty-g span{font-size:2.8rem;display:block;margin-bottom:.6rem}
        .empty-g h3{font-family:'Sora',sans-serif;font-size:.9rem;font-weight:700;color:var(--txt2);margin-bottom:.3rem}
        .empty-btn{display:inline-flex;align-items:center;gap:.3rem;margin-top:.8rem;padding:.48rem 1.1rem;background:var(--coral);border-radius:100px;color:#fff;font-size:.76rem;font-weight:800;text-decoration:none;transition:all .3s var(--easing)}
        .empty-btn:hover{background:var(--coral-d);transform:translateY(-2px)}
        .r-panel{width:290px;min-width:290px;background:var(--coral);border-radius:28px;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 16px 48px rgba(255,107,91,.3);flex-shrink:0;position:relative;}
        .r-panel::before{content:'';position:absolute;inset:0;background:radial-gradient(circle at 80% 20%,rgba(255,255,255,.12) 0%,transparent 60%),radial-gradient(circle at 10% 80%,rgba(255,255,255,.08) 0%,transparent 50%);pointer-events:none;z-index:0;}
        .rp-inner{position:relative;z-index:1;display:flex;flex-direction:column;height:100%}
        .rp-tabs{display:flex;align-items:center;gap:6px;padding:16px 16px 0;flex-shrink:0}
        .rp-tab{flex:1;padding:.45rem .4rem;border-radius:100px;font-size:.75rem;font-weight:800;text-align:center;cursor:none;border:none;font-family:'Nunito',sans-serif;transition:all .3s var(--easing);}
        .rp-tab.on{background:#fff;color:var(--coral);box-shadow:0 4px 14px rgba(0,0,0,.12)}
        .rp-tab.off{background:rgba(255,255,255,.2);color:rgba(255,255,255,.8)}
        .rp-tab.off:hover{background:rgba(255,255,255,.3);color:#fff}
        .rp-img-wrap{flex:1;position:relative;margin:14px 16px 0;border-radius:22px;overflow:hidden;min-height:180px}
        .rp-img{width:100%;height:100%;object-fit:cover;display:block}
        .rp-img-ph{width:100%;height:100%;background:linear-gradient(145deg,rgba(255,255,255,.25),rgba(255,255,255,.05));display:flex;align-items:center;justify-content:center;font-size:5rem}
        .rp-overlay{position:absolute;inset:0;background:linear-gradient(to top,rgba(15,5,0,.8) 0%,rgba(15,5,0,.15) 55%,transparent 100%);display:flex;flex-direction:column;justify-content:flex-end;padding:1.1rem}
        .rp-mood-pill{display:inline-flex;align-items:center;gap:.28rem;font-size:.6rem;font-weight:800;padding:.18rem .58rem;border-radius:100px;background:rgba(255,255,255,.2);color:#fff;backdrop-filter:blur(6px);margin-bottom:.4rem;width:fit-content;border:1px solid rgba(255,255,255,.25)}
        .rp-vault-title{font-family:'Sora',sans-serif;font-size:1rem;font-weight:800;color:#fff;line-height:1.25;margin-bottom:.12rem}
        .rp-vault-date{font-size:.62rem;color:rgba(255,255,255,.7);font-weight:600}
        .rp-stats{display:flex;align-items:center;justify-content:space-around;padding:.9rem 1rem;flex-shrink:0}
        .rp-stat{display:flex;flex-direction:column;align-items:center;gap:2px}
        .rp-stat-ico{font-size:1rem}
        .rp-stat-val{font-family:'Sora',sans-serif;font-size:.95rem;font-weight:900;color:#fff;line-height:1}
        .rp-stat-lbl{font-size:.55rem;font-weight:700;color:rgba(255,255,255,.6);text-transform:uppercase;letter-spacing:.06em}
        .rp-stat-div{width:1px;height:32px;background:rgba(255,255,255,.18)}
        .rp-cd{display:flex;gap:6px;padding:0 16px 10px;flex-shrink:0}
        .rp-cd-b{flex:1;background:rgba(255,255,255,.15);border-radius:14px;padding:.55rem .3rem;text-align:center;backdrop-filter:blur(4px);border:1px solid rgba(255,255,255,.2)}
        .rp-cd-n{font-family:'Sora',sans-serif;font-size:1.3rem;font-weight:900;color:#fff;display:block;line-height:1}
        .rp-cd-l{font-size:.48rem;font-weight:800;color:rgba(255,255,255,.65);letter-spacing:.08em;text-transform:uppercase;display:block;margin-top:.1rem}
        .rp-btns{display:flex;flex-direction:column;gap:6px;padding:0 16px 16px;flex-shrink:0}
        .rp-btn{display:flex;align-items:center;justify-content:center;gap:.38rem;padding:.65rem;border-radius:14px;font-family:'Nunito',sans-serif;font-size:.8rem;font-weight:800;cursor:none;text-decoration:none;transition:all .3s var(--easing);border:none;}
        .rp-btn.solid{background:#fff;color:var(--coral);box-shadow:0 4px 16px rgba(0,0,0,.12)}
        .rp-btn.solid:hover{transform:translateY(-2px);box-shadow:0 10px 28px rgba(0,0,0,.18)}
        .rp-btn.ghost{background:rgba(255,255,255,.2);color:#fff;border:1.5px solid rgba(255,255,255,.3)}
        .rp-btn.ghost:hover{background:rgba(255,255,255,.3);transform:translateY(-2px)}
        .rp-nonext{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:2rem 1.5rem;text-align:center}
        .rp-nonext-ico{font-size:3.5rem;margin-bottom:.8rem}
        .rp-nonext-t{font-family:'Sora',sans-serif;font-size:.9rem;font-weight:800;color:#fff;margin-bottom:.35rem}
        .rp-nonext-s{font-size:.72rem;color:rgba(255,255,255,.7);line-height:1.55;margin-bottom:1rem}
        @keyframes fadeUp{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:translateY(0)}}
        .l-sidebar{animation:fadeUp .5s var(--easing) both}
        .main-card{animation:fadeUp .5s .08s var(--easing) both}
        .r-panel{animation:fadeUp .5s .16s var(--easing) both}
        .fr-item{animation:fadeUp .4s var(--easing) both}
        .vc{animation:fadeUp .45s var(--easing) both}
        @media(max-width:900px){.r-panel{display:none}.root{padding:8px;gap:8px}}
        @media(max-width:600px){.l-sidebar{display:none}}
      `}</style>

      {/* ── CURSORS ── */}
      <div id="cur-dot" ref={dotRef}></div>
      <div id="cur-ring" ref={ringRef}></div>

      <div className="root">
        {/* ════ COL 1: LEFT SIDEBAR ════ */}
        <aside className={`l-sidebar ${lsbExp ? 'wide' : ''}`} id="lsb">
          <div className="ls-top">
            <button className="ls-hamburger" title={lsbExp ? 'Collapse' : 'Expand nav'} onClick={toggleLsb}>
              {lsbExp ? '✕' : '☰'}
            </button>
            <span className="ls-brand">TimeVaulth</span>
          </div>

          <nav className="ls-nav">
            <span className="ls-section">Main</span>
            <Link to="/dashboard" className="ls-icon on" data-t="Dashboard">🏠<span className="ls-lbl">Dashboard</span></Link>
            <Link to="/my-vaults" className="ls-icon" data-t="My Vaults">🛡️<span className="ls-lbl">My Vaults</span></Link>
            <Link to="/seal-vault" className="ls-icon" data-t="Seal Vault">➕<span className="ls-lbl">Seal Vault</span></Link>
            <Link to="/feed" className="ls-icon" data-t="Global Feed">🌍<span className="ls-lbl">Global Feed</span></Link>
            <div className="ls-div"></div>
            
            <span className="ls-section">Social</span>
            <Link to="/friends" className="ls-icon" data-t="Friends">👥<span className="ls-lbl">Friends</span></Link>
            <Link to="/messages" className="ls-icon" data-t="Messages">💬<span className="ls-lbl">Messages</span>{counts.msgs > 0 && <span className="ls-ibadge">{counts.msgs}</span>}</Link>
            <Link to="/notifications" className="ls-icon" data-t="Notifications">🔔<span className="ls-lbl">Notifications</span>{counts.notifs > 0 && <span className="ls-ibadge">{counts.notifs}</span>}</Link>
            <Link to="/group-chat" className="ls-icon" data-t="Group Chat">🫂<span className="ls-lbl">Group Chat</span></Link>
            <div className="ls-div"></div>
            
            <span className="ls-section">Explore</span>
            <Link to="/calendar" className="ls-icon" data-t="Calendar">📅<span className="ls-lbl">Calendar</span></Link>
            <Link to="/map" className="ls-icon" data-t="Time Map">📍<span className="ls-lbl">Time Map</span></Link>
            <Link to="/achievements" className="ls-icon" data-t="Achievements">🏆<span className="ls-lbl">Achievements</span></Link>
            <Link to="/leaderboard" className="ls-icon" data-t="Leaderboard">📊<span className="ls-lbl">Leaderboard</span></Link>
            <Link to="/archive" className="ls-icon" data-t="Archive">📦<span className="ls-lbl">Archive</span></Link>
            <div className="ls-div"></div>
            
            <span className="ls-section">Account</span>
            <Link to="/profile" className="ls-icon" data-t="Settings">⚙️<span className="ls-lbl">Settings</span></Link>
            <Link to="/login" className="ls-icon" data-t="Logout" onClick={() => localStorage.removeItem('user_id')} style={{ color: 'var(--coral)' }}>🚪<span className="ls-lbl" style={{ color: 'var(--coral)' }}>Logout</span></Link>
          </nav>

          <div className="ls-bottom">
            <Link to="/profile" className="ls-selfav-wrap">
              <div className="ls-selfav" style={{ background: self_brd, padding: '2.5px' }}>
                <div className="ls-selfav-inner">
                  {user.avatar_path ? <img src={`https://your-supabase-url/storage/v1/object/public/${user.avatar_path}`} alt="" /> : ai(usernameShort)}
                </div>
              </div>
              <div className="ls-selfinfo">
                <span className="ls-selfname">{usernameShort}</span>
                <span className="ls-selfrole">{user.equipped_title || 'Memory Keeper'}</span>
              </div>
            </Link>
          </div>
        </aside>

        {/* ════ COL 2: MAIN WHITE CARD ════ */}
        <div className="main-card">
          <div className="mc-top">
            <div className="mc-title">Dashboard</div>
            <div className="mc-search">
              <span className="mc-search-ico">🔍</span>
              <input type="text" placeholder="Search vaults, people…" autoComplete="off" />
            </div>
            <div className="mc-spacer"></div>
            <Link to="/seal-vault" className="mc-plus" title="New Vault">＋</Link>

            <div className="bell-wrap">
              <button className={`mc-bell ${ndOpen ? 'open' : ''}`} onClick={(e) => { e.stopPropagation(); setNdOpen(!ndOpen); }}>
                🔔{counts.notifs > 0 && <span className="bell-dot">{counts.notifs > 9 ? '9+' : counts.notifs}</span>}
              </button>
              
              {/* Notification Dropdown */}
              <div className={`nd ${ndOpen ? 'open' : ''}`} onClick={(e) => e.stopPropagation()}>
                <div className="nd-h">
                  <span className="nd-ht">🔔 Notifications</span>
                  <button className="nd-mark" style={{background:'none',border:'none'}}>Mark all read</button>
                </div>
                <div className="nd-list">
                  {recentNotifs.length > 0 ? recentNotifs.map((n, i) => (
                    <div key={i} className={`nd-item ${!n.is_read ? 'unr' : ''}`}>
                      <div className="nd-ico">{ni(n.message)}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="nd-msg">
                          {n.aname ? <><strong>{n.aname.split('@')[0]}</strong> {n.message.replace(/^\S+\s/, '')}</> : n.message}
                        </div>
                        <span className="nd-t">{ta(n.created_at)}</span>
                      </div>
                      {!n.is_read && <div className="nd-u"></div>}
                    </div>
                  )) : <div className="nd-empty">No notifications yet 🎉</div>}
                </div>
                <div className="nd-foot"><Link to="/notifications">View all activity →</Link></div>
              </div>
            </div>

            <Link to="/profile" className="mc-user">
              <div className="mc-uav" style={{ background: self_brd, padding: '2px' }}>
                <div className="mc-uav-inner">
                  {user.avatar_path ? <img src={`https://your-supabase-url/storage/v1/object/public/${user.avatar_path}`} alt="" /> : ai(usernameShort)}
                </div>
              </div>
              <span className="mc-uname">{usernameShort}</span>
            </Link>
          </div>

          <div className="mc-body">
            {/* GREETING & PILLS */}
            <div style={{ marginBottom: '18px', animation: 'fadeUp .45s var(--easing) both' }}>
              <div style={{ fontFamily: '"Sora", sans-serif', fontSize: '1.2rem', fontWeight: 800, color: 'var(--txt)' }}>
                {tg()}, {usernameShort}! 👋
              </div>
              <div style={{ fontSize: '.78rem', color: 'var(--txt3)', marginTop: '.18rem', fontWeight: 600 }}>
                {user.streak_count > 0 ? `🔥 ${user.streak_count}-day streak · ${counts.vaults} vault${counts.vaults !== 1 ? 's' : ''} sealed` : 'Welcome back to TimeVaulth'}
              </div>
              
              <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap', marginTop: '10px' }}>
                {[
                  ['🛡️', counts.vaults, 'Vaults', '/my-vaults'],
                  ['👥', counts.friends, 'Friends', '/friends'],
                  ['🏆', counts.badges, 'Badges', '/achievements'],
                  ['⭐', (user.total_points || 0).toLocaleString(), 'Points', '/leaderboard'],
                ].map((p, i) => (
                  <Link key={i} to={p[3]} style={{ display: 'inline-flex', alignItems: 'center', gap: '.35rem', padding: '.3rem .78rem', background: 'var(--white)', border: '1.5px solid var(--bdr)', borderRadius: '100px', fontSize: '.72rem', fontWeight: 700, color: 'var(--txt2)', textDecoration: 'none', boxShadow: '0 2px 8px rgba(0,0,0,.04)', transition: 'all .3s var(--easing)' }} onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--coral)'; e.currentTarget.style.color = 'var(--coral)'; }} onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--bdr)'; e.currentTarget.style.color = 'var(--txt2)'; }}>
                    {p[0]} <strong style={{ color: 'var(--txt)' }}>{p[1]}</strong> {p[2]}
                  </Link>
                ))}
                {user.streak_count > 0 && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '.35rem', padding: '.3rem .78rem', background: 'var(--white)', border: '1.5px solid var(--bdr)', borderRadius: '100px', fontSize: '.72rem', fontWeight: 700, color: 'var(--txt2)', boxShadow: '0 2px 8px rgba(0,0,0,.04)' }}>
                    🔥 <strong style={{ color: 'var(--txt)' }}>{user.streak_count}d</strong> Streak
                  </span>
                )}
              </div>
            </div>

            {/* FRIENDS ROW */}
            <div className="sec-head" style={{ animation: 'fadeUp .45s .06s var(--easing) both' }}>
              <span className="sec-title">Your Network</span>
              <div className="sec-tabs">
                <button className={`stab ${fFilter === 'all' ? 'on' : ''}`} onClick={() => setFFilter('all')}>Recent</button>
                <button className={`stab ${fFilter === 'streak' ? 'on' : ''}`} onClick={() => setFFilter('streak')}>Most Active</button>
              </div>
              <Link to="/friends" className="sec-link">See all →</Link>
            </div>

            <div className="friends-row" style={{ animation: 'fadeUp .45s .1s var(--easing) both' }}>
              <Link to="/my-vaults" className="fr-item">
                <div className="fr-av-wrap">
                  <div className="fr-av" style={{ background: self_brd, padding: '2.5px' }}>
                    <div className="fr-av-inner">
                      {user.avatar_path ? <img src={`https://your-supabase-url/storage/v1/object/public/${user.avatar_path}`} alt="" /> : ai(usernameShort)}
                    </div>
                  </div>
                  <div style={{ position: 'absolute', bottom: 0, right: 0, width: '18px', height: '18px', borderRadius: '50%', background: 'var(--coral)', border: '2.5px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.65rem', color: '#fff', fontWeight: 900 }}>＋</div>
                </div>
                <span className="fr-name" style={{ color: 'var(--coral)', fontWeight: 800 }}>My Vault</span>
              </Link>

              {friends.filter(f => fFilter === 'all' || f.streak_count > 0).map((f, i) => (
                <Link key={i} to="/friends" className="fr-item" style={{ animationDelay: `${0.05 * i}s` }}>
                  <div className="fr-av-wrap">
                    <div className="fr-av" style={{ background: border_css[f.equipped_border || 'border-none'] || border_css['border-none'], padding: '2.5px' }}>
                      <div className="fr-av-inner">
                        {f.avatar_path ? <img src={`https://your-supabase-url/storage/v1/object/public/${f.avatar_path}`} alt="" /> : ai(f.username.split('@')[0])}
                      </div>
                    </div>
                    {f.streak_count > 0 && <div className="fr-online"></div>}
                  </div>
                  <span className="fr-name">@{f.username.split('@')[0]}</span>
                </Link>
              ))}
              
              {friends.length === 0 && (
                <Link to="/friends" className="fr-item">
                  <div className="fr-av-wrap"><div className="fr-add-av">➕</div></div>
                  <span className="fr-name" style={{ color: 'var(--txt3)' }}>Add Friend</span>
                </Link>
              )}
            </div>

            {/* VAULTS GRID */}
            <div className="sec-head" style={{ animation: 'fadeUp .45s .14s var(--easing) both' }}>
              <span className="sec-title">Recent Vaults</span>
              <div className="sec-tabs">
                <button className={`stab ${vFilter === 'all' ? 'on' : ''}`} onClick={() => setVFilter('all')}>All</button>
                <button className={`stab ${vFilter === 'open' ? 'on' : ''}`} onClick={() => setVFilter('open')}>Open</button>
                <button className={`stab ${vFilter === 'sealed' ? 'on' : ''}`} onClick={() => setVFilter('sealed')}>Sealed</button>
              </div>
              <Link to="/my-vaults" className="sec-link">See all →</Link>
            </div>

            <div className="vault-grid">
              {myVaults.filter(v => vFilter === 'all' || v.status === (vFilter === 'open' ? 'opened' : 'sealed')).length > 0 ? (
                myVaults.filter(v => vFilter === 'all' || v.status === (vFilter === 'open' ? 'opened' : 'sealed')).map((v, i) => {
                  const isOpen = new Date(v.unlock_date).getTime() <= Date.now() || v.status === 'opened';
                  const mico = mood_ico[v.mood] || '💜';
                  const isNew = new Date(v.created_at).getTime() > Date.now() - 3 * 86400000;
                  const ctheme = capsule_theme(v.capsule_color, v.capsule_design);

                  return (
                    <Link key={i} to={`/vault/${v.id}`} className="vc" style={{ animationDelay: `${0.05 + i * 0.06}s`, borderTop: `3px solid ${ctheme.color}` }}>
                      {v.cover_path ? (
                        <img className="vc-cover" src={`https://your-supabase-url/storage/v1/object/public/${v.cover_path}`} alt="" />
                      ) : (
                        <div className="vc-ph" style={{ background: ctheme.gradient, color: ctheme.text }}>{mico}</div>
                      )}
                      {isNew && <span className="vc-new">New</span>}
                      <div className="vc-body">
                        <div className="vc-row">
                          <span className="vc-mood">{mico} {v.mood}</span>
                          <span className={`vc-st ${isOpen ? 'vc-open' : 'vc-sealed'}`}>{isOpen ? '🔓 Open' : '🔒 Sealed'}</span>
                        </div>
                        <div className="vc-title">{v.title}</div>
                        <div className="vc-date">📅 {new Date(v.unlock_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                        <div className="vc-likes">
                          <span className="vc-stat">📎 {v.fc} files</span>
                          <span className="vc-stat">📅 {new Date(v.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                        </div>
                      </div>
                    </Link>
                  );
                })
              ) : (
                <div className="empty-g">
                  <span>🛡️</span>
                  <h3>No vaults found</h3>
                  <p style={{ fontSize: '.76rem' }}>Adjust your filters or seal a new memory.</p>
                  <Link to="/seal-vault" className="empty-btn">➕ Seal First Vault</Link>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* ════ COL 3: RIGHT HERO PANEL ════ */}
        <div className="r-panel" style={nv_theme ? { background: nv_theme.gradient, transition: 'background .4s ease' } : {}}>
          <div className="rp-inner">
            <div className="rp-tabs">
              <button className={`rp-tab ${rpTabIdx === 0 ? 'on' : 'off'}`} onClick={() => setRpTabIdx(0)}>Next Unlock</button>
              <button className={`rp-tab ${rpTabIdx === 1 ? 'on' : 'off'}`} onClick={() => setRpTabIdx(1)}>My Stats</button>
            </div>

            {nextVault ? (
              <>
                <div style={{ display: rpTabIdx === 0 ? 'flex' : 'none', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                  <div className="rp-img-wrap">
                    {nextVault.cover_path ? (
                      <img className="rp-img" src={`https://your-supabase-url/storage/v1/object/public/${nextVault.cover_path}`} alt="" />
                    ) : (
                      <div className="rp-img-ph" style={{ background: nv_theme.gradient, color: nv_theme.text }}>{mood_ico[nextVault.mood] || '💜'}</div>
                    )}
                    <div className="rp-overlay">
                      <span className="rp-mood-pill">{mood_ico[nextVault.mood] || '💜'} {nextVault.mood}</span>
                      <div className="rp-vault-title">{nextVault.title}</div>
                      <div className="rp-vault-date">Unlocks {new Date(nextVault.unlock_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</div>
                    </div>
                  </div>

                  <div className="rp-stats">
                    <div className="rp-stat"><span className="rp-stat-ico">❤️</span><span className="rp-stat-val">{counts.likes}</span><span className="rp-stat-lbl">Likes</span></div>
                    <div className="rp-stat-div"></div>
                    <div className="rp-stat"><span className="rp-stat-ico">💬</span><span className="rp-stat-val">{counts.comments}</span><span className="rp-stat-lbl">Comments</span></div>
                    <div className="rp-stat-div"></div>
                    <div className="rp-stat"><span className="rp-stat-ico">🛡️</span><span className="rp-stat-val">{counts.vaults}</span><span className="rp-stat-lbl">Vaults</span></div>
                  </div>

                  <div className="rp-cd">
                    <div className="rp-cd-b"><span className="rp-cd-n">{cd.d}</span><span className="rp-cd-l">Days</span></div>
                    <div className="rp-cd-b"><span className="rp-cd-n">{cd.h}</span><span className="rp-cd-l">Hrs</span></div>
                    <div className="rp-cd-b"><span className="rp-cd-n">{cd.m}</span><span className="rp-cd-l">Min</span></div>
                    <div className="rp-cd-b"><span className="rp-cd-n">{cd.s}</span><span className="rp-cd-l">Sec</span></div>
                  </div>

                  <div className="rp-btns">
                    <Link to={`/vault/${nextVault.id}`} className="rp-btn solid">🔒 View This Vault</Link>
                    <Link to="/my-vaults" className="rp-btn ghost">📂 All My Vaults</Link>
                  </div>
                </div>

                <div style={{ display: rpTabIdx === 1 ? 'flex' : 'none', flex: 1, flexDirection: 'column', padding: '1rem' }}>
                  {[
                    ['⭐', 'Total Points', (user.total_points || 0).toLocaleString()],
                    ['🔥', 'Day Streak', `${user.streak_count || 0}d`],
                    ['🏆', 'Badges', counts.badges],
                    ['👥', 'Friends', counts.friends],
                    ['❤️', 'Total Likes', counts.likes],
                    ['💬', 'Comments', counts.comments],
                  ].map((s, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '.65rem .8rem', background: 'rgba(255,255,255,.15)', borderRadius: '14px', marginBottom: '6px', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,.2)', animation: `fadeUp .35s ${0.04 * i}s var(--easing) both` }}>
                      <span style={{ fontSize: '.8rem', fontWeight: 700, color: 'rgba(255,255,255,.9)' }}>{s[0]} {s[1]}</span>
                      <span style={{ fontFamily: '"Sora", sans-serif', fontSize: '.95rem', fontWeight: 900, color: '#fff' }}>{s[2]}</span>
                    </div>
                  ))}
                  <Link to="/leaderboard" className="rp-btn solid" style={{ marginTop: 'auto' }}>📊 Leaderboard →</Link>
                </div>
              </>
            ) : (
              <div className="rp-nonext">
                <div className="rp-nonext-ico">🎉</div>
                <div className="rp-nonext-t">All vaults are open!</div>
                <div className="rp-nonext-s">No sealed vaults remaining. Create a new memory to start a countdown.</div>
                <Link to="/seal-vault" className="rp-btn solid" style={{ width: '100%' }}>➕ Seal New Vault</Link>
              </div>
            )}

          </div>
        </div>
      </div>
    </>
  );
}
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../config/supabaseClient';

// ─── EXACT PHP HELPERS ───
const ai = (n) => (n ? n.substring(0, 2).toUpperCase() : 'U');
const moodIco = { Happy: '😊', Sad: '😢', Excited: '🎉', Nostalgic: '🥹', Hopeful: '✨', Angry: '😤' };

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

const ta = (dt) => {
  if (!dt) return '';
  const diff = Math.floor((Date.now() - new Date(dt).getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  return Math.floor(diff / 86400) + 'd ago';
};

export default function Feeds() {
  const navigate = useNavigate();
  const dotRef = useRef(null);
  const ringRef = useRef(null);

  // ─── STATE ───
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [lsbExp, setLsbExp] = useState(localStorage.getItem('lsb-exp') === '1');
  
  const [vaults, setVaults] = useState([]);
  const [filter, setFilter] = useState('latest'); // 'latest' or 'top'
  const [searchQuery, setSearchQuery] = useState('');
  
  // Drawer / Modals State
  const [activeVid, setActiveVid] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  
  const [reportVid, setReportVid] = useState(null);
  const [reportReason, setReportReason] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  
  const [lbImg, setLbImg] = useState(null);

  // ─── DATA FETCHING ───
  const fetchFeeds = async (uid) => {
    try {
      // Efficiently fetch public, opened vaults along with likes and comments count
      const { data: vData, error } = await supabase
        .from('vaults')
        .select(`
          *,
          users!inner(id, username, avatar_path, equipped_border, equipped_title),
          vault_likes(user_id),
          vault_comments(id)
        `)
        .eq('status', 'opened')
        .eq('visibility', 'public')
        .eq('is_archived', false);
      
      if (error) throw error;

      if (vData) {
        const processed = vData.map(v => ({
          ...v,
          likes_count: v.vault_likes?.length || 0,
          user_liked: v.vault_likes?.some(l => l.user_id === uid),
          comment_count: v.vault_comments?.length || 0
        }));
        setVaults(processed);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      const uid = localStorage.getItem('user_id');
      if (!uid) { navigate('/login'); return; }
      
      const { data: uData } = await supabase.from('users').select('*').eq('id', uid).single();
      if (uData) setUser(uData);
      
      await fetchFeeds(uid);
    };
    init();
  }, [navigate]);

  useEffect(() => {
    if (loading) return;
    let mx = 0, my = 0, rx = 0, ry = 0, reqId;
    const handleMouseMove = (e) => { mx = e.clientX; my = e.clientY; if(dotRef.current){dotRef.current.style.left=mx+'px';dotRef.current.style.top=my+'px'} };
    const animateCursor = () => { rx += (mx - rx) * 0.13; ry += (my - ry) * 0.13; if(ringRef.current){ringRef.current.style.left=rx+'px';ringRef.current.style.top=ry+'px'} reqId=requestAnimationFrame(animateCursor); };
    window.addEventListener('mousemove', handleMouseMove); animateCursor();
    
    return () => { window.removeEventListener('mousemove', handleMouseMove); cancelAnimationFrame(reqId); };
  }, [loading]);

  // ─── HANDLERS ───
  const filteredVaults = vaults.filter(v => (v.title || '').toLowerCase().includes(searchQuery.toLowerCase()) || (v.story || '').toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (filter === 'top') return b.likes_count - a.likes_count;
      return new Date(b.created_at) - new Date(a.created_at); // latest
    });

  const toggleLike = async (vid, currentlyLiked) => {
    // Optimistic UI Update
    setVaults(prev => prev.map(v => {
      if (v.id === vid) {
        return { ...v, user_liked: !currentlyLiked, likes_count: v.likes_count + (currentlyLiked ? -1 : 1) };
      }
      return v;
    }));

    try {
      if (currentlyLiked) {
        await supabase.from('vault_likes').delete().eq('vault_id', vid).eq('user_id', user.id);
      } else {
        await supabase.from('vault_likes').insert([{ vault_id: vid, user_id: user.id }]);
      }
    } catch (e) {
      console.error(e);
      fetchFeeds(user.id); // revert on error
    }
  };

  const openComments = async (vid) => {
    setActiveVid(vid);
    setDrawerOpen(true);
    setComments([]); // clear old
    try {
      const { data } = await supabase
        .from('vault_comments')
        .select('*, users(username, avatar_path)')
        .eq('vault_id', vid)
        .order('created_at', { ascending: false });
      if (data) setComments(data);
    } catch (e) { console.error(e); }
  };

  const submitComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !activeVid) return;
    try {
      const { data, error } = await supabase.from('vault_comments')
        .insert([{ vault_id: activeVid, user_id: user.id, comment: newComment.trim() }])
        .select('*, users(username, avatar_path)').single();
      
      if (error) throw error;
      
      if (data) {
        setComments([data, ...comments]);
        setNewComment('');
        // Update count in feed list
        setVaults(prev => prev.map(v => v.id === activeVid ? { ...v, comment_count: v.comment_count + 1 } : v));
      }
    } catch (e) { console.error(e); }
  };

  const deleteComment = async (cid) => {
    if (!window.confirm('Delete comment?')) return;
    try {
      await supabase.from('vault_comments').delete().eq('id', cid);
      setComments(prev => prev.filter(c => c.id !== cid));
      setVaults(prev => prev.map(v => v.id === activeVid ? { ...v, comment_count: Math.max(0, v.comment_count - 1) } : v));
    } catch (e) { console.error(e); }
  };

  const submitReport = async () => {
    if (!reportVid) return;
    setReportSubmitting(true);
    try {
      // Check if already reported
      const { data: existing } = await supabase.from('escalated_vaults').select('id').eq('vault_id', reportVid).eq('reported_by', user.id).single();
      if (existing) {
        alert('You have already reported this vault.');
      } else {
        await supabase.from('escalated_vaults').insert([{ vault_id: reportVid, reported_by: user.id, reason: reportReason }]);
        alert('Report submitted successfully. Our moderators will review it shortly.');
      }
    } catch (e) {
      console.error(e);
      alert('An error occurred while submitting the report.');
    } finally {
      setReportSubmitting(false);
      setReportVid(null);
      setReportReason('');
    }
  };

  if (loading) {
    return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FFF0ED', color: '#FF6B5B', fontFamily: '"Sora", sans-serif', fontSize: '1.5rem', fontWeight: 800 }}>⏳ Loading Feeds...</div>;
  }

  const myBrd = borderCss[user?.equipped_border] || borderCss['border-none'];
  const usernameShort = user?.username ? user.username.split('@')[0] : 'User';

  return (
    <>
      {/* EXACT CSS FROM PHP */}
      <style>{`
        #root { display: contents; }
        :root{
          --coral:#FF6B5B;--coral-l:#FFE8E4;--coral-d:#E8503F;
          --peach:#FFF0ED;--white:#FFFFFF;--card:#FFFFFF;--surf:#F8F8F8;
          --bdr:rgba(0,0,0,.07);--txt:#222;--txt2:#777;--txt3:#BDBDBD;
          --teal:#1D9E75;--teal-l:#E0F5EE;--gold:#F5A623;--red:#E24B4A;
          --easing:cubic-bezier(.25,1,.5,1);
        }
        *,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
        html{scroll-behavior:smooth}
        body{font-family:'Nunito',sans-serif;background:var(--peach);color:var(--txt);display:flex;height:100vh;overflow:hidden;cursor:none}

        /* ── CURSOR ── */
        #cur-dot{position:fixed;width:9px;height:9px;background:var(--coral);border-radius:50%;pointer-events:none;z-index:9999;transform:translate(-50%,-50%);transition:width .15s,height .15s}
        #cur-ring{position:fixed;width:26px;height:26px;border:2px solid var(--coral);border-radius:50%;pointer-events:none;z-index:9998;transform:translate(-50%,-50%);transition:left .1s var(--easing),top .1s var(--easing),width .2s,height .2s,opacity .2s;opacity:.45}

        /* ── ROOT ── */
        .root{display:flex;width:100%;height:100vh;overflow:hidden;padding:16px;gap:12px;box-sizing:border-box}

        /* ── SIDEBAR ── */
        .l-sidebar{width:72px;min-width:72px;display:flex;flex-direction:column;align-items:center;gap:0;padding:0 0 12px;overflow:hidden;flex-shrink:0;transition:width .35s var(--easing),min-width .35s var(--easing)}
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
        .ls-icon{width:44px;height:44px;border-radius:14px;display:flex;align-items:center;justify-content:center;gap:0;font-size:1.1rem;text-decoration:none;color:var(--txt3);transition:all .3s var(--easing);position:relative;cursor:none;flex-shrink:0;overflow:hidden;white-space:nowrap}
        .l-sidebar.wide .ls-icon{width:100%;justify-content:flex-start;padding:0 .65rem;gap:.65rem}
        .ls-icon:hover{background:var(--coral-l);color:var(--coral)}
        .ls-icon.on{background:var(--coral);color:#fff;box-shadow:0 6px 20px rgba(255,107,91,.35)}
        .ls-icon .ls-lbl{font-size:.8rem;font-weight:700;opacity:0;max-width:0;overflow:hidden;transition:opacity .2s .05s,max-width .3s var(--easing);pointer-events:none;white-space:nowrap}
        .l-sidebar.wide .ls-icon .ls-lbl{opacity:1;max-width:140px}
        .ls-div{width:36px;height:1px;background:var(--bdr);margin:6px 0}
        .ls-bottom{padding:.75rem .5rem;border-top:1px solid var(--bdr);flex-shrink:0;width:100%}
        .ls-selfav-wrap{display:flex;align-items:center;gap:.6rem;padding:.4rem .5rem;border-radius:14px;text-decoration:none;transition:background .25s var(--easing);overflow:hidden;cursor:none}
        .ls-selfav-wrap:hover{background:var(--coral-l)}
        .ls-selfav{width:36px;height:36px;min-width:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:.68rem;color:#fff;overflow:hidden;transition:transform .25s var(--easing)}
        .ls-selfav-wrap:hover .ls-selfav{transform:scale(1.08)}
        .ls-selfav-inner{width:100%;height:100%;border-radius:50%;background:linear-gradient(135deg,var(--coral),#FF9A8B);display:flex;align-items:center;justify-content:center;font-weight:900;font-size:.68rem;color:#fff;overflow:hidden}
        .ls-selfav-inner img{width:100%;height:100%;object-fit:cover}
        .ls-selfinfo{overflow:hidden;opacity:0;max-width:0;transition:opacity .2s .05s,max-width .3s var(--easing)}
        .l-sidebar.wide .ls-selfinfo{opacity:1;max-width:130px}
        .ls-selfname{font-size:.76rem;font-weight:800;color:var(--txt);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block}
        .ls-selfrole{font-size:.6rem;color:var(--txt3);display:block;white-space:nowrap}

        /* ── MAIN VIEW ── */
        .main-card{flex:1;min-width:0;background:var(--white);border-radius:28px;box-shadow:0 12px 48px rgba(255,107,91,.08);display:flex;flex-direction:column;overflow:hidden;position:relative}
        .mc-top{display:flex;align-items:center;gap:12px;padding:18px 24px 14px;flex-shrink:0;border-bottom:1px solid rgba(0,0,0,.04);background:#fff;z-index:10}
        .mc-title{font-family:'Sora',sans-serif;font-size:1.1rem;font-weight:800;color:var(--txt);white-space:nowrap}
        
        .mc-search{flex:1;max-width:400px;position:relative;margin:0 12px}
        .mc-search-ico{position:absolute;left:14px;top:50%;transform:translateY(-50%);color:var(--txt3);font-size:.9rem}
        .mc-search input{width:100%;padding:11px 16px 11px 38px;background:var(--surf);border:2px solid transparent;border-radius:100px;font-family:'Nunito',sans-serif;font-size:.85rem;font-weight:600;color:var(--txt);outline:none;transition:all .3s var(--easing)}
        .mc-search input:focus{background:#fff;border-color:var(--coral);box-shadow:0 0 0 4px rgba(255,107,91,.12)}
        
        .filter-strip{display:flex;background:var(--surf);border-radius:50px;padding:5px;gap:3px}
        .ftab{padding:7px 18px;border-radius:40px;font-family:'Nunito',sans-serif;font-size:.8rem;font-weight:800;color:var(--txt2);background:transparent;border:none;cursor:none;transition:all .3s var(--easing)}
        .ftab:hover{color:var(--txt)}
        .ftab.on{background:var(--white);color:var(--coral);box-shadow:0 4px 14px rgba(0,0,0,.06)}

        .mc-body{flex:1;overflow-y:auto;padding:24px;scrollbar-width:thin;scrollbar-color:var(--coral-l) transparent;background:#fbfbfb;display:flex;justify-content:center}
        .mc-body::-webkit-scrollbar{width:5px}
        .mc-body::-webkit-scrollbar-thumb{background:var(--coral-l);border-radius:10px}
        
        .feed-col{width:100%;max-width:600px;display:flex;flex-direction:column;gap:24px;padding-bottom:40px}
        
        /* ── FEED CARD ── */
        .feed-card{background:#fff;border:1.5px solid var(--bdr);border-radius:24px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.03);animation:fadeUp .4s var(--easing) both;transition:border-color .3s,box-shadow .3s}
        .feed-card:hover{border-color:var(--coral-l);box-shadow:0 8px 30px rgba(255,107,91,.08)}
        
        .fc-head{display:flex;align-items:center;gap:12px;padding:16px 20px}
        .fc-av-wrap{width:42px;height:42px;border-radius:50%;padding:2px;flex-shrink:0}
        .fc-av{width:100%;height:100%;border-radius:50%;background:linear-gradient(135deg,var(--coral),#FF9A8B);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:900;font-size:.8rem;overflow:hidden}
        .fc-av img{width:100%;height:100%;object-fit:cover}
        .fc-user-info{flex:1;min-width:0}
        .fc-uname{font-family:'Sora',sans-serif;font-size:.9rem;font-weight:800;color:var(--txt);display:flex;align-items:center;gap:6px}
        .fc-time{font-size:.7rem;font-weight:600;color:var(--txt3);margin-top:2px}
        .fc-opt{background:none;border:none;color:var(--txt3);font-size:1.2rem;cursor:none;padding:4px;transition:color .2s}
        .fc-opt:hover{color:var(--coral)}

        .fc-img-area{width:100%;aspect-ratio:4/3;background:var(--surf);position:relative;cursor:none;overflow:hidden}
        .fc-img{width:100%;height:100%;object-fit:cover;transition:transform .4s var(--easing)}
        .fc-img-area:hover .fc-img{transform:scale(1.03)}
        .fc-img-ph{width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:4rem}
        .fc-mood-badge{position:absolute;bottom:14px;left:14px;background:rgba(255,255,255,.9);backdrop-filter:blur(4px);padding:6px 14px;border-radius:100px;font-size:.75rem;font-weight:800;color:var(--txt);box-shadow:0 4px 16px rgba(0,0,0,.1);display:flex;align-items:center;gap:6px}

        .fc-body{padding:20px}
        .fc-title{font-family:'Sora',sans-serif;font-size:1.1rem;font-weight:800;color:var(--txt);margin-bottom:8px;line-height:1.3}
        .fc-story{font-size:.85rem;color:var(--txt);line-height:1.6;font-weight:600;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;white-space:pre-wrap}
        .fc-story.full{-webkit-line-clamp:unset}
        
        .fc-foot{display:flex;align-items:center;justify-content:space-between;padding:14px 20px;border-top:1px solid var(--bdr);background:#fdfdfd}
        .fc-actions{display:flex;align-items:center;gap:16px}
        .fc-btn{display:flex;align-items:center;gap:6px;background:none;border:none;font-family:'Nunito',sans-serif;font-size:.85rem;font-weight:800;color:var(--txt2);cursor:none;transition:all .2s;padding:6px 10px;border-radius:12px}
        .fc-btn:hover{background:var(--coral-l);color:var(--coral)}
        .fc-btn.liked{color:var(--coral)}
        .fc-btn.liked .icon{animation:pop .3s var(--easing)}

        /* ── COMMENTS DRAWER ── */
        .drawer-overlay{position:absolute;inset:0;background:rgba(0,0,0,.2);backdrop-filter:blur(2px);z-index:100;opacity:0;pointer-events:none;transition:opacity .3s}
        .drawer-overlay.open{opacity:1;pointer-events:all}
        .drawer{position:absolute;top:0;right:0;bottom:0;width:380px;background:#fff;box-shadow:-10px 0 40px rgba(0,0,0,.1);z-index:101;display:flex;flex-direction:column;transform:translateX(100%);transition:transform .4s var(--easing)}
        .drawer.open{transform:translateX(0)}
        .drawer-head{padding:20px;border-bottom:1px solid var(--bdr);display:flex;align-items:center;justify-content:space-between;font-family:'Sora',sans-serif;font-size:1.05rem;font-weight:800}
        .drawer-close{background:var(--surf);border:none;width:32px;height:32px;border-radius:50%;color:var(--txt2);font-weight:800;cursor:none;transition:all .2s}
        .drawer-close:hover{background:var(--coral-l);color:var(--coral)}
        .drawer-body{flex:1;overflow-y:auto;padding:20px;display:flex;flex-direction:column;gap:16px}
        .drawer-foot{padding:16px 20px;border-top:1px solid var(--bdr);background:var(--surf)}
        .drawer-form{display:flex;gap:10px}
        .drawer-input{flex:1;padding:12px 16px;border:2px solid transparent;border-radius:100px;font-family:'Nunito';font-size:.85rem;font-weight:600;outline:none;transition:all .2s}
        .drawer-input:focus{border-color:var(--coral)}
        .drawer-send{background:var(--coral);color:#fff;border:none;width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:none;transition:transform .2s;flex-shrink:0}
        .drawer-send:hover{transform:scale(1.08)}

        .c-item{display:flex;gap:10px;animation:fadeUp .3s both}
        .c-av{width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,var(--coral),#FF9A8B);color:#fff;display:flex;align-items:center;justify-content:center;font-size:.65rem;font-weight:900;flex-shrink:0;overflow:hidden}
        .c-bubble{background:var(--surf);padding:10px 14px;border-radius:0 16px 16px 16px;flex:1}
        .c-name{font-size:.8rem;font-weight:800;color:var(--txt);margin-bottom:2px}
        .c-text{font-size:.85rem;color:var(--txt);line-height:1.4;font-weight:600}
        .c-meta{display:flex;justify-content:space-between;margin-top:4px}
        .c-time{font-size:.65rem;color:var(--txt3);font-weight:700}
        .c-del{background:none;border:none;color:var(--txt3);font-size:.65rem;font-weight:800;cursor:none;transition:color .2s}
        .c-del:hover{color:var(--red)}
        
        .empty-feed{text-align:center;padding:40px;color:var(--txt3)}
        .empty-feed span{font-size:3rem;display:block;margin-bottom:10px}
        .empty-feed h3{font-family:'Sora',sans-serif;font-size:1.1rem;font-weight:800;color:var(--txt2)}

        /* ── REPORT MODAL ── */
        .modal-overlay{position:absolute;inset:0;background:rgba(0,0,0,.4);backdrop-filter:blur(4px);z-index:200;display:none;align-items:center;justify-content:center;opacity:0;transition:opacity .3s}
        .modal-overlay.open{display:flex;opacity:1;animation:fadeIn .3s forwards}
        .modal-box{background:#fff;padding:32px;border-radius:28px;width:90%;max-width:400px;text-align:center;box-shadow:0 24px 60px rgba(0,0,0,.2);transform:scale(.95);transition:transform .3s}
        .modal-overlay.open .modal-box{transform:scale(1)}
        .modal-title{font-family:'Sora';font-size:1.2rem;font-weight:800;margin-bottom:8px}
        .modal-desc{font-size:.85rem;color:var(--txt2);margin-bottom:20px;font-weight:600}
        .modal-sel{width:100%;padding:12px;border-radius:14px;border:1.5px solid var(--bdr);font-family:'Nunito';font-size:.9rem;font-weight:700;margin-bottom:20px;outline:none}
        .modal-sel:focus{border-color:var(--coral)}

        /* ── LIGHTBOX ── */
        .lightbox{position:absolute;inset:0;background:rgba(0,0,0,.9);backdrop-filter:blur(10px);z-index:9999;display:none;align-items:center;justify-content:center;opacity:0;transition:opacity .3s}
        .lightbox.open{display:flex;opacity:1}
        .lb-img{max-width:90%;max-height:90%;object-fit:contain;border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,.5)}
        .lb-close{position:absolute;top:20px;right:20px;width:44px;height:44px;background:rgba(255,255,255,.15);border:none;border-radius:50%;color:#fff;font-size:1.5rem;display:flex;align-items:center;justify-content:center;cursor:none;transition:background .2s}
        .lb-close:hover{background:var(--coral)}

        @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeIn{to{opacity:1}}
        @keyframes pop{0%{transform:scale(1)}50%{transform:scale(1.3)}100%{transform:scale(1)}}
        
        @media(max-width:900px){
          .l-sidebar{display:none}.root{padding:8px;gap:8px}.mc-body{padding:16px}
          .drawer{width:100%}.mc-search{display:none}
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
            <Link to="/my-vaults" className="ls-icon" data-t="My Vaults">🛡️<span className="ls-lbl">My Vaults</span></Link>
            <Link to="/seal-vault" className="ls-icon" data-t="New Draft">➕<span className="ls-lbl">New Draft</span></Link>
            <Link to="/feed" className="ls-icon on" data-t="Global Feed">🌍<span className="ls-lbl">Global Feed</span></Link>
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
              <div className="ls-selfav" style={{ background: borderCss[user?.equipped_border] || borderCss['border-none'], padding: '2.5px' }}>
                <div className="ls-selfav-inner">
                  {user?.avatar_path ? <img src={`https://your-supabase-url/storage/v1/object/public/${user.avatar_path}`} alt="" /> : ai(usernameShort)}
                </div>
              </div>
              <div className="ls-selfinfo">
                <span className="ls-selfname">{usernameShort}</span>
                <span className="ls-selfrole">Global Feed</span>
              </div>
            </Link>
          </div>
        </aside>

        {/* ════ MAIN AREA ════ */}
        <div className="main-card">
          <div className="mc-top">
            <div className="mc-title">🌍 Global Feed</div>
            <div className="mc-search">
              <span className="mc-search-ico">🔍</span>
              <input type="text" placeholder="Search public memories..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
            <div className="mc-spacer"></div>
            <div className="filter-strip">
              <button className={`ftab ${filter === 'latest' ? 'on' : ''}`} onClick={() => setFilter('latest')}>✨ Latest</button>
              <button className={`ftab ${filter === 'top' ? 'on' : ''}`} onClick={() => setFilter('top')}>🔥 Top</button>
            </div>
          </div>

          <div className="mc-body">
            <div className="feed-col">
              {filteredVaults.length > 0 ? filteredVaults.map((v, i) => {
                const ctheme = capsuleTheme(v.capsule_color, v.capsule_design);
                const ownerBrd = borderCss[v.users?.equipped_border] || borderCss['border-none'];
                const isOwn = v.user_id === user.id;

                return (
                  <div key={v.id} className="feed-card" style={{ animationDelay: `${i * 0.08}s` }}>
                    <div className="fc-head">
                      <div className="fc-av-wrap" style={{ background: ownerBrd }}>
                        <div className="fc-av">
                          {v.users?.avatar_path ? <img src={`https://your-supabase-url/storage/v1/object/public/${v.users.avatar_path}`} alt="" /> : ai(v.users?.username)}
                        </div>
                      </div>
                      <div className="fc-user-info">
                        <div className="fc-uname">@{v.users?.username?.split('@')[0]}</div>
                        <div className="fc-time">🔓 Opened {ta(v.unlock_date)}</div>
                      </div>
                      {!isOwn && (
                        <button className="fc-opt" title="Report" onClick={() => { setReportVid(v.id); }}>🚩</button>
                      )}
                    </div>
                    
                    <div className="fc-img-area" onClick={() => { if(v.cover_path) setLbImg(`https://your-supabase-url/storage/v1/object/public/${v.cover_path}`); }}>
                      {v.cover_path ? (
                        <img className="fc-img" src={`https://your-supabase-url/storage/v1/object/public/${v.cover_path}`} alt="" />
                      ) : (
                        <div className="fc-img-ph" style={{ background: ctheme.gradient, color: ctheme.text }}>{moodIco[v.mood] || '💜'}</div>
                      )}
                      <div className="fc-mood-badge">
                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: v.capsule_color || 'var(--coral)' }}></span>
                        {moodIco[v.mood] || '💜'} {v.mood}
                      </div>
                    </div>

                    <div className="fc-body">
                      <h3 className="fc-title">{v.title}</h3>
                      <div className="fc-story">{v.story}</div>
                    </div>

                    <div className="fc-foot">
                      <div className="fc-actions">
                        <button className={`fc-btn ${v.user_liked ? 'liked' : ''}`} onClick={() => toggleLike(v.id, v.user_liked)}>
                          <span className="icon">{v.user_liked ? '❤️' : '🤍'}</span> {v.likes_count}
                        </button>
                        <button className="fc-btn" onClick={() => openComments(v.id)}>
                          <span className="icon">💬</span> {v.comment_count}
                        </button>
                      </div>
                      <Link to={`/vault/${v.id}`} className="ftab" style={{ padding: '6px 14px', border: '1.5px solid var(--bdr)' }}>View Full →</Link>
                    </div>
                  </div>
                );
              }) : (
                <div className="empty-feed">
                  <span>🌍</span>
                  <h3>No public vaults found.</h3>
                  <p>Check back later or adjust your search.</p>
                </div>
              )}
            </div>
          </div>

          {/* ── COMMENTS DRAWER ── */}
          <div className={`drawer-overlay ${drawerOpen ? 'open' : ''}`} onClick={() => setDrawerOpen(false)}></div>
          <div className={`drawer ${drawerOpen ? 'open' : ''}`}>
            <div className="drawer-head">
              Comments
              <button className="drawer-close" onClick={() => setDrawerOpen(false)}>✕</button>
            </div>
            <div className="drawer-body">
              {comments.length > 0 ? comments.map((c, i) => {
                const isOwn = c.user_id === user.id;
                return (
                  <div key={c.id} className="c-item" style={{ animationDelay: `${i * 0.05}s` }}>
                    <div className="c-av">
                      {c.users?.avatar_path ? <img src={`https://your-supabase-url/storage/v1/object/public/${c.users.avatar_path}`} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/> : ai(c.users?.username)}
                    </div>
                    <div className="c-bubble">
                      <div className="c-name">@{c.users?.username?.split('@')[0]}</div>
                      <div className="c-text">{c.comment}</div>
                      <div className="c-meta">
                        <span className="c-time">{ta(c.created_at)}</span>
                        {isOwn && <button className="c-del" onClick={() => deleteComment(c.id)}>Delete</button>}
                      </div>
                    </div>
                  </div>
                );
              }) : (
                <div style={{ textAlign: 'center', color: 'var(--txt3)', fontSize: '.85rem', fontWeight: 700, padding: '20px' }}>No comments yet. Be the first!</div>
              )}
            </div>
            <div className="drawer-foot">
              <form className="drawer-form" onSubmit={submitComment}>
                <input type="text" className="drawer-input" placeholder="Add a comment..." required value={newComment} onChange={e => setNewComment(e.target.value)} />
                <button type="submit" className="drawer-send">➤</button>
              </form>
            </div>
          </div>

          {/* ── REPORT MODAL ── */}
          <div className={`modal-overlay ${reportVid ? 'open' : ''}`} onClick={(e) => { if(e.target === e.currentTarget) setReportVid(null); }}>
            <div className="modal-box">
              <div className="modal-title">🚩 Report Vault</div>
              <div className="modal-desc">Help us keep TimeVaulth safe. What's wrong with this memory?</div>
              <select className="modal-sel" value={reportReason} onChange={e => setReportReason(e.target.value)}>
                <option value="Inappropriate Content">Inappropriate Content / NSFW</option>
                <option value="Harassment or Bullying">Harassment or Bullying</option>
                <option value="Spam">Spam or Scam</option>
                <option value="Hate Speech">Hate Speech</option>
                <option value="Other">Other</option>
              </select>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <button className="drawer-send" style={{ width: 'auto', borderRadius: '100px', padding: '0 24px', opacity: reportSubmitting ? 0.7 : 1 }} onClick={submitReport} disabled={reportSubmitting}>
                  {reportSubmitting ? 'Submitting...' : 'Submit Report'}
                </button>
                <button className="drawer-close" style={{ width: 'auto', borderRadius: '100px', padding: '0 24px' }} onClick={() => setReportVid(null)}>Cancel</button>
              </div>
            </div>
          </div>

          {/* ── LIGHTBOX ── */}
          <div className={`lightbox ${lbImg ? 'open' : ''}`} onClick={(e) => { if(e.target === e.currentTarget) setLbImg(null); }}>
            <button className="lb-close" onClick={() => setLbImg(null)}>✕</button>
            {lbImg && <img src={lbImg} className="lb-img" alt="" />}
          </div>

        </div>
      </div>
    </>
  );
}
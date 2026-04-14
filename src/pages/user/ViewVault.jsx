import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../config/supabaseClient'; // Real DB Connection

// ─── HELPERS ───
const ai = (n) => (n ? n.substring(0, 2).toUpperCase() : 'U');
const ta = (dt) => {
  if (!dt) return '';
  const diff = Math.floor((Date.now() - new Date(dt).getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  return Math.floor(diff / 86400) + 'd ago';
};
const moodIco = { Happy: '😊', Sad: '😢', Excited: '🎉', Nostalgic: '🥹', Hopeful: '✨', Angry: '😤' };
const extIcons = { PDF: '📄', MP4: '🎬', MOV: '🎬', MP3: '🎵', WAV: '🎵', TXT: '📝', DOC: '📝', DOCX: '📝' };

const borderCss = {
  'border-none': 'linear-gradient(135deg,#FF6B5B,#FF9A8B)',
  'border-gold': 'linear-gradient(135deg,#FFD700,#FFA500)',
  'border-teal': 'linear-gradient(135deg,#00E5B0,#00B4D8)',
  'border-pink': 'linear-gradient(135deg,#FF1493,#FF69B4)',
  'border-purple': 'linear-gradient(135deg,#8B00FF,#9B59B6)',
  'border-rainbow': 'linear-gradient(135deg,#FF6B5B,#FFD700,#00E5B0,#8B00FF,#FF1493)',
  'border-fire': 'linear-gradient(135deg,#FF4500,#FF8C00,#FFD700)'
};

const getCapsuleGradient = (color = '#FF6B5B', design = 'default') => {
  const hex = (color || '#FF6B5B').replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16) || 255;
  const g = parseInt(hex.substring(2, 4), 16) || 107;
  const b = parseInt(hex.substring(4, 6), 16) || 91;
  const dr = '#' + [r, g, b].map(c => Math.max(0, Math.floor(c * 0.6)).toString(16).padStart(2, '0')).join('');
  const grads = {
    default: `linear-gradient(135deg, ${color} 0%, ${dr} 100%)`,
    classic: `linear-gradient(145deg, #f5e6c8 0%, ${color}88 60%, ${dr}cc 100%)`,
    pastel: `linear-gradient(135deg, ${color}66 0%, #fff4f4 60%, ${color}44 100%)`,
    midnight: `linear-gradient(145deg, #0f0f1a 0%, ${color}99 50%, #1a1a2e 100%)`,
    aurora: `linear-gradient(135deg, ${color} 0%, #7c3aedaa 50%, ${dr} 100%)`,
    obsidian: `linear-gradient(145deg, #111111 0%, ${color}77 60%, #1a1a1a 100%)`,
    sakura: `linear-gradient(135deg, ${color}88 0%, #fce4ec 50%, ${color}55 100%)`,
  };
  return grads[design] || grads.default;
};

export default function ViewVault() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dotRef = useRef(null);
  const ringRef = useRef(null);

  // ─── STATE ───
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [vault, setVault] = useState(null);
  const [owner, setOwner] = useState(null);
  const [files, setFiles] = useState({ images: [], docs: [] });
  
  const [likesCount, setLikesCount] = useState(0);
  const [hasLiked, setHasLiked] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  
  const [showMenu, setShowMenu] = useState(false);
  const [lsbExp, setLsbExp] = useState(localStorage.getItem('lsb-exp') === '1');
  const [toast, setToast] = useState(null);

  // Lightbox
  const [lbOpen, setLbOpen] = useState(false);
  const [lbIdx, setLbIdx] = useState(0);

  const showToast = (msg, type = 'teal') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ─── DATA FETCHING ───
  useEffect(() => {
    const fetchVaultData = async () => {
      const uid = localStorage.getItem('user_id');
      if (!uid) { navigate('/login'); return; }

      try {
        // 1. Get current user
        const { data: uData } = await supabase.from('users').select('*').eq('id', uid).single();
        setUser(uData);

        // 2. Get vault and owner info
        // Using standard join syntax `users(...)` assuming your foreign key from vaults.user_id -> users.id is setup.
        const { data: vData, error: vErr } = await supabase
          .from('vaults')
          .select('*, owner:users!vaults_user_id_fkey(id, username, avatar_path, equipped_title, equipped_border, streak_count)')
          .eq('id', id)
          .single();

        if (vErr || !vData) throw new Error("Vault not found");

        if (vData.status !== 'opened') {
          navigate('/my-vaults?err=vault_open');
          return;
        }

        setVault(vData);
        setOwner(vData.owner || {});

        // 3. Get files
        const { data: fData } = await supabase.from('vault_files').select('*').eq('vault_id', id);
        if (fData) {
          const imgs = [];
          const dcs = [];
          fData.forEach(f => {
            const ext = f.file_name.split('.').pop().toLowerCase();
            if (['jpg','jpeg','png','gif','webp'].includes(ext)) imgs.push(f);
            else dcs.push(f);
          });
          setFiles({ images: imgs, docs: dcs });
        }

        // 4. Get Likes
        const { data: lData } = await supabase.from('vault_likes').select('*').eq('vault_id', id);
        if (lData) {
          setLikesCount(lData.length);
          setHasLiked(lData.some(l => parseInt(l.user_id) === parseInt(uid)));
        }

        // 5. Get Comments
        const { data: cData } = await supabase
          .from('vault_comments')
          .select('*, user:users!vault_comments_user_id_fkey(id, username, avatar_path)')
          .eq('vault_id', id)
          .order('created_at', { ascending: false });
        if (cData) setComments(cData);

      } catch (err) {
        console.error(err);
        navigate('/my-vaults?err=notfound');
      } finally {
        setLoading(false);
      }
    };
    fetchVaultData();
  }, [id, navigate]);

  // ─── CURSOR & KEYBOARD EFFECTS ───
  useEffect(() => {
    let mx = 0, my = 0, rx = 0, ry = 0, reqId;
    const handleMouseMove = (e) => { mx = e.clientX; my = e.clientY; if(dotRef.current){dotRef.current.style.left=mx+'px';dotRef.current.style.top=my+'px'} };
    const animateCursor = () => { rx += (mx - rx) * 0.13; ry += (my - ry) * 0.13; if(ringRef.current){ringRef.current.style.left=rx+'px';ringRef.current.style.top=ry+'px'} reqId=requestAnimationFrame(animateCursor); };
    window.addEventListener('mousemove', handleMouseMove); animateCursor();

    const handleKeyDown = (e) => {
      if (!lbOpen) return;
      if (e.key === 'Escape') setLbOpen(false);
      if (e.key === 'ArrowLeft') setLbIdx(prev => Math.max(0, prev - 1));
      if (e.key === 'ArrowRight') setLbIdx(prev => Math.min(files.images.length - 1, prev + 1));
    };
    document.addEventListener('keydown', handleKeyDown);
    
    // Close menu on outside click
    const handleGlobalClick = () => setShowMenu(false);
    window.addEventListener('click', handleGlobalClick);

    return () => { 
      window.removeEventListener('mousemove', handleMouseMove); 
      window.removeEventListener('click', handleGlobalClick);
      document.removeEventListener('keydown', handleKeyDown);
      cancelAnimationFrame(reqId); 
    };
  }, [lbOpen, files.images.length]);

  // ─── ACTIONS ───
  const toggleLike = async () => {
    try {
      if (hasLiked) {
        await supabase.from('vault_likes').delete().eq('vault_id', id).eq('user_id', user.id);
        setLikesCount(prev => prev - 1);
        setHasLiked(false);
      } else {
        await supabase.from('vault_likes').insert([{ vault_id: id, user_id: user.id }]);
        setLikesCount(prev => prev + 1);
        setHasLiked(true);
      }
    } catch(e) { console.error(e); }
  };

  const handlePostComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      const { data, error } = await supabase.from('vault_comments').insert([{ vault_id: id, user_id: user.id, comment: newComment.trim() }]).select('*, user:users!vault_comments_user_id_fkey(id, username, avatar_path)').single();
      if (data) {
        setComments([data, ...comments]);
        setNewComment('');
        showToast('Comment posted', 'teal');
      }
    } catch(e) { console.error(e); }
  };

  const handleDeleteComment = async (cid) => {
    if (!window.confirm('Delete this comment?')) return;
    try {
      await supabase.from('vault_comments').delete().eq('id', cid);
      setComments(comments.filter(c => c.id !== cid));
      showToast('Comment deleted', 'pink');
    } catch(e) { console.error(e); }
  };

  const isOwner = user && owner && parseInt(user.id) === parseInt(owner.id);

  if (loading) return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FFF0ED', color: '#FF6B5B', fontFamily: '"Sora", sans-serif', fontSize: '1.5rem', fontWeight: 800 }}>⏳ Unlocking Vault...</div>;
  if (!vault || !user) return null;

  const myBrd = borderCss[user.equipped_border] || borderCss['border-none'];
  const ownerBrd = borderCss[owner.equipped_border] || borderCss['border-none'];
  const usernameShort = user.username.split('@')[0];
  const ownerShort = owner.username.split('@')[0];
  const coverGrad = getCapsuleGradient(vault.capsule_color, vault.capsule_design);

  return (
    <>
      <style>{`
        :root{--coral:#FF6B5B;--coral-l:#FFE8E4;--coral-d:#E8503F;--peach:#FFF0ED;--white:#FFFFFF;--surf:#F8F8F8;--bdr:rgba(0,0,0,.07);--txt:#222;--txt2:#777;--txt3:#BDBDBD;--teal:#1D9E75;--teal-l:#E0F5EE;--gold:#F5A623;--red:#E24B4A;--easing:cubic-bezier(.25,1,.5,1)}
        *,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
        html,body{height:100%;overflow:hidden}
        body{font-family:'Nunito',sans-serif;background:var(--peach);color:var(--txt);cursor:none}
        #cur-dot{position:fixed;width:9px;height:9px;background:var(--coral);border-radius:50%;pointer-events:none;z-index:9999;transform:translate(-50%,-50%);transition:width .15s,height .15s}
        #cur-ring{position:fixed;width:26px;height:26px;border:2px solid var(--coral);border-radius:50%;pointer-events:none;z-index:9998;transform:translate(-50%,-50%);transition:left .1s var(--easing),top .1s var(--easing),width .2s,height .2s,opacity .2s;opacity:.45}
        body:has(a:hover) #cur-dot,body:has(button:hover) #cur-dot, body:has(.clickable:hover) #cur-dot{width:14px;height:14px}
        
        .root{display:flex;height:100vh;overflow:hidden;padding:16px;gap:12px}
        /* SIDEBAR (Standard) */
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
        .ls-div{width:36px;height:1px;background:var(--bdr);margin:6px 0}
        .ls-bottom{padding:.75rem .5rem;border-top:1px solid var(--bdr);flex-shrink:0;width:100%}
        .ls-selfav-wrap{display:flex;align-items:center;gap:.6rem;padding:.4rem .5rem;border-radius:14px;text-decoration:none;transition:background .25s var(--easing);overflow:hidden;cursor:none}
        .ls-selfav-wrap:hover{background:var(--coral-l)}
        .ls-selfav{width:36px;height:36px;min-width:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:.68rem;color:#fff;overflow:hidden;transition:transform .25s var(--easing)}
        .ls-selfinfo{overflow:hidden;opacity:0;max-width:0;transition:opacity .2s .05s,max-width .3s var(--easing)}
        .l-sidebar.wide .ls-selfinfo{opacity:1;max-width:130px}
        .ls-selfname{font-size:.76rem;font-weight:800;color:var(--txt);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block}
        .ls-selfrole{font-size:.6rem;color:var(--txt3);display:block;white-space:nowrap}
        
        /* VIEWER LAYOUT */
        .viewer-wrap{flex:1;background:var(--white);border-radius:28px;box-shadow:0 12px 48px rgba(255,107,91,.08);display:flex;flex-direction:column;overflow:hidden;animation:fadeUp .4s var(--easing) both}
        .vw-top{display:flex;align-items:center;gap:12px;padding:16px 24px;border-bottom:1px solid var(--bdr);background:#fff;z-index:10}
        .vw-back{width:36px;height:36px;border-radius:12px;background:var(--surf);display:flex;align-items:center;justify-content:center;color:var(--txt2);font-size:1.1rem;text-decoration:none;transition:all .2s;cursor:none}
        .vw-back:hover{background:var(--coral-l);color:var(--coral);transform:translateX(-3px)}
        .vw-top-title{font-family:'Sora',sans-serif;font-size:1rem;font-weight:800;color:var(--txt);flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        
        /* 3-Dot Menu */
        .vw-menu-wrap{position:relative}
        .vw-menu-btn{width:36px;height:36px;border-radius:12px;background:transparent;border:none;font-size:1.2rem;color:var(--txt2);display:flex;align-items:center;justify-content:center;cursor:none;transition:all .2s}
        .vw-menu-btn:hover{background:var(--surf);color:var(--txt)}
        .vw-menu{position:absolute;top:calc(100% + 4px);right:0;background:#fff;border:1px solid var(--bdr);border-radius:16px;box-shadow:0 12px 30px rgba(0,0,0,.1);min-width:180px;display:none;flex-direction:column;padding:6px;z-index:100;animation:popIn .2s var(--easing)}
        .vw-menu.open{display:flex}
        .vw-mi{display:flex;align-items:center;gap:10px;padding:10px 14px;font-size:.85rem;font-weight:700;color:var(--txt);text-decoration:none;border-radius:10px;cursor:none;transition:all .2s;border:none;background:transparent;width:100%;text-align:left}
        .vw-mi:hover{background:var(--surf)}
        .vw-mi.danger{color:var(--red)}
        .vw-mi.danger:hover{background:#FFEBEB}
        @keyframes popIn{from{opacity:0;transform:translateY(-8px) scale(.97)}to{opacity:1;transform:none}}

        /* SCROLL AREA */
        .vw-scroll{flex:1;overflow-y:auto;display:flex;justify-content:center;background:#fbfbfb;scrollbar-width:thin;scrollbar-color:var(--coral-l) transparent}
        .vw-scroll::-webkit-scrollbar{width:5px}
        .vw-scroll::-webkit-scrollbar-thumb{background:var(--coral-l);border-radius:10px}
        .vw-content{width:100%;max-width:850px;background:#fff;min-height:100%;box-shadow:0 0 40px rgba(0,0,0,.02);display:flex;flex-direction:column}
        
        /* COVER & HEADER */
        .vc-cover-area{width:100%;height:320px;position:relative;background:var(--surf)}
        .vc-cover-img{width:100%;height:100%;object-fit:cover;display:block}
        .vc-cover-ph{width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:5rem}
        .vc-badge-vis{position:absolute;top:20px;right:20px;background:rgba(255,255,255,.9);backdrop-filter:blur(4px);padding:6px 14px;border-radius:100px;font-size:.7rem;font-weight:800;color:var(--txt);box-shadow:0 4px 12px rgba(0,0,0,.1)}
        
        .vc-main-info{padding:0 32px;position:relative;margin-top:-40px;display:flex;align-items:flex-end;gap:16px;margin-bottom:24px}
        .vc-owner-av-wrap{width:90px;height:90px;border-radius:50%;background:#fff;padding:4px;box-shadow:0 8px 24px rgba(0,0,0,.12);position:relative;z-index:2;flex-shrink:0}
        .vc-owner-av{width:100%;height:100%;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1.6rem;font-weight:900;color:#fff;overflow:hidden}
        .vc-owner-av img{width:100%;height:100%;object-fit:cover}
        .vc-owner-info{padding-bottom:6px;flex:1}
        .vc-owner-name{font-family:'Sora',sans-serif;font-size:1.3rem;font-weight:800;color:var(--txt);line-height:1.2;display:flex;align-items:center;gap:6px}
        .vc-owner-streak{font-size:.7rem;background:var(--coral-l);color:var(--coral);padding:3px 8px;border-radius:100px;font-weight:800}
        .vc-owner-title{font-size:.8rem;color:var(--txt2);font-weight:700}
        
        .vc-title-sec{padding:0 32px 24px;border-bottom:1px solid var(--bdr)}
        .vc-mood-pill{display:inline-flex;align-items:center;gap:6px;background:var(--surf);border:1.5px solid var(--bdr);padding:6px 14px;border-radius:100px;font-size:.75rem;font-weight:800;color:var(--txt);margin-bottom:12px}
        .vc-h1{font-family:'Sora',sans-serif;font-size:2rem;font-weight:800;color:var(--txt);line-height:1.2;margin-bottom:8px}
        .vc-meta{display:flex;align-items:center;gap:16px;font-size:.8rem;color:var(--txt3);font-weight:700;flex-wrap:wrap}
        .vc-meta-item{display:flex;align-items:center;gap:6px}
        
        /* STORY */
        .vc-story-sec{padding:32px;font-size:1.05rem;line-height:1.8;color:var(--txt);font-weight:600;white-space:pre-wrap;border-bottom:1px solid var(--bdr)}
        
        /* MEDIA / FILES */
        .vc-media-sec{padding:32px;border-bottom:1px solid var(--bdr)}
        .sec-h3{font-family:'Sora',sans-serif;font-size:1.1rem;font-weight:800;color:var(--txt);margin-bottom:16px;display:flex;align-items:center;gap:8px}
        .sec-count{font-size:.7rem;font-weight:800;background:var(--surf);color:var(--txt2);padding:3px 10px;border-radius:100px;border:1px solid var(--bdr)}
        
        .img-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px;margin-bottom:20px}
        .ig-item{aspect-ratio:1;border-radius:20px;overflow:hidden;cursor:none;position:relative;box-shadow:0 4px 12px rgba(0,0,0,.05);border:1.5px solid var(--bdr)}
        .ig-item img{width:100%;height:100%;object-fit:cover;transition:transform .4s var(--easing)}
        .ig-item:hover img{transform:scale(1.05)}
        .ig-item::after{content:'🔍';position:absolute;inset:0;background:rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;font-size:1.5rem;color:#fff;opacity:0;transition:opacity .3s}
        .ig-item:hover::after{opacity:1}
        
        .doc-list{display:flex;flex-direction:column;gap:10px}
        .doc-item{display:flex;align-items:center;gap:14px;padding:14px 18px;background:var(--surf);border:1.5px solid var(--bdr);border-radius:20px;text-decoration:none;color:var(--txt);transition:all .2s;cursor:none}
        .doc-item:hover{background:#fff;border-color:var(--coral-l);box-shadow:0 8px 20px rgba(255,107,91,.08);transform:translateY(-2px)}
        .doc-ico{font-size:1.6rem;flex-shrink:0}
        .doc-info{flex:1;min-width:0}
        .doc-name{font-size:.9rem;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:2px}
        .doc-dl{font-size:.7rem;font-weight:800;color:var(--coral);background:var(--coral-l);padding:4px 12px;border-radius:100px}
        
        /* REACTIONS */
        .vc-react-sec{padding:24px 32px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--bdr);background:var(--surf)}
        .react-btn{display:flex;align-items:center;gap:8px;padding:10px 20px;border-radius:100px;font-family:'Nunito',sans-serif;font-size:.9rem;font-weight:800;border:1.5px solid var(--bdr);background:#fff;color:var(--txt2);cursor:none;transition:all .3s var(--easing)}
        .react-btn:hover{background:var(--coral-l);color:var(--coral);border-color:var(--coral-l)}
        .react-btn.liked{background:var(--coral);color:#fff;border-color:var(--coral);box-shadow:0 8px 20px rgba(255,107,91,.3)}
        .react-btn.liked:hover{background:var(--coral-d)}
        .react-stats{font-size:.8rem;font-weight:700;color:var(--txt3);display:flex;gap:16px}
        
        /* COMMENTS */
        .vc-comment-sec{padding:32px;flex:1;background:#fff}
        .comment-form{display:flex;gap:12px;margin-bottom:32px;align-items:flex-start}
        .cf-av{width:40px;height:40px;border-radius:50%;background:var(--coral-l);color:var(--coral);display:flex;align-items:center;justify-content:center;font-size:.8rem;font-weight:900;flex-shrink:0;overflow:hidden}
        .cf-av img{width:100%;height:100%;object-fit:cover}
        .cf-input-wrap{flex:1;position:relative}
        .cf-input{width:100%;background:var(--surf);border:2px solid transparent;border-radius:20px;padding:14px 18px;font-family:'Nunito',sans-serif;font-size:.9rem;color:var(--txt);font-weight:600;outline:none;resize:none;min-height:80px;transition:all .3s}
        .cf-input:focus{background:#fff;border-color:var(--coral);box-shadow:0 0 0 4px rgba(255,107,91,.12)}
        .cf-submit{position:absolute;bottom:10px;right:10px;background:var(--coral);color:#fff;border:none;border-radius:12px;padding:8px 16px;font-family:'Nunito',sans-serif;font-size:.8rem;font-weight:800;cursor:none;transition:all .2s}
        .cf-submit:hover{background:var(--coral-d)}
        
        .comment-list{display:flex;flex-direction:column;gap:20px}
        .c-item{display:flex;gap:12px;animation:fadeUp .3s var(--easing) both}
        .c-av{width:36px;height:36px;border-radius:50%;background:var(--surf);display:flex;align-items:center;justify-content:center;font-size:.7rem;font-weight:900;color:var(--txt2);flex-shrink:0;overflow:hidden}
        .c-av img{width:100%;height:100%;object-fit:cover}
        .c-body{flex:1;background:var(--surf);border:1px solid var(--bdr);border-radius:0 20px 20px 20px;padding:12px 16px}
        .c-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:4px}
        .c-name{font-size:.85rem;font-weight:800;color:var(--txt)}
        .c-time{font-size:.65rem;color:var(--txt3);font-weight:700}
        .c-text{font-size:.85rem;color:var(--txt);line-height:1.5;font-weight:600;white-space:pre-wrap}
        .c-del{background:none;border:none;color:var(--txt3);font-size:.7rem;font-weight:800;cursor:none;margin-top:6px;transition:color .2s}
        .c-del:hover{color:var(--red)}
        
        .c-empty{text-align:center;padding:30px;color:var(--txt3);font-size:.9rem;font-weight:700}
        
        /* LIGHTBOX */
        .lightbox{position:fixed;inset:0;background:rgba(0,0,0,.9);backdrop-filter:blur(8px);z-index:9999;display:none;align-items:center;justify-content:center;opacity:0;transition:opacity .3s}
        .lightbox.open{display:flex;opacity:1}
        .lb-img{max-width:90vw;max-height:90vh;object-fit:contain;border-radius:8px;box-shadow:0 20px 60px rgba(0,0,0,.5);user-select:none}
        .lb-close{position:absolute;top:24px;right:24px;width:44px;height:44px;background:rgba(255,255,255,.1);border:none;border-radius:50%;color:#fff;font-size:1.5rem;cursor:none;display:flex;align-items:center;justify-content:center;transition:background .2s}
        .lb-close:hover{background:var(--coral)}
        .lb-nav{position:absolute;top:50%;transform:translateY(-50%);width:50px;height:50px;background:rgba(255,255,255,.1);border:none;border-radius:50%;color:#fff;font-size:1.5rem;cursor:none;display:flex;align-items:center;justify-content:center;transition:background .2s}
        .lb-nav:hover{background:var(--coral)}
        .lb-nav.prev{left:24px}
        .lb-nav.next{right:24px}
        .lb-ctr{position:absolute;bottom:24px;left:50%;transform:translateX(-50%);color:#fff;font-size:.9rem;font-weight:800;background:rgba(0,0,0,.5);padding:6px 14px;border-radius:100px}
        
        /* TOAST */
        .toast{position:fixed;bottom:24px;right:24px;padding:16px 24px;border-radius:20px;font-size:.9rem;font-weight:800;z-index:9999;animation:fadeUp .4s var(--easing);display:flex;align-items:center;gap:10px;box-shadow:0 12px 32px rgba(0,0,0,.15)}
        .toast-teal{background:var(--teal-l);color:var(--teal);border:1px solid rgba(29,158,117,.3)}
        .toast-pink{background:var(--coral-l);color:var(--coral);border:1px solid rgba(255,107,91,.3)}
        
        @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @media(max-width:800px){.l-sidebar{display:none}.root{padding:8px}.vc-main-info{flex-direction:column;align-items:flex-start;margin-top:-30px}.vc-owner-av-wrap{width:70px;height:70px}.vc-h1{font-size:1.6rem}.img-grid{grid-template-columns:repeat(auto-fill,minmax(140px,1fr))}.comment-form{flex-direction:column}.cf-av{display:none}.lb-nav{width:40px;height:40px;font-size:1.2rem}.lb-nav.prev{left:10px}.lb-nav.next{right:10px}}
      `}</style>

      <div id="cur-dot" ref={dotRef}></div><div id="cur-ring" ref={ringRef}></div>

      <div className="root">
        {/* ════ SIDEBAR ════ */}
        <aside className={`l-sidebar ${lsbExp ? 'wide' : ''}`}>
          <div className="ls-top">
            <button className="ls-hamburger" onClick={() => setLsbExp(!lsbExp)}>{lsbExp ? '✕' : '☰'}</button>
            <span className="ls-brand">TimeVaulth</span>
          </div>
          <nav className="ls-nav">
            <span className="ls-section">Main</span>
            <Link to="/dashboard" className="ls-icon" data-t="Dashboard">🏠<span className="ls-lbl">Dashboard</span></Link>
            <Link to="/my-vaults" className="ls-icon" data-t="My Vaults">🛡️<span className="ls-lbl">My Vaults</span></Link>
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
                <div style={{width:'100%',height:'100%',borderRadius:'50%',background:'linear-gradient(135deg,var(--coral),#FF9A8B)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:900,fontSize:'.68rem',color:'#fff',overflow:'hidden'}}>
                  {user.avatar_path ? <img src={`https://your-supabase-url/storage/v1/object/public/${user.avatar_path}`} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/> : ai(usernameShort)}
                </div>
              </div>
              <div className="ls-selfinfo">
                <span className="ls-selfname">{usernameShort}</span>
                <span className="ls-selfrole">Viewing Vault</span>
              </div>
            </Link>
          </div>
        </aside>

        {/* ════ MAIN VIEWER ════ */}
        <div className="viewer-wrap">
          <div className="vw-top">
            <Link to="/my-vaults" className="vw-back clickable" title="Back to Vaults">←</Link>
            <div className="vw-top-title">{vault.title}</div>
            
            <div className="vw-menu-wrap" onClick={(e) => e.stopPropagation()}>
              <button className="vw-menu-btn clickable" onClick={() => setShowMenu(!showMenu)}>⋮</button>
              <div className={`vw-menu ${showMenu ? 'open' : ''}`}>
                {isOwner ? (
                  <>
                    <button className="vw-mi clickable" onClick={() => { setShowMenu(false); alert('Archive function here'); }}>📦 Archive Vault</button>
                    <button className="vw-mi danger clickable" onClick={() => { setShowMenu(false); alert('Delete function here'); }}>🗑️ Delete Vault</button>
                  </>
                ) : (
                  <button className="vw-mi danger clickable" onClick={() => { setShowMenu(false); alert('Report function here'); }}>🚩 Report Vault</button>
                )}
              </div>
            </div>
          </div>

          <div className="vw-scroll">
            <div className="vw-content">
              
              {/* COVER & HEADER */}
              <div className="vc-cover-area">
                {vault.cover_path ? (
                  <img src={`https://your-supabase-url/storage/v1/object/public/${vault.cover_path}`} className="vc-cover-img" alt="" />
                ) : (
                  <div className="vc-cover-ph" style={{background: coverGrad}}>
                    <span style={{color: '#fff'}}>{moodIco[vault.mood] || '💜'}</span>
                  </div>
                )}
                <div className="vc-badge-vis">
                  {vault.visibility === 'public' ? '🌍 Public' : vault.visibility === 'friends' ? '👥 Friends' : '🔒 Private'}
                </div>
              </div>

              <div className="vc-main-info">
                <div className="vc-owner-av-wrap">
                  <div className="vc-owner-av" style={{ background: ownerBrd, padding: '3px' }}>
                    <div style={{width:'100%',height:'100%',borderRadius:'50%',background:'linear-gradient(135deg,var(--coral),#FF9A8B)',display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden'}}>
                      {owner.avatar_path ? <img src={`https://your-supabase-url/storage/v1/object/public/${owner.avatar_path}`} alt="" /> : ai(ownerShort)}
                    </div>
                  </div>
                </div>
                <div className="vc-owner-info">
                  <div className="vc-owner-name">
                    @{ownerShort}
                    {owner.streak_count > 0 && <span className="vc-owner-streak">🔥 {owner.streak_count}</span>}
                  </div>
                  <div className="vc-owner-title">{owner.equipped_title || 'Memory Keeper'}</div>
                </div>
              </div>

              <div className="vc-title-sec">
                <div className="vc-mood-pill">
                  <span style={{width:'10px',height:'10px',borderRadius:'50%',background:vault.capsule_color||'var(--coral)',display:'inline-block'}}></span>
                  {moodIco[vault.mood] || '💜'} {vault.mood}
                </div>
                <h1 className="vc-h1">{vault.title}</h1>
                <div className="vc-meta">
                  <span className="vc-meta-item">🔓 Opened {new Date(vault.unlock_date).toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric'})}</span>
                  <span className="vc-meta-item">📅 Sealed {new Date(vault.created_at).toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric'})}</span>
                </div>
              </div>

              {/* STORY */}
              {vault.story && (
                <div className="vc-story-sec">
                  {vault.story}
                </div>
              )}

              {/* MEDIA / FILES */}
              {(files.images.length > 0 || files.docs.length > 0) && (
                <div className="vc-media-sec">
                  {files.images.length > 0 && (
                    <>
                      <div className="sec-h3">🖼️ Gallery <span className="sec-count">{files.images.length}</span></div>
                      <div className="img-grid">
                        {files.images.map((f, i) => (
                          <div key={f.id} className="ig-item clickable" onClick={() => { setLbIdx(i); setLbOpen(true); }}>
                            <img src={`https://your-supabase-url/storage/v1/object/public/${f.file_path}`} alt="" />
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                  {files.docs.length > 0 && (
                    <>
                      <div className="sec-h3" style={{marginTop: files.images.length > 0 ? '24px' : '0'}}>📎 Attachments <span className="sec-count">{files.docs.length}</span></div>
                      <div className="doc-list">
                        {files.docs.map(f => {
                          const ext = f.file_name.split('.').pop().toUpperCase();
                          return (
                            <a key={f.id} href={`https://your-supabase-url/storage/v1/object/public/${f.file_path}`} target="_blank" rel="noopener noreferrer" className="doc-item clickable">
                              <span className="doc-ico">{extIcons[ext] || '📎'}</span>
                              <div className="doc-info">
                                <div className="doc-name">{f.file_name}</div>
                              </div>
                              <span className="doc-dl">Download</span>
                            </a>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* REACTIONS */}
              <div className="vc-react-sec">
                <button className={`react-btn clickable ${hasLiked ? 'liked' : ''}`} onClick={toggleLike}>
                  {hasLiked ? '❤️ Liked' : '🤍 Like'}
                </button>
                <div className="react-stats">
                  <span>❤️ {likesCount}</span>
                  <span>💬 {comments.length}</span>
                </div>
              </div>

              {/* COMMENTS */}
              <div className="vc-comment-sec">
                <div className="sec-h3">Comments</div>
                
                <form className="comment-form" onSubmit={handlePostComment}>
                  <div className="cf-av">
                    {user.avatar_path ? <img src={`https://your-supabase-url/storage/v1/object/public/${user.avatar_path}`} alt=""/> : ai(usernameShort)}
                  </div>
                  <div className="cf-input-wrap">
                    <textarea className="cf-input" placeholder="Leave a meaningful comment..." value={newComment} onChange={e => setNewComment(e.target.value)} required></textarea>
                    <button type="submit" className="cf-submit clickable">Post</button>
                  </div>
                </form>

                <div className="comment-list">
                  {comments.length > 0 ? comments.map(c => {
                    const cUser = c.user || {};
                    const cUname = (cUser.username || 'Unknown').split('@')[0];
                    const canDelete = parseInt(c.user_id) === parseInt(user.id) || isOwner;
                    return (
                      <div key={c.id} className="c-item">
                        <div className="c-av">
                          {cUser.avatar_path ? <img src={`https://your-supabase-url/storage/v1/object/public/${cUser.avatar_path}`} alt=""/> : ai(cUname)}
                        </div>
                        <div className="c-body">
                          <div className="c-head">
                            <span className="c-name">@{cUname}</span>
                            <span className="c-time">{ta(c.created_at)}</span>
                          </div>
                          <div className="c-text">{c.comment}</div>
                          {canDelete && <button className="c-del clickable" onClick={() => handleDeleteComment(c.id)}>Delete</button>}
                        </div>
                      </div>
                    );
                  }) : (
                    <div className="c-empty">No comments yet. Be the first to share your thoughts!</div>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>

      </div>

      {/* LIGHTBOX */}
      <div className={`lightbox ${lbOpen ? 'open' : ''}`} onClick={(e) => { if(e.target === e.currentTarget) setLbOpen(false); }}>
        <button className="lb-close clickable" onClick={() => setLbOpen(false)}>✕</button>
        {files.images.length > 1 && (
          <>
            <button className="lb-nav prev clickable" onClick={(e) => { e.stopPropagation(); setLbIdx(Math.max(0, lbIdx - 1)); }} style={{display: lbIdx > 0 ? 'flex' : 'none'}}>‹</button>
            <button className="lb-nav next clickable" onClick={(e) => { e.stopPropagation(); setLbIdx(Math.min(files.images.length - 1, lbIdx + 1)); }} style={{display: lbIdx < files.images.length - 1 ? 'flex' : 'none'}}>›</button>
          </>
        )}
        {files.images.length > 0 && (
          <>
            <img src={`https://your-supabase-url/storage/v1/object/public/${files.images[lbIdx].file_path}`} className="lb-img" alt="" />
            <div className="lb-ctr">{lbIdx + 1} / {files.images.length}</div>
          </>
        )}
      </div>

      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
    </>
  );
}
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../config/supabaseClient'; 

// ─── HELPERS ───
const ai = (n) => (n ? n.substring(0, 2).toUpperCase() : 'U');
const moodIco = { Happy: '😊', Sad: '😢', Excited: '🎉', Nostalgic: '🥹', Hopeful: '✨', Angry: '😤' };
const moodTips = {
  Happy: '😊 Capture what made today special.', Sad: '😢 Even hard moments deserve remembering.',
  Excited: '🎉 Channel that energy!', Nostalgic: '🥹 Future you will thank you.',
  Hopeful: '✨ Write your hopes for the future.', Angry: '😤 Sometimes we need to vent.'
};
const capsuleColors = ['#FF6B5B','#F5A623','#1D9E75','#5B8AF5','#9B59B6','#E91E8C','#00BCD4','#FF5722','#607D8B','#222222'];
const allDesigns = [
  { id: 'default', label: 'Classic', ico: '🛡️', tiers: ['standard', 'pro', 'ultra'] },
  { id: 'classic', label: 'Vintage', ico: '📜', tiers: ['pro', 'ultra'] },
  { id: 'pastel', label: 'Pastel', ico: '🌸', tiers: ['pro', 'ultra'] },
  { id: 'midnight', label: 'Midnight', ico: '🌙', tiers: ['pro', 'ultra'] },
  { id: 'aurora', label: 'Aurora', ico: '🌌', tiers: ['ultra'] },
  { id: 'obsidian', label: 'Obsidian', ico: '🖤', tiers: ['ultra'] },
  { id: 'sakura', label: 'Sakura', ico: '🌺', tiers: ['ultra'] },
];

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

export default function VaultForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('id');

  const dotRef = useRef(null);
  const ringRef = useRef(null);
  const coverInputRef = useRef(null);

  // ─── STATE ───
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState(null);
  const [lsbExp, setLsbExp] = useState(localStorage.getItem('lsb-exp') === '1');
  const [toastMsg, setToastMsg] = useState('');
  
  // Form Data
  const [vault, setVault] = useState({
    title: '', story: '', mood: 'Happy', unlock_date: '', visibility: 'private',
    capsule_color: '#FF6B5B', capsule_design: 'default',
    target_lat: searchParams.get('lat') || '', target_lng: searchParams.get('lng') || ''
  });
  
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [isHoveringCover, setIsHoveringCover] = useState(false);

  // UI Derived
  const [progress, setProgress] = useState(0);
  const [cd, setCd] = useState(null);

  const draftKey = `vaultDraft_${editId || 'new'}`;

  // ─── EFFECTS ───
  useEffect(() => {
    const fetchUser = async () => {
      const uid = localStorage.getItem('user_id');
      if (!uid) { navigate('/login'); return; }
      
      const { data } = await supabase.from('users').select('*').eq('id', uid).single();
      if (data) setUser(data);
      
      if (!editId) {
        const saved = localStorage.getItem(draftKey);
        if (saved) {
          try { setVault(JSON.parse(saved)); } catch(e){}
        }
      }
      setLoading(false);
    };
    fetchUser();
  }, [editId, navigate, draftKey]);

  useEffect(() => {
    let mx = 0, my = 0, rx = 0, ry = 0, reqId;
    const handleMouseMove = (e) => { mx = e.clientX; my = e.clientY; if(dotRef.current){dotRef.current.style.left=mx+'px';dotRef.current.style.top=my+'px'} };
    const animateCursor = () => { rx += (mx - rx) * 0.13; ry += (my - ry) * 0.13; if(ringRef.current){ringRef.current.style.left=rx+'px';ringRef.current.style.top=ry+'px'} reqId=requestAnimationFrame(animateCursor); };
    window.addEventListener('mousemove', handleMouseMove); animateCursor();
    return () => { window.removeEventListener('mousemove', handleMouseMove); cancelAnimationFrame(reqId); };
  }, []);

  useEffect(() => {
    if (loading) return;
    const checks = [
      vault.title.trim().length > 0,
      vault.story.trim().length > 0,
      vault.unlock_date !== '',
      coverPreview !== null,
      (vault.target_lat !== '' && vault.target_lng !== '')
    ];
    setProgress(Math.round((checks.filter(Boolean).length / checks.length) * 100));

    const tmr = setTimeout(() => {
      localStorage.setItem(draftKey, JSON.stringify(vault));
      showToast('💾 Draft saved locally');
    }, 1500);
    return () => clearTimeout(tmr);
  }, [vault, coverPreview, loading, draftKey]);

  useEffect(() => {
    if (!vault.unlock_date) { setCd(null); return; }
    const unlockTime = new Date(vault.unlock_date).getTime();
    const tick = () => {
      const diff = Math.max(0, Math.floor((unlockTime - Date.now()) / 1000));
      if (diff <= 0) { setCd(null); return; }
      setCd({ d: Math.floor(diff/86400), h: Math.floor((diff%86400)/3600), m: Math.floor((diff%3600)/60), s: diff%60 });
    };
    tick(); const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [vault.unlock_date]);

  // ─── HANDLERS ───
  const handleChange = (e) => setVault({ ...vault, [e.target.name]: e.target.value });
  
  const handleShortcut = (offset) => {
    const now = new Date();
    if(offset==='1d') now.setDate(now.getDate()+1);
    if(offset==='1w') now.setDate(now.getDate()+7);
    if(offset==='1m') now.setMonth(now.getMonth()+1);
    if(offset==='6m') now.setMonth(now.getMonth()+6);
    if(offset==='1y') now.setFullYear(now.getFullYear()+1);
    if(offset==='5y') now.setFullYear(now.getFullYear()+5);
    const p = n => String(n).padStart(2, '0');
    setVault({ ...vault, unlock_date: `${now.getFullYear()}-${p(now.getMonth()+1)}-${p(now.getDate())}T${p(now.getHours())}:${p(now.getMinutes())}` });
  };

  const handleCoverSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setCoverFile(file);
      setCoverPreview(URL.createObjectURL(file));
    }
  };

  const showToast = (msg) => { setToastMsg(msg); setTimeout(() => setToastMsg(''), 2000); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      let finalCoverPath = vault.cover_path;

      if (coverFile) {
        const fileExt = coverFile.name.split('.').pop();
        const fileName = `${Date.now()}_cover_${user.username.split('@')[0]}.${fileExt}`;
        const filePath = `uploads/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('vault_assets')
          .upload(filePath, coverFile);

        if (uploadError) throw uploadError;
        finalCoverPath = filePath;
      }

      const { error: insertError } = await supabase
        .from('vaults')
        .insert([{
          user_id: user.id,
          title: vault.title,
          story: vault.story,
          mood: vault.mood,
          unlock_date: vault.unlock_date,
          visibility: vault.visibility,
          capsule_color: vault.capsule_color,
          capsule_design: vault.capsule_design,
          cover_path: finalCoverPath,
          status: 'draft' 
        }]);

      if (insertError) throw insertError;

      localStorage.removeItem(draftKey);
      navigate('/my-vaults'); 
    } catch (err) {
      console.error(err);
      alert("Error saving vault: " + err.message);
      setSubmitting(false);
    }
  };

  if (loading) return null;

  const myBrd = borderCss[user.equipped_border] || borderCss['border-none'];
  const usernameShort = user.username.split('@')[0];
  const rPanelGrad = getCapsuleGradient(vault.capsule_color, vault.capsule_design);

  return (
    <>
      <style>{`
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

        #cur-dot{position:fixed;width:9px;height:9px;background:var(--coral);border-radius:50%;pointer-events:none;z-index:9999;transform:translate(-50%,-50%);transition:width .15s,height .15s}
        #cur-ring{position:fixed;width:26px;height:26px;border:2px solid var(--coral);border-radius:50%;pointer-events:none;z-index:9998;transform:translate(-50%,-50%);transition:left .1s var(--easing),top .1s var(--easing),width .2s,height .2s,opacity .2s;opacity:.45}

        /* DITO YUNG FIX PARA MAKA-SCROLL! */
        .root{display:flex;height:100vh;width:100%;overflow:hidden;padding:16px;gap:12px}

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
        .ls-selfav{width:36px;height:36px;min-width:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;overflow:hidden;transition:transform .25s var(--easing)}
        .ls-selfav-wrap:hover .ls-selfav{transform:scale(1.08)}
        .ls-selfav-inner{width:100%;height:100%;border-radius:50%;background:linear-gradient(135deg,var(--coral),#FF9A8B);display:flex;align-items:center;justify-content:center;font-weight:900;font-size:.68rem;color:#fff;overflow:hidden}
        .ls-selfav-inner img{width:100%;height:100%;object-fit:cover}
        .ls-selfinfo{overflow:hidden;opacity:0;max-width:0;transition:opacity .2s .05s,max-width .3s var(--easing)}
        .l-sidebar.wide .ls-selfinfo{opacity:1;max-width:130px}
        .ls-selfname{font-size:.76rem;font-weight:800;color:var(--txt);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block}
        .ls-selfrole{font-size:.6rem;color:var(--txt3);display:block;white-space:nowrap}

        .main-card{flex:1;min-width:0;background:var(--white);border-radius:28px;box-shadow:0 12px 48px rgba(255,107,91,.08);display:flex;flex-direction:column;overflow:hidden}
        .mc-top{display:flex;align-items:center;gap:12px;padding:18px 24px 14px;flex-shrink:0;border-bottom:1px solid rgba(0,0,0,.04)}
        .mc-title{font-family:'Sora',sans-serif;font-size:1.1rem;font-weight:800;color:var(--txt);white-space:nowrap}
        .mc-spacer{flex:1}
        .mc-btn{width:36px;height:36px;border-radius:12px;background:var(--surf);border:none;display:flex;align-items:center;justify-content:center;font-size:.9rem;cursor:none;transition:all .3s var(--easing);color:var(--txt2);text-decoration:none}
        .mc-btn:hover{background:var(--coral-l);color:var(--coral)}
        .mc-user{display:flex;align-items:center;gap:.45rem;text-decoration:none;cursor:none;flex-shrink:0;padding:.3rem .55rem;border-radius:100px;transition:background .25s var(--easing)}
        .mc-user:hover{background:var(--surf)}
        .mc-uav{width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:.66rem;color:#fff;overflow:hidden}
        .mc-uav img{width:100%;height:100%;object-fit:cover}
        .mc-uname{font-size:.8rem;font-weight:800;color:var(--txt)}

        .mc-body{flex:1;overflow-y:auto;padding:24px 32px 40px;scrollbar-width:thin;scrollbar-color:var(--coral-l) transparent}
        .mc-body::-webkit-scrollbar{width:5px}
        .mc-body::-webkit-scrollbar-thumb{background:var(--coral-l);border-radius:10px}

        .progress-strip{display:flex;align-items:center;gap:1rem;padding:16px 20px;background:var(--surf);border-radius:20px;margin-bottom:24px;border:1.5px solid var(--bdr)}
        .ps-label{font-size:.75rem;font-weight:800;color:var(--txt2);text-transform:uppercase;letter-spacing:.08em;white-space:nowrap}
        .ps-track{flex:1;height:6px;background:rgba(0,0,0,.05);border-radius:100px;overflow:hidden}
        .ps-fill{height:100%;background:var(--coral);border-radius:100px;width:0%;transition:width .45s var(--easing)}
        .ps-pct{font-size:.8rem;font-weight:800;color:var(--coral);min-width:36px;text-align:right}
        .ps-dots{display:flex;gap:6px}
        .ps-dot{width:10px;height:10px;border-radius:50%;background:var(--bdr);transition:all .3s var(--easing)}
        .ps-dot.on{background:var(--coral);box-shadow:0 0 0 3px var(--coral-l)}

        .v-card{background:var(--white);border:1.5px solid var(--bdr);border-radius:24px;padding:24px;margin-bottom:20px;box-shadow:0 4px 16px rgba(0,0,0,.02);transition:all .3s var(--easing);animation:fadeUp .45s var(--easing) both}
        .v-card:hover{border-color:rgba(255,107,91,.3);box-shadow:0 8px 30px rgba(255,107,91,.08)}
        .v-card-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px}
        .v-card-title{font-family:'Sora',sans-serif;font-size:1.05rem;font-weight:800;color:var(--txt);display:flex;align-items:center;gap:8px}
        .v-card-step{font-size:.65rem;font-weight:800;padding:4px 10px;border-radius:100px;background:var(--surf);color:var(--txt2);border:1px solid var(--bdr)}

        .fg{margin-bottom:1.2rem}
        .fg:last-child{margin-bottom:0}
        .fg-row{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:8px}
        .fg-label{font-size:.75rem;font-weight:800;color:var(--txt);text-transform:uppercase;letter-spacing:.06em}
        .fg-hint{font-size:.7rem;font-weight:600;color:var(--txt3)}
        .fg-req{color:var(--coral);margin-left:2px}
        .finput,.ftextarea{width:100%;padding:14px 18px;border-radius:18px;border:2px solid transparent;background:var(--surf);font-family:'Nunito',sans-serif;font-size:.9rem;font-weight:600;color:var(--txt);outline:none;transition:all .3s var(--easing)}
        .finput::placeholder,.ftextarea::placeholder{color:var(--txt3)}
        .finput:focus,.ftextarea:focus{border-color:var(--coral);background:#fff;box-shadow:0 0 0 4px rgba(255,107,91,.12)}
        .ftextarea{resize:vertical;min-height:120px;line-height:1.6}
        .fg-footer{display:flex;align-items:center;justify-content:space-between;margin-top:6px}
        .fg-words{font-size:.7rem;color:var(--txt3);font-weight:700}
        .fg-count{font-size:.7rem;font-weight:700;color:var(--txt3);transition:color .25s}
        .fg-count.warn{color:var(--gold)}
        .fg-count.over{color:var(--coral)}

        .mood-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(100px,1fr));gap:10px}
        .mood-btn{padding:12px;border-radius:16px;background:var(--surf);border:2px solid transparent;color:var(--txt2);font-size:.85rem;font-weight:700;cursor:none;transition:all .3s var(--easing);text-align:center;font-family:'Nunito',sans-serif}
        .mood-btn:hover{background:var(--white);border-color:var(--coral-l);color:var(--coral);transform:translateY(-2px);box-shadow:0 4px 12px rgba(255,107,91,.1)}
        .mood-btn.picked{background:var(--coral-l);border-color:var(--coral);color:var(--coral)}
        .mood-tip{margin-top:12px;padding:12px 16px;background:var(--surf);border:1px solid var(--bdr);border-radius:14px;font-size:.8rem;color:var(--txt2);display:flex;align-items:flex-start;gap:8px;font-weight:600}

        .shortcuts{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px}
        .sc-btn{padding:6px 14px;background:var(--surf);border:1.5px solid transparent;border-radius:10px;color:var(--txt2);font-size:.75rem;font-weight:700;cursor:none;transition:all .2s;font-family:'Nunito',sans-serif}
        .sc-btn:hover{background:var(--coral-l);border-color:var(--coral);color:var(--coral);transform:translateY(-2px)}
        .countdown{display:none;align-items:center;gap:8px;margin-top:10px;padding:10px 16px;background:var(--teal-l);border:1px solid rgba(29,158,117,.2);border-radius:14px;font-size:.8rem;font-weight:800;color:var(--teal)}
        .countdown.on{display:flex}
        .cd-dot{width:8px;height:8px;background:var(--teal);border-radius:50%;animation:pulse 2s infinite;flex-shrink:0}

        .vis-pills{display:flex;flex-direction:column;gap:10px}
        .vis-pill{display:flex;align-items:center;gap:16px;padding:16px;border-radius:20px;background:var(--surf);border:2px solid transparent;cursor:none;transition:all .3s var(--easing)}
        .vis-pill:hover{border-color:var(--coral-l);background:var(--white);box-shadow:0 4px 16px rgba(0,0,0,.03)}
        .vis-pill.picked{background:var(--coral-l);border-color:var(--coral)}
        .vis-pill input[type=radio]{display:none}
        .vis-ico{font-size:1.5rem;flex-shrink:0}
        .vis-text{flex:1}
        .vis-name{font-size:.95rem;font-weight:800;color:var(--txt)}
        .vis-desc{font-size:.75rem;color:var(--txt2);margin-top:2px;font-weight:600}
        .vis-check{width:24px;height:24px;border-radius:50%;border:2px solid var(--bdr);display:flex;align-items:center;justify-content:center;font-size:.8rem;color:#fff;transition:all .3s var(--easing);flex-shrink:0;background:var(--white)}
        .vis-pill.picked .vis-check{background:var(--coral);border-color:var(--coral)}

        .capsule-colors{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:16px}
        .cc-swatch{width:36px;height:36px;border-radius:50%;border:3px solid transparent;cursor:none;transition:all .25s var(--easing);position:relative;}
        .cc-swatch:hover{transform:scale(1.15);box-shadow:0 4px 12px rgba(0,0,0,.15)}
        .cc-swatch.picked{border-color:var(--txt);box-shadow:0 0 0 3px rgba(0,0,0,.12)}
        .cc-swatch::after{content:'✓';position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#fff;font-size:.75rem;font-weight:900;opacity:0;transition:opacity .2s}
        .cc-swatch.picked::after{opacity:1}

        .design-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(90px,1fr));gap:10px}
        .design-btn{padding:12px 8px;border-radius:16px;background:var(--surf);border:2px solid transparent;cursor:none;transition:all .3s var(--easing);text-align:center;font-family:'Nunito',sans-serif;font-size:.75rem;font-weight:700;color:var(--txt2);display:flex;flex-direction:column;align-items:center;gap:6px;}
        .design-btn:hover:not(.locked){background:var(--white);border-color:var(--coral-l);color:var(--coral);transform:translateY(-2px)}
        .design-btn.picked{background:var(--coral-l);border-color:var(--coral);color:var(--coral)}
        .design-btn.locked{opacity:.4;cursor:not-allowed;position:relative}
        .design-btn.locked::after{content:'🔒';font-size:.7rem;position:absolute;top:6px;right:6px}
        .design-ico{font-size:1.4rem}

        .drop-zone{border:2px dashed var(--bdr);border-radius:24px;padding:30px 20px;text-align:center;cursor:pointer;position:relative;background:var(--surf);transition:all .3s var(--easing);display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:160px;overflow:hidden}
        .drop-zone:hover,.drop-zone.over{border-color:var(--coral);background:var(--coral-l);transform:scale(1.01)}
        .drop-zone.has-cover{padding:0;border-color:transparent}
        .dz-content{position:relative;z-index:5;pointer-events:none}
        .dz-ico{font-size:2rem;margin-bottom:8px;display:block}
        .dz-title{font-size:.9rem;font-weight:800;color:var(--txt);margin-bottom:4px;transition:color .2s}
        .dz-sub{font-size:.75rem;color:var(--txt3);font-weight:600}
        .cover-preview-wrap{position:absolute;inset:0;display:none;width:100%;height:100%;z-index:5}
        .cover-preview-wrap.on{display:block}
        .cover-preview{width:100%;height:100%;object-fit:cover;display:block}
        .cover-rm{position:absolute;top:12px;right:12px;width:32px;height:32px;border-radius:50%;background:rgba(0,0,0,.6);backdrop-filter:blur(4px);border:none;color:#fff;font-size:1rem;cursor:none;display:flex;align-items:center;justify-content:center;transition:all .2s;z-index:20}
        .cover-rm:hover{background:var(--coral);transform:scale(1.1);box-shadow:0 4px 12px rgba(255,107,91,.4)}

        /* ── RIGHT PANEL (SCROLL & LAYOUT FIXED) ── */
        .r-panel{width:320px;min-width:320px;background:var(--coral);border-radius:28px;display:flex;flex-direction:column;box-shadow:0 16px 48px rgba(255,107,91,.3);flex-shrink:0;position:relative;transition:background .45s ease,box-shadow .45s ease; overflow:hidden;}
        .r-panel::before{content:'';position:absolute;inset:0;background:radial-gradient(circle at 80% 20%,rgba(255,255,255,.12) 0%,transparent 60%),radial-gradient(circle at 10% 80%,rgba(255,255,255,.08) 0%,transparent 50%);pointer-events:none;z-index:0}
        
        .rp-inner{
          position:relative;
          z-index:1;
          display:flex;
          flex-direction:column;
          flex:1;
          min-height:0; /* ITO YUNG NAGPA-SCROLL */
          padding:24px;
          overflow-y:auto;
          scrollbar-width:thin;
          scrollbar-color:rgba(255,255,255,.4) transparent;
        }
        .rp-inner::-webkit-scrollbar{width:6px}
        .rp-inner::-webkit-scrollbar-thumb{background:rgba(255,255,255,.4);border-radius:10px}

        .rp-header{font-family:'Sora',sans-serif;font-size:1rem;font-weight:800;color:#fff;margin-bottom:20px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
        .live-dot{width:8px;height:8px;background:#fff;border-radius:50%;animation:pulse 2s infinite}

        .preview-card{background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.25);border-radius:24px;padding:16px;backdrop-filter:blur(10px);width:100%;margin-bottom:20px;animation:fadeUp .5s .16s var(--easing) both;transition:box-shadow .4s ease;flex-shrink:0}
        .preview-cover-ph{width:100%;height:130px;background:rgba(255,255,255,.1);border-radius:16px;display:flex;align-items:center;justify-content:center;font-size:3rem;margin-bottom:14px}
        .preview-cover{width:100%;height:130px;object-fit:cover;border-radius:16px;margin-bottom:14px;display:none}
        .preview-capsule-dot{width:12px;height:12px;border-radius:50%;display:inline-block;margin-right:6px;vertical-align:middle;flex-shrink:0}
        .preview-mood{font-size:.7rem;font-weight:800;color:rgba(255,255,255,.9);text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px;display:flex;align-items:center}
        .preview-title{font-family:'Sora',sans-serif;font-size:1rem;font-weight:800;color:#fff;margin-bottom:8px;line-height:1.3}
        .preview-title.ph{color:rgba(255,255,255,.6);font-style:italic}
        .preview-story{font-size:.78rem;color:rgba(255,255,255,.85);display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;margin-bottom:14px;line-height:1.5;font-weight:600}
        .preview-story.ph{color:rgba(255,255,255,.5);font-style:italic}
        .preview-footer{display:flex;align-items:center;justify-content:space-between;border-top:1px solid rgba(255,255,255,.15);padding-top:12px}
        .preview-date{font-size:.68rem;color:#fff;font-weight:800}
        .preview-vis{font-size:.62rem;font-weight:800;padding:3px 9px;border-radius:100px;background:rgba(255,255,255,.2);color:#fff}

        /* ── STATS BOXES FIX (Ginawang divs para siguradong magpatong) ── */
        .rp-stat-row{display:flex;gap:10px;margin-bottom:24px;flex-shrink:0}
        .rp-mini-stat{
          flex:1;
          background:rgba(255,255,255,.15);
          border:1px solid rgba(255,255,255,.2);
          border-radius:14px;
          padding:12px 8px;
          text-align:center;
          display:flex;
          flex-direction:column;
          align-items:center;
          justify-content:center;
        }
        .rp-mini-val{font-family:'Sora',sans-serif;font-size:1.3rem;font-weight:900;color:#fff;line-height:1;margin-bottom:4px}
        .rp-mini-lbl{font-size:.6rem;font-weight:800;color:rgba(255,255,255,.8);text-transform:uppercase;letter-spacing:.05em}

        .submit-wrap{margin-top:auto;animation:fadeUp .5s .2s var(--easing) both;display:flex;flex-direction:column;gap:10px;flex-shrink:0}
        .btn-seal{width:100%;padding:16px;background:#fff;border:none;border-radius:100px;color:var(--coral);font-family:'Nunito',sans-serif;font-size:1rem;font-weight:900;cursor:none;display:flex;align-items:center;justify-content:center;gap:8px;box-shadow:0 8px 24px rgba(0,0,0,.15);transition:all .3s var(--easing)}
        .btn-seal:hover{transform:translateY(-4px);box-shadow:0 14px 32px rgba(0,0,0,.25)}
        .btn-seal.loading{opacity:.7;pointer-events:none}
        .btn-cancel-link{display:block;text-align:center;font-size:.78rem;font-weight:800;color:rgba(255,255,255,.75);text-decoration:none;transition:color .2s;padding:8px;border-radius:100px;border:1.5px solid transparent}
        .btn-cancel-link:hover{color:#fff;background:rgba(255,255,255,.12);border-color:rgba(255,255,255,.2)}

        #autosaveToast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(20px);background:var(--white);border:1.5px solid var(--coral-l);border-radius:100px;padding:8px 20px;font-size:.85rem;font-weight:800;color:var(--coral);box-shadow:0 12px 30px rgba(255,107,91,.15);display:flex;align-items:center;gap:8px;opacity:0;pointer-events:none;z-index:1000;transition:all .4s var(--easing)}
        #autosaveToast.on{opacity:1;transform:translateX(-50%) translateY(0)}

        @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.5);opacity:.5}}
        @media(max-width:1000px){.r-panel{display:none}}
        @media(max-width:700px){.l-sidebar{display:none}.root{padding:8px;gap:8px}.mc-body{padding:20px}}
      `}</style>

      <div id="cur-dot" ref={dotRef}></div>
      <div id="cur-ring" ref={ringRef}></div>
      <div id="autosaveToast" className={toastMsg ? 'on' : ''}>{toastMsg}</div>

      <div className="root">
        {/* ════ SIDEBAR ════ */}
        <aside className={`l-sidebar ${lsbExp ? 'wide' : ''}`} id="lsb">
          <div className="ls-top">
            <button className="ls-hamburger" onClick={() => setLsbExp(!lsbExp)}>{lsbExp ? '✕' : '☰'}</button>
            <span className="ls-brand">TimeVaulth</span>
          </div>
          <nav className="ls-nav">
            <span className="ls-section">Main</span>
            <Link to="/dashboard" className="ls-icon" data-t="Dashboard">🏠<span className="ls-lbl">Dashboard</span></Link>
            <Link to="/my-vaults" className="ls-icon" data-t="My Vaults">🛡️<span className="ls-lbl">My Vaults</span></Link>
            <Link to="/seal-vault" className="ls-icon on" data-t="Seal Vault">➕<span className="ls-lbl">Seal Vault</span></Link>
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
                <div style={{width:'100%',height:'100%',borderRadius:'50%',background:'linear-gradient(135deg,var(--coral),#FF9A8B)',display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden'}}>
                  {user?.avatar_path ? <img src={`https://your-supabase-url/storage/v1/object/public/${user.avatar_path}`} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/> : ai(usernameShort)}
                </div>
              </div>
              <div className="ls-selfinfo">
                <span className="ls-selfname">{usernameShort}</span>
                <span className="ls-selfrole">✨ New Draft</span>
              </div>
            </Link>
          </div>
        </aside>

        {/* ════ MAIN CARD ════ */}
        <div className="main-card">
          <div className="mc-top">
            <div className="mc-title">✨ New Draft</div>
            <div className="mc-spacer"></div>
            <Link to="/my-vaults" className="mc-btn" title="My Vaults">📂</Link>
            <Link to="/dashboard" className="mc-user">
              <div className="mc-uav" style={{ background: myBrd, padding: '2.5px' }}>
                <div style={{width:'100%',height:'100%',borderRadius:'50%',background:'linear-gradient(135deg,var(--coral),#FF9A8B)',display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden'}}>
                  {user?.avatar_path ? <img src={`https://your-supabase-url/storage/v1/object/public/${user.avatar_path}`} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/> : ai(usernameShort)}
                </div>
              </div>
              <span className="mc-uname">Dashboard</span>
            </Link>
          </div>

          <div className="mc-body">
            
            {/* Progress Strip */}
            <div className="progress-strip">
              <span className="ps-label">Vault Ready</span>
              <div className="ps-track"><div className="ps-fill" style={{ width: `${progress}%` }}></div></div>
              <span className="ps-pct">{progress}%</span>
              <div className="ps-dots">
                <div className={`ps-dot ${vault.title ? 'on' : ''}`}></div>
                <div className={`ps-dot ${vault.story ? 'on' : ''}`}></div>
                <div className={`ps-dot ${vault.unlock_date ? 'on' : ''}`}></div>
                <div className={`ps-dot ${coverPreview ? 'on' : ''}`}></div>
                <div className={`ps-dot ${vault.target_lat && vault.target_lng ? 'on' : ''}`}></div>
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              {/* STEP 1 */}
              <div className="v-card">
                <div className="v-card-header"><div className="v-card-title">📝 Basic Info</div><span className="v-card-step">Step 1</span></div>
                <div className="fg">
                  <div className="fg-row"><label className="fg-label">Title <span className="fg-req">*</span></label><span className={`fg-count ${vault.title.length > 90 ? 'warn' : ''}`}>{vault.title.length} / 100</span></div>
                  <input className="finput" type="text" name="title" maxLength="100" required placeholder="Name this memory..." value={vault.title} onChange={handleChange} />
                </div>
                <div className="fg">
                  <div className="fg-row"><label className="fg-label">Story / Message</label><span className="fg-hint">optional but meaningful</span></div>
                  <textarea className="ftextarea" name="story" maxLength="2000" placeholder="Write what this memory means to you..." value={vault.story} onChange={handleChange}></textarea>
                  <div className="fg-footer">
                    <span className="fg-words">{vault.story.split(/\s+/).filter(Boolean).length} words</span>
                    <span className={`fg-count ${vault.story.length > 1800 ? 'warn' : ''}`}>{vault.story.length} / 2000</span>
                  </div>
                </div>
                <div className="fg">
                  <div className="fg-row"><label className="fg-label">Mood</label></div>
                  <div className="mood-grid">
                    {Object.keys(moodIco).map(m => (
                      <button key={m} type="button" className={`mood-btn ${vault.mood === m ? 'picked' : ''}`} onClick={() => setVault({...vault, mood: m})}>
                        {moodIco[m]}<br/>{m}
                      </button>
                    ))}
                  </div>
                  <div className="mood-tip"><span>💡</span><span>{moodTips[vault.mood]}</span></div>
                </div>
              </div>

              {/* STEP 2 */}
              <div className="v-card" style={{animationDelay:'.08s'}}>
                <div className="v-card-header"><div className="v-card-title">⏰ Time Lock</div><span className="v-card-step">Step 2</span></div>
                <div className="fg">
                  <div className="fg-row"><label className="fg-label">Unlock Date & Time <span className="fg-req">*</span></label></div>
                  <div className="shortcuts">
                    <button type="button" className="sc-btn" onClick={() => handleShortcut('1d')}>+1 Day</button>
                    <button type="button" className="sc-btn" onClick={() => handleShortcut('1w')}>+1 Week</button>
                    <button type="button" className="sc-btn" onClick={() => handleShortcut('1m')}>+1 Month</button>
                    <button type="button" className="sc-btn" onClick={() => handleShortcut('6m')}>+6 Months</button>
                    <button type="button" className="sc-btn" onClick={() => handleShortcut('1y')}>+1 Year</button>
                  </div>
                  <input className="finput" type="datetime-local" name="unlock_date" required value={vault.unlock_date} onChange={handleChange} />
                  <div className={`countdown ${cd ? 'on' : ''}`}>
                    <span className="cd-dot"></span>
                    <span>{cd ? (cd.d > 0 ? `Opens in ${cd.d}d ${cd.h}h ${cd.m}m` : `Opens in ${cd.h}h ${cd.m}m`) : 'Opens in...'}</span>
                  </div>
                </div>
              </div>

              {/* STEP 3 */}
              <div className="v-card" style={{animationDelay:'.12s'}}>
                <div className="v-card-header"><div className="v-card-title">👁️ Visibility</div><span className="v-card-step">Step 3</span></div>
                <div className="vis-pills">
                  {[
                    ['private', '🔒', 'Private', 'Only visible to you. No collaborators or recipients allowed.'],
                    ['friends', '👥', 'Friends', 'Visible to friends and recipients you choose.'],
                    ['public', '🌍', 'Public', 'Appears on the global feed once opened.']
                  ].map(([val, ico, name, desc]) => (
                    <div key={val} className={`vis-pill ${vault.visibility === val ? 'picked' : ''}`} onClick={() => setVault({...vault, visibility: val})}>
                      <span className="vis-ico">{ico}</span>
                      <div className="vis-text"><div className="vis-name">{name}</div><div className="vis-desc">{desc}</div></div>
                      <div className="vis-check">{vault.visibility === val ? '✓' : ''}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* STEP 4 */}
              <div className="v-card" style={{animationDelay:'.16s'}}>
                <div className="v-card-header"><div className="v-card-title">🎨 Capsule Style</div><span className="v-card-step">Step 4</span></div>
                <div className="fg">
                  <div className="fg-row"><label className="fg-label">Capsule Color</label></div>
                  <div className="capsule-colors">
                    {capsuleColors.map(clr => (
                      <div key={clr} className={`cc-swatch ${vault.capsule_color === clr ? 'picked' : ''}`} style={{background: clr}} onClick={() => setVault({...vault, capsule_color: clr})}></div>
                    ))}
                  </div>
                </div>
                <div className="fg">
                  <div className="fg-row"><label className="fg-label">Capsule Design</label></div>
                  <div className="design-grid">
                    {allDesigns.map(d => {
                      const unlocked = d.tiers.includes(user?.subscription_tier || 'standard');
                      return (
                        <button key={d.id} type="button" disabled={!unlocked} className={`design-btn ${!unlocked ? 'locked' : ''} ${vault.capsule_design === d.id && unlocked ? 'picked' : ''}`} onClick={() => setVault({...vault, capsule_design: d.id})}>
                          <span className="design-ico">{d.ico}</span>
                          {d.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* STEP 5 */}
              <div className="v-card" style={{animationDelay:'.20s'}}>
                <div className="v-card-header"><div className="v-card-title">🖼️ Cover Photo</div><span className="v-card-step">Step 5</span></div>
                <div className={`drop-zone ${coverPreview ? 'has-cover' : ''} ${isHoveringCover ? 'over' : ''}`} 
                     onClick={() => !coverPreview && coverInputRef.current.click()}
                     onDragOver={(e) => { e.preventDefault(); setIsHoveringCover(true); }}
                     onDragLeave={() => setIsHoveringCover(false)}
                     onDrop={(e) => { e.preventDefault(); setIsHoveringCover(false); if(e.dataTransfer.files[0]){ setCoverFile(e.dataTransfer.files[0]); setCoverPreview(URL.createObjectURL(e.dataTransfer.files[0])); } }}>
                  
                  <input type="file" ref={coverInputRef} accept="image/*" style={{display:'none'}} onChange={handleCoverSelect} />
                  
                  {!coverPreview && (
                    <div className="dz-content">
                      <span className="dz-ico">🖼️</span>
                      <div className="dz-title">Click or drop an image</div>
                      <div className="dz-sub">JPG · PNG · WEBP</div>
                    </div>
                  )}
                  {coverPreview && (
                    <div className="cover-preview-wrap on">
                      <img className="cover-preview" src={coverPreview} alt="Cover" />
                      <button type="button" className="cover-rm" onClick={(e) => { e.stopPropagation(); setCoverFile(null); setCoverPreview(null); }}>✕</button>
                    </div>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* ════ RIGHT PANEL ════ */}
        <div className="r-panel" style={{ background: rPanelGrad }}>
          <div className="rp-inner">
            <div className="rp-header"><span>👁 Live Preview</span><span className="live-dot"></span></div>

            <div className="preview-card">
              {coverPreview ? <img className="preview-cover" src={coverPreview} alt="" style={{display:'block'}} /> : <div className="preview-cover-ph">🛡️</div>}
              <div className="preview-mood">
                <span className="preview-capsule-dot" style={{background: vault.capsule_color}}></span>
                {moodIco[vault.mood]} {vault.mood}
              </div>
              <div className={`preview-title ${vault.title ? '' : 'ph'}`}>{vault.title || 'Your vault title...'}</div>
              <div className={`preview-story ${vault.story ? '' : 'ph'}`}>{vault.story || 'Your story will appear here...'}</div>
              <div className="preview-footer">
                <span className="preview-date">{vault.unlock_date ? `🔒 Opens ${new Date(vault.unlock_date).toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric'})}` : '🔒 Set an unlock date'}</span>
                <span className="preview-vis">
                  {vault.visibility === 'public' ? '🌍 Public' : vault.visibility === 'friends' ? '👥 Friends' : '🔒 Private'}
                </span>
              </div>
            </div>

            {/* FIX: GINAWANG DIV ANG LAMAN PARA SAPILITANG MAGPATONG */}
            <div className="rp-stat-row">
              <div className="rp-mini-stat">
                <div className="rp-mini-val">0</div>
                <div className="rp-mini-lbl">Collabs</div>
              </div>
              <div className="rp-mini-stat">
                <div className="rp-mini-val">0</div>
                <div className="rp-mini-lbl">Recipients</div>
              </div>
              <div className="rp-mini-stat">
                <div className="rp-mini-val">0</div>
                <div className="rp-mini-lbl">Files</div>
              </div>
            </div>

            <div className="submit-wrap">
              <button type="submit" onClick={handleSubmit} className={`btn-seal ${submitting ? 'loading' : ''}`}>
                {submitting ? '⏳ Processing...' : '✨ Create Draft'}
              </button>
              <Link to="/my-vaults" className="btn-cancel-link">← Back to My Vaults</Link>
            </div>
          </div>
        </div>

      </div>
    </>
  );
}
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../config/supabaseClient';

// ─── EXACT PHP HELPERS & ARRAYS ───
const ai = (n) => (n ? n.substring(0, 2).toUpperCase() : 'U');

const BORDER_CSS = {
  'border-none': 'linear-gradient(135deg,#FF6B5B,#FF9A8B)',
  'border-gold': 'linear-gradient(135deg,#FFD700,#FFA500)',
  'border-teal': 'linear-gradient(135deg,#00E5B0,#00B4D8)',
  'border-pink': 'linear-gradient(135deg,#FF1493,#FF69B4)',
  'border-purple': 'linear-gradient(135deg,#8B00FF,#9B59B6)',
  'border-rainbow': 'linear-gradient(135deg,#FF6B5B,#FFD700,#00E5B0,#8B00FF,#FF1493)',
  'border-fire': 'linear-gradient(135deg,#FF4500,#FF8C00,#FFD700)'
};

const all_designs = {
  'default': { label: 'Classic', ico: '🛡️', tiers: ['standard', 'pro', 'ultra'] },
  'classic': { label: 'Vintage', ico: '📜', tiers: ['pro', 'ultra'] },
  'pastel': { label: 'Pastel', ico: '🌸', tiers: ['pro', 'ultra'] },
  'midnight': { label: 'Midnight', ico: '🌙', tiers: ['pro', 'ultra'] },
  'aurora': { label: 'Aurora', ico: '🌌', tiers: ['ultra'] },
  'obsidian': { label: 'Obsidian', ico: '🖤', tiers: ['ultra'] },
  'sakura': { label: 'Sakura', ico: '🌺', tiers: ['ultra'] }
};

const capsuleColors = ['#FF6B5B','#F5A623','#1D9E75','#5B8AF5','#9B59B6','#E91E8C','#00BCD4','#FF5722','#607D8B','#222222'];
const moodIco = { Happy: '😊', Sad: '😢', Excited: '🎉', Nostalgic: '🥹', Hopeful: '✨', Angry: '😤' };
const moodTips = {
  Happy: '😊 Capture what made today special.', Sad: '😢 Even hard moments deserve remembering.',
  Excited: '🎉 Channel that energy!', Nostalgic: '🥹 Future you will thank you.',
  Hopeful: '✨ Write your hopes for the future.', Angry: '😤 Sometimes we need to vent.'
};
const EXT_ICONS = { PDF: '📄', MP4: '🎬', MOV: '🎬', MP3: '🎵', WAV: '🎵', TXT: '📝', DOC: '📝', DOCX: '📝' };

function capsuleGradient(color = '#FF6B5B', design = 'default') {
  const hex = (color || '#FF6B5B').replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16) || 255;
  const g = parseInt(hex.substring(2, 4), 16) || 107;
  const b = parseInt(hex.substring(4, 6), 16) || 91;
  const dr = '#' + [r, g, b].map(c => Math.max(0, Math.floor(c * 0.6)).toString(16).padStart(2, '0')).join('');
  const grads = {
    default: `linear-gradient(135deg, #${hex} 0%, ${dr} 100%)`,
    classic: `linear-gradient(145deg, #f5e6c8 0%, #${hex}88 60%, ${dr}cc 100%)`,
    pastel: `linear-gradient(135deg, #${hex}66 0%, #fff4f4 60%, #${hex}44 100%)`,
    midnight: `linear-gradient(145deg, #0f0f1a 0%, #${hex}99 50%, #1a1a2e 100%)`,
    aurora: `linear-gradient(135deg, #${hex} 0%, #7c3aedaa 50%, ${dr} 100%)`,
    obsidian: `linear-gradient(145deg, #111111 0%, #${hex}77 60%, #1a1a1a 100%)`,
    sakura: `linear-gradient(135deg, #${hex}88 0%, #fce4ec 50%, #${hex}55 100%)`,
  };
  return grads[design] || grads.default;
}

export default function VaultForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('id');

  const dotRef = useRef(null);
  const ringRef = useRef(null);
  const coverInputRef = useRef(null);
  const filesInputRef = useRef(null);

  // ─── STATE ───
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState(null);
  const [lsbExp, setLsbExp] = useState(localStorage.getItem('lsb-exp') === '1');
  const [toastMsg, setToastMsg] = useState(null);
  
  const [mode, setMode] = useState(editId ? 'draft' : 'create');
  const [vaultCount, setVaultCount] = useState(0);
  
  // Form Data
  const [vault, setVault] = useState({
    id: 0, title: '', story: '', mood: 'Happy', unlock_date: '', visibility: 'private',
    capsule_color: '#FF6B5B', capsule_design: 'default', target_lat: searchParams.get('lat') || '', target_lng: searchParams.get('lng') || '',
    cover_path: '', status: '', sealed_at: null
  });
  
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [vaultFiles, setVaultFiles] = useState([]);
  const [existingFiles, setExistingFiles] = useState([]);
  
  const [collaborators, setCollaborators] = useState([]);
  const [recipients, setRecipients] = useState([]);
  const [collabSearch, setCollabSearch] = useState('');
  const [recipSearch, setRecipSearch] = useState('');
  const [collabResults, setCollabResults] = useState([]);
  const [recipResults, setRecipResults] = useState([]);

  const [progress, setProgress] = useState(0);
  const [cd, setCd] = useState(null);
  const [graceLeft, setGraceLeft] = useState('');

  const draftKey = `vaultDraft_${editId || 'new'}`;

  const showToast = (msg, type = 'teal') => {
    setToastMsg([msg, type]);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // ─── DATA FETCHING ───
  useEffect(() => {
    const fetchData = async () => {
      const uid = localStorage.getItem('user_id');
      if (!uid) { navigate('/login'); return; }
      
      try {
        const { data: uData } = await supabase.from('users').select('*').eq('id', uid).single();
        setUser(uData);

        const { count } = await supabase.from('vaults').select('*', { count: 'exact', head: true }).eq('user_id', uid).eq('is_archived', false);
        setVaultCount(count || 0);

        if (editId) {
          const { data: vData } = await supabase.from('vaults').select('*').eq('id', editId).single();
          if (vData) {
            setVault(v => ({ ...v, ...vData, target_lat: searchParams.get('lat') || vData.target_lat, target_lng: searchParams.get('lng') || vData.target_lng }));
            
            const isCreator = vData.user_id === uid;
            const vaultOpen = new Date(vData.unlock_date).getTime() <= Date.now();
            const inGrace = vData.status === 'sealed' && vData.sealed_at && (Date.now() <= new Date(vData.sealed_at).getTime() + (24 * 3600000));

            if (vaultOpen || vData.status === 'opened') { navigate(`/vault/${editId}`); return; }
            else if (vData.status === 'draft') setMode(isCreator ? 'draft' : 'collaborator');
            else if (vData.status === 'sealed') {
              if (isCreator && inGrace) setMode('grace');
              else { navigate('/my-vaults?tab=sealed'); return; }
            }

            // Fetch existing files
            const { data: fData } = await supabase.from('vault_files').select('*, users(username)').eq('vault_id', editId);
            if (fData) setExistingFiles(fData.map(f => ({ ...f, uploader_name: f.users?.username })));

            // Fetch collaborators/recipients
            if (isCreator) {
              const { data: cData } = await supabase.from('vault_collaborators').select('*, users(username, avatar_path)').eq('vault_id', editId);
              if (cData) setCollaborators(cData.map(c => ({ user_id: c.user_id, username: c.users.username, avatar_path: c.users.avatar_path })));
              
              const { data: rData } = await supabase.from('vault_recipients').select('*, users(username, avatar_path)').eq('vault_id', editId);
              if (rData) setRecipients(rData.map(r => ({ user_id: r.user_id, username: r.users.username, avatar_path: r.users.avatar_path })));
            }
          }
        } else {
          // Load local draft
          const saved = localStorage.getItem(draftKey);
          if (saved) { try { setVault(v => ({...v, ...JSON.parse(saved)})); } catch(e){} }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [editId, navigate, draftKey, searchParams]);

  // ─── CURSOR & AUTOSAVE ───
  useEffect(() => {
    if (loading) return;
    let mx = 0, my = 0, rx = 0, ry = 0, reqId;
    const handleMouseMove = (e) => { mx = e.clientX; my = e.clientY; if(dotRef.current){dotRef.current.style.left=mx+'px';dotRef.current.style.top=my+'px'} };
    const animateCursor = () => { rx += (mx - rx) * 0.13; ry += (my - ry) * 0.13; if(ringRef.current){ringRef.current.style.left=rx+'px';ringRef.current.style.top=ry+'px'} reqId=requestAnimationFrame(animateCursor); };
    window.addEventListener('mousemove', handleMouseMove); animateCursor();
    return () => { window.removeEventListener('mousemove', handleMouseMove); cancelAnimationFrame(reqId); };
  }, [loading]);

  useEffect(() => {
    if (loading) return;
    const checks = [ (vault.title || '').trim().length > 0, (vault.story || '').trim().length > 0, vault.unlock_date !== '', coverPreview || vault.cover_path, (vault.target_lat && vault.target_lng) ];
    setProgress(Math.round((checks.filter(Boolean).length / checks.length) * 100));

    const tmr = setTimeout(() => { localStorage.setItem(draftKey, JSON.stringify(vault)); }, 1500);
    return () => clearTimeout(tmr);
  }, [vault, coverPreview, loading, draftKey]);

  // ─── TIMERS ───
  useEffect(() => {
    const tick = () => {
      if (vault.unlock_date) {
        const diff = Math.max(0, Math.floor((new Date(vault.unlock_date).getTime() - Date.now()) / 1000));
        setCd(diff > 0 ? { d: Math.floor(diff/86400), h: Math.floor((diff%86400)/3600), m: Math.floor((diff%3600)/60), s: diff%60 } : null);
      }
      if (mode === 'grace' && vault.sealed_at) {
        const dl = new Date(vault.sealed_at).getTime() + (24*3600000);
        const left = Math.floor((dl - Date.now())/1000);
        if (left > 0) {
          setGraceLeft(left > 3600 ? `${Math.floor(left/3600)}h ${Math.floor((left%3600)/60)}m left` : `${Math.floor(left/60)}m left`);
        } else {
          setGraceLeft('Expired');
        }
      }
    };
    tick(); const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [vault.unlock_date, vault.sealed_at, mode]);

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
      setCoverFile(e.target.files[0]);
      setCoverPreview(URL.createObjectURL(e.target.files[0]));
      setVault({...vault, cover_path: ''}); // clear existing visual path
    }
  };

  const handleFilesSelect = (e) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).map(f => ({ file: f, preview: f.type.startsWith('image/') ? URL.createObjectURL(f) : null, name: f.name, type: f.type }));
      setVaultFiles([...vaultFiles, ...newFiles]);
    }
  };

  const removeFile = (idx) => setVaultFiles(vaultFiles.filter((_, i) => i !== idx));

  const removeExistingFile = async (fileId) => {
    if(!window.confirm('Remove this file?')) return;
    try {
      await supabase.from('vault_files').delete().eq('id', fileId);
      setExistingFiles(existingFiles.filter(f => f.id !== fileId));
      showToast('🗑️ File removed.', 'pink');
    } catch(e) { console.error(e); }
  };

  const searchFriends = async (query, type) => {
    if (!query) { type === 'collab' ? setCollabResults([]) : setRecipResults([]); return; }
    // Fetch from Supabase (mocking the friendship logic for UI)
    const { data } = await supabase.from('users').select('id, username, avatar_path').ilike('username', `%${query}%`).neq('id', user.id).limit(5);
    type === 'collab' ? setCollabResults(data || []) : setRecipResults(data || []);
  };

  const handleSubmit = async (e, actionType = 'save') => {
    e.preventDefault();
    if (submitting) return;
    
    // Safety Check: Siguraduhin nating may user session
    const uid = localStorage.getItem('user_id');
    if (!uid) {
      alert("Error: No user session found. Please login again.");
      navigate('/login');
      return;
    }

    setSubmitting(true);
    
    try {
      let finalCoverPath = vault.cover_path;
      if (coverFile) {
        const fileExt = coverFile.name.split('.').pop();
        const fileName = `${Date.now()}_cover_${uid}.${fileExt}`;
        finalCoverPath = `uploads/${fileName}`;
        const { error: uploadError } = await supabase.storage.from('vault_assets').upload(finalCoverPath, coverFile);
        if (uploadError) throw uploadError;
      }

      // 1. I-prepare ang data object
      const vaultData = {
        user_id: uid, // Laging ipasa ang UID
        title: vault.title || 'Untitled Vault',
        story: vault.story || '',
        mood: vault.mood || 'Happy',
        unlock_date: vault.unlock_date,
        visibility: vault.visibility || 'private',
        capsule_color: vault.capsule_color || '#FF6B5B',
        capsule_design: vault.capsule_design || 'default',
        cover_path: finalCoverPath,
        target_lat: vault.target_lat ? parseFloat(vault.target_lat) : null,
        target_lng: vault.target_lng ? parseFloat(vault.target_lng) : null
      };

      // 2. I-set ang status base sa action
      if (actionType === 'seal') {
        vaultData.status = 'sealed';
        vaultData.sealed_at = new Date().toISOString();
      } else {
        vaultData.status = 'draft';
      }

      console.log("Attempting to save vault with data:", vaultData);

      let newVaultId = editId;

      if (editId) {
        // UPDATE EXISTING
        const { error: updateError } = await supabase
          .from('vaults')
          .update(vaultData)
          .eq('id', editId);
        if (updateError) throw updateError;
      } else {
        // INSERT NEW
        const { data: insertedData, error: insertError } = await supabase
          .from('vaults')
          .insert([vaultData])
          .select()
          .single();
        
        if (insertError) {
          console.error("Supabase Insert Error Detail:", insertError);
          throw insertError;
        }
        newVaultId = insertedData.id;
      }

      // 3. Handle File Uploads (Optional files)
      if (vaultFiles.length > 0) {
        for (const vf of vaultFiles) {
          const fp = `uploads/${Date.now()}_${vf.name}`;
          await supabase.storage.from('vault_assets').upload(fp, vf.file);
          await supabase.from('vault_files').insert([{ 
            vault_id: newVaultId, 
            file_name: vf.name, 
            file_path: fp, 
            uploaded_by: uid 
          }]);
        }
      }

      // 4. Handle Collaborators & Recipients
      if (is_creator) {
        await supabase.from('vault_collaborators').delete().eq('vault_id', newVaultId);
        if (collaborators.length > 0) {
          await supabase.from('vault_collaborators').insert(collaborators.map(c => ({ vault_id: newVaultId, user_id: c.user_id })));
        }
        await supabase.from('vault_recipients').delete().eq('vault_id', newVaultId);
        if (recipients.length > 0) {
          await supabase.from('vault_recipients').insert(recipients.map(r => ({ vault_id: newVaultId, user_id: r.user_id })));
        }
      }

      localStorage.removeItem(draftKey);
      showToast(actionType === 'seal' ? '🔒 Vault Sealed!' : '💾 Draft Saved!');
      navigate('/my-vaults');

    } catch (err) {
      console.error("Final Catch Error:", err);
      alert("Error: " + (err.message || "Unknown database error"));
    } finally {
      setSubmitting(false);
    }
  };

  // ─── LOADING SCREEN (PREVENTS WHITE SCREEN) ───
  if (loading) {
    return (
      <div style={{ height: '100vh', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#FFF0ED', color: '#FF6B5B', fontFamily: '"Sora", sans-serif' }}>
        <style>{`@keyframes pulseLoad { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.1); opacity: 0.7; } }`}</style>
        <div style={{ fontSize: '4rem', marginBottom: '1rem', animation: 'pulseLoad 1.5s ease-in-out infinite' }}>⏳</div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Preparing Vault Editor...</h2>
      </div>
    );
  }

  // ─── RENDER VARS ───
  const myBrd = BORDER_CSS[user?.equipped_border] || BORDER_CSS['border-none'];
  const usernameShort = user?.username ? user.username.split('@')[0] : 'User';
  const tier = user?.subscription_tier || 'standard';
  
  const vault_limit = tier === 'ultra' ? 999999 : (tier === 'pro' ? 50 : 10);
  const pip_max = Math.min(vault_limit === 999999 ? 10 : vault_limit, 10);
  const pip_used = vault_limit === 999999 ? 0 : Math.min(vaultCount, pip_max);
  const bar_cls = vaultCount >= vault_limit ? 'full' : (vaultCount / Math.max(vault_limit, 1) >= .75 ? 'warn' : '');

  const phase_label = mode === 'create' ? ['✨ New Draft', 'Creating a new vault draft'] : 
                      mode === 'draft' ? ['✏️ Edit Draft', 'Draft — not sealed yet'] : 
                      mode === 'grace' ? ['⏳ Grace Period Edit', '24hr edit window — seals soon'] : 
                      ['🤝 Collaborator View', 'You were invited to upload files'];

  const is_creator = mode !== 'collaborator';
  const is_draft_mode = ['draft', 'collaborator'].includes(mode);
  const rPanelGrad = capsuleGradient(vault.capsule_color, vault.capsule_design);

  return (
    <>
      {/* 100% EXACT CSS FROM YOUR ORIGINAL PHP */}
      <style>{`
        /* REACT VITE FIX: Ensures .root works exactly as it did in PHP */
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
        .ls-selfinfo{overflow:hidden;opacity:0;max-width:0;transition:opacity .2s .05s,max-width .3s var(--easing)}
        .l-sidebar.wide .ls-selfinfo{opacity:1;max-width:130px}
        .ls-selfname{font-size:.76rem;font-weight:800;color:var(--txt);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block}
        .ls-selfrole{font-size:.6rem;color:var(--txt3);display:block;white-space:nowrap}

        /* ── MAIN CARD ── */
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

        /* ── PHASE BANNER ── */
        .phase-banner{display:flex;align-items:center;gap:12px;padding:14px 18px;border-radius:18px;margin-bottom:20px;animation:fadeUp .4s var(--easing) both;}
        .phase-banner.draft{background:rgba(29,158,117,.08);border:1.5px solid rgba(29,158,117,.2)}
        .phase-banner.grace{background:rgba(245,166,35,.1);border:1.5px solid rgba(245,166,35,.3)}
        .phase-banner.collaborator{background:rgba(91,138,245,.08);border:1.5px solid rgba(91,138,245,.2)}
        .phase-ico{font-size:1.4rem;flex-shrink:0}
        .phase-info{flex:1}
        .phase-name{font-family:'Sora',sans-serif;font-size:.88rem;font-weight:800;color:var(--txt)}
        .phase-sub{font-size:.72rem;color:var(--txt2);font-weight:600;margin-top:2px}
        .phase-tag{font-size:.65rem;font-weight:800;padding:4px 10px;border-radius:100px;white-space:nowrap}
        .phase-tag.draft{background:var(--teal-l);color:var(--teal)}
        .phase-tag.grace{background:rgba(245,166,35,.15);color:#9A6900}
        .phase-tag.collaborator{background:rgba(91,138,245,.12);color:#3B5FD9}

        /* ── PROGRESS STRIP ── */
        .progress-strip{display:flex;align-items:center;gap:1rem;padding:16px 20px;background:var(--surf);border-radius:20px;margin-bottom:24px;border:1.5px solid var(--bdr)}
        .ps-label{font-size:.75rem;font-weight:800;color:var(--txt2);text-transform:uppercase;letter-spacing:.08em;white-space:nowrap}
        .ps-track{flex:1;height:6px;background:rgba(0,0,0,.05);border-radius:100px;overflow:hidden}
        .ps-fill{height:100%;background:var(--coral);border-radius:100px;width:0%;transition:width .45s var(--easing)}
        .ps-pct{font-size:.8rem;font-weight:800;color:var(--coral);min-width:36px;text-align:right}
        .ps-dots{display:flex;gap:6px}
        .ps-dot{width:10px;height:10px;border-radius:50%;background:var(--bdr);transition:all .3s var(--easing)}
        .ps-dot.on{background:var(--coral);box-shadow:0 0 0 3px var(--coral-l)}

        /* ── ALERTS ── */
        .alert{display:flex;align-items:center;gap:.55rem;padding:1rem 1.2rem;border-radius:16px;font-size:.85rem;font-weight:700;margin-bottom:1.5rem}
        .alert-red{background:var(--coral-l);border:1px solid rgba(255,107,91,.2);color:var(--coral-d)}
        .alert-teal{background:var(--teal-l);border:1px solid rgba(29,158,117,.2);color:var(--teal)}
        .alert-gold{background:rgba(245,166,35,.15);border:1px solid rgba(245,166,35,.3);color:#B87900}

        /* ── FORM CARDS ── */
        .v-card{background:var(--white);border:1.5px solid var(--bdr);border-radius:24px;padding:24px;margin-bottom:20px;box-shadow:0 4px 16px rgba(0,0,0,.02);transition:all .3s var(--easing);animation:fadeUp .45s var(--easing) both}
        .v-card:hover{border-color:rgba(255,107,91,.3);box-shadow:0 8px 30px rgba(255,107,91,.08)}
        .v-card-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px}
        .v-card-title{font-family:'Sora',sans-serif;font-size:1.05rem;font-weight:800;color:var(--txt);display:flex;align-items:center;gap:8px}
        .v-card-step{font-size:.65rem;font-weight:800;padding:4px 10px;border-radius:100px;background:var(--surf);color:var(--txt2);border:1px solid var(--bdr)}

        /* ── INPUTS ── */
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

        /* ── MOOD ── */
        .mood-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(100px,1fr));gap:10px}
        .mood-btn{padding:12px;border-radius:16px;background:var(--surf);border:2px solid transparent;color:var(--txt2);font-size:.85rem;font-weight:700;cursor:none;transition:all .3s var(--easing);text-align:center;font-family:'Nunito',sans-serif}
        .mood-btn:hover{background:var(--white);border-color:var(--coral-l);color:var(--coral);transform:translateY(-2px);box-shadow:0 4px 12px rgba(255,107,91,.1)}
        .mood-btn.picked{background:var(--coral-l);border-color:var(--coral);color:var(--coral)}
        .mood-tip{margin-top:12px;padding:12px 16px;background:var(--surf);border:1px solid var(--bdr);border-radius:14px;font-size:.8rem;color:var(--txt2);display:flex;align-items:flex-start;gap:8px;font-weight:600}

        /* ── DATE SHORTCUTS ── */
        .shortcuts{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px}
        .sc-btn{padding:6px 14px;background:var(--surf);border:1.5px solid transparent;border-radius:10px;color:var(--txt2);font-size:.75rem;font-weight:700;cursor:none;transition:all .2s;font-family:'Nunito',sans-serif}
        .sc-btn:hover{background:var(--coral-l);border-color:var(--coral);color:var(--coral);transform:translateY(-2px)}
        .countdown{display:none;align-items:center;gap:8px;margin-top:10px;padding:10px 16px;background:var(--teal-l);border:1px solid rgba(29,158,117,.2);border-radius:14px;font-size:.8rem;font-weight:800;color:var(--teal)}
        .countdown.on{display:flex}
        .cd-dot{width:8px;height:8px;background:var(--teal);border-radius:50%;animation:pulse 2s infinite;flex-shrink:0}

        /* ── LOCATION ── */
        .loc-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 16px;background:var(--surf);border:1.5px solid var(--bdr);border-radius:16px;font-size:.85rem}
        .loc-coords{color:var(--teal);font-weight:800}
        .loc-none{color:var(--txt3);font-weight:700}
        .loc-link{font-size:.75rem;font-weight:800;color:var(--coral);text-decoration:none;padding:6px 12px;border-radius:10px;background:var(--coral-l);transition:all .2s;cursor:none}
        .loc-link:hover{background:var(--coral);color:#fff;transform:translateY(-2px)}

        /* ── VISIBILITY ── */
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

        /* ── SLOT BAR ── */
        .slot-bar{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;margin-bottom:16px;background:var(--surf);border:1.5px solid var(--bdr);border-radius:16px;font-size:.8rem;font-weight:700;color:var(--txt2)}
        .slot-bar.warn{background:rgba(245,166,35,.1);border-color:rgba(245,166,35,.3);color:#A06A00}
        .slot-bar.full{background:var(--coral-l);border-color:rgba(255,107,91,.3);color:var(--coral-d)}
        .slot-pips{display:flex;gap:4px}
        .slot-pip{width:10px;height:8px;border-radius:3px;background:var(--coral)}
        .slot-pip.empty{background:var(--bdr)}

        /* ── CAPSULE COSMETICS ── */
        .capsule-colors{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:16px}
        .cc-swatch{
          width:36px;height:36px;border-radius:50%;border:3px solid transparent;
          cursor:none;transition:all .25s var(--easing);position:relative;
        }
        .cc-swatch:hover{transform:scale(1.15);box-shadow:0 4px 12px rgba(0,0,0,.15)}
        .cc-swatch.picked{border-color:var(--txt);box-shadow:0 0 0 3px rgba(0,0,0,.12)}
        .cc-swatch::after{content:'✓';position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#fff;font-size:.75rem;font-weight:900;opacity:0;transition:opacity .2s}
        .cc-swatch.picked::after{opacity:1}

        .design-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(90px,1fr));gap:10px}
        .design-btn{
          padding:12px 8px;border-radius:16px;background:var(--surf);
          border:2px solid transparent;cursor:none;transition:all .3s var(--easing);
          text-align:center;font-family:'Nunito',sans-serif;font-size:.75rem;font-weight:700;color:var(--txt2);
          display:flex;flex-direction:column;align-items:center;gap:6px;
        }
        .design-btn:hover:not(.locked){background:var(--white);border-color:var(--coral-l);color:var(--coral);transform:translateY(-2px)}
        .design-btn.picked{background:var(--coral-l);border-color:var(--coral);color:var(--coral)}
        .design-btn.locked{opacity:.4;cursor:not-allowed;position:relative}
        .design-btn.locked::after{content:'🔒';font-size:.7rem;position:absolute;top:6px;right:6px}
        .design-ico{font-size:1.4rem}
        .tier-hint{font-size:.62rem;font-weight:800;padding:2px 7px;border-radius:100px;margin-top:2px}
        .tier-hint.pro{background:rgba(245,166,35,.15);color:#9A6900}
        .tier-hint.ultra{background:rgba(155,89,182,.12);color:#7D3C98}

        /* ── DROP ZONES ── */
        .drop-zone{border:2px dashed var(--bdr);border-radius:24px;padding:30px 20px;text-align:center;cursor:pointer;position:relative;background:var(--surf);transition:all .3s var(--easing);display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:160px;overflow:hidden}
        .drop-zone:hover,.drop-zone.over{border-color:var(--coral);background:var(--coral-l);transform:scale(1.01)}
        .drop-zone.has-cover{padding:0;border-color:transparent}
        .drop-zone.has-files{padding:20px;justify-content:flex-start}
        .dz-content{position:relative;z-index:5;pointer-events:none}
        .dz-ico{font-size:2rem;margin-bottom:8px;display:block}
        .dz-title{font-size:.9rem;font-weight:800;color:var(--txt);margin-bottom:4px;transition:color .2s}
        .dz-sub{font-size:.75rem;color:var(--txt3);font-weight:600}
        .cover-preview-wrap{position:absolute;inset:0;display:none;width:100%;height:100%;z-index:5}
        .cover-preview-wrap.on{display:block}
        .cover-preview{width:100%;height:100%;object-fit:cover;display:block}
        .cover-rm{position:absolute;top:12px;right:12px;width:32px;height:32px;border-radius:50%;background:rgba(0,0,0,.6);backdrop-filter:blur(4px);border:none;color:#fff;font-size:1rem;cursor:none;display:flex;align-items:center;justify-content:center;transition:all .2s;z-index:20}
        .cover-rm:hover{background:var(--coral);transform:scale(1.1);box-shadow:0 4px 12px rgba(255,107,91,.4)}

        /* ── FILE UPLOADS (Step 6) ── */
        .file-thumbs{display:grid;grid-template-columns:repeat(auto-fill,minmax(90px,1fr));gap:12px;margin-top:16px;width:100%;pointer-events:auto;text-align:left}
        .ft-item{border-radius:14px;overflow:hidden;aspect-ratio:1;position:relative;border:1.5px solid var(--bdr);background:var(--surf);display:flex;flex-direction:column;align-items:center;justify-content:center;box-shadow:0 4px 10px rgba(0,0,0,.02);transition:all .3s}
        .ft-item:hover{transform:translateY(-3px);box-shadow:0 8px 16px rgba(0,0,0,.06);border-color:rgba(255,107,91,.4)}
        .ft-item img{width:100%;height:100%;object-fit:cover;position:absolute;inset:0;z-index:0}
        .ft-item.file{background:linear-gradient(135deg,var(--surf),var(--white));padding:10px}
        .ft-ico{font-size:2rem;z-index:1;margin-bottom:4px}
        .ft-name{font-size:.65rem;color:var(--txt2);text-align:center;word-break:break-word;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;line-height:1.2;font-weight:800;z-index:1}
        .ft-uploader{position:absolute;bottom:0;left:0;right:0;background:rgba(0,0,0,.55);color:#fff;font-size:.55rem;font-weight:800;text-align:center;padding:3px;z-index:5}
        .ft-rm{position:absolute;top:6px;right:6px;width:24px;height:24px;border-radius:50%;background:rgba(0,0,0,.6);backdrop-filter:blur(4px);border:none;color:#fff;font-size:.8rem;cursor:none;display:flex;align-items:center;justify-content:center;transition:all .2s;z-index:20;opacity:0;transform:scale(.8)}
        .ft-item:hover .ft-rm{opacity:1;transform:scale(1)}
        .ft-rm:hover{background:var(--coral);box-shadow:0 4px 12px rgba(255,107,91,.4)}
        .ft-rm.disabled{display:none}

        /* ── PEOPLE SEARCH (Collaborators/Recipients) ── */
        .people-search-wrap{position:relative;margin-bottom:14px}
        .people-search-ico{position:absolute;left:14px;top:50%;transform:translateY(-50%);color:var(--txt3);font-size:.9rem;pointer-events:none}
        .people-search-input{width:100%;padding:12px 16px 12px 38px;background:var(--surf);border:2px solid transparent;border-radius:100px;font-family:'Nunito',sans-serif;font-size:.85rem;font-weight:600;color:var(--txt);outline:none;transition:all .3s var(--easing)}
        .people-search-input:focus{background:#fff;border-color:var(--coral);box-shadow:0 0 0 4px rgba(255,107,91,.12)}
        .people-dropdown{position:absolute;top:calc(100% + 6px);left:0;right:0;background:#fff;border:1.5px solid var(--bdr);border-radius:16px;box-shadow:0 12px 30px rgba(0,0,0,.08);z-index:100;overflow:hidden;display:none}
        .people-dropdown.open{display:block}
        .pd-item{padding:12px 16px;font-size:.85rem;font-weight:700;color:var(--txt);cursor:none;transition:background .2s;display:flex;align-items:center;gap:10px}
        .pd-item:hover{background:var(--coral-l);color:var(--coral)}
        .pd-av{width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,var(--coral),#FF9A8B);display:flex;align-items:center;justify-content:center;font-size:.65rem;font-weight:900;color:#fff;flex-shrink:0;overflow:hidden}

        .people-list{display:flex;flex-direction:column;gap:8px}
        .person-row{display:flex;align-items:center;gap:12px;padding:12px 14px;background:var(--surf);border:1.5px solid var(--bdr);border-radius:16px;transition:all .25s var(--easing)}
        .person-row:hover{border-color:var(--coral-l)}
        .person-av{width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,var(--coral),#FF9A8B);display:flex;align-items:center;justify-content:center;font-size:.68rem;font-weight:900;color:#fff;flex-shrink:0;overflow:hidden}
        .person-name{font-size:.85rem;font-weight:800;color:var(--txt);flex:1}
        .person-role{font-size:.65rem;font-weight:800;padding:3px 9px;border-radius:100px}
        .person-role.collab{background:rgba(91,138,245,.12);color:#3B5FD9}
        .person-role.recipient{background:var(--teal-l);color:var(--teal)}
        .person-rm{background:none;border:none;color:var(--txt3);font-size:.8rem;cursor:none;padding:6px;border-radius:8px;transition:all .2s;line-height:1}
        .person-rm:hover{background:var(--coral-l);color:var(--coral)}
        .empty-people{text-align:center;padding:20px;color:var(--txt3);font-size:.8rem;font-weight:700}
        .uac-note{padding:12px 16px;background:rgba(91,138,245,.06);border:1px solid rgba(91,138,245,.15);border-radius:14px;font-size:.75rem;color:#3B5FD9;font-weight:600;display:flex;gap:8px;align-items:flex-start;margin-bottom:16px}

        /* ── RIGHT PANEL ── */
        .r-panel{width:320px;min-width:320px;background:var(--coral);border-radius:28px;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 16px 48px rgba(255,107,91,.3);flex-shrink:0;position:relative;transition:background .45s ease,box-shadow .45s ease}
        .r-panel::before{content:'';position:absolute;inset:0;background:radial-gradient(circle at 80% 20%,rgba(255,255,255,.12) 0%,transparent 60%),radial-gradient(circle at 10% 80%,rgba(255,255,255,.08) 0%,transparent 50%);pointer-events:none;z-index:0}
        .rp-inner{position:relative;z-index:1;display:flex;flex-direction:column;height:100%;padding:24px;overflow-y:auto;scrollbar-width:none}
        .rp-inner::-webkit-scrollbar{display:none}

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

        .rp-stat-row{display:flex;gap:10px;margin-bottom:24px;flex-shrink:0}
        .rp-mini-stat{flex:1;background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.2);border-radius:14px;padding:12px 8px;text-align:center;display:flex;flex-direction:column;align-items:center;justify-content:center}
        .rp-mini-val{font-family:'Sora',sans-serif;font-size:1.3rem;font-weight:900;color:#fff;line-height:1;margin-bottom:4px}
        .rp-mini-lbl{font-size:.6rem;font-weight:800;color:rgba(255,255,255,.8);text-transform:uppercase;letter-spacing:.05em}

        .submit-wrap{margin-top:auto;animation:fadeUp .5s .2s var(--easing) both;display:flex;flex-direction:column;gap:10px;flex-shrink:0}
        .btn-seal{width:100%;padding:16px;background:#fff;border:none;border-radius:100px;color:var(--coral);font-family:'Nunito',sans-serif;font-size:1rem;font-weight:900;cursor:none;display:flex;align-items:center;justify-content:center;gap:8px;box-shadow:0 8px 24px rgba(0,0,0,.15);transition:all .3s var(--easing)}
        .btn-seal:hover{transform:translateY(-4px);box-shadow:0 14px 32px rgba(0,0,0,.25)}
        .btn-save-draft{width:100%;padding:13px;background:rgba(255,255,255,.2);border:1.5px solid rgba(255,255,255,.3);border-radius:100px;color:#fff;font-family:'Nunito',sans-serif;font-size:.85rem;font-weight:800;cursor:none;display:flex;align-items:center;justify-content:center;gap:8px;transition:all .3s var(--easing)}
        .btn-save-draft:hover{background:rgba(255,255,255,.32);transform:translateY(-2px)}
        .btn-cancel-link{display:block;text-align:center;font-size:.78rem;font-weight:800;color:rgba(255,255,255,.75);text-decoration:none;transition:color .2s;padding:8px;border-radius:100px;border:1.5px solid transparent}
        .btn-cancel-link:hover{color:#fff;background:rgba(255,255,255,.12);border-color:rgba(255,255,255,.2)}
        .grace-warning{background:rgba(255,255,255,.2);border:1.5px solid rgba(255,255,255,.3);border-radius:16px;padding:14px;margin-bottom:16px;font-size:.78rem;color:#fff;font-weight:700;display:flex;align-items:center;gap:8px}

        #autosaveToast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(20px);background:var(--white);border:1.5px solid var(--coral-l);border-radius:100px;padding:8px 20px;font-size:.85rem;font-weight:800;color:var(--coral);box-shadow:0 12px 30px rgba(255,107,91,.15);display:flex;align-items:center;gap:8px;opacity:0;pointer-events:none;z-index:1000;transition:all .4s var(--easing)}
        #autosaveToast.on{opacity:1;transform:translateX(-50%) translateY(0)}

        @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.5);opacity:.5}}
        @media(max-width:1000px){.r-panel{display:none}}
        @media(max-width:700px){.l-sidebar{display:none}.root{padding:8px;gap:8px}.mc-body{padding:20px}}
      `}</style>

      <div id="cur-dot" ref={dotRef}></div>
      <div id="cur-ring" ref={ringRef}></div>
      <div id="autosaveToast" className={toastMsg ? 'on' : ''}>{toastMsg?.[0]}</div>

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
              <div className="ls-selfav" style={{ background: BORDER_CSS[user?.equipped_border] || BORDER_CSS['border-none'], padding: '2.5px' }}>
                <div style={{width:'100%',height:'100%',borderRadius:'50%',background:'linear-gradient(135deg,var(--coral),#FF9A8B)',display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden'}}>
                  {user?.avatar_path ? <img src={`https://your-supabase-url/storage/v1/object/public/${user.avatar_path}`} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/> : ai(usernameShort)}
                </div>
              </div>
              <div className="ls-selfinfo">
                <span className="ls-selfname">{usernameShort}</span>
                <span className="ls-selfrole">{phase_label[0]}</span>
              </div>
            </Link>
          </div>
        </aside>

        {/* ════ MAIN CARD ════ */}
        <div className="main-card">
          <div className="mc-top">
            <div className="mc-title">{phase_label[0]}</div>
            <div className="mc-spacer"></div>
            <Link to="/my-vaults" className="mc-btn" title="My Vaults">📂</Link>
            <Link to="/dashboard" className="mc-user">
              <div className="mc-uav" style={{ background: BORDER_CSS[user?.equipped_border] || BORDER_CSS['border-none'], padding: '2.5px' }}>
                <div style={{width:'100%',height:'100%',borderRadius:'50%',background:'linear-gradient(135deg,var(--coral),#FF9A8B)',display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden'}}>
                  {user?.avatar_path ? <img src={`https://your-supabase-url/storage/v1/object/public/${user.avatar_path}`} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/> : ai(usernameShort)}
                </div>
              </div>
              <span className="mc-uname">Dashboard</span>
            </Link>
          </div>

          <div className="mc-body">
            
            {mode !== 'create' && (
              <div className={`phase-banner ${mode}`}>
                <span className="phase-ico">{phase_label[0][0]}</span>
                <div className="phase-info">
                  <div className="phase-name">{vault.title || 'Untitled Draft'}</div>
                  <div className="phase-sub">{phase_label[1]}{graceLeft ? ` · ⏳ ${graceLeft}` : ''}</div>
                </div>
                <span className={`phase-tag ${mode}`}>{mode === 'draft' ? 'DRAFT' : mode === 'grace' ? 'GRACE PERIOD' : 'COLLABORATOR'}</span>
              </div>
            )}

            {mode === 'grace' && (
              <div className="alert alert-gold">
                ⏳ Grace period active — {graceLeft}. After this window closes, the vault is permanently locked until its unlock date.
              </div>
            )}

            {['create', 'draft'].includes(mode) && (
              <div className="progress-strip">
                <span className="ps-label">Vault Ready</span>
                <div className="ps-track"><div className="ps-fill" style={{ width: `${progress}%` }}></div></div>
                <span className="ps-pct">{progress}%</span>
                <div className="ps-dots">
                  <div className={`ps-dot ${(vault.title || '').trim() ? 'on' : ''}`}></div>
                  <div className={`ps-dot ${(vault.story || '').trim() ? 'on' : ''}`}></div>
                  <div className={`ps-dot ${vault.unlock_date ? 'on' : ''}`}></div>
                  <div className={`ps-dot ${coverPreview || vault.cover_path ? 'on' : ''}`}></div>
                  <div className={`ps-dot ${vault.target_lat && vault.target_lng ? 'on' : ''}`}></div>
                </div>
              </div>
            )}

            {is_creator && (
            <form onSubmit={e => handleSubmit(e, 'save')} id="vaultForm">
              
              {/* STEP 1: Basic Info */}
              <div className="v-card" style={{animationDelay:'.04s'}}>
                <div className="v-card-header"><div className="v-card-title">📝 Basic Info</div><span className="v-card-step">Step 1</span></div>
                <div className="fg">
                  <div className="fg-row"><label className="fg-label">Title <span className="fg-req">*</span></label><span className={`fg-count ${(vault.title?.length || 0) > 90 ? 'warn' : ''}`}>{vault.title?.length || 0} / 100</span></div>
                  <input className="finput" type="text" name="title" maxLength="100" required placeholder="Name this memory..." value={vault.title || ''} onChange={handleChange} />
                </div>
                <div className="fg">
                  <div className="fg-row"><label className="fg-label">Story / Message</label><span className="fg-hint">optional but meaningful</span></div>
                  <textarea className="ftextarea" name="story" maxLength="2000" placeholder="Write what this memory means to you..." value={vault.story || ''} onChange={handleChange}></textarea>
                  <div className="fg-footer">
                    <span className="fg-words">{(vault.story || '').split(/\s+/).filter(Boolean).length} words</span>
                    <span className={`fg-count ${(vault.story?.length || 0) > 1800 ? 'warn' : ''}`}>{vault.story?.length || 0} / 2000</span>
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
                  <div className="mood-tip"><span>💡</span><span>{moodTips[vault.mood] || 'Pick a mood that captures this memory.'}</span></div>
                </div>
              </div>

              {/* STEP 2: Time Lock & Location */}
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
                    <button type="button" className="sc-btn" onClick={() => handleShortcut('5y')}>+5 Years</button>
                  </div>
                  <input className="finput" type="datetime-local" name="unlock_date" required value={vault.unlock_date || ''} onChange={handleChange} />
                  <div className={`countdown ${cd ? 'on' : ''}`}>
                    <span className="cd-dot"></span>
                    <span>{cd ? (cd.d > 0 ? `Opens in ${cd.d}d ${cd.h}h ${cd.m}m` : `Opens in ${cd.h}h ${cd.m}m`) : 'Opens in...'}</span>
                  </div>
                </div>
                
                <div className="fg">
                  <div className="fg-row"><label className="fg-label">📍 Location</label><span className="fg-hint">optional geo-pin</span></div>
                  <div className="loc-row">
                    {vault.target_lat && vault.target_lng ? (
                      <>
                        <span className="loc-coords">📍 {Number(vault.target_lat).toFixed(4)}, {Number(vault.target_lng).toFixed(4)}</span>
                        <Link to="/map" className="loc-link">Change →</Link>
                      </>
                    ) : (
                      <>
                        <span className="loc-none">No location pinned</span>
                        <Link to="/map" className="loc-link">Pin on Map →</Link>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* STEP 3: Visibility */}
              <div className="v-card" style={{animationDelay:'.12s'}}>
                <div className="v-card-header"><div className="v-card-title">👁️ Visibility</div><span className="v-card-step">Step 3</span></div>
                
                {mode === 'create' && (
                  <div className={`slot-bar ${bar_cls}`}>
                    <span>{vaultCount} / {vault_limit === 999999 ? '∞' : vault_limit} vaults used</span>
                    <div className="slot-pips">
                      {Array.from({ length: pip_max }).map((_, i) => (
                        <div key={i} className={`slot-pip ${i >= pip_used ? 'empty' : ''}`}></div>
                      ))}
                    </div>
                  </div>
                )}

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

              {/* STEP 4: Capsule Style */}
              <div className="v-card" style={{animationDelay:'.16s'}}>
                <div className="v-card-header"><div className="v-card-title">🎨 Capsule Style</div><span className="v-card-step">Step 4</span></div>
                <div className="fg">
                  <div className="fg-row"><label className="fg-label">Capsule Color</label><span className="fg-hint">accent color for your vault</span></div>
                  <div className="capsule-colors">
                    {capsuleColors.map(clr => (
                      <div key={clr} className={`cc-swatch ${vault.capsule_color === clr ? 'picked' : ''}`} style={{background: clr}} onClick={() => setVault({...vault, capsule_color: clr})}></div>
                    ))}
                  </div>
                </div>
                <div className="fg">
                  <div className="fg-row"><label className="fg-label">Capsule Design</label>
                    {tier === 'standard' && <span className="fg-hint">Upgrade for more designs</span>}
                  </div>
                  <div className="design-grid">
                    {Object.entries(all_designs).map(([key, d]) => {
                      const unlocked = d.tiers.includes(tier);
                      const needs = !d.tiers.includes('standard') ? (d.tiers.includes('ultra') && !d.tiers.includes('pro') ? 'ultra' : 'pro') : '';
                      return (
                        <button key={key} type="button" disabled={!unlocked} data-design={key} className={`design-btn ${!unlocked ? 'locked' : ''} ${vault.capsule_design === key && unlocked ? 'picked' : ''}`} onClick={() => setVault({...vault, capsule_design: key})}>
                          <span className="design-ico">{d.ico}</span>
                          {d.label}
                          {needs && <span className={`tier-hint ${needs}`}>{needs.charAt(0).toUpperCase() + needs.slice(1)}</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* STEP 5: Cover Photo */}
              <div className="v-card" style={{animationDelay:'.20s'}}>
                <div className="v-card-header"><div className="v-card-title">🖼️ Cover Photo</div><span className="v-card-step">Step 5</span></div>
                <div className={`drop-zone ${coverPreview || vault.cover_path ? 'has-cover' : ''}`} 
                     onClick={() => !(coverPreview || vault.cover_path) && coverInputRef.current.click()}
                     onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('over'); }}
                     onDragLeave={(e) => e.currentTarget.classList.remove('over')}
                     onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove('over'); if(e.dataTransfer.files[0]) handleCoverSelect({target:{files:e.dataTransfer.files}}); }}>
                  
                  <input type="file" ref={coverInputRef} accept="image/*" style={{display:'none'}} onChange={handleCoverSelect} />
                  
                  {!(coverPreview || vault.cover_path) && (
                    <div className="dz-content">
                      <span className="dz-ico">🖼️</span>
                      <div className="dz-title">Click or drop an image</div>
                      <div className="dz-sub">JPG · PNG · WEBP</div>
                    </div>
                  )}
                  {(coverPreview || vault.cover_path) && (
                    <div className="cover-preview-wrap on">
                      <img className="cover-preview" src={coverPreview || `https://your-supabase-url/storage/v1/object/public/${vault.cover_path}`} alt="Cover" />
                      <button type="button" className="cover-rm" onClick={(e) => { e.stopPropagation(); setCoverFile(null); setCoverPreview(null); setVault({...vault, cover_path: ''}); }}>✕</button>
                    </div>
                  )}
                </div>
              </div>

            </form>
            )}

            {/* STEP 6: Files Upload (Drafts only) */}
            {is_draft_mode && (
            <div className="v-card" style={{animationDelay:'.24s'}}>
              <div className="v-card-header"><div className="v-card-title">📎 Files & Media</div><span className="v-card-step">{is_creator ? 'Step 6' : 'Upload Files'}</span></div>
              
              {!is_creator && (
                <div className="uac-note">
                  ℹ️ As a collaborator you can upload files and remove your own uploads. Only the creator can remove other collaborators' files.
                </div>
              )}

              <div style={{background:'var(--surf)',border:'1.5px solid var(--bdr)',padding:'12px 16px',borderRadius:'14px',marginBottom:'20px',fontSize:'.8rem',fontWeight:'700',color:'var(--txt2)',display:'flex',alignItems:'center',gap:'8px'}}>
                ℹ️ <span><strong style={{color:'var(--coral)'}}>{tier.charAt(0).toUpperCase() + tier.slice(1)} Plan</strong> — up to <strong style={{color:'var(--coral)'}}>{tier === 'ultra' ? '1 GB' : (tier === 'pro' ? '250 MB' : '50 MB')}</strong> total media.</span>
              </div>

              <div className={`drop-zone ${(vaultFiles.length + existingFiles.length) > 0 ? 'has-files' : ''}`} onClick={() => filesInputRef.current.click()}>
                <input type="file" ref={filesInputRef} multiple style={{display:'none'}} onChange={handleFilesSelect} />
                <div className="dz-content" style={{ display: (vaultFiles.length + existingFiles.length) > 0 ? 'none' : 'block' }}>
                  <span className="dz-ico">📂</span>
                  <div className="dz-title" style={{color:(vaultFiles.length + existingFiles.length) > 0 ? 'var(--coral)' : ''}}>
                    {(vaultFiles.length + existingFiles.length) > 0 ? '+ Click or drop more files' : 'Click or drop files'}
                  </div>
                  <div className="dz-sub" style={{display:(vaultFiles.length + existingFiles.length) > 0 ? 'none' : 'block'}}>Images · Videos · Docs · Audio</div>
                </div>
                {(vaultFiles.length > 0 || existingFiles.length > 0) && (
                  <div className="file-thumbs" onClick={(e) => e.stopPropagation()}>
                    {existingFiles.map((f, idx) => {
                       const isImg = f.file_name.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                       const ext = f.file_name.split('.').pop().toUpperCase();
                       const canRm = is_creator || f.uploaded_by === user.id;
                       return (
                         <div key={`ef-${idx}`} className={`ft-item ${!isImg ? 'file' : ''}`}>
                           {isImg ? <img src={`https://your-supabase-url/storage/v1/object/public/${f.file_path}`} alt="" /> : <><span className="ft-ico">{EXT_ICONS[ext]||'📎'}</span><span className="ft-name">{f.file_name}</span></>}
                           {f.uploader_name && <div className="ft-uploader">{ai(f.uploader_name)}</div>}
                           {canRm && <button type="button" className="ft-rm" onClick={() => removeExistingFile(f.id)}>✕</button>}
                         </div>
                       );
                    })}
                    {vaultFiles.map((f, idx) => (
                      <div key={idx} className={`ft-item new-file ${!f.preview ? 'file' : ''}`}>
                        {f.preview ? <img src={f.preview} alt="" /> : <><span className="ft-ico">{EXT_ICONS[f.name.split('.').pop().toUpperCase()]||'📎'}</span><span className="ft-name">{f.name}</span></>}
                        <button type="button" className="ft-rm" onClick={() => removeFile(idx)}>✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            )}

            {/* STEP 7: Collaborators */}
            {is_creator && is_draft_mode && vault.visibility !== 'private' && (
              <div className="v-card" style={{animationDelay:'.28s'}}>
                <div className="v-card-header"><div className="v-card-title">🤝 Collaborators</div><span className="v-card-step">Step 7</span></div>
                <div className="uac-note">🔐 Collaborators can upload files and delete their own uploads only. The creator has full control over all files.</div>
                <div className="people-search-wrap">
                  <span className="people-search-ico">🔍</span>
                  <input className="people-search-input" type="text" placeholder="Search friends to invite…" value={collabSearch} onChange={(e) => { setCollabSearch(e.target.value); searchFriends(e.target.value, 'collab'); }} />
                  {collabSearch && (
                    <div className="people-dropdown open">
                      {collabResults.length > 0 ? collabResults.map(u => (
                        <div key={u.id} className="pd-item" onClick={() => { setCollaborators([...collaborators, u]); setCollabSearch(''); setCollabResults([]); }}>
                          <div className="pd-av">{ai(u.username)}</div>@{u.username.split('@')[0]}
                        </div>
                      )) : <div className="pd-item" style={{color:'var(--txt3)'}}>No friends found</div>}
                    </div>
                  )}
                </div>
                <div className="people-list">
                  {collaborators.length > 0 ? collaborators.map((c, i) => (
                    <div key={i} className="person-row">
                      <div className="person-av">{c.avatar_path ? <img src={`https://your-supabase-url/storage/v1/object/public/${c.avatar_path}`} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/> : ai(c.username)}</div>
                      <span className="person-name">@{c.username.split('@')[0]}</span><span className="person-role collab">Collaborator</span>
                      <button type="button" className="person-rm" onClick={() => setCollaborators(collaborators.filter(x => x.user_id !== c.user_id))}>✕</button>
                    </div>
                  )) : <div className="empty-people">No collaborators yet. Invite a friend above.</div>}
                </div>
              </div>
            )}

            {/* STEP 8: Recipients */}
            {is_creator && vault.visibility !== 'private' && (
              <div className="v-card" style={{animationDelay:'.32s'}}>
                <div className="v-card-header"><div className="v-card-title">📬 Recipients</div><span className="v-card-step">{is_draft_mode ? 'Step 8' : 'Recipients'}</span></div>
                <div className="uac-note" style={{background:'rgba(29,158,117,.06)',borderColor:'rgba(29,158,117,.18)',color:'var(--teal)'}}>📬 Recipients are notified when the vault is sealed and again when it opens. They are strictly viewers post-opening.</div>
                <div className="people-search-wrap">
                  <span className="people-search-ico">🔍</span>
                  <input className="people-search-input" type="text" placeholder="Search friends to add…" value={recipSearch} onChange={(e) => { setRecipSearch(e.target.value); searchFriends(e.target.value, 'recip'); }} />
                  {recipSearch && (
                    <div className="people-dropdown open">
                      {recipResults.length > 0 ? recipResults.map(u => (
                        <div key={u.id} className="pd-item" onClick={() => { setRecipients([...recipients, u]); setRecipSearch(''); setRecipResults([]); }}>
                          <div className="pd-av">{ai(u.username)}</div>@{u.username.split('@')[0]}
                        </div>
                      )) : <div className="pd-item" style={{color:'var(--txt3)'}}>No friends found</div>}
                    </div>
                  )}
                </div>
                <div className="people-list">
                  {recipients.length > 0 ? recipients.map((r, i) => (
                    <div key={i} className="person-row">
                      <div className="person-av">{r.avatar_path ? <img src={`https://your-supabase-url/storage/v1/object/public/${r.avatar_path}`} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/> : ai(r.username)}</div>
                      <span className="person-name">@{r.username.split('@')[0]}</span><span className="person-role recipient">Recipient</span>
                      <button type="button" className="person-rm" onClick={() => setRecipients(recipients.filter(x => x.user_id !== r.user_id))}>✕</button>
                    </div>
                  )) : <div className="empty-people">No recipients yet. Add friends above.</div>}
                </div>
              </div>
            )}

          </div>
        </div>

        {/* ════ RIGHT PANEL ════ */}
        <div className="r-panel" style={{ background: rPanelGrad }}>
          <div className="rp-inner">
            <div className="rp-header"><span>👁 Live Preview</span><span className="live-dot"></span></div>

            <div className="preview-card">
              {coverPreview || vault.cover_path ? <img className="preview-cover" src={coverPreview || `https://your-supabase-url/storage/v1/object/public/${vault.cover_path}`} alt="" style={{display:'block'}} /> : <div className="preview-cover-ph">🛡️</div>}
              <div className="preview-mood">
                <span className="preview-capsule-dot" style={{background: vault.capsule_color || '#FF6B5B'}}></span>
                {moodIco[vault.mood] || '💜'} {vault.mood || 'Happy'}
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

            <div className="rp-stat-row">
              <div className="rp-mini-stat">
                <div className="rp-mini-val">{collaborators.length}</div>
                <div className="rp-mini-lbl">Collabs</div>
              </div>
              <div className="rp-mini-stat">
                <div className="rp-mini-val">{recipients.length}</div>
                <div className="rp-mini-lbl">Recipients</div>
              </div>
              <div className="rp-mini-stat">
                <div className="rp-mini-val">{vaultFiles.length + existingFiles.length}</div>
                <div className="rp-mini-lbl">Files</div>
              </div>
            </div>

            <div className="submit-wrap">
              {mode === 'grace' ? (
                <>
                  <div className="grace-warning">⏳ Grace period: {graceLeft}. Save changes now.</div>
                  <button type="button" onClick={e => handleSubmit(e, 'save')} className={`btn-seal ${submitting ? 'loading' : ''}`}>💾 Save Changes</button>
                </>
              ) : mode === 'draft' && is_creator ? (
                <>
                  <button type="button" onClick={e => handleSubmit(e, 'save')} className="btn-save-draft">💾 Save Draft Settings</button>
                  <button type="button" onClick={e => window.confirm('Seal this vault? The 24-hour grace period will start now.') && handleSubmit(e, 'seal')} className={`btn-seal ${submitting ? 'loading' : ''}`}>🔒 Seal Vault</button>
                </>
              ) : mode === 'create' ? (
                <button type="button" onClick={e => handleSubmit(e, 'save')} className={`btn-seal ${submitting ? 'loading' : ''}`}>✨ Create Draft</button>
              ) : mode === 'collaborator' ? (
                <div style={{background:'rgba(255,255,255,.2)',border:'1.5px solid rgba(255,255,255,.25)',borderRadius:'16px',padding:'14px',fontSize:'.78rem',color:'#fff',fontWeight:'700',textAlign:'center'}}>
                  🤝 You are a collaborator.<br/>Upload files using the form above.
                </div>
              ) : null}
              <Link to="/my-vaults" className="btn-cancel-link">← Back to My Vaults</Link>
            </div>
          </div>
        </div>

      </div>
    </>
  );
}
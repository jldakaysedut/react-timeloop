import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../config/supabaseClient'; // Added Supabase connection

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const dotRef = useRef(null);
  const ringRef = useRef(null);

  const searchParams = new URLSearchParams(location.search);
  const isRegistered = searchParams.get('msg') === 'registered';

  useEffect(() => {
    let mx = 0, my = 0, rx = 0, ry = 0;
    let reqId;

    const handleMouseMove = (e) => {
      mx = e.clientX;
      my = e.clientY;
      if (dotRef.current) {
        dotRef.current.style.left = mx + 'px';
        dotRef.current.style.top = my + 'px';
      }
    };

    const animateCursor = () => {
      rx += (mx - rx) * 0.13;
      ry += (my - ry) * 0.13;
      if (ringRef.current) {
        ringRef.current.style.left = rx + 'px';
        ringRef.current.style.top = ry + 'px';
      }
      reqId = requestAnimationFrame(animateCursor);
    };

    window.addEventListener('mousemove', handleMouseMove);
    animateCursor();

    const links = document.querySelectorAll('a, button');
    const handleMouseEnter = () => {
      if (ringRef.current) {
        ringRef.current.style.width = '40px';
        ringRef.current.style.height = '40px';
        ringRef.current.style.borderColor = '#FF4F3B';
      }
    };
    const handleMouseLeave = () => {
      if (ringRef.current) {
        ringRef.current.style.width = '30px';
        ringRef.current.style.height = '30px';
        ringRef.current.style.borderColor = '#FF4F3B';
      }
    };

    links.forEach(el => {
      el.addEventListener('mouseenter', handleMouseEnter);
      el.addEventListener('mouseleave', handleMouseLeave);
    });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(reqId);
      links.forEach(el => {
        el.removeEventListener('mouseenter', handleMouseEnter);
        el.removeEventListener('mouseleave', handleMouseLeave);
      });
    };
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    // Search for the user in the Supabase database
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single();

    // Check if user exists (Note: In a pure client-side setup without hashing, we check exact match.
    // If you used PHP password_hash before, old passwords won't match a plain text check, 
    // so you will need to create a new user to test this properly).
    if (!user || user.password !== password) {
      setError("Invalid username or password.");
      return;
    }

    // Check if banned
    if (user.account_status === 'banned') {
      setError("Your account has been banned by an administrator.");
      return;
    }

    // Success! Save session data
    localStorage.setItem('user_id', user.id);
    localStorage.setItem('username', user.username);
    localStorage.setItem('role', user.role || 'user');

    // Route based on role
    if (user.role === 'admin') {
        navigate('/admin/dashboard');
      } else if (user.role === 'moderator') {
        navigate('/moderator/dashboard');
      } else {
        navigate('/dashboard'); // <--- GINAWANG /dashboard
      }
  };

  return (
    <>
      <style>{`
        :root{--bg:#FFE4DC;--bg2:#FFDDD5;--v2:#FF9A8B;--v3:#FF4F3B;--v4:#FF4F3B;--v5:#FF6B5B;--v6:#FF9A8B;--pink:#D63B28;--teal:#1D9E75;--white:#FFFFFF;--t2:#7A4A42;--t3:#B08080;--border:rgba(255,79,59,.32)}
        *,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
        body{font-family:'Nunito',sans-serif;background:linear-gradient(160deg,#FFE4DC,#FFCFBF);color:#1A1A1A;min-height:100vh;display:flex;flex-direction:column;cursor:none}
        #dot{position:fixed;width:9px;height:9px;background:#FF4F3B;border-radius:50%;pointer-events:none;z-index:9999;transform:translate(-50%,-50%)}
        #ring{position:fixed;width:30px;height:30px;border:1.5px solid #FF4F3B;border-radius:50%;pointer-events:none;z-index:9998;transform:translate(-50%,-50%);transition:left .13s ease,top .13s ease,width .25s,height .25s,border-color .25s;opacity:.6}
        .page-bg{position:fixed;inset:0;z-index:0;overflow:hidden}
        .blob{position:absolute;border-radius:50%;filter:blur(80px);pointer-events:none;animation:blobMove ease-in-out infinite}
        .topbar{position:fixed;top:0;left:0;right:0;z-index:100;display:flex;align-items:center;justify-content:space-between;padding:.9rem 4rem;background:rgba(255,228,220,.92);backdrop-filter:blur(18px);border-bottom:1.5px solid rgba(255,79,59,.28);box-shadow:0 2px 20px rgba(255,79,59,.1)}
        .logo{display:flex;align-items:center;gap:.55rem;font-family:'Sora',sans-serif;font-size:1.25rem;font-weight:800;color:#FF4F3B;text-decoration:none}
        .logo-mark{width:30px;height:30px;border-radius:9px;background:linear-gradient(135deg,#FF4F3B,#D63B28);display:flex;align-items:center;justify-content:center;font-size:.9rem}
        .topbar-link{color:#8C5A52;text-decoration:none;font-size:.82rem;font-weight:700;transition:color .3s}
        .topbar-link:hover{color:#FF4F3B}
        .auth-wrap{flex:1;display:flex;align-items:center;justify-content:center;padding:6rem 1.5rem 3rem;position:relative;z-index:1}
        .auth-grid{display:grid;grid-template-columns:1fr 1fr;gap:5rem;align-items:center;max-width:1000px;width:100%}
        .auth-left{animation:fadeLeft .8s .1s ease both}
        .auth-brand{display:flex;align-items:center;gap:.6rem;font-family:'Sora',sans-serif;font-size:1.5rem;font-weight:800;color:#FF4F3B;margin-bottom:2rem}
        .auth-brand-ico{width:38px;height:38px;border-radius:11px;background:linear-gradient(135deg,#FF4F3B,#D63B28);display:flex;align-items:center;justify-content:center;font-size:1.1rem}
        .auth-tagline{font-family:'Sora',sans-serif;font-size:clamp(1.6rem,3vw,2.4rem);font-weight:800;line-height:1.2;margin-bottom:1rem}
        .auth-tagline .g{background:linear-gradient(120deg,#FF4F3B,#D63B28);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
        .auth-desc{font-size:.9rem;color:#7A4A42;line-height:1.8;margin-bottom:2rem}
        .auth-perks{display:flex;flex-direction:column;gap:.75rem}
        .perk{display:flex;align-items:center;gap:.8rem;font-size:.85rem;color:#5C3D38}
        .perk-ico{width:34px;height:34px;border-radius:10px;background:rgba(255,79,59,.15);border:1.5px solid rgba(255,79,59,.3);display:flex;align-items:center;justify-content:center;font-size:1rem;flex-shrink:0}
        .auth-card{background:rgba(255,255,255,.96);border:1.5px solid rgba(255,79,59,.25);border-radius:26px;padding:2.8rem 2.5rem;box-shadow:0 30px 70px rgba(255,79,59,.18);animation:fadeRight .8s .2s ease both;width:100%}
        .card-head{text-align:center;margin-bottom:2rem}
        .card-head h2{font-family:'Sora',sans-serif;font-size:1.5rem;font-weight:800;color:#1A1A1A;margin-bottom:.4rem}
        .card-head p{font-size:.82rem;color:#8C6058}
        .form-group{margin-bottom:1.2rem;position:relative}
        .form-label{display:block;font-size:.78rem;font-weight:800;color:#FF4F3B;letter-spacing:.1em;text-transform:uppercase;margin-bottom:.5rem}
        .form-input{width:100%;padding:.85rem 1.1rem .85rem 2.9rem;background:#FFF5F3;border:1.5px solid rgba(255,79,59,.3);border-radius:12px;color:#1A1A1A;font-family:'Nunito',sans-serif;font-size:.92rem;font-weight:600;outline:none;transition:border-color .3s,box-shadow .3s}
        .form-input::placeholder{color:#C4A09A}
        .form-input:focus{border-color:#FF4F3B;box-shadow:0 0 0 4px rgba(255,79,59,.15)}
        .input-ico{position:absolute;left:.9rem;top:2.35rem;font-size:1rem;pointer-events:none}
        .btn-submit{width:100%;padding:1rem;background:linear-gradient(135deg,#FF4F3B,#D63B28);border:none;border-radius:12px;color:#fff;font-family:'Nunito',sans-serif;font-size:.95rem;font-weight:800;cursor:none;letter-spacing:.05em;box-shadow:0 6px 28px rgba(255,79,59,.45);transition:all .28s;margin-top:.5rem}
        .btn-submit:hover{transform:translateY(-2px);box-shadow:0 12px 40px rgba(255,79,59,.65)}
        .divider{display:flex;align-items:center;gap:.8rem;margin:1.4rem 0;color:var(--t3);font-size:.78rem}
        .divider::before,.divider::after{content:'';flex:1;height:1px;background:rgba(255,79,59,.2)}
        .alert-error{background:rgba(255,79,59,.1);border:1px solid rgba(255,79,59,.35);border-radius:10px;padding:.7rem 1rem;font-size:.82rem;color:#C0392B;margin-bottom:1.2rem;display:flex;align-items:center;gap:.5rem}
        .alert-success{background:rgba(29,158,117,.1);border:1px solid rgba(29,158,117,.3);border-radius:10px;padding:.7rem 1rem;font-size:.82rem;color:#158060;margin-bottom:1.2rem;display:flex;align-items:center;gap:.5rem}
        .card-foot{text-align:center;margin-top:1.5rem;font-size:.82rem;color:#8C6058}
        .card-foot a{color:#FF4F3B;text-decoration:none;font-weight:800;transition:color .3s}
        .card-foot a:hover{color:#D63B28}
        .page-footer{position:relative;z-index:1;text-align:center;padding:1.5rem;font-size:.75rem;color:#B08080;border-top:1px solid rgba(255,79,59,.15)}
        @keyframes blobMove{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(30px,-22px) scale(1.07)}66%{transform:translate(-20px,16px) scale(.94)}}
        @keyframes fadeLeft{from{opacity:0;transform:translateX(-28px)}to{opacity:1;transform:translateX(0)}}
        @keyframes fadeRight{from{opacity:0;transform:translateX(28px)}to{opacity:1;transform:translateX(0)}}
        @media(max-width:780px){.auth-grid{grid-template-columns:1fr}.auth-left{display:none}.topbar{padding:.9rem 1.5rem}}
      `}</style>

      <div id="dot" ref={dotRef}></div>
      <div id="ring" ref={ringRef}></div>

      <div className="page-bg">
        <div className="blob" style={{width:'500px', height:'500px', background:'rgba(255,79,59,.35)', top:'-10%', left:'-10%', opacity:1, animationDuration:'16s'}}></div>
        <div className="blob" style={{width:'400px', height:'400px', background:'rgba(255,79,59,.2)', bottom:'5%', right:'-8%', opacity:1, animationDuration:'20s', animationDelay:'-7s'}}></div>
        <div className="blob" style={{width:'300px', height:'300px', background:'rgba(255,150,100,.22)', top:'40%', left:'40%', opacity:1, animationDuration:'14s', animationDelay:'-3s'}}></div>
      </div>

      <div className="topbar">
        <Link className="logo" to="/"><div className="logo-mark">⏳</div>TimeVaulth</Link>
        <Link to="/register" className="topbar-link">New here? Create account →</Link>
      </div>

      <div className="auth-wrap">
        <div className="auth-grid">
          <div className="auth-left">
            <div className="auth-brand"><div className="auth-brand-ico">⏳</div>TimeVaulth</div>
            <h2 className="auth-tagline">Welcome back,<br /><span className="g">memory keeper.</span></h2>
            <p className="auth-desc">Your sealed vaults are waiting. Unlock the memories you saved for this very moment.</p>
            <div className="auth-perks">
              <div className="perk"><div className="perk-ico">🔐</div><span>All your vaults, perfectly preserved</span></div>
              <div className="perk"><div className="perk-ico">🔔</div><span>Get notified when a vault unlocks</span></div>
              <div className="perk"><div className="perk-ico">👥</div><span>See what friends shared with you</span></div>
              <div className="perk"><div className="perk-ico">🏆</div><span>Check your streak &amp; achievements</span></div>
            </div>
          </div>
          <div className="auth-card">
            <div className="card-head">
              <h2>🔑 Sign In</h2>
              <p>Enter your credentials to access your vaults</p>
            </div>
            
            {error && <div className="alert-error">⚠️ {error}</div>}
            {isRegistered && <div className="alert-success">✅ Account created! Welcome to TimeVaulth.</div>}
            
            <form onSubmit={handleLogin} autoComplete="on">
              <div className="form-group">
                <label className="form-label">Username</label>
                <span className="input-ico">👤</span>
                <input 
                  className="form-input" 
                  type="text" 
                  placeholder="your_username" 
                  required 
                  autoComplete="username" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <span className="input-ico">🔒</span>
                <input 
                  className="form-input" 
                  type="password" 
                  placeholder="••••••••" 
                  required 
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <button type="submit" className="btn-submit">Sign In to TimeVaulth →</button>
            </form>
            <div className="divider">or</div>
            <div className="card-foot">New traveler? <Link to="/register">Create your account</Link></div>
          </div>
        </div>
      </div>
      <div className="page-footer">© 2026 TimeVaulth — Lock memories. Unlock joy. 🧡</div>
    </>
  );
}
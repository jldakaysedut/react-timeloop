import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../config/supabaseClient'; // Added Supabase connection

export default function Register() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const dotRef = useRef(null);
  const ringRef = useRef(null);

  useEffect(() => {
    // --- 1. Custom Cursor Logic (Exact copy) ---
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

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    try {
      // 1. Check if username or email already exists in your database
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id')
        .or(`username.eq.${username},email.eq.${email}`);

      if (checkError) throw checkError;

      if (existingUser && existingUser.length > 0) {
        setError("Username or email already taken.");
        return;
      }

      // 2. Insert the new user into your Supabase 'users' table
      const { error: insertError } = await supabase
        .from('users')
        .insert([
          { 
            username: username, 
            email: email, 
            password: password, // Note: For a real app, passwords should be hashed. We are using plain text to match your current setup easily.
            role: 'user',
            account_status: 'active'
          }
        ]);

      if (insertError) throw insertError;

      // 3. Success! Redirect to login page with success message
      navigate('/login?msg=registered');
      
    } catch (err) {
      console.error(err);
      setError("Registration failed. Please try again.");
    }
  };

  return (
    <>
      <style>{`
        :root{--bg:#FFE4DC;--v2:#FF9A8B;--v3:#FF4F3B;--v4:#FF4F3B;--v5:#FF6B5B;--v6:#FF9A8B;--pink:#D63B28;--teal:#1D9E75;--gold:#E08C00;--white:#FFFFFF;--t2:#7A4A42;--t3:#B08080;--border:rgba(255,79,59,.32)}
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
        .perks-grid{display:grid;grid-template-columns:1fr 1fr;gap:.75rem}
        .perk{display:flex;align-items:center;gap:.7rem;font-size:.82rem;color:#5C3D38;background:rgba(255,79,59,.1);border:1.5px solid rgba(255,79,59,.25);border-radius:12px;padding:.7rem .9rem}
        .perk-ico{font-size:1.1rem;flex-shrink:0}
        .auth-card{background:rgba(255,255,255,.96);border:1.5px solid rgba(255,79,59,.25);border-radius:26px;padding:2.5rem;box-shadow:0 30px 70px rgba(255,79,59,.18);animation:fadeRight .8s .2s ease both;width:100%}
        .card-head{text-align:center;margin-bottom:1.8rem}
        .card-head h2{font-family:'Sora',sans-serif;font-size:1.5rem;font-weight:800;color:#1A1A1A;margin-bottom:.4rem}
        .card-head p{font-size:.82rem;color:#8C6058}
        .form-group{margin-bottom:1.1rem;position:relative}
        .form-label{display:block;font-size:.78rem;font-weight:800;color:#FF4F3B;letter-spacing:.1em;text-transform:uppercase;margin-bottom:.45rem}
        .form-input{width:100%;padding:.82rem 1.1rem .82rem 2.9rem;background:#FFF5F3;border:1.5px solid rgba(255,79,59,.3);border-radius:12px;color:#1A1A1A;font-family:'Nunito',sans-serif;font-size:.92rem;font-weight:600;outline:none;transition:border-color .3s,box-shadow .3s}
        .form-input::placeholder{color:#C4A09A}
        .form-input:focus{border-color:#FF4F3B;box-shadow:0 0 0 4px rgba(255,79,59,.15)}
        .input-ico{position:absolute;left:.9rem;top:2.3rem;font-size:1rem;pointer-events:none}
        .pw-hint{font-size:.72rem;color:#B08080;margin-top:.35rem;padding-left:.2rem}
        .btn-submit{width:100%;padding:1rem;background:linear-gradient(135deg,#FF4F3B,#D63B28);border:none;border-radius:12px;color:#fff;font-family:'Nunito',sans-serif;font-size:.95rem;font-weight:800;cursor:none;letter-spacing:.05em;box-shadow:0 6px 28px rgba(255,79,59,.45);transition:all .28s;margin-top:.3rem}
        .btn-submit:hover{transform:translateY(-2px);box-shadow:0 12px 40px rgba(255,79,59,.65)}
        .terms-note{font-size:.72rem;color:#B08080;text-align:center;margin-top:.9rem;line-height:1.6}
        .terms-note a{color:var(--v5);text-decoration:none}
        .divider{display:flex;align-items:center;gap:.8rem;margin:1.2rem 0;color:var(--t3);font-size:.78rem}
        .divider::before,.divider::after{content:'';flex:1;height:1px;background:rgba(255,79,59,.2)}
        .alert-error{background:rgba(255,79,59,.1);border:1px solid rgba(255,79,59,.35);border-radius:10px;padding:.7rem 1rem;font-size:.82rem;color:#C0392B;margin-bottom:1.2rem;display:flex;align-items:center;gap:.5rem}
        .card-foot{text-align:center;margin-top:1.3rem;font-size:.82rem;color:#8C6058}
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
        <div className="blob" style={{width:'500px', height:'500px', background:'rgba(255,79,59,.32)', top:'-12%', right:'-10%', opacity:1, animationDuration:'18s'}}></div>
        <div className="blob" style={{width:'420px', height:'420px', background:'rgba(255,79,59,.22)', bottom:'0%', left:'-8%', opacity:1, animationDuration:'22s', animationDelay:'-8s'}}></div>
        <div className="blob" style={{width:'280px', height:'280px', background:'rgba(255,180,120,.25)', top:'35%', right:'35%', opacity:1, animationDuration:'15s', animationDelay:'-4s'}}></div>
      </div>

      <div className="topbar">
        <Link className="logo" to="/"><div className="logo-mark">⏳</div>TimeVaulth</Link>
        <Link to="/login" className="topbar-link">Already a member? Sign in →</Link>
      </div>

      <div className="auth-wrap">
        <div className="auth-grid">
          <div className="auth-left">
            <div className="auth-brand"><div className="auth-brand-ico">⏳</div>TimeVaulth</div>
            <h2 className="auth-tagline">Start your<br /><span className="g">memory journey.</span></h2>
            <p className="auth-desc">Join millions of memory keepers who are sealing their most precious moments for the future.</p>
            <div className="perks-grid">
              <div className="perk"><span className="perk-ico">🆓</span> Free 10 vaults</div>
              <div className="perk"><span className="perk-ico">🔐</span> Secure sealing</div>
              <div className="perk"><span className="perk-ico">📍</span> Geo-pinning</div>
              <div className="perk"><span className="perk-ico">👥</span> Friend sharing</div>
              <div className="perk"><span className="perk-ico">🏆</span> Streak rewards</div>
              <div className="perk"><span className="perk-ico">🔔</span> Unlock alerts</div>
            </div>
          </div>
          <div className="auth-card">
            <div className="card-head">
              <h2>🌀 Create Account</h2>
              <p>Join TimeVaulth — it only takes 30 seconds</p>
            </div>
            
            {error && <div className="alert-error">⚠️ {error}</div>}
            
            <form onSubmit={handleRegister} autoComplete="on">
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
                <label className="form-label">Email Address</label>
                <span className="input-ico">✉️</span>
                <input 
                  className="form-input" 
                  type="email" 
                  placeholder="you@example.com" 
                  required 
                  autoComplete="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
                  autoComplete="new-password" 
                  minLength="6"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <div className="pw-hint">Minimum 6 characters</div>
              </div>
              <button type="submit" className="btn-submit">Create My Account 🚀</button>
              <div className="terms-note">By creating an account, you agree to our <Link to="#">Terms</Link> &amp; <Link to="#">Privacy Policy</Link>.</div>
            </form>
            <div className="divider">or</div>
            <div className="card-foot">Already a member? <Link to="/login">Sign in here</Link></div>
          </div>
        </div>
      </div>
      <div className="page-footer">© 2026 TimeVaulth — Lock memories. Unlock joy. 🧡</div>
    </>
  );
}
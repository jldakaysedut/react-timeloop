import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

export default function LandingPage() {
  const dotRef = useRef(null);
  const ringRef = useRef(null);
  
  // States for sliders
  const [vIndex, setVIndex] = useState(0);
  const [tIndex, setTIndex] = useState(0);
  const [isVPause, setIsVPause] = useState(false);
  const [isTPause, setIsTPause] = useState(false);

  useEffect(() => {
    // --- Cursor Animation (Exact copy from your script) ---
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

    // Hover effects for links and buttons
    const links = document.querySelectorAll('a, button');
    const handleMouseEnter = () => {
      if (ringRef.current) {
        ringRef.current.style.width = '44px';
        ringRef.current.style.height = '44px';
        ringRef.current.style.borderColor = 'var(--pink)';
      }
    };
    const handleMouseLeave = () => {
      if (ringRef.current) {
        ringRef.current.style.width = '30px';
        ringRef.current.style.height = '30px';
        ringRef.current.style.borderColor = 'var(--v4)';
      }
    };

    links.forEach(el => {
      el.addEventListener('mouseenter', handleMouseEnter);
      el.addEventListener('mouseleave', handleMouseLeave);
    });

    // --- Scroll Reveal Observer (Exact copy) ---
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) e.target.classList.add('v');
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.r').forEach(el => obs.observe(el));

    // Cleanup
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(reqId);
      links.forEach(el => {
        el.removeEventListener('mouseenter', handleMouseEnter);
        el.removeEventListener('mouseleave', handleMouseLeave);
      });
      obs.disconnect();
    };
  }, []);

  // --- Vault Slider Interval ---
  useEffect(() => {
    if (isVPause) return;
    const timer = setInterval(() => {
      setVIndex((prev) => (prev >= 3 ? 0 : prev + 1));
    }, 3400);
    return () => clearInterval(timer);
  }, [isVPause]);

  // --- Testimonials Slider Interval ---
  useEffect(() => {
    if (isTPause) return;
    const timer = setInterval(() => {
      setTIndex((prev) => (prev >= 3 ? 0 : prev + 1));
    }, 4200);
    return () => clearInterval(timer);
  }, [isTPause]);

  return (
    <>
      {/* 100% EXACT CSS Galing sa index.php mo */}
      <style>{`
        :root{--bg:#FFE4DC;--bg2:#FFDDD5;--bg3:#FFCFBF;--card:#FFFFFF;--v1:#FFD0C4;--v2:#FF9A8B;--v3:#FF6B5B;--v4:#FF4F3B;--v5:#D63B28;--v6:#8C3020;--pink:#D63B28;--teal:#1D9E75;--gold:#C07800;--white:#1A1A1A;--t2:#7A4A42;--t3:#B08080;--border:rgba(255,79,59,.28);--glow:rgba(255,79,59,.25)}
        *,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
        html{scroll-behavior:smooth}
        body{font-family:'Nunito',sans-serif;background:linear-gradient(160deg,#FFE4DC,#FFCFBF);color:#1A1A1A;overflow-x:hidden;cursor:none}
        #dot{position:fixed;width:9px;height:9px;background:var(--v4);border-radius:50%;pointer-events:none;z-index:9999;transform:translate(-50%,-50%)}
        #ring{position:fixed;width:30px;height:30px;border:1.5px solid var(--v4);border-radius:50%;pointer-events:none;z-index:9998;transform:translate(-50%,-50%);transition:left .13s ease,top .13s ease,width .25s,height .25s,border-color .25s;opacity:.7}
        /* NAV */
        nav{position:fixed;top:0;left:0;right:0;z-index:500;display:flex;align-items:center;justify-content:space-between;padding:1rem 5vw;background:rgba(255,228,220,.92);backdrop-filter:blur(18px);border-bottom:1.5px solid rgba(255,79,59,.28);box-shadow:0 2px 20px rgba(255,79,59,.1);animation:navIn .9s ease both}
        .logo{display:flex;align-items:center;gap:.6rem;font-family:'Sora',sans-serif;font-size:1.4rem;font-weight:800;color:#FF4F3B;text-decoration:none}
        .logo-mark{width:34px;height:34px;border-radius:10px;background:linear-gradient(135deg,var(--v3),var(--pink));display:flex;align-items:center;justify-content:center;font-size:1rem;flex-shrink:0}
        .nav-links{display:flex;gap:2.2rem;list-style:none}
        .nav-links a{color:#8C5A52;text-decoration:none;font-size:.82rem;font-weight:600;letter-spacing:.12em;text-transform:uppercase;transition:color .3s;position:relative}
        .nav-links a::after{content:'';position:absolute;bottom:-4px;left:0;right:100%;height:2px;background:linear-gradient(90deg,var(--v4),var(--pink));transition:right .3s;border-radius:2px}
        .nav-links a:hover{color:#FF4F3B}
        .nav-links a:hover::after{right:0}
        .nav-cta{display:flex;gap:.8rem;align-items:center}
        .btn-nav{padding:.52rem 1.4rem;border-radius:100px;font-family:'Nunito',sans-serif;font-size:.8rem;font-weight:800;letter-spacing:.08em;cursor:none;transition:all .25s;text-decoration:none;display:inline-block}
        .btn-nav-ghost{border:1.5px solid var(--border);color:#FF4F3B}
        .btn-nav-ghost:hover{background:rgba(255,79,59,.1);color:#D63B28}
        .btn-nav-solid{background:linear-gradient(135deg,var(--v3),var(--pink));color:#fff;box-shadow:0 4px 18px rgba(214,59,40,.3)}
        .btn-nav-solid:hover{transform:translateY(-2px);box-shadow:0 8px 28px rgba(214,59,40,.5)}
        /* HERO */
        .hero{min-height:100vh;display:grid;grid-template-columns:1fr 1fr;align-items:center;gap:3rem;padding:9rem 5vw 5rem;position:relative;overflow:hidden}
        .hero-bg{position:absolute;inset:0;z-index:0}
        .blob{position:absolute;border-radius:50%;filter:blur(85px);pointer-events:none;animation:blobMove ease-in-out infinite}
        .hero-left{position:relative;z-index:2}
        .pill{display:inline-flex;align-items:center;gap:.5rem;background:rgba(255,79,59,.12);border:1px solid rgba(255,79,59,.32);border-radius:100px;padding:.32rem 1rem;font-size:.72rem;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:#FF4F3B;margin-bottom:1.6rem;animation:fadeUp .8s .2s ease both}
        .pill-dot{width:6px;height:6px;background:var(--pink);border-radius:50%;animation:pulseDot 1.8s ease-in-out infinite}
        .hero-h1{font-family:'Sora',sans-serif;font-size:clamp(2.4rem,4.5vw,4.6rem);font-weight:800;line-height:1.08;margin-bottom:1.3rem;animation:fadeUp .8s .35s ease both}
        .hero-h1 .g1{background:linear-gradient(120deg,#1A1A1A 0%,#5C3020 60%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;display:block}
        .hero-h1 .g2{background:linear-gradient(120deg,#FF4F3B 0%,#D63B28 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;display:block}
        .hero-sub{font-size:1.05rem;color:#7A4A42;line-height:1.85;max-width:500px;margin-bottom:2.4rem;font-weight:400;animation:fadeUp .8s .5s ease both}
        .hero-btns{display:flex;gap:1rem;flex-wrap:wrap;animation:fadeUp .8s .65s ease both}
        .btn-main{padding:.9rem 2.2rem;background:linear-gradient(135deg,var(--v3),var(--pink));border:none;border-radius:100px;color:#fff;font-family:'Nunito',sans-serif;font-size:.92rem;font-weight:800;cursor:none;box-shadow:0 6px 28px rgba(214,59,40,.35);transition:all .28s;text-decoration:none;display:inline-block}
        .btn-main:hover{transform:translateY(-3px);box-shadow:0 12px 40px rgba(214,59,40,.55)}
        .btn-outline{padding:.9rem 2.2rem;background:transparent;border:1.5px solid rgba(255,79,59,.4);border-radius:100px;color:#FF4F3B;font-family:'Nunito',sans-serif;font-size:.92rem;font-weight:700;cursor:none;transition:all .28s;text-decoration:none;display:inline-block}
        .btn-outline:hover{border-color:#FF4F3B;background:rgba(255,79,59,.1);color:#D63B28}
        .hero-stats{display:flex;gap:2.5rem;margin-top:2.8rem;animation:fadeUp .8s .8s ease both;flex-wrap:wrap}
        .hstat-num{font-family:'Sora',sans-serif;font-size:1.7rem;font-weight:800;background:linear-gradient(135deg,#FF4F3B,#D63B28);-webkit-background-clip:text;-webkit-text-fill-color:transparent;display:block}
        .hstat-lbl{font-size:.72rem;color:#8C5A52;font-weight:600;letter-spacing:.12em;text-transform:uppercase}
        /* HERO SCENE */
        .hero-right{position:relative;z-index:2;display:flex;justify-content:center;align-items:center;animation:fadeUp .8s .4s ease both}
        .scene{position:relative;width:420px;height:420px;display:flex;align-items:center;justify-content:center}
        .orb{width:170px;height:170px;border-radius:50%;background:linear-gradient(135deg,var(--v2),var(--v3),var(--pink));display:flex;align-items:center;justify-content:center;font-size:3.2rem;box-shadow:0 0 55px rgba(255,79,59,.65),0 0 110px rgba(214,59,40,.2);animation:orbBreath 4s ease-in-out infinite;position:relative;z-index:3}
        .orb-ring{position:absolute;border-radius:50%;border-style:dashed;border-width:1px;animation:ringRotate linear infinite}
        .or1{width:230px;height:230px;border-color:rgba(255,79,59,.3);animation-duration:12s}
        .or2{width:300px;height:300px;border-color:rgba(214,59,40,.2);animation-duration:20s;animation-direction:reverse}
        .or3{width:380px;height:380px;border-color:rgba(29,158,117,.13);animation-duration:32s}
        .fc{position:absolute;background:rgba(255,255,255,.92);border:1px solid rgba(255,79,59,.25);border-radius:14px;padding:.6rem 1rem;font-size:.7rem;font-weight:700;display:flex;align-items:center;gap:.45rem;backdrop-filter:blur(12px);box-shadow:0 8px 30px rgba(255,79,59,.15);white-space:nowrap;z-index:5}
        .fc em{font-style:normal;font-size:1rem}
        .fc1{top:28px;left:-10px;color:#FF4F3B;animation:flt 4.2s ease-in-out infinite}
        .fc2{bottom:45px;left:-20px;color:#1D9E75;animation:flt 5s .7s ease-in-out infinite}
        .fc3{top:35px;right:-15px;color:#D63B28;animation:flt 4.6s 1.1s ease-in-out infinite}
        .fc4{bottom:25px;right:0;color:#C07800;animation:flt 3.9s .3s ease-in-out infinite}
        /* MARQUEE */
        .marquee{padding:.85rem 0;background:linear-gradient(90deg,#FFCFBF,#FFB8A8,#FFCFBF);overflow:hidden;border-top:1px solid rgba(255,79,59,.2);border-bottom:1px solid rgba(255,79,59,.2)}
        .m-track{display:flex;gap:3.5rem;animation:marquee 20s linear infinite;white-space:nowrap}
        .m-item{font-size:.72rem;font-weight:700;letter-spacing:.25em;text-transform:uppercase;color:#FF4F3B;display:flex;align-items:center;gap:.8rem}
        .m-item::before{content:'✦';color:#D63B28;font-size:.5rem}
        /* SECTIONS */
        section.s{padding:7rem 5vw;position:relative}
        .s-inner{max-width:1200px;margin:0 auto}
        .s-head{text-align:center;margin-bottom:4rem}
        .s-tag{font-size:.7rem;font-weight:700;letter-spacing:.3em;text-transform:uppercase;color:var(--pink);margin-bottom:.9rem;display:flex;align-items:center;justify-content:center;gap:.8rem}
        .s-tag::before,.s-tag::after{content:'';width:2rem;height:1px;background:var(--pink)}
        .s-title{font-family:'Sora',sans-serif;font-size:clamp(1.9rem,3.5vw,3.2rem);font-weight:800;line-height:1.18;background:linear-gradient(130deg,#1A1A1A 30%,#5C3020);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:1rem}
        .s-sub{font-size:.96rem;color:#7A4A42;max-width:520px;margin:0 auto;line-height:1.85;font-weight:400}
        /* FEATURE CARDS */
        .feat3{display:grid;grid-template-columns:repeat(3,1fr);gap:1.6rem}
        .fcard{background:rgba(255,255,255,.8);border:1px solid rgba(255,79,59,.2);border-radius:22px;padding:2.2rem 2rem;position:relative;overflow:hidden;transition:transform .35s,box-shadow .35s,border-color .35s;cursor:default}
        .fcard::before{content:'';position:absolute;inset:0;background:linear-gradient(135deg,rgba(255,79,59,.05),transparent);opacity:0;transition:opacity .35s}
        .fcard:hover{transform:translateY(-8px);box-shadow:0 22px 55px rgba(255,79,59,.18);border-color:rgba(255,79,59,.4)}
        .fcard:hover::before{opacity:1}
        .fcard-icon{width:54px;height:54px;border-radius:15px;background:linear-gradient(135deg,#FF9A8B,#FF4F3B);border:1px solid rgba(255,79,59,.3);display:flex;align-items:center;justify-content:center;font-size:1.6rem;margin-bottom:1.3rem;transition:transform .3s}
        .fcard:hover .fcard-icon{transform:scale(1.1) rotate(-6deg)}
        .fcard-title{font-family:'Sora',sans-serif;font-size:1.1rem;font-weight:700;color:#1A1A1A;margin-bottom:.7rem}
        .fcard-desc{font-size:.88rem;color:#7A4A42;line-height:1.78}
        .fcard-tag{display:inline-block;margin-top:1.1rem;padding:.28rem .85rem;border-radius:100px;font-size:.68rem;font-weight:800;letter-spacing:.12em;text-transform:uppercase}
        .ft-pink{background:rgba(214,59,40,.15);color:var(--pink);border:1px solid rgba(214,59,40,.28)}
        .ft-teal{background:rgba(29,158,117,.1);color:var(--teal);border:1px solid rgba(29,158,117,.22)}
        .ft-gold{background:rgba(192,120,0,.1);color:#C07800;border:1px solid rgba(192,120,0,.25)}
        .ft-v{background:rgba(255,79,59,.12);color:#FF4F3B;border:1px solid rgba(255,79,59,.3)}
        /* HOW IT WORKS */
        .how-bg{background:rgba(255,200,185,.3)}
        .steps{display:grid;grid-template-columns:repeat(4,1fr);gap:1.4rem;position:relative}
        .steps::before{content:'';position:absolute;top:42px;left:12.5%;right:12.5%;height:1px;background:linear-gradient(90deg,transparent,#FF4F3B,#D63B28,#FF4F3B,transparent);z-index:0}
        .step{background:rgba(255,255,255,.75);border:1px solid rgba(255,79,59,.2);border-radius:20px;padding:2rem 1.5rem;text-align:center;position:relative;transition:transform .3s,box-shadow .3s}
        .step:hover{transform:translateY(-6px);box-shadow:0 18px 45px rgba(255,79,59,.18)}
        .step-num{position:absolute;top:-14px;left:50%;transform:translateX(-50%);width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,var(--v3),var(--pink));display:flex;align-items:center;justify-content:center;font-size:.7rem;font-weight:900;color:#fff;box-shadow:0 4px 14px rgba(214,59,40,.45);z-index:1}
        .step-ico{font-size:2.2rem;margin-bottom:.9rem;display:block}
        .step-t{font-family:'Sora',sans-serif;font-size:.95rem;font-weight:700;color:#1A1A1A;margin-bottom:.5rem}
        .step-d{font-size:.8rem;color:#7A4A42;line-height:1.72}
        /* SLIDER */
        .slider-wrap{position:relative;overflow:hidden;margin-top:3rem}
        .slider-track{display:flex;gap:1.5rem;transition:transform .6s cubic-bezier(.25,.46,.45,.94)}
        .vcard{min-width:270px;background:rgba(255,255,255,.85);border:1px solid rgba(255,79,59,.2);border-radius:22px;overflow:hidden;transition:transform .32s,box-shadow .32s;flex-shrink:0}
        .vcard:hover{transform:translateY(-7px);box-shadow:0 22px 55px rgba(255,79,59,.22)}
        .vcard-thumb{height:155px;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;font-size:3.4rem}
        .vt1{background:linear-gradient(135deg,#2A0D09,#8B2A1E)}
        .vt2{background:linear-gradient(135deg,#0D2219,#1D9E75)}
        .vt3{background:linear-gradient(135deg,#2A0D0D,#CC3D2B)}
        .vt4{background:linear-gradient(135deg,#0d381a,#1fa845)}
        .vt5{background:linear-gradient(135deg,#381e0d,#a85e1f)}
        .vcard-lock{position:absolute;top:10px;right:10px;background:rgba(255,255,255,.85);border:1px solid rgba(255,79,59,.25);border-radius:8px;padding:.22rem .55rem;font-size:.62rem;font-weight:700;color:#D63B28;backdrop-filter:blur(6px);display:flex;align-items:center;gap:.3rem}
        .vcard-body{padding:1.1rem 1.2rem 1.4rem}
        .vcard-name{font-family:'Sora',sans-serif;font-size:.92rem;font-weight:700;color:#1A1A1A;margin-bottom:.35rem}
        .vcard-date{font-size:.72rem;color:#FF4F3B;font-weight:600;margin-bottom:.55rem;display:flex;align-items:center;gap:.3rem}
        .badge{display:inline-flex;align-items:center;gap:.3rem;font-size:.65rem;font-weight:700;text-transform:uppercase;letter-spacing:.1em;padding:.22rem .65rem;border-radius:100px}
        .b-pub{background:rgba(29,158,117,.1);color:#1D9E75;border:1px solid rgba(29,158,117,.22)}
        .b-fri{background:rgba(255,79,59,.12);color:#FF4F3B;border:1px solid rgba(255,79,59,.28)}
        .b-priv{background:rgba(214,59,40,.08);color:#D63B28;border:1px solid rgba(214,59,40,.22)}
        .sl-ctrl{display:flex;align-items:center;justify-content:center;gap:1rem;margin-top:2rem}
        .sl-btn{width:42px;height:42px;border-radius:50%;background:rgba(255,79,59,.12);border:1.5px solid rgba(255,79,59,.3);color:#FF4F3B;font-size:1.1rem;cursor:none;display:flex;align-items:center;justify-content:center;transition:all .25s}
        .sl-btn:hover{background:#FF4F3B;border-color:#FF4F3B;color:#fff;transform:scale(1.1)}
        .sl-dots{display:flex;gap:.5rem}
        .sl-dot{width:8px;height:8px;border-radius:50%;background:rgba(255,79,59,.28);cursor:none;transition:all .3s}
        .sl-dot.on{background:#FF4F3B;width:22px;border-radius:4px}
        /* STATS */
        .stats-band{background:linear-gradient(135deg,#FFCFBF,#FFB8A8);border-top:1px solid rgba(255,79,59,.2);border-bottom:1px solid rgba(255,79,59,.2);padding:4.5rem 5vw}
        .stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:2rem;max-width:1100px;margin:0 auto;text-align:center}
        .stat-n{font-family:'Sora',sans-serif;font-size:clamp(2.2rem,4vw,3.8rem);font-weight:900;background:linear-gradient(135deg,#FF4F3B,#D63B28);-webkit-background-clip:text;-webkit-text-fill-color:transparent;display:block}
        .stat-l{font-size:.78rem;color:#7A4A42;letter-spacing:.15em;text-transform:uppercase;margin-top:.4rem;font-weight:600}
        /* SHARING */
        .split{display:grid;grid-template-columns:1fr 1fr;gap:4rem;align-items:center}
        .split-phone-wrap{display:flex;justify-content:center;position:relative}
        .phone{width:240px;height:430px;background:linear-gradient(160deg,#FFD0C4,#FFFFFF);border:1.5px solid rgba(255,79,59,.3);border-radius:38px;position:relative;overflow:hidden;box-shadow:0 24px 65px rgba(255,79,59,.2);animation:phoneRock 5.5s ease-in-out infinite}
        .phone-notch{width:82px;height:22px;background:#FFE4DC;border-radius:0 0 14px 14px;margin:0 auto}
        .phone-inner{padding:1rem .9rem}
        .phone-lbl{font-size:.6rem;font-weight:800;color:#FF4F3B;text-align:center;margin-bottom:.9rem;letter-spacing:.14em;text-transform:uppercase}
        .pcard{background:rgba(255,79,59,.1);border:1px solid rgba(255,79,59,.2);border-radius:12px;padding:.65rem .75rem;margin-bottom:.55rem;display:flex;align-items:center;gap:.55rem}
        .pc-ico{font-size:1.35rem}
        .pc-t{font-size:.65rem;font-weight:700;color:#1A1A1A}
        .pc-s{font-size:.58rem;color:#8C6058}
        .phone-fab{position:absolute;bottom:1.2rem;right:1rem;width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,var(--v3),var(--pink));display:flex;align-items:center;justify-content:center;font-size:1.25rem;box-shadow:0 4px 22px rgba(214,59,40,.55);animation:fabPulse 2.8s ease-in-out infinite}
        .bubble{position:absolute;background:rgba(255,255,255,.92);border:1px solid rgba(255,79,59,.22);border-radius:14px;padding:.48rem .85rem;display:flex;align-items:center;gap:.4rem;font-size:.68rem;font-weight:700;color:#5C3D38;backdrop-filter:blur(8px);box-shadow:0 8px 26px rgba(255,79,59,.12)}
        .bb1{top:22px;right:-62px;color:#1D9E75;animation:flt 4.2s ease-in-out infinite}
        .bb2{bottom:55px;left:-78px;color:#D63B28;animation:flt 5s .6s ease-in-out infinite}
        .bb3{top:50%;right:-74px;transform:translateY(-50%);color:#C07800;animation:flt 4.7s 1s ease-in-out infinite}
        .share-opts{display:flex;flex-direction:column;gap:.85rem;margin-top:1.9rem}
        .sopt{display:flex;align-items:center;gap:1rem;padding:1rem 1.2rem;background:rgba(255,255,255,.6);border:1px solid rgba(255,79,59,.2);border-radius:15px;transition:all .3s;cursor:default}
        .sopt:hover{background:rgba(255,255,255,.9);border-color:rgba(255,79,59,.4);transform:translateX(7px)}
        .sopt-ico{width:42px;height:42px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:1.2rem;flex-shrink:0}
        .si-pub{background:rgba(29,158,117,.12);border:1px solid rgba(29,158,117,.22)}
        .si-fri{background:rgba(255,79,59,.12);border:1px solid rgba(255,79,59,.28)}
        .si-priv{background:rgba(214,59,40,.08);border:1px solid rgba(214,59,40,.22)}
        .sopt-title{font-size:.88rem;font-weight:700;color:#1A1A1A}
        .sopt-sub{font-size:.74rem;color:#8C6058}
        /* TESTIMONIALS */
        .testi-bg{background:rgba(255,200,185,.25)}
        .ttrack{display:flex;gap:1.5rem;transition:transform .6s cubic-bezier(.25,.46,.45,.94)}
        .tcard{min-width:335px;background:rgba(255,255,255,.85);border:1px solid rgba(255,79,59,.2);border-radius:22px;padding:1.9rem;flex-shrink:0;transition:transform .3s,box-shadow .3s}
        .tcard:hover{transform:translateY(-5px);box-shadow:0 18px 45px rgba(255,79,59,.18)}
        .tcard-stars{color:#C07800;font-size:.88rem;margin-bottom:.9rem;letter-spacing:.1em}
        .tcard-text{font-size:.88rem;color:#7A4A42;line-height:1.82;margin-bottom:1.3rem;font-style:italic}
        .tcard-auth{display:flex;align-items:center;gap:.75rem}
        .avtr{width:38px;height:38px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:.8rem;color:#fff;flex-shrink:0}
        .av1{background:linear-gradient(135deg,#FF6B5B,#D63B28)}.av2{background:linear-gradient(135deg,#0d62aa,#1D9E75)}.av3{background:linear-gradient(135deg,#D63B28,#C07800)}.av4{background:linear-gradient(135deg,#1D9E75,#FF6B5B)}.av5{background:linear-gradient(135deg,#C07800,#D63B28)}
        .tcard-name{font-size:.88rem;font-weight:700;color:#1A1A1A}
        .tcard-role{font-size:.72rem;color:#FF4F3B}
        /* CTA */
        .cta-sec{padding:8rem 5vw;text-align:center;position:relative;overflow:hidden}
        .cta-orb{position:absolute;width:650px;height:650px;top:50%;left:50%;transform:translate(-50%,-50%);background:radial-gradient(circle,rgba(255,79,59,.15) 0%,transparent 70%);pointer-events:none;animation:orbBreath 7s ease-in-out infinite}
        .cta-h{font-family:'Sora',sans-serif;font-size:clamp(2rem,4.5vw,4.2rem);font-weight:800;background:linear-gradient(130deg,#1A1A1A,#5C3020,#D63B28);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:1.3rem;position:relative;z-index:1}
        .cta-s{font-size:1rem;color:#7A4A42;max-width:460px;margin:0 auto 2.5rem;line-height:1.85;position:relative;z-index:1}
        .cta-form{display:flex;gap:.8rem;justify-content:center;flex-wrap:wrap;position:relative;z-index:1}
        .cta-input{padding:.88rem 1.6rem;background:rgba(255,255,255,.8);border:1.5px solid rgba(255,79,59,.3);border-radius:100px;color:#1A1A1A;font-family:'Nunito',sans-serif;font-size:.9rem;font-weight:600;outline:none;width:275px;transition:border-color .3s,box-shadow .3s}
        .cta-input::placeholder{color:#B08080}
        .cta-input:focus{border-color:#FF4F3B;box-shadow:0 0 0 3px rgba(255,79,59,.15)}
        .cta-note{margin-top:1rem;font-size:.74rem;color:#B08080;position:relative;z-index:1}
        /* FOOTER */
        footer{border-top:1px solid rgba(255,79,59,.15);padding:2.8rem 5vw;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1.2rem}
        .foot-brand{font-family:'Sora',sans-serif;font-size:1.1rem;font-weight:800;color:#FF4F3B}
        .foot-links{display:flex;gap:2rem;flex-wrap:wrap}
        .foot-links a{color:#B08080;text-decoration:none;font-size:.8rem;font-weight:600;transition:color .3s}
        .foot-links a:hover{color:#FF4F3B}
        .foot-copy{font-size:.78rem;color:#B08080}
        /* REVEAL */
        .r{opacity:0;transform:translateY(38px);transition:opacity .85s ease,transform .85s ease}
        .r.v{opacity:1;transform:translateY(0)}
        .d1{transition-delay:.1s}.d2{transition-delay:.2s}.d3{transition-delay:.3s}.d4{transition-delay:.4s}
        /* KEYFRAMES */
        @keyframes navIn{from{opacity:0;transform:translateY(-18px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(26px)}to{opacity:1;transform:translateY(0)}}
        @keyframes blobMove{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(32px,-24px) scale(1.08)}66%{transform:translate(-22px,18px) scale(.94)}}
        @keyframes pulseDot{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.7);opacity:.45}}
        @keyframes orbBreath{0%,100%{transform:scale(1)}50%{transform:scale(1.07)}}
        @keyframes ringRotate{from{transform:rotate(0)}to{transform:rotate(360deg)}}
        @keyframes flt{0%,100%{transform:translateY(0)}50%{transform:translateY(-11px)}}
        @keyframes phoneRock{0%,100%{transform:translateY(0) rotate(-1.5deg)}50%{transform:translateY(-13px) rotate(1.5deg)}}
        @keyframes fabPulse{0%,100%{box-shadow:0 4px 22px rgba(214,59,40,.55)}50%{box-shadow:0 4px 44px rgba(214,59,40,1),0 0 55px rgba(214,59,40,.3)}}
        @keyframes marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}
        /* RESPONSIVE */
        @media(max-width:1100px){.feat3{grid-template-columns:1fr 1fr}.stats-grid{grid-template-columns:repeat(2,1fr)}}
        @media(max-width:860px){.hero{grid-template-columns:1fr;text-align:center;padding:8rem 5vw 4rem}.hero-sub,.hero-stats{margin-left:auto;margin-right:auto}.hero-btns{justify-content:center}.hero-right{display:none}.feat3{grid-template-columns:1fr}.steps{grid-template-columns:1fr 1fr}.steps::before{display:none}.split{grid-template-columns:1fr}.split-phone-wrap{display:none}.nav-links{display:none}footer{flex-direction:column;text-align:center}}
        @media(max-width:520px){.steps{grid-template-columns:1fr}.stats-grid{grid-template-columns:1fr 1fr}.tcard{min-width:280px}.vcard{min-width:240px}}
      `}</style>

      {/* 100% EXACT HTML Galing sa index.php mo (converted to JSX classes/styles) */}
      <div id="dot" ref={dotRef}></div>
      <div id="ring" ref={ringRef}></div>

      <nav>
        <Link className="logo" to="/"><div className="logo-mark">⏳</div>TimeVaulth</Link>
        <ul className="nav-links">
          <li><a href="#features">Features</a></li>
          <li><a href="#how">How It Works</a></li>
          <li><a href="#vaults">Explore</a></li>
          <li><a href="#sharing">Sharing</a></li>
        </ul>
        <div className="nav-cta">
          <Link to="/login" className="btn-nav btn-nav-ghost">Login</Link>
          <Link to="/register" className="btn-nav btn-nav-solid">Get Started →</Link>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-bg">
          <div className="blob" style={{width: '520px', height: '520px', background: '#FF9A8B', top: '-8%', left: '-8%', opacity: 0.38, animationDuration: '15s'}}></div>
          <div className="blob" style={{width: '420px', height: '420px', background: 'rgba(214,59,40,.22)', top: '18%', right: '-6%', opacity: 0.32, animationDuration: '19s', animationDelay: '-6s'}}></div>
          <div className="blob" style={{width: '360px', height: '360px', background: 'rgba(29,158,117,.13)', bottom: '8%', left: '32%', opacity: 0.28, animationDuration: '13s', animationDelay: '-3s'}}></div>
        </div>
        <div className="hero-left">
          <div className="pill"><span className="pill-dot"></span>Now open to everyone ✨</div>
          <h1 className="hero-h1">
            <span className="g1">Lock your memories.</span>
            <span className="g2">Unlock the magic.</span>
          </h1>
          <p className="hero-sub">Upload photos, videos, or any file — seal it with a future date. Share with friends or the world. Let time be the greatest surprise of all. 🔐</p>
          <div className="hero-btns">
            <Link to="/register" className="btn-main">Create Your Vault 🚀</Link>
            <a href="#how" className="btn-outline">See How It Works</a>
          </div>
          <div className="hero-stats">
            <div><span className="hstat-num">2.4M+</span><span className="hstat-lbl">Vaults Sealed</span></div>
            <div><span className="hstat-num">98%</span><span className="hstat-lbl">Happy Users</span></div>
            <div><span className="hstat-num">180+</span><span className="hstat-lbl">Countries</span></div>
          </div>
        </div>
        <div className="hero-right">
          <div className="scene">
            <div className="orb-ring or1"></div><div className="orb-ring or2"></div><div className="orb-ring or3"></div>
            <div className="orb">⏳</div>
            <div className="fc fc1"><em>📸</em> Photo sealed — 2027</div>
            <div className="fc fc2"><em>🔓</em> 3 vaults unlocked today!</div>
            <div className="fc fc3"><em>🌍</em> Shared publicly</div>
            <div className="fc fc4"><em>⏰</em> Opens in 42 days</div>
          </div>
        </div>
      </section>

      <div className="marquee">
        <div className="m-track">
          <span className="m-item">Time Capsule</span><span className="m-item">Photo Vault</span><span className="m-item">Future Messages</span><span className="m-item">Share with Friends</span><span className="m-item">Public Drops</span><span className="m-item">Memory Lock</span><span className="m-item">Geo Pinning</span><span className="m-item">Streak Rewards</span>
          <span className="m-item">Time Capsule</span><span className="m-item">Photo Vault</span><span className="m-item">Future Messages</span><span className="m-item">Share with Friends</span><span className="m-item">Public Drops</span><span className="m-item">Memory Lock</span><span className="m-item">Geo Pinning</span><span className="m-item">Streak Rewards</span>
        </div>
      </div>

      <section id="features" className="s">
        <div className="s-inner">
          <div className="s-head r">
            <div className="s-tag">Capabilities</div>
            <h2 className="s-title">Everything you need<br/>to preserve what matters</h2>
            <p className="s-sub">Every feature crafted to bridge the gap between today's moment and tomorrow's memory.</p>
          </div>
          <div className="feat3">
            <div className="fcard r"><div className="fcard-icon">📦</div><div className="fcard-title">Seal Any Memory</div><p className="fcard-desc">Upload photos, videos, audio, documents — anything up to 2 GB per vault. Securely preserved until the exact moment you choose.</p><span className="fcard-tag ft-pink">Multi-file Upload</span></div>
            <div className="fcard r d1"><div className="fcard-icon">🗓️</div><div className="fcard-title">Set the Unlock Date</div><p className="fcard-desc">Pick any date in the future — a birthday, anniversary, graduation, or a random Tuesday in 2035. Stays sealed until that exact moment.</p><span className="fcard-tag ft-teal">Time Lock</span></div>
            <div className="fcard r d2"><div className="fcard-icon">📍</div><div className="fcard-title">Geo-Pin Memories</div><p className="fcard-desc">Attach your vault to a real-world location. Relive not just the memory but exactly where on Earth it happened — on an interactive map.</p><span className="fcard-tag ft-gold">Location Lock</span></div>
            <div className="fcard r"><div className="fcard-icon">✨</div><div className="fcard-title">Share the Surprise</div><p className="fcard-desc">Keep it private, send to friends, or release as a public drop for the world to discover. Your rules, your reveal, your story.</p><span className="fcard-tag ft-v">Flexible Sharing</span></div>
            <div className="fcard r d1"><div className="fcard-icon">🏆</div><div className="fcard-title">Streaks & Badges</div><p className="fcard-desc">Earn rewards for consistent vault creation. Collect badges, climb the leaderboard, and celebrate your dedication to memories.</p><span className="fcard-tag ft-pink">Gamification</span></div>
            <div className="fcard r d2"><div className="fcard-icon">💬</div><div className="fcard-title">Friend Messaging</div><p className="fcard-desc">Connect with friends, send real-time messages, and build a community of memory keepers who share in each other's reveals.</p><span className="fcard-tag ft-teal">Social Hub</span></div>
          </div>
        </div>
      </section>

      <section id="how" className="s how-bg">
        <div className="s-inner">
          <div className="s-head r">
            <div className="s-tag">Process</div>
            <h2 className="s-title">Four steps to forever 💜</h2>
            <p className="s-sub">Creating a time vault takes less than 60 seconds. Pure magic from the very first click.</p>
          </div>
          <div className="steps">
            <div className="step r"><div className="step-num">1</div><span className="step-ico">📤</span><div className="step-t">Upload Your File</div><p className="step-d">Drag & drop photos, videos, notes, or any file. All formats supported with instant preview.</p></div>
            <div className="step r d1"><div className="step-num">2</div><span className="step-ico">🗓️</span><div className="step-t">Pick a Future Date</div><p className="step-d">Choose exactly when your vault unlocks — tomorrow, next year, or decades from now.</p></div>
            <div className="step r d2"><div className="step-num">3</div><span className="step-ico">🔐</span><div className="step-t">Seal & Share</div><p className="step-d">Make it private, share with friends, or release as a public surprise drop to the community.</p></div>
            <div className="step r d3"><div className="step-num">4</div><span className="step-ico">🎉</span><div className="step-t">The Big Reveal</div><p className="step-d">Get notified the moment it unlocks. Relive the memory. Feel the magic of time.</p></div>
          </div>
        </div>
      </section>

      <section id="vaults" className="s">
        <div className="s-inner">
          <div className="s-head r">
            <div className="s-tag">Explore</div>
            <h2 className="s-title">Recently unlocked vaults 🔓</h2>
            <p className="s-sub">These capsules just opened — shared publicly by their creators. Your story starts here.</p>
          </div>
          <div className="slider-wrap r">
            <div 
              className="slider-track" 
              style={{ transform: `translateX(-${vIndex * 286}px)` }}
              onMouseEnter={() => setIsVPause(true)}
              onMouseLeave={() => setIsVPause(false)}
            >
              <div className="vcard vt1"><div className="vcard-thumb"><span>🌸</span><div className="vcard-lock">🔓 Unlocked</div></div><div className="vcard-body"><div className="vcard-name">Cherry Blossom Trip 2022</div><div className="vcard-date">📅 Opened Apr 2025</div><span className="badge b-pub">🌍 Public</span></div></div>
              <div className="vcard vt2"><div className="vcard-thumb"><span>💌</span><div className="vcard-lock">🔓 Unlocked</div></div><div className="vcard-body"><div className="vcard-name">Letter to My Future Self</div><div className="vcard-date">📅 Opened Mar 2025</div><span className="badge b-fri">👥 Friends</span></div></div>
              <div className="vcard vt3"><div className="vcard-thumb"><span>🎓</span><div className="vcard-lock">🔓 Unlocked</div></div><div className="vcard-body"><div className="vcard-name">Graduation Day Memories</div><div className="vcard-date">📅 Opened Jun 2025</div><span className="badge b-pub">🌍 Public</span></div></div>
              <div className="vcard vt4"><div className="vcard-thumb"><span>🎂</span><div className="vcard-lock">🔒 Locked</div></div><div className="vcard-body"><div className="vcard-name">30th Birthday Surprise</div><div className="vcard-date">⏰ Opens in 128 days</div><span className="badge b-fri">👥 Friends</span></div></div>
              <div className="vcard vt5"><div className="vcard-thumb"><span>🌅</span><div class="vcard-lock">🔓 Unlocked</div></div><div className="vcard-body"><div className="vcard-name">Last Summer Sunsets</div><div className="vcard-date">📅 Opened Aug 2025</div><span className="badge b-pub">🌍 Public</span></div></div>
              <div className="vcard vt1"><div className="vcard-thumb"><span>🐾</span><div className="vcard-lock">🔒 Locked</div></div><div className="vcard-body"><div className="vcard-name">Puppy's First Year</div><div className="vcard-date">⏰ Opens in 47 days</div><span className="badge b-priv">🔒 Private</span></div></div>
            </div>
          </div>
          <div className="sl-ctrl r">
            <button className="sl-btn" onClick={() => setVIndex(Math.max(0, vIndex - 1))}>←</button>
            <div className="sl-dots">
              {[0, 1, 2, 3].map(i => (
                <div key={i} className={`sl-dot ${vIndex === i ? 'on' : ''}`} onClick={() => setVIndex(i)}></div>
              ))}
            </div>
            <button className="sl-btn" onClick={() => setVIndex(Math.min(3, vIndex + 1))}>→</button>
          </div>
        </div>
      </section>

      <div className="stats-band">
        <div className="stats-grid">
          <div className="r"><span className="stat-n">2.4M</span><span className="stat-l">Active Creators</span></div>
          <div className="r d1"><span className="stat-n">98%</span><span className="stat-l">Satisfaction Rate</span></div>
          <div className="r d2"><span className="stat-n">14B</span><span className="stat-l">Files Preserved</span></div>
          <div className="r d3"><span className="stat-n">∞</span><span className="stat-l">Possibilities</span></div>
        </div>
      </div>

      <section id="sharing" className="s">
        <div className="s-inner">
          <div className="split">
            <div className="split-phone-wrap r">
              <div className="phone">
                <div className="phone-notch"></div>
                <div className="phone-inner">
                  <div className="phone-lbl">⏳ TimeVaulth</div>
                  <div className="pcard"><div className="pc-ico">📸</div><div><div className="pc-t">Summer 2024</div><div className="pc-s">🔒 Opens Dec 2026</div></div></div>
                  <div className="pcard"><div className="pc-ico">💌</div><div><div className="pc-t">To Future Me</div><div className="pc-s">🌍 Public · 203 views</div></div></div>
                  <div className="pcard"><div className="pc-ico">🎉</div><div><div className="pc-t">Birthday Drop</div><div className="pc-s">👥 Shared w/ 5 friends</div></div></div>
                  <div className="pcard" style={{background: 'rgba(255,79,59,.12)', borderColor: 'rgba(255,79,59,.25)'}}><div className="pc-ico">🔔</div><div><div className="pc-t" style={{color: 'var(--pink)'}}>Vault just opened!</div><div className="pc-s">Cherry Blossom Trip</div></div></div>
                </div>
                <div className="phone-fab">+</div>
              </div>
              <div className="bubble bb1"><span>🌍</span> 2.4k public vaults today</div>
              <div className="bubble bb2"><span>👥</span> 12 friends notified</div>
              <div className="bubble bb3"><span>🎉</span> Vault just unlocked!</div>
            </div>
            <div className="r">
              <div className="s-tag" style={{justifyContent: 'flex-start'}}><span>Sharing</span></div>
              <h2 className="s-title" style={{textAlign: 'left', marginTop: '.8rem'}}>Your vault,<br/>your rules 💜</h2>
              <p className="s-sub" style={{margin: 0, textAlign: 'left'}}>Choose exactly who gets to witness the reveal. Every option designed for maximum delight.</p>
              <div className="share-opts">
                <div className="sopt"><div className="sopt-ico si-pub">🌍</div><div><div className="sopt-title">Public Drop</div><div className="sopt-sub">Anyone can discover & watch your vault unlock in real-time</div></div></div>
                <div className="sopt"><div className="sopt-ico si-fri">👥</div><div><div className="sopt-title">Friends Only</div><div className="sopt-sub">Invite specific people — they get notified the moment it opens</div></div></div>
                <div className="sopt"><div className="sopt-ico si-priv">🔒</div><div><div className="sopt-title">Just For Me</div><div className="sopt-sub">Completely private — a love letter to your future self</div></div></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="s testi-bg">
        <div className="s-inner">
          <div className="s-head r">
            <div className="s-tag">Stories</div>
            <h2 className="s-title">Memories that moved people 🥹</h2>
          </div>
          <div className="slider-wrap r">
            <div 
              className="ttrack" 
              style={{ transform: `translateX(-${tIndex * 351}px)` }}
              onMouseEnter={() => setIsTPause(true)}
              onMouseLeave={() => setIsTPause(false)}
            >
              <div className="tcard"><div className="tcard-stars">★★★★★</div><p className="tcard-text">"I sealed a letter to my daughter on her 5th birthday. When she turned 18 and opened it… we both cried. TimeVaulth gave us a moment we'll never forget. 💜"</p><div className="tcard-auth"><div className="avtr av1">MR</div><div><div className="tcard-name">Maria R.</div><div className="tcard-role">Mom & Memory Keeper</div></div></div></div>
              <div className="tcard"><div className="tcard-stars">★★★★★</div><p className="tcard-text">"Our whole friend group sealed a video from our last night before moving to different cities. Opening it 2 years later felt like pure magic. 🌟"</p><div className="tcard-auth"><div className="avtr av2">JS</div><div><div className="tcard-name">Jake S.</div><div className="tcard-role">College Graduate</div></div></div></div>
              <div className="tcard"><div className="tcard-stars">★★★★★</div><p className="tcard-text">"I use it to send future birthday surprises to my friends. The notification they get when it unlocks is the best part. 10/10 cutest app ever! 🎂"</p><div className="tcard-auth"><div className="avtr av3">AL</div><div><div className="tcard-name">Aisha L.</div><div className="tcard-role">Content Creator</div></div></div></div>
              <div className="tcard"><div className="tcard-stars">★★★★★</div><p className="tcard-text">"As a photographer I seal client galleries with delivery dates set. The whole experience feels premium and clients are always blown away. ✨"</p><div className="tcard-auth"><div class="avtr av4">TN</div><div><div className="tcard-name">Tom N.</div><div className="tcard-role">Wedding Photographer</div></div></div></div>
              <div className="tcard"><div className="tcard-stars">★★★★★</div><p className="tcard-text">"The geo-pin feature is genius. I sealed a vault at the exact spot where I proposed. When my wife opens it on our anniversary… 🥲"</p><div className="tcard-auth"><div className="avtr av5">DK</div><div><div className="tcard-name">David K.</div><div className="tcard-role">Romantic at Heart</div></div></div></div>
            </div>
          </div>
          <div className="sl-ctrl r">
            <button className="sl-btn" onClick={() => setTIndex(Math.max(0, tIndex - 1))}>←</button>
            <div className="sl-dots">
              {[0, 1, 2, 3].map(i => (
                <div key={i} className={`sl-dot ${tIndex === i ? 'on' : ''}`} onClick={() => setTIndex(i)}></div>
              ))}
            </div>
            <button className="sl-btn" onClick={() => setTIndex(Math.min(3, tIndex + 1))}>→</button>
          </div>
        </div>
      </section>

      <section className="cta-sec">
        <div className="cta-orb"></div>
        <div className="blob" style={{width: '320px', height: '320px', background: 'rgba(255,79,59,.2)', top: '20%', left: '8%', filter: 'blur(65px)', opacity: 0.4, animationDuration: '17s'}}></div>
        <div className="blob" style={{width: '320px', height: '320px', background: 'rgba(29,158,117,.12)', bottom: '12%', right: '8%', filter: 'blur(70px)', opacity: 0.32, animationDuration: '21s'}}></div>
        <h2 className="cta-h r">Your future self<br/>will thank you 💜</h2>
        <p className="cta-s r">Start sealing memories today. Free forever for your first 10 vaults. No credit card, just magic. ✨</p>
        <div className="cta-form r">
          <input className="cta-input" type="email" placeholder="your@email.com" />
          <Link to="/register" className="btn-main">Start Free →</Link>
        </div>
        <div className="cta-note r">✦ Free 10 vaults &nbsp;·&nbsp; ✦ No credit card &nbsp;·&nbsp; ✦ Cancel anytime</div>
      </section>

      <footer>
        <div className="foot-brand">⏳ TimeVaulth</div>
        <div className="foot-links">
          <a href="#">Privacy</a><a href="#">Terms</a><a href="#">Support</a>
          <Link to="/login">Login</Link><Link to="/register">Register</Link>
        </div>
        <div className="foot-copy">© 2025 TimeVaulth. Lock memories. Unlock joy. 💜</div>
      </footer>
    </>
  );
}
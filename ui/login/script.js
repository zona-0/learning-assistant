const API = (!window.location.hostname || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:8080/api'
  : window.location.origin + '/api';

function switchTab(tab) {
  const lf   = document.getElementById('f-login');
  const rf   = document.getElementById('f-register');
  const tl   = document.getElementById('t-login');
  const tr   = document.getElementById('t-register');
  const pill = document.getElementById('tab-pill');

  if (tab === 'login') {
    lf.classList.remove('hidden');
    rf.classList.add('hidden');
    tl.classList.add('active');
    tr.classList.remove('active');
    pill.classList.remove('right');
  } else {
    lf.classList.add('hidden');
    rf.classList.remove('hidden');
    tl.classList.remove('active');
    tr.classList.add('active');
    pill.classList.add('right');
  }
}

function togglePw(id, btn) {
  const el = document.getElementById(id);
  el.type = el.type === 'password' ? 'text' : 'password';
  btn.style.opacity = el.type === 'text' ? '1' : '0.6';
}

function alert_(id, type, msg) {
  const b = document.getElementById(id);
  b.className = 'alert ' + type;
  b.textContent = msg;
}
function clearAlert(id) {
  document.getElementById(id).className = 'alert hidden';
}

function checkConfirm() {
  const p1   = document.getElementById('r-pass').value;
  const p2   = document.getElementById('r-pass2').value;
  const wrap = document.getElementById('confirm-wrap');
  const msg  = document.getElementById('confirm-msg');
  const icon = document.getElementById('confirm-icon');

  if (p2.length === 0) {
    wrap.style.borderColor = 'rgba(6,182,212,0.14)';
    msg.style.display = 'none';
    icon.style.display = 'none';
    return;
  }

  if (p1 === p2) {
    wrap.style.borderColor = 'rgba(52,211,153,0.5)';
    msg.style.display = 'block';
    msg.style.color = '#6ee7b7';
    msg.textContent = 'Passwords match';
    icon.style.display = 'block';
  } else {
    wrap.style.borderColor = 'rgba(244,63,94,0.5)';
    msg.style.display = 'block';
    msg.style.color = '#fda4af';
    msg.textContent = 'Passwords do not match';
    icon.style.display = 'none';
  }
}

async function doLogin() {
  const username = document.getElementById('l-user').value.trim();
  const password = document.getElementById('l-pass').value;
  const btn      = document.getElementById('btn-login');
  const rememberMe = document.querySelector('#f-login input[type="checkbox"]').checked;

  if (!username || !password) {
    alert_('al-login', 'error', 'no username n pass');
    return;
  }

  btn.disabled    = true;
  btn.textContent = 'Verifying...';
  clearAlert('al-login');

  try {
    const res = await fetch(`${API}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const d = await res.json();

    if (d.success) {
      alert_('al-login', 'success', `Welcome back!`);
      btn.textContent = 'Redirecting...';
      sessionStorage.setItem('cleverai_user', JSON.stringify({
        username,
        fullName:   d.fullName,
        email:      d.email,
        role:       d.role,
        isVerified: d.isVerified
      }));
      if (rememberMe) {
        localStorage.setItem('cleverai_user', JSON.stringify({
          username,
          email:      d.email,
          fullName:   d.fullName,
          role:       d.role,
          isVerified: d.isVerified
        }));
      }
      setTimeout(() => {
        window.location.href = window.location.href.replace('/login/', '/dashboard/');
      }, 800);
    } else {
      alert_('al-login', 'error', d.message || 'Invalid username or password.');
      btn.disabled    = false;
      btn.innerHTML   = 'Sign In <svg viewBox="0 0 16 16" fill="none" width="14" height="14"><path d="M3 8L13 8M9 4L13 8L9 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    }
  } catch (e) {
    alert_('al-login', 'error', 'Cannot connect to server. Is the backend running?');
    btn.disabled    = false;
    btn.textContent = 'Sign In';
  }
}

async function doRegister() {
  const fullName  = document.getElementById('r-name').value.trim();
  const username  = document.getElementById('r-user').value.trim();
  const email     = document.getElementById('r-email').value.trim();
  const password  = document.getElementById('r-pass').value;
  const password2 = document.getElementById('r-pass2').value;
  const btn       = document.getElementById('btn-reg');

  if (!fullName || !username || !email || !password || !password2) {
    alert_('al-reg', 'error', 'Please fill in all fields.');
    return;
  }
  if (password.length < 6) {
    alert_('al-reg', 'error', 'Password must be at least 6 characters.');
    return;
  }
  if (password !== password2) {
    alert_('al-reg', 'error', 'Passwords do not match.');
    return;
  }
  if (!email.includes('@')) {
    alert_('al-reg', 'error', 'Enter a valid email address.');
    return;
  }

  btn.disabled    = true;
  btn.textContent = 'Creating account...';
  clearAlert('al-reg');

  try {
    const res = await fetch(`${API}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName, username, email, password })
    });

    const d = await res.json();

    if (d.success) {
      alert_('al-reg', 'success', 'Account created! You can now sign in.');
      btn.textContent = 'Done!';
      setTimeout(() => switchTab('login'), 1400);
    } else {
      alert_('al-reg', 'error', d.message || 'Registration failed. Try again.');
      btn.disabled    = false;
      btn.textContent = 'Create Account';
    }
  } catch (e) {
    alert_('al-reg', 'error', 'Cannot connect to server.');
    btn.disabled    = false;
    btn.textContent = 'Create Account';
  }
}

document.addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;
  const loginActive = !document.getElementById('f-login').classList.contains('hidden');
  loginActive ? doLogin() : doRegister();
});

function initParticles() {
  const cv = document.getElementById('particleCanvas');
  if (!cv) return;
  const ctx = cv.getContext('2d');

  const resize = () => { cv.width = window.innerWidth; cv.height = window.innerHeight; };
  resize();
  window.addEventListener('resize', resize);

  const cols = ['6,182,212', '244,63,94', '245,158,11', '103,232,249'];
  const pts  = Array.from({ length: 55 }, () => ({
    x:  Math.random() * cv.width,
    y:  Math.random() * cv.height,
    vx: (Math.random() - 0.5) * 0.25,
    vy: (Math.random() - 0.5) * 0.25,
    r:  Math.random() * 1.4 + 0.4,
    a:  Math.random() * 0.45 + 0.08,
    c:  cols[Math.floor(Math.random() * cols.length)]
  }));

  function draw() {
    ctx.clearRect(0, 0, cv.width, cv.height);

    pts.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = cv.width;
      if (p.x > cv.width) p.x = 0;
      if (p.y < 0) p.y = cv.height;
      if (p.y > cv.height) p.y = 0;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.c},${p.a})`;
      ctx.fill();
    });

    pts.forEach((p, i) => {
      for (let j = i + 1; j < pts.length; j++) {
        const q  = pts[j];
        const dx = p.x - q.x;
        const dy = p.y - q.y;
        const d  = Math.sqrt(dx * dx + dy * dy);
        if (d < 105) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(q.x, q.y);
          ctx.strokeStyle = `rgba(6,182,212,${0.06 * (1 - d / 105)})`;
          ctx.lineWidth   = 0.5;
          ctx.stroke();
        }
      }
    });

    requestAnimationFrame(draw);
  }

  draw();
}

window.addEventListener('load', initParticles);

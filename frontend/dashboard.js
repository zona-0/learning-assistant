const DATA = {
  week: {
    activity: { labels:['Day A','Day B','Day C','Day D','Day E','Day F','Day G'], focus:[3.5,2,4,5,3,1.5,4.5], brk:[0.8,0.5,1,1.2,0.7,0.4,1] },
    quiz:[82,76,90,65,88,94], streak:[4,2,6,8,5,2,7], doughnut:[34,28,22,16]
  },
  month: {
    activity: { labels:['Week A','Week B','Week C','Week D'], focus:[18,22,15,26], brk:[4.5,5.5,3.8,6] },
    quiz:[78,83,87,91,74,88], streak:[18,22,15,26], doughnut:[30,32,25,13]
  },
  year: {
    activity: { labels:['P1','P2','P3','P4','P5','P6','P7','P8','P9','P10','P11','P12'], focus:[60,72,55,80,68,90,75,85,70,92,65,88], brk:[15,18,14,20,17,22,19,21,18,23,16,22] },
    quiz:[72,78,81,85,79,90], streak:[60,72,55,80,68,90,75,85,70,92,65,88], doughnut:[28,30,27,15]
  }
};

let currentPeriod = 'week';
let charts = {};
let sidebarCollapsed = false;

/* ── Init ── */
window.addEventListener('load', () => {
  const user = JSON.parse(sessionStorage.getItem('cleverai_user') || 'null');
  if (!user) { window.location.href = 'index.html'; return; }

  document.getElementById('udisplay').textContent = user.fullName || user.username;
  document.getElementById('urole').textContent    = user.role === 'admin' ? 'Administrator' : 'Pelajar';
  const ini = (user.fullName || user.username).split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
  document.getElementById('ua').textContent = ini;

  animateCounters();
  buildCharts();
  initBg();

  /* data-tip for collapsed tooltips */
  document.querySelectorAll('.sb-item, .sb-logout').forEach(el => {
    const lbl = el.querySelector('.sb-label');
    if (lbl) el.setAttribute('data-tip', lbl.textContent.trim());
  });
});

/* ── Sidebar toggle ── */
function toggleSidebar() {
  sidebarCollapsed = !sidebarCollapsed;
  document.getElementById('sidebar').classList.toggle('collapsed', sidebarCollapsed);
}

/* ── Period switch ── */
function setPeriod(p, btn) {
  currentPeriod = p;
  document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.period-btn').forEach(b => {
    if (b.getAttribute('onclick') === btn.getAttribute('onclick')) b.classList.add('active');
  });
  updateCharts();
}

/* ── Counters ── */
function animateCounters() {
  document.querySelectorAll('.scard-num').forEach(el => {
    const t = parseInt(el.dataset.t || 0);
    let c = 0;
    const iv = setInterval(() => {
      c = Math.min(c + t / 50, t);
      el.textContent = Math.floor(c);
      if (c >= t) clearInterval(iv);
    }, 18);
  });
}

/* ── Chart base config ── */
const BASE = {
  responsive:true,
  maintainAspectRatio:false,
  resizeDelay:100,
  plugins:{ legend:{display:false}, tooltip:{
    backgroundColor:'rgba(6,13,18,0.92)',
    borderColor:'rgba(6,182,212,0.3)',borderWidth:1,
    titleColor:'#e2f8fc',bodyColor:'#94c9d4',
    padding:10,cornerRadius:8
  }},
};

/* Resize all charts on window resize */
let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    Object.values(charts).forEach(c => { if(c) c.resize(); });
  }, 150);
});
const gridCfg = { color:'rgba(6,182,212,0.07)', drawBorder:false };

/* ── Build charts ── */
function buildCharts() {
  const d = DATA.week;

  charts.activity = new Chart(document.getElementById('chartActivity'), {
    type:'bar',
    data:{ labels:d.activity.labels, datasets:[
      { label:'Focus', data:d.activity.focus, backgroundColor:'rgba(6,182,212,0.5)', borderColor:'#06b6d4', borderWidth:1, borderRadius:5, borderSkipped:false },
      { label:'Break', data:d.activity.brk, backgroundColor:'rgba(244,63,94,0.35)', borderColor:'#f43f5e', borderWidth:1, borderRadius:5, borderSkipped:false }
    ]},
    options:{...BASE, scales:{
      x:{grid:gridCfg, ticks:{color:'#5a8f9e',font:{family:'JetBrains Mono',size:11}}},
      y:{grid:gridCfg, ticks:{color:'#5a8f9e',font:{family:'JetBrains Mono',size:11}}}
    }}
  });

  charts.doughnut = new Chart(document.getElementById('chartDoughnut'), {
    type:'doughnut',
    data:{ labels:['Subject A','Subject B','Subject C','Subject D'], datasets:[{
      data:d.doughnut,
      backgroundColor:['rgba(6,182,212,0.7)','rgba(244,63,94,0.65)','rgba(245,158,11,0.65)','rgba(167,139,250,0.65)'],
      borderColor:['#06b6d4','#f43f5e','#f59e0b','#a78bfa'],
      borderWidth:1.5, hoverOffset:6
    }]},
    options:{...BASE, cutout:'68%', plugins:{...BASE.plugins, legend:{
      display:true, position:'bottom',
      labels:{color:'#94c9d4',font:{family:'Plus Jakarta Sans',size:11},padding:12,boxWidth:11,borderRadius:3}
    }}}
  });

  charts.quiz = new Chart(document.getElementById('chartQuiz'), {
    type:'line',
    data:{ labels:['Q1','Q2','Q3','Q4','Q5','Q6'], datasets:[{
      data:d.quiz, borderColor:'#f59e0b', backgroundColor:'rgba(245,158,11,0.08)',
      borderWidth:2, pointBackgroundColor:'#f59e0b', pointRadius:4, pointHoverRadius:6,
      fill:true, tension:0.4
    }]},
    options:{...BASE, scales:{
      x:{grid:gridCfg, ticks:{color:'#5a8f9e',font:{size:11}}},
      y:{grid:gridCfg, ticks:{color:'#5a8f9e',font:{size:11}}, min:50, max:100}
    }}
  });

  charts.streak = new Chart(document.getElementById('chartStreak'), {
    type:'bar',
    data:{ labels:DATA.week.activity.labels, datasets:[{
      data:d.streak,
      backgroundColor: ctx => { const v=ctx.parsed.y; return v>=6?'rgba(52,211,153,0.6)':v>=4?'rgba(6,182,212,0.5)':'rgba(167,139,250,0.4)'; },
      borderRadius:4, borderSkipped:false
    }]},
    options:{...BASE, scales:{
      x:{grid:gridCfg, ticks:{color:'#5a8f9e',font:{size:11}}},
      y:{grid:gridCfg, ticks:{color:'#5a8f9e',font:{size:11}}, beginAtZero:true}
    }}
  });

  charts.radar = new Chart(document.getElementById('chartRadar'), {
    type:'radar',
    data:{ labels:['Topic A','Topic B','Topic C','Topic D','Topic E','Topic F'], datasets:[{
      label:'Performance', data:[88,74,92,65,70,58],
      borderColor:'#06b6d4', backgroundColor:'rgba(6,182,212,0.1)',
      pointBackgroundColor:'#06b6d4', pointRadius:4, borderWidth:2
    }]},
    options:{...BASE, scales:{r:{
      grid:{color:'rgba(6,182,212,0.1)'},
      pointLabels:{color:'#94c9d4',font:{size:11}},
      ticks:{display:false},
      angleLines:{color:'rgba(6,182,212,0.1)'},
      min:0, max:100
    }}}
  });
}

function updateCharts() {
  const d = DATA[currentPeriod];
  charts.activity.data.labels = d.activity.labels;
  charts.activity.data.datasets[0].data = d.activity.focus;
  charts.activity.data.datasets[1].data = d.activity.brk;
  charts.activity.update();
  charts.doughnut.data.datasets[0].data = d.doughnut;
  charts.doughnut.update();
  charts.quiz.data.datasets[0].data = d.quiz;
  charts.quiz.update();
  charts.streak.data.labels = d.activity.labels;
  charts.streak.data.datasets[0].data = d.streak;
  charts.streak.update();
}

/* ── Mobile sidebar ── */
function openMobSidebar() {
  document.getElementById('sidebar').classList.add('mob-open');
  document.getElementById('mob-overlay').classList.add('show');
}
function closeMobSidebar() {
  document.getElementById('sidebar').classList.remove('mob-open');
  document.getElementById('mob-overlay').classList.remove('show');
}

/* ── Logout ── */
function doLogout() {
  sessionStorage.removeItem('cleverai_user');
  window.location.href = 'index.html';
}

/* ── BG canvas ── */
function initBg() {
  const cv = document.getElementById('bgCanvas');
  if (!cv) return;
  const ctx = cv.getContext('2d');
  const resize = () => { cv.width = innerWidth; cv.height = innerHeight; };
  resize(); window.addEventListener('resize', resize);
  const cols = ['6,182,212','244,63,94','245,158,11','167,139,250'];
  const pts = Array.from({length:35}, () => ({
    x:Math.random()*cv.width, y:Math.random()*cv.height,
    vx:(Math.random()-.5)*.18, vy:(Math.random()-.5)*.18,
    r:Math.random()*1.1+.3, a:Math.random()*.26+.05,
    c:cols[Math.floor(Math.random()*cols.length)]
  }));
  (function draw() {
    ctx.clearRect(0,0,cv.width,cv.height);
    pts.forEach(p => {
      p.x+=p.vx; p.y+=p.vy;
      if(p.x<0)p.x=cv.width; if(p.x>cv.width)p.x=0;
      if(p.y<0)p.y=cv.height; if(p.y>cv.height)p.y=0;
      ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
      ctx.fillStyle=`rgba(${p.c},${p.a})`; ctx.fill();
    });
    pts.forEach((p,i) => {
      for(let j=i+1;j<pts.length;j++){
        const q=pts[j],dx=p.x-q.x,dy=p.y-q.y,d=Math.sqrt(dx*dx+dy*dy);
        if(d<85){ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);
          ctx.strokeStyle=`rgba(6,182,212,${.04*(1-d/85)})`;ctx.lineWidth=.4;ctx.stroke();}
      }
    });
    requestAnimationFrame(draw);
  })();
}
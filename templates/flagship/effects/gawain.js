// Gawain — The Green Chapel (bespoke hero effect)
(function() {
    'use strict';
    const canvas = document.getElementById('greenchapel-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
    function readColor(attr, fb){const v=canvas.getAttribute(attr);return v&&v.startsWith('#')?hexToRgb(v):hexToRgb(fb);}
    const P = readColor('data-primary', '#6AA86A');
    const S = readColor('data-secondary', '#2E4A2E');
    const GLYPHS = 'ᚌᚃᚐᚆ';
    let width, height, dpr;
    function resize() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        width = window.innerWidth; height = window.innerHeight;
        canvas.width = Math.floor(width * dpr); canvas.height = Math.floor(height * dpr);
        canvas.style.width = width + 'px'; canvas.style.height = height + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize(); window.addEventListener('resize', resize);
    let t = 0;
    function draw() {
        t += 0.007;
        ctx.clearRect(0, 0, width, height);
        const lg = ctx.createLinearGradient(0, 0, 0, height);
        lg.addColorStop(0, 'rgba(10,11,14,0.97)');
        lg.addColorStop(1, 'rgba(14,16,20,0.95)');
        ctx.fillStyle = lg; ctx.fillRect(0, 0, width, height);
        const cx=width/2, cy=height*0.5; for(let i=0;i<5;i++){ const a=-Math.PI/2+(i-2)*0.5; const len=height*(0.16+0.03*Math.sin(t*0.9+i)); const x2=cx+Math.cos(a)*len, y2=cy+Math.sin(a)*len; ctx.strokeStyle="rgba("+P.r+","+P.g+","+P.b+","+(0.14+0.08*Math.sin(t+i))+")"; ctx.lineWidth=1.6; ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(x2,y2); ctx.stroke(); ctx.fillStyle="rgba("+P.r+","+P.g+","+P.b+",0.4)"; ctx.beginPath(); ctx.arc(x2,y2,2.6,0,Math.PI*2); ctx.fill(); } for(let i=0;i<5;i++){ const a=(i/5)*Math.PI*2; ctx.strokeStyle="rgba("+P.r+","+P.g+","+P.b+",0.2)"; ctx.lineWidth=1.2; ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(cx+Math.cos(a)*46,cy+Math.sin(a)*46); ctx.stroke(); } for(let i=0;i<5;i++){ const a1=(i/5)*Math.PI*2, a2=((i+2)/5)*Math.PI*2; ctx.strokeStyle="rgba(216,190,120,0.22)"; ctx.beginPath(); ctx.moveTo(cx+Math.cos(a1)*46,cy+Math.sin(a1)*46); ctx.lineTo(cx+Math.cos(a2)*46,cy+Math.sin(a2)*46); ctx.stroke(); }
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = Math.round(Math.min(width, height) * 0.055) + 'px serif';
        ctx.globalAlpha = 0.1 + 0.04 * Math.sin(t * 0.6);
        ctx.fillStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',1)';
        ctx.fillText(GLYPHS, width / 2, height * 0.24);
        ctx.globalAlpha = 1;
        if (!reduced) requestAnimationFrame(draw);
    }
    draw();
})();

// Fulla — The Little Box (bespoke hero effect)
(function() {
    'use strict';
    const canvas = document.getElementById('eski-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
    function readColor(attr, fb){const v=canvas.getAttribute(attr);return v&&v.startsWith('#')?hexToRgb(v):hexToRgb(fb);}
    const P = readColor('data-primary', '#D8C8A8');
    const S = readColor('data-secondary', '#8A7A6A');
    const GLYPHS = 'ᚠᚢᛚᛚᛅ';
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
        const cx=width/2, cy=height*0.52; ctx.strokeStyle="rgba("+P.r+","+P.g+","+P.b+",0.35)"; ctx.lineWidth=1.8; ctx.strokeRect(cx-50,cy-26,100,52); ctx.beginPath(); ctx.moveTo(cx-50,cy-26); ctx.quadraticCurveTo(cx,cy-52,cx+50,cy-26); ctx.stroke(); const ringA=t*0.7; const rx=cx+Math.cos(ringA)*20, ry=cy+Math.sin(ringA)*10; ctx.strokeStyle="rgba(232,214,140,"+(0.3+0.2*Math.sin(t*1.4))+")"; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(rx,ry,8,0,Math.PI*2); ctx.stroke(); for(let i=0;i<6;i++){ const seed=i*0.618; const x=cx-80+(seed*311%1)*160; const y=cy-60-((seed*197+t*0.04)%1)*height*0.2; ctx.fillStyle="rgba("+S.r+","+S.g+","+S.b+","+(0.1+0.08*Math.sin(t+i))+")"; ctx.beginPath(); ctx.arc(x,y,1.6,0,Math.PI*2); ctx.fill(); }
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

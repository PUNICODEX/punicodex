// Skuld — The Third Thread (bespoke hero effect)
(function() {
    'use strict';
    const canvas = document.getElementById('thirdthread-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
    function readColor(attr, fb){const v=canvas.getAttribute(attr);return v&&v.startsWith('#')?hexToRgb(v):hexToRgb(fb);}
    const P = readColor('data-primary', '#A8C0D0');
    const S = readColor('data-secondary', '#6E7F8E');
    const GLYPHS = 'ᛋᚴᚢᛚᛏ';
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
        const cx=width/2, wellY=height*0.72;
        for(let i=0;i<4;i++){ const z=((t*0.06+i/4)%1); ctx.strokeStyle="rgba("+S.r+","+S.g+","+S.b+","+(0.22-z*0.12)+")"; ctx.lineWidth=1.2; ctx.beginPath(); ctx.ellipse(cx,wellY,40+z*140,(40+z*140)*0.32,0,0,Math.PI*2); ctx.stroke(); }
        ctx.strokeStyle="rgba("+P.r+","+P.g+","+P.b+","+(0.3+0.1*Math.sin(t*1.4))+")"; ctx.lineWidth=1.6; ctx.beginPath(); ctx.ellipse(cx,wellY,40,13,0,0,Math.PI*2); ctx.stroke();
        for(let i=0;i<3;i++){ const off=(i-1)*width*0.16; const sway=26*Math.sin(t*1.1+i*2.1); const gold=i===2; ctx.strokeStyle=gold?"rgba(216,196,140,"+(0.28+0.08*Math.sin(t*1.7))+")":"rgba("+P.r+","+P.g+","+P.b+","+(0.2+0.06*Math.sin(t+i))+")"; ctx.lineWidth=gold?1.8:1.3; ctx.beginPath(); ctx.moveTo(cx+off*0.3,height*0.08); ctx.bezierCurveTo(cx+off+sway,height*0.3,cx+off*0.6-sway,height*0.5,cx+(i-1)*14,wellY); ctx.stroke(); }
        for(let i=0;i<9;i++){ const a=t*0.9+i*(Math.PI*2/9); const x=cx+Math.cos(a)*54, y=wellY+Math.sin(a)*17; ctx.fillStyle="rgba("+P.r+","+P.g+","+P.b+","+(0.16+0.08*Math.sin(t*2+i))+")"; ctx.beginPath(); ctx.arc(x,y,1.6,0,Math.PI*2); ctx.fill(); }
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

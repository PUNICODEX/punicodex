// Eir — The Herbs of Lyfjaberg (bespoke hero effect)
(function() {
    'use strict';
    const canvas = document.getElementById('lyfja-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
    function readColor(attr, fb){const v=canvas.getAttribute(attr);return v&&v.startsWith('#')?hexToRgb(v):hexToRgb(fb);}
    const P = readColor('data-primary', '#8AC8A0');
    const S = readColor('data-secondary', '#4A7A5A');
    const GLYPHS = 'ᛖᛁᚱ';
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
        const cx=width/2, cy=height*0.55; for(let i=0;i<8;i++){ const a=(i/8)*Math.PI*2+t*0.2; const x=cx+Math.cos(a)*width*0.14, y=cy+Math.sin(a)*height*0.12; ctx.strokeStyle="rgba("+P.r+","+P.g+","+P.b+","+(0.2+0.08*Math.sin(t+i))+")"; ctx.lineWidth=1.4; ctx.beginPath(); ctx.moveTo(cx,cy); ctx.quadraticCurveTo(cx+Math.cos(a)*width*0.07,cy+Math.sin(a)*height*0.06,x,y); ctx.stroke(); ctx.fillStyle="rgba("+P.r+","+P.g+","+P.b+","+(0.25+0.15*Math.sin(t*1.2+i))+")"; ctx.beginPath(); ctx.ellipse(x,y,5,2.4,a,0,Math.PI*2); ctx.fill(); } const g=ctx.createRadialGradient(cx,cy+height*0.2,0,cx,cy+height*0.2,80); g.addColorStop(0,"rgba(180,220,240,0.2)"); g.addColorStop(1,"rgba(180,220,240,0)"); ctx.fillStyle=g; ctx.beginPath(); ctx.arc(cx,cy+height*0.2,80,0,Math.PI*2); ctx.fill();
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

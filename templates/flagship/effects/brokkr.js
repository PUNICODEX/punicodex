// Brokkr — The Third Casting (bespoke hero effect)
(function() {
    'use strict';
    const canvas = document.getElementById('forgefires-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
    function readColor(attr, fb){const v=canvas.getAttribute(attr);return v&&v.startsWith('#')?hexToRgb(v):hexToRgb(fb);}
    const P = readColor('data-primary', '#E8A33D');
    const S = readColor('data-secondary', '#8A5A3A');
    const GLYPHS = 'ᛒᚱᚢᚴᛦ';
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
        const bx=width*0.5, by=height*0.7; for(let i=0;i<3;i++){ const pulse=0.5+0.5*Math.sin(t*2.4-i*2.1); const g=ctx.createRadialGradient(bx,by,0,bx,by,90+i*30); g.addColorStop(0,"rgba("+P.r+","+P.g+","+P.b+","+(0.1+0.14*pulse)+")"); g.addColorStop(1,"rgba("+P.r+","+P.g+","+P.b+",0)"); ctx.fillStyle=g; ctx.beginPath(); ctx.arc(bx,by,90+i*30,0,Math.PI*2); ctx.fill(); } for(let i=0;i<18;i++){ const seed=i*0.618; const x=bx-width*0.1+(seed*311%1)*width*0.2; const y=by-((seed*197+t*(0.06+(i%3)*0.02))%1)*height*0.45; ctx.fillStyle="rgba(255,220,150,"+(0.1+0.15*Math.abs(Math.sin(t*2+i)))+")"; ctx.beginPath(); ctx.arc(x,y,1.2+(i%3)*0.5,0,Math.PI*2); ctx.fill(); } const squeeze=Math.sin(t*2.4); ctx.strokeStyle="rgba("+S.r+","+S.g+","+S.b+",0.35)"; ctx.lineWidth=6; ctx.beginPath(); ctx.moveTo(bx-160-squeeze*20,by+30); ctx.lineTo(bx-40,by+10); ctx.moveTo(bx-160-squeeze*20,by+70); ctx.lineTo(bx-40,by+50); ctx.stroke();
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

// Ratatoskr — The Runner of the Tree (bespoke hero effect)
(function() {
    'use strict';
    const canvas = document.getElementById('treerun-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
    function readColor(attr, fb){const v=canvas.getAttribute(attr);return v&&v.startsWith('#')?hexToRgb(v):hexToRgb(fb);}
    const P = readColor('data-primary', '#C89858');
    const S = readColor('data-secondary', '#5A7A4A');
    const GLYPHS = 'ᚱᛅᛏᛅᛏᚢᛋᚴᚱ';
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
        const tx=width/2; ctx.strokeStyle="rgba("+S.r+","+S.g+","+S.b+",0.4)"; ctx.lineWidth=5; ctx.beginPath(); ctx.moveTo(tx,height); ctx.quadraticCurveTo(tx-14,height*0.5,tx+6,0); ctx.stroke(); for(let i=0;i<5;i++){ const z=((t*0.16+i/5)%1); const y=height*(1-z); const x=tx+Math.sin(z*Math.PI*6)*14; ctx.fillStyle="rgba("+P.r+","+P.g+","+P.b+","+(0.3+0.15*Math.sin(z*Math.PI))+")"; ctx.beginPath(); ctx.arc(x,y,4,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.moveTo(x+3,y); ctx.quadraticCurveTo(x+12,y-6,x+16,y-14); ctx.stroke(); } for(let i=0;i<4;i++){ const a=(i/4)*Math.PI*2+t*0.15; const x=tx+Math.cos(a)*width*0.12, y=height*0.14+Math.sin(a)*20; ctx.strokeStyle="rgba("+S.r+","+S.g+","+S.b+",0.25)"; ctx.lineWidth=1.4; ctx.beginPath(); ctx.moveTo(tx,height*0.2); ctx.quadraticCurveTo(x,height*0.1,x+Math.cos(a)*30,y); ctx.stroke(); }
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

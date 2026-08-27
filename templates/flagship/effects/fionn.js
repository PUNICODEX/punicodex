// Fionn — The Salmon of Knowledge (bespoke hero effect)
(function() {
    'use strict';
    const canvas = document.getElementById('salmon-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
    function readColor(attr, fb){const v=canvas.getAttribute(attr);return v&&v.startsWith('#')?hexToRgb(v):hexToRgb(fb);}
    const P = readColor('data-primary', '#C8A88A');
    const S = readColor('data-secondary', '#5A6A7A');
    const GLYPHS = 'ᚃᚔᚑ';
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
        const cx=width/2, cy=height*0.55; for(let i=0;i<4;i++){ const y=cy+(i-1.5)*height*0.08; ctx.strokeStyle="rgba("+S.r+","+S.g+","+S.b+","+(0.2-i*0.03)+0.04*Math.sin(t+i)+")"; ctx.lineWidth=1.4; ctx.beginPath(); for(let x=0;x<=width;x+=16){ const yy=y+Math.sin(x*0.01+t*1.1+i)*8; if(x===0)ctx.moveTo(x,yy); else ctx.lineTo(x,yy);} ctx.stroke(); } const leap=Math.sin(t*0.5); const fx=cx+Math.sin(t*0.5)*width*0.1, fy=cy-height*0.12*Math.max(0,leap); ctx.strokeStyle="rgba("+P.r+","+P.g+","+P.b+","+(0.35+0.15*leap)+")"; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(fx,fy,14,Math.PI*0.15,Math.PI*1.15); ctx.stroke(); ctx.beginPath(); ctx.moveTo(fx+13,fy+3); ctx.lineTo(fx+22,fy+9); ctx.lineTo(fx+22,fy-3); ctx.closePath(); ctx.stroke(); for(let k=0;k<5;k++){ const z=((t*0.3+k/5)%1); ctx.strokeStyle="rgba("+P.r+","+P.g+","+P.b+","+(0.2-z*0.1)+")"; ctx.beginPath(); ctx.arc(fx,cy+20,10+z*40,0,Math.PI*2); ctx.stroke(); }
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

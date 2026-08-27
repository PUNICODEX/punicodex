// Don — The Mother of the Magical Line (bespoke hero effect)
(function() {
    'use strict';
    const canvas = document.getElementById('matriline-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
    function readColor(attr, fb){const v=canvas.getAttribute(attr);return v&&v.startsWith('#')?hexToRgb(v):hexToRgb(fb);}
    const P = readColor('data-primary', '#C8A8D8');
    const S = readColor('data-secondary', '#6A5A7A');
    const GLYPHS = 'ᚇᚑᚅ';
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
        const cx=width/2, base=height*0.85; const names=5; for(let i=0;i<names;i++){ const spread=width*0.28; const x=cx+(i-(names-1)/2)*spread*0.5; ctx.strokeStyle="rgba("+P.r+","+P.g+","+P.b+","+(0.2+0.06*Math.sin(t+i))+")"; ctx.lineWidth=1.4; ctx.beginPath(); ctx.moveTo(cx,base); ctx.bezierCurveTo(cx+(x-cx)*0.3,base-height*0.2,x,base-height*0.35,x,base-height*0.45); ctx.stroke(); const pulse=0.5+0.5*Math.sin(t*0.9+i*1.3); ctx.fillStyle="rgba("+P.r+","+P.g+","+P.b+","+(0.25+0.3*pulse)+")"; ctx.beginPath(); ctx.arc(x,base-height*0.45,3+pulse*2,0,Math.PI*2); ctx.fill(); } const g=ctx.createRadialGradient(cx,base,0,cx,base,60); g.addColorStop(0,"rgba("+P.r+","+P.g+","+P.b+",0.25)"); g.addColorStop(1,"rgba("+P.r+","+P.g+","+P.b+",0)"); ctx.fillStyle=g; ctx.beginPath(); ctx.arc(cx,base,60,0,Math.PI*2); ctx.fill();
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

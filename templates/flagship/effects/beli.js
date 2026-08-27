// beli
(function() {
    'use strict';
    const canvas = document.getElementById('crownroots-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
    function readColor(attr, fb){const v=canvas.getAttribute(attr);return v&&v.startsWith('#')?hexToRgb(v):hexToRgb(fb);}
    const P = readColor('data-primary', '#D8C88A');
    const S = readColor('data-secondary', '#7A6A3A');
    const GLYPHS = 'ᚁᚓᚂ';
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
        const cx=width/2, base=height*0.9; for(let gen=0;gen<4;gen++){ const y=base-gen*height*0.17; const n=Math.pow(2,gen); for(let i=0;i<n;i++){ const spread=width*0.3/(gen+0.5); const x=cx+(i-(n-1)/2)*spread; ctx.strokeStyle="rgba("+S.r+","+S.g+","+S.b+","+(0.25-gen*0.04)+")"; ctx.lineWidth=1.2; ctx.beginPath(); ctx.moveTo(gen===0?cx:cx+(Math.floor(i/2)-((n/2)-1)/2)*spread*1.2, y+height*0.17); ctx.lineTo(x,y); ctx.stroke(); const pulse=0.5+0.5*Math.sin(t*0.8+gen+i); ctx.fillStyle="rgba("+P.r+","+P.g+","+P.b+","+(0.2+0.25*pulse)+")"; ctx.beginPath(); ctx.moveTo(x-6,y+4); ctx.lineTo(x-6,y-4); ctx.lineTo(x-2,y-1); ctx.lineTo(x+2,y-1); ctx.lineTo(x+6,y-4); ctx.lineTo(x+6,y+4); ctx.closePath(); ctx.fill(); } }
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

// Cernunnos — The Torc and the Serpent (bespoke hero effect)
(function() {
    'use strict';
    const canvas = document.getElementById('gundestrup-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
    function readColor(attr, fb){const v=canvas.getAttribute(attr);return v&&v.startsWith('#')?hexToRgb(v):hexToRgb(fb);}
    const P = readColor('data-primary', '#8AA86A');
    const S = readColor('data-secondary', '#5A7A4A');
    const GLYPHS = 'ᚉᚓᚏᚅ';
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
        const cx=width/2, ay=height*0.34; for(const side of [-1,1]){ for(let b=0;b<3;b++){ ctx.strokeStyle="rgba("+P.r+","+P.g+","+P.b+","+(0.2-b*0.05)+")"; ctx.lineWidth=1.6; ctx.beginPath(); ctx.moveTo(cx,ay+height*0.06); ctx.bezierCurveTo(cx+side*width*0.05,ay-b*height*0.02, cx+side*width*(0.1+b*0.05),ay-height*(0.05+b*0.04), cx+side*width*(0.12+b*0.06),ay-height*(0.1+b*0.05)); ctx.stroke(); } } const sy=height*0.66; ctx.strokeStyle="rgba("+S.r+","+S.g+","+S.b+",0.35)"; ctx.lineWidth=1.4; ctx.beginPath(); for(let x=0;x<=width;x+=10){ const y=sy+Math.sin(x*0.014+t*0.7)*12; if(x===0)ctx.moveTo(x,y); else ctx.lineTo(x,y);} ctx.stroke(); for(let i=0;i<14;i++){ const seed=i*0.618; const x=((seed*733+t*(4+(i%3)))%1)*width; const y=sy+30+Math.sin(seed*97+t*0.5)*20; ctx.fillStyle="rgba("+P.r+","+P.g+","+P.b+",0.05)"; ctx.beginPath(); ctx.ellipse(x,y,40,8,0,0,Math.PI*2); ctx.fill(); }
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

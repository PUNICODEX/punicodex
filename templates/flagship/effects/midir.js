// Midir — The Game of Fidchell (bespoke hero effect)
(function() {
    'use strict';
    const canvas = document.getElementById('fidchell-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
    function readColor(attr, fb){const v=canvas.getAttribute(attr);return v&&v.startsWith('#')?hexToRgb(v):hexToRgb(fb);}
    const P = readColor('data-primary', '#C8A8D8');
    const S = readColor('data-secondary', '#5A4A6A');
    const GLYPHS = 'ᚋᚔᚇ';
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
        const cx=width/2, cy=height*0.5, cell=Math.min(width,height)*0.09; for(let r=0;r<4;r++){ for(let c=0;c<4;c++){ const x=cx+(c-1.5)*cell, y=cy+(r-1.5)*cell; const a=0.08+0.06*Math.abs(Math.sin(t*0.7+r+c)); ctx.strokeStyle="rgba("+P.r+","+P.g+","+P.b+","+a+")"; ctx.lineWidth=1; ctx.strokeRect(x-cell/2,y-cell/2,cell,cell); } } for(let i=0;i<3;i++){ const seed=i*0.618; const x=cx+((seed*461%1)-0.5)*cell*3, y=cy+((seed*227%1)-0.5)*cell*3; const pulse=0.5+0.5*Math.sin(t*1.1+seed*30); ctx.fillStyle="rgba(232,214,140,"+(0.25+0.3*pulse)+")"; ctx.beginPath(); ctx.arc(x,y,3+pulse*2,0,Math.PI*2); ctx.fill(); }
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

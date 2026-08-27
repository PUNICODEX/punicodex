// Suttungr — Hnitbjörg, the Mountain of the Mead (bespoke hero effect)
(function() {
    'use strict';
    const canvas = document.getElementById('hnitbjorg-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
    function readColor(attr, fb){const v=canvas.getAttribute(attr);return v&&v.startsWith('#')?hexToRgb(v):hexToRgb(fb);}
    const P = readColor('data-primary', '#D8A44A');
    const S = readColor('data-secondary', '#5A6A7A');
    const GLYPHS = 'ᛋᚢᛏᛏᚢᚾᚴᚱ';
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
        lg.addColorStop(0, 'rgba(8,10,13,0.97)');
        lg.addColorStop(1, 'rgba(13,15,19,0.95)');
        ctx.fillStyle = lg; ctx.fillRect(0, 0, width, height);
        // The mountain vault: a jagged silhouette with a glowing mead-chamber at its heart
        const cx=width/2, base=height*0.92, peak=height*0.38;
        ctx.fillStyle='rgba('+S.r+','+S.g+','+S.b+',0.16)';
        ctx.beginPath(); ctx.moveTo(cx-width*0.42,base);
        ctx.lineTo(cx-width*0.22,height*0.62); ctx.lineTo(cx-width*0.1,height*0.5);
        ctx.lineTo(cx,peak); ctx.lineTo(cx+width*0.09,height*0.52);
        ctx.lineTo(cx+width*0.24,height*0.66); ctx.lineTo(cx+width*0.42,base);
        ctx.closePath(); ctx.fill();
        // The mead-light seeping from the chamber, breathing slow
        const cy=height*0.62, glow=0.3+0.12*Math.sin(t*1.4);
        const rg=ctx.createRadialGradient(cx,cy,2,cx,cy,60);
        rg.addColorStop(0,'rgba('+P.r+','+P.g+','+P.b+','+glow+')');
        rg.addColorStop(1,'rgba('+P.r+','+P.g+','+P.b+',0)');
        ctx.fillStyle=rg; ctx.beginPath(); ctx.arc(cx,cy,60,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='rgba('+P.r+','+P.g+','+P.b+','+(glow+0.15)+')';
        ctx.beginPath(); ctx.arc(cx,cy,4,0,Math.PI*2); ctx.fill();
        // The auger-crack: a thin line of light climbing from the chamber to the peak
        ctx.strokeStyle='rgba('+P.r+','+P.g+','+P.b+','+(0.18+0.08*Math.sin(t*1.4+1))+')';
        ctx.lineWidth=1.4; ctx.beginPath(); ctx.moveTo(cx,cy);
        ctx.lineTo(cx+6,(cy+peak)/2+8); ctx.lineTo(cx-3,peak+10); ctx.stroke();
        // Mead-bubbles rising through the rock
        for(let i=0;i<14;i++){ const seed=i*0.618; const x=cx-24+(seed*311%1)*48; const y=cy-((seed*197+t*0.06)%1)*(cy-peak-14); const a=(0.22-0.22*((cy-y)/(cy-peak-14||1))); if(a>0){ ctx.fillStyle='rgba('+P.r+','+P.g+','+P.b+','+a+')'; ctx.beginPath(); ctx.arc(x,y,1.5+(seed*7%1),0,Math.PI*2); ctx.fill(); } }
        // Two eagle arcs circling high — the chase, remembered
        for(let e=0;e<2;e++){ const ph=t*(0.5+e*0.22)+e*Math.PI; const ex=cx+Math.cos(ph)*width*0.22, ey=height*0.22+Math.sin(ph*1.3)*height*0.05; ctx.strokeStyle='rgba('+S.r+','+S.g+','+S.b+','+(0.28-e*0.08)+')'; ctx.lineWidth=1.6; ctx.beginPath(); ctx.moveTo(ex-14,ey); ctx.quadraticCurveTo(ex,ey-9,ex+14,ey); ctx.stroke(); }
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = Math.round(Math.min(width, height) * 0.055) + 'px serif';
        ctx.globalAlpha = 0.1 + 0.04 * Math.sin(t * 0.6);
        ctx.fillStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',1)';
        ctx.fillText(GLYPHS, width / 2, height * 0.16);
        ctx.globalAlpha = 1;
        if (!reduced) requestAnimationFrame(draw);
    }
    draw();
})();

// Reginn — The Reforging of Gram (bespoke hero effect)
(function() {
    'use strict';
    const canvas = document.getElementById('anvil-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
    function readColor(attr, fb){const v=canvas.getAttribute(attr);return v&&v.startsWith('#')?hexToRgb(v):hexToRgb(fb);}
    const P = readColor('data-primary', '#E8863A');
    const S = readColor('data-secondary', '#8A9AAE');
    const GLYPHS = 'ᚱᛁᚴᛁᚾᚾ';
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
        const cx=width/2, ay=height*0.62; const forge=0.35+0.2*Math.abs(Math.sin(t*0.9)); const rg=ctx.createRadialGradient(cx,ay,4,cx,ay,height*0.28); rg.addColorStop(0,'rgba('+P.r+','+P.g+','+P.b+','+(0.22*forge+0.08)+')'); rg.addColorStop(1,'rgba('+P.r+','+P.g+','+P.b+',0)'); ctx.fillStyle=rg; ctx.fillRect(0,0,width,height); for(let i=0;i<22;i++){ const seed=i*0.618; const x=cx+((seed*733%1)-0.5)*width*0.5; const y=ay-((seed*311+t*(0.05+(i%4)*0.012))%1)*height*0.5; const a=0.08+0.14*Math.abs(Math.sin(t*0.8+i)); ctx.fillStyle="rgba("+P.r+","+P.g+","+P.b+","+a+")"; ctx.beginPath(); ctx.arc(x,y,1+(i%3)*0.5,0,Math.PI*2); ctx.fill(); } const gap=14-11*Math.abs(Math.sin(t*0.35)); const bl=Math.min(width,height)*0.24; ctx.strokeStyle="rgba("+S.r+","+S.g+","+S.b+","+(0.5+0.3*Math.abs(Math.sin(t*0.35)))+")"; ctx.lineWidth=3; ctx.lineCap='round'; ctx.beginPath(); ctx.moveTo(cx-gap-bl*0.55,ay-14); ctx.lineTo(cx-gap,ay-14); ctx.moveTo(cx+gap,ay-14); ctx.lineTo(cx+gap+bl*0.55,ay-14); ctx.stroke(); ctx.lineWidth=1.6; ctx.beginPath(); ctx.moveTo(cx-gap-8,ay-24); ctx.lineTo(cx-gap-8,ay-4); ctx.moveTo(cx+gap+8,ay-24); ctx.lineTo(cx+gap+8,ay-4); ctx.stroke(); ctx.strokeStyle="rgba("+P.r+","+P.g+","+P.b+","+(0.25+0.3*forge)+")"; ctx.lineWidth=1.2; ctx.beginPath(); ctx.moveTo(cx-46,ay+8); ctx.lineTo(cx+46,ay+8); ctx.moveTo(cx-30,ay+8); ctx.lineTo(cx-30,ay+20); ctx.lineTo(cx+30,ay+20); ctx.lineTo(cx+30,ay+8); ctx.stroke(); for(let i=0;i<4;i++){ const z=((t*0.09+i/4)%1); ctx.strokeStyle="rgba("+P.r+","+P.g+","+P.b+","+(0.18*(1-z))+")"; ctx.beginPath(); ctx.arc(cx,ay,10+z*60,0,Math.PI*2); ctx.stroke(); }
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

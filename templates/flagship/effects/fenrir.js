// Fenrir — The Breaking of Gleipnir (bespoke hero effect)
(function() {
    'use strict';
    const canvas = document.getElementById('gleipnir-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
    function readColor(attr, fb){const v=canvas.getAttribute(attr);return v&&v.startsWith('#')?hexToRgb(v):hexToRgb(fb);}
    const P = readColor('data-primary', '#B8C4D4');
    const S = readColor('data-secondary', '#5A6A7E');
    const GLYPHS = 'ᚠᛖᚾᚱᛁᚱ';
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
        const cx=width/2, cy=height*0.5, R=Math.min(width,height)*0.3; for(let i=0;i<6;i++){ const phase=t*0.5+i; ctx.strokeStyle="rgba("+P.r+","+P.g+","+P.b+","+(0.14+0.06*Math.sin(phase))+")"; ctx.lineWidth=i===4?0.8:1.6; ctx.beginPath(); for(let k=0;k<=60;k++){ const a=(k/60)*Math.PI*2; const wob=i===4?Math.sin(a*9+t*3)*8:Math.sin(a*3+i)*3; const x=cx+Math.cos(a)*(R+wob), y=cy+Math.sin(a)*(R*0.62+wob); if(k===0)ctx.moveTo(x,y); else ctx.lineTo(x,y);} ctx.stroke(); } const blink=Math.abs(Math.sin(t*0.23))<0.06?0.05:0.5; ctx.fillStyle="rgba(216,120,60,"+blink+")"; ctx.beginPath(); ctx.arc(cx-14,cy-8,3,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(cx+14,cy-8,3,0,Math.PI*2); ctx.fill();
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

import {useEffect, useRef} from "react";

type Ripple = {x: number; y: number; born: number; strength: number};
const clamp = (v: number) => Math.max(0, Math.min(1, v));
const ease = (v: number) => { const t = clamp(v); return t * t * (3 - 2 * t); };

/** Decorative water scene. Interaction remains in the accessible HTML layer. */
export function PondScene({opened}: {opened: boolean}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const openedRef = useRef(opened);
  useEffect(() => { openedRef.current = opened; }, [opened]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !host || !ctx) return;
    const moon = document.createElement("canvas");
    moon.width = moon.height = 256;
    const mc = moon.getContext("2d");
    if (!mc) return;
    const lunar = mc.createRadialGradient(88, 73, 10, 128, 128, 126);
    lunar.addColorStop(0, "#fffbe3"); lunar.addColorStop(.55, "#e0dfc3"); lunar.addColorStop(1, "#9eafa1");
    mc.fillStyle = lunar; mc.beginPath(); mc.arc(128, 128, 125, 0, Math.PI * 2); mc.fill();
    mc.save(); mc.clip();
    // Deterministic lunar maria: no external texture or network dependency.
    for (let i = 0; i < 65; i++) {
      const x = 128 + Math.sin(i * 19.7) * 108, y = 128 + Math.cos(i * 8.3) * 108;
      const r = 5 + (i % 7) * 5;
      const shade = mc.createRadialGradient(x, y, 0, x, y, r);
      shade.addColorStop(0, `rgba(82,104,95,${.025 + (i % 4) * .022})`);
      shade.addColorStop(1, "rgba(82,104,95,0)");
      mc.fillStyle = shade; mc.fillRect(x-r, y-r, r*2, r*2);
    }
    mc.restore();

    let width = 1, height = 1, frame = 0, visible = true;
    let clock = 0, previous = 0, lastPaint = 0;
    let lift = openedRef.current ? 1 : 0, lastOpen = openedRef.current;
    let skyAge = openedRef.current ? 9 : 0, launch = -100, lastTouch = -100;
    let ripples: Ripple[] = [];
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reduced = media.matches;
    const resize = () => {
      const rect = host.getBoundingClientRect();
      width = rect.width; height = rect.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      canvas.width = Math.round(width*dpr); canvas.height = Math.round(height*dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const glow = (x: number, y: number, rx: number, ry: number, alpha: number) => {
      ctx.save(); ctx.translate(x, y); ctx.scale(rx, ry);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
      g.addColorStop(0, `rgba(229,235,197,${alpha})`);
      g.addColorStop(.3, `rgba(158,195,171,${alpha*.35})`);
      g.addColorStop(1, "rgba(126,176,160,0)");
      ctx.fillStyle = g; ctx.fillRect(-1,-1,2,2); ctx.restore();
    };
    const draw = () => {
      ctx.clearRect(0,0,width,height);
      const mobile = width <= 600;
      const waterY = height * .61, x = width*.5;
      const startY = height*.60 + 70;
      const endY = height*(mobile ? .37 : .43) + 58;
      const p = ease(lift), release = ease((lift-.12)/.88);
      const y = startY + (endY-startY)*p;
      const r = 59 - 14*release;
      const skyX = width*.73, skyY = height*.19;
      const veil = ease((skyAge-1.3)/5.5);
      glow(skyX,skyY,150,135,.25*(1-veil)+.012);
      ctx.globalAlpha = .88*(1-veil)+.04;
      ctx.drawImage(moon,skyX-31,skyY-31,62,62); ctx.globalAlpha = 1;

      // Soft overlapping cloud volumes pass in front of the celestial moon.
      for (let j=0;j<3;j++) {
        for (let i=0;i<11;i++) {
          const cx = width*(.38+i*.055) + Math.sin(clock*.045+j)*45 + veil*55;
          const cy = skyY-18+j*22+Math.sin(i*1.6+j)*17;
          const g = ctx.createRadialGradient(cx,cy,0,cx,cy,130);
          g.addColorStop(0, `rgba(26,47,52,${.16+veil*.10})`);
          g.addColorStop(.45,"rgba(30,51,55,.12)");
          g.addColorStop(1,"rgba(30,51,55,0)");
          ctx.save(); ctx.translate(0,cy); ctx.scale(1,.4); ctx.translate(0,-cy);
          ctx.fillStyle=g; ctx.fillRect(cx-130,cy-130,260,260); ctx.restore();
        }
      }

      glow(x,startY+35,230,90,.12);
      // Broken moonlight trail: perspective increases the wave lengths near the viewer.
      for (let i=0;i<90;i++) {
        const depth=i/90, wy=waterY+depth*(height-waterY);
        const spread=18+depth*width*.18;
        const shift=Math.sin(i*2.39+clock*.75)*(12+depth*30);
        const len=(.15+.85*Math.pow(Math.sin(i*7.19),2))*spread;
        ctx.strokeStyle=`rgba(189,213,185,${(.025+.13*(1-depth))*(.5+.5*Math.sin(i*.8+clock))})`;
        ctx.lineWidth=.6+depth*1.5;
        ctx.beginPath(); ctx.moveTo(x+shift-len,wy); ctx.quadraticCurveTo(x+shift,wy+Math.sin(i+clock)*2,x+shift+len,wy); ctx.stroke();
      }
      // The reflection is displaced row by row, rather than scaled as a flat ellipse.
      const wet = 1-release;
      glow(x,y,r*2.8,r*2.4,.15+.09*release);
      for (let row=0;row<256;row+=2) {
        const n=row/256;
        const wave=(Math.sin(n*37+clock*2.2)*4+Math.sin(n*79-clock*1.4)*2.4)*wet;
        const tear=Math.sin(n*18+clock)*Math.sin(Math.PI*lift)*6;
        const sy=y-r*(.73+.27*release)+(n*2*r)*(.73+.27*release);
        ctx.globalAlpha=(.70+.30*release)*(1-wet*.20*Math.sin(n*105+clock*2)**2);
        ctx.drawImage(moon,0,row,256,2,x-r+wave+tear,sy,r*2,2*r/256*2*(.73+.27*release)+.6);
      }
      ctx.globalAlpha=1;
      // A thin wet meniscus stretches, then separates into droplets.
      const age=clock-launch;
      if (age>=0 && age<3.8 && !reduced) {
        const tether=(1-ease((age-.8)/1.5))*.35;
        ctx.strokeStyle=`rgba(222,231,195,${tether})`; ctx.lineWidth=1.2;
        for (const side of [-1,1]) {
          ctx.beginPath(); ctx.moveTo(x+side*r*.45,y+r*.7);
          ctx.bezierCurveTo(x+side*16,y+r+30,x+side*28,startY+12,x+side*55,startY+16); ctx.stroke();
        }
        for(let i=0;i<18;i++) {
          const a=age-.65-i*.055;
          if(a<0 || a>1.55) continue;
          const dx=Math.sin(i*13.3)*(18+i*1.9);
          const dy=y+r+10+a*a*110;
          if(dy>startY+25) continue;
          glow(x+dx,dy,2,4,Math.max(0,.7-a*.35));
        }
      }
      // Elliptical ripples carry the disturbance across the horizontal water plane.
      const ambient = reduced ? 0 : (clock % 4);
      const rings = [...ripples, {x,y:startY+20,born:clock-ambient,strength:.3}];
      rings.forEach(ripple => {
        const age=clock-ripple.born;
        if(age<0 || age>5) return;
        for(let k=0;k<3;k++) {
          const t=age-k*.18;
          if(t<0) continue;
          const radius=22+t*90;
          ctx.strokeStyle=`rgba(192,218,195,${Math.max(0,(1-t/5)*ripple.strength*.35)})`;
          ctx.lineWidth=1-k*.2;
          ctx.beginPath(); ctx.ellipse(ripple.x,ripple.y,radius,radius*.17,0,0,Math.PI*2); ctx.stroke();
        }
      });
      ripples=ripples.filter(item=>clock-item.born<5);
    };
    const tick = (now: number) => {
      frame=0;
      if(!visible || document.hidden) { previous=0; return; }
      const dt=previous ? Math.min((now-previous)/1000,.06) : 0;
      previous=now; clock+=dt; skyAge+=dt;
      if(lastOpen!==openedRef.current) {
        lastOpen=openedRef.current;
        if(lastOpen) {
          launch=clock;
          ripples.push({x:width/2,y:height*.60+90,born:clock,strength:1});
        } else { skyAge=0; launch=-100; ripples=[]; }
      }
      lift=reduced ? (lastOpen?1:0) : clamp(lift+(lastOpen ? dt/3.6 : -dt/1.6));
      if(now-lastPaint>32 || reduced) { draw(); lastPaint=now; }
      if(!reduced) frame=requestAnimationFrame(tick);
    };
    const start = () => { if(!frame) frame=requestAnimationFrame(tick); };
    const pointer = (event: PointerEvent) => {
      const rect=host.getBoundingClientRect(), y=event.clientY-rect.top;
      if(y<height*.60 || reduced || clock-lastTouch<.35) return;
      lastTouch=clock;
      ripples.push({x:event.clientX-rect.left,y,born:clock,strength:event.type==="pointerdown"?.8:.3});
      ripples=ripples.slice(-12);
    };
    const visibility = () => { if(document.hidden) { cancelAnimationFrame(frame); frame=0; previous=0; } else start(); };
    const changeMotion = () => { reduced=media.matches; start(); };
    const observer=new IntersectionObserver(entries=>{
      visible=entries[0].isIntersecting;
      if(visible) start(); else {cancelAnimationFrame(frame); frame=0; previous=0;}
    });
    const sizeObserver=new ResizeObserver(()=>{resize(); start();});
    observer.observe(host); sizeObserver.observe(host);
    host.addEventListener("pointermove",pointer); host.addEventListener("pointerdown",pointer);
    // A click also schedules a static frame for reduced-motion users.
    const click=()=>{ window.setTimeout(start,0); };
    host.addEventListener("click",click);
    document.addEventListener("visibilitychange",visibility); media.addEventListener("change",changeMotion);
    resize(); start();
    return ()=>{
      cancelAnimationFrame(frame); observer.disconnect(); sizeObserver.disconnect();
      host.removeEventListener("pointermove",pointer); host.removeEventListener("pointerdown",pointer);
      host.removeEventListener("click",click); document.removeEventListener("visibilitychange",visibility);
      media.removeEventListener("change",changeMotion);
    };
  }, []);
  return <canvas ref={canvasRef} className="pond-dynamic-water" aria-hidden="true"/>;
}
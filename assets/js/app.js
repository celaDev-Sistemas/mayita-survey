// ════════════════════════════════════════════════════
// CONFIG
// ════════════════════════════════════════════════════
const MSAL_CONFIG = {
  auth: {
    clientId: "9c04551b-3267-4a30-a212-ec9143838eb6",
    authority: "https://login.microsoftonline.com/deb13623-4618-4c6b-a268-3d5e4dec1c30",
    redirectUri: "https://celadev-sistemas.github.io/mayita-survey/",
  },
  cache: { cacheLocation: "sessionStorage", storeAuthStateInCookie: true },
  system: { allowNativeBroker: false }
};
// Todos los permisos desde el login — ya tienen admin consent
const SCOPES = ["User.Read"];

const VALID_DOMAINS = [
  "celaque.net",
  "administracion.hn"
];

const N8N_WEBHOOK_URL =
  "https://celaque.app.n8n.cloud/webhook/mayita/encuesta";

  const N8N_RANKING_SAVE_URL =
  "https://celaque.app.n8n.cloud/webhook/mayita/ranking";

const N8N_RANKING_TOP_URL =
  "https://celaque.app.n8n.cloud/webhook/mayita/ranking/top";

const APP_VERSION = "1.0";

// ════════════════════════════════════════════════════
// DATA
// ════════════════════════════════════════════════════
const QUESTIONS = [
  "¿Cómo fue el tiempo de respuesta del equipo de TI?",
  "¿El técnico resolvió tu problema de forma efectiva?",
  "¿La comunicación del equipo de TI fue clara?",
  "¿Quedaste satisfecho con la solución brindada?",
  "¿Recomendarías el servicio de TI a un colega?"
];
const LIKERT = [
  {v:1,lbl:"Muy malo", icon:"😠",color:"#e02020",mood:"malo1"},
  {v:2,lbl:"Malo",     icon:"😟",color:"#f97316",mood:"malo2"},
  {v:3,lbl:"Regular",  icon:"😐",color:"#eab308",mood:"regular"},
  {v:4,lbl:"Bueno",    icon:"😊",color:"#22c55e",mood:"bueno"},
  {v:5,lbl:"Excelente",icon:"😄",color:"#38bdf8",mood:"excelente"}
];
const REACTIONS = {
  malo1:    ["¡Vaya! Eso no estuvo bien. ¡Lo arreglaremos! 😱","¡Qué pena! Haremos todo para mejorar. 🙈","¡Eso duele, pero necesitamos saberlo! 😭","¡Error grave detectado! Modo urgente ON. 🚨","¡Lo sentimos mucho! Cambios vienen ya. 😰"],
  malo2:    ["Hmm, algo salió mal. ¡Trabajamos en ello! 😬","¡Oops! No fue lo ideal. Tomamos nota. 😅","¡Se puede mejorar, lo sabemos! 🤔","¡Modo mejora activado al 100%! 🛠️","¡Gracias por la honestidad! Mejoramos. 😤"],
  regular:  ["¡Bien, pero podemos ser mejores! 🧐","¡Aceptado el reto de mejorar! 💪","Neutro por ahora, ¡pronto excelente! 😐","¡Lo anotamos y lo trabajamos! 📝","¡Modo superación activado! 🚀"],
  bueno:    ["¡Genial! ¡Eso es lo que queremos! 😊","¡Bien hecho equipo! ¡Seguimos así! 🥳","¡Crack total! El equipo da el 200%! 💪","¡Eso me alegra muchísimo! 🤩","¡Rumbo a la excelencia! 🚀"],
  excelente:["¡¡WOOOW!! ¡¡EL MEJOR EQUIPO!! 🏆","¡¡CAMPEONES!! ¡Así se hace en TI! 🎉","¡¡FIESTA!! ¡El equipo está on FIRE! 🔥","¡¡INCREÍBLE!! ¡Eres lo máximo! ⭐","¡¡AL 100%!! ¡Nada nos detiene! 🚀"]
};
const IMPROVEMENT_OPTIONS = ["Tiempo de respuesta","Conocimiento técnico","Comunicación y trato","Calidad de la solución","Seguimiento post-atención","Otra"];
// Flappy game uses canvas — no FOODS array needed
const MOTIV = [
  "¡Eres increíble! Cada reto es una oportunidad disfrazada. 🚀",
  "¡El éxito es la suma de pequeños esfuerzos repetidos! 💪",
  "¡Tú tienes el poder de hacer la diferencia hoy! ⭐",
  "¡Los campeones no se rinden, se reinventan! 🏆",
  "¡Cada día es una nueva oportunidad de brillar! ✨"
];

// ════════════════════════════════════════════════════
// STATE
// ════════════════════════════════════════════════════
let msalApp = null;
let msUser  = {name:"",email:"",id:"",token:""};
let surveyAnswers = [];
let currentQ = 0;
let answering = false;
let selectedVal = null;
let improvements = [];
let otherText = "";
let showOther = false;
let gameScoreFinal = 0;
let dbCount = 0;

// ════════════════════════════════════════════════════
// UTILS
// ════════════════════════════════════════════════════
function shuffle(a){return [...a].sort(()=>Math.random()-.5);}
function getScore(){
  const t=surveyAnswers.reduce((s,a)=>s+a,0);
  return Math.round((t/(surveyAnswers.length*5))*100);
}
function getLabel(sc){
  if(sc>=80)return "excelente";if(sc>=60)return "bueno";
  if(sc>=40)return "regular";if(sc>=20)return "malo2";return "malo1";
}
function getMoodFromVal(v){return LIKERT.find(l=>l.v===v)?.mood||"idle";}
function getLikertByMood(m){return LIKERT.find(l=>l.mood===m)||LIKERT[2];}
function getLikertByVal(v){return LIKERT.find(l=>l.v===v)||LIKERT[2];}
function nameFromEmail(e){return e.split("@")[0].replace(/[._]/g," ").replace(/\b\w/g,c=>c.toUpperCase());}

function showScreen(id){
  document.querySelectorAll(".screen").forEach(s=>{s.classList.remove("active");});
  const el=document.getElementById(id);
  if(el){el.classList.add("active");}
}

// ════════════════════════════════════════════════════
// PARROT SVG
// ════════════════════════════════════════════════════
function parrotSVG(mood="idle", size=180){
  // Mood-based offsets for expression variation via overlays
  const cfg={
    idle:     {sparkle:false, tears:false, overlay:""},
    malo1:    {sparkle:false, tears:true,  overlay:"😢"},
    malo2:    {sparkle:false, tears:false, overlay:"😟"},
    regular:  {sparkle:false, tears:false, overlay:"😐"},
    bueno:    {sparkle:false, tears:false, overlay:"😊"},
    excelente:{sparkle:true,  tears:false, overlay:"🌟"},
    done:     {sparkle:true,  tears:false, overlay:""},
    eat:      {sparkle:false, tears:false, overlay:"😋"},
    disgust:  {sparkle:false, tears:true,  overlay:"😖"},
  };
  const m=cfg[mood]||cfg.idle;
  const h=Math.round(size*1.08);
  return `<svg width="${size}" height="${h}" viewBox="0 0 ${size} ${h}" class="parrot-svg parrot-idle" style="overflow:visible;">
    ${m.sparkle?`<text x="0" y="20" font-size="16" style="user-select:none">⭐</text><text x="${size-20}" y="14" font-size="12" style="user-select:none">✨</text>`:""}
    <image href="assets/img/mayita-parrot.png"
           x="0" y="0" width="${size}" height="${h}"
           style="image-rendering:auto;"/>
    ${m.tears?`<text x="${size*0.3}" y="${h*0.7}" font-size="${size*0.18}" style="user-select:none">😢</text>`:""}
    ${m.overlay&&m.overlay!=""?`<text x="${size*0.68}" y="${h*0.28}" font-size="${size*0.2}" style="user-select:none">${m.overlay}</text>`:""}
  </svg>`;
}

function setParrotBounce(el){
  el.querySelector("svg").classList.remove("parrot-idle","parrot-bounce");
  void el.querySelector("svg").offsetWidth;
  el.querySelector("svg").classList.add("parrot-bounce");
  setTimeout(()=>{
    if(el.querySelector("svg")){
      el.querySelector("svg").classList.remove("parrot-bounce");
      el.querySelector("svg").classList.add("parrot-idle");
    }
  },600);
}

// ════════════════════════════════════════════════════
// PARTICLES
// ════════════════════════════════════════════════════
function boom(){
  const emojis=["🎉","⭐","✨","💫","🎊","🦜","🏆"];
  for(let i=0;i<16;i++){
    const p=document.createElement("div");
    p.className="particle";
    p.textContent=emojis[i%emojis.length];
    const dx=(Math.random()-.5)*340,dy=-(Math.random()*220+60);
    p.style.setProperty("--dx",dx+"px");
    p.style.setProperty("--dy",dy+"px");
    p.style.setProperty("--rot",(Math.random()-.5)*720+"deg");
    document.body.appendChild(p);
    setTimeout(()=>p.remove(),1700);
  }
}

// ════════════════════════════════════════════════════
// MSAL LOGIN
// ════════════════════════════════════════════════════
async function initMSAL(){
  if(msalApp) return;
  msalApp = new msal.PublicClientApplication(MSAL_CONFIG);
  await msalApp.initialize();
}

async function handleRedirectResult(){
  // Called on every page load — catches the token after Microsoft redirects back
  try{
    const result = await msalApp.handleRedirectPromise();
    if(result && result.accessToken){
      await processLoginResult(result);
    }
  }catch(e){
    console.error("Redirect handle error:", e);
    const errEl=document.getElementById("intro-err");
    const errTxt=document.getElementById("intro-err-text");
    errTxt.textContent = e.message||"Error al procesar el inicio de sesión.";
    errEl.classList.add("show");
  }
}

async function processLoginResult(result){
  const meRes = await fetch("https://graph.microsoft.com/v1.0/me",{
    headers:{Authorization:`Bearer ${result.accessToken}`}
  });
  const me = await meRes.json();
  const email = (me.mail||me.userPrincipalName||"").toLowerCase();
  const domain = email.split("@")[1]||"";
  if(!VALID_DOMAINS.includes(domain)){
    const errEl=document.getElementById("intro-err");
    const errTxt=document.getElementById("intro-err-text");
    errTxt.textContent = "Cuenta no pertenece a celaque.net o administracion.hn";
    errEl.classList.add("show");
    const btn=document.getElementById("btn-ms-login");
    btn.disabled=false;
    btn.innerHTML=`<svg class="ms-logo" viewBox="0 0 21 21"><rect x="1" y="1" width="9" height="9" fill="#f25022"/><rect x="11" y="1" width="9" height="9" fill="#7fba00"/><rect x="1" y="11" width="9" height="9" fill="#00a4ef"/><rect x="11" y="11" width="9" height="9" fill="#ffb900"/></svg> Iniciar sesión con Microsoft 365`;
    return;
  }
  msUser = {
    name: me.displayName||nameFromEmail(email),
    email: email,
    id: me.id,
    token: result.accessToken
  };
  goToGame();
}

async function msLogin(){
  const btn=document.getElementById("btn-ms-login");
  const errEl=document.getElementById("intro-err");
  btn.disabled=true;
  btn.textContent="⏳ Redirigiendo a Microsoft…";
  errEl.classList.remove("show");
  try{
    await initMSAL();
    // loginRedirect — redirige la misma página, evita bloqueo de popups anidados
    await msalApp.loginRedirect({scopes: SCOPES});
    // Execution stops here — Microsoft redirects back to this page
  }catch(e){
    const errTxt=document.getElementById("intro-err-text");
    errTxt.textContent = e.message||"No se pudo iniciar sesión. Intenta de nuevo.";
    errEl.classList.add("show");
    btn.disabled=false;
    btn.innerHTML=`<svg class="ms-logo" viewBox="0 0 21 21"><rect x="1" y="1" width="9" height="9" fill="#f25022"/><rect x="11" y="1" width="9" height="9" fill="#7fba00"/><rect x="1" y="11" width="9" height="9" fill="#00a4ef"/><rect x="11" y="11" width="9" height="9" fill="#ffb900"/></svg> Iniciar sesión con Microsoft 365`;
  }
}
document.getElementById("btn-ms-login").addEventListener("click",msLogin);

// ════════════════════════════════════════════════════
// FLAPPY MAYITA — Canvas Game
// ════════════════════════════════════════════════════
let flappyRAF = null;
let flappyKeyHandler = null;

const FW=436, FH=320, GRAVITY=0.38, JUMP_VEL=-7.2;
const PIPE_W=62, PIPE_GAP=132, PIPE_SPEED_BASE=2.3, PIPE_FREQ=95, SCORE_WIN=50;
// Buildings data for pipe skins (cycling through all 11)
const BLDGS=[
  {name:"Zorzales"},
  {name:"Aura"},
  {name:"Céfiro Azul"},
  {name:"D. Artemisa"},
  {name:"Agalta"},
  {name:"Atlas"},
];

let fb={};
function fbReset(){
  fb={phase:"ready",bird:{x:90,y:FH/2,vy:0,angle:0,flap:0},pipes:[],score:0,frame:0,best:fb.best||0,particles:[],bldgIdx:0,speed:PIPE_SPEED_BASE};
}
fbReset();

function drawMacaw(ctx,x,y,angle,size,flap){
  if(!window._mf1){ window._mf1=new Image(); window._mf1.src="assets/img/embedded-0c09f732db.png"; }
  if(!window._mf2){ window._mf2=new Image(); window._mf2.src="assets/img/embedded-ef3aa5ab1b.png"; }
  if(!window._mf3){ window._mf3=new Image(); window._mf3.src="assets/img/embedded-815a2263d8.png"; }
  // 3-frame cycle: up → mid → down → mid → up...  (6 frames each)
  const cycle = Math.floor(flap/6) % 4;
  let img, iw, ih;
  if(cycle===0)      { img=window._mf1; iw=260; ih=305; }
  else if(cycle===1) { img=window._mf2; iw=260; ih=236; }
  else if(cycle===2) { img=window._mf3; iw=260; ih=221; }
  else               { img=window._mf2; iw=260; ih=236; }
  const w=size, h=Math.round(size*(ih/iw));
  ctx.save();
  ctx.translate(x,y);
  ctx.rotate(angle);
  ctx.drawImage(img,-w/2,-h/2,w,h);
  ctx.restore();
}

function drawBuilding(ctx, x, gapTop, bldgData){
  if(!window._b0){ window._b0=new Image(); window._b0.src="assets/img/embedded-eee2d4f6ec.png"; window._b0.bw=130; window._b0.bh=112; }
  if(!window._b1){ window._b1=new Image(); window._b1.src="assets/img/embedded-77546f2069.png"; window._b1.bw=130; window._b1.bh=172; }
  if(!window._b2){ window._b2=new Image(); window._b2.src="assets/img/embedded-be7afe9fb4.png"; window._b2.bw=130; window._b2.bh=151; }
  if(!window._b3){ window._b3=new Image(); window._b3.src="assets/img/embedded-9a0589189e.png"; window._b3.bw=130; window._b3.bh=100; }
  if(!window._b4){ window._b4=new Image(); window._b4.src="assets/img/embedded-e0c035d13f.png"; window._b4.bw=130; window._b4.bh=161; }
  if(!window._b5){ window._b5=new Image(); window._b5.src="assets/img/embedded-bed22e7fec.png"; window._b5.bw=130; window._b5.bh=193; }

  const imgs  = [window._b0,window._b1,window._b2,window._b3,window._b4,window._b5];
  const names = ["Zorzales","Aura","Céfiro Azul","D. Artemisa","Agalta","Atlas"];
  const idx   = names.indexOf(bldgData.name);
  const img   = imgs[idx >= 0 ? idx : 0];
  const BW    = PIPE_W + 10;
  const gapBot = gapTop + PIPE_GAP;

  if(img && img.complete && img.naturalWidth > 0){

    // ── TOP building: flip vertically, stretch to fill exactly gapTop height ──
    const topH = gapTop;
    if(topH > 10){
      ctx.save();
      ctx.translate(x, 0);
      ctx.scale(1, -1);               // flip so roof faces up
      ctx.drawImage(img, 0, -topH, BW, topH); // stretch to fill — no tiling
      ctx.restore();
      // Name label
      ctx.save();
      ctx.globalAlpha=0.82;
      ctx.fillStyle="rgba(0,0,0,0.5)";
      ctx.beginPath(); ctx.roundRect(x+2,gapTop-20,BW-4,14,4); ctx.fill();
      ctx.fillStyle="#fff"; ctx.font="bold 7px Arial"; ctx.textAlign="center";
      ctx.fillText(bldgData.name, x+BW/2, gapTop-10);
      ctx.restore();
    }

    // ── BOTTOM building: right-side up, stretch to fill exactly botH height ──
    const botH = FH - 40 - gapBot;
    if(botH > 10){
      ctx.drawImage(img, x, gapBot, BW, botH); // stretch — no tiling
    }

  } else {
    // Fallback while loading
    ctx.fillStyle="#1a6b1a";
    ctx.fillRect(x, 0, BW, gapTop);
    ctx.fillRect(x, gapBot, BW, FH-40-gapBot);
  }

  // Gap hint
  ctx.save();
  ctx.globalAlpha=0.5;
  ctx.fillStyle="rgba(255,255,255,0.08)";
  ctx.beginPath(); ctx.roundRect(x+5,gapTop+PIPE_GAP/2-9,BW-10,18,5); ctx.fill();
  ctx.fillStyle="rgba(255,255,255,0.6)"; ctx.font="bold 7px Arial"; ctx.textAlign="center";
  ctx.fillText("✈ VUELA", x+BW/2, gapTop+PIPE_GAP/2+3);
  ctx.restore();
}

function drawBg(ctx,frame){
  // Sky — dawn/dusk gradient
  const t = (Math.sin(frame*0.002)+1)/2; // 0-1 cycle
  const sky=ctx.createLinearGradient(0,0,0,FH);
  sky.addColorStop(0,`hsl(${220+t*30},${60+t*20}%,${8+t*12}%)`);
  sky.addColorStop(0.5,`hsl(${200+t*40},${50+t*20}%,${12+t*15}%)`);
  sky.addColorStop(1,`hsl(${180+t*30},${40}%,${6+t*8}%)`);
  ctx.fillStyle=sky; ctx.fillRect(0,0,FW,FH);

  // Moon
  ctx.save();
  ctx.globalAlpha=0.6;
  ctx.fillStyle="#fffde0";
  ctx.beginPath(); ctx.arc(380,30,14,0,Math.PI*2); ctx.fill();
  ctx.globalAlpha=0.15; ctx.fillStyle="#fff";
  ctx.beginPath(); ctx.arc(380,30,20,0,Math.PI*2); ctx.fill();
  ctx.restore();

  // Stars
  const stars=[[20,18],[55,10],[110,25],[170,8],[240,20],[300,12],[355,22],[405,14],[430,28],[70,40],[200,35],[340,38]];
  stars.forEach(([sx,sy])=>{
    ctx.globalAlpha=0.3+0.5*Math.abs(Math.sin(frame*0.025+sx*0.12));
    ctx.fillStyle="#fff"; ctx.fillRect(sx,sy,1.5,1.5);
  });
  ctx.globalAlpha=1;

  // Background city silhouette (far buildings)
  ctx.fillStyle="rgba(15,10,30,0.7)";
  const bgBuildings=[[0,80,30,FH-40],[35,90,25,FH-40],[65,70,40,FH-40],[110,85,20,FH-40],
    [135,75,30,FH-40],[170,65,25,FH-40],[200,80,35,FH-40],[240,55,20,FH-40],
    [265,80,30,FH-40],[300,70,40,FH-40],[345,85,25,FH-40],[375,60,30,FH-40],
    [410,75,26,FH-40]];
  bgBuildings.forEach(([bx,by,bw,bh])=>{
    ctx.fillRect(bx,by,bw,bh);
    // Tiny lit windows in bg
    ctx.fillStyle="rgba(255,220,100,0.4)";
    for(let r=0;r<3;r++) for(let c=0;c<2;c++){
      if(Math.sin(bx*r+frame*0.01)>0.1) ctx.fillRect(bx+3+c*8,by+5+r*10,4,5);
    }
    ctx.fillStyle="rgba(15,10,30,0.7)";
  });

  // Ground
  const gnd=ctx.createLinearGradient(0,FH-40,0,FH);
  gnd.addColorStop(0,"#1a1025"); gnd.addColorStop(1,"#0d0818");
  ctx.fillStyle=gnd; ctx.fillRect(0,FH-40,FW,40);
  // Road
  ctx.fillStyle="#1e1530"; ctx.fillRect(0,FH-30,FW,20);
  // Road markings
  ctx.fillStyle="rgba(255,255,150,0.25)";
  const roadOff=(frame*PIPE_SPEED_BASE*1.2)%50;
  for(let rx=FW-roadOff;rx>-50;rx-=50) ctx.fillRect(rx,FH-22,30,3);
  // Sidewalk
  ctx.fillStyle="#151020"; ctx.fillRect(0,FH-40,FW,10);
  // Street lights
  for(let lx=40-(frame*PIPE_SPEED_BASE)%80;lx<FW+40;lx+=80){
    ctx.strokeStyle="rgba(255,220,100,0.5)"; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.moveTo(lx,FH-40); ctx.lineTo(lx,FH-60); ctx.lineTo(lx+8,FH-62); ctx.stroke();
    ctx.fillStyle="rgba(255,230,100,0.6)";
    ctx.beginPath(); ctx.arc(lx+8,FH-62,2.5,0,Math.PI*2); ctx.fill();
    // Light cone
    ctx.globalAlpha=0.04; ctx.fillStyle="#ffe064";
    ctx.beginPath(); ctx.moveTo(lx+8,FH-62); ctx.lineTo(lx-10,FH-40); ctx.lineTo(lx+26,FH-40); ctx.closePath(); ctx.fill();
    ctx.globalAlpha=1;
  }
}

function flappyLoop(canvas){
  const ctx=canvas.getContext("2d");
  const scoreEl=document.getElementById("flappy-score");
  function loop(){
    if(!document.getElementById("flappy-canvas")){cancelAnimationFrame(flappyRAF);return;}
    flappyRAF=requestAnimationFrame(loop);
    fb.frame++;
    const b=fb.bird;
    if(fb.phase==="playing"){
      // Speed increases every 5 buildings passed
      fb.speed = PIPE_SPEED_BASE + Math.floor(fb.score/5)*0.15;
      b.vy=Math.min(b.vy+GRAVITY,10); b.y+=b.vy;
      b.angle=Math.max(-0.5,Math.min(1.2,b.vy*0.08)); b.flap++;
      if(fb.frame%PIPE_FREQ===0){
        const bldg = BLDGS[fb.bldgIdx % BLDGS.length];
        fb.pipes.push({x:FW+10,gapTop:50+Math.random()*(FH-PIPE_GAP-110),passed:false,bldg});
        fb.bldgIdx++;
      }
      fb.pipes.forEach(p=>{
        p.x-=fb.speed;
        if(!p.passed&&p.x+PIPE_W<b.x){
          p.passed=true; fb.score++;
          if(scoreEl) scoreEl.textContent=fb.score;
          for(let i=0;i<8;i++) fb.particles.push({x:b.x,y:b.y,vx:(Math.random()-.5)*5,vy:-2.5-Math.random()*2.5,life:50,e:["⭐","✨","💫","🏙️"][i%4]});
        }
      });
      fb.pipes=fb.pipes.filter(p=>p.x>-PIPE_W-20);
      // Collisions
      if(b.y+14>FH-40||b.y-14<0){killBird();return;}
      for(const p of fb.pipes){
        if(b.x+11>p.x+3&&b.x-11<p.x+PIPE_W-3){
          if(b.y-11<p.gapTop||b.y+11>p.gapTop+PIPE_GAP){killBird();return;}
        }
      }
      // Win!
      if(fb.score>=SCORE_WIN){
        fb.phase="done"; fb.best=Math.max(fb.best,fb.score);
        gameScoreFinal=fb.score;
        saveRanking(fb.score);
        setTimeout(()=>showFlappyResult(true),400);
      }
    }
    fb.particles=fb.particles.filter(p=>p.life>0);
    fb.particles.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.vy+=0.2;p.life--;});
    // Draw
    drawBg(ctx,fb.frame);
    fb.pipes.forEach(p=>drawBuilding(ctx,p.x,p.gapTop,p.bldg));
    fb.particles.forEach(p=>{ctx.globalAlpha=p.life/50;ctx.font="13px serif";ctx.fillText(p.e,p.x-7,p.y+7);});
    ctx.globalAlpha=1;
    if(fb.phase!=="done") drawMacaw(ctx,b.x,fb.phase==="ready"?b.y+Math.sin(fb.frame*.08)*5:b.y,fb.phase==="ready"?0:b.angle,34,b.flap);
    // HUD score
    if(fb.phase==="playing"){
      ctx.fillStyle="rgba(0,0,0,.55)"; ctx.beginPath(); ctx.roundRect(FW/2-38,8,76,34,10); ctx.fill();
      ctx.fillStyle="#ffd700"; ctx.font="bold 22px Nunito,Arial"; ctx.textAlign="center"; ctx.fillText(fb.score,FW/2,30);
      const spd=Math.round((fb.speed-PIPE_SPEED_BASE)/0.15)+1;
      if(spd>1){ ctx.fillStyle="rgba(255,140,0,0.9)"; ctx.font="bold 9px Arial"; ctx.fillText("VEL "+spd+"×",FW/2,48); }
      ctx.textAlign="left";
      const nextP=fb.pipes.find(p=>!p.passed&&p.x>b.x);
      if(nextP){
        ctx.fillStyle="rgba(0,0,0,0.45)"; ctx.beginPath(); ctx.roundRect(4,6,72,16,4); ctx.fill();
        ctx.fillStyle=nextP.bldg.accent; ctx.font="bold 8px Arial";
        ctx.fillText("▶ "+nextP.bldg.name,8,17);
      }
    }
    if(fb.phase==="ready"){
      ctx.fillStyle="rgba(0,0,0,.55)"; ctx.beginPath(); ctx.roundRect(FW/2-115,FH/2-46,230,92,14); ctx.fill();
      ctx.fillStyle="#ffd700"; ctx.font="bold 16px Nunito,Arial"; ctx.textAlign="center"; ctx.fillText("¡Flappy mayITa! 🦜",FW/2,FH/2-24);
      ctx.fillStyle="rgba(255,255,255,.75)"; ctx.font="12px Arial"; ctx.fillText("Vuela entre los edificios de Tegucigalpa",FW/2,FH/2-4);
      ctx.fillStyle="#ff8c42"; ctx.font="bold 12px Arial"; ctx.fillText("Tap  ·  Click  ·  Espacio para volar",FW/2,FH/2+18);
      ctx.fillStyle="rgba(255,255,255,.4)"; ctx.font="10px Arial"; ctx.fillText("¡Sin límite de edificios! Llega lo más lejos posible",FW/2,FH/2+36);
      ctx.textAlign="left";
    }
    if(fb.phase==="dead"){
      // Show result overlay in canvas while waiting for user click
      ctx.fillStyle="rgba(0,0,0,.7)"; ctx.beginPath(); ctx.roundRect(FW/2-115,FH/2-60,230,120,16); ctx.fill();
      ctx.fillStyle="#f87171"; ctx.font="bold 22px Nunito,Arial"; ctx.textAlign="center"; ctx.fillText("¡Chocaste! 💥",FW/2,FH/2-32);
      ctx.fillStyle="#ffd700"; ctx.font="bold 28px Nunito,Arial"; ctx.fillText(fb.score+" edificios",FW/2,FH/2+2);
      if(fb.score>fb.best-1&&fb.score>0){ ctx.fillStyle="#22c55e"; ctx.font="bold 10px Arial"; ctx.fillText("🏆 ¡NUEVO RÉCORD!",FW/2,FH/2+20); }
      else{ ctx.fillStyle="rgba(255,255,255,.5)"; ctx.font="10px Arial"; ctx.fillText("Récord: "+fb.best,FW/2,FH/2+20); }
      ctx.fillStyle="rgba(255,255,255,.6)"; ctx.font="11px Arial"; ctx.fillText("Toca para intentar de nuevo",FW/2,FH/2+42);
      ctx.textAlign="left";
    }
  }
  loop();
}

// ─── Ranking (localStorage) ──────────────────────────
// ─── Ranking general SharePoint / n8n ──────────────────────────
async function saveRanking(score) {
  try {
    const response = await fetch(N8N_RANKING_SAVE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        usuario: {
          nombre: msUser.name,
          correo: msUser.email,
          entraId: msUser.id
        },
        puntaje: Number(score),
        fechaRegistro: new Date().toISOString(),
        origen: "GitHub Pages"
      })
    });

    const data = await response.json().catch(() => null);

    if (!response.ok || !data?.ok) {
      throw new Error(
        data?.mensaje ||
        `No se pudo guardar el puntaje: ${response.status}`
      );
    }

    return true;

  } catch (error) {
    console.error("Error guardando ranking:", error);
    return false;
  }
}

async function getRanking() {
  try {
    const response = await fetch(N8N_RANKING_TOP_URL, {
      method: "GET",
      headers: {
        "Accept": "application/json"
      },
      cache: "no-store"
    });

    const data = await response.json().catch(() => null);

    if (!response.ok || !data?.ok) {
      throw new Error(
        data?.mensaje ||
        `No se pudo consultar el ranking: ${response.status}`
      );
    }

    return Array.isArray(data.ranking)
      ? data.ranking
      : [];

  } catch (error) {
    console.error("Error consultando ranking:", error);
    return [];
  }
}

function formatearFechaRanking(fecha) {
  if (!fecha) return "";

  const date = new Date(fecha);

  if (Number.isNaN(date.getTime())) {
    return fecha;
  }

  return date.toLocaleDateString("es-HN");
}

async function rankingHTML() {
  const list = await getRanking();

  if (!list.length) {
    return `
      <div style="
        color:rgba(255,255,255,.4);
        font-size:.8rem;
        text-align:center;
        padding:8px;
      ">
        Sé el primero en el ranking 🦜
      </div>
    `;
  }

  const medals = ["🥇", "🥈", "🥉"];

  return list.map((r, i) => `
    <div style="
      display:flex;
      align-items:center;
      gap:8px;
      padding:5px 8px;
      border-radius:9px;
      background:${
        i === 0
          ? "rgba(255,215,0,.1)"
          : i === 1
          ? "rgba(192,192,192,.07)"
          : i === 2
          ? "rgba(205,127,50,.07)"
          : "rgba(255,255,255,.03)"
      };
      margin-bottom:3px;
    ">
      <span style="
        font-size:.9rem;
        width:20px;
        text-align:center;
      ">
        ${medals[i] || "#" + (i + 1)}
      </span>

      <span style="
        color:#fff;
        font-weight:800;
        font-size:.82rem;
        flex:1;
        overflow:hidden;
        text-overflow:ellipsis;
        white-space:nowrap;
      ">
        ${r.name || "Usuario"}
      </span>

      <span style="
        color:#ffd700;
        font-weight:900;
        font-size:.88rem;
      ">
        ${Number(r.score || 0)}
      </span>

      <span style="
        color:rgba(255,255,255,.28);
        font-size:.7rem;
      ">
        ${formatearFechaRanking(r.date)}
      </span>
    </div>
  `).join("");
}

async function killBird() {
  fb.bird.vy = JUMP_VEL * 0.4;
  fb.phase = "dead";
  fb.best = Math.max(fb.best, fb.score);

  await saveRanking(fb.score);

  setTimeout(() => {
    if (fb.phase === "dead") {
      showFlappyResult(false);
    }
  }, 1800);
}

function flappyJump(){
  if(fb.phase==="ready"){fb.phase="playing";fb.bird.vy=JUMP_VEL;return;}
  if(fb.phase==="playing"){fb.bird.vy=JUMP_VEL;return;}
  if(fb.phase==="dead"){fbReset();fb.phase="playing";fb.bird.vy=JUMP_VEL;}
}

async function showFlappyResult(won){
detenerControlesFlappy();
  gameScoreFinal=fb.score;
  const score=fb.score, best=fb.best;
  const isRecord=score>0&&score>=best;
  const mood=won?"excelente":score>=8?"excelente":score>=4?"bueno":"regular";
  const title=won?"¡Lo lograste! 🏆🎉":score>=8?"¡Increíble vuelo! 🏆":score>=4?"¡Buen vuelo! 🎉":"¡Buen intento! 😄";
  const rankingGeneral = await rankingHTML();
  document.getElementById("game-inner").innerHTML=`
    <div style="text-align:center">
      <div style="display:flex;justify-content:center;margin-bottom:6px">${parrotSVG(mood,96)}</div>
      <div style="font-family:'Syne',sans-serif;font-size:1.1rem;font-weight:800;color:#fff;margin-bottom:8px">${title}</div>
      <div style="background:rgba(255,255,255,.07);border-radius:14px;padding:10px 12px;margin-bottom:8px;display:flex;justify-content:space-around;align-items:center;">
        <div>
          <div style="color:rgba(255,255,255,.42);font-size:.65rem;font-weight:800;letter-spacing:1px;text-transform:uppercase;margin-bottom:3px">🏙️ Edificios</div>
          <div style="font-size:1.9rem;font-weight:900;color:#ffd700;line-height:1">${score}</div>
        </div>
        <div style="width:1px;height:34px;background:rgba(255,255,255,.15)"></div>
        <div>
          <div style="color:rgba(255,255,255,.42);font-size:.65rem;font-weight:800;letter-spacing:1px;text-transform:uppercase;margin-bottom:3px">🏅 Mi récord</div>
          <div style="font-size:1.9rem;font-weight:900;color:${isRecord?"#22c55e":"rgba(255,255,255,.5)"};line-height:1">${best}</div>
        </div>
        <div style="width:1px;height:34px;background:rgba(255,255,255,.15)"></div>
        <div>
          <div style="color:rgba(255,255,255,.42);font-size:.65rem;font-weight:800;letter-spacing:1px;text-transform:uppercase;margin-bottom:3px">🎯 Meta</div>
          <div style="font-size:1.9rem;font-weight:900;color:rgba(255,255,255,.45);line-height:1">${SCORE_WIN}</div>
        </div>
      </div>
      ${isRecord?`<div style="background:rgba(34,197,94,.12);border:1px solid rgba(34,197,94,.3);border-radius:10px;padding:6px;margin-bottom:6px;color:#86efac;font-size:.8rem;font-weight:800;">🏆 ¡Nuevo récord personal!</div>`:""}
      ${won||score>=4?`<div class="motivational" style="margin-bottom:8px;padding:10px 12px;">💫 ${MOTIV[Math.floor(Math.random()*MOTIV.length)]}</div>`:""}
      <div style="background:rgba(255,255,255,.05);border-radius:14px;padding:10px 10px;margin-bottom:10px;text-align:left;">
        <div style="color:rgba(255,255,255,.45);font-size:.65rem;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:7px;text-align:center;">🏆 Ranking mayITa</div>
       ${rankingGeneral}
      </div>
      <button class="btn-primary" style="margin-top:0" onclick="goToQuiz()">Ir a la encuesta 📋</button>
      <button onclick="fbReset();renderFlappyArena();" style="width:100%;padding:12px;border-radius:14px;border:1.5px solid rgba(255,255,255,.2);background:rgba(255,255,255,.06);color:rgba(255,255,255,.72);font-family:'Nunito',sans-serif;font-weight:800;font-size:.88rem;cursor:pointer;margin-top:9px;" onmouseover="this.style.background='rgba(255,255,255,.12)'" onmouseout="this.style.background='rgba(255,255,255,.06)'">
        Intentar de nuevo 🔄
      </button>
    </div>`;
}

function renderFlappyArena(){
detenerControlesFlappy();
  fbReset();
  document.getElementById("game-inner").innerHTML=`
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
      <div style="color:rgba(255,255,255,.5);font-size:.74rem;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;">Flappy mayITa 🦜</div>
      <div style="background:rgba(255,255,255,.08);border-radius:20px;padding:4px 14px;color:#ffd700;font-weight:900;font-size:.88rem;">🏙️ <span id="flappy-score">0</span></div>
    </div>
    <div style="display:flex;justify-content:center;">
      <canvas id="flappy-canvas" width="${FW}" height="${FH}" style="border-radius:18px;cursor:pointer;touch-action:none;max-width:100%;"></canvas>
    </div>
    <div style="text-align:center;margin-top:8px;color:rgba(255,255,255,.38);font-size:.76rem;font-weight:800;">Toca · Click · Espacio para volar · ¡Sin límite!</div>`;
  const canvas=document.getElementById("flappy-canvas");
  canvas.addEventListener("click",flappyJump);
  canvas.addEventListener("touchstart",e=>{e.preventDefault();flappyJump();},{passive:false});
 if (flappyKeyHandler) {
  document.removeEventListener("keydown", flappyKeyHandler);
}

flappyKeyHandler = (e) => {
  const tag = document.activeElement?.tagName?.toLowerCase();

  const escribiendo =
    tag === "input" ||
    tag === "textarea" ||
    document.activeElement?.isContentEditable;

  if (escribiendo) {
    return;
  }

  if (e.code === "Space" || e.code === "ArrowUp") {
    e.preventDefault();
    flappyJump();
  }
};

document.addEventListener("keydown", flappyKeyHandler);
  flappyLoop(canvas);
}
function detenerControlesFlappy() {
  cancelAnimationFrame(flappyRAF);

  if (flappyKeyHandler) {
    document.removeEventListener(
      "keydown",
      flappyKeyHandler
    );

    flappyKeyHandler = null;
  }
}

function goToGame(){
  document.getElementById("game-avatar-initial").textContent=msUser.name[0].toUpperCase();
  document.getElementById("game-user-name").textContent=msUser.name;
  document.getElementById("game-user-email").textContent=msUser.email;
  showScreen("s-game");
  renderGameReady();
}

function renderGameReady(){
  detenerControlesFlappy();
  fbReset();
  document.getElementById("game-inner").innerHTML=`
    <div style="text-align:center">
      <div id="game-parrot-ready" style="display:flex;justify-content:center;margin-bottom:10px"></div>
      <div style="color:#fff;font-family:'Syne',sans-serif;font-weight:800;font-size:1.15rem;margin-bottom:8px">¡Flappy mayITa! 🦜</div>
      <p style="color:rgba(255,255,255,.62);font-size:.87rem;line-height:1.65;margin-bottom:18px">
        Vuela como guacamaya entre las tuberías.<br>
        <strong style="color:#fbbf24">Toca / click / espacio</strong> para aletear.<br>
        Pasa <strong style="color:#22c55e">¡todos los edificios</strong> que puedas!
      </p>
      <button class="btn-primary" style="margin-top:0" onclick="renderFlappyArena()">¡Jugar! 🎮</button>
      <button onclick="goToQuiz()" style="width:100%;padding:11px;border-radius:14px;border:1.5px solid rgba(255,255,255,.2);background:transparent;color:rgba(255,255,255,.45);font-family:'Nunito',sans-serif;font-weight:800;font-size:.88rem;cursor:pointer;margin-top:10px;transition:all .2s;" onmouseover="this.style.color='rgba(255,255,255,.75)';this.style.borderColor='rgba(255,255,255,.4)'" onmouseout="this.style.color='rgba(255,255,255,.45)';this.style.borderColor='rgba(255,255,255,.2)'">Saltar juego → ir a encuesta</button>
    </div>`;
  document.getElementById("game-parrot-ready").innerHTML=parrotSVG("idle",130);
}

// ════════════════════════════════════════════════════
// QUIZ
// ════════════════════════════════════════════════════
function goToQuiz(){
  surveyAnswers=[]; currentQ=0; answering=false; selectedVal=null;
  renderQuiz();
  showScreen("s-quiz");
}

function renderQuiz(){
  // Progress dots
  const dots=document.getElementById("quiz-dots");
  dots.innerHTML="";
  QUESTIONS.forEach((_,i)=>{
    const d=document.createElement("div");
    d.className="prog-dot";
    d.id=`dot-${i}`;
    d.style.width=i<surveyAnswers.length?"22px":"10px";
    if(i<surveyAnswers.length) d.style.background=getLikertByVal(surveyAnswers[i]).color;
    else if(i===currentQ) d.style.background="rgba(255,255,255,.65)";
    dots.appendChild(d);
  });

  document.getElementById("quiz-progress-label").textContent=`Pregunta ${currentQ+1}/${QUESTIONS.length}`;
  document.getElementById("quiz-question").textContent=QUESTIONS[currentQ];
  document.getElementById("quiz-parrot").innerHTML=parrotSVG("idle",180);

  // Likert buttons
  const opts=document.getElementById("likert-opts");
  opts.innerHTML="";
  LIKERT.forEach(lk=>{
    const b=document.createElement("button");
    b.className="lk-btn";
    b.dataset.val=lk.v;
    b.style.background=`${lk.color}22`;
    b.style.borderColor=`${lk.color}55`;
    b.style.color=lk.color;
    b.innerHTML=`<span class="lk-icon">${lk.icon}</span><span class="lk-num">${lk.v}</span><span class="lk-lbl">${lk.lbl}</span>`;
    b.addEventListener("click",()=>handleAnswer(lk.v));
    opts.appendChild(b);
  });

  // Thumb hidden
  document.getElementById("likert-thumb").style.display="none";
  // Remove old bubble
  document.getElementById("bubble-wrap").querySelector(".bubble")?.remove();
}

function handleAnswer(value){
  if(answering) return;
  answering=true;
  selectedVal=value;

  // Highlight selected
  document.querySelectorAll(".lk-btn").forEach(b=>{
    b.disabled=true;
    if(parseInt(b.dataset.val)===value){
      const lk=getLikertByVal(value);
      b.classList.add("sel");
      b.style.background=lk.color;
      b.style.borderColor=lk.color;
      b.style.color="#fff";
      b.style.boxShadow=`0 8px 24px ${lk.color}55,0 0 0 4px ${lk.color}33`;
    }
  });

  // Thumb
  const thumb=document.getElementById("likert-thumb");
  const lk=getLikertByVal(value);
  thumb.style.display="block";
  thumb.style.left=`${((value-1)/4)*100}%`;
  thumb.style.background=lk.color;

  // Parrot bounce + bubble
  const mood=getMoodFromVal(value);
  const qiText=REACTIONS[mood][currentQ];
  document.getElementById("quiz-parrot").innerHTML=parrotSVG(mood,180);
  const pSvg=document.getElementById("quiz-parrot").querySelector("svg");
  pSvg.classList.remove("parrot-idle");
  pSvg.classList.add("parrot-bounce");

  // Bubble
  const wrap=document.getElementById("bubble-wrap");
  wrap.querySelector(".bubble")?.remove();
  const bub=document.createElement("div");
  bub.className="bubble";
  bub.style.borderColor=lk.color;
  bub.innerHTML=`${qiText}<div class="tail-border" style="border-top:10px solid ${lk.color}"></div><div class="tail-white"></div>`;
  wrap.insertBefore(bub,wrap.firstChild);

  if(value>=4) boom();

  setTimeout(()=>{
    bub.remove();
    surveyAnswers.push(value);
    answering=false; selectedVal=null;

    if(surveyAnswers.length>=QUESTIONS.length){
      document.getElementById("quiz-parrot").innerHTML=parrotSVG("done",180);
      setTimeout(()=>goToImprovement(),700);
    } else {
      currentQ=surveyAnswers.length;
      renderQuiz();
    }
  },2500);
}

// ════════════════════════════════════════════════════
// IMPROVEMENT
// ════════════════════════════════════════════════════
function goToImprovement(){
  improvements=[]; otherText=""; showOther=false;
  const sc=getScore();
  const ov=getLabel(sc);
  const lk=getLikertByMood(ov);

  // Score box
  document.getElementById("imp-score-box").innerHTML=`
    <div style="display:flex;align-items:center;gap:10px">
      <span style="font-size:1.9rem">${lk.icon}</span>
      <div>
        <div class="score-label">Tu calificación</div>
        <div style="color:${lk.color};font-weight:900">${lk.lbl}</div>
      </div>
    </div>
    <div><span class="score-big" style="color:${lk.color}">${sc}</span><span class="score-sub">/100</span></div>`;

  // Improvement options
  const list=document.getElementById("imp-list");
  list.innerHTML="";
  IMPROVEMENT_OPTIONS.forEach(opt=>{
    const wrap=document.createElement("div");
    const btn=document.createElement("button");
    btn.className="imp-btn";
    btn.innerHTML=`<div class="imp-check" id="chk-${opt.replace(/\s/g,'_')}"></div>${opt}`;
    btn.addEventListener("click",()=>toggleImp(opt,btn,wrap));
    wrap.appendChild(btn);
    if(opt==="Otra"){
      const ow=document.createElement("div");
      ow.className="other-input-wrap";
      ow.id="other-wrap";
      ow.innerHTML=`<input class="input" id="other-input" placeholder="Especifica aquí..." style="font-size:.87rem;padding:10px 14px;">`;
      ow.querySelector("input").addEventListener("input",e=>otherText=e.target.value);
      wrap.appendChild(ow);
    }
    list.appendChild(wrap);
  });
  showScreen("s-improvement");
}

function toggleImp(opt,btn,wrap){
  if(improvements.includes(opt)){
    improvements=improvements.filter(x=>x!==opt);
    btn.classList.remove("sel");
    btn.querySelector(".imp-check").textContent="";
    if(opt==="Otra"){ showOther=false; document.getElementById("other-wrap").classList.remove("show"); }
  } else {
    improvements.push(opt);
    btn.classList.add("sel");
    btn.querySelector(".imp-check").textContent="✓";
    if(opt==="Otra"){ showOther=true; document.getElementById("other-wrap").classList.add("show"); }
  }
}

function goToSuggestion(){
  // Tags
  const tags=document.getElementById("sug-imp-tags");
  tags.innerHTML="";
  if(improvements.length>0){
    improvements.forEach(imp=>{
      const t=document.createElement("div");
      t.className="imp-tag";
      t.textContent=(imp==="Otra"&&otherText)?`Otra: ${otherText}`:imp;
      tags.appendChild(t);
    });
  }
  document.getElementById("sug-parrot").innerHTML=parrotSVG("done",160);
  document.getElementById("sug-textarea").value="";
  document.getElementById("sug-err").classList.remove("show");
  showScreen("s-suggestion");
}

document.getElementById("btn-submit").addEventListener("click",handleSubmit);
document.getElementById("sug-textarea").addEventListener("input",function(){
  if(this.value.trim()) document.getElementById("sug-err").classList.remove("show");
});

// ════════════════════════════════════════════════════
// SUBMIT + TEAMS
// ════════════════════════════════════════════════════
async function guardarEncuestaEnN8n(payload) {
  const response = await fetch(
    "https://celaque.app.n8n.cloud/webhook/mayita/encuesta",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    }
  );

  const textoRespuesta = await response.text();

  let data = null;

  try {
    data = textoRespuesta
      ? JSON.parse(textoRespuesta)
      : null;
  } catch (error) {
    console.error(
      "La respuesta de n8n no es JSON válido:",
      textoRespuesta
    );
  }

  if (!response.ok) {
    throw new Error(
      data?.mensaje ||
      `n8n respondió con estado ${response.status}`
    );
  }

  if (!data?.ok) {
    throw new Error(
      data?.mensaje ||
      "n8n no confirmó el guardado."
    );
  }

  return data;
}async function guardarEncuestaEnN8n(payload) {
  const response = await fetch(
    "https://celaque.app.n8n.cloud/webhook/mayita/encuesta",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    }
  );

  const textoRespuesta = await response.text();

  let data = null;

  try {
    data = textoRespuesta
      ? JSON.parse(textoRespuesta)
      : null;
  } catch (error) {
    console.error(
      "La respuesta de n8n no es JSON válido:",
      textoRespuesta
    );
  }

  if (!response.ok) {
    throw new Error(
      data?.mensaje ||
      `n8n respondió con estado ${response.status}`
    );
  }

  if (!data?.ok) {
    throw new Error(
      data?.mensaje ||
      "n8n no confirmó el guardado."
    );
  }

  return data;
}

async function handleSubmit() {
  const textarea = document.getElementById("sug-textarea");
  const botonEnviar = document.getElementById("btn-submit");
  const errorSugerencia = document.getElementById("sug-err");

  const sugerencia = textarea.value.trim();

  if (!sugerencia) {
    errorSugerencia.classList.add("show");
    textarea.focus();
    return;
  }

  if (surveyAnswers.length !== QUESTIONS.length) {
    alert(
      "No se encontraron todas las respuestas de la encuesta."
    );
    return;
  }

  botonEnviar.disabled = true;
  errorSugerencia.classList.remove("show");

  showScreen("s-sending");

  const puntajeTotal = surveyAnswers.reduce(
    (total, valor) => total + Number(valor || 0),
    0
  );

  const porcentajeSatisfaccion = getScore();

  const areasMejora = improvements.filter(
    opcion => opcion !== "Otra"
  );

  const otraAreaMejora =
    improvements.includes("Otra")
      ? otherText.trim()
      : "";

  const payload = {
    usuario: {
      nombre: msUser.name,
      correo: msUser.email,
      entraId: msUser.id
    },

    respuestas: {
      tiempoRespuesta:
        Number(surveyAnswers[0] || 0),

      resolucionEfectiva:
        Number(surveyAnswers[1] || 0),

      comunicacionClara:
        Number(surveyAnswers[2] || 0),

      satisfaccionSolucion:
        Number(surveyAnswers[3] || 0),

      recomendariaServicio:
        Number(surveyAnswers[4] || 0)
    },

    puntajeTotal,
    porcentajeSatisfaccion,
    areasMejora,
    otraAreaMejora,
    sugerencia,

    puntajeJuego:
      Number(gameScoreFinal || 0),

    origen: "GitHub Pages",
    versionApp: APP_VERSION
  };

  try {
    const resultado =
      await guardarEncuestaEnN8n(payload);

    dbCount = Number(
      resultado.respuestasGuardadas || 5
    );

    document.getElementById(
      "done-title"
    ).textContent =
      `¡Gracias, ${msUser.name}! 🎉`;

    document.getElementById(
      "done-parrot"
    ).innerHTML =
      parrotSVG("done", 160);

    const badge = document.getElementById(
      "teams-status-badge"
    );

    badge.className = "teams-status ok";
    badge.textContent = "✓ Guardada";

    document.getElementById(
      "teams-msg-text"
    ).textContent =
      "Tu opinión fue registrada correctamente y será revisada por el equipo de TI.";

    document.getElementById(
      "db-sub-text"
    ).textContent =
      `Encuesta ${resultado.codigoEncuesta} · ` +
      `${dbCount} respuestas guardadas · ` +
      `${new Date().toLocaleString("es-HN")}`;

    showScreen("s-done");

  } catch (error) {
    console.error(
      "Error al guardar la encuesta:",
      error
    );

    showScreen("s-suggestion");

    botonEnviar.disabled = false;

    errorSugerencia.textContent =
      `⚠ No pudimos guardar la encuesta. ${
        error.message ||
        "Intenta nuevamente."
      }`;

    errorSugerencia.classList.add("show");
  }
}

// ════════════════════════════════════════════════════
// RESET
// ════════════════════════════════════════════════════
function resetAll(){
  msUser={name:"",email:"",id:"",token:""};
  surveyAnswers=[]; currentQ=0; answering=false; selectedVal=null;
  improvements=[]; otherText=""; showOther=false;
  gameScoreFinal=0; detenerControlesFlappy(); fbReset();
  document.getElementById("intro-err").classList.remove("show");
  const btn=document.getElementById("btn-ms-login");
  btn.disabled=false;
  btn.innerHTML=`<svg class="ms-logo" viewBox="0 0 21 21"><rect x="1" y="1" width="9" height="9" fill="#f25022"/><rect x="11" y="1" width="9" height="9" fill="#7fba00"/><rect x="1" y="11" width="9" height="9" fill="#00a4ef"/><rect x="11" y="11" width="9" height="9" fill="#ffb900"/></svg> Iniciar sesión con Microsoft 365`;
  showScreen("s-intro");
}

// ════════════════════════════════════════════════════
// INIT
// ════════════════════════════════════════════════════
document.getElementById("intro-parrot").innerHTML=parrotSVG("idle",180);

// Init MSAL and handle redirect result on every page load
(async()=>{
  try{
    await initMSAL();
    await handleRedirectResult();
  }catch(e){ console.error("MSAL init error:", e); }
})();

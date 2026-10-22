/* UI layer 2 for the Cat Beach Office: HUD, settings, toasts, tutorial, summary, stats, roster, shortcuts.
   Loaded after the main script; it talks to the game only through UI.ev() hooks, CAM (camera) and a few globals. */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const lsGet=(k,d)=>{try{const v=localStorage.getItem(k);return v===null?d:v}catch(e){return d}};
const lsSet=(k,v)=>{try{localStorage.setItem(k,v)}catch(e){}};
const stage=$('stage');
const fmt=ms=>{ms=Math.max(0,Math.round(ms/1000));return Math.floor(ms/60)+':'+String(ms%60).padStart(2,'0')};
const nameOf=k=>k==='claude'?'Claude':k==='boss'?BOSS.name:cats[k]?cats[k].who.name:k;
const t0Load=performance.now();

stage.insertAdjacentHTML('beforeend',`
<button id="gear" class="ibtn ui2" type="button" title="${L('Cài đặt','Settings')}" aria-label="${L('Cài đặt','Settings')}">⚙️</button>
<button id="mapbtn" class="ibtn ui2" type="button" title="${L('Bản đồ thế giới (W)','World map (W)')}" aria-label="${L('Bản đồ thế giới','World map')}">🗺️</button>
<button id="trophy" class="ibtn ui2" type="button" title="${L('Hồ sơ và huy hiệu','Stats and badges')}" aria-label="${L('Hồ sơ và huy hiệu','Stats and badges')}">🏆</button>
<div id="settings" class="u2p ui2" role="dialog" aria-label="${L('Cài đặt','Settings')}">
  <button class="x" type="button" id="setx" aria-label="${L('Đóng','Close')}">✕</button>
  <h3>⚙️ ${L('Cài đặt','Settings')}</h3>
  <div class="srow" id="r-lang"><span class="lb">🌐 ${L('Ngôn ngữ','Language')}</span></div>
  <div class="srow" id="r-mus"><span class="lb">🎵 ${L('Nhạc nền','Music')}</span><input id="vm" type="range" min="0" max=".8" step=".02" aria-label="${L('Âm lượng nhạc','Music volume')}"></div>
  <div class="srow" id="r-sfx"><span class="lb">🔔 ${L('Hiệu ứng','Effects')}</span><input id="vs" type="range" min="0" max="1" step=".05" aria-label="${L('Âm lượng hiệu ứng','Effects volume')}"></div>
  <div class="srow" id="r-wx"><span class="lb">⛅ ${L('Thời tiết','Weather')}</span></div>
  <div class="srow" id="r-clk"><span class="lb">🕒 ${L('Giờ trong ngày','Time of day')}</span></div>
  <div class="shr"></div>
  <div class="srow"><span class="lb">🔠 ${L('Cỡ chữ','Text size')}</span><div class="seg" id="fsz"><button type="button" data-v="0">A</button><button type="button" data-v="1" style="font-size:15px">A</button><button type="button" data-v="2" style="font-size:18px">A</button></div></div>
  <div class="srow"><label for="rmsw">🐢 ${L('Giảm chuyển động','Reduce motion')}</label><button id="rmsw" class="sw" type="button" role="switch" aria-checked="false"></button></div>
  <div class="shr"></div>
  <div class="srow" style="flex-wrap:wrap"><button class="pill" id="tourbtn" type="button">🎓 ${L('Xem lại hướng dẫn','Replay the tour')}</button><button class="pill ghost" id="keysbtn" type="button">⌨️ ${L('Phím tắt','Shortcuts')}</button></div>
</div>
<div id="hud" class="ui2" role="status" aria-live="polite">
  <div class="mid"><div class="q"></div><div class="segs"></div><div class="now"></div></div>
  <div class="pc"></div>
  <button id="hpause" type="button" title="${L('Tạm dừng','Pause')}" aria-label="${L('Tạm dừng','Pause')}">⏸</button>
  <button id="hcancel" type="button" title="${L('Hủy quest','Cancel quest')}" aria-label="${L('Hủy quest','Cancel quest')}">✖</button>
</div>
<div id="toasts" class="ui2" aria-live="polite"></div>
<div id="roster" class="ui2"></div>
<div id="tour" class="ui2"><div class="spot"></div><div class="tip"><b></b><p style="margin:0"></p><div class="nav"><span></span><button class="pill skip" type="button" id="tskip"></button><button class="pill" type="button" id="tnext"></button></div></div></div>
<div id="sum" class="u2m ui2"><div class="u2p" role="dialog"></div></div>
<div id="stats" class="u2m ui2"><div class="u2p" role="dialog"></div></div>
<div id="help" class="u2m ui2"><div class="u2p" role="dialog"></div></div>
<div id="tourask" class="u2m ui2"><div class="u2p" role="dialog" aria-label="${L('Hướng dẫn','Tour')}"><h3>🎓 ${L('Bạn có muốn xem hướng dẫn không?','Would you like a quick tour?')}</h3><p style="margin:0 0 4px">${L('Chỉ mất khoảng 30 giây. Lựa chọn của bạn được lưu lại, sẽ không hỏi lần sau. Muốn xem lại thì vào ⚙️ Cài đặt.','It takes about 30 seconds. Your choice is remembered, so we will not ask again. Replay it any time from ⚙️ Settings.')}</p><div class="row"><button class="pill" type="button" id="tayes">✅ ${L('Có, hướng dẫn tôi','Yes, show me')}</button><button class="pill ghost" type="button" id="tano">${L('Không, cảm ơn','No thanks')}</button></div></div></div>`);

/* ---------- Toasts ---------- */
function toast(text,icon='🐾',kind=''){
  if(performance.now()-t0Load<2500)return;
  const c=$('toasts');while(c.children.length>=3)c.firstChild.remove();
  const d=document.createElement('div');d.className='toast '+kind;d.textContent=icon+' '+text;c.append(d);
  setTimeout(()=>{d.classList.add('out');setTimeout(()=>d.remove(),320)},kind==='hint'?5200:3200);
}

/* ---------- Persistent stats and badges ---------- */
let S={quests:0,deny:0,inc:0,incClean:0,furn:0,sage:0,days:0,streak:0,best:0,last:'',ms:0,b:{}};
try{S={...S,...JSON.parse(lsGet('stats','{}'))}}catch(e){}
const dayStr=d=>d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();
{const now=new Date(),today=dayStr(now);
  if(S.last!==today){const y=new Date(now);y.setDate(y.getDate()-1);S.streak=S.last===dayStr(y)?S.streak+1:1;S.days++;S.last=today;S.best=Math.max(S.best,S.streak)}}
const BADGES=[
  {id:'first',e:'🐣',n:L('Tân binh văn phòng','Office rookie'),d:L('Hoàn thành quest đầu tiên','Finish your first quest'),ok:s=>s.quests>=1},
  {id:'five',e:'🐱',n:L('Chăm chỉ như mèo','Busy as a cat'),d:L('Hoàn thành 5 quest','Finish 5 quests'),ok:s=>s.quests>=5},
  {id:'ten',e:'🏆',n:L('Cựu chiến binh','Veteran'),d:L('Hoàn thành 10 quest','Finish 10 quests'),ok:s=>s.quests>=10},
  {id:'guard',e:'🛡️',n:L('Chốt chặn','Gatekeeper'),d:L('Từ chối một lần push/deploy không được phép','Deny an unasked push or deploy'),ok:s=>s.deny>=1},
  {id:'sleuth',e:'🔎',n:L('Thám tử số một','Top sleuth'),d:L('Giải sự cố ngay lần đầu','Solve an incident on the first try'),ok:s=>s.incClean>=1},
  {id:'furn',e:'🍦',n:L('Mèo sành điệu','Cat of leisure'),d:L('Dùng đồ vật 5 lần','Use furniture 5 times'),ok:s=>s.furn>=5},
  {id:'sage',e:'🎓',n:L('Học trò cưng','Teacher’s pet'),d:L('Hỏi Mr Biết Tuốt 3 lần','Ask the sage 3 times'),ok:s=>s.sage>=3},
  {id:'streak',e:'🔥',n:L('Chuyên cần','Regular'),d:L('Ghé chơi 3 ngày liên tiếp','Visit 3 days in a row'),ok:s=>s.best>=3}];
let newBadges=[];
function saveStats(){
  BADGES.forEach(b=>{if(!S.b[b.id]&&b.ok(S)){S.b[b.id]=Date.now();newBadges.push(b);toast(L('Huy hiệu mới: ','New badge: ')+b.n,b.e,'ok');try{SND.play('fanfare')}catch(e){}}});
  lsSet('stats',JSON.stringify(S));
}
saveStats();newBadges=[];

/* ---------- Quest HUD, pause / cancel ---------- */
const UI=window.UI={paused:false,cancelled:false,ev};
let run=null,hudT=0;
const hud=$('hud');
hud.querySelector('.segs').innerHTML=STEPS.map((s,i)=>`<i data-i="${i}" title="${T(s.name)}">${s.icon}</i>`).join('');
const fmtTok=n=>n>=1000?(n/1000).toFixed(n>=10000?0:1)+'k':String(n);
const fmtUsage=u=>`🪙 ${fmtTok(u.tokensIn+u.tokensOut)} tok${u.costUsd?` · $${u.costUsd.toFixed(2)}`:''}`;
function hudRender(){
  if(!run)return;
  const segs=hud.querySelectorAll('.segs i');let done=0,act=-1;
  run.state.forEach((st,i)=>{segs[i].className=st;if(st==='done')done++;if(st==='active'||st==='bug')act=i});
  hud.querySelector('.q').textContent='📋 '+run.q;
  hud.querySelector('.pc').textContent=Math.round((done+(act>=0?.5:0))/STEPS.length*100)+'%';
  let now='';
  if(UI.paused)now='⏸ '+L('Tạm dừng, mèo sẽ nghỉ sau bước này','Paused, the cats rest after this step');
  else if(act>=0){const r=run.steps[act];now=`${STEPS[act].who.name} · ${T(STEPS[act].name)} · ${fmt(performance.now()-r.s-r.p)}${window.PLAYBOOK?' · 🧠 '+PLAYBOOK.short(STEPS[act].id):''}`}
  else now=L('Đang chuẩn bị…','Getting ready…');
  if(run.usage&&!UI.paused&&act>=0)now+=' · '+fmtUsage(run.usage);
  hud.querySelector('.now').textContent=now;
  $('hpause').textContent=UI.paused?'▶':'⏸';
  hud.classList.toggle('paused',UI.paused);
}
let pauseAt=0;
$('hpause').onclick=()=>{
  if(!run)return;UI.paused=!UI.paused;if(UI.live)UI.live.pause(UI.paused);
  if(UI.paused){pauseAt=performance.now();toast(L('Đã tạm dừng. Mèo dừng lại sau bước hiện tại.','Paused. The cats stop after the current step.'),'⏸')}
  else{const d=performance.now()-pauseAt;run.steps.forEach((r,i)=>{if(run.state[i]==='active'||run.state[i]==='bug')r.p+=d});toast(L('Tiếp tục làm việc!','Back to work!'),'▶️')}
  hudRender();
};
let armed=0;
$('hcancel').onclick=()=>{
  if(!run)return;
  if($('card').style.display==='block'){toast(L('Hãy trả lời thẻ trước đã.','Answer the card first.'),'☝️');return}
  if(!armed){armed=setTimeout(()=>{armed=0;$('hcancel').textContent='✖'},3000);$('hcancel').textContent='?';toast(L('Bấm ✖ lần nữa để hủy quest.','Tap ✖ again to cancel the quest.'),'❓');return}
  clearTimeout(armed);armed=0;$('hcancel').textContent='✖';if(UI.live)UI.live.cancel();else UI.cancelled=true;UI.paused=false;
};

/* ---------- Game events ---------- */
const ACT={eat:[L('đi lấy đồ ăn/uống','is grabbing a bite'),'🍦'],scratch:[L('đang cào móng','is scratching'),'✨'],sit:[L('đang ngắm cảnh','is enjoying the view'),'😸'],nap:[L('đang ngủ một giấc','is taking a nap'),'💤'],play:[L('đang chơi','is playing'),'🧶']};
function ev(name,a,b,c){
  switch(name){
    case'begin':{UI.cancelled=false;UI.paused=false;run={q:a,t0:performance.now(),state:STEPS.map(()=>'todo'),steps:STEPS.map(()=>({s:0,e:0,p:0}))};
      $('mapbtn').disabled=true;hud.classList.add('on');$('hpause').disabled=$('hcancel').disabled=false;$('roster').classList.remove('shift');hudRender();clearInterval(hudT);hudT=setInterval(hudRender,500);break}
    case'start':if(run){run.state[a]='active';run.steps[a].s=b??performance.now();hudRender()}break;
    case'done':if(run){run.state[a]='done';run.steps[a].e=b??performance.now();hudRender()}break;
    case'skip':if(run){run.state[a]='skip';hudRender()}break;
    case'usage':if(run){run.usage={tokensIn:a,tokensOut:b,costUsd:c};hudRender()}break;
    case'log':if(run&&b==='bad'){const i=run.state.findIndex(s=>s==='active');if(i>=0){run.state[i]='bug';hudRender()}}
      if((b==='ok'||b==='bad')&&!/^Welcome/.test(a))toast(a.replace(/^\d{1,2}:\d{2}:\d{2}.*?\s\s/,'').slice(0,90),b==='ok'?'✅':'⚠️',b);break;
    case'incident':S.inc++;if(!a)S.incClean++;if(run){const i=run.state.findIndex(s=>s==='bug');if(i>=0)run.state[i]='active';hudRender()}saveStats();break;
    case'deny':S.deny++;saveStats();toast(L('Chốt chặn thành công: không ai push/deploy khi chưa được phép.','Gate held: nobody pushes or deploys unasked.'),'🛡️','ok');endRun();break;
    case'cancel':toast(L('Quest đã bị hủy.','Quest cancelled.'),'🛑');endRun();break;
    case'complete':{S.quests++;S.ms+=performance.now()-run.t0;saveStats();const r=run;$('mapbtn').disabled=false;run=null;clearInterval(hudT);hud.classList.remove('on');waitSummary(r,newBadges.splice(0));break}
    case'lamp':if(a==='active')toast(L('Đèn DEV nhấp nháy: đang deploy','DEV lamp blinking: a deploy is running'),'🟠');else if(a==='done')toast(L('Đèn DEV xanh: làn deploy rảnh','DEV lamp green: lane is free'),'🟢');break;
    case'furn':{S.furn++;saveStats();const act=FUSE[a]&&FUSE[a][0],m=ACT[act]||[L('đang dùng đồ vật','is using the furniture'),'🐾'];
      toast(nameOf(b)+' '+m[0],m[1]);if(act==='eat'&&cs[b])cs[b].hungry=6;break}
    case'sage':S.sage++;saveStats();break;
    case'profile':renderStats(a);break;
  }
}
function endRun(){$('mapbtn').disabled=false;run=null;clearInterval(hudT);hud.classList.remove('on');UI.paused=false}

/* ---------- Quest summary ---------- */
const QUIPS=L(["Cả đội xứng đáng một cây kem 🍦","Sếp nói: tạm hài lòng. Nghĩa là rất hài lòng.","Không con mèo nào bị bỏ lại phía sau (trừ Na đang ngủ gật).","Mr Biết Tuốt ngáp: tôi biết trước kết quả rồi."],
  ["The whole team deserves an ice cream 🍦","Boss says: mildly pleased. That means very pleased.","No cat was left behind (except Na, dozing).","Mr Know-It-All yawns: I saw it coming."]);
function waitSummary(r,got){const iv=setInterval(()=>{if(running)return;clearInterval(iv);showSummary(r,got)},400)}
function showSummary(r,got){
  const d=r.steps.map((x,i)=>Math.max(0,(x.e||x.s)-x.s-x.p)),tot=d.reduce((a,b)=>a+b,0),mx=Math.max(...d,1);
  let fi=-1,sl=-1;d.forEach((v,i)=>{if(r.state[i]==='skip')return;if(fi<0||v<d[fi])fi=i;if(sl<0||v>d[sl])sl=i});if(fi<0)fi=sl=0;
  const rows=STEPS.map((s,i)=>r.state[i]==='skip'?`<div class="sumrow" style="opacity:.55"><span>${s.icon}</span><div>${s.who.name} · ${T(s.name)}<div class="tr"></div></div><em>${L('bỏ qua','skipped')}</em></div>`:`<div class="sumrow"><span>${s.icon}</span><div>${s.who.name} · ${T(s.name)}<div class="tr"><i style="width:${Math.round(d[i]/mx*100)}%"></i></div></div><em>${fmt(d[i])}</em></div>`).join('');
  const p=$('sum').firstElementChild;
  p.innerHTML=`<button class="x" type="button" id="sumx" aria-label="${L('Đóng','Close')}">✕</button><h3>🎉 ${L('Quest hoàn thành!','Quest complete!')}</h3>
  <div style="font-weight:700">${r.q}</div><div style="color:var(--u-soft);font-size:12px">${L('Tổng thời gian','Total time')}: ${fmt(tot)} · ${L('Quest thứ ','Quest #')}${S.quests}</div>
  <div style="margin-top:8px">${rows}</div>
  ${r.usage?`<div class="quip" style="font-style:normal">${L('Dùng thật','Real usage')}: ${fmtUsage(r.usage)}</div>`:''}
  <div class="sumhi"><div>⚡ ${L('Nhanh nhất','Fastest')}<br><b>${STEPS[fi].who.name}</b> (${fmt(d[fi])})</div><div>🐢 ${L('Chậm nhất','Slowest')}<br><b>${STEPS[sl].who.name}</b> (${fmt(d[sl])})</div></div>
  ${got.length?`<div class="sumhi">${got.map(b=>`<div>${b.e} <b>${b.n}</b></div>`).join('')}</div>`:''}
  <div class="quip">${QUIPS[Math.floor(Math.random()*QUIPS.length)]}</div>
  <div class="row"><button class="pill" type="button" id="sumnew">✒️ ${L('Làm quest mới','New quest')}</button><button class="pill ghost" type="button" id="sumclose">${L('Đóng','Close')}</button></div>`;
  $('sum').classList.add('on');
  const close=()=>$('sum').classList.remove('on');
  $('sumx').onclick=$('sumclose').onclick=close;
  $('sumnew').onclick=()=>{close();$('pen').click()};
}

/* ---------- Stats / badges panel ---------- */
function showStats(){
  const p=$('stats').firstElementChild;
  p.innerHTML=`<button class="x" type="button" id="stx" aria-label="${L('Đóng','Close')}">✕</button><h3>🏆 ${L('Hồ sơ và huy hiệu','Stats and badges')}</h3>
  <div class="stgrid"><div><b>${S.quests}</b><span>${L('Quest xong','Quests done')}</span></div><div><b>🔥 ${S.streak}</b><span>${L('Chuỗi ngày','Day streak')}</span></div><div><b>${S.furn}</b><span>${L('Lần dùng đồ vật','Furniture uses')}</span></div>
  <div><b>${S.deny}</b><span>${L('Lần chốt chặn','Gates held')}</span></div><div><b>${S.inc}</b><span>${L('Sự cố đã xử lý','Incidents solved')}</span></div><div><b>${S.quests?fmt(S.ms/S.quests):'–'}</b><span>${L('TB mỗi quest','Avg per quest')}</span></div></div>
  <div class="badges">${BADGES.map(b=>`<div class="bdg ${S.b[b.id]?'on':''}"><div class="e">${b.e}</div><div><b>${b.n}</b><span>${b.d}</span></div></div>`).join('')}</div>
  <div style="margin-top:10px;font-size:11px;color:var(--u-soft)">${L('Dữ liệu chỉ lưu trên thiết bị này.','Data is stored on this device only.')}</div>`;
  $('stats').classList.add('on');$('stx').onclick=()=>$('stats').classList.remove('on');
}
$('trophy').onclick=showStats;
for(const id of['sum','stats','help'])$(id).addEventListener('click',e=>{if(e.target===$(id))$(id).classList.remove('on')});

/* ---------- Settings ---------- */
const settings=$('settings');
$('r-lang').append($('lang'));$('r-mus').append($('snd'));$('r-wx').append($('wx'));$('r-clk').append($('clock'));
$('vm').value=SND.vol.m;$('vs').value=SND.vol.s;
$('vm').oninput=e=>SND.setVol('m',+e.target.value);
$('vs').oninput=e=>SND.setVol('s',+e.target.value);
$('vs').onchange=()=>SND.play('pop');
const setPanel=on=>{settings.classList.toggle('on',on);$('roster').classList.toggle('shift',false)};
$('gear').onclick=e=>{e.stopPropagation();setPanel(!settings.classList.contains('on'))};
$('setx').onclick=()=>setPanel(false);
document.addEventListener('pointerdown',e=>{if(settings.classList.contains('on')&&!e.target.closest('#settings,#gear'))setPanel(false)},true);
let fs=+lsGet('fs','0'),rm=lsGet('rm',matchMedia('(prefers-reduced-motion: reduce)').matches?'1':'0')==='1';
const applyPrefs=()=>{document.body.classList.remove('fs1','fs2');if(fs)document.body.classList.add('fs'+fs);document.body.classList.toggle('rm',rm);
  document.querySelectorAll('#fsz button').forEach(b=>b.classList.toggle('on',+b.dataset.v===fs));$('rmsw').classList.toggle('on',rm);$('rmsw').setAttribute('aria-checked',rm)};
$('fsz').onclick=e=>{const b=e.target.closest('button');if(!b)return;fs=+b.dataset.v;lsSet('fs',fs);applyPrefs()};
$('rmsw').onclick=()=>{rm=!rm;lsSet('rm',rm?'1':'0');applyPrefs()};
applyPrefs();

/* ---------- Cat stat bars (lazy / alert / hungry) ---------- */
const cs={};
const hash=s=>[...s].reduce((a,c)=>(a*31+c.charCodeAt(0))%997,7);
['boss','claude',...STEPS.map(s=>s.id)].forEach(k=>{const h=hash(k);cs[k]={lazy:30+h%40,alert:40+(h*7)%45,hungry:20+(h*3)%40}});
const clamp=v=>Math.max(2,Math.min(100,v));
setInterval(()=>{const night=(phaseOverride||phaseOf(new Date().getHours()))==='night';
  for(const k in cs){const s=cs[k],work=(k==='boss'||k==='claude')?running:curStep===k;
    if(work){s.alert+=3;s.lazy-=3;s.hungry+=1.2}else{s.lazy+=1.2;s.alert-=1.2;s.hungry+=.7}
    if(night)s.alert-=1;s.lazy=clamp(s.lazy);s.alert=clamp(s.alert);s.hungry=clamp(s.hungry)}
  if(selected&&cs[selected])renderStats(selected)},4000);
function renderStats(k){
  const s=cs[k],box=$('pf-stats');if(!s||!box)return;
  const bar=(lbl,v,col)=>`<div class="bar"><b>${lbl}</b><div class="tr"><i style="width:${Math.round(v)}%;background:${col}"></i></div><em>${Math.round(v)}</em></div>`;
  box.innerHTML=bar('😴 '+L('Lười','Lazy'),s.lazy,'#8b7bd6')+bar('⚡ '+L('Tỉnh táo','Alert'),s.alert,'#2bb58a')+bar('🍗 '+L('Đói','Hungry'),s.hungry,'#e5486f');
}
// swipe the profile card down to close it
{let y0=null;const top=document.querySelector('#profile .top');top.style.touchAction='none';
  top.addEventListener('pointerdown',e=>{y0=e.clientY});
  addEventListener('pointerup',e=>{if(y0!==null&&e.clientY-y0>45)hideProfile();y0=null})}

/* ---------- Roster ---------- */
const roster=$('roster');
const CLAUDE_LOOK={body:'#ffd27a',outfit:'#ff8c42',acc:['pack']};
const RS=[...STEPS.map(s=>({k:s.id,look:s.cat})),{k:'boss',look:BOSS.cat},{k:'claude',look:CLAUDE_LOOK},{k:'sage'}];
RS.forEach(r=>{const b=document.createElement('button');b.type='button';b.dataset.k=r.k;b.dataset.n=r.k==='sage'?SAGE.name:nameOf(r.k);b.setAttribute('aria-label',b.dataset.n);
  b.innerHTML=r.look?`<svg viewBox="-42 -78 84 92">${catParts(r.look)}</svg>`:`<span class="em">🎓</span>`;
  b.onclick=()=>focusOn(r.k);roster.append(b)});
function focusOn(k){
  const el=k==='sage'?$('sage'):elOf(k);if(!el)return;
  hideHint();
  const [fx,fy]=CAM.frac(el);CAM.fly(fx,fy,Math.max(CAM.z,2.2));
  if(k==='sage'){el.dispatchEvent(new MouseEvent('click',{bubbles:false}))}else setTimeout(()=>showProfile(k),250);
}
setInterval(()=>roster.querySelectorAll('button').forEach(b=>b.classList.toggle('act',!!running&&b.dataset.k===curStep)),700);

/* ---------- Tutorial ---------- */
const tour=$('tour'),spot=tour.querySelector('.spot'),tip=tour.querySelector('.tip');
const TOUR=()=>[
  {sel:()=>$('pen'),t:L('Giao việc cho cả đội','Hand the team a request'),d:L('Bấm cây bút ✒️, gõ yêu cầu rồi ký tên gửi đi. Để trống thì game tự chọn một việc cho bạn.','Tap the ✒️ pen, type a request and sign it. Leave it blank and the game picks one for you.')},
  {sel:()=>$('b-title'),pad:[150,60],t:L('Xem quest chạy','Watch the quest run'),d:L('Bảng nhiệm vụ trên tường và thanh tiến độ ở trên cùng cho biết đang ở bước nào. Bạn có thể tạm dừng hoặc hủy bất cứ lúc nào.','The wall board and the progress bar on top show the current step. You can pause or cancel any time.')},
  {sel:()=>$('c-ba'),pad:[34,50],t:L('Làm quen với mèo','Meet the cats'),d:L('Bấm vào một chú mèo, nút ? hiện ra, bấm tiếp để xem hồ sơ. Dải avatar bên trái giúp bay thẳng tới từng bạn.','Tap a cat, then the ? to see their card. The avatar strip on the left flies you straight to anyone.')},
  {sel:()=>$('f-water'),pad:[40,50],t:L('Bấm đồ vật','Poke the furniture'),d:L('Bấm máy nước, tủ kem hay trụ cào: chú mèo rảnh gần nhất sẽ chạy tới dùng.','Tap the water cooler, the freezer or the scratching post: the nearest free cat runs over to use it.')},
  {sel:()=>$('gear'),t:L('Cài đặt và phím tắt','Settings and shortcuts'),d:L('Đổi ngôn ngữ, âm lượng, cỡ chữ ở đây. Trên máy tính, nhấn phím ? để xem phím tắt.','Language, volume and text size live here. On a computer, press ? for the shortcut list.')}];
let ti=0,tsteps=[];
function tourShow(){
  const s=tsteps[ti],el=s.sel(),sr=stage.getBoundingClientRect();
  if(!el||!el.getBoundingClientRect().width){ti++;return ti<tsteps.length?tourShow():tourEnd(true)}
  const r=el.getBoundingClientRect(),[px,py]=s.pad||[8,8];
  const L0=r.left-sr.left-px,T0=r.top-sr.top-py,W=r.width+px*2,H=r.height+py*2;
  Object.assign(spot.style,{left:L0+'px',top:T0+'px',width:W+'px',height:H+'px'});
  tip.querySelector('b').textContent=s.t;tip.querySelector('p').textContent=s.d;
  tip.querySelector('span').textContent=(ti+1)+' / '+tsteps.length;
  $('tskip').textContent=L('Bỏ qua','Skip');$('tnext').textContent=ti===tsteps.length-1?L('Xong','Done'):L('Tiếp','Next');
  const below=T0+H+12+130<sr.height;
  tip.style.top=(below?T0+H+12:Math.max(8,T0-12-tip.offsetHeight))+'px';
  tip.style.left=Math.max(10,Math.min(sr.width-tip.offsetWidth-10,L0+W/2-tip.offsetWidth/2))+'px';
}
function tourEnd(){tour.classList.remove('on');lsSet('tour','done')}
function tourStart(){tsteps=TOUR();ti=0;setPanel(false);if(CAM.z>1)CAM.reset();tour.classList.add('on');setTimeout(tourShow,CAM.z>1?700:0)}
$('tnext').onclick=()=>{if(++ti>=tsteps.length)tourEnd();else tourShow()};
$('tskip').onclick=tourEnd;
$('tourbtn').onclick=tourStart;
addEventListener('resize',()=>{if(tour.classList.contains('on'))tourShow()});
// the answer is kept in a cookie (localStorage as a fallback where cookies are unavailable, e.g. file://)
const ckGet=k=>{try{const m=document.cookie.match(new RegExp('(?:^|; )'+k+'=([^;]*)'));if(m)return decodeURIComponent(m[1])}catch(e){}return lsGet(k,'')};
const ckSet=(k,v)=>{try{document.cookie=k+'='+encodeURIComponent(v)+'; max-age=31536000; path=/; SameSite=Lax'}catch(e){}lsSet(k,v)};
function tourAnswer(yes){$('tourask').classList.remove('on');ckSet('tourpref',yes?'yes':'no');lsSet('tour','done');if(yes)tourStart()}
$('tayes').onclick=()=>tourAnswer(true);$('tano').onclick=()=>tourAnswer(false);
UI.maybeTour=()=>{
  if(/[?&]tour\b/.test(location.search))return void setTimeout(()=>{if(!running)tourStart()},900);
  if(ckGet('tourpref'))return;
  setTimeout(()=>{if(!running&&!ckGet('tourpref'))$('tourask').classList.add('on')},900)};
UI.toast=toast;

/* ---------- Contextual hints when idle ---------- */
let lastAct=performance.now(),hintsShown=0,hi=0;
['pointerdown','keydown'].forEach(n=>addEventListener(n,()=>lastAct=performance.now(),true));
const HINTS=()=>[L('Bấm cây bút ✒️ để giao việc cho cả đội.','Tap the ✒️ pen to hand the team a request.'),
  L('Thử bấm máy nước hoặc tủ kem ở tầng 1.','Try the water cooler or the freezer on floor 1.'),
  L('Hỏi Mr Biết Tuốt trên nóc thang máy nhé.','Ask Mr Know-It-All on the lift roof.'),
  L('Bấm vào một chú mèo để xem hồ sơ của bạn ấy.','Tap a cat to see their card.'),
  L('Mở ⚙️ để đổi ngôn ngữ, nhạc và cỡ chữ.','Open ⚙️ for language, music and text size.')];
setInterval(()=>{
  if(document.body.classList.contains('onmap')||running||hintsShown>=6||performance.now()-lastAct<25000||tour.classList.contains('on')||document.querySelector('.u2m.on,#settings.on,#profile:not([style*="none"])'))return;
  const h=HINTS();if(!matchMedia('(pointer:coarse)').matches)h.push(L('Nhấn phím ? để xem phím tắt.','Press ? for the shortcut list.'));
  toast(h[hi++%h.length],'💡','hint');hintsShown++;lastAct=performance.now()-10000;
},5000);

/* ---------- Keyboard shortcuts ---------- */
function showHelp(){
  const k=[['Space',L('Tạm dừng / tiếp tục quest','Pause / resume the quest')],['N',L('Viết yêu cầu mới','Write a new request')],['1 – 8',L('Bay tới mèo của bước 1 – 8','Fly to the cat of step 1 – 8')],['9 / 0',L('Bay tới Sếp / Claude','Fly to the boss / Claude')],
    ['M',L('Bật / tắt âm thanh','Sound on / off')],['L',L('Mở nhật ký','Open the log')],['S',L('Cài đặt','Settings')],['H',L('Về khung nhìn ban đầu','Reset the view')],['W',L('Bản đồ thế giới','World map')],['?',L('Bảng này','This list')],['Esc',L('Đóng mọi bảng','Close panels')]];
  $('help').firstElementChild.innerHTML=`<button class="x" type="button" id="hx" aria-label="${L('Đóng','Close')}">✕</button><h3>⌨️ ${L('Phím tắt','Shortcuts')}</h3><div class="keys">${k.map(([a,b])=>`<kbd>${a}</kbd><span>${b}</span>`).join('')}</div>`;
  $('help').classList.add('on');$('hx').onclick=()=>$('help').classList.remove('on');
}
$('keysbtn').onclick=()=>{setPanel(false);showHelp()};
function closeAll(){setPanel(false);['sum','stats','help','tourask'].forEach(i=>$(i).classList.remove('on'));if(tour.classList.contains('on'))tourEnd();$('logpop').classList.remove('open');hideProfile();hideHint()}
addEventListener('keydown',e=>{
  if(e.ctrlKey||e.metaKey||e.altKey)return;
  const t=e.target,typing=t&&(/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)||t.isContentEditable);
  if(e.key==='Escape'){closeAll();return}
  if(document.body.classList.contains('onmap')||typing||tour.classList.contains('on')||document.querySelector('.u2m.on'))return;
  const k=e.key;
  if(k===' '&&!(t&&t.tagName==='BUTTON')){if(run){e.preventDefault();$('hpause').click()}return}
  if(k==='?'){showHelp();return}
  const ci=/^[1-8]$/.test(k)?+k-1:-1;
  if(ci>=0)focusOn(STEPS[ci].id);
  else if(k==='9')focusOn('boss');else if(k==='0')focusOn('claude');
  else if(/^[nN]$/.test(k)){if(!$('pen').disabled)$('pen').click()}
  else if(/^[mM]$/.test(k))$('snd').click();
  else if(/^[lL]$/.test(k))$('logbtn').click();
  else if(/^[sS]$/.test(k))$('gear').click();
  else if(/^[hH]$/.test(k))CAM.reset();
  else if(/^[wW]$/.test(k))$('mapbtn').click();
});

/* ---------- Night theme for the panels follows the in-game time ---------- */
const nightSync=()=>document.body.classList.toggle('night',(phaseOverride||phaseOf(new Date().getHours()))==='night');
nightSync();setInterval(nightSync,4000);
})();

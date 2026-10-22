/* Live mode: drive the game from the local Cat Office server instead of the built-in simulation.
   It only switches on when the page carries a token (#token=...) and the same origin answers /health, so on GitHub Pages
   (no server, no token) this file does nothing and the game stays a harmless mock. The token is kept in sessionStorage. */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const ss={get:k=>{try{return sessionStorage.getItem(k)}catch(e){return null}},set:(k,v)=>{try{sessionStorage.setItem(k,v)}catch(e){}}};

// take the token from the URL hash once, then remove it from the address bar
const m=/[#&]token=([A-Za-z0-9_-]{16,})/.exec(location.hash);
if(m){ss.set('liveToken',m[1]);try{history.replaceState(null,'',location.pathname+location.search)}catch(e){}}
const TOKEN=ss.get('liveToken');
if(!TOKEN||/[?&]mock=1\b/.test(location.search))return;

const api=(path,opts={})=>fetch(path,{...opts,headers:{'content-type':'application/json',authorization:'Bearer '+TOKEN,...(opts.headers||{})}});
const toast=(t,i,k)=>{try{UI.toast(t,i,k)}catch(e){}};

/* ---------- connection ---------- */
let ws=null,backoff=600,online=false,live=false;
const statusEl=document.createElement('span');
function setStatus(s){
  document.body.classList.toggle('live',live);document.body.classList.toggle('retry',s==='retry');
  statusEl.textContent=s==='live'?L('● Đang kết nối máy chủ cục bộ','● Connected to the local server'):s==='retry'?L('◌ Mất kết nối, đang nối lại…','◌ Connection lost, retrying…'):L('Chế độ mô phỏng (trong trình duyệt)','Simulation mode (in the browser)');
}
function connect(){
  const url=(location.protocol==='https:'?'wss://':'ws://')+location.host+'/events';
  ws=new WebSocket(url,['bearer.'+TOKEN]);
  ws.onopen=()=>{online=true;backoff=600;setStatus('live')};
  ws.onmessage=e=>{try{onEvent(JSON.parse(e.data))}catch(err){console.error(err)}};
  ws.onclose=()=>{const was=online;online=false;setStatus('retry');if(was&&running)toast(L('Mất kết nối với máy chủ, đang nối lại…','Lost the server connection, reconnecting…'),'🔌','bad');setTimeout(connect,backoff);backoff=Math.min(backoff*2,8000)};
  ws.onerror=()=>{};
}

/* ---------- events ---------- */
const seen={};            // highest seq handled per quest, so a reconnect that replays history does not repeat anything
const queue=[];let consuming=false,cur=null;
function onEvent(ev){
  if(ev.seq!==undefined){if((seen[ev.questId]||0)>=ev.seq)return;seen[ev.questId]=ev.seq}
  // permission gates are shown at once, not after the cat animations
  if(ev.type==='gate')return void showGate(ev);
  if(ev.type==='gate_result')return void gateResult(ev);
  queue.push(ev);if(!consuming)consume();
}
async function consume(){
  consuming=true;
  try{while(queue.length){const ev=queue.shift();try{await handle(ev)}catch(err){console.error('live event failed',ev,err)}}}
  finally{consuming=false}
}

const idx=step=>step-1;
let clockOff=0;   // server and browser share a machine, so server timestamps map straight onto performance.now()
const perf=at=>at+clockOff;
async function handle(ev){
  switch(ev.type){
    case'begin':return begin(ev);
    case'start':{
      if(!cur)return;const i=idx(ev.step),st=STEPS[i];if(!st)return;
      if(flOf(i)!==courier.fl){const p=Math.max(0,i-1);await goto(flOf(p),spotOf(p)[0]+.6,spotOf(p)[1]);await goto(flOf(i),spotOf(i)[0]+.6,spotOf(i)[1])}
      await takeDesk(cats[st.id]);
      curStep=st.id;sayCat(st.say,st.id);mark(st.id,'active',true);board(st.id,'active');log(st.log);refreshStatus();UIEV('start',i,perf(ev.at));
      cur.open=i;return}
    case'done':{
      if(!cur)return;const i=idx(ev.step),st=STEPS[i];if(!st)return;
      mark(st.id,'active',false);mark(st.id,'bug',false);mark(st.id,'done',true);board(st.id,'done');SND.play('ding');UIEV('done',i,perf(ev.at));
      if(['git','ops','qa'].includes(st.id)){
        $('phone').classList.add('ping');$('logbtn').classList.add('ping');await sleep(900);$('phone').classList.remove('ping');$('logbtn').classList.remove('ping');
        log(T('📱 Phone: {0} finished',T(st.name)),'ok')}
      await handoff(i);if(cur)cur.open=-1;return}
    case'skip':{const i=idx(ev.step),st=STEPS[i];if(!st||!cur)return;board(st.id,'todo');$('b-'+st.id).textContent='➖ '+(i+1)+' '+T(st.name);UIEV('skip',i);return}
    case'incident':{
      const i=cur&&cur.open>=0?cur.open:-1;log('💥 '+ev.message,'warn');toast(L('Sự cố: ','Incident: ')+ev.kind,'💥','bad');
      if(i>=0){const st=STEPS[i];mark(st.id,'bug',true);setTimeout(()=>mark(st.id,'bug',false),2800)}return}
    case'log':{
      log(ev.text,ev.level==='bad'?'bad':ev.level==='warn'?'warn':'');
      if(ev.level==='info'&&cur&&cur.open>=0&&STEPS[cur.open])sayCat(ev.text.length>70?ev.text.slice(0,67)+'…':ev.text,STEPS[cur.open].id);return}
    case'usage':UIEV('usage',ev.tokensIn,ev.tokensOut,ev.costUsd);if(cur)cur.usage=ev;return;
    case'end':return end(ev);
  }
}

async function begin(ev){
  if(cur||running)return;
  clockOff=performance.now()-Date.now();
  cur={id:ev.questId,open:-1,title:ev.title};
  running=true;UIEV('begin',ev.title);$('go').disabled=$('pen').disabled=true;$('reqin').disabled=true;hideSay();
  recall=true;if(wanderTask)await wanderTask;
  Object.values(cats).forEach(c=>c.recall=true);await Promise.all(Object.values(cats).map(c=>c.task));
  STEPS.forEach(s=>['active','bug','done','cheer'].forEach(c=>mark(s.id,c,false)));
  await Promise.all(Object.values(cats).map(leaveDesk));
  boardReset(ev.title);sayBoss(T('New quest: {0}',ev.title));await sleep(1500);hideSay();
}

async function end(ev){
  if(!cur)return;
  const ok=ev.status==='done',q=cur;
  hideCard();curStep=null;refreshStatus();hideSay();
  if(ok){
    SND.play('fanfare');log('Quest complete!','ok');sayBoss('Great work, team!');UIEV('complete',q.title);
    STEPS.forEach(s=>mark(s.id,'cheer',true));await sleep(2200);STEPS.forEach(s=>mark(s.id,'cheer',false));hideSay();
    await Promise.all(Object.values(cats).map(takeDesk));await catBreak();
  }else{
    const why=ev.reason||(ev.status==='cancelled'?L('đã bị hủy','cancelled'):L('thất bại','failed'));
    log((ev.status==='cancelled'?'Quest cancelled: ':'Quest failed: ')+why,ev.status==='cancelled'?'warn':'bad');
    toast((ev.status==='cancelled'?L('Quest bị hủy: ','Quest cancelled: '):L('Quest thất bại: ','Quest failed: '))+why,ev.status==='cancelled'?'🛑':'⚠️',ev.status==='cancelled'?'':'bad');
    STEPS.forEach(s=>{['active','bug','cheer'].forEach(c=>mark(s.id,c,false))});
    UIEV(ev.status==='cancelled'&&/human said no/.test(why)?'deny':'cancel',0);
  }
  cur=null;await finish();
}

/* ---------- permission gates: the card shows the real command ---------- */
const GATE_TITLE={push:['Cho phép push lên nhánh này?','Allow this push?'],mr:['Cho phép tạo Merge Request?','Allow this merge request?'],deploy:['Cho phép deploy?','Allow this deploy?'],install:['Cho phép cài package?','Allow installing packages?']};
let gateTimer=0,gateId='';
function showGate(ev){
  clearInterval(gateTimer);gateId=ev.gateId;
  const c=$('card');c.innerHTML='';c.className='gate';c.style.display='block';
  const t=GATE_TITLE[ev.kind]||['Cho phép thao tác này?','Allow this action?'];
  const h=document.createElement('h3');h.textContent='🔐 '+L(t[0],t[1]);
  const p=document.createElement('p');p.textContent=ev.summary;
  const pre=document.createElement('pre');pre.className='cmd';pre.textContent=ev.command;
  const box=document.createElement('div');box.className='opts';
  const btn=(cls,txt,allow)=>{const b=document.createElement('button');b.className=cls;b.textContent=txt;
    b.onclick=async()=>{box.querySelectorAll('button').forEach(x=>x.disabled=true);
      try{const r=await api('/gates/'+ev.gateId,{method:'POST',body:JSON.stringify({allow})});if(!r.ok&&r.status!==410)throw new Error(r.status)}
      catch(e){toast(L('Không gửi được câu trả lời, thử lại.','Could not send the answer, try again.'),'⚠️','bad');box.querySelectorAll('button').forEach(x=>x.disabled=false)}};
    return b};
  box.append(btn('allow','✅ '+L('Cho phép','Allow'),true),btn('deny','✋ '+L('Từ chối','Deny'),false));
  const cd=document.createElement('div');cd.className='cd';cd.innerHTML='<i></i><span></span>';
  c.append(h,p,pre,box,cd);
  const total=Math.max(1000,ev.expiresAt-Date.now());cd.querySelector('i').style.animationDuration=total+'ms';
  const tick=()=>{const left=Math.max(0,Math.ceil((ev.expiresAt-Date.now())/1000));cd.querySelector('span').textContent=L(`Tự động từ chối sau ${left} giây (mặc định an toàn)`,`Auto-deny in ${left}s (the safe default)`);if(left<=0)clearInterval(gateTimer)};
  tick();gateTimer=setInterval(tick,500);
  SND.play('bonk');sayBoss('Hmm… may they go ahead?');
}
function gateResult(ev){
  if(ev.gateId!==gateId)return;clearInterval(gateTimer);gateId='';hideCard();
  log((ev.allow?'✔ ':'✘ ')+(ev.allow?L('Đã cho phép','Approved'):ev.reason==='timeout'?L('Hết giờ, tự động từ chối','Timed out, auto-denied'):L('Đã từ chối','Denied')),ev.allow?'ok':'warn');
}

/* ---------- starting, pausing, cancelling ---------- */
const go=$('go');
go.onclick=async()=>{
  const typed=$('reqin').value.trim().replace(/\s*\n+\s*/g,' · ');
  if(!typed){toast(L('Hãy nhập yêu cầu thật (chế độ này không tự chọn việc).','Type a real request (this mode does not pick one for you).'),'✍️');setTimeout(()=>{try{openDecree()}catch(e){}},100);return}
  $('reqin').value='';
  log(T('New quest: {0} — signed and stamped by Miss Big Na ✒️',typed));
  go.disabled=true;
  try{
    const r=await api('/quests',{method:'POST',body:JSON.stringify({prompt:typed})});
    const j=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(j.error||('HTTP '+r.status));
  }catch(e){toast(L('Không bắt đầu được quest: ','Could not start the quest: ')+e.message,'⚠️','bad');go.disabled=false}
};
function questId(){return cur&&cur.id}
UI.live={
  pause:p=>{const id=questId();if(id)api(`/quests/${id}/${p?'pause':'resume'}`,{method:'POST',body:'{}'}).catch(()=>{})},
  cancel:()=>{const id=questId();if(id)api(`/quests/${id}/cancel`,{method:'POST',body:'{}'}).catch(()=>{toast(L('Không gửi được lệnh hủy.','Could not send the cancel.'),'⚠️','bad')})}
};

/* ---------- start ---------- */
fetch('/health').then(r=>r.ok?r.json():Promise.reject()).then(j=>{
  if(!j||j.ok!==true)return;live=true;
  // settings row that shows which mode is active
  const row=document.createElement('div');row.className='srow';row.innerHTML='<span class="lb">🔌 '+L('Kết nối','Connection')+'</span>';
  statusEl.style.cssText='font-size:12px;font-weight:700;flex:1.4;text-align:right';row.append(statusEl);
  const anchor=$('r-clk');anchor&&anchor.after(row);
  setStatus('retry');connect();
  toast(L('Đã nối với máy chủ cục bộ: quest sẽ chạy thật.','Connected to the local server: quests run for real.'),'🔌','ok');
}).catch(()=>{});
})();

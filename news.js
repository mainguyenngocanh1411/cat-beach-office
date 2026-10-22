/* Monitoring Lighthouse news hub. One boat per source; click a boat to read its latest posts.
   Sources: Hacker News (public API, CORS ok), RSS/Atom feeds, and Anthropic's research page (scraped, it has no feed).
   Blogs rarely allow cross-origin reads, so non-HN sources go through a proxy: your own (worker/news-proxy.js, set it in the
   panel) or, if none is set, a public CORS relay as a best-effort fallback. */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const lsGet=(k,d)=>{try{const v=localStorage.getItem(k);return v===null?d:v}catch(e){return d}};
const lsSet=(k,v)=>{try{localStorage.setItem(k,v)}catch(e){}};
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const stage=$('stage');
const SOURCES=[
  {id:'hn',name:'Hacker News',e:'🟧',type:'hn',url:'https://news.ycombinator.com/'},
  {id:'calif',name:'Calif',e:'⛵',type:'rss',url:'https://calif.io/',feed:'https://calif.io/rss/'},
  {id:'anthropic',name:'Anthropic Research',e:'🚢',type:'anthropic',url:'https://www.anthropic.com/research'}
];
const FALLBACK='https://api.allorigins.win/raw?url=';
const MAX=20;
const getCustom=()=>{try{return JSON.parse(lsGet('nhCustom','[]'))}catch(e){return []}};
const all=()=>[...SOURCES,...getCustom()];
const seen=()=>{try{return JSON.parse(lsGet('nhSeen','{}'))}catch(e){return {}}};
const cache={};   // id -> {items, err, at}
let sel=null,busy=false,tmr=null;

stage.insertAdjacentHTML('beforeend',`<div id="newshub" class="ui2" role="dialog" aria-label="News hub">
  <svg class="nh-sky" id="nh-sky" viewBox="0 0 1000 700" preserveAspectRatio="xMidYMid slice"></svg>
  <div class="nh-top"><h2>🗼 <span id="nh-ttl"></span></h2><button type="button" id="nh-ref"></button><button type="button" id="nh-x" aria-label="Close">✕</button></div>
  <div class="nh-cat" id="nh-say"></div>
  <div class="nh-boats" id="nh-boats"></div>
  <div id="nh-panel"></div>
</div>`);

function scene(){
  const stars=Array.from({length:40},(_,i)=>`<circle class="nh-star" cx="${(i*263)%1000}" cy="${(i*97)%330}" r="${i%5?1.2:2}" fill="#fff" style="animation-delay:${-(i%7)*.4}s"/>`).join('');
  $('nh-sky').innerHTML=`${stars}
   <circle cx="880" cy="90" r="34" fill="#fff6c8"/><circle cx="868" cy="82" r="30" fill="#0f2147" opacity=".12"/>
   <rect y="470" width="1000" height="230" fill="#14587a"/>
   ${[0,1,2,3,4,5,6,7].map(i=>`<path d="M${i*140-30} ${520+(i%3)*50} q20 -10 40 0 t40 0" stroke="#fff" stroke-opacity=".25" fill="none" stroke-width="3"/>`).join('')}
   <g class="nh-beam"><path d="M150 190 L1100 20 L1100 360Z" fill="#fff7b0" opacity=".16"/></g>
   <path d="M20 700 Q60 520 150 470 Q250 520 300 700Z" fill="#35465c"/>
   <g transform="translate(150 470)"><path d="M-26 0 L-17 -250 L17 -250 L26 0Z" fill="#f4f1ea"/><path d="M-23 -60 L-21 -110 L21 -110 L23 -60Z M-19 -150 L-18 -200 L18 -200 L19 -150Z" fill="#e5486f"/>
   <rect x="-24" y="-282" width="48" height="32" fill="#2a3550"/><circle cx="0" cy="-266" r="12" fill="#fff7b0"/><path d="M-30 -282 L0 -312 L30 -282Z" fill="#e5486f"/></g>`;
}

const rel=t=>{if(!t)return '';const d=(Date.now()-t)/6e4;
  if(d<1)return L('vừa xong','just now');if(d<60)return Math.round(d)+L(' phút trước','m ago');
  if(d<1440)return Math.round(d/60)+L(' giờ trước','h ago');if(d<43200)return Math.round(d/1440)+L(' ngày trước','d ago');
  return new Date(t).toLocaleDateString()};
const proxyUrl=()=>lsGet('nhProxy','').trim();
async function fetchText(u){
  const p=proxyUrl();
  const tries=[];
  if(p)tries.push(p+(p.includes('?')?'':'?url=')+encodeURIComponent(u));
  else tries.push(u,FALLBACK+encodeURIComponent(u));
  let err;
  for(const t of tries){
    try{const c=new AbortController(),to=setTimeout(()=>c.abort(),12000);
      const r=await fetch(t,{signal:c.signal});clearTimeout(to);
      if(!r.ok)throw new Error('HTTP '+r.status);
      const x=await r.text();if(x.length<50)throw new Error('empty');return x}
    catch(e){err=e}
  }
  throw err||new Error('fetch failed');
}
const doc=(x,type='text/html')=>new DOMParser().parseFromString(x,type);
const txt=(el,sel)=>{const n=el.querySelector(sel);return n?n.textContent.trim():''};
function parseFeed(x,base){
  const d=doc(x,'text/xml');if(d.querySelector('parsererror'))throw new Error('bad feed');
  const nodes=[...d.querySelectorAll('item'),...d.querySelectorAll('entry')];
  return nodes.slice(0,MAX).map(n=>{
    const l=n.querySelector('link'),href=l?(l.getAttribute('href')||l.textContent.trim()):'';
    const dt=txt(n,'pubDate')||txt(n,'published')||txt(n,'updated')||txt(n,'date');
    const sum=txt(n,'description')||txt(n,'summary')||txt(n,'content');
    const t=Date.parse(dt);
    return {id:txt(n,'guid')||txt(n,'id')||href,title:txt(n,'title'),url:new URL(href,base).href,t:isNaN(t)?0:t,desc:doc(sum).body.textContent.replace(/\s+/g,' ').trim().slice(0,200)}
  }).filter(i=>i.title&&i.url);
}
function parseAnthropic(x,base){
  const d=doc(x),out=[],used=new Set();
  d.querySelectorAll('article').forEach(a=>{
    const l=[...a.querySelectorAll('a[href^="/research/"]')].find(k=>k.textContent.trim()&&!k.getAttribute('href').startsWith('/research/team'));
    if(!l)return;const href=new URL(l.getAttribute('href'),base).href;if(used.has(href))return;used.add(href);
    const tm=a.querySelector('time'),t=tm?Date.parse(tm.textContent.trim()):NaN,p=a.querySelector('p');
    out.push({id:href,title:l.textContent.trim(),url:href,t:isNaN(t)?0:t,desc:p?p.textContent.trim().slice(0,200):''});
  });
  if(!out.length)throw new Error('layout changed');
  return out.sort((a,b)=>b.t-a.t).slice(0,MAX);
}
async function fetchHN(){
  const j=u=>fetch(u).then(r=>{if(!r.ok)throw new Error('HTTP '+r.status);return r.json()});
  const ids=(await j('https://hacker-news.firebaseio.com/v0/topstories.json')).slice(0,MAX);
  const its=await Promise.all(ids.map(i=>j(`https://hacker-news.firebaseio.com/v0/item/${i}.json`).catch(()=>null)));
  return its.filter(i=>i&&i.title).map(i=>({id:'hn'+i.id,title:i.title,url:i.url||`https://news.ycombinator.com/item?id=${i.id}`,t:i.time*1000,desc:`▲ ${i.score||0} · 💬 ${i.descendants||0}`,hnid:i.id}));
}
async function load(s){
  try{
    let items;
    if(s.type==='hn')items=await fetchHN();
    else if(s.type==='anthropic')items=parseAnthropic(await fetchText(s.url),s.url);
    else items=parseFeed(await fetchText(s.feed||s.url),s.url);
    cache[s.id]={items,at:Date.now()};
  }catch(e){cache[s.id]={items:(cache[s.id]||{}).items||[],err:e.message||String(e),at:Date.now()}}
}
const unread=s=>{const c=cache[s.id];if(!c||!c.items.length)return 0;const sn=(seen()[s.id]||[]);return c.items.filter(i=>!sn.includes(i.id)).length};

function boats(){
  const src=all(),el=$('nh-boats');
  el.innerHTML=src.map((s,k)=>{
    const x=(k+.5)/src.length*68+26,y=40+(k%3)*25,u=unread(s),c=cache[s.id];
    return `<button type="button" class="nh-boat${u?' new':''}${s.id===sel?' sel':''}${c&&c.err&&!c.items.length?' err':''}" data-id="${esc(s.id)}" style="left:${x.toFixed(1)}%;top:${y}%" aria-label="${esc(s.name)}"><span class="dot">${u>99?'99+':u}</span><span class="hull">${esc(s.e||'⛵')}</span><span class="nm">${esc(s.name)}</span></button>`}).join('');
}
function panel(){
  const p=$('nh-panel'),src=all(),s=src.find(k=>k.id===sel);
  let body;
  if(!s)body=`<div class="msg">${L('Bấm vào một con tàu để đọc tin mới nhất của nguồn đó.','Tap a boat to read the latest posts from that source.')}</div>`;
  else{
    const c=cache[s.id];
    if(!c)body=`<div class="msg">${L('Đang tải…','Loading…')}</div>`;
    else{
      const sn=seen()[s.id]||[];
      body=(c.err?`<div class="msg">⚠️ ${esc(c.err)}<br>${L('Không tải được. Nếu là blog, hãy đặt proxy của bạn bên dưới (xem worker/news-proxy.js).','Could not load. For blogs, set your own proxy below (see worker/news-proxy.js).')}</div>`:'')
        +c.items.map(i=>`<a class="it${sn.includes(i.id)?'':' unread'}" href="${esc(i.url)}" target="_blank" rel="noopener noreferrer" data-i="${esc(i.id)}"><div class="t">${esc(i.title)}</div><div class="m">${esc(rel(i.t))}</div>${i.desc?`<div class="d">${esc(i.desc)}</div>`:''}</a>`).join('');
    }
  }
  p.innerHTML=`<h3>${s?esc((s.e||'')+' '+s.name):L('Trung tâm tin','News hub')}</h3>
   <div class="sub">${s?`<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer" style="color:inherit">${esc(s.url)}</a>`:L('Hacker News, Calif, Anthropic Research và nguồn bạn thêm','Hacker News, Calif, Anthropic Research and sources you add')}</div>
   <div id="nh-list">${body}</div>
   <form class="nh-add" id="nh-form"><input id="nh-url" type="url" placeholder="${L('Thêm blog / Substack (URL)','Add a blog / Substack (URL)')}" aria-label="URL"><button type="submit">＋</button></form>
   <div class="nh-set">${L('Proxy','Proxy')}: <a id="nh-pset">${esc(proxyUrl()||L('chưa đặt (dùng relay công cộng)','not set (using public relay)'))}</a>${s&&getCustom().some(k=>k.id===s.id)?` · <a id="nh-del">${L('xoá nguồn này','remove this source')}</a>`:''}</div>`;
}
function say(){
  const n=all().reduce((a,s)=>a+unread(s),0);
  $('nh-say').textContent=n?L(`Có ${n} tin mới chưa đọc! Bấm vào tàu nhé.`,`${n} unread posts! Tap a boat.`):L('Đêm yên biển lặng, chưa có tin mới.','Calm sea, nothing new.');
}
function render(){$('nh-ttl').textContent=L('Hải Đăng Giám Sát','Monitoring Lighthouse');$('nh-ref').textContent='⟳ '+L('Làm mới','Refresh');boats();panel();say()}
function markSeen(s){const c=cache[s.id];if(!c)return;const o=seen();o[s.id]=[...new Set([...(o[s.id]||[]),...c.items.map(i=>i.id)])].slice(-300);lsSet('nhSeen',JSON.stringify(o))}
async function refresh(){
  if(busy)return;busy=true;$('nh-ref').disabled=true;
  await Promise.all(all().map(load));
  busy=false;$('nh-ref').disabled=false;render();
}
function open(){
  scene();$('newshub').classList.add('on');
  if(!sel)sel=all()[0].id;render();refresh();
  clearInterval(tmr);tmr=setInterval(()=>{if($('newshub').classList.contains('on'))refresh()},600000);
}
function close(){const s=all().find(k=>k.id===sel);if(s)markSeen(s);$('newshub').classList.remove('on');clearInterval(tmr)}

$('nh-x').onclick=close;$('nh-ref').onclick=refresh;
addEventListener('keydown',e=>{if(e.key==='Escape'&&$('newshub').classList.contains('on'))close()});
$('nh-boats').addEventListener('click',e=>{const b=e.target.closest('.nh-boat');if(!b)return;
  const prev=all().find(k=>k.id===sel);if(prev)markSeen(prev);sel=b.dataset.id;render()});
$('nh-panel').addEventListener('click',e=>{
  if(e.target.closest('#nh-pset')){const v=prompt(L('URL proxy của bạn (vd https://news.xxx.workers.dev). Để trống = dùng relay công cộng.','Your proxy URL (e.g. https://news.xxx.workers.dev). Empty = public relay.'),proxyUrl());
    if(v!==null){lsSet('nhProxy',v.trim());refresh()}return}
  if(e.target.closest('#nh-del')){lsSet('nhCustom',JSON.stringify(getCustom().filter(k=>k.id!==sel)));sel=all()[0].id;render();return}
});
$('nh-panel').addEventListener('submit',e=>{
  e.preventDefault();let u=$('nh-url').value.trim();if(!u)return;
  try{u=new URL(/^https?:/.test(u)?u:'https://'+u)}catch(x){return}
  const host=u.hostname.replace(/^www\./,''),sub=/\.substack\.com$/.test(host);
  const s={id:'c'+Date.now().toString(36),name:host.replace(/\.substack\.com$/,''),e:sub?'📰':'⛵',type:'rss',url:u.href,feed:/\/(feed|rss|atom)|\.xml$/.test(u.pathname)?u.href:new URL(sub?'/feed':'/rss/',u.origin).href};
  lsSet('nhCustom',JSON.stringify([...getCustom(),s]));sel=s.id;render();load(s).then(render);
});
window.NewsHub={open,close};
})();

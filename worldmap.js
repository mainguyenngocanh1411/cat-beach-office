/* World map: a level-select screen. The first region is the coastal office (the game itself); the others unlock by finishing quests
   and are teasers for later. Progress is read from the stats saved by ui2.js (localStorage 'stats'). */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const lsGet=(k,d)=>{try{const v=localStorage.getItem(k);return v===null?d:v}catch(e){return d}};
const lsSet=(k,v)=>{try{localStorage.setItem(k,v)}catch(e){}};
const stage=$('stage');
const stats=()=>{try{return JSON.parse(lsGet('stats','{}'))}catch(e){return {}}};

const NODES=[
  {id:'coastal',x:340,y:850,e:'🏖️',req:0,play:true,
   n:L('Văn phòng ven biển','Coastal Office'),d:L('Nơi mọi quest bắt đầu: 8 chú mèo, 1 quy trình Quest và một chiếc thang máy có cụ mèo ngủ trên nóc.','Where every quest begins: 8 cats, one Quest flow and a lift with a sleepy old cat on its roof.')},
  {id:'jungle',x:235,y:735,e:'🌴',req:3,n:L('Rừng Mã Nguồn','Source Jungle'),d:L('Mê cung nhánh git rậm rạp. Nhớ mang theo worktree riêng, kẻo lạc.','A thick maze of git branches. Bring your own worktree or get lost.')},
  {id:'pyramid',x:390,y:640,e:'🔺',req:6,n:L('Kim Tự Tháp Pipeline','Pipeline Pyramid'),d:L('Mỗi tầng là một job CI. Đừng làm đỏ viên gạch nào.','Every level is a CI job. Do not turn a single brick red.')},
  {id:'ruins',x:575,y:735,e:'🏛️',req:10,n:L('Phế Tích Tài Liệu','Docs Ruins'),d:L('Tài liệu cổ chưa ai cập nhật suốt ba kỷ nguyên. Docsy đang nhìn bạn.','Ancient docs nobody has updated in three eras. Docsy is watching you.')},
  {id:'volcano',x:690,y:575,e:'🌋',req:15,n:L('Núi Lửa Sự Cố','Incident Volcano'),d:L('OOM, 429, 502… phun trào bất cứ lúc nào. Mang theo áo chống cháy.','OOM, 429, 502… erupting at any time. Bring a fireproof coat.')},
  {id:'light',x:285,y:470,e:'🗼',req:0,hub:true,n:L('Hải Đăng Giám Sát','Monitoring Lighthouse'),d:L('Trung tâm tin tức: theo dõi Hacker News, Calif, Anthropic Research và các blog bạn thêm.','News hub: follow Hacker News, Calif, Anthropic Research and any blog you add.')},
  {id:'moai',x:690,y:300,e:'🗿',req:25,n:L('Đảo Tượng Review','Review Isle'),d:L('Những pho tượng đá đọc từng dòng diff, hai lần, kèm kính lúp.','Stone statues reading every diff, twice, with a magnifying glass.')}];

/* ---------- artwork ---------- */
const palm=(x,y,s=1)=>`<g transform="translate(${x} ${y}) scale(${s})"><ellipse cx="3" cy="2" rx="14" ry="4" fill="#2b7a3a" opacity=".3"/><g class="wm-sway" style="animation-delay:${-((x*7+y*3)%30)/10}s"><path d="M0 0 Q5 -18 1 -36" stroke="#8a5a2b" stroke-width="4.5" fill="none" stroke-linecap="round"/><g fill="#2fa04f"><path d="M1 -36 Q-22 -46 -32 -26 Q-14 -36 1 -36Z"/><path d="M1 -36 Q22 -48 34 -28 Q14 -38 1 -36Z"/><path d="M1 -36 Q-10 -56 -26 -52 Q-8 -46 1 -36Z"/><path d="M1 -36 Q12 -58 28 -52 Q10 -46 1 -36Z"/><path d="M1 -36 Q0 -50 2 -60 Q8 -48 1 -36Z" fill="#3cb85f"/></g></g></g>`;
const pine=(x,y,s=1)=>`<g transform="translate(${x} ${y}) scale(${s})"><ellipse cx="2" cy="2" rx="12" ry="3.5" fill="#2b7a3a" opacity=".3"/><rect x="-2.5" y="-8" width="5" height="10" fill="#7a4e26"/><path d="M0 -50 L-15 -18 L15 -18Z" fill="#2c8f4b"/><path d="M0 -38 L-18 -6 L18 -6Z" fill="#35a357"/></g>`;
const bush=(x,y,s=1)=>`<g transform="translate(${x} ${y}) scale(${s})"><ellipse cx="0" cy="2" rx="16" ry="4" fill="#2b7a3a" opacity=".25"/><circle cx="-8" cy="-4" r="9" fill="#3cb85f"/><circle cx="6" cy="-6" r="10" fill="#46c96a"/><circle cx="0" cy="-10" r="8" fill="#52d575"/></g>`;
const mount=(x,y,s=1,snow=true)=>`<g transform="translate(${x} ${y}) scale(${s})"><ellipse cx="0" cy="3" rx="46" ry="8" fill="#2b7a3a" opacity=".25"/><path d="M-44 0 L-6 -78 L12 -50 L24 -66 L50 0Z" fill="#8d96a3"/><path d="M-6 -78 L12 -50 L-2 0 L-44 0Z" fill="#a4adb9"/>${snow?'<path d="M-6 -78 L-17 -56 L-8 -60 L-2 -52 L6 -62 L12 -50Z" fill="#fff"/><path d="M24 -66 L16 -52 L24 -55 L31 -50Z" fill="#fff"/>':''}</g>`;
const cactus=(x,y,s=1)=>`<g transform="translate(${x} ${y}) scale(${s})"><rect x="-4" y="-26" width="8" height="28" rx="4" fill="#3d9b5a"/><path d="M-4 -12 H-12 V-20" stroke="#3d9b5a" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 -8 H11 V-17" stroke="#3d9b5a" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>`;
const cloud=(x,y,s=1)=>`<g transform="translate(${x} ${y}) scale(${s})" fill="#fff"><ellipse cx="0" cy="8" rx="70" ry="22"/><circle cx="-36" cy="-4" r="26"/><circle cx="0" cy="-16" r="34"/><circle cx="38" cy="-2" r="26"/></g>`;
const rock=(x,y,s=1,c='#8d96a3')=>`<g transform="translate(${x} ${y}) scale(${s})"><ellipse cx="0" cy="6" rx="40" ry="9" fill="#1f7d99" opacity=".35"/><path d="M-36 4 L-26 -22 L-6 -34 L18 -26 L36 4Z" fill="${c}"/><path d="M-6 -34 L18 -26 L36 4 L4 4Z" fill="#a7b0bb"/><path d="M-26 -22 L-14 -28 L-22 -8Z" fill="#fff" opacity=".35"/></g>`;
const pyramid=(x,y)=>`<g transform="translate(${x} ${y})"><ellipse cx="0" cy="6" rx="86" ry="14" fill="#2b7a3a" opacity=".3"/>`
  +[[84,28,0],[66,26,-26],[48,26,-52],[30,24,-78]].map(([w,h,dy],i)=>`<path d="M${-w} ${dy} L${-w+12} ${dy-h} L${w-12} ${dy-h} L${w} ${dy}Z" fill="${['#e9c24a','#f0cd58','#f6d868','#fbe27c'][i]}"/><path d="M${w} ${dy} L${w-12} ${dy-h} L${w-12} ${dy}Z" fill="#c99d2a" opacity=".5"/>`).join('')
  +`<path d="M-18 -78 L0 -112 L18 -78Z" fill="#fff0a0"/><rect x="-10" y="-14" width="20" height="14" fill="#7a5a14"/></g>`;
const pillars=(x,y)=>`<g transform="translate(${x} ${y})"><ellipse cx="0" cy="6" rx="60" ry="10" fill="#2b7a3a" opacity=".3"/>${[[-40,40],[-14,52],[14,34],[40,46]].map(([dx,h],i)=>`<g transform="translate(${dx} 0)"><rect x="-9" y="${-h}" width="18" height="${h}" fill="#ece6d8"/><rect x="-9" y="${-h}" width="6" height="${h}" fill="#fff" opacity=".6"/><rect x="-12" y="${-h-5}" width="24" height="7" fill="#d9d2c0"/>${i%2?`<path d="M-9 ${-h+10} l9 6 l9 -6" stroke="#b9b29c" fill="none"/>`:''}</g>`).join('')}</g>`;
const volcano=(x,y)=>`<g transform="translate(${x} ${y})"><circle class="wm-glow" cx="0" cy="-108" r="70" fill="#ff7a3a" opacity=".25"/><g class="wm-rumble"><ellipse cx="0" cy="6" rx="100" ry="14" fill="#2b7a3a" opacity=".3"/><path d="M-96 0 L-30 -108 L30 -108 L96 0Z" fill="#7b5a4a"/><path d="M30 -108 L96 0 L20 0Z" fill="#634838"/><path d="M-30 -108 Q0 -96 30 -108 Q0 -120 -30 -108Z" fill="#ff7a3a"/><path d="M-6 -106 Q-16 -60 -30 -20 Q-8 -50 -2 -106Z M8 -106 Q22 -70 40 -30 Q16 -60 10 -106Z" fill="#ff5a2a"/><ellipse class="wm-lava" cx="0" cy="-108" rx="34" ry="9" fill="#ffb347"/><g class="wm-lflow" fill="none" stroke="#ffb347" stroke-width="4" stroke-linecap="round" stroke-dasharray="10 14"><path d="M-8 -104 Q-18 -64 -34 -22"/><path d="M10 -104 Q24 -66 44 -26"/></g><g class="wm-embers">${[[-46,-120,0],[30,-140,.9],[-12,-160,1.8],[54,-110,2.7],[-60,-90,3.6],[8,-175,4.5]].map(([dx,dy,d])=>`<circle class="wm-ember" cx="0" cy="-108" r="5" fill="#ff7a2a" style="--dx:${dx}px;--dy:${dy}px;animation-delay:${d}s"/>`).join("")}</g><g class="wm-smoke" fill="#cfd4da"><circle cx="-4" cy="-130" r="14"/><circle cx="12" cy="-150" r="18"/><circle cx="-6" cy="-176" r="22"/></g></g></g>`;
const lighthouse=(x,y)=>`<g transform="translate(${x} ${y})"><ellipse cx="0" cy="6" rx="34" ry="8" fill="#2b7a3a" opacity=".3"/><path d="M-14 0 L-9 -70 L9 -70 L14 0Z" fill="#fff"/><path d="M-12 -18 L-11 -34 L11 -34 L12 -18Z M-10 -52 L-9 -68 L9 -68 L10 -52Z" fill="#e5303b"/><rect x="-12" y="-82" width="24" height="12" rx="2" fill="#6b7482"/><path d="M-9 -82 L0 -98 L9 -82Z" fill="#e5303b"/><circle cx="0" cy="-76" r="5" fill="#ffe27a"/><g transform="translate(0 -76)"><g class="wm-sweep"><path d="M0 0 L96 -16 L96 16Z" fill="#fff6b0" opacity=".5"/><path d="M0 0 L-96 -16 L-96 16Z" fill="#fff6b0" opacity=".5"/></g></g><circle class="wm-lamp" cx="0" cy="-76" r="7" fill="#fff3a0"/><g class="wm-ripples" fill="none" stroke="#fff" stroke-width="3"><ellipse class="wm-rip" cx="-6" cy="14" rx="30" ry="9"/><ellipse class="wm-rip" style="animation-delay:-1.6s" cx="-6" cy="14" rx="30" ry="9"/></g></g>`;
const moai=(x,y,s=1)=>`<g transform="translate(${x} ${y}) scale(${s})"><circle class="wm-eye" cx="-5" cy="-46" r="2.6" fill="#ffd447"/><circle class="wm-eye" cx="5" cy="-46" r="2.6" fill="#ffd447"/><ellipse cx="2" cy="4" rx="20" ry="5" fill="#2b7a3a" opacity=".3"/><path d="M-12 0 L-14 -46 Q-12 -62 0 -64 Q12 -62 14 -46 L12 0Z" fill="#8f8a82"/><path d="M0 -64 Q12 -62 14 -46 L12 0 L0 0Z" fill="#7a756d"/><path d="M-12 -44 H12 M-3 -40 L0 -26 L3 -40" stroke="#5f5b54" stroke-width="3" fill="none"/><rect x="-9" y="-50" width="18" height="4" fill="#6a665f"/></g>`;
const ship=(x,y)=>`<g transform="translate(${x} ${y})"><g class="wm-bob"><ellipse cx="0" cy="14" rx="56" ry="9" fill="#1f7d99" opacity=".35"/><path d="M-50 0 L50 0 L36 16 L-36 16Z" fill="#7a4a24"/><path d="M-50 0 L50 0 L48 4 L-48 4Z" fill="#a8693a"/><rect x="-2" y="-62" width="4" height="62" fill="#5e3a1a"/><path d="M-4 -58 Q-40 -34 -30 -6 L-4 -6Z" fill="#fff"/><path d="M4 -52 Q38 -34 30 -6 L4 -6Z" fill="#fff6e0"/><path d="M2 -62 L18 -58 L2 -54Z" fill="#e5303b"/></g></g>`;
const balloon=(x,y)=>`<g class="wm-float" transform="translate(${x} ${y})"><path d="M-20 -24 Q-26 -62 0 -66 Q26 -62 20 -24 Q10 -6 0 -4 Q-10 -6 -20 -24Z" fill="#e5303b"/><path d="M-8 -64 Q-14 -34 -2 -4 L6 -4 Q16 -34 8 -64Z" fill="#fff" opacity=".85"/><path d="M-10 -8 L-6 8 M10 -8 L6 8" stroke="#5e3a1a" stroke-width="1.5"/><rect x="-8" y="8" width="16" height="10" rx="2" fill="#a8693a"/></g>`;
const whale=(x,y)=>`<g transform="translate(${x} ${y})"><g class="wm-bob"><path d="M-44 6 Q-40 -16 -10 -18 Q26 -18 40 0 Q50 -6 56 -20 Q56 -2 48 12 Q30 16 -10 14 Q-34 14 -44 6Z" fill="#3b78c8"/><path d="M-30 8 Q0 2 34 8 Q10 14 -30 8Z" fill="#cfe6ff"/><circle cx="-26" cy="-2" r="2.4" fill="#10213a"/></g><g class="wm-spout" fill="#e8fbff"><circle cx="-8" cy="-28" r="3"/><circle cx="-14" cy="-38" r="3.4"/><circle cx="-2" cy="-40" r="3.4"/><circle cx="-8" cy="-50" r="4"/></g></g>`;
const compass=(x,y)=>`<g transform="translate(${x} ${y})"><circle r="40" fill="#fff6d8" stroke="#8a6a2a" stroke-width="4"/><circle r="31" fill="none" stroke="#c9a55a" stroke-width="1.5"/><g class="wm-needle"><path d="M0 -30 L7 0 L0 30 L-7 0Z" fill="#e5303b"/><path d="M0 30 L7 0 L-7 0Z" fill="#fff" stroke="#8a6a2a" stroke-width="1"/></g><circle r="4" fill="#8a6a2a"/><text y="-44" text-anchor="middle" font-size="15" font-weight="800" fill="#8a6a2a" stroke="#fff6d8" stroke-width="3" paint-order="stroke">N</text></g>`;
const waves=()=>{let s='';for(let i=0;i<26;i++){const x=(i*173)%1100-50,y=(i*263)%1100-40;s+=`<path class="wm-wave" style="animation-delay:${-(i%7)*.9}s" d="M${x} ${y} q14 -9 28 0 t28 0" stroke="#fff" stroke-opacity=".4" stroke-width="3" fill="none" stroke-linecap="round"/>`}return s};

const ISLAND="M300 920 C200 860 150 760 190 680 C130 620 120 520 190 470 C170 380 240 300 330 290 C360 200 470 150 560 190 C650 160 760 210 760 300 C840 340 850 450 790 520 C840 600 800 700 720 740 C700 830 600 900 500 910 C440 960 340 960 300 920Z";
const smooth=pts=>{let d=`M${pts[0][0]} ${pts[0][1]}`;for(let i=0;i<pts.length-1;i++){const p0=pts[i-1]||pts[i],p1=pts[i],p2=pts[i+1],p3=pts[i+2]||p2;
  d+=` C${(p1[0]+(p2[0]-p0[0])/6).toFixed(1)} ${(p1[1]+(p2[1]-p0[1])/6).toFixed(1)} ${(p2[0]-(p3[0]-p1[0])/6).toFixed(1)} ${(p2[1]-(p3[1]-p1[1])/6).toFixed(1)} ${p2[0]} ${p2[1]}`}return d};
const ROUTE=smooth([[340,850],[285,800],[235,735],[300,690],[390,640],[480,690],[575,735],[640,660],[690,575],[600,510],[430,490],[285,470],[330,400],[480,360],[600,330],[690,300]]);

const bird=(c='#fff')=>`<g><path class="wm-flap" d="M-9 2 Q-4 -7 0 1 Q4 -7 9 2" fill="none" stroke="${c}" stroke-width="2.8" style="filter:drop-shadow(0 1px 1px rgba(0,0,0,.35))" stroke-linecap="round"/></g>`;
const catBalloon=()=>`<g transform="scale(.95)"><g class="wm-float2"><path d="M-30 -34 Q-40 -92 0 -98 Q40 -92 30 -34 Q16 -8 0 -6 Q-16 -8 -30 -34Z" fill="#e5303b"/><path d="M-12 -96 Q-24 -52 -4 -6 L8 -6 Q26 -52 12 -96Z" fill="#fff" opacity=".9"/><path d="M-30 -34 Q-16 -30 0 -30 Q16 -30 30 -34" stroke="#b5202b" stroke-width="2" fill="none"/>
  <path d="M-14 -8 L-10 14 M14 -8 L10 14" stroke="#5e3a1a" stroke-width="2"/><rect x="-14" y="14" width="28" height="18" rx="3" fill="#b9793f" stroke="#8a5a2b" stroke-width="2"/>
  <g transform="translate(0 12)"><circle cx="0" cy="0" r="9" fill="#f6a54a"/><path d="M-8 -4 L-7 -14 L-2 -8Z M8 -4 L7 -14 L2 -8Z" fill="#f6a54a"/><circle cx="-3.2" cy="-1" r="1.3" fill="#3a2a2a"/><circle cx="3.2" cy="-1" r="1.3" fill="#3a2a2a"/><path d="M-1.5 3 L0 4.5 L1.5 3" stroke="#3a2a2a" fill="none" stroke-width="1"/>
  <g class="wm-wave-paw"><circle cx="11" cy="6" r="3.4" fill="#f6a54a"/></g></g></g></g>`;
const bflies=(x,y)=>[0,1].map(k=>`<g transform="translate(${x+k*30} ${y-k*20})"><g class="wm-bfly" style="animation-delay:${-k*2.3}s"><g class="wm-bw"><ellipse cx="-3" cy="0" rx="3.4" ry="2.4" fill="${k?'#ff9ad0':'#ffd447'}"/><ellipse cx="3" cy="0" rx="3.4" ry="2.4" fill="${k?'#ff9ad0':'#ffd447'}"/></g></g></g>`).join('');
const fireflies=(x,y)=>[[0,0,0],[34,-18,.8],[-22,-30,1.6],[18,-44,2.4],[-40,-8,3.2]].map(([dx,dy,d])=>`<circle class="wm-ff" cx="${x+dx}" cy="${y+dy}" r="2.6" fill="#fff59a" style="animation-delay:${-d}s"/>`).join('');
const leaves=(x,y)=>[0,1,2,3].map(k=>`<ellipse class="wm-leaf" cx="${x+k*26-30}" cy="${y-40}" rx="5" ry="2.6" fill="#5fd06f" style="animation-delay:${-k*1.7}s"/>`).join('');
const sparkle=(x,y,d=0,s=1)=>`<path class="wm-spk" transform="translate(${x} ${y}) scale(${s})" d="M0 -9 L2.4 -2.4 L9 0 L2.4 2.4 L0 9 L-2.4 2.4 L-9 0 L-2.4 -2.4Z" fill="#fff" style="animation-delay:${-d}s"/>`;
const scrolls=(x,y)=>[0,1,2].map(k=>`<g transform="translate(${x+k*34-30} ${y})"><g class="wm-page" style="animation-delay:${-k*1.8}s"><rect x="-6" y="-8" width="12" height="16" rx="2" fill="#fffbe8" stroke="#c9b88a"/><path d="M-3 -3 H3 M-3 1 H3 M-3 5 H1" stroke="#b9a874" stroke-width="1"/></g></g>`).join('');
const crab=()=>`<g class="wm-crab"><g transform="translate(0 0)"><ellipse cx="0" cy="0" rx="10" ry="6.5" fill="#f0643a"/><circle cx="-4" cy="-8" r="2.4" fill="#fff"/><circle cx="4" cy="-8" r="2.4" fill="#fff"/><circle cx="-4" cy="-8" r="1.1" fill="#222"/><circle cx="4" cy="-8" r="1.1" fill="#222"/><path d="M-10 -2 L-17 -8 M10 -2 L17 -8" stroke="#f0643a" stroke-width="3" stroke-linecap="round"/><path d="M-9 3 L-15 7 M9 3 L15 7" stroke="#d94f28" stroke-width="2" stroke-linecap="round"/></g></g>`;
const dolphin=()=>`<g class="wm-dolphin"><path d="M-22 4 Q-10 -14 14 -6 Q24 -2 30 -10 Q30 2 22 6 Q4 12 -22 4Z" fill="#5aa9e6"/><path d="M-4 -10 L2 -22 L6 -8Z" fill="#3b86c4"/><path d="M-14 3 Q4 8 22 4 Q4 10 -14 3Z" fill="#dff1ff"/><circle cx="-14" cy="-2" r="1.5" fill="#10213a"/></g>`;
const flag=(x,y)=>`<g transform="translate(${x} ${y})"><rect x="-1.5" y="-44" width="3" height="46" fill="#8a5a2b"/><path class="wm-flag" d="M1.5 -44 L30 -38 L1.5 -30Z" fill="#e5303b"/></g>`;
function extras(){
  const fly=(y,dur,del,s=1,c)=>{s*=1.8;return `<g transform="translate(0 ${y}) scale(${s})"><g class="wm-fly" style="animation-duration:${dur}s;animation-delay:${-del}s">${bird(c)}</g></g>`};
  return `
  <!-- the cat's balloon drifting slowly back and forth over the island -->
  <g class="wm-drift"><g transform="translate(0 0)">${catBalloon()}</g></g>
  <!-- birds -->
  ${fly(210,26,4)}${fly(260,34,17,.8)}${fly(330,30,9,1.1)}${fly(120,38,22,.7)}${fly(560,42,30,.9,'#fff')}
  <g class="wm-orbit"><g transform="translate(278 400) scale(1.6)">${bird()}</g><g transform="translate(160 400) scale(1.4)">${bird()}</g><g transform="translate(220 340) scale(1.6)">${bird()}</g></g>
  <!-- coastal office: crab, flag, dolphin, glints -->
  <g transform="translate(300 925)">${crab()}</g>${flag(372,812)}<g transform="translate(150 930)">${dolphin()}</g>${sparkle(200,960,0,.8)}${sparkle(250,975,1.3,.6)}
  <!-- jungle -->
  ${bflies(210,705)}${fireflies(240,760)}${leaves(250,700)}
  <!-- pyramid pipeline: lights climbing the steps and a sparkle on top -->
  ${[[84,0],[66,-26],[48,-52],[30,-78]].map(([w,dy],i)=>`<circle class="wm-pl" cx="${470+w-14}" cy="${600+dy-12}" r="3.4" fill="#43e08a" style="animation-delay:${-i*.5}s"/><circle class="wm-pl" cx="${470-w+14}" cy="${600+dy-12}" r="3.4" fill="#43e08a" style="animation-delay:${-i*.5-.25}s"/>`).join('')}${sparkle(470,484,0,1.1)}
  <!-- docs ruins: floating pages, glowing runes -->
  ${scrolls(610,690)}<circle class="wm-rune" cx="570" cy="668" r="5" fill="#9fe8ff"/><circle class="wm-rune" style="animation-delay:-1s" cx="650" cy="666" r="5" fill="#9fe8ff"/>
  <!-- review isle: a magnifier inspecting the statues -->
  <g transform="translate(790 230)"><g class="wm-lens"><circle r="9" fill="rgba(210,240,255,.5)" stroke="#8a5a2b" stroke-width="3"/><path d="M6 6 L15 16" stroke="#8a5a2b" stroke-width="4" stroke-linecap="round"/></g></g>${sparkle(840,215,.6,.7)}`;
}
function art(){
  return `<defs>
    <linearGradient id="wmSea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#29a9cf"/><stop offset=".55" stop-color="#4fc6dd"/><stop offset="1" stop-color="#7fe0ea"/></linearGradient>
    <linearGradient id="wmGrass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#a7e867"/><stop offset=".6" stop-color="#6fcf4f"/><stop offset="1" stop-color="#4fb546"/></linearGradient>
    <radialGradient id="wmHill" cx=".5" cy=".4" r=".6"><stop offset="0" stop-color="#bdf07e"/><stop offset="1" stop-color="#bdf07e" stop-opacity="0"/></radialGradient>
    <filter id="wmSh" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6"/></filter>
    <clipPath id="wmClip"><path d="${ISLAND}"/></clipPath></defs>
  <rect x="-2000" y="-2000" width="5000" height="5000" fill="url(#wmSea)"/>
  <g>${waves()}</g>
  <!-- shallow water and foam ring -->
  <path d="${ISLAND}" fill="none" stroke="#9eeaf0" stroke-width="86" stroke-linejoin="round" opacity=".5"/>
  <path class="wm-foam" d="${ISLAND}" fill="none" stroke="#fff" stroke-width="56" stroke-linejoin="round" opacity=".55"/>
  <!-- islets -->
  <g><path d="M720 235 C740 195 810 190 850 215 C885 235 880 275 845 292 C800 312 735 285 720 235Z" fill="#f6dfa0" stroke="#f6dfa0" stroke-width="10" stroke-linejoin="round"/><path d="M732 238 C750 205 808 203 842 222 C870 238 868 268 840 281 C800 297 748 274 732 238Z" fill="url(#wmGrass)"/></g>
  <g><path d="M112 395 C120 365 175 360 205 380 C222 395 210 430 178 440 C140 448 105 425 112 395Z" fill="#f6dfa0" opacity="0"/></g>
  <g><path d="M770 870 C790 840 850 845 870 870 C885 895 840 915 800 910 C770 905 758 890 770 870Z" fill="#f6dfa0"/><path d="M782 872 C798 852 846 856 858 874 C868 892 836 903 806 899 C784 896 774 886 782 872Z" fill="url(#wmGrass)"/></g>
  <!-- main island: sand rim, grass, hills -->
  <path d="${ISLAND}" fill="#f6dfa0" stroke="#f6dfa0" stroke-width="34" stroke-linejoin="round"/>
  <path d="${ISLAND}" fill="url(#wmGrass)"/>
  <g clip-path="url(#wmClip)"><ellipse cx="450" cy="420" rx="230" ry="150" fill="url(#wmHill)"/><ellipse cx="500" cy="750" rx="260" ry="130" fill="url(#wmHill)"/><ellipse cx="300" cy="640" rx="130" ry="90" fill="url(#wmHill)"/>
    <path d="M150 470 L260 470 L300 640 L190 600Z" fill="#c9e87a" opacity=".25"/></g>
  <path d="${ISLAND}" fill="none" stroke="#3a9a3f" stroke-width="3" opacity=".25" transform="translate(0 0)"/>
  <!-- lake, trail shade -->
  <ellipse cx="505" cy="585" rx="52" ry="22" fill="#7fd5f0" stroke="#fff" stroke-width="3"/><ellipse cx="498" cy="581" rx="30" ry="8" fill="#a8e6f8"/>
  <!-- scenery (back to front) -->
  ${mount(470,330,1.1)}${mount(555,305,.9)}${mount(395,355,.7)}
  ${[[430,395,.9],[470,410,.8],[520,400,.9],[565,395,.8],[610,420,.8],[395,420,.8]].map(([x,y,s])=>pine(x,y,s)).join('')}
  ${volcano(770,520)}
  ${lighthouse(215,450)}
  ${moai(790,250,1.1)}${moai(826,262,.9)}${moai(758,264,.8)}
  <path d="M735 275 L700 292" stroke="#8a5a2b" stroke-width="7" stroke-linecap="round"/>
  ${pyramid(470,600)}
  ${pillars(610,712)}
  ${[[170,700,1],[200,770,.9],[300,760,1],[265,705,.9],[160,640,.9]].map(([x,y,s])=>palm(x,y,s)).join('')}
  ${[[190,730,1],[290,730,.9],[215,790,.9],[330,700,.9]].map(([x,y,s])=>bush(x,y,s)).join('')}
  ${[[420,860,.9],[470,880,1],[520,860,.9]].map(([x,y,s])=>palm(x,y,s)).join('')}
  ${cactus(290,880,1)}${cactus(305,892,.8)}
  ${[[690,810,.9],[640,850,.8],[740,700,.9]].map(([x,y,s])=>palm(x,y,s)).join('')}
  ${[[560,500,.8],[640,455,.8],[330,560,.8]].map(([x,y,s])=>bush(x,y,s)).join('')}
  <!-- sea life -->
  ${rock(110,640,1)}${rock(70,560,.7)}${rock(860,830,1)}${rock(930,760,.7,'#7e8793')}
  ${whale(110,150)}${ship(915,430)}
  ${extras()}
  ${compass(905,150)}
  <g class="wm-cloud" opacity=".95">${cloud(100,1030,1.1)}${cloud(330,1050,1.3)}${cloud(620,1040,1.2)}${cloud(900,1030,1.2)}</g>
  <rect id="wm-night" x="-2000" y="-2000" width="5000" height="5000" fill="#1b1740" opacity="0" pointer-events="none"/>`;
}

/* ---------- DOM ---------- */
stage.insertAdjacentHTML('beforeend',`
<div id="world" class="ui2" role="dialog" aria-label="${L('Bản đồ thế giới','World map')}">
  <svg id="wm-svg" viewBox="0 0 1000 1100" preserveAspectRatio="xMidYMid meet"><g id="wm-art"></g><g id="wm-route"></g><g id="wm-nodes"></g><g id="wm-pin"></g></svg>
  <div id="wm-head"><div class="ttl">🗺️ ${L('Thế giới Mèo','Cat World')}<small id="wm-prog"></small></div>
    <div class="acts"><button type="button" id="wm-snd" class="wmb" aria-label="${L('Âm thanh','Sound')}"></button><button type="button" id="wm-lang" class="wmb" aria-label="${L('Ngôn ngữ','Language')}"></button><button type="button" id="wm-close" class="wmb" aria-label="${L('Quay lại game','Back to the game')}">✕</button></div></div>
  <div id="wm-zoom"><button type="button" id="wm-zi" class="wmb" aria-label="Zoom in">＋</button><button type="button" id="wm-zo" class="wmb" aria-label="Zoom out">－</button><button type="button" id="wm-zr" class="wmb" aria-label="${L('Đặt lại','Reset')}">⌂</button></div>
  <div id="wm-legend"><span>▶ ${L('Đang ở đây','You are here')}</span><span>✅ ${L('Đã chơi','Played')}</span><span>⭐ ${L('Sao','Stars')}</span><span>🔒 ${L('Khóa','Locked')}</span><span>✨ ${L('Mới mở','New')}</span></div>
  <div id="wm-card" class="u2p" role="region"></div>
</div>`);
const world=$('world'),svg=$('wm-svg'),gNodes=$('wm-nodes'),gPin=$('wm-pin');
$('wm-art').innerHTML=art();
const routePath=`<path id="wm-rp" d="${ROUTE}" fill="none"/>`;
$('wm-route').innerHTML=`<path d="${ROUTE}" fill="none" stroke="#2f8f4a" stroke-opacity=".35" stroke-width="12" stroke-linecap="round"/>`+routePath.replace('fill="none"','fill="none" stroke="#fff" stroke-width="5" stroke-dasharray="14 12" stroke-linecap="round"')+`<path id="wm-done" d="${ROUTE}" fill="none" stroke="#43c97b" stroke-width="9" stroke-linecap="round" stroke-dasharray="0 9999" opacity=".85"/>`;
const rp=$('wm-rp'),RL=rp.getTotalLength();
// where each node sits along the route (nearest sample)
const NL=NODES.map(n=>{let best=0,bd=1e9;for(let i=0;i<=600;i++){const p=rp.getPointAtLength(RL*i/600),d=Math.hypot(p.x-n.x,p.y-n.y);if(d<bd){bd=d;best=RL*i/600}}return best});

/* ---------- state ---------- */
let cur=lsGet('wmCur','coastal'),sel=cur,fromGame=false,pinLen=0,busy=false;
const idx=id=>NODES.findIndex(n=>n.id===id);
const S=()=>{const s=stats();return {q:s.quests||0,badges:Object.keys(s.b||{}).length}};
const unlocked=(n,s=S())=>n.req===0||s.q>=n.req;
const starsOf=(n,s=S())=>n.id==='coastal'?(s.q>=10?3:s.q>=5?2:s.q>=1?1:0):0;
const doneOf=(n,s=S())=>n.id==='coastal'&&s.q>=1;

function drawNodes(){
  const s=S(),seen=JSON.parse(lsGet('wmSeen','[]'));let h='',lastUn=0;
  NODES.forEach((n,i)=>{
    const un=unlocked(n,s),done=doneOf(n,s),st=starsOf(n,s),isNew=un&&n.req>0&&!seen.includes(n.id);if(un)lastUn=i;
    h+=`<g class="wm-node ${un?(done?'done':'open'):'lock'} ${sel===n.id?'sel':''} ${isNew?'new':''}" data-id="${n.id}" transform="translate(${n.x} ${n.y})" tabindex="0" role="button" aria-label="${n.n}">
      <circle class="halo" r="34"/><circle class="disc" r="24"/>
      <text class="ico" y="8" text-anchor="middle" font-size="22">${!un?'🔒':done?'✔':n.e}</text>
      ${isNew?'<text x="22" y="-18" font-size="18">✨</text>':''}
      <g class="lbl" transform="translate(0 46)"><rect x="${-(n.n.length*3.7+12)}" y="-13" width="${n.n.length*7.4+24}" height="22" rx="11"/><text text-anchor="middle" y="3" font-size="12" font-weight="700">${n.n}</text></g>
      <g transform="translate(0 66)" font-size="14">${[0,1,2].map(k=>`<text x="${(k-1)*17}" text-anchor="middle" fill="${k<st?'#ffc928':'#fff'}" fill-opacity="${k<st?1:.55}" stroke="#a87a10" stroke-width="${k<st?.8:0}">★</text>`).join('')}</g>
    </g>`});
  gNodes.innerHTML=h;
  const up=NL[lastUn];$('wm-done').setAttribute('stroke-dasharray',`${up} 9999`);
  const stars=NODES.reduce((a,n)=>a+starsOf(n,s),0),open=NODES.filter(n=>unlocked(n,s)).length;
  $('wm-prog').textContent=` ${L('· Mở','· Open')} ${open}/${NODES.length} · ⭐ ${stars}/${NODES.length*3}`;
}
function placePin(len){
  const p=rp.getPointAtLength(len),n=NODES[idx(cur)];
  gPin.innerHTML=`<g transform="translate(${p.x.toFixed(1)} ${(p.y-48).toFixed(1)})"><g class="wm-pinb"><path d="M-8 18 L0 30 L8 18Z" fill="#e5303b"/><rect x="-36" y="-14" width="72" height="34" rx="17" fill="#e5303b" stroke="#fff" stroke-width="4"/><text y="8" text-anchor="middle" font-size="15" font-weight="900" fill="#fff" letter-spacing=".5">${L('CHƠI','PLAY')}</text></g></g>`;
}
function travel(to){
  return new Promise(res=>{const a=pinLen,b=NL[idx(to)],t0=performance.now(),d=Math.max(500,Math.min(1400,Math.abs(b-a)*1.4));busy=true;
    (function st(t){const k=Math.min(1,(t-t0)/d),e=k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2;pinLen=a+(b-a)*e;placePin(pinLen);if(k<1)requestAnimationFrame(st);else{busy=false;res()}})(t0)});
}

/* ---------- info card ---------- */
function card(){
  const n=NODES[idx(sel)],s=S(),un=unlocked(n,s),st=starsOf(n,s),c=$('wm-card');
  const need=Math.max(0,n.req-s.q);
  let btn;
  if(n.hub)btn=`<button class="pill go" type="button" id="wm-go">🔭 ${L('Vào hải đăng','Enter lighthouse')}</button>`;
  else if(n.play)btn=`<button class="pill go" type="button" id="wm-go">▶ ${L('Vào chơi','Play')}</button>`;
  else if(un)btn=`<button class="pill ghost" type="button" disabled>🚧 ${L('Sắp ra mắt','Coming soon')}</button>`;
  else btn=`<button class="pill ghost" type="button" disabled>🔒 ${L('Chưa mở khóa','Locked')}</button>`;
  c.innerHTML=`<button class="x" type="button" id="wm-cx" aria-label="${L('Đóng','Close')}">✕</button>
   <div class="ch"><span class="big">${un?n.e:'🔒'}</span><div><h3>${n.n}</h3><div class="stars">${[0,1,2].map(k=>`<i class="${k<st?'on':''}">★</i>`).join('')}${n.play?'':` <em>${un?L('Đã đủ điều kiện','Requirement met'):''}</em>`}</div></div></div>
   <p>${un||n.play?n.d:L('Vùng đất bí ẩn… hoàn thành thêm quest để khám phá.','A mysterious land… finish more quests to explore it.')}</p>
   ${n.req?`<div class="req"><div class="tr"><i style="width:${Math.min(100,s.q/n.req*100)}%"></i></div><span>${un?'✅ ':'🔒 '}${L(`Cần hoàn thành ${n.req} quest ở Văn phòng ven biển (${Math.min(s.q,n.req)}/${n.req})`,`Finish ${n.req} quests at the Coastal Office (${Math.min(s.q,n.req)}/${n.req})`)}</span></div>`
     :`<div class="req"><span>${L('Quest đã hoàn thành','Quests finished')}: <b>${s.q}</b> · ${L('Huy hiệu','Badges')}: <b>${s.badges}</b></span></div>`}
   ${n.play&&st<3?`<div class="req"><span>⭐ ${L('Sao tiếp theo ở','Next star at')} ${s.q<1?1:s.q<5?5:10} ${L('quest','quests')}</span></div>`:''}
   <div class="row">${btn}</div>`;
  c.classList.add('on');
  $('wm-cx').onclick=()=>{c.classList.remove('on')};
  const g=$('wm-go');if(g)g.onclick=enter;
}
async function select(id){
  if(busy)return;const n=NODES[idx(id)];sel=id;drawNodes();
  if(unlocked(n)&&id!==cur){cur=id;lsSet('wmCur',cur);await travel(id);drawNodes()}
  else if(!unlocked(n)){const g=gNodes.querySelector(`[data-id="${id}"]`);g&&g.classList.add('shake');setTimeout(()=>g&&g.classList.remove('shake'),500);try{SND.play('bonk')}catch(e){}}
  card();focusNode(n);
  const seen=JSON.parse(lsGet('wmSeen','[]'));if(!seen.includes(id)){seen.push(id);lsSet('wmSeen',JSON.stringify(seen))}
}

// on phones the card is a bottom sheet, so bring the node up above it
function focusNode(n){
  if(innerWidth>600)return;
  const tw=620,th=tw*1.1,a={...vb},t0=performance.now();
  const tx=Math.max(-60,Math.min(1060-tw,n.x-tw/2)),ty=Math.max(-60,Math.min(1160-th,n.y-th*.28));
  (function st(t){const k=Math.min(1,(t-t0)/400),e=1-Math.pow(1-k,3);vb.w=a.w+(tw-a.w)*e;vb.x=a.x+(tx-a.x)*e;vb.y=a.y+(ty-a.y)*e;applyVB();if(k<1)requestAnimationFrame(st)})(t0);
}
/* ---------- open / close ---------- */
function open(fg){
  fromGame=!!fg;world.classList.remove('leaving');world.classList.add('on');document.body.classList.add('onmap');
  $('wm-close').style.display=fromGame?'':'none';
  cur=lsGet('wmCur','coastal');if(!unlocked(NODES[idx(cur)]))cur='coastal';sel=cur;
  pinLen=NL[idx(cur)];vb={x:0,y:0,w:1000,h:1100};applyVB();drawNodes();placePin(pinLen);card();$('wm-card').classList.remove('on');setTimeout(()=>{if(world.classList.contains('on'))$('wm-card').classList.add('on')},350);
  const s=S(),seen=JSON.parse(lsGet('wmSeen','[]')),fresh=NODES.filter(n=>n.req>0&&unlocked(n,s)&&!seen.includes(n.id));
  if(fresh.length&&window.UI&&UI.toast)setTimeout(()=>{world.classList.contains('on')&&UI.toast(L('Mở khóa vùng mới: ','New region unlocked: ')+fresh.map(n=>n.n).join(', '),'✨','ok')},2800);
  syncBtns();
}
function enter(){
  if(NODES[idx(sel)].hub){if(window.NewsHub)NewsHub.open();return}
  if(!NODES[idx(sel)].play&&sel!=='coastal')return;
  world.classList.add('leaving');try{SND.play('fanfare')}catch(e){}
  setTimeout(()=>{world.classList.remove('on','leaving');document.body.classList.remove('onmap');if(window.UI&&UI.maybeTour)UI.maybeTour()},520);
}
function close(){if(!fromGame)return;world.classList.add('leaving');setTimeout(()=>{world.classList.remove('on','leaving');document.body.classList.remove('onmap')},400)}
function syncBtns(){const b=$('wm-snd');b.textContent=$('snd').textContent;$('wm-lang').textContent=$('lang').textContent}
$('wm-snd').onclick=()=>{$('snd').click();syncBtns()};
$('wm-lang').onclick=()=>$('lang').click();
$('wm-close').onclick=close;
$('mapbtn').onclick=()=>{if(!$('mapbtn').disabled)open(true)};

/* ---------- pan / zoom / select ---------- */
let vb={x:0,y:0,w:1000,h:1100};
const clampVB=()=>{vb.w=Math.max(380,Math.min(1000,vb.w));vb.h=vb.w*1.1;vb.x=Math.max(-60,Math.min(1060-vb.w,vb.x));vb.y=Math.max(-60,Math.min(1160-vb.h,vb.y))};
function applyVB(){clampVB();svg.setAttribute('viewBox',`${vb.x.toFixed(1)} ${vb.y.toFixed(1)} ${vb.w.toFixed(1)} ${vb.h.toFixed(1)}`)}
const zoomAt=(f,cx,cy)=>{const w0=vb.w;vb.w=w0/f;clampVB();const k=vb.w/w0;vb.x=cx-(cx-vb.x)*k;vb.y=cy-(cy-vb.y)*k;applyVB()};
const toSvg=(px,py)=>{const r=svg.getBoundingClientRect(),sc=Math.min(r.width/vb.w,r.height/vb.h),ox=(r.width-vb.w*sc)/2,oy=(r.height-vb.h*sc)/2;return [vb.x+(px-r.left-ox)/sc,vb.y+(py-r.top-oy)/sc]};
svg.addEventListener('wheel',e=>{e.preventDefault();const [x,y]=toSvg(e.clientX,e.clientY);zoomAt(e.deltaY<0?1.15:1/1.15,x,y)},{passive:false});
const ptr=new Map();let dragged=false,pd0=0,w0=1000;
svg.addEventListener('pointerdown',e=>{ptr.set(e.pointerId,[e.clientX,e.clientY]);dragged=false;if(ptr.size===2){const [a,b]=[...ptr.values()];pd0=Math.hypot(a[0]-b[0],a[1]-b[1]);w0=vb.w}});
addEventListener('pointermove',e=>{const p=ptr.get(e.pointerId);if(!p||!world.classList.contains('on'))return;
  if(ptr.size===2){ptr.set(e.pointerId,[e.clientX,e.clientY]);const [a,b]=[...ptr.values()],d=Math.hypot(a[0]-b[0],a[1]-b[1]);dragged=true;
    const [x,y]=toSvg((a[0]+b[0])/2,(a[1]+b[1])/2);const f=(w0/vb.w)*(d/pd0);zoomAt(f,x,y);return}
  const dx=e.clientX-p[0],dy=e.clientY-p[1];if(!dragged&&Math.hypot(dx,dy)<6)return;dragged=true;
  const r=svg.getBoundingClientRect(),sc=Math.min(r.width/vb.w,r.height/vb.h);vb.x-=dx/sc;vb.y-=dy/sc;applyVB();ptr.set(e.pointerId,[e.clientX,e.clientY])});
['pointerup','pointercancel'].forEach(n=>addEventListener(n,e=>ptr.delete(e.pointerId)));
gNodes.addEventListener('click',e=>{if(dragged)return;const g=e.target.closest('.wm-node');if(g)select(g.dataset.id)});
gNodes.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){const g=e.target.closest('.wm-node');if(g){e.preventDefault();select(g.dataset.id)}}});
$('wm-zi').onclick=()=>zoomAt(1.3,vb.x+vb.w/2,vb.y+vb.h/2);$('wm-zo').onclick=()=>zoomAt(1/1.3,vb.x+vb.w/2,vb.y+vb.h/2);
$('wm-zr').onclick=()=>{vb={x:0,y:0,w:1000,h:1100};applyVB()};
addEventListener('keydown',e=>{if(!world.classList.contains('on'))return;
  if(e.key==='Escape'){close();return}
  const i=idx(sel);
  if(/^Arrow(Right|Down)$/.test(e.key)){e.preventDefault();select(NODES[Math.min(NODES.length-1,i+1)].id)}
  else if(/^Arrow(Left|Up)$/.test(e.key)){e.preventDefault();select(NODES[Math.max(0,i-1)].id)}
  else if(e.key==='Enter'&&!e.target.closest('.wm-node,button')){const n=NODES[i];if(n.play)enter()}
},true);
// the night tint follows the in-game time
setInterval(()=>{$('wm-night').setAttribute('opacity',document.body.classList.contains('night')?.24:0)},3000);

if(/[?&]nomap\b/.test(location.search)){if(window.UI&&UI.maybeTour)UI.maybeTour()}
else open(false);
})();

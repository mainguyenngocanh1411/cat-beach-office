/* Model playbook: which model and effort to use at each stage of the HCPH flow, plus ways to spend fewer tokens.
   It feeds the cat profile cards, the HUD, incident cards, Mr Know-It-All's answers and a handbook panel (Settings, or the B key). */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const stage=$('stage');

const PRINCIPLE=L('Model mạnh chỉ dùng ở chỗ phải phán đoán (phân tích, review). Chỗ cơ học (deploy, test, docs) dùng model rẻ hoặc script.',
  'Use the strong model only where judgement is needed (analysis, review). Mechanical work (deploy, test, docs) goes to a cheaper model or a script.');
const MODEL={opus:'Opus',sonnet:'Sonnet',haiku:'Haiku',script:L('Script / glab','Script / glab')};

// one entry per game step (the numbers follow the playbook table; Push is derived from the Deploy row)
const PB={
  ba:{n:'1',title:L('Nhận req (đọc ticket, làm rõ)','Intake (read the ticket, clarify)'),
    m:[{k:'sonnet',e:L('effort thấp','low effort')}],where:L('Session chính','Main session'),
    tip:L('Chỉ hỏi lại khi quyết định đó thật sự của bạn. Dán ticket thẳng vào, đừng để Claude tự đi tìm.','Only ask back when the decision is truly yours. Paste the ticket in; do not let Claude go hunting for it.')},
  inv:{n:'2',title:L('Phân tích / thiết kế (tìm code liên quan, chọn hướng, ADR)','Analysis / design (find the code, choose a direction, ADR)'),
    m:[{k:'opus',e:L('effort cao','high effort')}],where:L('Session chính. Dùng Explore (subagent) cho việc quét code rộng','Main session. Use Explore (a subagent) for broad code sweeps'),
    tip:L('Đây là chỗ đáng tốn nhất, vì chọn sai hướng thì code và review đều phải làm lại. Dùng Explore để file dump không vào context chính.','This is where spending pays off: a wrong direction means redoing code and review. Use Explore so file dumps stay out of the main context.')},
  dev:{n:'3',title:L('Code','Code'),
    m:[{k:'sonnet',e:L('effort trung bình','medium effort')},{k:'opus',e:L('chỉ phần khó','hard parts only'),note:L('concurrency, JCR session, cache','concurrency, JCR session, cache')}],
    where:L('Session chính, giữ nguyên context của phần phân tích','Main session, keeping the analysis context'),
    tip:L('Chia task nhỏ, mỗi task một commit. Nếu đã có plan rõ thì Sonnet làm tốt, không cần Opus.','Split into small tasks, one commit each. With a clear plan, Sonnet does well; no Opus needed.')},
  docs:{n:'5',title:L('Update docs','Update docs'),
    m:[{k:'haiku'},{k:'sonnet',e:L('effort thấp','low effort')}],where:L('Subagent hoặc inline','Subagent or inline'),
    tip:L('Đưa diff và đường dẫn doc cần sửa. Không cho đọc lại cả repo.','Hand over the diff and the doc paths to edit. Do not let it re-read the whole repo.')},
  rev:{n:'4',title:L('Review','Review'),
    m:[{k:'opus',e:L('context mới','fresh context')}],where:L('Subagent, context sạch (agent reviewer hoặc /code-review)','Subagent, clean context (reviewer agent or /code-review)'),
    tip:L('Context sạch giúp bắt lỗi tốt hơn vì không bị "thiên vị" theo cách code đã nghĩ. Chỉ đưa diff và tiêu chí cho reviewer.','A clean context catches more because it is not biased by how the code was thought through. Give the reviewer only the diff and the criteria.')},
  git:{n:'6',derived:true,title:L('Push (thuộc nhóm cơ học, cùng hàng với Deploy)','Push (mechanical, same row as Deploy)'),
    m:[{k:'script'},{k:'haiku'}],where:L('release','release'),
    tip:L('Chỉ push khi sếp nói rõ "push". Gói thành script để Claude chỉ chạy rồi đọc kết quả.','Push only when the boss clearly says "push". Wrap it in a script so Claude just runs it and reads the result.')},
  ops:{n:'6',title:L('Deploy','Deploy'),
    m:[{k:'haiku'},{k:'script',e:L('script/glab thuần','plain script/glab')}],where:L('release / env-verifier','release / env-verifier'),
    tip:L('Gần như không cần suy luận. Gói thành script để Claude chỉ chạy rồi đọc kết quả. Giữ nguyên quy tắc main/prod hands-off.','Almost no reasoning needed. Wrap it in a script so Claude just runs it and reads the result. Keep the main/prod hands-off rule.')},
  qa:{n:'7',title:L('Test (Playwright, probe, HAR)','Test (Playwright, probes, HAR)'),
    m:[{k:'haiku',note:L('chạy và tóm tắt','run and summarise')},{k:'sonnet',note:L('khi debug test fail','when debugging a failure')}],where:L('env-verifier','env-verifier'),
    tip:L('Chỉ trả về pass/fail và đoạn lỗi. Đừng để log dài đổ vào context chính.','Return only pass/fail and the failing excerpt. Do not let long logs flood the main context.')}};
const INC={n:'!',title:L('Incident (OOM, 502, 429)','Incident (OOM, 502, 429)'),m:[{k:'opus',e:L('effort cao','high effort')}],where:L('Agent incident','Incident agent'),
  tip:L('Đáng dùng model mạnh, vì sai hướng điều tra rất tốn.','Worth the strong model: a wrong investigation direction is very expensive.')};
const SAVE=[
  [L('Tách context theo giai đoạn','Split context by stage'),L('Phân tích và code chung một session. Review, test và deploy mở session hoặc subagent riêng. Dùng /clear giữa các task khác nhau.','Analysis and code share a session. Review, test and deploy get their own session or subagent. Use /clear between unrelated tasks.')],
  [L('Subagent cho việc ồn','Subagents for noisy work'),L('Quét code, đọc log, chạy test và đọc HAR đều sinh nhiều output. Subagent nhận hết và chỉ trả lại bản tóm tắt vài dòng.','Code sweeps, log reading, test runs and HAR reading produce lots of output. A subagent absorbs it and returns a few-line summary.')],
  [L('Cơ học thì chuyển thành script','Turn mechanical work into scripts'),L('Probe, deploy và clone org đã có trong .claude/scripts. Claude chỉ chạy script và đọc kết quả, không cần suy luận lại từng lần.','Probes, deploys and org clones already live in .claude/scripts. Claude just runs the script and reads the result, with no re-reasoning each time.')],
  [L('Thông tin bền vào CLAUDE.md, memory, skill hcph','Keep durable facts in CLAUDE.md, memory and the hcph skill'),L('Đừng giải thích lại bối cảnh mỗi lần.','Do not re-explain the background every time.')],
  [L('Đọc có chọn lọc','Read selectively'),L('Dùng Grep rồi Read đúng đoạn cần, không đọc cả file lớn.','Grep first, then Read just the part you need; never read a whole big file.')],
  [L('Giảm effort khi việc đơn giản','Lower the effort for simple jobs'),L('Effort là phần chi phí lớn nhất của model mạnh. Đừng để effort cao cho việc sửa một dòng.','Effort is the biggest cost of a strong model. Do not leave it high for a one-line fix.')]];
const FLOW=[['opus',L('Opus (phân tích, ra plan ngắn)','Opus (analyse, write a short plan)')],['sonnet',L('Sonnet (code theo plan, commit nhỏ)','Sonnet (code to the plan, small commits)')],
  ['opus',L('Opus @ context sạch (review diff)','Opus @ clean context (review the diff)')],['sonnet',L('Sonnet sửa theo review','Sonnet fixes what the review found')],
  ['haiku',L('Haiku (docs + deploy DEV + chạy test)','Haiku (docs + deploy to DEV + run the tests)')],['sonnet',L('Sonnet chỉ khi test fail cần debug','Sonnet only when a failing test needs debugging')]];

const badges=m=>m.map(x=>`<span class="mb ${x.k}">${MODEL[x.k]}${x.e?`<small>${x.e}</small>`:''}</span>`+(x.note?`<span class="wh" style="font-size:11px"> ${x.note}</span>`:'')).join('');
const plain=m=>m.map(x=>MODEL[x.k]+(x.e?` (${x.e})`:'')+(x.note?` – ${x.note}`:'')).join(' / ');
const stepOf=id=>STEPS.find(s=>s.id===id);

/* ---------- profile card section ---------- */
function renderModel(key){
  const box=$('pf-model'),p=PB[key];if(!box)return;
  if(!p){box.innerHTML='';return}
  box.innerHTML=`<div class="mh">🧠 ${L('Model gợi ý','Suggested model')} · ${L('giai đoạn','stage')} ${p.n}${p.derived?'*':''}</div><div class="mrow">${badges(p.m)}</div>
    <div>📍 ${p.where}</div><div>💡 ${p.tip}</div>${key==='inv'?`<div style="margin-top:4px">🚨 ${L('Khi có sự cố','On incidents')}: ${badges(INC.m)} · ${INC.where}</div>`:''}
    <div style="margin-top:4px"><a class="lnk" data-pb="stages">📖 ${L('Mở cẩm nang model','Open the model handbook')}</a></div>`;
  box.querySelector('a').onclick=e=>{e.stopPropagation();open('stages')};
}
const prevEv=UI.ev;
UI.ev=(n,...a)=>{prevEv&&prevEv(n,...a);if(n==='profile')renderModel(a[0])};

/* ---------- handbook panel ---------- */
stage.insertAdjacentHTML('beforeend','<div id="pbook" class="u2m ui2"><div class="u2p" id="pbpanel" role="dialog"></div></div>');
let tab='stages';
function stageCard(id,p,extra=''){
  const st=stepOf(id);
  return `<div class="pbcard ${id==='inc'?'inc':''}"><div class="ic">${st?st.icon:'🚨'}</div><div><h4>${p.n==='!'?'':p.n+'. '}${p.title}${p.derived?' *':''}</h4>
    <div class="mrow">${badges(p.m)}</div><div class="wh">📍 ${p.where}</div><div class="tp">💡 ${p.tip}</div>${st?`<div class="who">${L('Mèo phụ trách','Cat in charge')}: ${st.who.name} · ${T(st.name)}</div>`:`<div class="who">${L('Áp dụng cho bước Điều tra khi có sự cố','Applies to the Investigate step when an incident hits')}</div>`}</div></div>`;
}
function renderPanel(){
  const p=$('pbpanel');
  const tabs=[['stages','🧭 '+L('Theo giai đoạn','By stage')],['save','🪙 '+L('6 cách giảm hao token','6 ways to save tokens')],['flow','🔁 '+L('Quy trình mẫu','Sample flow')]];
  let body='';
  if(tab==='stages'){
    const order=['ba','inv','dev','rev','docs','git','ops','qa'];
    body=order.map(id=>stageCard(id,PB[id])).join('')+stageCard('inc',INC)+`<div class="pbnote">* ${L('Push không có hàng riêng trong bảng; tôi xếp theo hàng Deploy (cơ học).','Push has no row of its own in the table; it follows the Deploy row (mechanical).')}</div>`;
  }else if(tab==='save'){
    body=SAVE.map(([h,d],i)=>`<div class="pbcard"><div class="ic"><span class="num">${i+1}</span></div><div><h4>${h}</h4><div class="tp">${d}</div></div></div>`).join('')+`<div class="pbnote">${L('Xếp theo mức hiệu quả, cách hiệu quả nhất ở trên cùng.','Ordered by impact, the most effective first.')}</div>`;
  }else{
    body=`<div class="flow">${FLOW.map(([k,t],i)=>(i?'<div class="ar">↓</div>':'')+`<div class="fs"><span class="mb ${k}">${MODEL[k]}</span><span>${t}</span></div>`).join('')}</div>`;
  }
  p.innerHTML=`<button class="x" type="button" id="pbx" aria-label="${L('Đóng','Close')}">✕</button><h3>📖 ${L('Cẩm nang model theo giai đoạn','Model handbook by stage')}</h3>
    <div class="lead">${PRINCIPLE}</div><div class="seg tabs">${tabs.map(([k,l])=>`<button type="button" data-t="${k}" class="${k===tab?'on':''}">${l}</button>`).join('')}</div>${body}`;
  $('pbx').onclick=close;
  p.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>{tab=b.dataset.t;renderPanel()});
}
function open(t){if(t)tab=t;document.querySelectorAll('.u2m.on').forEach(m=>m.classList.remove('on'));$('settings').classList.remove('on');renderPanel();$('pbook').classList.add('on');$('pbpanel').scrollTop=0}
function close(){$('pbook').classList.remove('on')}
$('pbook').addEventListener('click',e=>{if(e.target===$('pbook'))close()});

// entry points: Settings row, B key
const btn=document.createElement('button');btn.type='button';btn.className='pill';btn.id='pbbtn';btn.textContent='📖 '+L('Cẩm nang model','Model handbook');
$('keysbtn').before(btn);btn.onclick=()=>open('stages');
addEventListener('keydown',e=>{
  if(e.ctrlKey||e.metaKey||e.altKey)return;const t=e.target;
  if(e.key==='Escape'&&$('pbook').classList.contains('on')){close();return}
  if(!/^[bB]$/.test(e.key)||(t&&(/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)||t.isContentEditable))||document.body.classList.contains('onmap')||document.querySelector('.u2m.on,#tour.on'))return;
  open('stages')});

/* ---------- incident cards get a model hint ---------- */
function tagIncident(card){
  if(!card)return;const p=document.createElement('p');p.className='mtip';
  p.innerHTML=`🧠 ${L('Gợi ý','Hint')}: ${badges(INC.m)} · ${INC.where}`;
  const h=card.querySelector('h3');h&&h.after(p);
}

/* ---------- Mr Know-It-All ---------- */
const KEYS={ba:['understand','hieu bai','nhan req','ticket'],inv:['investigate','truy an','phan tich','thiet ke','adr','explore'],dev:['code','viet code','lap trinh'],
  docs:['docs','tai lieu','viet sach','update docs'],rev:['review','soi loi'],git:['push','day len'],ops:['deploy','phong'],qa:['verify','kiem tra','test','playwright','har','probe']};
const line=id=>{const p=id==='inc'?INC:PB[id];if(!p)return '';return `🧠 ${L('Model gợi ý','Suggested model')}: ${plain(p.m)}\n📍 ${p.where}\n💡 ${p.tip}`};
function answer(q){
  if(!/\b(model|models|opus|sonnet|haiku|effort|token|tokens|tiet kiem|hao token|chi phi|cam nang|playbook)\b/.test(q))return null;
  if(/\b(incident|su co|oom|502|429)\b/.test(q))return `${INC.title}\n${line('inc')}`;
  for(const id of Object.keys(KEYS))if(KEYS[id].some(k=>new RegExp('(^|[^a-z0-9])'+k+'([^a-z0-9]|$)').test(q)))return `${PB[id].n}. ${PB[id].title}\n${line(id)}`;
  for(const s of STEPS)if((s.who.name+' '+s.who.en).toLowerCase().split(' ').some(tk=>tk.length>1&&new RegExp('(^|[^a-z0-9])'+norm(tk)+'([^a-z0-9]|$)').test(q)))return `${s.who.name}: ${plain(PB[s.id].m)}\n${line(s.id)}`;
  if(/\b(token|tokens|tiet kiem|hao token|chi phi)\b/.test(q))return SAVE.map(([h],i)=>`${i+1}. ${h}`).join('\n')+'\n'+L('Chi tiết: ⚙️ → Cẩm nang model, hoặc phím B.','Details: ⚙️ → Model handbook, or press B.');
  return PRINCIPLE+'\n'+['ba','inv','dev','rev','docs','ops','qa'].map(id=>`${PB[id].n}. ${stepOf(id).who.name}: ${plain(PB[id].m)}`).join('\n')+'\n'+L('Chi tiết: ⚙️ → Cẩm nang model, hoặc phím B.','Details: ⚙️ → Model handbook, or press B.');
}
window.PLAYBOOK={short:id=>{const p=PB[id];return p?p.m.map(x=>MODEL[x.k]+(x.e?'·'+x.e.replace(/^effort /,''):'')).slice(0,2).join(' / '):''},line,answer,tagIncident,open};
})();

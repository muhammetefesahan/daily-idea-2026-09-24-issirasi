(function () {
  'use strict';
  const C = window.IsSirasiCore;
  const rows = document.querySelector('#rows');
  const error = document.querySelector('#error');
  const results = document.querySelector('#results');
  const timeline = document.querySelector('#timeline');
  const reportBox = document.querySelector('#report');
  let current = null;
  const sample = [
    {id:'A',name:'Ölçü al',duration:20,needs:''},
    {id:'B',name:'Malzemeyi hazırla',duration:30,needs:'A'},
    {id:'C',name:'Alanı koru',duration:15,needs:'A'},
    {id:'D',name:'Kurulumu yap',duration:45,needs:'B,C'},
    {id:'E',name:'Son kontrol',duration:10,needs:'D'}
  ];
  function makeInput(label, value, type) { const input = document.createElement('input'); input.setAttribute('aria-label',label); input.type=type||'text'; input.value=value||''; if(type==='number'){input.min='1';input.max='1440';input.step='1';} return input; }
  function addRow(task) {
    const tr = document.createElement('tr');
    const fields = [makeInput('Kısa kod',task.id),makeInput('İş adı',task.name),makeInput('Dakika',task.duration,'number'),makeInput('Önce biten kodlar',task.needs)];
    fields.forEach(input=>{ const td=document.createElement('td'); td.appendChild(input); tr.appendChild(td); });
    const td=document.createElement('td'); const button=document.createElement('button'); button.type='button'; button.className='remove'; button.textContent='Sil'; button.setAttribute('aria-label','Bu işi sil'); button.addEventListener('click',()=>{tr.remove();results.classList.add('hidden');}); td.appendChild(button); tr.appendChild(td); rows.appendChild(tr);
  }
  function data() { return Array.from(rows.querySelectorAll('tr')).map(tr=>{const v=Array.from(tr.querySelectorAll('input')).map(e=>e.value);return{id:v[0],name:v[1],duration:v[2],needs:v[3]};}); }
  function render(plan) {
    current=plan; reportBox.classList.add('hidden'); reportBox.value='';
    document.querySelector('#total').textContent=C.formatMinutes(plan.total);
    document.querySelector('#work').textContent=C.formatMinutes(plan.work);
    document.querySelector('#saved').textContent=C.formatMinutes(plan.saved);
    document.querySelector('#critical').textContent='En uzun zorunlu yol: '+plan.criticalPath.join(' → ');
    document.querySelector('#note').textContent=plan.note;
    timeline.innerHTML='';
    plan.tasks.forEach(task=>{const card=document.createElement('article'); card.className='task'; const head=document.createElement('div');head.className='task-head';const code=document.createElement('b');code.textContent=task.id;const title=document.createElement('strong');title.textContent=task.name;head.append(code,title);const meta=document.createElement('p');meta.textContent=C.formatMinutes(task.start)+' başlar · '+C.formatMinutes(task.end)+' biter · Önce: '+(task.needs.join(', ')||'yok');const bar=document.createElement('div');bar.className='track';const fill=document.createElement('span');fill.style.marginLeft=(task.start/plan.total*100)+'%';fill.style.width=(task.duration/plan.total*100)+'%';bar.appendChild(fill);card.append(head,meta,bar);timeline.appendChild(card);});
    results.classList.remove('hidden');results.scrollIntoView({behavior:'smooth',block:'start'});
  }
  document.querySelector('#sample').addEventListener('click',()=>{rows.innerHTML='';sample.forEach(addRow);error.textContent='';results.classList.add('hidden');});
  document.querySelector('#add').addEventListener('click',()=>{if(rows.children.length>=C.MAX_TASKS){error.textContent='En fazla 40 iş ekleyebilirim.';return;} addRow({id:'',name:'',duration:'',needs:''});});
  document.querySelector('#calculate').addEventListener('click',()=>{const plan=C.plan(data());if(!plan.ok){error.textContent=plan.error;results.classList.add('hidden');return;}error.textContent='';render(plan);});
  document.querySelector('#copy').addEventListener('click',async e=>{if(!current)return;const text=C.report(current);reportBox.value=text;reportBox.classList.remove('hidden');try{await navigator.clipboard.writeText(text);e.target.textContent='Gösterdim ve kopyaladım ✓';}catch(_){e.target.textContent='Planı aşağıda gösterdim';}setTimeout(()=>{e.target.textContent='Planı göster ve kopyala';},1800);});
  addRow({id:'A',name:'',duration:'',needs:''});
})();

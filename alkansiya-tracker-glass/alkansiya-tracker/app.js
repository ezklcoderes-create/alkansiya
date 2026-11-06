const $ = (id) => document.getElementById(id);
const STORAGE_KEY = "alkansiya-tracker-v1";
const today = new Date().toISOString().slice(0,10);
let state = loadState();
let activeProfile = "family";

function loadState(){
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if(saved && saved.profiles) return saved;
  } catch(e) {}
  return {profiles:{
    family:{transactions:[],goals:[]},
    personal:{transactions:[],goals:[]}
  }};
}
function saveState(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}
function wallet(){return state.profiles[activeProfile];}
function money(value){return new Intl.NumberFormat("en-PH",{style:"currency",currency:"PHP"}).format(value||0);}
function dateLabel(value){return new Date(value+"T00:00:00").toLocaleDateString("en-PH",{month:"short",day:"numeric",year:"numeric"});}
function totals(){
  const tx=wallet().transactions;
  const deposits=tx.filter(t=>t.type==="deposit").reduce((s,t)=>s+t.amount,0);
  const withdrawals=tx.filter(t=>t.type==="withdrawal").reduce((s,t)=>s+t.amount,0);
  return {deposits,withdrawals,balance:deposits-withdrawals};
}
function render(){
  const t=totals(), goals=wallet().goals;
  $("activeProfileName").textContent=activeProfile==="family"?"Family Wallet":"Personal Wallet";
  $("totalBalance").textContent=money(t.balance);
  $("totalDeposits").textContent=money(t.deposits);
  $("totalWithdrawals").textContent=money(t.withdrawals);
  $("activeGoals").textContent=goals.filter(g=>g.saved<g.target).length;
  renderChart();renderGoals();renderTransactions();
}
function renderChart(){
  const days=Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()-(6-i));return d.toISOString().slice(0,10);});
  const vals=days.map(day=>wallet().transactions.filter(t=>t.type==="deposit"&&t.date===day).reduce((s,t)=>s+t.amount,0));
  const max=Math.max(...vals,1);
  $("weeklyChart").innerHTML=vals.some(v=>v>0)?days.map((d,i)=>`<div class="chart-col"><div class="bar-track"><div class="bar" title="${money(vals[i])}" style="height:${Math.max(vals[i]/max*100,3)}%"></div></div><small>${new Date(d+"T00:00:00").toLocaleDateString("en",{weekday:"short"})}</small></div>`).join(""):`<div class="empty-chart">Add deposits to see your activity.</div>`;
}
function renderGoals(){
  const el=$("goalsList"), goals=wallet().goals;
  if(!goals.length){el.innerHTML='<p class="muted">No goals yet. Create one to start tracking your progress.</p>';return;}
  el.innerHTML=goals.map(g=>{const pct=Math.min(100,Math.round(g.saved/g.target*100));return `<article class="goal-card"><h4>${escapeHtml(g.name)}</h4><div class="goal-amount">${money(g.saved)} <span style="color:#9aaba4">of ${money(g.target)}</span></div><div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div><div class="goal-meta"><span>${pct}% completed</span><span>${money(Math.max(0,g.target-g.saved))} to go</span></div></article>`;}).join("");
}
function renderTransactions(){
  const filter=$("transactionFilter").value;
  const tx=[...wallet().transactions].filter(t=>filter==="all"||t.type===filter).sort((a,b)=>b.date.localeCompare(a.date)||b.created-b.created);
  $("transactionsBody").innerHTML=tx.length?tx.map(t=>`<tr><td>${escapeHtml(t.description)}</td><td>${dateLabel(t.date)}</td><td><span class="type-pill ${t.type}">${t.type==="deposit"?"Deposit":"Withdrawal"}</span></td><td class="right ${t.type==="deposit"?"amount-in":"amount-out"}">${t.type==="deposit"?"+":"−"}${money(t.amount)}</td></tr>`).join(""):'<tr><td colspan="4" class="empty-row">No transactions found.</td></tr>';
}
function escapeHtml(str){return String(str).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function openTransaction(type="deposit"){
  $("transactionForm").reset();$("transactionType").value=type;$("transactionDate").value=today;$("transactionError").textContent="";
  $("transactionModalTitle").textContent=type==="deposit"?"Add savings":"Withdraw money";
  $("transactionDialog").showModal();
}
$("todayLabel").textContent=new Date().toLocaleDateString("en-PH",{weekday:"short",month:"short",day:"numeric"});
$("profileSelect").addEventListener("change",e=>{activeProfile=e.target.value;render();});
$("quickAddBtn").addEventListener("click",()=>openTransaction());
document.querySelectorAll("[data-type]").forEach(btn=>btn.addEventListener("click",()=>openTransaction(btn.dataset.type)));
$("transactionFilter").addEventListener("change",renderTransactions);
$("transactionForm").addEventListener("submit",e=>{
  e.preventDefault();
  const type=$("transactionType").value,description=$("transactionDescription").value.trim(),amount=Number($("transactionAmount").value),date=$("transactionDate").value;
  const error=$("transactionError");
  if(!description||!date||!Number.isFinite(amount)||amount<=0){error.textContent="Please enter a description, valid date, and amount greater than zero.";return;}
  if(type==="withdrawal"&&amount>totals().balance){error.textContent="Insufficient balance. Your current balance is "+money(totals().balance)+".";return;}
  wallet().transactions.push({id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),type,description,amount,date,created:Date.now()});
  saveState();$("transactionDialog").close();render();
});
$("addGoalBtn").addEventListener("click",()=>{$("goalForm").reset();$("goalSaved").value="0";$("goalError").textContent="";$("goalDialog").showModal();});
$("goalForm").addEventListener("submit",e=>{
  e.preventDefault();const name=$("goalName").value.trim(),target=Number($("goalTarget").value),saved=Number($("goalSaved").value),error=$("goalError");
  if(!name||!Number.isFinite(target)||target<=0||!Number.isFinite(saved)||saved<0){error.textContent="Please enter a name, a target above zero, and a valid starting amount.";return;}
  if(saved>target){error.textContent="Starting amount cannot be greater than the target.";return;}
  wallet().goals.push({id:Date.now(),name,target,saved});saveState();$("goalDialog").close();render();
});
document.querySelectorAll("[data-close]").forEach(btn=>btn.addEventListener("click",()=>$(btn.dataset.close).close()));
[ $("transactionDialog"),$("goalDialog") ].forEach(dialog=>dialog.addEventListener("click",e=>{if(e.target===dialog)dialog.close();}));
render();

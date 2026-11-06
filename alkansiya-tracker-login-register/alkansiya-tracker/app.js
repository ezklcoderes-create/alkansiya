const $ = (id) => document.getElementById(id);
const USERS_KEY = "alkansiya-users-v1";
const SESSION_KEY = "alkansiya-session-v1";
const today = new Date().toISOString().slice(0,10);
let activeUser = null;
let state = null;
let activeProfile = "family";
let authMode = "login";

function getUsers(){try{return JSON.parse(localStorage.getItem(USERS_KEY))||[];}catch(e){return [];}}
function saveUsers(users){localStorage.setItem(USERS_KEY,JSON.stringify(users));}
function walletKey(){return "alkansiya-tracker-v1-"+activeUser.email.toLowerCase();}
function loadState(){
  try{const saved=JSON.parse(localStorage.getItem(walletKey()));if(saved&&saved.profiles)return saved;}catch(e){}
  return {profiles:{family:{transactions:[],goals:[]},personal:{transactions:[],goals:[]}}};
}
function saveState(){localStorage.setItem(walletKey(),JSON.stringify(state));}
function money(value){return new Intl.NumberFormat("en-PH",{style:"currency",currency:"PHP"}).format(value||0);}
function dateLabel(value){return new Date(value+"T00:00:00").toLocaleDateString("en-PH",{month:"short",day:"numeric",year:"numeric"});}
function escapeHtml(str){return String(str).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function wallet(){return state.profiles[activeProfile];}
function totals(){const tx=wallet().transactions;const deposits=tx.filter(t=>t.type==="deposit").reduce((s,t)=>s+t.amount,0);const withdrawals=tx.filter(t=>t.type==="withdrawal").reduce((s,t)=>s+t.amount,0);return {deposits,withdrawals,balance:deposits-withdrawals};}

/* Passwords are hashed with PBKDF2 before saving in this browser. */
function toBase64(bytes){return btoa(String.fromCharCode(...new Uint8Array(bytes)));}
async function hashPassword(password,saltText){
  const enc=new TextEncoder(),salt=saltText?Uint8Array.from(atob(saltText),c=>c.charCodeAt(0)):crypto.getRandomValues(new Uint8Array(16));
  const key=await crypto.subtle.importKey("raw",enc.encode(password),"PBKDF2",false,["deriveBits"]);
  const bits=await crypto.subtle.deriveBits({name:"PBKDF2",salt,iterations:150000,hash:"SHA-256"},key,256);
  return {salt:toBase64(salt),hash:toBase64(bits)};
}
function showAuth(mode="login"){
  authMode=mode;
  $("authScreen").hidden=false;$("appShell").hidden=true;
  $("loginTab").classList.toggle("selected",mode==="login");$("registerTab").classList.toggle("selected",mode==="register");
  $("nameField").hidden=mode!=="register";$("confirmField").hidden=mode!=="register";
  $("authHeading").textContent=mode==="login"?"Welcome back!":"Create your account";
  $("authSubheading").textContent=mode==="login"?"Log in to continue tracking your savings.":"Register to start your personal savings tracker.";
  $("authSubmit").textContent=mode==="login"?"Log in":"Create account";
  $("accountPassword").autocomplete=mode==="login"?"current-password":"new-password";
  $("authError").textContent="";$("authForm").reset();
}
function enterApp(user){
  activeUser=user;state=loadState();
  $("authScreen").hidden=true;$("appShell").hidden=false;
  $("todayLabel").textContent=new Date().toLocaleDateString("en-PH",{weekday:"short",month:"short",day:"numeric"});
  $("profileSelect").value="family";activeProfile="family";
  render();
}
async function handleAuth(e){
  e.preventDefault();const email=$("accountEmail").value.trim().toLowerCase(),password=$("accountPassword").value,error=$("authError");
  error.textContent="";
  if(!email||password.length<8){error.textContent="Enter a valid email and a password with at least 8 characters.";return;}
  $("authSubmit").disabled=true;$("authSubmit").textContent="Please wait...";
  try{
    const users=getUsers();let user;
    if(authMode==="register"){
      const name=$("accountName").value.trim(),confirm=$("confirmPassword").value;
      if(!name){error.textContent="Please enter your name.";return;}
      if(password!==confirm){error.textContent="Passwords do not match.";return;}
      if(users.some(u=>u.email===email)){error.textContent="An account with this email already exists. Please log in.";return;}
      const credentials=await hashPassword(password);
      user={email,name,...credentials};users.push(user);saveUsers(users);
    }else{
      user=users.find(u=>u.email===email);
      if(!user){error.textContent="Account not found. Please register first.";return;}
      const credentials=await hashPassword(password,user.salt);
      if(credentials.hash!==user.hash){error.textContent="Incorrect email or password.";return;}
    }
    localStorage.setItem(SESSION_KEY,JSON.stringify({email:user.email}));
    enterApp(user);
  }catch(err){error.textContent="Unable to create or verify account in this browser. Please try again.";}
  finally{$("authSubmit").disabled=false;$("authSubmit").textContent=authMode==="login"?"Log in":"Create account";}
}
$("loginTab").addEventListener("click",()=>showAuth("login"));
$("registerTab").addEventListener("click",()=>showAuth("register"));
$("authForm").addEventListener("submit",handleAuth);
$("logoutBtn").addEventListener("click",()=>{localStorage.removeItem(SESSION_KEY);activeUser=null;state=null;showAuth("login");});

function render(){
  const t=totals(),goals=wallet().goals;
  $("activeProfileName").textContent=activeProfile==="family"?"Family Wallet":"Personal Wallet";
  $("totalBalance").textContent=money(t.balance);$("totalDeposits").textContent=money(t.deposits);$("totalWithdrawals").textContent=money(t.withdrawals);
  $("activeGoals").textContent=goals.filter(g=>g.saved<g.target).length;
  renderChart();renderGoals();renderTransactions();
}
function renderChart(){
  const days=Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()-(6-i));return d.toISOString().slice(0,10);});
  const vals=days.map(day=>wallet().transactions.filter(t=>t.type==="deposit"&&t.date===day).reduce((s,t)=>s+t.amount,0)),max=Math.max(...vals,1);
  $("weeklyChart").innerHTML=vals.some(v=>v>0)?days.map((d,i)=>`<div class="chart-col"><div class="bar-track"><div class="bar" title="${money(vals[i])}" style="height:${Math.max(vals[i]/max*100,3)}%"></div></div><small>${new Date(d+"T00:00:00").toLocaleDateString("en",{weekday:"short"})}</small></div>`).join(""):`<div class="empty-chart">Add deposits to see your activity.</div>`;
}
function renderGoals(){
  const el=$("goalsList"),goals=wallet().goals;
  if(!goals.length){el.innerHTML='<p class="muted">No goals yet. Create one to start tracking your progress.</p>';return;}
  el.innerHTML=goals.map(g=>{const pct=Math.min(100,Math.round(g.saved/g.target*100));return `<article class="goal-card"><h4>${escapeHtml(g.name)}</h4><div class="goal-amount">${money(g.saved)} <span style="color:#9aaba4">of ${money(g.target)}</span></div><div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div><div class="goal-meta"><span>${pct}% completed</span><span>${money(Math.max(0,g.target-g.saved))} to go</span></div></article>`;}).join("");
}
function renderTransactions(){
  const filter=$("transactionFilter").value,tx=[...wallet().transactions].filter(t=>filter==="all"||t.type===filter).sort((a,b)=>b.date.localeCompare(a.date)||b.created-a.created);
  $("transactionsBody").innerHTML=tx.length?tx.map(t=>`<tr><td>${escapeHtml(t.description)}</td><td>${dateLabel(t.date)}</td><td><span class="type-pill ${t.type}">${t.type==="deposit"?"Deposit":"Withdrawal"}</span></td><td class="right ${t.type==="deposit"?"amount-in":"amount-out"}">${t.type==="deposit"?"+":"−"}${money(t.amount)}</td></tr>`).join(""):'<tr><td colspan="4" class="empty-row">No transactions found.</td></tr>';
}
function openTransaction(type="deposit"){
  $("transactionForm").reset();$("transactionType").value=type;$("transactionDate").value=today;$("transactionError").textContent="";
  $("transactionModalTitle").textContent=type==="deposit"?"Add savings":"Withdraw money";$("transactionDialog").showModal();
}
$("profileSelect").addEventListener("change",e=>{activeProfile=e.target.value;render();});
$("quickAddBtn").addEventListener("click",()=>openTransaction());
document.querySelectorAll("[data-type]").forEach(btn=>btn.addEventListener("click",()=>openTransaction(btn.dataset.type)));
$("transactionFilter").addEventListener("change",renderTransactions);
$("transactionForm").addEventListener("submit",e=>{
  e.preventDefault();const type=$("transactionType").value,description=$("transactionDescription").value.trim(),amount=Number($("transactionAmount").value),date=$("transactionDate").value,error=$("transactionError");
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
[$("transactionDialog"),$("goalDialog")].forEach(dialog=>dialog.addEventListener("click",e=>{if(e.target===dialog)dialog.close();}));

/* Restore a signed-in session on refresh in this browser. */
try{
  const session=JSON.parse(localStorage.getItem(SESSION_KEY)||"null");
  const user=session&&getUsers().find(u=>u.email===session.email);
  if(user)enterApp(user);else showAuth("login");
}catch(e){showAuth("login");}

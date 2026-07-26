const DNAMES = R.map(r=>r.n);
// ALL_EMOJI for ingredients/seasonings
const ALL_E = {
  "猪肉":"🥩","五花肉":"🍖","排骨":"🍖","牛肉":"🥩","鸡腿":"🍗","鸡翅":"🐔","鸡胸":"🐔",
  "鸡蛋":"🥚","鱼肉":"🐟","虾仁":"🦐","花生":"🥜",
  "番茄":"🍅","土豆":"🥔","白菜":"🥬","青椒":"🌶","洋葱":"🧅","茄子":"🍆","黄瓜":"🥒",
  "胡萝卜":"🥕","白萝卜":"🥕","冬瓜":"🍈","南瓜":"🎃","菠菜":"🥬","生菜":"🥬","豆芽":"🌱",
  "西兰花":"🥦","香菇":"🍄","木耳":"🍄","豆腐":"🧊","苦瓜":"🥒","韭菜":"🌿","蒜苔":"🌿",
  "莲藕":"🥬","山药":"🥔","面条":"🍜","米饭":"🍚","豆角":"🥬","紫菜":"🌊","玉米":"🌽",
  "盐":"🧂","糖":"🍬","酱油":"🧂","醋":"🍶","料酒":"🍶","豆瓣酱":"🌶","蚝油":"🧂",
  "胡椒粉":"🌶","辣椒":"🌶","花椒":"🌶","蒜":"🧄","姜":"🌿","葱":"🧅","淀粉":"🌾","鸡精":"🧂",
  "番茄酱":"🥫",
};
const CW = ["炒锅","煎锅","蒸锅"];
const MTH = ["炒","炸","爆","熘","炖","煮"];
// 食材虚空购买价格表
const IG_PRICE = {
  // 调料/配料/主食：¥2/30次（廉价大包装）
  '盐':2,'糖':2,'酱油':2,'醋':2,'料酒':2,
  '豆瓣酱':2,'蚝油':2,'番茄酱':2,'胡椒粉':2,'鸡精':2,'淀粉':2,
  '辣椒':2,'花椒':2,'蒜':2,'姜':2,'葱':2,
  '面条':2,'米饭':2,
  // 基础食材 ¥8/5次
  '鸡蛋':8,'豆腐':8,'豆芽':8,'花生':8,'紫菜':8,
  '菠菜':8,'生菜':8,'苦瓜':8,'韭菜':8,'香菇':8,
  // 中级食材 ¥12/5次
  '番茄':12,'土豆':12,'白菜':12,'青椒':12,'洋葱':12,'茄子':12,
  '黄瓜':12,'胡萝卜':12,'白萝卜':12,'冬瓜':12,'南瓜':12,
  '木耳':12,'西兰花':12,'蒜苔':12,'莲藕':12,'豆角':12,'山药':12,
  '鸡翅':12,'鸡胸':12,
  // 高级食材 ¥20/5次
  '猪肉':20,'鸡腿':20,'虾仁':20,'鱼肉':20,
  // 顶级食材 ¥30/5次
  '牛肉':30,'排骨':30,'五花肉':30,'羊肉':30,
};
// 大包装食材：每次补货给30次使用（调料/配料/主食）
const BULK_ITEMS = new Set(['盐','糖','酱油','醋','料酒','豆瓣酱','蚝油','番茄酱','胡椒粉','鸡精','淀粉','辣椒','花椒','蒜','姜','葱','面条','米饭']);
const IG_QTY = name => BULK_ITEMS.has(name) ? 30 : 5;

// ===== State =====
let orders=[], served=[], selOrder=null, completed=0, failed=0, revenue=0, session=false;
let bizTimer=null, remain=0, doneToday=0, nextId=1, selStove=null;
let day=1, totalDays=0, totalRevenue=50, totalCompleted=0;
let completedDishes=[], unlockedAchv={};
let stock={};
// ===== 农场系统 =====
// 食材等级倍率（农仓食材每单位对应使用次数）
const TIER_MULT = [0, 3, 4, 5, 6]; // tier 1→×3, 2→×4, 3→×5, 4→×6
// 收获时间分级: 4h / 8h / 12h / 24h
// tier 按食材在菜谱中最高难度星数划定
const CROPS_DATA = [
  // Tier 1 (4h) — 出现在 s:2 菜谱的基础食材
  {id:'韭菜',emoji:'🌿',tier:1,growMins:5,yieldMin:3,yieldMax:6,cost:3,unlock:1},
  {id:'白萝卜',emoji:'🥕',tier:1,growMins:5,yieldMin:3,yieldMax:6,cost:3,unlock:1},
  {id:'玉米',emoji:'🌽',tier:1,growMins:5,yieldMin:3,yieldMax:6,cost:3,unlock:1},
  // Tier 2 (8h) — 出现在 s:4 菜谱
  {id:'白菜',emoji:'🥬',tier:2,growMins:10,yieldMin:3,yieldMax:5,cost:4,unlock:1},
  {id:'黄瓜',emoji:'🥒',tier:2,growMins:10,yieldMin:3,yieldMax:5,cost:4,unlock:1},
  {id:'茄子',emoji:'🍆',tier:2,growMins:10,yieldMin:2,yieldMax:4,cost:5,unlock:3},
  {id:'南瓜',emoji:'🎃',tier:2,growMins:10,yieldMin:2,yieldMax:4,cost:6,unlock:3},
  // Tier 3 (12h) — 出现在 s:6 菜谱
  {id:'青椒',emoji:'🌶',tier:3,growMins:20,yieldMin:2,yieldMax:4,cost:5,unlock:3},
  {id:'胡萝卜',emoji:'🥕',tier:3,growMins:20,yieldMin:2,yieldMax:4,cost:5,unlock:3},
  {id:'洋葱',emoji:'🧅',tier:3,growMins:20,yieldMin:2,yieldMax:3,cost:6,unlock:5},
  {id:'草莓',emoji:'🍓',tier:3,growMins:20,yieldMin:2,yieldMax:3,cost:8,unlock:5},
  // Tier 4 (24h) — 出现在 s:8 菜谱的顶级食材
  {id:'番茄',emoji:'🍅',tier:4,growMins:40,yieldMin:1,yieldMax:3,cost:6,unlock:5},
  {id:'土豆',emoji:'🥔',tier:4,growMins:40,yieldMin:1,yieldMax:3,cost:7,unlock:7},
];
let farmInventory={};
let farmPlots=Array(25).fill(null).map(()=>({crop:null,plantedAt:null,growTime:0}));
let farmSeeds={};
let unlockedPlots=6;
let activeTab='kitchen';
let farmTimerId=null;
// 食材使用次数系统：农仓食材每单位 ×N 次，虚空购买每单位 1 次
let ingredientUses={}; // 总剩余使用次数（做菜消耗这个）
let farmUses={}; // 农场的剩余使用次数（用于跟踪 farmInventory 何时耗尽）
let seedSelected=null; // 种子袋中选中的种子
let currentEvent=null;
let eventDayCount=0;
let lastBizHour=-1; // 上次营业的小时（0-23），-1=从未营业
// 菜板系统：需要切的食材及份数
const CUT_ITEMS={"番茄":3,"青椒":3,"黄瓜":3,"洋葱":3,"土豆":3,"白菜":3,"茄子":3,"西兰花":3,"豆角":3,"胡萝卜":3,"冬瓜":3,"莲藕":3,"山药":3,"蒜苔":3,"白萝卜":3,"南瓜":3};
let cutBoard={name:null,need:0,done:0}; // 菜板状态
let boardSelected=false; // 菜板是否被选中
let stoveChopped={}; // {灶id: {食材名:true}} 记录每个炉灶中已切的食材
let coldChopped={}; // 记录凉拌碗中已切的食材 {食材名:true}
const stoves=[{id:1,cw:null,mt:null,ig:[],st:'idle',tid:null,rem:0,tot:0,dish:null}];
const coldBowl={ig:[],sel:false};

// ===== 厨师等级系统 =====
// 等级阈值：累计完成数→等级（比之前翻倍，减缓升级节奏）
const LV_TH = [0,5,12,22,35,50,68,88,110,135]; // 累计完成数→等级
const LV_NAMES = ['帮厨','学徒','厨工','初级厨师','中级厨师','高级厨师','厨师长','主厨','行政主厨','厨神'];
function getLv() { let i; for(i=LV_TH.length-1;i>=0;i--) if(totalCompleted>=LV_TH[i]) break; return i+1; }
function getLvMaxStars() { const l=getLv(); if(l>=7) return 8; if(l>=5) return 6; if(l>=3) return 4; return 2; }
function getLvNext() { const l=getLv(); return l<10?LV_TH[l]:-1; }
function getLvProgress() { const l=getLv(), cur=LV_TH[l-1]||0, next=LV_TH[l]||0; const p=next-cur; return p>0?Math.min(100,(totalCompleted-cur)/p*100):100; }

// Load save - enhanced with timestamp
try{const s=JSON.parse(localStorage.getItem('foodtruck'));if(s){totalDays=s.d||0;totalRevenue=s.r||0;totalCompleted=s.c||0;completedDishes=s.cd||[];unlockedAchv=s.ua||{};stock=s.sk||{};farmInventory=s.fi||{};farmPlots=s.fp||Array(25).fill(null).map(()=>({crop:null,plantedAt:null,growTime:0}));farmSeeds=s.fs||{};unlockedPlots=s.up||6;ingredientUses=s.iu||{};farmUses=s.fu||{};lastBizHour=s.bh!==undefined?s.bh:-1;day=totalDays||1;
// 暂存事件ID字符串（EVENTS定义在后面，renderEvent解析）
window._savedEventId=s.ev||null;
eventDayCount=s.ed||0;
// 新玩家保护：确保初始资金不低于50
if(totalDays===0&&totalRevenue<50)totalRevenue=50;
// 离线收益计算
const lastT=s.t||0;const offline=lastT?Math.floor((Date.now()-lastT)/1000):0;
if(offline>10){
  let mature=0;
  farmPlots.forEach(p=>{
    if(p.crop&&p.plantedAt&&Date.now()-p.plantedAt>=p.growTime)mature++;
  });
  if(mature>0)setTimeout(()=>toast('🎉',`欢迎回来！离开了 ${(offline/3600).toFixed(1)} 小时，${mature} 颗作物已成熟！`),500);
  else if(offline>3600)setTimeout(()=>toast('👋',`欢迎回来！离开了 ${(offline/3600).toFixed(1)} 小时`),500);
}
updateDay();renderAchv();renderFarmInv();}}catch(e){}if(!farmSeeds['白萝卜'])farmSeeds['白萝卜']=5;
// Auto-save every 10s
setInterval(()=>{updateBizBtn();
  if(!session&&totalDays===0)return;
  const data={d:totalDays,r:totalRevenue,c:totalCompleted,cd:completedDishes,ua:unlockedAchv,sk:stock,fi:farmInventory,fp:farmPlots,fs:farmSeeds,up:unlockedPlots,iu:ingredientUses,fu:farmUses,bh:lastBizHour,ev:currentEvent?currentEvent.id:null,ed:eventDayCount,t:Date.now()};
  try{localStorage.setItem('foodtruck',JSON.stringify(data));}catch(e){}
},10000);

// ===== 音效系统 =====
let soundOn=true;
let actx=null;
function initAudio(){if(!actx)actx=new(window.AudioContext||webkitAudioContext)();}
function _sfx(freq,dur,type='sine',vol=.3){
  if(!soundOn)return;initAudio();
  const o=actx.createOscillator(),g=actx.createGain();
  o.type=type;o.frequency.value=freq;
  g.gain.setValueAtTime(vol,actx.currentTime);
  g.gain.exponentialRampToValueAtTime(.001,actx.currentTime+dur);
  o.connect(g);g.connect(actx.destination);
  o.start();o.stop(actx.currentTime+dur);
}
function sndCoin(){_sfx(220,.15,'sine',.3);setTimeout(()=>_sfx(900,.08,'triangle',.15),60);}
function sndDing(){_sfx(1300,.12,'sine',.3);}
function sndAchv(){[523,659,784].forEach((f,i)=>setTimeout(()=>_sfx(f,.2,'sine',.3),i*150));}
function toggleSound(){soundOn=!soundOn;document.getElementById('soundBtn').textContent=soundOn?'🔊':'🔇';}

// DOM
const ol=document.getElementById('ol'), svBox=document.getElementById('svBox'), rcp=document.getElementById('rcp');
const sg=document.getElementById('seasWrap');
const lvD=document.getElementById('lvDisplay');
const moneyD=document.getElementById('moneyD');
const coldEl=document.getElementById('coldBowl'), coldIgs=document.getElementById('coldIgs');
const coldBtn=document.getElementById('coldBtn'), coldClear=document.getElementById('coldClear');
const herbG=document.getElementById('herbsWrap'), meatG=document.getElementById('meatWrap');
const vegG=document.getElementById('vegWrap'), seafoodG=document.getElementById('seafoodWrap');
const eggtofuG=document.getElementById('eggtofuWrap'), stapleG=document.getElementById('stapleWrap');
const sr2=document.getElementById('stovesRow'), td=document.getElementById('timerD');
const sBtn=document.getElementById('statusBtn'), ecBtn=document.getElementById('ecBtn'), oc=document.getElementById('oc');
const tc=document.getElementById('tc'), dd=document.getElementById('dayD');
const cfO=document.getElementById('cfOver'), smO=document.getElementById('smOver');
const logList=document.getElementById('logList');

// Log system
const MAX_LOG=5;
let gameLog=[];

// 调试模式：本地环境显示 debug 按钮
const isDebugEnv = location.hostname==='localhost'||location.protocol==='file:'||location.hostname==='127.0.0.1';

renderIG();
renderBowl();
renderStoves();
renderOrders();
renderServe();
updateDay();
updateBizBtn();
renderEvent(); // 渲染事件横幅
_hideAllModals(); // 页面初始化强制关闭所有弹窗，避免异常常显
// 本地环境显示 debug 按钮
if(isDebugEnv)document.getElementById('dbToggle').style.display='';
// 新玩家欢迎
if(totalDays===0&&totalRevenue===50)setTimeout(()=>toast('💰','欢迎来到餐车！初始资金 ¥50，去农场种菜吧！'),800);

function renderIG(){
  const maxS=getLvMaxStars();
  const unlocked=R.filter(r=>r.s<=maxS);
  const ui=new Set,us=new Set;
  unlocked.forEach(r=>{r.i.forEach(x=>ui.add(x));r.se.forEach(x=>us.add(x));});
  // 确保新解锁的食材有初始 10 次使用（含值为0的旧存档）
  [...ui,...us].forEach(x=>{
    if(!(x in ingredientUses)||ingredientUses[x]<=0){
      ingredientUses[x]=10;
      stock[x]=10;
    }
  });
  const seas=["盐","糖","酱油","醋","料酒","豆瓣酱","蚝油","番茄酱","胡椒粉","鸡精","淀粉"].filter(x=>us.has(x));
  const herbs=["辣椒","花椒","蒜","姜","葱"].filter(x=>us.has(x));
  const meats=["猪肉","牛肉","鸡腿","鸡翅","鸡胸","排骨","五花肉","羊肉"].filter(x=>ui.has(x));
  const vegs=["番茄","土豆","白菜","青椒","洋葱","茄子","黄瓜","胡萝卜","冬瓜","南瓜","菠菜","生菜","豆芽","西兰花","苦瓜","韭菜","蒜苔","莲藕","白萝卜","豆角","山药","玉米"].filter(x=>ui.has(x));
  const seafood=["鱼肉","虾仁"].filter(x=>ui.has(x));
  const eggtofu=["鸡蛋","豆腐","香菇","木耳","紫菜","花生"].filter(x=>ui.has(x));
  const staples=["面条","米饭"].filter(x=>ui.has(x));
  const mk=(items,label)=>items.length?`<div class="szt">${label}</div><div class="igg">${items.map(n=>mkItem(n)).join('')}</div>`:'';
  sg.innerHTML=mk(seas,'🧂 调料');
  herbG.innerHTML=mk(herbs,'🌿 配料');
  meatG.innerHTML=mk(meats,'🥩 肉类');
  vegG.innerHTML=mk(vegs,'🥬 蔬菜');
  seafoodG.innerHTML=mk(seafood,'🦐 海鲜');
  eggtofuG.innerHTML=mk(eggtofu,'🥚 蛋豆菌菇');
  stapleG.innerHTML=mk(staples,'🍚 主食');
}


function mkItem(n){
  const uses=ingredientUses[n]||0;
  const empty=uses<=0;
  const hasFarm=(farmUses[n]||0)>0;
  const qty=IG_QTY(n);
  return `<div class="igb ${empty?'out':''}" onclick="addIng('${n}')" title="${empty?'¥'+(IG_PRICE[n]||5)+'买'+qty+'次':n+' 可用'+uses+'次（¥'+(IG_PRICE[n]||5)+'/'+qty+'次）'}">
    <span class="e">${ALL_E[n]||'🥬'}</span>${n}${hasFarm?`<span class="farm-badge">🌾</span>`:''}${empty?'<br><span style="font-size:.5rem;color:#e74c3c">¥'+(IG_PRICE[n]||5)+'</span>':''}
  </div>`;
}

function updateDay(){
  const lv=getLv();
  lvD.textContent=`Lv.${lv} ${LV_NAMES[lv-1]}`;
  dd.textContent=`第 ${day} 天`;
}

// ===== Start Day =====
function startDay(){
  if(session)return;
  // 检查是否整点后才能再次开店
  if(lastBizHour>=0){
    const curHour=new Date().getHours();
    if(curHour===lastBizHour){
      toast('🔒','整点后才能再次开店');
      return;
    }
  }
  _hideAllModals();
  if(bizTimer){clearInterval(bizTimer);bizTimer=null;}
  totalDays++;day=totalDays;updateDay();
  orders=[];served=[];completed=0;failed=0;revenue=0;doneToday=0;selOrder=null;selStove=null;coldBowl.ig=[];coldBowl.sel=false;boardSelected=false;cutBoard={name:null,need:0,done:0};
  upMoney();renderBowl();
  remain=480;session=true;
  stoves.forEach(s=>{clearInterval(s.tid);s.tid=null;s.st='idle';s.ig=[];s.cw=null;s.mt=null;s.dish=null;s.rem=0;s.tot=0;s.cutState='none';});
  stoveChopped={};coldChopped={};
  sBtn.textContent='🟢 营业中';sBtn.className='hbtn open';ecBtn.style.display='inline-block';
  upH();bizTimer=setInterval(()=>{remain--;upH();if(remain<=0)endDay();},1000);
  renderOrders();renderServe();renderStoves();rcp.innerHTML='<div class="re">点击订单查看食谱</div>';
  addLog('🚀',`第${day}天开门营业！`);
  // 事件触发：每3-5天随机触发
  eventDayCount++;
  if(!currentEvent&&eventDayCount>=3+Math.floor(Math.random()*3)){
    const prev=currentEvent?currentEvent.id:null;
    const pool=EVENTS.filter(e=>e.id!==prev);
    currentEvent=pool[Math.floor(Math.random()*pool.length)];
    eventDayCount=0;
    addLog(currentEvent.emoji,`📅今日事件：${currentEvent.name} — ${currentEvent.desc}`);
    toast(currentEvent.emoji,`📅 ${currentEvent.name}！${currentEvent.desc}`);
  }else if(currentEvent){
    addLog('📅','昨天的场景已结束，一切恢复正常');
    currentEvent=null;
  }
  renderEvent();
  setTimeout(()=>spawnB(),600);
}
function upH(){const m=Math.floor(Math.max(0,remain)/60),s=Math.max(0,remain)%60;td.textContent=`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;td.className='timer'+(remain<=60?' warn':'');}
function updateBizBtn(){
  if(session)return;
  const curHour=new Date().getHours();
  const locked=lastBizHour>=0&&curHour===lastBizHour;
  sBtn.disabled=locked;
  sBtn.textContent=locked?'🔒 等待整点':'🚚 开店';
  sBtn.className='hbtn'+(locked?' closed':'');
}

// ===== Orders =====
function spawnB(){
  if(!session||doneToday>=15)return;
  if(orders.length>=3)return;
  sndDing();spawnO();
  // 30% 概率额外刷新1道（最多3道）
  if(orders.length<3&&Math.random()<0.3){
    setTimeout(()=>{if(session&&orders.length<3&&doneToday<15){sndDing();spawnO();}},400);
  }
}
function spawnO(){
  if(!session||orders.length>=3||doneToday>=15)return;
  const maxS=getLvMaxStars();
  const available=DNAMES.filter(n=>R.find(x=>x.n===n).s<=maxS);
  let name;
  if(currentEvent&&currentEvent.onOrderGen){
    name=currentEvent.onOrderGen(available);
    // 如果返回的是'🤮黑暗料理'，特殊处理
    if(name==='🤮黑暗料理'){
      // 随机取一个可用菜名作黑暗料理
      const fakeName=available.length?available[Math.floor(Math.random()*available.length)]:'番茄炒蛋';
      const r=R.find(x=>x.n===fakeName);
      const to=65+Math.floor(Math.random()*46);
      const o={id:nextId++,dish:'🤮'+fakeName,emoji:'🌀',cat:'黑暗料理',stars:1,ingredients:[...r.i],seasonings:[...r.se],total:to,rem:to,start:Date.now(),st:'waiting',tid:null,price:Math.floor(r.p*0.3),method:r.m,cookware:r.cw,isChaos:true};
      orders.push(o);
      o.tid=setInterval(()=>{try{if(!session)return;o.rem=Math.max(0,o.total-(Date.now()-o.start)/1000);if(o.rem<=0){o.rem=0;clearInterval(o.tid);orderFail(o);}else upO(o);}catch(e){}},200);
      renderOrders();
      requestAnimationFrame(()=>{const el=document.querySelector(`.ord-it[data-id="${o.id}"]`);if(el)el.classList.add('app');});
      return;
    }
  }else{
    name=available[Math.floor(Math.random()*available.length)];
  }
  const r=R.find(x=>x.n===name);
  const to=65+Math.floor(Math.random()*46);
  // 事件效果：网红探店 → 倒计时+40%
  let finalTo=to;
  if(currentEvent&&currentEvent.orderTimeMult)finalTo=Math.round(to*currentEvent.orderTimeMult);
  const o={id:nextId++,dish:name,emoji:r.e,cat:r.c,stars:r.s,ingredients:[...r.i],seasonings:[...r.se],total:finalTo,rem:finalTo,start:Date.now(),st:'waiting',tid:null,price:r.p,method:r.m,cookware:r.cw};
  orders.push(o);
  o.tid=setInterval(()=>{try{if(!session)return;o.rem=Math.max(0,o.total-(Date.now()-o.start)/1000);if(o.rem<=0){o.rem=0;clearInterval(o.tid);orderFail(o);}else upO(o);}catch(e){}},200);
  renderOrders();
  requestAnimationFrame(()=>{const el=document.querySelector(`.ord-it[data-id="${o.id}"]`);if(el)el.classList.add('app');});
}
function upO(o){const el=document.querySelector(`.ord-it[data-id="${o.id}"]`);if(!el)return;const t=el.querySelector('.ot');if(t){t.textContent=`⏱ ${Math.max(0,o.rem).toFixed(0)}s`;t.className='ot'+(o.rem<=10?' warn':'');}const b=el.querySelector('.opb');if(b){const p=o.total>0?Math.min(100,(o.total-o.rem)/o.total*100):0;b.style.width=p+'%';}el.classList.toggle('urg',o.rem<=10);}
function orderFail(o){
  try{
    o.st='failed';failed++;addLog('😤',`「${o.dish}」超时`);
    const ANGRY=['差评退钱！','等得我头发白了！','再也不来了！','花都谢了三轮了！','乌龟都比你快！','我外卖都到了还没上菜','隔壁都吃完了！','客服电话多少我要投诉','这速度是蜗牛附体','我先睡一觉再来'];
    toast('😤',ANGRY[Math.floor(Math.random()*ANGRY.length)]);
    const el=document.querySelector(`.ord-it[data-id="${o.id}"]`);if(el)el.classList.add('fail');
  }catch(e){}
  // 无论上面是否有异常，都要移除订单
  setTimeout(()=>{try{orders=orders.filter(x=>x.id!==o.id);renderOrders();if(session)spawnB();}catch(e){}},800);
}

// ===== Serve Order =====
function serveO(id){
  const o=orders.find(x=>x.id===id);if(!o||o.st!=='done')return;
  let idx=served.indexOf(o.dish);
  // 黑暗料理匹配：如果按菜名找不到，尝试用第一个黑暗料理
  if(idx===-1&&o.cutState==='worst')idx=served.findIndex(d=>!R.find(r=>r.n===d));
  // 次元裂缝混沌订单：匹配任何上菜区的菜
  if(idx===-1&&o.isChaos&&served.length>0)idx=0;
  if(idx===-1){toast('😅','上菜区没有对应的菜！');return;}
  served.splice(idx,1);
  // 切菜收益加成：full=+25%, penalty=-25%, partial/none=不变
  let bonus=1;
  if(o.cutState==='full')bonus=1.25;
  else if(o.cutState==='penalty')bonus=0.75;
  else if(o.cutState==='worst')bonus=0.25;
  // 事件效果：网红探店 → 收入×1.5
  if(currentEvent&&currentEvent.serveRevenueMult)bonus*=currentEvent.serveRevenueMult;
  const finalPrice=Math.floor(o.price*bonus);
  const el=document.querySelector(`.ord-it[data-id="${o.id}"]`);if(el)el.classList.add('cplt');
  const tag=bonus===1.25?' ⭐完美切块!':(bonus===0.75?' ⚠️未切块-25%':(bonus===0.25?' 🤮黑暗料理！':''));
  addLog('✅',`上菜完成「${o.dish}」¥${finalPrice}${tag}`);
  // 确保结算+定时器清理一定执行（隔离可能的异常）
  try{
    completed++;doneToday++;revenue+=finalPrice;totalRevenue+=finalPrice;upMoney();
    // 根据收益选择不同的无厘头回应（完美/正常/未切）
    const PRAISE=['这刀工绝了！','米其林满分！','香到隔壁报警！','舌头要融化了！','我愿称之为最强！','再来十份都不够！','这味道能上春晚！','厨神本神在此！','好吃到螺旋升天！','吃完想骂家里饭难吃！'];
    const NORMAL=['还行吧下次努力','差一点就封神了','中规中矩没毛病','能吃，还行吧','我妈做的也差不多','比食堂强点有限','不惊艳但管饱','味道在躲猫猫','就这？开个玩笑哈哈','再练练刀工吧！'];
    const COMPLAIN=['刀工是被狗啃了吗','切的啥啊这是','食材在哭你知道吗','没切块差评退钱','我妈都比你切得好','这是喂猪的吗','卖相扣大分了','厨师睡着了吗','筷子都嫌弃这盘菜','切都不切好意思端上来'];
    const WORST=['这做的什么玩意儿！','倒给猪都不吃！','黑暗料理界新星！','厨房杀手实锤了！','我在厕所都比这香！','这盘菜该送去博物馆展览！','隔壁狗闻到都跑了！','你确定这不是泔水？','我要求精神损失费！','妈妈我再也不挑食了！'];
    const POOL={full:PRAISE,penalty:COMPLAIN,worst:WORST};
    const pool=POOL[o.cutState]||NORMAL;
    const review=pool[Math.floor(Math.random()*pool.length)];
    const e2=o.cutState==='full'?'🤩':(o.cutState==='penalty'?'😤':(o.cutState==='worst'?'🤮':'😋'));
    toast(e2,review);
    const isLast=doneToday>=15;
    if(!completedDishes.includes(o.dish))completedDishes.push(o.dish);
    checkAchv();
  }catch(e){}
  // 无论上面是否有异常，都要清除定时器并移除订单
  clearInterval(o.tid);
  setTimeout(()=>{
    orders=orders.filter(x=>x.id!==id);renderOrders();renderServe();
    if(selOrder===id){selOrder=null;rcp.innerHTML='<div class="re">点击订单查看食谱</div>';}
    if(doneToday>=15){if(session)endDay();}else if(session)spawnB();
  },500);
}

function renderOrders(){
  if(!orders.length){ol.innerHTML=session?'<div style="color:#b8a48c;font-size:.75rem;padding:16px 0;text-align:center">等待新订单...</div>':'<div style="color:#b8a48c;font-size:.75rem;padding:20px 0;text-align:center">点击「开工」开始营业</div>';oc.textContent='';return;}
  const sm={waiting:'等待',cooking:'烹饪',done:'可上菜'};
  ol.innerHTML=orders.map(o=>{
    const sel=selOrder===o.id?'sel':'',warn=o.rem<=10?'warn':'';
    const pct=o.total>0?Math.min(100,(o.total-o.rem)/o.total*100):0;
    const stars='⭐'.repeat(Math.min(o.stars,4));
    return `<div class="ord-it ${sel}" data-id="${o.id}" onclick="selO(${o.id})">
      <div class="opb" style="width:${pct}%"></div><div class="oc"><div class="dr">
        <span class="dn">${o.emoji} ${o.dish} <span class="ct">${o.cat}</span><span class="st">${stars}</span></span>
        <button class="sv-btn" onclick="event.stopPropagation();serveO(${o.id})" ${o.st==='done'?'':'disabled'}>🍽️上菜</button>
      </div><div class="ot ${warn}">⏱ ${o.rem.toFixed(0)}s</div><div class="op">${o.cutState==='full'?'⭐':(o.cutState==='penalty'?'⚠️':'')}¥${o.price}</div></div></div>`;
  }).join('');
  oc.textContent=`(${orders.length})`;
}
function renderServe(){svBox.innerHTML=served.length?served.map(d=>{const r=R.find(x=>x.n===d);return `<span class="sv-it">${r?r.e:'🍽️'} ${d}</span>`;}).join(''):'<span style="color:#b8a48c;font-size:.7rem">暂无菜品</span>';}
function selO(id){selOrder=selOrder===id?null:id;renderOrders();const o=orders.find(x=>x.id===id);if(o&&selOrder){const r=R.find(x=>x.n===o.dish);if(!r)return;const reqLv=Math.ceil(r.s/2);const cutFoods=r.i.filter(x=>CUT_ITEMS[x]);const cutHtml=cutFoods.length?`<div><strong>🔪 切块：</strong><span style="color:#e67e22">${cutFoods.map(x=>ALL_E[x]+x+' ×'+CUT_ITEMS[x]).join('、')}</span></div>`:'';rcp.innerHTML=`<div style="font-size:.9rem;font-weight:700;margin-bottom:4px">${r.e} ${r.n}</div><div><span class="ct">${r.c}</span> ${'⭐'.repeat(Math.min(r.s,4))} <span style="color:#e67e22;font-size:.65rem">需Lv.${reqLv}</span></div><div><strong>炊具：</strong>${r.cw||'无需'}</div>${cutHtml}${r.m?`<div><strong>方法：</strong>${r.m}</div>`:''}<div><strong>食材：</strong>${r.i.map(x=>ALL_E[x]+x).join('、')}</div><div><strong>调料：</strong>${r.se.map(x=>ALL_E[x]+x).join('、')}</div><div><strong>用时：</strong>${r.t}s · <strong>售价：</strong>¥${r.p}</div>`;}else rcp.innerHTML='<div class="re">点击订单查看食谱</div>';}

// ===== Stoves =====
function renderStoves(){
  sr2.innerHTML=stoves.map(s=>{
    const sel=selStove===s.id?'sel':'',cls=s.st==='active'?'active':(s.st==='done'?'done':'');
    const cwA=c=>s.cw===c?'act':'',mA=m=>s.mt===m?'act':'';
    const pp=s.tot>0?Math.min(100,(s.tot-s.rem)/s.tot*100):0;
    const methodRow = s.cw==='炒锅'?`<div class="stv-mt">${MTH.map(m=>`<button class="mtc ${mA(m)}" onclick="event.stopPropagation();setMt(${s.id},'${m}')" ${s.st!=='idle'?'disabled':''}>${m}</button>`).join('')}</div>`:'';
    const cwCls = s.cw==='炒锅'?'cw-wok':(s.cw==='煎锅'?'cw-pan':(s.cw==='蒸锅'?'cw-steam':''));
    const oilEl = s.cw==='炒锅'&&s.mt==='炸'?'<div class="stv-oil"></div>':'';
    const lidEl = s.cw==='蒸锅'?'<div class="stv-lid"></div>':'';
    return `<div class="stv ${sel} ${cls} ${cwCls}" data-sid="${s.id}" onclick="selSt(${s.id})">
      <div class="stv-lb">🔥 灶${s.id}</div>
      <div class="stv-cw">${CW.map(c=>`<button class="cwb ${cwA(c)}" onclick="event.stopPropagation();setCw(${s.id},'${c}')" ${s.st!=='idle'?'disabled':''}>${c}</button>`).join('')}</div>
      ${methodRow}
      <div class="stv-ig">${s.ig.length?s.ig.map(i=>ALL_E[i]||'🥬').join(''):'<span class="sph">空锅</span>'}${oilEl}${lidEl}</div>
      ${s.st==='active'||s.st==='done'?`<div class="stv-pb"><div class="stv-pbf" style="width:${pp}%"></div></div>`:''}
      <div class="stv-st ${s.st==='done'?'gd':''}">${s.st==='idle'?'空闲':(s.st==='active'?`⏱ ${s.rem.toFixed(0)}s`:'✅ 出锅')}</div>
      <div class="stv-ac">
        ${s.st==='idle'?`<button class="sb ck" onclick="event.stopPropagation();startCk(${s.id})" ${s.cw&&s.ig.length>=1?'':'disabled'}>🔥 烹饪</button>`:''}
        ${s.st==='active'?`<button class="sb cl" onclick="event.stopPropagation();cancelCk(${s.id})">✕ 取消</button>`:''}
        ${s.st==='done'?`<button class="sb sv" onclick="event.stopPropagation();svSt(${s.id})">🍽️ 出锅</button>`:''}
        ${s.st==='idle'&&s.ig.length>0?`<button class="sb cl" onclick="event.stopPropagation();clSt(${s.id})">🗑️ 清</button>`:''}
      </div></div>`;
  }).join('')+_renderCutBoard()+'<div class="stv placeholder"><div class="stv-lb">🔥 烤箱</div><div class="sph" style="padding:20px 0;font-size:.65rem">暂未开放</div></div>';
}
function _renderCutBoard(){
  const cb=cutBoard;
  const sel=boardSelected?' sel':'';
  if(!cb.name) return '<div class="stv'+sel+'" style="background:linear-gradient(135deg,#fefcf8,#f5eee5);border-color:#d4c5a8;min-height:155px;cursor:pointer" onclick="selBoard()"><div class="stv-lb">🔪 菜板'+(boardSelected?' ✓':'')+'</div><div class="sph" style="padding:10px 0;font-size:.6rem;color:#b8a48c">选中菜板后点击食材<br>食材会先上菜板切块</div></div>';
  const pct=Math.min(100,cb.done/cb.need*100);
  const done=cb.done>=cb.need;
  const ig=cb.name;
  return '<div class="stv'+sel+'" style="background:linear-gradient(135deg,#fefcf8,#f5eee5);border-color:'+(done?'#27ae60':(boardSelected?'#e67e22':'#e0d5c8'))+';min-height:155px;cursor:pointer" onclick="selBoard()">'
    +'<div class="stv-lb">🔪 菜板 · '+ig+(boardSelected?' ✓':'')+'</div>'
    +'<div style="font-size:1.8rem;margin:4px 0">'+(ALL_E[ig]||'🥬')+'</div>'
    +'<div style="font-size:.65rem;color:#6b4c32">'+(done?'✅ 已切好！':('切菜 '+cb.done+'/'+cb.need))+'</div>'
    +'<div style="height:6px;background:#e0d5c8;border-radius:3px;margin:4px 8px;overflow:hidden">'
    +'<div style="height:100%;width:'+pct+'%;background:'+(done?'#27ae60':'#e67e22')+';border-radius:3px;transition:width .15s"></div>'
    +'</div><div style="display:flex;gap:4px;justify-content:center;margin-top:4px">'
    +(done?'':'<button class="sb ck" onclick="event.stopPropagation();chopOnBoard()" style="font-size:.6rem">🔪 切</button>')
    +(cb.done>0?'<button class="sb sv" onclick="event.stopPropagation();boardToStove()" style="font-size:.6rem">🍳 入锅/入碗</button>':'')
    +'<button class="sb cl" onclick="event.stopPropagation();clearBoard()" style="font-size:.6rem">🗑️</button>'
    +'</div></div>';
}
function selSt(id){
  const s=stoves.find(x=>x.id===id);
  if(s&&s.st!=='idle'){if(selStove===id){selStove=null;coldBowl.sel=false;}return;}
  selStove=selStove===id?null:id;coldBowl.sel=false;boardSelected=false;renderStoves();renderBowl();
}
function setCw(id,c){const s=stoves.find(x=>x.id===id);if(!s||s.st!=='idle')return;selStove=id;coldBowl.sel=false;boardSelected=false;s.cw=s.cw===c?null:c;if(s.cw!=='炒锅')s.mt=null;if(s.cw)addLog('🍳',`选了${s.cw}`);renderStoves();renderBowl();}
function setMt(id,m){const s=stoves.find(x=>x.id===id);if(!s||s.st!=='idle')return;selStove=id;coldBowl.sel=false;boardSelected=false;s.mt=s.mt===m?null:m;if(s.mt)addLog('🔥',`灶${s.id}选「${s.mt}」`);renderStoves();renderBowl();}
function clSt(id){const s=stoves.find(x=>x.id===id);if(!s)return;s.ig=[];delete stoveChopped[s.id];renderStoves();}

function selBoard(){
  boardSelected=!boardSelected;
  if(boardSelected){selStove=null;coldBowl.sel=false;}
  renderStoves();renderBowl();
}

function addIng(name){
  // 开工前点击食材=补货
  if(!session){
    const cost=IG_PRICE[name]||5,qty=IG_QTY(name);
    if(totalRevenue<cost){toast('😅','金币不够！');return;}
    totalRevenue-=cost;
    ingredientUses[name]=(ingredientUses[name]||0)+qty;
    stock[name]=(stock[name]||0)+qty;
    upMoney();renderIG();
    addLog('🛒',`花¥${cost}购买${name}（${qty}次使用）`);
    return;
  }
  // === 食材使用次数系统 ===
  if((ingredientUses[name]||0)<=0){
    const cost=IG_PRICE[name]||5,qty=IG_QTY(name);
    if(totalRevenue<cost){toast('😅','金币不够！');return;}
    totalRevenue-=cost;
    ingredientUses[name]=(ingredientUses[name]||0)+qty;
    stock[name]=(stock[name]||0)+qty;
    upMoney();renderIG();
    addLog('🛒',`花¥${cost}购买${name}（${qty}次使用）`);
    // 补货后继续消耗 1 次
  }
  // 消耗使用次数（事件可翻倍消耗）
  const costMult=currentEvent&&currentEvent.ingredientCostMult?currentEvent.ingredientCostMult:1;
  ingredientUses[name]-=costMult;
  if((ingredientUses[name]||0)<=0&&ingredientUses[name]!==0)delete ingredientUses[name];
  // 优先消耗农场份额，同步 farmInventory
  if((farmUses[name]||0)>0){
    farmUses[name]-=costMult;
    if((farmUses[name]||0)<0)farmUses[name]=0;
    const c=CROPS_DATA.find(x=>x.id===name);
    const mult=c?TIER_MULT[c.tier]||3:3;
    farmInventory[name]=Math.ceil((farmUses[name]||0)/mult);
    if(farmInventory[name]<=0){delete farmInventory[name];delete farmUses[name];}
    addLog('🌾',`从农仓取 ${name}（农仓剩余 ${farmUses[name]||0} 次）`);
  }else if((stock[name]||0)>0){
    // 同步扣减虚空库存（仅用于显示）
    stock[name]--;
    if(stock[name]<=0)delete stock[name];
  }
  // 菜板模式：选中菜板时，需要切的食材先上菜板
  if(boardSelected&&!coldBowl.sel&&CUT_ITEMS[name]){
    if(cutBoard.name){
      toast('🔪','菜板上还有 '+cutBoard.name+' 没切完！请先处理');renderStoves();renderIG();renderFarmInv();return;
    }
    cutBoard.name=name;cutBoard.need=CUT_ITEMS[name];cutBoard.done=0;
    addLog('🔪',`放${name}到菜板上`);
    renderStoves();renderIG();renderFarmInv();return;
  }
  // 凉拌碗模式
  if(coldBowl.sel){coldBowl.ig.push(name);addLog(ALL_E[name]||'🥬',`放${name}进凉拌碗`);renderBowl();renderIG();renderFarmInv();return;}
  const s=stoves.find(x=>x.id===selStove);
  if(!s){toast('👆','请先点击一个炉灶！');return;}
  if(s.st!=='idle'){toast('🚫','这个灶正在工作中！');return;}
  if(!s.cw){toast('🍳','请先选炊具！');return;}
  s.ig.push(name);
  addLog(ALL_E[name]||'🥬',`放${name}进灶${s.id}`);
  renderStoves();renderIG();renderFarmInv();
}

// ===== 菜板操作 =====
function chopOnBoard(){
  if(!cutBoard.name||cutBoard.done>=cutBoard.need){renderStoves();return;}
  cutBoard.done++;
  if(cutBoard.done>=cutBoard.need)addLog('✅',`${cutBoard.name}切好了！`);
  else addLog('🔪',`切${cutBoard.name} ${cutBoard.done}/${cutBoard.need}`);
  renderStoves();
}
function boardToStove(){
  if(!cutBoard.name||cutBoard.done<=0)return;
  // 凉拌碗模式 → 入碗
  if(coldBowl.sel){
    coldBowl.ig.push(cutBoard.name);
    coldChopped[cutBoard.name]=cutBoard.done; // 记录实际切了几刀
    addLog(ALL_E[cutBoard.name]||'🥬',`放${cutBoard.name}进凉拌碗${cutBoard.done>=cutBoard.need?'（已切好）':'(切了'+cutBoard.done+'/'+cutBoard.need+')'}`);
    cutBoard={name:null,need:0,done:0};
    renderStoves();renderIG();renderFarmInv();renderBowl();
    return;
  }
  const s=stoves.find(x=>x.id===selStove);
  if(!s){toast('👆','请先点击一个炉灶！');return;}
  if(s.st!=='idle'){toast('🚫','这个灶正在工作中！');return;}
  if(!s.cw){toast('🍳','请先选炊具！');return;}
  s.ig.push(cutBoard.name);
  if(!stoveChopped[s.id])stoveChopped[s.id]={};
  stoveChopped[s.id][cutBoard.name]=cutBoard.done; // 记录实际切了几刀
  addLog(ALL_E[cutBoard.name]||'🥬',`放${cutBoard.name}进灶${s.id}${cutBoard.done>=cutBoard.need?'（已切好）':'(切了'+cutBoard.done+'/'+cutBoard.need+')'}`);
  cutBoard={name:null,need:0,done:0};
  renderStoves();renderIG();renderFarmInv();
}
function clearBoard(){
  if(cutBoard.name)addLog('🗑️',`清空菜板上的${cutBoard.name}`);
  cutBoard={name:null,need:0,done:0};
  renderStoves();
}

function startCk(id){
  const s=stoves.find(x=>x.id===id);if(!s||s.st!=='idle')return;
  const cont=s.ig.map(i=>i);
  let match=null;
  for(const r of R){
    const need=new Set([...r.i,...r.se]);
    if(cont.length===need.size&&cont.every(i=>need.has(i))&&r.cw===s.cw){
      if(r.m===null||r.m===s.mt||(s.cw!=='炒锅')){match=r;break;}
    }
  }
  if(!match){
    // 食材不匹配也能出菜（黑暗料理，仅25%收益）
    const badName='乱炖'+s.ig.map(i=>ALL_E[i]||i).slice(0,3).join('');
    s.cutState='worst';s.st='active';s.dish=badName;
    const fakeT=s.cw==='蒸锅'?18:(s.cw==='煎锅'?12:15);
    s.tot=fakeT;s.rem=fakeT;
    addLog('🤮',`灶${s.id}食材不匹配！做出「${badName}」`);
    selStove=null;
    const start=Date.now();
    s.tid=setInterval(()=>{if(!session){clearInterval(s.tid);return;}s.rem=Math.max(0,fakeT-(Date.now()-start)/1000);if(s.rem<=0){s.rem=0;s.st='done';clearInterval(s.tid);selStove=null;}renderStoves();},200);
    renderStoves();return;
  }
  // 切菜状态：比较实际刀数vs需要刀数
  let cutState='none';
  const needCut=s.ig.filter(ig=>CUT_ITEMS[ig]);
  if(needCut.length>0){
    const chopped=needCut.filter(ig=>stoveChopped[s.id]&&(stoveChopped[s.id][ig]||0)>=CUT_ITEMS[ig]);
    const any=needCut.filter(ig=>stoveChopped[s.id]&&(stoveChopped[s.id][ig]||0)>0);
    if(chopped.length===needCut.length)cutState='full';
    else if(any.length===0)cutState='penalty';
    else cutState='partial';
  }
  // 事件效果：厨神附体 → 自动完美切块
  if(currentEvent&&currentEvent.autoPerfectCut&&cutState!=='worst'){
    cutState='full';
    addLog('✨','厨神附体！自动完美切块！');
  }
  // 事件效果：美食节 → strictCut（partial视为penalty）
  if(currentEvent&&currentEvent.strictCut&&cutState==='partial')cutState='penalty';
  s.cutState=cutState;
  if(cutState==='full')addLog('⭐',`灶${s.id}「${match.n}」完美切块！收益+25%`);
  else if(cutState==='penalty')addLog('⚠️',`灶${s.id}「${match.n}」未切块，收益-25%`);
  addLog('🍳',`灶${s.id}开始${match.m||''}「${match.n}」`);
  selStove=null;s.st='active';s.dish=match.n;
  // 事件效果：烹饪时间倍率
  let cookTime=match.t;
  if(currentEvent&&currentEvent.cookTimeMult)cookTime=Math.round(cookTime*currentEvent.cookTimeMult);
  s.tot=cookTime;s.rem=cookTime;
  // 事件效果：5%糊锅
  if(currentEvent&&currentEvent.burnChance&&Math.random()<currentEvent.burnChance){
    addLog('💥','灶'+s.id+'手滑翻车了！（厨神附体副作用）');
    s.st='done';s.dish='💥糊锅'+match.n;s.cutState='worst';
    s.tot=3;s.rem=3;
    const start2=Date.now();
    s.tid=setInterval(()=>{if(!session){clearInterval(s.tid);return;}s.rem=Math.max(0,3-(Date.now()-start2)/1000);if(s.rem<=0){s.rem=0;s.st='done';clearInterval(s.tid);selStove=null;}renderStoves();},200);
    renderStoves();return;
  }
  const start=Date.now();
  s.tid=setInterval(()=>{if(!session){clearInterval(s.tid);return;}s.rem=Math.max(0,match.t-(Date.now()-start)/1000);if(s.rem<=0){s.rem=0;s.st='done';clearInterval(s.tid);selStove=null;}renderStoves();},200);
  renderStoves();
}
function cancelCk(id){const s=stoves.find(x=>x.id===id);if(!s)return;clearInterval(s.tid);s.tid=null;addLog('✕',`取消灶${s.id}烹饪`);s.st='idle';s.cw=null;s.mt=null;s.dish=null;s.rem=0;s.tot=0;s.cutState='none';delete stoveChopped[s.id];selStove=null;renderStoves();}
function svSt(id){
  const s=stoves.find(x=>x.id===id);if(!s||s.st!=='done')return;
  const dishName=s.dish;
  addLog('🍽️',`灶${s.id}「${dishName}」出锅`);
  sndCoin();
  if(!served.includes(dishName))served.push(dishName);
  if(s.cutState==='worst'){
    // 黑暗料理：匹配第一个等待中的订单
    for(let i=0;i<orders.length;i++){if(orders[i].st==='waiting'){orders[i].st='cooking';orders[i].cutState='worst';break;}}
  }else{
    orders.forEach(o=>{if(o.dish===dishName&&o.st==='waiting'){o.st='cooking';o.cutState=s.cutState;}});
  }
  s.ig=[];s.cw=null;s.mt=null;s.dish=null;s.st='idle';s.rem=0;s.tot=0;s.cutState='none';delete stoveChopped[s.id];
  selStove=null;
  renderStoves();renderServe();renderOrders();
  orders.forEach(o=>{if(o.dish===dishName&&o.st==='cooking')o.st='done';});
  if(s.cutState==='worst'){for(let i=0;i<orders.length;i++){if(orders[i].st==='cooking'&&orders[i].cutState==='worst'){orders[i].st='done';break;}}}
  renderOrders();
}

// ===== Cold Bowl =====
function selBowl(){coldBowl.sel=!coldBowl.sel;if(coldBowl.sel){selStove=null;boardSelected=false;}renderBowl();renderStoves();}
function renderBowl(){
  coldEl.classList.toggle('sel',coldBowl.sel);
  coldIgs.innerHTML=coldBowl.ig.length?coldBowl.ig.map(i=>ALL_E[i]||'🥬').join(''):'<span style="color:#b8a48c;font-size:.6rem">点击碗→加食材→凉拌</span>';
  coldBtn.disabled=coldBowl.ig.length<1;
  coldClear.disabled=coldBowl.ig.length<1;
}
function clBowl(){coldBowl.ig=[];coldChopped={};renderBowl();}
function coldMix(){
  if(!coldBowl.ig.length)return;
  const cont=coldBowl.ig.map(i=>i);
  let match=null;
  for(const r of R){
    if(r.cw!==null)continue;
    const need=new Set([...r.i,...r.se]);
    if(cont.length===need.size&&cont.every(i=>need.has(i))){match=r;break;}
  }
  if(!match){
    // 食材不匹配也能出凉拌（黑暗料理，仅25%收益）
    const badName='黑暗凉拌'+coldBowl.ig.map(i=>ALL_E[i]||i).slice(0,3).join('');
    addLog('🤮','食材不匹配！做出「'+badName+'」');
    served.push(badName);
    for(let i=0;i<orders.length;i++){if(orders[i].st==='waiting'){orders[i].st='cooking';orders[i].cutState='worst';break;}}
    coldBowl.ig=[];coldBowl.sel=false;coldChopped={};renderBowl();renderServe();renderOrders();
    orders.forEach(o=>{if(o.st==='cooking'&&o.cutState==='worst')o.st='done';});
    renderOrders();
    return;
  }
  // 切菜检测凉拌版：比较实际刀数
  let cutState='none';
  const needCut=coldBowl.ig.filter(ig=>CUT_ITEMS[ig]);
  if(needCut.length>0){
    const chopped=needCut.filter(ig=>(coldChopped[ig]||0)>=CUT_ITEMS[ig]);
    const any=needCut.filter(ig=>(coldChopped[ig]||0)>0);
    if(chopped.length===needCut.length)cutState='full';
    else if(any.length===0)cutState='penalty';
    else cutState='partial';
  }
  // 事件效果：厨神附体 → 自动完美切块
  if(currentEvent&&currentEvent.autoPerfectCut&&cutState!=='worst')cutState='full';
  // 事件效果：美食节 → strictCut
  if(currentEvent&&currentEvent.strictCut&&cutState==='partial')cutState='penalty';
  if(cutState==='full')addLog('⭐','凉拌「'+match.n+'」完美切块！收益+25%');
  else if(cutState==='penalty')addLog('⚠️','凉拌「'+match.n+'」未切块，收益-25%');
  addLog('🥗',`凉拌「${match.n}」完成`);
  served.push(match.n);
  orders.forEach(o=>{if(o.dish===match.n&&o.st==='waiting'){o.st='cooking';o.cutState=cutState;}});
  coldBowl.ig=[];coldBowl.sel=false;coldChopped={};renderBowl();renderServe();renderOrders();
  orders.forEach(o=>{if(o.dish===match.n&&o.st==='cooking')o.st='done';});
  renderOrders();
}
function upMoney(){moneyD.textContent=`💰 ¥${totalRevenue}`;}

// ===== Confirm/End =====
function _el(id){return document.getElementById(id);}
function _hideAllModals(){const e=_el('cfOver');if(e)e.classList.remove('act');const e2=_el('resetOver');if(e2)e2.classList.remove('act');const e3=_el('smOver');if(e3)e3.classList.remove('act');}
function confirmEC(){const e=_el('cfOver');if(e){_hideAllModals();e.classList.add('act');}}
function cancelEC(){const e=_el('cfOver');if(e)e.classList.remove('act');}
function doEC(){const e=_el('cfOver');if(e)e.classList.remove('act');endDay();}
function _resetEl(){return _el('resetOver');}
function confirmReset(){const e=_resetEl();if(e){_hideAllModals();e.classList.add('act');}}
function cancelReset(){const e=_resetEl();if(e)e.classList.remove('act');}
function doReset(){
  const e=_resetEl();if(!e)return;
  e.classList.remove('act');
  // 清除所有定时器防止自动保存污染
  if(bizTimer){clearInterval(bizTimer);bizTimer=null;}
  stoves.forEach(s=>{clearInterval(s.tid);s.tid=null;});
  orders.forEach(o=>clearInterval(o.tid));
  try{localStorage.removeItem('foodtruck');}catch(e){}
  // 全部状态还原为初始值
  totalDays=0;totalRevenue=50;totalCompleted=0;day=1;completedDishes=[];unlockedAchv={};stock={};
  farmInventory={};farmPlots=Array(25).fill(null).map(()=>({crop:null,plantedAt:null,growTime:0}));farmSeeds={'白萝卜':5};unlockedPlots=6;ingredientUses={};farmUses={};cutBoard={name:null,need:0,done:0};boardSelected=false;stoveChopped={};coldChopped={};
  lastBizHour=-1;session=false;orders=[];served=[];completed=0;failed=0;revenue=0;doneToday=0;selOrder=null;selStove=null;coldBowl.ig=[];coldBowl.sel=false;gameLog=[];
  currentEvent=null;eventDayCount=0;
  stoves.forEach(s=>{s.st='idle';s.ig=[];s.cw=null;s.mt=null;s.dish=null;s.rem=0;s.tot=0;s.cutState='none';});
  // 重新渲染全部界面
  upMoney();updateDay();updateBizBtn();renderOrders();renderServe();renderStoves();renderBowl();renderIG();renderAchv();renderFarmInv();renderLog();renderEvent();
  toast('🗑️','存档已重置');
}

function endDay(){
  session=false;
  lastBizHour=new Date().getHours();
  updateBizBtn();
  if(bizTimer){clearInterval(bizTimer);bizTimer=null;}
  stoves.forEach(s=>{clearInterval(s.tid);s.tid=null;});
  orders.forEach(o=>clearInterval(o.tid));
  sBtn.textContent='🔴 打烊了';sBtn.className='hbtn closed';ecBtn.style.display='none';td.textContent='--:--';
  
  const oldLv=getLv(); // 升级前等级
  totalCompleted+=doneToday;
  const newLv=getLv();
  if(newLv>oldLv){toast('🎉',`升级啦！Lv.${newLv} ${LV_NAMES[newLv-1]}！新菜品解锁了！`);renderIG();}
  addLog('📊',`今日营收¥${revenue}，共${doneToday}单`);
  // Save
  try{localStorage.setItem('foodtruck',JSON.stringify({d:totalDays,r:totalRevenue,c:totalCompleted,cd:completedDishes,ua:unlockedAchv,sk:stock,fi:farmInventory,fp:farmPlots,fs:farmSeeds,up:unlockedPlots,iu:ingredientUses,fu:farmUses,bh:lastBizHour,ev:currentEvent?currentEvent.id:null,ed:eventDayCount,t:Date.now()}));}catch(e){}

  const total=doneToday+failed;
  const rate=total>0?(doneToday/total)*100:0;
  document.getElementById('smDay').textContent=day;
  document.getElementById('smCount').textContent=doneToday;
  document.getElementById('smRev').textContent='¥'+revenue;
  document.getElementById('smFail').textContent=`失败: ${failed} 单`;
  const lv=getLv(), nxt=getLvNext();
  document.getElementById('smLvInfo').textContent=`Lv.${lv} ${LV_NAMES[lv-1]}${nxt>0?` · 还需 ${nxt-totalCompleted} 单升级`:''}`;
  document.getElementById('smTotal').textContent=`累计 ${totalDays} 天 · 总收入 ¥${totalRevenue}`;
  
  const emojis=['😰','😅','🙂','😊','🎉'];
  const msgs=['今天不太顺...明天加油！','勉强过关，还需努力！','中规中矩，继续加油！','生意不错！客人挺满意。','太棒了！星级餐车！'];
  const idx=Math.min(4,Math.floor(rate/20));
  document.getElementById('smEmoji').textContent=emojis[idx];
  document.getElementById('smSub').textContent=msgs[idx];
  _hideAllModals();smO.classList.add('act');
  setTimeout(()=>{document.getElementById('smRate').style.width=rate+'%';},300);
  renderOrders();renderServe();renderStoves();
}

function nextDay(){
  _hideAllModals();
  document.getElementById('smRate').style.width='0%';
  orders=[];served=[];completed=0;failed=0;revenue=0;doneToday=0;
  stoves.forEach(s=>{s.ig=[];s.cw=null;s.mt=null;s.st='idle';s.dish=null;s.rem=0;s.tot=0;});
  renderOrders();renderServe();renderStoves();
  rcp.innerHTML='<div class="re">点击订单查看食谱</div>';
  updateDay();
}

// ===== Toast =====
function toast(emoji,text){const d=document.createElement('div');d.className='tt';d.innerHTML=`<div class="te">${emoji}</div><div class="tt2">${text}</div>`;tc.appendChild(d);setTimeout(()=>{d.style.transition='opacity .4s,transform .4s';d.style.opacity='0';d.style.transform='scale(.8)';setTimeout(()=>d.remove(),500);},2500);}

// ===== Log =====
function addLog(emoji, text){
  gameLog.unshift({emoji,text});
  if(gameLog.length>MAX_LOG) gameLog.pop();
  renderLog();
}
function renderLog(){
  logList.innerHTML=gameLog.length?gameLog.map(l=>`<div class="log-item"><span class="le">${l.emoji}</span>${l.text}</div>`).join(''):'<div class="log-empty">暂无操作记录</div>';
}

// ===== 事件横幅渲染 =====
function renderEvent(){
  // 延迟解析暂存的事件ID（EVENTS定义在文件靠后位置，需要try-catch避免TDZ）
  try{
    if(window._savedEventId&&!currentEvent&&typeof EVENTS!=='undefined'){
      const found=EVENTS.find(e=>e.id===window._savedEventId);
      if(found)currentEvent=found;
      window._savedEventId=null;
    }
  }catch(e){/* EVENTS未就绪，下次调用再解析 */}
  const el=document.getElementById('eventBanner');
  if(!el)return;
  if(currentEvent){
    el.style.display='';
    el.className='event-banner';
    el.innerHTML=`<span class="ev-emoji">${currentEvent.emoji}</span>
      <span class="ev-name">${currentEvent.name}</span>
      <span class="ev-desc">${currentEvent.desc}</span>
      <span class="ev-type ${currentEvent.type}">${currentEvent.type==='normal'?'正常':'🎭无厘头'}${currentEvent.onMenuDesc?' · '+currentEvent.onMenuDesc:''}</span>`;
  }else{
    el.style.display='none';
  }
  // 更新订单区日期信息
  const di=document.getElementById('dayInfo');
  if(di){
    if(currentEvent){
      di.innerHTML=`📅 第${day}天 · ${currentEvent.emoji} ${currentEvent.name}`;
      di.style.display='';
    }else if(session){
      di.innerHTML=`📅 第${day}天`;
      di.style.display='';
    }else{
      di.style.display='none';
    }
  }
}

const EXCUSES=['客人想起家里煤气没关','客人突然打了个饱嗝','客人发现忘带钱包','客人接到电话：孩子在学校打架','客人说等得花都谢了','客人想起家里还炖着汤','客人看到隔壁在送免费试吃','客人收到老婆查岗短信','客人说是来借厕所的','客人突然对这家店过敏'];

// ===== 日期事件系统 =====
// 每3-5天随机触发一个事件，影响当日营业
const EVENTS = [
  // --- 5 个正常事件 ---
  {
    id:'construction',name:'工地出摊',emoji:'🏗️',type:'normal',
    desc:'工人们饿坏了！今天高热量菜品畅销',
    onOrderGen(available){
      const hot=['猪肉','牛肉','排骨','五花肉'];
      const hotDishes=available.filter(n=>R.find(r=>r.n===n).i.some(ig=>hot.includes(ig)));
      const other=available.filter(n=>!hotDishes.includes(n));
      const pool=Math.random()<0.5?hotDishes:other;
      return pool.length?pool[Math.floor(Math.random()*pool.length)]:available[Math.floor(Math.random()*available.length)];
    },
    onMenuDesc:'🔥 高热量菜畅销'
  },
  {
    id:'elderly',name:'养老院出摊',emoji:'🏥',type:'normal',
    desc:'老人家牙口不好，炖菜焖菜更受欢迎，烹饪时间变长',
    onOrderGen(available){
      const stew=available.filter(n=>{const r=R.find(x=>x.n===n);return r&&r.m==='炖';});
      if(stew.length&&Math.random()<0.6)return stew[Math.floor(Math.random()*stew.length)];
      return available[Math.floor(Math.random()*available.length)];
    },
    cookTimeMult:1.1,
    onMenuDesc:'🍲 炖菜为主 · 烹饪+10%'
  },
  {
    id:'heatwave',name:'三伏天',emoji:'☀️',type:'normal',
    desc:'天气热得冒烟！凉菜供不应求',
    onOrderGen(available){
      const cold=available.filter(n=>{const r=R.find(x=>x.n===n);return r&&r.cw===null;});
      if(cold.length&&Math.random()<0.7)return cold[Math.floor(Math.random()*cold.length)];
      return available[Math.floor(Math.random()*available.length)];
    },
    onMenuDesc:'🥗 凉菜订单暴增'
  },
  {
    id:'school',name:'学校门口',emoji:'🏫',type:'normal',
    desc:'学生们零花钱有限，便宜管饱的最爱',
    onOrderGen(available){
      const cheap=available.filter(n=>{const r=R.find(x=>x.n===n);return r&&r.s<=4;});
      if(cheap.length&&Math.random()<0.7)return cheap[Math.floor(Math.random()*cheap.length)];
      return available[Math.floor(Math.random()*available.length)];
    },
    onMenuDesc:'💰 低价菜为主'
  },
  {
    id:'foodie',name:'美食节',emoji:'🍽️',type:'normal',
    desc:'食客都是美食家！切菜必须完美，糊弄不过去',
    onOrderGen(a){return a[Math.floor(Math.random()*a.length)];},
    strictCut:true,
    onMenuDesc:'🔪 切菜要求严格'
  },
  // --- 5 个无厘头事件 ---
  {
    id:'vegan',name:'素食游行',emoji:'🥬',type:'silly',
    desc:'今天全是素食主义者！一滴荤腥都不碰',
    onOrderGen(available){
      const meatItems=['猪肉','牛肉','鸡腿','鸡翅','鸡胸','排骨','五花肉','虾仁','鱼肉','羊肉'];
      const veggie=available.filter(n=>{const r=R.find(x=>x.n===n);return r&&!r.i.some(ig=>meatItems.includes(ig));});
      return veggie.length?veggie[Math.floor(Math.random()*veggie.length)]:available[0];
    },
    onMenuDesc:'🌱 全素日！无肉菜'
  },
  {
    id:'influencer',name:'网红探店',emoji:'📱',type:'silly',
    desc:'抖音百万粉博主来了！客人先拍半小时再吃',
    onOrderGen(a){return a[Math.floor(Math.random()*a.length)];},
    orderTimeMult:1.4,
    serveRevenueMult:1.5,
    onMenuDesc:'📸 上菜收入×1.5 · 倒计时+40%'
  },
  {
    id:'cat',name:'猫咪大闹',emoji:'🐱',type:'silly',
    desc:'一只流浪猫闯进餐车！食材被踩得乱七八糟',
    onOrderGen(a){return a[Math.floor(Math.random()*a.length)];},
    ingredientCostMult:2,
    onMenuDesc:'🐾 食材消耗×2'
  },
  {
    id:'chefboost',name:'厨神附体',emoji:'✨',type:'silly',
    desc:'今天手感爆棚自动完美切块！但5%概率手滑翻车',
    onOrderGen(a){return a[Math.floor(Math.random()*a.length)];},
    autoPerfectCut:true,
    burnChance:0.05,
    onMenuDesc:'⚡ 自动完美切 · 5%糊锅'
  },
  {
    id:'portal',name:'次元裂缝',emoji:'🌀',type:'silly',
    desc:'异世界客人看不懂菜单！随机乱点一气',
    onOrderGen(available){
      if(Math.random()<0.15)return '🤮黑暗料理';
      return DNAMES[Math.floor(Math.random()*DNAMES.length)];
    },
    onMenuDesc:'👾 随机乱点！可能出怪菜'
  }
];


// ===== 烹饪小贴士 =====
const TIPS=[
'🥩 切牛肉要逆着纹理切，切猪肉要顺着纹理切，口感更好。',
'🍳 热锅冷油是中式炒菜的黄金法则，不粘锅且更香。',
'🧂 炒菜时盐最后放，避免蔬菜出水变老。',
'🔥 爆炒要用最大火，动作要快，食材在锅里不超过2分钟。',
'🥬 绿叶菜焯水时加几滴油和少许盐，颜色更翠绿。',
'🐟 煎鱼前用厨房纸吸干水分，鱼皮不破不粘锅。',
'🍖 炖肉时冷水下锅，大火烧开撇去浮沫再转小火。',
'🥚 鸡蛋打散后加少许水，炒出来更嫩滑。',
'🍅 番茄炒蛋先炒鸡蛋盛出，再炒番茄，最后混合。',
'🧄 蒜末在油温五六成热时下锅，太早会糊太晚不香。',
'🍚 煮米饭时水高出米面一个指节，分量刚好。',
'🥟 煮饺子水里加少许盐，饺子皮不易破。',
'🐔 鸡肉焯水要冷水下锅，热水下锅会锁住血沫。',
'🌶 切辣椒后手辣，用醋搓手或用牙膏涂抹缓解。',
'🥔 土豆切好后泡水去除淀粉，炒出来更爽脆。',
'🍲 炖汤要一次性加足水，中途加水影响口感。',
'🦐 虾仁用盐和淀粉抓洗，炒出来更Q弹。',
'🥦 西兰花焯水时加盐和油，颜色更绿更好看。',
'🍆 茄子切好后撒盐腌制10分钟，炒时不吃油。',
'🥩 炒肉丝先上浆（料酒+生抽+淀粉），肉质更嫩。',
'🍜 煮面条水要宽，水开下面，点两次冷水更劲道。',
'🧊 冻肉提前一晚放冷藏室解冻，比微波炉口感好。',
'🍳 煎荷包蛋要用小火，蛋白凝固后加一勺水盖盖焖。',
'🥣 煲汤的肉冷水下锅，烧开后小火慢炖营养更好。',
// ===== 来自 HowToCook 的精选技巧 =====
'🌡️ 油温120-140°C：适合滑炒，筷子入锅不起泡、无青烟。',
'🌡️ 油温150-160°C：最佳烹饪温度，筷子周围冒少许油泡。',
'🌡️ 油温160-180°C：适合上色炸酥，大量青烟但油面平静。',
'🔪 切肉要逆纹理切（牛肉横切），切猪肉可顺纹理，口感大不同。',
'🧂 炒菜盐最后放，避免蔬菜出水变老；炖汤盐中途加更入味。',
'🧄 蒜末在油温五六成热时下锅最香，太早会糊太晚不香。',
'🍳 炒鸡蛋加一点水或料酒，蛋更嫩滑且去除蛋腥味。',
'🐟 煎鱼前用厨房纸吸干水分，鱼皮不破不粘锅。',
'🥬 焯水绿叶菜加几滴油和少许盐，颜色更翠绿。',
'🥩 炒肉丝先上浆（料酒+生抽+淀粉抓匀），肉质更嫩。',
'🍖 炖肉时冷水下锅，大火烧开撇去浮沫再转小火。',
'🍚 煮米饭水高出米面一个指节，分量刚好不糊不干。',
'🍆 茄子切好后撒盐腌制10分钟挤出水，炒时不吃油。',
'🥔 土豆切好后泡水去除多余淀粉，炒出来更爽脆。',
'🦐 虾仁用盐和淀粉抓洗后冲净，炒出来更Q弹剔透。',
'🥦 西兰花焯水加盐和油，颜色更绿口感更脆。',
'🧊 冻肉前先分成小份密封，解冻更快且不损失口感。',
'🔥 热锅冷油是中式炒菜的黄金法则，不粘锅且更香。',
'🍲 炖汤要一次性加足水，中途加水会稀释汤的浓郁度。',
];
const tipArea=document.getElementById('tipArea');
let tipIdx=0;
function showTip(){
  if(!tipArea)return;
  tipArea.innerHTML=`<div style="padding:4px 0">${TIPS[tipIdx]}</div>`;
  tipIdx=(tipIdx+1)%TIPS.length;
}
if(tipArea)showTip();
if(tipArea)setInterval(showTip,20000);

// ===== 调试模式（本地环境可用，push 版本隐藏）=====
let debugMode=false;
function toggleDebug(){
  if(!isDebugEnv)return;
  debugMode=!debugMode;
  document.getElementById('dbToggle').classList.toggle('on',debugMode);
  document.getElementById('dbPanel').classList.toggle('show',debugMode);
}
function debugFF(hours){
  if(!debugMode||!isDebugEnv)return;
  const ms=hours*3600*1000;
  let count=0;
  farmPlots.forEach(p=>{
    if(p.crop&&p.plantedAt){p.plantedAt-=ms;count++;}
  });
  renderFarm();renderFarmInv();
  toast('⏩',`快进 ${hours} 小时，影响 ${count} 块农田`);
}
function debugRipe(){
  if(!debugMode||!isDebugEnv)return;
  let count=0;
  farmPlots.forEach(p=>{
    if(p.crop&&p.plantedAt){p.plantedAt=1;count++;}
  });
  renderFarm();renderFarmInv();
  toast('🌾',`${count} 块农田已全部成熟！`);
}

// ===== 农场系统 =====
function switchTab(tab){
  activeTab=tab;
  document.getElementById('tabKitchen').className='tab'+(tab==='kitchen'?' act':'');
  document.getElementById('tabFarm').className='tab'+(tab==='farm'?' act':'');
  document.querySelector('.game-grid').style.display=tab==='kitchen'?'grid':'none';
  document.getElementById('farmView').className='farm-view'+(tab==='farm'?' show':'');
  if(tab==='farm'){renderFarm();startFarmTimer();}else{stopFarmTimer();deselectSeed();showTip();}
}
function startFarmTimer(){
  if(farmTimerId)return;
  farmTimerId=setInterval(()=>{renderFarm();},1000);
}
function stopFarmTimer(){if(farmTimerId){clearInterval(farmTimerId);farmTimerId=null;}}
function buySeed(cropId){
  const c=CROPS_DATA.find(x=>x.id===cropId);if(!c)return;
  const lv=getLv();if(lv<c.unlock){toast('🔒',`Lv.${c.unlock} 解锁`);return;}
  // 默认购买数量 = 已解锁的空地数
  const emptyPlots=unlockedPlots-farmPlots.slice(0,unlockedPlots).filter(p=>p.crop).length;
  const maxBuy=Math.floor(totalRevenue/c.cost);
  const suggested=Math.min(emptyPlots||1,Math.max(1,maxBuy));
  const qty=prompt(`购买几颗 ${c.emoji}${cropId} 种子？（¥${c.cost}/颗）`,suggested);
  if(qty===null)return;
  const n=parseInt(qty);
  if(isNaN(n)||n<1){toast('😅','请输入有效数量');return;}
  const cost=n*c.cost;
  if(totalRevenue<cost){toast('😅',`需要 ¥${cost}，金币不够！`);return;}
  totalRevenue-=cost;farmSeeds[cropId]=(farmSeeds[cropId]||0)+n;
  upMoney();renderFarm();addLog('🌱',`购买${c.emoji}x${n}种子，花¥${cost}`);
}
function plantAll(){
  const avail=Object.keys(farmSeeds).filter(s=>farmSeeds[s]>0);
  if(!avail.length){toast('🌱','没有种子！');return;}
  // 按 tier 降序、价格降序排列（优先种成熟时间长、价格高的）
  const sorted=avail.map(id=>{
    const c=CROPS_DATA.find(x=>x.id===id);
    return{id,tier:c?.tier||0,cost:c?.cost||0};
  }).sort((a,b)=>b.tier-a.tier||b.cost-a.cost);
  let planted=0;
  for(let i=0;i<unlockedPlots;i++){
    const p=farmPlots[i];
    if(p.crop)continue;
    const seed=sorted.find(s=>farmSeeds[s.id]>0);
    if(!seed)break;
    const c=CROPS_DATA.find(x=>x.id===seed.id);
    farmSeeds[seed.id]--;
    if(farmSeeds[seed.id]<=0)delete farmSeeds[seed.id];
    p.crop=seed.id;p.plantedAt=Date.now();p.growTime=c.growMins*60*1000;
    planted++;
  }
  if(planted>0){
    seedSelected=null;
    addLog('🌱',`一键种植${planted}块地`);
    renderFarm();
    toast('🌱',`种植了 ${planted} 块地`);
  }else{toast('🌱','没有空地或种子了');}
}
function unlockPlot(idx){
  if(idx<unlockedPlots)return;
  const lv=getLv();const maxByLv=Math.min(25,4+lv*2);
  if(idx>=maxByLv){toast('🔒',`Lv.${Math.ceil((idx-3)/2)} 解锁更多土地`);return;}
  const cost=15+Math.floor(idx/5)*30+(idx%5)*5;
  if(totalRevenue<cost){toast('😅',`开垦需要 ¥${cost}`);return;}
  totalRevenue-=cost;unlockedPlots++;upMoney();
  addLog('🔓',`开垦第${unlockedPlots}块地`);
  renderFarm();
}
function selectSeed(id){
  if(seedSelected===id){seedSelected=null;renderFarm();return;}
  const c=CROPS_DATA.find(x=>x.id===id);
  if(!c||!(farmSeeds[id]||0))return;
  const lv=getLv();if(lv<c.unlock){toast('🔒',`Lv.${c.unlock} 解锁`);return;}
  seedSelected=id;
  renderFarm();
  addLog('🌱',`选中种子${c.emoji}${id}`);
}
function deselectSeed(){seedSelected=null;renderFarm();}
function plantCrop(plotIdx){
  const p=farmPlots[plotIdx];if(!p||p.crop)return;
  if(!seedSelected||!(farmSeeds[seedSelected]||0)){toast('🌱','请先从种子袋选择种子');return;}
  const c=CROPS_DATA.find(x=>x.id===seedSelected);
  if(!c)return;
  const seedId=seedSelected; // 保存种子ID（deselectSeed 会清空 seedSelected）
  farmSeeds[seedId]--;if(farmSeeds[seedId]<=0){delete farmSeeds[seedId];deselectSeed();}
  p.crop=seedId;p.plantedAt=Date.now();p.growTime=c.growMins*60*1000;
  addLog('🌱',`种植${c.emoji}（${c.growMins}m 后成熟）`);
  renderFarm();
}
function harvestCrop(plotIdx){
  const p=farmPlots[plotIdx];if(!p||!p.crop)return;
  if(Date.now()-p.plantedAt<p.growTime){toast('⏳','还没成熟！');return;}
  const c=CROPS_DATA.find(x=>x.id===p.crop);
  // 浮动产量：yieldMin ~ yieldMax
  const qty=c.yieldMin+Math.floor(Math.random()*(c.yieldMax-c.yieldMin+1));
  // 食材使用次数：农仓每单位 × tier 倍率
  const mult=TIER_MULT[c.tier]||3;
  const totalUses=qty*mult;
  farmInventory[c.id]=(farmInventory[c.id]||0)+qty;
  farmUses[c.id]=(farmUses[c.id]||0)+totalUses;
  ingredientUses[c.id]=(ingredientUses[c.id]||0)+totalUses;
  addLog('🌾',`收获${c.emoji}x${qty}（农仓+${qty}，可用${totalUses}次）`);
  sndCoin();
  p.crop=null;p.plantedAt=null;p.growTime=0;
  renderFarm();renderFarmInv();renderIG();
  return qty;
}
function harvestAll(){
  let total=0,count=0;
  farmPlots.forEach((p,i)=>{
    if(p.crop&&p.plantedAt&&Date.now()-p.plantedAt>=p.growTime){
      const c=CROPS_DATA.find(x=>x.id===p.crop);
      if(!c)return;
      const qty=c.yieldMin+Math.floor(Math.random()*(c.yieldMax-c.yieldMin+1));
      const mult=TIER_MULT[c.tier]||3;
      const totalUses=qty*mult;
      farmInventory[c.id]=(farmInventory[c.id]||0)+qty;
      farmUses[c.id]=(farmUses[c.id]||0)+totalUses;
      ingredientUses[c.id]=(ingredientUses[c.id]||0)+totalUses;
      total+=qty;count++;
      p.crop=null;p.plantedAt=null;p.growTime=0;
    }
  });
  if(count>0){
    sndCoin();
    addLog('🌾',`一键收获${count}块地，共${total}个果实`);
    renderFarm();renderFarmInv();renderIG();
    toast('🌾',`收获${count}块地 +${total}果实`);
  }else{toast('🌾','没有可收获的作物');}
}
function renderFarm(){
  document.getElementById('farmMoney').textContent='¥'+totalRevenue;
  const totalSeeds=Object.values(farmSeeds).reduce((a,b)=>a+b,0);
  document.getElementById('seedCount').textContent=totalSeeds;
  document.getElementById('plotCount').textContent=unlockedPlots;
  const maxPlots=Math.min(25,unlockedPlots);
  document.getElementById('farmGrid').innerHTML=farmPlots.map((p,i)=>{
    if(i>=maxPlots){
      const cost=15+Math.floor(i/5)*30+(i%5)*5;
      return '<div class="plot" style="background:#d8cdc0;cursor:pointer" onclick="unlockPlot('+i+')" title="开垦 ¥'+cost+'">🔒<span class="lock">¥'+cost+'</span></div>';
    }
    if(!p.crop){
      return '<div class="plot'+(seedSelected?' ready':'')+'" onclick="plantCrop('+i+')" title="'+(seedSelected?'种植 '+seedSelected:'点击播种')+'">🌱</div>';
    }
    const c=CROPS_DATA.find(x=>x.id===p.crop);if(!c)return '<div class="plot">❓</div>';
    const elapsed=Date.now()-p.plantedAt;
    const done=elapsed>=p.growTime;
    const remain=Math.max(0,Math.ceil((p.growTime-elapsed)/1000));
    const rh=Math.floor(remain/3600), rm=Math.floor((remain%3600)/60);
    const timeStr=done?'':(rh>0?rh+'h'+rm+'m':rm+'m');
    return '<div class="plot '+(done?'ripe':'sown')+'" onclick="'+(done?'harvestCrop('+i+')':'\'\'')+'" title="'+(done?'点击收获':c.emoji+' 剩余'+timeStr)+'">'
      +c.emoji+(done?'':'<span class="timer">'+timeStr+'</span>')+'</div>';
  }).join('');
  // 种子袋
  const avail=Object.keys(farmSeeds).filter(s=>farmSeeds[s]>0);
  const lv=getLv();
  document.getElementById('seedBag').innerHTML=avail.length
    ?avail.map(id=>{
      const c=CROPS_DATA.find(x=>x.id===id);
      if(!c||lv<c.unlock)return '';
      const sel=seedSelected===id;
      return '<div class="seed-item'+(sel?' sel':'')+'" onclick="selectSeed(\''+id+'\')" title="'+(sel?'点击取消':c.emoji+' '+id)+'">'
        +'<span class="e">'+c.emoji+'</span><span class="name">'+id+'</span><span class="cnt">x'+farmSeeds[id]+'</span>'
        +(sel?'<span class="sel-mark">✓</span>':'')+'</div>';
    }).join('')
    :'<span style="color:#b8a48c;font-size:.7rem">没有种子，去商店购买</span>';
  document.getElementById('farmShop').innerHTML=CROPS_DATA.filter(c=>lv>=c.unlock).map(c=>{
    const seedOwn=farmSeeds[c.id]||0;
    return '<div class="shop-item" onclick="buySeed(\''+c.id+'\')" title="T'+c.tier+' · '+c.growMins+'m · 每份可用'+(TIER_MULT[c.tier]||3)+'次">'
      +'<span class="e">'+c.emoji+'</span>'+c.id+'<span class="cost">¥'+c.cost+'</span>'
      +'<span style="font-size:.5rem;color:#888;margin-left:2px">'+c.growMins+'m</span>'
      +(seedOwn>0?'<span style="font-size:.5rem;color:#27ae60">x'+seedOwn+'</span>':'')+'</div>';
  }).join('');
}
function sellCrop(name){
  if(!(farmInventory[name]||0))return;
  const c=CROPS_DATA.find(x=>x.id===name);
  if(!c)return;
  // 售价 = 种子价格 × (1 + tier × 0.25)
  const price=Math.floor(c.cost*(1+c.tier*0.25));
  if(price<=0)return;
  // 移除1单位农仓及对应使用次数
  const mult=TIER_MULT[c.tier]||3;
  const removeUses=Math.min(mult,farmUses[name]||0,ingredientUses[name]||0);
  farmInventory[name]--;
  if(farmInventory[name]<=0)delete farmInventory[name];
  if(removeUses>0){
    farmUses[name]=(farmUses[name]||0)-removeUses;
    ingredientUses[name]=(ingredientUses[name]||0)-removeUses;
    if((farmUses[name]||0)<=0)delete farmUses[name];
    if((ingredientUses[name]||0)<=0)delete ingredientUses[name];
  }
  // 加钱
  totalRevenue+=price;
  addLog('💰',`卖出${c.emoji}${name}，得¥${price}`);
  upMoney();renderFarm();renderFarmInv();renderIG();
  toast('💰',`卖出${c.emoji} +¥${price}`);
}
function sellAllCrops(){
  const names=Object.keys(farmInventory);
  if(!names.length){toast('📦','农仓是空的');return;}
  let total=0,count=0;
  names.forEach(name=>{
    while((farmInventory[name]||0)>0){
      const c=CROPS_DATA.find(x=>x.id===name);
      if(!c)break;
      const price=Math.floor(c.cost*(1+c.tier*0.25));
      if(price<=0)break;
      const mult=TIER_MULT[c.tier]||3;
      const removeUses=Math.min(mult,farmUses[name]||0,ingredientUses[name]||0);
      farmInventory[name]--;
      if(removeUses>0){
        farmUses[name]=(farmUses[name]||0)-removeUses;
        ingredientUses[name]=(ingredientUses[name]||0)-removeUses;
        if((farmUses[name]||0)<=0)delete farmUses[name];
        if((ingredientUses[name]||0)<=0)delete ingredientUses[name];
      }
      total+=price;count++;
    }
    if(farmInventory[name]<=0)delete farmInventory[name];
  });
  if(count>0){
    totalRevenue+=total;
    addLog('💰',`一键卖出${count}份，得¥${total}`);
    upMoney();renderFarm();renderFarmInv();renderIG();
    toast('💰',`卖出${count}份 +¥${total}`);
  }
}
function renderFarmInv(){
  const keys=Object.keys(farmInventory).filter(k=>farmInventory[k]>0);
  document.getElementById('sellAllBtn').style.display=keys.length?'inline':'none';
  document.getElementById('farmInv').innerHTML=keys.length
    ?keys.map(k=>{
      const c=CROPS_DATA.find(x=>x.id===k);
      const price=c?Math.floor(c.cost*(1+c.tier*0.25)):0;
      return '<span class="fi">'+(ALL_E[k]||'🥬')+k+'<span class="cnt">x'+farmInventory[k]+'</span>'
        +(price>0?'<button class="sell-btn" onclick="sellCrop(\''+k+'\')">¥'+price+'</button>':'')+'</span>';
    }).join('')
    :'<span style="color:#b8a48c;font-size:.7rem">收获的食材会出现在这里</span>';
}

// ===== 成就系统 =====
const ACHV=[
  {id:'g100',icon:'🥉',name:'第一桶金',desc:'第一次上菜成功',check:()=>totalCompleted>0},
  {id:'c10',icon:'🍳',name:'菜真的熟了！',desc:'制作10份菜',check:()=>totalCompleted>=10},
  {id:'v10',icon:'🔪',name:'牛刀小试',desc:'制作10个不同菜品',check:()=>new Set(completedDishes).size>=10},
  {id:'all',icon:'👑',name:'叫我厨神',desc:'制作全部9类菜品',check:()=>{const cats=new Set();R.forEach(r=>{if(completedDishes.includes(r.n))cats.add(r.c)});return cats.size>=9;}},
];
function checkAchv(){
  let newUnlock=false;
  ACHV.forEach(a=>{
    if(!unlockedAchv[a.id]&&a.check()){
      unlockedAchv[a.id]=true;newUnlock=true;
      sndAchv();
      toast(a.icon,`🏆 成就解锁：${a.name}！`);
    }
  });
  if(newUnlock){renderAchv();}
}
function renderAchv(){
  const unlocked=ACHV.filter(a=>unlockedAchv[a.id]);
  document.getElementById('achvGrid').innerHTML=unlocked.length?unlocked.map(a=>
    `<div class="achv-item unlocked"><span class="ai">${a.icon}</span><span class="an">${a.name}</span><span class="ad">✓ ${a.desc}</span></div>`
  ).join(''):'<div style="color:#b8a48c;font-size:.6rem;text-align:center;padding:8px 0">完成菜品解锁成就</div>';
}

// ===== 导出/导入存档 =====
function exportSave(){
  const data={d:totalDays,r:totalRevenue,c:totalCompleted,cd:completedDishes,ua:unlockedAchv,sk:stock,fi:farmInventory,fp:farmPlots,fs:farmSeeds,up:unlockedPlots,iu:ingredientUses,fu:farmUses,bh:lastBizHour,ev:currentEvent?currentEvent.id:null,ed:eventDayCount,sd:soundOn?1:0,t:Date.now()};
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const ts=new Date().toISOString().replace(/[:.]/g,'-').slice(0,19);
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);
  a.download=`foodtruck_${ts}.json`;a.click();URL.revokeObjectURL(a.href);
  toast('💾','存档已导出');
}
function importSave(e){
  const file=e.target.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=function(ev){
    try{
      const s=JSON.parse(ev.target.result);
      if(typeof s.d==='number'&&typeof s.c==='number'){
        totalDays=s.d;totalRevenue=s.r||0;totalCompleted=s.c;
        completedDishes=s.cd||[];unlockedAchv=s.ua||{};stock=s.sk||{};farmInventory=s.fi||{};farmPlots=s.fp||Array(25).fill(null).map(()=>({crop:null,plantedAt:null,growTime:0}));farmSeeds=s.fs||{};unlockedPlots=s.up||6;ingredientUses=s.iu||{};farmUses=s.fu||{};lastBizHour=s.bh!==undefined?s.bh:-1;
        day=totalDays||1;updateDay();if(s.sd!==undefined)soundOn=!!s.sd;document.getElementById('soundBtn').textContent=soundOn?'🔊':'🔇';
        // 读取事件状态
        currentEvent=null;eventDayCount=s.ed||0;
        if(s.ev){const f=EVENTS.find(e=>e.id===s.ev);if(f)currentEvent=f;}
        localStorage.setItem('foodtruck',JSON.stringify({d:totalDays,r:totalRevenue,c:totalCompleted,cd:completedDishes,ua:unlockedAchv,sk:stock,fi:farmInventory,fp:farmPlots,fs:farmSeeds,up:unlockedPlots,iu:ingredientUses,fu:farmUses,bh:lastBizHour,ev:currentEvent?currentEvent.id:null,ed:eventDayCount,t:Date.now()}));
        toast('✅','存档已导入！');
        renderIG();renderOrders();renderServe();renderStoves();renderAchv();renderEvent();
      }else throw new Error('格式无效');
    }catch(err){toast('❌','导入失败：文件格式不正确');}
  };
  reader.readAsText(file);
  e.target.value='';
}
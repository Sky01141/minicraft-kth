const http=require('http'),fs=require('fs'),path=require('path');
const {WebSocketServer}=require('ws');
const PUB=path.join(__dirname,'public'),MIME={'.html':'text/html;charset=utf-8','.js':'text/javascript','.css':'text/css'};
const server=http.createServer((req,res)=>{
  if(req.url=='/healthz')return res.writeHead(200).end('ok');
  let p=decodeURIComponent(req.url.split('?')[0]);if(p=='/')p='/index.html';
  const f=path.normalize(path.join(PUB,p));
  if(!f.startsWith(PUB))return res.writeHead(403).end();
  fs.readFile(f,(e,d)=>{if(e)return res.writeHead(404).end('not found');res.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream'});res.end(d)});
});
const wss=new WebSocketServer({server});
// ---- ワールド(シード & ブロック変更の保存) ----
const DATA=process.env.DATA_DIR||path.join(__dirname,'data'),FILE=path.join(DATA,'world.json');
// 数字はそのまま、文字列はハッシュ化、空ならランダム
const toSeed=v=>{v=String(v??'').trim();if(!v)return Math.floor(Math.random()*2147483647);
  if(/^-?\d+$/.test(v))return Number(v)%2147483647;let h=0;for(const c of v)h=Math.imul(31,h)+c.charCodeAt(0)|0;return Math.abs(h)};
const envSeed=process.env.SEED?toSeed(process.env.SEED):undefined;
let seed,edits=new Map();const players=new Map();let nextId=1;
try{const w=JSON.parse(fs.readFileSync(FILE,'utf8'));
  if(envSeed===undefined||envSeed===w.seed){seed=w.seed;edits=new Map(w.edits)}}catch{}
if(seed===undefined)seed=envSeed??toSeed('');
let st;const save=()=>{clearTimeout(st);st=setTimeout(()=>{try{fs.mkdirSync(DATA,{recursive:true});fs.writeFileSync(FILE,JSON.stringify({seed,edits:[...edits]}))}catch(e){console.error('save failed',e.message)}},2000)};
const crypto=require('crypto');
const isAdmin=k=>{const a=Buffer.from(String(k||'')),b=Buffer.from(process.env.ADMIN_KEY||'');return b.length>0&&a.length==b.length&&crypto.timingSafeEqual(a,b)};
console.log('world seed:',seed,'edits:',edits.size);
const send=(w,o)=>w.readyState===1&&w.send(JSON.stringify(o));
const bcast=(o,ex)=>{for(const w of players.keys())if(w!==ex)send(w,o)};
const HEX=/^#[0-9a-f]{6}$/i,DEF={skin:'#e0b48c',hair:'#4a3020',shirt:'#3aa0d0',pants:'#3b4a9c',style:1};
const cleanLook=l=>{l=l||{};const o={};for(const k of['skin','hair','shirt','pants'])o[k]=HEX.test(l[k])?l[k]:DEF[k];o.style=[0,1,2].includes(l.style)?l.style:1;return o};
wss.on('connection',ws=>{
  const me={id:nextId++,name:null,x:8,y:60,z:8,ry:0,look:cleanLook()};players.set(ws,me);ws.alive=true;
  ws.on('pong',()=>ws.alive=true);
  send(ws,{t:'init',id:me.id,seed,admin:!!process.env.ADMIN_KEY,
    edits:[...edits].map(([k,b])=>[...k.split(',').map(Number),b]),
    players:[...players.values()].filter(p=>p.name&&p!==me)});
  ws.on('message',raw=>{
    let m;try{m=JSON.parse(raw)}catch{return}
    if(m.t=='hello'){me.name=String(m.name||'Player').slice(0,12);me.look=cleanLook(m.look);bcast({t:'join',...me},ws)}
    else if(m.t=='newseed'){
      if(isAdmin(m.key)){seed=toSeed(m.seed);edits.clear();save();bcast({t:'world',seed});console.log('new seed',seed)}
      else send(ws,{t:'err',msg:'管理者キーが違います(サーバーに ADMIN_KEY が未設定の場合も使えません)'})}
    else if(m.t=='look'&&me.name){me.look=cleanLook(m.look);bcast({t:'look',id:me.id,look:me.look},ws)}
    else if(m.t=='pos'&&me.name){me.x=+m.x||0;me.y=+m.y||0;me.z=+m.z||0;me.ry=+m.ry||0;bcast({t:'pos',id:me.id,x:me.x,y:me.y,z:me.z,ry:me.ry},ws)}
    else if(m.t=='set'){const{x,y,z,b}=m;
      if([x,y,z,b].every(Number.isInteger)&&y>=0&&y<64&&b>=0&&b<=8&&Math.abs(x)<1e6&&Math.abs(z)<1e6){
        edits.set(x+','+y+','+z,b);save();bcast({t:'set',x,y,z,b},ws)}}
  });
  ws.on('close',()=>{players.delete(ws);bcast({t:'leave',id:me.id})});
});
setInterval(()=>{for(const w of wss.clients){if(!w.alive){w.terminate();continue}w.alive=false;w.ping()}},30000);
server.listen(process.env.PORT||3000,()=>console.log('listening'));

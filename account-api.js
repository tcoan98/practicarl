// PracticarL account and compact progress sync. Passwords and session tokens never leave this Worker for storage.
const ORIGIN="https://tcoan98.github.io";
const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json","Cache-Control":"no-store","Access-Control-Allow-Origin":ORIGIN,"Vary":"Origin"}});
const bytesToHex=buf=>Array.from(new Uint8Array(buf),b=>b.toString(16).padStart(2,"0")).join("");
const digest=async value=>bytesToHex(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value)));
const random=()=>{const b=crypto.getRandomValues(new Uint8Array(32));return Array.from(b,x=>x.toString(16).padStart(2,"0")).join("")};
const passhash=async(password,salt,iterations=60000)=>{const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(password),"PBKDF2",false,["deriveBits"]);return bytesToHex(await crypto.subtle.deriveBits({name:"PBKDF2",salt:new TextEncoder().encode(salt),iterations,hash:"SHA-256"},key,256))};
const constantTime=(a,b)=>{if(a.length!==b.length)return false;let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);return diff===0};
const cleanText=(v,n)=>String(v||"").slice(0,n);
function compact(input){
 if(!input||typeof input!=="object"||Array.isArray(input))throw Error("Invalid profile");
 const vocabulary=(Array.isArray(input.vocabulary)?input.vocabulary:[]).slice(0,3000).filter(v=>v&&typeof v.spanish==="string"&&typeof v.english==="string").map(v=>({spanish:cleanText(v.spanish,100),english:cleanText(v.english,120),familiarity:Math.max(0,Math.min(4,Number(v.familiarity)||0)),type:cleanText(v.type,20),infinitive:cleanText(v.infinitive,70),example:cleanText(v.example,200),note:cleanText(v.note,250),conjugations:Object.fromEntries(Object.entries(v.conjugations&&typeof v.conjugations==="object"?v.conjugations:{}).filter(([k])=>["yo","tu","el","nosotros","ellos"].includes(k)).map(([k,val])=>[k,cleanText(val,60)])),added:cleanText(v.added,40),lastReviewed:cleanText(v.lastReviewed,40)}));
 const grammar=(Array.isArray(input.grammar)?input.grammar:[]).slice(0,2000).filter(x=>x&&typeof x.english==="string"&&typeof x.spanish==="string").map(x=>({id:cleanText(x.id,120),english:cleanText(x.english,180),spanish:cleanText(x.spanish,180),rule:cleanText(x.rule,300),category:cleanText(x.category,70)}));
 const attempts=(Array.isArray(input.attempts)?input.attempts:[]).slice(-1000).filter(a=>a&&typeof a.english==="string").map(a=>({id:cleanText(a.id,120),english:cleanText(a.english,180),answer:cleanText(a.answer,180),suggested:cleanText(a.suggested,180),category:cleanText(a.category,70),confident:a.confident===true,date:cleanText(a.date,40)}));
 return {vocabulary,grammar,attempts,level:Math.max(1,Math.min(8,Number(input.level)||1)),completedAtLevel:Math.max(0,Math.min(2,Number(input.completedAtLevel)||0))};
}
async function tables(db){await db.prepare("CREATE TABLE IF NOT EXISTS accounts (id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE, salt TEXT NOT NULL, password_hash TEXT NOT NULL, created_at TEXT NOT NULL)").run();await db.prepare("CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, account_id TEXT NOT NULL, expires_at INTEGER NOT NULL)").run();await db.prepare("CREATE TABLE IF NOT EXISTS profiles (account_id TEXT PRIMARY KEY, revision INTEGER NOT NULL DEFAULT 0, data TEXT NOT NULL)").run()}
async function accountFromToken(request,db){const h=request.headers.get("Authorization")||"";if(!/^Bearer [a-f0-9]{64}$/.test(h))return null;const hash=await digest(h.slice(7));return await db.prepare("SELECT a.id,a.username FROM sessions s JOIN accounts a ON a.id=s.account_id WHERE s.token_hash=? AND s.expires_at>?").bind(hash,Date.now()).first()}
const loginFailures=new Map();
export async function accountRoute(request,env,path){
 if(!env.DB)return reply({error:"Cloudflare database binding unavailable"},503);
 if(request.method!=="POST")return reply({error:"Method not allowed"},405);
 if(Number(request.headers.get("content-length")||0)>350000)return reply({error:"Request too large"},413);
 let data;try{const raw=await request.text();if(raw.length>350000)throw Error();data=JSON.parse(raw)}catch{return reply({error:"Invalid request"},400)}
 let stage="database_setup";try{
 const db=env.DB;await tables(db);stage="account_lookup";
 if(path==="/auth/register"||path==="/auth/login"){
 const username=String(data.username||"").trim().toLowerCase(),password=data.password;
 if(!/^[a-z0-9_-]{3,35}$/.test(username)||typeof password!=="string"||password.length<6||password.length>128)return reply({error:"Use a 3–35 character username (letters, numbers, _ or -) and a password of at least 6 characters."},400);
 const ip=request.headers.get("CF-Connecting-IP")||"unknown",k=ip+":"+username,entry=loginFailures.get(k);
 if(entry&&entry.until>Date.now()&&entry.count>=6)return reply({error:"Too many sign-in attempts. Try again in 15 minutes."},429);
 let a=await db.prepare("SELECT * FROM accounts WHERE username=?").bind(username).first();stage="password_processing";
 if(path==="/auth/register"){
 if(a)return reply({error:"That username is already registered. Sign in instead, or choose another."},409);
 const id=crypto.randomUUID(),salt="v2:"+random(),hash=await passhash(password,salt,60000);stage="account_insert";
 try{await db.prepare("INSERT INTO accounts (id,username,salt,password_hash,created_at) VALUES (?,?,?,?,?)").bind(id,username,salt,hash,new Date().toISOString()).run()}catch{return reply({error:"Username unavailable"},409)}
 a={id,username};stage="profile_insert";await db.prepare("INSERT INTO profiles (account_id,revision,data) VALUES (?,0,?)").bind(id,JSON.stringify(compact({}))).run();
 }else{
 const calculated=await passhash(password,a?.salt||"v2:placeholder-salt",a?.salt?.startsWith("v2:")||!a?60000:160000);
 if(!a||!constantTime(calculated,a.password_hash)){const now=Date.now(),old=loginFailures.get(k);loginFailures.set(k,{count:old&&old.until>now?old.count+1:1,until:now+900000});return reply({error:"Incorrect username or password"},401)}
 }
 loginFailures.delete(k);stage="session_insert";const token=random(),tokenHash=await digest(token);await db.prepare("INSERT INTO sessions (token_hash,account_id,expires_at) VALUES (?,?,?)").bind(tokenHash,a.id,Date.now()+30*86400000).run();
 return reply({token,username:a.username});
 }
 stage="session_lookup";const account=await accountFromToken(request,db);if(!account)return reply({error:"Session expired. Sign in again."},401);
 if(path==="/auth/logout"){const hash=await digest((request.headers.get("Authorization")||"").slice(7));await db.prepare("DELETE FROM sessions WHERE token_hash=?").bind(hash).run();return reply({ok:true})}
 if(path==="/sync/pull"){stage="profile_read";const row=await db.prepare("SELECT revision,data FROM profiles WHERE account_id=?").bind(account.id).first();return reply({revision:row?.revision||0,profile:JSON.parse(row?.data||"{}")})}
 if(path==="/sync/push"){stage="profile_write";
 const revision=Number(data.revision);if(!Number.isSafeInteger(revision)||revision<0)return reply({error:"Invalid revision"},400);
 let profile;try{profile=compact(data.profile)}catch{return reply({error:"Invalid profile"},400)}
 const payload=JSON.stringify(profile);if(payload.length>250000)return reply({error:"Profile exceeds 250 KB. Export a backup and contact the site owner."},413);
 const result=await db.prepare("UPDATE profiles SET data=?,revision=revision+1 WHERE account_id=? AND revision=?").bind(payload,account.id,revision).run();
 if(!result.meta?.changes)return reply({error:"Progress changed on another device. Refreshing the latest version.",code:"SYNC_CONFLICT"},409);
 return reply({revision:revision+1});
 }
 return reply({error:"Not found"},404);
 }catch(e){console.error("PracticarL account failure",stage,e?.name||"Error",String(e?.message||"").slice(0,180));return reply({error:stage==="database_setup"?"Account database initialization failed. Check the D1 binding and database permissions.":"Account request failed during "+stage.replaceAll("_"," ")+". Please try again later.",code:stage==="database_setup"?"DATABASE_SETUP_FAILED":"ACCOUNT_OPERATION_FAILED",stage},503)}
}

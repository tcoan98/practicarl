// Compact cloud sync for PracticarL. Full conversation transcripts stay in browser storage.
const PracticarCloud=(()=>{
 const endpoint="https://practicarl-api.tcoan98.workers.dev";
 let token="",revision=0,timer=null,busy=false,dirty=false,lastError="",account="";
 const key="practicarl-cloud-session";
 const normalize=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();
 const uniq=(list,fn)=>{const map=new Map();for(const x of list){const k=fn(x);if(k)map.set(k,x)}return [...map.values()]};
 const grammarFrom=state=>[...(state.cloudGrammar||[]),...(state.conversations||[]).flatMap((c,i)=>(c.review?.exercises||[]).filter(e=>e.english&&e.spanish).map((e,j)=>({...e,id:(c.date||i)+":"+j})))];
 const pack=state=>({vocabulary:(state.vocabulary||[]).map(v=>({...v})),grammar:uniq(grammarFrom(state),g=>normalize(g.english)+"|"+normalize(g.spanish)),attempts:(state.grammarAttempts||[]).slice(-1000),level:state.level||1,completedAtLevel:state.completedAtLevel||0});
 const merge=(local,remote)=>{const r=remote||{},a=pack(local);
 const vocabulary=new Map();for(const v of r.vocabulary||[])vocabulary.set(normalize(v.spanish),v);
 for(const v of a.vocabulary){const k=normalize(v.spanish),prev=vocabulary.get(k);if(!prev||String(v.lastReviewed||v.added||"")>=String(prev.lastReviewed||prev.added||""))vocabulary.set(k,v)}
 local.vocabulary=[...vocabulary.values()];
 local.cloudGrammar=uniq([...(r.grammar||[]),...a.grammar],g=>normalize(g.english)+"|"+normalize(g.spanish));
 local.grammarAttempts=uniq([...(r.attempts||[]),...a.attempts],g=>[g.date,g.english,g.answer].join("|")).slice(-1000);
 local.level=Math.max(Number(local.level)||1,Number(r.level)||1);
 local.completedAtLevel=Math.max(Number(local.completedAtLevel)||0,Number(r.completedAtLevel)||0);
 return local};
 async function request(path,body,auth=true){const res=await fetch(endpoint+path,{method:"POST",headers:{"Content-Type":"application/json",...(auth&&token?{"Authorization":"Bearer "+token}:{})},body:JSON.stringify(body||{})});const data=await res.json().catch(()=>({}));if(!res.ok){const e=new Error(data.error||"Cloud service error ("+res.status+")");e.status=res.status;e.code=data.code;throw e}return data}
 async function connect(username,password,register,state,saveLocal){const result=await request(register?"/auth/register":"/auth/login",{username,password},false);token=result.token;account=result.username;revision=0;localStorage.setItem(key,JSON.stringify({token,username:account}));try{await pullAndMerge(state,saveLocal);await flush(state,saveLocal)}catch(e){lastError=e.message}return {username:account,error:lastError}}
 async function pullAndMerge(state,saveLocal){const data=await request("/sync/pull",{});revision=data.revision||0;merge(state,data.profile);saveLocal();dirty=true;lastError=""}
 async function flush(state,saveLocal){if(!token||busy)return;busy=true;try{for(let i=0;i<3;i++){dirty=false;try{const result=await request("/sync/push",{revision,profile:pack(state)});revision=result.revision;lastError="";if(!dirty)break}catch(e){if(e.status===409){await pullAndMerge(state,saveLocal);continue}throw e}}}catch(e){lastError=e.message;dirty=true}finally{busy=false;if(dirty&&token){clearTimeout(timer);timer=setTimeout(()=>flush(state,saveLocal),12000)}}}
 function changed(state,saveLocal){if(!token)return;dirty=true;clearTimeout(timer);timer=setTimeout(()=>flush(state,saveLocal),1800)}
 async function restore(state,saveLocal){try{const stored=JSON.parse(localStorage.getItem(key)||"null");if(!stored?.token||!stored.username)return false;token=stored.token;account=stored.username;await pullAndMerge(state,saveLocal);await flush(state,saveLocal);return true}catch(e){lastError=e.message;if(e.status===401){localStorage.removeItem(key);token="";account=""}return false}}
 function logout(){const old=token;token="";account="";revision=0;dirty=false;clearTimeout(timer);localStorage.removeItem(key);if(old)fetch(endpoint+"/auth/logout",{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+old},body:"{}"}).catch(()=>{})}
 async function syncNow(state,saveLocal){if(!token)throw Error("Sign in first");await pullAndMerge(state,saveLocal);await flush(state,saveLocal);if(lastError)throw Error(lastError)}
 return {connect,restore,changed,logout,syncNow,pack,get username(){return account},get connected(){return !!token},get error(){return lastError}};
})();

// PracticarL Stage 1.1: offline guided conversation with vocabulary repair.
// No API, no generative AI. Only curated vocabulary clues can be guessed.
window.PracticarEngine=(()=>{
const vocabulary=[
{en:["bear"],es:"oso",clues:["animal","grande","peludo","bosque","marron","pelo"]},
{en:["library"],es:"biblioteca",clues:["libro","leer","estudiar","prestar","silencio"]},
{en:["squirrel"],es:"ardilla",clues:["animal","pequeno","cola","arbol","nuez","nueces"]},
{en:["umbrella"],es:"paraguas",clues:["lluvia","mojar","agua","abrir","cabeza"]},
{en:["grocery","groceries"],es:"comestibles",clues:["comprar","comida","tienda","supermercado","alimento"]},
{en:["hiking"],es:"senderismo",clues:["caminar","montana","bosque","naturaleza","sendero"]},
{en:["appointment"],es:"cita",clues:["doctor","medico","hora","reunion","reservar"]},
{en:["neighbor"],es:"vecino",clues:["persona","casa","vive","cerca","lado"]},
{en:["receipt"],es:"recibo",clues:["papel","pagar","compra","precio","tienda"]},
{en:["wallet"],es:"cartera",clues:["dinero","tarjeta","bolsillo","guardar"]},
{en:["backpack"],es:"mochila",clues:["bolsa","espalda","llevar","libros","escuela"]},
{en:["ticket"],es:"boleto",clues:["tren","autobus","entrada","viaje","comprar"]},
{en:["beach"],es:"playa",clues:["mar","arena","agua","nadar","sol"]},
{en:["movie"],es:"película",clues:["cine","ver","pantalla","actores","historia"]},
{en:["garden"],es:"jardín",clues:["plantas","flores","tierra","crecer","casa"]},
{en:["forest"],es:"bosque",clues:["arboles","naturaleza","animales","caminar"]},
{en:["busy"],es:"ocupado",clues:["trabajo","tiempo","muchas","cosas","hacer"]},
{en:["excited"],es:"emocionado",clues:["feliz","alegre","esperar","ganas"]},
{en:["tired"],es:"cansado",clues:["dormir","sueno","energia","trabajo"]},
{en:["breakfast"],es:"desayuno",clues:["comer","manana","cafe","pan","huevo"]}
];
const norm=s=>String(s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-zñ\s]/g," ").replace(/\s+/g," ").trim();
const tokens=s=>norm(s).split(" ").filter(Boolean);
const commonEnglish=new Set("the and but with because for from this that there where when what why how have has had would should could went want need know think like really very just then after before about some any my your our their i you we they he she it is are was were do does did can will not dont didnt its im to of in on at an a or if yes no hello please thanks thank okay sure maybe something someone thing stuff".split(" "));
const goodbye=/\b(adios|hasta luego|hasta pronto|nos vemos|chao|chau|goodbye|bye)\b/;
const phases=[
{label:"Simple present",guide:"Use a short present-tense sentence.",q:["¿Qué te gusta hacer en tu tiempo libre?","¿Qué comida te gusta?","¿Tienes una mascota?","¿Qué haces por la mañana?"],en:["What do you like to do in your free time?","What food do you like?","Do you have a pet?","What do you do in the morning?"]},
{label:"Everyday details",guide:"Add a place, person, or time.",q:["¿Dónde pasas tiempo con tus amigos?","¿Qué haces después del trabajo o de clase?","¿Qué comes normalmente para cenar?"],en:["Where do you spend time with your friends?","What do you do after work or class?","What do you normally eat for dinner?"]},
{label:"Simple reasons",guide:"Try adding porque (because).",q:["¿Qué actividad prefieres y por qué?","¿Qué lugar te gusta visitar y por qué?"],en:["Which activity do you prefer and why?","What place do you like to visit and why?"]},
{label:"Frequency",guide:"Try a veces, siempre, or nunca.",q:["¿Con qué frecuencia cocinas en casa?","¿Con qué frecuencia lees o escuchas música?"],en:["How often do you cook at home?","How often do you read or listen to music?"]},
{label:"Near future",guide:"Try voy a + infinitive.",q:["¿Qué vas a hacer mañana?","¿Qué vas a hacer este fin de semana?"],en:["What are you going to do tomorrow?","What are you going to do this weekend?"]},
{label:"Recent past",guide:"Try ayer + a past-tense verb.",q:["¿Qué hiciste ayer?","¿Qué comiste ayer?"],en:["What did you do yesterday?","What did you eat yesterday?"]},
{label:"Comparisons",guide:"Try más ... que or menos ... que.",q:["¿Prefieres vivir en una ciudad o en un pueblo?","¿Qué estación del año prefieres?"],en:["Do you prefer living in a city or a town?","Which season do you prefer?"]},
{label:"Longer explanations",guide:"Connect two ideas with porque, pero, or cuando.",q:["¿Cómo sería tu día ideal?","¿Qué te gustaría aprender este año?"],en:["What would your ideal day be like?","What would you like to learn this year?"]}
];
function choose(level,previous){let p=phases[Math.max(0,Math.min(phases.length-1,(level||1)-1))];let choices=p.q.map((q,i)=>({id:"p"+level+"-"+i,level:level||1,q,en:p.en[i],guide:p.guide,label:p.label}));return choices.find(c=>c.id!==previous)||choices[0]}
function detectEnglish(text){let ts=tokens(text);let found=vocabulary.find(v=>v.en.some(w=>ts.includes(w)));if(found)return {word:found.en[0],entry:found};let other=ts.find(w=>commonEnglish.has(w)&&w.length>2);return other?{word:other,entry:null}:null}
function infer(description,entry){if(!entry)return null;let ts=tokens(description);let hits=entry.clues.filter(w=>ts.includes(norm(w)));return hits.length>=2?entry.es:null}
function respond(session,text){let n=norm(text),ts=tokens(text);
if(goodbye.test(n))return {kind:"end",reply:{text:"¡Hasta pronto! Gracias por conversar conmigo.",en:"See you soon! Thanks for chatting with me."}};
if(session.repair){let repair=session.repair;let answer=infer(text,repair.entry);if(answer){return {kind:"repair-solved",word:repair.word,translation:answer,reply:{text:"¿Quieres decir «"+answer+"»? ¡Muy bien! Puedes usar esa palabra en tu respuesta.",en:"Do you mean “"+answer+"”? Great! You can use that word in your answer."}}}
if(ts.length>=3)return {kind:"repair-unresolved",reply:{text:"Gracias por explicarlo. No puedo identificar esa palabra con seguridad. Puedes intentar otra descripción en español, o seguir con la conversación.",en:"Thanks for explaining. I can't identify that word confidently. You can try another description in Spanish, or continue the conversation."}};
return {kind:"repair-unresolved",reply:{text:"¿Puedes describir qué es, cómo es o para qué sirve, usando palabras en español?",en:"Can you describe what it is, what it's like, or what it's used for, using Spanish words?"}}}
let english=detectEnglish(text);if(english)return {kind:"repair",word:english.word,entry:english.entry,reply:{text:"Has usado «"+english.word+"». ¿Puedes explicar qué significa en español, sin usar la palabra en inglés?",en:"You used “"+english.word+"”. Can you explain what it means in Spanish, without using the English word?"}};
if(ts.length<2)return {kind:"clarify",reply:{text:"¿Puedes decirme un poco más? Una frase corta está bien.",en:"Can you tell me a little more? A short sentence is fine."}};
let level=Math.max(1,Math.min(8,session.level||1)),turn=session.turns||0;
if(turn===0)return {kind:"continue",reply:{text:"¡Gracias! ¿Puedes contarme un poco más?",en:"Thanks! Can you tell me a little more?"},level};
if(turn===1)return {kind:"continue",reply:{text:level<=2?"¿Y con quién haces eso normalmente?":"¿Qué es lo que más te gusta de eso?",en:level<=2?"And who do you normally do that with?":"What do you like most about that?"},level};
return {kind:"end",reply:{text:"¡Gracias por compartirlo! Ha sido un placer conversar contigo.",en:"Thanks for sharing! It's been a pleasure chatting with you."},level};
}
return {choose,respond,detectEnglish,infer,phases,vocabulary,norm};
})();
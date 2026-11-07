const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"GET, OPTIONS"};
const memo=new Map<string,{until:number;data:unknown}>();
const allowed=new Set(["fixtures","leagues","standings"]),paramsOk=new Set(["date","live","league","season","team","next","last","timezone","current","search"]);
const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,"Content-Type":"application/json","Cache-Control":"public, max-age=60"}});
Deno.serve(async(req:Request)=>{if(req.method==="OPTIONS")return new Response("ok",{headers:cors});if(req.method!=="GET")return reply({error:"Método não permitido."},405);
const key=Deno.env.get("API_FOOTBALL_KEY");if(!key)return reply({error:"Configure API_FOOTBALL_KEY nos secrets do servidor."},503);
const incoming=new URL(req.url),action=incoming.searchParams.get("action")||"";if(!allowed.has(action))return reply({error:"Consulta não permitida."},400);
const params=new URLSearchParams();for(const [name,value] of incoming.searchParams.entries()){if(name==="action"||name.startsWith("utm_")||name==="gclid"||name==="fbclid")continue;if(!paramsOk.has(name)||value.length>80||!/^[a-zA-Z0-9,\-\s:]+$/.test(value))return reply({error:"Parâmetro inválido."},400);params.set(name,value)}
if(action==="standings"&&(!params.get("league")||!params.get("season")))return reply({error:"Informe liga e temporada."},400);
if(action==="fixtures"&&!params.has("date")&&!params.has("live"))return reply({error:"Informe data ou partidas ao vivo."},400);
const cacheKey=action+"?"+params.toString(),hit=memo.get(cacheKey);if(hit&&hit.until>Date.now())return reply(hit.data);
const target=new URL("https://v3.football.api-sports.io/"+action);params.forEach((v,k)=>target.searchParams.set(k,v));
try{const upstream=await fetch(target,{headers:{"x-apisports-key":key}}),body=await upstream.json();if(!upstream.ok)return reply({error:"Erro retornado pelo fornecedor.",details:body?.errors||upstream.status},upstream.status);memo.set(cacheKey,{until:Date.now()+300000,data:body});return reply(body)}catch{return reply({error:"Falha ao consultar o fornecedor."},502)}});

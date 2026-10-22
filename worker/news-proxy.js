// Cloudflare Worker: tiny read-only relay for the news hub (blogs rarely send CORS headers).
// Deploy:  wrangler deploy worker/news-proxy.js --name cat-news   then paste the worker URL into the hub's "Proxy" link.
// Edit ALLOW to the hosts you actually follow; anything else is refused.
const ALLOW=['calif.io','anthropic.com','www.anthropic.com','substack.com'];   // *.substack.com is allowed too
export default{
  async fetch(req){
    const cors={'access-control-allow-origin':'*','access-control-allow-methods':'GET','vary':'origin'};
    if(req.method==='OPTIONS')return new Response(null,{headers:cors});
    const t=new URL(req.url).searchParams.get('url');
    let u;try{u=new URL(t)}catch(e){return new Response('bad url',{status:400,headers:cors})}
    const ok=u.protocol==='https:'&&ALLOW.some(h=>u.hostname===h||u.hostname.endsWith('.'+h));
    if(!ok)return new Response('host not allowed',{status:403,headers:cors});
    const r=await fetch(u.href,{headers:{'user-agent':'cat-beach-office-news/1','accept':'text/html,application/xml,application/rss+xml,*/*'},cf:{cacheTtl:300,cacheEverything:true}});
    return new Response(r.body,{status:r.status,headers:{...cors,'content-type':r.headers.get('content-type')||'text/plain','cache-control':'public, max-age=300'}});
  }
};

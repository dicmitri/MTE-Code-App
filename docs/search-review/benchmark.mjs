// Local comparative measurements; not an application performance guarantee or CI threshold.
import {readFileSync,writeFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {makeStage,query,BASE} from './review-tools.mjs';
const qs=JSON.parse(readFileSync(new URL('./queries.json',import.meta.url))).queries;
const names=['original','fixes','expanded'];
const samples=Object.fromEntries(names.map(n=>[n,{build:[],queries:[]}]));
for(let round=0;round<12;round++)for(let offset=0;offset<3;offset++){
 const name=names[(round+offset)%3], stage=makeStage(name);
 for(const q of qs)query(stage,q.scope,q.query);
 if(round<3)continue;
 samples[name].build.push(stage.buildMs);
 for(const q of qs){const t=performance.now();query(stage,q.scope,q.query);samples[name].queries.push(performance.now()-t);}
}
const percentile=(arr,p)=>[...arr].sort((a,b)=>a-b)[Math.floor(arr.length*p)];
const output={base:BASE,method:'Three warmup rounds; nine measured rounds per stage; stage order rotated each round; query set of 111. Same local process and pinned documents. Timings vary by machine/load and are not a release threshold.',stages:names.map(name=>({name,buildSamples:samples[name].build.length,querySamples:samples[name].queries.length,buildMedianMs:percentile(samples[name].build,.5),buildP95Ms:percentile(samples[name].build,.95),queryMedianMs:percentile(samples[name].queries,.5),queryP95Ms:percentile(samples[name].queries,.95)}))};
writeFileSync(new URL('./timings.json',import.meta.url),JSON.stringify(output,null,2)+'\n');console.log(JSON.stringify(output,null,2));

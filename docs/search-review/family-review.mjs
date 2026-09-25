// Context and ambiguity contrasts, separate from content-independent automated tests.
import {writeFileSync} from 'node:fs';
import {makeStage,query,BASE,compactResult} from './review-tools.mjs';
const families=[
['people','A specific clinical role must not erase patient/family context.',['family doctor travel','family member travel']],
['documentation','Documentation does not imply approval or a prescribed type of evidence.',['paper trail consulting','proof of spending grant','written approval']],
['approvals','Notice is distinct from permission or approval.',['advance notice employer','prior authorisation consulting','employer notification']],
['diligence','Business screening is not entertainment or clinical screening.',['background check distributor','background music','patient screening']],
['procurement','Purchasing is not necessarily public-sector procurement.',['competitive bidding','public tender','purchasing process grants']],
['finance','Routine operating costs and financial hardship remain different concepts.',['operating costs hospital','financial distress hospital','market rate consulting']],
['in-kind','Noncash contributions do not classify free samples or all loaned goods as grants.',['non cash contribution','free sample','borrowed equipment']],
['research','Cooperative research, research funding, and licensing payments remain distinct.',['research partnership','research funding','licence fee']],
['complaints','Corrective action is not automatically a sanction; confidentiality is not anonymity.',['remedial action intermediary','disciplinary action','anonymous complaint','keep complaint confidential']],
['training','Practical activity differs from a physical demonstration product.',['practical workshop','live surgery demonstration','demo unit','hands-on training proportion']],
['events','Wholly online events differ from hybrid events; speaker/faculty differs from a poster presenter.',['fully online event','hybrid event','speaker expenses','poster presenter']],
['disclosure','Reporting periods, publication timing, aggregation, itemisation and consent remain separate.',['reporting year','publication year','publication deadline','combined amount','payment breakdown','partial permission','withdraw consent']],
['equipment','Loan, ownership, evaluation and resale describe different features of a product.',['retain equipment ownership','loaner','evaluation unit','no resale']],
['governance','Stricter rules do not determine which legal instrument applies.',['stricter local rules','national codes']],
];
const stages=['original','fixes','expanded'].map(name=>makeStage(name));
const rows=[];
for(const[family,distinction,queries]of families)for(const scope of ['code','transparency'])for(const text of queries){
 rows.push({family,distinction,scope,query:text,stages:stages.map(s=>({stage:s.name,...compactResult(query(s,scope,text))}))});
}
writeFileSync(new URL('./family-review.json',import.meta.url),JSON.stringify({base:BASE,note:'Astra editorial context/contrast review. These are diagnostic observations, not claims that every contrast has an indexed answer. The existing glossary heuristic can still link excluded terms (hybrid/virtual); see README limitations. Compare phrasebook members separately from glossary-derived members.',families:families.map(([family,distinction,queries])=>({family,distinction,queries})),runs:rows},null,2)+'\n');
console.log({families:families.length,queries:rows.length});

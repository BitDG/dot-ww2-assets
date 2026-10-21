/** A review can pass only when every critical feature and the overall review reach 90%. */
export const minimumVisualScore=.90;
export function evaluateVisualReview(review,currentHashes){
 const reasons=[];
 const accepted=n=>Number.isFinite(n)&&n>=minimumVisualScore&&n<=1;
 if(!accepted(review?.overallScore))reasons.push('overall visual score below 90% or invalid');
 const required=['silhouette','running-gear','cradle-mechanisms','material'];
 for(const id of required){const item=review?.features?.find(f=>f.id===id);if(!item||!accepted(item.score))reasons.push(id+' below 90% or missing/invalid');}
 if(review?.authority!=='agent-vision-original-vs-real-chrome')reasons.push('actual visual review missing');
 for(const key of ['reference','render','comparison','model'])if(!currentHashes?.[key]||review?.hashes?.[key]!==currentHashes[key])reasons.push(key+' evidence missing or stale');
 return {status:reasons.length?'needs-refinement':'passed',passed:reasons.length===0,minimumScore:minimumVisualScore,overallScore:review?.overallScore??null,reasons};
}

/** Acceptance validator only. Visual scores must come from recorded image review. */
export const threshold=.90;
export const criticalFeatures=['silhouette-and-proportions','wheel-and-fender-system','cabin-glazing-and-doors','grille-guard-and-roof-hardware','camouflage-and-material-response'];
export const requiredViews=['original-side','original-three-quarter','front','rear','opposite-three-quarter'];
export function evaluateAcceptance(report){
 const failures=[];const valid=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=1;
 if(!valid(report?.globalScore)||report.globalScore<threshold)failures.push('global visual score must reach 0.90');
 for(const id of criticalFeatures){const n=report?.featureScores?.[id];if(!valid(n)||n<threshold)failures.push(id+' must reach 0.90');}
 for(const id of requiredViews){const v=report?.views?.find(v=>v.id===id);if(!v?.referenceHash||!v?.renderHash||!v?.comparisonHash||!v?.camera||!v?.lighting)failures.push(id+' needs current aligned comparison evidence');if(!valid(v?.score)||v.score<threshold)failures.push(id+' must reach 0.90');}
 for(const key of ['sourceHash','assetHash','reviewer','reviewNotes'])if(typeof report?.[key]!=='string'||!report[key])failures.push(key+' is required');
 for(const check of ['finiteGeometry','nondegenerateGeometry','multiAngle','exportReimport'])if(report?.checks?.[check]!==true)failures.push(check+' must pass');
 return {passed:failures.length===0,threshold,failures};
}

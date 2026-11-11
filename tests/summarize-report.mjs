import fs from 'fs';
const r = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
for (const f of r.findings) {
  const o = f.viewportIssues.filter(v => v.horizontalOverflowPx > 0);
  const clip = f.viewportIssues.filter(v => v.clippedCount > 0);
  const ov = f.viewportIssues.filter(v => v.overlapCount > 0);
  console.log(`${f.role} ${f.route}: overflow=[${o.map(x => `${x.viewport}:+${x.horizontalOverflowPx}`).join(',')}] clipped=${clip.length} overlaps=${ov.length} bottomNavDesktop=${f.viewportIssues.some(x=>x.bottomNavBugOnDesktop)} skipVisible=${f.viewportIssues.some(x=>x.skipLinkVisibleWithoutFocus)}`);
}

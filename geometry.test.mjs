import test from 'node:test';
import assert from 'node:assert/strict';
import { isAcute, locus } from './geometry.mjs';
const dot = (a,b) => a.reduce((sum,x,i)=>sum+x*b[i],0);
const norm = a => Math.sqrt(dot(a,a));
const close = (a,b,tol=1e-9) => assert.ok(Math.abs(a-b)<tol, `${a} ≠ ${b}`);
const triangles = [[[-2,-1.3],[2,-1.3],[0,2]], [[0,0],[4,0],[1,2]], [[-3,1],[1,-2],[2,3]]];
for (const points of triangles) {
  for (const pair of [[0,1],[0,2],[1,2]]) {
    test(`correlation and orthogonality: ${JSON.stringify(points)}, pair ${pair}`, () => {
      assert.ok(isAcute(points));
      const curve=locus(points,pair);
      for (const rho of [-0.99,-0.6,0,curve.max/2,curve.max-0.001]) {
        const d=curve.at(rho);
        assert.ok(d[1]>0);
        const r=points.map(p=>[p[0]-d[0],-d[1],p[1]-d[2]]);
        close(dot(r[pair[0]],r[pair[1]])/(norm(r[pair[0]])*norm(r[pair[1]])),rho);
        const k=3-pair[0]-pair[1];
        for (const i of pair) close(dot(r[i],r[k]),0);
      }
      // Every sampled point lies on a single circle, including its limiting endpoints.
      const first=curve.path[0], last=curve.path.at(-1);
      const center=first.map((x,i)=>(x+last[i])/2);
      const radius=norm(first.map((x,i)=>x-center[i]));
      for (const p of curve.path) close(norm(p.map((x,i)=>x-center[i])),radius);
    });
  }
}
test('reject degenerate, right and obtuse triangles',()=>{
  for(const points of [[[0,0],[1,0],[2,0]],[[0,0],[2,0],[0,2]],[[0,0],[4,0],[1,.2]]]) assert.equal(isAcute(points),false);
});

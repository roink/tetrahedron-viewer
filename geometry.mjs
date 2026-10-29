// Coordinates in the prediction plane are [x, z]; height is y.
export function isAcute(points) {
  return points.every((p, i) => {
    const a = points[(i + 1) % 3], b = points[(i + 2) % 3];
    return (a[0]-p[0])*(b[0]-p[0]) + (a[1]-p[1])*(b[1]-p[1]) > 0.04;
  });
}

export function locus(points, pair = [0, 1]) {
  const [a, b] = pair.map(i => points[i]);
  const c = points[3-pair[0]-pair[1]];
  const length = Math.hypot(b[0]-a[0], b[1]-a[1]);
  const e = [(b[0]-a[0])/length, (b[1]-a[1])/length];
  const s = (c[0]-a[0])*e[0] + (c[1]-a[1])*e[1];
  const foot = [a[0]+s*e[0], a[1]+s*e[1]];
  const t = Math.hypot(c[0]-foot[0], c[1]-foot[1]);
  const v = [(c[0]-foot[0])/t, (c[1]-foot[1])/t];
  const correlation = u => (s*(s-length)+t*u) /
    Math.sqrt((s*s+t*u)*((s-length)**2+t*u));
  const point = u => [foot[0]+u*v[0], Math.sqrt(Math.max(0,u*(t-u))), foot[1]+u*v[1]];
  const max = correlation(t);
  return {
    max,
    point,
    at(rho) {
      let low = 0, high = t;
      for (let i=0;i<64;i++) {
        const mid=(low+high)/2;
        if (correlation(mid)<rho) low=mid; else high=mid;
      }
      return point((low+high)/2);
    },
    path: Array.from({length:161}, (_,i) => point(t*(1-Math.cos(Math.PI*i/160))/2)),
  };
}

# Combining uncertain predictions

An interactive 3D illustration of uncertainty relationships between three models, such as weather forecasts of temperature, precipitation, insolation and cloud cover.

[Open the live demo](https://roink.github.io/tetrahedron-viewer/).

## Explore

- Drag **A, B or C** within the prediction plane.
- **Σ** is calculated automatically and cannot be dragged. On startup all three uncertainty vectors at Σ are orthogonal (all angles are 90°).
- Use the **correlation slider**. The A–Σ–B angle obeys **ρ = cos θ**; the other two correlations remain zero.
- The dashed purple arc shows the possible path of Σ. It updates when predictions move.
- Drag empty space to orbit, scroll to zoom, use **Fit view**, or **Reset** to restore the original predictions and zero correlations.

The triangle is kept acute: moves that would make it right, obtuse or degenerate are rejected with an explanation. This ensures that an above-plane point with three orthogonal uncertainty vectors exists. The slider uses a fixed correlation scale so its position stays steady while models move. The displayed reachable range updates with the triangle; if a move reduces that range, the current correlation is clamped to it.

## What the picture means

The base plane stands in for a projection of high-dimensional predictions. The filled triangle contains all **convex combinations**: weighted averages with nonnegative weights summing to one.

The three vectors **A − Σ**, **B − Σ**, **C − Σ** illustrate model errors relative to a common combined/reference point. Their inner products define correlations. At zero correlations these vectors form a tri-rectangular tetrahedron. Positive correlation makes the A–Σ–B angle acute; negative correlation makes it obtuse.

## Why the path is a circle

For the fixed pair A, B, keep the two remaining correlations zero:

```
(A − Σ) · (C − Σ) = 0
(B − Σ) · (C − Σ) = 0
```

Each equation describes a sphere with diameter AC or BC (the spatial version of Thales' theorem). Subtracting them gives `(B − A) · (C − Σ) = 0`: a plane through C perpendicular to AB. Their intersection is a circle in that vertical plane. The demo uses its upper semicircle, choosing the solution above the prediction plane.

For a concrete parameterization, let F be the perpendicular foot from C to AB, let `L = |AB|`, `s` be the signed distance from A to F along AB, `t = |FC|`, and `v = (C − F)/t`. Let n be the upward unit normal of the prediction plane. Then:

```
Σ(u) = F + u v + sqrt(u(t − u)) n,     0 ≤ u ≤ t
ρ(u) = [s(s − L) + t u] / sqrt([s² + t u][(s − L)² + t u])
```

The circle has center `(F + C)/2` and radius `t/2`. For an acute triangle, ρ increases monotonically from −1 to `cos(angle ACB)`. The code uses bisection to find u for the requested correlation. At ρ = 0, `u = s(L − s)/t`; all three dot products vanish.


## Run locally

No build step is needed. Serve this directory over HTTP:

```sh
python3 -m http.server 4173
```

Open <http://localhost:4173>. A WebGL-capable browser and internet access are required to load the pinned Three.js module from jsDelivr.

Run the mathematical checks with Node.js:

```sh
node --test geometry.test.mjs
```

The tests cover all three pair choices across several acute triangles, correlation accuracy, the two fixed right angles, the circle locus and invalid triangle detection.

## Files

- `app.js`: Three.js rendering, interaction and controls.
- `geometry.mjs`: dependency-free circle construction and correlation solver.
- `index.html`, `style.css`: responsive interface and explanatory text.
- `geometry.test.mjs`: geometry checks.

Licensed under the [MIT License](LICENSE).

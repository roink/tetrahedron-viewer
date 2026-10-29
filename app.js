import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.181.1/+esm";

import { isAcute, locus } from "./geometry.mjs";

const stage = document.querySelector("#view3d");
const loading = document.querySelector("#loading3d");
const fitButton = document.querySelector("#fitButton");
const resetButton = document.querySelector("#resetButton");

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, 1, 0.05, 500);
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true,
});

renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;

loading.remove();
stage.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xffffff, 0x555555, 1.7));

const light = new THREE.DirectionalLight(0xffffff, 2.2);
light.position.set(5, 8, 7);
scene.add(light);

const grid = new THREE.GridHelper(12, 12, 0x8b95a5, 0x8b95a5);
grid.material.transparent = true;
grid.material.opacity = 0.22;
scene.add(grid);

const axes = new THREE.AxesHelper(2.2);
axes.material.transparent = true;
axes.material.opacity = 0.6;
scene.add(axes);

const initial = [
  new THREE.Vector3(-2, 0, -1.3),
  new THREE.Vector3(2, 0, -1.3),
  new THREE.Vector3(0, 0, 2),
  new THREE.Vector3(0, 1, 0),
];

const pointColors = [
  new THREE.Color("#4f7bd9"),
  new THREE.Color("#d98252"),
  new THREE.Color("#5e9c68"),
  new THREE.Color("#8f6ac8"),
];

const selectedColor = new THREE.Color("#4f7cff");

const sphereGeometry = new THREE.SphereGeometry(0.16, 24, 16);

const pointMeshes = initial.map((position, index) => {
  const material = new THREE.MeshStandardMaterial({
    color: pointColors[index],
    roughness: 0.45,
    metalness: 0.05,
  });

  const mesh = new THREE.Mesh(sphereGeometry, material);
  mesh.position.copy(position);
  mesh.userData.index = index;
  scene.add(mesh);
  return mesh;
});

const facePositions = new Float32Array(4 * 3 * 3);
const faceGeometry = new THREE.BufferGeometry();
faceGeometry.setAttribute(
  "position",
  new THREE.BufferAttribute(facePositions, 3),
);

const faceMaterial = new THREE.MeshStandardMaterial({
  color: "#748da1",
  transparent: true,
  opacity: 0.24,
  side: THREE.DoubleSide,
  depthWrite: false,
  roughness: 0.8,
});

const faces = new THREE.Mesh(faceGeometry, faceMaterial);
scene.add(faces);

const edgePositions = new Float32Array(6 * 2 * 3);
const edgeGeometry = new THREE.BufferGeometry();
edgeGeometry.setAttribute(
  "position",
  new THREE.BufferAttribute(edgePositions, 3),
);

const edges = new THREE.LineSegments(
  edgeGeometry,
  new THREE.LineBasicMaterial({
    color: "#59616c",
    transparent: true,
    opacity: 0.85,
  }),
);
scene.add(edges);

function makeLabel(text, color) {
  const canvas = document.createElement("canvas");
  canvas.width = 96;
  canvas.height = 64;

  const ctx = canvas.getContext("2d");

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(48, 32, 23, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = `#${color.getHexString()}`;
  ctx.lineWidth = 5;
  ctx.stroke();

  ctx.fillStyle = "#111111";
  ctx.font = "bold 28px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 48, 33);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
    }),
  );

  sprite.scale.set(0.48, 0.32, 1);
  scene.add(sprite);
  return sprite;
}

const labelSprites = ["A", "B", "C", "Σ"].map((name, index) =>
  makeLabel(name, pointColors[index]),
);

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const dragPlane = new THREE.Plane();
const dragIntersection = new THREE.Vector3();
const correlationInput = document.querySelector("#correlation");
const status = document.querySelector("#status");
const pathGeometry = new THREE.BufferGeometry();
const pathLine = new THREE.Line(pathGeometry, new THREE.LineDashedMaterial({color: 0x8f6ac8, dashSize: 0.09, gapSize: 0.06}));
scene.add(pathLine);
let rho = 0;
function predictions() { return pointMeshes.slice(0,3).map(m => [m.position.x,m.position.z]); }
function solve() {
  const curve = locus(predictions(), [0, 1]);
  const upper = Math.max(0, curve.max - 0.001);
  rho = Math.max(-0.99, Math.min(upper, rho));
  correlationInput.value = rho;
  document.querySelector("#rhoValue").textContent = rho.toFixed(3);
  document.querySelector("#rangeValue").textContent = `Reachable correlation:\n−0.990 to ${upper.toFixed(3)}`;
  pointMeshes[3].position.fromArray(curve.at(rho));
  pathGeometry.setFromPoints(curve.path.map(p => new THREE.Vector3(...p)));
  pathLine.computeLineDistances();
  const d = pointMeshes[3].position;
  const residuals = pointMeshes.slice(0,3).map(m => m.position.clone().sub(d));
  document.querySelector("#angles").textContent = [[0,1],[0,2],[1,2]].map(([i,j]) =>
    `${"ABC"[i]}Σ${"ABC"[j]}: ${(residuals[i].angleTo(residuals[j])*180/Math.PI).toFixed(1)}°`).join("\n");
}
function movePrediction(index, candidate) {
  const points = predictions();
  points[index] = [candidate.x, candidate.z];
  if (!isAcute(points)) {
    status.textContent = "Keep the triangle acute.";
    return;
  }
  status.textContent = "";
  pointMeshes[index].position.copy(candidate);
}
correlationInput.addEventListener("input", () => { rho = Number(correlationInput.value); updateGeometry(); });
document.querySelector("#uncorrelated").addEventListener("click", () => { rho=0; updateGeometry(); });

let selected = 0;
let interaction = null;
let lastX = 0;
let lastY = 0;

const orbit = {
  target: new THREE.Vector3(0, 0, 0),
  radius: 8,
  theta: 0.72,
  phi: 1.03,
};

function updateCamera() {
  const sinPhi = Math.sin(orbit.phi);
  const radius = orbit.radius * Math.max(1, 1 / camera.aspect);

  camera.position.set(
    orbit.target.x + radius * sinPhi * Math.sin(orbit.theta),
    orbit.target.y + radius * Math.cos(orbit.phi),
    orbit.target.z + radius * sinPhi * Math.cos(orbit.theta),
  );

  camera.lookAt(orbit.target);
}

function updateGeometry() {
  solve();
  updateLocations();
  const p = pointMeshes.map((mesh) => mesh.position);

  const triangles = [
    0, 1, 2,
    0, 1, 3,
    0, 2, 3,
    1, 2, 3,
  ];

  let offset = 0;

  for (const index of triangles) {
    facePositions[offset++] = p[index].x;
    facePositions[offset++] = p[index].y;
    facePositions[offset++] = p[index].z;
  }

  faceGeometry.attributes.position.needsUpdate = true;
  faceGeometry.computeVertexNormals();
  faceGeometry.computeBoundingSphere();

  const pairs = [
    [0, 1],
    [0, 2],
    [0, 3],
    [1, 2],
    [1, 3],
    [2, 3],
  ];

  offset = 0;

  for (const [i, j] of pairs) {
    for (const index of [i, j]) {
      edgePositions[offset++] = p[index].x;
      edgePositions[offset++] = p[index].y;
      edgePositions[offset++] = p[index].z;
    }
  }

  edgeGeometry.attributes.position.needsUpdate = true;
  edgeGeometry.computeBoundingSphere();

  pointMeshes.forEach((mesh, index) => {
    labelSprites[index].position.copy(mesh.position);
    labelSprites[index].position.y += 0.32;
  });


}

function updateLocations() {
  pointMeshes.slice(0, 3).forEach((mesh, index) => {
    document.querySelector(`#location-${index}-x`).textContent = mesh.position.x.toFixed(2);
    document.querySelector(`#location-${index}-y`).textContent = mesh.position.z.toFixed(2);
  });
}

function selectPoint(index) {
  selected = index;

  pointMeshes.forEach((mesh, i) => {
    mesh.scale.setScalar(i === selected ? 1.35 : 1);

    if (i === selected) {
      mesh.material.emissive.copy(selectedColor);
      mesh.material.emissiveIntensity = 0.28;
    } else {
      mesh.material.emissive.set(0x000000);
      mesh.material.emissiveIntensity = 0;
    }
  });

}

function pointerToNDC(event) {
  const rect = renderer.domElement.getBoundingClientRect();

  if (rect.width <= 0 || rect.height <= 0) {
    return false;
  }

  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  return true;
}

renderer.domElement.addEventListener("pointerdown", (event) => {
  if (!pointerToNDC(event)) {
    return;
  }

  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(pointMeshes.slice(0,3), false);

  lastX = event.clientX;
  lastY = event.clientY;

  renderer.domElement.setPointerCapture(event.pointerId);

  if (hits.length > 0) {
    const mesh = hits[0].object;

    selectPoint(mesh.userData.index);
    interaction = "point";

    dragPlane.set(new THREE.Vector3(0, 1, 0), 0);

    renderer.domElement.classList.add("drag-point");
  } else {
    interaction = "orbit";
    renderer.domElement.classList.add("orbiting");
  }
});

renderer.domElement.addEventListener("pointermove", (event) => {
  if (!interaction) {
    return;
  }

  if (interaction === "orbit") {
    const dx = event.clientX - lastX;
    const dy = event.clientY - lastY;

    orbit.theta -= dx * 0.008;

    // Vertical direction intentionally follows "grab and drag":
    // dragging upward moves the view upward.
    orbit.phi = THREE.MathUtils.clamp(
      orbit.phi - dy * 0.008,
      0.08,
      Math.PI / 2 - 0.08,
    );

    lastX = event.clientX;
    lastY = event.clientY;

    updateCamera();
    return;
  }

  if (!pointerToNDC(event)) {
    return;
  }

  raycaster.setFromCamera(pointer, camera);

  if (raycaster.ray.intersectPlane(dragPlane, dragIntersection)) {
    dragIntersection.x = THREE.MathUtils.clamp(
      dragIntersection.x,
      -50,
      50,
    );
    dragIntersection.y = THREE.MathUtils.clamp(
      dragIntersection.y,
      -50,
      50,
    );
    dragIntersection.z = THREE.MathUtils.clamp(
      dragIntersection.z,
      -50,
      50,
    );

    dragIntersection.y = 0;
    movePrediction(selected, dragIntersection);

    updateGeometry();
    }
});

function endPointer(event) {
  interaction = null;

  renderer.domElement.classList.remove(
    "drag-point",
    "orbiting",
  );

  if (renderer.domElement.hasPointerCapture(event.pointerId)) {
    renderer.domElement.releasePointerCapture(event.pointerId);
  }
}

renderer.domElement.addEventListener("pointerup", endPointer);
renderer.domElement.addEventListener("pointercancel", endPointer);

renderer.domElement.addEventListener(
  "wheel",
  (event) => {
    event.preventDefault();

    orbit.radius *= Math.exp(event.deltaY * 0.0012);
    orbit.radius = THREE.MathUtils.clamp(
      orbit.radius,
      1.2,
      80,
    );

    updateCamera();
  },
  { passive: false },
);

function fitView() {
  const center = new THREE.Vector3();

  pointMeshes.forEach((mesh) => {
    center.add(mesh.position);
  });

  center.multiplyScalar(0.25);

  let maxDistance = 1;

  pointMeshes.forEach((mesh) => {
    maxDistance = Math.max(
      maxDistance,
      mesh.position.distanceTo(center),
    );
  });

  orbit.target.copy(center);
  orbit.radius = Math.max(3, maxDistance * 3.1);

  updateCamera();
}

fitButton.addEventListener("click", fitView);

resetButton.addEventListener("click", () => {
  rho = 0;
  status.textContent = "";
  pointMeshes.forEach((mesh, index) => {
    mesh.position.copy(initial[index]);
  });

  orbit.target.set(0, 0, 0);
  orbit.radius = 8;
  orbit.theta = 0.72;
  orbit.phi = 1.03;

  updateCamera();
  updateGeometry();
  selectPoint(0);
});

function resizeRendererToDisplaySize() {
  const rect = stage.getBoundingClientRect();

  const cssWidth = Math.max(
    1,
    Math.floor(rect.width),
  );

  const cssHeight = Math.max(
    1,
    Math.floor(rect.height),
  );

  const pixelRatio = renderer.getPixelRatio();

  const targetWidth = Math.floor(
    cssWidth * pixelRatio,
  );

  const targetHeight = Math.floor(
    cssHeight * pixelRatio,
  );

  if (
    renderer.domElement.width !== targetWidth ||
    renderer.domElement.height !== targetHeight
  ) {
    renderer.setSize(
      cssWidth,
      cssHeight,
      false,
    );

    camera.aspect = cssWidth / cssHeight;
    camera.updateProjectionMatrix();
    updateCamera();
  }
}

fitButton.disabled = false;
resetButton.disabled = false;

updateCamera();
updateGeometry();
selectPoint(0);

function render() {
  resizeRendererToDisplaySize();
  renderer.render(scene, camera);
  requestAnimationFrame(render);
}

render();

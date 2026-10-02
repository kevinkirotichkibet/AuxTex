'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { ContactShadows, Environment, OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { Material } from '@/lib/api';

// Deliberately looser than the full MeasurementProfile type — this needs to
// work both with a saved profile (product page) and a live draft object
// built from whatever's currently typed into the measurements form
// (measurements page), which has no _id yet.
export type AvatarProfile = {
  label?: string;
  gender?: 'male' | 'female';
  chest?: number;
  waist?: number;
  hips?: number;
};

type Props = {
  material: Material | null;
  profile: AvatarProfile | null;
  // The product's category (suit/blazer/shirt/trousers/dress/skirt).
  // Determines which body regions are actually rendered in the selected
  // fabric — a blazer doesn't color the legs, a skirt doesn't color the
  // torso, etc. Omitted (e.g. on the measurements page, where there's no
  // specific product) falls back to coloring the whole body.
  category?: string;
};

// Neutral reference measurements (cm) that map to scale = 1, one set per
// gender since typical chest/waist/hip ratios differ, plus a unisex
// fallback when no gender is set. None of these are claims about anyone's
// "correct" proportions — they're just the midpoint the mannequin scales
// outward/inward from.
const REF_CM = {
  male: { chest: 100, waist: 85, hip: 98 },
  female: { chest: 92, waist: 75, hip: 98 },
  unisex: { chest: 96, waist: 80, hip: 98 },
};

// What each garment category actually covers. "legs" = the ordinary
// two-leg silhouette; "dress" = one flared shape from hip to mid-calf, no
// leg split (a dress covers both legs as one garment); "skirt" = the same
// flare but knee-length, with bare (skin) legs showing below it.
type LowerStyle = 'legs' | 'dress' | 'skirt';
const GARMENT_CONFIG: Record<string, { upper: boolean; lower: boolean; lowerStyle: LowerStyle }> = {
  suit: { upper: true, lower: true, lowerStyle: 'legs' },
  blazer: { upper: true, lower: false, lowerStyle: 'legs' },
  shirt: { upper: true, lower: false, lowerStyle: 'legs' },
  trousers: { upper: false, lower: true, lowerStyle: 'legs' },
  dress: { upper: true, lower: true, lowerStyle: 'dress' },
  skirt: { upper: false, lower: true, lowerStyle: 'skirt' },
};
const DEFAULT_GARMENT = { upper: true, lower: true, lowerStyle: 'legs' as LowerStyle };

// Genuine visible skin (head, neck, hands, feet, bare legs under a skirt).
// A single flat default — swap this to taste, or wire it to a per-customer
// preference later; it's isolated here on purpose so that's a one-line change.
const SKIN = '#a9714a';

// Used only for body regions a given product simply doesn't say anything
// about — e.g. the sliver of torso above a skirt-only product, where the
// customer would obviously be wearing *some* top, we just don't know
// which. Kept distinct from SKIN so we're not guessing at bare skin there.
const UNSPECIFIED = '#eef1f6';

function clampScale(valueCm: number | undefined, refCm: number): number {
  if (!valueCm) return 1;
  return Math.min(1.3, Math.max(0.8, valueCm / refCm));
}

function printPatternKind(name: string): 'check' | 'dots' | 'stripe' | null {
  const n = name.toLowerCase();
  if (n.includes('maasai') || n.includes('shuka')) return 'check';
  if (n.includes('kitenge') || n.includes('ankara') || n.includes('kente')) return 'dots';
  if (n.includes('kikoy')) return 'stripe';
  return null;
}

// ---------------------------------------------------------------------
// Procedural textures. Nothing here is fetched — a small <canvas> is
// drawn in memory and handed to three.js as a texture, so the same three
// print "kinds" the flat SVG version faked now actually wrap around a
// curved 3D surface with correct perspective instead of sitting on it as
// a flat sticker.
// ---------------------------------------------------------------------

function drawPatternCanvas(kind: 'check' | 'dots' | 'stripe', color: string): HTMLCanvasElement {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, size, size);

  if (kind === 'check') {
    ctx.strokeStyle = '#1c1a17';
    ctx.lineWidth = 10;
    ctx.save();
    ctx.translate(size / 2, size / 2);
    ctx.rotate(Math.PI / 4);
    for (let x = -size; x <= size * 2; x += 22) {
      ctx.beginPath();
      ctx.moveTo(x, -size);
      ctx.lineTo(x, size * 2);
      ctx.stroke();
    }
    ctx.restore();
  } else if (kind === 'dots') {
    ctx.fillStyle = '#1c1a17';
    for (let y = 9; y < size; y += 18) {
      for (let x = 9; x < size; x += 18) {
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else {
    ctx.fillStyle = '#ffffff';
    for (let y = 10; y < size; y += 16) {
      ctx.fillRect(0, y, size, 6);
    }
  }
  return canvas;
}

// A small tileable grayscale weave, used as a bump map on every fabric
// surface (photo or pattern alike) so the cloth actually catches light
// as woven texture rather than a perfectly flat, matte plastic shell.
function makeFabricBumpTexture(): THREE.Texture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = '#6f6f6f';
  ctx.lineWidth = 1;
  for (let i = -size; i < size * 2; i += 4) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + size, size);
    ctx.stroke();
  }
  ctx.strokeStyle = '#959595';
  for (let i = -size; i < size * 2; i += 4) {
    ctx.beginPath();
    ctx.moveTo(i, size);
    ctx.lineTo(i + size, 0);
    ctx.stroke();
  }
  // Light fiber noise on top so it doesn't read as a perfect grid.
  for (let i = 0; i < 500; i++) {
    const v = 118 + Math.floor(Math.random() * 20);
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.fillRect(Math.random() * size, Math.random() * size, 1, 1);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(28, 40);
  tex.needsUpdate = true;
  return tex;
}

// A soft, mostly-transparent decal painted with simple facial features —
// big eyes, brows, a small nose shadow, a smile. Mounted just in front of
// the head sphere's front surface. Three.js meshes are single-sided by
// default, so viewed from behind the head this plane simply isn't drawn
// and you see the plain skin-toned sphere — there's no "backwards face"
// artifact, it just correctly shows no face on the back of a head.
function makeFaceTexture(): THREE.Texture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, size, size);

  const cx = size / 2;
  const eyeY = size * 0.46;
  const eyeDX = size * 0.16;
  const eyeRX = size * 0.1;
  const eyeRY = size * 0.12;

  const drawEye = (x: number) => {
    // Sclera
    ctx.fillStyle = '#fbfbf8';
    ctx.beginPath();
    ctx.ellipse(x, eyeY, eyeRX, eyeRY, 0, 0, Math.PI * 2);
    ctx.fill();
    // Iris
    ctx.fillStyle = '#3a2417';
    ctx.beginPath();
    ctx.arc(x, eyeY + eyeRY * 0.08, eyeRY * 0.72, 0, Math.PI * 2);
    ctx.fill();
    // Pupil
    ctx.fillStyle = '#0c0805';
    ctx.beginPath();
    ctx.arc(x, eyeY + eyeRY * 0.08, eyeRY * 0.36, 0, Math.PI * 2);
    ctx.fill();
    // Highlight
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    ctx.arc(x - eyeRX * 0.32, eyeY - eyeRY * 0.28, eyeRY * 0.18, 0, Math.PI * 2);
    ctx.fill();
    // Lash line
    ctx.strokeStyle = '#241408';
    ctx.lineWidth = size * 0.014;
    ctx.beginPath();
    ctx.ellipse(x, eyeY, eyeRX * 1.02, eyeRY * 1.02, 0, Math.PI * 0.95, Math.PI * 2.05);
    ctx.stroke();
  };
  drawEye(cx - eyeDX);
  drawEye(cx + eyeDX);

  // Eyebrows
  ctx.strokeStyle = '#2a1810';
  ctx.lineWidth = size * 0.02;
  ctx.lineCap = 'round';
  [-1, 1].forEach((side) => {
    const bx = cx + side * eyeDX;
    ctx.beginPath();
    ctx.moveTo(bx - eyeRX * 0.9, eyeY - eyeRY * 1.7);
    ctx.quadraticCurveTo(bx, eyeY - eyeRY * 2.15, bx + side * eyeRX * 0.95, eyeY - eyeRY * 1.55);
    ctx.stroke();
  });

  // Nose — just a soft shadow hint, not a hard outline.
  ctx.strokeStyle = 'rgba(40,22,12,0.28)';
  ctx.lineWidth = size * 0.014;
  ctx.beginPath();
  ctx.moveTo(cx - size * 0.015, eyeY + eyeRY * 1.1);
  ctx.quadraticCurveTo(cx - size * 0.03, eyeY + eyeRY * 2.3, cx, eyeY + eyeRY * 2.6);
  ctx.stroke();

  // Mouth — a gentle closed smile.
  const mouthY = eyeY + eyeRY * 3.7;
  ctx.strokeStyle = '#5c2a22';
  ctx.lineWidth = size * 0.016;
  ctx.beginPath();
  ctx.moveTo(cx - size * 0.09, mouthY);
  ctx.quadraticCurveTo(cx, mouthY + size * 0.045, cx + size * 0.09, mouthY);
  ctx.stroke();
  ctx.fillStyle = 'rgba(180,90,78,0.55)';
  ctx.beginPath();
  ctx.moveTo(cx - size * 0.07, mouthY + size * 0.006);
  ctx.quadraticCurveTo(cx, mouthY + size * 0.032, cx + size * 0.07, mouthY + size * 0.006);
  ctx.quadraticCurveTo(cx, mouthY + size * 0.014, cx - size * 0.07, mouthY + size * 0.006);
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

// Builds (or reuses) the material used on garment-covered body regions:
// the selected fabric photo if the admin uploaded one, else a generated
// print pattern for the African-print materials, else a flat colour for
// plain fabrics (wool, cotton, linen, silk).
function useFabricMaterial(material: Material | null, bumpMap: THREE.Texture, repeatX: number, repeatY: number) {
  const [photoTex, setPhotoTex] = useState<THREE.Texture | null>(null);
  const [photoFailed, setPhotoFailed] = useState(false);
  const photoUrl = material?.images?.[0] ?? null;

  useEffect(() => {
    setPhotoFailed(false);
    if (!photoUrl) {
      setPhotoTex(null);
      return;
    }
    const loader = new THREE.TextureLoader();
    loader.crossOrigin = 'anonymous';
    let cancelled = false;
    let loaded: THREE.Texture | null = null;
    loader.load(
      photoUrl,
      (tex) => {
        if (cancelled) {
          tex.dispose();
          return;
        }
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.repeat.set(repeatX, repeatY);
        loaded = tex;
        setPhotoTex(tex);
      },
      undefined,
      () => {
        if (!cancelled) setPhotoFailed(true);
      }
    );
    return () => {
      cancelled = true;
      loaded?.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photoUrl, repeatX, repeatY]);

  return useMemo(() => {
    const color = material?.color ?? '#d7e1f7';
    const kind = material ? printPatternKind(material.name) : null;

    let map: THREE.Texture | null = null;
    if (photoUrl && !photoFailed) {
      map = photoTex;
    } else if (kind) {
      const canvas = drawPatternCanvas(kind, color);
      const tex = new THREE.CanvasTexture(canvas);
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(repeatX, repeatY);
      tex.needsUpdate = true;
      map = tex;
    }

    return new THREE.MeshStandardMaterial({
      color: map ? '#ffffff' : color,
      map,
      bumpMap,
      bumpScale: 0.006,
      roughness: 0.78,
      metalness: 0.04,
    });
    // Re-derive whenever the fabric selection or the loaded photo changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [material?._id, material?.color, photoTex, photoFailed, bumpMap, repeatX, repeatY]);
}

// ---------------------------------------------------------------------
// Body geometry. A smooth, rotationally-symmetric mannequin (lathe
// geometry) rather than stacked primitives — the same technique real
// fashion-tech "fit preview" tools use for a body without needing a
// sculpted/rigged character asset. Control points are the same
// chest/waist/hip scale factors the app already computes from a
// customer's saved measurements.
// ---------------------------------------------------------------------

function lathe(points: [number, number][], segments = 48) {
  const geo = new THREE.LatheGeometry(
    points.map(([r, y]) => new THREE.Vector2(r, y)),
    segments
  );
  geo.computeVertexNormals();
  return geo;
}

// A small 5-fingered hand: a flattened palm plus four fingers and a
// thumb, each its own short capsule. Deliberately simple/low-poly rather
// than attempting anatomical detail — the goal is "reads as a hand with
// fingers," not a sculpted one.
function Hand({ mirror }: { mirror: boolean }) {
  const skinMat = useMemo(() => new THREE.MeshStandardMaterial({ color: SKIN, roughness: 0.5, metalness: 0.02 }), []);
  const fingerGeo = useMemo(() => new THREE.CapsuleGeometry(0.0075, 0.052, 3, 8), []);
  const thumbGeo = useMemo(() => new THREE.CapsuleGeometry(0.008, 0.036, 3, 8), []);
  const palmGeo = useMemo(() => new THREE.BoxGeometry(0.05, 0.058, 0.022), []);
  const side = mirror ? -1 : 1;

  const fingers = [-0.017, -0.0057, 0.0057, 0.017];
  return (
    <group>
      <mesh geometry={palmGeo} material={skinMat} position={[0, -0.026, 0]} castShadow />
      {fingers.map((fx, i) => (
        <mesh
          key={i}
          geometry={fingerGeo}
          material={skinMat}
          position={[fx, -0.078, 0]}
          castShadow
        />
      ))}
      <mesh
        geometry={thumbGeo}
        material={skinMat}
        position={[side * 0.03, -0.03, 0.012]}
        rotation={[0, 0, side * 0.9]}
        castShadow
      />
    </group>
  );
}

function Mannequin({
  profile,
  category,
  fabricMaterial,
  lowerFabricMaterial,
}: {
  profile: AvatarProfile | null;
  category?: string;
  fabricMaterial: THREE.MeshStandardMaterial;
  lowerFabricMaterial: THREE.MeshStandardMaterial;
}) {
  const gender = profile?.gender === 'male' || profile?.gender === 'female' ? profile.gender : 'unisex';
  const ref = REF_CM[gender];
  const garment = (category && GARMENT_CONFIG[category]) || DEFAULT_GARMENT;

  const chestScale = clampScale(profile?.chest, ref.chest);
  const waistScale = clampScale(profile?.waist, ref.waist);
  const hipScale = clampScale(profile?.hips, ref.hip);

  const skinMat = useMemo(() => new THREE.MeshStandardMaterial({ color: SKIN, roughness: 0.5, metalness: 0.02 }), []);
  const unspecifiedMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: UNSPECIFIED, roughness: 0.55, metalness: 0.05 }),
    []
  );
  const faceTex = useMemo(() => makeFaceTexture(), []);
  const faceMat = useMemo(
    () => new THREE.MeshBasicMaterial({ map: faceTex, transparent: true }),
    [faceTex]
  );

  const upperMat = garment.upper ? fabricMaterial : skinMat;
  const lowerMat = garment.lower ? lowerFabricMaterial : skinMat;
  const hipMat = garment.lowerStyle === 'skirt' ? unspecifiedMat : lowerMat;

  // Height control points, metres from the floor.
  const yAnkle = 0.08;
  const yKnee = 0.5;
  const yHip = 0.92;
  const yWaist = 1.06;
  const yChest = 1.3;
  const yShoulder = 1.42;
  const yNeckTop = 1.48;

  const torsoGeo = useMemo(
    () =>
      lathe([
        [0.058, yNeckTop],
        [0.145 * chestScale, yShoulder],
        [0.19 * chestScale, yChest],
        [0.135 * waistScale, yWaist],
      ]),
    [chestScale, waistScale]
  );

  const hipGeo = useMemo(
    () =>
      lathe([
        [0.135 * waistScale, yWaist],
        [0.195 * hipScale, yHip],
      ]),
    [waistScale, hipScale]
  );

  // Leg attachment: kept far enough apart (relative to leg radius) that
  // there's a real visible gap/inner-thigh line between them rather than
  // the two shapes overlapping into a single column.
  const legOffset = 0.095 * hipScale;
  const legTopRadius = 0.065 * hipScale;

  const legGeo = useMemo(
    () =>
      lathe(
        [
          [legTopRadius, yHip],
          [0.07, yKnee],
          [0.05, yAnkle],
        ],
        24
      ),
    [legTopRadius]
  );

  const dressGeo = useMemo(
    () =>
      lathe([
        [0.175 * hipScale, yHip],
        [0.24, 0.62],
        [0.27, 0.48],
      ]),
    [hipScale]
  );

  const skirtGeo = useMemo(
    () =>
      lathe([
        [0.175 * hipScale, yHip],
        [0.22, 0.72],
        [0.24, yKnee],
      ]),
    [hipScale]
  );

  const bareLegGeo = useMemo(
    () =>
      lathe(
        [
          [0.075, yKnee],
          [0.05, yAnkle],
        ],
        24
      ),
    []
  );

  const headGeo = useMemo(() => new THREE.SphereGeometry(0.1, 32, 24), []);
  const facePlaneGeo = useMemo(() => new THREE.PlaneGeometry(0.155, 0.155), []);
  const neckGeo = useMemo(() => new THREE.CylinderGeometry(0.045, 0.055, 0.08, 20), []);
  const sleeveGeo = useMemo(() => new THREE.CylinderGeometry(0.042, 0.033, 0.4, 16), []);
  const footGeo = useMemo(() => new THREE.SphereGeometry(0.055, 16, 12), []);

  // Shoulder attach point for the arms, tucked in just enough that the
  // sleeve overlaps the torso surface — no visible gap at the seam.
  const shoulderX = 0.175 * chestScale;
  const sleeveLen = 0.4;

  return (
    <group>
      {/* Head + neck are always skin — the fabric is a garment, not skin. */}
      <mesh geometry={headGeo} position={[0, 1.61, 0]} material={skinMat} castShadow />
      <mesh
        geometry={facePlaneGeo}
        material={faceMat}
        position={[0, 1.615, 0.093]}
        renderOrder={1}
      />
      <mesh geometry={neckGeo} position={[0, 1.52, 0]} material={skinMat} castShadow />

      <mesh geometry={torsoGeo} material={upperMat} castShadow receiveShadow />
      <mesh geometry={hipGeo} material={hipMat} castShadow receiveShadow />

      {garment.lowerStyle === 'legs' && (
        <>
          <mesh geometry={legGeo} position={[-legOffset, 0, 0]} material={lowerMat} castShadow receiveShadow />
          <mesh geometry={legGeo} position={[legOffset, 0, 0]} material={lowerMat} castShadow receiveShadow />
          <mesh geometry={footGeo} position={[-legOffset, yAnkle - 0.03, 0.03]} scale={[1, 0.55, 1.7]} material={skinMat} castShadow />
          <mesh geometry={footGeo} position={[legOffset, yAnkle - 0.03, 0.03]} scale={[1, 0.55, 1.7]} material={skinMat} castShadow />
        </>
      )}

      {garment.lowerStyle === 'dress' && (
        <>
          <mesh geometry={dressGeo} material={lowerMat} castShadow receiveShadow />
          <mesh geometry={footGeo} position={[-legOffset, yAnkle - 0.03, 0.03]} scale={[1, 0.55, 1.7]} material={skinMat} castShadow />
          <mesh geometry={footGeo} position={[legOffset, yAnkle - 0.03, 0.03]} scale={[1, 0.55, 1.7]} material={skinMat} castShadow />
        </>
      )}

      {garment.lowerStyle === 'skirt' && (
        <>
          <mesh geometry={skirtGeo} material={lowerMat} castShadow receiveShadow />
          <mesh geometry={bareLegGeo} position={[-legOffset, 0, 0]} material={skinMat} castShadow receiveShadow />
          <mesh geometry={bareLegGeo} position={[legOffset, 0, 0]} material={skinMat} castShadow receiveShadow />
          <mesh geometry={footGeo} position={[-legOffset, yAnkle - 0.03, 0.03]} scale={[1, 0.55, 1.7]} material={skinMat} castShadow />
          <mesh geometry={footGeo} position={[legOffset, yAnkle - 0.03, 0.03]} scale={[1, 0.55, 1.7]} material={skinMat} castShadow />
        </>
      )}

      {/* Each arm is a rigid group: fabric sleeve (plain cylinder — no
          polar UV pinch like a capsule's rounded cap would give) with a
          real 5-fingered hand hanging off the end, so the whole arm
          rotates/tilts together as one unit. */}
      <group position={[-shoulderX, yShoulder, 0]} rotation={[0, 0, 0.16]}>
        <mesh geometry={sleeveGeo} material={upperMat} position={[0, -sleeveLen / 2, 0]} castShadow />
        <group position={[0, -sleeveLen, 0]}>
          <Hand mirror />
        </group>
      </group>
      <group position={[shoulderX, yShoulder, 0]} rotation={[0, 0, -0.16]}>
        <mesh geometry={sleeveGeo} material={upperMat} position={[0, -sleeveLen / 2, 0]} castShadow />
        <group position={[0, -sleeveLen, 0]}>
          <Hand mirror={false} />
        </group>
      </group>
    </group>
  );
}

// ---------------------------------------------------------------------
// Realistic figure — a static (unrigged) scanned/sculpted asset supplied
// by the store, used as a higher-fidelity stand-in for menswear-shaped
// products. It has no skeleton and no blend shapes, so unlike the
// procedural Mannequin above it cannot be bent into a relaxed pose or
// resized to a customer's measurements — it always renders at one fixed
// size, in the T-pose it was modeled in. Only its jacket and trousers
// materials get re-textured with the selected fabric; everything else
// (skin, hair, eyes, shoes, glasses) is the asset as authored.
//
// No manual axis correction needed here: the file's root node already
// carries Sketchfab's own Z-up-to-Y-up correction matrix, which
// THREE.GLTFLoader applies automatically as part of the normal node
// hierarchy. (An earlier version of this component added a second,
// redundant rotation on top of that — that's what caused the figure to
// render lying on its side.)
// ---------------------------------------------------------------------
const REALISTIC_MODEL_URL = '/models/stylized-african-male.glb';
useGLTF.preload(REALISTIC_MODEL_URL);

function RealisticSuitFigure({
  garment,
  upperFabric,
  lowerFabric,
}: {
  garment: { upper: boolean; lower: boolean };
  upperFabric: THREE.MeshStandardMaterial;
  lowerFabric: THREE.MeshStandardMaterial;
}) {
  const { scene } = useGLTF(REALISTIC_MODEL_URL);

  // Deep-clone per instance so re-texturing the jacket/trousers here never
  // mutates the cached source asset (drei caches useGLTF by URL, shared
  // across every place this component is used).
  const { root, topMesh, bottomMesh } = useMemo(() => {
    const cloned = scene.clone(true);
    let top: THREE.Mesh | null = null;
    let bottom: THREE.Mesh | null = null;
    cloned.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      if (!mat || Array.isArray(mat)) return;
      if (mat.name === 'Wolf3D_Outfit_Top') {
        mesh.material = mat.clone();
        top = mesh;
      } else if (mat.name === 'Wolf3D_Outfit_Bottom') {
        mesh.material = mat.clone();
        bottom = mesh;
      }
    });
    return { root: cloned, topMesh: top, bottomMesh: bottom };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene]);

  useEffect(() => {
    if (!topMesh) return;
    const mat = (topMesh as THREE.Mesh).material as THREE.MeshStandardMaterial;
    if (garment.upper) {
      mat.map = upperFabric.map;
      mat.color.set(upperFabric.map ? '#ffffff' : upperFabric.color);
    }
    mat.needsUpdate = true;
  }, [topMesh, garment.upper, upperFabric]);

  useEffect(() => {
    if (!bottomMesh) return;
    const mat = (bottomMesh as THREE.Mesh).material as THREE.MeshStandardMaterial;
    if (garment.lower) {
      mat.map = lowerFabric.map;
      mat.color.set(lowerFabric.map ? '#ffffff' : lowerFabric.color);
    }
    mat.needsUpdate = true;
  }, [bottomMesh, garment.lower, lowerFabric]);

  // If the figure loads facing away from the camera, this is the one knob
  // to flip (0 <-> Math.PI) — everything else about its transform comes
  // from the file itself.
  const FACING_Y = 0;

  return <primitive object={root} rotation={[0, FACING_Y, 0]} />;
}

// ---------------------------------------------------------------------
// Realistic female figure — rigged (has a skeleton), unlike the male
// asset above, but I'm deliberately not playing its bundled "mixamo.com"
// animation clip: I have no way to preview what that clip actually does
// here, and an unreviewed animation risks looking worse than a still
// pose. It renders in its bind pose. Licensed CC BY 4.0 (Dale.Nolan) —
// that's credited in the site footer, which is a real requirement of
// that license, not optional polish.
//
// The skin and hair looking flat gray (rather than actual skin/hair
// tones) traces to a real gap in the loader: this file's Body and Hair
// materials define their color texture through an old, now-unsupported
// glTF extension (KHR_materials_pbrSpecularGlossiness). The loader we
// use (three-stdlib's GLTFLoader, which is what @react-three/drei's
// useGLTF is built on) has no handler for that extension, so it silently
// drops the texture and falls back to a flat, fully-metallic default —
// that's the gray. It's not a lighting problem.
// The fix: I extracted the real diffuse images straight out of the
// .glb's own binary data (confirmed by eye — one is unmistakably a skin
// UV map, the other unmistakably hair) and load them here directly,
// bypassing the broken extension path entirely, the same way the
// selected-fabric texture is already applied to the dress below.
const FEMALE_MODEL_URL = '/models/african-female.glb';
const FEMALE_BODY_DIFFUSE_URL = '/models/textures/female-body-diffuse.png';
const FEMALE_HAIR_DIFFUSE_URL = '/models/textures/female-hair-diffuse.png';
useGLTF.preload(FEMALE_MODEL_URL);

function useDirectTexture(url: string) {
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    let cancelled = false;
    const loader = new THREE.TextureLoader();
    loader.load(url, (t) => {
      if (cancelled) {
        t.dispose();
        return;
      }
      t.colorSpace = THREE.SRGBColorSpace;
      t.flipY = false; // glTF textures are stored top-to-bottom already
      t.needsUpdate = true;
      setTex(t);
    });
    return () => {
      cancelled = true;
    };
  }, [url]);
  return tex;
}

function RealisticFemaleFigure({
  garment,
  dressFabric,
}: {
  garment: { upper: boolean; lower: boolean };
  dressFabric: THREE.MeshStandardMaterial;
}) {
  const { scene } = useGLTF(FEMALE_MODEL_URL);
  const bodyDiffuse = useDirectTexture(FEMALE_BODY_DIFFUSE_URL);
  const hairDiffuse = useDirectTexture(FEMALE_HAIR_DIFFUSE_URL);

  const { root, dressMeshes, bodyMeshes, hairMeshes } = useMemo(() => {
    const cloned = scene.clone(true);
    // Several separate mesh pieces can share one material name — this
    // asset has three (body, eyes, and the mouth interior) all using
    // "Bodymat". An earlier version of this kept only the last match per
    // name and silently left the others — including, it turned out, the
    // eyes — on the broken, un-textured material. Collecting arrays
    // instead of single refs so every piece actually gets fixed.
    const dress: THREE.Mesh[] = [];
    const body: THREE.Mesh[] = [];
    const hair: THREE.Mesh[] = [];
    cloned.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      if (!mat || Array.isArray(mat)) return;
      if (mat.name === 'Topmat') {
        mesh.material = mat.clone();
        dress.push(mesh);
      } else if (mat.name === 'Bodymat') {
        mesh.material = mat.clone();
        body.push(mesh);
      } else if (mat.name === 'Hairmat') {
        mesh.material = mat.clone();
        hair.push(mesh);
      }
    });
    return { root: cloned, dressMeshes: dress, bodyMeshes: body, hairMeshes: hair };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene]);

  useEffect(() => {
    dressMeshes.forEach((dressMesh) => {
      const mat = dressMesh.material as THREE.MeshStandardMaterial;
      // This one mesh is the whole dress — it's what "upper" and "lower"
      // both mean for a one-piece garment, so either flag being on is
      // enough to apply the fabric.
      if (garment.upper || garment.lower) {
        mat.map = dressFabric.map;
        mat.color.set(dressFabric.map ? '#ffffff' : dressFabric.color);
      }
      // This is what was making the dress go see-through from behind
      // when you rotated the view: the garment mesh isn't a fully closed
      // shell (no separate inner lining surface), and three.js by
      // default only draws the *front* face of a triangle (material.side
      // defaults to FrontSide). From an angle where you're looking at
      // the back of the dress's own outward-facing surface, there was
      // nothing there to draw — you were seeing straight through to the
      // body underneath. DoubleSide draws both faces, so there's always
      // fabric facing you. Forcing transparent off too, since this
      // should read as solid cloth like the male figure's jacket, not
      // blended/translucent.
      mat.side = THREE.DoubleSide;
      mat.transparent = false;
      mat.alphaTest = 0;
      mat.depthWrite = true;
      mat.depthTest = true;
      // The dark gap at the shoulder/armhole seam is a new artifact that
      // showed up exactly when DoubleSide went on: the dress's cap-sleeve
      // piece has an inner and outer surface nearly touching right there,
      // and with both faces now drawing, they fight over which one's in
      // front — polygon offset nudges them apart in depth so one wins
      // cleanly instead of flickering/gapping.
      mat.polygonOffset = true;
      mat.polygonOffsetFactor = 1;
      mat.polygonOffsetUnits = 1;
      mat.needsUpdate = true;
    });
  }, [dressMeshes, garment.upper, garment.lower, dressFabric]);

  useEffect(() => {
    if (!bodyDiffuse) return;
    bodyMeshes.forEach((bodyMesh) => {
      const mat = bodyMesh.material as THREE.MeshStandardMaterial;
      mat.map = bodyDiffuse;
      mat.color.set('#ffffff');
      // The loader's fallback defaults (metalness 1, roughness 1, from
      // the extension it couldn't parse) still need overriding even once
      // the texture is fixed, or skin reads as chrome instead of skin.
      mat.metalness = 0;
      mat.roughness = 0.55;
      // Same fix as the dress: this mesh isn't a guaranteed-closed shell
      // (or has some inverted normals from the scan/export), so
      // FrontSide culling was letting you see straight through the skin
      // from some angles. DoubleSide draws both faces so there's always
      // a surface there.
      mat.side = THREE.DoubleSide;
      // Solid skin, not blended — same reasoning as the dress above.
      mat.transparent = false;
      mat.polygonOffset = true;
      mat.polygonOffsetFactor = 1;
      mat.polygonOffsetUnits = 1;
      // Belt-and-suspenders: the skin texture's own alpha channel has
      // transparent padding around its UV islands (normal for a texture
      // atlas), and alphaTest/depthWrite can end up inherited from the
      // file's original (broken) material state depending on load order.
      // Forcing all three explicitly closes off any route back to a
      // see-through result, regardless of what the source set them to.
      mat.alphaTest = 0;
      mat.depthWrite = true;
      mat.depthTest = true;
      mat.needsUpdate = true;
    });
    // bodyMeshes is actually three separate pieces (body, eyes, and the
    // mouth interior) all sharing the "Bodymat" name — an earlier version
    // of this only grabbed the last one found and left the other two,
    // including the eyes, on the old broken material. That's what was
    // showing through the back of the head.
  }, [bodyMeshes, bodyDiffuse]);

  useEffect(() => {
    if (!hairDiffuse) return;
    hairMeshes.forEach((hairMesh) => {
      const mat = hairMesh.material as THREE.MeshStandardMaterial;
      mat.map = hairDiffuse;
      mat.color.set('#ffffff');
      mat.metalness = 0;
      mat.roughness = 0.6;
      // Hair cards are thin single planes, not closed shells, so they
      // need DoubleSide for the same reason the dress did. A hard alpha
      // cutout (alphaTest, no blending) carves out the actual strand
      // shapes from the card without the sorting problems blended
      // transparency causes on overlapping cards.
      mat.side = THREE.DoubleSide;
      mat.transparent = false;
      mat.alphaTest = 0.3;
      mat.depthWrite = true;
      mat.depthTest = true;
      mat.needsUpdate = true;
    });
  }, [hairMeshes, hairDiffuse]);

  const FACING_Y = 0;

  return <primitive object={root} rotation={[0, FACING_Y, 0]} />;
}

export default function FitAvatar({ material, profile, category }: Props) {
  const bumpMap = useMemo(() => makeFabricBumpTexture(), []);
  const upperFabric = useFabricMaterial(material, bumpMap, 2.4, 1.4);
  const lowerFabric = useFabricMaterial(material, bumpMap, 2.4, 1.4);

  const garment = (category && GARMENT_CONFIG[category]) || DEFAULT_GARMENT;
  // The male asset is a man in trousers and the female asset is a woman
  // in a dress — neither can represent the other's silhouette, so the
  // garment shape picks which realistic figure applies by default, and a
  // saved gender on the customer's profile can override back to the
  // procedural mannequin when it conflicts with that default (e.g. a
  // male customer's profile attached to a dress product, where we have
  // no realistic asset that fits at all).
  const isDressShaped = garment.lowerStyle !== 'legs';
  let figureKind: 'male' | 'female' | 'procedural';
  if (isDressShaped) {
    figureKind = profile?.gender === 'male' ? 'procedural' : 'female';
  } else {
    figureKind = profile?.gender === 'female' ? 'procedural' : 'male';
  }

  return (
    <div>
      <div className="avatar-3d-stage">
        <Canvas
          shadows
          dpr={[1, 2]}
          camera={{ position: [0, 1.4, 4.6], fov: 24 }}
          gl={{ toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 0.95 }}
        >
          {/* Real materials on the imported figures (especially the
              female asset, converted from an older specular/glossiness
              workflow) have genuine reflectivity — without some ambient
              environment for them to reflect, they render almost black
              except right where a direct light hits. This is what was
              making both figures look so dark before; the settings below
              are a pulled-back second pass after the first attempt at
              fixing that overshot into blown-out highlights. */}
          <Environment preset="city" background={false} environmentIntensity={0.45} />
          <ambientLight intensity={0.5} />
          <directionalLight
            position={[2.2, 3.6, 2.6]}
            intensity={1.3}
            castShadow
            shadow-mapSize={[1024, 1024]}
            shadow-camera-near={1}
            shadow-camera-far={8}
            shadow-camera-left={-1.2}
            shadow-camera-right={1.2}
            shadow-camera-top={1.8}
            shadow-camera-bottom={-1.2}
          />
          <directionalLight position={[-2.6, 1.6, -1.6]} intensity={0.4} color="#a9c4ff" />
          <pointLight position={[0, 2.1, -1.6]} intensity={0.4} color="#ffd9a0" />

          <Suspense fallback={null}>
            {figureKind === 'male' && (
              <RealisticSuitFigure garment={garment} upperFabric={upperFabric} lowerFabric={lowerFabric} />
            )}
            {figureKind === 'female' && <RealisticFemaleFigure garment={garment} dressFabric={upperFabric} />}
            {figureKind === 'procedural' && (
              <Mannequin profile={profile} category={category} fabricMaterial={upperFabric} lowerFabricMaterial={lowerFabric} />
            )}
          </Suspense>

          <ContactShadows position={[0, 0, 0]} opacity={0.38} scale={2.4} blur={2.2} far={1.1} />

          <OrbitControls
            makeDefault
            enablePan={false}
            enableZoom
            minDistance={3.4}
            maxDistance={6.2}
            minPolarAngle={Math.PI / 2 - 0.5}
            maxPolarAngle={Math.PI / 2 + 0.4}
            target={[0, 0.95, 0]}
            autoRotate
            autoRotateSpeed={0.9}
            enableDamping
            dampingFactor={0.08}
          />
        </Canvas>
      </div>
      <p className="avatar-caption">
        {material
          ? `Rough preview in ${material.name}${
              figureKind !== 'procedural' ? '' : profile?.label ? `, scaled to ${profile.label}` : ''
            }. A visual guide, not an exact fit.${
              figureKind !== 'procedural' ? ' Shown at a fixed size, not scaled to your measurements.' : ''
            } Drag to rotate.`
          : 'Pick a material to preview it here. Drag to rotate.'}
      </p>
    </div>
  );
}

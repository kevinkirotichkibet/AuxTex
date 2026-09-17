// Runs entirely in the browser via TensorFlow.js — the photo is never
// uploaded anywhere. This is deliberately a rough estimate, not a
// measurement: MoveNet gives 2D pixel positions for body landmarks (a
// photo, not a 3D scan), so widths are reasonably inferable but
// circumferences (chest/waist/hip) fundamentally aren't — a front-on photo
// can't see how deep the body is. We approximate that missing depth with a
// fixed ratio to width and convert to a circumference using an
// ellipse-perimeter formula. Treat every number this produces as a rough
// starting point, never as ground truth.

import type * as posedetection from '@tensorflow-models/pose-detection';

export type PoseEstimate = {
  chest: number;
  waist: number;
  hips: number;
  shoulderWidth: number;
  sleeveLength: number;
  inseam: number;
  height: number;
  keypoints: { x: number; y: number; name: string; score: number }[];
};

let detectorPromise: Promise<posedetection.PoseDetector> | null = null;

async function getDetector() {
  if (!detectorPromise) {
    detectorPromise = (async () => {
      const tf = await import('@tensorflow/tfjs');
      await import('@tensorflow/tfjs-backend-webgl');
      await tf.setBackend('webgl');
      await tf.ready();
      const poseDetection = await import('@tensorflow-models/pose-detection');
      // Thunder trades a bit of speed for meaningfully better accuracy than
      // Lightning — worth it here since this runs once per photo, not
      // frame-by-frame on video.
      return poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, {
        modelType: poseDetection.movenet.modelType.SINGLEPOSE_THUNDER,
      });
    })();
  }
  return detectorPromise;
}

function dist(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function findPoint(keypoints: posedetection.Keypoint[], name: string) {
  return keypoints.find((k) => k.name === name);
}

// Ramanujan's second approximation for an ellipse's perimeter, used to turn
// a body-part WIDTH into an approximate circumference. `depthRatio` is a
// rough estimate of how deep (front-to-back) that body part is relative to
// its width — there is no universal constant here, these are just
// reasonable midpoints for an average adult build.
function widthToCircumference(widthCm: number, depthRatio: number): number {
  const a = widthCm / 2;
  const b = (widthCm * depthRatio) / 2;
  return Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b)));
}

// Normalizes whatever image the person uploaded into something the model
// can reliably read. This fixes several real failure modes at once:
// (1) EXIF-rotated phone photos (createImageBitmap with imageOrientation
// handles this; a plain <img> tag doesn't always, and pose models read raw
// pixels, not what the browser *displays*), (2) transparent PNGs, whose
// see-through areas can render as black or a checkerboard pattern depending
// on the browser, confusing the model — this flattens them onto a plain
// white background instead, and (3) MoveNet internally resizes whatever
// it's given to a FIXED SQUARE input size. A tall portrait photo (the
// normal shape for a full-body photo) passed in at its natural aspect
// ratio gets squashed vertically by that resize, which distorts exactly
// the top and bottom of the frame — i.e. the head and feet — while barely
// touching the torso in the middle. That precise pattern (confident
// shoulders/hips, near-zero-confidence nose/ankles) is what a squashed
// image looks like. Letterboxing onto a square canvas ourselves, instead
// of letting the library's resize do it, avoids the distortion entirely.
async function normalizeImage(file: File): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const SIZE = 640;
  const scale = Math.min(SIZE / bitmap.width, SIZE / bitmap.height);
  const drawWidth = bitmap.width * scale;
  const drawHeight = bitmap.height * scale;
  const offsetX = (SIZE - drawWidth) / 2;
  const offsetY = (SIZE - drawHeight) / 2;

  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not process that image in this browser.');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.drawImage(bitmap, offsetX, offsetY, drawWidth, drawHeight);
  bitmap.close();
  return canvas;
}

export async function estimateFromImage(
  file: File,
  actualHeightCm: number,
): Promise<PoseEstimate & { canvas: HTMLCanvasElement }> {
  const canvas = await normalizeImage(file);
  const detector = await getDetector();
  const poses = await detector.estimatePoses(canvas);
  if (poses.length === 0) {
    throw new Error('No person detected in that photo — try a clearer, front-facing full-body shot.');
  }
  const kp = poses[0].keypoints;

  const nose = findPoint(kp, 'nose');
  const leftAnkle = findPoint(kp, 'left_ankle');
  const rightAnkle = findPoint(kp, 'right_ankle');
  const leftShoulder = findPoint(kp, 'left_shoulder');
  const rightShoulder = findPoint(kp, 'right_shoulder');
  const leftHip = findPoint(kp, 'left_hip');
  const rightHip = findPoint(kp, 'right_hip');
  const leftWrist = findPoint(kp, 'left_wrist');

  const CONFIDENCE_MIN = 0.2;
  const requiredNamed: [string, posedetection.Keypoint | undefined][] = [
    ['nose', nose],
    ['left ankle', leftAnkle],
    ['right ankle', rightAnkle],
    ['left shoulder', leftShoulder],
    ['right shoulder', rightShoulder],
    ['left hip', leftHip],
    ['right hip', rightHip],
  ];
  const missing = requiredNamed.filter(([, p]) => !p || (p.score ?? 0) < CONFIDENCE_MIN);
  if (missing.length > 0) {
    const detail = requiredNamed
      .map(([name, p]) => `${name}: ${p ? Math.round((p.score ?? 0) * 100) : 0}%`)
      .join(', ');
    throw new Error(
      `Couldn't confidently locate your ${missing.map(([name]) => name).join(', ')} in that photo ` +
        `(confidence — ${detail}). Try a full-body photo, facing the camera, with even lighting and ` +
        'a plain, non-transparent background.',
    );
  }

  const ankleY = (leftAnkle!.y + rightAnkle!.y) / 2;
  const pixelHeight = ankleY - nose!.y;
  if (pixelHeight <= 0) {
    throw new Error('Could not determine a scale from this photo. Try a straight-on, full-body photo.');
  }
  const cmPerPixel = actualHeightCm / pixelHeight;

  const shoulderWidthPx = dist(leftShoulder!, rightShoulder!);
  const hipWidthPx = dist(leftHip!, rightHip!);

  const shoulderWidthCm = shoulderWidthPx * cmPerPixel;
  const hipWidthCm = hipWidthPx * cmPerPixel;
  // No waist landmark exists in MoveNet — approximate its width as roughly
  // between the shoulder and hip width, since it's usually narrower than both.
  const waistWidthCm = ((shoulderWidthCm + hipWidthCm) / 2) * 0.85;

  const chest = widthToCircumference(shoulderWidthCm * 1.05, 0.65);
  const waist = widthToCircumference(waistWidthCm, 0.7);
  const hips = widthToCircumference(hipWidthCm, 0.68);

  let sleeveLength = 0;
  if (leftWrist && (leftWrist.score ?? 0) >= CONFIDENCE_MIN) {
    sleeveLength = dist(leftShoulder!, leftWrist) * cmPerPixel;
  }
  const inseam = (ankleY - (leftHip!.y + rightHip!.y) / 2) * cmPerPixel;

  return {
    chest: Math.round(chest),
    waist: Math.round(waist),
    hips: Math.round(hips),
    shoulderWidth: Math.round(shoulderWidthCm),
    sleeveLength: Math.round(sleeveLength),
    inseam: Math.round(inseam),
    height: Math.round(actualHeightCm),
    keypoints: kp.map((k) => ({ x: k.x, y: k.y, name: k.name ?? '', score: k.score ?? 0 })),
    canvas,
  };
}

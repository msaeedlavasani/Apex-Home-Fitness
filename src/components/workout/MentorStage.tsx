'use client';

import {useEffect, useRef, useState} from 'react';
import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';

const MENTOR_URL = '/prototype-assets/AHF_Mentor_Squat.glb';

function StageFallback({label}: {label: string}) {
  return (
    <div className="mentor-stage-fallback" role="status">
      <span className="mentor-stage-fallback-mark" aria-hidden="true">◌</span>
      <span>{label}</span>
    </div>
  );
}

export function MentorStage({paused}: {paused: boolean}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pausedRef = useRef(paused);
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading');

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(28, 1, 0.01, 20);
    camera.position.set(0, 0.57, 2.32);
    camera.lookAt(0, 0.52, 0);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({canvas, antialias: true, alpha: true, powerPreference: 'high-performance'});
    } catch {
      setStatus('failed');
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setClearColor('#101419', 1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    scene.add(new THREE.AmbientLight(0xffffff, 1.25));
    const keyLight = new THREE.DirectionalLight(0xfff4e9, 2.6);
    keyLight.position.set(2.5, 3.5, 3);
    keyLight.castShadow = true;
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0xb9d6ff, 1.3);
    fillLight.position.set(-2, 1.5, 1);
    scene.add(fillLight);
    const warmLight = new THREE.PointLight(0xff895e, 1.2, 5);
    warmLight.position.set(0, 0.8, 1.6);
    scene.add(warmLight);

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(0.7, 64),
      new THREE.MeshStandardMaterial({color: '#242c32', roughness: 0.92, transparent: true, opacity: 0.8}),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.03;
    floor.receiveShadow = true;
    scene.add(floor);

    let mixer: THREE.AnimationMixer | null = null;
    let model: THREE.Group | null = null;
    let normalizedModelPosition = new THREE.Vector3();
    let shouldNeutralizeRootDrift = false;
    const mentorAnchor = new THREE.Group();
    mentorAnchor.name = 'MentorPresentationAnchor';
    scene.add(mentorAnchor);
    let animationFrame = 0;
    let lastTime = performance.now();
    let disposed = false;

    const stage = canvas.parentElement;
    const resize = () => {
      if (!stage) return;
      const {width, height} = stage.getBoundingClientRect();
      if (width <= 0 || height <= 0) return;
      renderer.setSize(Math.round(width), Math.round(height), false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    // Observe the stable layout host, not the canvas. renderer.setSize mutates
    // the canvas bitmap dimensions; observing the canvas itself can create a
    // ResizeObserver feedback loop in some browsers.
    const resizeObserver = stage ? new ResizeObserver(resize) : null;
    if (resizeObserver && stage) resizeObserver.observe(stage);
    resize();

    const loader = new GLTFLoader();
    loader.load(
      MENTOR_URL,
      (gltf) => {
        if (disposed) return;
        model = gltf.scene;
        // Frame the imported asset from its actual world-space bounds. The
        // source is authored around a skeleton root, so hard-coded camera
        // assumptions can leave the skinned mesh outside the portrait view.
        model.updateMatrixWorld(true);
        const sourceBounds = new THREE.Box3().setFromObject(model);
        const sourceSize = sourceBounds.getSize(new THREE.Vector3());
        const sourceCenter = sourceBounds.getCenter(new THREE.Vector3());
        const scale = 1.22 / Math.max(sourceSize.y, 0.01);
        model.scale.setScalar(scale);
        model.position.set(
          -sourceCenter.x * scale,
          -sourceBounds.min.y * scale,
          -sourceCenter.z * scale,
        );
        // Empirically verified against the rendered asset: its visible face
        // is presented to the camera at the unrotated Y orientation.
        model.rotation.y = 0;
        model.updateMatrixWorld(true);

        // Sample the complete embedded clip once before fixing the camera.
        // Unioning these pose bounds gives the squat loop a stable frame that
        // covers both standing and deep-squat extremes without per-frame
        // camera movement.
        const clip = gltf.animations[0];
        // The GLB contains a Hips translation track. Clone the runtime clip
        // and keep its vertical component, while locking X/Z to the first
        // keyed position so the squat cannot walk across the stage.
        const playableClip = clip?.clone();
        if (playableClip) {
          playableClip.tracks.forEach((track) => {
            if (!/(^|\.)((position)|(translation))$/.test(track.name) ||
                !/(^|\.)((root)|(hips)|(armature)|(scene))($|\.)/i.test(track.name)) return;
            const values = track.values;
            const stride = track.getValueSize();
            const baseX = values[0] ?? 0;
            const baseZ = values[2] ?? 0;
            for (let index = 0; index < values.length; index += stride) {
              values[index] = baseX;
              if (stride > 2) values[index + 2] = baseZ;
            }
            shouldNeutralizeRootDrift = true;
          });
        }
        const previewMixer = playableClip ? new THREE.AnimationMixer(model) : null;
        const previewAction = previewMixer && playableClip ? previewMixer.clipAction(playableClip) : null;
        const animatedBounds = new THREE.Box3();
        normalizedModelPosition = new THREE.Vector3(-sourceCenter.x * scale, model.position.y, -sourceCenter.z * scale);
        if (previewAction && previewMixer && playableClip) {
          previewAction.play();
          const sampleCount = 16;
          for (let index = 0; index <= sampleCount; index += 1) {
            previewMixer.setTime((playableClip.duration * index) / sampleCount);
            model.updateMatrixWorld(true);
            animatedBounds.union(new THREE.Box3().setFromObject(model));
          }
        } else {
          animatedBounds.setFromObject(model);
        }
        const animatedSize = animatedBounds.getSize(new THREE.Vector3());
        const animatedCenter = animatedBounds.getCenter(new THREE.Vector3());
        // Keep presentation centering on the stable outer anchor. Any
        // horizontal root-motion tracks are neutralized by restoring the
        // animated model's X/Z position after each mixer update.
        const presentationCenterX = animatedCenter.x;
        const presentationCenterZ = animatedCenter.z;
        // The anchor is the sole horizontal/depth presentation transform. The
        // camera must look at that normalized space, otherwise applying the
        // bounds center to both anchor and camera causes a visible side drift.
        const anchorVerticalOffset = animatedSize.y * 0.06;
        // The computed bounds are a reliable fit check, but they are not a
        // reliable visual composition target for this prototype: the imported
        // proportions leave the instructor reading low/right in the portrait
        // workout canvas. Keep the correction on the stable outer group so
        // animation/root tracks cannot overwrite the presentation choice.
        const presentationOffset = new THREE.Vector3(-0.06, 0.26, 0);
        mentorAnchor.position.set(
          -presentationCenterX + presentationOffset.x,
          anchorVerticalOffset + presentationOffset.y,
          -presentationCenterZ + presentationOffset.z,
        );
        // Both outstretched hands and full height must fit. The vertical FOV
        // determines height fit; the horizontal FOV (aspect-adjusted) limits
        // the arm span in portrait mode. Use the stricter distance.
        const framingMargin = 1.33;
        const verticalFov = THREE.MathUtils.degToRad(camera.fov);
        const horizontalFov = 2 * Math.atan(Math.tan(verticalFov * 0.5) * Math.max(camera.aspect, 0.01));
        const distanceForHeight = (animatedSize.y * 0.5) / Math.tan(verticalFov * 0.5);
        const distanceForWidth = (animatedSize.x * 0.5) / Math.tan(horizontalFov * 0.5);
        const fitDistance = Math.max(distanceForHeight, distanceForWidth) * framingMargin;
        const torsoTargetY = animatedBounds.min.y + animatedSize.y * 0.58;
        const visualStageLift = animatedSize.y * 0.05;
        const cameraTarget = new THREE.Vector3(0, torsoTargetY + visualStageLift, 0);
        camera.position.set(0, cameraTarget.y, Math.max(fitDistance, 1.35));
        camera.lookAt(cameraTarget);
        camera.near = Math.max(0.01, fitDistance * 0.01);
        camera.far = Math.max(20, fitDistance * 4);
        camera.updateProjectionMatrix();
        previewAction?.stop();
        previewMixer?.stopAllAction();
        model.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            object.castShadow = true;
            object.receiveShadow = true;
            if (object.material instanceof THREE.MeshStandardMaterial) {
              object.material.roughness = Math.max(object.material.roughness, 0.72);
            }
          }
        });
        mentorAnchor.add(model);

        if (gltf.animations.length > 0) {
          mixer = new THREE.AnimationMixer(model);
          const action = mixer.clipAction(playableClip ?? gltf.animations[0]);
          action.setLoop(THREE.LoopRepeat, Infinity);
          action.play();
        }
        setStatus('ready');
      },
      undefined,
      () => { if (!disposed) setStatus('failed'); },
    );

    const render = (time: number) => {
      if (disposed) return;
      const delta = Math.min((time - lastTime) / 1000, 0.05);
      lastTime = time;
      if (!pausedRef.current) mixer?.update(delta);
      // Mixer evaluation can reapply root translation tracks. Reassert the
      // stable presentation transform without touching joint rotations.
      if (model && shouldNeutralizeRootDrift) {
        model.position.x = normalizedModelPosition.x;
        model.position.z = normalizedModelPosition.z;
      }
      renderer.render(scene, camera);
      animationFrame = requestAnimationFrame(render);
    };
    animationFrame = requestAnimationFrame(render);

    return () => {
      disposed = true;
      cancelAnimationFrame(animationFrame);
      resizeObserver?.disconnect();
      mixer?.stopAllAction();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => material.dispose());
        }
      });
      renderer.dispose();
    };
  }, []);

  return (
    <div className="mentor-stage" aria-label="Animated 3D Mentor demonstrating a bodyweight squat">
      {status !== 'ready' ? <StageFallback label={status === 'failed' ? 'Mentor unavailable' : 'Loading Mentor'} /> : null}
      <canvas ref={canvasRef} className={status === 'ready' ? 'mentor-canvas is-ready' : 'mentor-canvas'} aria-hidden="true" />
    </div>
  );
}

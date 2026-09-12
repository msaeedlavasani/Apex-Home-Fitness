'use client';

import {useCallback, useEffect, useRef, useState, type ReactNode} from 'react';
import {MovementFeedbackOverlay} from './MovementFeedbackOverlay';
import {TrackingSkeletonOverlay} from './TrackingSkeletonOverlay';
import type {BoneProjection, VisualBounds} from './tracking';
import type {WorkoutPrototypeState} from './workoutState';

interface MentorViewportProps {
  state: WorkoutPrototypeState;
  trackingVisible: boolean;
  mentorVisible: boolean;
  mentorRenderer: (
    onBoneProjection: (points: BoneProjection) => void,
    onVisualBounds: (bounds: VisualBounds) => void,
  ) => ReactNode;
}

export function MentorViewport({state, trackingVisible, mentorVisible, mentorRenderer}: MentorViewportProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({width: 0, height: 0});
  const [boneProjection, setBoneProjection] = useState<BoneProjection>({});
  const [visualBounds, setVisualBounds] = useState<VisualBounds | null>(null);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const measure = () => {
      const {width, height} = viewport.getBoundingClientRect();
      setDimensions({width: Math.round(width), height: Math.round(height)});
    };

    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    measure();
    return () => observer.disconnect();
  }, []);

  const handleBoneProjection = useCallback((points: BoneProjection) => {
    setBoneProjection(points);
  }, []);
  const handleVisualBounds = useCallback((bounds: VisualBounds) => {
    setVisualBounds(bounds);
  }, []);

  return (
    <section
      ref={viewportRef}
      className="workout-mentor-viewport"
      data-layer="z2"
      data-workout-state={state}
      data-mentor-visible={mentorVisible ? 'true' : 'false'}
      data-zone-label="ZONE C · MENTOR VIEWPORT"
      data-visual-left={visualBounds?.left.toFixed(2)}
      data-visual-right={visualBounds?.right.toFixed(2)}
      data-visual-center={visualBounds?.center.toFixed(2)}
      data-visual-bottom={visualBounds?.bottom.toFixed(2)}
      data-pixels-per-world-x={visualBounds?.pixelsPerWorldX?.toFixed(2)}
      data-pixels-per-world-y={visualBounds?.pixelsPerWorldY?.toFixed(2)}
      aria-label="Mentor viewport"
    >
      {mentorVisible ? (
        <div className="workout-mentor-contact-shadow" data-layer="z1" aria-hidden="true">
          <span className="workout-mentor-contact-shadow-lobe workout-mentor-contact-shadow-lobe-left" />
          <span className="workout-mentor-contact-shadow-lobe workout-mentor-contact-shadow-lobe-right" />
        </div>
      ) : null}
      <>
        <div className="workout-mentor-renderer" data-layer="z2">
          {mentorRenderer(handleBoneProjection, handleVisualBounds)}
        </div>
      </>
      {trackingVisible ? (
        <TrackingSkeletonOverlay
          points={boneProjection}
          visible
          state={state}
          width={dimensions.width}
          height={dimensions.height}
        />
      ) : null}
      <MovementFeedbackOverlay state={state} />
      <div className="workout-mentor-viewport-debug" aria-hidden="true">
        <span>MENTOR VIEWPORT</span>
        <strong>{dimensions.width} × {dimensions.height}px</strong>
      </div>
    </section>
  );
}

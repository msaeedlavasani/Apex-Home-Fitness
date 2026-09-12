import {useEffect, useRef, useState} from 'react';
import {PrepareStateContent} from './PrepareStateContent';
import {SessionBar} from './SessionBar';
import {WorkoutControls} from './WorkoutControls';

export function PrepareStage({onPauseToggle, onPrepareComplete}: {onPauseToggle: () => void; onPrepareComplete: () => void}) {
  const [countdownValue, setCountdownValue] = useState(5);
  const onPrepareCompleteRef = useRef(onPrepareComplete);
  onPrepareCompleteRef.current = onPrepareComplete;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (countdownValue === 1) {
        onPrepareCompleteRef.current();
        return;
      }

      setCountdownValue((currentValue) => Math.max(1, currentValue - 1));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [countdownValue]);

  return (
    <section className="workout-prepare-stage" data-layer="z5" data-workout-state="PREPARE" aria-label="Prepare for workout">
      <div className="workout-prepare-stage-top">
        <SessionBar state="PREPARE" />
      </div>
      <PrepareStateContent countdownValue={countdownValue} />
      <div className="workout-prepare-stage-controls">
        <WorkoutControls state="PREPARE" onPauseToggle={onPauseToggle} />
      </div>
    </section>
  );
}

import {Timer} from 'lucide-react';

export function TimerSlot() {
  return (
    <div className="workout-timer-slot" aria-label="Set elapsed time">
      <Timer size={13} strokeWidth={1.7} aria-hidden="true" />
      <span className="workout-timer-value">00:34</span>
    </div>
  );
}

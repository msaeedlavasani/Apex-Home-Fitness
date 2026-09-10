'use client';

import dynamic from 'next/dynamic';
import {ArrowLeft, Pause, Play, X} from 'lucide-react';
import {useState} from 'react';

const MentorStage = dynamic(
  () => import('@/components/workout/MentorStage').then((module) => module.MentorStage),
  {ssr: false, loading: () => <div className="mentor-stage-fallback" role="status"><span className="mentor-stage-fallback-mark" aria-hidden="true">◌</span><span>Loading Mentor</span></div>},
);

export default function WorkoutPrototypePage() {
  const [paused, setPaused] = useState(false);

  return (
    <main className="workout-prototype" aria-label="AHF Workout prototype">
      <div className="workout-prototype-glow" aria-hidden="true" />
      <header className="workout-prototype-header">
        <button className="workout-prototype-icon-button" type="button" aria-label="Exit workout prototype">
          <X size={20} strokeWidth={1.8} />
        </button>
        <div className="workout-prototype-header-progress" aria-label="Workout progress 3 of 8">
          <span className="workout-prototype-kicker">WORKOUT</span>
          <span className="workout-prototype-progress-count">03 <i>/ 08</i></span>
        </div>
        <button
          className="workout-prototype-icon-button"
          type="button"
          aria-label={paused ? 'Resume Mentor animation' : 'Pause Mentor animation'}
          onClick={() => setPaused((value) => !value)}
        >
          {paused ? <Play size={19} strokeWidth={1.8} /> : <Pause size={19} strokeWidth={1.8} />}
        </button>
      </header>

      <section className="workout-prototype-title" aria-labelledby="workout-title">
        <p className="workout-prototype-eyebrow">BODYWEIGHT</p>
        <h1 id="workout-title">Squat</h1>
        <p className="workout-prototype-set">Set 02 <span>/ 03</span></p>
      </section>

      <section className="workout-prototype-stage-wrap">
        <MentorStage paused={paused} />
        <div className="workout-prototype-stage-caption" aria-hidden="true">
          <span className="workout-prototype-live-dot" />
          <span>{paused ? 'MENTOR PAUSED' : 'MENTOR IN MOTION'}</span>
        </div>
      </section>

      <section className="workout-prototype-bottom" aria-label="Current set details">
        <div className="workout-prototype-reps">
          <span className="workout-prototype-label">REPS</span>
          <strong>08 <i>/ 12</i></strong>
        </div>
        <div className="workout-prototype-coach">
          <div className="workout-prototype-coach-heading"><span className="workout-prototype-coach-mark">✦</span> QUIET COACH</div>
          <p>“Chest tall. Drive through your heels.”</p>
        </div>
        <button className="workout-prototype-next" type="button" aria-label="Continue workout">
          <ArrowLeft size={18} strokeWidth={1.8} />
        </button>
      </section>
    </main>
  );
}

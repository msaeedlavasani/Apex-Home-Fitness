import {CircleOff, Maximize2, PersonStanding} from 'lucide-react';

const preparationDetails = [
  {title: 'Stable surface', message: 'Make sure you have enough room.', Icon: Maximize2},
  {title: 'Good posture', message: 'Stand tall and relaxed.', Icon: PersonStanding},
  {title: 'No equipment', message: 'This is a bodyweight exercise.', Icon: CircleOff},
];

export function PrepareStateContent({countdownValue}: {countdownValue: number}) {
  return (
    <div className="workout-prepare-content" aria-label="Prepare for bodyweight squat">
      <div className="workout-prepare-heading">
        <span className="workout-prepare-kicker">PREPARE</span>
        <span className="workout-prepare-first-up">First up</span>
        <h1>Squat</h1>
        <span className="workout-prepare-type">BODYWEIGHT</span>
      </div>

      <div className="workout-prepare-countdown" aria-label={`${countdownValue} seconds`}>
        <div className="workout-prepare-countdown-ring" data-countdown-value={countdownValue}>
          <div className="workout-prepare-countdown-center">
            <strong>{countdownValue}</strong>
            <span>SECONDS</span>
          </div>
        </div>
      </div>

      <div className="workout-prepare-guidance">
        <h2>Get ready to start</h2>
        <p>Find your space and get into position.</p>
      </div>

      <div className="workout-prepare-details" aria-label="Preparation details">
        {preparationDetails.map(({title, message, Icon}) => (
          <div className="workout-prepare-detail" key={title}>
            <span className="workout-prepare-detail-icon"><Icon size={21} strokeWidth={1.7} aria-hidden="true" /></span>
            <div>
              <strong>{title}</strong>
              <span>{message}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

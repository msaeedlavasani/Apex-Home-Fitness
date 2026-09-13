export const START_WORKOUT_EVENT = 'ahf:start-workout';
export const START_WORKOUT_REQUEST_ATTRIBUTE = 'data-ahf-start-workout-requested';

export const START_WORKOUT_BRIDGE_SCRIPT = `(() => {
  const requestAttribute = ${JSON.stringify(START_WORKOUT_REQUEST_ATTRIBUTE)};
  const eventName = ${JSON.stringify(START_WORKOUT_EVENT)};

  document.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element) || !target.closest('[data-start-workout-cta]')) return;

    document.documentElement.setAttribute(requestAttribute, 'true');
    window.dispatchEvent(new CustomEvent(eventName));
  }, true);
})();`;

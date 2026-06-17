/**
 * PUNYCODEX Daily Oracle Challenge — hidden name puzzle UI.
 */
(function (global) {
  'use strict';

  const API = '/api/gamification';

  async function load(sessionToken) {
    const res = await fetch(`${API}?type=challenge`, { headers: { 'x-session-token': sessionToken } });
    if (!res.ok) throw new Error('Failed to load challenge');
    return res.json();
  }

  async function submit(sessionToken, date, guess) {
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-session-token': sessionToken },
      body: JSON.stringify({ action: 'challenge', date, guess }),
    });
    if (!res.ok) throw new Error('Failed to submit guess');
    return res.json();
  }

  function render(container, challenge, onGuess) {
    container.innerHTML = `
      <div class="pcd-challenge">
        <h3>Daily Oracle Challenge</h3>
        <p>Guess the name from the clues:</p>
        <ul class="pcd-challenge-clues">${challenge.clues.map((c) => `<li>${c}</li>`).join('')}</ul>
        <div class="pcd-challenge-input">
          <input type="text" id="challengeGuess" placeholder="Your guess…" autocomplete="off">
          <button id="challengeSubmit">Solve</button>
        </div>
        <div class="pcd-challenge-result" id="challengeResult"></div>
      </div>
    `;
    const input = container.querySelector('#challengeGuess');
    const btn = container.querySelector('#challengeSubmit');
    const result = container.querySelector('#challengeResult');
    btn.addEventListener('click', async () => {
      const guess = input.value.trim();
      if (!guess) return;
      const r = await onGuess(challenge.date, guess);
      if (r.correct) {
        result.innerHTML = `<span style="color:var(--available, #7ec9a0)">Correct! It was <strong>${r.unicode}</strong>.</span>`;
        input.disabled = true;
        btn.disabled = true;
      } else {
        result.innerHTML = `<span style="color:#ff9e9e">Not quite. Try another clue.</span>`;
      }
    });
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') btn.click(); });
  }

  global.PunyChallenge = { load, submit, render };
})(typeof window !== 'undefined' ? window : globalThis);

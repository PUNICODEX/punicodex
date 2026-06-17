/**
 * PUNYCODEX Voice Search — Web Speech API integration.
 */
(function (global) {
  'use strict';

  function isSupported() {
    return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
  }

  function createRecognition({ onResult, onError, onEnd, language = 'en-US' } = {}) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = language;

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      if (onResult) onResult(transcript);
    };

    recognition.onerror = (event) => {
      if (onError) onError(event.error);
    };

    recognition.onend = () => {
      if (onEnd) onEnd();
    };

    return recognition;
  }

  function createButton(inputElement) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pcd-voice-btn';
    btn.textContent = '🎤';
    btn.title = 'Voice search';

    if (!isSupported()) {
      btn.style.display = 'none';
      return btn;
    }

    let recognition;
    btn.addEventListener('click', () => {
      if (recognition && btn.classList.contains('listening')) {
        recognition.stop();
        return;
      }
      recognition = createRecognition({
        onResult: (t) => {
          inputElement.value = t;
          inputElement.dispatchEvent(new Event('input', { bubbles: true }));
          inputElement.form?.dispatchEvent(new Event('submit', { bubbles: true }));
        },
        onEnd: () => btn.classList.remove('listening'),
        onError: () => btn.classList.remove('listening'),
      });
      btn.classList.add('listening');
      recognition.start();
    });

    return btn;
  }

  global.PunyVoiceSearch = { isSupported, createRecognition, createButton };
})(typeof window !== 'undefined' ? window : globalThis);

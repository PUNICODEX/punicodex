(function () {
  'use strict';

  var stage = document.getElementById('arche-stage');
  var gate = document.getElementById('arche-identity-gate');
  if (!stage || !gate) return;

  var me = null;
  var lastSaved = -1;

  function cookie(name) {
    var prefix = name + '=';
    var parts = String(document.cookie || '').split(';');
    for (var i = 0; i < parts.length; i++) {
      var part = parts[i].trim();
      if (part.indexOf(prefix) === 0) return decodeURIComponent(part.slice(prefix.length));
    }
    return null;
  }

  function save(sceneId, chapter, completed) {
    if (!me) return;
    var current = Math.max(Number(me.identity.initiation.currentChapter) || 0, chapter);
    if (current === lastSaved && !completed) return;
    if (current === lastSaved && completed && me.identity.initiation.completedAt) return;
    lastSaved = current;
    fetch('/api/account/initiation/', {
      method: 'PUT',
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'x-csrf-token': cookie('punicodex_csrf') || '',
      },
      body: JSON.stringify({ currentChapter: current, completed: Boolean(completed) }),
    })
      .then(function (res) {
        if (!res.ok) throw new Error('progress_not_saved');
        return res.json();
      })
      .then(function (progress) {
        me.identity.initiation = progress;
      })
      .catch(function () {
        lastSaved = -1;
      });
  }

  function showGate() {
    stage.inert = true;
    stage.setAttribute('aria-hidden', 'true');
    gate.hidden = false;
  }

  function showExperience() {
    stage.inert = false;
    stage.removeAttribute('aria-hidden');
    gate.hidden = true;
    if (new URLSearchParams(location.search).get('resume') === '1') {
      var current = Number(me.identity.initiation.currentChapter) || 0;
      var scenes = Array.prototype.slice.call(stage.querySelectorAll('.arche-scene'));
      if (current > 0 && scenes[current]) {
        scenes[current].scrollIntoView({ block: 'start', behavior: 'instant' });
      }
    }
  }

  document.addEventListener('arche:scene', function (event) {
    save(event.detail.id, event.detail.index, event.detail.index === event.detail.total - 1);
  });

  fetch('/api/account/me/', { credentials: 'same-origin', headers: { Accept: 'application/json' } })
    .then(function (res) {
      if (!res.ok) throw new Error('account_required');
      return res.json();
    })
    .then(function (payload) {
      me = payload;
      showExperience();
    })
    .catch(showGate);
})();

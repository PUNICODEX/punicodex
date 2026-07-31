/**
 * Mythic Duel — The Sound of the Arena
 *
 * A zero-asset Web Audio engine: every effect is synthesized (oscillators,
 * filtered noise, gain envelopes) so the game ships no audio files and works
 * offline. The context is created lazily on the first user gesture (browser
 * autoplay policy) and a persisted mute wins over everything.
 *
 * Usage:
 *   Sound.setMuted(false); Sound.play('attack'); Sound.toggle();
 *
 * Events: select, cardPlay, attack, impact, heroHit, heal, draw, turn,
 *         victory, defeat, pack, ink, banner.
 */
(function (root, factory) {
  var lib = factory();
  if (typeof module === 'object' && module.exports) module.exports = lib;
  root.Sound = lib;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var ctx = null;
  var master = null;
  var muted = false;

  function ensure() {
    if (muted) return false;
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return true;
    }
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.32;
      master.connect(ctx.destination);
      return true;
    } catch (e) {
      return false;
    }
  }

  /* ── Primitives ────────────────────────────────────────────────────────── */

  function envGain(t0, attack, peak, decay, end) {
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(peak, t0 + attack);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, end || 0.0001), t0 + attack + decay);
    g.connect(master);
    return g;
  }

  function tone(type, freq, t0, dur, peak, freqEnd) {
    var o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (freqEnd) o.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), t0 + dur);
    var g = envGain(t0, 0.008, peak, dur);
    o.connect(g);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  }

  var noiseBuffer = null;
  function noise(t0, dur, peak, filterType, freq, freqEnd) {
    if (!noiseBuffer) {
      noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 1, ctx.sampleRate);
      var data = noiseBuffer.getChannelData(0);
      for (var i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    var src = ctx.createBufferSource();
    src.buffer = noiseBuffer;
    src.loop = true;
    var node = src;
    if (filterType) {
      var f = ctx.createBiquadFilter();
      f.type = filterType;
      f.frequency.setValueAtTime(freq, t0);
      if (freqEnd) f.frequency.exponentialRampToValueAtTime(Math.max(40, freqEnd), t0 + dur);
      src.connect(f);
      node = f;
    }
    var g = envGain(t0, 0.006, peak, dur);
    node.connect(g);
    src.start(t0);
    src.stop(t0 + dur + 0.05);
  }

  function chime(freqs, t0, step, dur, peak, type) {
    for (var i = 0; i < freqs.length; i++) {
      tone(type || 'sine', freqs[i], t0 + i * step, dur, peak);
    }
  }

  /* ── Recipes ───────────────────────────────────────────────────────────── */

  var RECIPES = {
    select: function (t) {
      tone('sine', 660, t, 0.05, 0.10);
    },
    cardPlay: function (t) {
      noise(t, 0.1, 0.16, 'lowpass', 420);
      tone('sine', 190, t, 0.12, 0.16, 120);
      tone('sine', 520, t + 0.03, 0.08, 0.05);
    },
    draw: function (t) {
      noise(t, 0.07, 0.08, 'highpass', 2400);
    },
    attack: function (t) {
      noise(t, 0.16, 0.14, 'bandpass', 900, 220);
    },
    impact: function (t) {
      tone('sine', 95, t, 0.14, 0.24, 55);
      noise(t, 0.09, 0.14, 'lowpass', 900);
    },
    heroHit: function (t) {
      tone('sine', 62, t, 0.32, 0.3, 38);
      tone('square', 120, t, 0.1, 0.06, 60);
      noise(t, 0.2, 0.12, 'lowpass', 500);
    },
    heal: function (t) {
      chime([523.25, 659.25, 783.99], t, 0.07, 0.22, 0.1);
    },
    turn: function (t) {
      tone('sine', 880, t, 0.1, 0.09);
      tone('sine', 1318.5, t + 0.08, 0.12, 0.06);
    },
    victory: function (t) {
      chime([523.25, 659.25, 783.99, 1046.5, 1318.5], t, 0.11, 0.34, 0.14, 'triangle');
      noise(t + 0.4, 0.5, 0.05, 'highpass', 5200);
    },
    defeat: function (t) {
      tone('sine', 220, t, 0.7, 0.18, 98);
      tone('sine', 165, t + 0.25, 0.6, 0.12, 82);
    },
    pack: function (t) {
      chime([783.99, 987.77, 1174.7, 1568], t, 0.06, 0.18, 0.09, 'triangle');
      noise(t, 0.3, 0.05, 'highpass', 6000);
    },
    ink: function (t) {
      tone('triangle', 1567.98, t, 0.06, 0.1);
      tone('triangle', 2093, t + 0.05, 0.07, 0.07);
    },
    banner: function (t) {
      tone('sine', 220, t, 0.5, 0.12);
      tone('sine', 330, t + 0.02, 0.45, 0.07);
    },
    special: function (t) {
      chime([392, 523.25, 659.25], t, 0.05, 0.22, 0.11, 'triangle');
      noise(t + 0.12, 0.16, 0.1, 'bandpass', 1400, 500);
    },

    /* ── Archetype attack voices: every god strikes in its own register ──── */
    atk_bolt: function (t) {
      noise(t, 0.05, 0.2, 'highpass', 3200);
      tone('sawtooth', 1200, t, 0.16, 0.14, 180);
      tone('sine', 90, t + 0.05, 0.2, 0.18, 55);
    },
    atk_blade: function (t) {
      noise(t, 0.06, 0.16, 'bandpass', 2600);
      tone('triangle', 1900, t + 0.02, 0.14, 0.08);
    },
    atk_flood: function (t) {
      noise(t, 0.3, 0.16, 'lowpass', 1200, 300);
      tone('sine', 130, t + 0.08, 0.24, 0.12, 70);
    },
    atk_flame: function (t) {
      noise(t, 0.22, 0.16, 'bandpass', 600, 1800);
      noise(t + 0.1, 0.08, 0.1, 'highpass', 2800);
    },
    atk_shadow: function (t) {
      tone('sine', 110, t, 0.34, 0.16, 70);
      noise(t, 0.3, 0.06, 'lowpass', 400);
    },
    atk_bloom: function (t) {
      chime([523.25, 587.33, 783.99], t, 0.06, 0.16, 0.07, 'triangle');
      tone('sine', 2093, t + 0.16, 0.07, 0.05, 1800);
    },
    atk_storm: function (t) {
      noise(t, 0.26, 0.13, 'bandpass', 500, 1600);
      tone('sine', 72, t + 0.14, 0.3, 0.2, 46);
    },
    atk_decay: function (t) {
      tone('sawtooth', 80, t, 0.4, 0.1, 60);
      tone('sawtooth', 84, t, 0.4, 0.1, 62);
      noise(t, 0.3, 0.06, 'lowpass', 300);
    },
    atk_radiance: function (t) {
      chime([1046.5, 1318.5, 1568, 2093], t, 0.05, 0.2, 0.08, 'sine');
      noise(t, 0.25, 0.04, 'highpass', 6400);
    },
    atk_song: function (t) {
      chime([659.25, 783.99, 987.77], t, 0.09, 0.24, 0.1, 'sine');
    },
    atk_quake: function (t) {
      tone('sine', 50, t, 0.42, 0.26, 34);
      noise(t, 0.3, 0.12, 'lowpass', 200);
    },
    atk_gale: function (t) {
      noise(t, 0.2, 0.12, 'bandpass', 900, 2600);
      noise(t + 0.18, 0.14, 0.08, 'bandpass', 2200, 800);
    },
    atk_veil: function (t) {
      tone('sine', 440, t, 0.3, 0.1, 880);
      chime([1174.7, 1568], t + 0.1, 0.09, 0.16, 0.05, 'sine');
    },
    atk_warhorn: function (t) {
      tone('sawtooth', 196, t, 0.34, 0.14);
      tone('sawtooth', 294, t, 0.34, 0.1);
      noise(t, 0.1, 0.06, 'lowpass', 900);
    },
  };

  return {
    play: function (name) {
      if (!RECIPES[name]) return;
      if (!ensure()) return;
      try {
        RECIPES[name](ctx.currentTime + 0.01);
      } catch (e) {
        /* sound must never break the duel */
      }
    },
    setMuted: function (m) {
      muted = !!m;
      if (master) master.gain.value = muted ? 0 : 0.32;
    },
    isMuted: function () {
      return muted;
    },
    toggle: function () {
      this.setMuted(!muted);
      return muted;
    },
    // Test seam: the recipe names, without audio hardware.
    RECIPES: RECIPES,
  };
});

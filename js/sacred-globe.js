(function () {
  'use strict';

  var TAU = Math.PI * 2;
  var DEG = Math.PI / 180;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function create(canvas, options) {
    if (!canvas || !canvas.getContext) return null;
    var ctx = canvas.getContext('2d');
    if (!ctx) return null;

    var sites = options.sites || [];
    var land = options.land || [];
    var tooltip = options.tooltip || null;
    var status = options.status || null;
    var controls = options.controls || null;
    var onSelect = typeof options.onSelect === 'function' ? options.onSelect : function () {};
    var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var state = {
      yaw: -24 * DEG,
      pitch: 18 * DEG,
      zoom: 1,
      targetZoom: 1,
      auto: false,
      selected: null,
      focused: null,
    };
    var width = 1;
    var height = 1;
    var dpr = 1;
    var clusters = [];
    var raf = null;
    var lastFrame = 0;
    var pointers = new Map();
    var drag = null;
    var pinch = null;
    var hovered = null;
    var tooltipPinned = false;

    function announce(text) {
      if (status) status.textContent = text;
    }

    function project(lat, lon) {
      var latitude = lat * DEG;
      var longitude = lon * DEG + state.yaw;
      var x = Math.cos(latitude) * Math.sin(longitude);
      var y = Math.sin(latitude);
      var z = Math.cos(latitude) * Math.cos(longitude);
      var tiltedY = y * Math.cos(state.pitch) - z * Math.sin(state.pitch);
      var depth = y * Math.sin(state.pitch) + z * Math.cos(state.pitch);
      var radius = Math.min(width, height) * 0.355 * state.zoom;
      return {
        x: width / 2 + x * radius,
        y: height / 2 - tiltedY * radius,
        z: depth,
        radius: radius,
      };
    }

    function geoLine(points, stroke, lineWidth) {
      var drawing = false;
      ctx.beginPath();
      for (var i = 0; i < points.length; i++) {
        var p = project(points[i][1], points[i][0]);
        if (p.z > 0.015) {
          if (!drawing) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
          drawing = true;
        } else {
          drawing = false;
        }
      }
      ctx.strokeStyle = stroke;
      ctx.lineWidth = lineWidth;
      ctx.stroke();
    }

    function drawBackground() {
      ctx.clearRect(0, 0, width, height);
      var glow = ctx.createRadialGradient(
        width / 2,
        height / 2,
        0,
        width / 2,
        height / 2,
        Math.min(width, height) * 0.52 * state.zoom
      );
      glow.addColorStop(0, 'rgba(28, 61, 82, 0.22)');
      glow.addColorStop(0.62, 'rgba(9, 20, 30, 0.08)');
      glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, width, height);

      for (var i = 0; i < 74; i++) {
        var x = ((i * 83) % 997) / 997 * width;
        var y = ((i * 47) % 991) / 991 * height;
        var alpha = 0.08 + (i % 5) * 0.025;
        ctx.fillStyle = 'rgba(220, 211, 178,' + alpha.toFixed(3) + ')';
        ctx.fillRect(x, y, i % 7 === 0 ? 1.4 : 0.8, i % 7 === 0 ? 1.4 : 0.8);
      }
    }

    function drawSphere() {
      var radius = Math.min(width, height) * 0.355 * state.zoom;
      var cx = width / 2;
      var cy = height / 2;
      ctx.save();
      ctx.shadowColor = 'rgba(65, 139, 181, 0.32)';
      ctx.shadowBlur = 42 * state.zoom;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, TAU);
      var ocean = ctx.createRadialGradient(
        cx - radius * 0.34,
        cy - radius * 0.4,
        radius * 0.06,
        cx,
        cy,
        radius * 1.08
      );
      ocean.addColorStop(0, '#1b455d');
      ocean.addColorStop(0.38, '#102f46');
      ocean.addColorStop(0.78, '#071827');
      ocean.addColorStop(1, '#02070e');
      ctx.fillStyle = ocean;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.clip();

      for (var lat = -60; lat <= 60; lat += 30) {
        var parallel = [];
        for (var lon = -180; lon <= 180; lon += 3) parallel.push([lon, lat]);
        geoLine(parallel, 'rgba(157, 193, 199, 0.105)', 0.65);
      }
      for (var meridian = -150; meridian <= 180; meridian += 30) {
        var line = [];
        for (var latitude = -87; latitude <= 87; latitude += 3) line.push([meridian, latitude]);
        geoLine(line, 'rgba(157, 193, 199, 0.105)', 0.65);
      }

      land.forEach(function (polygon) {
        var points = [];
        for (var i = 0; i < polygon.length - 1; i++) {
          var a = polygon[i];
          var b = polygon[i + 1];
          var steps = Math.max(1, Math.ceil((Math.abs(b[0] - a[0]) + Math.abs(b[1] - a[1])) / 4));
          for (var s = 0; s < steps; s++) {
            var t = s / steps;
            points.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
          }
        }
        points.push(polygon[polygon.length - 1]);
        var run = [];
        function flush() {
          if (run.length > 2) {
            ctx.beginPath();
            ctx.moveTo(run[0].x, run[0].y);
            for (var j = 1; j < run.length; j++) ctx.lineTo(run[j].x, run[j].y);
            ctx.closePath();
            ctx.fillStyle = 'rgba(138, 130, 94, 0.22)';
            ctx.fill();
            ctx.strokeStyle = 'rgba(204, 183, 112, 0.48)';
            ctx.lineWidth = 0.85;
            ctx.stroke();
          }
          run = [];
        }
        points.forEach(function (point) {
          var p = project(point[1], point[0]);
          if (p.z > 0.015) run.push(p);
          else flush();
        });
        flush();
      });

      var shade = ctx.createLinearGradient(0, 0, width, height);
      shade.addColorStop(0, 'rgba(255,255,255,0.055)');
      shade.addColorStop(0.46, 'rgba(255,255,255,0)');
      shade.addColorStop(1, 'rgba(0,0,0,0.32)');
      ctx.fillStyle = shade;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();

      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, TAU);
      ctx.strokeStyle = 'rgba(147, 190, 201, 0.32)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, radius + 4, 0, TAU);
      ctx.strokeStyle = 'rgba(212, 175, 55, 0.075)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    function buildClusters() {
      var projected = [];
      sites.forEach(function (site) {
        var p = project(site.lat, site.lon);
        if (p.z > 0.035) projected.push({ site: site, x: p.x, y: p.y, z: p.z });
      });
      projected.sort(function (a, b) {
        return b.z - a.z;
      });
      var threshold = state.zoom > 2.2 ? 13 : state.zoom > 1.45 ? 16 : 20;
      var groups = [];
      projected.forEach(function (point) {
        var group = null;
        for (var i = 0; i < groups.length; i++) {
          var dx = groups[i].x - point.x;
          var dy = groups[i].y - point.y;
          if (Math.sqrt(dx * dx + dy * dy) < threshold) {
            group = groups[i];
            break;
          }
        }
        if (!group) {
          group = { x: point.x, y: point.y, z: point.z, members: [] };
          groups.push(group);
        }
        group.members.push(point);
        var total = group.members.reduce(function (sum, member) {
          return sum + member.z;
        }, 0);
        group.x = group.members.reduce(function (sum, member) {
          return sum + member.x;
        }, 0) / group.members.length;
        group.y = group.members.reduce(function (sum, member) {
          return sum + member.y;
        }, 0) / group.members.length;
        group.z = total / group.members.length;
      });
      return groups;
    }

    function drawMarkers() {
      clusters = buildClusters();
      clusters.slice().sort(function (a, b) {
        return a.z - b.z;
      }).forEach(function (group) {
        var count = group.members.length;
        var selected = group.members.some(function (member) {
          return member.site.id === state.selected;
        });
        var focused = group === state.focused || group === hovered;
        var alpha = clamp(0.5 + group.z * 0.5, 0.42, 1);
        var radius = count > 1 ? Math.min(11, 6 + Math.sqrt(count) * 1.4) : 4.5;
        ctx.beginPath();
        ctx.arc(group.x, group.y, radius + (focused ? 5 : 3), 0, TAU);
        ctx.fillStyle = 'rgba(212, 175, 55,' + (focused ? 0.18 : 0.07) + ')';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(group.x, group.y, radius, 0, TAU);
        ctx.fillStyle = selected
          ? 'rgba(245, 241, 230,' + alpha + ')'
          : 'rgba(212, 175, 55,' + alpha + ')';
        ctx.fill();
        ctx.strokeStyle = selected ? '#f5f1e6' : 'rgba(255, 225, 133,' + alpha + ')';
        ctx.lineWidth = focused ? 1.8 : 0.8;
        ctx.stroke();
        if (count > 1) {
          ctx.fillStyle = '#071018';
          ctx.font = '600 ' + Math.min(11, radius + 2) + 'px Montserrat, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(String(count), group.x, group.y + 0.5);
        }
      });
    }

    function render() {
      drawBackground();
      drawSphere();
      drawMarkers();
      if (state.focused && clusters.indexOf(state.focused) === -1) state.focused = null;
    }

    function invalidate() {
      if (!raf) raf = requestAnimationFrame(tick);
    }

    function tick(time) {
      raf = null;
      var dt = Math.min(0.05, (time - lastFrame) / 1000 || 0.016);
      lastFrame = time;
      if (state.auto) {
        state.yaw += dt * 0.075;
        invalidate();
      }
      var difference = state.targetZoom - state.zoom;
      if (Math.abs(difference) > 0.001) {
        state.zoom += difference * (reducedMotion ? 1 : 0.16);
        invalidate();
      } else {
        state.zoom = state.targetZoom;
      }
      render();
    }

    function resize() {
      var rect = canvas.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      render();
    }

    function pointFromEvent(event) {
      var rect = canvas.getBoundingClientRect();
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    }

    function clusterAt(point) {
      var nearest = null;
      var distance = 22;
      clusters.forEach(function (group) {
        var dx = group.x - point.x;
        var dy = group.y - point.y;
        var current = Math.sqrt(dx * dx + dy * dy);
        if (current < distance) {
          nearest = group;
          distance = current;
        }
      });
      return nearest;
    }

    function tooltipHtml(group, pinned) {
      if (!group) return '';
      if (group.members.length === 1) {
        var site = group.members[0].site;
        return '<strong>' + escapeHtml(site.name) + '</strong><span>' + escapeHtml(site.place) + ' · ' + escapeHtml(site.country) + '</span><span>' + escapeHtml(site.era) + '</span>';
      }
      var html = '<strong>' + group.members.length + ' sacred sites</strong><span>Select a place to open its dossier.</span>';
      if (pinned) {
        group.members.forEach(function (member) {
          html += '<button type="button" data-globe-site="' + escapeHtml(member.site.id) + '">' + escapeHtml(member.site.name) + '<span>' + escapeHtml(member.site.country) + '</span></button>';
        });
      }
      return html;
    }

    function showTooltip(group, pinned) {
      if (!tooltip || !group) return;
      tooltipPinned = Boolean(pinned);
      tooltip.innerHTML = tooltipHtml(group, pinned);
      tooltip.hidden = false;
      var maxLeft = Math.max(12, width - Math.min(260, width - 24) - 12);
      var left = clamp(group.x + 16, 12, maxLeft);
      var top = clamp(group.y - 18, 12, Math.max(12, height - 190));
      tooltip.style.left = left + 'px';
      tooltip.style.top = top + 'px';
    }

    function hideTooltip(force) {
      if (!tooltip || (tooltipPinned && !force)) return;
      tooltip.hidden = true;
      tooltipPinned = false;
    }

    function focusCluster(group) {
      var lat = group.members.reduce(function (sum, member) {
        return sum + member.site.lat;
      }, 0) / group.members.length;
      var lon = group.members.reduce(function (sum, member) {
        return sum + member.site.lon;
      }, 0) / group.members.length;
      var targetYaw = -lon * DEG;
      var difference = Math.atan2(Math.sin(targetYaw - state.yaw), Math.cos(targetYaw - state.yaw));
      state.yaw += difference * (reducedMotion ? 1 : 0.45);
      state.pitch = lat * DEG * 0.65;
      state.targetZoom = clamp(Math.max(state.targetZoom, 1.9), 0.8, 3.2);
      state.focused = group;
      invalidate();
    }

    function activateCluster(group) {
      if (!group) return;
      state.focused = group;
      if (group.members.length === 1) {
        var site = group.members[0].site;
        state.selected = site.id;
        hideTooltip(true);
        announce(site.name + ' · ' + site.country + ' — dossier opened');
        onSelect(site.id);
      } else {
        focusCluster(group);
        showTooltip(group, true);
        announce(group.members.length + ' sacred sites clustered — choose a dossier or zoom closer');
      }
      render();
    }

    function setZoom(value) {
      state.targetZoom = clamp(value, 0.78, 3.2);
      hideTooltip(true);
      invalidate();
    }

    function setAuto(value) {
      if (state.auto === Boolean(value)) return;
      state.auto = Boolean(value);
      var button = controls && controls.querySelector('[data-globe-action="rotate"]');
      if (button) button.setAttribute('aria-pressed', String(state.auto));
      announce(state.auto ? 'The globe is turning · drag to take control' : 'Rotation paused');
      if (state.auto) invalidate();
      else render();
    }

    function reset() {
      state.yaw = -24 * DEG;
      state.pitch = 18 * DEG;
      state.targetZoom = 1;
      state.selected = null;
      state.focused = null;
      setAuto(false);
      hideTooltip(true);
      announce('View reset · drag to rotate · scroll or pinch to zoom');
      invalidate();
    }

    function focusNext() {
      if (!clusters.length) return;
      var index = Math.max(-1, clusters.indexOf(state.focused));
      state.focused = clusters[(index + 1) % clusters.length];
      showTooltip(state.focused, false);
      announce(state.focused.members.length === 1
        ? state.focused.members[0].site.name + ' · press Enter to open'
        : state.focused.members.length + ' sites · press Enter to expand');
    }

    canvas.addEventListener('pointerdown', function (event) {
      canvas.focus();
      pointers.set(event.pointerId, pointFromEvent(event));
      canvas.setPointerCapture(event.pointerId);
      hideTooltip(true);
      if (pointers.size === 1) {
        drag = { x: event.clientX, y: event.clientY, moved: 0, yaw: state.yaw, pitch: state.pitch };
        pinch = null;
      } else if (pointers.size === 2) {
        var values = Array.from(pointers.values());
        pinch = { distance: Math.hypot(values[0].x - values[1].x, values[0].y - values[1].y), zoom: state.targetZoom };
        drag = null;
      }
    });

    canvas.addEventListener('pointermove', function (event) {
      var point = pointFromEvent(event);
      if (pointers.has(event.pointerId)) pointers.set(event.pointerId, point);
      if (pinch && pointers.size >= 2) {
        var values = Array.from(pointers.values());
        var distance = Math.max(10, Math.hypot(values[0].x - values[1].x, values[0].y - values[1].y));
        setZoom(pinch.zoom * distance / Math.max(10, pinch.distance));
        return;
      }
      if (drag && pointers.has(event.pointerId)) {
        var dx = event.clientX - drag.x;
        var dy = event.clientY - drag.y;
        drag.moved = Math.max(drag.moved, Math.hypot(dx, dy));
        state.yaw = drag.yaw + dx * 0.0045 / state.zoom;
        state.pitch = clamp(drag.pitch - dy * 0.0035 / state.zoom, -1.05, 1.05);
        setAuto(false);
        render();
        return;
      }
      if (event.pointerType !== 'touch') {
        hovered = clusterAt(point);
        canvas.style.cursor = hovered ? 'pointer' : 'grab';
        if (hovered) showTooltip(hovered, false);
        else hideTooltip(false);
      }
    });

    function pointerEnd(event) {
      var point = pointFromEvent(event);
      var wasDrag = drag;
      pointers.delete(event.pointerId);
      if (wasDrag && wasDrag.moved < 7 && pointers.size === 0) activateCluster(clusterAt(point));
      if (pointers.size === 0) {
        drag = null;
        pinch = null;
      } else if (pointers.size === 1) {
        var remaining = Array.from(pointers.values())[0];
        drag = { x: remaining.x, y: remaining.y, moved: 8, yaw: state.yaw, pitch: state.pitch };
        pinch = null;
      }
    }

    canvas.addEventListener('pointerup', pointerEnd);
    canvas.addEventListener('pointercancel', pointerEnd);
    canvas.addEventListener('pointerleave', function () {
      if (!drag) {
        hovered = null;
        hideTooltip(false);
      }
    });
    canvas.addEventListener('wheel', function (event) {
      event.preventDefault();
      setZoom(state.targetZoom * Math.exp(-event.deltaY * 0.0011));
    }, { passive: false });

    canvas.addEventListener('keydown', function (event) {
      var handled = true;
      if (event.key === 'ArrowLeft') state.yaw -= 0.09;
      else if (event.key === 'ArrowRight') state.yaw += 0.09;
      else if (event.key === 'ArrowUp') state.pitch = clamp(state.pitch + 0.07, -1.05, 1.05);
      else if (event.key === 'ArrowDown') state.pitch = clamp(state.pitch - 0.07, -1.05, 1.05);
      else if (event.key === '+' || event.key === '=') setZoom(state.targetZoom + 0.18);
      else if (event.key === '-' || event.key === '_') setZoom(state.targetZoom - 0.18);
      else if (event.key === 'Home') reset();
      else if (event.key === 'Enter') activateCluster(state.focused || clusters[0]);
      else if (event.key === 'Tab') focusNext();
      else handled = false;
      if (handled) {
        event.preventDefault();
        render();
      }
    });

    if (controls) {
      controls.addEventListener('click', function (event) {
        var button = event.target.closest('[data-globe-action]');
        if (!button) return;
        var action = button.getAttribute('data-globe-action');
        if (action === 'zoom-in') setZoom(state.targetZoom + 0.22);
        else if (action === 'zoom-out') setZoom(state.targetZoom - 0.22);
        else if (action === 'reset') reset();
        else if (action === 'rotate') setAuto(!state.auto);
      });
    }

    if (tooltip) {
      tooltip.addEventListener('click', function (event) {
        var button = event.target.closest('[data-globe-site]');
        if (!button) return;
        var site = sites.find(function (item) {
          return item.id === button.getAttribute('data-globe-site');
        });
        if (!site) return;
        state.selected = site.id;
        hideTooltip(true);
        announce(site.name + ' · ' + site.country + ' — dossier opened');
        onSelect(site.id);
        render();
      });
      document.addEventListener('pointerdown', function (event) {
        if (tooltipPinned && !tooltip.contains(event.target) && event.target !== canvas) hideTooltip(true);
      });
    }

    if (window.ResizeObserver) new ResizeObserver(resize).observe(canvas);
    else window.addEventListener('resize', resize);
    resize();

    var api = {
      reset: reset,
      zoomIn: function () { setZoom(state.targetZoom + 0.22); },
      zoomOut: function () { setZoom(state.targetZoom - 0.22); },
      toggleRotate: function () { setAuto(!state.auto); },
      focusNext: focusNext,
      getState: function () {
        return {
          siteCount: sites.length,
          visibleClusters: clusters.length,
          visibleSites: clusters.reduce(function (sum, group) {
            return sum + group.members.length;
          }, 0),
          zoom: state.zoom,
          targetZoom: state.targetZoom,
          auto: state.auto,
          selected: state.selected,
        };
      },
    };
    canvas.sacredGlobe = api;
    return api;
  }

  window.SacredGlobe = { create: create };
})();

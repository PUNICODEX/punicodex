/**
 * PuniCodex — client-side creative normalizer.
 *
 * Turns any sane sponsor image into the slot's exact frame before upload:
 * center-crops to the slot aspect ratio and scales to 2× the slot
 * dimensions (retina), EXIF-agnostic (the browser applies orientation on
 * draw). This is the payload optimization — it keeps uploads small and makes
 * the preview honest ("this is exactly what will run"). The server
 * re-normalizes regardless (platform/api/booking-upload.js), so the two
 * always agree.
 *
 * Dual-exported: window.CreativeNormalize in the browser, module.exports in
 * Node tests.
 */
(function () {
  'use strict';

  const MAX_BYTES = 20 * 1024 * 1024; // refuse absurd inputs before decoding

  function loadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Could not read this image file'));
      img.src = url;
    });
  }

  /**
   * @param {File|Blob} file — the sponsor's chosen image
   * @param {number} slotW — slot width in px (e.g. 1200)
   * @param {number} slotH — slot height in px (e.g. 400)
   * @returns {Promise<{dataUrl:string,width:number,height:number,cropped:boolean,tooSmall:boolean,originalWidth:number,originalHeight:number}>}
   */
  async function normalizeCreative(file, slotW, slotH) {
    if (!file || !slotW || !slotH) throw new Error('Missing file or slot dimensions');
    if (file.size > MAX_BYTES) {
      throw new Error('This file is over 20MB — export a smaller copy and try again');
    }
    const url = URL.createObjectURL(file);
    try {
      const img = await loadImage(url);
      const natW = img.naturalWidth;
      const natH = img.naturalHeight;
      const slotRatio = slotW / slotH;
      const imgRatio = natW / natH;

      // Cover-crop rectangle in source space (centered).
      let sw = natW;
      let sh = natH;
      if (imgRatio > slotRatio) sw = Math.round(natH * slotRatio);
      else sh = Math.round(natW / slotRatio);
      const sx = Math.round((natW - sw) / 2);
      const sy = Math.round((natH - sh) / 2);
      const cropped = sw !== natW || sh !== natH;

      // Target: 2× slot for retina, capped at the crop's natural size unless
      // the source is smaller than the slot itself (then upscale to slot
      // size and flag it — soft images deserve a warning, not a rejection).
      let tw = Math.min(sw, slotW * 2);
      let th = Math.min(sh, slotH * 2);
      let tooSmall = false;
      if (sw < slotW || sh < slotH) {
        tw = slotW;
        th = slotH;
        tooSmall = true;
      }

      const canvas = document.createElement('canvas');
      canvas.width = tw;
      canvas.height = th;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, tw, th);

      let dataUrl = '';
      try {
        dataUrl = canvas.toDataURL('image/webp', 0.92);
        if (!dataUrl.startsWith('data:image/webp')) dataUrl = '';
      } catch {
        dataUrl = '';
      }
      if (!dataUrl) dataUrl = canvas.toDataURL('image/jpeg', 0.92);

      return {
        dataUrl,
        width: tw,
        height: th,
        cropped,
        tooSmall,
        originalWidth: natW,
        originalHeight: natH,
      };
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  const api = { normalizeCreative };
  if (typeof window !== 'undefined') window.CreativeNormalize = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();

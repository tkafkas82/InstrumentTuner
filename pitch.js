// McLeod Pitch Method (NSDF) — robust for plucked strings with strong harmonics.
(function (g) {
  'use strict';

  function create(sampleRate, size, minFreq, maxFreq) {
    minFreq = minFreq || 60;
    maxFreq = maxFreq || 1200;
    const maxTau = Math.min(Math.ceil(sampleRate / minFreq), size >> 1);
    const minTau = Math.max(2, Math.floor(sampleRate / maxFreq));
    const W = size - maxTau;
    const x = new Float32Array(size);
    const sq = new Float64Array(size + 1); // prefix sums of x^2
    const nsdf = new Float32Array(maxTau + 1);

    return function detect(buf) {
      const n = Math.min(buf.length, size);
      let mean = 0;
      for (let i = 0; i < n; i++) mean += buf[i];
      mean /= n;
      let energy = 0;
      for (let i = 0; i < n; i++) {
        const v = buf[i] - mean;
        x[i] = v;
        energy += v * v;
        sq[i + 1] = sq[i] + v * v;
      }
      const rms = Math.sqrt(energy / n);
      if (rms < 0.004) return null;

      const e0 = sq[W];
      for (let tau = 0; tau <= maxTau; tau++) {
        let acf = 0;
        for (let i = 0; i < W; i++) acf += x[i] * x[i + tau];
        const m = e0 + (sq[W + tau] - sq[tau]);
        nsdf[tau] = m > 0 ? (2 * acf) / m : 0;
      }

      // Key maxima: the highest point of each positive region after the first zero crossing.
      const peaks = [];
      let t = 1;
      while (t < maxTau && nsdf[t] > 0) t++;
      let best = -1, bestVal = 0;
      for (; t < maxTau; t++) {
        if (nsdf[t] > 0) {
          if (nsdf[t] > bestVal) { bestVal = nsdf[t]; best = t; }
        } else if (best >= 0) {
          peaks.push(best);
          best = -1; bestVal = 0;
        }
      }
      if (best >= 0 && best < maxTau - 1) peaks.push(best);
      const valid = peaks.filter(p => p >= minTau);
      if (!valid.length) return null;

      let top = 0;
      for (const p of valid) if (nsdf[p] > top) top = nsdf[p];
      const threshold = 0.9 * top;
      const p = valid.find(p => nsdf[p] >= threshold);

      const a = nsdf[p - 1], b = nsdf[p], c = nsdf[p + 1];
      const denom = a - 2 * b + c;
      const shift = denom !== 0 ? (a - c) / (2 * denom) : 0;
      const period = p + shift;
      return { freq: sampleRate / period, clarity: b, rms };
    };
  }

  g.PitchDetector = { create };
})(typeof window !== 'undefined' ? window : globalThis);

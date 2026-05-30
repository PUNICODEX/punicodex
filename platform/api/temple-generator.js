function generateTemple(entry) {
  const breakdownRows = (entry.breakdown || [])
    .map(b => `<tr><td>${b.char}</td><td>${b.to}</td><td>${b.type}</td><td>${b.note}</td></tr>`)
    .join('');

  const tierClass = entry.tier === 'dual' ? 'tier-dual' : entry.tier === '1' ? 'tier-1' : 'tier-2';
  const tierLabel = entry.tier === 'dual' ? 'Dual-Tier' : `Tier ${entry.tier}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${entry.unicode} — PUNYCODEX</title>
  <style>
    :root {
      --bg: #0a0a0f;
      --surface: #12121a;
      --text: #e8e6f0;
      --text-dim: #8a87a0;
      --accent: #c9a96e;
      --border: #2a2a3a;
      --tier-dual: #c9a96e;
      --tier-1: #7ec9a0;
      --tier-2: #87aee8;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', system-ui, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.6;
      min-height: 100vh;
    }
    .container { max-width: 800px; margin: 0 auto; padding: 2rem 1rem; }
    header {
      text-align: center;
      padding: 3rem 1rem;
      border-bottom: 1px solid var(--border);
      margin-bottom: 2rem;
    }
    .logo {
      font-size: 0.8rem;
      letter-spacing: 0.3em;
      color: var(--accent);
      text-transform: uppercase;
      margin-bottom: 1rem;
    }
    .unicode-name {
      font-size: 3rem;
      font-weight: 800;
      margin-bottom: 0.5rem;
    }
    .greek-name {
      font-size: 1.5rem;
      color: var(--text-dim);
      font-family: 'Georgia', serif;
    }
    .meta {
      display: flex;
      justify-content: center;
      gap: 1rem;
      margin-top: 1.5rem;
      flex-wrap: wrap;
    }
    .badge {
      padding: 0.3rem 0.8rem;
      border-radius: 6px;
      font-size: 0.8rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .tier-dual { background: rgba(201,169,110,0.15); color: var(--tier-dual); }
    .tier-1 { background: rgba(126,201,160,0.15); color: var(--tier-1); }
    .tier-2 { background: rgba(135,174,232,0.15); color: var(--tier-2); }
    .pantheon-badge { background: var(--surface); color: var(--text-dim); border: 1px solid var(--border); }
    .section {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
    }
    .section h2 {
      font-size: 1.1rem;
      color: var(--accent);
      margin-bottom: 1rem;
      text-transform: uppercase;
      letter-spacing: 0.1em;
    }
    .meaning { font-size: 1.1rem; line-height: 1.8; }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th, td {
      padding: 0.75rem;
      text-align: left;
      border-bottom: 1px solid var(--border);
    }
    th {
      color: var(--accent);
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    td { color: var(--text-dim); }
    .footer {
      text-align: center;
      padding: 3rem 1rem;
      color: var(--text-dim);
      font-size: 0.8rem;
      border-top: 1px solid var(--border);
      margin-top: 2rem;
    }
    .footer a { color: var(--accent); text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="logo">PUNYCODEX</div>
      <div class="unicode-name">${entry.unicode}</div>
      <div class="greek-name">${entry.greek || ''}</div>
      <div class="meta">
        <span class="badge ${tierClass}">${tierLabel}</span>
        <span class="badge pantheon-badge">${entry.pantheon}</span>
        ${entry.domain ? `<span class="badge pantheon-badge">${entry.domain}</span>` : ''}
      </div>
    </header>

    <div class="section">
      <h2>Etymology & Meaning</h2>
      <div class="meaning">${entry.meaning || 'Meaning under scholarly review.'}</div>
    </div>

    <div class="section">
      <h2>Character Breakdown</h2>
      <table>
        <thead>
          <tr><th>ASCII</th><th>Unicode</th><th>Type</th><th>Note</th></tr>
        </thead>
        <tbody>
          ${breakdownRows || '<tr><td colspan="4">No breakdown available.</td></tr>'}
        </tbody>
      </table>
    </div>

    <div class="section">
      <h2>Scholarly Sources</h2>
      <div class="meaning">
        ${entry.sources ? JSON.parse(entry.sources).join(', ') : 'Sources being compiled.'}
      </div>
    </div>
  </div>

  <div class="footer">
    <p>Restored by <a href="https://punycodex.com">PUNYCODEX</a> — The Unicode Domain Authority</p>
    <p style="margin-top:0.5rem;">ASCII fallback: ${entry.ascii}.com</p>
  </div>
</body>
</html>`;
}

module.exports = { generateTemple };

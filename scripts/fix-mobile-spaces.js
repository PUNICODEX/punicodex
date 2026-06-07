const fs = require('fs');

const sites = ['nike', 'hermes', 'ra'];

const oldBlock = `@media (max-width: 768px) {
    .spaces-layout {
        gap: 2rem;
    }
    .space-row {
        flex-direction: column;
        gap: 2rem;
    }
    .space-row--sidebar .space-slot--narrow {
        max-width: 100%;
    }
    .space-row--sidebar .space-frame--column {
        max-height: 240px;
    }
    .space-row--halves > .space-slot,
    .space-row--triple > .space-slot,
    .space-row--quad > .space-slot {
        flex: 1 1 100%;
    }
    .space-frame--hero,
    .space-frame--throne {
        max-height: 200px;
    }
    .space-frame--inline {
        max-height: 180px;
    }
    .space-frame--content,
    .space-frame--half {
        max-height: 180px;
    }
    .space-footer {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.6rem;
    }
    .space-reserve {
        width: 100%;
        text-align: center;
    }
    .space-meta {
        flex-wrap: wrap;
    }
    .space-exclusive {
        margin-left: 0;
    }
}`;

const newBlock = `@media (max-width: 768px) {
    .spaces-layout {
        gap: 1rem;
    }
    .space-row {
        gap: 0.5rem;
    }
    .space-slot {
        gap: 0.35rem;
    }
    .space-row--sidebar {
        flex-direction: row;
    }
    .space-row--sidebar .space-slot--narrow {
        width: 80px;
        max-width: none;
    }
    .space-row--sidebar .space-frame--column {
        max-height: none;
        aspect-ratio: 300 / 600;
    }
    .space-row--halves,
    .space-row--triple,
    .space-row--quad {
        flex-wrap: nowrap;
    }
    .space-row--halves > .space-slot,
    .space-row--triple > .space-slot,
    .space-row--quad > .space-slot {
        flex: 1 1 auto;
        min-width: 0;
    }
    .space-row--quad > .space-slot:nth-child(3) {
        flex: 2.5;
    }
    .space-frame--hero,
    .space-frame--throne {
        max-height: none;
    }
    .space-frame--inline {
        max-height: none;
    }
    .space-frame--content,
    .space-frame--half {
        max-height: none;
    }
    .space-footer {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.4rem;
    }
    .space-reserve {
        width: 100%;
        text-align: center;
        font-size: 0.65rem;
        padding: 0.5rem 0.75rem;
    }
    .space-meta {
        flex-wrap: wrap;
        gap: 0.25rem;
    }
    .space-num {
        font-size: 0.6rem;
    }
    .space-name {
        font-size: 0.65rem;
    }
    .space-price {
        font-size: 0.6rem;
    }
    .space-exclusive {
        margin-left: 0;
        font-size: 0.5rem;
    }
}`;

for (const site of sites) {
  const file = `sites/${site}/styles.css`;
  let content = fs.readFileSync(file, 'utf8');
  if (!content.includes(oldBlock)) {
    console.log(`WARNING: old block not found in ${file}`);
    continue;
  }
  content = content.split(oldBlock).join(newBlock);
  fs.writeFileSync(file, content, 'utf8');
  console.log(`Updated ${file}`);
}

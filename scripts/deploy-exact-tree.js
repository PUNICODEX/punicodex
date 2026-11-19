#!/usr/bin/env node
'use strict';

const { execFileSync, spawn } = require('node:child_process');
const crypto = require('node:crypto');

const EMPTY_TREE = '4b825dc642cb6eb9a060e54bf8d69288fbee4904';
const REPO = 'PUNICODEX/punicodex';
const expectedHead = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const baseHead = execFileSync('git', ['rev-parse', 'origin/master'], { encoding: 'utf8' }).trim();
const uploadBase = process.env.RELEASE_UPLOAD_BASE || baseHead;
const commits = execFileSync('git', ['rev-list', '--reverse', `${uploadBase}..${expectedHead}`], {
  encoding: 'utf8',
})
  .trim()
  .split('\n')
  .filter(Boolean);
const resumeContentTrees = Number(process.env.RESUME_CONTENT_TREES || 575);
const reuseLargeBlobs = Number(process.env.REUSE_LARGE_BLOBS || 1025);
const fields = Object.fromEntries(
  execFileSync('git', ['credential', 'fill'], {
    input: 'protocol=https\nhost=github.com\n\n',
    encoding: 'utf8',
  })
    .trim()
    .split('\n')
    .map((line) => {
      const index = line.indexOf('=');
      return [line.slice(0, index), line.slice(index + 1)];
    })
);
if (!fields.password) throw new Error('No GitHub credential found');

const headers = {
  Authorization: `Bearer ${fields.password}`,
  Accept: 'application/vnd.github+json',
  'User-Agent': 'punicodex-exact-tree-release',
  'X-GitHub-Api-Version': '2022-11-28',
};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function api(path, method = 'GET', payload) {
  let lastError;
  for (let attempt = 1; attempt <= 7; attempt++) {
    try {
      const response = await fetch(`https://api.github.com${path}`, {
        method,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: payload === undefined ? undefined : JSON.stringify(payload),
      });
      const text = await response.text();
      const data = text ? JSON.parse(text) : null;
      if (!response.ok) {
        const error = new Error(
          `${method} ${path}: ${response.status} ${data?.message || text.slice(0, 200)}`
        );
        error.status = response.status;
        throw error;
      }
      return data;
    } catch (error) {
      lastError = error;
      if (error.status && ![401, 408, 429, 500, 502, 503, 504].includes(error.status)) {
        throw error;
      }
      if (error.status === 401) {
        const refreshed = Object.fromEntries(
          execFileSync('git', ['credential', 'fill'], {
            input: 'protocol=https\nhost=github.com\n\n',
            encoding: 'utf8',
          })
            .trim()
            .split('\n')
            .map((line) => {
              const index = line.indexOf('=');
              return [line.slice(0, index), line.slice(index + 1)];
            })
        );
        if (refreshed.password) {
          const changed = refreshed.password !== fields.password;
          fields.password = refreshed.password;
          headers.Authorization = `Bearer ${refreshed.password}`;
          console.log(changed ? 'GitHub credential refreshed' : 'GitHub credential revalidated');
        }
      }
      console.log(`API retry ${attempt}/7: ${error.message}`);
      await sleep(Math.min(30000, attempt * 4000));
    }
  }
  throw lastError;
}

const cat = spawn('git', ['cat-file', '--batch'], { stdio: ['pipe', 'pipe', 'inherit'] });
let catBuffer = Buffer.alloc(0);
let catCurrent = null;
let catSize = null;
const catQueue = [];

function nextCat() {
  catCurrent = catQueue.shift() || null;
  if (catCurrent) cat.stdin.write(`${catCurrent.sha}\n`);
}

function drainCat() {
  if (!catCurrent) return;
  if (catSize === null) {
    const index = catBuffer.indexOf(10);
    if (index < 0) return;
    const header = catBuffer.subarray(0, index).toString();
    catBuffer = catBuffer.subarray(index + 1);
    const match = header.match(/^([0-9a-f]+) blob (\d+)$/);
    if (!match) {
      catCurrent.reject(new Error(`Unexpected cat-file header: ${header}`));
      catCurrent = null;
      nextCat();
      return;
    }
    catSize = Number(match[2]);
  }
  if (catBuffer.length < catSize + 1) return;
  const bytes = catBuffer.subarray(0, catSize);
  catBuffer = catBuffer.subarray(catSize + 1);
  const current = catCurrent;
  catCurrent = null;
  catSize = null;
  current.resolve(bytes);
  nextCat();
  drainCat();
}

cat.stdout.on('data', (chunk) => {
  catBuffer = Buffer.concat([catBuffer, chunk]);
  drainCat();
});

function getBlob(sha) {
  return new Promise((resolve, reject) => {
    catQueue.push({ sha, resolve, reject });
    if (!catCurrent) nextCat();
  });
}

async function createBlob(bytes) {
  const expected = crypto
    .createHash('sha1')
    .update(`blob ${bytes.length}\0`)
    .update(bytes)
    .digest('hex');
  const result = await api(`/repos/${REPO}/git/blobs`, 'POST', {
    content: bytes.toString('base64'),
    encoding: 'base64',
  });
  if (result.sha !== expected) {
    throw new Error(`Blob mismatch: expected ${expected}, got ${result.sha}`);
  }
  return result.sha;
}

async function createCompactTree(baseTree, entries) {
  try {
    return await api(`/repos/${REPO}/git/trees`, 'POST', {
      base_tree: baseTree,
      tree: entries,
    });
  } catch (error) {
    if (![400, 422].includes(error.status) || entries.length <= 1) throw error;
    const middle = Math.ceil(entries.length / 2);
    const left = await createCompactTree(baseTree, entries.slice(0, middle));
    return createCompactTree(left.sha, entries.slice(middle));
  }
}

async function main() {
  const probe = execFileSync('git', ['ls-tree', 'HEAD', 'account/index.html'], {
    encoding: 'utf8',
  })
    .split(' ')[2]
    .split('\t')[0];
  for (let index = 0; index < 3; index++) await getBlob(probe);
  console.log('Sequential blob reader verified');

  const remote = await api(`/repos/${REPO}/commits/master`);
  if (remote.sha !== baseHead) {
    throw new Error(`Remote moved: expected ${baseHead}, found ${remote.sha}`);
  }
  console.log(`Uploading ${commits.length} exact commits from ${baseHead} to ${expectedHead}`);
  console.log(`Resuming after ${resumeContentTrees} content trees and reusing ${reuseLargeBlobs} large blobs`);

  let blobUploads = 0;
  let contentBatches = 0;
  let skippedExisting = 0;
  let individualFallbacks = 0;
  const commitMap = new Map();
  let uploadedHead = null;

  for (const commit of commits) {
    const raw = execFileSync(
      'git',
      [
        'show',
        '-s',
        '--format=%T%x00%P%x00%an%x00%ae%x00%aI%x00%cn%x00%ce%x00%cI%x00%B',
        commit,
      ],
      { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }
    );
    const [
      expectedTree,
      parentField,
      authorName,
      authorEmail,
      authorDate,
      committerName,
      committerEmail,
      committerDate,
      message,
    ] = raw.split('\0');
    const parents = parentField
      .split(' ')
      .filter(Boolean)
      .map((parent) => commitMap.get(parent) || parent);
    const diffBase = parentField.split(' ').filter(Boolean).at(-1);
    const parentTree = execFileSync('git', ['rev-parse', `${diffBase}^{tree}`], {
      encoding: 'utf8',
    }).trim();
    const listing = execFileSync('git', ['ls-tree', '-r', '-z', commit], {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    });
    const objects = new Map();
    for (const record of listing.split('\0').filter(Boolean)) {
      const tab = record.indexOf('\t');
      const meta = record.slice(0, tab).split(' ');
      objects.set(record.slice(tab + 1), { mode: meta[0], sha: meta[2] });
    }
    const diff = execFileSync(
      'git',
      ['diff-tree', '--no-commit-id', '--name-status', '-r', '-z', diffBase, commit],
      { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }
    ).split('\0');
    const changes = [];
    for (let index = 0; index < diff.length - 1; index += 2) {
      changes.push({ status: diff[index], path: diff[index + 1] });
    }
    console.log(`\n${commit.slice(0, 8)}: ${changes.length} changed paths`);

    let currentTree = parentTree;
    let contentBatch = [];
    let contentBytes = 0;
    const finalEntries = [];
    let existingToSkip = commit === commits[0] ? reuseLargeBlobs : 0;

    async function flushContent() {
      if (!contentBatch.length) return;
      contentBatches++;
      if (commit === commits[0] && contentBatches <= resumeContentTrees) {
        contentBatch = [];
        contentBytes = 0;
        return;
      }
      try {
        await api(`/repos/${REPO}/git/trees`, 'POST', {
          base_tree: EMPTY_TREE,
          tree: contentBatch,
        });
      } catch (error) {
        if (error.status !== 400) throw error;
        console.log(
          `  content batch ${contentBatches} rejected; uploading ${contentBatch.length} files individually`
        );
        for (const entry of contentBatch) {
          await createBlob(Buffer.from(entry.content, 'utf8'));
          individualFallbacks++;
        }
      }
      if (contentBatches % 25 === 0) {
        console.log(`  ${contentBatches} content batches accounted for`);
      }
      contentBatch = [];
      contentBytes = 0;
    }

    for (const change of changes) {
      if (change.status === 'D') {
        finalEntries.push({ path: change.path, mode: '100644', type: 'blob', sha: null });
        continue;
      }
      const object = objects.get(change.path);
      if (!object) throw new Error(`Missing ${change.path} in ${commit}`);
      const bytes = await getBlob(object.sha);
      if (bytes.length <= 200000 && !bytes.includes(0)) {
        const entry = {
          path: change.path,
          mode: object.mode,
          type: 'blob',
          content: bytes.toString('utf8'),
        };
        const size = JSON.stringify(entry).length;
        if (contentBatch.length && (contentBatch.length >= 10 || contentBytes + size > 500 * 1024)) {
          await flushContent();
        }
        contentBatch.push(entry);
        contentBytes += size;
      } else if (existingToSkip > 0) {
        existingToSkip--;
        skippedExisting++;
      } else {
        await createBlob(bytes);
        blobUploads++;
        if (blobUploads % 25 === 0) {
          console.log(`  ${blobUploads} additional large blobs verified`);
        }
      }
      finalEntries.push({ path: change.path, mode: object.mode, type: 'blob', sha: object.sha });
    }
    await flushContent();
    if (existingToSkip !== 0) {
      throw new Error(`Existing-blob resume count mismatch: ${existingToSkip} unaccounted`);
    }

    const groups = new Map();
    for (const entry of finalEntries) {
      const root = entry.path.split('/')[0];
      if (!groups.has(root)) groups.set(root, []);
      groups.get(root).push(entry);
    }
    let rootBatches = 0;
    for (const entries of groups.values()) {
      for (let offset = 0; offset < entries.length; offset += 100) {
        const result = await createCompactTree(currentTree, entries.slice(offset, offset + 100));
        currentTree = result.sha;
        rootBatches++;
      }
    }
    console.log(`  ${rootBatches} compact SHA-only tree batches completed`);
    if (currentTree !== expectedTree) {
      throw new Error(`Tree mismatch for ${commit}: expected ${expectedTree}, got ${currentTree}`);
    }
    const created = await api(`/repos/${REPO}/git/commits`, 'POST', {
      message,
      tree: currentTree,
      parents,
      author: { name: authorName, email: authorEmail, date: authorDate },
      committer: { name: committerName, email: committerEmail, date: committerDate },
    });
    commitMap.set(commit, created.sha);
    uploadedHead = created.sha;
    console.log(`  exact tree verified: ${created.sha}${created.sha === commit ? '' : ` (uploaded SHA for ${commit})`}`);
  }

  await api(`/repos/${REPO}/git/refs/heads/master`, 'PATCH', {
    sha: uploadedHead,
    force: false,
  });
  console.log(
    `\nMaster fast-forwarded to ${uploadedHead}; ${blobUploads} new large blobs, ${individualFallbacks} individual fallbacks, ${skippedExisting} reused.`
  );
  cat.kill();
}

main().catch((error) => {
  cat.kill();
  console.error(`\nExact-tree API release stopped WITHOUT a forced update: ${error.message}`);
  process.exit(1);
});

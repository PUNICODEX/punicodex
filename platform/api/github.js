async function createRepo({ name, description, token }) {
  const authToken = token || process.env.GITHUB_TOKEN;
  if (!authToken) {
    throw new Error('GITHUB_TOKEN not configured');
  }

  const resp = await fetch('https://api.github.com/user/repos', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/vnd.github+json',
    },
    body: JSON.stringify({
      name,
      description: description || 'PUNICODEX temple',
      private: false,
      has_issues: false,
      has_wiki: false,
      has_projects: false,
    }),
  });

  const data = await resp.json();
  if (!resp.ok) {
    throw new Error(`GitHub repo creation failed: ${data.message}`);
  }

  return {
    repoUrl: data.html_url,
    cloneUrl: data.clone_url,
    sshUrl: data.ssh_url,
  };
}

async function pushFile({ owner, repo, path: filePath, content, message, token }) {
  const authToken = token || process.env.GITHUB_TOKEN;

  const resp = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/vnd.github+json',
    },
    body: JSON.stringify({
      message: message || 'Initial temple commit',
      content: Buffer.from(content).toString('base64'),
    }),
  });

  const data = await resp.json();
  if (!resp.ok) {
    throw new Error(`GitHub push failed: ${data.message}`);
  }

  return data;
}

module.exports = { createRepo, pushFile };

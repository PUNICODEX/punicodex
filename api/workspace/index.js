const {
  createWorkspace,
  updateWorkspace,
  getWorkspace,
  listWorkspaces,
  deleteWorkspace,
  addToReadingList,
  getReadingList,
  updateReadingItem,
  removeFromReadingList,
  recordTimelineEvent,
  getTimeline,
} = require('../../platform/api/workspaces');
const { getSessionToken, getOrCreateSession } = require('../../platform/api/search-v2');
const { handleError, setCors } = require('../_utils');

module.exports = async (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const token = getSessionToken(req);
    if (!token) return res.status(400).json({ error: 'Session token required' });
    const session = getOrCreateSession(token);
    if (!session) return res.status(400).json({ error: 'Invalid session' });

    const { publicId } = req.query;

    if (req.method === 'GET') {
      if (publicId) {
        const workspace = getWorkspace(publicId);
        if (!workspace) return res.status(404).json({ error: 'Workspace not found' });
        return res.json(workspace);
      }
      const [workspaces, readingList, timeline] = [
        listWorkspaces(session.token),
        getReadingList(session.token, { limit: 50 }),
        getTimeline(session.token, { limit: 50 }),
      ];
      return res.json({ workspaces, readingList, timeline, sessionToken: session.token });
    }

    if (req.method === 'POST') {
      const { action, name, payload, entryId, url, title, note, eventType, eventPayload } =
        req.body || {};

      if (action === 'workspace') {
        if (!name || !payload) return res.status(400).json({ error: 'name and payload required' });
        const ws = createWorkspace(session.token, name, payload);
        return res.status(201).json(ws);
      }

      if (action === 'reading-list') {
        if (!url) return res.status(400).json({ error: 'url required' });
        const item = addToReadingList(session.token, { entryId, url, title, note });
        recordTimelineEvent(session.token, 'reading_added', { url, title });
        return res.status(201).json(item);
      }

      if (action === 'timeline') {
        if (!eventType) return res.status(400).json({ error: 'eventType required' });
        recordTimelineEvent(session.token, eventType, eventPayload || {});
        return res.json({ ok: true });
      }

      return res.status(400).json({ error: 'Unknown action' });
    }

    if (req.method === 'PATCH') {
      if (publicId) {
        const { name, payload } = req.body || {};
        const ws = updateWorkspace(publicId, session.token, name, payload);
        if (!ws) return res.status(404).json({ error: 'Workspace not found or not owned' });
        return res.json(ws);
      }
      const { id, updates } = req.body || {};
      if (!id || !updates) return res.status(400).json({ error: 'id and updates required' });
      const ok = updateReadingItem(id, session.token, updates);
      if (!ok) return res.status(404).json({ error: 'Reading item not found' });
      return res.json({ ok: true });
    }

    if (req.method === 'DELETE') {
      if (publicId) {
        const ok = deleteWorkspace(publicId, session.token);
        if (!ok) return res.status(404).json({ error: 'Workspace not found or not owned' });
        return res.json({ ok: true });
      }
      const { id } = req.body || {};
      if (!id) return res.status(400).json({ error: 'id required' });
      const ok = removeFromReadingList(id, session.token);
      if (!ok) return res.status(404).json({ error: 'Reading item not found' });
      return res.json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    handleError(res, err);
  }
};

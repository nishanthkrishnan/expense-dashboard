export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = process.env.GITHUB_SYNC_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'GITHUB_SYNC_TOKEN not configured' });
  }

  const response = await fetch(
    'https://api.github.com/repos/nishanthkrishnan/expense-tracker/actions/workflows/daily_sync.yml/dispatches',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ref: 'main' }),
    }
  );

  if (response.status === 204) {
    return res.status(200).json({ ok: true });
  }

  const data = await response.json().catch(() => ({}));
  return res.status(response.status).json({ error: data.message || 'GitHub API error' });
}

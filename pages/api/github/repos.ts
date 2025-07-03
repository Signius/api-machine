import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    const { owner, repo } = req.query
    const token = process.env.GITHUB_TOKEN

    if (!token || !owner || !repo) {
        return res.status(400).json({
            error: 'Missing GITHUB_TOKEN, owner, or repo'
        })
    }

    try {
        const response = await fetch(
            `https://api.github.com/repos/${owner}/${repo}`,
            {
                headers: {
                    'Authorization': `token ${token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            }
        )

        if (!response.ok) {
            throw new Error(`GitHub API error: ${response.status}`)
        }

        const data = await response.json()
        res.status(200).json(data)
    } catch (err) {
        console.error('❌ Failed to fetch GitHub repo:', err)
        res.status(500).json({ error: 'Internal Server Error' })
    }
} 
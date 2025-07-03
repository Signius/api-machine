import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    const { owner, repo, workflow_id, ref = 'main' } = req.body
    const token = process.env.GITHUB_TOKEN

    if (!token || !owner || !repo || !workflow_id) {
        return res.status(400).json({
            error: 'Missing GITHUB_TOKEN, owner, repo, or workflow_id'
        })
    }

    try {
        // Trigger GitHub Action workflow
        const response = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflow_id}/dispatches`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `token ${token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ref: ref
                })
            }
        )

        if (!response.ok) {
            const errorData = await response.text()
            throw new Error(`GitHub API error: ${response.status} - ${errorData}`)
        }

        res.status(200).json({
            success: true,
            message: 'Workflow triggered successfully'
        })
    } catch (err) {
        console.error('❌ Failed to trigger GitHub action:', err)
        res.status(500).json({ error: 'Internal Server Error' })
    }
} 
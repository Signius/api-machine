import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
        const { service, token } = req.body

        if (!service || !token) {
            return res.status(400).json({
                error: 'Missing service or token'
            })
        }

        let isValid = false
        let userInfo = null

        switch (service) {
            case 'discord':
                // Validate Discord token
                const discordResponse = await fetch('https://discord.com/api/users/@me', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                })
                isValid = discordResponse.ok
                if (isValid) {
                    userInfo = await discordResponse.json()
                }
                break

            case 'github':
                // Validate GitHub token
                const githubResponse = await fetch('https://api.github.com/user', {
                    headers: {
                        'Authorization': `token ${token}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                })
                isValid = githubResponse.ok
                if (isValid) {
                    userInfo = await githubResponse.json()
                }
                break

            default:
                return res.status(400).json({
                    error: 'Unsupported service'
                })
        }

        res.status(200).json({
            valid: isValid,
            user: userInfo
        })
    } catch (err) {
        console.error('❌ Auth validation error:', err)
        res.status(500).json({ error: 'Internal Server Error' })
    }
} 
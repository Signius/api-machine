import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
        const { type, data } = req.body

        if (!type || !data) {
            return res.status(400).json({
                error: 'Missing type or data'
            })
        }

        let validationResult: { valid: boolean; errors: string[] } = { valid: false, errors: [] }

        switch (type) {
            case 'discord_guild_id':
                // Validate Discord Guild ID format
                const guildIdRegex = /^\d{17,19}$/
                validationResult.valid = guildIdRegex.test(data)
                if (!validationResult.valid) {
                    validationResult.errors.push('Invalid Discord Guild ID format')
                }
                break

            case 'github_repo':
                // Validate GitHub repository format (owner/repo)
                const repoRegex = /^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/
                validationResult.valid = repoRegex.test(data)
                if (!validationResult.valid) {
                    validationResult.errors.push('Invalid GitHub repository format (should be owner/repo)')
                }
                break

            case 'url':
                // Validate URL format
                try {
                    new URL(data)
                    validationResult.valid = true
                } catch {
                    validationResult.valid = false
                    validationResult.errors.push('Invalid URL format')
                }
                break

            case 'email':
                // Validate email format
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
                validationResult.valid = emailRegex.test(data)
                if (!validationResult.valid) {
                    validationResult.errors.push('Invalid email format')
                }
                break

            default:
                return res.status(400).json({
                    error: 'Unsupported validation type'
                })
        }

        res.status(200).json(validationResult)
    } catch (err) {
        console.error('❌ Validation error:', err)
        res.status(500).json({ error: 'Internal Server Error' })
    }
} 
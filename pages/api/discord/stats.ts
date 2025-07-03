import type { NextApiRequest, NextApiResponse } from 'next'
import { fetchDiscordStats } from '../../../lib/discord/fetchStats'

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    const { guildId, backfill, year } = req.query
    const token = process.env.DISCORD_TOKEN

    if (!token || !guildId) {
        return res.status(400).json({
            error: 'Missing DISCORD_TOKEN or guildId'
        })
    }

    try {
        const logs: string[] = []
        const onLog = (message: string) => {
            logs.push(message)
            console.log(message) // Keep console logs for debugging
        }

        const stats = await fetchDiscordStats({
            token,
            guildId: guildId as string,
            backfill: backfill === 'true',
            backfillYear: parseInt(year as string || '2025', 10),
            onLog
        })

        res.status(200).json({
            stats,
            logs
        })
    } catch (err) {
        console.error('❌ Failed to fetch Discord stats:', err)
        res.status(500).json({ error: 'Internal Server Error' })
    }
} 
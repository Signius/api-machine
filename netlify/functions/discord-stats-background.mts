// netlify/functions/discord-stats-background.mts
import type { Context } from '@netlify/functions'
import { config as dotenv } from 'dotenv'
import { fetchDiscordStats } from '../../lib/discord/fetchStats.js'

dotenv()

export default async (req: Request, context: Context) => {
  const token = process.env.DISCORD_TOKEN
  const url = new URL(req.url)
  const guildId = url.searchParams.get('guildId') || ''
  const backfill = url.searchParams.get('backfill') === 'true'
  const backfillYear = parseInt(url.searchParams.get('year') || '2025', 10)

  if (!token || !guildId) {
    return new Response(
      JSON.stringify({ error: 'Missing DISCORD_TOKEN or guildId' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }

  try {
    const stats = await fetchDiscordStats({ token, guildId, backfill, backfillYear })
    return new Response(
      JSON.stringify(stats),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  } catch (err) {
    console.error('❌ Failed to fetch stats:', err)
    return new Response(
      JSON.stringify({ error: 'Internal Server Error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}

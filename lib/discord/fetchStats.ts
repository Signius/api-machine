// lib/discord/fetchStats.ts
import { Client, GatewayIntentBits, TextBasedChannel, Message } from 'discord.js'

interface FetchStatsOptions {
  token: string
  guildId: string
  backfill?: boolean
  backfillYear?: number
}

interface MonthlyStats {
  memberCount: number
  totalMessages: number
  uniquePosters: number
}

export async function fetchDiscordStats({
  token,
  guildId,
  backfill = false,
  backfillYear = new Date().getFullYear(),
}: FetchStatsOptions): Promise<Record<string, MonthlyStats>> {
  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
  })

  return new Promise((resolve, reject) => {
    client.once('ready', async () => {
      try {
        const guild = await client.guilds.fetch(guildId)
        const memberCount = guild.memberCount
        const now = new Date()
        const data: Record<string, MonthlyStats> = {}
        const channels = guild.channels.cache.filter(c => c.isTextBased() && c.viewable).values()

        if (backfill) {
          const buckets: Record<string, { totalMessages: number; uniquePosters: Set<string> }> = {}
          const startDate = new Date(backfillYear, 0, 1)
          const endDate = new Date(now.getFullYear(), now.getMonth(), 1)

          for (const channel of channels) {
            let lastId: string | null = null
            try {
              outer: while (true) {
                const msgs: any = await (channel as TextBasedChannel).messages.fetch({ limit: 100, before: lastId || undefined })
                if (msgs.size === 0) break

                for (const msg of msgs.values()) {
                  const ts = msg.createdAt
                  if (ts < startDate) break outer
                  if (ts < endDate) {
                    const key = `${ts.getFullYear()}-${String(ts.getMonth() + 1).padStart(2, '0')}`
                    if (!buckets[key]) buckets[key] = { totalMessages: 0, uniquePosters: new Set() }
                    buckets[key].totalMessages++
                    if (!msg.author.bot) buckets[key].uniquePosters.add(msg.author.id)
                  }
                }

                lastId = msgs.last()?.id || null
                await new Promise(r => setTimeout(r, 500))
              }
            } catch (err: any) {
              if (err?.code === 50001 || err?.rawError?.code === 50001 || err?.message?.includes('Missing Access')) {
                console.warn(`Skipping channel due to missing access: ${channel.id || channel}`)
                continue
              } else {
                throw err
              }
            }
          }

          for (let m = 0; m < now.getMonth(); m++) {
            const dt = new Date(backfillYear, m, 1)
            const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`
            const monthStats = buckets[key] || { totalMessages: 0, uniquePosters: new Set<string>() }
            data[key] = {
              memberCount,
              totalMessages: monthStats.totalMessages,
              uniquePosters: monthStats.uniquePosters.size,
            }
          }
        } else {
          const monthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
          const monthEnd = new Date(now.getFullYear(), now.getMonth(), 1)
          const key = `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, '0')}`

          let totalMessages = 0
          const uniquePostersSet = new Set<string>()

          for (const channel of channels) {
            let lastId: string | null = null
            try {
              while (true) {
                const msgs: any = await (channel as TextBasedChannel).messages.fetch({ limit: 100, before: lastId || undefined })
                if (msgs.size === 0) break

                for (const msg of msgs.values()) {
                  const ts = msg.createdAt
                  if (ts >= monthStart && ts < monthEnd) {
                    totalMessages++
                    if (!msg.author.bot) uniquePostersSet.add(msg.author.id)
                  }
                  if (ts < monthStart) break
                }

                lastId = msgs.last()?.id || null
                await new Promise(r => setTimeout(r, 500))
              }
            } catch (err: any) {
              if (err?.code === 50001 || err?.rawError?.code === 50001 || err?.message?.includes('Missing Access')) {
                console.warn(`Skipping channel due to missing access: ${channel.id || channel}`)
                continue
              } else {
                throw err
              }
            }
          }

          data[key] = {
            memberCount,
            totalMessages,
            uniquePosters: uniquePostersSet.size,
          }
        }

        client.destroy()
        resolve(data)
      } catch (error) {
        client.destroy()
        reject(error)
      }
    })

    client.login(token)
  })
}

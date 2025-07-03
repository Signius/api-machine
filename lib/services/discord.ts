import { Client, GatewayIntentBits } from 'discord.js'

export interface DiscordStats {
    memberCount: number
    totalMessages: number
    uniquePosters: number
    timestamp: string
}

export interface DiscordStatsParams {
    token: string
    guildId: string
    backfill?: boolean
    backfillYear?: number
}

export class DiscordService {
    private client: Client

    constructor() {
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages
            ]
        })
    }

    async getStats({ token, guildId, backfill = false, backfillYear = 2025 }: DiscordStatsParams): Promise<DiscordStats> {
        return new Promise((resolve, reject) => {
            this.client.once('ready', async () => {
                try {
                    console.log(`✅ Logged in as ${this.client.user?.tag}`)
                    const guild = await this.client.guilds.fetch(guildId)
                    const memberCount = guild.memberCount

                    if (backfill) {
                        const stats = await this.getBackfillStats(guild, backfillYear)
                        resolve(stats)
                    } else {
                        const stats = await this.getCurrentMonthStats(guild)
                        resolve(stats)
                    }
                } catch (error) {
                    reject(error)
                } finally {
                    this.client.destroy()
                }
            })

            this.client.on('error', (error) => {
                reject(error)
            })

            this.client.login(token)
        })
    }

    private async getCurrentMonthStats(guild: any): Promise<DiscordStats> {
        const now = new Date()
        const monthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        const monthEnd = new Date(now.getFullYear(), now.getMonth(), 1)

        let totalMessages = 0
        const uniquePostersSet = new Set<string>()

        const channels = guild.channels.cache
            .filter((c: any) => c.isTextBased() && c.viewable)
            .values()

        for (const channel of channels) {
            const channelStats = await this.getChannelStats(channel, monthStart, monthEnd)
            totalMessages += channelStats.totalMessages
            channelStats.uniquePosters.forEach((userId: string) => uniquePostersSet.add(userId))
        }

        return {
            memberCount: guild.memberCount,
            totalMessages,
            uniquePosters: uniquePostersSet.size,
            timestamp: new Date().toISOString()
        }
    }

    private async getBackfillStats(guild: any, year: number): Promise<DiscordStats> {
        const now = new Date()
        const startDate = new Date(year, 0, 1)
        const endDate = new Date(now.getFullYear(), now.getMonth(), 1)

        const buckets: Record<string, { totalMessages: number; uniquePosters: Set<string> }> = {}

        const channels = guild.channels.cache
            .filter((c: any) => c.isTextBased() && c.viewable)
            .values()

        for (const channel of channels) {
            await this.processChannelForBackfill(channel, buckets, startDate, endDate)
        }

        // Get the most recent month's stats
        const currentMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        const key = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`
        const monthStats = buckets[key] || { totalMessages: 0, uniquePosters: new Set() }

        return {
            memberCount: guild.memberCount,
            totalMessages: monthStats.totalMessages,
            uniquePosters: monthStats.uniquePosters.size,
            timestamp: new Date().toISOString()
        }
    }

    private async getChannelStats(channel: any, startDate: Date, endDate: Date) {
        let totalMessages = 0
        const uniquePosters = new Set<string>()

        // Main channel messages
        let lastId = null
        while (true) {
            const msgs: any = await channel.messages.fetch({ limit: 100, before: lastId })
            if (msgs.size === 0) break

            for (const msg of msgs.values()) {
                const ts = msg.createdAt
                if (ts >= startDate && ts < endDate) {
                    totalMessages++
                    if (!msg.author.bot) uniquePosters.add(msg.author.id)
                }
                if (ts < startDate) break
            }

            lastId = msgs.last()?.id
            if (!lastId) break
            await new Promise(r => setTimeout(r, 500))
        }

        // Thread messages
        if (channel.threads) {
            const threadStats = await this.getThreadStats(channel, startDate, endDate)
            totalMessages += threadStats.totalMessages
            threadStats.uniquePosters.forEach((userId: string) => uniquePosters.add(userId))
        }

        return { totalMessages, uniquePosters }
    }

    private async getThreadStats(channel: any, startDate: Date, endDate: Date) {
        let totalMessages = 0
        const uniquePosters = new Set<string>()

        // Active threads
        const active = await channel.threads.fetchActive()
        for (const thread of active.threads.values()) {
            const threadStats = await this.getSingleThreadStats(thread, startDate, endDate)
            totalMessages += threadStats.totalMessages
            threadStats.uniquePosters.forEach((userId: string) => uniquePosters.add(userId))
        }

        // Archived threads
        const archived = await channel.threads.fetchArchived({ limit: 100 })
        for (const thread of archived.threads.values()) {
            const threadStats = await this.getSingleThreadStats(thread, startDate, endDate)
            totalMessages += threadStats.totalMessages
            threadStats.uniquePosters.forEach((userId: string) => uniquePosters.add(userId))
        }

        return { totalMessages, uniquePosters }
    }

    private async getSingleThreadStats(thread: any, startDate: Date, endDate: Date) {
        let totalMessages = 0
        const uniquePosters = new Set<string>()

        let threadLastId = null
        while (true) {
            const msgs: any = await thread.messages.fetch({ limit: 100, before: threadLastId })
            if (msgs.size === 0) break

            for (const msg of msgs.values()) {
                const ts = msg.createdAt
                if (ts >= startDate && ts < endDate) {
                    totalMessages++
                    if (!msg.author.bot) uniquePosters.add(msg.author.id)
                }
                if (ts < startDate) break
            }

            threadLastId = msgs.last()?.id
            if (!threadLastId) break
            await new Promise(r => setTimeout(r, 500))
        }

        return { totalMessages, uniquePosters }
    }

    private async processChannelForBackfill(channel: any, buckets: Record<string, any>, startDate: Date, endDate: Date) {
        // Process main channel messages
        let lastId = null
        outer: while (true) {
            const msgs: any = await channel.messages.fetch({ limit: 100, before: lastId })
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

            lastId = msgs.last()?.id
            if (!lastId) break
            await new Promise(r => setTimeout(r, 500))
        }

        // Process thread messages
        if (channel.threads) {
            await this.processThreadsForBackfill(channel, buckets, startDate, endDate)
        }
    }

    private async processThreadsForBackfill(channel: any, buckets: Record<string, any>, startDate: Date, endDate: Date) {
        // Active threads
        const active = await channel.threads.fetchActive()
        for (const thread of active.threads.values()) {
            await this.processSingleThreadForBackfill(thread, buckets, startDate, endDate)
        }

        // Archived threads
        const archived = await channel.threads.fetchArchived({ limit: 100 })
        for (const thread of archived.threads.values()) {
            await this.processSingleThreadForBackfill(thread, buckets, startDate, endDate)
        }
    }

    private async processSingleThreadForBackfill(thread: any, buckets: Record<string, any>, startDate: Date, endDate: Date) {
        let threadLastId = null
        while (true) {
            const msgs: any = await thread.messages.fetch({ limit: 100, before: threadLastId })
            if (msgs.size === 0) break

            for (const msg of msgs.values()) {
                const ts = msg.createdAt
                if (ts < startDate) break
                if (ts < endDate) {
                    const key = `${ts.getFullYear()}-${String(ts.getMonth() + 1).padStart(2, '0')}`
                    if (!buckets[key]) buckets[key] = { totalMessages: 0, uniquePosters: new Set() }
                    buckets[key].totalMessages++
                    if (!msg.author.bot) buckets[key].uniquePosters.add(msg.author.id)
                }
            }

            threadLastId = msgs.last()?.id
            if (!threadLastId) break
            await new Promise(r => setTimeout(r, 500))
        }
    }
}

export const discordService = new DiscordService() 
import type { NextApiRequest, NextApiResponse } from 'next'
import { Client, GatewayIntentBits, ChannelType, PermissionsBitField } from 'discord.js'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    // Get config from env variables (same as the script)
    const DISCORD_TOKEN = process.env.DISCORD_TOKEN
    const GUILD_ID = process.env.GUILD_ID || req.query.guild_id as string
    const BACKFILL = 'false'
    const BACKFILL_YEAR = 2025

    // Validate required inputs
    if (!DISCORD_TOKEN || !GUILD_ID) {
        return res.status(400).json({
            error: 'DISCORD_TOKEN and GUILD_ID must be set'
        })
    }

    const logs: string[] = []
    const log = (message: string) => {
        logs.push(message)
        console.log(message)
    }

    function getChannelTypeName(type: number) {
        switch (type) {
            case ChannelType.GuildText: return 'Text Channel'
            case ChannelType.GuildAnnouncement: return 'Announcement Channel'
            case ChannelType.GuildForum: return 'Forum Channel'
            case ChannelType.GuildMedia: return 'Media Channel'
            case ChannelType.GuildStageVoice: return 'Stage Channel'
            case ChannelType.GuildVoice: return 'Voice Channel'
            case ChannelType.GuildDirectory: return 'Directory Channel'
            case ChannelType.GuildCategory: return 'Category'
            default: return `Unknown Type (${type})`
        }
    }

    try {
        const client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages
            ]
        })

        const result = await new Promise((resolve, reject) => {
            client.once('ready', async () => {
                try {
                    log(`✅ Logged in as ${client.user?.tag}`)
                    const guild = await client.guilds.fetch(GUILD_ID)
                    const memberCount = guild.memberCount

                    // Ensure all channels are fetched
                    log(`🔄 Fetching all guild channels...`)
                    await guild.channels.fetch()
                    log(`✅ Guild channels loaded`)

                    const botMember = await guild.members.fetch(client.user!.id)
                    const hasGuildViewPermission = botMember.permissions.has(PermissionsBitField.Flags.ViewChannel)
                    log(`👁️  Bot has guild-level ViewChannel permission: ${hasGuildViewPermission}`)

                    const allChannels = Array.from(guild.channels.cache.values())
                    const allTextChannels = Array.from(guild.channels.cache.filter(c => c.isTextBased()).values())
                    const forumChannels = allChannels.filter(c => c.type === ChannelType.GuildForum)
                    log(`🔍 Found ${forumChannels.length} forum channels`)

                    const forumPosts: any[] = []
                    for (const forum of forumChannels) {
                        try {
                            const posts = await forum.threads.fetchActive()
                            const archived = await forum.threads.fetchArchived()
                            for (const [id, post] of [...posts.threads, ...archived.threads]) {
                                forumPosts.push(post)
                            }
                        } catch (err: any) {
                            log(`❌ Forum fetch failed: ${err.message}`)
                        }
                    }

                    const allTextChannelsWithPosts = [...allTextChannels, ...forumPosts]

                    log(`🧪 Testing channel access...`)
                    const accessibleChannels: any[] = []
                    const inaccessibleChannels: any[] = []

                    for (const channel of allTextChannelsWithPosts) {
                        try {
                            await channel.messages.fetch({ limit: 1 })
                            accessibleChannels.push(channel)
                            log(`  ✅ ${channel.name} - Accessible`)
                        } catch (err: any) {
                            inaccessibleChannels.push(channel)
                            log(`  ❌ ${channel.name} - Inaccessible: ${err.message}`)
                        }
                    }

                    const channels = accessibleChannels

                    let data: any = {}
                    const now = new Date()

                    const buckets: any = {}
                    const processMessages = async (msgs: any, startDate: Date, endDate: Date) => {
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
                    }

                    const processChannel = async (channel: any, startDate: Date, endDate: Date) => {
                        log(`📝 Processing channel: ${channel.name}`)
                        let lastId = null
                        while (true) {
                            try {
                                const msgs = await channel.messages.fetch({ limit: 100, before: lastId })
                                if (!msgs.size) break
                                await processMessages(msgs, startDate, endDate)
                                lastId = msgs.last()?.id
                                if (!lastId) break
                                await new Promise(r => setTimeout(r, 500))
                            } catch (e: any) {
                                log(`⚠️ Skipping channel ${channel.id} due to error: ${e.message}`)
                                break
                            }
                        }
                    }

                    const startDate = BACKFILL ? new Date(BACKFILL_YEAR, 0, 1) : new Date(now.getFullYear(), now.getMonth() - 1, 1)
                    const endDate = BACKFILL ? new Date(now.getFullYear(), now.getMonth(), 1) : new Date(now.getFullYear(), now.getMonth(), 1)
                    const targetKey = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`

                    for (const channel of channels) {
                        await processChannel(channel, startDate, endDate)
                        if (channel.threads) {
                            try {
                                const threadGroups = [await channel.threads.fetchActive(), await channel.threads.fetchArchived({ limit: 100 })]
                                for (const group of threadGroups) {
                                    for (const thread of group.threads.values()) {
                                        await processChannel(thread, startDate, endDate)
                                    }
                                }
                            } catch (e: any) {
                                log(`⚠️ Skipping threads for ${channel.name} due to: ${e.message}`)
                            }
                        }
                    }

                    if (BACKFILL) {
                        for (let m = 0; m < now.getMonth(); m++) {
                            const dt = new Date(BACKFILL_YEAR, m, 1)
                            const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`
                            const stats = buckets[key] || { totalMessages: 0, uniquePosters: new Set() }
                            data[key] = {
                                memberCount,
                                totalMessages: stats.totalMessages,
                                uniquePosters: stats.uniquePosters.size
                            }
                            log(`  → ${key}: ${stats.totalMessages} msgs, ${stats.uniquePosters.size} uniquePosters, ${memberCount} members`)
                        }
                    } else {
                        const stats = buckets[targetKey] || { totalMessages: 0, uniquePosters: new Set() }
                        data[targetKey] = {
                            memberCount,
                            totalMessages: stats.totalMessages,
                            uniquePosters: stats.uniquePosters.size
                        }
                        log(`📊 Wrote stats for ${targetKey}: ${stats.totalMessages} msgs, ${stats.uniquePosters.size} uniquePosters, ${memberCount} members`)
                    }

                    const ordered: any = {}
                    Object.keys(data).sort().forEach(k => { ordered[k] = data[k] })

                    resolve({
                        data: ordered,
                        summary: {
                            totalChannels: allChannels.length,
                            textChannels: allTextChannels.length,
                            forumChannels: forumChannels.length,
                            forumPosts: forumPosts.length,
                            accessibleChannels: accessibleChannels.length,
                            inaccessibleChannels: inaccessibleChannels.length,
                            memberCount,
                            processedMonths: Object.keys(ordered).length
                        }
                    })

                } catch (error: any) {
                    reject(error)
                } finally {
                    client.destroy()
                }
            })

            client.on('error', (error) => {
                log(`❌ Client error: ${error.message}`)
                reject(error)
            })

            client.login(DISCORD_TOKEN)
        })

        res.status(200).json({
            success: true,
            result,
            logs
        })

    } catch (error: any) {
        log(`❌ Failed to test Discord client: ${error.message}`)
        res.status(500).json({
            success: false,
            error: error.message,
            logs
        })
    }
} 
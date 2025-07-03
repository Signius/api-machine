// test-discord-api.js - Test script for Discord API functionality
import { Client, GatewayIntentBits } from 'discord.js'

// Test configuration
const DISCORD_TOKEN = process.env.DISCORD_TOKEN
const GUILD_ID = process.env.GUILD_ID

if (!DISCORD_TOKEN || !GUILD_ID) {
    console.error('❌ DISCORD_TOKEN and GUILD_ID must be set')
    process.exit(1)
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages
    ]
})

async function runTests() {
    console.log('🧪 Starting Discord API tests...\n')

    try {
        // Test 1: Client connection
        console.log('Test 1: Client Connection')
        await new Promise((resolve, reject) => {
            client.once('ready', () => {
                console.log('✅ Client connected successfully')
                resolve()
            })

            client.on('error', (error) => {
                console.log('❌ Client connection failed:', error.message)
                reject(error)
            })

            client.login(DISCORD_TOKEN)
        })

        // Test 2: Guild fetch
        console.log('\nTest 2: Guild Fetch')
        const guild = await client.guilds.fetch(GUILD_ID)
        console.log('✅ Guild fetched successfully')
        console.log(`   Name: ${guild.name}`)
        console.log(`   Member Count: ${guild.memberCount}`)
        console.log(`   Channel Count: ${guild.channels.cache.size}`)

        // Test 3: Channel access
        console.log('\nTest 3: Channel Access')
        const textChannels = guild.channels.cache.filter(c => c.isTextBased() && c.viewable)
        console.log(`✅ Found ${textChannels.size} accessible text channels`)

        if (textChannels.size > 0) {
            const firstChannel = textChannels.first()
            console.log(`   First channel: ${firstChannel.name} (${firstChannel.id})`)
        }

        // Test 4: Message fetching (limited)
        console.log('\nTest 4: Message Fetching')
        if (textChannels.size > 0) {
            const testChannel = textChannels.first()
            const messages = await testChannel.messages.fetch({ limit: 5 })
            console.log(`✅ Successfully fetched ${messages.size} messages from ${testChannel.name}`)

            if (messages.size > 0) {
                const firstMessage = messages.first()
                console.log(`   Latest message: ${firstMessage.content.substring(0, 50)}...`)
                console.log(`   Author: ${firstMessage.author.username}`)
                console.log(`   Timestamp: ${firstMessage.createdAt}`)
            }
        }

        // Test 5: Thread access
        console.log('\nTest 5: Thread Access')
        const channelsWithThreads = textChannels.filter(c => c.threads)
        console.log(`✅ Found ${channelsWithThreads.size} channels with thread support`)

        if (channelsWithThreads.size > 0) {
            const testChannel = channelsWithThreads.first()
            const activeThreads = await testChannel.threads.fetchActive()
            console.log(`   Active threads in ${testChannel.name}: ${activeThreads.threads.size}`)

            const archivedThreads = await testChannel.threads.fetchArchived({ limit: 5 })
            console.log(`   Archived threads in ${testChannel.name}: ${archivedThreads.threads.size}`)
        }

        // Test 6: Rate limiting test
        console.log('\nTest 6: Rate Limiting')
        const startTime = Date.now()
        const promises = []

        // Try to fetch messages from multiple channels simultaneously
        for (const channel of textChannels.values()) {
            promises.push(
                channel.messages.fetch({ limit: 1 }).catch(err => ({
                    channel: channel.name,
                    error: err.message
                }))
            )
        }

        const results = await Promise.allSettled(promises)
        const endTime = Date.now()

        const successful = results.filter(r => r.status === 'fulfilled').length
        const failed = results.filter(r => r.status === 'rejected').length

        console.log(`✅ Rate limiting test completed in ${endTime - startTime}ms`)
        console.log(`   Successful requests: ${successful}`)
        console.log(`   Failed requests: ${failed}`)

        // Test 7: Permission check
        console.log('\nTest 7: Permission Check')
        const botMember = await guild.members.fetch(client.user.id)
        const permissions = botMember.permissions.toArray()
        console.log('✅ Bot permissions:')
        console.log(`   View Channels: ${permissions.includes('ViewChannel')}`)
        console.log(`   Read Message History: ${permissions.includes('ReadMessageHistory')}`)
        console.log(`   Send Messages: ${permissions.includes('SendMessages')}`)

        console.log('\n🎉 All tests completed successfully!')

    } catch (error) {
        console.error('\n❌ Test failed:', error.message)
        process.exit(1)
    } finally {
        client.destroy()
    }
}

// Run tests
runTests().catch(error => {
    console.error('❌ Test suite failed:', error)
    process.exit(1)
}) 
// discord-stats-api.js - GitHub Action Script using API route
import fs from 'fs'
import path from 'path'

// ——— Config from ENV ———
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000'
const GUILD_ID = process.env.GUILD_ID
const OUTPUT_FILE = path.resolve(process.cwd(), 'discord-stats/stats.json')

if (!GUILD_ID) {
    console.error('❌ GUILD_ID must be set')
    process.exit(1)
}

// ——— Backfill toggle ———
const BACKFILL = process.env.BACKFILL === 'true' || false
const BACKFILL_YEAR = parseInt(process.env.BACKFILL_YEAR || '2025', 10)

async function fetchDiscordEngagementStats() {
    console.log('🔄 Fetching Discord engagement stats from API...')

    // Build query parameters for engagement API
    const params = new URLSearchParams({
        guild_id: GUILD_ID
    })

    // Add date parameters for backfill if needed
    if (BACKFILL) {
        const startDate = new Date(BACKFILL_YEAR, 0, 1).toISOString() // Start of year
        const endDate = new Date(BACKFILL_YEAR, 11, 31, 23, 59, 59, 999).toISOString() // End of year

        params.append('start', startDate)
        params.append('end', endDate)
        params.append('interval', '3') // 3-day intervals

        console.log(`📅 Backfilling engagement data from ${BACKFILL_YEAR}`)
    } else {
        // For current month, the API will use defaults
        console.log('📅 Fetching current month engagement data')
    }

    const url = `${API_BASE_URL}/api/discord/engagement?${params.toString()}`
    console.log(`🌐 Calling engagement API: ${url}`)

    try {
        const response = await fetch(url)

        if (!response.ok) {
            const errorText = await response.text()
            throw new Error(`API request failed with status ${response.status}: ${errorText}`)
        }

        const data = await response.json()

        if (data.error) {
            throw new Error(`API returned error: ${data.error}`)
        }

        console.log('✅ Successfully fetched engagement data')
        return data
    } catch (error) {
        console.error('❌ Failed to fetch Discord engagement stats:', error.message)
        throw error
    }
}

async function main() {
    try {
        // Load existing data if file exists
        let data = {}
        if (fs.existsSync(OUTPUT_FILE)) {
            console.log(`📂 Loading existing engagement stats from ${OUTPUT_FILE}`)
            data = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8'))
        }

        // Fetch new engagement stats from API
        const newStats = await fetchDiscordEngagementStats()

        // Create a timestamp for this data collection
        const timestamp = new Date().toISOString()
        const dateKey = new Date().toISOString().slice(0, 7) // YYYY-MM format

        // Store the data with timestamp
        const updatedData = {
            ...data,
            [dateKey]: {
                timestamp,
                data: newStats
            }
        }

        // Write to file
        const outDir = path.dirname(OUTPUT_FILE)
        if (!fs.existsSync(outDir)) {
            console.log(`📁 Creating output directory: ${outDir}`)
            fs.mkdirSync(outDir, { recursive: true })
        }

        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(updatedData, null, 2))
        console.log(`✅ Engagement stats written to ${OUTPUT_FILE}`)

        // Log summary
        console.log(`📊 Updated engagement stats for ${dateKey}`)

        // Show data summary if available
        if (newStats && typeof newStats === 'object') {
            const keys = Object.keys(newStats)
            console.log(`📈 Engagement data contains: ${keys.join(', ')}`)
        }

    } catch (error) {
        console.error('❌ Script failed:', error.message)
        process.exit(1)
    }
}

// Run the script
main() 
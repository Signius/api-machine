// netlify/functions/catalyst-proposals-background.mts
import type { Context } from '@netlify/functions'
import { config as dotenv } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import axios from 'axios'

dotenv()

// Initialize Supabase clients for different databases
const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const catalystSupabaseUrl = process.env.CATALYST_SUPABASE_URL
const catalystSupabaseKey = process.env.CATALYST_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables')
}

if (!catalystSupabaseUrl || !catalystSupabaseKey) {
    throw new Error('Missing CATALYST_SUPABASE_URL or CATALYST_SUPABASE_ANON_KEY environment variables')
}

// Client for fetching proposal details (using CATALYST_SUPABASE_URL)
const supabaseFetch = createClient(catalystSupabaseUrl, catalystSupabaseKey)

// Client for upserting data (using SUPABASE_URL)
const supabaseUpsert = createClient(supabaseUrl, supabaseServiceKey)

// Lido CSRF token for lidonation API calls
const LIDO_CSRF_TOKEN = process.env.LIDO_CSRF_TOKEN

if (!LIDO_CSRF_TOKEN) {
    throw new Error('Missing LIDO_CSRF_TOKEN environment variable')
}

const API_BASE = 'https://www.lidonation.com/api/catalyst-explorer'

/**
 * Fetches voting metrics for a single proposal by title & fund number.
 */
async function getProposalMetrics({ fundNumber, title, csrfToken }: {
    fundNumber: number | string
    title: string
    csrfToken: string
}) {
    console.log(`[Lido API] Starting metrics fetch for "${title}" in Fund ${fundNumber}`)

    const headers = {
        'Accept': 'application/json',
        'X-CSRF-TOKEN': csrfToken,
    }

    // 1) Get all funds, find the one matching "Fund ${fundNumber}"
    console.log(`[Lido API] Fetching funds list...`)
    const fundsRes = await fetch(`${API_BASE}/funds`, { headers })
    if (!fundsRes.ok) {
        console.error(`[Lido API] Failed to fetch funds: ${fundsRes.status} ${fundsRes.statusText}`)
        throw new Error(`Failed to fetch funds: ${fundsRes.status}`)
    }
    const { data: funds } = await fundsRes.json() as { data: any[] }
    console.log(`[Lido API] Retrieved ${funds.length} funds`)

    const fund = funds.find((f: any) => f.title === `Fund ${fundNumber}`)
    if (!fund) {
        console.error(`[Lido API] Fund ${fundNumber} not found in available funds:`, funds.map(f => f.title))
        throw new Error(`Fund ${fundNumber} not found`)
    }
    const fundId = fund.id
    console.log(`[Lido API] Found fund with ID: ${fundId}`)

    // 2) Search proposals in that fund for the exact title
    const searchTerm = encodeURIComponent(title)
    console.log(`[Lido API] Searching for proposal "${title}" in fund ${fundId}`)
    const propsRes = await fetch(
        `${API_BASE}/proposals?fund_id=${fundId}&search=${searchTerm}&per_page=5&page=1`,
        { headers }
    )
    if (!propsRes.ok) {
        console.error(`[Lido API] Failed to search proposals: ${propsRes.status} ${propsRes.statusText}`)
        throw new Error(`Failed to search proposals: ${propsRes.status}`)
    }
    const propsJson = await propsRes.json() as { data: any[] }
    console.log(`[Lido API] Found ${propsJson.data.length} proposals matching search`)

    const match = propsJson.data.find((p: any) => p.title === title)
    if (!match) {
        console.error(`[Lido API] Proposal titled "${title}" not found in Fund ${fundNumber}. Available proposals:`, propsJson.data.map(p => p.title))
        throw new Error(`Proposal titled "${title}" not found in Fund ${fundNumber}`)
    }
    const proposalId = match.id
    console.log(`[Lido API] Found proposal with ID: ${proposalId}`)

    // 3) Fetch full proposal details by ID
    console.log(`[Lido API] Fetching detailed proposal data for ID ${proposalId}`)
    const detailRes = await fetch(`${API_BASE}/proposals/${proposalId}`, { headers })
    if (!detailRes.ok) {
        console.error(`[Lido API] Failed to fetch proposal ${proposalId}: ${detailRes.status} ${detailRes.statusText}`)
        throw new Error(`Failed to fetch proposal ${proposalId}: ${detailRes.status}`)
    }
    const detailResponse = await detailRes.json() as { data: any }
    const { data: detail } = detailResponse

    console.log(`[Lido API] Raw response structure:`, {
        response_keys: Object.keys(detailResponse),
        data_keys: detail ? Object.keys(detail) : null,
        has_data: !!detail
    })

    const {
        yes_votes_count,
        no_votes_count,
        abstain_votes_count,
        unique_wallets,
        users
    } = detail

    // Extract user_id from the users array - try multiple possible field names
    let userId = null

    // Try the expected 'users' field first
    if (users && users.length > 0) {
        userId = users[0].id
        console.log(`[Lido API] Found user ID from 'users' field: ${userId}`)
    }

    // If not found, try alternative field names
    if (!userId && detail.user_id) {
        userId = detail.user_id
        console.log(`[Lido API] Found user ID from 'user_id' field: ${userId}`)
    }

    if (!userId && detail.user) {
        userId = detail.user.id || detail.user
        console.log(`[Lido API] Found user ID from 'user' field: ${userId}`)
    }

    if (!userId) {
        console.log(`[Lido API] No user ID found in any expected fields`)
    }

    // Debug: Check if users exists and log its structure
    console.log(`[Lido API] Users field debug:`, {
        has_users_field: 'users' in detail,
        users_value: detail.users,
        users_type: typeof detail.users,
        users_is_array: Array.isArray(detail.users),
        users_length: detail.users ? detail.users.length : 'N/A'
    })

    console.log(`[Lido API] Full proposal detail structure:`, {
        has_users: !!users,
        users_length: users ? users.length : 0,
        users_structure: users ? users.slice(0, 2) : null,
        full_detail_keys: Object.keys(detail),
        detail_id: detail.id,
        detail_title: detail.title
    })

    console.log(`[Lido API] Successfully retrieved voting metrics:`, {
        yes_votes: yes_votes_count,
        no_votes: no_votes_count,
        abstain_votes: abstain_votes_count,
        unique_wallets,
        user_id: userId
    })

    return { proposalId, yes_votes_count, no_votes_count, abstain_votes_count, unique_wallets, user_id: userId }
}

/**
 * Fetches all proposals by a specific user ID.
 */
async function getProposalsByUserId(userId: number, csrfToken: string) {
    console.log(`[Lido API] Fetching all proposals for user ID: ${userId}`)

    const headers = {
        'Accept': 'application/json',
        'X-CSRF-TOKEN': csrfToken,
    }

    try {
        const response = await fetch(
            `${API_BASE}/proposals?user_id=${userId}&per_page=24&page=1`,
            { headers }
        )

        if (!response.ok) {
            console.error(`[Lido API] Failed to fetch proposals for user ${userId}: ${response.status} ${response.statusText}`)
            throw new Error(`Failed to fetch proposals for user ${userId}: ${response.status}`)
        }

        const { data: proposals } = await response.json() as { data: any[] }
        console.log(`[Lido API] Retrieved ${proposals.length} proposals for user ${userId}`)

        return proposals
    } catch (error) {
        console.error(`[Lido API] Error fetching proposals for user ${userId}:`, error)
        return []
    }
}

/**
 * Attempts to find a proposal by title from a list of user proposals.
 */
function findProposalByTitle(proposals: any[], targetTitle: string): any | null {
    console.log(`[Title Matching] Attempting to match "${targetTitle}" against ${proposals.length} proposals`)

    // Log all available proposal titles for debugging
    console.log(`[Title Matching] Available proposal titles:`, proposals.map(p => p.title))

    // First try exact match
    const exactMatch = proposals.find(p => p.title === targetTitle)
    if (exactMatch) {
        console.log(`[Title Matching] ✅ Found exact title match: "${targetTitle}"`)
        return exactMatch
    }

    // Try case-insensitive match
    const caseInsensitiveMatch = proposals.find(p =>
        p.title.toLowerCase() === targetTitle.toLowerCase()
    )
    if (caseInsensitiveMatch) {
        console.log(`[Title Matching] ✅ Found case-insensitive title match: "${targetTitle}"`)
        return caseInsensitiveMatch
    }

    // Try partial match (if title contains the target)
    const partialMatch = proposals.find(p =>
        p.title.toLowerCase().includes(targetTitle.toLowerCase()) ||
        targetTitle.toLowerCase().includes(p.title.toLowerCase())
    )
    if (partialMatch) {
        console.log(`[Title Matching] ✅ Found partial title match: "${targetTitle}" -> "${partialMatch.title}"`)
        return partialMatch
    }

    // Try fuzzy matching - remove common words and compare
    const cleanTarget = targetTitle.toLowerCase()
        .replace(/\b(by|the|and|or|for|with|in|on|at|to|from|of|a|an)\b/g, '')
        .replace(/\s+/g, ' ')
        .trim()

    const fuzzyMatch = proposals.find(p => {
        const cleanProposal = p.title.toLowerCase()
            .replace(/\b(by|the|and|or|for|with|in|on|at|to|from|of|a|an)\b/g, '')
            .replace(/\s+/g, ' ')
            .trim()

        return cleanProposal === cleanTarget ||
            cleanProposal.includes(cleanTarget) ||
            cleanTarget.includes(cleanProposal)
    })

    if (fuzzyMatch) {
        console.log(`[Title Matching] ✅ Found fuzzy title match: "${targetTitle}" -> "${fuzzyMatch.title}"`)
        return fuzzyMatch
    }

    console.log(`[Title Matching] ❌ No title match found for "${targetTitle}" in user proposals`)
    return null
}

/**
 * Generates a URL-friendly slug from a project title.
 */
function generateUrlFromTitle(title: string): string {
    if (!title) return ''

    return title
        // Replace '&' with 'and'
        .replace(/&/g, 'and')
        // Replace '|' with 'or'
        .replace(/\|/g, 'or')
        // Replace '[' and ']' with empty string
        .replace(/[\[\]]/g, '')
        // Replace multiple spaces, hyphens, or underscores with single space
        .replace(/[\s\-_]+/g, ' ')
        // Remove special characters except spaces and alphanumeric
        .replace(/[^a-zA-Z0-9\s]/g, '')
        // Replace multiple spaces with single space
        .replace(/\s+/g, ' ')
        // Trim whitespace
        .trim()
        // Replace spaces with hyphens
        .replace(/\s/g, '-')
        // Convert to lowercase
        .toLowerCase()
}

/**
 * Extracts category slug from challenges data.
 */
function extractCategoryFromChallenges(challenges: any): string | null {
    if (!challenges || !challenges.title) {
        return null
    }

    // Remove the fund prefix (e.g., "F11: ") and clean up the title
    const categoryMatch = challenges.title.match(/^F\d+:\s*(.+)$/i)
    if (categoryMatch) {
        return generateUrlFromTitle(categoryMatch[1])
    }

    return null
}

/**
 * Extracts fund number from challenges data.
 */
function extractFundNumberFromChallenges(challenges: any): string | null {
    if (!challenges || !challenges.title) {
        return null
    }

    // Extract fund number from challenge title (e.g., "F11: OSDE: ...")
    const fundMatch = challenges.title.match(/^F(\d+):/i)
    if (fundMatch) {
        return fundMatch[1]
    }

    return null
}

/**
 * Generates the full Catalyst URL for a project.
 */
function generateCatalystUrl(title: string, fundNumber: string, categorySlug: string): string {
    if (!title || !fundNumber || !categorySlug) return ''

    const slug = generateUrlFromTitle(title)
    return `https://projectcatalyst.io/funds/${fundNumber}/${categorySlug}/${slug}`
}

/**
 * Retrieves the proposal details from Supabase.
 */
async function getProposalDetails(projectId: string) {
    console.log(`[Supabase] Getting proposal details for project ${projectId}`)

    const { data, error } = await supabaseFetch
        .from('proposals')
        .select(`
      id,
      title,
      budget,
      milestones_qty,
      funds_distributed,
      challenges(*),
      project_id
    `)
        .eq('project_id', projectId)
        .single()

    if (error) {
        console.error(`[Supabase] Error fetching proposal details for project ${projectId}:`, error)
        return null
    }

    console.log(`[Supabase] Successfully retrieved proposal details:`, {
        id: data.id,
        title: data.title,
        budget: data.budget,
        milestones_qty: data.milestones_qty,
        has_challenges: !!data.challenges && !!(data.challenges as any).title
    })

    return data
}

/**
 * Fetches milestone snapshot data.
 */
async function fetchSnapshotData(projectId: string) {
    console.log(`[Supabase RPC] Fetching snapshot data for project ${projectId}`)

    try {
        const response = await axios.post(
            `${catalystSupabaseUrl}/rest/v1/rpc/getproposalsnapshot`,
            { _project_id: projectId },
            {
                headers: {
                    'apikey': catalystSupabaseKey,
                    'Authorization': `Bearer ${catalystSupabaseKey}`,
                    'Content-Type': 'application/json',
                    'Content-Profile': 'public',
                    'x-client-info': 'supabase-js/2.2.3'
                }
            }
        )
        console.log(`[Supabase RPC] Successfully retrieved ${response.data.length} milestone records`)
        return response.data
    } catch (error) {
        console.error(`[Supabase RPC] Error fetching snapshot data for project ${projectId}:`, error)
        if (axios.isAxiosError(error)) {
            console.error(`[Supabase RPC] Response status: ${error.response?.status}`)
            console.error(`[Supabase RPC] Response data:`, error.response?.data)
        }
        return []
    }
}

export default async (req: Request, context: Context) => {
    console.log('🚀 Catalyst proposals background function started')
    console.log('📅 Timestamp:', new Date().toISOString())

    const url = new URL(req.url)
    const projectIds = url.searchParams.get('projectIds') || ''

    console.log('🔍 Request URL:', req.url)
    console.log('📋 Project IDs from query params:', projectIds)

    if (!projectIds) {
        console.log('❌ No projectIds provided, returning 400 error')
        return new Response(
            JSON.stringify({ error: 'Missing projectIds parameter' }),
            {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            }
        )
    }

    // Parse comma-separated project IDs
    const PROJECT_IDS = projectIds.split(',').map(id => id.trim())
    console.log('📝 Parsed project IDs:', PROJECT_IDS)

    try {
        console.log('🔄 Starting to process Catalyst data for projects:', PROJECT_IDS)
        console.log('🔧 Environment check - Supabase URL (upsert):', supabaseUrl ? '✅ Set' : '❌ Missing')
        console.log('🔧 Environment check - CATALYST_SUPABASE_URL (fetch):', catalystSupabaseUrl ? '✅ Set' : '❌ Missing')
        console.log('🔧 Environment check - LIDO_CSRF_TOKEN:', LIDO_CSRF_TOKEN ? '✅ Set' : '❌ Missing')

        const processedProjects = []
        const successfulUserIds = new Set<number>()
        const failedTitles: Array<{ projectId: string, title: string, fundNumber: string | null }> = []

        // First pass: Try direct title matching
        console.log('\n🔄 FIRST PASS: Direct title matching')
        for (const projectId of PROJECT_IDS) {
            console.log(`\n📊 Processing project ID: ${projectId}`)

            const projectDetails = await getProposalDetails(projectId)
            if (!projectDetails) {
                console.log(`❌ No project details found for project ${projectId}, skipping`)
                continue
            }

            console.log(`✅ Found project details for "${projectDetails.title}"`)

            // Determine fund number from challenges
            let fundNumber = null
            if (projectDetails.challenges && (projectDetails.challenges as any).title) {
                fundNumber = extractFundNumberFromChallenges(projectDetails.challenges as any)
                if (fundNumber) {
                    console.log(`[Fund] Extracted fund number ${fundNumber} from challenges: ${(projectDetails.challenges as any).title}`)
                } else {
                    console.log(`[Fund] Could not extract fund number from challenges: ${(projectDetails.challenges as any).title}`)
                }
            } else {
                console.log(`[Fund] No challenges data available for project ${projectId}`)
            }

            // If not found in challenges, try to get fund number from category
            if (!fundNumber) {
                const category = (projectDetails.challenges as any)?.title || ''
                const catMatch = category.match(/^F(\d+)/i)
                if (catMatch) {
                    fundNumber = catMatch[1]
                    console.log(`[Fund] Extracted fund number ${fundNumber} from category: ${category}`)
                } else {
                    console.log(`[Fund] Could not extract fund number from category: ${category}`)
                }
            }

            // Last fallback: use all digits to the left of the last 5 digits of project_id
            if (!fundNumber && projectDetails.project_id) {
                const pidStr = String(projectDetails.project_id)
                if (pidStr.length > 5) {
                    fundNumber = pidStr.substring(0, pidStr.length - 5)
                    console.log(`[Fund] Extracted fund number ${fundNumber} from project_id: ${projectDetails.project_id}`)
                } else {
                    console.log(`[Fund] Project ID too short for fund extraction: ${projectDetails.project_id}`)
                }
            }

            console.log(`[Fund] Final fund number: ${fundNumber || 'NOT FOUND'}`)

            // Extract category from challenges data
            let categorySlug = null
            if (projectDetails.challenges && (projectDetails.challenges as any).title) {
                categorySlug = extractCategoryFromChallenges(projectDetails.challenges as any)
                if (categorySlug) {
                    console.log(`[Category] Extracted category slug "${categorySlug}" from challenges: ${(projectDetails.challenges as any).title}`)
                } else {
                    console.log(`[Category] Could not extract category slug from challenges: ${(projectDetails.challenges as any).title}`)
                }
            } else {
                console.log(`[Category] No challenges data available for category extraction`)
            }

            // Generate the proper Catalyst URL with fund number and category
            let url = ''
            if (fundNumber && projectDetails.title && categorySlug) {
                url = generateCatalystUrl(projectDetails.title, fundNumber, categorySlug)
                console.log(`[URL] Generated Catalyst URL for "${projectDetails.title}": ${url}`)
            } else {
                console.log(`[URL] Could not generate URL - missing: fundNumber=${!!fundNumber}, title=${!!projectDetails.title}, categorySlug=${!!categorySlug}`)
            }

            // Fetch voting metrics if we have fund number and title
            let voting = null
            let userId = null
            if (fundNumber && projectDetails.title) {
                console.log(`[Metrics] Fetching metrics for project "${projectDetails.title}" (ID: ${projectId})`)
                try {
                    const metrics = await getProposalMetrics({
                        fundNumber,
                        title: projectDetails.title,
                        csrfToken: LIDO_CSRF_TOKEN
                    })
                    // Create voting data without user_id for Supabase storage
                    voting = {
                        proposalId: metrics.proposalId,
                        yes_votes_count: metrics.yes_votes_count,
                        no_votes_count: metrics.no_votes_count,
                        abstain_votes_count: metrics.abstain_votes_count,
                        unique_wallets: metrics.unique_wallets
                    }
                    userId = metrics.user_id

                    if (userId) {
                        successfulUserIds.add(userId)
                        console.log(`[User ID] ✅ Tracked successful user ID: ${userId}`)
                    } else {
                        console.log(`[User ID] ❌ No user ID found in successful metrics for "${projectDetails.title}"`)
                    }

                    console.log(`[Metrics] Successfully fetched metrics for project "${projectDetails.title}":`, {
                        proposalId: metrics.proposalId,
                        yes_votes: metrics.yes_votes_count,
                        no_votes: metrics.no_votes_count,
                        abstain_votes: metrics.abstain_votes_count,
                        unique_wallets: metrics.unique_wallets,
                        user_id: metrics.user_id
                    })
                } catch (err) {
                    console.error(`[Metrics] Failed to fetch voting metrics for "${projectDetails.title}":`, err)
                    // Track failed titles for second pass
                    failedTitles.push({
                        projectId,
                        title: projectDetails.title,
                        fundNumber
                    })
                }
            } else {
                console.log(`[Metrics] Skipping metrics fetch - missing fundNumber or title`)
                // Track failed titles for second pass
                failedTitles.push({
                    projectId,
                    title: projectDetails.title,
                    fundNumber
                })
            }

            // Fetch milestone data
            console.log(`[Milestones] Fetching snapshot data for project ${projectId}`)
            const snapshotData = await fetchSnapshotData(projectId)
            console.log(`[Milestones] Retrieved ${snapshotData.length} milestone records`)

            const milestonesCompleted = snapshotData.filter(
                (m: any) => m.som_signoff_count > 0 && m.poa_signoff_count > 0
            ).length
            console.log(`[Milestones] Found ${milestonesCompleted} completed milestones`)

            // Prepare data for Supabase
            const supabaseData = {
                id: projectDetails.id,
                title: projectDetails.title,
                budget: projectDetails.budget,
                milestones_qty: projectDetails.milestones_qty,
                funds_distributed: projectDetails.funds_distributed,
                project_id: projectDetails.project_id,
                challenges: projectDetails.challenges,
                name: projectDetails.title,
                category: (projectDetails.challenges as any)?.title || '',
                url: url,
                status: 'In Progress',
                finished: '',
                voting: voting,
                updated_at: new Date().toISOString()
            }

            console.log(`[Supabase] Preparing to upsert data for project ${projectId}:`, {
                title: supabaseData.title,
                budget: supabaseData.budget,
                project_id: supabaseData.project_id,
                has_voting_data: !!supabaseData.voting,
                has_challenges: !!supabaseData.challenges
            })

            // Upsert data to Supabase
            const { data, error } = await supabaseUpsert
                .from('catalyst_proposals')
                .upsert(supabaseData, {
                    onConflict: 'project_id'
                })

            if (error) {
                console.error(`❌ Failed to save project ${projectId} to Supabase:`, error)
                continue
            }

            processedProjects.push(supabaseData)
            console.log(`✅ Successfully saved project ${projectId} to Supabase`)
        }

        // Second pass: Try matching failed titles using user IDs
        console.log(`\n🔄 SECOND PASS: User ID matching`)
        console.log(`📊 Successful user IDs collected: ${Array.from(successfulUserIds)}`)
        console.log(`📊 Failed titles to retry: ${failedTitles.length}`)
        console.log(`📋 Failed titles details:`, failedTitles.map(ft => ({ projectId: ft.projectId, title: ft.title, fundNumber: ft.fundNumber })))

        if (successfulUserIds.size > 0 && failedTitles.length > 0) {
            console.log(`[Second Pass] ✅ Proceeding with second pass - have ${successfulUserIds.size} user IDs and ${failedTitles.length} failed titles`)
        } else {
            console.log(`[Second Pass] ❌ Skipping second pass - no successful user IDs (${successfulUserIds.size}) or no failed titles (${failedTitles.length})`)
        }

        if (successfulUserIds.size > 0 && failedTitles.length > 0) {
            // Get all proposals for each successful user ID
            const userProposalsMap = new Map<number, any[]>()

            for (const userId of successfulUserIds) {
                console.log(`\n[User Search] Fetching proposals for user ID: ${userId}`)
                const userProposals = await getProposalsByUserId(userId, LIDO_CSRF_TOKEN)
                userProposalsMap.set(userId, userProposals)
                console.log(`[User Search] Retrieved ${userProposals.length} proposals for user ${userId}`)

                if (userProposals.length > 0) {
                    console.log(`[User Search] Sample proposal titles for user ${userId}:`, userProposals.slice(0, 3).map(p => p.title))
                }
            }

            // Try to match failed titles with user proposals
            for (const failedTitle of failedTitles) {
                console.log(`\n[Retry] Attempting to match failed title: "${failedTitle.title}"`)

                let bestMatch = null
                let bestUserId = null

                // Try to find a match across all user proposals
                for (const [userId, proposals] of userProposalsMap) {
                    const match = findProposalByTitle(proposals, failedTitle.title)
                    if (match) {
                        bestMatch = match
                        bestUserId = userId
                        console.log(`[Retry] Found match for "${failedTitle.title}" in user ${userId}: "${match.title}"`)
                        break
                    }
                }

                if (bestMatch && bestUserId) {
                    console.log(`[Retry] Successfully matched "${failedTitle.title}" with "${bestMatch.title}" from user ${bestUserId}`)

                    // Get the original project details again
                    const projectDetails = await getProposalDetails(failedTitle.projectId)
                    if (!projectDetails) {
                        console.log(`[Retry] Could not get project details for ${failedTitle.projectId}, skipping`)
                        continue
                    }

                    // Extract category and generate URL (reuse the same logic)
                    let categorySlug = null
                    if (projectDetails.challenges && (projectDetails.challenges as any).title) {
                        categorySlug = extractCategoryFromChallenges(projectDetails.challenges as any)
                    }

                    let url = ''
                    if (failedTitle.fundNumber && projectDetails.title && categorySlug) {
                        url = generateCatalystUrl(projectDetails.title, failedTitle.fundNumber, categorySlug)
                    }

                    // Create voting data from the matched proposal
                    const voting = {
                        proposalId: bestMatch.id,
                        yes_votes_count: bestMatch.yes_votes_count,
                        no_votes_count: bestMatch.no_votes_count,
                        abstain_votes_count: bestMatch.abstain_votes_count,
                        unique_wallets: bestMatch.unique_wallets
                    }

                    // Fetch milestone data
                    const snapshotData = await fetchSnapshotData(failedTitle.projectId)
                    const milestonesCompleted = snapshotData.filter(
                        (m: any) => m.som_signoff_count > 0 && m.poa_signoff_count > 0
                    ).length

                    // Prepare data for Supabase
                    const supabaseData = {
                        id: projectDetails.id,
                        title: projectDetails.title,
                        budget: projectDetails.budget,
                        milestones_qty: projectDetails.milestones_qty,
                        funds_distributed: projectDetails.funds_distributed,
                        project_id: projectDetails.project_id,
                        challenges: projectDetails.challenges,
                        name: projectDetails.title,
                        category: (projectDetails.challenges as any)?.title || '',
                        url: url,
                        status: 'In Progress',
                        finished: '',
                        voting: voting,
                        updated_at: new Date().toISOString()
                    }

                    // Update the existing record in Supabase
                    const { data, error } = await supabaseUpsert
                        .from('catalyst_proposals')
                        .upsert(supabaseData, {
                            onConflict: 'project_id'
                        })

                    if (error) {
                        console.error(`[Retry] Failed to update project ${failedTitle.projectId} in Supabase:`, error)
                    } else {
                        console.log(`[Retry] ✅ Successfully updated project ${failedTitle.projectId} with voting data`)
                        // Update the processed projects list
                        const existingIndex: number = processedProjects.findIndex(p => p.project_id === failedTitle.projectId)
                        if (existingIndex >= 0) {
                            processedProjects[existingIndex] = supabaseData
                        } else {
                            processedProjects.push(supabaseData)
                        }
                    }
                } else {
                    console.log(`[Retry] Could not find match for "${failedTitle.title}" in any user proposals`)
                }
            }
        }

        console.log(`\n🎉 Successfully processed ${processedProjects.length} out of ${PROJECT_IDS.length} Catalyst projects`)
        console.log('📊 Final processed projects:', processedProjects.map(p => ({ id: p.project_id, title: p.title })))

        return new Response(
            JSON.stringify({
                success: true,
                message: 'Catalyst proposals fetched and saved successfully',
                processed_count: processedProjects.length,
                projects: processedProjects,
                successful_user_ids: Array.from(successfulUserIds),
                failed_titles_count: failedTitles.length
            }),
            {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            }
        )
    } catch (err) {
        console.error('❌ Failed to process Catalyst proposals:', err)
        console.error('🔍 Error details:', {
            name: err instanceof Error ? err.name : 'Unknown',
            message: err instanceof Error ? err.message : 'Unknown error',
            stack: err instanceof Error ? err.stack : undefined
        })
        return new Response(
            JSON.stringify({
                error: 'Internal Server Error',
                details: err instanceof Error ? err.message : 'Unknown error'
            }),
            {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            }
        )
    }
} 
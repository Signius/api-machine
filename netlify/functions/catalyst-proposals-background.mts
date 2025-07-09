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
    const { data: detail } = await detailRes.json() as { data: any }

    const {
        yes_votes_count,
        no_votes_count,
        abstain_votes_count,
        unique_wallets
    } = detail

    console.log(`[Lido API] Successfully retrieved voting metrics:`, {
        yes_votes: yes_votes_count,
        no_votes: no_votes_count,
        abstain_votes: abstain_votes_count,
        unique_wallets
    })

    return { proposalId, yes_votes_count, no_votes_count, abstain_votes_count, unique_wallets }
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
            if (fundNumber && projectDetails.title) {
                console.log(`[Metrics] Fetching metrics for project "${projectDetails.title}" (ID: ${projectId})`)
                try {
                    const metrics = await getProposalMetrics({
                        fundNumber,
                        title: projectDetails.title,
                        csrfToken: LIDO_CSRF_TOKEN
                    })
                    voting = metrics
                    console.log(`[Metrics] Successfully fetched metrics for project "${projectDetails.title}":`, {
                        proposalId: metrics.proposalId,
                        yes_votes: metrics.yes_votes_count,
                        no_votes: metrics.no_votes_count,
                        abstain_votes: metrics.abstain_votes_count,
                        unique_wallets: metrics.unique_wallets
                    })
                } catch (err) {
                    console.error(`[Metrics] Failed to fetch voting metrics for "${projectDetails.title}":`, err)
                }
            } else {
                console.log(`[Metrics] Skipping metrics fetch - missing fundNumber or title`)
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

        console.log(`\n🎉 Successfully processed ${processedProjects.length} out of ${PROJECT_IDS.length} Catalyst projects`)
        console.log('📊 Final processed projects:', processedProjects.map(p => ({ id: p.project_id, title: p.title })))

        return new Response(
            JSON.stringify({
                success: true,
                message: 'Catalyst proposals fetched and saved successfully',
                processed_count: processedProjects.length,
                projects: processedProjects
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
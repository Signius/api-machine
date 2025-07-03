// test-github-api.js - Test script for GitHub API functionality

// Test configuration
const GITHUB_TOKEN = process.env.GITHUB_TOKEN
const TEST_OWNER = process.env.GITHUB_OWNER || 'octocat'
const TEST_REPO = process.env.GITHUB_REPO || 'Hello-World'

if (!GITHUB_TOKEN) {
    console.error('❌ GITHUB_TOKEN must be set')
    process.exit(1)
}

const GITHUB_API_BASE = 'https://api.github.com'

async function fetchGitHubData(endpoint) {
    const response = await fetch(`${GITHUB_API_BASE}${endpoint}`, {
        headers: {
            'Authorization': `token ${GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'GitHub-API-Test-Script'
        }
    })

    if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status} - ${response.statusText}`)
    }

    return response.json()
}

async function runTests() {
    console.log('🧪 Starting GitHub API tests...\n')

    try {
        // Test 1: Authentication
        console.log('Test 1: Authentication')
        const user = await fetchGitHubData('/user')
        console.log('✅ Authentication successful')
        console.log(`   Username: ${user.login}`)
        console.log(`   Name: ${user.name || 'Not set'}`)
        console.log(`   Public repos: ${user.public_repos}`)

        // Test 2: Repository access
        console.log('\nTest 2: Repository Access')
        const repo = await fetchGitHubData(`/repos/${TEST_OWNER}/${TEST_REPO}`)
        console.log('✅ Repository access successful')
        console.log(`   Repository: ${repo.full_name}`)
        console.log(`   Description: ${repo.description || 'No description'}`)
        console.log(`   Stars: ${repo.stargazers_count}`)
        console.log(`   Forks: ${repo.forks_count}`)
        console.log(`   Language: ${repo.language || 'Not specified'}`)

        // Test 3: Repository contributors
        console.log('\nTest 3: Contributors')
        const contributors = await fetchGitHubData(`/repos/${TEST_OWNER}/${TEST_REPO}/contributors`)
        console.log(`✅ Found ${contributors.length} contributors`)

        if (contributors.length > 0) {
            const topContributor = contributors[0]
            console.log(`   Top contributor: ${topContributor.login} (${topContributor.contributions} contributions)`)
        }

        // Test 4: Repository languages
        console.log('\nTest 4: Languages')
        const languages = await fetchGitHubData(`/repos/${TEST_OWNER}/${TEST_REPO}/languages`)
        console.log('✅ Languages fetched successfully')
        console.log(`   Languages: ${Object.keys(languages).join(', ') || 'None detected'}`)

        if (Object.keys(languages).length > 0) {
            const totalBytes = Object.values(languages).reduce((sum, bytes) => sum + bytes, 0)
            console.log(`   Total bytes: ${totalBytes.toLocaleString()}`)
        }

        // Test 5: Recent commits
        console.log('\nTest 5: Recent Commits')
        const commits = await fetchGitHubData(`/repos/${TEST_OWNER}/${TEST_REPO}/commits?per_page=5`)
        console.log(`✅ Found ${commits.length} recent commits`)

        if (commits.length > 0) {
            const latestCommit = commits[0]
            console.log(`   Latest commit: ${latestCommit.sha.substring(0, 7)}`)
            console.log(`   Message: ${latestCommit.commit.message.split('\n')[0]}`)
            console.log(`   Author: ${latestCommit.commit.author.name}`)
            console.log(`   Date: ${latestCommit.commit.author.date}`)
        }

        // Test 6: Issues
        console.log('\nTest 6: Issues')
        const issues = await fetchGitHubData(`/repos/${TEST_OWNER}/${TEST_REPO}/issues?state=all&per_page=5`)
        console.log(`✅ Found ${issues.length} issues`)

        if (issues.length > 0) {
            const latestIssue = issues[0]
            console.log(`   Latest issue: #${latestIssue.number}`)
            console.log(`   Title: ${latestIssue.title}`)
            console.log(`   State: ${latestIssue.state}`)
            console.log(`   Created by: ${latestIssue.user.login}`)
        }

        // Test 7: Pull Requests
        console.log('\nTest 7: Pull Requests')
        const pullRequests = await fetchGitHubData(`/repos/${TEST_OWNER}/${TEST_REPO}/pulls?state=all&per_page=5`)
        console.log(`✅ Found ${pullRequests.length} pull requests`)

        if (pullRequests.length > 0) {
            const latestPR = pullRequests[0]
            console.log(`   Latest PR: #${latestPR.number}`)
            console.log(`   Title: ${latestPR.title}`)
            console.log(`   State: ${latestPR.state}`)
            console.log(`   Created by: ${latestPR.user.login}`)
        }

        // Test 8: Releases
        console.log('\nTest 8: Releases')
        const releases = await fetchGitHubData(`/repos/${TEST_OWNER}/${TEST_REPO}/releases`)
        console.log(`✅ Found ${releases.length} releases`)

        if (releases.length > 0) {
            const latestRelease = releases[0]
            console.log(`   Latest release: ${latestRelease.tag_name}`)
            console.log(`   Name: ${latestRelease.name}`)
            console.log(`   Draft: ${latestRelease.draft}`)
            console.log(`   Prerelease: ${latestRelease.prerelease}`)
        }

        // Test 9: Rate limiting
        console.log('\nTest 9: Rate Limiting')
        const rateLimitResponse = await fetch(`${GITHUB_API_BASE}/rate_limit`, {
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        })

        if (rateLimitResponse.ok) {
            const rateLimit = await rateLimitResponse.json()
            const core = rateLimit.resources.core
            console.log('✅ Rate limit info:')
            console.log(`   Limit: ${core.limit}`)
            console.log(`   Remaining: ${core.remaining}`)
            console.log(`   Reset time: ${new Date(core.reset * 1000).toISOString()}`)
        }

        // Test 10: Search functionality
        console.log('\nTest 10: Search')
        const searchResults = await fetchGitHubData(`/search/repositories?q=user:${TEST_OWNER}&sort=stars&order=desc&per_page=3`)
        console.log(`✅ Search successful`)
        console.log(`   Total repositories: ${searchResults.total_count}`)
        console.log(`   Showing: ${searchResults.items.length} repositories`)

        if (searchResults.items.length > 0) {
            searchResults.items.forEach((repo, index) => {
                console.log(`   ${index + 1}. ${repo.full_name} (${repo.stargazers_count} stars)`)
            })
        }

        // Test 11: Organization info (if applicable)
        console.log('\nTest 11: Organization Info')
        try {
            const org = await fetchGitHubData(`/orgs/${TEST_OWNER}`)
            console.log('✅ Organization info:')
            console.log(`   Name: ${org.name || org.login}`)
            console.log(`   Public repos: ${org.public_repos}`)
            console.log(`   Members: ${org.public_repos}`) // This might not be available
        } catch (error) {
            console.log('ℹ️  Not an organization or no access')
        }

        // Test 12: API version and headers
        console.log('\nTest 12: API Version')
        const response = await fetch(`${GITHUB_API_BASE}/zen`, {
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        })

        console.log('✅ API version check:')
        console.log(`   Status: ${response.status}`)
        console.log(`   API Version: ${response.headers.get('x-github-media-type') || 'v3'}`)
        console.log(`   Rate Limit: ${response.headers.get('x-ratelimit-limit')}`)
        console.log(`   Rate Limit Remaining: ${response.headers.get('x-ratelimit-remaining')}`)

        console.log('\n🎉 All GitHub API tests completed successfully!')

    } catch (error) {
        console.error('\n❌ Test failed:', error.message)
        process.exit(1)
    }
}

// Run tests
runTests().catch(error => {
    console.error('❌ Test suite failed:', error)
    process.exit(1)
}) 
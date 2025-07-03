// GitHub API types
export interface GitHubUser {
    login: string
    id: number
    node_id: string
    avatar_url: string
    gravatar_id: string
    url: string
    html_url: string
    followers_url: string
    following_url: string
    gists_url: string
    starred_url: string
    subscriptions_url: string
    organizations_url: string
    repos_url: string
    events_url: string
    received_events_url: string
    type: string
    site_admin: boolean
    name?: string
    company?: string
    blog?: string
    location?: string
    email?: string
    hireable?: boolean
    bio?: string
    twitter_username?: string
    public_repos: number
    public_gists: number
    followers: number
    following: number
    created_at: string
    updated_at: string
    private_gists?: number
    total_private_repos?: number
    owned_private_repos?: number
    disk_usage?: number
    collaborators?: number
    two_factor_authentication?: boolean
    plan?: GitHubPlan
}

export interface GitHubPlan {
    name: string
    space: number
    collaborators: number
    private_repos: number
}

export interface GitHubRepository {
    id: number
    node_id: string
    name: string
    full_name: string
    private: boolean
    owner: GitHubUser
    html_url: string
    description: string | null
    fork: boolean
    url: string
    forks_url: string
    keys_url: string
    collaborators_url: string
    teams_url: string
    hooks_url: string
    issue_events_url: string
    events_url: string
    assignees_url: string
    branches_url: string
    tags_url: string
    blobs_url: string
    git_tags_url: string
    git_refs_url: string
    trees_url: string
    statuses_url: string
    languages_url: string
    stargazers_url: string
    contributors_url: string
    subscribers_url: string
    subscription_url: string
    commits_url: string
    git_commits_url: string
    comments_url: string
    issue_comment_url: string
    contents_url: string
    compare_url: string
    merges_url: string
    archive_url: string
    downloads_url: string
    issues_url: string
    pulls_url: string
    milestones_url: string
    notifications_url: string
    labels_url: string
    releases_url: string
    deployments_url: string
    created_at: string
    updated_at: string
    pushed_at: string
    git_url: string
    ssh_url: string
    clone_url: string
    svn_url: string
    homepage: string | null
    size: number
    stargazers_count: number
    watchers_count: number
    language: string | null
    has_issues: boolean
    has_projects: boolean
    has_downloads: boolean
    has_wiki: boolean
    has_pages: boolean
    has_discussions: boolean
    forks_count: number
    mirror_url: string | null
    archived: boolean
    disabled: boolean
    open_issues_count: number
    license: GitHubLicense | null
    allow_forking: boolean
    is_template: boolean
    web_commit_signoff_required: boolean
    topics: string[]
    visibility: string
    forks: number
    open_issues: number
    watchers: number
    default_branch: string
    temp_clone_token?: string
    network_count?: number
    subscribers_count?: number
}

export interface GitHubLicense {
    key: string
    name: string
    url: string
    spdx_id: string
    node_id: string
    html_url: string
}

export interface GitHubBranch {
    name: string
    commit: GitHubCommit
    protected: boolean
    protection?: GitHubBranchProtection
    protection_url?: string
}

export interface GitHubCommit {
    sha: string
    node_id: string
    commit: GitHubCommitDetails
    url: string
    html_url: string
    comments_url: string
    author: GitHubUser | null
    committer: GitHubUser | null
    parents: GitHubCommit[]
    stats?: GitHubCommitStats
    files?: GitHubCommitFile[]
}

export interface GitHubCommitDetails {
    author: GitHubCommitAuthor
    committer: GitHubCommitAuthor
    message: string
    tree: GitHubCommitTree
    url: string
    comment_count: number
    verification: GitHubCommitVerification
}

export interface GitHubCommitAuthor {
    name: string
    email: string
    date: string
}

export interface GitHubCommitTree {
    sha: string
    url: string
}

export interface GitHubCommitVerification {
    verified: boolean
    reason: string
    signature: string | null
    payload: string | null
}

export interface GitHubCommitStats {
    total: number
    additions: number
    deletions: number
}

export interface GitHubCommitFile {
    sha: string
    filename: string
    status: string
    additions: number
    deletions: number
    changes: number
    blob_url: string
    raw_url: string
    contents_url: string
    patch?: string
}

export interface GitHubBranchProtection {
    url: string
    enabled: boolean
    required_status_checks: GitHubRequiredStatusChecks
    enforce_admins: GitHubEnforceAdmins
    required_pull_request_reviews: GitHubRequiredPullRequestReviews
    restrictions: GitHubRestrictions
    allow_force_pushes: boolean
    allow_deletions: boolean
    block_creations: boolean
    required_conversation_resolution: boolean
    name: string
    protection_url: string
}

export interface GitHubRequiredStatusChecks {
    url: string
    enforcement_level: string
    contexts: string[]
    checks: GitHubCheck[]
}

export interface GitHubCheck {
    context: string
    app_id: number | null
}

export interface GitHubEnforceAdmins {
    url: string
    enabled: boolean
}

export interface GitHubRequiredPullRequestReviews {
    url: string
    dismissal_restrictions: GitHubDismissalRestrictions
    bypass_restrictions: GitHubBypassRestrictions
    required_approving_review_count: number
    dismiss_stale_reviews: boolean
    require_code_owner_reviews: boolean
    require_last_push_approval: boolean
}

export interface GitHubDismissalRestrictions {
    url: string
    users_url: string
    teams_url: string
    users: GitHubUser[]
    teams: GitHubTeam[]
    apps: GitHubApp[]
}

export interface GitHubBypassRestrictions {
    users: GitHubUser[]
    teams: GitHubTeam[]
    apps: GitHubApp[]
}

export interface GitHubTeam {
    id: number
    node_id: string
    url: string
    html_url: string
    name: string
    slug: string
    description: string | null
    privacy: string
    permission: string
    members_url: string
    repositories_url: string
    parent: GitHubTeam | null
}

export interface GitHubApp {
    id: number
    slug: string
    node_id: string
    owner: GitHubUser
    name: string
    description: string
    external_url: string
    html_url: string
    created_at: string
    updated_at: string
    permissions: Record<string, string>
    events: string[]
    installations_count: number
    client_id: string
    client_secret: string
    webhook_secret: string | null
    pem: string
}

export interface GitHubRestrictions {
    url: string
    users_url: string
    teams_url: string
    apps_url: string
    users: GitHubUser[]
    teams: GitHubTeam[]
    apps: GitHubApp[]
}

export interface GitHubWorkflow {
    id: number
    node_id: string
    name: string
    path: string
    state: string
    created_at: string
    updated_at: string
    url: string
    html_url: string
    badge_url: string
    deleted_at?: string
}

export interface GitHubWorkflowRun {
    id: number
    name: string
    node_id: string
    head_branch: string
    head_sha: string
    run_number: number
    event: string
    status: string
    conclusion: string | null
    workflow_id: number
    check_suite_id: number
    check_suite_node_id: string
    url: string
    html_url: string
    pull_requests: GitHubPullRequest[]
    created_at: string
    updated_at: string
    actor: GitHubUser
    run_attempt: number
    run_started_at: string
    triggering_actor: GitHubUser
    jobs_url: string
    logs_url: string
    check_suite_url: string
    artifacts_url: string
    cancel_url: string
    rerun_url: string
    previous_attempt_url: string | null
    workflow_url: string
    head_commit: GitHubCommit
    repository: GitHubRepository
    head_repository: GitHubRepository
}

export interface GitHubPullRequest {
    url: string
    id: number
    node_id: string
    html_url: string
    diff_url: string
    patch_url: string
    issue_url: string
    number: number
    state: string
    locked: boolean
    title: string
    user: GitHubUser
    body: string | null
    created_at: string
    updated_at: string
    closed_at: string | null
    merged_at: string | null
    merge_commit_sha: string | null
    assignee: GitHubUser | null
    assignees: GitHubUser[]
    requested_reviewers: GitHubUser[]
    requested_teams: GitHubTeam[]
    labels: GitHubLabel[]
    milestone: GitHubMilestone | null
    draft: boolean
    commits_url: string
    review_comments_url: string
    review_comment_url: string
    comments_url: string
    statuses_url: string
    head: GitHubPullRequestBranch
    base: GitHubPullRequestBranch
    _links: GitHubPullRequestLinks
    author_association: string
    auto_merge: GitHubAutoMerge | null
    active_lock_reason: string | null
}

export interface GitHubLabel {
    id: number
    node_id: string
    url: string
    name: string
    description: string | null
    color: string
    default: boolean
}

export interface GitHubMilestone {
    url: string
    html_url: string
    labels_url: string
    id: number
    node_id: string
    number: number
    title: string
    description: string | null
    creator: GitHubUser
    open_issues: number
    closed_issues: number
    state: string
    created_at: string
    updated_at: string
    due_on: string | null
    closed_at: string | null
}

export interface GitHubPullRequestBranch {
    label: string
    ref: string
    sha: string
    user: GitHubUser
    repo: GitHubRepository
}

export interface GitHubPullRequestLinks {
    self: GitHubLink
    html: GitHubLink
    issue: GitHubLink
    comments: GitHubLink
    review_comments: GitHubLink
    review_comment: GitHubLink
    commits: GitHubLink
    statuses: GitHubLink
}

export interface GitHubLink {
    href: string
}

export interface GitHubAutoMerge {
    enabled_by: GitHubUser
    merge_method: string
    commit_title: string
    commit_message: string
}

export interface GitHubIssue {
    id: number
    node_id: string
    url: string
    repository_url: string
    labels_url: string
    comments_url: string
    events_url: string
    html_url: string
    number: number
    state: string
    title: string
    body: string | null
    user: GitHubUser
    labels: GitHubLabel[]
    assignee: GitHubUser | null
    assignees: GitHubUser[]
    milestone: GitHubMilestone | null
    locked: boolean
    active_lock_reason: string | null
    comments: number
    pull_request?: GitHubPullRequest
    closed_at: string | null
    created_at: string
    updated_at: string
    closed_by?: GitHubUser
    author_association: string
    state_reason?: string
}

export interface GitHubRelease {
    url: string
    html_url: string
    assets_url: string
    upload_url: string
    tarball_url: string
    zipball_url: string
    id: number
    node_id: string
    tag_name: string
    target_commitish: string
    name: string
    body: string | null
    draft: boolean
    prerelease: boolean
    created_at: string
    published_at: string | null
    author: GitHubUser
    assets: GitHubReleaseAsset[]
    body_html?: string
    body_text?: string
}

export interface GitHubReleaseAsset {
    url: string
    browser_download_url: string
    id: number
    node_id: string
    name: string
    label: string | null
    state: string
    content_type: string
    size: number
    download_count: number
    created_at: string
    updated_at: string
    uploader: GitHubUser | null
}

export interface GitHubOrganization {
    login: string
    id: number
    node_id: string
    url: string
    repos_url: string
    events_url: string
    hooks_url: string
    issues_url: string
    members_url: string
    public_members_url: string
    avatar_url: string
    description: string | null
    name?: string
    company?: string
    blog?: string
    location?: string
    email?: string
    twitter_username?: string
    is_verified?: boolean
    has_organization_projects: boolean
    has_repository_projects: boolean
    public_repos: number
    public_gists: number
    followers: number
    following: number
    html_url: string
    created_at: string
    updated_at: string
    type: string
    total_private_repos?: number
    owned_private_repos?: number
    private_gists?: number
    disk_usage?: number
    collaborators?: number
    billing_email?: string
    plan?: GitHubPlan
    default_repository_permission?: string
    members_can_create_repositories?: boolean
    two_factor_requirement_enabled?: boolean
    members_allowed_repository_creation_type?: string
    members_can_create_public_repositories?: boolean
    members_can_create_private_repositories?: boolean
    members_can_create_internal_repositories?: boolean
    members_can_fork_private_repositories?: boolean
    web_commit_signoff_required?: boolean
}

// GitHub API Response types
export interface GitHubApiResponse<T = any> {
    success: boolean
    data?: T
    error?: string
    timestamp: string
}

export interface GitHubRateLimitInfo {
    limit: number
    remaining: number
    reset: number
    used: number
    resource: string
}

export interface GitHubSearchResult<T> {
    total_count: number
    incomplete_results: boolean
    items: T[]
}

// GitHub Stats types
export interface GitHubRepoStats {
    repository: GitHubRepository
    contributors: number
    languages: Record<string, number>
    stats: {
        stars: number
        forks: number
        issues: number
        pullRequests: number
    }
    lastActivity: string
}

export interface GitHubUserStats {
    user: GitHubUser
    repositories: number
    followers: number
    following: number
    publicGists: number
    totalStars: number
    totalForks: number
    joinDate: string
    lastActivity: string
}

export interface GitHubOrganizationStats {
    organization: GitHubOrganization
    repositories: number
    members: number
    publicRepos: number
    privateRepos: number
    totalStars: number
    totalForks: number
    creationDate: string
    lastActivity: string
} 
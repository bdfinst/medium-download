Feature: Medium Blog Scraper
    As a Medium blogger
    I want to export all my published posts as markdown files
    So that I can have a local backup and migrate to other platforms

    Background:
        Given the scraper application is installed
        And I have published blog posts on Medium
        And Medium requires Google OAuth authentication

    Scenario: Initial Google OAuth Authentication
        Given I run the scraper for the first time
        When I execute the authentication command
        Then I should be prompted to authorize with Google
        And the application should open my default browser
        And I should be redirected to Google's OAuth consent screen
        And after granting permission, I should receive an authentication success message
        And the auth tokens should be stored securely for future use

    Scenario: Discover All Published Posts
        Given I am authenticated with Google OAuth
        When I navigate to my Medium profile page
        Then the scraper should identify all published posts
        And it should handle pagination or infinite scroll to load all posts
        And it should extract the URL for each post
        And it should identify the total number of posts to process

    Scenario: Extract Post Content and Metadata
        Given I have a list of Medium post URLs
        When I scrape each individual post
        Then I should extract the complete article content
        And I should capture all metadata including:
            | Field         | Description                 |
            | title         | Main article title          |
            | subtitle      | Article subtitle if present |
            | content       | Full article body in HTML   |
            | publishDate   | Original publication date   |
            | lastModified  | Last modification date      |
            | author        | Author name and profile     |
            | tags          | All associated tags         |
            | readingTime   | Estimated reading time      |
            | claps         | Number of claps received    |
            | responses     | Number of responses         |
            | featuredImage | Main article image URL      |
            | canonicalUrl  | Original Medium URL         |

    Scenario: Convert HTML to Markdown
        Given I have extracted HTML content from Medium posts
        When I convert the content to markdown
        Then the markdown should preserve:
            | Element     | Conversion                         |
            | Headers     | Proper markdown headers (# ## ###) |
            | Paragraphs  | Clean paragraph breaks             |
            | Lists       | Ordered and unordered lists        |
            | Links       | Markdown link format               |
            | Images      | Image references with alt text     |
            | Code blocks | Fenced code blocks with language   |
            | Quotes      | Blockquotes with > prefix          |
            | Emphasis    | Bold and italic formatting         |
            | Tables      | Markdown table format              |
        And special Medium formatting should be handled appropriately
        And embedded content should be converted or noted

    Scenario: Generate Frontmatter Metadata
        Given I have extracted post metadata
        When I create the markdown file
        Then each file should start with YAML frontmatter containing:
            """
            ---
            title: "The Actual Post Title"
            subtitle: "Post subtitle if exists"
            date: "2024-01-15T10:30:00Z"
            lastModified: "2024-01-16T14:22:00Z"
            author: "Author Name"
            tags: ["javascript", "web-development", "tutorial"]
            readingTime: "7 min read"
            claps: 142
            responses: 8
            mediumUrl: "https://medium.com/@username/post-slug-123abc"
            featuredImage: "./images/post-slug-123abc-featured.jpg"
            canonicalUrl: "https://medium.com/@username/post-slug-123abc"
            published: true
            ---
            """

    Scenario: Download and Organize Images
        Given a Medium post contains images
        When I process the post
        Then I should download all images to a local images directory
        And images should be named using the post slug and sequence number
        And image references in markdown should point to local files
        And the directory structure should be:
            """
            output/
            ├── posts/
            │   └── post-title-slug.md
            └── images/
            ├── post-title-slug-featured.jpg
            ├── post-title-slug-01.jpg
            └── post-title-slug-02.png
            """

    Scenario: Handle Authentication Persistence
        Given I have previously authenticated with Google
        When I run the scraper again
        Then it should use stored authentication tokens
        And it should automatically refresh expired tokens
        And it should only prompt for re-authentication if refresh fails

    Scenario: Error Handling and Recovery
        Given the scraping process encounters errors
        When a network error occurs
        Then the scraper should implement retry logic with exponential backoff
        When a post is private or deleted
        Then it should log the issue and continue with other posts
        When rate limiting is detected
        Then it should pause and resume after the appropriate delay
        When the process is interrupted
        Then it should save progress and allow resuming from the last successful post

    Scenario: Incremental Updates
        Given I have previously scraped my Medium posts
        When I run the scraper again
        Then it should check for new posts since the last run
        And it should update existing posts that have been modified
        And it should skip unchanged posts to improve performance
        And it should maintain a metadata file tracking the last scrape date

    Scenario: Configuration and Customization
        Given I want to customize the scraping behavior
        When I create a configuration file
        Then I should be able to specify:
            | Setting         | Description                                  |
            | outputDirectory | Where to save the files                      |
            | namingScheme    | How to name the markdown files               |
            | includeImages   | Whether to download images                   |
            | dateFilter      | Only scrape posts from specific date range   |
            | tagFilter       | Only scrape posts with specific tags         |
            | concurrency     | Number of simultaneous downloads             |
            | retryAttempts   | Number of retry attempts for failed requests |

    Scenario: Progress Reporting and Logging
        Given the scraping process is running
        When processing multiple posts
        Then I should see a progress indicator showing:
            | Information              | Format                               |
            | Current post             | "Processing: 'Post Title' (15/47)"   |
            | Progress percentage      | "32% complete"                       |
            | Estimated time remaining | "~8 minutes remaining"               |
            | Success/failure counts   | "42 successful, 3 failed, 2 skipped" |
        And detailed logs should be written to a log file
        And I should be able to run in verbose or quiet mode

    Scenario: Resume Interrupted Operations
        Given the scraping process was interrupted
        When I restart the scraper
        Then it should detect the previous incomplete operation
        And it should offer to resume from where it left off
        And it should skip already processed posts
        And it should continue with the remaining posts

    Scenario: Validation and Quality Assurance
        Given posts have been scraped and converted
        When the process completes
        Then each markdown file should be valid
        And images should be properly downloaded and linked
        And metadata should be complete and accurate
        And the scraper should report any validation errors or warnings
        And a summary report should show:
            """
            Scraping Summary:
            - Total posts found: 47
            - Successfully processed: 44
            - Failed: 2 (network errors)
            - Skipped: 1 (private post)
            - Images downloaded: 156
            - Total size: 45.2 MB
            - Duration: 8 minutes 32 seconds
            """

    Scenario: Command Line Interface
        Given I want to use the scraper from command line
        When I run the application
        Then I should have access to commands like:
            | Command  | Description                      |
            | scrape   | Start the full scraping process  |
            | auth     | Manage authentication            |
            | config   | Configure settings               |
            | resume   | Resume interrupted operation     |
            | validate | Validate existing markdown files |
            | clean    | Clean up temporary files         |
        And each command should have appropriate help text and options

    Scenario: Handle Large Numbers of Posts
        Given I have more than 100 published posts on Medium
        When I run the scraper
        Then it should efficiently handle the large volume
        And it should use memory efficiently to avoid crashes
        And it should provide progress updates for long-running operations
        And it should allow pausing and resuming the operation

    Scenario: Handle Different Post Types
        Given Medium posts contain various content types
        When I scrape posts with embedded content
        Then it should handle:
            | Content Type          | Handling                        |
            | Code snippets         | Preserve syntax highlighting    |
            | Embedded tweets       | Convert to markdown with link   |
            | YouTube videos        | Convert to markdown link        |
            | GitHub gists          | Convert to code blocks or links |
            | Mathematical formulas | Preserve as text or LaTeX       |
            | Audio embeds          | Convert to markdown links       |
        And it should gracefully handle unsupported embed types

    Scenario: Validate Authentication Before Scraping
        Given I want to start the scraping process
        When I run the scraper
        Then it should first validate my authentication status
        And if authentication is expired, it should refresh tokens automatically
        And if refresh fails, it should prompt for re-authentication
        And only proceed with scraping after successful authentication
        And it should test Medium access before beginning the full scrape

    Scenario: Handle Medium's Rate Limiting
        Given Medium implements rate limiting to prevent abuse
        When the scraper makes requests to Medium
        Then it should respect rate limits by implementing delays between requests
        And it should detect rate limiting responses (429 status codes)
        And it should automatically back off and retry after appropriate delays
        And it should allow configuration of request timing parameters
        And it should log rate limiting encounters for monitoring

    Scenario: Backup and Recovery
        Given I want to ensure data safety during scraping
        When the scraper processes posts
        Then it should create incremental backups of scraped content
        And it should maintain a progress file that can be used for recovery
        And if the process crashes, it should be able to resume from the last checkpoint
        And it should validate the integrity of downloaded files
        And it should provide options to re-download corrupted or incomplete files

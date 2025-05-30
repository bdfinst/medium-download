# Initial Claude prompt

I want to create an application that will scan all of my published blogs on medium.com and download them as markdown
with frontmatter. Medium does not provide an API to do this. Their RSS feed only shows the last 20 posts, but I need all
of the posts. I cannot use a chrome plugin. Medium requires a user to be logged in to see content and uses Google's SSO,
so the tool should allow me to login with my google credentials.

Technical constraints:
We should use vanilla JS with es modules, functional programming, and arrow functions.

Create a prompt and feature file to use with Claude Code

I want claude code reference the feature file and use acceptance test driven development.
It should use eslint and prettier and should fix any linting and style issues after each test passes.

_Note_: I worked with Claude to refine the CLAUDE.md file. For example, it wanted to use Cucumber, so I instructed it to
use Jest with BDD assertions for all testing.

The CLAUDE.md file is the implementation plan and is fully machine generated from the conversation with Claude.

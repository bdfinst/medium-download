#!/bin/bash
# start-claude.sh - Launch Claude Code with project context

# Define the initialization command that Claude Code should run
INIT_CMD=$(cat << 'EOF'
echo "🚀 Loading Medium Scraper Project Context..." && 
echo "" &&
cat CLAUDE.md 2>/dev/null || echo "CLAUDE.md not found" &&
echo "" &&
echo "---" &&
echo "📋 Feature Specifications:" &&
head -50 features/medium-scraper.feature 2>/dev/null || echo "Feature file not found" &&
echo "" &&
echo "🧪 Current Test Status:" &&
npm test -- --listTests 2>/dev/null | head -10 || echo "Tests not configured" &&
echo "" &&
echo "⚡ Quick Commands:" &&
echo "  npm test - Run all tests" &&
echo "  npm run quality - Check code quality" &&
echo "  npm test -- --watch - Watch mode" &&
echo "" &&
echo "✅ Context loaded! Claude Code is ready."
EOF
)

# Launch Claude Code with the initialization command
claude-code --init "$INIT_CMD"

# Alternative: If --init doesn't work, try:
# claude-code --exec "$INIT_CMD"

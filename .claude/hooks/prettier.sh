#!/bin/bash
# Post-edit hook: Format files with Prettier after Claude edits them

# Read JSON input from stdin
input=$(cat)

# Extract file_path from tool_input (works for both Edit and Write)
file_path=$(echo "$input" | jq -r '.tool_input.file_path // empty')

if [ -n "$file_path" ] && [ -f "$file_path" ]; then
  # Run prettier on the file
  npx prettier --write "$file_path" 2>/dev/null
fi

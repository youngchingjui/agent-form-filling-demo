# Transcripts

Short, human-readable records of each session so users and teammates can review what happened.

## Scope

- Capture both sides: user and agent messages.
- Include tool activity relevant to the conversation.
- Store only finalized text (no partial streams).

## Required fields per entry

- Role: user | agent | system | tool
- Timestamp: ISO 8601 in UTC
- Source: voice or text (for user/agent messages)
- Links: optional reference IDs (session, form)

## Display

- In-app transcript lists newest first, grouped by turns.
- Tool actions appear as compact status items beneath the agent’s turn.

## Errors

- Log failures as tool entries with a plain-language message visible to users.


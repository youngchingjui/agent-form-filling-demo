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
- Content summary: concise text of what was said or done
- Links: optional reference IDs (session, form)

## Redaction & privacy

- Mask sensitive values (e.g., SSN, DOB) using schema-driven redaction rules.
- Show placeholders in the transcript (e.g., "[redacted: ssn]").
- Do not store audio; only text derived from it.

## Association

- Every entry links to a session ID and (when applicable) a form ID.
- Tool results that affect the form include the field names touched.

## Display

- In-app transcript lists newest first, grouped by turns.
- Tool actions appear as compact status items beneath the agent’s turn.

## Retention

- Keep transcripts for 30 days by default; configurable per environment.

## Errors

- Log failures as tool entries with a plain-language message visible to users.


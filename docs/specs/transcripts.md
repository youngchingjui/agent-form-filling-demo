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

## Privacy & redaction

- Do not log raw sensitive values (e.g., full SSN, credit card, phone, email). Use schema flags to detect sensitive fields and redact values (e.g., ****** or last 4 only when useful).
- Tool updates are summarized with field names only; no raw values shown in the transcript.
- Audio is not stored; only the final ASR text appears in the transcript.

## Retention

- Default: in-memory for the active session only.
- If persisted for audit/support, keep for a short window (max 7 days) and allow user-initiated deletion.

## Errors

- Log failures as tool entries with a plain-language message visible to users.
- Internal error details (stack traces, IDs) are not shown in the transcript; keep them in server logs only.


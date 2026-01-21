# Agent Tool Calls

Non-obvious rules for how the agent edits the form while talking to the user.

## Goals

- Let the agent fill the form accurately from natural conversation.
- Avoid overwriting user input or committing uncertain data.

## Access & context

- Agent can read the form schema and the latest form data at any time.
- Before writing, the agent should refresh its view of the current form state.

## When to write

- Write only when the extracted value is unambiguous and validated against the schema.
- Ask a quick confirmation before changing fields that already have values or are marked sensitive.
- If unsure, ask a clarifying question instead of writing a guess.

## How to write

- Prefer grouped updates: multiple fields from one user answer can be saved in one turn.
- Normalize units, dates, and common formats to match the schema (e.g., YYYY-MM-DD for dates).
- After writing, re-check which required fields remain and move the conversation forward.

## Conflicts

- If the user edits the UI at the same time, the agent reports the detected conflict and asks the user which value to keep.

## Errors

- On validation errors, briefly explain what failed and propose a corrected value or ask for a new one.

## Observability

- Each update is summarized in the transcript with the fields touched (no raw sensitive values).


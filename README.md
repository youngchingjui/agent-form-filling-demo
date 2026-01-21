# Agent assisted form filling

_Automatically synced with your [v0.app](https://v0.app) deployments_

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/youngchingjuis-projects/v0-agent-assisted-form-filling)
[![Built with v0](https://img.shields.io/badge/Built%20with-v0.app-black?style=for-the-badge)](https://v0.app/chat/icy0pVU9MiR)

## Overview

This repository will stay in sync with your deployed chats on [v0.app](https://v0.app).
Any changes you make to your deployed app will be automatically pushed to this repository from [v0.app](https://v0.app).

## Deployment

Your project is live at:

**[https://vercel.com/youngchingjuis-projects/v0-agent-assisted-form-filling](https://vercel.com/youngchingjuis-projects/v0-agent-assisted-form-filling)**

## Build your app

Continue building your app on:

**[https://v0.app/chat/icy0pVU9MiR](https://v0.app/chat/icy0pVU9MiR)**

## How It Works

1. Create and modify your project using [v0.app](https://v0.app)
2. Deploy your chats from the v0 interface
3. Changes are automatically pushed to this repository
4. Vercel deploys the latest version from this repository

---

## Realtime voice (WebRTC) — no OpenAI Agents SDK

The app connects directly to OpenAI's Realtime REST endpoints over WebRTC; the OpenAI Agents SDK is not used.

- Server route: `app/api/realtime/session/route.ts` – accepts an SDP offer and forwards it to OpenAI's Realtime API, returning the SDP answer.
- Client: click the microphone button in the Voice Assistant to start a realtime voice call. Your microphone audio is streamed to the model and the model's voice is played back.

### Environment variables

Create `.env.local` and set:

- `OPENAI_API_KEY` – your OpenAI API key
- Optional: `OPENAI_REALTIME_MODEL` (defaults to `gpt-realtime`)
- Optional: `OPENAI_REALTIME_VOICE` (defaults to `coral`)

### Notes

- Autoplay of audio generally requires a user gesture; click the microphone button to start the call.
- The text-based reasoning agent remains available when you switch the input mode to "text". While a realtime call is active, interim speech transcripts are displayed in the assistant panel.

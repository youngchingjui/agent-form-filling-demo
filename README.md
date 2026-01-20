# Agent assisted form filling

*Automatically synced with your [v0.app](https://v0.app) deployments*

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

## Realtime API (WebRTC) without the Agents SDK

This project now includes a direct connection to OpenAI's Realtime REST endpoints over WebRTC, avoiding the Agents SDK.

- Server route: `app/api/realtime/session/route.ts` – accepts an SDP offer and forwards it to OpenAI's Realtime API, returning the SDP answer.
- Client: the Voice Assistant UI exposes a "Connect Realtime" button that negotiates a WebRTC session, streams your microphone, and plays the model's audio response.

### Environment variables

Create `.env.local` and set:

- `OPENAI_API_KEY` – your OpenAI API key
- Optional: `OPENAI_REALTIME_MODEL` (defaults to `gpt-realtime`)
- Optional: `OPENAI_REALTIME_VOICE` (defaults to `marin`)

### Notes

- Autoplay of audio generally requires a user gesture; click the "Connect Realtime" button to start.
- The existing text-based reasoning agent remains available. When Realtime is connected, the browser STT mic button is disabled to avoid double-capturing audio.


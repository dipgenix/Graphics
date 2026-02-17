# Purifiora Sales & Marketing Assistant

A lightweight AI-enabled web app that helps sales and marketing teams quickly generate:

- Campaign strategy briefs
- Message pillars
- Outbound sequences
- Sample email/ad copy

## Features

- Clean responsive UI for campaign inputs
- AI integration endpoint (`/api/assist`)
- Works with OpenAI API if `OPENAI_API_KEY` is provided
- Local fallback strategy generator when API key is not configured

## Quick start

```bash
npm install
npm start
```

Open `http://localhost:3000`.

## Environment variables

Create a `.env` file if you want to use a live AI model:

```env
OPENAI_API_KEY=your_api_key_here
OPENAI_MODEL=gpt-4o-mini
PORT=3000
```

If `OPENAI_API_KEY` is missing, the app still works using a built-in fallback generator.

# TestMint

PDF questions are now processed by the Gemini server integration instead of creating random questions in the browser.

## Run locally

1. Create a free-tier API key in Google AI Studio, then set `GEMINI_API_KEY` in your terminal (use `.env.example` as a guide). In PowerShell: `$env:GEMINI_API_KEY="your_api_key"`.
2. Run `npm start` (or `node server.js`).
3. Open `http://localhost:3000`.

The server sends extracted PDF text to Gemini and requests structured JSON containing question text, four options, correct answer index, explanation, and PDF source note. It prioritizes questions and answer keys already inside the PDF. If a PDF only contains notes, it generates only source-supported questions.

## GitHub Pages deployment

The GitHub Actions workflow at `.github/workflows/deploy-pages.yml` builds the static frontend and deploys `dist/` to GitHub Pages whenever `main` changes.

GitHub Pages cannot run `server.js` or safely store `GEMINI_API_KEY`. Deploy this same project as a Node web service on a backend host such as Render, Railway, or Google Cloud Run, and set these environment variables there:

```text
GEMINI_API_KEY=your_secret_key
GEMINI_MODEL=gemini-3.5-flash-lite
ALLOWED_ORIGIN=https://helloaditya08.github.io
```

Then change `config.js` to set `window.TESTMINT_API_BASE` to the backend's public HTTPS URL and push that change. Do not add the Gemini key to GitHub, GitHub Pages, or `config.js`.


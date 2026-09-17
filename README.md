# TestMint

PDF questions are now processed by the Gemini server integration instead of creating random questions in the browser.

## Run locally

1. Create a free-tier API key in Google AI Studio, then set `GEMINI_API_KEY` in your terminal (use `.env.example` as a guide). In PowerShell: `$env:GEMINI_API_KEY="your_api_key"`.
2. Run `npm start` (or `node server.js`).
3. Open `http://localhost:3000`.

The server sends extracted PDF text to Gemini and requests structured JSON containing question text, four options, correct answer index, explanation, and PDF source note. It prioritizes questions and answer keys already inside the PDF. If a PDF only contains notes, it generates only source-supported questions.

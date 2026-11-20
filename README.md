# PracticarL

A free, browser-based Spanish practice website hosted on GitHub Pages.

## Features

- Username-only browser-local profiles (no passwords)
- Offline branching conversations across weekend plans, restaurants, travel, learning, and hypothetical plans
- Keyword-based topic/intent matching with context-specific branches and clarification requests for very short or unclear replies
- Three approximate difficulty levels, adjusted using sentence-length and language-pattern heuristics
- Natural goodbye detection and manual conversation endings
- Five-question English/Spanish vocabulary quizzes
- Conversation and quiz history, statistics, and JSON data export/import

## Running

Open `index.html` or enable GitHub Pages: Settings → Pages → Deploy from branch → `main` / `(root)`.

## Stage 1 limitations

This version does **not** call a generative AI service or translation API. Its dialogue follows predefined branches and cannot reliably understand arbitrary Spanish, judge grammatical correctness, or provide individualized corrections. The difficulty estimate is a simple heuristic, not a validated proficiency assessment. Only predefined assistant lines have English translations. User sentences are saved verbatim.

Progress is stored in the browser under the chosen username, not synced across devices or protected from other users of the same browser. Export your progress before clearing browser data.

## Future stages

Add a translation service for user sentences and optional grammar checks, then consider a tightly limited generative AI fallback only when rule-based recognition cannot handle a reply.

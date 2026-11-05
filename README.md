# Badminton Queue

Vanilla HTML/CSS/JS queueing app for badminton sessions. No build step.

## Run it
ES modules don't load from `file://`. Serve the folder instead:

    npx serve .          # or the VS Code "Live Server" extension

## Structure
    index.html            markup + <template>s
    src/main.js           init order only
    src/core/             constants, store (state + actions), storage, selectors
    src/lib/              pure helpers (format, id, dom)
    src/ui/               shared widgets (modal, tabs, router, ticker, team-list)
    src/features/<name>/  one folder per screen/tab
    src/styles/           main.css imports: base -> components -> features

## Rules
- Features import from `core`, `lib`, `ui`. Never the other way, never feature-to-feature.
- `core/constants.js` is plain data and may be imported from anywhere.
- All state changes go through `core/store.js`; call `commit()` to save + re-render.
- All popups go through `ui/modal.js` (`ask`, `confirmAction`, or `ask({ body })` for forms).
- Used by 2+ features -> `styles/components/`. Used by one -> its feature CSS file.
- Split a file when it passes ~250 lines or does two jobs.

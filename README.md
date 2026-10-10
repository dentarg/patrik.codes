# `patrik.codes`

Site built with Bridgetown:

- https://www.bridgetownrb.com/
- https://github.com/bridgetownrb/bridgetown

## Getting Started

Use Node.js 22.12 or newer.

```bash
bin/start
```

This installs dependencies, bundles the viewer JavaScript, and starts Bridgetown.
When editing `frontend/`, run `npm run build -- --watch` in another terminal.

## Build for Production

```bash
bundle install
npm ci
npm run build
bundle exec bridgetown build
```

Output is generated in the `output/` directory.

## Markdown Viewer

Available at `/markdown/` and `/md/`. Drop or select Markdown files
to render CommonMark and GitHub-flavored Markdown entirely in the browser.
Files are never uploaded or saved; use Clear to return to file selection.

## Tests

After building the site, run the browser tests against the generated static files:

```bash
npm test
```

Tests require Chromium at `/usr/bin/chromium`, or a Chrome/Chromium executable
specified with `CHROME_BIN` (for example, on macOS):

```bash
CHROME_BIN="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npm test
```

## Project Structure

```
├── bridgetown.config.yml     # Site configuration
├── config/
│   └── initializers.rb       # Plugin initialization
├── frontend/                # Viewer and Markdown worker source
├── package.json             # JavaScript dependencies, build, and browser tests
├── src/
│   ├── _data/
│   │   └── site_metadata.yml # Site title and metadata
│   ├── _layouts/             # ERB layouts
│   ├── _posts/               # Blog posts
│   ├── css/                  # Stylesheets
│   ├── js/                   # Generated JavaScript (gitignored)
│   ├── markdown/             # Markdown viewer
│   ├── md/                   # Viewer alias using the same layout
│   └── index.md              # Homepage
├── test/                    # Browser integration tests
└── output/                   # Generated site (gitignored)
```

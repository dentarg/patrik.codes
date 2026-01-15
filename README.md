# `patrik.codes`

Site built with Bridgetown:

- https://www.bridgetownrb.com/
- https://github.com/bridgetownrb/bridgetown

## Getting Started

```bash
bin/start
```

## Build for Production

```bash
bundle exec bridgetown build
```

Output is generated in the `output/` directory.

## Project Structure

```
├── bridgetown.config.yml     # Site configuration
├── config/
│   └── initializers.rb       # Plugin initialization
├── src/
│   ├── _data/
│   │   └── site_metadata.yml # Site title and metadata
│   ├── _layouts/             # ERB layouts
│   ├── _posts/               # Blog posts
│   ├── css/                  # Stylesheets
│   └── index.md              # Homepage
└── output/                   # Generated site (gitignored)
```

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Multi-page marketing website for LeftClick, an AI automation agency. Static HTML files with embedded CSS and JavaScript—no build step required.

## Related Sites

- **Live Site**: https://leftclick-agency.netlify.app
- **LeftClick.ai**: https://www.leftclick.ai

## Tech Stack

- **Framework**: Static HTML (no build step)
- **Styling**: Embedded CSS
- **JavaScript**: Vanilla JS, embedded
- **Hosting**: Netlify
- **Fonts**: Inter (Google Fonts CDN)

## File Structure

```
├── index.html          # Main landing page (hero, case studies, process, services overview)
├── services.html       # Detailed services page (Lead Gen, PM, Hiring, Sales Admin systems)
├── about.html          # About page (founders, story, timeline, values, press)
├── contact.html        # Contact page (form, founder section)
├── _template.html      # Scaffold for new pages — copy this, never deploy it directly
├── netlify.toml        # Netlify configuration
└── CLAUDE.md           # This file
```

## Architecture

Each page is a fully self-contained HTML file: CSS variables, component styles, markup, and JS are all embedded in a single file. There is no shared CSS or JS bundle.

Every page shares the same four JS initializers (defined in `_template.html` and duplicated per page):
- `initScrollReveal()` — Intersection Observer for `.reveal` elements
- `initNavbar()` — scroll-triggered background on `#navbar`
- `initCursorGlow()` — mouse-following radial gradient (desktop only)
- `initScrollProgress()` — `#scrollProgress` bar driven by scroll position

`netlify.toml` publishes the repo root (`publish = "."`) with a `/* → /index.html` status-200 fallback. New pages must be real `.html` files at the root — they are served directly and are not affected by the fallback.

## External Dependencies

- **Calendly**: Meeting booking at `calendly.com/leftclick-meeting-30`
- **Google Fonts**: Inter font family via CDN
- **No npm packages** — Zero build dependencies

## Notes

- Keep the single-file architecture — no bundlers or build steps
- Maintain the squared corner aesthetic (no pills)
- Test scroll animations after content changes
- Counter animations trigger on scroll into view
- **index.html is the main landing page** — don't overwrite with feature content

@.claude/rules/design-system.md
@.claude/rules/git-workflow.md
@.claude/rules/page-structure.md
@.claude/rules/deployment.md
@.claude/rules/common-tasks.md

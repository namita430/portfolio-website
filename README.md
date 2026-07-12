# Namita Giri Portfolio

A light, minimal personal portfolio for Namita Giri, built with plain HTML, CSS, and vanilla
JavaScript — no build step required.

## Structure

- `index.html` – homepage
- `project.html` – projects landing page
- `certificates.html` – certificates page
- `projects/skillconnect.html` – SkillConnect Nepal case study
- `projects/smartbite.html` – SmartBite case study
- `css/` – modular stylesheets (`style.css` holds the design tokens and core layout)
- `js/` – interactive behavior (nav, reveal-on-scroll, typing effect, lightbox gallery)
- `assets/` – images, icons, and resume PDF

## Design notes

- Palette: warm paper background, deep pine-green accent, sparing brass highlight — tokens
  live at the top of `css/style.css` as CSS custom properties.
- Type: Space Grotesk (headings), IBM Plex Sans (body), JetBrains Mono (labels/meta) — matches
  the same mono-and-serif-free system used in the SkillConnect Nepal product design.
- Sections sit on one continuous background separated by spacing and a hairline rule rather
  than alternating color blocks.

## Deploying to Netlify

1. Push this folder to a GitHub repo (or drag-and-drop the folder into Netlify's deploy UI).
2. No build command or publish directory override needed — this is a static site, so set the
   publish directory to the repo root.
3. Update `assets/resume/Namita_Giri_resume.pdf` whenever the resume changes — it's linked
   directly from the hero and resume sections.

## Notes

- Project screenshots in `assets/images/` are illustrative mockups, not literal app
  screenshots — swap in real screenshots of SkillConnect Nepal and SmartBite when you have
  clean ones to show.
- Update project links and copy as the portfolio grows.

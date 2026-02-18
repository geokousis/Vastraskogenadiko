# Vastraskogenadiko

React website that generates a stylized exploded pie chart inspired by your reference image.

## Features

- Default palette and proportions matched to the sample chart
- User-editable category names, percentages, and colors
- Global slice stroke color and stroke width controls
- Global slice explosion distance slider
- Outside percentage labels with connector lines
- Category legend rendered in the chart
- Download as PNG (transparent) and PNG with white background
- Responsive layout for desktop and mobile

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Deploy to GitHub Pages

1. Push this repo to GitHub on branch `main`.
2. In GitHub repo settings, open `Pages`.
3. Set Source to `GitHub Actions`.
4. Push again (or run the workflow manually).

The workflow file is at `.github/workflows/deploy.yml` and will deploy `dist/` automatically on each push to `main`.

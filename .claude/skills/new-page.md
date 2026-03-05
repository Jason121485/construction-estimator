Create a new HTML page for the LeftClick website.

## Usage
/new-page <page-name> "<Page Title>" "<meta description>"

Example: /new-page pricing "Pricing" "Simple, transparent pricing for AI automation systems."

## Steps

1. **Copy the template** — Read `_template.html` and write it to `<page-name>.html` in the project root.

2. **Update the `<title>`** — Replace `PAGE TITLE` with the provided page title.
   Result: `<title>Page Title | LeftClick - AI Automation Agency</title>`

3. **Update the meta description** — Replace `PAGE DESCRIPTION` with the provided description.

4. **Mark the active nav link** — Add `class="active"` to the `<a>` tag in `.nav-links` that matches the new page.
   Example for pricing.html: `<li><a href="pricing.html" class="active">Pricing</a></li>`
   Note: also add the new page link to the nav and footer lists.

5. **Replace the placeholder `<main>` block** — Remove the template placeholder content between the `PAGE CONTENT` comments and scaffold the real sections based on the page name and title. Use the design system: dark background (`var(--black)`), emerald accents (`var(--green-primary)`), squared corners (`var(--radius-md)`), Inter font.

6. **Confirm** — Tell the user the file was created and list the sections added.

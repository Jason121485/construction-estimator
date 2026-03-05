# Git Workflow

## Branch Naming Convention

Feature branches use the `feature/` prefix:
- `feature/services-page`
- `feature/about-page`
- `feature/contact-page`

## Merging Feature Branches

When merging multiple feature branches into main:

```bash
# 1. Check current status and list branches
git status
git branch -a

# 2. Merge each feature branch
git merge feature/services-page -m "Merge feature/services-page: description"
git merge feature/about-page -m "Merge feature/about-page: description"
git merge feature/contact-page -m "Merge feature/contact-page: description"

# 3. Push to remote
git push origin main
```

## IMPORTANT: Handling index.html Conflicts

Feature branches often use `index.html` as their main file during development. When merging, this can **overwrite the main landing page**.

**After merging, always verify:**
1. `index.html` contains the **main landing page** (title: "LeftClick | AI Automation Agency")
2. Feature content is in its **dedicated file** (e.g., `services.html`, not `index.html`)

**If a feature branch overwrote index.html:**
```bash
# 1. Save the feature content to its proper file
cp index.html services.html  # or about.html, contact.html

# 2. Restore the original landing page from before the merge
git show <commit-before-merge>:index.html > index.html

# 3. Commit the fix
git add index.html services.html
git commit -m "fix: Restore landing page, move services to services.html"
```

**To find the original index.html:**
```bash
# View commit history
git log --oneline

# Show index.html from a specific commit
git show f87222a:index.html | head -20
```

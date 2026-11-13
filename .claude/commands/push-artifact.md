# Push Artifact to The Ball

Save a Claude artifact (by URL) permanently into The Ball's database — HTML captured at push time so it survives machine loss and URL rot.

## Usage
```
/push-artifact <url> "<title>" [description: "..."] [tags: tag1, tag2]
```

## Steps

**1. Parse the arguments from `$ARGUMENTS`**
- `url` — the full claude.ai artifact URL (required)
- `title` — artifact name in quotes (required)  
- `description` — optional, after `description:` keyword
- `tags` — optional comma-separated list after `tags:` keyword

**2. Attempt to fetch the HTML**
Use WebFetch on the URL. This succeeds for public artifacts; it may fail for private ones — that's fine, don't stop. Write the response body to a temp file at `{scratchpad}/artifact-html.html` if successful.

**3. Run the push script**
```bash
node /Users/matthew.test/Documents/theball/.claude/scripts/push-artifact.mjs \
  --url "<url>" \
  --title "<title>" \
  --description "<description>" \
  --tags "<tags>" \
  --html-file "{scratchpad}/artifact-html.html"
```
Omit `--html-file` if the fetch failed or returned non-HTML.

**4. Report back**
Tell Matthew:
- ✓ Title saved
- Whether HTML was captured (KB size) or not (and why if known)
- Reminder that The Ball will show it next time it syncs from Turso

## Notes
- The script reads Turso credentials from the project `.env` file automatically — no manual setup needed
- HTML capture fails gracefully: the record is always saved, HTML is a bonus
- The artifact will appear in The Ball → AI Arsenal → Artifacts on next app open

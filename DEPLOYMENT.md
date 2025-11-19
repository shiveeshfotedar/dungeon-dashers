# Deployment Configuration

## GitHub Repository
- **URL:** https://github.com/shiveeshfotedar/dungeon-dashers
- **Branch:** main

## Railway Deployment
- **App URL:** https://dungeon-dashers-production.up.railway.app
- **TV Display:** https://dungeon-dashers-production.up.railway.app/receiver/
- **Controller:** https://dungeon-dashers-production.up.railway.app/controller/
- **Design System:** https://dungeon-dashers-production.up.railway.app/design-system.html

### Auto-Deploy
Railway automatically redeploys when changes are pushed to the `main` branch on GitHub.

## Commit Preferences
- **Do NOT include** the Claude signature in commit messages
- Keep commit messages clean without:
  - `🤖 Generated with [Claude Code](https://claude.com/claude-code)`
  - `Co-Authored-By: Claude <noreply@anthropic.com>`

## Project Structure
```
Tv_Game_codex/
├── package.json          # Root package.json for Railway
├── game/
│   ├── server/index.js   # WebSocket + HTTP server
│   ├── receiver/         # TV display (16:9)
│   ├── controller/       # Phone controller
│   ├── assets/           # Images for cards and monsters
│   └── design-system.html
```

## Environment
- Railway uses `process.env.PORT` for the server port
- WebSocket URLs are dynamic (use page host, not hardcoded port)

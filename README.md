# 🧠 Brain Dump Bot

An intelligent Slack bot that automatically captures team ideas to a shared canvas.

## What It Does

- **💡 React to Capture**: Add a bulb (💡) reaction to any message to automatically capture it as an idea
- **📝 Manual Entry**: Use `/braindump` to manually add ideas to the team canvas
- **📄 Centralized View**: Use `/canvas` to view all captured ideas in one place
- **🎨 Auto-Organization**: Ideas are automatically formatted with timestamps, user attribution, and channel context

## Key Development Roadblocks & Solutions

### Canvas Visibility Issue 🕵️‍♀️

**Problem**: Canvases were being created successfully (API returned `200 OK`), but users couldn't see them.

**Root Cause**: There are **two types of canvases**:
1. **Standalone canvases** (`canvases.create`) - Private by default
2. **Channel canvases** (`conversations.canvases.create`) - Automatically shared with channel members

**Solution**: Built a cascade fallback system:

```javascript
async function getOrCreateBrainDumpCanvas(client, channel) {
  try {
    // TRY 1: Channel canvas (best option)
    const result = await client.apiCall('conversations.canvases.create', {
      channel_id: channel,
      title: `🧠 Team Brain Dump - ${new Date().getFullYear()}`
    });
    return result.canvas_id;
    
  } catch (error) {
    // TRY 2: Standalone canvas with explicit sharing
    const result = await client.apiCall('canvases.create', {
      title: `🧠 Team Brain Dump - ${new Date().getFullYear()}`
    });
    
    await client.apiCall('canvases.access.set', {
      canvas_id: result.canvas_id,
      access_level: 'read',
      channel_ids: [channel]
    });
    return result.canvas_id;
  }
}
```

### Permission Requirements 🔐

**Problem**: Missing scopes prevented canvas sharing.

**Solution**: Added required scopes to `manifest.json`:

```json
{
  "oauth_config": {
    "scopes": {
      "bot": [
        "chat:write",
        "reactions:read", 
        "channels:history",
        "files:write",
        "files:read",
        "canvases:write",
        "commands"
      ]
    }
  }
}
```

## Installation & Setup

### Prerequisites
- Slack workspace with a paid plan (required for canvases)
- Node.js 18+ installed
- Permission to install apps in your workspace

### Quick Start

1. **Create the Slack App**:
   ```bash
   # Go to https://api.slack.com/apps/new
   # Choose "From an app manifest"
   # Paste the contents of manifest.json
   ```

2. **Environment Setup**:
   ```bash
   cp .env.sample .env
   # Add your tokens to .env:
   # SLACK_BOT_TOKEN=xoxb-your-bot-token
   # SLACK_APP_TOKEN=xapp-your-app-token
   ```

3. **Install and Run**:
   ```bash
   npm install
   npm start
   ```

4. **Test It Works**:
   ```
   /testcanvas    # Test canvas creation
   /braindump Hello world!    # Add a manual idea
   # Or react with 💡 to any message
   ```

## Commands

- `/braindump <idea>` - Manually add an idea to the canvas
- `/canvas` - View the team brain dump canvas
- `/testcanvas` - Debug canvas creation (helpful for troubleshooting)

## Built With

- **[Slack Bolt for JavaScript](https://slack.dev/bolt-js)** - Framework
- **[Claude Sonnet 4](https://claude.ai)** - AI development assistant
- **[Slack Developer MCP Server](https://github.com/slack-samples/mcp-slack-apps)** - Documentation access

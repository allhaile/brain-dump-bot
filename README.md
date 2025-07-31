# 🧠 Brain Dump Bot

An intelligent Slack bot that automatically captures team ideas to a shared canvas. Built with "vibe coding" using Claude Sonnet and the Slack Developer MCP Server.

## What It Does

- **💡 React to Capture**: Add a bulb (💡) reaction to any message to automatically capture it as an idea
- **📝 Manual Entry**: Use `/braindump` to manually add ideas to the team canvas
- **📄 Centralized View**: Use `/canvas` to view all captured ideas in one place
- **🎨 Auto-Organization**: Ideas are automatically formatted with timestamps, user attribution, and channel context

## The Development Journey: From Broken to Beautiful

This app was built using **"vibe coding"** - an iterative development approach where we let the problems guide us to solutions, using Claude Sonnet 4 and the Slack Developer MCP Server to research and debug in real-time.

### Chapter 1: The Canvas Mystery 🕵️‍♀️

**The Problem**: Canvases were being created successfully (API returned `200 OK`), but users couldn't see them.

```javascript
// This was working... or so we thought
const result = await client.apiCall('canvases.create', {
  title: 'Brain Dump Canvas',
  document_content: {
    type: "markdown", 
    markdown: "# Ideas will go here"
  }
});
// ✅ Success response, but canvas was invisible to users!
```

**The Symptoms**:
- Successful API responses with canvas IDs
- Buttons leading to "Canvas not found" errors
- Users reporting they couldn't access the canvas
- Debug logs showing everything "working"

### Chapter 2: Research Phase with Slack MCP Server 🔍

Using the Slack Developer MCP Server, we dove deep into canvas documentation:

**Key Discovery**: There are **two types of canvases**!
1. **Standalone canvases** (`canvases.create`) - Private by default
2. **Channel canvases** (`conversations.canvases.create`) - Automatically shared with channel members

**Research Process**:
```bash
# Using MCP server to search Slack docs
mcp_slackdev-mcp-server_slack_search_resources(
  "canvas create share permissions team"
)

# Found critical documentation about canvas sharing
mcp_slackdev-mcp-server_slack_fetch_resources([
  "slack://docs/surfaces/canvases",
  "slack://help-center/slack-for-admins/manage-canvas-settings-in-slack"
])
```

**The Revelation**: Standalone canvases require explicit sharing!

### Chapter 3: First Fix Attempt - Channel Canvases 🛠️

We switched to channel canvases:

```javascript
// NEW: Create channel canvas instead of standalone
const result = await client.apiCall('conversations.canvases.create', {
  channel_id: channel,  // 🔑 This makes it accessible to channel members!
  title: `🧠 Team Brain Dump - ${new Date().getFullYear()}`,
  document_content: {
    type: "markdown",
    markdown: `# 🧠 Team Brain Dump\n\n*Ideas will appear here...*`
  }
});
```

**But then...** we hit another wall: Not all workspaces support `conversations.canvases.create`!

### Chapter 4: Building Robust Fallbacks 🏗️

**The Vibe Coding Approach**: Instead of giving up, we built a cascade of fallbacks:

```javascript
async function getOrCreateBrainDumpCanvas(client, channel) {
  try {
    // ATTEMPT 1: Channel canvas (best option)
    const result = await client.apiCall('conversations.canvases.create', {
      channel_id: channel,
      title: `🧠 Team Brain Dump - ${new Date().getFullYear()}`,
      document_content: { /* ... */ }
    });
    console.log('✅ Channel canvas created - visible to all!');
    return result.canvas_id;
    
  } catch (error) {
    console.log('🔄 Channel canvas failed, trying standalone with sharing...');
    
    try {
      // ATTEMPT 2: Standalone canvas with explicit sharing
      const result = await client.apiCall('canvases.create', {
        title: `🧠 Team Brain Dump - ${new Date().getFullYear()}`,
        document_content: { /* ... */ }
      });
      
      // 🔑 THE MISSING PIECE: Explicit sharing!
      await client.apiCall('canvases.access.set', {
        canvas_id: result.canvas_id,
        access_level: 'read',
        channel_ids: [channel]
      });
      console.log('✅ Standalone canvas created and shared!');
      return result.canvas_id;
      
    } catch (fallbackError) {
      // ATTEMPT 3: Markdown file fallback
      console.log('🔄 Final fallback: markdown file...');
      const finalResult = await client.files.upload({
        channels: channel,
        content: `# 🧠 Team Brain Dump\n\n*Ideas will appear here...*`,
        filename: `brain-dump-${Date.now()}.md`,
        filetype: 'markdown'
      });
      return finalResult.file.id;
    }
  }
}
```

### Chapter 5: The Permission Hunt 🔐

**Another Discovery**: We needed the right scopes! Updated `manifest.json`:

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
        "canvases:read",  // ← Added this for sharing!
        "commands"
      ]
    }
  }
}
```

### Chapter 6: Testing and Debugging 🧪

We built a comprehensive test command:

```javascript
app.command('/testcanvas', async ({ command, ack, respond, client }) => {
  let result;
  let canvasType = 'channel';
  
  try {
    // Try channel canvas first
    result = await client.apiCall('conversations.canvases.create', {
      channel_id: command.channel_id,
      title: 'Test Channel Canvas',
      document_content: {
        type: "markdown",
        markdown: "# Test Canvas\n\nIf you can see this, it worked! 🎉"
      }
    });
  } catch (channelError) {
    canvasType = 'standalone';
    // Fallback to standalone with sharing...
  }
  
  // Provide clear feedback about what worked
  await respond({
    text: `✅ Canvas type: ${canvasType}`,
    blocks: [/* detailed debugging info */]
  });
});
```

### Chapter 7: Success! 🎉

**Final Working Architecture**:

1. **Smart Canvas Creation**: Try channel canvas first, fallback to standalone with sharing
2. **Robust Error Handling**: Multiple fallback layers ensure something always works  
3. **Clear User Feedback**: Users know exactly what type of canvas was created
4. **Automatic Idea Capture**: React with 💡 to any message → instant idea capture
5. **Rich Formatting**: Ideas include timestamps, user attribution, and channel context

**The Results**:
- ✅ Canvases are now visible to all channel members
- ✅ Ideas are automatically captured and formatted
- ✅ Robust fallback system handles different workspace configurations
- ✅ Clear debugging and error reporting

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
   # Copy environment template
   cp .env.sample .env
   
   # Add your tokens to .env:
   SLACK_BOT_TOKEN=xoxb-your-bot-token
   SLACK_APP_TOKEN=xapp-your-app-token
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

## Technical Architecture

### Core Components

- **Canvas Manager**: Handles creation, sharing, and fallback logic
- **Idea Capture**: Processes bulb reactions and manual submissions  
- **Auto-Formatting**: Adds timestamps, user mentions, and channel context
- **Error Recovery**: Multiple fallback mechanisms for maximum reliability

### Key Learnings from Development

1. **Canvas Types Matter**: Channel vs standalone canvases have very different visibility rules
2. **MCP Servers are Powerful**: Real-time documentation access dramatically speeds development
3. **Vibe Coding Works**: Following the errors and vibes led us to robust solutions
4. **Fallbacks are Essential**: Different workspaces have different capabilities
5. **User Feedback is Key**: Clear debugging info helps users understand what's happening

## Commands

- `/braindump <idea>` - Manually add an idea to the canvas
- `/canvas` - View the team brain dump canvas
- `/testcanvas` - Debug canvas creation (helpful for troubleshooting)

## Events Handled

- `reaction_added` - Captures ideas when someone reacts with 💡
- `message.channels` - For context when processing reactions

## Error Handling Philosophy

This app embraces **graceful degradation**:
- If channel canvases fail → try standalone with sharing
- If sharing fails → still create canvas but warn user
- If canvas creation fails → fallback to markdown file
- If everything fails → clear error message with actionable steps

## Built With

- **[Slack Bolt for JavaScript](https://slack.dev/bolt-js)** - Framework
- **[Claude Sonnet 4](https://claude.ai)** - AI pair programming partner
- **[Slack Developer MCP Server](https://github.com/slack-samples/mcp-slack-apps)** - Real-time documentation access
- **"Vibe Coding"** - Let the problems guide the solutions

## Contributing

This app was built as a demonstration of vibe-driven development. Feel free to:
- Report bugs (with debug logs from `/testcanvas`)
- Suggest features 
- Share your own vibe coding experiences

The key is to let the code and the errors teach you what needs to be built! 🚀

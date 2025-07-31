# 🧠 Brain Dump Bot Setup Guide

Your automated idea capture bot is ready! Follow these steps to get it running.

## ✅ What's Built

- **Automatic Canvas Creation**: Creates a team brain dump canvas
- **Reaction Monitoring**: Add 💡 to any message to capture it as an idea
- **Manual Commands**: `/braindump` and `/canvas` slash commands
- **Smart Filtering**: Ignores short messages and bot messages

## 🚀 How to Run & Test

### 1. Set Up Slack App
1. Go to [https://api.slack.com/apps/new](https://api.slack.com/apps/new)
2. Choose "From an app manifest"
3. Select your workspace
4. Copy the contents of `manifest.json` and paste it
5. Click "Create"

### 2. Get Your Tokens
1. In your app settings, go to "OAuth & Permissions"
2. Click "Install to Workspace" 
3. Copy the "Bot User OAuth Token" (starts with `xoxb-`)
4. Go to "Basic Information" → "App-Level Tokens"
5. Generate a token with `connections:write` scope
6. Copy the "App Token" (starts with `xapp-`)

### 3. Configure Environment
Edit your `.env` file and replace the tokens:

```bash
SLACK_BOT_TOKEN=xoxb-your-actual-bot-token-here
SLACK_APP_TOKEN=xapp-your-actual-app-token-here
LOG_LEVEL=INFO
```

### 4. Install Dependencies & Run
```bash
npm install
npm start
```

You should see:
```
⚡️ Brain Dump Bot is running!
💡 Add bulb reactions to messages to capture ideas
📝 Use /braindump to manually add ideas
📄 Use /canvas to view the brain dump canvas
```

## 🧪 Testing the Bot

### Test 1: Reaction Capture
1. Go to any channel where the bot is added
2. Post a message like "We should automate our deployment process"
3. Add a 💡 reaction to that message
4. You should get an ephemeral confirmation message
5. A canvas will be created and shared in the channel

### Test 2: Manual Capture
1. Type `/braindump We need better documentation for our APIs`
2. You should get a confirmation that the idea was captured

### Test 3: View Canvas
1. Type `/canvas` 
2. Click the "Open Canvas" button to see all captured ideas

## 🎯 Features

- **Auto Canvas Creation**: First idea triggers canvas creation
- **Formatted Ideas**: Each idea includes timestamp, author, and channel
- **Duplicate Prevention**: Smart filtering prevents noise
- **User-Friendly**: Ephemeral confirmations don't clutter channels

## 🔧 Customization

You can modify the bot by editing `app.js`:

- **Change reaction emoji**: Look for `event.reaction !== 'bulb'`
- **Filter criteria**: Modify the message length check or add keyword filters
- **Canvas formatting**: Update the `ideaEntry` template
- **Add new commands**: Create additional slash commands

## 🐛 Troubleshooting

**Bot not responding to reactions:**
- Check that the bot is in the channel
- Verify `reactions:read` permission is granted
- Check console logs for errors

**Canvas not creating:**
- Ensure `files:write` permission is granted
- Check if workspace allows canvas creation

**Commands not working:**
- Verify slash commands are registered in app manifest
- Check socket mode is enabled

## 📝 Next Steps

- Add the bot to your team's main discussion channel
- Train your team to use 💡 reactions for ideas
- Periodically review the brain dump canvas for action items
- Consider adding categorization or voting features

## 🎉 Ready to Brainstorm!

Your brain dump bot is now ready to capture all those brilliant ideas that usually get lost in chat! 
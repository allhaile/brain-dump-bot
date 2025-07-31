const { App, LogLevel } = require('@slack/bolt');
const { config } = require('dotenv');

config();

/** Initialization */
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
  logLevel: LogLevel.DEBUG,
});

// Store canvas ID (in production, you might want to use a database)
let brainDumpCanvasId = null;

/** Helper Functions */
async function getOrCreateBrainDumpCanvas(client, channel) {
  if (brainDumpCanvasId) {
    try {
      // Check if canvas still exists
      await client.apiCall('files.info', { file: brainDumpCanvasId });
      console.log(`✅ Using existing canvas: ${brainDumpCanvasId}`);
      return brainDumpCanvasId;
    } catch (error) {
      console.log('Canvas no longer exists, creating new one');
      brainDumpCanvasId = null;
    }
  }

  try {
    console.log('🎨 Creating new brain dump canvas...');
    
    // Create new channel canvas (instead of standalone canvas)
    const result = await client.apiCall('conversations.canvases.create', {
      channel_id: channel,
      title: `🧠 Team Brain Dump - ${new Date().getFullYear()}`,
      document_content: {
        type: "markdown",
        markdown: `# 🧠 Team Brain Dump\n\n*Automatically capturing your brilliant ideas!*\n\n---\n\n## 💡 Recent Ideas\n\n*Ideas will appear here as they're captured...*\n\n`
      }
    });
    
    console.log('✅ Channel canvas created successfully:', result);
    brainDumpCanvasId = result.canvas_id;
    
    // Share canvas in the channel
    await client.chat.postMessage({
      channel: channel,
      text: `🧠 Brain Dump Canvas created! Add a 💡 reaction to any message to capture ideas automatically.`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `🧠 *Brain Dump Canvas Created!*\n\nAdd a 💡 reaction to any message to automatically capture it as an idea.`
          }
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: '📄 View Canvas'
              },
              url: `https://app.slack.com/canvas/${brainDumpCanvasId}`
            }
          ]
        }
      ]
    });
    
    console.log(`📄 Canvas URL: https://slack.com/canvas/${brainDumpCanvasId}`);
    return brainDumpCanvasId;
  } catch (error) {
    console.error('❌ Error creating channel canvas:', error);
    console.log('🔄 Falling back to standalone canvas with sharing...');
    
    try {
      // Fallback: Create standalone canvas and explicitly share it
      const result = await client.apiCall('canvases.create', {
        title: `🧠 Team Brain Dump - ${new Date().getFullYear()}`,
        document_content: {
          type: "markdown",
          markdown: `# 🧠 Team Brain Dump\n\n*Automatically capturing your brilliant ideas!*\n\n---\n\n## 💡 Recent Ideas\n\n*Ideas will appear here as they're captured...*\n\n`
        }
      });
      
      console.log('✅ Standalone canvas created:', result);
      brainDumpCanvasId = result.canvas_id;
      
      // Try to share the canvas with the channel
      try {
        await client.apiCall('canvases.access.set', {
          canvas_id: brainDumpCanvasId,
          access_level: 'read',
          channel_ids: [channel]
        });
        console.log('✅ Canvas shared with channel');
      } catch (shareError) {
        console.log('⚠️ Could not share canvas with channel:', shareError.message);
      }
      
      // Share canvas in the channel
      await client.chat.postMessage({
        channel: channel,
        text: `🧠 Brain Dump Canvas created! Add a 💡 reaction to any message to capture ideas automatically.`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `🧠 *Brain Dump Canvas Created!*\n\nAdd a 💡 reaction to any message to automatically capture it as an idea.`
            }
          },
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: {
                  type: 'plain_text',
                  text: '📄 View Canvas'
                },
                url: `https://app.slack.com/canvas/${brainDumpCanvasId}`
              }
            ]
          }
        ]
      });
      
      return brainDumpCanvasId;
    } catch (fallbackError) {
      console.error('❌ Standalone canvas fallback also failed:', fallbackError);
      
      // Final fallback: regular file upload
      console.log('🔄 Trying final fallback: regular file upload...');
      try {
        const finalResult = await client.files.upload({
          channels: channel,
          content: `# 🧠 Team Brain Dump\n\n*Automatically capturing your brilliant ideas!*\n\n---\n\n## 💡 Recent Ideas\n\n`,
          filename: `brain-dump-${Date.now()}.md`,
          filetype: 'markdown',
          title: '🧠 Team Brain Dump'
        });
        
        console.log('✅ Final fallback file created:', finalResult.file.id);
        return finalResult.file.id;
      } catch (finalError) {
        console.error('❌ All fallback methods failed:', finalError);
        throw error;
      }
    }
  }
}

async function addIdeaToCanvas(client, ideaData) {
  const { message_text, user_id, channel_id, message_ts } = ideaData;
  
  try {
    const canvasId = await getOrCreateBrainDumpCanvas(client, channel_id);
    
    // Format the idea entry
    const timestamp = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    const ideaEntry = `### 💡 ${timestamp}\n**From:** <@${user_id}> in <#${channel_id}>\n**Idea:** ${message_text}\n\n---\n\n`;
    
    // Add idea to canvas 
    await client.apiCall('canvases.edit', {
      canvas_id: canvasId,
      changes: [{
        operation: "insert_at_end",
        document_content: {
          type: "markdown",
          markdown: ideaEntry
        }
      }]
    });
    
    return true;
  } catch (error) {
    console.error('Error adding idea to canvas:', error);
    return false;
  }
}

/** Custom Function: Capture Idea */
app.function('capture_idea', async ({ client, inputs, logger, fail }) => {
  try {
    const { message_text, user_id, channel_id, message_ts } = inputs;
    
    logger.info(`Capturing idea from user ${user_id} in channel ${channel_id}`);
    
    const success = await addIdeaToCanvas(client, {
      message_text,
      user_id,
      channel_id,
      message_ts
    });
    
    if (success) {
      // Send confirmation message
      await client.chat.postEphemeral({
        channel: channel_id,
        user: user_id,
        text: `💡 Idea captured to Brain Dump Canvas! "${message_text.substring(0, 50)}${message_text.length > 50 ? '...' : ''}"`
      });
    }
    
    return { outputs: { success } };
  } catch (error) {
    logger.error('Error in capture_idea function:', error);
    await fail({ error: `Failed to capture idea: ${error}` });
  }
});

/** Event Listener: Reaction Added */
app.event('reaction_added', async ({ event, client, logger }) => {
  try {
    // Only process bulb (💡) reactions
    if (event.reaction !== 'bulb') {
      return;
    }
    
    logger.info(`Bulb reaction detected by ${event.user} on message ${event.item.ts}`);
    
    // Get the original message
    const messageResult = await client.conversations.history({
      channel: event.item.channel,
      latest: event.item.ts,
      limit: 1,
      inclusive: true
    });
    
    if (!messageResult.messages || messageResult.messages.length === 0) {
      logger.warn('Could not retrieve original message');
      return;
    }
    
    const originalMessage = messageResult.messages[0];
    
    // Skip if message is too short or from a bot
    if (!originalMessage.text || originalMessage.text.length < 10 || originalMessage.bot_id) {
      return;
    }
    
    // Capture the idea
    await addIdeaToCanvas(client, {
      message_text: originalMessage.text,
      user_id: originalMessage.user,
      channel_id: event.item.channel,
      message_ts: event.item.ts
    });
    
    // Send confirmation
    await client.chat.postEphemeral({
      channel: event.item.channel,
      user: event.user,
      text: `💡 Idea captured! "${originalMessage.text.substring(0, 50)}${originalMessage.text.length > 50 ? '...' : ''}"`
    });
    
  } catch (error) {
    logger.error('Error handling reaction_added event:', error);
  }
});

/** Slash Command: Manual idea submission */
app.command('/braindump', async ({ command, ack, respond, client, logger }) => {
  await ack();
  
  try {
    const ideaText = command.text.trim();
    
    if (!ideaText) {
      await respond({
        response_type: 'ephemeral',
        text: 'Please provide an idea! Usage: `/braindump Your brilliant idea here`'
      });
      return;
    }
    
    const success = await addIdeaToCanvas(client, {
      message_text: ideaText,
      user_id: command.user_id,
      channel_id: command.channel_id,
      message_ts: null
    });
    
    if (success) {
      await respond({
        response_type: 'ephemeral',
        text: `💡 Idea captured to Brain Dump Canvas! "${ideaText.substring(0, 50)}${ideaText.length > 50 ? '...' : ''}"`
      });
    } else {
      await respond({
        response_type: 'ephemeral',
        text: '❌ Failed to capture idea. Please try again.'
      });
    }
    
  } catch (error) {
    logger.error('Error handling /braindump command:', error);
    await respond({
      response_type: 'ephemeral',
      text: '❌ Error capturing idea. Please try again.'
    });
  }
});

/** Test Command: Debug Canvas */
app.command('/testcanvas', async ({ command, ack, respond, client }) => {
  await ack();
  
  try {
    console.log('🧪 Testing canvas creation...');
    
    // Try to create a channel canvas first
    let result;
    let canvasType = 'channel';
    
    try {
      result = await client.apiCall('conversations.canvases.create', {
        channel_id: command.channel_id,
        title: 'Test Channel Canvas',
        document_content: {
          type: "markdown",
          markdown: "# Test Channel Canvas\n\nThis is a test channel canvas that should be visible to all channel members!"
        }
      });
      console.log('✅ Test channel canvas created:', result);
    } catch (channelError) {
      console.log('⚠️ Channel canvas failed, trying standalone:', channelError.message);
      canvasType = 'standalone';
      
      // Fallback to standalone canvas
      result = await client.apiCall('canvases.create', {
        title: 'Test Standalone Canvas',
        document_content: {
          type: "markdown",
          markdown: "# Test Standalone Canvas\n\nThis is a test standalone canvas!"
        }
      });
      console.log('✅ Test standalone canvas created:', result);
      
      // Try to share the standalone canvas
      try {
        await client.apiCall('canvases.access.set', {
          canvas_id: result.canvas_id,
          access_level: 'read',
          channel_ids: [command.channel_id]
        });
        console.log('✅ Standalone canvas shared with channel');
      } catch (shareError) {
        console.log('⚠️ Could not share canvas:', shareError.message);
      }
    }
    
    await respond({
      response_type: 'ephemeral',
      text: `✅ Canvas creation works! Canvas ID: ${result.canvas_id}\n\nCanvas type: ${canvasType}\nDirect link: https://app.slack.com/canvas/${result.canvas_id}`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `✅ *Canvas Created Successfully!*\n\nCanvas ID: \`${result.canvas_id}\`\nType: \`${canvasType}\`\n\n${canvasType === 'channel' ? '✅ Should be visible to all channel members' : '⚠️ Standalone canvas - visibility depends on sharing settings'}`
          }
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: '🔗 View in Browser'
              },
              url: `https://app.slack.com/canvas/${result.canvas_id}`
            },
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: '📱 Open in App'
              },
              url: `slack://canvas/${result.canvas_id}`
            }
          ]
        }
      ]
    });
    
  } catch (error) {
    console.error('❌ Canvas test failed:', error);
    
    await respond({
      response_type: 'ephemeral',
      text: '❌ Canvas creation failed!',
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `❌ *Canvas Creation Failed*\n\n\`\`\`${error.message}\`\`\``
          }
        }
      ]
    });
  }
});

/** Command: View Canvas */
app.command('/canvas', async ({ command, ack, respond, client }) => {
  await ack();
  
  try {
    const canvasId = await getOrCreateBrainDumpCanvas(client, command.channel_id);
    
    await respond({
      response_type: 'ephemeral',
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '🧠 *Brain Dump Canvas*\nView all captured ideas in one place!'
          },
          accessory: {
            type: 'button',
            text: {
              type: 'plain_text',
              text: '📄 Open Canvas'
            },
            url: `https://app.slack.com/canvas/${canvasId}`
          }
        }
      ]
    });
  } catch (error) {
    await respond({
      response_type: 'ephemeral',
      text: '❌ Error accessing canvas. Please try again.'
    });
  }
});


/** Handle button actions for test canvas */
app.action(/.*/, async ({ ack }) => {
  // Acknowledge any button action to prevent timeouts
  await ack();
});

/** Start the Bolt App */
(async () => {
  try {
    await app.start();
    app.logger.info('⚡️ Brain Dump Bot is running!');
    app.logger.info('💡 Add bulb reactions to messages to capture ideas');
    app.logger.info('📝 Use /braindump to manually add ideas');
    app.logger.info('📄 Use /canvas to view the brain dump canvas');
  } catch (error) {
    app.logger.error('Failed to start the app', error);
  }
})();

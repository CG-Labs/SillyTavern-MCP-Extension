# Installing MCP Extension in SillyTavern

Follow these simple steps to install the MCP Extension through SillyTavern's web interface:

## Installation Steps

1. Open SillyTavern in your web browser

2. Click on the "Settings" button in the top navigation bar

3. In the settings menu, select the "Extensions" tab

4. Click the "Install Extension" button

5. In the "Extension URL" field, enter:
   ```
   https://github.com/CG-Labs/SillyTavern-MCP-Extension
   ```

6. Click "Install"

7. Wait for the installation to complete

8. Restart SillyTavern when prompted

## Verifying Installation

1. After SillyTavern restarts, go back to Settings > Extensions

2. You should see "MCP Extension" listed in your installed extensions

3. Click on the extension name to access its settings

4. Verify that you can see:
   - WebSocket server settings
   - Logging configuration
   - Connection status
   - Tools list

## Troubleshooting

If you encounter any issues:

1. Check that the extension appears in the Extensions list
2. Verify that the WebSocket server status shows "Connected"
3. Check the browser's console for any error messages
4. Try restarting SillyTavern if the extension isn't working properly

If problems persist:
- Clear your browser cache
- Check that no other application is using port 5005
- Review the extension logs in Settings > Extensions > MCP Extension

## Getting Help

If you need assistance:
1. Check the [GitHub repository](https://github.com/CG-Labs/SillyTavern-MCP-Extension) for known issues
2. Join the SillyTavern Discord community for support
3. Create a GitHub issue if you've found a bug

## Next Steps

After installation:
1. Configure the WebSocket port if needed
2. Set your preferred logging level
3. Review the README.md for information about connecting tools
4. Test the connection using the status indicators in the settings panel
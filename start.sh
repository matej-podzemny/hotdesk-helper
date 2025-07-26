#!/bin/bash
# filepath: c:\Users\Peter\Documents\GitHub\hotdesk-helper\start.sh

echo "🚀 Starting Hotdesk Helper..."

# Check if Python is available
if ! command -v python3 &> /dev/null && ! command -v python &> /dev/null; then
    echo "❌ Error: Python is not installed or not in PATH"
    echo "Please install Python 3 and try again"
    exit 1
fi

# Determine which Python command to use
PYTHON_CMD=""
if command -v python3 &> /dev/null; then
    PYTHON_CMD="python3"
elif command -v python &> /dev/null; then
    PYTHON_CMD="python"
fi

echo "✅ Using Python command: $PYTHON_CMD"

# Check if proxy server file exists
if [ ! -f "proxy_server.py" ]; then
    echo "❌ Error: proxy_server.py not found in current directory"
    echo "Please make sure you're running this script from the hotdesk-helper directory"
    exit 1
fi

# Check if index.html exists
if [ ! -f "index.html" ]; then
    echo "❌ Error: index.html not found in current directory"
    echo "Please make sure you're running this script from the hotdesk-helper directory"
    exit 1
fi

echo "🌐 Starting proxy server..."

# Start the proxy server in the background
$PYTHON_CMD proxy_server.py &
PROXY_PID=$!

echo "✅ Proxy server started with PID: $PROXY_PID"
echo "🔗 Proxy server is running at: http://localhost:3000"

# Wait a moment for the server to start
echo "⏳ Waiting for server to initialize..."
sleep 2

# Check if the server is actually running
if ! kill -0 $PROXY_PID 2>/dev/null; then
    echo "❌ Error: Proxy server failed to start"
    exit 1
fi

echo "🌍 Opening Hotdesk Helper interface..."

# Open the HTML file in the default browser
# Get the absolute path to index.html
HTML_PATH="$(pwd)/index.html"

# Detect OS and use appropriate command to open browser
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    open "file://$HTML_PATH"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    xdg-open "file://$HTML_PATH"
else
    echo "⚠️  Could not automatically open browser on this OS ($OSTYPE)"
    echo "Please manually open: file://$HTML_PATH"
fi

echo ""
echo "🎉 Hotdesk Helper is now ready!"
echo ""
echo "📋 What's running:"
echo "   • Proxy Server: http://localhost:3000"
echo "   • Web Interface: file://$HTML_PATH"
echo ""
echo "📝 Instructions:"
echo "   1. Configure your email, seat number, and bearer token"
echo "   2. Select the dates you want to book"
echo "   3. Click 'Book Now' to submit your reservations"
echo ""
echo "🛑 To stop the proxy server, press Ctrl+C or run:"
echo "   kill $PROXY_PID"
echo ""

# Function to cleanup on script exit
cleanup() {
    echo ""
    echo "🛑 Stopping proxy server..."
    kill $PROXY_PID 2>/dev/null
    echo "✅ Cleanup complete"
}

# Set trap to cleanup on script exit
trap cleanup EXIT INT TERM

# Keep the script running until user interrupts
echo "⌨️  Press Ctrl+C to stop the proxy server and exit"
wait $PROXY_PID
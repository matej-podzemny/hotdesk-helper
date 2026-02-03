#!/usr/bin/env python3
"""
Hotdesk Helper - Python Proxy Server
A simple CORS proxy server that forwards POST requests to external APIs.
No dependencies required - uses only Python standard library.
"""

import http.server
import socketserver
import json
import urllib.request
import urllib.error
from urllib.parse import urlparse, parse_qs
import sys

PORT = 3000

class ProxyHandler(http.server.BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        """Handle CORS preflight requests"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, X-Cookie, X-Requested-With')
        self.send_header('Access-Control-Max-Age', '86400')
        self.end_headers()

    def do_POST(self):
        """Handle POST requests to /proxy endpoint"""
        if self.path.startswith('/proxy'):
            self.handle_proxy_request('POST')
        else:
            self.send_error(404, "Endpoint not found")

    def do_GET(self):
        """Handle GET requests to /proxy endpoint and version check"""
        if self.path.startswith('/proxy'):
            self.handle_proxy_request('GET')
        elif self.path == '/version-check':
            self.handle_version_check()
        else:
            self.send_error(404, "Endpoint not found")

    def handle_proxy_request(self, method='POST'):
        """Proxy requests to external API"""
        try:
            # Parse the URL and query parameters
            parsed_url = urlparse(self.path)
            query_params = parse_qs(parsed_url.query)
            
            # Get target URL from query parameter
            if 'url' not in query_params:
                self.send_error_response(400, {'error': 'Missing ?url= parameter'})
                return
            
            target_url = query_params['url'][0]
            
            # Read request body
            post_data = None
            if method == 'POST':
                content_length = int(self.headers.get('Content-Length', 0))
                post_data = self.rfile.read(content_length) if content_length > 0 else b''
            
            # Prepare headers for the target request
            headers = {
                'User-Agent': 'Hotdesk-Helper-Proxy/1.0'
            }
            
            # Add Content-Type for POST requests
            if method == 'POST':
                headers['Content-Type'] = 'application/json'
            
            if 'X-Cookie' in self.headers:
                headers['Cookie'] = self.headers['X-Cookie']
                        
            # Create the request
            req = urllib.request.Request(
                target_url,
                data=post_data,
                headers=headers,
                method=method
            )
            
            # Make the request
            print(f"🔄 Proxying {method} request to: {target_url}")
            
            with urllib.request.urlopen(req) as response:
                response_data = response.read()
                response_status = response.getcode()
                
                # Send response back to client
                self.send_response(response_status)
                self.send_cors_headers()
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(response_data)
                
                print(f"✅ Request successful - Status: {response_status}")
                
        except urllib.error.HTTPError as e:
            # Handle HTTP errors from target server
            error_data = e.read()
            print(f"❌ HTTP Error {e.code}: {e.reason}")
            
            self.send_response(e.code)
            self.send_cors_headers()
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(error_data)
            
        except urllib.error.URLError as e:
            # Handle network errors
            print(f"❌ Network Error: {e.reason}")
            self.send_error_response(500, {
                'error': 'Proxy request failed',
                'details': str(e.reason)
            })
            
        except Exception as e:
            # Handle other errors
            print(f"❌ Unexpected Error: {str(e)}")
            self.send_error_response(500, {
                'error': 'Proxy request failed',
                'details': str(e)
            })

    def send_cors_headers(self):
        """Send CORS headers"""
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, X-Cookie, X-Requested-With')

    def handle_version_check(self):
        try:
            import subprocess
            
            python_cmd = 'python3' if self.is_command_available('python3') else 'python'
            
            if not self.is_command_available(python_cmd):
                self.send_error_response(500, {'error': 'Python not available for version check'})
                return
            
            result = subprocess.run(
                [python_cmd, 'check_version.py', '--json'], 
                capture_output=True, 
                text=True,
                timeout=15
            )
            
            if result.returncode in [0, 1, 2]:  # Success, error, update available
                try:
                    version_data = json.loads(result.stdout)
                    self.send_json_response(version_data)
                    print(f"✅ Version check completed: {version_data.get('status')}")
                except json.JSONDecodeError:
                    self.send_error_response(500, {'error': 'Invalid JSON from version checker'})
            else:
                self.send_error_response(500, {'error': f'Version checker failed: {result.stderr}'})
                
        except subprocess.TimeoutExpired:
            self.send_error_response(500, {'error': 'Version check timed out'})
        except Exception as e:
            print(f"❌ Version check error: {str(e)}")
            self.send_error_response(500, {'error': f'Version check failed: {str(e)}'})

    def is_command_available(self, command):
        import subprocess
        try:
            result = subprocess.run([command, '--version'], capture_output=True, timeout=5)
            return result.returncode == 0
        except:
            return False

    def send_json_response(self, data):
        self.send_response(200)
        self.send_cors_headers()
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        
        json_response = json.dumps(data).encode('utf-8')
        self.wfile.write(json_response)

    def send_error_response(self, status_code, error_data):
        """Send JSON error response"""
        self.send_response(status_code)
        self.send_cors_headers()
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        
        json_response = json.dumps(error_data).encode('utf-8')
        self.wfile.write(json_response)

    def log_message(self, format, *args):
        """Custom log format"""
        print(f"📝 {self.address_string()} - {format % args}")

def main():
    """Start the proxy server"""
    print("=" * 50)
    print("🚀 Hotdesk Helper - Python Proxy Server")
    print("=" * 50)
    print()
    
    # Check if port is available
    try:
        with socketserver.TCPServer(("", PORT), ProxyHandler) as httpd:
            print(f"✅ Server starting on http://localhost:{PORT}")

            print("🛑 Press Ctrl+C to stop the server")
            print("=" * 50)
            print()
            
            try:
                httpd.serve_forever()
            except KeyboardInterrupt:
                print("\n")
                print("🛑 Server stopped by user")
                print("👋 Goodbye!")
                
    except OSError as e:
        if e.errno == 98 or e.errno == 10048:  # Address already in use
            print(f"❌ Error: Port {PORT} is already in use")
            print("💡 Try closing other applications using this port or change the PORT variable")
        else:
            print(f"❌ Error starting server: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()

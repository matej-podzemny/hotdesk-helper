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
import ssl

PORT = 3000

class ProxyHandler(http.server.BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        """Handle CORS preflight requests"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Bearer, X-Requested-With, Accept, Accept-Language, Origin, Referer, User-Agent')
        self.send_header('Access-Control-Max-Age', '86400')
        self.end_headers()

    def do_POST(self):
        """Handle POST requests to /proxy endpoint"""
        if self.path.startswith('/proxy'):
            self.handle_proxy_request()
        else:
            self.send_error(404, "Endpoint not found")

    def handle_proxy_request(self):
        """Proxy POST requests to external API"""
        try:
            # Parse the URL and query parameters
            parsed_url = urlparse(self.path)
            query_params = parse_qs(parsed_url.query)
            
            # Get target URL from query parameter
            if 'url' not in query_params:
                self.send_error_response(400, {'error': 'Missing ?url= parameter'})
                return
            
            target_url = query_params['url'][0]
            
            # Check if insecure mode is requested (bypass SSL verification)
            insecure_mode = 'insecure' in query_params and query_params['insecure'][0].lower() == 'true'
            
            # Read request body
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length) if content_length > 0 else b''
            
            # Prepare headers for the target request
            headers = {
                'Accept': 'application/json',
                'Accept-Language': 'undefined',
                'Content-Type': 'application/json',
                'Origin': 'https://hotdesk.cat.com',
                'Referer': 'https://hotdesk.cat.com/create-booking',
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15'
            }
            
            # Forward Bearer token if present
            if 'Bearer' in self.headers:
                headers['Bearer'] = self.headers['Bearer']
            if 'Authorization' in self.headers:
                headers['Authorization'] = self.headers['Authorization']
            
            # Allow client to override headers if provided
            header_whitelist = ['Accept', 'Accept-Language', 'Origin', 'Referer', 'User-Agent']
            for header_name in header_whitelist:
                if header_name in self.headers:
                    headers[header_name] = self.headers[header_name]
                        
            # Create the request
            req = urllib.request.Request(
                target_url,
                data=post_data,
                headers=headers,
                method='POST'
            )
            
            # Make the request
            print(f"🔄 Proxying POST request to: {target_url}")
            if insecure_mode:
                print("⚠️  Using insecure mode - SSL certificate verification disabled")
            
            # Create SSL context based on mode
            if insecure_mode:
                ssl_context = ssl.create_default_context()
                ssl_context.check_hostname = False
                ssl_context.verify_mode = ssl.CERT_NONE
                
                with urllib.request.urlopen(req, context=ssl_context) as response:
                    response_data = response.read()
                    response_status = response.getcode()
            else:
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
            
        except ssl.SSLError as e:
            # Handle SSL certificate errors specifically
            ssl_error_msg = str(e)
            print(f"🔒 SSL Certificate Error: {ssl_error_msg}")
            
            # Check if it's a certificate verification error
            if "certificate verify failed" in ssl_error_msg.lower() or "ssl:" in ssl_error_msg.lower():
                self.send_error_response(495, {
                    'error': 'SSL Certificate Verification Failed',
                    'error_type': 'ssl_certificate_error',
                    'details': ssl_error_msg,
                    'message': 'The server\'s SSL certificate could not be verified. This may happen with self-signed certificates or internal servers.',
                    'options': {
                        'retry_insecure': True,
                        'retry_message': 'You can retry with SSL verification disabled (insecure mode), or cancel the operation.'
                    }
                })
            else:
                # Other SSL errors
                self.send_error_response(495, {
                    'error': 'SSL Connection Error',
                    'error_type': 'ssl_error',
                    'details': ssl_error_msg
                })
            
        except urllib.error.URLError as e:
            # Handle network errors (may also contain SSL errors)
            error_reason = str(e.reason)
            print(f"❌ Network Error: {error_reason}")
            
            # Check if the URLError contains SSL certificate issues
            if hasattr(e.reason, 'reason') and 'certificate verify failed' in str(e.reason.reason).lower():
                self.send_error_response(495, {
                    'error': 'SSL Certificate Verification Failed',
                    'error_type': 'ssl_certificate_error',
                    'details': error_reason,
                    'message': 'The server\'s SSL certificate could not be verified. This may happen with self-signed certificates or internal servers.',
                    'options': {
                        'retry_insecure': True,
                        'retry_message': 'You can retry with SSL verification disabled (insecure mode), or cancel the operation.'
                    }
                })
            else:
                self.send_error_response(500, {
                    'error': 'Proxy request failed',
                    'details': error_reason
                })
            
        except Exception as e:
            # Handle other errors
            error_msg = str(e)
            print(f"❌ Unexpected Error: {error_msg}")
            
            # Check if the generic exception contains SSL-related errors
            if 'certificate verify failed' in error_msg.lower() or 'ssl' in error_msg.lower():
                self.send_error_response(495, {
                    'error': 'SSL Certificate Verification Failed',
                    'error_type': 'ssl_certificate_error',
                    'details': error_msg,
                    'message': 'The server\'s SSL certificate could not be verified. This may happen with self-signed certificates or internal servers.',
                    'options': {
                        'retry_insecure': True,
                        'retry_message': 'You can retry with SSL verification disabled (insecure mode), or cancel the operation.'
                    }
                })
            else:
                self.send_error_response(500, {
                    'error': 'Proxy request failed',
                    'details': error_msg
                })

    def send_cors_headers(self):
        """Send CORS headers"""
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Bearer, X-Requested-With, Accept, Accept-Language, Origin, Referer, User-Agent')

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

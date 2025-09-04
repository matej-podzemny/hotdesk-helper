#!/usr/bin/env python3
import sys
import json
import urllib.request
import urllib.error
import os

def get_current_version():
    try:
        with open('VERSION', 'r') as f:
            return f.read().strip()
    except FileNotFoundError:
        return 'v1'

def get_latest_version():
    try:
        url = 'https://api.github.com/repos/matej-podzemny/hotdesk-helper/releases/latest'
        req = urllib.request.Request(url)
        req.add_header('User-Agent', 'hotdesk-helper-version-checker')
        
        with urllib.request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode())
            return data.get('tag_name')
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return None  # No releases found
        raise
    except Exception:
        return None

def compare_versions(current, latest):
    if not latest:
        return 'no_releases'
    if current == latest:
        return 'up_to_date'
    return 'update_available'

def main():
    # Check command line arguments
    output_format = 'cli'
    if len(sys.argv) > 1:
        if sys.argv[1] in ['--json', '-j']:
            output_format = 'json'
        elif sys.argv[1] in ['--help', '-h']:
            print("Usage: python check_version.py [--json|-j] [--help|-h]")
            print("  --json, -j: Output in JSON format")
            print("  --help, -h: Show this help")
            return 0

    current_version = get_current_version()
    
    try:
        latest_version = get_latest_version()
        status = compare_versions(current_version, latest_version)
        error = None
    except Exception as e:
        latest_version = None
        status = 'error'
        error = str(e)

    if output_format == 'json':
        result = {
            'current_version': current_version,
            'latest_version': latest_version,
            'status': status,
            'update_available': status == 'update_available',
            'error': error
        }
        print(json.dumps(result))
        return 0
    else:
        print(f"📦 Current version: {current_version}")
        
        if status == 'error':
            print(f"⚠️  Could not check for updates: {error}")
            return 1
        elif status == 'no_releases':
            print("ℹ️  No releases found in repository yet")
            return 0
        elif status == 'up_to_date':
            print("✅ You're running the latest version!")
            return 0
        elif status == 'update_available':
            print(f"🌐 Latest version: {latest_version}")
            print("")
            print("🆕 ===============================================")
            print("🆕  NEW VERSION AVAILABLE!")
            print("🆕 ===============================================")
            print(f"🆕  Current: {current_version}")
            print(f"🆕  Latest:  {latest_version}")
            print("🆕")
            print("🆕  To update to the latest version, run:")
            print("🆕    git pull")
            print("🆕")
            print("🆕  Or visit: https://github.com/matej-podzemny/hotdesk-helper/releases")
            print("🆕 ===============================================")
            print("")
            return 2

if __name__ == '__main__':
    sys.exit(main())

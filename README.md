# Hotdesk Helper

A comprehensive desk booking solution for the `hotdesk.cat.com` system. This tool provides both a command-line script and a web interface for booking desks efficiently.

## Quick Start

### Option 1: Use the Web Interface

1. **Download and extract** the files to your computer
2. **Run the application:**
   - **Windows**: Double-click `start.bat`
   - **macOS/Linux**: Run `./start.sh` in terminal
3. **Configure** your details in the web interface
4. **Select dates** and **book your desk**

### Option 2: Use the Command Line Script

## Installation and Setup

### Step 1: Clone the Repository

Open your terminal and clone this repository to your local machine.

```sh
git clone https://github.com/matej-podzemny/hotdesk-helper.git
```

### Step 2: Navigate into the Directory

```sh
cd hotdesk-helper
```

### Step 3: Make Scripts Executable (macOS/Linux only)

```sh
chmod +x booking.sh start.sh
```

## Configuration

This is the most important step for the command-line script. You must configure the script before running it.

Open the `config.env` file in your favorite text editor and edit the values.

### Required Settings

```bash
# --- ⚙️ User Configuration ⚙️ ---

# Your company email
EMAIL="your.email@company.com"

# The ID of the seat you want to book
SEAT_ID="YOUR_SEAT_ID_HERE"

# Your Bearer token
BEARER_TOKEN="PASTE_YOUR_BEARER_TOKEN_HERE"
```

### Booking Mode Selection

The script automatically chooses between two booking modes based on your configuration:

#### Week-based Booking (Default)
If `START_DATE` and `END_DATE` are empty, the script uses week-based booking:
```bash
# Number of booking weeks to process
WEEKS_TO_BOOK=1

# Number of days from today to start booking
START_DATE_OFFSET=15

# Leave these empty for week-based mode
START_DATE=""
END_DATE=""
```

#### Specific Date Range
If you specify both `START_DATE` and `END_DATE`, the script automatically uses date range mode:
```bash
# Specify exact start and end dates (YYYY-MM-DD format)
START_DATE="2025-08-01"
END_DATE="2025-08-15"
```

### Weekday Selection

Choose which days of the week to book:

```bash
# --- ⭐ WEEKDAY SELECTION ⭐ ---
# Set to 1 for days you want to book, 0 for days you don't want
BOOK_MONDAY=1      # Monday
BOOK_TUESDAY=1     # Tuesday  
BOOK_WEDNESDAY=1   # Wednesday
BOOK_THURSDAY=0    # Thursday (disabled)
BOOK_FRIDAY=0      # Friday (disabled)
```
### How to Find Your `SEAT_ID` and `BEARER_TOKEN`

You need to extract these values from your browser while logged into the hotdesk system:

1. **Log In and Open Developer Tools**
   - Open your web browser and log in to `https://hotdesk.cat.com`
   - Open **Developer Tools** (press **F12** or right-click → "Inspect")
   - Go to the **Network** tab

2. **Capture the Booking Request**
   - On the website, book your desired desk for at least one day
   - In the Network tab, look for a request named `PostSeatBookingMultiDateNew`
   - Click on this request to view its details

3. **Extract the Required Values**
   
   **For `SEAT_ID`:**
   - In the **Headers** tab, find the **Request URL**
   - Look for `seatIDs=` and copy the number that follows
   - ⚠️ **Important**: This internal ID differs from the visible desk number on the floor plan
   
   **For `BEARER_TOKEN`:**
   - In the **Request Headers** section, find the `Bearer` header
   - Copy the entire long string that follows it

4. **Update Your Configuration**
   - Paste these values into your `config.env` file
   - Replace the placeholder values for `EMAIL`, `SEAT_ID`, and `BEARER_TOKEN`

<img width="1906" height="971" alt="Developer Tools Screenshot" src="https://github.com/user-attachments/assets/e02f7038-dd24-47c5-aca1-24e6f0900e41" />

## Usage

### Web Interface (Recommended)

**Windows:**
```cmd
start.bat
```

**macOS/Linux:**
```bash
./start.sh
```

The web interface will open automatically in your browser. Simply:
1. Configure your email, seat, and bearer token
2. Select your desired dates using the calendar
3. Click "Book Now" to submit your reservations

### Command Line Script

Once you have configured the `config.env` file, run the script:

```bash
./booking.sh
```

The script will:
- Display the dates it plans to book
- Ask for confirmation
- Submit the booking requests
- Show the results

## Troubleshooting

### Common Issues

**"Please configure your details first"**
- You forgot to replace placeholder values in `config.env`
- Make sure `SEAT_ID`, `BEARER_TOKEN`, and `EMAIL` are properly set

**Booking fails / "Something went wrong"**
- **Most common cause**: Expired `BEARER_TOKEN`  
  - Tokens are temporary and expire quickly
  - Get a fresh token from your browser and update `config.env`
- **Alternative cause**: Dates already booked
  - Check the API response - it may show existing booking details
  - Verify your bookings on the website

**"No dates selected for booking"**
- Check your weekday selection settings (`BOOK_MONDAY`, `BOOK_TUESDAY`, etc.)
- Ensure at least one day is set to `1`
- For date range mode, verify `START_DATE` and `END_DATE` are correct

**Port 3000 already in use (Web Interface)**
- Another application is using port 3000
- Close other applications or restart your computer
- The proxy server will show this error on startup

**Web interface won't open**
- Make sure Python is installed and accessible
- Check that `proxy_server.py` and `index.html` exist in the directory
- Try running the start script from the correct directory

### Response Interpretation

**Success Response:**
```
API Response: "\"\""
🎉 SUCCESS: The booking was successful!
```

**Already Booked Response:**
```
API Response: [{"SEAT_NAME":"18","LOCATION_NAME":"Slovakia Kosice", ...}]
ℹ️ Something went wrong, Response received: [booking details]
```
This usually means the dates are already booked. Check the website to confirm your reservations.

### Getting Help

- **Bearer Token Issues**: The token expires frequently. Always get a fresh one when booking fails.
- **Seat ID Issues**: Remember that the internal seat ID differs from the displayed desk number.
- **Date Issues**: Ensure your date format is correct (YYYY-MM-DD) and dates are in the future.

For the web interface, check the browser's developer console for any JavaScript errors.

#!/bin/bash
# --- ⚙️ User Configuration ⚙️ ---
# Enter the details for your booking in this section.
# 1. Put your company email
# 2. Find the ID for the desk/seat you want.
# 3. Get a fresh Bearer token from your browser's developer tools.
# ----------------------------------------------------------------
# Your email
EMAIL="PASTE_YOUR_EMAIL_HERE"

# The ID of the seat you want to book
SEAT_ID="YOUR_SEAT_ID_HERE"

# Your Bearer token. This is a very long string that you must get from
# a logged-in browser session. It is time-sensitive and will expire.
BEARER_TOKEN="PASTE_YOUR_BEARER_TOKEN_HERE"

# (Optional) Number of booking weeks to process
WEEKS_TO_BOOK=1

# (Optional) Number of days from today to start booking (default: 15 days as UI allow only 14 days in advance).
START_DATE_OFFSET=15

# --- ⭐ WEEKDAY SELECTION - SET WHICH DAYS YOU WANT TO BOOK ⭐ ---
# Set to 1 for days you want to book, 0 for days you don't want
# 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday
BOOK_MONDAY=1      # Monday
BOOK_TUESDAY=1     # Tuesday  
BOOK_WEDNESDAY=1   # Wednesday
BOOK_THURSDAY=0    # Thursday (disabled)
BOOK_FRIDAY=0      # Friday (disabled)

# --- End of Configuration ---
# Do not edit below this line unless you know what you are doing.
# ----------------------------------------------------------------

# --- Validation ---
# Check if the user has updated the placeholder variables.
if [ "$SEAT_ID" == "YOUR_SEAT_ID_HERE" ] || [ "$BEARER_TOKEN" == "PASTE_YOUR_BEARER_TOKEN_HERE" ] || [ "$EMAIL" == "PASTE_YOUR_EMAIL_HERE" ] ; then
  echo "🛑 Error: Please configure your details first."
  echo "You must edit the 'User Configuration' section at the top of this script"
  echo "and replace the placeholder values for SEAT_ID and BEARER_TOKEN."
  exit 1
fi

echo "Attempting to book Seat ID: ${SEAT_ID}"
echo "Booking for ${WEEKS_TO_BOOK} weeks, starting in ${START_DATE_OFFSET} days."

# Display selected days
echo "Selected days to book:"
[ "$BOOK_MONDAY" == "1" ] && echo "  ✅ Monday"
[ "$BOOK_TUESDAY" == "1" ] && echo "  ✅ Tuesday"  
[ "$BOOK_WEDNESDAY" == "1" ] && echo "  ✅ Wednesday"
[ "$BOOK_THURSDAY" == "1" ] && echo "  ✅ Thursday"
[ "$BOOK_FRIDAY" == "1" ] && echo "  ✅ Friday"

echo "------------------------------------------------"

# --- OS Detection for Date Command ---
OS_TYPE=$(uname)
if [ "$OS_TYPE" == "Darwin" ]; then # macOS
  DATE_CMD="date -v"
  DATE_FORMAT="+%-m/%-d/%Y"
elif [ "$OS_TYPE" == "Linux" ]; then # GNU/Linux
  DATE_CMD="date -d"
  DATE_FORMAT="+%-m/%-d/%Y"
else
  echo "Error: Unsupported OS for date calculations: $OS_TYPE"
  exit 1
fi

# --- Function to check if we should book this day ---
should_book_day() {
  local day_of_week=$1
  case $day_of_week in
    1) [ "$BOOK_MONDAY" == "1" ] && return 0 ;;
    2) [ "$BOOK_TUESDAY" == "1" ] && return 0 ;;
    3) [ "$BOOK_WEDNESDAY" == "1" ] && return 0 ;;
    4) [ "$BOOK_THURSDAY" == "1" ] && return 0 ;;
    5) [ "$BOOK_FRIDAY" == "1" ] && return 0 ;;
  esac
  return 1
}

# --- Date and JSON Payload Generation ---
json_parts=()
current_date_offset=$START_DATE_OFFSET
weeks_processed=0
days_in_current_week=0

echo "The script will attempt to book the following dates:"

while [ "$weeks_processed" -lt "$WEEKS_TO_BOOK" ]; do
  target_date=$($DATE_CMD "+${current_date_offset}d" "$DATE_FORMAT")
  day_of_week=$($DATE_CMD "+${current_date_offset}d" "+%u") # 1=Mon, 7=Sun
  
  # Check if it's a weekday (1-5) and if we want to book this day
  if [ "$day_of_week" -ge 1 ] && [ "$day_of_week" -le 5 ]; then
    if should_book_day "$day_of_week"; then
      full_date_string="${target_date} 12:00:00 AM"
      echo "  - $full_date_string"
      json_parts+=("\"${full_date_string}\":\"${full_date_string}\"")
    fi
    ((days_in_current_week++))
  fi
  
  # Check if we've finished a week (reached Saturday, day 6)
  if [ "$day_of_week" -eq 6 ]; then
    ((weeks_processed++))
    days_in_current_week=0
  fi
  
  ((current_date_offset++))
  
  # Safety check to prevent infinite loops
  if [ "$current_date_offset" -gt $((START_DATE_OFFSET + 200)) ]; then
    echo "⚠️  Warning: Stopped processing to prevent infinite loop"
    break
  fi
done

# Check if we have any dates to book
if [ ${#json_parts[@]} -eq 0 ]; then
  echo "❌ No dates selected for booking based on your day selection."
  echo "Please check your day selection settings (BOOK_MONDAY, BOOK_TUESDAY, etc.)"
  exit 1
fi

json_body=$(IFS=,; echo "${json_parts[*]}")
JSON_PAYLOAD="{${json_body}}"

echo "------------------------------------------------"
echo "Generated JSON Payload:"
echo "$JSON_PAYLOAD"
echo "------------------------------------------------"

read -p "Do you want to continue? (y/n): " answer

case "$answer" in
    [yY]|[yY][eE][sS])
        echo "Continuing..."
        ;;
    [nN]|[nN][oO])
        echo "Exiting script."
        exit 0
        ;;
    *)
        echo "Invalid answer. Exiting."
        exit 1
        ;;
esac

# --- Execute the Request ---
RESPONSE=$(curl -s "https://hotdesk.cat.com/api/CreateBooking/PostSeatBookingMultiDateNew/?locationId=11&sublocationId=26&floorId=4&zoneId=Open%20Space&seatIDs=${SEAT_ID}&emailId=${EMAIL}&reason=null&starttime=08:00AM&endtime=06:00PM" \
  -X POST \
  -H 'Accept: application/json' \
  -H 'Accept-Language: undefined' \
  -H "Bearer: ${BEARER_TOKEN}" \
  -H 'Content-Type: application/json' \
  -H 'Origin: https://hotdesk.cat.com' \
  -H 'Referer: https://hotdesk.cat.com/create-booking' \
  -H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15' \
  --data-raw "${JSON_PAYLOAD}")

echo "API Response: $RESPONSE"

# Check if the booking was successful
if [ "$RESPONSE" = '"\"\""' ]; then
  echo "🎉 SUCCESS: The booking was successful!"
else
  echo "ℹ️ Something went wrong, Response received: $RESPONSE"
fi

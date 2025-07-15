#!/bin/bash

# --- ⚙️ Load Configuration ⚙️ ---
CONFIG_FILE="config.env"

# Check if the configuration file exists
if [ ! -f "$CONFIG_FILE" ]; then
    echo "❌ Error: Configuration file not found!"
    echo "Please create a '$CONFIG_FILE' file in the same directory."
    exit 1
fi

# Source the configuration file to load variables
source "$CONFIG_FILE"
echo "✅ Configuration loaded from '$CONFIG_FILE'"

# --- 🛡️ Validate Essential Configuration 🛡️ ---
# Check that the user has replaced the placeholder values for critical variables.
if [[ "$EMAIL" == "PASTE_YOUR_EMAIL_HERE" || -z "$EMAIL" ]]; then
    echo "❌ Error: Please set your EMAIL in '$CONFIG_FILE'."
    exit 1
fi

if [[ "$SEAT_ID" == "YOUR_SEAT_ID_HERE" || -z "$SEAT_ID" ]]; then
    echo "❌ Error: Please set your SEAT_ID in '$CONFIG_FILE'."
    exit 1
fi

if [[ "$BEARER_TOKEN" == "PASTE_YOUR_BEARER_TOKEN_HERE" || -z "$BEARER_TOKEN" ]]; then
    echo "❌ Error: Please set your BEARER_TOKEN in '$CONFIG_FILE'."
    exit 1
fi

# --- 🔧 Set Defaults & Validate Weekday Configuration 🔧 ---
# If weekday settings are missing from the config, default them to 0 (don't book).
# This makes the script more robust.
BOOK_MONDAY=${BOOK_MONDAY:=0}
BOOK_TUESDAY=${BOOK_TUESDAY:=0}
BOOK_WEDNESDAY=${BOOK_WEDNESDAY:=0}
BOOK_THURSDAY=${BOOK_THURSDAY:=0}
BOOK_FRIDAY=${BOOK_FRIDAY:=0}

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

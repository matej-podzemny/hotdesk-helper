#!/bin/bash

# --- ⚙️ User Configuration ⚙️ ---
# Enter the details for your booking in this section.
# 1. Find the ID for the desk/seat you want.
# 2. Get a fresh Bearer token from your browser's developer tools.
# ----------------------------------------------------------------

# The ID of the seat you want to book
SEAT_ID="YOUR_SEAT_ID_HERE"

# Your Bearer token. This is a very long string that you must get from
# a logged-in browser session. It is time-sensitive and will expire.
BEARER_TOKEN="PASTE_YOUR_BEARER_TOKEN_HERE"

# (Optional) Number of consecutive weekdays to book.
DAYS_TO_BOOK=30

# (Optional) Number of days from today to start booking (default: 15 days as UI allow only 14 days in advance).
START_DATE_OFFSET=15

# --- End of Configuration ---
# Do not edit below this line unless you know what you are doing.
# ----------------------------------------------------------------

# --- Validation ---
# Check if the user has updated the placeholder variables.
if [ "$SEAT_ID" == "YOUR_SEAT_ID_HERE" ] || [ "$BEARER_TOKEN" == "PASTE_YOUR_BEARER_TOKEN_HERE" ]; then
  echo "🛑 Error: Please configure your details first."
  echo "You must edit the 'User Configuration' section at the top of this script"
  echo "and replace the placeholder values for SEAT_ID and BEARER_TOKEN."
  exit 1
fi

echo "Attempting to book Seat ID: ${SEAT_ID}"
echo "Booking for ${DAYS_TO_BOOK} weekdays, starting in ${START_DATE_OFFSET} days."
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

# --- Date and JSON Payload Generation ---
json_parts=()
current_date_offset=$START_DATE_OFFSET # Start booking from the configured offset
days_booked=0

echo "The script will attempt to book the following dates:"

while [ "$days_booked" -lt "$DAYS_TO_BOOK" ]; do
  target_date=$($DATE_CMD "+${current_date_offset}d" "$DATE_FORMAT")
  day_of_week=$($DATE_CMD "+${current_date_offset}d" "+%u") # 1=Mon, 5=Fri

  # Check if the day is a weekday
  if [ "$day_of_week" -ge 1 ] && [ "$day_of_week" -le 5 ]; then
    full_date_string="${target_date} 12:00:00 AM"
    echo "  - $full_date_string"
    json_parts+=("\"${full_date_string}\":\"${full_date_string}\"")
    ((days_booked++))
  fi

  ((current_date_offset++))
done

json_body=$(IFS=,; echo "${json_parts[*]}")
JSON_PAYLOAD="{${json_body}}"

echo "------------------------------------------------"
echo "Generated JSON Payload:"
echo "$JSON_PAYLOAD"
echo "------------------------------------------------"

# --- Execute the Request ---
RESPONSE=$(curl -s "https://hotdesk.cat.com/api/CreateBooking/PostSeatBookingMultiDateNew/?locationId=11&sublocationId=26&floorId=4&zoneId=Open%20Space&seatIDs=${SEAT_ID}&emailId=Matej.Podzemny@cat.com&reason=null&starttime=08:00AM&endtime=06:00PM" \
  -X POST \
  -H 'Accept: application/json' \
  -H 'Accept-Language: undefined' \
  -H "Bearer: ${BEARER_TOKEN}" \
  -H 'Content-Type: application/json' \
  -H 'Cookie: HotDeskApp=...; ADRUM=...; ...' \
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

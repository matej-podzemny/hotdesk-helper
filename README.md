# Hotdesk Booking Script

This script automates the process of booking a specific desk on the `hotdesk.cat.com` system. It can book a seat for multiple consecutive weekdays, starting from a future date that you specify.

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

### Step 3: Make the Script Executable
Before you can run the script, you need to give it "execute" permissions. This only needs to be done once.

```sh
chmod +x booking.sh
```

## Configuration

This is the most important step. You must configure the script before running it.

Open the booking.sh file in your favorite text editor and find the **User Configuration** section at the top.

```sh
# --- ⚙️ User Configuration ⚙️ ---

# Your company email
EMAIL="PASTE_YOUR_EMAIL_HERE"

# The ID of the seat you want to book
SEAT_ID="YOUR_SEAT_ID_HERE"

# Your Bearer token
BEARER_TOKEN="PASTE_YOUR_BEARER_TOKEN_HERE"

# Number of booking weeks to process
WEEKS_TO_BOOK=30

# Number of days from today to start booking
START_DATE_OFFSET=15
```
You need to change the following values in the script:

*   **`EMAIL`**: Your company email.
*   **`SEAT_ID`**: The internal system ID for the desk you want.
*   **`BEARER_TOKEN`**: A temporary authentication token that proves you are logged in.
*   **`WEEKS_TO_BOOK`** (Optional): How many weeks to book.
*   **`START_DATE_OFFSET`** (Optional): How many days in the future to start booking.

### How to Find Your `SEAT_ID` and `BEARER_TOKEN`

Follow these steps to get the required values. You will get both from the same place.

1.  **Log In and Open Developer Tools**
    *   Open your web browser (like Chrome) and log in to `https://hotdesk.cat.com`.
    *   Open the **Developer Tools** (usually by pressing **F12**, or right-clicking the page and selecting "Inspect").
    *   Select the **Network** tab.

2.  **Capture the Booking Request**
    *   On the website, perform the action to book your desired desk for at least one day.
    *   Look for a request in the Network log named `PostSeatBookingMultiDateNew` or similar and click on it. This single request contains everything you need.

3.  **Find and Copy the Values**
    *   With the request selected, a new panel will show its details.
    *   **To get the `SEAT_ID`**:
        > At the top of the **Headers** tab, find the **Request URL**. Look for the `seatIDs=` part and copy the number that follows. This is your `SEAT_ID`.
        >
        > ⚠️ **Important:** This ID is an internal identifier and will **not** match the visible desk number on the floor plan (e.g., 'Desk 20' will have a different ID).

    *   **To get the `BEARER_TOKEN`**:
        > In the same **Headers** tab, scroll down to the **Request Headers** section. Find the `Bearer` header and **copy the entire long string** of text that follows it.

4.  **Update the Script**
    *   Paste the values you copied into the `SEAT_ID` and `BEARER_TOKEN` variables at the top of the `book_desk.sh` script.
  

<img width="1906" height="971" alt="screenshot" src="https://github.com/user-attachments/assets/e02f7038-dd24-47c5-aca1-24e6f0900e41" />


## Usage

Once you have configured and saved the `booking.sh` file, run it from your terminal (make sure you are inside the `hotdesk-helper` directory):

```sh
./booking.sh
```

## Troubleshooting

*   **Error: "Please configure your details first."**: You forgot to replace the placeholder values for `SEAT_ID` or `BEARER_TOKEN` in the script file.
*   **The script runs but the booking fails**: The most common reason is an expired `BEARER_TOKEN`. They are only valid for a short time. Repeat the steps in the **Configuration** section to get a new token and try again.
*   **Error: Response shows booking details but says "Something went wrong"**
    *   If your output looks similar to this:
        > ```
        > API Response: [{"SEAT_NAME":"18","LOCATION_NAME":"Slovakia Kosice", ...}]
        > ℹ️ Something went wrong.
        > ```
    *   **Cause:** This typically means that some or all of the dates you tried to book are **already booked**. The API is not creating a new booking; it's simply returning the details of the one that already exists.
    *   **Why the error?** The script's success check is very simple: it expects a specific empty response (`""`) from the API for a *brand new* booking. When it receives your existing booking data instead, it doesn't match the success condition and therefore reports that something went wrong.
    *   **Solution:** This is not a critical error. Your desk is already secured for those dates. You can verify this by checking your bookings on the Hotdesk website.

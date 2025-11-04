let selectedDates = new Set();
let currentMonth1 = new Date();
let currentMonth2 = new Date();

currentMonth2.setMonth(currentMonth2.getMonth() + 1);

const API_BASE = 'https://hotdesk.cat.com/api';

const SEAT_MAPPING = {
    '1': 8397, '2': 8377, '3': 8357, '4': 8396, '5': 8376,
    '6': 8356, '7': 8395, '8': 8375, '9': 8355, '10': 8394,
    '11': 8374, '12': 8354, '13': 8393, '14': 8373, '15': 8353,
    '16': 8392, '17': 8372, '18': 8352, '19': 8391, '20': 8371,
    '21': 8351, '22': 8390, '23': 8370, '24': 8350, '25': 8389,
    '26': 8369, '27': 8349, '28': 8388, '29': 8368, '30': 8348,
    '31': 8387, '32': 8367, '33': 8347, '34': 8386, '35': 8366,
    '36': 8346, '37': 8385, '38': 8365, '39': 8345, '40': 8384,
    '41': 8364, '42': 8344, '43': 8383, '44': 8363, '45': 8343,
    '46': 8382, '47': 8362, '48': 8342, '49': 8381, '50': 8361,
    '51': 8341, '52': 8380, '53': 8360, '54': 8340, '55': 8379,
    '56': 8359, '57': 8339, '58': 8378, '59': 8358, '60': 8338
};

function validateUserCredentials(options = {}) {
    const userEmail = document.getElementById('email').value.trim();
    const bearerToken = document.getElementById('bearerToken').value.trim();
    const seatNumber = document.getElementById('seatNumber').value;

    const errors = [];

    if (!userEmail) {
        errors.push('Email is required');
    } else if (!isValidEmail(userEmail)) {
        errors.push('Please enter a valid email address');
    }

    if (!bearerToken) {
        errors.push('Bearer token is required');
    }

    if (!seatNumber) {
        errors.push('Seat number is required');
    } else if (!SEAT_MAPPING[seatNumber]) {
        errors.push('Invalid seat number selected');
    }

    if (options.requireDates) {
        if (selectedDates.size === 0) {
            errors.push('Please select at least one date');
        }
    }

    return {
        isValid: errors.length === 0,
        errors: errors,
        data: {
            email: userEmail,
            bearerToken: bearerToken,
            seatNumber: seatNumber,
            seatId: SEAT_MAPPING[seatNumber]
        }
    };
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

document.addEventListener('DOMContentLoaded', function () {
    initializeCalendars();
    setupDateInputs();
    populateSeatDropdown();
    loadUserData();
    setupAutoSave();

    setTimeout(() => {
        const validation = validateUserCredentials();
        if (validation.data.email && validation.data.bearerToken) {
            loadBookingsFromApi();
        }
    }, 500);
});

function populateSeatDropdown() {
    const seatSelect = document.getElementById('seatNumber');
    const SEAT_ID_START = 1;
    const SEAT_ID_END = 60;

    for (let i = SEAT_ID_START; i <= SEAT_ID_END; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = `Seat ${i}`;
        seatSelect.appendChild(option);
    }
}

function loadUserData() {
    const savedEmail = localStorage.getItem('hotdesk_email');
    if (savedEmail) {
        document.getElementById('email').value = savedEmail;
    }

    const savedSeat = localStorage.getItem('hotdesk_seat');
    if (savedSeat) {
        document.getElementById('seatNumber').value = savedSeat;
    }

    const savedToken = localStorage.getItem('hotdesk_token');
    if (savedToken) {
        document.getElementById('bearerToken').value = savedToken;
    }
}

function saveUserData() {
    const email = document.getElementById('email').value;
    if (email) {
        localStorage.setItem('hotdesk_email', email);
    } else {
        localStorage.removeItem('hotdesk_email');
    }

    const seat = document.getElementById('seatNumber').value;
    if (seat) {
        localStorage.setItem('hotdesk_seat', seat);
    } else {
        localStorage.removeItem('hotdesk_seat');
    }

    const token = document.getElementById('bearerToken').value;
    if (token) {
        localStorage.setItem('hotdesk_token', token);
    } else {
        localStorage.removeItem('hotdesk_token');
    }
}

function setupAutoSave() {
    const emailField = document.getElementById('email');
    const seatField = document.getElementById('seatNumber');
    const tokenField = document.getElementById('bearerToken');

    emailField.addEventListener('input', saveUserData);
    emailField.addEventListener('blur', saveUserData);

    seatField.addEventListener('change', saveUserData);

    tokenField.addEventListener('input', saveUserData);
    tokenField.addEventListener('blur', saveUserData);

    window.addEventListener('beforeunload', function (event) {
        saveUserData();
    });

    document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'hidden') {
            saveUserData();
        }
    });

    window.addEventListener('blur', function () {
        saveUserData();
    });
}

function setupDateInputs() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('rangeStartDate').min = today;
    document.getElementById('rangeEndDate').min = today;
}

function showStatus(elementId, message, type) {
    const element = document.getElementById(elementId);
    element.textContent = message;
    element.className = `status-message status-${type}`;
    element.style.display = 'block';

    if (type === 'loading') {
        element.innerHTML = '<div class="loading"></div>' + message;
    }
}

// Calendar functionality
function initializeCalendars() {
    updateCalendar(1);
    updateCalendar(2);

    document.getElementById('prevMonth1').addEventListener('click', () => navigateMonth(1, -1));
    document.getElementById('nextMonth1').addEventListener('click', () => navigateMonth(1, 1));
    document.getElementById('prevMonth2').addEventListener('click', () => navigateMonth(2, -1));
    document.getElementById('nextMonth2').addEventListener('click', () => navigateMonth(2, 1));
}

function navigateMonth(calendarNum, direction) {
    if (calendarNum === 1) {
        currentMonth1.setMonth(currentMonth1.getMonth() + direction);
        updateCalendar(1);
    } else {
        currentMonth2.setMonth(currentMonth2.getMonth() + direction);
        updateCalendar(2);
    }
}

function updateCalendar(calendarNum) {
    const currentMonth = calendarNum === 1 ? currentMonth1 : currentMonth2;
    const monthYearElement = document.getElementById(`monthYear${calendarNum}`);
    const calendarGrid = document.getElementById(`calendarGrid${calendarNum}`);

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    monthYearElement.textContent = `${monthNames[currentMonth.getMonth()]} ${currentMonth.getFullYear()}`;

    calendarGrid.innerHTML = '';

    const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dayHeaders.forEach(day => {
        const dayHeader = document.createElement('div');
        dayHeader.className = 'day-header';
        dayHeader.textContent = day;
        calendarGrid.appendChild(dayHeader);
    });

    const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Add empty cells for days before the first day
    for (let i = 0; i < startingDayOfWeek; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.className = 'day other-month';
        const prevMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 0);
        const prevMonthDay = prevMonth.getDate() - startingDayOfWeek + i + 1;
        const prevDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, prevMonthDay);
        const year = prevDate.getFullYear();
        const month = String(prevDate.getMonth() + 1).padStart(2, '0');
        const dayStr = String(prevDate.getDate()).padStart(2, '0');
        const prevDateString = `${year}-${month}-${dayStr}`;

        emptyDay.textContent = prevMonthDay;
        emptyDay.dataset.date = prevDateString;

        if (prevDate < today) {
            emptyDay.classList.add('past');
        }

        calendarGrid.appendChild(emptyDay);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
        const dayElement = document.createElement('div');
        const currentDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const dayStr = String(currentDate.getDate()).padStart(2, '0');
        const dateString = `${year}-${month}-${dayStr}`;

        dayElement.className = 'day';
        dayElement.textContent = day;
        dayElement.dataset.date = dateString;

        if (currentDate.toDateString() === today.toDateString()) {
            dayElement.classList.add('today');
        }

        if (currentDate < today) {
            dayElement.classList.add('past');
        }

        if (selectedDates.has(dateString)) {
            dayElement.classList.add('selected');
        }

        const dayOfWeek = currentDate.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) {
            dayElement.classList.add('weekend');
        }

        dayElement.addEventListener('click', () => toggleDate(dateString, dayElement));
        calendarGrid.appendChild(dayElement);
    }

    // Add days from next month to fill the remaining cells
    const totalCells = 42;
    const cellsUsed = startingDayOfWeek + daysInMonth;
    const remainingCells = totalCells - cellsUsed;

    for (let day = 1; day <= remainingCells && remainingCells < 7; day++) {
        const nextMonthDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, day);
        const year = nextMonthDate.getFullYear();
        const month = String(nextMonthDate.getMonth() + 1).padStart(2, '0');
        const dayStr = String(nextMonthDate.getDate()).padStart(2, '0');
        const nextDateString = `${year}-${month}-${dayStr}`;

        const dayElement = document.createElement('div');
        dayElement.className = 'day other-month';
        dayElement.textContent = day;
        dayElement.dataset.date = nextDateString;

        if (nextMonthDate < today) {
            dayElement.classList.add('past');
        }

        calendarGrid.appendChild(dayElement);
    }
}

function toggleDate(dateString, element) {
    const date = new Date(dateString);
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
        return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) {
        return;
    }

    if (selectedDates.has(dateString)) {
        selectedDates.delete(dateString);
        element.classList.remove('selected');
    } else {
        selectedDates.add(dateString);
        element.classList.add('selected');
    }
    updateSelectedDatesDisplay();
}

function toggleWeekdayInRange(targetDay) {
    const startDateValue = document.getElementById('rangeStartDate').value;
    const endDateValue = document.getElementById('rangeEndDate').value;

    if (!startDateValue || !endDateValue) {
        alert('Please select date range first');
        return;
    }

    const start = new Date(startDateValue);
    const end = new Date(endDateValue);
    const current = new Date(start);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekdayElement = document.querySelector(`[data-day="${targetDay}"]`);
    const isSelecting = !weekdayElement.classList.contains('checked');

    while (current <= end) {
        const dayOfWeek = current.getDay();
        if (dayOfWeek === targetDay && current >= today) {
            const year = current.getFullYear();
            const month = String(current.getMonth() + 1).padStart(2, '0');
            const dayStr = String(current.getDate()).padStart(2, '0');
            const dateString = `${year}-${month}-${dayStr}`;
            if (isSelecting) {
                selectedDates.add(dateString);
            } else {
                selectedDates.delete(dateString);
            }
        }
        current.setDate(current.getDate() + 1);
    }

    weekdayElement.classList.toggle('checked', isSelecting);

    const calendar1Grid = document.getElementById('calendarGrid1');
    const calendar2Grid = document.getElementById('calendarGrid2');

    calendar1Grid.querySelectorAll('.day').forEach(day => {
        const dateString = day.dataset.date;
        if (dateString && selectedDates.has(dateString)) {
            day.classList.add('selected');
        } else if (dateString && !selectedDates.has(dateString)) {
            day.classList.remove('selected');
        }
    });

    calendar2Grid.querySelectorAll('.day').forEach(day => {
        const dateString = day.dataset.date;
        if (dateString && selectedDates.has(dateString)) {
            day.classList.add('selected');
        } else if (dateString && !selectedDates.has(dateString)) {
            day.classList.remove('selected');
        }
    });

    updateWholeWeekButtonState();
    updateSelectedDatesDisplay();
}

function updateWholeWeekButtonState() {
    const wholeWeekBtn = document.getElementById('wholeWeekBtn');
    let allWeekdaysSelected = true;
    let anyWeekdaySelected = false;

    for (let day = 1; day <= 5; day++) {
        const weekdayElement = document.querySelector(`[data-day="${day}"]`);
        if (weekdayElement) {
            if (weekdayElement.classList.contains('checked')) {
                anyWeekdaySelected = true;
            } else {
                allWeekdaysSelected = false;
            }
        }
    }

    if (allWeekdaysSelected && anyWeekdaySelected) {
        wholeWeekBtn.classList.add('checked');
    } else {
        wholeWeekBtn.classList.remove('checked');
    }
}

function selectWholeWeek() {
    const startDateValue = document.getElementById('rangeStartDate').value;
    const endDateValue = document.getElementById('rangeEndDate').value;

    if (!startDateValue || !endDateValue) {
        alert('Please select date range first');
        return;
    }

    const wholeWeekBtn = document.getElementById('wholeWeekBtn');
    const isCurrentlySelected = wholeWeekBtn.classList.contains('checked');

    if (isCurrentlySelected) {
        for (let day = 1; day <= 5; day++) {
            const weekdayElement = document.querySelector(`[data-day="${day}"]`);
            if (weekdayElement && weekdayElement.classList.contains('checked')) {
                toggleWeekdayInRange(day);
            }
        }
        wholeWeekBtn.classList.remove('checked');
    } else {
        for (let day = 1; day <= 5; day++) {
            const weekdayElement = document.querySelector(`[data-day="${day}"]`);
            if (weekdayElement && !weekdayElement.classList.contains('checked')) {
                toggleWeekdayInRange(day);
            }
        }
        wholeWeekBtn.classList.add('checked');
    }
}

function updateSelectedDatesDisplay() {
    const display = document.getElementById('selectedDatesDisplay');
    const countElement = document.getElementById('selectedCount');

    countElement.textContent = selectedDates.size;

    if (selectedDates.size === 0) {
        display.innerHTML = 'No dates selected';
    } else {
        const sortedDates = Array.from(selectedDates).sort();
        display.innerHTML = sortedDates.map(date => {
            const dateObj = new Date(date);
            return `<span class="date-tag" onclick="removeDate('${date}')">${dateObj.toLocaleDateString()} ✕</span>`;
        }).join('');
    }
}

function removeDate(dateString) {
    selectedDates.delete(dateString);
    updateCalendar(1);
    updateCalendar(2);
    updateSelectedDatesDisplay();
}

function clearSelectedDates() {
    selectedDates.clear();
    document.querySelectorAll('.weekday-checkbox').forEach(el => el.classList.remove('checked'));
    updateCalendar(1);
    updateCalendar(2);
    updateSelectedDatesDisplay();
}

function clearErrors() {
    const bookingStatusDiv = document.getElementById('bookingStatus');
    bookingStatusDiv.textContent = '';
    bookingStatusDiv.className = 'status-message';
    bookingStatusDiv.style.display = 'none';
}

function proceedToBooking() {
    clearErrors();
    if (selectedDates.size === 0) {
        alert('Please select at least one date');
        return;
    }

    const userEmail = document.getElementById('email').value;
    const bearerToken = document.getElementById('bearerToken').value;
    const seatNumber = document.getElementById('seatNumber').value;

    if (!userEmail || !bearerToken || !seatNumber) {
        alert('Please fill in email, seat number, and bearer token');
        return;
    }

    const sortedDates = Array.from(selectedDates).sort();
    const summary = `
        <h4>Booking Summary:</h4>
        <p><strong>Email:</strong> ${userEmail}</p>
        <p><strong>Seat:</strong> Seat ${seatNumber} (ID: ${SEAT_MAPPING[seatNumber]})</p>
        <p><strong>Selected Dates:</strong> ${selectedDates.size} dates</p>
        <div style="margin-top: 15px;">
            ${sortedDates.map(date => {
        const dateObj = new Date(date);
        return `<span class="date-tag">${dateObj.toLocaleDateString()}</span>`;
    }).join('')}
        </div>
    `;

    document.getElementById('bookingSummary').innerHTML = summary;
    document.getElementById('bookingStep').classList.remove('hidden');
    document.getElementById('bookingStep').scrollIntoView({ behavior: 'smooth' });
}

function goBackToDateSelection() {
    document.getElementById('bookingStep').classList.add('hidden');
    document.getElementById('dateSelectionStep').scrollIntoView({ behavior: 'smooth' });
}

// API Functions - Direct API calls (no proxy)
async function submitBooking() {
    showStatus('bookingStatus', 'Checking existing reservations...', 'loading');

    const validation = validateUserCredentials();
    if (!validation.isValid) {
        showStatus('bookingStatus', `❌ ${validation.errors.join(', ')}`, 'error');
        return;
    }

    try {
        const existingReservations = await checkExistingReservations(validation.data.email, validation.data.bearerToken);

        if (existingReservations.length > 0) {
            const conflictMessage = `
                <div style="background: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 8px; margin: 10px 0;">
                    <h4 style="color: #721c24; margin-bottom: 10px;">❌ Booking Conflict Detected</h4>
                    <p style="color: #721c24; margin-bottom: 10px;">You already have reservations that conflict with your selected dates:</p>
                    ${existingReservations.map((res, index) => {
                const email = Object.keys(res)[0];
                const dateString = res[email];

                let formattedDate = dateString;
                try {
                    const date = new Date(dateString);
                    if (!isNaN(date.getTime())) {
                        formattedDate = date.toLocaleDateString();
                    }
                } catch (e) {
                    // Keep original string if parsing fails
                }

                return `<div style="margin: 5px 0; padding: 8px; background: rgba(255,255,255,0.8); border-radius: 4px; border-left: 4px solid #dc3545;">
                            <strong>Seat ${validation.data.seatNumber}</strong> - ${formattedDate}
                            <div style="font-size: 12px; color: #666; margin-top: 2px;">
                                Time: 8:00 AM - 6:00 PM
                            </div>
                        </div>`;
            }).join('')}
                    <div style="margin-top: 15px;">
                        <button class="btn btn-secondary btn-small" onclick="cancelBooking()">Back to Date Selection</button>
                    </div>
                </div>
            `;

            document.getElementById('bookingStatus').innerHTML = conflictMessage;
            document.getElementById('bookingStatus').className = 'status-message status-error';
            document.getElementById('bookingStatus').style.display = 'block';
            return;
        }

        showStatus('bookingStatus', '✅ No conflicts detected! Proceeding with booking...', 'success');

        setTimeout(async () => {
            const bookingDiv = document.createElement('div');
            bookingDiv.id = 'actualBookingStatus';
            bookingDiv.className = 'status-message status-loading';
            bookingDiv.innerHTML = '<div class="loading"></div>Processing booking request...';
            bookingDiv.style.display = 'block';
            bookingDiv.style.marginTop = '10px';

            const conflictStatus = document.getElementById('bookingStatus');
            conflictStatus.parentNode.insertBefore(bookingDiv, conflictStatus.nextSibling);

            await proceedWithBooking();
        }, 1500);

    } catch (error) {
        showStatus('bookingStatus', `Error checking reservations: ${error.message}`, 'error');
    }
}

async function checkExistingReservations(userEmail, bearerToken) {
    const validation = validateUserCredentials();
    const seatId = validation.data.seatId;

    const dateObjects = {};
    Array.from(selectedDates).forEach(dateStr => {
        const [year, month, day] = dateStr.split('-');
        const dateKey = `${month}/${day}/${year} 12:00:00 AM`;
        dateObjects[dateKey] = dateKey;
    });

    const jsonPayload = JSON.stringify(dateObjects);
    const url = `${API_BASE}/CreateBooking/CheckSeatAvailabilityBeforeBookingMultiDate/?locationId=11&sublocationId=26&floorId=4&zoneId=Open%20Space&seatIDs=${seatId}&starttime=08:00AM&endtime=06:00PM`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Bearer': bearerToken,
            'Content-Type': 'application/json',
            'Origin': 'https://hotdesk.cat.com',
            'Referer': 'https://hotdesk.cat.com/create-booking'
        },
        body: jsonPayload
    });

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.text();

    try {
        const onceParsed = JSON.parse(result);
        const parsedResult = typeof onceParsed === 'string' ? JSON.parse(onceParsed) : onceParsed;

        if (Array.isArray(parsedResult)) {
            const actualReservations = parsedResult.filter(item => {
                if (typeof item === 'object' && item !== null) {
                    const keys = Object.keys(item);
                    return keys.length > 0 && keys.some(key => item[key] && item[key].trim() !== '');
                }
                return false;
            });

            return actualReservations;
        }

        return [];
    } catch (e) {
        return [];
    }
}

async function proceedWithBooking() {
    const validation = validateUserCredentials();
    if (!validation.isValid) {
        showStatus('actualBookingStatus', `Validation failed: ${validation.errors.join(', ')}`, 'error');
        return;
    }

    try {
        const dateObjects = Array.from(selectedDates).map(dateStr => {
            const [year, month, day] = dateStr.split('-');
            return `"${month}/${day}/${year}":"${month}/${day}/${year}"`;
        });

        const jsonPayload = `{${dateObjects.join(',')}}`;
        const url = `${API_BASE}/CreateBooking/PostSeatBookingMultiDateNew/?locationId=11&sublocationId=26&floorId=4&zoneId=Open%20Space&seatIDs=${validation.data.seatId}&emailId=${validation.data.email}&reason=null&starttime=08:00AM&endtime=06:00PM`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Bearer': validation.data.bearerToken,
                'Content-Type': 'application/json',
                'Origin': 'https://hotdesk.cat.com',
                'Referer': 'https://hotdesk.cat.com/create-booking'
            },
            body: jsonPayload
        });

        const result = await response.text();
        const bookingStatusDiv = document.getElementById('actualBookingStatus');

        if (result === '"\"\""' || response.ok) {
            bookingStatusDiv.className = 'status-message status-success';
            bookingStatusDiv.innerHTML = `🎉 Successfully booked seat ${validation.data.seatNumber} for ${selectedDates.size} dates!`;

            let countdown = 10;
            const countdownInterval = setInterval(() => {
                countdown--;
                bookingStatusDiv.innerHTML = `🎉 Successfully booked seat ${validation.data.seatNumber} for ${selectedDates.size} dates!<br><br>Page will refresh in ${countdown} seconds...`;

                if (countdown <= 0) {
                    clearInterval(countdownInterval);
                    window.location.reload();
                }
            }, 1000);
        } else {
            throw new Error(`Booking failed: ${result}`);
        }
    } catch (error) {
        showStatus('actualBookingStatus', `Booking failed: ${error.message}`, 'error');
    }
}

function cancelBooking() {
    document.getElementById('bookingStatus').style.display = 'none';

    const actualBookingStatus = document.getElementById('actualBookingStatus');
    if (actualBookingStatus) {
        actualBookingStatus.remove();
    }

    document.getElementById('bookingStep').classList.add('hidden');
    document.getElementById('dateSelectionStep').scrollIntoView({ behavior: 'smooth' });
}

async function loadBookingsFromApi() {
    const validation = validateUserCredentials();

    if (!validation.data.email || !validation.data.bearerToken) {
        return;
    }

    showStatus('mybookingsStatus', 'Loading your bookings...', 'loading');

    try {
        const [myBookings, forSomeoneBookings, historyBookings] = await Promise.all([
            fetchBookings('/MyBookings/GetMyActiveBookings', validation.data.bearerToken, 'user bookings'),
            fetchBookings('/MyBookings/GetBookedForSomeoneActiveBookings', validation.data.bearerToken, 'booked for someone bookings'),
            fetchBookings('/MyBookings/GetMyBookingsHistory/?TimezoneOffset=60&OffsetCalculation=PLUS%20+%20&ShowMore=true', validation.data.bearerToken, 'booking history')
        ]);

        displayBookings(myBookings, forSomeoneBookings, historyBookings);

        const totalBookings = myBookings.length + forSomeoneBookings.length;
        showStatus('mybookingsStatus', `Successfully loaded ${totalBookings} active bookings (${myBookings.length} yours, ${forSomeoneBookings.length} for someone) and ${historyBookings.length} historical bookings`, 'success');

        setTimeout(() => {
            document.getElementById('mybookingsStatus').style.display = 'none';
        }, 3000);

    } catch (error) {
        showStatus('mybookingsStatus', `Error loading bookings: ${error.message}`, 'error');
    }
}

async function fetchBookings(endpoint, bearerToken, errorContext = 'bookings') {
    try {
        const url = `${API_BASE}${endpoint}`;
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Bearer': bearerToken,
                'Content-Type': 'application/json',
                'Origin': 'https://hotdesk.cat.com',
                'Referer': 'https://hotdesk.cat.com/create-booking'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        let parsedData = data;
        if (typeof data === 'string') {
            try {
                parsedData = JSON.parse(data);
            } catch (e) {
                console.error('Failed to parse JSON string:', e);
                return [];
            }
        }

        return Array.isArray(parsedData) ? parsedData : [];

    } catch (error) {
        console.error(`Error fetching ${errorContext}:`, error);
        throw error;
    }
}

function displayBookings(myBookings, forSomeoneBookings = [], historyBookings = []) {
    const today = new Date();
    const todayStr = formatDateForComparison(today);

    const todayBookings = [];
    const upcomingBookings = [];
    const forSomeoneUpcoming = [];

    myBookings.forEach(booking => {
        const bookingDate = parseBookingDate(booking.FROM_DATE);
        const bookingDateStr = formatDateForComparison(bookingDate);

        if (bookingDateStr === todayStr) {
            todayBookings.push(booking);
        } else if (bookingDate > today) {
            upcomingBookings.push(booking);
        }
    });

    forSomeoneBookings.forEach(booking => {
        const bookingDate = parseBookingDate(booking.FROM_DATE);
        if (bookingDate >= today) {
            forSomeoneUpcoming.push(booking);
        }
    });

    upcomingBookings.sort((a, b) => {
        const dateA = parseBookingDate(a.FROM_DATE);
        const dateB = parseBookingDate(b.FROM_DATE);
        return dateA - dateB;
    });

    forSomeoneUpcoming.sort((a, b) => {
        const dateA = parseBookingDate(a.FROM_DATE);
        const dateB = parseBookingDate(b.FROM_DATE);
        return dateA - dateB;
    });

    const todayContainer = document.getElementById('todayBookings');
    if (todayBookings.length === 0) {
        todayContainer.innerHTML = '<div class="no-bookings">No bookings for today</div>';
    } else {
        todayContainer.innerHTML = todayBookings.map(booking => createBookingHTML(booking, true)).join('');
    }

    const upcomingContainer = document.getElementById('upcomingBookings');
    if (upcomingBookings.length === 0) {
        upcomingContainer.innerHTML = '<div class="no-bookings">No upcoming bookings</div>';
    } else {
        upcomingContainer.innerHTML = upcomingBookings.map(booking => createBookingHTML(booking, false)).join('');
    }

    const forSomeoneContainer = document.getElementById('forSomeoneBookings');
    if (forSomeoneUpcoming.length === 0) {
        forSomeoneContainer.innerHTML = '<div class="no-bookings">No bookings for someone</div>';
    } else {
        forSomeoneContainer.innerHTML = forSomeoneUpcoming.map(booking => createBookingHTML(booking, false, 'forSomeone')).join('');
    }

    const historyContainer = document.getElementById('bookingHistory');
    if (historyBookings.length === 0) {
        historyContainer.innerHTML = '<div class="no-bookings">No booking history</div>';
    } else {
        historyBookings.sort((a, b) => {
            const dateA = parseBookingDate(a.FROM_DATE);
            const dateB = parseBookingDate(b.FROM_DATE);
            return dateB - dateA;
        });

        historyContainer.innerHTML = historyBookings.map(booking => createBookingHTML(booking, false, 'history')).join('');
    }

    document.getElementById('selectAllUpcoming').checked = false;
    document.getElementById('selectedCountUpcoming').classList.add('hidden');
    document.getElementById('bulkDeleteUpcoming').classList.add('hidden');

    document.getElementById('selectAllForSomeone').checked = false;
    document.getElementById('selectedCountForSomeone').classList.add('hidden');
    document.getElementById('bulkDeleteForSomeone').classList.add('hidden');
}

function parseBookingDate(dateString) {
    const parts = dateString.split('/');
    if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = 2000 + parseInt(parts[2], 10);
        return new Date(year, month, day);
    }
    return new Date();
}

function formatDateForComparison(date) {
    return date.getFullYear() + '-' +
        String(date.getMonth() + 1).padStart(2, '0') + '-' +
        String(date.getDate()).padStart(2, '0');
}

function createBookingHTML(booking, isToday, sectionType = null) {
    const bookingDate = parseBookingDate(booking.FROM_DATE);
    const formattedDate = bookingDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const timeRange = `${booking.FROM_TIME} - ${booking.TO_TIME}`;
    const seatInfo = `Seat ${booking.SEAT_NAME}`;
    const locationInfo = `${booking.ZONE}, Floor ${booking.FLOOR}`;

    const emailInfo = sectionType === 'forSomeone' && booking.EMAIL_ID
        ? `📧 ${booking.EMAIL_ID}`
        : '';

    if (!booking.BOOKING_ID || !booking.BOOKING_REFERENCE) {
        console.error('Missing booking ID or reference:', booking);
        return '';
    }

    const bookingElementId = `booking-${booking.BOOKING_ID}`;
    const actualSectionType = sectionType || (isToday ? 'today' : 'upcoming');

    const checkboxSection = !isToday && sectionType !== 'history' ? `
        <div class="booking-selection">
            <input type="checkbox" class="booking-checkbox" 
                   id="checkbox-${booking.BOOKING_ID}" 
                   data-booking-id="${booking.BOOKING_ID}"
                   data-booking-reference="${booking.BOOKING_REFERENCE}"
                   data-seat-name="${booking.SEAT_NAME}"
                   data-is-today="${isToday}"
                   data-section="${actualSectionType}"
                   onchange="updateBulkActions('${actualSectionType}')">
            <label for="checkbox-${booking.BOOKING_ID}" style="font-size: 12px; color: #666; cursor: pointer;">
                Select for deletion
            </label>
        </div>
    ` : '';

    const deleteButton = isToday ? `
        <div class="booking-actions">
            <button class="btn-delete" onclick="deleteBookings({single: {bookingReference: '${booking.BOOKING_REFERENCE}', bookingId: ${booking.BOOKING_ID}, seatName: '${booking.SEAT_NAME}', bookingElementId: '${bookingElementId}'}})">
                🗑️ Cancel
            </button>
        </div>
    ` : '';

    const specialClass = sectionType === 'forSomeone' ? 'for-someone' : (sectionType === 'history' ? 'history' : '');
    const specialIcon = sectionType === 'forSomeone' ? '👥' : (sectionType === 'history' ? '📋' : (isToday ? '🔥' : '📅'));
    const specialLabel = sectionType === 'forSomeone' ? '<span class="for-someone-label">For Someone</span>' : '';

    return `
        <div class="booking-item ${isToday ? 'today' : ''} ${specialClass}" id="${bookingElementId}">
            ${checkboxSection}
            <div class="booking-date">
                <span class="date-icon">${specialIcon}</span>
                ${formattedDate}
                ${specialLabel}
            </div>
            <div class="booking-details">
                <div class="detail-row">
                    <span><strong>🪑 ${seatInfo}</strong></span>
                    <span>⏰ ${timeRange}</span>
                </div>
                <div class="detail-row">
                    <span>📍 ${locationInfo}</span>
                    ${emailInfo ? `<span>${emailInfo}</span>` : ''}
                </div>
                <div class="booking-location">
                    🏢 ${booking.SUBLOC_NAME}
                </div>
                ${deleteButton}
            </div>
        </div>
    `;
}

async function deleteBookings(options) {
    const validation = validateUserCredentials();

    if (!validation.data.bearerToken) {
        alert('Bearer token is required to delete bookings');
        return;
    }

    let bookingsToDelete = [];
    let elementsToUpdate = [];
    let confirmMessage = '';

    if (options.single) {
        const { bookingReference, bookingId, seatName, bookingElementId } = options.single;

        bookingsToDelete = [{
            bookingReference: bookingReference,
            bookingId: parseInt(bookingId),
            seatName: seatName,
            isCurrentDay: true
        }];

        elementsToUpdate = [document.getElementById(bookingElementId)];
        confirmMessage = `Are you sure you want to cancel your booking for Seat ${seatName} today?`;
    } else if (options.bulk) {
        const { sectionType } = options.bulk;
        const selectedCheckboxes = document.querySelectorAll(`input[data-section="${sectionType}"]:checked`);

        if (selectedCheckboxes.length === 0) {
            alert('No bookings selected for deletion');
            return;
        }

        bookingsToDelete = Array.from(selectedCheckboxes).map(checkbox => ({
            bookingReference: checkbox.dataset.bookingReference,
            bookingId: parseInt(checkbox.dataset.bookingId),
            seatName: checkbox.dataset.seatName,
            isCurrentDay: checkbox.dataset.isToday === 'true'
        }));

        elementsToUpdate = Array.from(selectedCheckboxes).map(checkbox =>
            checkbox.closest('.booking-item')
        );

        confirmMessage = `Are you sure you want to cancel ${selectedCheckboxes.length} booking(s)?`;
    }

    if (!confirm(confirmMessage)) {
        return;
    }

    if (options.single) {
        const bookingElement = elementsToUpdate[0];
        const deleteButton = bookingElement.querySelector('.btn-delete');
        bookingElement.classList.add('deleting');
        deleteButton.disabled = true;
        deleteButton.innerHTML = '⏳ Cancelling...';
    } else if (options.bulk) {
        const { sectionType } = options.bulk;
        const bulkDeleteButtonId = sectionType === 'upcoming' ? 'bulkDeleteUpcoming' : 'bulkDeleteForSomeone';
        const bulkDeleteButton = document.getElementById(bulkDeleteButtonId);
        bulkDeleteButton.disabled = true;
        bulkDeleteButton.innerHTML = '⏳ Cancelling...';

        elementsToUpdate.forEach(element => {
            element.classList.add('deleting');
        });
    }

    try {
        const payload = { data: bookingsToDelete };

        const now = new Date();
        const currentTZDateTime = encodeURIComponent(
            `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()} ${now.toLocaleTimeString('en-US')}`
        );

        const url = `${API_BASE}/MyBookings/DeleteBooking/?locationId=11&currentTZDateTime=${currentTZDateTime}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Bearer': validation.data.bearerToken,
                'Content-Type': 'application/json',
                'Origin': 'https://hotdesk.cat.com',
                'Referer': 'https://hotdesk.cat.com/my-bookings'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        elementsToUpdate.forEach(element => {
            element.style.transform = 'translateX(-100%)';
            element.style.opacity = '0';
        });

        setTimeout(() => {
            elementsToUpdate.forEach(element => {
                element.remove();
            });

            const todayContainer = document.getElementById('todayBookings');
            const upcomingContainer = document.getElementById('upcomingBookings');
            const forSomeoneContainer = document.getElementById('forSomeoneBookings');

            if (todayContainer.querySelectorAll('.booking-item').length === 0) {
                todayContainer.innerHTML = '<div class="no-bookings">No bookings for today</div>';
            }

            if (upcomingContainer.querySelectorAll('.booking-item').length === 0) {
                upcomingContainer.innerHTML = '<div class="no-bookings">No upcoming bookings</div>';
            }

            if (forSomeoneContainer.querySelectorAll('.booking-item').length === 0) {
                forSomeoneContainer.innerHTML = '<div class="no-bookings">No bookings for someone</div>';
            }

            if (options.bulk) {
                updateBulkActions(options.bulk.sectionType);
            }

        }, 300);

        const count = bookingsToDelete.length;
        const message = count === 1
            ? `✅ Successfully cancelled booking for Seat ${bookingsToDelete[0].seatName}`
            : `✅ Successfully cancelled ${count} booking(s)`;

        showStatus('mybookingsStatus', message, 'success');

        setTimeout(() => {
            document.getElementById('mybookingsStatus').style.display = 'none';
        }, 3000);

    } catch (error) {
        if (options.single) {
            const bookingElement = elementsToUpdate[0];
            const deleteButton = bookingElement.querySelector('.btn-delete');
            bookingElement.classList.remove('deleting');
            deleteButton.disabled = false;
            deleteButton.innerHTML = '🗑️ Cancel';
        } else if (options.bulk) {
            const { sectionType } = options.bulk;
            const bulkDeleteButtonId = sectionType === 'upcoming' ? 'bulkDeleteUpcoming' : 'bulkDeleteForSomeone';
            const bulkDeleteButton = document.getElementById(bulkDeleteButtonId);
            bulkDeleteButton.disabled = false;
            bulkDeleteButton.innerHTML = '🗑️ Delete Selected';

            elementsToUpdate.forEach(element => {
                element.classList.remove('deleting');
            });
        }

        showStatus('mybookingsStatus', `Error cancelling booking(s): ${error.message}`, 'error');
        console.error('Error deleting bookings:', error);
    }
}

function toggleSelectAll(sectionType) {
    const selectAllCheckbox = document.getElementById(`selectAll${sectionType.charAt(0).toUpperCase() + sectionType.slice(1)}`);
    const isChecked = selectAllCheckbox.checked;

    const bookingCheckboxes = document.querySelectorAll(`input[data-section="${sectionType}"]`);

    bookingCheckboxes.forEach(checkbox => {
        checkbox.checked = isChecked;

        const bookingItem = checkbox.closest('.booking-item');
        if (isChecked) {
            bookingItem.classList.add('selected');
        } else {
            bookingItem.classList.remove('selected');
        }
    });

    updateBulkActions(sectionType);
}

function updateBulkActions(sectionType) {
    const bookingCheckboxes = document.querySelectorAll(`input[data-section="${sectionType}"]:checked`);
    const allBookingCheckboxes = document.querySelectorAll(`input[data-section="${sectionType}"]`);
    const selectedCount = bookingCheckboxes.length;

    if (sectionType === 'upcoming') {
        const selectedCountElement = document.getElementById('selectedCountUpcoming');
        const bulkDeleteButton = document.getElementById('bulkDeleteUpcoming');
        const selectAllCheckbox = document.getElementById('selectAllUpcoming');

        if (selectedCount > 0) {
            selectedCountElement.classList.remove('hidden');
            bulkDeleteButton.classList.remove('hidden');
            selectedCountElement.textContent = `${selectedCount} selected`;
        } else {
            selectedCountElement.classList.add('hidden');
            bulkDeleteButton.classList.add('hidden');
        }

        const totalCheckboxes = allBookingCheckboxes.length;
        if (selectedCount === totalCheckboxes && totalCheckboxes > 0) {
            selectAllCheckbox.checked = true;
            selectAllCheckbox.indeterminate = false;
        } else if (selectedCount > 0) {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = true;
        } else {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = false;
        }
    }

    if (sectionType === 'forSomeone') {
        const selectedCountElement = document.getElementById('selectedCountForSomeone');
        const bulkDeleteButton = document.getElementById('bulkDeleteForSomeone');
        const selectAllCheckbox = document.getElementById('selectAllForSomeone');

        if (selectedCount > 0) {
            selectedCountElement.classList.remove('hidden');
            bulkDeleteButton.classList.remove('hidden');
            selectedCountElement.textContent = `${selectedCount} selected`;
        } else {
            selectedCountElement.classList.add('hidden');
            bulkDeleteButton.classList.add('hidden');
        }

        const totalCheckboxes = allBookingCheckboxes.length;
        if (selectedCount === totalCheckboxes && totalCheckboxes > 0) {
            selectAllCheckbox.checked = true;
            selectAllCheckbox.indeterminate = false;
        } else if (selectedCount > 0) {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = true;
        } else {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = false;
        }
    }

    allBookingCheckboxes.forEach(checkbox => {
        const bookingItem = checkbox.closest('.booking-item');
        if (checkbox.checked) {
            bookingItem.classList.add('selected');
        } else {
            bookingItem.classList.remove('selected');
        }
    });
}

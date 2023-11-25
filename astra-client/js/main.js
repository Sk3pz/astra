const fileList = document.getElementById('filelist');
const topInput = document.getElementById('topInput');
const bottomInput = document.getElementById('bottomInput');

function addItemToFileList(item) {
    const listItem = document.createElement('li');
    listItem.appendChild(document.createTextNode(item));
    // listItem.addEventListener('click', function(event) {
    //     handleItemClick(item);
    // });
    fileList.appendChild(listItem);
}

// Function to update the status indicator
function updateStatusIndicator(connected) {
    const statusIndicator = document.getElementById('statusIndicator');
    statusIndicator.style.backgroundColor = connected ? 'green' : 'red';

    if (!connected) {
        // disable text inputs
        topInput.disabled = true;
        bottomInput.disabled = true;

        topInput.value = "";
        bottomInput.value = "";

        topInput.placeholder = "Not connected!";
    } else {
        // enable text inputs
        topInput.disabled = false;
        bottomInput.disabled = false;

        topInput.placeholder = "Enter a file name...";
    }
}

let socket = null
let files = [];

function connectWithRetry(delay = 5000) {
    updateStatusIndicator(false);

    socket = new WebSocket("ws://192.168.1.249:8080/ws");
    console.log("Attempting Connection...");

    socket.onopen = () => {
        console.log("Successfully Connected");
        updateStatusIndicator(true);
        // handle incoming messages from the server
        socket.onmessage = function(event) {
            const data = event.data;

            if (data.startsWith("content:")) {
                document.getElementById('bottomInput').value = data.substring(8);
            } else if (data.startsWith("file:")) {
                const file = data.substring(5);
                // make sure files does not contain the file
                if (!files.includes(file)) {
                    files.push(file);
                }

                fileList.innerHTML = "";

                files.forEach(file => {
                    addItemToFileList(file)
                });
            }
        };
    };

    socket.onclose = event => {
        console.log("Socket Closed Connection: ", event);
        updateStatusIndicator(false);
        console.log("Connection failed! Retrying in " + delay + "ms...")
        setTimeout(connectWithRetry, delay);
    };

    socket.onerror = error => {
        console.log("Socket Error: ", error);
    };
}

// Initial connection attempt
connectWithRetry();

function validateForm() {
    const input = document.getElementById("topInput");
    const pattern = /^[a-zA-Z0-9_]*$/;

    if (!pattern.test(input.value)) {
        alert("Invalid characters in the input. Please use only alphanumeric characters and underscores.");
        return false;
    }

    return true;
}

topInput.addEventListener('focus', function(event) {
    socket.send("list");
});

function selectFile() {
    const inputValue = topInput.value;

    // Send the input value to the WebSocket server
    socket.send("file:" + inputValue);

    // Prevent the default Enter key behavior (e.g., new line in textarea)
    event.preventDefault();

    bottomInput.disabled = false;
    bottomInput.placeholder = "Enter file content...";
}

// Function to handle item click
function handleItemClick(option) {
    topInput.value = option.value;
    fileList.style.display = 'none';
    selectFile();
}

topInput.addEventListener('input', function(event) {
    const inputValue = event.target.value;
    const filteredFiles = files.filter(file => file.startsWith(inputValue));

    fileList.innerHTML = "";

    filteredFiles.forEach(file => {
        addItemToFileList(file)
    });
});

topInput.addEventListener('keydown', function(event) {
    // add the strings in files to filelist
    if (event.key === 'Tab') {
        event.preventDefault();
        const inputValue = event.target.value;
        const filteredFiles = files.filter(file => file.startsWith(inputValue));

        if (filteredFiles.length > 0) {
            event.target.value = filteredFiles[0];
        }
    }

    if (event.target.value === "") {
        // disable bottom input
        bottomInput.disabled = true;
        bottomInput.placeholder = "No file selected!";
        bottomInput.value = "";
        return;
    }

    // Check if the pressed key is "Enter" and if the top input is focused
    if (event.key === 'Enter' && document.activeElement === this && (event.target.value.startsWith("delete:") || validateForm())) {
        selectFile();
    }
});

fileList.addEventListener('click', function(event) {
    if (event.target.tagName.toLowerCase() === 'li') {
        // The change event was triggered by selecting an option
        console.log("clicked: " + event.target.innerText.toString());
        handleItemClick(event.target.innerText.toString())
    }
});

bottomInput.addEventListener('keyup', function(event) {
    const inputValue = event.target.value;
    const fileValue = document.getElementById('topInput').value;

    // Send the input value to the WebSocket server
    socket.send("edit:" + fileValue + ":" + inputValue);
});

import { ip, port } from './config.js';

const address = ip + ":" + port;

const fileList = document.getElementById('filelist');
const topInput = document.getElementById('topInput');
const bottomInput = document.getElementById('bottomInput');
const confirmBtn = document.getElementById('confirm');

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

    socket = new WebSocket("ws://" + address + "/ws");
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
                updateSimilarFiles();
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

topInput.addEventListener('focus', function(_) {
    socket.send("list");
});

function selectFile() {
    const inputValue = topInput.value;

    bottomInput.disabled = false;
    bottomInput.placeholder = "Enter file content...";

    // Send the input value to the WebSocket server
    socket.send("file:" + inputValue);
}

function updateSimilarFiles() {
    let inputValue = topInput.value;
    // does not work with tab complete :(
    if (inputValue.startsWith("delete:")) {
        inputValue = inputValue.substring(7);
    }
    const filteredFiles = files.filter(file => file.startsWith(inputValue));

    fileList.innerHTML = "";

    filteredFiles.forEach(file => {
        addItemToFileList(file)
    });
}

// Function to handle item click
function handleItemClick(option) {
    topInput.value = option;
    updateSimilarFiles();
    selectFile();
}

topInput.addEventListener('input', function(_) {
    updateSimilarFiles();
});

confirmBtn.addEventListener('click', function(_) {
    let inputValue = topInput.value;

    if (inputValue === "") {
        // disable bottom input
        bottomInput.disabled = true;
        bottomInput.placeholder = "No file selected!";
        bottomInput.value = "";
        return;
    }

    if ((inputValue.startsWith("delete:") || validateForm())) {
        selectFile();
    }
});

topInput.addEventListener('keydown', function(event) {
    // add the strings in files to filelist
    if (event.key === 'Tab') {
        event.preventDefault();
        let inputValue = event.target.value;
        if (event.target.value.startsWith("delete:")) {
            inputValue = inputValue.substring(7);
        }
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

bottomInput.addEventListener('keyup', function(event) {
    const inputValue = event.target.value;
    const fileValue = document.getElementById('topInput').value;

    // Send the input value to the WebSocket server
    socket.send("edit:" + fileValue + ":" + inputValue);
});

fileList.addEventListener('click', function(event) {
    if (event.target.tagName.toLowerCase() === 'li') {
        // The change event was triggered by selecting an option
        handleItemClick(event.target.innerText.toString())
    }
});

topInput.addEventListener('focus', function() {
    if (topInput.value === "") {
        // disable bottom input
        bottomInput.disabled = true;
        bottomInput.placeholder = "No file selected!";
        bottomInput.value = "";
    }
    fileList.classList.add('active');
    updateSimilarFiles();
});

topInput.addEventListener('blur', function() {
    if (topInput.value === "") {
        // disable bottom input
        bottomInput.disabled = true;
        bottomInput.placeholder = "No file selected!";
        bottomInput.value = "";
    }
    // Delay the removal of 'active' class to give time for a click event to occur
    setTimeout(function() {
        fileList.classList.remove('active');
    }, 100);
});

fileList.addEventListener('focusin', function() {
    fileList.classList.add('active');
});

fileList.addEventListener('focusout', function() {
    fileList.classList.remove('active');
});
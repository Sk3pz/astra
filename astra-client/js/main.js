let socket = new WebSocket("ws://localhost:8080/ws");
console.log("Attempting Connection...");

socket.onopen = () => {
    console.log("Successfully Connected");
};

socket.onclose = event => {
    console.log("Socket Closed Connection: ", event);
};

socket.onerror = error => {
    console.log("Socket Error: ", error);
};

document.getElementById('topInput').addEventListener('keydown', function(event) {
    const bottomInput = document.getElementById('bottomInput');
    if (event.target.value === "") {
        // disable bottom input
        bottomInput.disabled = true;
        bottomInput.placeholder = "No file selected!";
        bottomInput.value = "";
        return;
    }

    bottomInput.disabled = false;
    bottomInput.placeholder = "Enter file content...";

    // Check if the pressed key is "Enter" and if the top input is focused
    if (event.key === 'Enter' && document.activeElement === this) {
        const inputValue = event.target.value;

        // Send the input value to the WebSocket server
        socket.send("file:" + inputValue);

        // Prevent the default Enter key behavior (e.g., new line in textarea)
        event.preventDefault();
    }
});

// Add event listener to handle messages from the server
socket.onmessage = event => {
    // Update the content in the bottom section with the value from the server
    document.getElementById('bottomInput').value = event.data;
};
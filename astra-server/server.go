package main

import (
	"astra/config"
	"fmt"
	"github.com/gorilla/websocket"
	"log"
	"net/http"
	"os"
	"strings"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
}

func getFileContent(name string) (string, error) {
	// get name in ./nodes
	filePath := "./nodes/" + name + ".astra"

	// if the file does not exist, create it
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		_, err := os.Create(filePath)
		if err != nil {
			return "", err
		}
	}

	// read the file into a string
	bytes, err := os.ReadFile(filePath)
	if err != nil {
		return "", err
	}

	// return file
	return string(bytes), nil
}

// delete a file under ./nodes
func deleteFile(name string) error {
	// get name in ./nodes
	filePath := "./nodes/" + name + ".astra"

	// delete the file
	err := os.Remove(filePath)
	if err != nil {
		return err
	}

	return nil
}

// edit a file
func editFile(name string, content string) error {
	// get name in ./nodes
	filePath := "./nodes/" + name + ".astra"

	// write content to file
	err := os.WriteFile(filePath, []byte(content), 0644)
	if err != nil {
		return err
	}

	return nil
}

// handle requests to the home page
func homePage(w http.ResponseWriter, _ *http.Request) {
	// todo: need to serve astra-client here
	_, _ = fmt.Fprintf(w, "Ad Astra")
}

// handle websocket requests from the client
func wsEndpoint(w http.ResponseWriter, r *http.Request) {
	upgrader.CheckOrigin = func(r *http.Request) bool { return true }

	ws, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println(err)
		return
	}

	log.Println("Client Connected")

	reader(ws)
}

// write msg to conn
func writer(msg string, conn *websocket.Conn) {
	// write msg to conn
	if err := conn.WriteMessage(websocket.TextMessage, []byte(msg)); err != nil {
		log.Println(err)
		return
	}
}

// read msg from conn
func reader(conn *websocket.Conn) {
	for {
		_, p, err := conn.ReadMessage()
		if err != nil {
			log.Println(err)
			return
		}

		data := string(p)

		// handle messages from the client here
		log.Println(data)

		// parse the string
		split := strings.Split(data, ":")

		// match split[0] to a command
		switch split[0] {
		case "file":
			// get the file
			content, err := getFileContent(split[1])
			if err != nil {
				log.Println(err)
				writer("error: failed to get file", conn)
				return
			}
			writer(content, conn)
		case "delete":
			// delete the file
			err := deleteFile(split[1])
			if err != nil {
				log.Println(err)
				writer("error: failed to delete file", conn)
				return
			}
		case "edit":
			// edit the file
			err := editFile(split[1], split[2])
			if err != nil {
				log.Println(err)
				writer("error: failed to edit file", conn)
				return
			}
		}
	}
}

// setup routes for the server
func setupRoutes() {
	http.HandleFunc("/", homePage)
	http.HandleFunc("/ws", wsEndpoint)
}

func main() {
	cfg, err := config.ReadCfg("config/config.toml")
	if err != nil {
		log.Println("failed to read config file", err)
		return
	}
	fmt.Printf("== Welcome to Astra! ==\n"+
		"ReadBuffer:  %d\n"+
		"WriteBuffer: %d\n"+
		"=======================\n",
		cfg.ReadBuffer, cfg.WriteBuffer)

	// update upgrader's values
	upgrader.ReadBufferSize = cfg.ReadBuffer
	upgrader.WriteBufferSize = cfg.WriteBuffer

	// ensure the directory ./nodes exists
	if _, err := os.Stat("./nodes"); os.IsNotExist(err) {
		err := os.Mkdir("./nodes", 0755)
		if err != nil {
			log.Println(err)
			return
		}
	}

	// start the server
	setupRoutes()
	log.Fatal(http.ListenAndServe(":8080", nil))
}

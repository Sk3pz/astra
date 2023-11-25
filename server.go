package main

import (
	"fmt"
	"github.com/gorilla/websocket"
	"log"
	"net/http"
	"os"
	"strconv"
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

func getFiles() []string {
	// gets all files in ./nodes, strips the extension, and returns a list of names
	var files []string

	// get all files in ./nodes
	fileList, err := os.ReadDir("./nodes")
	if err != nil {
		log.Println(err)
		return nil
	}

	// strip the extension and add to files
	for _, file := range fileList {
		files = append(files, strings.TrimSuffix(file.Name(), ".astra"))
	}

	return files
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

// handle websocket requests from the client
func wsEndpoint(w http.ResponseWriter, r *http.Request) {
	upgrader.CheckOrigin = func(r *http.Request) bool { return true }

	ws, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println(err)
		return
	}

	log.Println("Client Connected ip: " + ws.RemoteAddr().String())

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
		// update the user on what files are available
		for _, file := range getFiles() {
			writer("file:"+file, conn)
		}

		_, p, err := conn.ReadMessage()
		if err != nil {
			log.Println(err)
			return
		}

		data := string(p)

		if data == "" {
			return
		}

		//log.Println(data)

		// parse the string
		split := strings.Split(data, ":")
		if len(split) < 2 && split[0] != "list" {
			return
		}

		// match split[0] to a command
		switch split[0] {
		case "list":
			// loop through the files and send them to the client
			for _, file := range getFiles() {
				writer("file:"+file, conn)
			}
		case "file":
			// if split[1] is deleted
			if split[1] == "delete" {
				// delete the file
				err := deleteFile(split[2])
				if err != nil {
					log.Println(err)
					writer("error: failed to delete file", conn)
					return
				}
				// update the user on what files are available
				for _, file := range getFiles() {
					writer("file:"+file, conn)
				}
				return
			}
			// get the file
			content, err := getFileContent(split[1])
			if err != nil {
				log.Println(err)
				writer("error: failed to get file", conn)
				return
			}
			writer("content:"+content, conn)
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
	fs := http.FileServer(http.Dir("./static"))
	http.Handle("/static/", http.StripPrefix("/static", fs))
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, "./static/index.html")
	})
	http.HandleFunc("/ws", wsEndpoint)
}

func main() {
	cfg, err := ReadCfg("config/config.toml")
	if err != nil {
		log.Println("failed to read config file", err)
		return
	}
	fmt.Printf("== Welcome to Astra! ==\n"+
		"Listening on %s:%s\n"+
		"ReadBuffer:  %d\n"+
		"WriteBuffer: %d\n"+
		"=======================\n",
		cfg.Ip, strconv.Itoa(cfg.Port),
		cfg.ReadBuffer, cfg.WriteBuffer)

	// update upgrader's values
	upgrader.ReadBufferSize = cfg.ReadBuffer
	upgrader.WriteBufferSize = cfg.WriteBuffer

	// ensure the directory ./nodes exists
	if _, err := os.Stat("./cosmos"); os.IsNotExist(err) {
		err := os.Mkdir("./cosmos", 0755)
		if err != nil {
			log.Println(err)
			return
		}
	}

	// start the server
	setupRoutes()
	log.Fatal(http.ListenAndServe(cfg.Ip+":"+strconv.Itoa(cfg.Port), nil))
}

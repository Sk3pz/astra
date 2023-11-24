package main

import (
	"fmt"
	"net/http"
)

func main() {
	// handle http requests
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		_, err := fmt.Fprintf(w, "Ad Astra")
		if err != nil {
			return
		}
	})
	err := http.ListenAndServe(":8080", nil)
	if err != nil {
		return
	}

	// "upgrade" to websockets

}

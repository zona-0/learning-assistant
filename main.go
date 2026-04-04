package main

import "net/http"

func main() {
	ConnectDB()

	http.HandleFunc("/", LoginPage)
	http.HandleFunc("/login", Login)
	http.HandleFunc("/dashboard", Dashboard)

	http.ListenAndServe(":8080", nil)
}

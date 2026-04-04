package main

import (
	"log"
	"net/http"
	"text/template"
)

func LoginPage(w http.ResponseWriter, r *http.Request) {
	tmpl, _ := template.ParseFiles("templates/login.html")
	tmpl.Execute(w, nil)
}

func Login(w http.ResponseWriter, r *http.Request) {
	email := r.FormValue("email")
	password := r.FormValue("password")

	//TODO: DEBUG input
	log.Println("Email + Password: ", email, password)

	//TODO: validation
	if email == "" || password == "" {
		log.Println("no input detect")
		http.Redirect(w, r, "/", http.StatusSeeOther)
		return
	}

	var dbPassword string
	err := DB.QueryRow(
		"SELECT password FROM users WHERE email=?", email,
	).Scan(&dbPassword)

	if err != nil {
		log.Println("User not found: ", err)
		http.Redirect(w, r, "/", http.StatusSeeOther)
		return
	}

	//TODO: Check password
	if password == dbPassword {
		log.Println("Log success")
		http.Redirect(w, r, "/dashboard", http.StatusSeeOther)
	} else {
		log.Println("Wrong Pw")
		http.Redirect(w, r, "/", http.StatusSeeOther)
	}
}

func Dashboard(w http.ResponseWriter, r *http.Request) {
	tmpl, _ := template.ParseFiles("templates/dashboard.html")
	tmpl.Execute(w, nil)
}

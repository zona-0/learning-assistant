package main

import (
	"database/sql"
	"log"

	_ "github.com/go-sql-driver/mysql"
)

var DB *sql.DB

func ConnectDB() {
	var err error

	// TODO: If DB use password
	// DB, err = sql.Open("mysql", "root:password@tcp(127.0.0.1:3306)/learning_assistant")

	//TODO: DB without pass
	DB, err = sql.Open("mysql", "root:@tcp(127.0.0.1:3306)/learning_assistant")

	if err != nil {
		log.Fatal(err)
	}

	err = DB.Ping()
	if err != nil {
		log.Fatal("DB not connect")
	}

	log.Println("DB Connect")
}

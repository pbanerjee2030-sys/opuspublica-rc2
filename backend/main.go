package main

import (
"log"
"net/http"
"opuspublica/backend/internal/generator"
)

func main() {
mux := http.NewServeMux()

// Link your custom context compaction routes to defend against token limits
generator.RegisterCompactionRoutes(mux)

mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
w.Write([]byte("OpusPublica Backend Core Daemon Active... Token Limit Defended."))
})

log.Println("Server anti-overflow daemon spinning up on port :8080...")
if err := http.ListenAndServe(":8080", mux); err != nil {
log.Fatalf("Server startup failure: %v", err)
}
}

package generator

import (
"encoding/json"
"net/http"
"sync"
)

// GlobalSessionRegistry manages active developer workspace states safely across threads.
type GlobalSessionRegistry struct {
mu       sync.RWMutex
Sessions map[string]*Session
}

var Registry = &GlobalSessionRegistry{
Sessions: make(map[string]*Session),
}

type CompactionRequest struct {
SessionID string `json:"sessionId"`
}

// MockLocalModelClient simulates interaction with your local running model (Ollama, Llama.cpp, etc.)
func MockLocalModelClient(prompt string) (string, error) {
// In production, wire this to your local LLM inference endpoint.
return "Architectural history compacted. State markers preserved. Redundant records truncated successfully.", nil
}

// RegisterCompactionRoutes binds the handler to the workspace network multiplexer.
func RegisterCompactionRoutes(mux *http.ServeMux) {
mux.HandleFunc("/api/chat/compact", func(w http.ResponseWriter, r *http.Request) {
if r.Method != http.MethodPost {
http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
return
}

var req CompactionRequest
err := json.NewDecoder(r.Body).Decode(&req)
if err != nil || req.SessionID == "" {
http.Error(w, "Bad request: missing sessionId", http.StatusBadRequest)
return
}

Registry.mu.Lock()
session, exists := Registry.Sessions[req.SessionID]
if !exists {
// If session doesn't exist, instantiate a fresh bounded tracker block
session = &Session{MaxTokens: 1048576}
Registry.Sessions[req.SessionID] = session
}
Registry.mu.Unlock()

// Execute the architectural compaction algorithm safely
err = session.CompactHistory(r.Context(), MockLocalModelClient)
if err != nil {
http.Error(w, "Compaction execution engine fault: "+err.Error(), http.StatusInternalServerError)
return
}

w.Header().Set("Content-Type", "application/json")
w.WriteHeader(http.StatusOK)
w.Write([]byte(`{"status":"success","message":"Memory pool bounded"}`))
})
}

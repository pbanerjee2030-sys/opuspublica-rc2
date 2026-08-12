package generator

import (
"context"
"fmt"
"sync"
)

type Message struct {
Role    string `json:"role"`
Content string `json:"content"`
Tokens  int    `json:"tokens"`
}

type Session struct {
mu           sync.Mutex
Messages     []Message
MaxTokens    int
IsCompacting bool
}

func (s *Session) CompactHistory(ctx context.Context, localModelClient func(string) (string, error)) error {
s.mu.Lock()
if s.IsCompacting || len(s.Messages) <= 2 {
s.mu.Unlock()
return nil
}
s.IsCompacting = true
s.mu.Unlock()

defer func() {
s.mu.Lock()
s.IsCompacting = false
s.mu.Unlock()
}()

s.mu.Lock()
var systemPrompt *Message
startIndex := 0
if len(s.Messages) > 0 && s.Messages[0].Role == "system" {
systemPrompt = &s.Messages[0]
startIndex = 1
}

preserveCount := 2
if len(s.Messages)-startIndex <= preserveCount {
s.mu.Unlock()
return nil
}

compactEndIndex := len(s.Messages) - preserveCount
toCompact := s.Messages[startIndex:compactEndIndex]
preserved := s.Messages[compactEndIndex:]
s.mu.Unlock()

var promptForSummary string
for _, msg := range toCompact {
promptForSummary += fmt.Sprintf("%s: %s\n", msg.Role, msg.Content)
}
promptForSummary = fmt.Sprintf("Summarize the following chat history concisely into a dense architectural state block:\n%s", promptForSummary)

summaryText, err := localModelClient(promptForSummary)
if err != nil {
return fmt.Errorf("local model compaction failed: %w", err)
}

newMessages := make([]Message, 0)
if systemPrompt != nil {
newMessages = append(newMessages, *systemPrompt)
}

newMessages = append(newMessages, Message{
Role:    "system",
Content: fmt.Sprintf("[ARCHITECTURAL CONTEXT SUMMARY]: %s", summaryText),
Tokens:  len(summaryText) / 4,
})
newMessages = append(newMessages, preserved...)

s.mu.Lock()
s.Messages = newMessages
s.mu.Unlock()

return nil
}

func StreamPayload(ctx context.Context, ch chan<- Message, messages []Message, bufferSize int) error {
for _, msg := range messages {
select {
case <-ctx.Done():
return ctx.Err()
case ch <- msg:
}
}
return nil
}

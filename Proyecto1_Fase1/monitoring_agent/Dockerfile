FROM golang:1.22

WORKDIR /app
COPY . .

RUN go mod tidy
RUN CGO_ENABLED=0 GOOS=linux go build -o monitor-go

CMD ["./monitor-go"]

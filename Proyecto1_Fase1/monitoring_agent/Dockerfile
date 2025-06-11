FROM golang:1.21

WORKDIR /app
COPY . .
RUN go mod tidy
RUN CGO_ENABLED=0 GOOS=linux go build -o monitor

EXPOSE 6000
CMD ["./monitor-go"]

FROM golang:1.22 as builder

WORKDIR /app

COPY . .

RUN go mod init mi_api && go build -o app .

FROM debian:bullseye-slim

WORKDIR /app
COPY --from=builder /app/app .

EXPOSE 6000

CMD ["./app"]

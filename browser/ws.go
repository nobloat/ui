package browser

// A WebSocket client, only as much of RFC 6455 as a browser's debugging port needs: the handshake, masked text frames
// out, text frames in (fragmented or not), pong for ping, close. Go's standard library has none.

import (
	"bufio"
	"crypto/rand"
	"crypto/sha1"
	"encoding/base64"
	"encoding/binary"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"strings"
	"sync"
)

type ws struct {
	c  net.Conn
	r  *bufio.Reader
	mu sync.Mutex // writes
}

func dial(raw string) (*ws, error) {
	u, err := url.Parse(raw)
	if err != nil {
		return nil, err
	}
	c, err := net.Dial("tcp", u.Host)
	if err != nil {
		return nil, err
	}
	k := make([]byte, 16)
	rand.Read(k)
	key := base64.StdEncoding.EncodeToString(k)
	fmt.Fprintf(c, "GET %s HTTP/1.1\r\nHost: %s\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: %s\r\nSec-WebSocket-Version: 13\r\n\r\n", u.RequestURI(), u.Host, key)
	r := bufio.NewReader(c)
	res, err := http.ReadResponse(r, nil)
	if err != nil {
		c.Close()
		return nil, err
	}
	sum := sha1.Sum([]byte(key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"))
	if res.StatusCode != http.StatusSwitchingProtocols || res.Header.Get("Sec-WebSocket-Accept") != base64.StdEncoding.EncodeToString(sum[:]) {
		c.Close()
		return nil, fmt.Errorf("websocket %s: %s", raw, res.Status)
	}
	return &ws{c: c, r: r}, nil
}

func (w *ws) write(op byte, p []byte) error {
	h := []byte{0x80 | op}
	switch n := len(p); {
	case n < 126:
		h = append(h, 0x80|byte(n))
	case n < 1<<16:
		h = append(h, 0x80|126, byte(n>>8), byte(n))
	default:
		h = append(h, 0x80|127)
		h = binary.BigEndian.AppendUint64(h, uint64(n))
	}
	m := make([]byte, 4)
	rand.Read(m)
	h = append(h, m...)
	b := make([]byte, len(p))
	for i := range p {
		b[i] = p[i] ^ m[i%4]
	}
	w.mu.Lock()
	defer w.mu.Unlock()
	_, err := w.c.Write(append(h, b...))
	return err
}

func (w *ws) send(p []byte) error { return w.write(1, p) }

// read returns the next text or binary message.
func (w *ws) read() ([]byte, error) {
	var msg []byte
	for {
		var h [2]byte
		if _, err := io.ReadFull(w.r, h[:]); err != nil {
			return nil, err
		}
		fin, op, n := h[0]&0x80 != 0, h[0]&0x0f, uint64(h[1]&0x7f)
		switch n {
		case 126:
			var b [2]byte
			if _, err := io.ReadFull(w.r, b[:]); err != nil {
				return nil, err
			}
			n = uint64(binary.BigEndian.Uint16(b[:]))
		case 127:
			var b [8]byte
			if _, err := io.ReadFull(w.r, b[:]); err != nil {
				return nil, err
			}
			n = binary.BigEndian.Uint64(b[:])
		}
		var mask [4]byte
		if h[1]&0x80 != 0 { // servers do not mask, but tolerate it
			if _, err := io.ReadFull(w.r, mask[:]); err != nil {
				return nil, err
			}
		}
		p := make([]byte, n)
		if _, err := io.ReadFull(w.r, p); err != nil {
			return nil, err
		}
		if h[1]&0x80 != 0 {
			for i := range p {
				p[i] ^= mask[i%4]
			}
		}
		switch op {
		case 8:
			w.write(8, nil)
			return nil, io.EOF
		case 9:
			w.write(10, p)
		case 10:
		case 0, 1, 2:
			msg = append(msg, p...)
			if fin {
				return msg, nil
			}
		default:
			return nil, errors.New("websocket: unknown opcode " + strings.TrimSpace(fmt.Sprint(op)))
		}
	}
}

func (w *ws) close() { w.write(8, nil); w.c.Close() }

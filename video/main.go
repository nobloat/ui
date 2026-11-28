// The typed UI demo: records headless Chrome over the DevTools protocol (Page.startScreencast; Firefox has no screencast)
// and encodes the frames to an animated PNG with the standard library (no ffmpeg):
//
//	go run ./video video/demo.png      # in ui; make video
//
// A caption bar and a visible cursor are injected into every page; mouse and keys move at human pace. Slides
// (slides.html?<name>) type out code and real terminal output; phone.html frames a page at phone width.
package main

import (
	"bytes"
	"encoding/base64"
	"encoding/binary"
	"encoding/json"
	"fmt"
	"hash/crc32"
	"image"
	"image/color"
	"image/draw"
	"image/png"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/nobloat/ui/browser"
)

const w, h = 1280, 720

// overlay: a caption bar at the bottom and a cursor that follows the mouse; window.__cap(text) sets the caption.
const overlay = `if (window === top) addEventListener('DOMContentLoaded', () => {
  const s = document.createElement('style'); s.textContent = '#__cap{position:fixed;left:0;right:0;bottom:0;z-index:2147483647;padding:12px 24px;background:rgba(24,25,27,.92);color:#f6f6f5;font:600 18px/1.4 ui-monospace,Consolas,monospace;text-align:center}#__cap:empty{display:none}#__cur{position:fixed;z-index:2147483647;width:18px;height:18px;margin:-9px 0 0 -9px;border-radius:50%;background:rgba(220,38,38,.55);border:2px solid #fff;pointer-events:none;left:-40px;top:-40px;transition:transform .1s}#__cur.down{transform:scale(.7)}body:has(.card,.code,.phone) #__cur{display:none}';
  document.head.append(s);
  const c = document.createElement('div'); c.id = '__cap'; c.textContent = sessionStorage.getItem('__cap') || ''; document.body.append(c);
  const k = document.createElement('div'); k.id = '__cur'; document.body.append(k);
  const p = JSON.parse(sessionStorage.getItem('__xy') || '[-40,-40]'); k.style.left = p[0] + 'px'; k.style.top = p[1] + 'px';
  addEventListener('mousemove', e => { k.style.left = e.clientX + 'px'; k.style.top = e.clientY + 'px'; sessionStorage.setItem('__xy', JSON.stringify([e.clientX, e.clientY])); }, true);
  addEventListener('mousedown', () => k.classList.add('down'), true); addEventListener('mouseup', () => k.classList.remove('down'), true);
  window.__cap = t => { sessionStorage.setItem('__cap', t); c.textContent = t; };
});`

type frame struct {
	img []byte // PNG
	ms  int
}

func main() {
	if len(os.Args) != 2 {
		fmt.Fprintln(os.Stderr, "usage: go run ./video <out.gif>   (in ui)")
		os.Exit(2)
	}
	frames, err := record()
	if err == nil {
		err = encode(frames, os.Args[1])
	}
	if err != nil {
		fmt.Fprintln(os.Stderr, "video:", err)
		os.Exit(1)
	}
}

// demo is the story, step by step.
type demo struct {
	t  *browser.Tab
	xy [2]float64
}

func (d *demo) must(err error) {
	if err != nil {
		panic(err)
	}
}

func (d *demo) js(expr string, out any) { d.must(d.t.Eval(expr, out)) }

func (d *demo) goTo(path, caption string) {
	q, _ := json.Marshal(caption)
	d.t.Eval(`(() => { try { sessionStorage.setItem('__cap', `+string(q)+`) } catch {} })()`, nil)
	i := strings.IndexAny(path+"?", "?#")
	p, rest := path[:i], path[min(i, len(path)):]
	abs, _ := filepath.Abs(p)
	abs = filepath.ToSlash(abs)
	if !strings.HasPrefix(abs, "/") {
		abs = "/" + abs
	}
	u := (&url.URL{Scheme: "file", Path: abs}).String()
	u += rest
	d.must(d.t.Navigate(u))
	time.Sleep(150 * time.Millisecond)
	d.js(`window.__cap && __cap(`+string(q)+`)`, nil)
	d.js(fmt.Sprintf(`(() => { const c = document.getElementById('__cur'); if (c) { c.style.left = '%fpx'; c.style.top = '%fpx'; } })()`, d.xy[0], d.xy[1]), nil)
}

func (d *demo) caption(t string) {
	q, _ := json.Marshal(t)
	d.js(`__cap(`+string(q)+`)`, nil)
}

func (d *demo) box(sel string) [2]float64 {
	q, _ := json.Marshal(sel)
	var p [2]float64
	d.js(`(() => { const e = document.querySelector(`+string(q)+`); e.scrollIntoView({block: 'center'}); const r = e.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; })()`, &p)
	return p
}

// move: a straight line in 12 steps, like a hand.
func (d *demo) move(to [2]float64) {
	for i := 1; i <= 12; i++ {
		f := float64(i) / 12
		d.must(d.t.Move(d.xy[0]+(to[0]-d.xy[0])*f, d.xy[1]+(to[1]-d.xy[1])*f))
		time.Sleep(25 * time.Millisecond)
	}
	d.xy = to
}

func (d *demo) click(sel string) {
	d.move(d.box(sel))
	time.Sleep(200 * time.Millisecond)
	d.must(d.t.Click(d.xy[0], d.xy[1]))
	time.Sleep(80 * time.Millisecond)
}

func (d *demo) typ(s string) {
	for _, r := range s {
		d.must(d.t.Type(string(r)))
		time.Sleep(90 * time.Millisecond)
	}
}

func (d *demo) key(k string) { d.must(d.t.Key(k)) }

// done waits for a slide to finish typing (data-done).
func (d *demo) done() {
	d.js(`new Promise(r => { const t = setInterval(() => { if (document.body.dataset.done !== undefined) { clearInterval(t); r(true); } }, 50); })`, nil)
}

func sleep(ms int) { time.Sleep(time.Duration(ms) * time.Millisecond) }

func record() (frames []frame, err error) {
	b, err := browser.Launch("chrome", false)
	if err != nil {
		return nil, err
	}
	defer b.Close()
	t, err := b.NewTab()
	if err != nil {
		return nil, err
	}
	defer func() {
		if p := recover(); p != nil {
			err = fmt.Errorf("%v", p)
		}
	}()
	var mu sync.Mutex
	t.On("Page.screencastFrame", func(p json.RawMessage) {
		var f struct {
			Data      string
			SessionID int
			Metadata  struct{ Timestamp float64 }
		}
		json.Unmarshal(p, &f)
		img, _ := base64.StdEncoding.DecodeString(f.Data)
		mu.Lock()
		frames = append(frames, frame{img, int(f.Metadata.Timestamp * 1000)})
		mu.Unlock()
		go t.Call("Page.screencastFrameAck", map[string]any{"sessionId": f.SessionID})
	})
	d := &demo{t: t, xy: [2]float64{w / 2, h / 2}}
	_, err = t.Call("Page.addScriptToEvaluateOnNewDocument", map[string]any{"source": overlay})
	d.must(err)
	d.must(t.Size(w, h))
	_, err = t.Call("Page.startScreencast", map[string]any{"format": "png", "maxWidth": w, "maxHeight": h})
	d.must(err)

	d.goTo("video/slides.html?title", "")
	sleep(3000)
	d.goTo("video/slides.html?code", "")
	d.done()
	sleep(3500)

	d.goTo("screens/auth/login-wrong.html", "ui renders it: the error sits at its field, linked for screen readers")
	sleep(1200)
	d.click("input[name=password]")
	d.typ("correct horse")
	sleep(1500)
	d.goTo("screens/auth/setup.html", "Every auth screen is a Go value: the second step, with its QR code")
	sleep(2500)
	d.goTo("screens/auth/users.html", "Lists: filter chips, a sortable table, a pager")
	sleep(800)
	d.move(d.box("tbody tr:nth-child(2) a"))
	sleep(1800)
	d.goTo("screens/auth/user.html", "Menus are native popovers: no script")
	sleep(800)
	d.click("button[popovertarget=nb-more]")
	sleep(2200)
	d.key("Escape")
	sleep(400)

	d.goTo("blocks.html#st-w", "Behaviour with settings is a custom element: <nb-editable> saves on its own")
	sleep(600)
	d.click(`#st-w nb-editable[label="Reminder after"] button`)
	sleep(400)
	d.key("Control+a")
	d.typ("21")
	sleep(300)
	d.key("Enter")
	sleep(3200)

	d.goTo("showcase/sample/dashboard.html", "An app page: header, nav, stat tiles, cards. Ctrl K opens the commands")
	sleep(1500)
	d.key("Control+k")
	sleep(700)
	d.typ("inv")
	sleep(1500)
	d.key("Escape")
	sleep(300)
	_, err = t.Call("Emulation.setEmulatedMedia", map[string]any{"features": []map[string]string{{"name": "prefers-color-scheme", "value": "dark"}}})
	d.must(err)
	d.caption("Light and dark come from the same tokens")
	sleep(2500)
	_, err = t.Call("Emulation.setEmulatedMedia", map[string]any{"features": []map[string]string{{"name": "prefers-color-scheme", "value": "light"}}})
	d.must(err)
	d.goTo("video/phone.html?../screens/auth/account.html", "Phones: the same page, one column")
	sleep(3000)

	for _, s := range []string{"rules", "copy", "other"} {
		d.goTo("video/slides.html?"+s, "")
		d.done()
		sleep(3500)
	}
	d.goTo("video/slides.html?end", "")
	sleep(3000)
	_, err = t.Call("Page.stopScreencast", map[string]any{})
	d.must(err)
	sleep(300)
	mu.Lock()
	defer mu.Unlock()
	return frames, nil
}

// encode writes an animated PNG (APNG: full colour, plays as an <img> in every browser and on GitHub): at most 15
// frames a second, each lasting until the next; smaller frames (a phone) sit centred on the canvas; each frame stores
// only the rectangle that changed (the frames are PNG, so unchanged pixels are identical).
func encode(frames []frame, out string) error {
	const minGap = 66 // ms between kept frames
	var keep []frame
	for i, f := range frames {
		if len(keep) == 0 || f.ms-keep[len(keep)-1].ms >= minGap || i == len(frames)-1 {
			keep = append(keep, f)
		}
	}
	type part struct {
		rect  image.Rectangle
		data  []byte // the frame's compressed image data (the IDAT contents of its own PNG)
		delay int    // ms
	}
	var parts []part
	var prev *image.RGBA
	bg := image.NewUniform(color.RGBA{0xe5, 0xe5, 0xe4, 0xff})
	enc := png.Encoder{CompressionLevel: png.BestCompression}
	for i, f := range keep {
		delay := 3000 // the last frame
		if i+1 < len(keep) {
			delay = keep[i+1].ms - f.ms
		}
		src, err := png.Decode(bytes.NewReader(f.img))
		if err != nil {
			return err
		}
		cur := image.NewRGBA(image.Rect(0, 0, w, h))
		draw.Draw(cur, cur.Bounds(), bg, image.Point{}, draw.Src)
		b := src.Bounds()
		off := image.Pt((w-b.Dx())/2, (h-b.Dy())/2)
		draw.Draw(cur, b.Sub(b.Min).Add(off), src, b.Min, draw.Src)
		rect := cur.Bounds()
		if prev != nil {
			rect = changed(prev, cur)
			if rect.Empty() { // nothing moved: the previous frame lasts longer
				parts[len(parts)-1].delay += delay
				continue
			}
		}
		var buf bytes.Buffer
		if err := enc.Encode(&buf, cur.SubImage(rect)); err != nil {
			return err
		}
		parts = append(parts, part{rect, idat(buf.Bytes()), delay})
		prev = cur
	}

	var o bytes.Buffer
	o.Write([]byte{0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a}) // the PNG signature
	ihdr := binary.BigEndian.AppendUint32(nil, w)
	ihdr = binary.BigEndian.AppendUint32(ihdr, h)
	chunk(&o, "IHDR", append(ihdr, 8, 2, 0, 0, 0))                                                              // 8-bit RGB, as Go writes an opaque RGBA image
	chunk(&o, "acTL", binary.BigEndian.AppendUint32(binary.BigEndian.AppendUint32(nil, uint32(len(parts))), 0)) // loop forever
	seq := uint32(0)
	for i, p := range parts {
		fc := binary.BigEndian.AppendUint32(nil, seq)
		for _, v := range []int{p.rect.Dx(), p.rect.Dy(), p.rect.Min.X, p.rect.Min.Y} {
			fc = binary.BigEndian.AppendUint32(fc, uint32(v))
		}
		fc = binary.BigEndian.AppendUint16(fc, uint16(min(p.delay, 65535)))
		fc = binary.BigEndian.AppendUint16(fc, 1000)
		chunk(&o, "fcTL", append(fc, 0, 0)) // dispose: none, blend: source
		seq++
		if i == 0 {
			chunk(&o, "IDAT", p.data)
			continue
		}
		chunk(&o, "fdAT", append(binary.BigEndian.AppendUint32(nil, seq), p.data...))
		seq++
	}
	chunk(&o, "IEND", nil)
	if err := os.WriteFile(out, o.Bytes(), 0o644); err != nil {
		return err
	}
	fmt.Printf("%d of %d frames → %s (%d KB)\n", len(parts), len(frames), out, o.Len()/1024)
	return nil
}

// idat returns the concatenated IDAT data of a PNG.
func idat(p []byte) []byte {
	var d []byte
	for p = p[8:]; len(p) >= 12; {
		n := binary.BigEndian.Uint32(p)
		if string(p[4:8]) == "IDAT" {
			d = append(d, p[8:8+n]...)
		}
		p = p[12+n:]
	}
	return d
}

func chunk(o *bytes.Buffer, typ string, data []byte) {
	o.Write(binary.BigEndian.AppendUint32(nil, uint32(len(data))))
	c := crc32.NewIEEE()
	c.Write([]byte(typ))
	c.Write(data)
	o.WriteString(typ)
	o.Write(data)
	o.Write(binary.BigEndian.AppendUint32(nil, c.Sum32()))
}

// changed: the smallest rectangle that holds every pixel that differs.
func changed(a, b *image.RGBA) image.Rectangle {
	r := image.Rectangle{}
	for y := range h {
		for x := range w {
			i := y*a.Stride + x*4
			if a.Pix[i] != b.Pix[i] || a.Pix[i+1] != b.Pix[i+1] || a.Pix[i+2] != b.Pix[i+2] {
				r = r.Union(image.Rect(x, y, x+1, y+1))
			}
		}
	}
	return r
}
